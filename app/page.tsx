import { ShieldAlert, FileText, Scale } from "lucide-react";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-8 md:p-24">
      <div className="z-10 max-w-5xl w-full items-center justify-between font-mono text-sm flex flex-col md:flex-row gap-4">
        <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
          <Scale className="h-7 w-7 text-indigo-400" />
          <span>JurisBridge AI</span>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-4 py-2 text-xs text-slate-400">
          <FileText className="h-4 w-4 text-emerald-400" />
          <span>Next.js 14 App Router</span>
        </div>
      </div>

      <div className="my-16 text-center max-w-3xl">
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
          AI-Powered Legal Clause Analysis & Comparison
        </h1>
        <p className="mt-4 text-slate-400 text-base md:text-lg">
          JurisBridge AI standardizes legal document analysis, identifying high-risk clauses, simplifying legalese, and generating actionable revisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl w-full">
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition">
          <ShieldAlert className="h-8 w-8 text-amber-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Risk Scoring</h3>
          <p className="text-sm text-slate-400">
            Categorize clauses as SAFE, MEDIUM, or HIGH risk with clear explanations and suggested revisions.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition">
          <FileText className="h-8 w-8 text-indigo-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Document Comparison</h3>
          <p className="text-sm text-slate-400">
            Compare document versions to evaluate favorable, unfavorable, or neutral changes instantly.
          </p>
        </div>
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 transition">
          <Scale className="h-8 w-8 text-emerald-400 mb-4" />
          <h3 className="text-lg font-semibold mb-2">Attorney Guidance</h3>
          <p className="text-sm text-slate-400">
            Auto-generate action items and targeted questions for legal review.
          </p>
        </div>
      </div>
    </main>
  );
}
