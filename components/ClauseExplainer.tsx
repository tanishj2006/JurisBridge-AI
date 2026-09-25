'use client';

import React, { useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FileText,
  Sparkles,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import type { ClauseAnalysis } from '@/lib/types';

interface ClauseExplainerProps {
  clause: ClauseAnalysis;
  isHighlighted?: boolean;
}

export default function ClauseExplainer({ clause, isHighlighted }: ClauseExplainerProps) {
  const [viewMode, setViewMode] = useState<'plain' | 'original'>('plain');
  const [isRevisionOpen, setIsRevisionOpen] = useState(clause.riskLevel === 'HIGH');

  let riskBadge = (
    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
      <span>SAFE</span>
    </span>
  );

  if (clause.riskLevel === 'HIGH') {
    riskBadge = (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30 flex items-center gap-1">
        <AlertCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
        <span>HIGH RISK</span>
      </span>
    );
  } else if (clause.riskLevel === 'MEDIUM') {
    riskBadge = (
      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
        <span>MEDIUM RISK</span>
      </span>
    );
  }

  return (
    <article
      id={clause.id}
      tabIndex={-1}
      className={`rounded-xl border p-5 transition-all duration-300 shadow-md break-words w-full overflow-hidden ${
        isHighlighted
          ? 'bg-indigo-950/40 border-indigo-500 ring-2 ring-indigo-500/50 shadow-indigo-900/30'
          : 'bg-slate-900/80 border-slate-800 backdrop-blur-md hover:border-slate-700'
      }`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            {clause.category}
          </span>
          <span className="text-xs text-slate-500 font-mono">{clause.id}</span>
        </div>
        <div>{riskBadge}</div>
      </div>

      {/* Toggle View Mode */}
      <div className="mt-4 flex items-center justify-between bg-slate-950/80 p-1.5 rounded-xl border border-slate-800">
        <span className="text-xs font-medium text-slate-400 pl-2">Text View:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('plain')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              viewMode === 'plain'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            aria-pressed={viewMode === 'plain'}
            aria-label="View Plain English 8th-grade explanation"
          >
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Plain English</span>
          </button>
          <button
            onClick={() => setViewMode('original')}
            className={`px-3 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-400 ${
              viewMode === 'original'
                ? 'bg-slate-700 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            aria-pressed={viewMode === 'original'}
            aria-label="View Original Legalese text"
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Original Legalese</span>
          </button>
        </div>
      </div>

      {/* Main Text Content */}
      <div className="mt-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 break-words">
        {viewMode === 'plain' ? (
          <div>
            <div className="text-xs font-semibold text-indigo-300 mb-1 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Simplified Explanation (8th-Grade Level)</span>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{clause.simplifiedText}</p>
          </div>
        ) : (
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Verbatim Clause Text</span>
            </div>
            <p className="text-sm text-slate-300 font-mono italic leading-relaxed whitespace-pre-wrap">
              &quot;{clause.originalText}&quot;
            </p>
          </div>
        )}
      </div>

      {/* Explanation Callout */}
      <div className="mt-4 bg-slate-900/90 p-4 rounded-xl border border-slate-800 break-words">
        <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <HelpCircle className="h-4 w-4 text-amber-400" aria-hidden="true" />
          <span>Why This Matters</span>
        </h4>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{clause.explanation}</p>
      </div>

      {/* Suggested Revision Accordion */}
      {clause.suggestedRevision && (
        <div className="mt-4 border border-indigo-900/50 rounded-xl overflow-hidden bg-slate-950/80">
          <button
            onClick={() => setIsRevisionOpen(!isRevisionOpen)}
            className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-semibold text-indigo-300 bg-indigo-950/30 hover:bg-indigo-950/60 transition focus:outline-none focus:ring-2 focus:ring-indigo-400"
            aria-expanded={isRevisionOpen}
            aria-controls={`revision-${clause.id}`}
          >
            <span className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-indigo-400" aria-hidden="true" />
              <span>Suggested Revision / Balanced Pushback Clause</span>
            </span>
            {isRevisionOpen ? (
              <ChevronUp className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 text-indigo-400" aria-hidden="true" />
            )}
          </button>

          {isRevisionOpen && (
            <div id={`revision-${clause.id}`} className="p-4 border-t border-indigo-900/40 bg-indigo-950/20 space-y-2 break-words">
              <p className="text-xs text-slate-300 leading-relaxed font-mono whitespace-pre-wrap">
                {clause.suggestedRevision}
              </p>
              <div className="pt-2">
                <button
                  onClick={() => navigator.clipboard.writeText(clause.suggestedRevision || '')}
                  className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                >
                  Copy Proposed Revision
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
