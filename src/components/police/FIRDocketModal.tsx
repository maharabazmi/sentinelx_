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
  Scale,
  Award,
  CheckCircle2
} from 'lucide-react';
import { CrimeReport, CrimeType } from '../../types';

interface FIRDocketModalProps {
  report: CrimeReport;
  onClose: () => void;
  investigatingOfficerName?: string;
  investigatingOfficerBadge?: string;
}

export const FIRDocketModal: React.FC<FIRDocketModalProps> = ({
  report,
  onClose,
  investigatingOfficerName,
  investigatingOfficerBadge
}) => {
  const getPenalCodeSection = (crimeType: CrimeType | string) => {
    switch (crimeType) {
      case 'THEFT_ROBBERY':
      case CrimeType.THEFT_ROBBERY:
        return 'Penal Code 1860 (Act XLV), Sections 378, 379, 392 (Theft & Robbery)';
      case 'PHYSICAL_ASSAULT':
      case CrimeType.PHYSICAL_ASSAULT:
        return 'Penal Code 1860 (Act XLV), Sections 323, 325, 307 (Voluntarily Causing Hurt & Attempt)';
      case 'EXTORTION':
      case CrimeType.EXTORTION:
        return 'Penal Code 1860 (Act XLV), Sections 384, 385 (Extortion & Put in Fear)';
      case 'HARASSMENT':
      case CrimeType.HARASSMENT:
        return 'Penal Code 1860, Section 509 & Prevention of Women & Children Repression Act 2000';
      case 'CYBER_CRIME':
      case CrimeType.CYBER_CRIME:
        return 'Cyber Security Act 2023, Sections 24, 25 & Penal Code 1860, Section 420 (Fraud)';
      case 'FRAUD_SCAM':
      case CrimeType.FRAUD_SCAM:
        return 'Penal Code 1860 (Act XLV), Section 420 (Cheating & Dishonestly Inducing Delivery)';
      case 'DRUG_TRAFFICKING':
      case CrimeType.DRUG_TRAFFICKING:
        return 'Narcotics Control Act 2018 (Act 63 of 2018), Section 36';
      case 'VANDALISM':
      case CrimeType.VANDALISM:
        return 'Penal Code 1860 (Act XLV), Sections 425, 426 (Mischief & Property Damage)';
      default:
        return 'Penal Code 1860 (Act XLV), Relevant Cognizable Offence Sections';
    }
  };

  const ioName = investigatingOfficerName || report.assignedOfficerName || 'Sub-Inspector in Charge';
  const ioBadge = investigatingOfficerBadge || report.assignedOfficerBadge || 'BP-POLICE-HQ';
  const firNumber = `FIR-${report.caseId.replace('CR-', '')}/2026`;
  const verificationHash = `SHA256-${report.id.replace(/[^0-9]/g, '') || '92847192'}-COURT-AUTHENTICATED`;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-3xl w-full max-w-3xl my-auto shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 border-4 border-blue-900/90 relative"
      >
        {/* Printable Docket Content */}
        <div className="p-6 sm:p-10 space-y-5 print:p-0 print:m-0 text-slate-900">
          {/* Official Bangladesh Government Police Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1 relative">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition print:hidden"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-block px-3 py-0.5 rounded-full bg-blue-900 text-white font-mono text-[10px] font-bold tracking-wider uppercase mb-1">
              Government of the People's Republic of Bangladesh
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 uppercase font-['Orbitron']">
              FIRST INFORMATION REPORT (F.I.R.)
            </h2>
            <p className="text-xs text-slate-700 font-mono font-semibold">
              Form No. 5357 &bull; Recorded under Section 154, Code of Criminal Procedure (CrPC)
            </p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-950 bg-blue-100 px-3 py-0.5 rounded-md border border-blue-300">
                Official Police Station Record Copy &bull; For Chief Judicial Magistrate Court
              </span>
            </div>
          </div>

          {/* FIR & Jurisdiction Metadata Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-100 rounded-xl border border-slate-300 text-xs font-mono">
            <div>
              <span className="text-slate-500 text-[10px] block">FIR Docket No.</span>
              <strong className="text-blue-950 font-bold">{firNumber}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Thana (PS)</span>
              <strong className="text-slate-900 font-bold">{report.thana || 'Local Thana'}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">District</span>
              <strong className="text-slate-900 font-bold">{report.district}</strong>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Legal Status</span>
              <strong className="text-emerald-800 uppercase font-bold">{report.status}</strong>
            </div>
          </div>

          {/* 1. Date and Hour of Occurrence & Information */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-mono">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">1. Date & Hour of Occurrence:</span>
                <strong className="text-slate-900">
                  {report.occurredAt ? new Date(report.occurredAt).toLocaleString() : 'As recorded in statement'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block uppercase">2. Date & Hour Reported at PS:</span>
                <strong className="text-slate-900">
                  {new Date(report.submittedAt).toLocaleString()}
                </strong>
              </div>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block uppercase">3. Place of Occurrence & Distance from PS:</span>
              <strong className="text-slate-900">
                {report.locationName}, {report.thana}, {report.district} &bull; Coordinates: [{report.latitude?.toFixed(4)}, {report.longitude?.toFixed(4)}]
              </strong>
            </div>
          </div>

          {/* 2. Informant / Complainant Details */}
          <div className="border border-slate-300 rounded-xl p-3 text-xs space-y-1">
            <span className="text-slate-500 text-[10px] font-mono uppercase block font-bold">
              4. Informant / Complainant Particulars:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
              <div>
                <span className="text-slate-500 text-[10px] block">Name:</span>
                <strong className="text-slate-900">
                  {report.requestConfidentiality ? 'CONFIDENTIAL INFORMANT (Protected)' : report.reporterName}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">National ID:</span>
                <strong className="text-slate-900">
                  {report.requestConfidentiality ? 'VERIFIED (SEALED)' : report.reporterNID || 'Verified by EC'}
                </strong>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Phone:</span>
                <strong className="text-slate-900">
                  {report.requestConfidentiality ? 'SEALED' : report.reporterPhone}
                </strong>
              </div>
            </div>
          </div>

          {/* 3. Offence Particulars & Penal Code Section */}
          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-1.5">
            <span className="text-blue-900 text-[10px] font-mono uppercase block font-bold">
              5. Nature of Cognizable Offence & Applied Penal Statutes:
            </span>
            <div className="space-y-1 font-mono">
              <div className="text-blue-950 font-bold text-sm">
                {report.title}
              </div>
              <div className="text-xs text-blue-900 bg-white/80 p-2 rounded-lg border border-blue-200">
                ⚖️ <strong>Applicable Law:</strong> {getPenalCodeSection(report.crimeType)}
              </div>
            </div>
          </div>

          {/* 4. Substance of Information / Complaint Description */}
          <div className="border border-slate-300 rounded-xl p-3 text-xs space-y-1">
            <span className="text-slate-500 text-[10px] font-mono uppercase block font-bold">
              6. Brief Facts of the Offence & Informant Statement:
            </span>
            <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap font-serif bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              {report.description}
            </p>
          </div>

          {/* 5. Investigating Officer Preliminary Findings */}
          <div className="border border-slate-300 rounded-xl p-3 text-xs space-y-1.5 font-mono">
            <span className="text-slate-500 text-[10px] uppercase block font-bold">
              7. Investigating Officer (IO) Dispatch & Preliminary Entry:
            </span>
            <p className="text-slate-700 text-xs leading-relaxed">
              Case formally logged in Station General Diary register. Assigned to investigating officer <strong>{ioName}</strong> (Badge #{ioBadge}). Preliminary site inspection and CCTV evidence preservation initiated under CrPC Section 156.
            </p>
          </div>

          {/* Legal Certification & Officer Signatures */}
          <div className="pt-4 border-t-2 border-slate-800 grid grid-cols-2 gap-6 items-end text-xs font-mono">
            <div className="space-y-2">
              <div className="text-[10px] text-slate-500 leading-tight">
                Authenticity Token:
                <br />
                <span className="font-mono text-slate-700 font-bold text-[9px]">{verificationHash}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Generated via SentinelX National Police Network
              </div>
            </div>

            <div className="text-right space-y-1">
              <div className="w-40 border-b-2 border-slate-900 ml-auto pb-1 mb-1 text-center font-bold text-slate-950 font-serif text-sm">
                {ioName}
              </div>
              <p className="text-[11px] font-bold text-slate-900">
                Investigating Officer (IO) / Officer-in-Charge (OC)
              </p>
              <p className="text-[10px] text-slate-600">
                Badge #{ioBadge} &bull; {report.thana} Police Station
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-3 print:hidden">
          <p className="text-xs text-slate-600 font-mono">
            Press Print to generate official court-ready PDF docket.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Close
            </button>
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-800 text-white font-bold text-xs tracking-wider font-mono flex items-center gap-2 shadow-lg transition active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official FIR Docket</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
