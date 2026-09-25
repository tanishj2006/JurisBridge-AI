import { NextRequest, NextResponse } from 'next/server';
import { scrubPII, MAX_DOCUMENT_LENGTH } from '@/lib/piiScrubber';
import { compareDocuments } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rateLimiter';
import type { ComparisonResult } from '@/lib/types';

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

    const { docA, docB } = body || {};

    if (!docA || typeof docA !== 'string' || !docA.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty docA parameter' },
        { status: 400 }
      );
    }

    if (!docB || typeof docB !== 'string' || !docB.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty docB parameter' },
        { status: 400 }
      );
    }

    // 3. Payload Length Limit Guard
    if (docA.length > MAX_DOCUMENT_LENGTH || docB.length > MAX_DOCUMENT_LENGTH) {
      return NextResponse.json(
        { error: `Document exceeds maximum length of ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    // 4. Scrub PII from both document drafts
    const { sanitizedText: sanitizedDocA } = scrubPII(docA);
    const { sanitizedText: sanitizedDocB } = scrubPII(docB);

    // 5. Call Gemini comparison
    const comparisonResult: ComparisonResult = await compareDocuments(
      sanitizedDocA,
      sanitizedDocB
    );

    return NextResponse.json(comparisonResult, { status: 200 });
  } catch (error: any) {
    console.error('API /api/compare error:', error);

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
      { error: `Failed to compare documents: ${errorMessage}` },
      { status: 500 }
    );
  }
}
