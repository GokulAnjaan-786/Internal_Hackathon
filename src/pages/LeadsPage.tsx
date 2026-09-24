import React, { useEffect, useState } from 'react';
import { RefreshCw, Filter } from 'lucide-react';
import { api } from '../services/api.ts';
import { Lead } from '../types/index.ts';
import { LeadBoard } from '../components/LeadBoard.tsx';
import { CreateLeadModal } from '../components/CreateLeadModal.tsx';

interface LeadsPageProps {
  onSelectCase: (caseId: string) => void;
}

export const LeadsPage: React.FC<LeadsPageProps> = ({ onSelectCase }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('MP-2026-000001');

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await api.getLeads({
        status: statusFilter !== 'All' ? statusFilter : undefined,
        priority: priorityFilter !== 'All' ? priorityFilter : undefined,
      });
      setLeads(res.leads);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [statusFilter, priorityFilter]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            Investigation Leads Registry
          </h1>
          <p className="text-xs text-slate-400">
            System-wide investigation leads management board. Ensure no clue, witness tip, or field inquiry gets lost.
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            <span>Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            onClick={fetchLeads}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 rounded border border-slate-800 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Kanban Board */}
      <LeadBoard
        leads={leads}
        onRefresh={fetchLeads}
        onOpenCreateModal={() => setCreateModalOpen(true)}
      />

      <CreateLeadModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        caseId={selectedCaseId}
        onLeadCreated={fetchLeads}
      />
    </div>
  );
};
