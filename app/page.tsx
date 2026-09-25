'use client';

import React, { useState } from 'react';
import DisclaimerBanner from '@/components/DisclaimerBanner';
import RiskHeatmap from '@/components/RiskHeatmap';
import ClauseExplainer from '@/components/ClauseExplainer';
import LawyerPrepKit from '@/components/LawyerPrepKit';
import ComparisonDiff from '@/components/ComparisonDiff';
import DocumentChat from '@/components/DocumentChat';
import { SAMPLE_CONTRACTS } from '@/lib/samples';
import type { AnalysisResult, ComparisonResult } from '@/lib/types';
import {
  Scale,
  ShieldCheck,
  FileText,
  Sparkles,
  GitCompare,
  Upload,
  AlertCircle,
  Loader2,
  UserCheck,
  Info,
} from 'lucide-react';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'compare'>('analyze');
  const [persona, setPersona] = useState<string>('Tenant / Renter');

  // Tab 1 state
  const [documentText, setDocumentText] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  // Tab 2 state
  const [docA, setDocA] = useState<string>('');
  const [docB, setDocB] = useState<string>('');
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);

  // Highlighted clause tracking
  const [highlightedClauseId, setHighlightedClauseId] = useState<string | null>(null);

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_CONTRACTS.find((s) => s.id === sampleId);
    if (!sample) return;

    setDocumentText(sample.text);
    if (sample.persona) {
      setPersona(sample.persona);
    }
    if (sample.textB) {
      setDocA(sample.text);
      setDocB(sample.textB);
    }
    setAnalysisResult(null);
    setAnalyzeError(null);
  };

  const handleAnalyze = async () => {
    if (!documentText.trim()) return;

    setIsAnalyzing(true);
    setAnalyzeError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentText, persona }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned HTTP ${res.status}`);
      }

      const data: AnalysisResult = await res.json();
      setAnalysisResult(data);
    } catch (err: any) {
      setAnalyzeError(err.message || 'Failed to analyze document.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCompare = async () => {
    if (!docA.trim() || !docB.trim()) return;

    setIsComparing(true);
    setCompareError(null);

    try {
      const res = await fetch('/api/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docA, docB }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server returned HTTP ${res.status}`);
      }

      const data: ComparisonResult = await res.json();
      setComparisonResult(data);
    } catch (err: any) {
      setCompareError(err.message || 'Failed to compare document versions.');
    } finally {
      setIsComparing(false);
    }
  };

  const scrollToClause = (clauseId: string) => {
    setHighlightedClauseId(clauseId);
    const elem = document.getElementById(clauseId);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      elem.focus();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white overflow-x-hidden w-full max-w-full">
      {/* 1. Top Legal Disclaimer Banner */}
      <DisclaimerBanner />

      {/* Main Container - Constrained Layout */}
      <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 flex-1 space-y-8 overflow-hidden">
        {/* Header Hero Section */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Scale className="h-8 w-8 text-indigo-400" aria-hidden="true" />
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                JurisBridge AI
              </h1>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-950 text-indigo-300 border border-indigo-800">
                v1.0 Production
              </span>
            </div>
            <p className="text-sm sm:text-base text-slate-400 max-w-2xl leading-relaxed">
              AI-powered legal clause demystification, high-risk detection, PII privacy guardrails, and side-by-side contract comparison.
            </p>
          </div>

          {/* Quick Selectors Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            {/* Persona Selector */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shadow-sm">
              <UserCheck className="h-4 w-4 text-indigo-400 shrink-0" aria-hidden="true" />
              <label htmlFor="persona-select" className="text-slate-400 shrink-0 font-medium">
                Persona:
              </label>
              <select
                id="persona-select"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                className="bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5"
              >
                <option value="Tenant / Renter">Tenant / Renter</option>
                <option value="Freelancer / Independent Contractor">
                  Freelancer / Independent Contractor
                </option>
                <option value="Small Business / Consumer">Small Business / Consumer</option>
              </select>
            </div>

            {/* Samples Quick Loader */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs shadow-sm">
              <FileText className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
              <label htmlFor="sample-select" className="text-slate-400 shrink-0 font-medium">
                Load Sample:
              </label>
              <select
                id="sample-select"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleSelectSample(e.target.value);
                }}
                className="bg-slate-950 text-slate-200 font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1.5 py-0.5 max-w-[200px] truncate"
              >
                <option value="" disabled>
                  -- Select Pre-loaded Contract --
                </option>
                {SAMPLE_CONTRACTS.map((sample) => (
                  <option key={sample.id} value={sample.id}>
                    {sample.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav aria-label="Main Application Views">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-1" role="tablist">
            <button
              id="tab-analyze"
              role="tab"
              aria-selected={activeTab === 'analyze'}
              aria-controls="panel-analyze"
              onClick={() => setActiveTab('analyze')}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                activeTab === 'analyze'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              <span>Demystify &amp; Analyze</span>
            </button>

            <button
              id="tab-compare"
              role="tab"
              aria-selected={activeTab === 'compare'}
              aria-controls="panel-compare"
              onClick={() => setActiveTab('compare')}
              className={`px-5 py-3 rounded-xl font-bold text-sm transition flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
                activeTab === 'compare'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <GitCompare className="h-4 w-4" aria-hidden="true" />
              <span>Side-by-Side Comparison</span>
            </button>
          </div>
        </nav>

        {/* Tab 1: Demystify & Analyze Panel */}
        {activeTab === 'analyze' && (
          <div
            id="panel-analyze"
            role="tabpanel"
            aria-labelledby="tab-analyze"
            className="space-y-8 w-full overflow-hidden"
          >
            {/* Input Form Box */}
            <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <label htmlFor="contract-text-input" className="text-base font-bold text-white flex items-center gap-2">
                  <Upload className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                  <span>Paste Legal Contract Text</span>
                </label>

                <span className="text-xs text-slate-400 flex items-center gap-1 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                  <span>Privacy Guardrail Active</span>
                </span>
              </div>

              <textarea
                id="contract-text-input"
                rows={9}
                value={documentText}
                onChange={(e) => setDocumentText(e.target.value)}
                placeholder="Paste contract text here (e.g. lease agreement, NDA, employment contract)..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 break-words"
              />

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                <p className="text-xs text-slate-400 flex items-center gap-1.5 leading-normal">
                  <Info className="h-4 w-4 text-indigo-400 shrink-0" aria-hidden="true" />
                  <span>All emails, phone numbers, SSNs, and credit cards are scrubbed locally before analysis.</span>
                </p>

                <button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !documentText.trim()}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Analyzing Legal Risk &amp; Scrubbing PII...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" aria-hidden="true" />
                      <span>Run AI Legal Analysis</span>
                    </>
                  )}
                </button>
              </div>

              {analyzeError && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs sm:text-sm flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>{analyzeError}</span>
                </div>
              )}
            </section>

            {/* Skeleton Loader during Analysis */}
            {isAnalyzing && (
              <div className="space-y-6 animate-pulse">
                <div className="h-44 bg-slate-900/80 rounded-xl border border-slate-800" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="h-64 bg-slate-900/80 rounded-xl border border-slate-800" />
                  <div className="h-64 bg-slate-900/80 rounded-xl border border-slate-800" />
                </div>
              </div>
            )}

            {/* Analysis Results Display */}
            {analysisResult && !isAnalyzing && (
              <div className="space-y-8">
                {/* PII Scrubbing Status Banner */}
                <div className="bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 p-4 rounded-xl flex items-center justify-between text-xs sm:text-sm shadow-sm">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-400 shrink-0" aria-hidden="true" />
                    <span>
                      <strong className="font-semibold text-white">Privacy Guardrail Active: </strong>
                      {analysisResult.redactedPiiCount > 0
                        ? `${analysisResult.redactedPiiCount} sensitive entities anonymized locally before submission.`
                        : 'No PII detected in submitted text.'}
                    </span>
                  </div>
                </div>

                {/* Risk Heatmap */}
                <RiskHeatmap analysis={analysisResult} />

                {/* Main 2-Column Dashboard: Clause Cards + Document Chat */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  {/* Clause Cards Column (2 Cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <FileText className="h-6 w-6 text-indigo-400" aria-hidden="true" />
                      <span>Clause Breakdown ({analysisResult.clauses.length})</span>
                    </h2>

                    <div className="space-y-5">
                      {analysisResult.clauses.map((clause) => (
                        <ClauseExplainer
                          key={clause.id}
                          clause={clause}
                          isHighlighted={highlightedClauseId === clause.id}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Grounded Chat Drawer (1 Col) */}
                  <div className="lg:col-span-1">
                    <div className="sticky top-6">
                      <DocumentChat
                        documentText={documentText}
                        onSelectClauseCitation={scrollToClause}
                      />
                    </div>
                  </div>
                </div>

                {/* Lawyer Prep Kit Section */}
                <LawyerPrepKit analysis={analysisResult} />
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Side-by-Side Comparison Panel */}
        {activeTab === 'compare' && (
          <div
            id="panel-compare"
            role="tabpanel"
            aria-labelledby="tab-compare"
            className="space-y-8 w-full overflow-hidden"
          >
            {/* Input Dual Box */}
            <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-6 shadow-lg space-y-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <GitCompare className="h-5 w-5 text-indigo-400" aria-hidden="true" />
                <span>Compare Two Contract Drafts</span>
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Draft A Input */}
                <div className="space-y-2">
                  <label htmlFor="draft-a-input" className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Draft A (Original Contract)
                  </label>
                  <textarea
                    id="draft-a-input"
                    rows={8}
                    value={docA}
                    onChange={(e) => setDocA(e.target.value)}
                    placeholder="Paste Draft A text here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 break-words"
                  />
                </div>

                {/* Draft B Input */}
                <div className="space-y-2">
                  <label htmlFor="draft-b-input" className="text-xs font-bold text-indigo-400 uppercase tracking-wider block">
                    Draft B (Revised Contract)
                  </label>
                  <textarea
                    id="draft-b-input"
                    rows={8}
                    value={docB}
                    onChange={(e) => setDocB(e.target.value)}
                    placeholder="Paste Draft B text here..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-xs sm:text-sm text-slate-200 placeholder-slate-500 font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 break-words"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleCompare}
                  disabled={isComparing || !docA.trim() || !docB.trim()}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl font-bold text-sm bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white shadow-lg shadow-indigo-900/40 flex items-center justify-center gap-2 transition focus:outline-none focus:ring-2 focus:ring-indigo-400 shrink-0"
                >
                  {isComparing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                      <span>Comparing Contract Versions...</span>
                    </>
                  ) : (
                    <>
                      <GitCompare className="h-4 w-4" aria-hidden="true" />
                      <span>Run Side-by-Side Comparison</span>
                    </>
                  )}
                </button>
              </div>

              {compareError && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-200 p-4 rounded-xl text-xs sm:text-sm flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>{compareError}</span>
                </div>
              )}
            </section>

            {/* Skeleton Loader during Comparison */}
            {isComparing && (
              <div className="h-80 bg-slate-900/80 rounded-xl border border-slate-800 animate-pulse" />
            )}

            {/* Comparison Results */}
            {comparisonResult && !isComparing && (
              <ComparisonDiff comparison={comparisonResult} />
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p>© 2026 JurisBridge AI — Empowering accessible legal analysis for everyone.</p>
          <p className="text-slate-600">Built with Next.js 14, TypeScript, Tailwind CSS, &amp; Google Gemini 3.6 Flash.</p>
        </div>
      </footer>
    </div>
  );
}
