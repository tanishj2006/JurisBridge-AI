/**
 * Security hardening module for JurisBridge AI.
 *
 * Provides:
 * - Strict input validation (type, length, control character sanitization)
 * - CSRF / Origin verification for POST routes
 * - Sanitized error response builder
 */

// ---------------------------------------------------------------------------
// Input Validation
// ---------------------------------------------------------------------------

const MIN_INPUT_LENGTH = 20;
const MAX_INPUT_LENGTH = 50_000;

// Matches ASCII control characters (except common whitespace: \t \n \r)
const CONTROL_CHAR_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validates and sanitizes a text input field.
 *
 * - Ensures the value is a string (rejects numbers, arrays, objects)
 * - Strips dangerous control characters
 * - Enforces minimum length (20 chars) and maximum length (50,000 chars)
 */
export function validateInput(
  value: unknown,
  fieldName: string = 'input',
  options: { minLength?: number; maxLength?: number } = {}
): ValidationResult {
  const minLen = options.minLength ?? MIN_INPUT_LENGTH;
  const maxLen = options.maxLength ?? MAX_INPUT_LENGTH;

  // 1. Strict type check — must be a string (not coercible)
  if (typeof value !== 'string') {
    return {
      valid: false,
      error: `${fieldName} must be a string.`,
    };
  }

  // 2. Sanitize control characters
  const sanitized = value.replace(CONTROL_CHAR_REGEX, '');

  // 3. Trim and check emptiness
  const trimmed = sanitized.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      error: `${fieldName} must not be empty.`,
    };
  }

  // 4. Minimum length enforcement
  if (trimmed.length < minLen) {
    return {
      valid: false,
      error: `${fieldName} must be at least ${minLen} characters.`,
    };
  }

  // 5. Maximum length enforcement
  if (sanitized.length > maxLen) {
    return {
      valid: false,
      error: `${fieldName} exceeds the maximum allowed length of ${maxLen.toLocaleString()} characters.`,
    };
  }

  return { valid: true, sanitized };
}

// ---------------------------------------------------------------------------
// CSRF / Origin Verification
// ---------------------------------------------------------------------------

/**
 * Verifies that a POST request originates from a trusted origin by checking
 * the Origin and Referer headers against the request's own host.
 *
 * Returns true if the request is safe to process.
 * Returns false if the origin is suspicious (potential CSRF).
 */
export function verifyOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const host = request.headers.get('host');

  // If no host header at all, we can't verify — reject
  if (!host) return false;

  const normalizedHost = host.replace(/:\d+$/, '').toLowerCase();

  // Check Origin header (preferred)
  if (origin) {
    try {
      const originHost = new URL(origin).hostname.toLowerCase();
      return originHost === normalizedHost || originHost === 'localhost';
    } catch {
      return false;
    }
  }

  // Fallback to Referer header
  if (referer) {
    try {
      const refererHost = new URL(referer).hostname.toLowerCase();
      return refererHost === normalizedHost || refererHost === 'localhost';
    } catch {
      return false;
    }
  }

  // No origin or referer — allow same-origin API calls (fetch from same page
  // doesn't always include Origin in non-CORS contexts). This is safe because
  // modern browsers always include Origin on cross-origin requests.
  return true;
}

// ---------------------------------------------------------------------------
// Sanitized Error Response Builder
// ---------------------------------------------------------------------------

/** Standard error codes exposed to clients. */
export type ErrorCode =
  | 'INVALID_INPUT'
  | 'PAYLOAD_TOO_LARGE'
  | 'RATE_LIMITED'
  | 'CSRF_REJECTED'
  | 'PARSE_ERROR'
  | 'ANALYSIS_FAILED'
  | 'INTERNAL_ERROR';

export interface SanitizedError {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/**
 * Builds a clean, client-safe error response.
 * NEVER includes raw stack traces, upstream URLs, or internal error messages.
 */
export function sanitizedError(code: ErrorCode, message: string): SanitizedError {
  return {
    error: {
      code,
      message,
    },
  };
}

/**
 * Maps an unknown caught error to a safe client-facing error response.
 * Detects rate-limit errors from upstream and returns appropriate codes.
 */
export function classifyAndSanitizeError(error: unknown): { body: SanitizedError; status: number } {
  const msg = error instanceof Error ? error.message : String(error);

  // Rate limit from upstream Gemini
  if (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    (error as any)?.status === 429
  ) {
    return {
      body: sanitizedError('RATE_LIMITED', 'Service is temporarily at capacity. Please try again in a few moments.'),
      status: 429,
    };
  }

  // Generic internal error — no details leaked
  return {
    body: sanitizedError('INTERNAL_ERROR', 'An unexpected error occurred. Please try again later.'),
    status: 500,
  };
}
