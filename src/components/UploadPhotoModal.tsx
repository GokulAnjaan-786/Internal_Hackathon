import React, { useState } from 'react';
import { X, Upload, Image, AlertTriangle } from 'lucide-react';
import { api } from '../services/api.ts';
import { FileAttachment } from '../types/index.ts';

interface UploadPhotoModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onPhotoUploaded: (file: FileAttachment) => void;
}

export const UploadPhotoModal: React.FC<UploadPhotoModalProps> = ({
  caseId,
  isOpen,
  onClose,
  onPhotoUploaded,
}) => {
  const [photoUrl, setPhotoUrl] = useState(
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop&q=80'
  );
  const [filename, setFilename] = useState('cctv_frame_capture.jpg');
  const [originalName, setOriginalName] = useState('Transit_CCTV_Gate_B.jpg');
  const [mimeType, setMimeType] = useState('image/jpeg');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoUrl.trim()) {
      setError('Media URL or data is required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const file = await api.uploadCasePhoto(caseId, {
        filename,
        originalName,
        mimeType,
        sizeBytes: 940000,
        url: photoUrl.trim(),
      });
      onPhotoUploaded(file);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register evidence file.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-950">
          <div className="flex items-center gap-2.5">
            <Upload className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="font-mono text-sm font-bold tracking-wider text-slate-100 uppercase">
                Secure Evidence Ingestion
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
            <label className="block text-slate-300 font-medium mb-1">
              Evidence Media URL *
            </label>
            <input
              type="url"
              required
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Evidence Label / Title</label>
            <input
              type="text"
              required
              value={originalName}
              onChange={(e) => setOriginalName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-medium mb-1">MIME Type</label>
              <select
                value={mimeType}
                onChange={(e) => setMimeType(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              >
                <option value="image/jpeg">image/jpeg</option>
                <option value="image/png">image/png</option>
                <option value="image/webp">image/webp</option>
                <option value="application/pdf">application/pdf</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-300 font-medium mb-1">Target Storage</label>
              <input
                type="text"
                disabled
                value="Encrypted Vault"
                className="w-full px-3 py-2 bg-slate-950/50 border border-slate-800 rounded text-slate-500 font-mono"
              />
            </div>
          </div>

          {/* Preview */}
          {photoUrl && mimeType.startsWith('image/') && (
            <div className="pt-2">
              <div className="text-slate-400 mb-1">Preview:</div>
              <div className="h-32 w-full rounded border border-slate-800 overflow-hidden bg-slate-950 flex items-center justify-center">
                <img
                  src={photoUrl}
                  alt="Preview"
                  className="max-h-full max-w-full object-contain"
                  onError={() => setError('Unable to render image from provided URL.')}
                />
              </div>
            </div>
          )}

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
              {loading ? 'Registering...' : 'Locker Ingest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
