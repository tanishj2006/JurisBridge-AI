import { describe, it, expect } from 'vitest';
import { SAMPLE_CONTRACTS } from '../lib/samples';

describe('JurisBridge AI Sample Contracts & Datasets', () => {
  it('should contain 2 ready-to-test sample contracts', () => {
    expect(SAMPLE_CONTRACTS).toHaveLength(2);
    expect(SAMPLE_CONTRACTS[0].id).toBe('sample-lease');
    expect(SAMPLE_CONTRACTS[1].id).toBe('sample-freelance');
  });

  it('sample contracts should have valid text and PII fields for testing', () => {
    const lease = SAMPLE_CONTRACTS[0];
    expect(lease.text).toContain('Tenant: Jane Doe');
    expect(lease.text).toContain('jane.doe@example.com');
    expect(lease.textB).toBeDefined();

    const freelance = SAMPLE_CONTRACTS[1];
    expect(freelance.text).toContain('Contractor: Alex Smith');
    expect(freelance.text).toContain('alex.smith@freelance.org');
    expect(freelance.textB).toBeDefined();
  });
});
