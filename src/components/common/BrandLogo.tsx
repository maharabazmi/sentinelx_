import React from 'react';

interface BrandLogoProps {
  variant?: 'full' | 'mark' | 'letter';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showBadge?: boolean;
  badgeText?: string;
  className?: string;
  glow?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'full',
  size = 'md',
  showBadge = false,
  badgeText = 'BD',
  className = '',
  glow = true
}) => {
  const sizeMap = {
    xs: { h: 'h-6', markH: 'h-6 w-6', text: 'text-sm' },
    sm: { h: 'h-8', markH: 'h-8 w-8', text: 'text-base' },
    md: { h: 'h-10', markH: 'h-10 w-10', text: 'text-lg' },
    lg: { h: 'h-12', markH: 'h-12 w-12', text: 'text-xl' },
    xl: { h: 'h-16', markH: 'h-16 w-16', text: 'text-2xl' },
    '2xl': { h: 'h-24', markH: 'h-24 w-24', text: 'text-4xl' }
  };

  const selectedSize = sizeMap[size];

  if (variant === 'mark') {
    return (
      <div className={`relative inline-flex items-center justify-center ${className}`}>
        {glow && (
          <div className="absolute inset-0 bg-[#02baff]/20 blur-md rounded-full pointer-events-none -z-0" />
        )}
        <img
          src="/Sentinalx_Only Logo Mark-01.svg"
          alt="SentinelX Emblem"
          className={`${selectedSize.markH} object-contain relative z-10 transition-transform duration-300 hover:scale-105 select-none`}
        />
      </div>
    );
  }

  if (variant === 'letter') {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <img
          src="/Sentinalx_Only Letter mark-01.svg"
          alt="SentinelX"
          className={`${selectedSize.h} object-contain select-none`}
        />
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <div className="relative flex items-center justify-center flex-shrink-0">
        {glow && (
          <div className="absolute -inset-1 bg-gradient-to-r from-[#0147bf]/30 via-[#02baff]/30 to-transparent blur-md rounded-xl pointer-events-none" />
        )}
        <div className="w-10 h-10 rounded-xl bg-slate-900/90 border border-[#02baff]/30 flex items-center justify-center p-1.5 shadow-lg shadow-[#0147bf]/20 relative z-10 group-hover:border-[#02baff]/60 transition-all duration-300">
          <img
            src="/Sentinalx_Only Logo Mark-01.svg"
            alt="SentinelX Logo"
            className="w-full h-full object-contain"
          />
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-center gap-1.5">
          <span className="font-['Orbitron'] font-black tracking-wider text-white text-base sm:text-lg uppercase">
            SENTINEL<span className="text-[#02baff]">X</span>
          </span>
          {showBadge && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#0147bf]/20 text-[#02baff] border border-[#02baff]/30 font-['Orbitron'] font-bold tracking-widest uppercase">
              {badgeText}
            </span>
          )}
        </div>
        <span className="text-[10px] text-slate-400 font-mono tracking-tight -mt-0.5">
          Civil Defense & Public Safety
        </span>
      </div>
    </div>
  );
};
