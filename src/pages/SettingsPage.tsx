import React from 'react';
import { Settings, Shield, Lock, Server, Check, X, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

export const SettingsPage: React.FC = () => {
  const { user, role, demoSwitch } = useAuth();

  const matrix = [
    {
      action: 'Create Emergency Cases',
      superAdmin: true,
      officer: true,
      verifier: false,
      hospital: true,
      citizen: false,
    },
    {
      action: 'Edit Case Metadata & Status',
      superAdmin: true,
      officer: true,
      verifier: false,
      hospital: false,
      citizen: false,
    },
    {
      action: 'Verify Sighting Reports',
      superAdmin: true,
      officer: true,
      verifier: true,
      hospital: false,
      citizen: false,
    },
    {
      action: 'Dispatch Investigation Tasks',
      superAdmin: true,
      officer: true,
      verifier: false,
      hospital: false,
      citizen: false,
    },
    {
      action: 'Run AI Description Correlation',
      superAdmin: true,
      officer: true,
      verifier: true,
      hospital: false,
      citizen: false,
    },
    {
      action: 'Access Uncensored Audit Logs',
      superAdmin: true,
      officer: true,
      verifier: false,
      hospital: false,
      citizen: false,
    },
    {
      action: 'Submit Public Sighting Tips',
      superAdmin: true,
      officer: true,
      verifier: true,
      hospital: true,
      citizen: true,
    },
    {
      action: 'Track Public Verification Receipts',
      superAdmin: true,
      officer: true,
      verifier: true,
      hospital: true,
      citizen: true,
    },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs font-bold uppercase tracking-wider">
          <Settings className="h-4 w-4" />
          System Architecture & Security Policy
        </div>
        <h1 className="text-xl font-bold text-slate-100 font-sans mt-0.5">
          Role-Based Access Control (RBAC) & Governance Matrix
        </h1>
        <p className="text-slate-400">
          Enforces the Principle of Least Privilege (PoLP) and strict data minimization across all API boundaries.
        </p>
      </div>

      {/* Current Active Session Card */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-cyan-950 border border-cyan-500/40 flex items-center justify-center font-mono font-bold text-cyan-400">
              {user?.fullName.charAt(0) || 'U'}
            </div>
            <div>
              <div className="font-bold text-slate-100 text-sm">{user?.fullName}</div>
              <div className="text-slate-400 font-mono text-[11px]">
                Agency: {user?.agency || 'Emergency Response Authority'} • Badge #{user?.badgeNumber || 'N/A'}
              </div>
            </div>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 font-bold uppercase">
            Active Role: {role?.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* RBAC Matrix Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
          <Shield className="h-4 w-4 text-cyan-400" />
          <h2 className="font-mono text-xs font-bold uppercase tracking-wider text-slate-200">
            Authorization & Permissions Matrix
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono">
            <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 text-[11px] uppercase">
              <tr>
                <th className="py-3 px-4">Operational Capability</th>
                <th className="py-3 px-3 text-center">Super Admin</th>
                <th className="py-3 px-3 text-center">Case Officer</th>
                <th className="py-3 px-3 text-center">Verification Officer</th>
                <th className="py-3 px-3 text-center">Hospital / Shelter</th>
                <th className="py-3 px-3 text-center">Citizen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-slate-300">
              {matrix.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-800/30">
                  <td className="py-3 px-4 font-sans font-medium text-slate-200">
                    {row.action}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.superAdmin ? (
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.officer ? (
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.verifier ? (
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.hospital ? (
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                  <td className="py-3 px-3 text-center">
                    {row.citizen ? (
                      <Check className="h-4 w-4 text-emerald-400 mx-auto" />
                    ) : (
                      <X className="h-4 w-4 text-slate-600 mx-auto" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Privacy-First Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs uppercase">
            <Lock className="h-4 w-4" />
            <span>Data Minimization</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Public endpoints automatically strip internal investigative notes, confidential informant contacts, and officer identities before transmission.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-xs uppercase">
            <Server className="h-4 w-4" />
            <span>Server-Authoritative AI</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Gemini models operate strictly on the backend proxy. All AI suggestions carry prominent mandatory disclaimers and require human officer confirmation.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-xs uppercase">
            <Shield className="h-4 w-4" />
            <span>Tamper-Evident Auditing</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Every case status update, report verification decision, and AI query generates an immutable audit record with timestamp, actor, and result.
          </p>
        </div>
      </div>
    </div>
  );
};
