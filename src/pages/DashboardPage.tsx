import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  FolderOpen,
  CheckCircle2,
  ListTodo,
  Clock,
  ArrowRight,
  Plus,
  MapPin,
  Search,
  Eye,
  Activity,
  Check,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Case, Report, InvestigationTask, TimelineEvent } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface DashboardPageProps {
  onSelectCase: (caseId: string) => void;
  onOpenNewCase: () => void;
  onNavigateTab: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onSelectCase,
  onOpenNewCase,
  onNavigateTab,
}) => {
  const { user, role } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [tasks, setTasks] = useState<InvestigationTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [analytics, setAnalytics] = useState({
    activeCases: 0,
    urgentCases: 0,
    resolvedCases: 0,
    totalCases: 0,
    pendingReviewReports: 0,
    verifiedSightings: 0,
    openTasks: 0,
    urgentTasks: 0,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [casesRes, reportsRes, tasksRes, statsRes] = await Promise.all([
        api.getCases(),
        api.getReports(),
        api.getTasks(),
        api.getAnalytics(),
      ]);

      setCases(casesRes.cases);
      setReports(reportsRes.reports);
      setTasks(tasksRes.tasks);
      setAnalytics(statsRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const pendingReports = reports.filter(
    (r) => r.verificationStatus === 'New' || r.verificationStatus === 'Under Review'
  );

  const urgentTasksList = tasks.filter(
    (t) => (t.status === 'Pending' || t.status === 'In Progress') && t.priority === 'Urgent'
  );

  const filteredCases = cases.filter((c) => {
    const matchesSearch =
      searchQuery === '' ||
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.person.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.person.lastKnownLocation.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'All' || c.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  const canCreateCase = role === 'SUPER_ADMIN' || role === 'CASE_OFFICER' || role === 'HOSPITAL_SHELTER';

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Operational Status */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase font-bold text-cyan-400">
              Operations Center
            </span>
            <span className="text-slate-600">•</span>
            <span className="font-mono text-xs text-slate-400">
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 font-sans">
            Emergency Incident Command Desk
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl">
            Centralized consolidation hub for authorized field officers, triage coordinators, and verification teams during active emergency events.
          </p>
        </div>

        {/* Quick Launcher Actions */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canCreateCase && (
            <button
              onClick={onOpenNewCase}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded transition-colors shadow-md cursor-pointer"
            >
              <Plus className="h-4 w-4 stroke-[3]" />
              <span>Intake New Case</span>
            </button>
          )}
          <button
            onClick={() => onNavigateTab('verification')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded border border-slate-700 transition-colors cursor-pointer"
          >
            <CheckCircle2 className="h-4 w-4 text-amber-400" />
            <span>Verify Leads ({analytics.pendingReviewReports})</span>
          </button>
          <button
            onClick={() => onNavigateTab('map')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold rounded border border-slate-700 transition-colors cursor-pointer"
          >
            <MapPin className="h-4 w-4 text-emerald-400" />
            <span>Incident Map</span>
          </button>
        </div>
      </div>

      {/* KPI Command Bar (Tabular Numerals & Zero-Pill Standard) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">Active Cases</span>
            <FolderOpen className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
            {analytics.activeCases}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Under active search</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-rose-900/40 bg-rose-950/10">
          <div className="flex items-center justify-between text-rose-400 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">Urgent Cases</span>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-rose-400 tabular-nums">
            {analytics.urgentCases}
          </div>
          <div className="text-[11px] text-rose-400/80 mt-1">Amber / Critical</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-amber-900/40 bg-amber-950/10">
          <div className="flex items-center justify-between text-amber-400 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">Pending Review</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-amber-400 tabular-nums">
            {analytics.pendingReviewReports}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">Awaiting verification</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">Verified Sightings</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-400 tabular-nums">
            {analytics.verifiedSightings}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Corroborated leads</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">Open Tasks</span>
            <ListTodo className="h-4 w-4 text-sky-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-slate-100 tabular-nums">
            {analytics.openTasks}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">{analytics.urgentTasks} urgent priority</div>
        </div>

        <div className="p-4 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="font-mono text-[11px] uppercase tracking-wider">Resolved</span>
            <Activity className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="font-mono text-2xl font-bold text-emerald-300 tabular-nums">
            {analytics.resolvedCases}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Safe & Accounted for</div>
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Active Emergency Cases List (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-cyan-400" />
              <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
                Active Missing Person Cases ({filteredCases.length})
              </h2>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter cases..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 font-mono focus:outline-none"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Under Investigation">Under Investigation</option>
                <option value="Person Located">Person Located</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
          </div>

          {/* Cases Cards */}
          <div className="space-y-3">
            {filteredCases.slice(0, 7).map((c) => (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className="group p-4 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-900 transition-all cursor-pointer shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <img
                    src={c.person.photoUrl}
                    alt={c.person.fullName}
                    className="h-16 w-16 rounded object-cover border border-slate-700 flex-shrink-0 group-hover:border-cyan-400 transition-colors"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-cyan-400">
                          {c.id}
                        </span>
                        <h3 className="font-semibold text-sm text-slate-100 truncate group-hover:text-cyan-300 transition-colors">
                          {c.person.fullName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={c.priority} />
                        <StatusBadge status={c.status} size="sm" />
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 line-clamp-1 mb-2">
                      {c.person.age}yo {c.person.gender} • {c.person.clothingDescription}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-500 border-t border-slate-800/60 pt-2">
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="h-3 w-3 text-rose-400" />
                        <span className="truncate max-w-xs">{c.person.lastKnownLocation}</span>
                      </span>
                      <span>Missing: {c.person.dateMissing}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {filteredCases.length > 7 && (
              <button
                onClick={() => onNavigateTab('cases')}
                className="w-full py-2.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-mono text-cyan-400 flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <span>View all {cases.length} cases in directory</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right Sidebar: Urgent Tasks & Verification Queue (1 Col) */}
        <div className="space-y-6">
          {/* Pending Verifications Widget */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-amber-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                  Verification Queue ({pendingReports.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('verification')}
                className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
              >
                Open Queue
              </button>
            </div>

            {pendingReports.length === 0 ? (
              <div className="text-center py-6 text-slate-500 font-mono text-xs">
                Queue clear. No pending unverified leads.
              </div>
            ) : (
              <div className="space-y-2">
                {pendingReports.slice(0, 4).map((r) => (
                  <div
                    key={r.id}
                    onClick={() => onNavigateTab('verification')}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800/80 hover:border-amber-500/50 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-[10px] text-amber-400">{r.id}</span>
                      <span className="font-mono text-[10px] text-slate-400">{r.source}</span>
                    </div>
                    <div className="text-slate-300 line-clamp-2 leading-relaxed">
                      "{r.description}"
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5 pt-1 border-t border-slate-900">
                      <span>{r.location}</span>
                      <span>{r.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Urgent Priority Tasks Widget */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <ListTodo className="h-4 w-4 text-sky-400" />
                <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
                  Urgent Field Tasks ({urgentTasksList.length})
                </h3>
              </div>
              <button
                onClick={() => onNavigateTab('tasks')}
                className="text-[11px] font-mono text-cyan-400 hover:underline cursor-pointer"
              >
                All Tasks
              </button>
            </div>

            {urgentTasksList.length === 0 ? (
              <div className="text-center py-6 text-slate-500 font-mono text-xs">
                No outstanding urgent tasks.
              </div>
            ) : (
              <div className="space-y-2">
                {urgentTasksList.slice(0, 4).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onNavigateTab('tasks')}
                    className="p-2.5 rounded bg-slate-950 border border-slate-800 hover:border-sky-500/50 transition-colors cursor-pointer text-xs"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-slate-200 truncate">{t.title}</span>
                      <span className="font-mono text-[10px] text-rose-400 uppercase">Urgent</span>
                    </div>
                    <div className="text-slate-400 text-[11px] line-clamp-1">{t.description}</div>
                    <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mt-1.5 pt-1 border-t border-slate-900">
                      <span>{t.assignedOfficerName}</span>
                      <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
