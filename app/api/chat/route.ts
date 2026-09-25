import { NextRequest, NextResponse } from 'next/server';
import { scrubPII, MAX_DOCUMENT_LENGTH } from '@/lib/piiScrubber';
import { chatWithDocument } from '@/lib/gemini';
import { checkRateLimit } from '@/lib/rateLimiter';
import type { ChatMessage } from '@/lib/types';

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

    const { documentText, chatHistory = [], question } = body || {};

    if (!documentText || typeof documentText !== 'string' || !documentText.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty documentText parameter' },
        { status: 400 }
      );
    }

    if (!question || typeof question !== 'string' || !question.trim()) {
      return NextResponse.json(
        { error: 'Missing or empty question parameter' },
        { status: 400 }
      );
    }

    // 3. Payload Length Limit Guard
    if (documentText.length > MAX_DOCUMENT_LENGTH || question.length > MAX_DOCUMENT_LENGTH) {
      return NextResponse.json(
        { error: `Document exceeds maximum length of ${MAX_DOCUMENT_LENGTH.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    // 4. Scrub PII from document text and question
    const { sanitizedText: sanitizedDocument } = scrubPII(documentText);
    const { sanitizedText: sanitizedQuestion } = scrubPII(question);

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
  } catch (error: any) {
    console.error('API /api/chat error:', error);

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
      { error: `Failed to process chat question: ${errorMessage}` },
      { status: 500 }
    );
  }
}
