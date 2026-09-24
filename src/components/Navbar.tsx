import React, { useState } from 'react';
import {
  ShieldAlert,
  Bell,
  Search,
  UserCheck,
  ChevronDown,
  Plus,
  Radio,
  FileSearch,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types/index.ts';

interface NavbarProps {
  onOpenNewCase?: () => void;
  onOpenNotifications?: () => void;
  onOpenSearch?: () => void;
  unreadCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenNewCase,
  onOpenNotifications,
  onOpenSearch,
  unreadCount = 0,
}) => {
  const { user, role, demoSwitch } = useAuth();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const roles: Array<{ role: UserRole; label: string; desc: string }> = [
    { role: 'SUPER_ADMIN', label: 'Super Admin', desc: 'Commander Eleanor Vance • Emergency Command' },
    { role: 'CASE_OFFICER', label: 'Case Officer', desc: 'Det. Marcus Thorne • Lead Investigator' },
    { role: 'VERIFICATION_OFFICER', label: 'Verification Officer', desc: 'Inspector Sarah Chen • Intel Branch' },
    { role: 'HOSPITAL_SHELTER', label: 'Hospital / Shelter', desc: 'Dr. Arthur Morales • Metro Triage Hub' },
    { role: 'CITIZEN', label: 'Citizen / Volunteer', desc: 'Jordan Miller • Public Submissions' },
  ];

  const handleRoleSelect = (newRole: UserRole) => {
    demoSwitch(newRole);
    setRoleMenuOpen(false);
  };

  const canCreateCase = role === 'SUPER_ADMIN' || role === 'CASE_OFFICER' || role === 'HOSPITAL_SHELTER';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand & Incident Command Status */}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded border border-cyan-500/40 bg-cyan-950/60 text-cyan-400">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                Missing Person Case Organiser
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-emerald-400 border border-emerald-500/30 bg-emerald-950/40 px-1.5 py-0.5 rounded">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                OPS ROOM ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Privacy-Sensitive Emergency Response Platform • Multi-Agency RBAC
            </p>
          </div>
        </div>

        {/* Global Search & Action Center */}
        <div className="flex items-center gap-3">
          {/* Quick Search Button */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-400 bg-slate-900 border border-slate-800 rounded hover:border-slate-700 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Search cases, reports, IDs...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.2 bg-slate-800 text-[10px] font-mono text-slate-400 rounded border border-slate-700">
              ⌘K
            </kbd>
          </button>

          {/* New Case Button */}
          {canCreateCase && onOpenNewCase && (
            <button
              onClick={onOpenNewCase}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded transition-colors shadow-sm cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span className="hidden sm:inline">New Case Intake</span>
            </button>
          )}

          {/* Notifications Trigger */}
          <button
            onClick={onOpenNotifications}
            className="relative p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded transition-colors cursor-pointer"
            title="Operational Alerts"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-mono font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {/* Role Switcher Dropdown */}
          <div className="relative">
            <button
              onClick={() => setRoleMenuOpen(!roleMenuOpen)}
              className="flex items-center gap-2 pl-2 pr-3 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded transition-colors text-left cursor-pointer"
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.fullName}
                  className="h-7 w-7 rounded-full object-cover border border-slate-700"
                />
              ) : (
                <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 font-mono text-xs">
                  {user?.fullName.charAt(0) || 'U'}
                </div>
              )}
              <div className="hidden lg:block text-left">
                <div className="font-medium text-xs text-slate-200 leading-tight">
                  {user?.fullName}
                </div>
                <div className="font-mono text-[10px] text-cyan-400 leading-none">
                  {role?.replace('_', ' ')}
                </div>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
            </button>

            {roleMenuOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-2 z-50">
                <div className="px-3 py-1.5 border-b border-slate-800">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400">
                    Switch Active Demo Role (RBAC)
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Test full authorization controls across operational teams
                  </p>
                </div>
                <div className="py-1">
                  {roles.map((r) => {
                    const isCurrent = r.role === role;
                    return (
                      <button
                        key={r.role}
                        onClick={() => handleRoleSelect(r.role)}
                        className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2.5 hover:bg-slate-800/80 transition-colors cursor-pointer ${
                          isCurrent ? 'bg-cyan-950/40 border-l-2 border-cyan-400' : ''
                        }`}
                      >
                        <UserCheck
                          className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            isCurrent ? 'text-cyan-400' : 'text-slate-500'
                          }`}
                        />
                        <div>
                          <div
                            className={`font-semibold ${
                              isCurrent ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            {r.label}
                          </div>
                          <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                            {r.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {user?.agency && (
                  <div className="mt-1 pt-1.5 px-3 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                    Agency: {user.agency}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
