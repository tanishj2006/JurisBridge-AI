/**
 * Offline Resilience Fallback Module for JurisBridge AI
 *
 * When ALL Gemini models in the cascade are unavailable (503/429/404),
 * this module provides pre-computed results for known sample documents
 * and heuristic-based analysis for novel text, ensuring the user never
 * sees a raw 500 error banner.
 */

import type { AnalysisResult, ComparisonResult, ClauseAnalysis, DiffItem } from './types';
import { SAMPLE_CONTRACTS } from './samples';

// ---------------------------------------------------------------------------
// Similarity detection helpers
// ---------------------------------------------------------------------------

/** Extracts a bag-of-words set from text, lowercased and stripped of punctuation. */
function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

/** Jaccard similarity between two token sets. */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Threshold above which we consider the input "matches" a known sample. */
const SAMPLE_MATCH_THRESHOLD = 0.35;

/**
 * Detects if the input text closely resembles one of the pre-loaded sample contracts.
 * Returns the matched sample id or null.
 */
export function detectSampleMatch(inputText: string): string | null {
  const inputTokens = tokenize(inputText);

  for (const sample of SAMPLE_CONTRACTS) {
    const sampleTokens = tokenize(sample.text);
    const similarity = jaccardSimilarity(inputTokens, sampleTokens);
    if (similarity >= SAMPLE_MATCH_THRESHOLD) {
      return sample.id;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Pre-computed Analysis Results for known samples
// ---------------------------------------------------------------------------

const CACHED_LEASE_ANALYSIS: Omit<AnalysisResult, 'redactedPiiCount' | 'disclaimer'> = {
  summary:
    'This residential lease agreement contains several provisions that heavily favor the landlord. It shifts nearly all maintenance costs to the tenant, allows unrestricted landlord entry without notice, includes a punitive auto-renewal clause with a 25% rent increase, limits landlord liability to $100, and mandates binding arbitration through a landlord-selected firm. Multiple clauses present HIGH risk for tenants.',
  overallRiskScore: 85,
  clauses: [
    {
      id: 'clause-1',
      category: 'Maintenance & Repairs',
      originalText:
        'Tenant shall be solely responsible for all maintenance, repairs, and replacements of plumbing, heating, air conditioning, and electrical systems on the premises, regardless of cause or normal wear and tear.',
      simplifiedText:
        'You (the tenant) must pay for ALL repairs — even if something breaks from normal use or age. The landlord pays nothing.',
      riskLevel: 'HIGH',
      explanation:
        'This shifts the entire financial burden of property upkeep to the tenant, including systems that typically degrade with normal use. Most jurisdictions require landlords to maintain habitability.',
      suggestedRevision:
        'Landlord shall be responsible for structural, plumbing, HVAC, and electrical repairs resulting from normal wear and tear. Tenant shall only be responsible for damage caused by Tenant\'s intentional or negligent acts, capped at $150 per incident.',
    },
    {
      id: 'clause-2',
      category: 'Privacy & Access',
      originalText:
        'Landlord reserves the right to enter the premises at any hour of the day or night without prior notice for inspections, routine maintenance, or promotional photography without limitation.',
      simplifiedText:
        'The landlord can enter your home at any time — day or night — without telling you first.',
      riskLevel: 'HIGH',
      explanation:
        'Unrestricted entry without notice violates tenant privacy rights. Most states require 24–48 hours written notice except in genuine emergencies.',
      suggestedRevision:
        'Landlord may enter the premises only after providing at least 24 hours advance written notice, except in cases of immediate emergency. Inspections shall occur during normal business hours.',
    },
    {
      id: 'clause-3',
      category: 'Auto-Renewal & Termination',
      originalText:
        'This agreement shall automatically renew for successive 1-year terms unless Tenant provides written notice via certified mail exactly 120 days prior to expiration. Failure to provide notice results in a mandatory 25% rent increase upon renewal.',
      simplifiedText:
        'If you don\'t send a certified letter exactly 4 months before the lease ends, you\'re locked into another full year with a 25% rent hike.',
      riskLevel: 'HIGH',
      explanation:
        'The 120-day exact notice requirement combined with a punitive 25% increase creates a trap. Standard leases use 30–60 day windows and convert to month-to-month.',
      suggestedRevision:
        'Lease shall convert to a month-to-month tenancy unless either party provides 30 days written notice prior to expiration.',
    },
    {
      id: 'clause-4',
      category: 'Indemnification & Liability',
      originalText:
        'Tenant agrees to indemnify, defend, and hold harmless Landlord from any and all claims. Landlord\'s total liability under any circumstances shall not exceed $100.',
      simplifiedText:
        'You must cover ALL legal costs if anyone sues about the property. The most the landlord would ever owe you is $100.',
      riskLevel: 'HIGH',
      explanation:
        'Unilateral indemnification with a $100 liability cap is extremely one-sided. It essentially removes landlord accountability for negligence or property hazards.',
      suggestedRevision:
        'Each party agrees to be responsible for its own negligent acts or omissions. Mutual indemnification applies only to claims arising from each party\'s respective negligence.',
    },
    {
      id: 'clause-5',
      category: 'Dispute Resolution & Arbitration',
      originalText:
        'Any dispute shall be resolved exclusively through binding arbitration administered by Landlord\'s designated arbitration firm. Tenant waives all rights to a jury trial or class action participation.',
      simplifiedText:
        'If there\'s a problem, a company chosen by the landlord decides what happens. You can\'t go to court or join other tenants in a lawsuit.',
      riskLevel: 'HIGH',
      explanation:
        'Landlord-selected arbitration firms create a structural bias. Waiving jury trial and class action rights removes important legal protections for tenants.',
      suggestedRevision:
        'Disputes may be submitted to mediation with a mutually agreed-upon mediator prior to pursuing legal remedies in municipal court.',
    },
  ],
  actionItems: [
    'Do NOT sign this lease without negotiating maintenance responsibility — demand landlord handles normal wear and tear.',
    'Require 24-hour advance written notice for any landlord entry.',
    'Negotiate the auto-renewal to month-to-month with 30-day notice.',
    'Demand removal of the $100 liability cap and add mutual indemnification.',
    'Reject landlord-selected arbitration; insist on municipal court or mutually selected mediation.',
  ],
  attorneyQuestions: [
    'Is the unilateral indemnification clause enforceable in our state given the landlord\'s own negligence obligations?',
    'Does the 24/7 unrestricted entry provision violate our state\'s tenant privacy statutes?',
    'Can the 25% auto-renewal penalty be challenged as an unconscionable contract term?',
    'Is the landlord-designated arbitration firm clause void under consumer protection laws?',
    'What is my liability exposure under the all-repairs clause for pre-existing structural defects?',
    'Can I negotiate a mutual termination clause with a 30-day notice period?',
  ],
};

const CACHED_FREELANCE_ANALYSIS: Omit<AnalysisResult, 'redactedPiiCount' | 'disclaimer'> = {
  summary:
    'This independent contractor agreement heavily favors the client. It includes delayed payment terms (net 90), an overreaching IP assignment that extends 5 years post-engagement and covers personal projects, a 3-year worldwide non-compete across the entire technology industry, allows the client to terminate without cause and withhold all pay, and imposes a $500,000 liquidated damages penalty for confidentiality breaches. Multiple clauses present HIGH risk for the contractor.',
  overallRiskScore: 92,
  clauses: [
    {
      id: 'clause-1',
      category: 'Payment Terms',
      originalText:
        'Client shall pay Contractor $85 per hour, net 90 days following invoice receipt.',
      simplifiedText:
        'You won\'t get paid until 3 months after you send the invoice.',
      riskLevel: 'MEDIUM',
      explanation:
        'Net 90 payment terms are unusually long for independent contractor work. Industry standard is net 15–30 days. Extended terms create significant cash flow risk.',
      suggestedRevision:
        'Client shall pay Contractor $85 per hour, net 30 days following invoice receipt. Late payments accrue 1.5% monthly interest.',
    },
    {
      id: 'clause-2',
      category: 'Intellectual Property Assignment',
      originalText:
        'Contractor hereby irrevocably assigns to Client all right, title, and interest in and to all inventions, code, designs, algorithms, and concepts created during the term AND for a period of five (5) years thereafter, regardless of whether created for Client or on Contractor\'s own personal time.',
      simplifiedText:
        'Everything you create — even personal projects on your own time — belongs to the client. This lasts 5 years after the contract ends.',
      riskLevel: 'HIGH',
      explanation:
        'This is an extraordinarily broad IP seizure clause. Capturing work done on personal time and extending 5 years post-termination could cripple future employment and personal ventures.',
      suggestedRevision:
        'Contractor assigns to Client all right, title, and interest specifically in deliverables created directly for Client under an executed Statement of Work upon full payment. Contractor retains ownership of pre-existing tools and generic code libraries.',
    },
    {
      id: 'clause-3',
      category: 'Non-Compete & Non-Solicitation',
      originalText:
        'For three (3) years following termination, Contractor shall not provide any services to any entity anywhere in the world that operates in the technology industry.',
      simplifiedText:
        'For 3 years after the job ends, you can\'t work for ANY tech company ANYWHERE in the world.',
      riskLevel: 'HIGH',
      explanation:
        'A worldwide 3-year non-compete covering the entire technology industry is virtually unenforceable but could be used as leverage. It effectively bars the contractor from earning a livelihood.',
      suggestedRevision:
        'Contractor shall not solicit Client\'s direct active clients for a period of six (6) months following termination within Contractor\'s local state.',
    },
    {
      id: 'clause-4',
      category: 'Termination & Payment Withholding',
      originalText:
        'Client may terminate this Agreement immediately at any time without cause. Upon termination, Client reserves the right to withhold all pending compensation as liquidated damages.',
      simplifiedText:
        'The client can fire you instantly for any reason — and keep all the money they owe you.',
      riskLevel: 'HIGH',
      explanation:
        'Unilateral termination with full payment withholding essentially allows the client to receive free labor. This is arguably unconscionable and potentially violates labor laws.',
      suggestedRevision:
        'Either party may terminate this Agreement upon 14 days written notice. Client shall pay Contractor for all work completed up to the effective termination date within 15 business days.',
    },
    {
      id: 'clause-5',
      category: 'Confidentiality & Penalties',
      originalText:
        'Any breach shall subject Contractor to immediate injunctive relief and liquidated damages of $500,000.',
      simplifiedText:
        'If you accidentally reveal any company secret, you could owe $500,000 immediately.',
      riskLevel: 'HIGH',
      explanation:
        '$500,000 in liquidated damages is disproportionate for most freelance engagements and may not reflect actual anticipated damages, making it potentially unenforceable but extremely intimidating.',
      suggestedRevision:
        'Contractor shall maintain confidentiality of proprietary Client information for two (2) years post-termination. Remedies for breach shall be limited to actual proven damages.',
    },
  ],
  actionItems: [
    'Negotiate payment terms to net 30 with a late payment interest clause.',
    'Limit IP assignment strictly to client-commissioned deliverables under signed Statements of Work.',
    'Remove or drastically narrow the non-compete to specific clients, 6-month duration, and local geography.',
    'Add mutual termination with 14-day notice and guaranteed payment for completed work.',
    'Cap confidentiality damages to actual proven losses and reduce perpetual obligation to 2 years.',
  ],
  attorneyQuestions: [
    'Is the worldwide 3-year non-compete enforceable in my state given recent FTC guidance on non-compete clauses?',
    'Can the IP assignment clause legally capture inventions I create on personal time unrelated to client work?',
    'Is the $500,000 liquidated damages provision considered a penalty rather than a reasonable damage estimate?',
    'Does the payment withholding upon termination clause violate independent contractor labor protections?',
    'Should I negotiate a "work-for-hire" scope limitation rather than a blanket IP assignment?',
    'What is my exposure if I sign and later violate the non-compete while freelancing for another tech company?',
  ],
};

// ---------------------------------------------------------------------------
// Pre-computed Comparison Results for known sample pairs
// ---------------------------------------------------------------------------

const CACHED_LEASE_COMPARISON: ComparisonResult = {
  documentType: 'Residential Lease Agreement',
  keyDifferences: [
    {
      clauseTopic: 'Maintenance & Repairs',
      docA: 'Tenant is solely responsible for ALL maintenance, repairs, and replacements regardless of cause, with a 15% admin fee on repairs exceeding $50.',
      docB: 'Landlord handles structural, plumbing, heating, and electrical repairs from normal wear. Tenant only pays for intentional negligence, capped at $150 per incident.',
      changeSeverity: 'FAVORABLE',
      impact: 'Dramatically reduces tenant financial exposure from unlimited to $150/incident. Landlord now bears responsibility for normal wear and tear as is standard.',
    },
    {
      clauseTopic: 'Landlord Entry & Access',
      docA: 'Landlord may enter at any hour without prior notice for any reason.',
      docB: 'Landlord must provide 24 hours advance written notice except for emergencies. Inspections limited to business hours.',
      changeSeverity: 'FAVORABLE',
      impact: 'Restores tenant privacy rights and aligns with standard state landlord-tenant statutes requiring advance notice.',
    },
    {
      clauseTopic: 'Auto-Renewal & Cancellation',
      docA: 'Auto-renews for 1-year terms with 120-day certified mail requirement. Missing deadline triggers 25% rent increase.',
      docB: 'Converts to month-to-month with 30-day written notice from either party.',
      changeSeverity: 'FAVORABLE',
      impact: 'Eliminates the punitive renewal trap. Month-to-month with 30-day notice is a standard, flexible arrangement.',
    },
    {
      clauseTopic: 'Indemnification & Liability',
      docA: 'Tenant provides full unilateral indemnification. Landlord liability capped at $100.',
      docB: 'Each party responsible for own negligent acts. Mutual responsibility model.',
      changeSeverity: 'FAVORABLE',
      impact: 'Shifts from one-sided protection to balanced accountability. Removes the $100 cap that essentially negated landlord liability.',
    },
    {
      clauseTopic: 'Dispute Resolution',
      docA: 'Binding arbitration through landlord-designated firm. Tenant waives jury trial and class action rights.',
      docB: 'Mediation first, then municipal court remedies available.',
      changeSeverity: 'FAVORABLE',
      impact: 'Preserves tenant access to courts. Mediation-first approach is more balanced and less costly than landlord-controlled arbitration.',
    },
  ],
  riskSummary:
    'Draft B represents a substantial improvement for the tenant across all major provisions. Every high-risk clause in Draft A has been revised to a balanced, industry-standard position. The overall risk shifts from HIGH (85/100) to LOW (~20/100). Draft B is the recommended version for tenant signature.',
};

const CACHED_FREELANCE_COMPARISON: ComparisonResult = {
  documentType: 'Independent Contractor Agreement',
  keyDifferences: [
    {
      clauseTopic: 'Payment Terms',
      docA: 'Net 90 days payment after invoice receipt.',
      docB: 'Net 30 days payment after invoice receipt.',
      changeSeverity: 'FAVORABLE',
      impact: 'Reduces payment wait from 3 months to 1 month, significantly improving contractor cash flow.',
    },
    {
      clauseTopic: 'Intellectual Property Assignment',
      docA: 'Irrevocable assignment of ALL inventions including personal projects, extending 5 years post-term.',
      docB: 'Assignment limited to client-commissioned deliverables under executed SOWs. Contractor retains pre-existing tools and generic libraries.',
      changeSeverity: 'FAVORABLE',
      impact: 'Dramatically narrows IP scope. Contractor can now pursue personal projects and reuse their own libraries.',
    },
    {
      clauseTopic: 'Non-Compete',
      docA: '3-year worldwide non-compete across entire technology industry.',
      docB: '6-month non-solicitation limited to direct active clients within contractor\'s local state.',
      changeSeverity: 'FAVORABLE',
      impact: 'Changes from a career-ending worldwide ban to a narrow, reasonable non-solicitation that preserves contractor\'s ability to work.',
    },
    {
      clauseTopic: 'Termination',
      docA: 'Client may terminate immediately without cause and withhold all pending compensation.',
      docB: 'Either party may terminate with 14 days notice. Client pays for all completed work.',
      changeSeverity: 'FAVORABLE',
      impact: 'Introduces mutual termination with guaranteed compensation for completed work. Eliminates the "free labor" risk.',
    },
    {
      clauseTopic: 'Confidentiality',
      docA: 'Perpetual confidentiality with $500,000 liquidated damages for any breach.',
      docB: '2-year confidentiality obligation with no specified punitive damages.',
      changeSeverity: 'FAVORABLE',
      impact: 'Reduces duration from perpetual to 2 years and removes the disproportionate $500K penalty.',
    },
  ],
  riskSummary:
    'Draft B corrects all five critical imbalances in Draft A. Every change is FAVORABLE for the contractor, shifting the overall risk from CRITICAL (92/100) to LOW (~15/100). Draft B is strongly recommended for the contractor to sign.',
};

// ---------------------------------------------------------------------------
// Heuristic offline analysis for novel (unknown) documents
// ---------------------------------------------------------------------------

/** Common clause keywords to detect in legal documents. */
const HEURISTIC_CLAUSE_DETECTORS: Array<{
  category: string;
  keywords: string[];
  riskLevel: 'HIGH' | 'MEDIUM' | 'SAFE';
  explanation: string;
  simplifiedText: string;
}> = [
  {
    category: 'Indemnification',
    keywords: ['indemnif', 'hold harmless', 'defend and hold'],
    riskLevel: 'HIGH',
    explanation:
      'Indemnification clauses can expose one party to unlimited liability for the other\'s losses. Review carefully for mutual vs. unilateral obligations.',
    simplifiedText:
      'This section may require you to cover the other party\'s legal costs or damages.',
  },
  {
    category: 'Termination',
    keywords: ['terminat', 'cancel', 'right to end', 'effective upon'],
    riskLevel: 'MEDIUM',
    explanation:
      'Termination provisions define how and when the agreement can end. Check for asymmetric termination rights and notice periods.',
    simplifiedText:
      'This section describes how either party can end the agreement.',
  },
  {
    category: 'Arbitration & Dispute Resolution',
    keywords: ['arbitrat', 'dispute resolut', 'waive jury', 'binding mediation'],
    riskLevel: 'HIGH',
    explanation:
      'Forced arbitration clauses may limit access to courts and class actions. Check who selects the arbitrator and venue.',
    simplifiedText:
      'This section dictates how disagreements will be resolved — potentially outside of court.',
  },
  {
    category: 'Liability Limitation',
    keywords: ['liabilit', 'cap on damages', 'limitation of liability', 'not exceed'],
    riskLevel: 'MEDIUM',
    explanation:
      'Liability caps limit the maximum amount one party can recover. Verify the cap amount is reasonable relative to the contract value.',
    simplifiedText:
      'This section limits how much money can be recovered if something goes wrong.',
  },
  {
    category: 'Intellectual Property',
    keywords: ['intellectual property', 'ip assignment', 'work for hire', 'copyright', 'assigns to'],
    riskLevel: 'HIGH',
    explanation:
      'IP assignment clauses transfer ownership of creative work. Check the scope, duration, and whether personal projects are captured.',
    simplifiedText:
      'This section determines who owns the work product created during the engagement.',
  },
  {
    category: 'Non-Compete / Non-Solicitation',
    keywords: ['non-compete', 'noncompete', 'non-solicitation', 'covenant not to compete', 'shall not compete'],
    riskLevel: 'HIGH',
    explanation:
      'Non-compete clauses may restrict future employment. Check geographic scope, duration, and industry breadth.',
    simplifiedText:
      'This section may restrict where and for whom you can work after this agreement ends.',
  },
  {
    category: 'Confidentiality',
    keywords: ['confidential', 'non-disclosure', 'trade secret', 'proprietary information'],
    riskLevel: 'MEDIUM',
    explanation:
      'Confidentiality clauses define what must be kept secret and for how long. Check duration and scope of the obligation.',
    simplifiedText:
      'This section requires you to keep certain information secret.',
  },
  {
    category: 'Auto-Renewal',
    keywords: ['auto-renew', 'automatically renew', 'successive term', 'evergreen'],
    riskLevel: 'MEDIUM',
    explanation:
      'Auto-renewal clauses can lock you into additional terms if you miss the cancellation window. Check the notice period required.',
    simplifiedText:
      'This agreement may automatically extend if you don\'t cancel in time.',
  },
];

/**
 * Generates a heuristic offline analysis for a novel document by
 * scanning for common legal clause patterns and producing structured results.
 */
export function generateHeuristicAnalysis(
  text: string
): Omit<AnalysisResult, 'redactedPiiCount' | 'disclaimer'> {
  const lowerText = text.toLowerCase();
  const detectedClauses: ClauseAnalysis[] = [];

  let clauseIndex = 1;
  for (const detector of HEURISTIC_CLAUSE_DETECTORS) {
    const found = detector.keywords.some((kw) => lowerText.includes(kw));
    if (found) {
      // Extract a snippet around the first keyword match
      const matchedKeyword = detector.keywords.find((kw) => lowerText.includes(kw))!;
      const matchIndex = lowerText.indexOf(matchedKeyword);
      const snippetStart = Math.max(0, matchIndex - 40);
      const snippetEnd = Math.min(text.length, matchIndex + matchedKeyword.length + 120);
      const snippet = text.slice(snippetStart, snippetEnd).replace(/\s+/g, ' ').trim();

      detectedClauses.push({
        id: `clause-${clauseIndex}`,
        category: detector.category,
        originalText: `...${snippet}...`,
        simplifiedText: detector.simplifiedText,
        riskLevel: detector.riskLevel,
        explanation: detector.explanation,
        suggestedRevision:
          'Have an attorney review this clause to ensure it is balanced and appropriate for your situation.',
      });
      clauseIndex++;
    }
  }

  const highCount = detectedClauses.filter((c) => c.riskLevel === 'HIGH').length;
  const mediumCount = detectedClauses.filter((c) => c.riskLevel === 'MEDIUM').length;
  const riskScore = Math.min(
    95,
    Math.max(25, highCount * 18 + mediumCount * 8 + 20)
  );

  return {
    summary:
      detectedClauses.length > 0
        ? `This document contains ${detectedClauses.length} identifiable legal clause${detectedClauses.length > 1 ? 's' : ''} including ${highCount} high-risk and ${mediumCount} medium-risk provisions. This analysis was generated offline using pattern matching because AI services were temporarily unavailable. A live AI re-analysis is recommended for comprehensive coverage.`
        : 'This document could not be analyzed in detail because AI services are temporarily unavailable. The text did not match any standard clause patterns. Please try again shortly for a full AI-powered analysis.',
    overallRiskScore: detectedClauses.length > 0 ? riskScore : 50,
    clauses: detectedClauses,
    actionItems:
      detectedClauses.length > 0
        ? [
            'Review all HIGH-risk clauses with a qualified attorney before signing.',
            'Request balanced, mutual versions of any one-sided provisions.',
            'Re-run this analysis when AI services are available for deeper insights.',
          ]
        : ['Re-run this analysis when AI services are available for comprehensive coverage.'],
    attorneyQuestions: [
      'Are the indemnification and liability provisions mutual and balanced?',
      'Is the termination clause fair to both parties with adequate notice periods?',
      'Are there any forced arbitration clauses that limit my access to courts?',
      'Does the non-compete or non-solicitation clause have reasonable geographic and temporal scope?',
      'Are there any auto-renewal or evergreen clauses I should be aware of?',
    ],
  };
}

/**
 * Generates a heuristic offline comparison for novel documents by
 * performing basic text-diff detection on clause categories.
 */
export function generateHeuristicComparison(
  docA: string,
  docB: string
): ComparisonResult {
  const lowerA = docA.toLowerCase();
  const lowerB = docB.toLowerCase();
  const differences: DiffItem[] = [];

  for (const detector of HEURISTIC_CLAUSE_DETECTORS) {
    const inA = detector.keywords.some((kw) => lowerA.includes(kw));
    const inB = detector.keywords.some((kw) => lowerB.includes(kw));

    if (inA && inB) {
      differences.push({
        clauseTopic: detector.category,
        docA: `Contains ${detector.category.toLowerCase()} provisions.`,
        docB: `Contains ${detector.category.toLowerCase()} provisions (text differs from Draft A).`,
        changeSeverity: 'NEUTRAL',
        impact: `Both drafts contain ${detector.category.toLowerCase()} clauses. A detailed comparison requires live AI analysis — please retry when services are available.`,
      });
    } else if (inA && !inB) {
      differences.push({
        clauseTopic: detector.category,
        docA: `Contains ${detector.category.toLowerCase()} provisions.`,
        docB: `No ${detector.category.toLowerCase()} provisions found.`,
        changeSeverity: 'NEUTRAL',
        impact: `${detector.category} clause appears removed in Draft B. Verify intentionality with an attorney.`,
      });
    } else if (!inA && inB) {
      differences.push({
        clauseTopic: detector.category,
        docA: `No ${detector.category.toLowerCase()} provisions found.`,
        docB: `Contains new ${detector.category.toLowerCase()} provisions.`,
        changeSeverity: 'NEUTRAL',
        impact: `${detector.category} clause added in Draft B. Review new provision carefully.`,
      });
    }
  }

  return {
    documentType: 'Legal Agreement (type undetermined — offline analysis)',
    keyDifferences:
      differences.length > 0
        ? differences
        : [
            {
              clauseTopic: 'General',
              docA: 'Draft A text provided.',
              docB: 'Draft B text provided.',
              changeSeverity: 'NEUTRAL',
              impact:
                'No specific clause differences detected by pattern matching. A live AI comparison is recommended for detailed diff analysis.',
            },
          ],
    riskSummary:
      'This comparison was generated offline using pattern matching because AI services were temporarily unavailable. Results are approximate. Please re-run when services are available for a comprehensive AI-powered comparison.',
  };
}

// ---------------------------------------------------------------------------
// Public fail-safe API
// ---------------------------------------------------------------------------

/**
 * Returns a pre-computed or heuristic AnalysisResult when all AI models fail.
 * Detects known sample documents and returns rich cached results; for novel
 * text, generates a heuristic clause-detection analysis.
 */
export function getFailsafeAnalysis(
  inputText: string
): Omit<AnalysisResult, 'redactedPiiCount' | 'disclaimer'> & { dataSource: 'cached-resilience' } {
  const matchedSample = detectSampleMatch(inputText);

  if (matchedSample === 'sample-lease') {
    console.info('[Fallback] Matched sample-lease — returning pre-computed analysis.');
    return { ...CACHED_LEASE_ANALYSIS, dataSource: 'cached-resilience' };
  }

  if (matchedSample === 'sample-freelance') {
    console.info('[Fallback] Matched sample-freelance — returning pre-computed analysis.');
    return { ...CACHED_FREELANCE_ANALYSIS, dataSource: 'cached-resilience' };
  }

  console.info('[Fallback] No sample match — generating heuristic offline analysis.');
  return { ...generateHeuristicAnalysis(inputText), dataSource: 'cached-resilience' };
}

/**
 * Returns a pre-computed or heuristic ComparisonResult when all AI models fail.
 */
export function getFailsafeComparison(
  docA: string,
  docB: string
): ComparisonResult & { dataSource: 'cached-resilience' } {
  // Check if docA matches a known sample
  const matchedSample = detectSampleMatch(docA);

  if (matchedSample === 'sample-lease') {
    console.info('[Fallback] Matched sample-lease comparison — returning pre-computed result.');
    return { ...CACHED_LEASE_COMPARISON, dataSource: 'cached-resilience' };
  }

  if (matchedSample === 'sample-freelance') {
    console.info('[Fallback] Matched sample-freelance comparison — returning pre-computed result.');
    return { ...CACHED_FREELANCE_COMPARISON, dataSource: 'cached-resilience' };
  }

  console.info('[Fallback] No sample match — generating heuristic offline comparison.');
  return { ...generateHeuristicComparison(docA, docB), dataSource: 'cached-resilience' };
}

/**
 * Returns a fail-safe chat response when all AI models fail.
 */
export function getFailsafeChatResponse(
  documentText: string,
  question: string
): { content: string; citedClauseIds: string[]; dataSource: 'cached-resilience' } {
  const matchedSample = detectSampleMatch(documentText);

  let contextNote = '';
  if (matchedSample === 'sample-lease') {
    contextNote =
      'This appears to be a residential lease agreement with several high-risk provisions including unrestricted landlord entry, one-sided indemnification, and forced arbitration.';
  } else if (matchedSample === 'sample-freelance') {
    contextNote =
      'This appears to be a freelancer/independent contractor agreement with high-risk provisions including broad IP assignment, a worldwide non-compete, and payment withholding on termination.';
  } else {
    contextNote =
      'The document has been received but could not be analyzed in detail at this time.';
  }

  return {
    content: `I'm currently unable to provide a live AI-powered answer because all AI services are temporarily at capacity. Here is what I can tell you based on pattern analysis:\n\n${contextNote}\n\nYour question: "${question}"\n\nFor a detailed, clause-by-clause answer to your question, please try again in a few moments when AI services are restored. In the meantime, I recommend consulting with a qualified attorney for questions about specific legal provisions.`,
    citedClauseIds: [],
    dataSource: 'cached-resilience',
  };
}
