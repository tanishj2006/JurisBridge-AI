import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/piiScrubber';
import { analyzeDocument } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rateLimiter';
import { validateInput, verifyOrigin, sanitizedError, classifyAndSanitizeError } from '@/lib/security';
import { analysisCache, buildCacheKey } from '@/lib/cache';
import type { AnalysisResult } from '@/lib/types';

const MANDATORY_DISCLAIMER =
  'DISCLAIMER: JurisBridge AI is an automated legal document analysis tool provided for informational purposes only and does not constitute formal legal counsel. Always consult with a qualified attorney before executing legal agreements.';

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

    const { documentText, persona } = body || {};

    // 3. Strict input validation (type, control chars, length bounds)
    const docValidation = validateInput(documentText, 'documentText');
    if (!docValidation.valid) {
      return NextResponse.json(
        sanitizedError('INVALID_INPUT', docValidation.error!),
        { status: 400 }
      );
    }

    // Validate persona if provided (allow short values like "Tenant")
    if (persona !== undefined && persona !== null) {
      const personaValidation = validateInput(persona, 'persona', { minLength: 2, maxLength: 200 });
      if (!personaValidation.valid) {
        return NextResponse.json(
          sanitizedError('INVALID_INPUT', personaValidation.error!),
          { status: 400 }
        );
      }
    }

    const sanitizedDocText = docValidation.sanitized!;

    // 4. Check LRU cache (keyed by SHA-256 of documentText + persona)
    const cacheKey = await buildCacheKey(sanitizedDocText, persona);
    const cached = analysisCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        status: 200,
        headers: { 'X-Cache': 'HIT' },
      });
    }

    // 5. Scrub PII
    const { sanitizedText, redactionCount } = scrubPII(sanitizedDocText);

    // 6. Call Gemini
    const analysis = await analyzeDocument(sanitizedText, persona);

    // 7. Inject PII count and mandatory legal disclaimer
    const fullResult: AnalysisResult = {
      ...analysis,
      redactedPiiCount: redactionCount,
      disclaimer: MANDATORY_DISCLAIMER,
      dataSource: analysis.dataSource || 'live',
    };

    // 8. Store in cache for future hits
    analysisCache.set(cacheKey, fullResult);

    return NextResponse.json(fullResult, {
      status: 200,
      headers: { 'X-Cache': 'MISS' },
    });
  } catch (error: unknown) {
    // NEVER expose raw error messages, stack traces, or upstream model URLs
    console.error('API /api/analyze error:', error);
    const { body, status } = classifyAndSanitizeError(error);
    return NextResponse.json(body, { status });
  }
}
