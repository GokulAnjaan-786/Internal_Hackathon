import React from 'react';
import { PriorityLevel } from '../types/index.ts';

interface PriorityBadgeProps {
  priority: PriorityLevel | string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  let indicator = 'bg-slate-500';
  let textColor = 'text-slate-300';

  switch (priority) {
    case 'Urgent':
      indicator = 'bg-rose-500 animate-ping';
      textColor = 'text-rose-400 font-bold';
      break;
    case 'High':
      indicator = 'bg-amber-400';
      textColor = 'text-amber-400 font-semibold';
      break;
    case 'Medium':
      indicator = 'bg-sky-400';
      textColor = 'text-sky-300';
      break;
    case 'Low':
    default:
      indicator = 'bg-slate-400';
      textColor = 'text-slate-400';
      break;
  }

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider">
      <span className="relative flex h-2 w-2">
        {priority === 'Urgent' && (
          <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${indicator}`} />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            priority === 'Urgent' ? 'bg-rose-500' : indicator
          }`}
        />
      </span>
      <span className={textColor}>{priority}</span>
    </span>
  );
};
