import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'slate';
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'emerald',
  trend,
  onClick,
  className = ''
}) => {
  const variantStyles = {
    emerald: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      iconBg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      highlight: 'text-emerald-400',
      borderGlow: 'hover:border-emerald-500/40'
    },
    blue: {
      bg: 'bg-blue-500/10 border-blue-500/20 text-blue-400',
      iconBg: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
      highlight: 'text-blue-400',
      borderGlow: 'hover:border-blue-500/40'
    },
    amber: {
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      iconBg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      highlight: 'text-amber-400',
      borderGlow: 'hover:border-amber-500/40'
    },
    red: {
      bg: 'bg-red-500/10 border-red-500/20 text-red-400',
      iconBg: 'bg-red-500/15 text-red-400 border-red-500/30',
      highlight: 'text-red-400',
      borderGlow: 'hover:border-red-500/40'
    },
    purple: {
      bg: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
      iconBg: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
      highlight: 'text-purple-400',
      borderGlow: 'hover:border-purple-500/40'
    },
    slate: {
      bg: 'bg-slate-800/40 border-slate-700/50 text-slate-300',
      iconBg: 'bg-slate-800 text-slate-300 border-slate-700',
      highlight: 'text-slate-200',
      borderGlow: 'hover:border-slate-600'
    }
  };

  const style = variantStyles[variant];

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 shadow-lg backdrop-blur-sm transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${style.borderGlow} ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <span className="text-xs font-medium text-slate-400 tracking-wide uppercase font-mono">
            {title}
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-white font-display tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-xs font-mono font-medium ${
                  trend.isPositive ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-400 truncate pt-0.5">
              {subtitle}
            </p>
          )}
        </div>

        <div className={`w-11 h-11 rounded-xl flex items-center justify-center border flex-shrink-0 ${style.iconBg}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};
