import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'blue' | 'amber' | 'red' | 'purple' | 'slate' | 'cyan';
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
  variant = 'cyan',
  trend,
  onClick,
  className = ''
}) => {
  // Icon color only — container is always the same dark neutral
  const iconColor: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-[#02baff]',
    cyan: 'text-[#02baff]',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    slate: 'text-slate-300',
  };

  const accentColor: Record<string, string> = {
    emerald: 'text-emerald-400',
    blue: 'text-[#02baff]',
    cyan: 'text-[#02baff]',
    amber: 'text-amber-400',
    red: 'text-red-400',
    purple: 'text-purple-400',
    slate: 'text-slate-300',
  };

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-2xl bg-[#090e1a] border border-white/5 shadow-xl transition-all duration-300 hover:border-[#02baff]/30 group ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      } ${className}`}
    >
      {/* Top-left cyan accent line */}
      <div className="absolute top-0 left-0 w-6 h-0.5 bg-[#02baff]/50 group-hover:w-10 transition-all duration-300 rounded-full" />

      <div className="flex items-start justify-between gap-3 relative z-10">
        <div className="space-y-1 min-w-0">
          <span className="text-[10px] font-bold text-slate-500 tracking-widest uppercase font-['Orbitron']">
            {title}
          </span>
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-2xl sm:text-3xl font-black text-white font-['Orbitron'] tracking-tight">
              {value}
            </span>
            {trend && (
              <span
                className={`text-[10px] font-mono font-bold ${
                  trend.isPositive ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {trend.value}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-[11px] text-slate-500 truncate pt-0.5 font-mono">
              {subtitle}
            </p>
          )}
        </div>

        {/* Icon container: always dark neutral bg, only icon tinted */}
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 border border-white/10 flex-shrink-0 group-hover:bg-white/8 transition-colors duration-300">
          <Icon className={`w-5 h-5 ${iconColor[variant] ?? 'text-[#02baff]'}`} />
        </div>
      </div>
    </div>
  );
};
