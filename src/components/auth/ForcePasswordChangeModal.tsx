import React, { useState } from 'react';
import { KeyRound, ShieldAlert, Lock, Eye, EyeOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const ForcePasswordChangeModal: React.FC = () => {
  const { user, changePassword, logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const passwordsDoNotMatch = confirmPassword.length > 0 && newPassword !== confirmPassword;

  // Only render if user is logged in AND mustChangePassword is true
  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('Please fill in all password fields.');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (passwordsDoNotMatch) {
      setError('New password and confirmation do not match.');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from your temporary password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await changePassword(currentPassword, newPassword);
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to update password. Please check your temporary password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-lg animate-in fade-in">
      <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-5">
        
        {/* Header Badge */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-lg shadow-amber-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-['Orbitron'] font-bold text-amber-400 uppercase tracking-wider block">
              SECURITY CLEARANCE PROTOCOL
            </span>
            <h3 className="text-lg font-bold text-white font-display">
              Change Temporary Password
            </h3>
          </div>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
          Welcome, <strong className="text-white">{user.fullName}</strong>. Central Command provisioned your account with a temporary password. You must establish your private permanent password before accessing the SentinelX portal.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
            <span className="font-bold">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">Password Established!</h4>
            <p className="text-xs text-slate-400">Your permanent security credentials are active. Entering dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Current Temporary Password <span className="text-amber-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="Enter temporary password from email"
                  className="sx-input pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                New Permanent Password <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="sx-input pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Confirm Permanent Password <span className="text-emerald-400">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className={`sx-input pr-10 ${passwordsDoNotMatch ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''}`}
                  aria-invalid={passwordsDoNotMatch}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(v => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordsDoNotMatch && (
                <p className="text-[11px] text-red-400 mt-1.5" role="alert">
                  Passwords do not match.
                </p>
              )}
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={logout}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition text-xs"
              >
                Sign Out
              </button>

              <button
                type="submit"
                disabled={isSubmitting || passwordsDoNotMatch}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold tracking-wide transition shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-xs"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Set Permanent Password</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
