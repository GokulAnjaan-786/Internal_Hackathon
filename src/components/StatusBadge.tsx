import React from 'react';
import { CaseStatus, ReportStatus, TaskStatus } from '../types/index.ts';

interface StatusBadgeProps {
  status: CaseStatus | ReportStatus | TaskStatus | string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  // Anti-pill discipline: unboxed text with colored indicator dot and subtle underline/border
  let dotColor = 'bg-slate-400';
  let textColor = 'text-slate-300';
  let borderColor = 'border-slate-700/60';

  switch (status) {
    case 'Active':
    case 'In Progress':
      dotColor = 'bg-cyan-400 animate-pulse';
      textColor = 'text-cyan-300';
      borderColor = 'border-cyan-500/30';
      break;
    case 'Under Investigation':
    case 'Under Review':
      dotColor = 'bg-amber-400';
      textColor = 'text-amber-300';
      borderColor = 'border-amber-500/30';
      break;
    case 'Verified':
    case 'Person Located':
    case 'Resolved':
    case 'Completed':
      dotColor = 'bg-emerald-400';
      textColor = 'text-emerald-300';
      borderColor = 'border-emerald-500/30';
      break;
    case 'Rejected':
    case 'Cancelled':
      dotColor = 'bg-rose-400';
      textColor = 'text-rose-300';
      borderColor = 'border-rose-500/30';
      break;
    case 'Duplicate':
    case 'Needs More Information':
      dotColor = 'bg-purple-400';
      textColor = 'text-purple-300';
      borderColor = 'border-purple-500/30';
      break;
    case 'Draft':
    case 'Pending':
    case 'New':
    default:
      dotColor = 'bg-slate-400';
      textColor = 'text-slate-400';
      borderColor = 'border-slate-700/40';
      break;
  }

  const textSize = size === 'sm' ? 'text-xs' : 'text-xs tracking-wider';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 font-mono uppercase font-semibold ${textSize} ${textColor} border-b ${borderColor} bg-slate-900/60`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
      <span>{status}</span>
    </span>
  );
};
