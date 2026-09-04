import React, { useState, useEffect } from 'react';
import { X, Lock, Shield, KeyRound, AlertCircle, CheckCircle, UserCheck, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onSwitchToRegister
}) => {
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
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
    if (!identifier || !password) {
      setError('Please provide your NID, Email, or Badge ID, and Password.');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(identifier, password);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrefillAndLogin = async (id: string, pass: string) => {
    setIdentifier(id);
    setPassword(pass);
    setError(null);
    setIsLoading(true);
    try {
      await login(id, pass);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Header */}
        <div className="flex items-center gap-3.5 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-sm flex-shrink-0">
            <Lock className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
              National Security Gateway
            </span>
            <h3 className="text-xl font-bold text-white font-display">Sign In to SentinelX</h3>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3.5 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              National ID (NID) / Official Email / Badge ID
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => setIdentifier(e.target.value)}
              placeholder="e.g. citizen.tanvir@example.com or DMP-84920"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">
              Secret Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 font-display flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating Cryptographic Token...</span>
              </>
            ) : (
              <span>Sign In to Console</span>
            )}
          </button>
        </form>

        {/* Quick Demo Fill Buttons */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <p className="text-[11px] text-slate-400 text-center mb-3 font-mono uppercase tracking-wider">
            Public Civil Demonstration Accounts:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handlePrefillAndLogin('citizen.tanvir@example.com', 'demo1234')}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-emerald-950/40 border border-slate-700/80 text-slate-300 hover:text-emerald-300 text-xs font-medium transition text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">👤</span>
              <span className="font-semibold">Citizen (Tanvir)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrefillAndLogin('police.kamrul@dmp.gov.bd', 'demo1234')}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-blue-950/40 border border-slate-700/80 text-slate-300 hover:text-blue-300 text-xs font-medium transition text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">👮</span>
              <span className="font-semibold">Police (Kamrul)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePrefillAndLogin('shamim.reza@dncrp.gov.bd', 'demo1234')}
              className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-amber-950/40 border border-slate-700/80 text-slate-300 hover:text-amber-300 text-xs font-medium transition text-center flex flex-col items-center justify-center gap-1"
            >
              <span className="text-base">⚖️</span>
              <span className="font-semibold">DNCRP (Shamim)</span>
            </button>
          </div>
        </div>

        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400">
            Don't have a verified account?{' '}
            <button
              onClick={() => {
                onClose();
                onSwitchToRegister();
              }}
              className="text-emerald-400 font-semibold hover:underline"
            >
              Verify NID & Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
