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
  Barcode,
  Activity,
  Zap,
  Layers,
  Cpu
} from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { BrandLogo } from '../common/BrandLogo';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onNavigateToDashboard?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenLogin,
  onOpenRegister,
  onNavigateToDashboard
}) => {
  const { user, logout } = useAuth();

  return (
    <div className="w-full min-h-screen text-slate-100 selection:bg-[#02baff] selection:text-slate-950 font-sans">
      {/* FUTURISTIC HERO SECTION (Inspired by Fixile AI Interface) */}
      <section className="relative overflow-hidden pt-10 pb-16 sm:pb-20 border-b border-[#02baff]/15 bg-gradient-to-b from-[#05070e] via-[#080d1a] to-[#05070e]">
        {/* Hologram radial background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-gradient-to-b from-[#0147bf]/20 via-[#02baff]/10 to-transparent blur-3xl pointer-events-none -z-0" />

        <div className="max-w-6xl mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left Column: Mission & Controls */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-['Orbitron'] leading-[1.1]">
                INTELLIGENT <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#02baff] via-sky-300 to-[#0147bf]">
                  PUBLIC DEFENSE
                </span>
              </h1>

              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0 font-sans">
                Next-generation civil safety and consumer rights enforcement. Real-time emergency distress routing, verified crime investigations, and DNCRP merchant dispute resolution.
              </p>

              {/* Telemetry Progress Bars (Inspired by Fixile UI telemetry) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 max-w-md mx-auto lg:mx-0 text-left">
                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-[#02baff]/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Response Speed</span>
                    <span className="text-[#02baff] font-bold font-['Orbitron']">98.4%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0147bf] to-[#02baff] w-[98%]" />
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/80 border border-[#02baff]/20 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">NID Cryptographic Match</span>
                    <span className="text-[#02baff] font-bold font-['Orbitron']">100%</span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0147bf] to-[#02baff] w-[100%]" />
                  </div>
                </div>
              </div>

              {/* Primary Call to Actions */}
              {user ? (
                <div className="space-y-3 pt-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-900/90 border border-[#02baff]/30 text-xs text-slate-300 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#02baff]" />
                    <span>Session: <strong className="text-white">{user.fullName}</strong> ({user.role})</span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                    <button
                      onClick={onNavigateToDashboard}
                      className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-['Orbitron'] font-bold text-xs tracking-wider transition shadow-xl shadow-[#0147bf]/30 flex items-center justify-center gap-2.5 group active:scale-95"
                    >
                      <UserCheck className="w-4 h-4 text-white" />
                      <span>
                        LAUNCH {user.role === UserRole.CITIZEN ? 'CITIZEN DASHBOARD' : `${user.role} CONSOLE`}
                      </span>
                      <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
                    </button>

                    <button
                      onClick={logout}
                      className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900/80 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 text-xs font-semibold transition"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <button
                    onClick={onOpenRegister}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-['Orbitron'] font-bold text-xs tracking-wider transition shadow-xl shadow-[#0147bf]/30 flex items-center justify-center gap-2.5 group active:scale-95"
                  >
                    <UserCheck className="w-4 h-4 text-white" />
                    <span>VERIFY NID & ENTER</span>
                    <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    onClick={onOpenLogin}
                    className="w-full sm:w-auto px-8 py-4 rounded-xl bg-slate-900/90 hover:bg-slate-800/90 text-slate-200 border border-[#02baff]/30 hover:border-[#02baff]/60 font-['Orbitron'] font-semibold text-xs tracking-wider transition flex items-center justify-center gap-2 active:scale-95 shadow-md"
                  >
                    <Lock className="w-4 h-4 text-[#02baff]" />
                    <span>OFFICIAL SIGN IN</span>
                  </button>
                </div>
              )}
            </div>

            {/* Right Column: Holographic Logo Showcase & Visual Terminal */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center relative">
              <div className="relative w-full max-w-sm aspect-square flex items-center justify-center">
                {/* Orbital radar rings */}
                <div className="hero-radar-pulse absolute inset-0 rounded-full border border-[#02baff]/20" />
                <div className="hero-radar-orbit absolute inset-6 rounded-full border border-dashed border-[#0147bf]/35">
                  <span className="absolute left-1/2 top-0 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#02baff] shadow-[0_0_14px_3px_rgba(2,186,255,0.55)]" />
                </div>
                <div className="hero-radar-inner absolute inset-12 rounded-full border border-[#02baff]/15" />

                {/* Central Futuristic Brand Emblem */}
                <div className="hero-emblem-card hero-emblem-float relative z-10 w-48 h-48 rounded-3xl bg-gradient-to-br from-[#090e1a] to-[#05070e] border border-[#02baff]/40 flex flex-col items-center justify-center p-6 shadow-2xl shadow-[#0147bf]/40 glow-blue">
                  <BrandLogo variant="mark" size="xl" glow={true} />
                  <span className="hero-emblem-label mt-3 text-xs font-['Orbitron'] font-bold tracking-widest text-[#02baff]">
                    SENTINEL-X
                  </span>
                </div>
              </div>

              {/* Quick Telemetry Chips */}
              <div className="w-full grid grid-cols-3 gap-2.5 mt-4">
                <div className="p-3 rounded-xl bg-slate-900/90 border border-[#02baff]/20 text-center">
                  <span className="block text-lg font-black text-white font-['Orbitron']">64</span>
                  <span className="text-[10px] text-slate-400 font-mono">Districts</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-[#02baff]/20 text-center">
                  <span className="block text-lg font-black text-[#02baff] font-['Orbitron']">650+</span>
                  <span className="text-[10px] text-slate-400 font-mono">Stations</span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/90 border border-[#02baff]/20 text-center">
                  <span className="block text-lg font-black text-emerald-400 font-['Orbitron']">24/7</span>
                  <span className="text-[10px] text-slate-400 font-mono">Dispatch</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CORE CAPABILITIES (Minimal, Futuristic, Less Text) */}
      <section className="py-16 sm:py-20 max-w-6xl mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-xs font-['Orbitron'] uppercase tracking-widest text-[#02baff] font-bold">
            PLATFORM CAPABILITIES
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white font-['Orbitron']">
            CIVIC DEFENSE ARCHITECTURE
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Emergency SOS */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#090e1a]/95 to-[#05070e]/95 border border-[#02baff]/20 hover:border-[#02baff]/60 transition-all duration-300 space-y-4 shadow-xl group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-1 bg-[#02baff]" />
            <div className="w-12 h-12 rounded-xl bg-[#0147bf]/20 border border-[#02baff]/30 flex items-center justify-center text-[#02baff] group-hover:scale-105 transition">
              <Radio className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-white font-['Orbitron'] group-hover:text-[#02baff] transition">
              Instant SOS Beacon
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              One-touch emergency distress broadcasting with GPS location matching and automatic Thana police unit routing.
            </p>
            <div className="pt-3 border-t border-slate-800 text-xs text-[#02baff] flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Sub-Second Radar Dispatch</span>
            </div>
          </div>

          {/* Card 2: Whistleblower Sealing */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#090e1a]/95 to-[#05070e]/95 border border-[#02baff]/20 hover:border-[#02baff]/60 transition-all duration-300 space-y-4 shadow-xl group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-1 bg-[#0147bf]" />
            <div className="w-12 h-12 rounded-xl bg-[#0147bf]/20 border border-[#02baff]/30 flex items-center justify-center text-[#02baff] group-hover:scale-105 transition">
              <EyeOff className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-white font-['Orbitron'] group-hover:text-[#02baff] transition">
              Whistleblower Sealing
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Lodge sensitive corruption and crime reports with cryptographic identity protection backed by national privacy standards.
            </p>
            <div className="pt-3 border-t border-slate-800 text-xs text-[#02baff] flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tamper-Proof Audit Trail</span>
            </div>
          </div>

          {/* Card 3: Consumer Protection */}
          <div className="p-8 rounded-3xl bg-gradient-to-br from-[#090e1a]/95 to-[#05070e]/95 border border-[#02baff]/20 hover:border-[#02baff]/60 transition-all duration-300 space-y-4 shadow-xl group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-8 h-1 bg-amber-500" />
            <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 group-hover:scale-105 transition">
              <Scale className="w-6 h-6 stroke-[2]" />
            </div>
            <h3 className="text-base font-bold text-white font-['Orbitron'] group-hover:text-amber-400 transition">
              DNCRP Consumer Rights
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Report price gouging and fake BSTI barcodes to DNCRP with legal claim to 25% of all realized administrative fines.
            </p>
            <div className="pt-3 border-t border-slate-800 text-xs text-amber-400 flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>DNCRP Act 2009 Integration</span>
            </div>
          </div>
        </div>
      </section>

      {/* EMERGENCY HOTLINES DIRECTORY (Modern Card Grid) */}
      <section className="py-12 sm:py-14 bg-[#05070e] border-t border-[#02baff]/15">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <span className="text-[10px] font-['Orbitron'] text-[#02baff] uppercase tracking-widest font-bold block">
                NATIONAL DIRECTORY
              </span>
              <h3 className="text-lg sm:text-2xl font-black text-white font-['Orbitron'] mt-0.5">
                Government Emergency Hotlines
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Toll-Free Nationwide Services</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <a
              href="tel:999"
              className="p-5 rounded-2xl bg-[#090e1a] border border-red-500/30 hover:border-red-500/70 text-center space-y-1 transition-all duration-300 block group hover:-translate-y-1"
            >
              <span className="text-3xl font-black text-red-400 font-['Orbitron'] block">999</span>
              <h5 className="text-xs font-bold text-white font-['Orbitron']">National Emergency</h5>
              <p className="text-[10px] text-slate-400 font-mono">Police, Fire & Ambulance</p>
            </a>

            <a
              href="tel:16121"
              className="p-5 rounded-2xl bg-[#090e1a] border border-amber-500/30 hover:border-amber-500/70 text-center space-y-1 transition-all duration-300 block group hover:-translate-y-1"
            >
              <span className="text-3xl font-black text-amber-400 font-['Orbitron'] block">16121</span>
              <h5 className="text-xs font-bold text-white font-['Orbitron']">Consumer Protection</h5>
              <p className="text-[10px] text-slate-400 font-mono">DNCRP Grievance Cell</p>
            </a>

            <a
              href="tel:109"
              className="p-5 rounded-2xl bg-[#090e1a] border border-[#02baff]/30 hover:border-[#02baff]/70 text-center space-y-1 transition-all duration-300 block group hover:-translate-y-1"
            >
              <span className="text-3xl font-black text-[#02baff] font-['Orbitron'] block">109</span>
              <h5 className="text-xs font-bold text-white font-['Orbitron']">Women & Child Helpline</h5>
              <p className="text-[10px] text-slate-400 font-mono">24/7 Crisis Support</p>
            </a>

            <a
              href="tel:333"
              className="p-5 rounded-2xl bg-[#090e1a] border border-[#0147bf]/40 hover:border-[#02baff]/70 text-center space-y-1 transition-all duration-300 block group hover:-translate-y-1"
            >
              <span className="text-3xl font-black text-sky-400 font-['Orbitron'] block">333</span>
              <h5 className="text-xs font-bold text-white font-['Orbitron']">Citizen Info Service</h5>
              <p className="text-[10px] text-slate-400 font-mono">Government Grievance</p>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};
