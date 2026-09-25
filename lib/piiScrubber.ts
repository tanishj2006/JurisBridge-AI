export interface PiiScrubResult {
  sanitizedText: string;
  redactionCount: number;
  details: {
    emails: number;
    phones: number;
    ids: number;
    financialAccounts: number;
  };
}

export const MAX_DOCUMENT_LENGTH = 60000; // ~30 pages hard cap for DoS prevention

// ---------------------------------------------------------------------------
// Module-level pre-compiled RegExp constants (compiled once at startup)
// All quantifiers are hard-capped to prevent ReDoS catastrophic backtracking.
// ---------------------------------------------------------------------------

// Email: [local-part]{1,100}@[domain]{1,100}.[tld]{2,20}
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]{1,100}@[a-zA-Z0-9.-]{1,100}\.[a-zA-Z]{2,20}/g;

// SSN / National ID: XXX-XX-XXXX (exact fixed-width, no backtracking risk)
const SSN_REGEX = /\b\d{3}-\d{2}-\d{4}\b/g;

// Financial accounts & credit card sequences:
// - 13–16 contiguous digits OR
// - 4-digit groups separated by space or dash (3 groups + 1–4 digits)
const FINANCIAL_REGEX = /\b\d{13,16}\b|\b(?:\d{4}[ -]){3}\d{1,4}\b/g;

// Phone numbers: optional international prefix, area code, 3-digit exchange, 4-digit subscriber
// All repetition capped: country code {1,3}, separators {0,1}
const PHONE_REGEX = /\b(?:\+\d{1,3}[-.\s]{0,1})?\(?\d{3}\)?[-.\s]{0,1}\d{3}[-.\s]{0,1}\d{4}\b/g;

// Whitespace normalizer: collapse runs of whitespace to a single space
const WHITESPACE_COLLAPSE_REGEX = /[\t\r\n]{1,100}/g;

/**
 * Scrubs personally identifiable information (PII) using linear single-pass regex matching.
 * Replaces emails, phone numbers, SSN/IDs, and financial accounts with confidential tags.
 *
 * Performance: All RegExp instances are pre-compiled at module load time.
 * Security: All quantifiers are hard-capped to guarantee ReDoS immunity.
 */
export function scrubPII(text: string): PiiScrubResult {
  if (!text) {
    return {
      sanitizedText: '',
      redactionCount: 0,
      details: { emails: 0, phones: 0, ids: 0, financialAccounts: 0 },
    };
  }

  // Early exit for DoS prevention if input exceeds maximum payload limit
  if (text.length > MAX_DOCUMENT_LENGTH) {
    text = text.slice(0, MAX_DOCUMENT_LENGTH);
  }

  // Token & whitespace normalization: collapse tabs/newlines into single spaces
  // to reduce CPU cycles during regex matching on irregular whitespace runs.
  let sanitizedText = text.replace(WHITESPACE_COLLAPSE_REGEX, ' ');
  let emailsCount = 0;
  let phonesCount = 0;
  let idsCount = 0;
  let financialCount = 0;

  // 1. Email addresses (Linear single-pass)
  // Reset lastIndex for safety since we use the /g flag on module-level patterns
  EMAIL_REGEX.lastIndex = 0;
  sanitizedText = sanitizedText.replace(EMAIL_REGEX, () => {
    emailsCount++;
    return '[CONFIDENTIAL_EMAIL]';
  });

  // 2. SSN / National ID numbers (e.g. XXX-XX-XXXX)
  SSN_REGEX.lastIndex = 0;
  sanitizedText = sanitizedText.replace(SSN_REGEX, () => {
    idsCount++;
    return '[CONFIDENTIAL_ID]';
  });

  // 3. Financial account & credit card sequences (13 to 16 digits, strict word boundaries)
  FINANCIAL_REGEX.lastIndex = 0;
  sanitizedText = sanitizedText.replace(FINANCIAL_REGEX, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 16) {
      financialCount++;
      return '[CONFIDENTIAL_FINANCIAL_ACCOUNT]';
    }
    return match;
  });

  // 4. Phone numbers (domestic & international formats, strict word boundaries)
  PHONE_REGEX.lastIndex = 0;
  sanitizedText = sanitizedText.replace(PHONE_REGEX, (match) => {
    if (match.includes('[CONFIDENTIAL_')) {
      return match;
    }
    phonesCount++;
    return '[CONFIDENTIAL_PHONE]';
  });

  const redactionCount = emailsCount + phonesCount + idsCount + financialCount;

  return {
    sanitizedText,
    redactionCount,
    details: {
      emails: emailsCount,
      phones: phonesCount,
      ids: idsCount,
      financialAccounts: financialCount,
    },
  };
}
