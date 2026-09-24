import React from 'react';
import { X, CheckCheck, Bell, AlertTriangle, ShieldCheck, ListTodo } from 'lucide-react';
import { NotificationItem } from '../types/index.ts';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onSelectCase?: (caseId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onSelectCase,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-slate-950 border-l border-slate-800 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-cyan-400" />
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-100">
                Operational Alerts & Notifications
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onMarkAllRead}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1 cursor-pointer"
                title="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark read</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-mono text-xs">
                No active notifications in your dispatch queue.
              </div>
            ) : (
              notifications.map((n) => {
                let icon = <Bell className="h-4 w-4 text-cyan-400" />;
                if (n.type === 'ALERT') {
                  icon = <AlertTriangle className="h-4 w-4 text-rose-400" />;
                } else if (n.type === 'VERIFICATION') {
                  icon = <ShieldCheck className="h-4 w-4 text-amber-400" />;
                } else if (n.type === 'TASK') {
                  icon = <ListTodo className="h-4 w-4 text-sky-400" />;
                }

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      if (!n.read) onMarkRead(n.id);
                      if (n.caseId && onSelectCase) {
                        onSelectCase(n.caseId);
                        onClose();
                      }
                    }}
                    className={`p-3 rounded-lg border transition-all cursor-pointer ${
                      n.read
                        ? 'bg-slate-900/30 border-slate-900 text-slate-400'
                        : 'bg-slate-900/80 border-slate-800 text-slate-200 shadow-md hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold text-xs text-slate-100 truncate">
                            {n.title}
                          </h4>
                          <span className="text-[10px] font-mono text-slate-500 whitespace-nowrap">
                            {new Date(n.createdAt).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{n.message}</p>
                        {n.caseId && (
                          <div className="mt-2 flex items-center gap-2">
                            <span className="font-mono text-[10px] text-cyan-400 px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                              {n.caseId}
                            </span>
                            {n.reportId && (
                              <span className="font-mono text-[10px] text-amber-400 px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800">
                                {n.reportId}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
