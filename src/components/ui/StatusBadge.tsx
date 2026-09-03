import React from 'react';
import {
  CheckCircle2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Radio,
  FileCheck,
  ShieldAlert,
  Search,
  Scale
} from 'lucide-react';
import {
  ReportStatus,
  ComplaintStatus,
  SOSStatus,
  CrimeSeverity,
  AlertSeverity
} from '../../types';

type BadgeType =
  | ReportStatus
  | ComplaintStatus
  | SOSStatus
  | CrimeSeverity
  | AlertSeverity
  | 'AUTHENTIC'
  | 'COUNTERFEIT_FLAGGED'
  | 'CONFIDENTIAL'
  | 'ACTIVE'
  | 'EXPIRED'
  | string;

interface StatusBadgeProps {
  status: BadgeType;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
  showIcon = true
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      // Success / Verified / Resolved
      case ReportStatus.CASE_CLOSED:
      case ComplaintStatus.RESOLVED:
      case SOSStatus.RESOLVED:
      case 'AUTHENTIC':
      case 'ACTIVE':
        return {
          bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          icon: CheckCircle2,
          label: status.replace(/_/g, ' ')
        };

      // Police Verified / Assigned / Active Investigation
      case ReportStatus.VERIFIED:
      case ReportStatus.OFFICER_ASSIGNED:
      case ReportStatus.INVESTIGATION:
      case ComplaintStatus.VERIFIED:
      case ComplaintStatus.INVESTIGATION:
        return {
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400',
          icon: ShieldCheck,
          label: status.replace(/_/g, ' ')
        };

      // Pending / Under Review / Submitted
      case ReportStatus.SUBMITTED:
      case ComplaintStatus.SUBMITTED:
      case ComplaintStatus.UNDER_REVIEW:
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: Clock,
          label: status.replace(/_/g, ' ')
        };

      // SOS / Critical / Emergency
      case SOSStatus.SOS_SENT:
      case SOSStatus.RESPONDING:
      case AlertSeverity.CRITICAL:
      case CrimeSeverity.CRITICAL:
        return {
          bg: 'bg-red-500/15 text-red-400 border-red-500/40 animate-pulse-subtle',
          dot: 'bg-red-400',
          icon: Radio,
          label: status.replace(/_/g, ' ')
        };

      // Rejected / Flagged / Counterfeit
      case ReportStatus.REJECTED:
      case ComplaintStatus.REJECTED:
      case 'COUNTERFEIT_FLAGGED':
        return {
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          icon: XCircle,
          label: status.replace(/_/g, ' ')
        };

      // Severity indicators
      case CrimeSeverity.HIGH:
      case AlertSeverity.HIGH:
        return {
          bg: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          dot: 'bg-orange-400',
          icon: AlertTriangle,
          label: `${status} PRIORITY`
        };

      case CrimeSeverity.MEDIUM:
      case AlertSeverity.MODERATE:
        return {
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          icon: Clock,
          label: status
        };

      case CrimeSeverity.LOW:
        return {
          bg: 'bg-slate-500/10 text-slate-400 border-slate-500/30',
          dot: 'bg-slate-400',
          icon: CheckCircle2,
          label: 'LOW'
        };

      case 'CONFIDENTIAL':
        return {
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dot: 'bg-purple-400',
          icon: ShieldAlert,
          label: 'CONFIDENTIAL'
        };

      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          dot: 'bg-slate-400',
          icon: Clock,
          label: status.replace(/_/g, ' ')
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px] gap-1 font-mono',
    md: 'px-2.5 py-1 text-xs gap-1.5 font-medium',
    lg: 'px-3 py-1.5 text-xs gap-2 font-semibold'
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4'
  };

  return (
    <span
      className={`inline-flex items-center rounded-md border tracking-wide uppercase transition-colors select-none ${config.bg} ${sizeClasses[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} flex-shrink-0`} />
      {showIcon && <Icon className={`${iconSizes[size]} flex-shrink-0`} />}
      <span>{config.label}</span>
    </span>
  );
};
