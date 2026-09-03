import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Key,
  Phone,
  Mail,
  Building,
  MapPin,
  RefreshCw,
  Lock
} from 'lucide-react';
import { ApiClient } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { NIDVerificationResult } from '../../types';
import { StepProgress, StepItem } from '../ui/StepProgress';

interface RegisterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
}

export const RegisterWizard: React.FC<RegisterWizardProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin
}) => {
  const { register } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Step 1: NID & DOB
  const [nidNumber, setNidNumber] = useState('19922692015000123');
  const [dob, setDob] = useState('1992-05-14');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<NIDVerificationResult | null>(null);

  // Step 3: Contact & Security Credentials
  const [phone, setPhone] = useState('+8801711234567');
  const [email, setEmail] = useState('citizen.tanvir@example.com');
  const [password, setPassword] = useState('demo1234');
  const [confirmPassword, setConfirmPassword] = useState('demo1234');

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const registerSteps: StepItem[] = [
    { id: 1, label: 'NID Check', description: 'National Registry' },
    { id: 2, label: 'Demographics', description: 'Identity Match' },
    { id: 3, label: 'Security', description: 'Password & Phone' },
    { id: 4, label: 'Verified', description: 'Access Active' }
  ];

  const resetWizard = () => {
    setStep(1);
    setNidNumber('19922692015000123');
    setDob('1992-05-14');
    setIsVerifying(false);
    setVerificationResult(null);
    setPhone('+8801711234567');
    setEmail('citizen.tanvir@example.com');
    setPassword('demo1234');
    setConfirmPassword('demo1234');
    setError(null);
    setIsSubmitting(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetWizard();
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

  // Step 1: Verify NID against National Registry
  const handleVerifyNID = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const res = await ApiClient.verifyNID(nidNumber, dob);
      if (res.success && res.verification) {
        setVerificationResult(res.verification);
        if (res.alreadyRegistered) {
          setError('An account with this NID already exists. You can sign in directly.');
        } else {
          const normalizedName = res.verification.fullNameEn.toLowerCase().replace(/[^a-z0-9]/g, '.');
          setEmail(`${normalizedName}@example.com`);
          setStep(2);
        }
      }
    } catch (err: any) {
      setError(err.message || 'National ID verification failed. Please check the NID format.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Step 3: Complete Registration
  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!verificationResult) {
      setError('Missing verified identity.');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await register({
        nidNumber: verificationResult.nidNumber,
        dob: verificationResult.dob,
        fullName: verificationResult.fullNameEn,
        fullNameBn: verificationResult.fullNameBn,
        email,
        phone,
        password,
        address: verificationResult.address,
        thana: verificationResult.thana,
        district: verificationResult.district
      });
      setStep(4);
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-xl p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-6 max-h-[92vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Dialog Header with Stepper */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-widest block">
                Official Bangladesh NID Gateway
              </span>
              <h3 className="text-xl font-bold text-white font-display">
                Citizen NID Verification & Registration
              </h3>
            </div>
          </div>

          <StepProgress
            steps={registerSteps}
            currentStep={step}
          />
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex flex-col gap-2 animate-in fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-red-400" />
              <span className="leading-relaxed">{error}</span>
            </div>
            {error.includes('already exists') && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSwitchToLogin();
                }}
                className="self-start px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition active:scale-95"
              >
                Go to Sign In →
              </button>
            )}
          </div>
        )}

        {/* STEP 1: NID & DOB INPUT */}
        {step === 1 && (
          <form onSubmit={handleVerifyNID} className="space-y-4 text-xs animate-in fade-in">
            <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 space-y-1">
              <span className="font-bold font-display text-sm block">🔒 Direct Porichoy Gateway Verification</span>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                SentinelX queries the Government Porichoy NID verification standard. To eliminate typos, demographic information is securely auto-filled upon verification.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Bangladesh National ID Number (NID) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="text"
                value={nidNumber}
                onChange={e => setNidNumber(e.target.value)}
                placeholder="10-digit Smart Card, 13-digit, or 17-digit NID"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500 transition"
                required
              />
              <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-400">
                <span>Sample demo NIDs:</span>
                <button
                  type="button"
                  onClick={() => { setNidNumber('5508192841'); setDob('1996-11-20'); }}
                  className="text-emerald-400 hover:underline font-mono"
                >
                  5508192841 (Smart Card)
                </button>
                <span>•</span>
                <button
                  type="button"
                  onClick={() => { setNidNumber('19922692015000123'); setDob('1992-05-14'); }}
                  className="text-emerald-400 hover:underline font-mono"
                >
                  19922692015000123
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Date of Birth (as per NID Card) <span className="text-emerald-400">*</span>
              </label>
              <input
                type="date"
                value={dob}
                onChange={e => setDob(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500 transition"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold tracking-wide transition shadow-lg shadow-emerald-500/20 active:scale-95 disabled:opacity-50 font-display flex items-center justify-center gap-2"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying with Bangladesh NID Registry...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify National Identity</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: DEMOGRAPHIC IDENTITY CONFIRMATION */}
        {step === 2 && verificationResult && (
          <div className="space-y-4 text-xs animate-in fade-in">
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-emerald-500/40 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h4 className="font-bold text-white text-sm font-display">
                      Identity Confirmed & Verified
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Porichoy KYC Audit Reference ID: {verificationResult.nidNumber}
                    </span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                  MATCH 100%
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-slate-300">
                <div>
                  <span className="text-slate-500 text-[10px] block">Full Name (English):</span>
                  <strong className="text-white text-xs">{verificationResult.fullNameEn}</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">নাম (বাংলা):</span>
                  <strong className="text-white text-xs">{verificationResult.fullNameBn}</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">Father's Name:</span>
                  <span className="text-slate-200">{verificationResult.fatherName}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">Mother's Name:</span>
                  <span className="text-slate-200">{verificationResult.motherName}</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">Verified Thana:</span>
                  <strong className="text-emerald-400">{verificationResult.thana}</strong>
                </div>

                <div>
                  <span className="text-slate-500 text-[10px] block">Verified District:</span>
                  <strong className="text-emerald-400">{verificationResult.district}</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-900 text-[11px] text-slate-400">
                <span>Registered Address: </span>
                <strong className="text-slate-200">{verificationResult.address}</strong>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Re-enter NID</span>
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
              >
                <span>Confirm & Create Credentials</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONTACT & PASSWORD CREATION */}
        {step === 3 && (
          <form onSubmit={handleCompleteRegistration} className="space-y-4 text-xs animate-in fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Contact Mobile Number <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+8801711234567"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Notification Email <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Set Password <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Confirm Password <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Creating Authenticated Account...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>Complete NID Registration</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STEP 4: ACCESS GRANTED & DIRECT DASHBOARD ENTRY */}
        {step === 4 && (
          <div className="text-center py-6 space-y-5 animate-in fade-in">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
              <CheckCircle2 className="w-9 h-9 stroke-[2]" />
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-bold text-white font-display">
                Registration & NID Authentication Complete!
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                Your account is now officially verified under Bangladesh digital civil safety protocols. You can immediately access reporting, SOS emergency dispatch, and consumer claims.
              </p>
            </div>

            <button
              onClick={onClose}
              className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs tracking-wider transition shadow-xl shadow-emerald-500/30 active:scale-95"
            >
              Enter Verified Citizen Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
