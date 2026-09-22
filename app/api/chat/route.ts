import { NextRequest, NextResponse } from 'next/server';
import { scrubPII } from '@/lib/piiScrubber';
import { chatWithDocument } from '@/lib/gemini';
import type { ChatMessage } from '@/lib/types';

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

    // 1. Scrub PII from document text and question
    const { sanitizedText: sanitizedDocument } = scrubPII(documentText);
    const { sanitizedText: sanitizedQuestion } = scrubPII(question);

    // 2. Execute document Q&A
    const result = await chatWithDocument(
      sanitizedDocument,
      chatHistory as ChatMessage[],
      sanitizedQuestion
    );

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('API /api/chat error:', error);

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
      { error: `Failed to process chat question: ${errorMessage}` },
      { status: 500 }
    );
  }
}
