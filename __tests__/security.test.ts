import { describe, it, expect, beforeEach } from 'vitest';
import { scrubPII, MAX_DOCUMENT_LENGTH } from '../lib/piiScrubber';
import { checkRateLimit, resetRateLimiter } from '../lib/rateLimiter';
import { POST as analyzePOST } from '../app/api/analyze/route';
import { NextRequest } from 'next/server';

describe('JurisBridge AI Enterprise Security Hardening Test Suite', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  it('1. ReDoS Defense: PII scrubber processes long malicious input under 100ms per pass', () => {
    const maliciousReDoSInput =
      'a'.repeat(3000) + ' john.doe@example.com ' + '9'.repeat(3000) + ' 555-123-4567';

    // Warm up JIT engine
    scrubPII(maliciousReDoSInput);

    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      scrubPII(maliciousReDoSInput);
    }
    const totalDuration = Date.now() - startTime;
    const avgDuration = totalDuration / 10;

    expect(avgDuration).toBeLessThan(100); // Average pass must complete under 100ms
    const singleResult = scrubPII(maliciousReDoSInput);
    expect(singleResult.sanitizedText).toContain('[CONFIDENTIAL_EMAIL]');
    expect(singleResult.sanitizedText).toContain('[CONFIDENTIAL_PHONE]');
  });

  it('2. Payload Length Validation: Rejects documents > 60,000 characters with HTTP 400', async () => {
    const oversizedText = 'A'.repeat(MAX_DOCUMENT_LENGTH + 500);

    const req = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'x-forwarded-for': '192.168.1.50' },
      body: JSON.stringify({ documentText: oversizedText }),
    });

    const res = await analyzePOST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toContain('60,000');
  });

  it('3. Rate Limiter: Blocks requests exceeding threshold with HTTP 429', async () => {
    const testIp = '10.0.0.99';

    // Send 10 allowed requests
    for (let i = 0; i < 10; i++) {
      const res = checkRateLimit(testIp, 10, 60000);
      expect(res.success).toBe(true);
    }

    // 11th request must fail
    const blockedRes = checkRateLimit(testIp, 10, 60000);
    expect(blockedRes.success).toBe(false);
    expect(blockedRes.remaining).toBe(0);
    expect(blockedRes.resetInSeconds).toBeGreaterThan(0);
  });

  it('4. API Route Integration: Returns 429 when client IP hits rate limit', async () => {
    const clientIp = '203.0.113.42';

    // Exhaust limit
    for (let i = 0; i < 10; i++) {
      checkRateLimit(clientIp, 10, 60000);
    }

    const req = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: { 'x-forwarded-for': clientIp },
      body: JSON.stringify({ documentText: 'Valid contract text' }),
    });

    const res = await analyzePOST(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toContain('Rate limit exceeded');
  });

  it('5. Secret Protection: Ensures GEMINI_API_KEY is not exposed to client environment', () => {
    // In Next.js, variables without NEXT_PUBLIC_ prefix are never exposed to browser context
    expect(process.env.NEXT_PUBLIC_GEMINI_API_KEY).toBeUndefined();
  });
});
