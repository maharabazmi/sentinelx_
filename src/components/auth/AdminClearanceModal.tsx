import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, KeyRound, Lock, AlertCircle, RefreshCw, Eye, EyeOff, Terminal, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminClearanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AdminClearanceModal: React.FC<AdminClearanceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { adminClearanceLogin } = useAuth();
  const [clearanceKey, setClearanceKey] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showClearanceKey, setShowClearanceKey] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setClearanceKey('');
      setIdentifier('');
      setPassword('');
      setError(null);
      setIsLoading(false);
    }
  }, [isOpen]);

  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clearanceKey || !identifier || !password) {
      setError('Authority Clearance Key, Appointee Email/ID, and Password are all mandatory.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await adminClearanceLogin(clearanceKey.trim(), identifier.trim(), password);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Classified Clearance Failed. Access Denied.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickFillAuthorized = () => {
    setClearanceKey('HQ-BANGLADESH-SECURITY-2026');
    setIdentifier('admin@sentinelx.gov.bd');
    setPassword('demo1234');
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-in fade-in">
      <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-purple-500/40 rounded-3xl w-full max-w-lg p-6 sm:p-8 shadow-2xl shadow-purple-950/50 relative text-slate-100 overflow-hidden">
        {/* Background classified glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-600/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          title="Close clearance console"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Classified Branding */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/15 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-md flex-shrink-0">
            <ShieldAlert className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-widest block bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                Classified Gateway • Level 5
              </span>
            </div>
            <h3 className="text-xl font-bold text-white font-display mt-0.5">
              Executive Higher Authority Clearance
            </h3>
            <p className="text-[11px] text-slate-400">
              National Security & Cabinet Appointee Console
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="mb-5 p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200 flex items-start gap-2.5">
          <Terminal className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
          <span>
            This confidential portal is strictly restricted to designated Administrators appointed by higher authority. Unauthorized access attempts are monitored and recorded in national audit logs.
          </span>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Factor 1: Clearance Key */}
          <div>
            <label className="block text-purple-300 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-purple-400" />
                Higher Authority Clearance Passcode
              </span>
              <button
                type="button"
                onClick={() => setShowClearanceKey(!showClearanceKey)}
                className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1"
              >
                {showClearanceKey ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                <span>{showClearanceKey ? 'Mask' : 'Show'}</span>
              </button>
            </label>
            <input
              type={showClearanceKey ? 'text' : 'password'}
              value={clearanceKey}
              onChange={e => setClearanceKey(e.target.value)}
              placeholder="Enter authority appointment clearance key"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-900/90 border border-purple-500/40 text-purple-200 placeholder-slate-600 focus:outline-none focus:border-purple-400 transition font-mono tracking-wider"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Confidential master key provided during official gazette appointment.
            </p>
          </div>

          {/* Factor 2: Appointee Email / ID */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Appointed Officer Official Email / ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. admin@sentinelx.gov.bd"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 transition font-mono"
              required
            />
          </div>

          {/* Factor 3: Secret Password */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Personal Secret Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-400 transition font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-wide transition shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50 font-display flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying Cryptographic Clearance...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                <span>Verify Clearance & Enter Console</span>
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Pre-fill for Authorized Evaluation */}
        <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={handleQuickFillAuthorized}
            className="text-[11px] text-purple-400 hover:text-purple-300 flex items-center gap-1.5 py-1 px-2 rounded-lg bg-purple-950/40 border border-purple-500/20 hover:border-purple-500/40 transition"
            title="Pre-fills official appointee demonstration credentials"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Fill Appointee Clearance (Dr. Tariqul Alam)</span>
          </button>
          <span className="text-[10px] text-slate-500 font-mono">
            Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">Ctrl+Alt+A</kbd>
          </span>
        </div>
      </div>
    </div>
  );
};
