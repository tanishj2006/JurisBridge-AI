import { describe, it, expect, beforeEach } from 'vitest';
import { scrubPII, MAX_DOCUMENT_LENGTH } from '../lib/piiScrubber';
import { checkRateLimit, resetRateLimiter } from '../lib/rateLimiter';
import { validateInput, verifyOrigin, sanitizedError, classifyAndSanitizeError } from '../lib/security';
import { POST as analyzePOST } from '../app/api/analyze/route';
import { NextRequest } from 'next/server';

describe('JurisBridge AI Enterprise Security Hardening Test Suite', () => {
  beforeEach(() => {
    resetRateLimiter();
  });

  // -------------------------------------------------------------------------
  // Original security tests (preserved & enhanced)
  // -------------------------------------------------------------------------

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

  it('2. Payload Length Validation: Rejects documents > 50,000 characters with HTTP 400', async () => {
    const oversizedText = 'A'.repeat(50001);

    const req = new NextRequest('http://localhost:3000/api/analyze', {
      method: 'POST',
      headers: {
        'x-forwarded-for': '192.168.1.50',
        'host': 'localhost:3000',
        'origin': 'http://localhost:3000',
      },
      body: JSON.stringify({ documentText: oversizedText }),
    });

    const res = await analyzePOST(req);
    expect(res.status).toBe(400);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe('INVALID_INPUT');
    expect(json.error.message).toContain('50,000');
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
      headers: {
        'x-forwarded-for': clientIp,
        'host': 'localhost:3000',
        'origin': 'http://localhost:3000',
      },
      body: JSON.stringify({ documentText: 'Valid contract text for testing purposes with enough length to pass validation.' }),
    });

    const res = await analyzePOST(req);
    expect(res.status).toBe(429);

    const json = await res.json();
    expect(json.error).toBeDefined();
    expect(json.error.code).toBe('RATE_LIMITED');
  });

  it('5. Secret Protection: Ensures GEMINI_API_KEY is not exposed to client environment', () => {
    // In Next.js, variables without NEXT_PUBLIC_ prefix are never exposed to browser context
    expect(process.env.NEXT_PUBLIC_GEMINI_API_KEY).toBeUndefined();
  });

  // -------------------------------------------------------------------------
  // New: CSRF Rejection Tests
  // -------------------------------------------------------------------------

  describe('CSRF / Origin Verification', () => {
    it('6. Rejects requests with a mismatched Origin header (CSRF attack)', async () => {
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {
          'host': 'localhost:3000',
          'origin': 'https://evil-attacker.com',
        },
        body: JSON.stringify({
          documentText: 'This is a legitimate-looking contract text for testing CSRF protection mechanisms.',
        }),
      });

      const res = await analyzePOST(req);
      expect(res.status).toBe(403);

      const json = await res.json();
      expect(json.error.code).toBe('CSRF_REJECTED');
    });

    it('7. Accepts requests with a matching Origin header', () => {
      const headers = new Headers({
        host: 'myapp.com',
        origin: 'https://myapp.com',
      });
      const mockReq = new Request('https://myapp.com/api/analyze', {
        method: 'POST',
        headers,
      });

      expect(verifyOrigin(mockReq)).toBe(true);
    });

    it('8. Accepts requests with no Origin/Referer (same-origin fetch)', () => {
      const headers = new Headers({
        host: 'localhost:3000',
      });
      const mockReq = new Request('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers,
      });

      expect(verifyOrigin(mockReq)).toBe(true);
    });

    it('9. Rejects requests with no host header', () => {
      const mockReq = new Request('http://localhost:3000/api/analyze', {
        method: 'POST',
      });
      // No host header at all
      expect(verifyOrigin(mockReq)).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // New: Input Validation Tests
  // -------------------------------------------------------------------------

  describe('Strict Input Validation', () => {
    it('10. Rejects non-string inputs (number)', () => {
      const result = validateInput(12345 as any, 'documentText');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('11. Rejects non-string inputs (array)', () => {
      const result = validateInput(['malicious', 'array'] as any, 'documentText');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('12. Rejects too-short inputs', () => {
      const result = validateInput('short', 'documentText');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('at least 20 characters');
    });

    it('13. Strips control characters', () => {
      const malicious = 'Normal text\x00\x01\x02\x03 with hidden control chars and enough length to pass.';
      const result = validateInput(malicious, 'documentText');
      expect(result.valid).toBe(true);
      expect(result.sanitized).not.toContain('\x00');
      expect(result.sanitized).not.toContain('\x01');
    });

    it('14. Rejects oversized inputs (>50,000 chars)', () => {
      const oversized = 'A'.repeat(50001);
      const result = validateInput(oversized, 'documentText');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('50,000');
    });
  });

  // -------------------------------------------------------------------------
  // New: Sanitized Error Structure Tests
  // -------------------------------------------------------------------------

  describe('Sanitized Error Responses', () => {
    it('15. sanitizedError returns structured { error: { code, message } } format', () => {
      const err = sanitizedError('INVALID_INPUT', 'Field X is required.');
      expect(err).toHaveProperty('error');
      expect(err.error).toHaveProperty('code', 'INVALID_INPUT');
      expect(err.error).toHaveProperty('message', 'Field X is required.');
    });

    it('16. classifyAndSanitizeError maps 429 errors correctly', () => {
      const error = new Error('Request failed with status 429 RESOURCE_EXHAUSTED');
      const { body, status } = classifyAndSanitizeError(error);
      expect(status).toBe(429);
      expect(body.error.code).toBe('RATE_LIMITED');
    });

    it('17. classifyAndSanitizeError maps unknown errors to INTERNAL_ERROR (no stack leak)', () => {
      const error = new Error('TypeError: Cannot read property of undefined at /secret/path/file.ts:42');
      const { body, status } = classifyAndSanitizeError(error);
      expect(status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      // Must NOT contain the original error message, stack, or file paths
      expect(body.error.message).not.toContain('TypeError');
      expect(body.error.message).not.toContain('/secret/path');
      expect(body.error.message).not.toContain('file.ts');
    });

    it('18. API route error responses never leak raw error messages', async () => {
      // Send a valid-looking request that will fail at the Gemini layer (no API key)
      const req = new NextRequest('http://localhost:3000/api/analyze', {
        method: 'POST',
        headers: {
          'x-forwarded-for': '192.168.99.1',
          'host': 'localhost:3000',
          'origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          documentText: 'This is a substantial contract document text that should be long enough to pass the minimum length validation check for the analysis endpoint.',
        }),
      });

      const res = await analyzePOST(req);
      const json = await res.json();

      // Whether it returns 200 (cached/fallback) or 500 (error),
      // the response must never contain raw stack traces or internal paths
      const jsonStr = JSON.stringify(json);
      expect(jsonStr).not.toContain('node_modules');
      expect(jsonStr).not.toContain('generativelanguage.googleapis.com');

      // If it's an error, it must use the structured format
      if (json.error && typeof json.error === 'object') {
        expect(json.error).toHaveProperty('code');
        expect(json.error).toHaveProperty('message');
      }
    });
  });
});
