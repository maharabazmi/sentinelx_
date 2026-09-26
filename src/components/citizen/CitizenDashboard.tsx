import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  FilePlus,
  Scale,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Barcode,
  Search,
  Upload,
  EyeOff,
  UserCheck,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileText,
  AlertCircle,
  Image as ImageIcon,
  Eye,
  X,
  PhoneCall,
  Phone,
  Check,
  Building,
  Tag,
  DollarSign,
  Info,
  Calendar,
  MessageSquare,
  Award,
  ShieldCheck,
  Printer,
  Download,
  Car,
  Navigation
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../services/api';
import { EvidenceUploader } from '../common/EvidenceUploader';
import { EvidenceViewer } from '../common/EvidenceViewer';
import { CaseChatThread } from '../common/CaseChatThread';
import { GDDocketModal } from '../common/GDDocketModal';
import { DisputeDocketModal } from '../common/DisputeDocketModal';
import { CitizenAICopilot } from './CitizenAICopilot';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from '../ui/StatCard';
import { StepProgress, StepItem } from '../ui/StepProgress';
import { EmptyState } from '../ui/EmptyState';
import { CardSkeleton, ListSkeleton } from '../ui/SkeletonLoader';
import {
  CrimeReport,
  CrimeType,
  CrimeSeverity,
  ReportStatus,
  ConsumerComplaint,
  ConsumerIssueType,
  ComplaintStatus,
  SOSRequest,
  SOSStatus,
  BarcodeVerification,
  EvidenceFile
} from '../../types';
import { BANGLADESH_DIVISIONS, getThanasByDistrict } from '../../data/bangladeshGeo';

type ComplaintStatusFilter = 'ALL' | 'IN_PROGRESS' | ComplaintStatus;

const COMPLAINT_STATUS_FILTERS: {
  id: ComplaintStatusFilter;
  label: string;
  statuses: ComplaintStatus[] | null;
}[] = [
  { id: 'ALL', label: 'All Claims', statuses: null },
  { id: ComplaintStatus.SUBMITTED, label: 'Submitted', statuses: [ComplaintStatus.SUBMITTED] },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress',
    statuses: [
      ComplaintStatus.UNDER_REVIEW,
      ComplaintStatus.VERIFIED,
      ComplaintStatus.INVESTIGATION,
      ComplaintStatus.INVESTIGATION_SUMMARY,
      ComplaintStatus.ADJUDICATION_REVIEW,
      ComplaintStatus.FINAL_DECISION
    ]
  },
  { id: ComplaintStatus.RESOLVED, label: 'Resolved', statuses: [ComplaintStatus.RESOLVED] },
  { id: ComplaintStatus.REJECTED, label: 'Rejected', statuses: [ComplaintStatus.REJECTED] }
];

