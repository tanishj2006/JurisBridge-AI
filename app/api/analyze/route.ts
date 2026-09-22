import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/piiScrubber';
import { analyzeDocument } from '@/lib/gemini';
import type { AnalysisResult } from '@/lib/types';

const MANDATORY_DISCLAIMER =
  'DISCLAIMER: JurisBridge AI is an automated legal document analysis tool provided for informational purposes only and does not constitute formal legal counsel. Always consult with a qualified attorney before executing legal agreements.';

export async function POST(req: NextRequest) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const { documentText, persona } = body || {};

    if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty documentText parameter' },
        { status: 400 }
      );
    }

    // 1. Scrub PII
    const { sanitizedText, redactionCount } = scrubPII(documentText);

    // 2. Call Gemini
    const analysis = await analyzeDocument(sanitizedText, persona);

    // 3. Inject PII count and mandatory legal disclaimer
    const fullResult: AnalysisResult = {
      ...analysis,
      redactedPiiCount: redactionCount,
      disclaimer: MANDATORY_DISCLAIMER,
    };

    return NextResponse.json(fullResult, { status: 200 });
  } catch (error: any) {
    console.error('API /api/analyze error:', error);

    const errorMessage = error?.message || 'An unexpected error occurred';

    // Handle Gemini / API Rate Limiting (429)
    if (
      errorMessage.includes('429') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429
    ) {
      return NextResponse.json(
        { error: 'API rate limit exceeded. Please try again in a few moments.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Failed to analyze document: ${errorMessage}` },
      { status: 500 }
    );
  }
}
