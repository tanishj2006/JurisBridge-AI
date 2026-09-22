'use client';

import React from 'react';
import { GitCompare, TrendingUp, TrendingDown, Minus, ShieldAlert } from 'lucide-react';
import type { ComparisonResult } from '@/lib/types';

interface ComparisonDiffProps {
  comparison: ComparisonResult;
}

export default function ComparisonDiff({ comparison }: ComparisonDiffProps) {
  const { documentType, keyDifferences, riskSummary } = comparison;

  return (
    <section
      aria-labelledby="comparison-diff-heading"
      className="bg-slate-900/90 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
    >
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <GitCompare className="h-6 w-6 text-indigo-400" aria-hidden="true" />
          <h2 id="comparison-diff-heading" className="text-xl font-bold text-white">
            Contract Draft Comparison ({documentType})
          </h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Side-by-side analysis highlighting changes, severity shifts, and practical impact
        </p>
      </div>

      {/* Overall Risk Shift Summary */}
      <div className="bg-slate-950/80 p-4 sm:p-5 rounded-xl border border-indigo-900/40">
        <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <ShieldAlert className="h-4 w-4 text-indigo-400" aria-hidden="true" />
          <span>Overall Risk Shift Summary</span>
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed">{riskSummary}</p>
      </div>

      {/* Side-by-Side Differences Grid */}
      <div className="space-y-6">
        <h3 className="text-base font-semibold text-white">Clause-by-Clause Impact</h3>

        {keyDifferences.map((diff, idx) => {
          let badge = (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
              <Minus className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>NEUTRAL CHANGE</span>
            </span>
          );

          if (diff.changeSeverity === 'FAVORABLE') {
            badge = (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
                <span>FAVORABLE SHIFT</span>
              </span>
            );
          } else if (diff.changeSeverity === 'UNFAVORABLE') {
            badge = (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 flex items-center gap-1">
                <TrendingDown className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
                <span>UNFAVORABLE SHIFT</span>
              </span>
            );
          }

          return (
            <div
              key={idx}
              className="bg-slate-950/70 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition shadow-sm"
            >
              {/* Diff Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-3">
                <h4 className="text-base font-semibold text-indigo-200">
                  {idx + 1}. {diff.clauseTopic}
                </h4>
                <div>{badge}</div>
              </div>

              {/* Side-by-Side Dual Column */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Draft A */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block mb-1">
                    Draft A (Original)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                    {diff.docA}
                  </p>
                </div>

                {/* Draft B */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider block mb-1">
                    Draft B (Revision)
                  </span>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                    {diff.docB}
                  </p>
                </div>
              </div>

              {/* Plain-English Practical Impact */}
              <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-xs sm:text-sm">
                <span className="font-semibold text-slate-200">Practical Impact: </span>
                <span className="text-slate-300">{diff.impact}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
