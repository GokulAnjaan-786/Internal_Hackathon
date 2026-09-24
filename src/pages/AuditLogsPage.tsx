import React, { useState, useEffect } from 'react';
import { Shield, Filter, Search, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.ts';
import { AuditLog } from '../types/index.ts';

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState('All');
  const [resultFilter, setResultFilter] = useState('All');

  const loadLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs({
        resourceType: resourceFilter !== 'All' ? resourceFilter : undefined,
        result: resultFilter !== 'All' ? resultFilter : undefined,
      });
      setLogs(res.logs);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [resourceFilter, resultFilter]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <Shield className="h-4 w-4" />
            Security & Compliance
          </div>
          <h1 className="text-xl font-bold text-slate-100 font-sans mt-0.5">
            Tamper-Evident System Audit Trail
          </h1>
          <p className="text-xs text-slate-400">
            Immutable log of all authorization checks, case status modifications, evidence ingests, and verification rulings
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            <span className="text-slate-500">Resource:</span>
            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none"
            >
              <option value="All">All Resources</option>
              <option value="CASE">CASE</option>
              <option value="REPORT">REPORT</option>
              <option value="SIGHTING">SIGHTING</option>
              <option value="TASK">TASK</option>
              <option value="FILE">FILE</option>
              <option value="AUTH">AUTH</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded">
            <span className="text-slate-500">Result:</span>
            <select
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none"
            >
              <option value="All">All Results</option>
              <option value="SUCCESS">SUCCESS</option>
              <option value="FAILURE">FAILURE</option>
              <option value="DENIED">DENIED</option>
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>Loading immutable security records...</span>
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs bg-slate-900/40 rounded-xl border border-slate-800">
          No audit logs found matching criteria.
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Target Resource</th>
                  <th className="py-3 px-4">Outcome</th>
                  <th className="py-3 px-4">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.timestamp).toLocaleString([], {
                        month: 'short',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-semibold text-slate-200">{log.userName}</div>
                      <div className="text-[10px] text-cyan-400">{log.userRole}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-100 whitespace-nowrap">
                      {log.action}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-300">
                        {log.resourceType}: {log.resourceId}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          log.result === 'SUCCESS'
                            ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-500/40'
                            : 'text-rose-400 bg-rose-950/60 border border-rose-500/40'
                        }`}
                      >
                        {log.result === 'SUCCESS' ? (
                          <CheckCircle2 className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        <span>{log.result}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-300 text-[11px] font-sans max-w-md truncate">
                      {log.details}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
