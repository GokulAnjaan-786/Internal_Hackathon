import React, { useState } from 'react';
import { X, UserPlus, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.ts';
import { Case } from '../types/index.ts';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCaseCreated: (newCase: Case) => void;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onCaseCreated,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Non-Binary' | 'Unknown'>('Unknown');
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop&q=80'
  );
  const [height, setHeight] = useState('5\'7" (170 cm)');
  const [physicalDescription, setPhysicalDescription] = useState('');
  const [identifyingMarks, setIdentifyingMarks] = useState('');
  const [clothingDescription, setClothingDescription] = useState('');
  const [languages, setLanguages] = useState('English');
  const [medicalConditions, setMedicalConditions] = useState('');
  const [lastKnownLocation, setLastKnownLocation] = useState('');
  const [lat, setLat] = useState<number>(37.7749);
  const [lng, setLng] = useState<number>(-122.4194);
  const [lastKnownActivity, setLastKnownActivity] = useState('');
  const [circumstances, setCircumstances] = useState('');
  const [reportingPersonName, setReportingPersonName] = useState('');
  const [reportingPersonContact, setReportingPersonContact] = useState('');
  const [reportingPersonRelationship, setReportingPersonRelationship] = useState('Family');
  const [dateMissing, setDateMissing] = useState(new Date().toISOString().split('T')[0]);
  const [timeMissing, setTimeMissing] = useState('09:00 AM');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Urgent'>('High');
  const [internalNotes, setInternalNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Missing person full name is required.');
      return;
    }

    if (age === '' || Number(age) < 0 || Number(age) > 120) {
      setError('Please provide a valid age between 0 and 120.');
      return;
    }

    if (!lastKnownLocation.trim()) {
      setError('Last known location is required.');
      return;
    }

    setLoading(true);
    try {
      const created = await api.createCase({
        fullName: fullName.trim(),
        age: Number(age),
        gender,
        photoUrl,
        height,
        physicalDescription,
        identifyingMarks,
        clothingDescription,
        languages: languages.split(',').map((s) => s.trim()).filter(Boolean),
        medicalConditions,
        lastKnownLocation: lastKnownLocation.trim(),
        lastKnownCoordinates: { lat: Number(lat), lng: Number(lng) },
        lastKnownActivity,
        circumstances,
        reportingPersonName,
        reportingPersonContact,
        reportingPersonRelationship,
        dateMissing,
        timeMissing,
        priority,
        internalNotes,
      });

      onCaseCreated(created);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to initialize emergency case record.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl my-8 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <UserPlus className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                Emergency Case Intake Form
              </h3>
              <p className="text-xs text-slate-400">
                Official intake protocol • Generates unique ID (MP-2026-XXXXXX)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto text-xs">
          {/* Section 1: Subject Profile */}
          <div className="space-y-4">
            <h4 className="font-mono uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 tracking-wider text-[11px]">
              1. Missing Person Demographics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">
                  Full Legal Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Age *</label>
                <input
                  type="number"
                  required
                  min={0}
                  max={120}
                  placeholder="17"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Height</label>
                <input
                  type="text"
                  placeholder={'5\'4" (163 cm)'}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono font-semibold focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Urgent">Urgent (Amber / Vulnerable)</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Reference Photo URL
              </label>
              <input
                type="url"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none font-mono text-[11px]"
              />
            </div>
          </div>

          {/* Section 2: Physical & Clothing Characteristics */}
          <div className="space-y-4">
            <h4 className="font-mono uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 tracking-wider text-[11px]">
              2. Physical & Clothing Characteristics
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Physical Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Hair color/length, eye color, build, glasses, facial hair..."
                  value={physicalDescription}
                  onChange={(e) => setPhysicalDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Identifying Marks (Scars, Tattoos, Piercings)
                </label>
                <textarea
                  rows={2}
                  placeholder="Small birthmark on left wrist, tattoo on forearm..."
                  value={identifyingMarks}
                  onChange={(e) => setIdentifyingMarks(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Clothing Description (Crucial for Sighting Matching) *
                </label>
                <textarea
                  rows={2}
                  placeholder="Navy blue hoodie, black jeans, yellow backpack, white sneakers..."
                  value={clothingDescription}
                  onChange={(e) => setClothingDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Medical Conditions / Vital Needs
                </label>
                <textarea
                  rows={2}
                  placeholder="Asthma inhaler, insulin dependent, dementia/Alzheimer's..."
                  value={medicalConditions}
                  onChange={(e) => setMedicalConditions(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Disappearance Circumstances */}
          <div className="space-y-4">
            <h4 className="font-mono uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 tracking-wider text-[11px]">
              3. Circumstances & Location
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-slate-300 font-medium mb-1">
                  Last Known Location *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. North River High School, Gate 3"
                  value={lastKnownLocation}
                  onChange={(e) => setLastKnownLocation(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Coordinates (Lat, Lng)
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Date Missing *</label>
                <input
                  type="date"
                  required
                  value={dateMissing}
                  onChange={(e) => setDateMissing(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Time Missing</label>
                <input
                  type="text"
                  placeholder="08:30 AM"
                  value={timeMissing}
                  onChange={(e) => setTimeMissing(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Circumstances</label>
              <textarea
                rows={2}
                placeholder="Separated during flood evacuation, vehicle breakdown, wandered off..."
                value={circumstances}
                onChange={(e) => setCircumstances(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Reporting Contact & Internal Notes */}
          <div className="space-y-4">
            <h4 className="font-mono uppercase font-bold text-slate-400 border-b border-slate-800 pb-1 tracking-wider text-[11px]">
              4. Reporting Person & Confidential Notes
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reporting Contact Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Grace Lin"
                  value={reportingPersonName}
                  onChange={(e) => setReportingPersonName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Contact Phone / Email
                </label>
                <input
                  type="text"
                  placeholder="+1-555-019-2831"
                  value={reportingPersonContact}
                  onChange={(e) => setReportingPersonContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Relationship</label>
                <input
                  type="text"
                  placeholder="Mother, Spouse, Nurse..."
                  value={reportingPersonRelationship}
                  onChange={(e) => setReportingPersonRelationship(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-amber-300 font-medium mb-1 flex items-center gap-1.5">
                <span>Internal Investigation Notes</span>
                <span className="text-[10px] text-amber-400/80 font-mono">(Restricted from Citizen View)</span>
              </label>
              <textarea
                rows={2}
                placeholder="Confidential leads, phone pings, dental records, security camera findings..."
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-amber-900/60 rounded text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 text-xs font-semibold rounded cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider rounded transition-colors shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Initializing Case...' : 'Activate Emergency Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
