import React, { useState, useEffect } from 'react';
import {
  Flame,
  AlertTriangle,
  CloudRain,
  ShieldAlert,
  X,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  Radio
} from 'lucide-react';
import { EmergencyAlert, EmergencyType, AlertSeverity } from '../../types';

interface Props {
  alerts: EmergencyAlert[];
}

export const EmergencyAlertBanner: React.FC<Props> = ({ alerts }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [timeLefts, setTimeLefts] = useState<Record<string, string>>({});

  const visibleAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id) && a.isActive);

  useEffect(() => {
    const updateCountdowns = () => {
      const newTimes: Record<string, string> = {};
      alerts.forEach(alert => {
        const diff = new Date(alert.expirationTime).getTime() - Date.now();
        if (diff <= 0) {
          newTimes[alert.id] = 'Expired';
        } else {
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const secs = Math.floor((diff % (1000 * 60)) / 1000);
          newTimes[alert.id] = `${hours}h ${mins}m remaining`;
        }
      });
      setTimeLefts(newTimes);
    };

    updateCountdowns();
    const interval = setInterval(updateCountdowns, 60000); // 1-minute resolution to avoid constant re-renders
    return () => clearInterval(interval);
  }, [alerts]);

  if (visibleAlerts.length === 0) return null;

  // Determine highest severity
  const hasCritical = visibleAlerts.some(a => a.severity === AlertSeverity.CRITICAL);
  const hasHigh = visibleAlerts.some(a => a.severity === AlertSeverity.HIGH);

  const getAlertIcon = (type: EmergencyType) => {
    switch (type) {
      case EmergencyType.MAJOR_FIRE:
        return <Flame className="w-4 h-4 text-red-400 flex-shrink-0" />;
      case EmergencyType.WEATHER_HAZARD:
        return <CloudRain className="w-4 h-4 text-amber-400 flex-shrink-0" />;
      case EmergencyType.ATTACK:
      case EmergencyType.CIVIL_UNREST:
        return <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
    }
  };

  const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
      case AlertSeverity.CRITICAL:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-red-600/30 text-red-300 border border-red-500/40">
            CRITICAL EMERGENCY
          </span>
        );
      case AlertSeverity.HIGH:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-600/30 text-amber-300 border border-amber-500/40">
            HIGH PRIORITY
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-slate-800 text-slate-300 border border-slate-700">
            PUBLIC ADVISORY
          </span>
        );
    }
  };

  return (
    <aside
      aria-label="Active emergency public safety broadcast"
      className={`w-full border-b backdrop-blur-md transition-all z-30 ${
        hasCritical
          ? 'bg-gradient-to-r from-red-950/80 via-slate-900/90 to-red-950/80 border-red-500/30 shadow-lg'
          : hasHigh
          ? 'bg-gradient-to-r from-amber-950/60 via-slate-900/90 to-amber-950/60 border-amber-500/30'
          : 'bg-slate-900/90 border-slate-800'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex h-2.5 w-2.5 relative flex-shrink-0">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  hasCritical ? 'bg-red-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  hasCritical ? 'bg-red-500' : 'bg-amber-500'
                }`}
              />
            </span>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-display font-bold text-xs tracking-wide text-white flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 ${hasCritical ? 'text-red-400' : 'text-amber-400'}`} />
                POLICE PUBLIC SAFETY BROADCAST
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium border ${
                  hasCritical
                    ? 'bg-red-500/20 text-red-300 border-red-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}
              >
                {visibleAlerts.length} Active {visibleAlerts.length === 1 ? 'Notice' : 'Notices'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition"
              title="Toggle Alert Details"
            >
              <span className="text-[11px] font-medium">{isExpanded ? 'Collapse' : 'Details'}</span>
              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="mt-2 space-y-2 pt-2 border-t border-slate-800/80">
            {visibleAlerts.map(alert => (
              <div
                key={alert.id}
                className="bg-slate-950/70 border border-slate-800 rounded-xl p-3 text-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2.5 shadow-sm"
              >
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {getAlertIcon(alert.emergencyType)}
                    <h4 className="font-semibold text-slate-100 text-xs sm:text-sm font-display tracking-tight">
                      {alert.title}
                    </h4>
                    {getSeverityBadge(alert.severity)}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                    {alert.message}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                    <span className="flex items-center gap-1 text-slate-300">
                      <MapPin className="w-3 h-3 text-red-400" />
                      Zone: <strong className="text-slate-200">{alert.affectedArea}</strong>
                    </span>
                    <span className="flex items-center gap-1 font-mono text-amber-300">
                      <Clock className="w-3 h-3" />
                      {timeLefts[alert.id] || 'Active'}
                    </span>
                    <span className="text-slate-500">
                      Issued: {alert.issuedByStation}
                    </span>
                  </div>
                </div>

                <div className="flex items-center self-end md:self-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setDismissedAlerts(prev => [...prev, alert.id])}
                    className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
                    title="Dismiss alert"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
};
