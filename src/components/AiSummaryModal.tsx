import React, { useState, useEffect } from 'react';
import { X, Sparkles, Copy, Check, FileText, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.ts';
import { Case, AiCaseSummaryResult } from '../types/index.ts';

interface AiSummaryModalProps {
  targetCase: Case;
  isOpen: boolean;
  onClose: () => void;
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  targetCase,
  isOpen,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState<AiCaseSummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && targetCase) {
      loadSummary();
    }
  }, [isOpen, targetCase?.id]);

  const loadSummary = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.generateCaseSummary(targetCase.id);
      setSummaryData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to synthesize situation report.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!summaryData) return;
    const textToCopy = `[SITREP EMERGENCY BRIEFING - CASE ${targetCase.id}]\nSubject: ${targetCase.person.fullName}\nStatus: ${targetCase.status} | Priority: ${targetCase.priority}\n\n${summaryData.summary}\n\nDisclaimer: ${summaryData.disclaimer}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                AI Situation Briefing (SITREP)
              </h3>
              <p className="text-xs text-slate-400">
                Case {targetCase.id} • Synthesizes only authorized records & verified sightings
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
              <div className="font-mono text-xs text-indigo-300">
                Analyzing verified leads and synthesizing factual situation report...
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {summaryData && !loading && (
            <>
              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-950 border border-slate-800 text-center font-mono">
                <div>
                  <div className="text-[11px] text-slate-400 uppercase">Total Reports</div>
                  <div className="text-lg font-bold text-slate-100 tabular-nums">
                    {summaryData.totalReportsCount}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-emerald-400 uppercase">Verified Sightings</div>
                  <div className="text-lg font-bold text-emerald-400 tabular-nums">
                    {summaryData.verifiedSightingsCount}
                  </div>
                </div>
                <div>
                  <div className="text-[11px] text-amber-400 uppercase">In Review</div>
                  <div className="text-lg font-bold text-amber-400 tabular-nums">
                    {summaryData.pendingReviewCount}
                  </div>
                </div>
              </div>

              {/* Situation Summary Body */}
              <div className="space-y-2">
                <div className="font-mono uppercase font-bold text-slate-400 text-[11px] tracking-wider">
                  Executive Incident Briefing
                </div>
                <div className="p-4 rounded-lg bg-slate-950 border border-slate-800/80 text-slate-100 text-sm leading-relaxed font-sans shadow-inner">
                  {summaryData.summary}
                </div>
              </div>

              {/* Critical Leads */}
              {summaryData.criticalLeads.length > 0 && (
                <div className="space-y-1.5">
                  <div className="font-mono uppercase font-bold text-slate-400 text-[11px] tracking-wider">
                    Verified Trajectory Leads
                  </div>
                  <ul className="space-y-1">
                    {summaryData.criticalLeads.map((lead, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-slate-300 font-mono text-[11px] bg-slate-950/60 px-3 py-1.5 rounded border border-slate-800"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        <span>{lead}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Mandatory Human Review Disclaimer */}
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300/90 font-mono text-[10px] leading-relaxed">
                ⚠️ {summaryData.disclaimer}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={loadSummary}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200 font-mono text-xs cursor-pointer"
            >
              Regenerate Briefing
            </button>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={!summaryData}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded cursor-pointer transition-colors"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy Briefing'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
