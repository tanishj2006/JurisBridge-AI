'use client';

import React, { useState } from 'react';
import { AlertTriangle, X, Shield } from 'lucide-react';

interface DisclaimerBannerProps {
  customMessage?: string;
}

export default function DisclaimerBanner({ customMessage }: DisclaimerBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <div className="bg-slate-900 border-b border-amber-500/30 px-4 py-1.5 text-xs text-amber-200/90 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-amber-400 shrink-0" aria-hidden="true" />
          <span>Notice: Educational Legal Analysis Tool</span>
        </span>
        <button
          onClick={() => setDismissed(false)}
          className="text-amber-400 hover:text-amber-200 underline focus:outline-none focus:ring-2 focus:ring-amber-400 rounded px-1"
          aria-label="Re-open legal disclaimer notice"
        >
          View Full Disclaimer
        </button>
      </div>
    );
  }

  return (
    <aside
      role="alert"
      aria-live="polite"
      aria-label="Legal Disclaimer"
      className="bg-amber-950/80 border-b border-amber-500/40 text-amber-100 px-4 py-3 sm:px-6 shadow-md transition-all"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0"
            aria-hidden="true"
          />
          <p className="text-sm font-medium leading-relaxed">
            <strong className="font-semibold text-amber-300">Important Legal Notice: </strong>
            {customMessage ||
              'JurisBridge AI provides document analysis and educational assistance, not professional legal counsel. Always consult a qualified attorney before signing binding agreements.'}
          </p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="self-end sm:self-center shrink-0 flex items-center gap-1 text-xs font-semibold bg-amber-900/60 hover:bg-amber-800/80 text-amber-200 border border-amber-500/40 px-3 py-1.5 rounded-md transition focus:outline-none focus:ring-2 focus:ring-amber-400"
          aria-label="Acknowledge and dismiss legal disclaimer banner"
        >
          <span>I Understand</span>
          <X className="h-3.5 w-3.5 ml-1" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
