import React, { useState, useEffect } from 'react';
import {
  Eye,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  X,
  File,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Copy,
  Check,
  ShieldCheck
} from 'lucide-react';
import { EvidenceFile } from '../../types';

interface EvidenceViewerProps {
  evidence?: EvidenceFile[];
  title?: string;
  accentColor?: 'blue' | 'emerald' | 'amber' | 'purple';
  emptyMessage?: string;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({
  evidence = [],
  title = 'Attached Evidence',
  accentColor = 'blue',
  emptyMessage = 'No evidence files attached to this case.'
}) => {
  const [activePreview, setActivePreview] = useState<EvidenceFile | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [copiedFilename, setCopiedFilename] = useState(false);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePreview(null);
        setZoomLevel(1);
      }
    };
    if (activePreview) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePreview]);

  const handleCopyName = (name: string) => {
    navigator.clipboard?.writeText(name);
    setCopiedFilename(true);
    setTimeout(() => setCopiedFilename(false), 2000);
  };

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.25, 0.75));
  const handleResetZoom = () => setZoomLevel(1);

  if (!evidence || evidence.length === 0) {
    return (
      <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800 text-xs text-slate-500 italic">
        {emptyMessage}
      </div>
    );
  }

  const getEffectiveUrl = (item: EvidenceFile): string => {
    return item.fileUrl || (item as any).url || '';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'image':
        return <ImageIcon className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'audio':
        return <Music className="w-4 h-4" />;
      case 'document':
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const colorStyles = {
    blue: {
      badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
      border: 'hover:border-blue-500/50',
      btn: 'bg-blue-600 hover:bg-blue-500 text-white'
    },
    emerald: {
      badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
      border: 'hover:border-emerald-500/50',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold'
    },
    amber: {
      badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
      border: 'hover:border-amber-500/50',
      btn: 'bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold'
    },
    purple: {
      badge: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
      border: 'hover:border-purple-500/50',
      btn: 'bg-purple-600 hover:bg-purple-500 text-white'
    }
  }[accentColor];

  const handleDownload = (item: EvidenceFile) => {
    const url = getEffectiveUrl(item);
    if (!url) return;
    const link = document.createElement('a');
    link.href = url;
    link.download = item.fileName || 'evidence-file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-2.5">
      {title && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
            <span>{title}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
              {evidence.length}
            </span>
          </span>
          <span className="text-[11px] text-slate-500">Click any item to inspect & zoom</span>
        </div>
      )}

      {/* Grid of Evidence Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {evidence.map((item, idx) => {
          const url = getEffectiveUrl(item);
          const isImage = item.fileType === 'image' || (url && (url.startsWith('data:image') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)));
          const fileExt = (item.fileName.split('.').pop() || item.fileType || 'FILE').toUpperCase().slice(0, 4);

          return (
            <div
              key={item.id || idx}
              onClick={() => {
                setActivePreview(item);
                setZoomLevel(1);
              }}
              className={`p-2.5 rounded-2xl bg-slate-900/90 border border-slate-800 ${colorStyles.border} transition-all cursor-pointer group shadow-sm flex items-center gap-3 relative overflow-hidden`}
            >
              {/* Visual Thumbnail */}
              {isImage && url ? (
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0 relative">
                  <img
                    src={url}
                    alt={item.fileName}
                    className="w-full h-full object-cover group-hover:scale-110 transition duration-300"
                  />
                  <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                    <ZoomIn className="w-4 h-4 text-white drop-shadow" />
                  </div>
                </div>
              ) : (
                <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 group-hover:text-white flex-shrink-0 transition">
                  {getFileIcon(item.fileType)}
                </div>
              )}

              {/* File Details */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {fileExt}
                  </span>
                  <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-white transition" title={item.fileName}>
                    {item.fileName}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] font-mono text-slate-400">
                    {item.fileSize || 'Standard'}
                  </span>
                  <span className="text-slate-600">•</span>
                  <span className="text-[10px] text-emerald-400/90 flex items-center gap-0.5 font-medium">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Verified</span>
                  </span>
                </div>
              </div>

              {/* Action Pill */}
              <div className="text-[11px] text-slate-500 group-hover:text-slate-300 flex items-center gap-1 flex-shrink-0 pr-1">
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">View</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* FULL LIGHTBOX MODAL */}
      {activePreview && (
        <div
          onClick={() => {
            setActivePreview(null);
            setZoomLevel(1);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl relative overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/60">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0">
                  {getFileIcon(activePreview.fileType)}
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-white truncate font-display" title={activePreview.fileName}>
                    {activePreview.fileName}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-mono">{activePreview.fileSize || 'Case Attachment'}</span>
                    <span>•</span>
                    <span className="uppercase font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {activePreview.fileType}
                    </span>
                    {activePreview.uploadedAt && (
                      <>
                        <span>•</span>
                        <span>{new Date(activePreview.uploadedAt).toLocaleString()}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Header Action Buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopyName(activePreview.fileName)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
                  title="Copy filename"
                >
                  {copiedFilename ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{copiedFilename ? 'Copied' : 'Copy Name'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownload(activePreview)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition border border-slate-700"
                  title="Download Evidence"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Download</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActivePreview(null);
                    setZoomLevel(1);
                  }}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition border border-slate-700"
                  title="Close viewer (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Media Render */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-950/40 min-h-[300px] relative">
              {(() => {
                const url = getEffectiveUrl(activePreview);
                const isImage = activePreview.fileType === 'image' || (url && (url.startsWith('data:image') || url.match(/\.(jpg|jpeg|png|gif|webp)$/i)));
                const isVideo = activePreview.fileType === 'video' || (url && url.startsWith('data:video'));
                const isAudio = activePreview.fileType === 'audio' || (url && url.startsWith('data:audio'));
                const isPdf = url && (url.startsWith('data:application/pdf') || url.match(/\.pdf$/i));

                if (isImage && url) {
                  return (
                    <div className="flex flex-col items-center justify-center w-full">
                      {/* Floating Zoom Controls */}
                      <div className="mb-3 flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/90 border border-slate-700/80 shadow-lg text-xs z-10">
                        <button
                          type="button"
                          onClick={handleZoomOut}
                          className="p-1 text-slate-400 hover:text-white transition"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="font-mono text-[11px] text-slate-300 min-w-[3rem] text-center">
                          {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                          type="button"
                          onClick={handleZoomIn}
                          className="p-1 text-slate-400 hover:text-white transition"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        {zoomLevel !== 1 && (
                          <button
                            type="button"
                            onClick={handleResetZoom}
                            className="p-1 text-slate-400 hover:text-amber-400 transition ml-1"
                            title="Reset Zoom"
                          >
                            <RotateCcw className="w-3 h-3" />
                          </button>
                        )}
                      </div>

                      <div className="max-w-full max-h-[60vh] overflow-auto rounded-2xl flex items-center justify-center p-2">
                        <img
                          src={url}
                          alt={activePreview.fileName}
                          style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
                          className="max-h-[55vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800"
                        />
                      </div>
                    </div>
                  );
                }

                if (isVideo && url) {
                  return (
                    <video
                      src={url}
                      controls
                      autoPlay
                      className="max-h-[65vh] max-w-full rounded-2xl shadow-2xl border border-slate-800"
                    />
                  );
                }

                if (isAudio && url) {
                  return (
                    <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 w-full max-w-md text-center space-y-4">
                      <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                        <Music className="w-8 h-8" />
                      </div>
                      <p className="text-xs text-slate-300 font-medium">{activePreview.fileName}</p>
                      <audio src={url} controls className="w-full" />
                    </div>
                  );
                }

                if (isPdf && url) {
                  return (
                    <iframe
                      src={url}
                      title={activePreview.fileName}
                      className="w-full h-[65vh] rounded-2xl border border-slate-800 bg-white"
                    />
                  );
                }

                // Fallback for raw documents or files
                return (
                  <div className="p-8 rounded-3xl bg-slate-900 border border-slate-800 text-center space-y-4 max-w-sm">
                    <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-300 mx-auto flex items-center justify-center">
                      <FileText className="w-8 h-8" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-100 text-sm">{activePreview.fileName}</h5>
                      <p className="text-xs text-slate-400 mt-1 font-mono">{activePreview.fileSize || 'Document'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(activePreview)}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download File</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Official SentinelX Chain-of-Custody Evidence</span>
              <span>Encrypted Storage</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
