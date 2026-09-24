import React from 'react';
import {
  LayoutDashboard,
  FolderOpen,
  CheckCircle2,
  MapPin,
  ListTodo,
  Shield,
  FileCheck,
  Globe,
  Settings,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingVerifications?: number;
  openTasksCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  pendingVerifications = 0,
  openTasksCount = 0,
}) => {
  const { role } = useAuth();

  const isCitizen = role === 'CITIZEN';
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isOfficerOrVerifier = role === 'CASE_OFFICER' || role === 'VERIFICATION_OFFICER' || isSuperAdmin;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Control Room',
      icon: LayoutDashboard,
      visible: true,
    },
    {
      id: 'cases',
      label: 'Missing Person Cases',
      icon: FolderOpen,
      visible: true,
    },
    {
      id: 'verification',
      label: 'Verification Queue',
      icon: CheckCircle2,
      badge: pendingVerifications > 0 ? pendingVerifications : undefined,
      badgeColor: 'text-amber-400 bg-amber-950/60 border border-amber-500/40',
      visible: isOfficerOrVerifier || role === 'HOSPITAL_SHELTER',
    },
    {
      id: 'map',
      label: 'Incident Map',
      icon: MapPin,
      visible: true,
    },
    {
      id: 'tasks',
      label: 'Investigation Tasks',
      icon: ListTodo,
      badge: openTasksCount > 0 ? openTasksCount : undefined,
      badgeColor: 'text-cyan-400 bg-cyan-950/60 border border-cyan-500/40',
      visible: isOfficerOrVerifier,
    },
    {
      id: 'citizen-portal',
      label: 'Citizen Portal & Tracker',
      icon: Globe,
      visible: true,
    },
    {
      id: 'audit-logs',
      label: 'Tamper-Evident Audit',
      icon: Shield,
      visible: isSuperAdmin || role === 'CASE_OFFICER',
    },
    {
      id: 'settings',
      label: 'System & RBAC Rules',
      icon: Settings,
      visible: true,
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-3">
        <div className="font-mono text-[10px] uppercase font-bold tracking-wider text-slate-500 px-3 py-2">
          Operations Command
        </div>
        <nav className="space-y-1">
          {navItems
            .filter((item) => item.visible)
            .map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-cyan-300 border-l-2 border-cyan-400'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`h-4 w-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold tabular-nums ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </nav>
      </div>

      {/* Privacy-First Security Banner */}
      <div className="mt-auto p-4 border-t border-slate-900">
        <div className="rounded border border-slate-800 bg-slate-900/60 p-3">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-slate-300 mb-1">
            <Lock className="h-3.5 w-3.5 text-emerald-400" />
            <span>Privacy Guardrail Active</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Data minimization enforced. Public requests restrict confidential investigative logs and officer identities.
          </p>
        </div>
      </div>
    </aside>
  );
};
