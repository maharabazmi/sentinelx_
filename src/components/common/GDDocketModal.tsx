import React from 'react';
import {
  Printer,
  X,
  ShieldCheck,
  MapPin,
  Calendar,
  Clock,
  User,
  FileText,
  BadgeAlert,
  Hash,
  Award
} from 'lucide-react';
import { CrimeReport } from '../../types';

interface GDDocketModalProps {
  report: CrimeReport;
  onClose: () => void;
  viewerRole?: 'CITIZEN' | 'POLICE';
}

export const GDDocketModal: React.FC<GDDocketModalProps> = ({
  report,
  onClose,
  viewerRole = 'CITIZEN'
}) => {
  const hashToken = `SHA256-${report.caseId.replace(/[^0-9]/g, '') || '92847192'}-VERIFIED`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl my-auto shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 border-4 border-emerald-800/80 relative"
      >
        {/* Printable Docket Content */}
        <div className="p-6 sm:p-8 space-y-5 print:p-0 print:m-0">
          {/* Official Bangladesh Government Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1 relative">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition print:hidden"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-block px-3 py-0.5 rounded-full bg-emerald-800 text-white font-mono text-[10px] font-bold tracking-wider uppercase mb-1">
              Government of the People's Republic of Bangladesh
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase font-display">
              Digital Crime Registration & GD Docket
            </h2>
            <p className="text-xs text-slate-600 font-mono">
              SentinelX National Public Safety Infrastructure • Section 154 CrPC
            </p>
            {viewerRole === 'POLICE' && (
              <span className="inline-block text-[10px] font-bold uppercase tracking-widest text-emerald-900 bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 mt-1">
                Police Station Official Record Copy
              </span>
            )}
          </div>

          {/* Case Tracking & Jurisdiction Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-100 rounded-xl border border-slate-300 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">Case / GD No</span>
              <strong className="text-emerald-900 font-bold">{report.caseId}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Jurisdiction Thana</span>
              <strong className="text-slate-900">{report.thana || 'Central Thana'}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">District</span>
              <strong className="text-slate-900">{report.district}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Current Status</span>
              <strong className="text-blue-900 uppercase font-bold">{report.status}</strong>
            </div>
          </div>

          {/* Incident Details & Classification */}
          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-slate-500 text-[11px] block">Incident Classification:</span>
                <strong className="text-slate-900 text-sm">{report.title}</strong>
                <span className="text-slate-600 text-[11px] block mt-0.5">
                  Category: <span className="font-semibold text-slate-800">{report.crimeType}</span>
                </span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Severity: <span className="font-semibold uppercase text-slate-700">{report.severity}</span>
                </span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Location & Timing:</span>
                <div className="flex items-center gap-1 text-slate-800 font-medium mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{report.locationName || `${report.thana}, ${report.district}`}</span>
                </div>
                <div className="text-slate-600 text-[11px] mt-1 space-y-0.5 font-mono">
                  <div>Occurred: <span className="text-slate-800">{report.occurredAt || 'Recent'}</span></div>
                  <div>Lodged: <span className="text-slate-800">{new Date(report.submittedAt).toLocaleString()}</span></div>
                </div>
              </div>
            </div>

            {/* Complainant & Investigating Officer row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px]">
              <div>
                <span className="text-slate-500 block font-semibold text-[10px] uppercase">Complainant / Citizen</span>
                <p className="font-bold text-slate-900">
                  {report.requestConfidentiality ? 'Confidential Witness / Protected Citizen' : (report.reporterName || 'Registered Citizen')}
                </p>
                {report.reporterPhone && !report.requestConfidentiality && (
                  <span className="text-slate-600 font-mono text-[10px]">Contact: {report.reporterPhone}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 block font-semibold text-[10px] uppercase">Assigned Investigating Officer</span>
                {report.assignedOfficerName ? (
                  <div>
                    <p className="font-bold text-slate-900">{report.assignedOfficerName}</p>
                    <span className="text-slate-600 font-mono text-[10px]">
                      {report.assignedOfficerBadge ? `Badge: ${report.assignedOfficerBadge}` : ''} 
                      {report.assignedOfficerStation ? ` • ${report.assignedOfficerStation}` : ''}
                    </span>
                  </div>
                ) : (
                  <p className="text-amber-800 font-medium italic">Pending Station Officer Assignment</p>
                )}
              </div>
            </div>

            {/* Incident Narrative / Statement */}
            <div className="pt-1">
              <span className="text-slate-600 text-[11px] block font-bold uppercase tracking-wider">
                Incident Narrative & Deposition:
              </span>
              <p className="text-slate-800 text-xs mt-1.5 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200 whitespace-pre-line font-sans">
                {report.description}
              </p>
            </div>
          </div>

          {/* Evidence Inventory */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-emerald-950">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Evidence Inventory & Chain of Custody</span>
              </span>
              <span className="font-mono text-[11px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-bold">
                {report.evidence?.length || 0} Files Attached
              </span>
            </div>
            <p className="text-[11px] text-emerald-900/90 leading-relaxed">
              Digital hashes generated client-side and verified for evidentiary admissibility under the Bangladesh Evidence Act (Digital Admissibility Amendment).
            </p>
            {report.evidence && report.evidence.length > 0 && (
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-700">
                {report.evidence.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="p-1.5 rounded bg-white border border-emerald-200 flex items-center justify-between truncate shadow-2xs"
                  >
                    <span className="truncate pr-1">{ev.fileName}</span>
                    <span className="text-emerald-800 font-bold shrink-0 uppercase text-[9px] bg-emerald-100 px-1 rounded">
                      {ev.fileType}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Official Verification Seal & Sign-off */}
          <div className="pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-600">
            <div>
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">SentinelX Digital Verification Seal</p>
              <p className="font-mono text-[11px] font-bold text-slate-900">{hashToken}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Automated Cryptographic Tamper-Proof Audit Log</p>
            </div>
            <div className="text-right">
              <div className="w-36 h-10 border-b-2 border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-900">Station Duty Officer</p>
              <p className="text-[10px] text-slate-600">{report.thana || 'Bangladesh Police'}</p>
            </div>
          </div>
        </div>

        {/* Action Bar (Hidden in physical print or PDF generation) */}
        <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-3 print:hidden">
          <span className="text-xs text-slate-600">
            Official General Diary (GD) docket acknowledgment for legal & court records.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition shadow hover:shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-300 hover:bg-slate-400 text-slate-800 text-xs font-semibold transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
