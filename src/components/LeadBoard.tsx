import React, { useState } from 'react';
import { Plus, User, Clock, AlertCircle, ArrowRight, CheckCircle, ShieldAlert } from 'lucide-react';
import { Lead, LeadStatus } from '../types/index.ts';
import { api } from '../services/api.ts';

interface LeadBoardProps {
  caseId?: string;
  leads: Lead[];
  onRefresh: () => void;
  onOpenCreateModal: () => void;
}

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: 'NEW', label: 'NEW LEADS', color: 'border-cyan-500 text-cyan-400 bg-cyan-950/30' },
  { id: 'ASSIGNED', label: 'ASSIGNED', color: 'border-blue-500 text-blue-400 bg-blue-950/30' },
  { id: 'UNDER_INVESTIGATION', label: 'UNDER INVESTIGATION', color: 'border-purple-500 text-purple-400 bg-purple-950/30' },
  { id: 'WAITING_FOR_RESPONSE', label: 'WAITING RESPONSE', color: 'border-amber-500 text-amber-400 bg-amber-950/30' },
  { id: 'VERIFIED', label: 'VERIFIED FACT', color: 'border-emerald-500 text-emerald-400 bg-emerald-950/30' },
  { id: 'NOT_USEFUL', label: 'NOT USEFUL', color: 'border-slate-600 text-slate-400 bg-slate-900/50' },
  { id: 'CLOSED', label: 'CLOSED LEADS', color: 'border-slate-700 text-slate-500 bg-slate-950/40' },
];

export const LeadBoard: React.FC<LeadBoardProps> = ({
  caseId,
  leads,
  onRefresh,
  onOpenCreateModal,
}) => {
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    setMovingLeadId(leadId);
    try {
      await api.updateLead(leadId, { status: newStatus });
      onRefresh();
    } catch {
      // ignore
    } finally {
      setMovingLeadId(null);
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'text-red-400 bg-red-950/60 border-red-500/40';
      case 'High':
        return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
      case 'Medium':
        return 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40';
      default:
        return 'text-slate-400 bg-slate-900 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-amber-400" />
            <span>Investigation Leads Board</span>
          </h3>
          <p className="text-xs text-slate-400">
            Track every clue, lead source, assigned officer response, and verification result. No lead gets lost.
          </p>
        </div>
        <button
          onClick={onOpenCreateModal}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Lead</span>
        </button>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-7 gap-3 overflow-x-auto pb-2">
        {COLUMNS.map((col) => {
          const colLeads = leads.filter((l) => l.status === col.id);
          return (
            <div key={col.id} className="min-w-[240px] bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 flex flex-col min-h-[420px]">
              {/* Column Header */}
              <div className={`p-2 rounded border mb-2 flex items-center justify-between font-mono text-[11px] font-bold ${col.color}`}>
                <span>{col.label}</span>
                <span className="tabular-nums px-1.5 py-0.2 rounded bg-slate-950/60">{colLeads.length}</span>
              </div>

              {/* Cards Container */}
              <div className="flex-1 space-y-2 overflow-y-auto">
                {colLeads.length === 0 ? (
                  <div className="h-24 flex items-center justify-center border border-dashed border-slate-800/80 rounded text-[11px] font-mono text-slate-600">
                    Empty
                  </div>
                ) : (
                  colLeads.map((lead) => (
                    <div
                      key={lead.id}
                      className="p-3 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-all space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-mono text-[10px] text-slate-500">{lead.id}</span>
                        <span className={`font-mono text-[10px] px-1.5 py-0.2 rounded border font-semibold ${getPriorityBadgeClass(lead.priority)}`}>
                          {lead.priority}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-100 leading-snug">{lead.title}</h4>
                      <p className="text-[11px] text-slate-400 line-clamp-3">{lead.description}</p>

                      <div className="text-[10px] font-mono text-slate-500 space-y-0.5 pt-1 border-t border-slate-900">
                        <div className="flex items-center gap-1 text-slate-400">
                          <User className="h-3 w-3 text-cyan-400" />
                          <span>{lead.assignedOfficerName || 'Unassigned'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-500" />
                          <span>Src: {lead.source}</span>
                        </div>
                      </div>

                      {/* Quick Action Transitions */}
                      <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] font-mono">
                        {col.id !== 'VERIFIED' && (
                          <button
                            disabled={movingLeadId === lead.id}
                            onClick={() =>
                              handleStatusChange(
                                lead.id,
                                col.id === 'NEW'
                                  ? 'ASSIGNED'
                                  : col.id === 'ASSIGNED'
                                  ? 'UNDER_INVESTIGATION'
                                  : col.id === 'UNDER_INVESTIGATION'
                                  ? 'WAITING_FOR_RESPONSE'
                                  : 'VERIFIED'
                              )
                            }
                            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Advance</span>
                            <ArrowRight className="h-3 w-3" />
                          </button>
                        )}
                        {col.id !== 'CLOSED' && (
                          <button
                            disabled={movingLeadId === lead.id}
                            onClick={() => handleStatusChange(lead.id, 'CLOSED')}
                            className="text-slate-500 hover:text-slate-300 cursor-pointer"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
