import React, { useRef, useState } from 'react';
import {
  Upload,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Trash2,
  Eye,
  X,
  File,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { EvidenceFile } from '../../types';

interface EvidenceUploaderProps {
  files?: EvidenceFile[];
  evidenceList?: EvidenceFile[];
  onFilesChange?: (files: EvidenceFile[]) => void;
  onChange?: (files: EvidenceFile[]) => void;
  title?: string;
  subtitle?: string;
  accentColor?: 'emerald' | 'amber' | 'blue';
  maxFileSizeMB?: number;
}

export const EvidenceUploader: React.FC<EvidenceUploaderProps> = ({
  files,
  evidenceList,
  onFilesChange,
  onChange,
  title = 'Evidence Attachments',
  subtitle = 'Attach CCTV footage, photographs, audio recordings, or documents from your device',
  accentColor = 'emerald',
  maxFileSizeMB = 10
}) => {
  const effectiveFiles = files || evidenceList || [];
  const triggerChange = (newFiles: EvidenceFile[]) => {
    if (onFilesChange) onFilesChange(newFiles);
    if (onChange) onChange(newFiles);
  };
  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previewFile, setPreviewFile] = useState<EvidenceFile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Format file size nicely
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Determine file type category
  const getFileTypeCategory = (file: File): 'image' | 'video' | 'audio' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('video/')) return 'video';
    if (file.type.startsWith('audio/')) return 'audio';
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
    if (ext && ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'video';
    if (ext && ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
    return 'document';
  };

  // Process selected files from input or drop
  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorMessage(null);

    const maxBytes = maxFileSizeMB * 1024 * 1024;
    const newItems: EvidenceFile[] = [];

    Array.from(fileList).forEach(file => {
      if (file.size > maxBytes) {
        setErrorMessage(`"${file.name}" exceeds the maximum limit of ${maxFileSizeMB}MB.`);
        return;
      }

      const fileTypeCategory = getFileTypeCategory(file);

      // Read file into Data URL for preview and submission
      const reader = new FileReader();
      reader.onload = (e) => {
        const resultUrl = e.target?.result as string;
        const newEvidence: EvidenceFile = {
          id: `ev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          fileName: file.name,
          fileType: fileTypeCategory,
          fileUrl: resultUrl,
          fileSize: formatFileSize(file.size),
          uploadedAt: new Date().toISOString()
        };

        triggerChange([...effectiveFiles, ...newItems, newEvidence]);
      };

      reader.onerror = () => {
        setErrorMessage(`Failed to read file "${file.name}" from your local disk.`);
      };

      reader.readAsDataURL(file);
    });
  };

  const handlePhotoClick = () => {
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
      photoInputRef.current.click();
    }
  };

  const handleDocClick = () => {
    if (docInputRef.current) {
      docInputRef.current.value = '';
      docInputRef.current.click();
    }
  };

  const handleRemove = (idToRemove: string) => {
    triggerChange(effectiveFiles.filter(f => f.id !== idToRemove));
    if (previewFile?.id === idToRemove) {
      setPreviewFile(null);
    }
  };

  const handleClearAll = () => {
    triggerChange([]);
    setPreviewFile(null);
    setErrorMessage(null);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const getFileIcon = (type: EvidenceFile['fileType']) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-4 h-4 text-emerald-400" />;
      case 'video':
        return <Film className="w-4 h-4 text-purple-400" />;
      case 'audio':
        return <Music className="w-4 h-4 text-blue-400" />;
      default:
        return <FileText className="w-4 h-4 text-amber-400" />;
    }
  };

  const themeClasses = {
    emerald: {
      btnHover: 'hover:border-emerald-500/50 hover:bg-emerald-950/20',
      activeBorder: 'border-emerald-500 bg-emerald-950/30',
      buttonBg: 'bg-emerald-600 hover:bg-emerald-500 text-slate-950',
      outlineBtn: 'border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-950/40 text-emerald-300',
      tag: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    },
    amber: {
      btnHover: 'hover:border-amber-500/50 hover:bg-amber-950/20',
      activeBorder: 'border-amber-500 bg-amber-950/30',
      buttonBg: 'bg-amber-600 hover:bg-amber-500 text-slate-950',
      outlineBtn: 'border-amber-500/30 hover:border-amber-500 hover:bg-amber-950/40 text-amber-300',
      tag: 'text-amber-400 bg-amber-500/10 border-amber-500/30'
    },
    blue: {
      btnHover: 'hover:border-blue-500/50 hover:bg-blue-950/20',
      activeBorder: 'border-blue-500 bg-blue-950/30',
      buttonBg: 'bg-blue-600 hover:bg-blue-500 text-white',
      outlineBtn: 'border-blue-500/30 hover:border-blue-500 hover:bg-blue-950/40 text-blue-300',
      tag: 'text-blue-400 bg-blue-500/10 border-blue-500/30'
    }
  }[accentColor];

  return (
    <div className="p-4 rounded-xl bg-slate-800/70 border border-slate-700/80 space-y-3.5">
      {/* Hidden Native File Inputs */}
      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />
      <input
        ref={docInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.mp3,.mp4,.wav,image/*"
        multiple
        className="hidden"
        onChange={(e) => processFiles(e.target.files)}
      />

      {/* Header with Title & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-slate-100 text-sm">{title}</h4>
            <span className="px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-300 text-[10px] font-mono">
              {effectiveFiles.length} attached
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>
        </div>

        {/* Buttons to trigger native system file dialog */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handlePhotoClick}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition shadow-sm ${themeClasses.outlineBtn}`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>+ Photo Evidence</span>
          </button>
          <button
            type="button"
            onClick={handleDocClick}
            className="px-3 py-1.5 rounded-lg border border-slate-600/80 hover:border-slate-500 bg-slate-700/60 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>+ Document</span>
          </button>
          {effectiveFiles.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="px-2.5 py-1.5 rounded-lg border border-red-900/50 hover:border-red-500/60 bg-red-950/20 hover:bg-red-950/40 text-red-400 text-xs font-semibold flex items-center gap-1 transition shadow-sm"
              title="Remove all uploaded attachments"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      </div>

      {/* Drag and Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handlePhotoClick}
        className={`border-2 border-dashed rounded-xl p-3.5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
          isDragging
            ? `${themeClasses.activeBorder} scale-[0.99]`
            : 'border-slate-700/80 hover:border-slate-600 bg-slate-900/40 hover:bg-slate-900/60'
        }`}
      >
        <div className="p-2 rounded-full bg-slate-800 text-slate-300">
          <Upload className="w-4 h-4" />
        </div>
        <p className="text-xs text-slate-300 font-medium">
          Drag & drop files here from your local computer, or <span className="underline font-semibold text-slate-100">browse</span>
        </p>
        <p className="text-[10px] text-slate-500">
          Supports JPG, PNG, PDF, DOCX, MP4, MP3 up to {maxFileSizeMB}MB
        </p>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Uploaded Files List */}
      {effectiveFiles.length > 0 && (
        <div className="space-y-2 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {effectiveFiles.map((file) => (
              <div
                key={file.id}
                className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700/70 hover:border-slate-600 flex items-center justify-between gap-3 group transition shadow-sm"
              >
                {/* Thumbnail or Icon */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {file.fileType === 'image' && file.fileUrl ? (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewFile(file);
                      }}
                      className="w-10 h-10 rounded-lg overflow-hidden bg-slate-800 border border-slate-700 flex-shrink-0 cursor-pointer relative group/img"
                    >
                      <img
                        src={file.fileUrl}
                        alt={file.fileName}
                        className="w-full h-full object-cover group-hover/img:scale-110 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition flex items-center justify-center text-white">
                        <Eye className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                      {getFileIcon(file.fileType)}
                    </div>
                  )}

                  {/* File Metadata */}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-200 truncate" title={file.fileName}>
                      {file.fileName}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                      <span className="font-mono">{file.fileSize}</span>
                      <span>•</span>
                      <span className="uppercase font-mono text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                        {file.fileType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {file.fileType === 'image' && file.fileUrl && (
                    <button
                      type="button"
                      onClick={() => setPreviewFile(file)}
                      title="Preview full image"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(file.id)}
                    title="Remove attachment"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox / Full Screen Image Preview Modal */}
      {previewFile && (
        <div
          onClick={() => setPreviewFile(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-slate-700 rounded-2xl max-w-3xl w-full p-4 shadow-2xl relative space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-white text-xs truncate max-w-md">{previewFile.fileName}</span>
                <span className="text-[10px] text-slate-400 font-mono">({previewFile.fileSize})</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-hidden rounded-xl bg-slate-950 flex items-center justify-center">
              <img
                src={previewFile.fileUrl}
                alt={previewFile.fileName}
                className="max-h-[68vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
