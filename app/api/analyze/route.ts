import { NextRequest, NextResponse } from 'next/server';
import { scrubPII, MAX_DOCUMENT_LENGTH } from '@/lib/piiScrubber';
import { analyzeDocument } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rateLimiter';
import type { AnalysisResult } from '@/lib/types';

const MANDATORY_DISCLAIMER =
  'DISCLAIMER: JurisBridge AI is an automated legal document analysis tool provided for informational purposes only and does not constitute formal legal counsel. Always consult with a qualified attorney before executing legal agreements.';

export async function POST(req: NextRequest) {
  try {
    // 1. IP Rate Limiting Guard
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before analyzing another document.' },
        { status: 429 }
      );
    }

    // 2. Parse & Validate JSON Payload
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

    // 3. Payload Length Limit Guard
    if (documentText.length > MAX_DOCUMENT_LENGTH) {
      return NextResponse.json(
        { error: `Document exceeds maximum length of ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    // 4. Scrub PII
    const { sanitizedText, redactionCount } = scrubPII(documentText);

    // 5. Call Gemini
    const analysis = await analyzeDocument(sanitizedText, persona);

    // 6. Inject PII count and mandatory legal disclaimer
    const fullResult: AnalysisResult = {
      ...analysis,
      redactedPiiCount: redactionCount,
      disclaimer: MANDATORY_DISCLAIMER,
      dataSource: analysis.dataSource || 'live',
    };

    return NextResponse.json(fullResult, { status: 200 });
  } catch (error: any) {
    console.error('API /api/analyze error:', error);

    const errorMessage = error?.message || 'An unexpected error occurred';

    if (
      errorMessage.includes('429') ||
      errorMessage.includes('RESOURCE_EXHAUSTED') ||
      error?.status === 429
    ) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait before analyzing another document.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Failed to analyze document: ${errorMessage}` },
      { status: 500 }
    );
  }
}
