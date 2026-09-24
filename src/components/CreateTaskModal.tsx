import React, { useState } from 'react';
import { X, CheckSquare, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.ts';
import { InvestigationTask, PriorityLevel } from '../types/index.ts';

interface CreateTaskModalProps {
  caseId: string;
  caseTitle?: string;
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: (newTask: InvestigationTask) => void;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  caseId,
  caseTitle,
  isOpen,
  onClose,
  onTaskCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('High');
  const [assignedOfficerName, setAssignedOfficerName] = useState('Det. Marcus Thorne');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 24 * 3600 * 1000).toISOString().split('T')[0]
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const task = await api.createTask({
        caseId,
        title: title.trim(),
        description: description.trim(),
        assignedOfficerId: 'USR-002',
        assignedOfficerName,
        priority,
        dueDate: new Date(dueDate).toISOString(),
      });

      onTaskCreated(task);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch investigation task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <CheckSquare className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                Dispatch Investigation Task
              </h3>
              <p className="text-xs text-slate-400">Case: {caseId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 rounded bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Task Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Subpoena Subway Station CCTV Platform 3"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">
              Instructions & Objective *
            </label>
            <textarea
              rows={3}
              required
              placeholder="Specific guidelines for the field team or investigator..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PriorityLevel)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono font-semibold focus:border-cyan-500 focus:outline-none"
              >
                <option value="Urgent">Urgent</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Assign Lead Officer</label>
            <select
              value={assignedOfficerName}
              onChange={(e) => setAssignedOfficerName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              <option value="Det. Marcus Thorne">Det. Marcus Thorne (Lead Investigator)</option>
              <option value="Inspector Sarah Chen">Inspector Sarah Chen (Verification Desk)</option>
              <option value="Director Eleanor Vance">Director Eleanor Vance (Command)</option>
              <option value="Dr. Arthur Morales">Dr. Arthur Morales (Triage Liaison)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-200 font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded cursor-pointer disabled:opacity-50"
            >
              {loading ? 'Dispatching...' : 'Dispatch Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
