import React, { useState, useEffect, useMemo } from 'react';
import {
  MapPin,
  Filter,
  Layers,
  Clock,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  Search,
  Crosshair,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  User,
  Shield,
  Eye,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Case, Sighting, CaseLocationItem } from '../types/index.ts';
import { GoogleIncidentMap } from '../components/GoogleIncidentMap.tsx';

interface IncidentMapPageProps {
  onSelectCase: (caseId: string) => void;
}

export const IncidentMapPage: React.FC<IncidentMapPageProps> = ({ onSelectCase }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string>('MP-2026-000001'); // Default to Arun Kumar
  const [caseLocations, setCaseLocations] = useState<CaseLocationItem[]>([]);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Load Cases list
  useEffect(() => {
    api.getCases()
      .then((res) => {
        setCases(res.cases);
        // Default to Arun Kumar if exists, else first case
        const arunCase = res.cases.find((c) => c.id === 'MP-2026-000001');
        if (arunCase) {
          setSelectedCaseId(arunCase.id);
        } else if (res.cases.length > 0) {
          setSelectedCaseId(res.cases[0].id);
        }
      })
      .catch((err) => console.error('Failed to load cases:', err));
  }, []);

  // Load Locations for selected case or all cases
  useEffect(() => {
    if (!selectedCaseId) return;
    setLoading(true);

    if (selectedCaseId === 'ALL') {
      // Gather locations across cases
      Promise.all(cases.map((c) => api.getCaseLocations(c.id).catch(() => ({ locations: [] }))))
        .then((results) => {
          const allLocs = results.flatMap((r) => r.locations || []);
          setCaseLocations(allLocs);
        })
        .finally(() => setLoading(false));
    } else {
      api.getCaseLocations(selectedCaseId)
        .then((res) => {
          setCaseLocations(res.locations || []);
        })
        .catch((err) => {
          console.error('Failed to fetch case locations:', err);
          setCaseLocations([]);
        })
        .finally(() => setLoading(false));
    }
  }, [selectedCaseId, cases]);

  const currentCase = useMemo(
    () => cases.find((c) => c.id === selectedCaseId),
    [cases, selectedCaseId]
  );

  // Chronological Sightings List for Timeline Panel
  const chronologicalSightings = useMemo(() => {
    return [...caseLocations].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }, [caseLocations]);

  // Quick stats
  const verifiedCount = caseLocations.filter((l) => l.verificationStatus === 'Verified').length;
  const underReviewCount = caseLocations.filter((l) => l.verificationStatus === 'Under Review').length;
  const unverifiedCount = caseLocations.filter(
    (l) => !l.verificationStatus || (l.verificationStatus !== 'Verified' && l.verificationStatus !== 'Under Review')
  ).length;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-400 font-mono text-xs font-bold uppercase tracking-wider">
            <MapPin className="h-4 w-4" />
            <span>Geospatial Incident Intelligence</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Google Maps Platform Grounded</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mt-1">
            Emergency Sighting Sequence & Geospatial Tracker
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time coordinates, chronological sighting corridors, and automated responder distance calculations
          </p>
        </div>

        {/* Case Selector Dropdown */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-900 border border-slate-700 px-3 py-1.5">
            <Layers className="h-4 w-4 text-cyan-400" />
            <select
              value={selectedCaseId}
              onChange={(e) => {
                setSelectedCaseId(e.target.value);
                setSelectedLocationId(null);
              }}
              className="bg-transparent text-slate-100 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <optgroup label="Emergency Demonstration Cases">
                <option value="MP-2026-000001">
                  MP-2026-000001 • Arun Kumar (Ukkadam / Coimbatore Transit Hub)
                </option>
              </optgroup>
              <optgroup label="Active Investigation Cases">
                {cases
                  .filter((c) => c.id !== 'MP-2026-000001')
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} • {c.person.fullName} ({c.status})
                    </option>
                  ))}
              </optgroup>
              <option value="ALL">All Regional Cases Consolidated</option>
            </select>
          </div>

          {currentCase && (
            <button
              onClick={() => onSelectCase(currentCase.id)}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center space-x-1.5 transition-colors"
            >
              <span>View Full Case File</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}
        </div>
      </div>

      {/* Case Overview Strip */}
      {currentCase && (
        <div className="bg-slate-900/90 border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            {currentCase.person.photoUrl ? (
              <img
                src={currentCase.person.photoUrl}
                alt={currentCase.person.fullName}
                className="w-12 h-12 object-cover border border-slate-700 shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-slate-800 flex items-center justify-center text-slate-500 border border-slate-700 shrink-0">
                <User className="w-6 h-6" />
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-white text-base">
                  {currentCase.person.fullName}
                </h3>
                <span className="text-[11px] font-mono bg-rose-950/80 text-rose-300 px-2 py-0.5 border border-rose-800 font-bold uppercase">
                  {currentCase.priority} Priority
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {currentCase.id}
                </span>
              </div>
              <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
                <span>
                  <strong className="text-slate-300">Age:</strong> {currentCase.person.age}
                </span>
                <span>
                  <strong className="text-slate-300">Last Known:</strong>{' '}
                  {currentCase.person.lastKnownLocation}
                </span>
                <span>
                  <strong className="text-slate-300">Missing Since:</strong>{' '}
                  {currentCase.person.dateMissing} {currentCase.person.timeMissing}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center space-x-3 text-xs font-mono">
            <div className="bg-slate-950 px-3 py-1.5 border border-slate-800">
              <span className="text-slate-500 block text-[10px] uppercase">Recorded Locations</span>
              <span className="font-bold text-white tabular-nums text-sm">
                {caseLocations.length}
              </span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 border border-slate-800">
              <span className="text-emerald-500 block text-[10px] uppercase">Verified</span>
              <span className="font-bold text-emerald-400 tabular-nums text-sm">
                {verifiedCount}
              </span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 border border-slate-800">
              <span className="text-amber-500 block text-[10px] uppercase">Under Review</span>
              <span className="font-bold text-amber-400 tabular-nums text-sm">
                {underReviewCount}
              </span>
            </div>
            <div className="bg-slate-950 px-3 py-1.5 border border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Unverified</span>
              <span className="font-bold text-slate-300 tabular-nums text-sm">
                {unverifiedCount}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Split View (Interactive Map + Chronological Sighting Corridor) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left 8 Columns: Google Maps Platform Interactive Map */}
        <div className="lg:col-span-8 flex flex-col space-y-3">
          {loading ? (
            <div className="h-[560px] flex flex-col items-center justify-center bg-slate-950 border border-slate-800 text-slate-400 text-xs gap-3">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span>Loading Google Maps layers and case sightings...</span>
            </div>
          ) : (
            <GoogleIncidentMap
              locations={caseLocations}
              caseId={selectedCaseId}
              caseTitle={currentCase?.title}
              personName={currentCase?.person.fullName}
              personPhoto={currentCase?.person.photoUrl}
              height="580px"
              selectedLocationId={selectedLocationId}
              onSelectLocation={(loc) => setSelectedLocationId(loc ? loc.id : null)}
              showFilters={true}
              showSequenceLine={true}
            />
          )}

          {/* Sequence Clarification Note */}
          <div className="p-2.5 bg-slate-950 border border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
              <span>
                <strong>Sequence Visualization:</strong> Numbered pins 1, 2, 3 indicate chronological order of reported citizen tips. This represents reporting timeline, not confirmed physical movement.
              </span>
            </div>
            <span className="text-slate-500 font-mono text-[10px] hidden sm:inline">
              MAP_ID: DEMO_MAP_ID
            </span>
          </div>
        </div>

        {/* Right 4 Columns: Chronological Sighting Corridor Panel */}
        <div className="lg:col-span-4 flex flex-col bg-slate-900 border border-slate-800">
          {/* Panel Header */}
          <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-200">
                Sighting Sequence Corridor
              </h3>
            </div>
            <span className="text-[11px] font-mono bg-slate-900 px-2 py-0.5 border border-slate-800 text-slate-400">
              {chronologicalSightings.length} Points
            </span>
          </div>

          {/* Timeline Items List */}
          <div className="p-3 space-y-3 overflow-y-auto max-h-[520px]">
            {chronologicalSightings.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No location sightings logged for this case yet.
              </div>
            ) : (
              chronologicalSightings.map((loc, idx) => {
                const isSelected = selectedLocationId === loc.id;
                const isLKL = loc.locationType === 'Last Known Location';

                return (
                  <div
                    key={loc.id}
                    onClick={() => setSelectedLocationId(loc.id)}
                    className={`p-3 border transition-all cursor-pointer relative ${
                      isSelected
                        ? 'bg-slate-850 border-cyan-500 shadow-md ring-1 ring-cyan-500/40'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {/* Status Ribbon / Badge */}
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center space-x-1.5">
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 border uppercase font-mono ${
                            isLKL
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : loc.verificationStatus === 'Verified'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : loc.verificationStatus === 'Under Review'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-900 text-slate-400 border-slate-700'
                          }`}
                        >
                          {isLKL ? 'LKL' : `Sighting #${idx}`}
                        </span>

                        <span className="text-xs font-semibold text-slate-200">
                          {loc.verificationStatus || 'Active'}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1 text-[11px] font-mono text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>
                          {new Date(loc.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    {/* Location Name */}
                    <h4 className="font-semibold text-slate-100 text-xs leading-snug">
                      {loc.locationName}
                    </h4>

                    {/* Description excerpt */}
                    {loc.description && (
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-normal">
                        "{loc.description}"
                      </p>
                    )}

                    {/* Source & Actions */}
                    <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Source: {loc.source}</span>
                      <span className="text-cyan-400 font-medium flex items-center space-x-0.5 hover:underline">
                        <span>Center on Map</span>
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Sighting Sequence Legend */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 uppercase tracking-wider text-[10px]">
              Marker Status Legend
            </div>
            <div className="grid grid-cols-2 gap-1 text-[11px]">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-rose-600 rounded-sm"></span>
                <span>Last Known Location</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-emerald-600 rounded-sm"></span>
                <span>Verified Sighting</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-amber-600 rounded-sm"></span>
                <span>Under Review</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 bg-slate-500 rounded-sm"></span>
                <span>Unverified Tip</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
