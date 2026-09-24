import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  MapPin,
  Calendar,
  AlertTriangle,
  User,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Report, Case } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { VerifyReportModal } from '../components/VerifyReportModal.tsx';

interface VerificationPageProps {
  onSelectCase: (caseId: string) => void;
}

export const VerificationPage: React.FC<VerificationPageProps> = ({ onSelectCase }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [casesMap, setCasesMap] = useState<Record<string, Case>>({});
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reportsRes, casesRes] = await Promise.all([
        api.getReports({ status: statusFilter !== 'All' ? statusFilter : undefined }),
        api.getCases(),
      ]);

      setReports(reportsRes.reports);

      const cmap: Record<string, Case> = {};
      casesRes.cases.forEach((c) => {
        cmap[c.id] = c;
      });
      setCasesMap(cmap);
    } catch (err) {
      console.error('Failed to load verification reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const newCount = reports.filter((r) => r.verificationStatus === 'New').length;
  const underReviewCount = reports.filter((r) => r.verificationStatus === 'Under Review').length;
  const verifiedCount = reports.filter((r) => r.verificationStatus === 'Verified').length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            Verification Authority Desk
          </div>
          <h1 className="text-xl font-bold text-slate-100 font-sans mt-0.5">
            Emergency Evidence Verification Queue
          </h1>
          <p className="text-xs text-slate-400">
            Cross-examine reported sightings, corroborate CCTV/witness testimony, and promote to official case trajectory
          </p>
        </div>

        {/* Status Counts */}
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded bg-amber-950/60 border border-amber-500/40 text-amber-300">
            Pending: {newCount + underReviewCount}
          </span>
          <span className="px-2.5 py-1 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300">
            Verified: {verifiedCount}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs font-mono">
        {[
          { id: 'All', label: 'All Records' },
          { id: 'New', label: 'New Tips' },
          { id: 'Under Review', label: 'Under Review' },
          { id: 'Verified', label: 'Verified Sightings' },
          { id: 'Rejected', label: 'Rejected / Inaccurate' },
          { id: 'Duplicate', label: 'Duplicates' },
        ].map((tab) => {
          const isActive = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                isActive
                  ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Reports Feed */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <span>Loading queue...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs bg-slate-900/40 rounded-xl border border-slate-800">
          No reports found under filter "{statusFilter}".
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => {
            const linkedCase = casesMap[report.caseId];

            return (
              <div
                key={report.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-xs font-bold text-amber-400">
                      {report.id}
                    </span>
                    <StatusBadge status={report.verificationStatus} size="sm" />
                    <span className="font-mono text-xs text-slate-400">
                      Source: {report.source} ({report.reporterType})
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {linkedCase && (
                      <button
                        onClick={() => onSelectCase(linkedCase.id)}
                        className="text-xs font-mono text-cyan-400 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <span>Case {linkedCase.id} ({linkedCase.person.fullName})</span>
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedReport(report)}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono text-xs font-bold uppercase rounded shadow transition-colors cursor-pointer"
                    >
                      Verification Desk
                    </button>
                  </div>
                </div>

                {/* Sighting Details */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="md:col-span-3 space-y-2">
                    <p className="text-slate-100 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                      "{report.description}"
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono text-slate-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-rose-400" />
                        {report.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        {report.date} at {report.time}
                      </span>
                      <span>By: {report.reporterName}</span>
                    </div>

                    {report.verificationNotes && (
                      <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-300">
                        <span className="font-bold text-amber-400">Verification Finding: </span>
                        <span>{report.verificationNotes}</span>
                      </div>
                    )}
                  </div>

                  {/* Attached Media or Subject Thumbnail */}
                  <div className="space-y-2">
                    {report.uploadedFiles.length > 0 ? (
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1 font-mono">
                          Attached Sighting Media:
                        </div>
                        <img
                          src={report.uploadedFiles[0].url}
                          alt="Sighting Attachment"
                          className="h-28 w-full object-cover rounded-lg border border-slate-800"
                        />
                      </div>
                    ) : linkedCase ? (
                      <div>
                        <div className="text-[11px] text-slate-400 mb-1 font-mono">
                          Target Case Subject:
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded bg-slate-950 border border-slate-800">
                          <img
                            src={linkedCase.person.photoUrl}
                            alt={linkedCase.person.fullName}
                            className="h-10 w-10 rounded object-cover border border-slate-700"
                          />
                          <div className="text-[11px]">
                            <div className="font-semibold text-slate-200">{linkedCase.person.fullName}</div>
                            <div className="text-slate-500 font-mono">{linkedCase.person.age}yo {linkedCase.person.gender}</div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Verification Modal */}
      {selectedReport && (
        <VerifyReportModal
          report={selectedReport}
          linkedCase={casesMap[selectedReport.caseId]}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
          onReportUpdated={(updated) => {
            setReports(reports.map((r) => (r.id === updated.id ? updated : r)));
            setSelectedReport(null);
          }}
        />
      )}
    </div>
  );
};
