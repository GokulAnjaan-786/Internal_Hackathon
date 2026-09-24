import React, { useEffect, useState } from 'react';
import { X, CheckSquare, Square, AlertCircle, Lock, ShieldCheck, FileCheck } from 'lucide-react';
import { api } from '../services/api.ts';
import { CaseClosureChecklist } from '../types/index.ts';

interface CaseClosureModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  onCaseClosed: () => void;
}

export const CaseClosureModal: React.FC<CaseClosureModalProps> = ({
  isOpen,
  onClose,
  caseId,
  onCaseClosed,
}) => {
  const [checklist, setChecklist] = useState<CaseClosureChecklist | null>(null);
  const [closureReason, setClosureReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChecklist = async () => {
    try {
      const res = await api.getCaseClosureChecklist(caseId);
      setChecklist(res);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchChecklist();
    }
  }, [isOpen, caseId]);

  if (!isOpen) return null;

  const handleToggle = async (key: keyof CaseClosureChecklist) => {
    if (!checklist) return;
    const updatedValue = !checklist[key];
    const newChecklist = { ...checklist, [key]: updatedValue };
    setChecklist(newChecklist);
    try {
      await api.updateCaseClosureChecklist(caseId, { [key]: updatedValue });
    } catch {
      // ignore
    }
  };

  const handleFinalClose = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!closureReason.trim()) {
      setError('Formal closure justification reason is required.');
      return;
    }

    if (!checklist?.identityConfirmed) {
      setError('You must confirm subject identity and status according to authorized procedure.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.closeCase(caseId, closureReason.trim());
      onCaseClosed();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to close case.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Official Case Closure Workflow</h2>
              <p className="text-[11px] text-slate-400 font-mono">Case: {caseId}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleFinalClose} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-red-950/50 border border-red-500/40 rounded text-xs text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Verification Warning */}
          <div className="p-3 rounded border border-amber-500/30 bg-amber-950/20 text-xs text-amber-200 space-y-1">
            <div className="font-semibold flex items-center gap-1.5 font-mono">
              <Lock className="h-3.5 w-3.5 text-amber-400" />
              <span>Mandatory Human Authority Verification</span>
            </div>
            <p className="text-[11px] text-amber-300/80 leading-relaxed">
              AI systems NEVER close cases automatically. Case closure requires human officer verification and a recorded justification.
            </p>
          </div>

          {/* Checklist */}
          {checklist && (
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
                Case Closure Protocol Checklist
              </div>
              <div className="space-y-1.5 bg-slate-950 p-3 rounded border border-slate-800 text-xs text-slate-200">
                <button
                  type="button"
                  onClick={() => handleToggle('identityConfirmed')}
                  className="w-full flex items-center gap-2.5 text-left py-1 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {checklist.identityConfirmed ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span>Subject identity and status confirmed according to authorised procedure</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('leadsReviewed')}
                  className="w-full flex items-center gap-2.5 text-left py-1 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {checklist.leadsReviewed ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span>All active investigation leads reviewed and closed</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('tasksReviewed')}
                  className="w-full flex items-center gap-2.5 text-left py-1 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {checklist.tasksReviewed ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span>Pending investigation tasks completed or formally cancelled</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('evidenceUpdated')}
                  className="w-full flex items-center gap-2.5 text-left py-1 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {checklist.evidenceUpdated ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span>Evidence vault entries and media attachments updated</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleToggle('notesCompleted')}
                  className="w-full flex items-center gap-2.5 text-left py-1 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  {checklist.notesCompleted ? (
                    <CheckSquare className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-500 shrink-0" />
                  )}
                  <span>Final officer investigation notes completed</span>
                </button>
              </div>
            </div>
          )}

          {/* Closure Reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Official Closure Reason & Findings <span className="text-red-400">*</span>
            </label>
            <textarea
              value={closureReason}
              onChange={(e) => setClosureReason(e.target.value)}
              rows={3}
              placeholder="e.g. Person located safe at family residence. Identity verified by Sub-Inspector V. Rajesh..."
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-100 focus:border-emerald-500 outline-none resize-none"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Closing Case...' : 'Officially Close Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
