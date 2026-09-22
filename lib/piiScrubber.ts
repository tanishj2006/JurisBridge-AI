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

/**
 * Scrubs personally identifiable information (PII) from text using high-precision regex matching.
 * Replaces emails, phone numbers, SSN/IDs, and financial account numbers with confidential tags.
 */
export function scrubPII(text: string): PiiScrubResult {
  if (!text) {
    return {
      sanitizedText: '',
      redactionCount: 0,
      details: { emails: 0, phones: 0, ids: 0, financialAccounts: 0 },
    };
  }

  let sanitizedText = text;
  let emailsCount = 0;
  let phonesCount = 0;
  let idsCount = 0;
  let financialCount = 0;

  // 1. Email addresses
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const emailMatches = sanitizedText.match(emailRegex);
  if (emailMatches) {
    emailsCount = emailMatches.length;
    sanitizedText = sanitizedText.replace(emailRegex, '[CONFIDENTIAL_EMAIL]');
  }

  // 2. SSN / National ID numbers (e.g. XXX-XX-XXXX)
  const ssnRegex = /\b\d{3}-\d{2}-\d{4}\b/g;
  const ssnMatches = sanitizedText.match(ssnRegex);
  if (ssnMatches) {
    idsCount = ssnMatches.length;
    sanitizedText = sanitizedText.replace(ssnRegex, '[CONFIDENTIAL_ID]');
  }

  // 3. Financial account & credit card sequences (13 to 16 digits with optional spaces or dashes)
  const financialRegex = /\b\d(?:[ -]?\d){12,15}\b/g;
  const financialMatches = sanitizedText.match(financialRegex);
  if (financialMatches) {
    // Filter to ensure actual digit count is between 13 and 16 to avoid matching long arbitrary strings
    const validFinancialMatches = financialMatches.filter((m) => {
      const digitsOnly = m.replace(/\D/g, '');
      return digitsOnly.length >= 13 && digitsOnly.length <= 16;
    });

    for (const match of validFinancialMatches) {
      sanitizedText = sanitizedText.replace(match, '[CONFIDENTIAL_FINANCIAL_ACCOUNT]');
      financialCount++;
    }
  }

  // 4. Phone numbers (domestic and international formats)
  const phoneRegex = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g;
  const phoneMatches = sanitizedText.match(phoneRegex);
  if (phoneMatches) {
    // Exclude matches that were already replaced by tags
    const validPhoneMatches = phoneMatches.filter((m) => !m.includes('[CONFIDENTIAL_'));
    for (const match of validPhoneMatches) {
      sanitizedText = sanitizedText.replace(match, '[CONFIDENTIAL_PHONE]');
      phonesCount++;
    }
  }

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
