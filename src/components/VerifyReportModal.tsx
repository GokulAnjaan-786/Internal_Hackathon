import React, { useState } from 'react';
import {
  X,
  CheckCircle,
  XCircle,
  Copy,
  HelpCircle,
  Sparkles,
  AlertCircle,
  MapPin,
  Calendar,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Report, Case, AiMatchAnalysis } from '../types/index.ts';
import { api } from '../services/api.ts';

interface VerifyReportModalProps {
  report: Report;
  linkedCase?: Case;
  isOpen: boolean;
  onClose: () => void;
  onReportUpdated: (updatedReport: Report) => void;
}

export const VerifyReportModal: React.FC<VerifyReportModalProps> = ({
  report,
  linkedCase,
  isOpen,
  onClose,
  onReportUpdated,
}) => {
  const [activeAction, setActiveAction] = useState<
    'VERIFY' | 'REJECT' | 'DUPLICATE' | 'REQUEST_INFO'
  >('VERIFY');
  const [notes, setNotes] = useState('');
  const [duplicateId, setDuplicateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Assistance state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMatch, setAiMatch] = useState<AiMatchAnalysis | null>(null);

  if (!isOpen) return null;

  const handleRunAiMatch = async () => {
    if (!linkedCase) return;
    setAiLoading(true);
    try {
      const result = await api.matchDescription(linkedCase.id, report.description);
      setAiMatch(result);
    } catch (err: any) {
      setError(err.message || 'AI analysis unavailable');
    } finally {
      setAiLoading(false);
    }
  };

  const handleSubmitAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let resultReport: Report;

      if (activeAction === 'VERIFY') {
        const res = await api.verifyReport(
          report.id,
          notes || 'Independently corroborated with eyewitness and regional surveillance.'
        );
        resultReport = res.report;
      } else if (activeAction === 'REJECT') {
        if (!notes.trim()) {
          setError('A justification note is required to reject an emergency report.');
          setLoading(false);
          return;
        }
        resultReport = await api.rejectReport(report.id, notes);
      } else if (activeAction === 'DUPLICATE') {
        resultReport = await api.duplicateReport(report.id, duplicateId || 'MASTER_REPORT', notes);
      } else {
        resultReport = await api.requestReportInfo(
          report.id,
          notes || 'Additional photographic evidence or specific clothing details requested.'
        );
      }

      onReportUpdated(resultReport);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification action.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                  Rapid Verification Workspace
                </h3>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {report.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Authoritative verification desk • Sighting cross-examination
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

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Side-by-Side Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Case Reference Information */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                  Target Missing Person
                </span>
                <span className="font-mono text-xs text-slate-400">
                  {linkedCase?.id || report.caseId}
                </span>
              </div>

              {linkedCase ? (
                <>
                  <div className="flex items-start gap-3">
                    <img
                      src={linkedCase.person.photoUrl}
                      alt={linkedCase.person.fullName}
                      className="h-16 w-16 rounded object-cover border border-slate-700 flex-shrink-0"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-100">
                        {linkedCase.person.fullName}
                      </div>
                      <div className="text-slate-400">
                        {linkedCase.person.age} years old • {linkedCase.person.gender} • {linkedCase.person.height}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Missing since: {linkedCase.person.dateMissing}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                    <div>
                      <span className="text-slate-400 font-medium">Clothing: </span>
                      <span className="text-slate-200">{linkedCase.person.clothingDescription}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Identifying Marks: </span>
                      <span className="text-slate-200">{linkedCase.person.identifyingMarks}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Last Known Area: </span>
                      <span className="text-slate-200">{linkedCase.person.lastKnownLocation}</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 italic">No linked case profile loaded.</div>
              )}
            </div>

            {/* Right: Submitted Sighting Report */}
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Incoming Report Evidence
                </span>
                <span className="font-mono text-xs text-slate-400">{report.source}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-slate-500" />
                    {report.date}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    {report.time}
                  </span>
                  <span className="text-slate-300 font-medium">By: {report.reporterName}</span>
                </div>

                <div className="flex items-start gap-1.5 text-slate-300">
                  <MapPin className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Location: </strong>
                    {report.location} ({report.latitude.toFixed(4)}, {report.longitude.toFixed(4)})
                  </span>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-slate-100 leading-relaxed">
                  "{report.description}"
                </div>

                {report.uploadedFiles.length > 0 && (
                  <div className="pt-2">
                    <div className="text-slate-400 mb-1">Attached Sighting Media:</div>
                    <div className="flex gap-2">
                      {report.uploadedFiles.map((f) => (
                        <img
                          key={f.id}
                          src={f.url}
                          alt="Sighting attachment"
                          className="h-16 w-16 object-cover rounded border border-slate-700"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* AI Description Correlation Assistant */}
          <div className="p-4 rounded-lg bg-indigo-950/20 border border-indigo-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-indigo-400" />
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-indigo-300">
                  AI Investigation-Support Assistant
                </span>
              </div>
              <button
                type="button"
                onClick={handleRunAiMatch}
                disabled={aiLoading || !linkedCase}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-[11px] rounded transition-colors cursor-pointer disabled:opacity-50"
              >
                {aiLoading ? 'Comparing...' : 'Run Description Correlation'}
              </button>
            </div>

            {aiMatch && (
              <div className="space-y-2 pt-2 border-t border-indigo-900/60">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-slate-300">
                    Match Confidence:
                  </span>
                  <span
                    className={`font-mono text-xs font-bold px-2 py-0.5 rounded ${
                      aiMatch.matchConfidence === 'High'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                        : aiMatch.matchConfidence === 'Moderate'
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {aiMatch.matchConfidence} ({aiMatch.similarityPercentage}%)
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed text-[11px]">{aiMatch.reasoning}</p>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-emerald-400 font-semibold">Matched Features:</span>
                    <ul className="list-disc list-inside text-slate-300 mt-0.5">
                      {aiMatch.matchedFeatures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-amber-400 font-semibold">Divergent Points:</span>
                    <ul className="list-disc list-inside text-slate-400 mt-0.5">
                      {aiMatch.divergentFeatures.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="font-mono text-[10px] text-amber-400/90 bg-amber-950/40 border border-amber-800/40 p-1.5 rounded">
                  ⚠️ {aiMatch.humanReviewDisclaimer}
                </div>
              </div>
            )}
          </div>

          {/* Decision Workflow Tabs */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveAction('VERIFY')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                  activeAction === 'VERIFY'
                    ? 'bg-emerald-600 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <CheckCircle className="h-4 w-4" />
                1. Verify Sighting
              </button>
              <button
                type="button"
                onClick={() => setActiveAction('REJECT')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                  activeAction === 'REJECT'
                    ? 'bg-rose-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <XCircle className="h-4 w-4" />
                2. Reject
              </button>
              <button
                type="button"
                onClick={() => setActiveAction('DUPLICATE')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                  activeAction === 'DUPLICATE'
                    ? 'bg-purple-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Copy className="h-4 w-4" />
                3. Mark Duplicate
              </button>
              <button
                type="button"
                onClick={() => setActiveAction('REQUEST_INFO')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                  activeAction === 'REQUEST_INFO'
                    ? 'bg-amber-600 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <HelpCircle className="h-4 w-4" />
                4. Request Info
              </button>
            </div>

            {/* Action Specific Fields */}
            {activeAction === 'DUPLICATE' && (
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Master Report ID to link as duplicate *
                </label>
                <input
                  type="text"
                  placeholder="e.g. REP-2026-000101"
                  value={duplicateId}
                  onChange={(e) => setDuplicateId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                {activeAction === 'VERIFY'
                  ? 'Verification Findings & Notes (Recorded in Audit Trail) *'
                  : activeAction === 'REJECT'
                  ? 'Mandatory Rejection Justification *'
                  : activeAction === 'DUPLICATE'
                  ? 'Consolidation Notes'
                  : 'Specific Information Needed from Reporter'}
              </label>
              <textarea
                rows={3}
                required={activeAction === 'REJECT'}
                placeholder={
                  activeAction === 'VERIFY'
                    ? 'Corroborated by CCTV footage time-stamped 14:32:00. Clothing and physical build match profile.'
                    : activeAction === 'REJECT'
                    ? 'Store security confirmed subject was another customer with different height and age.'
                    : activeAction === 'DUPLICATE'
                    ? 'Same witness vantage point as initial lead.'
                    : 'Requesting witness to clarify whether subject carried a water bottle or backpack.'
                }
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitAction}
              disabled={loading}
              className={`px-5 py-2 font-mono font-bold uppercase tracking-wider rounded transition-colors shadow-md cursor-pointer disabled:opacity-50 ${
                activeAction === 'VERIFY'
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-slate-950'
                  : activeAction === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : activeAction === 'DUPLICATE'
                  ? 'bg-purple-600 hover:bg-purple-500 text-white'
                  : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
              }`}
            >
              {loading ? 'Processing...' : `Confirm ${activeAction.replace('_', ' ')} Decision`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
