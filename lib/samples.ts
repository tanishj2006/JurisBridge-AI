export interface SampleContract {
  id: string;
  title: string;
  description: string;
  persona: string;
  text: string;
  textB?: string;
}

export const SAMPLE_CONTRACTS: SampleContract[] = [
  {
    id: 'sample-lease',
    title: 'Sample 1: Residential Lease (Hidden Repair Fees & Unilateral Entry)',
    description: 'Residential lease with high tenant liability, repair fee shifts, and 24/7 landlord entry.',
    persona: 'Tenant / Renter',
    text: `RESIDENTIAL LEASE AGREEMENT

Tenant: Jane Doe (Email: jane.doe@example.com, Phone: 555-123-4567, SSN: 987-65-4321)
Landlord: Apex Properties LLC

1. PREMISES AND TERM
Landlord leases to Tenant the premises at 742 Evergreen Terrace for a period of 12 calendar months beginning October 1, 2026.

2. MAINTENANCE AND REPAIRS
Tenant shall be solely responsible for all maintenance, repairs, and replacements of plumbing, heating, air conditioning, and electrical systems on the premises, regardless of cause or normal wear and tear. Any repair exceeding $50 shall be billed to Tenant with a mandatory 15% administrative fee.

3. LANDLORD ENTRY AND ACCESS
Landlord reserves the right to enter the premises at any hour of the day or night without prior notice for inspections, routine maintenance, or promotional photography without limitation.

4. AUTOMATIC RENEWAL AND CANCELLATION
This agreement shall automatically renew for successive 1-year terms unless Tenant provides written notice via certified mail exactly 120 days prior to expiration. Failure to provide notice results in a mandatory 25% rent increase upon renewal.

5. INDEMNIFICATION AND LIABILITY CAP
Tenant agrees to indemnify, defend, and hold harmless Landlord from any and all claims, injuries, damages, or attorney fees arising on the premises. Landlord's total liability under any circumstances shall not exceed $100.

6. BINDING ARBITRATION
Any dispute arising under this Lease shall be resolved exclusively through binding arbitration administered by Landlord's designated arbitration firm. Tenant waives all rights to a jury trial or class action participation.`,
    textB: `RESIDENTIAL LEASE AGREEMENT (REVISED DRAFT B)

Tenant: Jane Doe (Email: jane.doe@example.com, Phone: 555-123-4567)
Landlord: Apex Properties LLC

1. PREMISES AND TERM
Landlord leases to Tenant the premises at 742 Evergreen Terrace for a period of 12 calendar months beginning October 1, 2026.

2. MAINTENANCE AND REPAIRS
Landlord shall be responsible for structural, plumbing, heating, and electrical repairs resulting from normal wear and tear. Tenant shall only be responsible for repairs caused by Tenant's intentional negligence, capped at $150 per incident.

3. LANDLORD ENTRY AND ACCESS
Landlord may enter the premises only after providing at least 24 hours advance written notice, except in cases of immediate emergency. Inspections shall occur during normal business hours.

4. RENEWAL
Lease shall renew on a month-to-month basis unless either party provides 30 days written notice prior to expiration.

5. INDEMNIFICATION
Each party agrees to be responsible for its own negligent acts or omissions.

6. DISPUTE RESOLUTION
Disputes may be submitted to mediation prior to pursuing legal remedies in municipal court.`,
  },
  {
    id: 'sample-freelance',
    title: 'Sample 2: Freelancer Agreement (Overly Broad Non-Compete & IP Transfer)',
    description: 'Independent contractor agreement with perpetual worldwide non-compete and total IP seizure.',
    persona: 'Freelancer / Independent Contractor',
    text: `INDEPENDENT CONTRACTOR AGREEMENT

Contractor: Alex Smith (Email: alex.smith@freelance.org, Phone: +1 555-987-6543, Account: 4532-0151-8283-9104)
Client: Global Tech Solutions Corp

1. SERVICES AND PAYMENT
Contractor will provide software engineering services. Client shall pay Contractor $85 per hour, net 90 days following invoice receipt.

2. INTELLECTUAL PROPERTY ASSIGNMENT
Contractor hereby irrevocably assigns to Client all right, title, and interest in and to all inventions, code, designs, algorithms, and concepts created, conceived, or reduced to practice by Contractor during the term of this Agreement AND for a period of five (5) years thereafter, regardless of whether created for Client or on Contractor's own personal time.

3. NON-COMPETE AND NON-SOLICITATION
During the term and for three (3) years following termination, Contractor shall not directly or indirectly provide any services, consult for, or be employed by any entity anywhere in the world that competes with Client or operates in the technology industry.

4. UNILATERAL TERMINATION AND WITHHOLDING
Client may terminate this Agreement immediately at any time without cause. Upon termination, Client reserves the right to withhold all pending compensation as liquidated damages.

5. CONFIDENTIALITY
Contractor shall maintain strict confidentiality of all Client trade secrets in perpetuity. Any breach shall subject Contractor to immediate injunctive relief and liquidated damages of $500,000.`,
    textB: `INDEPENDENT CONTRACTOR AGREEMENT (REVISED DRAFT B)

Contractor: Alex Smith (Email: alex.smith@freelance.org)
Client: Global Tech Solutions Corp

1. SERVICES AND PAYMENT
Contractor will provide software engineering services. Client shall pay Contractor $85 per hour, net 30 days following invoice receipt.

2. INTELLECTUAL PROPERTY ASSIGNMENT
Contractor assigns to Client all right, title, and interest specifically in deliverables created directly for Client under an executed Statement of Work upon full payment of invoices. Contractor retains ownership of pre-existing tools and generic code libraries.

3. NON-COMPETE
Contractor shall not solicit Client's direct active clients for a period of six (6) months following agreement termination within Contractor's local state.

4. TERMINATION
Either party may terminate this Agreement upon 14 days written notice. Client shall pay Contractor for all work completed up to the effective termination date.

5. CONFIDENTIALITY
Contractor shall maintain confidentiality of proprietary Client information for a period of two (2) years post-termination.`,
  },
];
