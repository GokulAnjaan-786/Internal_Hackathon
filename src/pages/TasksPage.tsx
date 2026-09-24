import React, { useState, useEffect } from 'react';
import { ListTodo, CheckCircle2, Clock, Plus, Filter, User, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';
import { InvestigationTask, TaskStatus, Case } from '../types/index.ts';
import { StatusBadge } from '../components/StatusBadge.tsx';
import { PriorityBadge } from '../components/PriorityBadge.tsx';
import { CreateTaskModal } from '../components/CreateTaskModal.tsx';
import { useAuth } from '../context/AuthContext.tsx';

interface TasksPageProps {
  onSelectCase: (caseId: string) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({ onSelectCase }) => {
  const { role } = useAuth();
  const [tasks, setTasks] = useState<InvestigationTask[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Complete Task Modal
  const [completingTask, setCompletingTask] = useState<InvestigationTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // New Task Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [targetCaseId, setTargetCaseId] = useState('MP-2026-000412');

  const loadData = async () => {
    setLoading(true);
    try {
      const [tRes, cRes] = await Promise.all([
        api.getTasks({
          status: statusFilter !== 'All' ? statusFilter : undefined,
          priority: priorityFilter !== 'All' ? priorityFilter : undefined,
        }),
        api.getCases(),
      ]);
      setTasks(tRes.tasks);
      setCases(cRes.cases);
      if (cRes.cases.length > 0) setTargetCaseId(cRes.cases[0].id);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, priorityFilter]);

  const handleCompleteTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingTask) return;
    setSubmitting(true);
    try {
      const updated = await api.updateTask(
        completingTask.id,
        'Completed',
        completionNotes.trim() || 'Task objectives fulfilled.'
      );
      setTasks(tasks.map((t) => (t.id === updated.id ? updated : t)));
      setCompletingTask(null);
      setCompletionNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to update task.');
    } finally {
      setSubmitting(false);
    }
  };

  const isOfficerOrAdmin = role === 'SUPER_ADMIN' || role === 'CASE_OFFICER';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
            <ListTodo className="h-4 w-4" />
            Field Ops Coordination
          </div>
          <h1 className="text-xl font-bold text-slate-100 font-sans mt-0.5">
            Active Investigation Tasks Board
          </h1>
          <p className="text-xs text-slate-400">
            Dispatch search teams, subpoena CCTV footage, and coordinate field interview milestones
          </p>
        </div>

        {isOfficerOrAdmin && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-mono text-xs font-bold uppercase rounded shadow transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Dispatch New Task</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          {['All', 'Pending', 'In Progress', 'Completed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded transition-colors cursor-pointer ${
                statusFilter === s
                  ? 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-slate-500">Priority:</span>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded text-slate-300 focus:outline-none"
          >
            <option value="All">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500 font-mono text-xs">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span>Loading investigation board...</span>
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center text-slate-500 font-mono text-xs bg-slate-900/40 rounded-xl border border-slate-800">
          No tasks match filter criteria.
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-cyan-400">{task.id}</span>
                  <button
                    onClick={() => onSelectCase(task.caseId)}
                    className="font-mono text-xs text-slate-400 hover:text-cyan-300 hover:underline cursor-pointer"
                  >
                    Case {task.caseId} ({task.caseTitle})
                  </button>
                  <PriorityBadge priority={task.priority} />
                </div>

                <div className="flex items-center gap-2">
                  <StatusBadge status={task.status} size="sm" />
                  {task.status !== 'Completed' && (
                    <button
                      onClick={() => setCompletingTask(task)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-xs font-bold rounded cursor-pointer"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-sm text-slate-100 mb-1">{task.title}</h3>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950 p-3 rounded-lg border border-slate-800/80">
                  {task.description}
                </p>
              </div>

              {task.notes && (
                <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-emerald-400">Findings: </strong>
                  <span>{task.notes}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-500 pt-1">
                <span>Assigned: {task.assignedOfficerName}</span>
                <span>Due Date: {new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Complete Task Modal */}
      {completingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4 shadow-2xl text-xs">
            <h3 className="font-mono text-sm font-bold uppercase text-slate-100">
              Record Task Completion Findings
            </h3>
            <p className="text-slate-400">{completingTask.title}</p>
            <form onSubmit={handleCompleteTask} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Findings & Investigation Results *
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Summarize evidence gathered, witness statements recorded, or camera review outcome..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold uppercase rounded cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Recording...' : 'Complete Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <CreateTaskModal
          caseId={targetCaseId}
          isOpen={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onTaskCreated={(t) => {
            setTasks([t, ...tasks]);
            setCreateModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