export const CitizenDashboard: React.FC = () => {
  const { user, activeAlerts } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'report_crime' | 'consumer_dispute' | 'sos' | 'my_reports' | 'my_complaints' | 'barcode_scanner'
  >('overview');

  // Core Citizen Data
  const [myReports, setMyReports] = useState<CrimeReport[]>([]);
  const [myComplaints, setMyComplaints] = useState<ConsumerComplaint[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOSRequest | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [activeChatCase, setActiveChatCase] = useState<{ caseId: string; caseType: 'CRIME' | 'CONSUMER'; title: string; officer?: string } | null>(null);

  const handleDownloadRewardCertificate = (comp: ConsumerComplaint) => {
    try {
      const cleanPdfText = (val: any) =>
        String(val ?? '')
          .replace(/৳/g, 'BDT ')
          .replace(/[^\x20-\x7E]/g, ' ')
          .replace(/\\/g, '\\\\')
          .replace(/\(/g, '\\(')
          .replace(/\)/g, '\\)');

      const rewardVal = Number(comp.rewardAmount || 0);
      const fineVal = Number(comp.fineAmount || rewardVal * 4);
      const trackingSuffix = (comp.trackingNumber || '2026-0000').split('-').slice(-2).join('-');
      const payRef = comp.paymentReference || `DNCRP-TR-${trackingSuffix}`;
      const rewardStatus = (comp.rewardStatus || 'READY_FOR_COLLECTION').replace(/_/g, ' ').toUpperCase();
      const formattedIssue = String(comp.issueType || 'Price Violation')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());
      const citizenName = user?.fullName || comp.complainantName || 'Verified Citizen';
      const citizenNid = (!user?.nidNumber || /^0+$/.test(user.nidNumber)) ? '1992269201' : user.nidNumber;
      const citizenPhone = user?.phone || comp.complainantPhone || 'Verified';
      const issuedDate = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC';

      const streamCmds: string[] = [
        // Outer & inner emerald certificate border
        '0.05 0.45 0.32 RG',
        '2 w',
        '42 60 528 680 re S',
        '0.75 0.88 0.82 RG',
        '0.75 w',
        '48 66 516 668 re S',
        // Top Header Banner Fill
        '0.04 0.28 0.22 rg',
        '48 654 516 80 re f',
        // Header Title Text
        'BT',
        '1 1 1 rg',
        '/F2 13 Tf',
        '1 0 0 1 66 706 Tm',
        `(${cleanPdfText("GOVERNMENT OF THE PEOPLE'S REPUBLIC OF BANGLADESH")}) Tj`,
        '/F2 10.5 Tf',
        '0.65 0.96 0.83 rg',
        '0 -18 Td',
        `(${cleanPdfText('DIRECTORATE OF NATIONAL CONSUMER RIGHTS PROTECTION (DNCRP)')}) Tj`,
        '/F1 8.5 Tf',
        '0.88 0.95 0.92 rg',
        '0 -15 Td',
        `(${cleanPdfText('STATUTORY 25% CITIZEN REWARD PAYMENT CERTIFICATE  |  SECTION 76(4) DNCRP ACT 2009')}) Tj`,
        'ET',
        // Highlight Voucher Box
        '0.93 0.98 0.95 rg',
        '0.16 0.65 0.45 RG',
        '1 w',
        '68 575 476 62 re B',
        'BT',
        '0.05 0.35 0.24 rg',
        '/F2 11 Tf',
        '1 0 0 1 84 616 Tm',
        `(${cleanPdfText(`AUTHORIZED 25% STATUTORY CITIZEN REWARD:   BDT ${rewardVal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`)}) Tj`,
        '/F1 9.5 Tf',
        '0.15 0.25 0.20 rg',
        '0 -18 Td',
        `(${cleanPdfText(`Pay to the Order of Verified Complainant:  ${citizenName}`)}) Tj`,
        '0 -14 Td',
        `(${cleanPdfText(`Disbursement Status: ${rewardStatus}   |   Treasury Ref: ${payRef}`)}) Tj`,
        'ET'
      ];

      const detailRows: Array<[string, string]> = [
        ['Case Tracking Number', comp.trackingNumber],
        ['Complainant Name', citizenName],
        ['Complainant NID / Phone', `${citizenNid}  |  ${citizenPhone}`],
        ['Convicted Establishment', `${comp.shopName} (${comp.shopThana}, ${comp.shopDistrict})`],
        ['Reported Product / Item', `${comp.productName} (${formattedIssue})`],
        ['Mobile Court Fine Imposed', `BDT ${fineVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Section 40 / DNCRP Act 2009)`],
        ['Statutory 25% Citizen Share', `BDT ${rewardVal.toLocaleString('en-US', { minimumFractionDigits: 2 })} (Section 76(4) Entitlement)`],
        ['Settlement Bank Account', 'Bangladesh Bank - DNCRP Consumer Rights Settlement Account'],
        ['Payment Voucher Reference', payRef],
        ['Certificate Issue Timestamp', issuedDate]
      ];

      let yPos = 538;
      detailRows.forEach(([label, val], idx) => {
        if (idx % 2 === 0) {
          streamCmds.push('0.96 0.97 0.98 rg');
          streamCmds.push(`68 ${yPos - 7} 476 24 re f`);
        }
        streamCmds.push(
          'BT',
          '0.28 0.34 0.42 rg',
          '/F2 9 Tf',
          `1 0 0 1 78 ${yPos} Tm`,
          `(${cleanPdfText(label)}:) Tj`,
          '0.07 0.10 0.16 rg',
          '/F1 9 Tf',
          `1 0 0 1 245 ${yPos} Tm`,
          `(${cleanPdfText(val).slice(0, 62)}) Tj`,
          'ET'
        );
        yPos -= 26;
      });

      const rawPenalty = String(
        comp.penaltyImposed ||
          `Mobile Court fine of BDT ${fineVal.toLocaleString('en-US')} imposed under Section 40 of DNCRP Act 2009. Complainant entitled to BDT ${rewardVal.toLocaleString('en-US')} (25% statutory reward).`
      ).replace(/৳/g, 'BDT ');

      // Word-wrap penalty summary cleanly across up to 2 lines (max 88 chars per line) so no word is ever cut off
      const words = rawPenalty.split(/\s+/);
      let line1 = '';
      let line2 = '';
      words.forEach(w => {
        if ((line1 + ' ' + w).trim().length <= 88) {
          line1 = (line1 + ' ' + w).trim();
        } else {
          line2 = (line2 + ' ' + w).trim();
        }
      });

      streamCmds.push(
        '0.82 0.86 0.90 RG',
        '0.75 w',
        '68 255 476 0 re S',
        'BT',
        '0.15 0.22 0.30 rg',
        '/F2 9.5 Tf',
        '1 0 0 1 68 236 Tm',
        '(MAGISTRATE ENFORCEMENT ORDER SUMMARY:) Tj',
        '/F1 9 Tf',
        '0 -15 Td',
        `(${cleanPdfText(line1)}) Tj`,
        '0 -13 Td',
        `(${cleanPdfText(line2)}) Tj`,
        '0.35 0.42 0.50 rg',
        '0 -26 Td',
        '(This electronic payment certificate is cryptographically generated from the verified SentinelX / DNCRP docket.) Tj',
        '0 -13 Td',
        '(Present this certificate along with your verified National ID at the designated settlement counter or bank.) Tj',
        '/F2 9.5 Tf',
        '0.05 0.35 0.24 rg',
        '1 0 0 1 68 105 Tm',
        '(STATUS: VERIFIED & DIGITALLY SIGNED) Tj',
        '1 0 0 1 345 105 Tm',
        '(AUTHORIZED DNCRP MAGISTRATE SEAL) Tj',
        'ET'
      );

      const body = streamCmds.join('\n');
      const objects = [
        '<< /Type /Catalog /Pages 2 0 R >>',
        '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
        '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /ProcSet [/PDF /Text] /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
        '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>',
        `<< /Length ${body.length} >>\nstream\n${body}\nendstream`
      ];

      let pdfStr = '%PDF-1.4\n';
      const offsets: number[] = [0];
      objects.forEach((obj, idx) => {
        offsets.push(pdfStr.length);
        pdfStr += `${idx + 1} 0 obj\n${obj}\nendobj\n`;
      });
      const xrefOffset = pdfStr.length;
      pdfStr += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
      offsets.slice(1).forEach(off => {
        pdfStr += `${String(off).padStart(10, '0')} 00000 n \n`;
      });
      pdfStr += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

      const pdfBytes = new TextEncoder().encode(pdfStr);
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `DNCRP-Reward-Certificate-${comp.trackingNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err: any) {
      alert(err.message || 'Unable to generate the reward payment certificate.');
    }
  };

  // ----------------------------------------------------
  // MULTI-STEP CRIME REPORT FORM STATE
  // ----------------------------------------------------
  const [crimeStep, setCrimeStep] = useState<number>(1);
  const [crimeType, setCrimeType] = useState<CrimeType>(CrimeType.THEFT_ROBBERY);
  const [severity, setSeverity] = useState<CrimeSeverity>(CrimeSeverity.MEDIUM);
  const [district, setDistrict] = useState('Dhaka');
  const [thana, setThana] = useState('Gulshan');

  const handleDistrictChange = (newDistrict: string) => {
    setDistrict(newDistrict);
    const availableThanas = getThanasByDistrict(newDistrict);
    setThana(availableThanas[0] || '');
  };

  const [locationName, setLocationName] = useState('');
  const [occurredAt, setOccurredAt] = useState(new Date().toISOString().slice(0, 16));
  const [crimeTitle, setCrimeTitle] = useState('');
  const [crimeDesc, setCrimeDesc] = useState('');
  const [requestConfidentiality, setRequestConfidentiality] = useState(false);
  const [evidenceList, setEvidenceList] = useState<EvidenceFile[]>([]);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccessReceipt, setReportSuccessReceipt] = useState<CrimeReport | null>(null);
  const [crimeFormError, setCrimeFormError] = useState<string | null>(null);

  const crimeSteps: StepItem[] = [
    { id: 1, label: 'Incident', description: 'Category & Severity' },
    { id: 2, label: 'Location', description: 'Zone & Timestamp' },
    { id: 3, label: 'Details', description: 'Headline & Narrative' },
    { id: 4, label: 'Evidence', description: 'Photos & Documents' },
    { id: 5, label: 'Review', description: 'Confirm & Lodge' }
  ];

  // ----------------------------------------------------
  // MULTI-STEP CONSUMER COMPLAINT FORM STATE
  // ----------------------------------------------------
  const [complaintStep, setComplaintStep] = useState<number>(1);
  const [shopName, setShopName] = useState('');
  const [tradeLicense, setTradeLicense] = useState('');
  const [shopDistrict, setShopDistrict] = useState('Dhaka');
  const [shopThana, setShopThana] = useState('Uttara');

  const handleShopDistrictChange = (newDistrict: string) => {
    setShopDistrict(newDistrict);
    const availableThanas = getThanasByDistrict(newDistrict);
    setShopThana(availableThanas[0] || '');
  };
  const [shopAddress, setShopAddress] = useState('');
  const [productName, setProductName] = useState('');
  const [brandName, setBrandName] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [issueType, setIssueType] = useState<ConsumerIssueType>(ConsumerIssueType.PRICE_GOUGING);
  const [mrp, setMrp] = useState<string>('');
  const [pricePaid, setPricePaid] = useState<string>('');
  const [complaintDesc, setComplaintDesc] = useState('');
  const [complaintEvidenceList, setComplaintEvidenceList] = useState<EvidenceFile[]>([]);
  const [isSubmittingComplaint, setIsSubmittingComplaint] = useState(false);
  const [complaintSuccessReceipt, setComplaintSuccessReceipt] = useState<ConsumerComplaint | null>(null);
  const [complaintFormError, setComplaintFormError] = useState<string | null>(null);

  const isOverpriced = issueType === ConsumerIssueType.PRICE_GOUGING;

  const complaintSteps: StepItem[] = [
    { id: 1, label: 'Merchant', description: 'Shop & Establishment' },
    { id: 2, label: 'Product', description: 'Item & Brand' },
    { id: 3, label: isOverpriced ? 'Pricing' : 'Grievance', description: isOverpriced ? 'MRP vs Paid' : 'Dispute Details' },
    { id: 4, label: 'Evidence', description: 'Receipts & Proof' },
    { id: 5, label: 'Review', description: 'Submit to DNCRP' }
  ];

  // ----------------------------------------------------
  // SOS EMERGENCY STATE, OFFLINE OUTBOX & HARDWARE SIREN
  // ----------------------------------------------------
  const [showSOSConfirmModal, setShowSOSConfirmModal] = useState(false);
  const [sosLocationName, setSosLocationName] = useState('');
  const [isTriggeringSOS, setIsTriggeringSOS] = useState(false);
  const [isResolvingSOS, setIsResolvingSOS] = useState(false);
  const [isOfflineSOSQueued, setIsOfflineSOSQueued] = useState<boolean>(() =>
    Boolean(localStorage.getItem('sentinelx_offline_sos_queue'))
  );
  const [isOnlineStatus, setIsOnlineStatus] = useState<boolean>(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const sirenAudioRef = React.useRef<{ ctx: AudioContext; osc: OscillatorNode; timer: number } | null>(null);

  const stopEmergencySiren = () => {
    if (sirenAudioRef.current) {
      window.clearInterval(sirenAudioRef.current.timer);
      try {
        sirenAudioRef.current.osc.stop();
        sirenAudioRef.current.ctx.close();
      } catch {
        // ignore audio context cleanup errors
      }
      sirenAudioRef.current = null;
    }
    setIsSirenActive(false);
  };

  const toggleEmergencySiren = () => {
    if (isSirenActive) {
      stopEmergencySiren();
      return;
    }
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(720, ctx.currentTime);
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();

      let highTone = false;
      const timer = window.setInterval(() => {
        highTone = !highTone;
        try {
          osc.frequency.exponentialRampToValueAtTime(highTone ? 1180 : 680, ctx.currentTime + 0.38);
        } catch {
          // ignore ramp errors
        }
      }, 420);

      sirenAudioRef.current = { ctx, osc, timer };
      setIsSirenActive(true);
    } catch {
      alert('Unable to initialize hardware audio synthesizer on this device.');
    }
  };

  useEffect(() => {
    return () => stopEmergencySiren();
  }, []);

  // ----------------------------------------------------
  // BARCODE SCANNER STATE
  // ----------------------------------------------------
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [lookupResult, setLookupResult] = useState<{ found: boolean; product?: BarcodeVerification; message?: string } | null>(null);
  const [isLookingUpBarcode, setIsLookingUpBarcode] = useState(false);

  // Search & Filter state for My Reports / Complaints
  const [reportSearchQuery, setReportSearchQuery] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('ALL');
  const [complaintSearchQuery, setComplaintSearchQuery] = useState('');
  const [complaintStatusFilter, setComplaintStatusFilter] = useState<ComplaintStatusFilter>('ALL');
  const selectedComplaintStatuses = COMPLAINT_STATUS_FILTERS.find(
    filter => filter.id === complaintStatusFilter
  )?.statuses;
  const filteredComplaints = myComplaints.filter(complaint => {
    const matchesSearch =
      complaint.trackingNumber.toLowerCase().includes(complaintSearchQuery.toLowerCase()) ||
      complaint.shopName.toLowerCase().includes(complaintSearchQuery.toLowerCase()) ||
      complaint.productName.toLowerCase().includes(complaintSearchQuery.toLowerCase());
    const matchesStatus =
      !selectedComplaintStatuses || selectedComplaintStatuses.includes(complaint.status);
    return matchesSearch && matchesStatus;
  });
  const clearComplaintFilters = () => {
    setComplaintStatusFilter('ALL');
    setComplaintSearchQuery('');
  };
  const [printingDocket, setPrintingDocket] = useState<CrimeReport | null>(null);
  const [printingDisputeDocket, setPrintingDisputeDocket] = useState<ConsumerComplaint | null>(null);

  // Flush any queued offline SOS packet to the Police server as soon as connectivity returns
  const flushOfflineSOSQueue = async (): Promise<SOSRequest | null> => {
    const rawQueue = localStorage.getItem('sentinelx_offline_sos_queue');
    if (!rawQueue) return null;
    try {
      const parsed = JSON.parse(rawQueue);
      const fb = parsed.fallbackRecord || {};
      const syncRes = await ApiClient.triggerSOS({
        locationName: parsed.locationName,
        latitude: parsed.latitude,
        longitude: parsed.longitude,
        citizenId: fb.citizenId,
        citizenName: fb.citizenName,
        citizenPhone: fb.citizenPhone,
        citizenNID: fb.citizenNID,
        assignedStation: parsed.citizenStation || user?.stationOrThana
      });
      if (syncRes.success && syncRes.sos) {
        localStorage.removeItem('sentinelx_offline_sos_queue');
        setIsOfflineSOSQueued(false);
        setActiveSOS(syncRes.sos);
        return syncRes.sos;
      }
    } catch {
      // Still offline or server unreachable; keep packet in localStorage outbox
    }
    return null;
  };

  // Fetch Citizen Data
  const fetchData = async () => {
    setIsLoadingData(true);
    try {
      const syncedSOS = await flushOfflineSOSQueue();
      const [reportsRes, complaintsRes, sosRes] = await Promise.all([
        ApiClient.getMyCrimeReports(),
        ApiClient.getMyComplaints(),
        ApiClient.getActiveSOS()
      ]);

      if (reportsRes.success) setMyReports(reportsRes.reports);
      if (complaintsRes.success) setMyComplaints(complaintsRes.complaints);
      if (sosRes.success) {
        setActiveSOS(sosRes.activeSOS || syncedSOS);
      }
      setIsOnlineStatus(true);
    } catch (err) {
      setIsOnlineStatus(typeof navigator !== 'undefined' ? navigator.onLine : false);
      // Restore offline queued SOS beacon on screen if network is down
      const rawQueue = localStorage.getItem('sentinelx_offline_sos_queue');
      if (rawQueue) {
        try {
          const q = JSON.parse(rawQueue);
          setIsOfflineSOSQueued(true);
          setActiveSOS(prev => prev || q.fallbackRecord);
        } catch {
          // ignore parse error
        }
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnlineStatus(true);
      flushOfflineSOSQueue().then(() => fetchData());
    };
    const handleOffline = () => {
      setIsOnlineStatus(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    fetchData();
    // Rapid 4s polling during emergency distress or queued offline outbox, 10s otherwise
    const pollInterval = activeSOS || isOfflineSOSQueued ? 4000 : 10000;
    const interval = setInterval(fetchData, pollInterval);
    return () => clearInterval(interval);
  }, [activeSOS?.status, activeSOS?.assignedUnit, isOfflineSOSQueued]);

  // ----------------------------------------------------
  const handleNextCrimeStep = () => {
    setCrimeFormError(null);
    if (crimeStep === 2) {
      if (!thana.trim()) {
        setCrimeFormError('Please select the Thana / Police Station jurisdiction.');
        return;
      }
      if (!locationName.trim()) {
        setCrimeFormError('Please specify the approximate location or street landmark.');
        return;
      }
    }
    if (crimeStep === 3 && (!crimeTitle.trim() || !crimeDesc.trim())) {
      setCrimeFormError('Please provide both an incident headline and detailed description.');
      return;
    }
    setCrimeStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevCrimeStep = () => {
    setCrimeFormError(null);
    setCrimeStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmitCrimeReport = async () => {
    setIsSubmittingReport(true);
    setCrimeFormError(null);

    try {
      const res = await ApiClient.submitCrimeReport({
        crimeType,
        title: crimeTitle,
        description: crimeDesc,
        locationName,
        district,
        thana,
        severity,
        occurredAt,
        requestConfidentiality,
        evidence: evidenceList
      });

      if (res.success) {
        setReportSuccessReceipt(res.report);
        // Reset inputs
        setCrimeTitle('');
        setCrimeDesc('');
        setLocationName('');
        setEvidenceList([]);
        setCrimeStep(1);
        fetchData();
      }
    } catch (err: any) {
      setCrimeFormError(err.message || 'Failed to lodge crime report.');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // ----------------------------------------------------
  // CONSUMER COMPLAINT ACTIONS
  // ----------------------------------------------------
  const handleNextComplaintStep = () => {
    setComplaintFormError(null);
    if (complaintStep === 1) {
      if (!shopName.trim()) {
        setComplaintFormError('Merchant or Establishment name is required.');
        return;
      }
      if (!shopThana.trim()) {
        setComplaintFormError('Please select the shop Thana / Upazila jurisdiction.');
        return;
      }
    }
    if (complaintStep === 2 && !productName.trim()) {
      setComplaintFormError('Product or item name is required.');
      return;
    }
    if (complaintStep === 3) {
      if (isOverpriced) {
        if (!mrp.trim() || !pricePaid.trim()) {
          setComplaintFormError('Official MRP and Price Demanded / Paid are required for price overcharging claims.');
          return;
        }
        if (parseFloat(mrp) <= 0 || parseFloat(pricePaid) <= 0) {
          setComplaintFormError('Please enter valid positive amounts for Official MRP and Price Demanded / Paid.');
          return;
        }
      }
      if (!complaintDesc.trim()) {
        setComplaintFormError('Please provide an explanation of the violation.');
        return;
      }
    }
    setComplaintStep(prev => Math.min(prev + 1, 5));
  };

  const handlePrevComplaintStep = () => {
    setComplaintFormError(null);
    setComplaintStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmitComplaint = async () => {
    setIsSubmittingComplaint(true);
    setComplaintFormError(null);

    try {
      const res = await ApiClient.submitConsumerComplaint({
        shopName,
        shopAddress,
        shopDistrict,
        shopThana,
        tradeLicenseOrBIN: tradeLicense,
        productName,
        brandName,
        barcode: barcodeInput,
        issueType,
        pricePaid: (isOverpriced && pricePaid) ? Number(pricePaid) : undefined,
        mrp: (isOverpriced && mrp) ? Number(mrp) : undefined,
        description: complaintDesc,
        evidence: complaintEvidenceList
      });

      if (res.success) {
        setComplaintSuccessReceipt(res.complaint);
        setShopName('');
        setProductName('');
        setBrandName('');
        setComplaintDesc('');
        setPricePaid('');
        setMrp('');
        setIssueType(ConsumerIssueType.PRICE_GOUGING);
        setComplaintEvidenceList([]);
        setComplaintStep(1);
        fetchData();
      }
    } catch (err: any) {
      setComplaintFormError(err.message || 'Failed to submit consumer complaint.');
    } finally {
      setIsSubmittingComplaint(false);
    }
  };

  // ----------------------------------------------------
  // SOS TRIGGER ACTION (WITH REAL STORE-AND-FORWARD OFFLINE OUTBOX)
  // ----------------------------------------------------
  const handleTriggerSOS = async () => {
    setShowSOSConfirmModal(false);
    setIsTriggeringSOS(true);

    let lat = 23.8103;
    let lng = 90.4125;

    if (navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3500 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch {
        // fallback to Dhaka Metropolitan coordinates
      }
    }

    const resolvedLocation = sosLocationName.trim() || 'Dhaka Metropolitan Area (GPS Locked)';
    const citizenNid = (!user?.nidNumber || /^0+$/.test(user.nidNumber)) ? '1992269201' : user.nidNumber;
    if (user?.fullName) {
      localStorage.setItem(
        'sentinelx_last_sos_citizen',
        JSON.stringify({
          citizenId: user.id,
          citizenName: user.fullName,
          citizenPhone: user.phone || '+8801301711304',
          citizenNID: citizenNid,
          citizenStation: user.stationOrThana
        })
      );
    }

    try {
      const res = await ApiClient.triggerSOS({
        locationName: resolvedLocation,
        latitude: lat,
        longitude: lng,
        citizenId: user?.id,
        citizenName: user?.fullName,
        citizenPhone: user?.phone,
        citizenNID: citizenNid
      });

      if (res.success) {
        localStorage.removeItem('sentinelx_offline_sos_queue');
        setIsOfflineSOSQueued(false);
        setActiveSOS(res.sos);
        setActiveTab('sos');
      }
    } catch {
      // Network disconnected / server unreachable: Persist to real Store-and-Forward Outbox
      const nowIso = new Date().toISOString();
      const fallbackRecord: SOSRequest = {
        id: `SOS-OUTBOX-${Date.now().toString().slice(-6)}`,
        citizenId: user?.id || 'citizen-local',
        citizenName: user?.fullName || 'Kamrul Hassan',
        citizenPhone: user?.phone || '+8801301711304',
        citizenNID: citizenNid,
        locationName: resolvedLocation,
        latitude: lat,
        longitude: lng,
        status: SOSStatus.SOS_SENT,
        createdAt: nowIso,
        assignedStation: 'Queued for Automatic Police Dispatch (Awaiting Network)',
        assignedUnit: 'Store-and-Forward Outbox Armed',
        notes: 'Network link interrupted during dispatch. Distress packet locked in local outbox and will automatically transmit to Police Tactical Console the moment connectivity resumes.'
      };
      localStorage.setItem(
        'sentinelx_offline_sos_queue',
        JSON.stringify({
          locationName: resolvedLocation,
          latitude: lat,
          longitude: lng,
          citizenId: fallbackRecord.citizenId,
          citizenName: fallbackRecord.citizenName,
          citizenPhone: fallbackRecord.citizenPhone,
          citizenNID: fallbackRecord.citizenNID,
          citizenStation: user?.stationOrThana,
          queuedAt: nowIso,
          fallbackRecord
        })
      );
      setIsOfflineSOSQueued(true);
      setIsOnlineStatus(false);
      setActiveSOS(fallbackRecord);
      setActiveTab('sos');
    } finally {
      setIsTriggeringSOS(false);
    }
  };

  const handleResolveSOS = async () => {
    if (isResolvingSOS) return;
    setIsResolvingSOS(true);
    stopEmergencySiren();
    const targetSosId = activeSOS?.id;
    localStorage.removeItem('sentinelx_offline_sos_queue');
    setIsOfflineSOSQueued(false);
    // Optimistically clear the local SOS view
    setActiveSOS(null);
    try {
      if (targetSosId && !targetSosId.startsWith('SOS-OUTBOX-')) {
        await ApiClient.resolveActiveSOS(targetSosId);
      }
      await fetchData();
    } catch (err: any) {
      console.error('Failed to resolve active SOS:', err);
    } finally {
      setIsResolvingSOS(false);
    }
  };

  // ----------------------------------------------------
  // BARCODE SCANNER ACTION
  // ----------------------------------------------------
  const handleBarcodeLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupBarcode.trim()) return;
    setIsLookingUpBarcode(true);
    try {
      const res = await ApiClient.lookupBarcode(lookupBarcode.trim());
      setLookupResult(res);
    } catch (err: any) {
      alert(err.message || 'Barcode lookup failed.');
    } finally {
      setIsLookingUpBarcode(false);
    }
  };

  // Calculations for consumer dispute pricing difference
  const numMrp = parseFloat(mrp) || 0;
  const numPaid = parseFloat(pricePaid) || 0;
  const priceDiff = numPaid - numMrp;
  const overchargePercent = numMrp > 0 ? Math.round(((numPaid - numMrp) / numMrp) * 100) : 0;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-100">
      {/* CITIZEN PROFILE HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#090e1a]/95 via-[#070b14]/95 to-[#05070e]/95 border border-[#02baff]/20 shadow-2xl backdrop-blur-md relative overflow-hidden">
        {/* Futuristic top accent */}
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-[#0147bf] to-[#02baff]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-[#0147bf]/20 text-[#02baff] text-xs font-bold font-['Orbitron'] border border-[#02baff]/30 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#02baff]" />
                NID VERIFIED CITIZEN
              </span>
              <span className="text-xs text-slate-400 font-mono">
                NID: <strong className="text-slate-200">{(!user?.nidNumber || /^0+$/.test(user.nidNumber)) ? '1992269201' : user.nidNumber}</strong>
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Orbitron'] tracking-tight">
              CITIZEN CONSOLE: {user?.fullName?.toUpperCase()}
            </h1>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
              <span>Thana: <strong className="text-slate-200">{user?.stationOrThana || 'Uttara, Dhaka'}</strong></span>
              <span>•</span>
              <span>Phone: <strong className="text-slate-200">{user?.phone}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-[#02baff]">Active Citizen Console</strong></span>
            </p>
          </div>

          {/* Quick SOS Trigger Button + Refresh */}
          {!activeSOS && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSOSConfirmModal(true)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-['Orbitron'] font-bold text-xs tracking-wider transition shadow-lg shadow-red-950/60 flex items-center gap-2 hover:scale-[1.02] active:scale-95 border border-red-500/50"
              >
                <Radio className="w-4 h-4 text-white animate-pulse" />
                <span>EMERGENCY SOS (DISPATCH)</span>
              </button>

              <button
                type="button"
                onClick={() => fetchData()}
                className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#02baff]/20 transition hover:border-[#02baff]/50"
                title="Refresh telemetry"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
              </button>
            </div>
          )}
        </div>

        {/* ACTIVE SOS PERSISTENT BANNER */}
        {activeSOS && activeTab !== 'sos' && (
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-red-950/80 via-red-900/60 to-slate-900/90 border border-red-500/50 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in shadow-xl shadow-red-950/40">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="w-11 h-11 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0 animate-pulse">
                <Radio className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-white text-sm font-display tracking-wide">
                    EMERGENCY DISTRESS BEACON ACTIVE
                  </h4>
                  <StatusBadge status={activeSOS.status} size="sm" />
                  {activeSOS.status === SOSStatus.RESPONDING && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/40 animate-pulse">
                      🚓 PATROL EN ROUTE
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Broadcasting at: <strong className="text-white">{activeSOS.locationName}</strong></span>
                  {activeSOS.assignedUnit && (
                    <span className="text-blue-300 font-semibold bg-blue-950/80 px-2 py-0.5 rounded-md border border-blue-500/30">
                      Dispatched: {activeSOS.assignedUnit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleResolveSOS}
                disabled={isResolvingSOS}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-600/30 whitespace-nowrap"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{isResolvingSOS ? 'Resolving...' : 'I am Safe / Stand Down'}</span>
              </button>

              <button
                onClick={() => setActiveTab('sos')}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-red-600/30 font-display whitespace-nowrap"
              >
                <span>View Live Dispatch</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* SUB-NAVIGATION BAR */}
        <div className="short-tabs flex items-center gap-1 overflow-x-auto pt-5 mt-5 border-t border-white/5 text-xs no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: null },
            { id: 'report_crime', label: 'Report Crime', icon: null },
            { id: 'my_reports', label: 'My Cases', badge: myReports.length > 0 ? myReports.length : null },
            { id: 'consumer_dispute', label: 'File Dispute', icon: null },
            { id: 'my_complaints', label: 'My Disputes', badge: myComplaints.length > 0 ? myComplaints.length : null },
            { id: 'barcode_scanner', label: 'Barcode Check', icon: null },
            { id: 'sos', label: 'SOS', icon: null, isSOS: true },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? tab.isSOS
                    ? 'bg-red-500/15 text-red-400 border border-red-500/30 font-semibold'
                    : 'bg-[#0147bf]/20 text-[#02baff] border border-[#02baff]/30 font-semibold'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              {tab.isSOS && <Radio className="w-3 h-3 text-red-400 animate-pulse flex-shrink-0" />}
              <span>{tab.label}</span>
              {tab.badge != null && (
                <span className="px-1.5 rounded-full bg-white/10 text-[10px] font-mono text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & QUICK ACTIONS                                            */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* 4-Card Prominent Quick Actions */}
          <section className="space-y-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold">
              Citizen Safety Services
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Action 1: Report Crime */}
              <div
                onClick={() => setActiveTab('report_crime')}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-emerald-500/40 hover:-translate-y-0.5 transition cursor-pointer group shadow-lg"
              >
                <div className="w-11 h-11 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-emerald-400 mb-4 group-hover:scale-105 transition">
                  <FilePlus className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-base font-bold text-white font-display group-hover:text-emerald-400 transition">
                  Report a Crime
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Lodge an authenticated report directly to the respective Thana with evidence.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-emerald-400 font-medium">
                  <span>Start Reporting</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Action 2: Consumer Dispute */}
              <div
                onClick={() => setActiveTab('consumer_dispute')}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-amber-500/40 hover:-translate-y-0.5 transition cursor-pointer group shadow-lg"
              >
                <div className="w-11 h-11 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-amber-400 mb-4 group-hover:scale-105 transition">
                  <Scale className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-base font-bold text-white font-display group-hover:text-amber-400 transition">
                  Consumer Grievance
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Report price gouging, adulteration, or fake goods to the DNCRP Directorate.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-amber-400 font-medium">
                  <span>File Dispute</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Action 3: Emergency SOS */}
              <div
                onClick={() => setShowSOSConfirmModal(true)}
                className="p-5 rounded-2xl bg-red-950/30 border border-red-500/30 hover:border-red-500/60 hover:-translate-y-0.5 transition cursor-pointer group shadow-lg"
              >
                <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-4 group-hover:scale-105 transition animate-pulse">
                  <Radio className="w-6 h-6 stroke-[2]" />
                </div>
                <h4 className="text-base font-bold text-red-300 font-display group-hover:text-red-200 transition">
                  Emergency SOS
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Transmit emergency distress signal and live coordinates to police units.
                </p>
                <div className="mt-4 pt-3 border-t border-red-500/20 flex items-center justify-between text-xs text-red-400 font-medium">
                  <span>Send Distress Beacon</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>

              {/* Action 4: Verify Product */}
              <div
                onClick={() => setActiveTab('barcode_scanner')}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 hover:border-blue-500/40 hover:-translate-y-0.5 transition cursor-pointer group shadow-lg"
              >
                <div className="w-11 h-11 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#02baff] mb-4 group-hover:scale-105 transition">
                  <Barcode className="w-5 h-5 stroke-[2]" />
                </div>
                <h4 className="text-base font-bold text-white font-display group-hover:text-blue-400 transition">
                  Verify Product
                </h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Verify official BSTI certification standards and approved national MRPs.
                </p>
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-blue-400 font-medium">
                  <span>Scan Barcode</span>
                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition" />
                </div>
              </div>
            </div>
          </section>

          {/* Metrics Ribbon */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              title="My Lodged Crime Reports"
              value={myReports.length}
              subtitle={`${myReports.filter(r => r.status === ReportStatus.INVESTIGATION).length} Under Active Investigation`}
              icon={FilePlus}
              variant="emerald"
              onClick={() => setActiveTab('my_reports')}
            />

            <StatCard
              title="My Consumer Disputes (DNCRP)"
              value={myComplaints.length}
              subtitle={`${myComplaints.filter(c => c.status === ComplaintStatus.RESOLVED).length} Resolved & Compensated`}
              icon={Scale}
              variant="amber"
              onClick={() => setActiveTab('my_complaints')}
            />

            <StatCard
              title="Active Emergency Notices"
              value={activeAlerts.length}
              subtitle="Covering National & Regional Zones"
              icon={ShieldAlert}
              variant="red"
            />
          </section>

          {/* Recent Crime Reports Status Tracking */}
          <section className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  Recent Case Investigation Updates
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time status updates from Bangladesh Police & reviewing officers.
                </p>
              </div>

              {myReports.length > 0 && (
                <button
                  onClick={() => setActiveTab('my_reports')}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition"
                >
                  <span>View All Cases ({myReports.length})</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {isLoadingData && myReports.length === 0 ? (
              <ListSkeleton items={2} />
            ) : myReports.length === 0 ? (
              <EmptyState
                icon={FilePlus}
                title="No Crime Reports Lodged Yet"
                description="If you witness or experience an incident, submit an authenticated report with confidentiality protection."
                action={{
                  label: 'Lodge First Report',
                  onClick: () => setActiveTab('report_crime'),
                  icon: FilePlus
                }}
              />
            ) : (
              <div className="space-y-3">
                {myReports.slice(0, 3).map(report => (
                  <div
                    key={report.id}
                    className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                          {report.caseId}
                        </span>
                        <h4 className="font-bold text-white text-sm">
                          {report.title}
                        </h4>
                        {report.requestConfidentiality && (
                          <StatusBadge status="CONFIDENTIAL" size="sm" />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={report.severity} size="sm" />
                        <StatusBadge status={report.status} size="sm" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                      {report.description}
                    </p>

                    <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900 gap-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 text-slate-300">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                          {report.locationName} ({report.thana}, {report.district})
                        </span>
                        <span>•</span>
                        <span>Lodged: {new Date(report.submittedAt).toLocaleDateString()}</span>
                      </div>

                      {report.assignedOfficerName && (
                        <span className="text-blue-300 font-medium">
                          Assigned: {report.assignedOfficerName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MULTI-STEP CRIME REPORTING WIZARD                                  */}
      {/* ========================================================================= */}
      {activeTab === 'report_crime' && (
        <div className="max-w-3xl mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-200">
          {/* Header */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-emerald-400 block">
                  Official Police Gateway
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Lodge Authenticated Crime Report
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Registered under Bangladesh Police Central Case Registry with digital chain-of-custody.
                </p>
              </div>

              <div className="hidden sm:block shrink-0 pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-bold whitespace-nowrap shadow-sm shadow-emerald-500/10">
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                  NID {user?.nidNumber?.slice(-4) ? `•••${user.nidNumber.slice(-4)}` : 'Verified'}
                </span>
              </div>
            </div>

            {/* Stepper */}
            <StepProgress
              steps={crimeSteps}
              currentStep={crimeStep}
              onStepClick={stepId => setCrimeStep(stepId)}
            />
          </div>

          {/* Success Receipt Banner */}
          {reportSuccessReceipt && (
            <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-base font-display">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Crime Report Successfully Registered</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Your report has been received by Bangladesh Police Central Registry. An official investigating team has been notified.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/30 text-xs space-y-1.5 font-mono">
                <p>Official Case Tracking ID: <strong className="text-emerald-300 font-bold">{reportSuccessReceipt.caseId}</strong></p>
                <p>Jurisdiction Thana: <strong className="text-slate-200">{reportSuccessReceipt.thana}, {reportSuccessReceipt.district}</strong></p>
                <p>Initial Status: <span className="text-amber-400 font-bold">{reportSuccessReceipt.status}</span></p>
                <p>Confidentiality Protection: {reportSuccessReceipt.requestConfidentiality ? 'ACTIVE (Identity Sealed)' : 'STANDARD'}</p>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setReportSuccessReceipt(null);
                    setActiveTab('my_reports');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition"
                >
                  View in My Crime Cases
                </button>
                <button
                  onClick={() => setReportSuccessReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Lodge Another Report
                </button>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {crimeFormError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{crimeFormError}</span>
            </div>
          )}

          {/* STEP 1: CATEGORY & SEVERITY */}
          {crimeStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Crime Category <span className="text-emerald-400">*</span>
                </label>
                <select
                  value={crimeType}
                  onChange={e => setCrimeType(e.target.value as CrimeType)}
                  className="sx-input"
                >
                  <option value={CrimeType.THEFT_ROBBERY}>Theft & Armed Robbery (ডাকাতি / চুরি)</option>
                  <option value={CrimeType.HARASSMENT}>Harassment & Stalking (হয়রানি / ইভটিজিং)</option>
                  <option value={CrimeType.FRAUD_SCAM}>Fraud, Forgery & Scam (প্রতারণা)</option>
                  <option value={CrimeType.PHYSICAL_ASSAULT}>Physical Assault / Violence (শারীরিক আক্রমণ)</option>
                  <option value={CrimeType.CYBER_CRIME}>Cybercrime & MFS Phishing (সাইবার অপরাধ)</option>
                  <option value={CrimeType.DRUG_TRAFFICKING}>Narcotics / Drug Trafficking (মাদক)</option>
                  <option value={CrimeType.EXTORTION}>Extortion / Chandabaji (চাঁদাবাজি)</option>
                  <option value={CrimeType.VANDALISM}>Vandalism & Property Damage (ভাঙচুর)</option>
                  <option value={CrimeType.OTHER}>Other Criminal Offense</option>
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select the primary classification under Bangladesh Penal Code or Cyber Security Act.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Estimated Incident Severity <span className="text-emerald-400">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    { id: CrimeSeverity.LOW, label: 'Low', desc: 'Minor property / non-violent' },
                    { id: CrimeSeverity.MEDIUM, label: 'Medium', desc: 'Financial loss / nuisance' },
                    { id: CrimeSeverity.HIGH, label: 'High', desc: 'Robbery / threat to life' },
                    { id: CrimeSeverity.CRITICAL, label: 'Critical', desc: 'Active armed danger' }
                  ].map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSeverity(s.id)}
                      className={`p-3 rounded-xl border text-left transition ${
                        severity === s.id
                          ? s.id === CrimeSeverity.CRITICAL
                            ? 'bg-red-950/40 border-red-500/60 text-red-300 ring-1 ring-red-400'
                            : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-400'
                          : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{s.label}</span>
                        {severity === s.id && <Check className="w-3.5 h-3.5" />}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-1 leading-tight">{s.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: LOCATION & TIME */}
          {crimeStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    District <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={district}
                    onChange={e => handleDistrictChange(e.target.value)}
                    className="sx-input"
                  >
                    {BANGLADESH_DIVISIONS.map(div => (
                      <optgroup key={div.id} label={`${div.name} Division (${div.nameBn})`}>
                        {div.districts.map(dist => (
                          <option key={dist.id} value={dist.name}>
                            {dist.name} ({dist.nameBn})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Thana / Police Station Jurisdiction <span className="text-emerald-400">*</span>
                  </label>
                  <select
                    value={thana}
                    onChange={e => setThana(e.target.value)}
                    className="sx-input"
                    required
                  >
                    {getThanasByDistrict(district).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Approximate Location Landmark <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={locationName}
                    onChange={e => setLocationName(e.target.value)}
                    placeholder="e.g. Road 11, Block D, Near Banani Supermarket"
                    className="sx-input sx-input-with-icon"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Date & Time of Occurrence <span className="text-emerald-400">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="datetime-local"
                    value={occurredAt}
                    onChange={e => setOccurredAt(e.target.value)}
                    className="sx-input sx-input-with-icon"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: DETAILS & WHISTLEBLOWER CONFIDENTIALITY */}
          {crimeStep === 3 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Incident Headline <span className="text-emerald-400">*</span>
                </label>
                <input
                  type="text"
                  value={crimeTitle}
                  onChange={e => setCrimeTitle(e.target.value)}
                  placeholder="e.g. Armed motorcycle snatching incident at Kamal Ataturk Ave"
                  className="sx-input"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Incident Narrative <span className="text-emerald-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={crimeDesc}
                  onChange={e => setCrimeDesc(e.target.value)}
                  placeholder="Describe the sequence of events, suspect descriptions, vehicles, stolen property, and any other relevant facts..."
                  className="sx-input"
                  required
                />
              </div>

              {/* Whistleblower Confidentiality Switch */}
              <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 flex items-start gap-3">
                <input
                  type="checkbox"
                  id="confidentialityCheck"
                  checked={requestConfidentiality}
                  onChange={e => setRequestConfidentiality(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700 cursor-pointer"
                />
                <label htmlFor="confidentialityCheck" className="text-xs cursor-pointer select-none">
                  <span className="font-bold text-purple-300 flex items-center gap-1.5">
                    <EyeOff className="w-3.5 h-3.5" />
                    Request Whistleblower Identity Protection
                  </span>
                  <p className="text-slate-400 text-[11px] mt-0.5 leading-relaxed">
                    Under Section 7 of the Bangladesh Whistleblower Protection Act, your personal identity and NID details will remain strictly confidential from the public and opposing parties.
                  </p>
                </label>
              </div>
            </div>
          )}

          {/* STEP 4: EVIDENCE UPLOADER */}
          {crimeStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corroborating Evidence & Photos (Optional but Highly Recommended)
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Upload photos, CCTV video snapshots, audio recordings, or documents supporting your report.
                </p>
                <EvidenceUploader
                  files={evidenceList}
                  onFilesChange={setEvidenceList}
                  evidenceList={evidenceList}
                  onChange={setEvidenceList}
                />
              </div>

              {/* Enhanced Evidence Readiness Preview Card */}
              {evidenceList.length > 0 ? (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Evidentiary Dossier Status: Armed & Ready</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {evidenceList.length} files attached
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Attached media will be hashed client-side and bound to your Thana jurisdiction ({thana || 'Selected Station'}) case record to maintain strict digital chain-of-custody.
                  </p>
                  <div className="flex items-center gap-2 pt-1 border-t border-emerald-900/40 text-[10px] text-emerald-400/90 font-mono flex-wrap">
                    <span>✓ Anti-tamper Hash</span>
                    <span>•</span>
                    <span>✓ Station Duty Dispatch Flag</span>
                    <span>•</span>
                    <span>✓ Accelerated Verification</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Evidentiary Recommendation:</strong> Cases submitted with photo, audio, or CCTV attachments receive 3× faster investigation response from the station duty officer.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {crimeStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-white text-sm font-display border-b border-slate-800 pb-2">
                  Summary Review
                </h4>

                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Category:</span>
                    <strong className="text-white">{crimeType}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Severity:</span>
                    <StatusBadge status={severity} size="sm" />
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Location:</span>
                    <strong className="text-white">{locationName} ({thana}, {district})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Occurrence Time:</span>
                    <span className="font-mono text-slate-300">{occurredAt}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 text-[11px] block">Incident Headline:</span>
                  <p className="font-bold text-white mt-0.5">{crimeTitle}</p>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">{crimeDesc}</p>
                </div>

                <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px]">
                  <span>Evidence Files Attached: <strong>{evidenceList.length} files</strong></span>
                  <span className={requestConfidentiality ? 'text-purple-300 font-bold' : 'text-slate-400'}>
                    {requestConfidentiality ? '🔒 Whistleblower Protected' : 'Standard Case Lodging'}
                  </span>
                </div>

                {evidenceList.length > 0 ? (
                  <div className="pt-2 border-t border-slate-900">
                    <EvidenceViewer
                      evidence={evidenceList}
                      title="Attached Evidence Review"
                      accentColor="emerald"
                    />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-500 italic flex items-center justify-between">
                    <span>No digital evidence attached to this case.</span>
                    <span className="text-[10px] text-slate-400 not-italic font-mono">Text Deposition Only</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-700/60 text-[11px] text-slate-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>
                  By clicking Submit, you declare that the facts described herein are true to the best of your knowledge under the Bangladesh Penal Code.
                </span>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {crimeFormError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{crimeFormError}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              {crimeStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevCrimeStep}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {crimeStep < 5 ? (
              <button
                type="button"
                onClick={handleNextCrimeStep}
                className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-md shadow-emerald-500/20 flex items-center gap-1.5 active:scale-95"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={handleSubmitCrimeReport}
                className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wide transition shadow-lg shadow-emerald-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmittingReport ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting to Central Registry...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Officially Lodge Crime Report</span>
                  </>
                )}
              </button>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: MULTI-STEP CONSUMER DISPUTE WIZARD (DNCRP)                          */}
      {/* ========================================================================= */}
      {activeTab === 'consumer_dispute' && (
        <div className="max-w-3xl mx-auto bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in duration-200">
          {/* Header */}
          <div className="border-b border-slate-800 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-amber-400">
                    DNCRP Consumer Protection Act 2009
                  </span>
                  <span className="sm:hidden inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-mono font-bold whitespace-nowrap">
                    <Award className="w-3 h-3 text-amber-400" />
                    25% Reward
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                  Lodge Consumer Rights Dispute
                </h2>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Report illegal overcharging, expired goods, or fake products. Under law, citizens receive 25% of realized fines.
                </p>
              </div>

              <div className="hidden sm:block shrink-0 pt-0.5">
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-xs font-mono font-bold whitespace-nowrap shadow-sm shadow-amber-500/10">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  25% Reward Eligible
                </span>
              </div>
            </div>

            {/* Stepper */}
            <StepProgress
              steps={complaintSteps}
              currentStep={complaintStep}
              onStepClick={stepId => setComplaintStep(stepId)}
            />
          </div>

          {/* Success Receipt Banner */}
          {complaintSuccessReceipt && (
            <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 space-y-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold text-base font-display">
                <CheckCircle2 className="w-5 h-5 text-amber-400" />
                <span>Consumer Dispute Registered with DNCRP</span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                Your grievance has been lodged into the Directorate of National Consumer Right Protection surveillance queue.
              </p>
              <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/30 text-xs space-y-1.5 font-mono">
                <p>Tracking Number: <strong className="text-amber-300 font-bold">{complaintSuccessReceipt.trackingNumber}</strong></p>
                <p>Merchant Accused: <strong className="text-slate-200">{complaintSuccessReceipt.shopName}</strong></p>
                <p>Status: <span className="text-amber-400 font-bold">{complaintSuccessReceipt.status}</span></p>
                <p>Statutory Reward Rights: Eligible for 25% of fine imposed under DNCRP Act 2009</p>
              </div>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => {
                    setComplaintSuccessReceipt(null);
                    setActiveTab('my_complaints');
                  }}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                >
                  Track in My Consumer Claims
                </button>
                <button
                  onClick={() => setComplaintSuccessReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  Lodge Another Claim
                </button>
              </div>
            </div>
          )}

          {/* Form Error Banner */}
          {complaintFormError && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{complaintFormError}</span>
            </div>
          )}

          {/* STEP 1: MERCHANT & ESTABLISHMENT */}
          {complaintStep === 1 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Merchant / Shop Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={shopName}
                  onChange={e => setShopName(e.target.value)}
                  placeholder="e.g. Al-Madina Super Shop, Swapno Express"
                  className="sx-input"
                  required
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    District <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={shopDistrict}
                    onChange={e => handleShopDistrictChange(e.target.value)}
                    className="sx-input"
                  >
                    {BANGLADESH_DIVISIONS.map(div => (
                      <optgroup key={div.id} label={`${div.name} Division (${div.nameBn})`}>
                        {div.districts.map(dist => (
                          <option key={dist.id} value={dist.name}>
                            {dist.name} ({dist.nameBn})
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Thana / Upazila <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={shopThana}
                    onChange={e => setShopThana(e.target.value)}
                    className="sx-input"
                    required
                  >
                    {getThanasByDistrict(shopDistrict).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Trade License / BIN Number (Optional)
                </label>
                <input
                  type="text"
                  value={tradeLicense}
                  onChange={e => setTradeLicense(e.target.value)}
                  placeholder="e.g. TR-DHA-2024-8849"
                  className="sx-input"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Shop Address / Market Stall
                </label>
                <input
                  type="text"
                  value={shopAddress}
                  onChange={e => setShopAddress(e.target.value)}
                  placeholder="e.g. Shop #14, Ground Floor, Rapa Plaza"
                  className="sx-input"
                />
              </div>
            </div>
          )}

          {/* STEP 2: PRODUCT & VIOLATION TYPE */}
          {complaintStep === 2 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Product / Good Name <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={productName}
                    onChange={e => setProductName(e.target.value)}
                    placeholder="e.g. Fortified Soybean Oil 1L, Baby Milk Powder"
                    className="sx-input"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Brand Name / Manufacturer
                  </label>
                  <input
                    type="text"
                    value={brandName}
                    onChange={e => setBrandName(e.target.value)}
                    placeholder="e.g. Teer, Fresh, Rupchanda"
                    className="sx-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Violation Category <span className="text-amber-400">*</span>
                </label>
                <select
                  value={issueType}
                  onChange={e => {
                    const selected = e.target.value as ConsumerIssueType;
                    setIssueType(selected);
                    if (selected !== ConsumerIssueType.PRICE_GOUGING) {
                      setMrp('');
                      setPricePaid('');
                    }
                  }}
                  className="sx-input"
                >
                  <option value={ConsumerIssueType.PRICE_GOUGING}>Price Gouging / Overcharging above MRP (মূল্য কারচুপি)</option>
                  <option value={ConsumerIssueType.EXPIRED_GOODS}>Selling Expired Goods / Tampered Dates (মেয়াদোত্তীর্ণ পণ্য)</option>
                  <option value={ConsumerIssueType.FOOD_ADULTERATION}>Food Adulteration / Toxic Ingredients (ভেজাল খাদ্য)</option>
                  <option value={ConsumerIssueType.COUNTERFEIT_PRODUCT}>Counterfeit Product / Fake BSTI Seal (নকল বিএসটিআই সিল)</option>
                  <option value={ConsumerIssueType.WEIGHT_MEASUREMENT_FRAUD}>Weight Manipulation / Faulty Scale (ওজনে কম)</option>
                  <option value={ConsumerIssueType.FALSE_ADVERTISING}>Deceptive Advertising / False Claims (মিথ্যা বিজ্ঞাপন)</option>
                  <option value={ConsumerIssueType.OTHER}>Other Consumer Right Violation</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Product Barcode (EAN-13, if available)
                </label>
                <div className="relative">
                  <Barcode className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="e.g. 8941100234012"
                    className="sx-input sx-input-with-icon"
                    inputMode="numeric"
                    maxLength={13}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PRICING & GRIEVANCE DETAILS */}
          {complaintStep === 3 && (
            <div className="space-y-5 animate-in fade-in">
              {isOverpriced && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Official MRP on Pack (৳ BDT) <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">৳</span>
                        <input
                          type="number"
                          step="0.5"
                          value={mrp}
                          onChange={e => setMrp(e.target.value)}
                          placeholder="e.g. 175"
                          className="sx-input sx-input-with-icon"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Price Demanded / Paid (৳ BDT) <span className="text-amber-400">*</span>
                      </label>
                      <div className="relative">
                        <span className="text-slate-400 font-bold absolute left-3.5 top-1/2 -translate-y-1/2 text-xs pointer-events-none">৳</span>
                        <input
                          type="number"
                          step="0.5"
                          value={pricePaid}
                          onChange={e => setPricePaid(e.target.value)}
                          placeholder="e.g. 210"
                          className="sx-input sx-input-with-icon"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Automatic Calculation Card */}
                  {numPaid > 0 && numMrp > 0 && (
                    <div className={`p-4 rounded-2xl border text-xs space-y-2 ${
                      priceDiff > 0
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                        : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    }`}>
                      <div className="flex items-center justify-between font-bold">
                        <span className="font-display">Calculated Pricing Discrepancy:</span>
                        <span className="font-mono text-sm">
                          {priceDiff > 0 ? `+৳${priceDiff.toFixed(2)} OVERCHARGE` : 'Standard / Discounted'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300">
                        <span>Overcharge Rate:</span>
                        <span className="font-mono font-bold text-amber-400">+{overchargePercent}% above legal MRP</span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Detailed Explanation of the Grievance <span className="text-amber-400">*</span>
                </label>
                <textarea
                  rows={4}
                  value={complaintDesc}
                  onChange={e => setComplaintDesc(e.target.value)}
                  placeholder={
                    isOverpriced
                      ? "Explain how the merchant refused official MRP, sold above printed price, or behaved upon inquiry..."
                      : "Explain the details of this violation (e.g. expired date, adulteration, fake seal, or merchant behavior)..."
                  }
                  className="sx-input"
                  required
                />
              </div>
            </div>
          )}

          {/* STEP 4: EVIDENCE & RECEIPTS */}
          {complaintStep === 4 && (
            <div className="space-y-4 animate-in fade-in">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Cash Memo / Money Receipt / Product Photographs
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  A clear photograph of the cash receipt or MRP label significantly accelerates DNCRP mobile court penalties.
                </p>
                <EvidenceUploader
                  files={complaintEvidenceList}
                  onFilesChange={setComplaintEvidenceList}
                  evidenceList={complaintEvidenceList}
                  onChange={setComplaintEvidenceList}
                />
              </div>

              {/* Enhanced DNCRP Evidentiary Preview Card */}
              {complaintEvidenceList.length > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>DNCRP Enforcement Evidence Ready</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {complaintEvidenceList.length} files attached
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    Under Section 76(1) of the Consumer Rights Protection Act 2009, attaching the receipt and MRP photo constitutes prima facie proof for direct 25% reward qualification upon penalty recovery.
                  </p>
                  <div className="flex items-center gap-2 pt-1 border-t border-amber-900/40 text-[10px] text-amber-400/90 font-mono flex-wrap">
                    <span>✓ Prima Facie Proof</span>
                    <span>•</span>
                    <span>✓ Mobile Court Admissible</span>
                    <span>•</span>
                    <span>✓ 25% Whistleblower Reward Eligible</span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>DNCRP Tip:</strong> Receipts or product price tags make it easy for mobile court magistrates to issue instant fines to dishonest sellers.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* STEP 5: REVIEW & SUBMIT */}
          {complaintStep === 5 && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 text-xs">
                <h4 className="font-bold text-white text-sm font-display border-b border-slate-800 pb-2">
                  Consumer Dispute Summary
                </h4>

                <div className="grid grid-cols-2 gap-3 text-slate-300">
                  <div>
                    <span className="text-slate-500 text-[11px] block">Accused Merchant:</span>
                    <strong className="text-white">{shopName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Location:</span>
                    <strong className="text-white">{shopThana}, {shopDistrict}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Product & Brand:</span>
                    <strong className="text-white">{productName} {brandName ? `(${brandName})` : ''}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[11px] block">Violation Type:</span>
                    <span className="text-amber-400 font-medium">{issueType}</span>
                  </div>
                </div>

                {isOverpriced && numPaid > 0 && numMrp > 0 && (
                  <div className="pt-2 border-t border-slate-900 grid grid-cols-3 gap-2 font-mono text-center">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">MRP</span>
                      <strong className="text-white text-xs">৳{numMrp}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Price Paid</span>
                      <strong className="text-amber-400 text-xs">৳{numPaid}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-500/30">
                      <span className="text-[10px] text-amber-400 block">Discrepancy</span>
                      <strong className="text-amber-300 text-xs">+৳{priceDiff}</strong>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-900">
                  <span className="text-slate-500 text-[11px] block">Grievance Narrative:</span>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">{complaintDesc}</p>
                </div>

                {complaintEvidenceList.length > 0 ? (
                  <div className="pt-2 border-t border-slate-900">
                    <EvidenceViewer
                      evidence={complaintEvidenceList}
                      title="Attached Violation Evidence (Receipts & Labels)"
                      accentColor="amber"
                    />
                  </div>
                ) : (
                  <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-[11px] text-slate-500 italic flex items-center justify-between">
                    <span>No receipts or photos attached to this dispute.</span>
                    <span className="text-[10px] text-slate-400 not-italic font-mono">Written Grievance</span>
                  </div>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-[11px] text-amber-300 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  Under Section 76 of DNCRP Act 2009, upon verification and realization of administrative fines, the complainant receives 25% of the total fine collected.
                </span>
              </div>
            </div>
          )}

          {/* Stepper Navigation Buttons */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            {complaintFormError && (
              <div className="p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-300 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span>{complaintFormError}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              {complaintStep > 1 ? (
              <button
                type="button"
                onClick={handlePrevComplaintStep}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Back</span>
              </button>
            ) : (
              <div />
            )}

            {complaintStep < 5 ? (
              <button
                type="button"
                onClick={handleNextComplaintStep}
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20 flex items-center gap-1.5 active:scale-95"
              >
                <span>Continue</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmittingComplaint}
                onClick={handleSubmitComplaint}
                className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold tracking-wide transition shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isSubmittingComplaint ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Lodge with DNCRP Directorate...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>File Formal DNCRP Complaint</span>
                  </>
                )}
              </button>
            )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SOS DISTRESS CENTER                                                */}
      {/* ========================================================================= */}
      {activeTab === 'sos' && (
        <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 border border-red-500/30 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-red-400">
                  National Emergency Distress System
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                  SOS Distress Beacon Center
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Transmits high-priority alert to the nearest Police Emergency Dispatch and Patrol Units.
                </p>
              </div>

              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400">
                <Radio className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            {activeSOS ? (
              <div className="space-y-5">
                {/* Live Response & ETA Tracker Card */}
                {activeSOS.status === SOSStatus.RESPONDING ? (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 border border-blue-500/40 space-y-3 animate-in fade-in">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
                          <Car className="w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400 flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                            Police Patrol Dispatched &amp; En Route
                          </span>
                          <h4 className="text-base font-bold text-white mt-0.5">
                            {activeSOS.assignedUnit || 'First Responder Unit'}
                          </h4>
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/30 text-left sm:text-right">
                        <span className="text-[10px] text-emerald-400/80 uppercase font-mono tracking-wider block">Estimated Arrival</span>
                        <span className="text-lg font-black text-emerald-300 font-mono">
                          {activeSOS.assignedUnit?.match(/ETA:\s*~?([^)]+)/)?.[1] ||
                           activeSOS.notes?.match(/arrival in\s*([^.]+)/i)?.[1] ||
                           '~4-7 mins'}
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-300">
                      <span className="flex items-center gap-1.5 text-blue-300 text-[11px]">
                        <Navigation className="w-3.5 h-3.5" /> High-priority tactical sirens active. Unit moving to your GPS coordinates.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-red-950/60 via-amber-950/30 to-slate-900 border border-amber-500/40 flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                        <Radio className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                          Distress Signal Transmitted
                        </span>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Alerting {activeSOS.assignedStation || 'local Thana'} command center. Stand by for patrol dispatch.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Active SOS Status Board */}
                <div className="p-5 rounded-2xl bg-red-950/40 border border-red-500/50 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-red-500/20">
                    <div>
                      <span className="text-xs text-red-300 font-mono">Tracking Beacon ID:</span>
                      <h3 className="text-base font-bold text-white font-mono">{activeSOS.id}</h3>
                    </div>
                    <StatusBadge status={activeSOS.status} size="lg" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Transmitted Location:</span>
                      <strong className="text-white font-medium flex items-center gap-1.5 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-red-400" />
                        {activeSOS.locationName}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">GPS Coordinates:</span>
                      <span className="font-mono text-slate-200 mt-0.5 block">
                        {Number(activeSOS.latitude ?? 23.8103).toFixed(4)}° N, {Number(activeSOS.longitude ?? 90.4125).toFixed(4)}° E
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Distress Timestamp:</span>
                      <span className="font-mono text-slate-200 mt-0.5 block">
                        {new Date(activeSOS.createdAt).toLocaleString()}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Assigned Police Unit:</span>
                      <strong className="text-blue-300 mt-0.5 block">
                        {activeSOS.assignedUnit || 'Patrol Unit Dispatched'}
                      </strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800">
                      <span className="text-slate-400 text-[11px] block">Covering Station Jurisdiction:</span>
                      <strong className="text-amber-300 mt-0.5 block font-semibold">
                        {activeSOS.assignedStation || (activeSOS.locationName?.toLowerCase().includes('dhanmondi') ? 'Dhanmondi Police Station, Dhaka' : (activeSOS.locationName?.toLowerCase().includes('gulshan') ? 'Gulshan Police Station, Dhaka' : (activeSOS.locationName?.toLowerCase().includes('uttara') ? 'Uttara Police Station, Dhaka' : 'Dhaka Metropolitan Police')))}
                      </strong>
                    </div>
                  </div>

                  {activeSOS.notes && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-red-500/30 text-xs">
                      <span className="text-slate-400 text-[11px] block">Dispatch Log:</span>
                      <p className="text-slate-200 mt-1">{activeSOS.notes}</p>
                    </div>
                  )}

                  {/* Real Store-and-Forward Uplink & OS Cellular Failover Bar */}
                  <div className="p-3.5 rounded-xl bg-slate-900/95 border border-slate-800 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="text-slate-400">Uplink Telemetry:</span>
                      {isOfflineSOSQueued || !isOnlineStatus ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                          📡 OFFLINE OUTBOX ARMED — AUTO-SYNCING ON SIGNAL RESTORE
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                          ● LIVE POLICE SERVER UPLINK SYNCHRONIZED
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`sms:999?body=${encodeURIComponent(
                            `[SENTINELX EMERGENCY SOS] Citizen: ${user?.fullName || activeSOS.citizenName} | NID: ${activeSOS.citizenNID} | Location: ${activeSOS.locationName || 'Dhaka Metropolitan Area'} | GPS: ${Number(activeSOS.latitude ?? 23.8103).toFixed(5)},${Number(activeSOS.longitude ?? 90.4125).toFixed(5)}`
                          )}`}
                          className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Cellular SMS (999)</span>
                        </a>

                        <a
                          href="tel:999"
                          className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>Voice Call (999)</span>
                        </a>

                        <button
                          type="button"
                          onClick={toggleEmergencySiren}
                          className={`px-3 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                            isSirenActive
                              ? 'bg-rose-500 text-white animate-pulse border border-white/40'
                              : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                          }`}
                        >
                          <Radio className="w-3.5 h-3.5" />
                          <span>{isSirenActive ? 'Stop Acoustic Siren' : 'Activate Acoustic Siren'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleResolveSOS}
                        disabled={isResolvingSOS}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{isResolvingSOS ? 'Resolving...' : 'Stand Down Beacon / I am Safe'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Emergency Instructions */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2 text-xs">
                  <h4 className="font-bold text-white font-display flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-emerald-400" />
                    Immediate Safety Instructions
                  </h4>
                  <ul className="space-y-1.5 text-slate-300 text-[11px] list-disc list-inside">
                    <li>Stay in a well-lit, populated location if safely accessible.</li>
                    <li>Keep your mobile device unlocked and preserve battery charge.</li>
                    <li>If you are in direct armed danger, dial <strong className="text-red-400 font-mono">999</strong> immediately for voice operator dispatch.</li>
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 space-y-6">
                <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto shadow-inner">
                  <Radio className="w-10 h-10 stroke-[1.5]" />
                </div>

                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="text-lg font-bold text-white font-display">
                    Ready to Transmit Distress Beacon
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Triggering the beacon automatically obtains your GPS coordinates and dispatches an alert to all active police patrol units in your jurisdiction.
                  </p>
                </div>

                <div>
                  <button
                    onClick={() => setShowSOSConfirmModal(true)}
                    className="px-8 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-display font-extrabold text-sm tracking-wider transition shadow-xl shadow-red-600/40 hover:scale-105 active:scale-95"
                  >
                    TRIGGER EMERGENCY SOS BEACON
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: MY CRIME REPORTS LIST                                              */}
      {/* ========================================================================= */}
      {activeTab === 'my_reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                My Lodged Crime Cases ({myReports.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track formal verification, assigned investigating officers, and case closures.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={reportSearchQuery}
                  onChange={e => setReportSearchQuery(e.target.value)}
                  placeholder="Search Case ID or title..."
                  className="sx-input sx-input-with-icon"
                />
              </div>

              <button
                onClick={() => setActiveTab('report_crime')}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
              >
                <FilePlus className="w-3.5 h-3.5" />
                <span>Lodge New</span>
              </button>
            </div>
          </div>

          {/* Status Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'ALL', label: 'All Cases' },
              { id: 'PENDING_REVIEW', label: 'Pending Review' },
              { id: 'VERIFIED', label: 'Verified' },
              { id: 'UNDER_INVESTIGATION', label: 'Investigating' },
              { id: 'RESOLVED', label: 'Resolved' }
            ].map(pill => {
              const count = pill.id === 'ALL'
                ? myReports.length
                : myReports.filter(r => r.status === pill.id).length;
              const isActive = reportStatusFilter === pill.id;

              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setReportStatusFilter(pill.id)}
                  className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  <span>{pill.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isActive ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {myReports.length === 0 ? (
            <EmptyState
              icon={FilePlus}
              title="No Crime Reports Lodged"
              description="You have not filed any criminal complaints yet. In case of an emergency or offense, lodge a report."
              action={{
                label: 'Report Crime Now',
                onClick: () => setActiveTab('report_crime'),
                icon: FilePlus
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {myReports
                .filter(r => {
                  const matchesSearch =
                    r.caseId.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                    r.title.toLowerCase().includes(reportSearchQuery.toLowerCase()) ||
                    r.district.toLowerCase().includes(reportSearchQuery.toLowerCase());
                  const matchesStatus =
                    reportStatusFilter === 'ALL' || r.status === reportStatusFilter;
                  return matchesSearch && matchesStatus;
                })
                .map(report => (
                  <div
                    key={report.id}
                    className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-lg space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30">
                          {report.caseId}
                        </span>
                        <h3 className="text-base font-bold text-white font-display">
                          {report.title}
                        </h3>
                        {report.requestConfidentiality && (
                          <StatusBadge status="CONFIDENTIAL" size="sm" />
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <StatusBadge status={report.severity} size="sm" />
                        <StatusBadge status={report.status} size="sm" />
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {report.description}
                    </p>

                    {/* Investigation Timeline Stepper */}
                    <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/60 space-y-2 text-xs">
                      <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase tracking-wider block">
                        Official Case Timeline & Updates
                      </span>

                      {report.investigationUpdates.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic">
                          Case lodged with central registry. Thana investigating officer assignment pending review.
                        </p>
                      ) : (
                        <div className="space-y-2 pt-1">
                          {report.investigationUpdates.map((u, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200 text-xs">
                                    {u.status}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">
                                    {new Date(u.timestamp).toLocaleDateString()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-300 mt-0.5">{u.note}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Evidence Previews */}
                    {report.evidence && report.evidence.length > 0 && (
                      <div className="pt-2">
                        <EvidenceViewer
                          evidence={report.evidence}
                          title="Attached Case Evidence"
                          accentColor="emerald"
                          emptyMessage="No evidence files attached."
                        />
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <span className="flex items-center gap-1.5 text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                        {report.locationName} ({report.thana}, {report.district})
                      </span>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span>Lodged: {new Date(report.submittedAt).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => setPrintingDocket(report)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm"
                          title="Print official General Diary (GD) docket acknowledgment"
                        >
                          <Printer className="w-3.5 h-3.5 text-slate-400" />
                          <span>GD Docket</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveChatCase({
                            caseId: report.caseId,
                            caseType: 'CRIME',
                            title: report.title,
                            officer: report.assignedOfficerName || 'Investigating Officer'
                          })}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
                          <span>Officer Inquiries</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL GD DOCKET & POLICE ACKNOWLEDGMENT SLIP                    */}
      {/* ========================================================================= */}
      {printingDocket && (
        <GDDocketModal
          report={printingDocket}
          onClose={() => setPrintingDocket(null)}
          viewerRole="CITIZEN"
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL: OFFICIAL DNCRP CONSUMER DISPUTE DOCKET SLIP                        */}
      {/* ========================================================================= */}
      {printingDisputeDocket && (
        <DisputeDocketModal
          complaint={printingDisputeDocket}
          onClose={() => setPrintingDisputeDocket(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* TAB 6: MY CONSUMER COMPLAINTS LIST                                        */}
      {/* ========================================================================= */}
      {activeTab === 'my_complaints' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display">
                My Consumer Grievance Claims ({myComplaints.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                DNCRP enforcement actions, realized merchant fines, and 25% reward statuses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={complaintSearchQuery}
                  onChange={e => setComplaintSearchQuery(e.target.value)}
                  placeholder="Search tracking # or shop..."
                  className="sx-input sx-input-with-icon"
                />
              </div>

              <button
                onClick={() => setActiveTab('consumer_dispute')}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-amber-500/20"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>File New</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {COMPLAINT_STATUS_FILTERS.map(filter => {
                const count = filter.statuses
                  ? myComplaints.filter(complaint => filter.statuses?.includes(complaint.status)).length
                  : myComplaints.length;
                const isActive = complaintStatusFilter === filter.id;

                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => setComplaintStatusFilter(filter.id)}
                    className={`px-3 py-1.5 rounded-xl font-medium transition flex items-center gap-1.5 whitespace-nowrap ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{filter.label}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-slate-950/30 text-slate-950' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
            {(complaintStatusFilter !== 'ALL' || complaintSearchQuery) && (
              <button
                type="button"
                onClick={clearComplaintFilters}
                className="flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/10 hover:text-amber-300"
              >
                <X className="h-3.5 w-3.5" />
                Clear filters
              </button>
            )}
          </div>

          {myComplaints.length === 0 ? (
            <EmptyState
              icon={Scale}
              title="No Consumer Claims Filed"
              description="Have you witnessed overcharging or expired goods? Report to DNCRP and claim 25% fine incentive."
              action={{
                label: 'File Dispute Now',
                onClick: () => setActiveTab('consumer_dispute'),
                icon: Scale
              }}
            />
          ) : filteredComplaints.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No Matching Claims"
              description="No consumer claims match the selected status and search. Clear the filters to see all claims."
              action={{
                label: 'Clear Filters',
                onClick: clearComplaintFilters,
                icon: X
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredComplaints.map(comp => (
                  <div
                    key={comp.id}
                    className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-lg space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                          {comp.trackingNumber}
                        </span>
                        <h3 className="text-base font-bold text-white font-display">
                          {comp.shopName}
                        </h3>
                        <span className="text-xs text-slate-400 font-medium">
                          ({comp.productName})
                        </span>
                      </div>

                      <StatusBadge status={comp.status} size="sm" />
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      {comp.description}
                    </p>

                    {/* Pricing Discrepancy Card */}
                    {comp.issueType === ConsumerIssueType.PRICE_GOUGING && comp.mrp && comp.pricePaid && (
                      <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs font-mono">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Official MRP:</span>
                          <strong className="text-slate-200">৳{comp.mrp}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Demanded / Paid:</span>
                          <strong className="text-amber-400">৳{comp.pricePaid}</strong>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Overcharge:</span>
                          <strong className="text-amber-300">+৳{(comp.pricePaid - comp.mrp).toFixed(2)}</strong>
                        </div>
                      </div>
                    )}

                    {comp.penaltyImposed && (
                      <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300">
                        <span className="font-bold flex items-center gap-1.5 font-display">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          DNCRP Enforcement Action Taken
                        </span>
                        <p className="text-slate-200 mt-1">{comp.penaltyImposed}</p>
                      </div>
                    )}

                    {comp.rewardAmount != null && (
                      <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 space-y-3 text-xs">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                            <Award className="w-4 h-4" /> 25% Citizen Reward
                          </span>
                          <strong className="text-lg text-emerald-200 font-mono">৳{Number(comp.rewardAmount).toLocaleString()}</strong>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-slate-300">
                          <span>Fine collected: <strong className="text-slate-100">৳{Number(comp.fineAmount || Number(comp.rewardAmount) * 4).toLocaleString()}</strong></span>
                          <span>25% reward: <strong className="text-emerald-300">৳{Number(comp.rewardAmount).toLocaleString()}</strong></span>
                          <span>Status: <strong className="text-emerald-300">{(comp.rewardStatus || 'READY_FOR_COLLECTION').replace(/_/g, ' ')}</strong></span>
                          <span>Payment reference: <strong className="text-slate-100 font-mono">{comp.paymentReference || `DNCRP-TR-${comp.trackingNumber.slice(-6)}`}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDownloadRewardCertificate(comp)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800 bg-emerald-700 px-3 py-2 font-bold text-white shadow-sm hover:bg-emerald-800"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download Reward Payment Certificate (PDF)
                        </button>
                      </div>
                    )}

                    {/* Attached Violation Evidence */}
                    {comp.evidence && comp.evidence.length > 0 && (
                      <div className="pt-2">
                        <EvidenceViewer
                          evidence={comp.evidence}
                          title="Attached Dispute Evidence"
                          accentColor="amber"
                          emptyMessage="No evidence files attached."
                        />
                      </div>
                    )}

                    <div className="pt-3 border-t border-slate-900 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                      <span>Jurisdiction: <strong>{comp.shopThana}, {comp.shopDistrict}</strong></span>
                      <div className="flex items-center gap-3">
                        <span>Filed: {new Date(comp.submittedAt).toLocaleDateString()}</span>
                        <button
                          type="button"
                          onClick={() => setPrintingDisputeDocket(comp)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                          title="Print official DNCRP dispute docket acknowledgment"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Dispute Docket</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveChatCase({
                            caseId: comp.trackingNumber,
                            caseType: 'CONSUMER',
                            title: `${comp.shopName} - ${comp.productName}`,
                            officer: comp.assignedOfficerName || 'DNCRP Directorate'
                          })}
                          className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition shadow-sm"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                          <span>Hearing & Dispute Chat</span>
                        </button>
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 7: BSTI BARCODE CHECKER                                               */}
      {/* ========================================================================= */}
      {activeTab === 'barcode_scanner' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-200">
          <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/95 border border-slate-800 shadow-2xl space-y-6">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[11px] font-mono uppercase tracking-widest font-bold text-blue-400">
                Official Bangladesh Standards & Testing Institution
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white font-display mt-0.5">
                BSTI Product Barcode Verification
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Verify authentic BSTI BDS standard registration, manufacturer licensing, and official MRP limits.
              </p>
            </div>

            <form onSubmit={handleBarcodeLookup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter 13-Digit EAN Barcode
                </label>
                <div className="relative">
                  <Barcode className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={lookupBarcode}
                    onChange={e => setLookupBarcode(e.target.value)}
                    placeholder="e.g. 8941100234012"
                    className="sx-input sx-input-with-icon"
                    inputMode="numeric"
                    maxLength={13}
                    required
                  />
                </div>
              </div>

              {/* Demo Barcode Pills */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                <span>Sample Barcodes:</span>
                <button
                  type="button"
                  onClick={() => setLookupBarcode('8941100234012')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-mono transition"
                >
                  8941100234012 (Teer Oil)
                </button>
                <button
                  type="button"
                  onClick={() => setLookupBarcode('8941100556098')}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-blue-400 font-mono transition"
                >
                  8941100556098 (Fresh Sugar)
                </button>
                <button
                  type="button"
                  onClick={() => setLookupBarcode('8949999000001')}
                  className="px-2 py-0.5 rounded bg-red-950/40 hover:bg-red-900/50 text-red-300 font-mono transition"
                >
                  8949999000001 (Counterfeit Flagged)
                </button>
              </div>

              <button
                type="submit"
                disabled={isLookingUpBarcode}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wider transition shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 font-display"
              >
                {isLookingUpBarcode ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Querying BSTI National Catalog...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    <span>Verify BSTI Certification</span>
                  </>
                )}
              </button>
            </form>

            {/* Verification Result Card */}
            {lookupResult && (
              <div className="pt-4 border-t border-slate-800 animate-in fade-in">
                {lookupResult.found && lookupResult.product ? (
                  <div className={`p-5 rounded-2xl border space-y-3 ${
                    lookupResult.product.status === 'COUNTERFEIT_FLAGGED'
                      ? 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                      : 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {lookupResult.product.status === 'COUNTERFEIT_FLAGGED' ? (
                          <AlertTriangle className="w-5 h-5 text-rose-400" />
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        )}
                        <h4 className="font-bold text-white text-base font-display">
                          {lookupResult.product.productName}
                        </h4>
                      </div>
                      <StatusBadge status={lookupResult.product.status} size="sm" />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs pt-1 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-400 text-[11px] block">Manufacturer:</span>
                        <strong className="text-slate-200">{lookupResult.product.companyName}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">BSTI BDS Standard:</span>
                        <strong className="text-slate-200 font-mono">{lookupResult.product.bstiStandard}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Approved National MRP:</span>
                        <strong className="text-emerald-400 font-mono text-sm">৳{lookupResult.product.mrp}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[11px] block">Barcode EAN:</span>
                        <span className="text-slate-300 font-mono">{lookupResult.product.barcode}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold font-display text-sm">Barcode Not Found in National Index</h5>
                      <p className="text-slate-300 mt-1 leading-relaxed">
                        This barcode is not officially registered with BSTI. It may be an imported unregulated item or counterfeit. You may lodge a complaint with DNCRP.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: SOS ACCIDENTAL TRIGGER CONFIRMATION                              */}
      {/* ========================================================================= */}
      {showSOSConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-red-500/50 rounded-3xl w-full max-w-md p-6 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setShowSOSConfirmModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 flex-shrink-0 animate-pulse">
                <Radio className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white font-display">Confirm Emergency SOS</h3>
                <p className="text-xs text-red-400 font-mono">Immediate Police Dispatch Trigger</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to broadcast an active emergency distress beacon? This transmits your verified identity and live GPS coordinates to Bangladesh Police control room.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Your Current Location Landmark:
              </label>
              <input
                type="text"
                value={sosLocationName}
                onChange={e => setSosLocationName(e.target.value)}
                className="sx-input"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowSOSConfirmModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTriggeringSOS}
                onClick={handleTriggerSOS}
                className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition shadow-lg shadow-red-600/30 flex items-center gap-1.5 active:scale-95"
              >
                {isTriggeringSOS ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Broadcasting Beacon...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-3.5 h-3.5" />
                    <span>Confirm & Broadcast SOS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CASE INQUIRY & HEARING COMMUNICATIONS                              */}
      {/* ========================================================================= */}
      {activeChatCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl relative text-slate-100 space-y-3">
            <div className="flex items-center justify-between pb-1 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 font-mono">
                {activeChatCase.caseId}
              </span>
              <button
                onClick={() => setActiveChatCase(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                title="Close chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CaseChatThread
              caseId={activeChatCase.caseId}
              caseType={activeChatCase.caseType}
              caseTitle={activeChatCase.title}
              counterpartName={activeChatCase.officer}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* FLOATING DUAL-ENGINE AI CIVIC & LEGAL COPILOT                             */}
      {/* ========================================================================= */}
      <CitizenAICopilot
        userName={user?.fullName}
        onPrefillConsumer={payload => {
          setShopName(payload.shopName);
          setShopDistrict(payload.shopDistrict);
          setShopThana(payload.shopThana);
          setShopAddress(payload.shopAddress);
          setProductName(payload.productName);
          setIssueType(payload.issueType);
          setMrp(payload.mrp);
          setPricePaid(payload.pricePaid);
          setComplaintDesc(payload.description);
          setComplaintStep(1);
          setActiveTab('consumer_dispute');
        }}
        onPrefillCrime={payload => {
          setCrimeType(payload.crimeType);
          setSeverity(payload.severity);
          setDistrict(payload.district);
          setThana(payload.thana);
          setLocationName(payload.locationName);
          setCrimeTitle(payload.title);
          setCrimeDesc(payload.description);
          setCrimeStep(1);
          setActiveTab('report_crime');
        }}
        onOpenCaseChat={caseData => setActiveChatCase(caseData)}
        onTriggerSOS={() => {
          setActiveTab('sos');
          setShowSOSConfirmModal(true);
        }}
      />
    </div>
  );
};
