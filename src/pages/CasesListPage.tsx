import React, { useState, useEffect } from 'react';
import { FolderOpen, Search, Plus, MapPin, Filter, User } from 'lucide-react';
import { api } from '../services/api.ts';
import { Case } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface CasesListPageProps {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
}

export const CasesListPage: React.FC<CasesListPageProps> = ({
  onSelectCase,
  onOpenNewCase,
}) => {
  const { role } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [priority, setPriority] = useState('All');

  const loadCases = async () => {
    setLoading(true);
    try {
      const res = await api.getCases({
        status: status !== 'All' ? status : undefined,
        priority: priority !== 'All' ? priority : undefined,
        search: search.trim() || undefined,
      });
      setCases(res.cases);
    } catch (err) {
      console.error('Failed to load cases:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases();
  }, [status, priority]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases();
  };

  const canCreateCase = role === 'SUPER_ADMIN' || role === 'CASE_OFFICER' || role === 'HOSPITAL_SHELTER';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Page Title & New Case Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <FolderOpen className="h-4 w-4" />
            Registry Directory
          </div>
          <h1 className="text-xl font-bold text-slate-100 font-sans mt-0.5">
            Missing Person Cases Database
          </h1>
          <p className="text-xs text-slate-400">
            Consolidated registry across all active regional jurisdictions
          </p>
        </div>

        {canCreateCase && (
          <button
            onClick={onOpenNewCase}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded shadow transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Intake New Case</span>
          </button>
        )}
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by case ID, subject name, clothing, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Status:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Under Investigation">Under Investigation</option>
              <option value="Person Located">Person Located</option>
              <option value="Resolved">Resolved</option>
              <option value="Draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">Priority:</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded text-slate-300 focus:outline-none"
            >
              <option value="All">All Priorities</option>
              <option value="Urgent">Urgent</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>

          <button
            type="button"
            onClick={loadCases}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded cursor-pointer"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Cases Grid */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>Querying cases...</span>
        </div>
      ) : cases.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs bg-slate-900/40 rounded-xl border border-slate-800">
          No cases match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cases.map((c) => (
            <div
              key={c.id}
              onClick={() => onSelectCase(c.id)}
              className="group p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900/90 transition-all cursor-pointer flex flex-col justify-between shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <img
                    src={c.person.photoUrl}
                    alt={c.person.fullName}
                    className="h-16 w-16 rounded object-cover border border-slate-700 flex-shrink-0 group-hover:border-cyan-400 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-cyan-400">{c.id}</span>
                      <PriorityBadge priority={c.priority} />
                    </div>
                    <h3 className="font-bold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                      {c.person.fullName}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {c.person.age}yo • {c.person.gender} • {c.person.height}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                  {c.person.circumstances || c.person.clothingDescription}
                </div>
              </div>

              <div className="pt-3 mt-3 border-t border-slate-800/80 space-y-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px] truncate">
                  <MapPin className="h-3 w-3 text-rose-400 flex-shrink-0" />
                  <span className="truncate">{c.person.lastKnownLocation}</span>
                </div>

                <div className="flex items-center justify-between font-mono text-[11px]">
                  <StatusBadge status={c.status} size="sm" />
                  <span className="text-slate-500">Missing: {c.person.dateMissing}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
