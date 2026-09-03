import React from 'react';
import {
  Shield,
  Lock,
  PhoneCall,
  UserCheck,
  AlertTriangle,
  FileText,
  Building,
  CheckCircle2,
  ArrowRight,
  EyeOff,
  Radio,
  Flame,
  Scale,
  Sparkles,
  Server,
  Gavel,
  Barcode
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onSelectRole: (role: UserRole) => void;
  onNavigateToDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onSelectRole,
  onNavigateToDashboard
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="w-full min-h-screen text-slate-100 selection:bg-emerald-500 selection:text-slate-950">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-16 pb-24 border-b border-slate-800/80 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-950/25 via-slate-950/60 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-semibold tracking-wider uppercase">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              PEOPLE'S REPUBLIC OF BANGLADESH • NATIONAL SAFETY INITIATIVE
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white font-display leading-[1.12]">
              AI-Powered Public Safety &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500">
                Consumer Protection
              </span>
            </h1>

            <p className="text-slate-300 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
              SentinelX bridges citizens, law enforcement agencies, and the Directorate of National Consumers Right Protection (DNCRP) into a secure, authenticated national protection platform.
            </p>

            {/* Primary Action Buttons */}
            {user ? (
              <div className="space-y-3 pt-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Authenticated Session: <strong>{user.fullName}</strong> ({user.role})</span>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <button
                    onClick={onNavigateToDashboard}
                    className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm tracking-wide transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 group active:scale-95"
                  >
                    <UserCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                    <span>
                      Open {user.role === UserRole.CITIZEN ? 'Citizen Portal & Reports' : `${user.role} Console`}
                    </span>
                    <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    onClick={logout}
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-semibold transition"
                  >
                    Switch Account / Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <button
                  onClick={onOpenRegister}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-sm tracking-wide transition shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2.5 group active:scale-95"
                >
                  <UserCheck className="w-5 h-5 text-slate-950 stroke-[2.5]" />
                  <span>Verify NID & Register</span>
                  <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition" />
                </button>

                <button
                  onClick={onOpenLogin}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-display font-semibold text-sm transition flex items-center justify-center gap-2 active:scale-95 shadow-md"
                >
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Official Portal Sign In</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CORE PLATFORM PILLARS */}
      <section className="py-20 max-w-7xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold">
            Trusted National Architecture
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white font-display">
            Engineered for Civil Trust & Institutional Reliability
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm">
            Adhering strictly to national digital identity standards, end-to-end evidence encryption, and whistleblower privacy laws.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: Authenticated Reporting */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition space-y-4 shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition">
              <Shield className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-white font-display group-hover:text-emerald-400 transition">
              Authenticated Crime Reporting
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Eliminates malicious spam reports through mandatory National ID verification. Every lodged case is verified by the respective Thana reviewing officer before entering the central crime heatmap.
            </p>
            <div className="pt-3 border-t border-slate-800 text-xs text-emerald-400 flex items-center gap-1.5 font-medium font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>National NID Verified Standard</span>
            </div>
          </div>

          {/* Pillar 2: Whistleblower Confidentiality */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 transition space-y-4 shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 group-hover:scale-105 transition">
              <EyeOff className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-white font-display group-hover:text-blue-400 transition">
              Legal Whistleblower Protection
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Citizens can lodge sensitive reports with identity sealing. While the investigating authority maintains lawful accountability, the reporter's personal details are protected from public exposure.
            </p>
            <div className="pt-3 border-t border-slate-800 text-xs text-blue-400 flex items-center gap-1.5 font-medium font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>Whistleblower Act Protection</span>
            </div>
          </div>

          {/* Pillar 3: Consumer Protection */}
          <div className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 hover:border-amber-500/40 transition space-y-4 shadow-xl group">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <Scale className="w-7 h-7 stroke-[2]" />
            </div>
            <h3 className="text-lg font-bold text-white font-display group-hover:text-amber-400 transition">
              DNCRP Consumer Rights & Fines
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Integrated with the Directorate of National Consumers Right Protection. Report price gouging, fake BSTI barcodes, or adulteration, and legally claim 25% of all realized administrative fines.
            </p>
            <div className="pt-3 border-t border-slate-800 text-xs text-amber-400 flex items-center gap-1.5 font-medium font-mono">
              <CheckCircle2 className="w-4 h-4" />
              <span>DNCRP Act 2009 Enforcement</span>
            </div>
          </div>
        </div>
      </section>

      {/* NATIONAL EMERGENCY HOTLINES DIRECTORY */}
      <section className="py-16 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-10 space-y-1">
            <span className="text-xs font-mono text-red-400 uppercase tracking-widest font-bold">
              Immediate Civilian Assistance
            </span>
            <h3 className="text-xl sm:text-3xl font-bold text-white font-display">
              Official Government Emergency Hotlines
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <a
              href="tel:999"
              className="p-5 rounded-2xl bg-slate-900/90 border border-red-500/30 hover:border-red-500/60 text-center space-y-1.5 transition shadow-lg block group"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-red-400 font-mono group-hover:scale-105 inline-block transition">
                999
              </span>
              <h5 className="text-xs font-bold text-slate-200 font-display">National Emergency</h5>
              <p className="text-[11px] text-slate-400">Police, Fire & Ambulance (Toll-Free)</p>
            </a>

            <a
              href="tel:16121"
              className="p-5 rounded-2xl bg-slate-900/90 border border-amber-500/30 hover:border-amber-500/60 text-center space-y-1.5 transition shadow-lg block group"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-amber-400 font-mono group-hover:scale-105 inline-block transition">
                16121
              </span>
              <h5 className="text-xs font-bold text-slate-200 font-display">Consumer Protection</h5>
              <p className="text-[11px] text-slate-400">DNCRP Grievance Cell</p>
            </a>

            <a
              href="tel:109"
              className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 hover:border-emerald-500/60 text-center space-y-1.5 transition shadow-lg block group"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-emerald-400 font-mono group-hover:scale-105 inline-block transition">
                109
              </span>
              <h5 className="text-xs font-bold text-slate-200 font-display">Women & Child Helpline</h5>
              <p className="text-[11px] text-slate-400">24/7 Crisis Support</p>
            </a>

            <a
              href="tel:333"
              className="p-5 rounded-2xl bg-slate-900/90 border border-blue-500/30 hover:border-blue-500/60 text-center space-y-1.5 transition shadow-lg block group"
            >
              <span className="text-3xl sm:text-4xl font-extrabold text-blue-400 font-mono group-hover:scale-105 inline-block transition">
                333
              </span>
              <h5 className="text-xs font-bold text-slate-200 font-display">Citizen Information</h5>
              <p className="text-[11px] text-slate-400">Government Services & Complaints</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
