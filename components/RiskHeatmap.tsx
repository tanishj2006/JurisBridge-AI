'use client';

import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { AnalysisResult } from '@/lib/types';

interface RiskHeatmapProps {
  analysis: AnalysisResult;
}

export default function RiskHeatmap({ analysis }: RiskHeatmapProps) {
  const { overallRiskScore, clauses, summary, actionItems } = analysis;

  const highCount = clauses.filter((c) => c.riskLevel === 'HIGH').length;
  const mediumCount = clauses.filter((c) => c.riskLevel === 'MEDIUM').length;
  const safeCount = clauses.filter((c) => c.riskLevel === 'SAFE').length;

  // Dynamic risk color styling
  let scoreColorClass = 'text-emerald-400 border-emerald-500/30 bg-emerald-950/40';
  let barColorClass = 'bg-emerald-500';
  let riskLabel = 'Low Risk';

  if (overallRiskScore >= 70) {
    scoreColorClass = 'text-rose-400 border-rose-500/40 bg-rose-950/40';
    barColorClass = 'bg-rose-500';
    riskLabel = 'Critical Risk';
  } else if (overallRiskScore >= 30) {
    scoreColorClass = 'text-amber-400 border-amber-500/40 bg-amber-950/40';
    barColorClass = 'bg-amber-500';
    riskLabel = 'Moderate Risk';
  }

  return (
    <section
      aria-labelledby="risk-heatmap-heading"
      className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6"
    >
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2
            id="risk-heatmap-heading"
            className="text-xl font-bold text-white flex items-center gap-2"
          >
            <ShieldAlert className="h-6 w-6 text-indigo-400" aria-hidden="true" />
            <span>Document Risk Heatmap</span>
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Automated legal threat analysis & risk breakdown
          </p>
        </div>

        {/* Clause Chips */}
        <div className="flex items-center gap-2 flex-wrap" role="region" aria-label="Risk Clause Counts">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-rose-950/60 text-rose-300 border border-rose-800/60 flex items-center gap-1.5 shadow-sm"
            aria-label={`${highCount} high risk clauses detected`}
          >
            <AlertCircle className="h-3.5 w-3.5 text-rose-400" aria-hidden="true" />
            <span>{highCount} High Risk</span>
          </span>

          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-amber-950/60 text-amber-300 border border-amber-800/60 flex items-center gap-1.5 shadow-sm"
            aria-label={`${mediumCount} medium risk clauses detected`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-amber-400" aria-hidden="true" />
            <span>{mediumCount} Medium Risk</span>
          </span>

          <span
            className="px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 flex items-center gap-1.5 shadow-sm"
            aria-label={`${safeCount} safe clauses detected`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" aria-hidden="true" />
            <span>{safeCount} Safe</span>
          </span>
        </div>
      </div>

      {/* Main Score & Progress Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Score Meter */}
        <div className={`p-5 rounded-xl border flex flex-col items-center justify-center text-center ${scoreColorClass}`}>
          <span className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">
            Overall Risk Index
          </span>
          <div className="text-5xl font-black tracking-tight my-1">
            {overallRiskScore}
            <span className="text-lg font-medium text-slate-400">/100</span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-900/60 border border-current mt-1">
            {riskLabel}
          </span>
        </div>

        {/* Progress & Executive Summary */}
        <div className="md:col-span-2 space-y-4">
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-400 mb-1.5">
              <span>Risk Meter</span>
              <span>{overallRiskScore}% Severity Score</span>
            </div>
            <div
              className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700"
              role="progressbar"
              aria-valuenow={overallRiskScore}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`Overall risk score is ${overallRiskScore} out of 100`}
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${barColorClass}`}
                style={{ width: `${Math.min(100, Math.max(0, overallRiskScore))}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-950/60 rounded-xl p-4 border border-slate-800">
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Executive Assessment
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          </div>
        </div>
      </div>

      {/* Key Action Items */}
      {actionItems && actionItems.length > 0 && (
        <div className="bg-slate-950/40 rounded-xl p-4 border border-slate-800/80">
          <h3 className="text-sm font-semibold text-amber-300 mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" aria-hidden="true" />
            <span>Key Risk Items to Address</span>
          </h3>
          <ul className="space-y-1.5 pl-5 list-disc text-xs sm:text-sm text-slate-300">
            {actionItems.map((item, idx) => (
              <li key={idx} className="leading-snug">
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
