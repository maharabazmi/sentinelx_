import React, { useState, useEffect } from 'react';
import { X, Lock, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
          <div className="w-12 h-12 rounded-2xl bg-[#0147bf]/20 border border-[#02baff]/30 flex items-center justify-center p-2 shadow-sm flex-shrink-0">
            <img src="/Sentinalx_Only Logo Mark-01.svg" alt="SentinelX" className="w-full h-full object-contain" />
          </div>
          <div>
            <span className="text-[10px] font-['Orbitron'] font-bold text-[#02baff] uppercase tracking-widest block">
              NATIONAL GATEWAY
            </span>
            <h3 className="text-xl font-bold text-white font-['Orbitron']">Sign In to SentinelX</h3>
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
              className="sx-input font-mono"
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
              className="sx-input font-mono"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-bold tracking-wide transition shadow-lg shadow-[#0147bf]/30 active:scale-95 disabled:opacity-50 font-['Orbitron'] text-xs flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Validating Cryptographic Token...</span>
              </>
            ) : (
              <span>SIGN IN TO CONSOLE</span>
            )}
          </button>
        </form>


        <div className="mt-5 text-center">
          <p className="text-xs text-slate-400">
            Don't have a verified account?{' '}
            <button
              onClick={() => {
                onClose();
                onSwitchToRegister();
              }}
              className="text-[#02baff] font-semibold hover:underline font-mono"
            >
              Verify NID & Register
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
