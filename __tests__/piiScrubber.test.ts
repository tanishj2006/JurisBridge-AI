import { describe, it, expect } from 'vitest';
import { scrubPII } from '../lib/piiScrubber';

describe('PII Scrubber Utility', () => {
  it('should return empty result when text is empty', () => {
    const result = scrubPII('');
    expect(result.sanitizedText).toBe('');
    expect(result.redactionCount).toBe(0);
    expect(result.details).toEqual({ emails: 0, phones: 0, ids: 0, financialAccounts: 0 });
  });

  it('should scrub email addresses', () => {
    const input = 'Contact john.doe@example.com or jane_smith12@company.co.uk for inquiries.';
    const result = scrubPII(input);
    expect(result.sanitizedText).toBe(
      'Contact [CONFIDENTIAL_EMAIL] or [CONFIDENTIAL_EMAIL] for inquiries.'
    );
    expect(result.details.emails).toBe(2);
    expect(result.redactionCount).toBe(2);
  });

  it('should scrub phone numbers in various formats', () => {
    const input = 'Call +1 (555) 123-4567 or 555.987.6543 today.';
    const result = scrubPII(input);
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_PHONE]');
    expect(result.details.phones).toBe(2);
  });

  it('should scrub Social Security / National ID numbers', () => {
    const input = 'Taxpayer ID is 123-45-6789.';
    const result = scrubPII(input);
    expect(result.sanitizedText).toBe('Taxpayer ID is [CONFIDENTIAL_ID].');
    expect(result.details.ids).toBe(1);
  });

  it('should scrub financial account & credit card sequences', () => {
    const input = 'Card number: 4532 0151 8283 9104 and 4111-2222-3333-4444.';
    const result = scrubPII(input);
    expect(result.sanitizedText).toBe(
      'Card number: [CONFIDENTIAL_FINANCIAL_ACCOUNT] and [CONFIDENTIAL_FINANCIAL_ACCOUNT].'
    );
    expect(result.details.financialAccounts).toBe(2);
  });

  it('should scrub multiple PII types from a single document text', () => {
    const text = `
      Agreement between User john@test.com (SSN: 987-65-4321) and Provider.
      Direct payment to card 5555-4444-3333-2222.
      Call 800-555-0199 for support.
    `;
    const result = scrubPII(text);
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_EMAIL]');
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_ID]');
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_FINANCIAL_ACCOUNT]');
    expect(result.sanitizedText).toContain('[CONFIDENTIAL_PHONE]');
    expect(result.redactionCount).toBe(4);
  });
});
