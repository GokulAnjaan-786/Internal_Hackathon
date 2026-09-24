import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Clock,
  Shield,
  Camera,
  CheckCircle2,
  Sparkles,
  AlertTriangle,
  Plus,
  Printer,
  ShieldCheck,
  Compass,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.ts';
import {
  Case,
  Report,
  Sighting,
  InvestigationTask,
  TimelineEvent,
  FileAttachment,
  CaseStatus,
  AiMatchAnalysis,
  Lead,
  CaseCompleteness,
  CasePriorityDetails,
  ConflictItem,
  AiNextActionSuggestion,
  PotentialRelatedCase,
  PriorityLevel,
} from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { MapComponent } from '../components/MapComponent.tsx';
import { AiSummaryModal } from '../components/AiSummaryModal.tsx';
import { CreateTaskModal } from '../components/CreateTaskModal.tsx';
import { UploadPhotoModal } from '../components/UploadPhotoModal.tsx';
import { VerifyReportModal } from '../components/VerifyReportModal.tsx';
import { LeadBoard } from '../components/LeadBoard.tsx';
import { CreateLeadModal } from '../components/CreateLeadModal.tsx';
import { CaseClosureModal } from '../components/CaseClosureModal.tsx';
import { PrintableCaseReportModal } from '../components/PrintableCaseReportModal.tsx';
import { EvidenceAuditModal } from '../components/EvidenceAuditModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface CaseDetailPageProps {
  caseId: string;
  onBack: () => void;
}

