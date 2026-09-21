import { describe, it, expect } from "vitest";
import type { ClauseAnalysis, AnalysisResult, ComparisonResult, ChatMessage, DiffItem } from "../lib/types";

describe("JurisBridge AI Types Verification", () => {
  it("should format ClauseAnalysis object correctly with optional suggestedRevision", () => {
    const clause: ClauseAnalysis = {
      id: "clause-1",
      category: "Indemnification",
      originalText: "Indemnification clause...",
      simplifiedText: "Party A pays if Party B gets sued.",
      riskLevel: "HIGH",
      explanation: "Unlimited liability exposure without cap.",
      suggestedRevision: "Add liability cap of $100,000.",
    };

    expect(clause.riskLevel).toBe("HIGH");
    expect(clause.category).toBe("Indemnification");
  });

  it("should format AnalysisResult with redactedPiiCount and disclaimer", () => {
    const analysis: AnalysisResult = {
      summary: "Contract requires revision before signature.",
      overallRiskScore: 82,
      clauses: [],
      actionItems: ["Review indemnification clause"],
      attorneyQuestions: ["Is there mutual indemnification?"],
      redactedPiiCount: 3,
      disclaimer: "Informational only. Does not constitute formal legal counsel.",
    };

    expect(analysis.overallRiskScore).toBe(82);
    expect(analysis.redactedPiiCount).toBe(3);
    expect(analysis.disclaimer).toContain("Informational only");
  });

  it("should format ComparisonResult with DiffItem and riskSummary", () => {
    const diff: DiffItem = {
      clauseTopic: "Term Duration",
      docA: "3 years",
      docB: "5 years",
      changeSeverity: "UNFAVORABLE",
      impact: "Extends confidentiality obligation by 2 years.",
    };

    const comparison: ComparisonResult = {
      documentType: "Non-Disclosure Agreement",
      keyDifferences: [diff],
      riskSummary: "Overall change increases obligation duration.",
    };

    expect(comparison.keyDifferences[0].changeSeverity).toBe("UNFAVORABLE");
    expect(comparison.riskSummary).toBeDefined();
  });

  it("should format ChatMessage object correctly", () => {
    const msg: ChatMessage = {
      role: "assistant",
      content: "Clause 3 introduces strict confidentiality rules.",
      citedClauseIds: ["clause-3"],
    };

    expect(msg.role).toBe("assistant");
    expect(msg.citedClauseIds).toContain("clause-3");
  });
});
