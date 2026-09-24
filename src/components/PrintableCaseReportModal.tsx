import React, { useEffect, useState } from 'react';
import { X, Printer, FileText, Download, ShieldCheck, CheckCircle2, Clock, MapPin } from 'lucide-react';
import { api } from '../services/api.ts';

interface PrintableCaseReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
}

export const PrintableCaseReportModal: React.FC<PrintableCaseReportModalProps> = ({
  isOpen,
  onClose,
  caseId,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .getCaseReportPdfData(caseId)
        .then((res) => setData(res))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, caseId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 print:hidden">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Automatic Investigation Situation Report</h2>
              <p className="text-[11px] text-slate-400 font-mono">Case: {caseId}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Report Content - Styled for screen & print */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-950 text-slate-100 font-sans print:bg-white print:text-black">
          {loading ? (
            <div className="py-12 text-center text-slate-400 font-mono text-xs">Generating formal report document...</div>
          ) : data ? (
            <div className="space-y-6">
              {/* Document Banner */}
              <div className="border-b-2 border-slate-700 pb-4 flex items-center justify-between">
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                    Official Emergency Command Investigation Report
                  </div>
                  <h1 className="text-2xl font-black text-slate-100 tracking-tight mt-1">{data.caseDetails.title}</h1>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Case ID: {data.caseDetails.id} | Generated: {new Date(data.generatedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right font-mono text-xs space-y-0.5">
                  <div className="text-amber-400 font-bold">Priority: {data.caseDetails.priority}</div>
                  <div className="text-cyan-400 font-bold">Status: {data.caseDetails.status}</div>
                  <div className="text-slate-400">Agency: {data.caseDetails.leadAgency}</div>
                </div>
              </div>

              {/* Subject Profile */}
              <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border border-slate-800 bg-slate-900/60">
                <div className="col-span-1">
                  <img
                    src={data.personDetails.photoUrl}
                    alt={data.personDetails.fullName}
                    className="h-40 w-full object-cover rounded border border-slate-700"
                  />
                </div>
                <div className="col-span-2 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-500 font-mono">Full Name:</span>{' '}
                      <span className="font-bold text-slate-200">{data.personDetails.fullName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Age / Gender:</span>{' '}
                      <span className="font-bold text-slate-200">{data.personDetails.age}yo / {data.personDetails.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Height:</span>{' '}
                      <span className="text-slate-200">{data.personDetails.height}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-mono">Date Missing:</span>{' '}
                      <span className="text-slate-200">{data.personDetails.dateMissing} ({data.personDetails.timeMissing})</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Last Known Location:</span>{' '}
                    <span className="text-slate-200 font-semibold">{data.personDetails.lastKnownLocation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Identifying Marks:</span>{' '}
                    <span className="text-slate-200">{data.personDetails.identifyingMarks}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-mono">Clothing Description:</span>{' '}
                    <span className="text-slate-200">{data.personDetails.clothingDescription}</span>
                  </div>
                </div>
              </div>

              {/* Executive Summary */}
              <div className="space-y-1.5">
                <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">
                  Situation Briefing & Summary
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded border border-slate-800 font-serif">
                  {data.summary}
                </p>
              </div>

              {/* Verified Sightings */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Verified Sightings ({data.sightings.filter((s: any) => s.verificationStatus === 'Verified').length})</span>
                </h3>
                <div className="space-y-2">
                  {data.sightings
                    .filter((s: any) => s.verificationStatus === 'Verified')
                    .map((s: any) => (
                      <div key={s.id} className="p-3 bg-slate-900/60 border border-slate-800 rounded text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono">
                          <span className="font-bold text-emerald-400">{s.location}</span>
                          <span className="text-slate-500">{s.date} {s.time}</span>
                        </div>
                        <p className="text-slate-300">{s.description}</p>
                        <div className="text-[10px] font-mono text-slate-500">
                          Verified by {s.reviewerName} | Source: {s.source}
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Investigation Leads */}
              <div className="space-y-2">
                <h3 className="text-xs font-mono font-bold uppercase text-slate-400 tracking-wider">
                  Investigation Leads ({data.leads.length})
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {data.leads.map((l: any) => (
                    <div key={l.id} className="p-2.5 bg-slate-900/60 border border-slate-800 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between font-mono text-[10px]">
                        <span className="text-slate-400 font-bold">{l.id} [{l.status}]</span>
                        <span className="text-amber-400 font-bold">{l.priority}</span>
                      </div>
                      <div className="font-semibold text-slate-200">{l.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono">Assigned: {l.assignedOfficerName}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="pt-6 border-t border-slate-800 text-[10px] font-mono text-slate-500 flex justify-between items-center">
                <span>Official Record — Confidential Command Document</span>
                <span>Page 1 of 1</span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
