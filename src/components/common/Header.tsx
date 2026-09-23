import React, { useState, useRef, useEffect } from 'react';
import {
  Shield,
  Bell,
  LogOut,
  LogIn,
  UserPlus,
  PhoneCall,
  ChevronDown,
  Moon,
  Sun
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserRole } from '../../types';

import { BrandLogo } from './BrandLogo';

interface HeaderProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onOpenAdminClearance?: () => void;
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLogin,
  onOpenRegister,
  onOpenAdminClearance,
  currentTab,
  onSelectTab
}) => {
  const {
    user,
    logout,
    notifications,
    unreadCount,
    markNotificationRead,
    activeAlerts
  } = useAuth();
  const { theme, setTheme } = useTheme();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showHotlines, setShowHotlines] = useState(false);
  const [emblemClicks, setEmblemClicks] = useState(0);
  const clickTimerRef = useRef<any>(null);


  const handleEmblemClick = () => {
    onSelectTab('home');
    setEmblemClicks(prev => {
      const next = prev + 1;
      if (next >= 5) {
        if (onOpenAdminClearance) onOpenAdminClearance();
        return 0;
      }
      return next;
    });

    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setEmblemClicks(0);
    }, 2500);
  };

  const notifRef = useRef<HTMLDivElement>(null);
  const hotlineRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (hotlineRef.current && !hotlineRef.current.contains(event.target as Node)) {
        setShowHotlines(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case UserRole.POLICE:
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
            POLICE COMMAND
          </span>
        );
      case UserRole.CONSUMER_RIGHTS:
        const dncrpCategory = [
          'Complaint Intake Officer',
          'Investigation Officer',
          'Adjudication Officer'
        ].includes(user?.designation || '')
          ? user?.designation
          : 'DNCRP AUTHORITY';
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 font-mono whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            {dncrpCategory}
          </span>
        );
      case UserRole.ADMIN:
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
            NATIONAL ADMIN
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[11px] font-bold rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            VERIFIED CITIZEN
          </span>
        );
    }
  };

  return (
    <header className="w-full bg-[var(--bg-header)] border-b border-slate-200 dark:border-slate-800/80 backdrop-blur-md sticky top-0 z-40 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Brand Emblem */}
        <div
          onClick={handleEmblemClick}
          className="cursor-pointer group select-none flex-shrink-0"
        >
          <BrandLogo variant="full" size="md" showBadge={true} badgeText="BD" />
        </div>

        {/* Right Action Bar */}
        <div className="flex items-center gap-2 sm:gap-2.5">

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-lg bg-slate-900/90 light:bg-white hover:bg-slate-800 light:hover:bg-slate-100 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 border border-slate-800 light:border-slate-300 transition"
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Emergency Hotlines Dropdown */}
          <div className="relative" ref={hotlineRef}>
            <button
              onClick={() => setShowHotlines(!showHotlines)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-950/40 light:bg-red-50 text-red-300 light:text-red-700 border border-red-500/30 hover:bg-red-900/50 light:hover:bg-red-100 transition shadow-sm"
              title="National Emergency Hotlines"
            >
              <PhoneCall className="w-3.5 h-3.5 text-red-500 dark:text-red-400 animate-pulse" />
              <span className="hidden sm:inline">Emergency 999</span>
              <span className="sm:hidden font-mono font-bold">999</span>
              <ChevronDown className="w-3 h-3 text-red-500 dark:text-red-400" />
            </button>

            {showHotlines && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5 font-display">
                    <PhoneCall className="w-3.5 h-3.5 text-red-400" />
                    Bangladesh National Hotlines
                  </h4>
                </div>
                <div className="space-y-2 mt-2.5 text-xs">
                  <a
                    href="tel:999"
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between hover:border-red-500/40 hover:bg-red-950/30 transition group"
                  >
                    <div>
                      <span className="font-bold text-red-400 font-mono text-sm">999</span>
                      <p className="text-[11px] text-slate-400">National Emergency (Police, Fire, Ambulance)</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/20 text-red-300 font-mono font-bold">Toll-Free</span>
                  </a>

                  <a
                    href="tel:16121"
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between hover:border-amber-500/40 hover:bg-amber-950/30 transition group"
                  >
                    <div>
                      <span className="font-bold text-amber-400 font-mono text-sm">16121</span>
                      <p className="text-[11px] text-slate-400">National Consumer Rights (DNCRP)</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">Disputes</span>
                  </a>

                  <a
                    href="tel:109"
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between hover:border-emerald-500/40 hover:bg-emerald-950/30 transition group"
                  >
                    <div>
                      <span className="font-bold text-emerald-400 font-mono text-sm">109</span>
                      <p className="text-[11px] text-slate-400">Violence Against Women & Children</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">24/7</span>
                  </a>

                  <a
                    href="tel:333"
                    className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-between hover:border-blue-500/40 hover:bg-blue-950/30 transition group"
                  >
                    <div>
                      <span className="font-bold text-blue-400 font-mono text-sm">333</span>
                      <p className="text-[11px] text-slate-400">National Information & Public Grievance</p>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono font-bold">Govt</span>
                  </a>
                </div>
              </div>
            )}
          </div>

          {user ? (
            <>
              {/* Notification Drawer */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition"
                  title="Notifications & Alerts"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow font-mono">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-3.5 z-50 max-h-96 overflow-y-auto">
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Bell className="w-4 h-4 text-emerald-400" />
                        <h4 className="text-xs font-bold text-white font-display">System Notifications</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {unreadCount} Unread
                      </span>
                    </div>

                    <div className="divide-y divide-slate-800/80 mt-2 space-y-1">
                      {notifications.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-6">No notifications yet.</p>
                      ) : (
                        notifications.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => {
                              markNotificationRead(notif.id);
                              setShowNotifications(false);
                              const match = (notif.title + ' ' + notif.message).match(/CR-[A-Z]{3}-\d{4}-\d{4}/);
                              const caseId = match ? match[0] : null;
                              window.dispatchEvent(new CustomEvent('open_case_report', {
                                detail: { relatedId: notif.relatedId, caseId }
                              }));
                            }}
                            className={`p-2.5 rounded-xl text-xs cursor-pointer transition ${notif.isRead
                                ? 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/40'
                                : notif.severity === 'EMERGENCY'
                                  ? 'bg-red-950/40 border border-red-500/30 text-slate-200 hover:bg-red-950/60'
                                  : 'bg-slate-800/70 text-slate-200 hover:bg-slate-800 font-medium'
                              }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <h5 className="font-semibold text-slate-200 text-xs">{notif.title}</h5>
                              {!notif.isRead && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 mt-1" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{notif.message}</p>
                            <span className="text-[10px] text-slate-500 block mt-1.5 font-mono">
                              {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>


              {/* User Profile Pill */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800/80">
                <div className="hidden md:flex flex-col items-end">
                  <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                    {user.fullName}
                  </span>
                  {getRoleBadge(user.role)}
                </div>

                <button
                  onClick={logout}
                  className="p-2 rounded-lg bg-slate-900 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-500/30 transition"
                  title="Sign out of session"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900/90 hover:bg-slate-800 text-slate-200 transition border border-[#02baff]/30 hover:border-[#02baff]/60 hover:text-white"
              >
                <LogIn className="w-3.5 h-3.5 text-[#02baff]" />
                <span>Sign In</span>
              </button>
              <button
                onClick={onOpenRegister}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white transition font-['Orbitron'] tracking-wider shadow-lg shadow-[#0147bf]/30"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>NID Register</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
