import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  KeyRound,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  X,
  Eye,
  EyeOff,
  Sparkles,
  Check
} from 'lucide-react';
import { ApiClient } from '../../services/api';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [identifier, setIdentifier] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 60-second resend cooldown timer
  const [cooldown, setCooldown] = useState(0);
  const [devOtpPreview, setDevOtpPreview] = useState<string | null>(null);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await ApiClient.requestPasswordResetOtp(identifier);
      if (res.success) {
        setTargetEmail(res.email);
        setStep(2);
        setCooldown(60);
        if (res.devOtp) {
          setDevOtpPreview(res.devOtp);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset code. Please check the email address.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || !identifier) return;
    setError(null);
    setIsLoading(true);

    try {
      const res = await ApiClient.requestPasswordResetOtp(identifier);
      if (res.success) {
        setCooldown(60);
        if (res.devOtp) {
          setDevOtpPreview(res.devOtp);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await ApiClient.resetPasswordWithOtp({
        email: targetEmail,
        otp: otp.trim(),
        newPassword
      });

      if (res.success) {
        setSuccessMessage(res.message);
        setStep(3);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. Please verify the code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setIdentifier('');
    setTargetEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    setDevOtpPreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden">
        {/* Glow accent */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 via-[#0147bf] to-[#02baff]" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-700 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white font-['Orbitron']">
              Account Recovery
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Secure Credential Reset Gateway
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter Email / Identifier */}
        {step === 1 && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Enter your registered official email, National ID (NID), or Badge ID. SentinelX will dispatch a 6-digit one-time authorization code to your verified address.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Email / Registered Identifier
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="e.g. citizen@example.com or NID"
                  className="sx-input sx-input-with-icon"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !identifier.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs tracking-wider font-['Orbitron'] transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Transmitting Security Code...</span>
                </>
              ) : (
                <>
                  <span>Send Recovery Code</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Enter OTP & Set New Password */}
        {step === 2 && (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
              <span className="text-slate-400 block">Verification code dispatched to:</span>
              <strong className="text-amber-400 font-mono text-xs">{targetEmail}</strong>
            </div>

            {/* Dev helper preview */}
            {devOtpPreview && (
              <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between text-xs text-emerald-300">
                <span className="flex items-center gap-1.5 font-mono text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Dev OTP: <strong className="font-bold text-white tracking-widest">{devOtpPreview}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtp(devOtpPreview)}
                  className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 text-[10px] font-bold"
                >
                  Auto-fill
                </button>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase font-mono">
                  6-Digit Reset Code
                </label>
                <button
                  type="button"
                  disabled={cooldown > 0 || isLoading}
                  onClick={handleResendOtp}
                  className="text-[11px] font-mono text-[#02baff] hover:underline disabled:text-slate-500"
                >
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
                </button>
              </div>
              <input
                type="text"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="sx-input text-center font-mono text-xl tracking-[0.4em] font-bold text-amber-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                New Permanent Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className="sx-input pr-10 font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white transition"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Confirm New Password
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                className="sx-input font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || otp.length < 6 || !newPassword}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-xs tracking-wider font-['Orbitron'] transition shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Credentials...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Establish New Password</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 3: Success Screen */}
        {step === 3 && (
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h4 className="text-lg font-bold text-white font-['Orbitron']">
              Password Reset Complete
            </h4>

            <p className="text-xs text-slate-300 leading-relaxed">
              {successMessage || 'Your security password has been updated successfully. You can now authenticate with your new credentials.'}
            </p>

            <button
              type="button"
              onClick={() => {
                handleClose();
                onSuccess();
              }}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-bold text-xs tracking-wider font-['Orbitron'] transition shadow-lg shadow-[#0147bf]/30"
            >
              Sign In to SentinelX
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
