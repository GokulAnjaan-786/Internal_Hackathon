import React, { useEffect, useState } from 'react';
import { X, Shield, Eye, Lock, Clock, User } from 'lucide-react';
import { api } from '../services/api.ts';
import { FileAttachment, EvidenceAuditEntry } from '../types/index.ts';

interface EvidenceAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  file: FileAttachment | null;
  caseId: string;
}

export const EvidenceAuditModal: React.FC<EvidenceAuditModalProps> = ({
  isOpen,
  onClose,
  file,
  caseId,
}) => {
  const [auditLogs, setAuditLogs] = useState<EvidenceAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && file) {
      setLoading(true);

      // Log access audit
      api.logEvidenceAudit(caseId, file.id, 'VIEWED', 'Inspected file in evidence vault').catch(() => {});

      // Fetch full history
      api
        .getEvidenceAuditHistory(caseId, file.id)
        .then((res) => setAuditLogs(res.auditHistory))
        .catch(() => {})
        .finally(() => setLoading(false));
    }
  }, [isOpen, file, caseId]);

  if (!isOpen || !file) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Tamper-Evident Evidence Vault Audit History</h2>
              <p className="text-[11px] text-slate-400 font-mono">File: {file.filename}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 rounded cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* File Preview */}
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex items-center gap-3">
            {file.mimeType.startsWith('image/') ? (
              <img src={file.url} alt={file.filename} className="h-16 w-16 object-cover rounded border border-slate-800 shrink-0" />
            ) : (
              <div className="h-16 w-16 bg-slate-900 border border-slate-800 rounded flex items-center justify-center text-purple-400 font-mono text-xs shrink-0">
                PDF
              </div>
            )}
            <div className="space-y-0.5 text-xs">
              <div className="font-semibold text-slate-100">{file.originalName}</div>
              <div className="text-[11px] font-mono text-slate-400">ID: {file.id} | Size: {Math.round(file.sizeBytes / 1024)} KB</div>
              <div className="text-[11px] font-mono text-slate-400">Uploaded by: {file.uploadedBy} on {new Date(file.uploadedAt).toLocaleString()}</div>
            </div>
          </div>

          {/* Audit History Timeline */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-300 font-mono uppercase tracking-wider">
              Access & Modification Audit Trail ({auditLogs.length})
            </div>

            {loading ? (
              <div className="py-6 text-center text-slate-500 text-xs font-mono">Retrieving evidence chain history...</div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {auditLogs.map((log, idx) => (
                  <div key={idx} className="p-2.5 bg-slate-950/80 border border-slate-800 rounded text-xs space-y-1">
                    <div className="flex items-center justify-between font-mono text-[10px]">
                      <span className="font-bold text-purple-400 uppercase">{log.action}</span>
                      <span className="text-slate-500">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-300">
                      <User className="h-3 w-3 text-cyan-400" />
                      <span>{log.performedBy} ({log.role})</span>
                    </div>
                    {log.notes && <p className="text-[11px] text-slate-400 italic">{log.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t border-slate-800 bg-slate-950/60 text-right">
          <button onClick={onClose} className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium cursor-pointer">
            Close Vault Viewer
          </button>
        </div>
      </div>
    </div>
  );
};
