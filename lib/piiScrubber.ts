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

/**
 * Scrubs personally identifiable information (PII) using linear single-pass regex matching.
 * Replaces emails, phone numbers, SSN/IDs, and financial accounts with confidential tags.
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

  let sanitizedText = text;
  let emailsCount = 0;
  let phonesCount = 0;
  let idsCount = 0;
  let financialCount = 0;

  // 1. Email addresses (Linear single-pass)
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  sanitizedText = sanitizedText.replace(emailRegex, () => {
    emailsCount++;
    return '[CONFIDENTIAL_EMAIL]';
  });

  // 2. SSN / National ID numbers (e.g. XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  sanitizedText = sanitizedText.replace(ssnRegex, () => {
    idsCount++;
    return '[CONFIDENTIAL_ID]';
  });

  // 3. Financial account & credit card sequences (13 to 16 digits, strict word boundaries)
  const financialRegex = /\b\d{13,16}\b|\b(?:\d{4}[ -]){3}\d{1,4}\b/g;
  sanitizedText = sanitizedText.replace(financialRegex, (match) => {
    const digitsOnly = match.replace(/\D/g, '');
    if (digitsOnly.length >= 13 && digitsOnly.length <= 16) {
      financialCount++;
      return '[CONFIDENTIAL_FINANCIAL_ACCOUNT]';
    }
    return match;
  });

  // 4. Phone numbers (domestic & international formats, strict word boundaries)
  const phoneRegex = /\b(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  sanitizedText = sanitizedText.replace(phoneRegex, (match) => {
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
