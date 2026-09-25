import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/piiScrubber';
import { compareDocuments } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rateLimiter';
import { validateInput, verifyOrigin, sanitizedError, classifyAndSanitizeError } from '@/lib/security';
import { comparisonCache, buildComparisonCacheKey } from '@/lib/cache';
import type { ComparisonResult } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    // 0. CSRF / Origin verification
    if (!verifyOrigin(req)) {
      return NextResponse.json(
        sanitizedError('CSRF_REJECTED', 'Request origin not authorized.'),
        { status: 403 }
      );
    }

    // 1. IP Rate Limiting Guard
    const clientIp =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.success) {
      return NextResponse.json(
        sanitizedError('RATE_LIMITED', 'Rate limit exceeded. Please wait before analyzing another document.'),
        { status: 429 }
      );
    }

    // 2. Parse & Validate JSON Payload
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        sanitizedError('PARSE_ERROR', 'Invalid JSON payload.'),
        { status: 400 }
      );
    }

    const { docA, docB } = body || {};

    // 3. Strict input validation (type, control chars, length bounds)
    const docAValidation = validateInput(docA, 'docA');
    if (!docAValidation.valid) {
      return NextResponse.json(
        sanitizedError('INVALID_INPUT', docAValidation.error!),
        { status: 400 }
      );
    }

    const docBValidation = validateInput(docB, 'docB');
    if (!docBValidation.valid) {
      return NextResponse.json(
        sanitizedError('INVALID_INPUT', docBValidation.error!),
        { status: 400 }
      );
    }

    const sanitizedDocA = docAValidation.sanitized!;
    const sanitizedDocB = docBValidation.sanitized!;

    // 4. Check LRU cache (keyed by SHA-256 of docA + docB)
    const cacheKey = await buildComparisonCacheKey(sanitizedDocA, sanitizedDocB);
    const cached = comparisonCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'X-Cache': 'HIT' },
      });
    }

    // 5. Scrub PII from both document drafts
    const { sanitizedText: scrubbedDocA } = scrubPII(sanitizedDocA);
    const { sanitizedText: scrubbedDocB } = scrubPII(sanitizedDocB);

    // 6. Call Gemini comparison
    const comparisonResult: ComparisonResult = await compareDocuments(
      scrubbedDocA,
      scrubbedDocB
    );

    const fullResult = { ...comparisonResult, dataSource: comparisonResult.dataSource || 'live' };

    // 7. Store in cache for future hits
    comparisonCache.set(cacheKey, fullResult);

    return NextResponse.json(fullResult, {
      status: 200,
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error: unknown) {
    // NEVER expose raw error messages, stack traces, or upstream model URLs
    console.error('API /api/compare error:', error);
    const { body, status } = classifyAndSanitizeError(error);
    return NextResponse.json(body, { status });
  }
}
