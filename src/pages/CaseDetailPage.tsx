import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Shield,
  FileText,
  Camera,
  CheckCircle2,
  ListTodo,
  Sparkles,
  History,
  AlertTriangle,
  Plus,
  Send,
  Lock,
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
} from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { MapComponent } from '../components/MapComponent.tsx';
import { AiSummaryModal } from '../components/AiSummaryModal.tsx';
import { CreateTaskModal } from '../components/CreateTaskModal.tsx';
import { UploadPhotoModal } from '../components/UploadPhotoModal.tsx';
import { VerifyReportModal } from '../components/VerifyReportModal.tsx';
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
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [files, setFiles] = useState<FileAttachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active Sub-tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'reports' | 'map' | 'timeline' | 'photos' | 'tasks' | 'ai' | 'audit'
  >('overview');

  // Modals state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<CaseStatus>('Active');
  const [statusReason, setStatusReason] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const [aiSummaryModalOpen, setAiSummaryModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);

  // Sighting verification modal
  const [selectedReportForVerify, setSelectedReportForVerify] = useState<Report | null>(null);

  // Quick AI Match Sandbox State
  const [customSightingText, setCustomSightingText] = useState('');
  const [aiMatchAnalysis, setAiMatchAnalysis] = useState<AiMatchAnalysis | null>(null);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);

  const loadCaseData = async () => {
    setLoading(true);
    try {
      const [c, r, s, t, tl, fl] = await Promise.all([
        api.getCaseById(caseId),
        api.getReports({ caseId }),
        api.getSightings({ caseId }),
        api.getTasks({ caseId }),
        api.getCaseTimeline(caseId),
        api.getCasePhotos(caseId),
      ]);

      setCaseData(c);
      setReports(r.reports);
      setSightings(s.sightings);
      setTasks(t.tasks);
      setTimeline(tl.events);
      setFiles(fl.files);
    } catch (err: any) {
      setError(err.message || 'Failed to load case data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseData();
  }, [caseId]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caseData || !statusReason.trim()) return;

    setStatusSubmitting(true);
    try {
      const updated = await api.updateCaseStatus(caseData.id, newStatus, statusReason.trim());
      setCaseData(updated);
      setStatusModalOpen(false);
      setStatusReason('');
      // Reload timeline
      const tl = await api.getCaseTimeline(caseId);
      setTimeline(tl.events);
    } catch (err: any) {
      alert(err.message || 'Status transition error');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const handleRunAiMatch = async () => {
    if (!caseData || !customSightingText.trim()) return;
    setAiMatchLoading(true);
    try {
      const res = await api.matchDescription(caseData.id, customSightingText.trim());
      setAiMatchAnalysis(res);
    } catch (err: any) {
      alert(err.message || 'AI correlation failed');
    } finally {
      setAiMatchLoading(false);
    }
  };

  const isOfficerOrAdmin = role === 'SUPER_ADMIN' || role === 'CASE_OFFICER';

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
        <span className="font-mono text-xs">Loading case file {caseId}...</span>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
          {error || 'Case file could not be located.'}
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 text-slate-200 font-mono text-xs rounded hover:bg-slate-700"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Back Button & Case Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded cursor-pointer transition-colors"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-bold text-cyan-400">{caseData.id}</span>
              <PriorityBadge priority={caseData.priority} />
              <StatusBadge status={caseData.status} />
            </div>
            <h1 className="text-xl font-bold text-slate-100 mt-0.5">{caseData.title}</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {isOfficerOrAdmin && (
            <button
              onClick={() => {
                setNewStatus(caseData.status);
                setStatusModalOpen(true);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-semibold rounded cursor-pointer transition-colors"
            >
              Transition Status
            </button>
          )}

          {isOfficerOrAdmin && (
            <button
              onClick={() => setTaskModalOpen(true)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-semibold rounded cursor-pointer transition-colors"
            >
              + Dispatch Task
            </button>
          )}

          <button
            onClick={() => setPhotoModalOpen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs font-semibold rounded cursor-pointer transition-colors"
          >
            + Add Evidence
          </button>

          <button
            onClick={() => setAiSummaryModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded shadow cursor-pointer transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Briefing (SITREP)</span>
          </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1 border-b border-slate-800 overflow-x-auto text-xs font-mono">
        {[
          { id: 'overview', label: '1. Overview & Profile', count: undefined },
          { id: 'reports', label: '2. Reports & Tips', count: reports.length },
          { id: 'map', label: '3. Geographic Trajectory', count: sightings.length },
          { id: 'timeline', label: '4. Case Timeline', count: timeline.length },
          { id: 'photos', label: '5. Evidence Locker', count: files.length },
          { id: 'tasks', label: '6. Tasks', count: tasks.length },
          { id: 'ai', label: '7. AI Match Tools', count: undefined },
          { id: 'audit', label: '8. Status History & Audit', count: caseData.statusHistory.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-4 py-2.5 font-medium border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                isActive
                  ? 'border-cyan-400 text-cyan-300 bg-slate-900/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/30'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="font-mono text-[10px] px-1.5 rounded bg-slate-800 text-slate-400 tabular-nums">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Overview & Person Profile */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Photo & Key Demographics */}
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-md">
              <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                <img
                  src={caseData.person.photoUrl}
                  alt={caseData.person.fullName}
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2">
                  <StatusBadge status={caseData.status} />
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="font-bold text-base text-slate-100">{caseData.person.fullName}</div>
                <div className="grid grid-cols-2 gap-2 text-slate-300 font-mono text-[11px] pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-slate-500">Age: </span>
                    {caseData.person.age} years
                  </div>
                  <div>
                    <span className="text-slate-500">Gender: </span>
                    {caseData.person.gender}
                  </div>
                  <div>
                    <span className="text-slate-500">Height: </span>
                    {caseData.person.height}
                  </div>
                  <div>
                    <span className="text-slate-500">Languages: </span>
                    {caseData.person.languages?.join(', ')}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
                <div>
                  <span className="text-slate-500">Assigned Officer: </span>
                  <span className="text-slate-300 font-medium">{caseData.assignedOfficerName}</span>
                </div>
                <div>
                  <span className="text-slate-500">Lead Agency: </span>
                  <span className="text-slate-300">{caseData.leadAgency}</span>
                </div>
              </div>
            </div>

            {/* Reporting Person Contact (Privacy Protected) */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <h3 className="font-mono text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                Intake Reporting Party
              </h3>
              <div className="text-slate-300 font-semibold">
                {caseData.person.reportingPersonName} ({caseData.person.reportingPersonRelationship})
              </div>
              {caseData.person.reportingPersonContact ? (
                <div className="font-mono text-cyan-400 text-[11px]">
                  {caseData.person.reportingPersonContact}
                </div>
              ) : (
                <div className="text-slate-500 italic text-[11px] flex items-center gap-1">
                  <Lock className="h-3 w-3 text-emerald-400" />
                  Contact details hidden by privacy filter
                </div>
              )}
            </div>
          </div>

          {/* Right 2 Columns: Physical Traits, Circumstances & Internal Notes */}
          <div className="lg:col-span-2 space-y-4">
            {/* Characteristics Grid */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 shadow-md text-xs">
              <h3 className="font-mono text-xs uppercase font-bold text-cyan-400 tracking-wider">
                Investigative Physical Profile
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Physical Description:</div>
                  <p className="text-slate-200 leading-relaxed">
                    {caseData.person.physicalDescription || 'None documented.'}
                  </p>
                </div>

                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Clothing When Last Seen:</div>
                  <p className="text-slate-200 leading-relaxed">
                    {caseData.person.clothingDescription || 'Unknown.'}
                  </p>
                </div>

                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Identifying Marks:</div>
                  <p className="text-slate-200 leading-relaxed">
                    {caseData.person.identifyingMarks || 'None noted.'}
                  </p>
                </div>

                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <div className="font-semibold text-slate-300 mb-1">Medical Conditions:</div>
                  <p className="text-slate-200 leading-relaxed">
                    {caseData.person.medicalConditions || 'No critical conditions reported.'}
                  </p>
                </div>
              </div>

              {/* Circumstances & Last Known Location */}
              <div className="space-y-3 pt-3 border-t border-slate-800">
                <div className="flex items-start gap-2 text-slate-200">
                  <MapPin className="h-4 w-4 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Last Known Location: </span>
                    <span>{caseData.person.lastKnownLocation}</span>
                    <span className="font-mono text-slate-500 text-[11px] ml-2">
                      ({caseData.person.dateMissing} at {caseData.person.timeMissing})
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded bg-slate-950 border border-slate-800/80">
                  <span className="font-semibold text-slate-300 block mb-1">
                    Activity & Circumstances:
                  </span>
                  <p className="text-slate-200 leading-relaxed">{caseData.person.circumstances}</p>
                </div>
              </div>

              {/* Internal Notes (Officer Only) */}
              {isOfficerOrAdmin && caseData.internalNotes && (
                <div className="p-3 rounded bg-amber-950/20 border border-amber-800/40">
                  <span className="font-mono font-bold text-amber-400 text-[11px] uppercase block mb-1 flex items-center gap-1.5">
                    <Lock className="h-3 w-3" />
                    Internal Investigation Notes (Confidential)
                  </span>
                  <p className="text-slate-300 leading-relaxed">{caseData.internalNotes}</p>
                </div>
              )}
            </div>

            {/* Quick Sighting Mini Map Preview */}
            <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-mono text-xs uppercase font-bold text-slate-300 tracking-wider">
                  Incident & Sighting Trail
                </h3>
                <button
                  onClick={() => setActiveTab('map')}
                  className="font-mono text-xs text-cyan-400 hover:underline cursor-pointer"
                >
                  Expand Full Map
                </button>
              </div>
              <MapComponent
                cases={[caseData]}
                sightings={sightings}
                center={[
                  caseData.person.lastKnownCoordinates.lat,
                  caseData.person.lastKnownCoordinates.lng,
                ]}
                height="280px"
              />
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reports & Tips */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
              Submitted Sighting Reports ({reports.length})
            </h3>
          </div>

          {reports.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              No sighting reports have been submitted for this case yet.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <div
                  key={r.id}
                  className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-400">{r.id}</span>
                      <StatusBadge status={r.verificationStatus} size="sm" />
                      <span className="text-slate-400 font-mono text-xs">
                        Source: {r.source} ({r.reporterType})
                      </span>
                    </div>

                    {isOfficerOrAdmin && (
                      <button
                        onClick={() => setSelectedReportForVerify(r)}
                        className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded cursor-pointer"
                      >
                        Verification Desk
                      </button>
                    )}
                  </div>

                  <p className="text-slate-200 text-xs leading-relaxed bg-slate-950 p-3 rounded border border-slate-800/80">
                    "{r.description}"
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-400 pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-rose-400" />
                      <span>{r.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>{r.date} at {r.time}</span>
                    </div>
                  </div>

                  {r.verificationNotes && (
                    <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                      <span className="font-semibold text-cyan-400">Review Notes: </span>
                      <span>{r.verificationNotes}</span>
                      {r.assignedReviewerName && (
                        <span className="text-slate-500 ml-2">({r.assignedReviewerName})</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Geographic Map */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
              Interactive Incident Sighting Trail ({sightings.length} sightings mapped)
            </h3>
          </div>
          <MapComponent
            cases={[caseData]}
            sightings={sightings}
            center={[
              caseData.person.lastKnownCoordinates.lat,
              caseData.person.lastKnownCoordinates.lng,
            ]}
            height="560px"
          />
        </div>
      )}

      {/* Tab 4: Chronological Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-4">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2">
            Incident Chronology & Investigation Log
          </h3>

          <div className="relative border-l border-slate-800 ml-4 space-y-6 py-2">
            {timeline.map((event) => (
              <div key={event.id} className="relative pl-6">
                <span className="absolute -left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-slate-950 bg-cyan-400 ring-2 ring-cyan-500/30" />
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-slate-100">{event.title}</span>
                    <span className="font-mono text-[10px] text-slate-500">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-300 leading-relaxed">{event.description}</p>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-1">
                    <span>Officer/Source: {event.user} ({event.source})</span>
                    {event.statusBadge && <StatusBadge status={event.statusBadge} size="sm" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Evidence Locker */}
      {activeTab === 'photos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
              Evidence Locker & Media Files ({files.length})
            </h3>
            <button
              onClick={() => setPhotoModalOpen(true)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded cursor-pointer"
            >
              + Ingest Media
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {files.map((f) => (
              <div
                key={f.id}
                className="group rounded-lg bg-slate-900 border border-slate-800 overflow-hidden shadow"
              >
                <div className="h-36 bg-slate-950 overflow-hidden">
                  <img
                    src={f.url}
                    alt={f.originalName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="p-3 text-xs space-y-1">
                  <div className="font-semibold text-slate-200 truncate">{f.originalName}</div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {(f.sizeBytes / 1024).toFixed(0)} KB • {f.mimeType}
                  </div>
                  <div className="text-[10px] text-slate-500">By: {f.uploadedBy}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Investigation Tasks */}
      {activeTab === 'tasks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200">
              Assigned Investigation Tasks ({tasks.length})
            </h3>
            {isOfficerOrAdmin && (
              <button
                onClick={() => setTaskModalOpen(true)}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded cursor-pointer"
              >
                + Dispatch Task
              </button>
            )}
          </div>

          <div className="space-y-3">
            {tasks.map((t) => (
              <div
                key={t.id}
                className="p-4 rounded-lg bg-slate-900 border border-slate-800 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400">{t.id}</span>
                    <h4 className="font-semibold text-slate-100">{t.title}</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={t.priority} />
                    <StatusBadge status={t.status} size="sm" />
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed">{t.description}</p>

                <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 pt-2 border-t border-slate-800/60">
                  <span>Assigned: {t.assignedOfficerName}</span>
                  <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 7: AI Correlation Sandbox */}
      {activeTab === 'ai' && (
        <div className="space-y-5">
          <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-mono font-bold text-xs uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                AI Description Correlation Workspace
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Evaluate citizen text tips or witness statements against this subject profile using server-side Gemini intelligence.
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-slate-300 font-medium text-xs">
                Witness or Sighting Statement to Evaluate:
              </label>
              <textarea
                rows={3}
                placeholder="e.g. A young woman wearing a dark blue hoodie and yellow backpack was spotted near the tram stop asking for directions around 4pm..."
                value={customSightingText}
                onChange={(e) => setCustomSightingText(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 text-xs focus:border-indigo-500 focus:outline-none"
              />
            </div>

            <button
              onClick={handleRunAiMatch}
              disabled={aiMatchLoading || !customSightingText.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold rounded cursor-pointer transition-colors disabled:opacity-50"
            >
              {aiMatchLoading ? 'Analyzing Alignment...' : 'Execute Correlation Assessment'}
            </button>

            {aiMatchAnalysis && (
              <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-indigo-900/60 space-y-3 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-slate-300 font-semibold">Match Probability:</span>
                  <span className="font-mono font-bold text-indigo-300 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800">
                    {aiMatchAnalysis.matchConfidence} ({aiMatchAnalysis.similarityPercentage}%)
                  </span>
                </div>

                <p className="text-slate-200 leading-relaxed">{aiMatchAnalysis.reasoning}</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-emerald-400 font-semibold block mb-1">
                      Matched Characteristics:
                    </span>
                    <ul className="list-disc list-inside text-slate-300 space-y-0.5">
                      {aiMatchAnalysis.matchedFeatures.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
                    <span className="text-amber-400 font-semibold block mb-1">
                      Divergent Features / Gaps:
                    </span>
                    <ul className="list-disc list-inside text-slate-400 space-y-0.5">
                      {aiMatchAnalysis.divergentFeatures.map((d, i) => (
                        <li key={i}>{d}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 font-mono text-[10px] text-amber-300">
                  ⚠️ {aiMatchAnalysis.humanReviewDisclaimer}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 8: Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-slate-200 border-b border-slate-800 pb-2">
            Status Transition History & Tamper-Evident Record
          </h3>

          <div className="space-y-3">
            {caseData.statusHistory.map((h, i) => (
              <div
                key={i}
                className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-slate-400">{h.fromStatus}</span>
                    <span className="text-slate-600">→</span>
                    <span className="text-cyan-400 font-bold">{h.toStatus}</span>
                  </div>
                  <span className="font-mono text-[11px] text-slate-500">
                    {new Date(h.timestamp).toLocaleString()}
                  </span>
                </div>
                <div className="text-slate-300">
                  <strong className="text-slate-400">Justification: </strong>
                  {h.reason}
                </div>
                <div className="text-[11px] font-mono text-slate-500">Authorized by: {h.changedBy}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status Transition Modal */}
      {statusModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl">
            <h3 className="font-mono text-sm font-bold uppercase text-slate-100">
              Update Case Operational Status
            </h3>
            <form onSubmit={handleUpdateStatus} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">New Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as CaseStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Active">Active</option>
                  <option value="Under Investigation">Under Investigation</option>
                  <option value="Person Located">Person Located</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Mandatory Operational Justification *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record verification details, corroborating officer, or search milestone..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={statusSubmitting}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono font-bold uppercase rounded cursor-pointer disabled:opacity-50"
                >
                  {statusSubmitting ? 'Recording...' : 'Confirm Transition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Auxiliary Modals */}
      <AiSummaryModal
        targetCase={caseData}
        isOpen={aiSummaryModalOpen}
        onClose={() => setAiSummaryModalOpen(false)}
      />

      <CreateTaskModal
        caseId={caseData.id}
        caseTitle={caseData.title}
        isOpen={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onTaskCreated={(t) => setTasks([t, ...tasks])}
      />

      <UploadPhotoModal
        caseId={caseData.id}
        isOpen={photoModalOpen}
        onClose={() => setPhotoModalOpen(false)}
        onPhotoUploaded={(f) => setFiles([f, ...files])}
      />

      {selectedReportForVerify && (
        <VerifyReportModal
          report={selectedReportForVerify}
          linkedCase={caseData}
          isOpen={!!selectedReportForVerify}
          onClose={() => setSelectedReportForVerify(null)}
          onReportUpdated={(updated) => {
            setReports(reports.map((r) => (r.id === updated.id ? updated : r)));
          }}
        />
      )}
    </div>
  );
};