export const CaseDetailPage: React.FC<CaseDetailPageProps> = ({ caseId, onBack }) => {
  const { user, role } = useAuth();
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [sightings, setSightings] = useState<Sighting[]>([]);
  const [tasks, setTasks] = useState<InvestigationTask[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [completeness, setCompleteness] = useState<CaseCompleteness | null>(null);
  const [priorityDetails, setPriorityDetails] = useState<CasePriorityDetails | null>(null);
  const [conflicts, setConflicts] = useState<ConflictItem[]>([]);
  const [aiNextActions, setAiNextActions] = useState<AiNextActionSuggestion[]>([]);
  const [relatedCases, setRelatedCases] = useState<PotentialRelatedCase[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<
    'cockpit' | 'at-a-glance' | 'leads' | 'reports' | 'map' | 'timeline' | 'photos' | 'tasks' | 'ai' | 'closure'
  >('cockpit');

  // Modals state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<CaseStatus>('Active');
  const [statusReason, setStatusReason] = useState('');

  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [overridePriority, setOverridePriority] = useState<PriorityLevel>('High');
  const [overrideReason, setOverrideReason] = useState('');

  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [leadModalOpen, setLeadModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [closureModalOpen, setClosureModalOpen] = useState(false);
  const [reportPdfModalOpen, setReportPdfModalOpen] = useState(false);

  // Sighting verification modal
  const [selectedReportForVerify, setSelectedReportForVerify] = useState<Report | null>(null);

  // Evidence audit modal
  const [selectedFileForAudit, setSelectedFileForAudit] = useState<FileAttachment | null>(null);

  // Distance calculator state
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [distanceResult, setDistanceResult] = useState<any | null>(null);
  const [calcDistanceLoading, setCalcDistanceLoading] = useState(false);

  // Quick AI Match Sandbox State
  const [customSightingText, setCustomSightingText] = useState('');
  const [aiMatchAnalysis, setAiMatchAnalysis] = useState<AiMatchAnalysis | null>(null);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      const [c, r, s, t, l, tl, fl, comp, pri, cfl, nxt, rel, locRes] = await Promise.all([
        api.getCaseById(caseId),
        api.getReports({ caseId }),
        api.getSightings({ caseId }),
        api.getTasks({ caseId }),
        api.getLeads({ caseId }),
        api.getCaseTimeline(caseId),
        api.getCasePhotos(caseId),
        api.getCaseCompleteness(caseId),
        api.getCasePriorityDetails(caseId),
        api.getCaseConflicts(caseId),
        api.getAiNextActions(caseId),
        api.getPotentialRelatedCases(caseId),
        api.getCaseLocations(caseId),
      ]);

      setCaseData(c);
      setReports(r.reports);
      setSightings(s.sightings);
      setTasks(t.tasks);
      setLeads(l.leads);
      setTimeline(tl.events);
      setFiles(fl.files);
      setCompleteness(comp);
      setPriorityDetails(pri);
      setConflicts(cfl.conflicts);
      setAiNextActions(nxt.actions);
      setRelatedCases(rel.relatedCases);
      setLocations(locRes.locations);
    } catch (err: any) {
      setError(err.message || 'Failed to load case data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusReason.trim()) return;

    try {
      await api.updateCaseStatus(caseId, newStatus, statusReason);
      setStatusModalOpen(false);
      setStatusReason('');
      loadCaseData();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handlePriorityOverrideSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) return;

    try {
      await api.overrideCasePriority(caseId, overridePriority, overrideReason);
      setPriorityModalOpen(false);
      setOverrideReason('');
      loadCaseData();
    } catch (err: any) {
      alert(err.message || 'Failed to override priority.');
    }
  };

  const handleMissingInfoToggle = async (itemId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'Collected' ? 'Required' : 'Collected';
    try {
      const updatedComp = await api.updateMissingInfoStatus(caseId, itemId, nextStatus);
      setCompleteness(updatedComp);
    } catch {
      // ignore
    }
  };

  const handleResolveConflict = async (conflictId: string) => {
    try {
      await api.resolveConflict(caseId, conflictId, 'Reviewed and resolved by officer');
      loadCaseData();
    } catch {
      // ignore
    }
  };

  const handleAiActionDecision = async (actionId: string, status: 'ACCEPTED' | 'DISMISSED') => {
    try {
      await api.updateAiNextActionStatus(caseId, actionId, status);
      loadCaseData();
    } catch {
      // ignore
    }
  };

  const handleRunAiMatch = async () => {
    if (!customSightingText.trim()) return;
    setAiMatchLoading(true);
    try {
      const result = await api.matchDescription(caseId, customSightingText);
      setAiMatchAnalysis(result);
    } catch (err: any) {
      alert(err.message || 'AI analysis failed.');
    } finally {
      setAiMatchLoading(false);
    }
  };

  const handleCalculateDistanceToLastKnown = () => {
    if (!navigator.geolocation) {
      alert('Browser geolocation is not supported.');
      return;
    }

    setCalcDistanceLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const uLat = pos.coords.latitude;
        const uLng = pos.coords.longitude;
        setUserCoords({ lat: uLat, lng: uLng });

        try {
          const lkl = caseData?.person.lastKnownCoordinates || { lat: 10.9976, lng: 76.9664 };
          const res = await api.calculateDistance({
            originLatitude: uLat,
            originLongitude: uLng,
            destinationLatitude: lkl.lat,
            destinationLongitude: lkl.lng,
            originLabel: 'Your Authorized Current Location',
            destinationLabel: `Last Known Location (${caseData?.person.lastKnownLocation})`,
          });
          setDistanceResult(res);
        } catch {
          // ignore
        } finally {
          setCalcDistanceLoading(false);
        }
      },
      () => {
        alert('Location permission denied.');
        setCalcDistanceLoading(false);
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center gap-3 font-mono text-xs text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
        <span>Loading Investigation Cockpit Data for {caseId}...</span>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-red-950/50 border border-red-500/40 rounded-lg text-red-300 text-xs font-mono">
          {error || 'Unable to load case details.'}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-semibold cursor-pointer"
        >
          Return to Case Directory
        </button>
      </div>
    );
  }

  const verifiedSightingsCount = sightings.filter((s) => s.verificationStatus === 'Verified').length;
  const underReviewReportsCount = reports.filter((r) => r.verificationStatus === 'Under Review').length;
  const openLeadsCount = leads.filter((l) => l.status !== 'CLOSED' && l.status !== 'NOT_USEFUL').length;
  const openTasksCount = tasks.filter((t) => t.status !== 'Completed').length;
  const overdueTasksCount = tasks.filter((t) => t.status !== 'Completed' && new Date(t.dueDate).getTime() < Date.now()).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Cockpit Navigation Bar */}
      <div className="border-b border-slate-800 bg-slate-950/80 sticky top-0 z-30 backdrop-blur-md px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded transition-colors cursor-pointer"
            title="Return to Directory"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-cyan-400">{caseData.id}</span>
              <PriorityBadge priority={caseData.priority} />
              <StatusBadge status={caseData.status} />
            </div>
            <h1 className="text-base font-bold text-slate-100 truncate max-w-xl">{caseData.title}</h1>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportPdfModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
          >
            <Printer className="h-3.5 w-3.5 text-cyan-400" />
            <span>Generate Report</span>
          </button>

          {(role === 'SUPER_ADMIN' || role === 'CASE_OFFICER') && (
            <>
              <button
                onClick={() => setPriorityModalOpen(true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-mono font-semibold rounded flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
              >
                <span>Override Priority</span>
              </button>

              <button
                onClick={() => setStatusModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Change Status</span>
              </button>

              <button
                onClick={() => setClosureModalOpen(true)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Close Case</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Cockpit Content Area */}
      <div className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
        {/* CASE AT A GLANCE HEADER CARD */}
        <div className="p-5 rounded-xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 shadow-xl space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Photo & Profile */}
            <div className="flex items-start gap-3 col-span-1 lg:col-span-2">
              <img
                src={caseData.person.photoUrl}
                alt={caseData.person.fullName}
                className="h-28 w-28 object-cover rounded-lg border-2 border-slate-700 shrink-0"
              />
              <div className="space-y-1 text-xs">
                <div className="text-base font-bold text-slate-100">{caseData.person.fullName}</div>
                <div className="text-slate-400 font-mono">
                  Age: {caseData.person.age} ({caseData.person.gender}) | Height: {caseData.person.height}
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500 font-mono">Disappearance:</span> {caseData.person.dateMissing} at {caseData.person.timeMissing}
                </div>
                <div className="text-slate-300">
                  <span className="text-slate-500 font-mono">Last Location:</span> {caseData.person.lastKnownLocation}
                </div>
                <div className="text-slate-400 italic line-clamp-2">{caseData.person.circumstances}</div>
              </div>
            </div>

            {/* Officer & Priority Info */}
            <div className="space-y-1 text-xs font-mono text-slate-400 border-t lg:border-t-0 lg:border-l border-slate-800 pt-3 lg:pt-0 lg:pl-4">
              <div><span className="text-slate-500">Lead Officer:</span> {caseData.assignedOfficerName}</div>
              <div><span className="text-slate-500">Agency:</span> {caseData.leadAgency}</div>
              <div><span className="text-slate-500">Last Updated:</span> {new Date(caseData.updatedAt).toLocaleString()}</div>
              <div><span className="text-slate-500">Completeness:</span> {completeness?.overallPercent || 0}%</div>
              {priorityDetails?.isManualOverride && (
                <div className="text-amber-400 text-[11px] pt-1">
                  Manual Priority Override: {priorityDetails.currentPriority} (Reason: {priorityDetails.overrideReason})
                </div>
              )}
            </div>

            {/* Quick Counters */}
            <div className="grid grid-cols-3 gap-2 col-span-1 font-mono text-center">
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Reports</div>
                <div className="text-lg font-bold text-cyan-400">{reports.length}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Sightings</div>
                <div className="text-lg font-bold text-purple-400">{sightings.length}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Verified</div>
                <div className="text-lg font-bold text-emerald-400">{verifiedSightingsCount}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Under Review</div>
                <div className="text-lg font-bold text-amber-400">{underReviewReportsCount}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Leads</div>
                <div className="text-lg font-bold text-blue-400">{openLeadsCount}</div>
              </div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800">
                <div className="text-[10px] text-slate-500 uppercase">Tasks</div>
                <div className="text-lg font-bold text-orange-400">{openTasksCount}</div>
              </div>
            </div>
          </div>
        </div>

        {/* ATTENTION REQUIRED BANNER */}
        {(overdueTasksCount > 0 || conflicts.length > 0 || underReviewReportsCount > 0) && (
          <div className="p-4 rounded-xl border border-red-500/30 bg-red-950/20 text-xs text-red-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
              <div>
                <div className="font-bold font-mono text-slate-100 flex items-center gap-2">
                  <span>ATTENTION REQUIRED ON CASE</span>
                </div>
                <div className="text-[11px] text-red-300/80 flex items-center gap-3 flex-wrap">
                  {overdueTasksCount > 0 && <span>• {overdueTasksCount} Overdue Investigation Tasks</span>}
                  {conflicts.length > 0 && <span>• {conflicts.length} Conflicting Sighting Accounts</span>}
                  {underReviewReportsCount > 0 && <span>• {underReviewReportsCount} Sighting Reports Pending Verification</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto text-xs font-medium pb-px">
          {[
            { id: 'cockpit', label: 'Cockpit Overview' },
            { id: 'at-a-glance', label: 'Case Completeness & Priority' },
            { id: 'leads', label: `Leads Board (${openLeadsCount})` },
            { id: 'reports', label: `Reports & Sightings (${reports.length})` },
            { id: 'map', label: 'Map & Location Story' },
            { id: 'timeline', label: `Timeline (${timeline.length})` },
            { id: 'photos', label: `Evidence Vault (${files.length})` },
            { id: 'tasks', label: `Tasks (${openTasksCount})` },
            { id: 'ai', label: 'AI Assistant' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t text-xs font-mono transition-colors cursor-pointer border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900 font-bold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: COCKPIT OVERVIEW */}
        {activeTab === 'cockpit' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Verified Facts vs New Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Verified Info */}
                <div className="p-4 rounded-xl border border-emerald-500/30 bg-slate-900/60 space-y-3">
                  <h3 className="text-xs font-mono font-bold text-emerald-400 uppercase flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Verified Information Only ({verifiedSightingsCount})</span>
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {sightings
                      .filter((s) => s.verificationStatus === 'Verified')
                      .map((s) => (
                        <div key={s.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-emerald-400 font-bold">{s.location}</span>
                            <span className="text-slate-500">{s.time}</span>
                          </div>
                          <p className="text-slate-300 text-[11px]">{s.description}</p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* New Unverified Info */}
                <div className="p-4 rounded-xl border border-amber-500/30 bg-slate-900/60 space-y-3">
                  <h3 className="text-xs font-mono font-bold text-amber-400 uppercase flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>New Sighting Reports ({underReviewReportsCount})</span>
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {reports
                      .filter((r) => r.verificationStatus === 'New' || r.verificationStatus === 'Under Review')
                      .map((r) => (
                        <div key={r.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                          <div className="flex items-center justify-between font-mono text-[10px]">
                            <span className="text-amber-400 font-bold">{r.location}</span>
                            <button
                              onClick={() => setSelectedReportForVerify(r)}
                              className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                            >
                              Verify Now
                            </button>
                          </div>
                          <p className="text-slate-300 text-[11px]">{r.description}</p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              {/* Active Leads Summary */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-slate-200 uppercase flex items-center gap-2">
                    <Shield className="h-4 w-4 text-cyan-400" />
                    <span>Active Investigation Leads ({openLeadsCount})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('leads')}
                    className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Full Lead Board</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {leads
                    .filter((l) => l.status !== 'CLOSED')
                    .slice(0, 4)
                    .map((l) => (
                      <div key={l.id} className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                        <div className="flex items-center justify-between font-mono text-[10px]">
                          <span className="text-slate-400 font-bold">{l.id}</span>
                          <span className="text-amber-400">{l.priority}</span>
                        </div>
                        <div className="font-semibold text-slate-100">{l.title}</div>
                        <div className="text-[11px] text-slate-400 font-mono">Assigned: {l.assignedOfficerName}</div>
                      </div>
                    ))}
                </div>
              </div>
            </div>

            {/* Right Column: AI Assistance & Next Actions */}
            <div className="space-y-6">
              {/* AI Next Actions Panel */}
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono font-bold text-cyan-300 uppercase flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-cyan-400" />
                    <span>AI Suggested Next Actions</span>
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">AI-Assisted</span>
                </div>

                <div className="space-y-2">
                  {aiNextActions
                    .filter((a) => a.status === 'PENDING')
                    .map((action) => (
                      <div key={action.id} className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
                        <div className="font-semibold text-slate-100">{action.actionTitle}</div>
                        <p className="text-[11px] text-slate-400">{action.description}</p>
                        <div className="text-[10px] font-mono text-cyan-400/80 bg-cyan-950/40 p-1.5 rounded border border-cyan-500/20">
                          Why: {action.whySuggested}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => handleAiActionDecision(action.id, 'DISMISSED')}
                            className="px-2.5 py-1 bg-slate-800 text-slate-400 hover:text-slate-200 rounded font-mono text-[10px] cursor-pointer"
                          >
                            Dismiss
                          </button>
                          <button
                            onClick={() => handleAiActionDecision(action.id, 'ACCEPTED')}
                            className="px-2.5 py-1 bg-cyan-600 text-slate-950 hover:bg-cyan-500 rounded font-mono text-[10px] font-bold cursor-pointer"
                          >
                            Accept & Create Task
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Conflicts Panel */}
              {conflicts.length > 0 && (
                <div className="p-4 rounded-xl border border-red-500/30 bg-slate-900/60 space-y-3">
                  <h3 className="text-xs font-mono font-bold text-red-400 uppercase flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Conflicting Sighting Details ({conflicts.length})</span>
                  </h3>
                  <div className="space-y-2">
                    {conflicts.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-2">
                        <div className="font-mono text-[10px] text-red-400 font-bold uppercase">
                          Conflict Category: {c.category}
                        </div>
                        <div className="space-y-1">
                          {c.conflictingValues.map((cv, idx) => (
                            <div key={idx} className="text-[11px] text-slate-300 font-mono">
                              • <span className="text-slate-500">{cv.source}:</span> "{cv.value}"
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleResolveConflict(c.id)}
                          className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded font-mono text-[10px] cursor-pointer"
                        >
                          Mark Conflict Reviewed
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CASE COMPLETENESS & PRIORITY RATIONALE */}
        {activeTab === 'at-a-glance' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Completeness Section */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-cyan-400" />
                <span>Case Information Completeness Assessment</span>
              </h3>
              <p className="text-xs text-slate-400">
                Indicates completeness of recorded information (Not a case outcome success score).
              </p>

              {completeness && (
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs font-mono text-slate-300 mb-1">
                      <span>Overall Completeness</span>
                      <span className="font-bold text-cyan-400">{completeness.overallPercent}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div className="h-full bg-cyan-400 transition-all duration-300" style={{ width: `${completeness.overallPercent}%` }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Person Details</div>
                      <div className="text-slate-200 font-bold">{completeness.personDetailsPercent}%</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Report Info</div>
                      <div className="text-slate-200 font-bold">{completeness.reportInfoPercent}%</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Location Data</div>
                      <div className="text-slate-200 font-bold">{completeness.locationDataPercent}%</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
                      <div className="text-slate-500">Verification</div>
                      <div className="text-slate-200 font-bold">{completeness.verificationPercent}%</div>
                    </div>
                  </div>

                  {/* Missing Information Checklist */}
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">Missing Information Checklist</h4>
                    <div className="space-y-2">
                      {completeness.missingItems.map((item) => (
                        <div key={item.id} className="p-2.5 bg-slate-950 border border-slate-800 rounded flex items-center justify-between text-xs">
                          <div>
                            <div className="font-semibold text-slate-200">{item.label}</div>
                            <div className="text-[10px] font-mono text-slate-500">{item.category}</div>
                          </div>
                          <button
                            onClick={() => handleMissingInfoToggle(item.id, item.status)}
                            className={`px-2.5 py-1 rounded font-mono text-[10px] font-bold cursor-pointer ${
                              item.status === 'Collected'
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/40'
                                : 'bg-amber-950 text-amber-400 border border-amber-500/40'
                            }`}
                          >
                            {item.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Priority Rationale Section */}
            <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Shield className="h-4 w-4 text-amber-400" />
                  <span>Transparent Priority Assessment</span>
                </h3>
                <button
                  onClick={() => setPriorityModalOpen(true)}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 font-mono text-xs font-bold rounded cursor-pointer"
                >
                  Manual Override
                </button>
              </div>

              {priorityDetails && (
                <div className="space-y-4 text-xs font-mono">
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded flex items-center justify-between">
                    <div>
                      <span className="text-slate-500">Calculated Protocol Priority:</span>{' '}
                      <span className="font-bold text-slate-200">{priorityDetails.calculatedPriority}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Current Assigned:</span>{' '}
                      <span className="font-bold text-amber-400">{priorityDetails.currentPriority}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">Assessment Factors & Rationale</h4>
                    {priorityDetails.reasons.map((r, idx) => (
                      <div key={idx} className="p-3 bg-slate-950 border border-slate-800 rounded space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{r.code}</span>
                          <span className="text-amber-400 text-[10px] uppercase">{r.impact} Impact</span>
                        </div>
                        <p className="text-slate-400 font-sans">{r.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: LEADS BOARD */}
        {activeTab === 'leads' && (
          <LeadBoard
            caseId={caseId}
            leads={leads}
            onRefresh={loadCaseData}
            onOpenCreateModal={() => setLeadModalOpen(true)}
          />
        )}

        {/* TAB 4: REPORTS & SIGHTINGS */}
        {activeTab === 'reports' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">All Sighting Reports ({reports.length})</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {reports.map((r) => (
                <div key={r.id} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-cyan-400">{r.id}</span>
                    <span className="text-slate-400">{r.verificationStatus}</span>
                  </div>
                  <div className="font-bold text-slate-200">{r.location}</div>
                  <p className="text-slate-300">{r.description}</p>
                  <div className="text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span>Source: {r.source} ({r.reporterName})</span>
                    <span>{r.date} {r.time}</span>
                  </div>
                  {r.verificationStatus !== 'Verified' && (
                    <button
                      onClick={() => setSelectedReportForVerify(r)}
                      className="mt-2 w-full py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold font-mono text-xs rounded cursor-pointer"
                    >
                      Verify / Action Report
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: MAP & LOCATION STORY */}
        {activeTab === 'map' && (
          <div className="space-y-6">
            {/* Distance Calculator */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
              <div>
                <div className="font-bold text-slate-100 flex items-center gap-2 font-mono">
                  <Compass className="h-4 w-4 text-cyan-400" />
                  <span>Distance & Travel Time from Authorized Current Location</span>
                </div>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Only calculates after explicit browser permission. Distance from current officer location to last known disappearance location.
                </p>
              </div>
              <button
                disabled={calcDistanceLoading}
                onClick={handleCalculateDistanceToLastKnown}
                className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold rounded cursor-pointer whitespace-nowrap"
              >
                {calcDistanceLoading ? 'Calculating...' : 'Calculate Distance'}
              </button>
            </div>

            {distanceResult && (
              <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 text-xs font-mono space-y-1">
                <div className="font-bold text-cyan-300">Distance Result</div>
                <div className="text-slate-200">Straight-line: {distanceResult.straightLineDistanceKm} km</div>
                {distanceResult.directionsUrl && (
                  <a
                    href={distanceResult.directionsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline flex items-center gap-1 pt-1"
                  >
                    <span>Open Google Directions</span>
                    <ChevronRight className="h-3 w-3" />
                  </a>
                )}
              </div>
            )}

            {/* Map Canvas */}
            <div className="h-96 rounded-xl overflow-hidden border border-slate-800">
              <MapComponent
                locations={locations}
                onSelectLocation={() => {}}
              />
            </div>

            {/* Location Story Timeline */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
              <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">Location Story Sequence</h3>
              <div className="space-y-3 border-l-2 border-cyan-500/40 ml-2 pl-4">
                {locations.map((loc, idx) => (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="font-mono text-[10px] text-cyan-400 font-bold">{new Date(loc.timestamp).toLocaleString()}</div>
                    <div className="font-bold text-slate-100">{loc.locationType}: {loc.locationName}</div>
                    <div className="text-slate-400 text-[11px]">Source: {loc.source}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: TIMELINE */}
        {activeTab === 'timeline' && (
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-4">
            <h3 className="text-xs font-mono font-bold text-slate-200 uppercase">Chronological Audit Timeline</h3>
            <div className="space-y-3">
              {timeline.map((ev) => (
                <div key={ev.id} className="p-3 bg-slate-950 border border-slate-800 rounded text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="font-bold text-cyan-400">{ev.title}</span>
                    <span className="text-slate-500">{new Date(ev.timestamp).toLocaleString()}</span>
                  </div>
                  <p className="text-slate-300">{ev.description}</p>
                  <div className="text-[10px] font-mono text-slate-500">By {ev.user} ({ev.source})</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: EVIDENCE VAULT */}
        {activeTab === 'photos' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Evidence Media Locker ({files.length})</h3>
              <button
                onClick={() => setPhotoModalOpen(true)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Upload Media</span>
              </button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {files.map((f) => (
                <div key={f.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2 text-xs">
                  <img src={f.url} alt={f.originalName} className="h-36 w-full object-cover rounded border border-slate-800" />
                  <div className="font-semibold text-slate-200 truncate">{f.originalName}</div>
                  <button
                    onClick={() => setSelectedFileForAudit(f)}
                    className="w-full py-1 bg-slate-800 hover:bg-slate-700 text-purple-300 font-mono text-[10px] rounded cursor-pointer"
                  >
                    View Audit Trail
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 8: TASKS */}
        {activeTab === 'tasks' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">Investigation Tasks ({tasks.length})</h3>
              <button
                onClick={() => setTaskModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs rounded flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Create Task</span>
              </button>
            </div>
            <div className="space-y-2">
              {tasks.map((t) => (
                <div key={t.id} className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between font-mono">
                    <span className="font-bold text-slate-200">{t.title}</span>
                    <span className="text-amber-400">{t.priority}</span>
                  </div>
                  <p className="text-slate-300">{t.description}</p>
                  <div className="text-[10px] font-mono text-slate-500">Assigned: {t.assignedOfficerName} | Status: {t.status}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 9: AI ASSISTANT */}
        {activeTab === 'ai' && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900/60 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400" />
                  <span>AI Sighting Description Comparison & Similarity Sandbox</span>
                </h3>
              </div>

              <div className="space-y-3">
                <textarea
                  value={customSightingText}
                  onChange={(e) => setCustomSightingText(e.target.value)}
                  rows={3}
                  placeholder="Paste sighting description text to compare against missing person profile..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-3 text-xs text-slate-100 focus:border-cyan-500 outline-none resize-none font-mono"
                />
                <button
                  disabled={aiMatchLoading}
                  onClick={handleRunAiMatch}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold rounded cursor-pointer"
                >
                  {aiMatchLoading ? 'Analyzing...' : 'Run Description Comparison'}
                </button>

                {aiMatchAnalysis && (
                  <div className="p-4 bg-slate-950 border border-cyan-500/30 rounded-lg text-xs space-y-2 font-mono">
                    <div className="text-cyan-300 font-bold">
                      Match Confidence: {aiMatchAnalysis.matchConfidence} ({aiMatchAnalysis.similarityPercentage}%)
                    </div>
                    <div className="text-emerald-400">✓ Matching: {aiMatchAnalysis.matchedFeatures.join(', ')}</div>
                    <div className="text-amber-400">⚠ Differences: {aiMatchAnalysis.divergentFeatures.join(', ')}</div>
                    <p className="text-slate-300 font-sans">{aiMatchAnalysis.reasoning}</p>
                    <div className="text-[10px] text-slate-500 italic border-t border-slate-800 pt-1">
                      {aiMatchAnalysis.humanReviewDisclaimer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {/* Priority Override Modal */}
      {priorityModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Manual Priority Override</h3>
            <form onSubmit={handlePriorityOverrideSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">New Priority</label>
                <select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value as PriorityLevel)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Justification Reason *</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPriorityModalOpen(false)} className="px-3 py-1.5 bg-slate-800 text-xs text-slate-300 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 bg-amber-600 text-xs text-slate-950 font-bold rounded">
                  Save Priority Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Status Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">Change Case Operational Status</h3>
            <form onSubmit={handleStatusChangeSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-300 mb-1">New Operational Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100"
                >
                  <option value="Active">Active</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Person Located">Person Located</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-slate-300 mb-1">Audit Rationale Reason *</label>
                <textarea
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-xs text-slate-100 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setStatusModalOpen(false)} className="px-3 py-1.5 bg-slate-800 text-xs text-slate-300 rounded">
                  Cancel
                </button>
                <button type="submit" className="px-3 py-1.5 bg-cyan-600 text-xs text-slate-950 font-bold rounded">
                  Update Case Status
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Child Modals */}
      <CreateTaskModal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} caseId={caseId} onTaskCreated={loadCaseData} />
      <CreateLeadModal isOpen={leadModalOpen} onClose={() => setLeadModalOpen(false)} caseId={caseId} onLeadCreated={loadCaseData} />
      <UploadPhotoModal isOpen={photoModalOpen} onClose={() => setPhotoModalOpen(false)} caseId={caseId} onPhotoUploaded={loadCaseData} />
      <CaseClosureModal isOpen={closureModalOpen} onClose={() => setClosureModalOpen(false)} caseId={caseId} onCaseClosed={loadCaseData} />
      <PrintableCaseReportModal isOpen={reportPdfModalOpen} onClose={() => setReportPdfModalOpen(false)} caseId={caseId} />
      <EvidenceAuditModal isOpen={!!selectedFileForAudit} onClose={() => setSelectedFileForAudit(null)} file={selectedFileForAudit} caseId={caseId} />

      {selectedReportForVerify && (
        <VerifyReportModal
          isOpen={!!selectedReportForVerify}
          onClose={() => setSelectedReportForVerify(null)}
          report={selectedReportForVerify}
          onReportVerified={loadCaseData}
        />
      )}
    </div>
  );
};
