import { describe, it, expect, vi } from 'vitest';
import { POST as analyzePOST } from '../app/api/analyze/route';
import { POST as comparePOST } from '../app/api/compare/route';
import { POST as chatPOST } from '../app/api/chat/route';
import { NextRequest } from 'next/server';

/** Helper to create a NextRequest with valid same-origin headers. */
function makeRequest(url: string, body: any): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: {
      'host': 'localhost:3000',
      'origin': 'http://localhost:3000',
    },
    body: JSON.stringify(body),
  });
}

describe('JurisBridge AI API Route Validation & Pipeline', () => {
  it('/api/analyze should return 400 when payload is missing documentText', async () => {
    const req = makeRequest('http://localhost:3000/api/analyze', {});
    const res = await analyzePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('documentText');
  });

  it('/api/compare should return 400 when docA or docB is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/compare', { docA: 'Draft text A that is sufficiently long to pass input validation checks for the compare endpoint.' });
    const res = await comparePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('docB');
  });

  it('/api/chat should return 400 when question is missing', async () => {
    const req = makeRequest('http://localhost:3000/api/chat', {
      documentText: 'Some contract text that is long enough to pass the minimum input validation requirement of twenty characters.',
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.message).toContain('question');
  });
});
