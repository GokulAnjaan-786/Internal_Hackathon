import React, { useState, useEffect } from 'react';
import { Smartphone, MapPin, Camera, Plus, CheckCircle2, Navigation, Send, ArrowLeft, RefreshCw, FileText } from 'lucide-react';
import { api } from '../services/api.ts';
import { Case, Report } from '../types/index.ts';

interface FieldModePageProps {
  onSelectCase: (caseId: string) => void;
}

export const FieldModePage: React.FC<FieldModePageProps> = ({ onSelectCase }) => {
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  // Field Form State
  const [sightingLocation, setSightingLocation] = useState('');
  const [sightingDescription, setSightingDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.getCases({ status: 'Active' });
      setCases(res.cases);
      if (res.cases.length > 0) {
        setSelectedCase(res.cases[0]);
      }
    } catch {
      // ignore
    } fontinally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const handleFieldReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !sightingLocation.trim() || !sightingDescription.trim()) return;

    setSubmitting(true);
    setSuccessMsg(null);

    try {
      await api.submitReport({
        caseId: selectedCase.id,
        reporterType: 'Field Team',
        reporterName: 'Field Response Patrol',
        description: sightingDescription.trim(),
        location: sightingLocation.trim(),
        source: 'Field Officer Mobile Intake',
        photoUrl: photoUrl.trim() || undefined,
      });

      setSuccessMsg('Field sighting report submitted and dispatched to verification queue!');
      setSightingLocation('');
      setSightingDescription('');
      setPhotoUrl('');
    } catch (err: any) {
      alert(err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 font-mono text-xs text-slate-400">
        <RefreshCw className="h-6 w-6 animate-spin text-cyan-400" />
        <span>Loading Field Response Operational Terminal...</span>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-xl mx-auto space-y-4 font-sans">
      {/* Top Field Header */}
      <div className="p-4 rounded-xl border border-cyan-500/30 bg-slate-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-100">Responsive Field Officer Mode</h1>
            <p className="text-[11px] font-mono text-slate-400">High-Efficiency Mobile Operations Terminal</p>
          </div>
        </div>
      </div>

      {/* Case Selector */}
      <div className="space-y-1.5">
        <label className="block text-xs font-mono font-bold text-slate-300">Select Active Case:</label>
        <select
          value={selectedCase?.id || ''}
          onChange={(e) => {
            const found = cases.find((c) => c.id === e.target.value);
            if (found) setSelectedCase(found);
          }}
          className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-xs text-slate-100 font-semibold outline-none"
        >
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.id} - {c.person.fullName} ({c.person.lastKnownLocation})
            </option>
          ))}
        </select>
      </div>

      {/* Selected Case Quick Summary Card */}
      {selectedCase && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
          <div className="flex items-start gap-3">
            <img
              src={selectedCase.person.photoUrl}
              alt={selectedCase.person.fullName}
              className="h-20 w-20 object-cover rounded-lg border border-slate-700 shrink-0"
            />
            <div className="space-y-1 text-xs">
              <div className="font-bold text-slate-100 text-sm">{selectedCase.person.fullName}</div>
              <div className="text-slate-400 font-mono">
                {selectedCase.person.age}yo {selectedCase.person.gender} | Priority: {selectedCase.priority}
              </div>
              <div className="text-slate-300">
                <span className="text-slate-500 font-mono">Last Known:</span> {selectedCase.person.lastKnownLocation}
              </div>
              <button
                onClick={() => onSelectCase(selectedCase.id)}
                className="mt-1 text-cyan-400 font-mono text-[11px] underline cursor-pointer"
              >
                Open Full Cockpit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Field Sighting Quick Report Form */}
      {selectedCase && (
        <form onSubmit={handleFieldReportSubmit} className="p-4 rounded-xl border border-slate-800 bg-slate-900 space-y-3">
          <h2 className="text-xs font-bold font-mono text-cyan-400 uppercase flex items-center gap-1.5">
            <Send className="h-4 w-4 text-cyan-400" />
            <span>Quick Field Sighting Intake</span>
          </h2>

          {successMsg && (
            <div className="p-3 bg-emerald-950/50 border border-emerald-500/40 rounded text-xs text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Field Location Description *
            </label>
            <input
              type="text"
              value={sightingLocation}
              onChange={(e) => setSightingLocation(e.target.value)}
              placeholder="e.g. Ukkadam Lake Bypass Bus Stop shelter"
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Sighting Account / Observation *
            </label>
            <textarea
              value={sightingDescription}
              onChange={(e) => setSightingDescription(e.target.value)}
              rows={3}
              placeholder="Describe physical traits, clothing, direction of movement..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-100 outline-none focus:border-cyan-500 resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Field Photo URL (Optional)
            </label>
            <input
              type="text"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="Paste photo link or evidence attachment URL..."
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 text-xs text-slate-100 outline-none focus:border-cyan-500"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs rounded transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Submitting Field Sighting...' : 'Submit Field Sighting'}
          </button>
        </form>
      )}
    </div>
  );
};
