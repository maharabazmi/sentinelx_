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
  Lock,
  Eye,
  EyeOff,
  Send,
  Check
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

const birthMonths = [
  '01 - January', '02 - February', '03 - March', '04 - April',
  '05 - May', '06 - June', '07 - July', '08 - August',
  '09 - September', '10 - October', '11 - November', '12 - December'
];
const birthYears = Array.from(
  { length: new Date().getFullYear() - 1899 },
  (_, index) => String(new Date().getFullYear() - index)
);

export const RegisterWizard: React.FC<RegisterWizardProps> = ({
  isOpen,
  onClose,
  onSwitchToLogin
}) => {
  const { register } = useAuth();
  const [step, setStep] = useState<number>(1);

  // Step 1: NID & DOB
  const [nidNumber, setNidNumber] = useState('');
  const [dob, setDob] = useState('');
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<NIDVerificationResult | null>(null);
  const [isAlreadyRegistered, setIsAlreadyRegistered] = useState(false);

  // Step 3: Contact & Security Credentials
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Email OTP Verification State
  const [emailOtp, setEmailOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isEmailOtpSent, setIsEmailOtpSent] = useState(false);
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [otpCooldown, setOtpCooldown] = useState(0);
  const [devOtpNotice, setDevOtpNotice] = useState<string | null>(null);
  const [emailSuccessMessage, setEmailSuccessMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Countdown timer for OTP resend
  useEffect(() => {
    if (otpCooldown > 0) {
      const timer = setTimeout(() => setOtpCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpCooldown]);

  const registerSteps: StepItem[] = [
    { id: 1, label: 'NID Check', description: 'National Registry' },
    { id: 2, label: 'Demographics', description: 'Identity Match' },
    { id: 3, label: 'Security', description: 'Password & Phone' },
    { id: 4, label: 'Verified', description: 'Access Active' }
  ];

  const resetWizard = () => {
    setStep(1);
    setNidNumber('');
    setDob('');
    setDobDay('');
    setDobMonth('');
    setDobYear('');
    setIsVerifying(false);
    setVerificationResult(null);
    setIsAlreadyRegistered(false);
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setEmailOtp('');
    setIsSendingOtp(false);
    setIsVerifyingOtp(false);
    setIsEmailOtpSent(false);
    setIsEmailVerified(false);
    setOtpCooldown(0);
    setDevOtpNotice(null);
    setEmailSuccessMessage(null);
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

  const passwordsDoNotMatch = confirmPassword.length > 0 && password !== confirmPassword;

  // Step 1: Verify NID against National Registry
  const handleVerifyNID = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const [dobYearValue, dobMonthValue, dobDayValue] = dob.split('-').map(Number);
    const parsedDob = new Date(Date.UTC(dobYearValue, dobMonthValue - 1, dobDayValue));
    const isValidDob = Boolean(dob) &&
      !Number.isNaN(parsedDob.getTime()) &&
      parsedDob.getUTCFullYear() === dobYearValue &&
      parsedDob.getUTCMonth() === dobMonthValue - 1 &&
      parsedDob.getUTCDate() === dobDayValue;

    if (!isValidDob) {
      setError('Please select a valid date of birth.');
      return;
    }

    setIsVerifying(true);

    try {
      const res = await ApiClient.verifyNID(nidNumber, dob);
      if (res.success && res.verification) {
        setVerificationResult(res.verification);
        if (res.alreadyRegistered) {
          setIsAlreadyRegistered(true);
          setError('An account with this NID already exists. You can sign in directly.');
        } else {
          setIsAlreadyRegistered(false);
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

  const handleDobPartChange = (part: 'day' | 'month' | 'year', value: string) => {
    const nextDay = part === 'day' ? value : dobDay;
    const nextMonth = part === 'month' ? value : dobMonth;
    const nextYear = part === 'year' ? value : dobYear;

    setDobDay(nextDay);
    setDobMonth(nextMonth);
    setDobYear(nextYear);
    setDob(nextDay && nextMonth && nextYear ? `${nextYear}-${nextMonth}-${nextDay}` : '');
  };

  // Step 3: Email OTP Handlers
  const handleSendEmailOtp = async () => {
    if (!email || !email.includes('@') || !email.includes('.')) {
      setError('Please provide a valid notification email address.');
      return;
    }
    setError(null);
    setEmailSuccessMessage(null);
    setIsSendingOtp(true);
    try {
      const res = await ApiClient.sendEmailOtp(email, verificationResult?.fullNameEn);
      if (res.success) {
        setIsEmailOtpSent(true);
        setOtpCooldown(60);
        setEmailSuccessMessage(`6-digit verification code sent to ${email}`);
        if (res.devOtp) {
          setDevOtpNotice(`Instant Verification Code: ${res.devOtp}`);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to dispatch email verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp || emailOtp.trim().length !== 6) {
      setError('Please enter the 6-digit verification code from your email.');
      return;
    }
    setError(null);
    setIsVerifyingOtp(true);
    try {
      const res = await ApiClient.verifyEmailOtp(email, emailOtp.trim());
      if (res.success) {
        setIsEmailVerified(true);
        setDevOtpNotice(null);
        setEmailSuccessMessage('✓ Email address successfully verified.');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingOtp(false);
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
    if (isAlreadyRegistered) {
      setError('This NID is already linked to an existing account. Please sign in instead.');
      return;
    }
    if (email && !isEmailVerified) {
      setError('Please verify your email address using the 6-digit security code before completing registration.');
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
        district: verificationResult.district,
        isEmailVerified: isEmailVerified
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
            <div className="w-10 h-10 rounded-2xl bg-[#0147bf]/20 border border-[#02baff]/30 flex items-center justify-center p-1.5 shadow-sm">
              <img src="/Sentinalx_Only Logo Mark-01.svg" alt="SentinelX" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[10px] font-['Orbitron'] font-bold text-[#02baff] uppercase tracking-widest block">
                BANGLADESH NID GATEWAY
              </span>
              <h3 className="text-xl font-bold text-white font-['Orbitron']">
                Citizen Identity Verification
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
                className="sx-input"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                NID must contain 10, 13, or 17 digits.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1.5">
                Date of Birth (as per NID Card) <span className="text-emerald-400">*</span>
              </label>
              <div className="grid grid-cols-[0.8fr_1.5fr_1fr] gap-2">
                <select
                  value={dobDay}
                  onChange={e => handleDobPartChange('day', e.target.value)}
                  className="sx-input"
                  aria-label="Birth day"
                  required
                >
                  <option value="">Day</option>
                  {Array.from({ length: 31 }, (_, index) => {
                    const day = String(index + 1).padStart(2, '0');
                    return <option key={day} value={day}>{day}</option>;
                  })}
                </select>

                <select
                  value={dobMonth}
                  onChange={e => handleDobPartChange('month', e.target.value)}
                  className="sx-input"
                  aria-label="Birth month"
                  required
                >
                  <option value="">Month</option>
                  {birthMonths.map((month, index) => {
                    const monthValue = String(index + 1).padStart(2, '0');
                    return <option key={monthValue} value={monthValue}>{month}</option>;
                  })}
                </select>

                <input
                  type="search"
                  list="birth-year-options"
                  value={dobYear}
                  onChange={e => handleDobPartChange('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="Year"
                  inputMode="numeric"
                  pattern="[0-9]{4}"
                  className="sx-input"
                  aria-label="Birth year"
                  required
                />
                <datalist id="birth-year-options">
                  {birthYears.map(year => <option key={year} value={year} />)}
                </datalist>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Select day and month, then type or search for the birth year.
              </p>
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
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Contact Mobile Number <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="sx-input"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-300">
                    Notification Email <span className="text-emerald-400">*</span>
                  </label>
                  {isEmailVerified && (
                    <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={e => {
                      setEmail(e.target.value);
                      if (isEmailVerified) setIsEmailVerified(false);
                      if (isEmailOtpSent) setIsEmailOtpSent(false);
                      setEmailSuccessMessage(null);
                    }}
                    disabled={isEmailVerified}
                    placeholder="citizen@example.com"
                    className={`sx-input ${isEmailVerified ? 'border-emerald-500/50 bg-emerald-950/20 text-emerald-300' : ''}`}
                    required
                  />

                  {!isEmailVerified && (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={isSendingOtp || otpCooldown > 0 || !email}
                      className="px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-xs whitespace-nowrap transition shadow-md shadow-blue-500/20 disabled:opacity-50 flex items-center gap-1.5 active:scale-95 flex-shrink-0"
                    >
                      {isSendingOtp ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : otpCooldown > 0 ? (
                        <span>Resend ({otpCooldown}s)</span>
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>{isEmailOtpSent ? 'Resend Code' : 'Verify Email'}</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {emailSuccessMessage && (
                  <p className="text-[11px] text-emerald-400 mt-1 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{emailSuccessMessage}</span>
                  </p>
                )}

                {devOtpNotice && (
                  <div className="mt-1.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
                    <span>{devOtpNotice}</span>
                    <button
                      type="button"
                      onClick={() => setEmailOtp(devOtpNotice.replace(/\D/g, ''))}
                      className="text-[10px] underline text-amber-200 font-bold hover:text-white"
                    >
                      Auto-Fill
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* OTP Entry Row */}
            {isEmailOtpSent && !isEmailVerified && (
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-cyan-500/40 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-cyan-300">
                    Enter 6-Digit Email Verification Code <span className="text-emerald-400">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">10 min validity</span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={emailOtp}
                    onChange={e => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="e.g. 482910"
                    className="sx-input font-mono text-center tracking-[4px] text-sm font-bold text-cyan-300"
                  />

                  <button
                    type="button"
                    onClick={handleVerifyEmailOtp}
                    disabled={isVerifyingOtp || emailOtp.length !== 6}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs whitespace-nowrap transition shadow-md shadow-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5 active:scale-95 flex-shrink-0"
                  >
                    {isVerifyingOtp ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Code</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Set Password <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="sx-input pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(value => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">
                  Confirm Password <span className="text-emerald-400">*</span>
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
                    onClick={() => setShowConfirmPassword(value => !value)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                    title={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
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
