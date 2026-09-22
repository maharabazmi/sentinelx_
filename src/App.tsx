import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { EmergencyAlertBanner } from './components/common/EmergencyAlertBanner';
import { LoginModal } from './components/auth/LoginModal';
import { RegisterWizard } from './components/auth/RegisterWizard';
import { AdminClearanceModal } from './components/auth/AdminClearanceModal';
import { ForcePasswordChangeModal } from './components/auth/ForcePasswordChangeModal';
import { LandingPage } from './components/public/LandingPage';
import { CitizenDashboard } from './components/citizen/CitizenDashboard';
import { PoliceDashboard } from './components/police/PoliceDashboard';
import { ConsumerDashboard } from './components/consumer/ConsumerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserRole } from './types';
import { Shield, Lock, PhoneCall } from 'lucide-react';
import { BrandLogo } from './components/common/BrandLogo';

const AppContent: React.FC = () => {
  const { user, activeAlerts } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isAdminClearanceOpen, setIsAdminClearanceOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState<'home' | 'dashboard'>('home');

  // Classified admin keyboard shortcut (Ctrl + Alt + A)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        setIsAdminClearanceOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Classified URL hash route (#/hq-clearance or #/admin-clearance)
  React.useEffect(() => {
    const checkHash = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash === '#/hq-clearance' || hash === '#/admin-clearance' || hash === '#/restricted-ops') {
        setIsAdminClearanceOpen(true);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // When user logs out, always return to landing page ('home')
  React.useEffect(() => {
    if (!user) {
      setCurrentTab('home');
    } else {
      // Auto-redirect to dashboard on login / registration
      setCurrentTab('dashboard');
    }
  }, [user]);


  const renderMainContent = () => {
    // 1. Initial run or explicit 'home' tab selection: Always land on Public Landing Page
    if (currentTab === 'home' || !user) {
      return (
        <LandingPage
          onOpenLogin={() => setIsLoginOpen(true)}
          onOpenRegister={() => setIsRegisterOpen(true)}
          onNavigateToDashboard={() => setCurrentTab('dashboard')}
        />
      );
    }

    // 2. Security Clearance Protocol: If authority account must change temp password, keep dashboard locked
    if (user.mustChangePassword) {
      return (
        <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white font-['Orbitron']">
            Security Clearance Protocol
          </h2>
          <p className="text-xs text-slate-400 max-w-md">
            Officer credential initialization in progress. Please establish your permanent security password to access operational modules.
          </p>
        </div>
      );
    }

    // 3. Active Dashboard Views (when authenticated and currentTab === 'dashboard')
    switch (user.role) {
      case UserRole.CITIZEN:
        return <CitizenDashboard />;
      case UserRole.POLICE:
        return <PoliceDashboard />;
      case UserRole.CONSUMER_RIGHTS:
        return <ConsumerDashboard />;
      case UserRole.ADMIN:
        return <AdminDashboard />;
      default:
        return <CitizenDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-body)] flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950 transition-colors duration-250">
      {/* Temporary Emergency Alert Broadcast Banner */}
      <EmergencyAlertBanner alerts={activeAlerts} />

      {/* Main Header */}
      <Header
        onOpenLogin={() => setIsLoginOpen(true)}
        onOpenRegister={() => setIsRegisterOpen(true)}
        onOpenAdminClearance={() => setIsAdminClearanceOpen(true)}
        currentTab={currentTab}
        onSelectTab={tab => setCurrentTab(tab as 'home' | 'dashboard')}
      />

      {/* Main Role Content */}
      <main className="flex-1">
        {renderMainContent()}
      </main>

      {/* Footer */}
      <footer className="w-full bg-[var(--bg-body)] border-t border-[#02baff]/15 py-8 px-4 text-xs text-slate-400 transition-colors duration-250">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <BrandLogo variant="mark" size="sm" />
            <div>
              <span className="font-bold text-white font-['Orbitron'] tracking-wider text-xs">
                SENTINEL<span className="text-[#02baff]">X</span> BANGLADESH
              </span>
              <p className="text-[10px] text-slate-500 font-mono">
                National Public Safety & Consumer Integrity Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] font-mono">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-[#02baff] animate-pulse" />
              NID Verification Standard
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              Emergency 999 • DNCRP 16121
            </span>
          </div>

          <div className="text-[10px] text-slate-500 font-mono">
            &copy; {new Date().getFullYear()} Government of Bangladesh • Civil Safety Initiative
          </div>
        </div>
      </footer>

      {/* Auth Modals */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onSwitchToRegister={() => {
          setIsLoginOpen(false);
          setIsRegisterOpen(true);
        }}
      />

      <RegisterWizard
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSwitchToLogin={() => {
          setIsRegisterOpen(false);
          setIsLoginOpen(true);
        }}
      />

      {/* Classified Admin Clearance Modal */}
      <AdminClearanceModal
        isOpen={isAdminClearanceOpen}
        onClose={() => setIsAdminClearanceOpen(false)}
      />

      {/* Mandatory First-Login Password Change Modal */}
      <ForcePasswordChangeModal />
    </div>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
