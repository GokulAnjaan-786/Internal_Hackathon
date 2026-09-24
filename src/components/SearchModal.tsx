import React, { useState, useEffect } from 'react';
import { Search, X, FolderOpen, FileText, ArrowRight } from 'lucide-react';
import { api } from '../services/api.ts';
import { Case } from '../types/index.ts';
import { StatusBadge } from './StatusBadge.tsx';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCase: (caseId: string) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectCase,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Case[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      api.getCases().then((r) => setResults(r.cases.slice(0, 5)));
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.getCases({ search: query.trim() });
        setResults(res.cases);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden text-xs">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center gap-3 bg-slate-950">
          <Search className="h-4 w-4 text-cyan-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            placeholder="Type case ID, subject name, clothing, or location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 focus:outline-none text-sm"
          />
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Results Body */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-2">
          {loading ? (
            <div className="p-6 text-center text-slate-500 font-mono">
              Searching emergency records...
            </div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-slate-500 font-mono">
              No matching records found.
            </div>
          ) : (
            results.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  onSelectCase(c.id);
                  onClose();
                }}
                className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-950 transition-colors cursor-pointer flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={c.person.photoUrl}
                    alt={c.person.fullName}
                    className="h-10 w-10 rounded object-cover border border-slate-800 flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-cyan-400 font-bold">{c.id}</span>
                      <span className="font-semibold text-slate-200 truncate">
                        {c.person.fullName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {c.person.age}yo • {c.person.lastKnownLocation}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <StatusBadge status={c.status} size="sm" />
                  <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-2.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between font-mono text-[10px] text-slate-500">
          <span>Search spans cases, reports, and GPS coordinates</span>
          <span>Press ESC to exit</span>
        </div>
      </div>
    </div>
  );
};
