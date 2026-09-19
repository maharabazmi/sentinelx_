import React from 'react';
import {
  Printer,
  X,
  Scale,
  Building2,
  Package,
  Receipt,
  AlertCircle,
  Coins,
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { ConsumerComplaint, ConsumerIssueType } from '../../types';

interface DisputeDocketModalProps {
  complaint: ConsumerComplaint;
  onClose: () => void;
}

export const DisputeDocketModal: React.FC<DisputeDocketModalProps> = ({
  complaint,
  onClose
}) => {
  const hashToken = `DNCRP-${complaint.trackingNumber.replace(/[^0-9A-Z]/g, '') || '883910'}-AUDITED`;
  const overcharge = (complaint.pricePaid && complaint.mrp)
    ? (complaint.pricePaid - complaint.mrp).toFixed(2)
    : null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white text-slate-900 rounded-3xl w-full max-w-2xl my-auto shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150 border-4 border-amber-600/80 relative"
      >
        {/* Printable Docket Content */}
        <div className="p-6 sm:p-8 space-y-5 print:p-0 print:m-0">
          {/* Header */}
          <div className="text-center pb-4 border-b-2 border-slate-900 space-y-1 relative">
            <button
              onClick={onClose}
              className="absolute top-0 right-0 text-slate-400 hover:text-slate-800 p-1.5 rounded-lg hover:bg-slate-100 transition print:hidden"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="inline-block px-3 py-0.5 rounded-full bg-amber-600 text-white font-mono text-[10px] font-bold tracking-wider uppercase mb-1">
              Government of the People's Republic of Bangladesh
            </div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-950 uppercase font-display">
              Directorate of National Consumer Rights Protection (DNCRP)
            </h2>
            <p className="text-xs text-slate-600 font-mono">
              Official Grievance & Enforcement Docket Slip • Section 76, Consumer Rights Protection Act, 2009
            </p>
          </div>

          {/* Tracking & Jurisdiction Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs font-mono">
            <div>
              <span className="text-amber-800 text-[10px] block font-semibold">Tracking Number</span>
              <strong className="text-amber-950 font-bold">{complaint.trackingNumber}</strong>
            </div>
            <div>
              <span className="text-amber-800 text-[10px] block font-semibold">Jurisdiction Thana</span>
              <strong className="text-slate-900">{complaint.shopThana}</strong>
            </div>
            <div>
              <span className="text-amber-800 text-[10px] block font-semibold">District</span>
              <strong className="text-slate-900">{complaint.shopDistrict}</strong>
            </div>
            <div>
              <span className="text-amber-800 text-[10px] block font-semibold">Grievance Status</span>
              <strong className="text-blue-900 uppercase font-bold">{complaint.status}</strong>
            </div>
          </div>

          {/* Complainant & Merchant Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                <span>Complainant Details</span>
              </div>
              <p className="font-bold text-slate-900">{complaint.complainantName || 'Registered Consumer'}</p>
              {complaint.complainantPhone && (
                <p className="text-slate-600 font-mono text-[11px]">Phone: {complaint.complainantPhone}</p>
              )}
              <p className="text-[10px] text-slate-500 font-mono">
                Filed: {new Date(complaint.submittedAt).toLocaleString()}
              </p>
            </div>

            <div className="space-y-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-2 sm:pt-0 sm:pl-3">
              <div className="flex items-center gap-1.5 font-bold text-slate-900 uppercase text-[10px] tracking-wider text-slate-500">
                <Building2 className="w-3.5 h-3.5 text-amber-700" />
                <span>Accused Merchant / Retailer</span>
              </div>
              <p className="font-bold text-slate-900">{complaint.shopName}</p>
              <p className="text-slate-600 text-[11px] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                <span>{complaint.shopAddress || `${complaint.shopThana}, ${complaint.shopDistrict}`}</span>
              </p>
              {complaint.tradeLicenseOrBIN && (
                <p className="text-[10px] font-mono text-slate-600">
                  BIN / Trade Lic: {complaint.tradeLicenseOrBIN}
                </p>
              )}
            </div>
          </div>

          {/* Product & Violation Details */}
          <div className="space-y-2.5 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-b border-slate-200 pb-2.5">
              <div>
                <span className="text-slate-500 text-[11px] block">Product & Brand:</span>
                <strong className="text-slate-900 text-sm">{complaint.productName}</strong>
                {complaint.brandName && (
                  <span className="text-slate-600 text-[11px] block">Brand: {complaint.brandName}</span>
                )}
                {complaint.barcode && (
                  <span className="text-slate-500 font-mono text-[10px] block mt-0.5">EAN Barcode: {complaint.barcode}</span>
                )}
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Statutory Violation Type:</span>
                <span className="inline-block mt-1 font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 uppercase text-[11px]">
                  {complaint.issueType.replace(/_/g, ' ')}
                </span>
                {complaint.batchNumber && (
                  <span className="text-slate-500 font-mono text-[10px] block mt-1">Batch No: {complaint.batchNumber}</span>
                )}
              </div>
            </div>

            {/* Pricing Discrepancy & 25% Reward Box */}
            {complaint.issueType === ConsumerIssueType.PRICE_GOUGING && complaint.mrp && complaint.pricePaid && (
              <div className="p-3 bg-amber-50/90 rounded-xl border border-amber-300 text-xs space-y-2">
                <div className="flex items-center justify-between text-amber-950 font-bold border-b border-amber-200 pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Coins className="w-4 h-4 text-amber-700" />
                    <span>Price Discrepancy & Statutory 25% Reward Calculation</span>
                  </span>
                  <span className="text-[11px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded font-mono">
                    Sec. 76(4) Guaranteed
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center font-mono text-xs">
                  <div className="p-2 rounded bg-white border border-amber-200">
                    <span className="text-slate-500 text-[10px] block">Govt / Max MRP</span>
                    <strong className="text-slate-900 text-sm">৳{complaint.mrp}</strong>
                  </div>
                  <div className="p-2 rounded bg-white border border-amber-200">
                    <span className="text-slate-500 text-[10px] block">Charged / Demanded</span>
                    <strong className="text-red-700 text-sm">৳{complaint.pricePaid}</strong>
                  </div>
                  <div className="p-2 rounded bg-white border border-amber-200">
                    <span className="text-slate-500 text-[10px] block">Illegal Surcharge</span>
                    <strong className="text-amber-800 text-sm">+৳{overcharge}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-amber-900 leading-relaxed italic">
                  * Notice: Under Section 76(4) of the Consumer Rights Protection Act, 2009, 25% of any financial penalty realized from this merchant inquiry is directly rewarded to the complainant.
                </p>
              </div>
            )}

            {/* Incident Statement */}
            <div className="pt-1">
              <span className="text-slate-600 text-[11px] block font-bold uppercase tracking-wider">
                Grievance Description & Consumer Statement:
              </span>
              <p className="text-slate-800 text-xs mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-200 whitespace-pre-line font-sans">
                {complaint.description}
              </p>
            </div>
          </div>

          {/* Attached Receipts / Proof of Purchase */}
          <div className="p-3 bg-slate-100 rounded-xl border border-slate-300 text-xs space-y-1.5">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span className="flex items-center gap-1.5">
                <Receipt className="w-4 h-4 text-amber-700" />
                <span>Proof of Purchase / Evidence Files</span>
              </span>
              <span className="font-mono text-[11px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-bold">
                {complaint.evidence?.length || 0} Files Attached
              </span>
            </div>
            {complaint.evidence && complaint.evidence.length > 0 ? (
              <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px] font-mono text-slate-700">
                {complaint.evidence.map((ev, i) => (
                  <div
                    key={ev.id || i}
                    className="p-1.5 rounded bg-white border border-slate-300 flex items-center justify-between truncate shadow-2xs"
                  >
                    <span className="truncate pr-1">{ev.fileName}</span>
                    <span className="text-amber-800 font-bold shrink-0 uppercase text-[9px] bg-amber-50 px-1 rounded">
                      {ev.fileType}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 italic">No physical cash memo attached (statement only).</p>
            )}
          </div>

          {/* Official Verification Seal & Signature */}
          <div className="pt-4 border-t-2 border-slate-300 flex items-end justify-between text-xs text-slate-600">
            <div>
              <p className="font-mono text-[10px] text-slate-500 uppercase tracking-wider">DNCRP Verification Token</p>
              <p className="font-mono text-[11px] font-bold text-slate-900">{hashToken}</p>
              <p className="text-[9px] text-slate-400 font-mono mt-0.5">Automated Consumer Redressal Audit Registry</p>
            </div>
            <div className="text-right">
              <div className="w-36 h-10 border-b-2 border-slate-400 mb-1"></div>
              <p className="font-bold text-slate-900">DNCRP Authorized Inspector</p>
              <p className="text-[10px] text-slate-600">{complaint.shopThana}, {complaint.shopDistrict}</p>
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="p-4 bg-slate-100 border-t border-slate-300 flex items-center justify-between gap-3 print:hidden">
          <span className="text-xs text-slate-600">
            Official acknowledgment docket for consumer dispute hearing & 25% reward settlement.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow hover:shadow-md cursor-pointer"
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
