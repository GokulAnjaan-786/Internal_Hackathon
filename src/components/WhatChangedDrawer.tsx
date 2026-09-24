import React, { useEffect, useState } from 'react';
import { X, Sparkles, AlertCircle, CheckCircle2, FileText, MapPin, ListTodo, Shield, Camera, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../services/api.ts';
import { WhatChangedSummary, ChangeItem } from '../types/index.ts';

interface WhatChangedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
}

export const WhatChangedDrawer: React.FC<WhatChangedDrawerProps> = ({
  isOpen,
  onClose,
  onSelectCase,
}) => {
  const [data, setData] = useState<WhatChangedSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchWhatChanged = async () => {
    setLoading(true);
    try {
      const res = await api.getWhatChanged();
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchWhatChanged();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200 flex justify-end">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                What Changed Since Last Login?
              </h2>
              <p className="text-[11px] text-slate-400 font-mono">
                {data?.sinceTimestamp
                  ? `Activity diff since ${new Date(data.sinceTimestamp).toLocaleString()}`
                  : 'Recent activity diff'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 font-mono text-xs gap-2">
              <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
              <span>Analyzing command delta logs...</span>
            </div>
          ) : data ? (
            <>
              {/* Counter Badges Grid */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded border border-cyan-500/30 bg-cyan-950/30 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">New Reports</span>
                  <span className="font-mono text-sm font-bold text-cyan-400">+{data.newReportsCount}</span>
                </div>
                <div className="p-2.5 rounded border border-emerald-500/30 bg-emerald-950/30 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Verified Sightings</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">+{data.verifiedSightingsCount}</span>
                </div>
                <div className="p-2.5 rounded border border-amber-500/30 bg-amber-950/30 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">New Leads</span>
                  <span className="font-mono text-sm font-bold text-amber-400">+{data.newLeadsCount}</span>
                </div>
                <div className="p-2.5 rounded border border-blue-500/30 bg-blue-950/30 flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-medium">Completed Tasks</span>
                  <span className="font-mono text-sm font-bold text-blue-400">+{data.completedTasksCount}</span>
                </div>
              </div>

              {/* Items Timeline list */}
              <div className="space-y-2">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold px-1">
                  Chronological Updates ({data.items.length})
                </div>

                {data.items.length === 0 ? (
                  <div className="text-center py-8 border border-dashed border-slate-800 rounded text-slate-500 text-xs">
                    No new high-priority changes since your previous session.
                  </div>
                ) : (
                  data.items.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => {
                        if (item.caseId) {
                          onSelectCase(item.caseId);
                          onClose();
                        }
                      }}
                      className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-1.5">
                          {item.type === 'REPORT' && <FileText className="h-3.5 w-3.5 text-cyan-400" />}
                          {item.type === 'VERIFICATION' && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                          {item.type === 'LEAD' && <AlertCircle className="h-3.5 w-3.5 text-amber-400" />}
                          {item.type === 'TASK' && <ListTodo className="h-3.5 w-3.5 text-blue-400" />}
                          {item.type === 'PHOTO' && <Camera className="h-3.5 w-3.5 text-purple-400" />}
                          <span className="text-xs font-semibold text-slate-200 group-hover:text-cyan-300 transition-colors">
                            {item.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">{item.description}</p>
                      {item.caseId && (
                        <div className="mt-2 flex items-center gap-1 text-[11px] font-mono text-cyan-400 font-medium">
                          <span>Open Case Details</span>
                          <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-center">
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
};
