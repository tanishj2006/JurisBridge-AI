import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/piiScrubber';
import { compareDocuments } from '@/lib/gemini';
import type { ComparisonResult } from '@/lib/types';

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

    // 1. Scrub PII from both document drafts
    const { sanitizedText: sanitizedDocA } = scrubPII(docA);
    const { sanitizedText: sanitizedDocB } = scrubPII(docB);

    // 2. Call Gemini comparison
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
        { error: 'API rate limit exceeded. Please try again in a few moments.' },
        { status: 429 }
      );
    }

    return NextResponse.json(
      { error: `Failed to compare documents: ${errorMessage}` },
      { status: 500 }
    );
  }
}
