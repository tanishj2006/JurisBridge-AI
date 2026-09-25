import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/piiScrubber';
import { chatWithDocument } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rateLimiter';
import { validateInput, verifyOrigin, sanitizedError, classifyAndSanitizeError } from '@/lib/security';
import type { ChatMessage } from '@/lib/types';

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

    const { documentText, chatHistory = [], question } = body || {};

    // 3. Strict input validation (type, control chars, length bounds)
    const docValidation = validateInput(documentText, 'documentText');
    if (!docValidation.valid) {
      return NextResponse.json(
        sanitizedError('INVALID_INPUT', docValidation.error!),
        { status: 400 }
      );
    }

    // Question validation (shorter min length: 3 chars is enough for "why?")
    const questionValidation = validateInput(question, 'question', { minLength: 3, maxLength: 5000 });
    if (!questionValidation.valid) {
      return NextResponse.json(
        sanitizedError('INVALID_INPUT', questionValidation.error!),
        { status: 400 }
      );
    }

    const sanitizedDocText = docValidation.sanitized!;
    const sanitizedQuestionText = questionValidation.sanitized!;

    // 4. Scrub PII from document text and question
    const { sanitizedText: sanitizedDocument } = scrubPII(sanitizedDocText);
    const { sanitizedText: sanitizedQuestion } = scrubPII(sanitizedQuestionText);

    // 5. Execute document Q&A
    const result = await chatWithDocument(
      sanitizedDocument,
      chatHistory as ChatMessage[],
      sanitizedQuestion
    );

    return NextResponse.json(
      { ...result, dataSource: result.dataSource || 'live' },
      { status: 200 }
    );
  } catch (error: unknown) {
    // NEVER expose raw error messages, stack traces, or upstream model URLs
    console.error('API /api/chat error:', error);
    const { body, status } = classifyAndSanitizeError(error);
    return NextResponse.json(body, { status });
  }
}
