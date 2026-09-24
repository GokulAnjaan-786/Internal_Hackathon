import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Clock, CheckCircle2, ListTodo, FileText, ArrowRight, RefreshCw, Eye, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { StatusBadge } from '../components/StatusBadge.tsx';

interface SeniorDashboardPageProps {
  onSelectCase: (caseId: string) => void;
}

export const SeniorOfficerDashboardPage: React.FC<SeniorDashboardPageProps> = ({
  onSelectCase,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getSeniorOfficerDashboard();
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 20000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 font-mono text-xs text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
        <span>Aggregating Senior Command Executive Metrics...</span>
      </div>
    );
  }

  const counters = data?.summaryCounters || {};
  const attentionCases = data?.attentionCases || [];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-950 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] uppercase font-bold border border-amber-500/40">
              Senior Command Staff View
            </span>
            <span className="text-xs font-mono text-slate-400">Executive Priority Monitor</span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 tracking-tight">
            Which cases require my attention right now?
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            High-level operational overview summarizing active cases, critical thresholds, unverified high-impact leads, and stale case warnings.
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono font-semibold flex items-center gap-2 transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Intelligence</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-3.5 rounded-lg border border-cyan-500/30 bg-cyan-950/20">
          <div className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Active Cases</div>
          <div className="text-2xl font-mono font-extrabold text-cyan-300 mt-1">{counters.activeCases || 0}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-red-500/40 bg-red-950/30">
          <div className="text-[10px] font-mono text-red-400 font-bold uppercase">Urgent Cases</div>
          <div className="text-2xl font-mono font-extrabold text-red-300 mt-1">{counters.urgentCases || 0}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-amber-500/40 bg-amber-950/30">
          <div className="text-[10px] font-mono text-amber-400 font-bold uppercase">Stale (&gt;48h)</div>
          <div className="text-2xl font-mono font-extrabold text-amber-300 mt-1">{counters.staleCases || 0}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-purple-500/30 bg-purple-950/20">
          <div className="text-[10px] font-mono text-purple-400 font-bold uppercase">Pending Verify</div>
          <div className="text-2xl font-mono font-extrabold text-purple-300 mt-1">{counters.pendingVerifications || 0}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-orange-500/30 bg-orange-950/20">
          <div className="text-[10px] font-mono text-orange-400 font-bold uppercase">Overdue Tasks</div>
          <div className="text-2xl font-mono font-extrabold text-orange-300 mt-1">{counters.overdueTasks || 0}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-blue-500/30 bg-blue-950/20">
          <div className="text-[10px] font-mono text-blue-400 font-bold uppercase">Open Leads</div>
          <div className="text-2xl font-mono font-extrabold text-blue-300 mt-1">{counters.openLeads || 0}</div>
        </div>
        <div className="p-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20">
          <div className="text-[10px] font-mono text-emerald-400 font-bold uppercase">Verified Sightings</div>
          <div className="text-2xl font-mono font-extrabold text-emerald-300 mt-1">{counters.newVerifiedSightings || 0}</div>
        </div>
      </div>

      {/* Cases Requiring Immediate Attention */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-red-400" />
            <span>Cases Requiring Immediate Command Attention</span>
          </h2>
          <span className="font-mono text-xs text-slate-400">{attentionCases.length} Cases Monitored</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {attentionCases.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs font-mono">
              All active investigation cases are progressing smoothly with recent updates.
            </div>
          ) : (
            attentionCases.map((c: any) => (
              <div
                key={c.caseId}
                className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <img
                    src={c.photoUrl}
                    alt={c.personName}
                    className="h-12 w-12 rounded object-cover border border-slate-700 shrink-0"
                  />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-cyan-400 font-bold">{c.caseId}</span>
                      <h3 className="text-sm font-bold text-slate-100">{c.personName}</h3>
                      <PriorityBadge priority={c.priority} />
                      <StatusBadge status={c.status} />
                      {c.isStale && (
                        <span className="px-1.5 py-0.5 rounded bg-red-950 text-red-300 border border-red-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>NO UPDATE &gt;48H</span>
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{c.title}</p>
                    <div className="text-[11px] font-mono text-slate-500 flex items-center gap-4">
                      <span>Officer: {c.assignedOfficer}</span>
                      <span>Last Updated: {new Date(c.lastUpdated).toLocaleString()}</span>
                      <span>Completeness: {c.completenessScore}%</span>
                    </div>
                    {c.priorityReasons && c.priorityReasons.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <span className="text-[10px] font-mono text-slate-400 font-bold">Why Priority:</span>
                        {c.priorityReasons.map((r: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-300 border border-slate-800"
                          >
                            {r}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right font-mono text-xs space-y-0.5">
                    <div className="text-amber-400 font-semibold">{c.openLeadsCount} Open Leads</div>
                    <div className="text-cyan-400 font-semibold">{c.openTasksCount} Pending Tasks</div>
                  </div>
                  <button
                    onClick={() => onSelectCase(c.caseId)}
                    className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold rounded text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    <span>Open Cockpit</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
