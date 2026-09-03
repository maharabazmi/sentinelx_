import React, { useState } from 'react';
import { Shield, UserCheck, Flame, Cpu, CheckCircle2, Lock, AlertCircle, Sparkles } from 'lucide-react';
import { UserRole } from '../../types';
import { useAuth } from '../../context/AuthContext';

interface QuickRoleSwitcherProps {
  onRoleSelected?: () => void;
}

export const QuickRoleSwitcher: React.FC<QuickRoleSwitcherProps> = ({ onRoleSelected }) => {
  const { user, switchRole, isLoading, activeViewMode } = useAuth();
  const [feedback, setFeedback] = useState<string | null>(null);

  const roles = [
    {
      role: UserRole.CITIZEN,
      label: 'Citizen Services',
      subtext: 'NID Verified Public Safety',
      icon: UserCheck,
      color: 'emerald',
      badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      permissions: 'Crime Reporting, SOS Distress, Consumer Disputes, Barcode Scans'
    },
    {
      role: UserRole.POLICE,
      label: 'Police Command',
      subtext: 'Insp. Kamrul Islam (DMP)',
      icon: Shield,
      color: 'blue',
      badge: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      permissions: 'Case Verification, Criminal Heatmap, Emergency Broadcasts'
    },
    {
      role: UserRole.CONSUMER_RIGHTS,
      label: 'Consumer Rights (DNCRP)',
      subtext: 'DD Shamim Reza (DNCRP)',
      icon: Flame,
      color: 'amber',
      badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      permissions: 'Complaint Audits, Shop Enforcement, Fine Management'
    },
    {
      role: UserRole.ADMIN,
      label: 'System Admin',
      subtext: 'Dr. Tariqul Alam (HQ)',
      icon: Cpu,
      color: 'purple',
      badge: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      permissions: 'AI Crime Prediction, Audit Trail, System Governance'
    }
  ];

  const isRoleAllowed = (targetRole: UserRole): boolean => {
    if (!user) {
      return targetRole === UserRole.CITIZEN;
    }
    if (user.role === UserRole.CITIZEN) {
      return targetRole === UserRole.CITIZEN;
    }
    return targetRole === UserRole.CITIZEN || targetRole === user.role;
  };

  const handleRoleClick = async (targetRole: UserRole) => {
    setFeedback(null);
    if (!isRoleAllowed(targetRole)) {
      if (!user) {
        setFeedback('Public portal (guest) access is strictly restricted to Citizen Services. Official login with verified government credentials is required for Police, DNCRP, and Admin consoles.');
      } else if (user.role === UserRole.CITIZEN) {
        setFeedback('Citizens are registered as citizens and only take citizen services. Authority consoles are strictly locked.');
      } else {
        setFeedback(`${user.role} personnel cannot switch to other authority agencies. You can only view Citizen services or your own department.`);
      }
      setTimeout(() => setFeedback(null), 4500);
      return;
    }

    try {
      await switchRole(targetRole);
      if (onRoleSelected) onRoleSelected();
    } catch (err: any) {
      setFeedback(err.message || 'Failed to switch role.');
      setTimeout(() => setFeedback(null), 4500);
    }
  };

  const visibleRoles = roles.filter(r => {
    if (r.role === UserRole.ADMIN) {
      return user?.role === UserRole.ADMIN;
    }
    return true;
  });

  return (
    <div className="w-full bg-slate-950 border-b border-slate-900 px-4 py-1.5 text-xs select-none">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-2">
        {/* Security Context Info */}
        <div className="flex items-center gap-2 flex-shrink-0 text-slate-400">
          <span className="font-mono text-[11px] font-semibold flex items-center gap-1.5 tracking-wider uppercase">
            <Shield className="w-3 h-3 text-emerald-400" />
            Active Role:
          </span>
          {user ? (
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-900 text-slate-200 border border-slate-800 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
                {user.role}
              </span>
              {user.role !== UserRole.CITIZEN && (
                <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  activeViewMode === 'CITIZEN'
                    ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    : 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                }`}>
                  {activeViewMode === 'CITIZEN' ? 'Citizen View' : 'Authority View'}
                </span>
              )}
            </div>
          ) : (
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Public Portal (Citizen Guest)
            </span>
          )}
        </div>

        {/* Quick Role Switcher Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap justify-center">
          <span className="text-slate-500 text-[11px] font-medium mr-1 hidden lg:inline">Switch Role:</span>
          {visibleRoles.map(r => {
            const Icon = r.icon;
            const isCurrentlyActive = user
              ? r.role === UserRole.CITIZEN
                ? user.role === UserRole.CITIZEN || activeViewMode === 'CITIZEN'
                : user.role === r.role && activeViewMode === 'AUTHORITY'
              : r.role === UserRole.CITIZEN;

            const allowed = isRoleAllowed(r.role);

            return (
              <button
                key={r.role}
                onClick={() => handleRoleClick(r.role)}
                disabled={isLoading || isCurrentlyActive || !allowed}
                title={
                  !allowed
                    ? !user
                      ? `Official Login Required: ${r.label} is locked for public guest users`
                      : user.role === UserRole.CITIZEN
                      ? 'Citizens are restricted to citizen services'
                      : `Access Restricted from ${user.role}`
                    : r.permissions
                }
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition border ${
                  isCurrentlyActive
                    ? `${r.badge} font-bold shadow-sm ring-1 ring-white/15`
                    : allowed
                    ? 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800 hover:text-white cursor-pointer'
                    : 'bg-slate-950 text-slate-600 border-slate-900 cursor-not-allowed opacity-40'
                }`}
              >
                {!allowed ? (
                  <Lock className="w-3 h-3 text-slate-600" />
                ) : (
                  <Icon className={`w-3 h-3 ${isCurrentlyActive ? 'text-white' : 'text-slate-400'}`} />
                )}
                <span>{r.label}</span>
                {isCurrentlyActive && <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-0.5" />}
              </button>
            );
          })}
        </div>
      </div>

      {feedback && (
        <div className="max-w-7xl mx-auto mt-1.5 p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
