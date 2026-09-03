import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Header } from './components/common/Header';
import { EmergencyAlertBanner } from './components/common/EmergencyAlertBanner';
import { LoginModal } from './components/auth/LoginModal';
import { RegisterWizard } from './components/auth/RegisterWizard';
import { AdminClearanceModal } from './components/auth/AdminClearanceModal';
import { LandingPage } from './components/public/LandingPage';
import { CitizenDashboard } from './components/citizen/CitizenDashboard';
import { PoliceDashboard } from './components/police/PoliceDashboard';
import { ConsumerDashboard } from './components/consumer/ConsumerDashboard';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { UserRole } from './types';
import { Shield, Lock, PhoneCall } from 'lucide-react';

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

    // 2. Active Dashboard Views (when authenticated and currentTab === 'dashboard')
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
      <footer className="w-full bg-[var(--bg-body)] border-t border-slate-200 dark:border-slate-800/80 py-8 px-4 text-xs text-slate-500 dark:text-slate-400 transition-colors duration-250">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="font-bold text-slate-700 dark:text-slate-300 font-['Space_Grotesk']">
                Sentinel<span className="text-emerald-500 dark:text-emerald-400">X</span> Bangladesh
              </span>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                National Public Safety & Consumer Integrity Platform
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Lock className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
              NID Verification Standard
            </span>
            <span className="flex items-center gap-1">
              <PhoneCall className="w-3 h-3 text-red-500 dark:text-red-400" />
              Emergency Police 999 • DNCRP 16121
            </span>
          </div>

          <div className="text-[11px] text-slate-500 dark:text-slate-400">
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
