import { describe, it, expect, vi } from 'vitest';
import { POST as analyzePOST } from '../app/api/analyze/route';
import { POST as comparePOST } from '../app/api/compare/route';
import { POST as chatPOST } from '../app/api/chat/route';
import { NextRequest } from 'next/server';

describe('JurisBridge AI API Route Validation & Pipeline', () => {
  it('/api/analyze should return 400 when payload is missing documentText', async () => {
    const req = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await analyzePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('documentText');
  });

  it('/api/compare should return 400 when docA or docB is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/compare', {
      method: 'POST',
      body: JSON.stringify({ docA: 'Draft text A' }),
    });
    const res = await comparePOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('docB');
  });

  it('/api/chat should return 400 when question is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/chat', {
      method: 'POST',
      body: JSON.stringify({ documentText: 'Some contract' }),
    });
    const res = await chatPOST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toContain('question');
  });
});
