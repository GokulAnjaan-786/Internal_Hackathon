import React, { useState, useEffect } from 'react';
import {
  Globe,
  Send,
  Search,
  CheckCircle,
  Copy,
  AlertCircle,
  Shield,
  MapPin,
  Calendar,
  Clock,
  Lock,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Case, Report } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';

export const CitizenPortalPage: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'SUBMIT' | 'TRACK'>('SUBMIT');
  const [cases, setCases] = useState<Case[]>([]);

  // Submission Form State
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [location, setLocation] = useState('');
  const [lat, setLat] = useState(37.7749);
  const [lng, setLng] = useState(-122.4194);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('14:30');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80'
  );
  const [reporterName, setReporterName] = useState('');
  const [reporterContact, setReporterContact] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReceipt, setSubmittedReceipt] = useState<Report | null>(null);
  const [copied, setCopied] = useState(false);

  // Tracking State
  const [trackReportId, setTrackReportId] = useState('REP-2026-000101');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  useEffect(() => {
    api.getCases().then((res) => {
      setCases(res.cases);
      if (res.cases.length > 0) setSelectedCaseId(res.cases[0].id);
    });
  }, []);

  const handleSubmitSighting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCaseId || !location.trim() || !description.trim()) {
      alert('Case selection, location, and description are required.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.submitReport({
        caseId: selectedCaseId,
        date,
        time,
        location: location.trim(),
        latitude: Number(lat),
        longitude: Number(lng),
        description: description.trim(),
        reporterName: isAnonymous ? 'Anonymous Citizen' : reporterName.trim() || 'Concerned Citizen',
        reporterContact: isAnonymous ? undefined : reporterContact.trim(),
        reporterType: 'CITIZEN',
        photoUrl: photoUrl.trim() || undefined,
      });

      setSubmittedReceipt(res);
    } catch (err: any) {
      alert(err.message || 'Failed to transmit sighting report.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTrackReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackReportId.trim()) return;

    setTrackingLoading(true);
    setTrackingError(null);
    setTrackingResult(null);

    try {
      const res = await api.getPublicReportStatus(trackReportId.trim());
      setTrackingResult(res);
    } catch (err: any) {
      setTrackingError(err.message || 'Report not found in public registry.');
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleCopyId = () => {
    if (!submittedReceipt) return;
    navigator.clipboard.writeText(submittedReceipt.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-mono text-xs">
          <Globe className="h-3.5 w-3.5" />
          <span>Public Emergency Community Portal</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-100 font-sans">
          Missing Person Sighting Intake & Verification Status
        </h1>
        <p className="text-xs text-slate-400 max-w-xl mx-auto">
          Citizens, transit riders, hospital staff, and volunteers can submit leads directly to authorized investigation teams with zero public exposure of personal contacts.
        </p>
      </div>

      {/* Switcher Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono">
          <button
            onClick={() => setActiveMode('SUBMIT')}
            className={`px-5 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
              activeMode === 'SUBMIT'
                ? 'bg-cyan-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            1. Submit Sighting Tip
          </button>
          <button
            onClick={() => setActiveMode('TRACK')}
            className={`px-5 py-2 rounded-md font-semibold transition-colors cursor-pointer ${
              activeMode === 'TRACK'
                ? 'bg-cyan-600 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            2. Track Report Status
          </button>
        </div>
      </div>

      {/* Mode 1: Submit Sighting */}
      {activeMode === 'SUBMIT' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 text-xs">
          {submittedReceipt ? (
            <div className="p-6 rounded-lg bg-emerald-950/40 border border-emerald-500/50 space-y-4 text-center">
              <div className="flex justify-center">
                <CheckCircle className="h-12 w-12 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100">
                  Sighting Report Transmitted Successfully
                </h3>
                <p className="text-xs text-emerald-300">
                  Your lead has been ingested into the emergency investigation queue.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 max-w-md mx-auto space-y-2">
                <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                  Your Private Tracking ID
                </div>
                <div className="text-xl font-mono font-bold text-cyan-400 tracking-wider">
                  {submittedReceipt.id}
                </div>
                <button
                  onClick={handleCopyId}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 font-mono text-xs cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Tracking ID'}</span>
                </button>
              </div>

              <p className="text-slate-400 text-[11px] max-w-md mx-auto leading-relaxed">
                Save this tracking ID. You can enter it anytime under the "Track Report Status" tab to see when verification officers review and confirm your sighting.
              </p>

              <button
                onClick={() => setSubmittedReceipt(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs rounded cursor-pointer"
              >
                Submit Another Tip
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmitSighting} className="space-y-5">
              <div className="space-y-1 border-b border-slate-800 pb-3">
                <h3 className="font-mono text-xs uppercase font-bold text-slate-200 tracking-wider">
                  Missing Person Sighting Form
                </h3>
                <p className="text-slate-400 text-[11px]">
                  All witness reports are reviewed by verified officers before mapping.
                </p>
              </div>

              {/* Case Select */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Which Missing Person Case Does This Relate To? *
                </label>
                <select
                  value={selectedCaseId}
                  onChange={(e) => setSelectedCaseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                >
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} • {c.person.fullName} ({c.person.age}yo, missing from {c.person.lastKnownLocation})
                    </option>
                  ))}
                </select>
              </div>

              {/* Location & GPS */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-slate-300 font-medium mb-1">
                    Specific Location of Sighting *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Corner of 4th St & Mission, outside coffee shop"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Approximate Coordinates
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="any"
                      value={lat}
                      onChange={(e) => setLat(Number(e.target.value))}
                      className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-[11px]"
                    />
                    <input
                      type="number"
                      step="any"
                      value={lng}
                      onChange={(e) => setLng(Number(e.target.value))}
                      className="w-1/2 px-2 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-[11px]"
                    />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Date of Sighting *
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Approximate Time *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 14:15 or 2:15 PM"
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Detailed Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  What did you observe? (Clothing, direction traveled, companion, physical state) *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Describe clothing colors, demeanor, whether they seemed disoriented, any vehicle involved..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Optional Photo */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Optional Photo Reference URL
                </label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Contact Information & Privacy */}
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lock className="h-4 w-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">
                      Reporter Identity (Privacy Protected)
                    </span>
                  </div>
                  <label className="flex items-center gap-2 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-cyan-500 focus:ring-0"
                    />
                    <span>Submit Anonymously</span>
                  </label>
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                    <div>
                      <label className="block text-slate-400 mb-1">Your Name</label>
                      <input
                        type="text"
                        placeholder="Jordan Miller"
                        value={reporterName}
                        onChange={(e) => setReporterName(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">
                        Contact Phone or Email (Only visible to verified lead officer)
                      </label>
                      <input
                        type="text"
                        placeholder="jordan.miller@example.com"
                        value={reporterContact}
                        onChange={(e) => setReporterContact(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded-lg shadow-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4 stroke-[2.5]" />
                <span>{submitting ? 'Transmitting...' : 'Submit Emergency Sighting Report'}</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* Mode 2: Track Status */}
      {activeMode === 'TRACK' && (
        <div className="p-6 rounded-xl bg-slate-900 border border-slate-800 shadow-xl space-y-6 text-xs">
          <div className="space-y-1 border-b border-slate-800 pb-3">
            <h3 className="font-mono text-xs uppercase font-bold text-slate-200 tracking-wider">
              Track Lead Verification Progress
            </h3>
            <p className="text-slate-400 text-[11px]">
              Query the status of any submitted sighting without exposing restricted case data.
            </p>
          </div>

          <form onSubmit={handleTrackReport} className="flex gap-2">
            <input
              type="text"
              required
              placeholder="Enter Report ID (e.g. REP-2026-000101)"
              value={trackReportId}
              onChange={(e) => setTrackReportId(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none uppercase"
            />
            <button
              type="submit"
              disabled={trackingLoading}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded cursor-pointer disabled:opacity-50"
            >
              {trackingLoading ? 'Checking...' : 'Check Status'}
            </button>
          </form>

          {trackingError && (
            <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-400 flex-shrink-0" />
              <span>{trackingError}</span>
            </div>
          )}

          {trackingResult && (
            <div className="p-5 rounded-lg bg-slate-950 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="space-y-0.5">
                  <div className="font-mono text-xs font-bold text-cyan-400">
                    {trackingResult.reportId}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Target Case: {trackingResult.caseId}
                  </div>
                </div>
                <StatusBadge status={trackingResult.verificationStatus} />
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] font-mono text-slate-300">
                <div>
                  <span className="text-slate-500">Submitted: </span>
                  {trackingResult.submissionDate} at {trackingResult.submissionTime}
                </div>
                <div>
                  <span className="text-slate-500">General Area: </span>
                  {trackingResult.generalLocation}
                </div>
              </div>

              <div className="p-3 rounded bg-slate-900 border border-slate-800 text-slate-200 leading-relaxed text-xs">
                <strong>Current Verification State: </strong>
                {trackingResult.message}
              </div>

              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400">
                <Shield className="h-3 w-3" />
                <span>Audited through secure emergency protocol. No private victim data exposed.</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
