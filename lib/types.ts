/** Tracks whether a result was produced by live AI inference or an offline resilience fallback. */
export type DataSource = 'live' | 'cached-resilience';

export interface ClauseAnalysis {
  id: string;
  category: string;
  originalText: string;
  simplifiedText: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'SAFE';
  explanation: string;
  suggestedRevision?: string;
}

export interface AnalysisResult {
  summary: string;
  overallRiskScore: number; // Scale 1 - 100
  clauses: ClauseAnalysis[];
  actionItems: string[];
  attorneyQuestions: string[];
  redactedPiiCount: number; // Demonstrates active privacy scrubbing
  disclaimer: string;      // Reinforces informational-only scope
  dataSource?: DataSource;  // UI metadata badge
}

export interface DiffItem {
  clauseTopic: string;
  docA: string;
  docB: string;
  changeSeverity: 'FAVORABLE' | 'UNFAVORABLE' | 'NEUTRAL';
  impact: string;
}

export interface ComparisonResult {
  documentType: string;
  keyDifferences: DiffItem[];
  riskSummary: string;
  dataSource?: DataSource;  // UI metadata badge
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citedClauseIds?: string[];
}
