import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import type { AnalysisResult, ComparisonResult, ChatMessage } from './types';

const apiKey = process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

const MODEL_NAME = 'gemini-3.6-flash';

const SYSTEM_LEGAL_GUARDRAILS = `
You are JurisBridge AI, an expert legal document analyst.
Follow these strict guardrails:
1. Translate complex legalese into clear, 8th-grade reading level explanations.
2. Maintain strict document grounding — do NOT invent or hallucinate clauses not present in the provided document.
3. Proactively flag high-severity risks including: unilateral indemnification, forced binding arbitration, hidden auto-renewal fees, extreme or uncapped liability, and broad IP assignment.
4. For document analysis, ALWAYS generate between 5 and 7 concrete, actionable questions that the user can ask an attorney.
5. If a user persona (e.g. Freelancer, Small Business Owner, Tenant, Employee) is specified, tailor the risk scoring, explanations, and revisions to protect that persona's best interests.
`;

/**
 * Retry helper for transient 503 Service Unavailable or 429 Rate Limit API errors.
 * Retries up to 2 times with a 1.5 second delay between attempts.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retries = 2,
  delayMs = 1500
): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      const errorMessage = error?.message || String(error);
      const isTransient =
        errorMessage.includes('503') ||
        errorMessage.includes('429') ||
        errorMessage.includes('UNAVAILABLE') ||
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        error?.status === 503 ||
        error?.status === 429;

      if (isTransient && attempt <= retries) {
        console.warn(
          `[Gemini API] Retry attempt ${attempt}/${retries} after transient error: ${errorMessage}`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (isTransient && attempt > retries) {
        throw new Error(
          `Gemini service temporarily unavailable after ${retries} retries (${errorMessage}). Please try again shortly.`
        );
      }

      throw error;
    }
  }
}

const analysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    summary: {
      type: SchemaType.STRING,
      description: 'High-level summary of the document written at an 8th-grade reading level.',
    },
    overallRiskScore: {
      type: SchemaType.INTEGER,
      description: 'Overall risk score from 1 (lowest risk) to 100 (highest risk).',
    },
    clauses: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          id: { type: SchemaType.STRING, description: 'Clause ID, e.g., clause-1' },
          category: {
            type: SchemaType.STRING,
            description: 'Category (e.g. Indemnification, Liability, Arbitration, Termination, IP Assignment)',
          },
          originalText: { type: SchemaType.STRING, description: 'Original verbatim or excerpt text' },
          simplifiedText: { type: SchemaType.STRING, description: 'Plain English 8th-grade explanation' },
          riskLevel: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['HIGH', 'MEDIUM', 'SAFE'],
          },
          explanation: { type: SchemaType.STRING, description: 'Why this risk level was assigned' },
          suggestedRevision: {
            type: SchemaType.STRING,
            description: 'Suggested balanced revision protecting the user',
          },
        },
        required: ['id', 'category', 'originalText', 'simplifiedText', 'riskLevel', 'explanation'],
      },
    },
    actionItems: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Key immediate action items for the user',
    },
    attorneyQuestions: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Exactly 5 to 7 concrete questions to ask an attorney',
    },
  },
  required: ['summary', 'overallRiskScore', 'clauses', 'actionItems', 'attorneyQuestions'],
};

const comparisonSchema = {
  type: SchemaType.OBJECT,
  properties: {
    documentType: {
      type: SchemaType.STRING,
      description: 'Identified document type (e.g. NDA, Service Agreement, Lease)',
    },
    keyDifferences: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          clauseTopic: { type: SchemaType.STRING, description: 'Clause topic or section title' },
          docA: { type: SchemaType.STRING, description: 'Provision in Draft A' },
          docB: { type: SchemaType.STRING, description: 'Provision in Draft B' },
          changeSeverity: {
            type: SchemaType.STRING,
            format: 'enum',
            enum: ['FAVORABLE', 'UNFAVORABLE', 'NEUTRAL'],
          },
          impact: { type: SchemaType.STRING, description: 'Practical impact of the change' },
        },
        required: ['clauseTopic', 'docA', 'docB', 'changeSeverity', 'impact'],
      },
    },
    riskSummary: {
      type: SchemaType.STRING,
      description: 'Summary of total risk shift from Draft A to Draft B',
    },
  },
  required: ['documentType', 'keyDifferences', 'riskSummary'],
};

const chatSchema = {
  type: SchemaType.OBJECT,
  properties: {
    content: {
      type: SchemaType.STRING,
      description: 'Answer strictly grounded in the document text, translated to clear language.',
    },
    citedClauseIds: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: 'Array of referenced clause IDs or section headers cited in the answer.',
    },
  },
  required: ['content'],
};

/**
 * Analyzes a sanitized legal document using Gemini 3.6 Flash with structured JSON output.
 */
export async function analyzeDocument(
  sanitizedText: string,
  persona?: string
): Promise<Omit<AnalysisResult, 'redactedPiiCount' | 'disclaimer'>> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_LEGAL_GUARDRAILS,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema as any,
      temperature: 0.2,
    },
  });

  const personaPrompt = persona ? `Analyze this document from the perspective of a ${persona}.` : '';

  const prompt = `
${personaPrompt}
Analyze the following legal document text:

---
${sanitizedText}
---

Provide a structured JSON report identifying key clauses, simplified explanations (8th grade reading level), risk levels (HIGH, MEDIUM, SAFE), action items, and 5 to 7 attorney questions.
`;

  const result = await retryWithBackoff(() => model.generateContent(prompt));
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  return parsed;
}

/**
 * Compares two versions of a sanitized legal document using Gemini 3.6 Flash.
 */
export async function compareDocuments(
  docA: string,
  docB: string
): Promise<ComparisonResult> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_LEGAL_GUARDRAILS,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: comparisonSchema as any,
      temperature: 0.2,
    },
  });

  const prompt = `
Compare the following two versions of a legal document:

=== DRAFT A ===
${docA}

=== DRAFT B ===
${docB}

Identify key added/modified/deleted provisions and evaluate if each shift is FAVORABLE, UNFAVORABLE, or NEUTRAL for the reviewing party.
`;

  const result = await retryWithBackoff(() => model.generateContent(prompt));
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  return parsed;
}

/**
 * Answers questions grounded in the provided document text.
 */
export async function chatWithDocument(
  documentText: string,
  chatHistory: ChatMessage[],
  question: string
): Promise<{ content: string; citedClauseIds?: string[] }> {
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: `${SYSTEM_LEGAL_GUARDRAILS}\nYou are answering questions strictly based on the provided document text. Every factual assertion MUST cite specific clause numbers or verbatim quotes from the text.`,
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: chatSchema as any,
      temperature: 0.2,
    },
  });

  const formattedHistory = (chatHistory || [])
    .map((msg) => `${msg.role.toUpperCase()}: ${msg.content}`)
    .join('\n');

  const prompt = `
Document Context:
---
${documentText}
---

Chat History:
${formattedHistory}

User Question: ${question}

Provide a direct, grounded response with optional clause citations (citedClauseIds).
`;

  const result = await retryWithBackoff(() => model.generateContent(prompt));
  const responseText = result.response.text();
  const parsed = JSON.parse(responseText);

  return {
    content: parsed.content,
    citedClauseIds: parsed.citedClauseIds || [],
  };
}
