import React, { useState, useEffect } from 'react';
import {
  Scale,
  Barcode,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingDown,
  ShieldCheck,
  Award,
  RefreshCw,
  PlusCircle,
  AlertTriangle,
  Lock,
  Eye,
  X,
  Building,
  Gavel,
  ChevronRight,
  Filter,
  Sliders,
  MessageSquare,
  MapPin,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../services/api';
import {
  ConsumerComplaint,
  ComplaintStatus,
  ConsumerIssueType,
  BarcodeVerification
} from '../../types';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { TableRowSkeleton } from '../ui/SkeletonLoader';
import { EvidenceViewer } from '../common/EvidenceViewer';
import { CaseChatThread } from '../common/CaseChatThread';

export const ConsumerDashboard: React.FC = () => {
  const { user } = useAuth();
  const officerCategory = user?.designation || '';
  const isInvestigationOfficer = officerCategory === 'Investigation Officer';
  const isAdjudicationOfficer = officerCategory === 'Adjudication Officer';
  const isIntakeOfficer = user?.role === 'CONSUMER_RIGHTS' && (
    officerCategory.trim().toLowerCase() === 'complaint intake officer' ||
    officerCategory.trim().toLowerCase().includes('intake')
  );
  const isSupervisingAuthority = !isIntakeOfficer && !isInvestigationOfficer && !isAdjudicationOfficer;
  const authorityCategoryLabel = [
    'Complaint Intake Officer',
    'Investigation Officer',
    'Adjudication Officer'
  ].includes(officerCategory)
    ? officerCategory
    : (officerCategory || 'DNCRP Authority');
  const [activeTab, setActiveTab] = useState<'complaints' | 'barcodes'>('complaints');

  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<ConsumerComplaint[]>([]);
  const [barcodes, setBarcodes] = useState<BarcodeVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [investigationOfficers, setInvestigationOfficers] = useState<any[]>([]);
  const [adjudicationOfficers, setAdjudicationOfficers] = useState<any[]>([]);
  const [selectedInvestigationOfficer, setSelectedInvestigationOfficer] = useState('');
  const [selectedAdjudicationOfficer, setSelectedAdjudicationOfficer] = useState('');
  const defaultTabId = isIntakeOfficer ? 'intake' : isInvestigationOfficer ? 'investigation_queue' : isAdjudicationOfficer ? 'adjudication_queue' : 'all_complaints';
  const [activeQueueTab, setActiveQueueTab] = useState(defaultTabId);

  // Queue Scope & Assignment State
  const [queueScope, setQueueScope] = useState<'jurisdiction' | 'my_cases' | 'unassigned' | 'all'>(
    isIntakeOfficer ? 'unassigned' : isSupervisingAuthority ? 'jurisdiction' : 'my_cases'
  );

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [issueFilter, setIssueFilter] = useState('ALL');

  // Selected Complaint Enforcement Modal
  const [selectedComplaint, setSelectedComplaint] = useState<ConsumerComplaint | null>(null);
  const [inspectorNotes, setInspectorNotes] = useState('');
  const [fineAmount, setFineAmount] = useState('50000');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [complaintModalTab, setComplaintModalTab] = useState<'enforcement' | 'chat'>('enforcement');

  // New Barcode Modal
  const [newBarcode, setNewBarcode] = useState('');
  const [newProductName, setNewProductName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newBSTI, setNewBSTI] = useState('BSTI BDS ISO 9001:2026');
  const [newMRP, setNewMRP] = useState('150');
  const [newBarcodeStatus, setNewBarcodeStatus] = useState<'AUTHENTIC' | 'COUNTERFEIT_FLAGGED'>('AUTHENTIC');
  const [showAddBarcodeModal, setShowAddBarcodeModal] = useState(false);

  const fetchConsumerData = async (scopeArg?: string | unknown, silent = false) => {
    const effectiveScope = typeof scopeArg === 'string' ? scopeArg : queueScope;
    if (!silent) setIsLoading(true);
    try {
      const [sumRes, compRes, barRes] = await Promise.all([
        ApiClient.getConsumerSummary({ scope: effectiveScope }),
        ApiClient.getConsumerComplaints({ scope: effectiveScope }),
        ApiClient.getBarcodes()
      ]);

      if (sumRes.success) setStats(sumRes.stats);
      if (compRes.success) setComplaints(compRes.complaints);
      if (barRes.success) setBarcodes(barRes.barcodes);
    } catch (err) {
      console.error('Error fetching consumer rights data:', err);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    setActiveQueueTab(defaultTabId);
  }, [defaultTabId]);

  useEffect(() => {
    if (isIntakeOfficer && queueScope !== 'unassigned') {
      setQueueScope('unassigned');
      return;
    }
    fetchConsumerData(queueScope, false);
    const interval = setInterval(() => fetchConsumerData(queueScope, true), isIntakeOfficer ? 5000 : 10000);
    return () => clearInterval(interval);
  }, [queueScope, isIntakeOfficer]);

  useEffect(() => {
    ApiClient.getConsumerOfficers()
      .then(res => {
        setInvestigationOfficers((res.officers || []).filter(officer => officer.designation === 'Investigation Officer'));
        setAdjudicationOfficers((res.officers || []).filter(officer => officer.designation === 'Adjudication Officer'));
      })
      .catch(err => console.error('Error loading DNCRP Officers:', err));
  }, []);

  // Update Complaint Status & Penalty Action
  const handleUpdateComplaint = async (status: ComplaintStatus) => {
    if (!selectedComplaint) return;
    setIsUpdatingStatus(true);
    try {
      const penaltyStr =
        status === ComplaintStatus.RESOLVED && fineAmount
          ? `Mobile Court fine of ৳${Number(fineAmount).toLocaleString()} imposed under Section 40 of DNCRP Act 2009. Complainant entitled to ৳${(
              Number(fineAmount) * 0.25
            ).toLocaleString()} (25% statutory reward).`
          : undefined;

      const res = await ApiClient.updateComplaintStatus(selectedComplaint.id, {
        status,
        inspectorNotes,
        penaltyImposed: penaltyStr,
        rewardAmount: status === ComplaintStatus.RESOLVED ? Number(fineAmount) * 0.25 : undefined
      });

      if (res.success) {
        setSelectedComplaint(null);
        setInspectorNotes('');
        setFineAmount('50000');
        if (status === ComplaintStatus.REJECTED && isIntakeOfficer) {
          setActiveQueueTab('rejected');
        }
        await fetchConsumerData(queueScope, false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update complaint record.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleHandoverComplaint = async () => {
    const targetOfficerId = isIntakeOfficer ? selectedInvestigationOfficer : selectedAdjudicationOfficer;
    if (!selectedComplaint || !targetOfficerId) return;
    setIsUpdatingStatus(true);
    try {
      const res = await ApiClient.updateComplaintStatus(selectedComplaint.id, {
        status: isInvestigationOfficer ? ComplaintStatus.INVESTIGATION_SUMMARY : ComplaintStatus.UNDER_REVIEW,
        inspectorNotes,
        handoffOfficerId: targetOfficerId,
        note: inspectorNotes || (isInvestigationOfficer
          ? 'Investigation completed. Summary report handed over for adjudication.'
          : 'Complaint Intake completed preliminary review and handed over for investigation.')
      });
      if (res.success) {
        setSelectedComplaint(null);
        setSelectedInvestigationOfficer('');
        setSelectedAdjudicationOfficer('');
        setInspectorNotes('');
        if (isIntakeOfficer) {
          setActiveQueueTab('handed_over');
        } else if (isInvestigationOfficer) {
          setActiveQueueTab('completed');
        }
        await fetchConsumerData(queueScope, false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to hand over dispute.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Add Barcode
  const handleAddBarcode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await ApiClient.registerBarcode({
        barcode: newBarcode,
        productName: newProductName,
        companyName: newCompanyName,
        bstiStandard: newBSTI,
        mrp: Number(newMRP),
        status: newBarcodeStatus
      });
      if (res.success) {
        setShowAddBarcodeModal(false);
        setNewBarcode('');
        setNewProductName('');
        setNewCompanyName('');
        fetchConsumerData(queueScope, false);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register barcode.');
    }
  };

  const queueTabs = isIntakeOfficer
    ? [
        {
          id: 'intake',
          label: 'Intake Queue',
          match: (complaint: ConsumerComplaint) =>
            complaint.status === ComplaintStatus.SUBMITTED ||
            (complaint.status === ComplaintStatus.UNDER_REVIEW && (complaint.workflowQueue === 'INTAKE' || !complaint.workflowQueue))
        },
        {
          id: 'rejected',
          label: 'Rejected',
          match: (complaint: ConsumerComplaint) =>
            complaint.status === ComplaintStatus.REJECTED || complaint.workflowQueue === 'REJECTED'
        },
        {
          id: 'handed_over',
          label: 'Handed Over',
          match: (complaint: ConsumerComplaint) =>
            complaint.workflowQueue === 'INVESTIGATION' ||
            complaint.workflowQueue === 'ADJUDICATION' ||
            complaint.workflowQueue === 'COMPLETED' ||
            complaint.status === ComplaintStatus.INVESTIGATION ||
            complaint.status === ComplaintStatus.INVESTIGATION_SUMMARY ||
            complaint.status === ComplaintStatus.ADJUDICATION_REVIEW ||
            complaint.status === ComplaintStatus.FINAL_DECISION ||
            complaint.status === ComplaintStatus.RESOLVED
        }
      ]
    : isInvestigationOfficer
      ? [
          {
            id: 'investigation_queue',
            label: 'Investigation Queue',
            match: (complaint: ConsumerComplaint) =>
              (complaint.status === ComplaintStatus.UNDER_REVIEW && complaint.workflowQueue === 'INVESTIGATION') ||
              (complaint.workflowQueue === 'INVESTIGATION' && complaint.status !== ComplaintStatus.INVESTIGATION_SUMMARY)
          },
          {
            id: 'assigned',
            label: 'My Assigned Cases',
            match: (complaint: ConsumerComplaint) =>
              (complaint.status === ComplaintStatus.INVESTIGATION || complaint.status === ComplaintStatus.UNDER_REVIEW) &&
              complaint.assignedOfficerId === user?.id
          },
          {
            id: 'under_investigation',
            label: 'Under Investigation',
            match: (complaint: ConsumerComplaint) =>
              complaint.status === ComplaintStatus.INVESTIGATION || complaint.workflowQueue === 'INVESTIGATION'
          },
          {
            id: 'completed',
            label: 'Completed Investigations',
            match: (complaint: ConsumerComplaint) =>
              complaint.status === ComplaintStatus.INVESTIGATION_SUMMARY || complaint.workflowQueue === 'ADJUDICATION' || complaint.workflowQueue === 'COMPLETED'
          }
        ]
      : isAdjudicationOfficer
        ? [
            {
              id: 'adjudication_queue',
              label: 'Adjudication Queue',
              match: (complaint: ConsumerComplaint) =>
                (complaint.status === ComplaintStatus.INVESTIGATION_SUMMARY && complaint.workflowQueue === 'ADJUDICATION') ||
                complaint.workflowQueue === 'ADJUDICATION'
            },
            {
              id: 'under_review',
              label: 'Under Review',
              match: (complaint: ConsumerComplaint) => complaint.status === ComplaintStatus.ADJUDICATION_REVIEW
            },
            {
              id: 'decided',
              label: 'Decided Cases',
              match: (complaint: ConsumerComplaint) =>
                complaint.status === ComplaintStatus.FINAL_DECISION || complaint.status === ComplaintStatus.RESOLVED
            },
            {
              id: 'reward',
              label: 'Reward/Compensation',
              match: (complaint: ConsumerComplaint) =>
                complaint.status === ComplaintStatus.RESOLVED && complaint.rewardAmount != null
            }
          ]
        : [
            { id: 'all_complaints', label: 'All Disputes', match: () => true },
            { id: 'intake', label: 'Intake Stage', match: (complaint: ConsumerComplaint) => complaint.status === ComplaintStatus.SUBMITTED || complaint.workflowQueue === 'INTAKE' || (complaint.status === ComplaintStatus.UNDER_REVIEW && !complaint.workflowQueue) },
            { id: 'investigation', label: 'Investigation Stage', match: (complaint: ConsumerComplaint) => complaint.workflowQueue === 'INVESTIGATION' || complaint.status === ComplaintStatus.INVESTIGATION },
            { id: 'adjudication', label: 'Adjudication Stage', match: (complaint: ConsumerComplaint) => complaint.workflowQueue === 'ADJUDICATION' || complaint.status === ComplaintStatus.INVESTIGATION_SUMMARY || complaint.status === ComplaintStatus.ADJUDICATION_REVIEW },
            { id: 'resolved', label: 'Resolved / Decided', match: (complaint: ConsumerComplaint) => complaint.status === ComplaintStatus.RESOLVED || complaint.status === ComplaintStatus.FINAL_DECISION }
          ];

  const activeQueue = queueTabs.find(tab => tab.id === activeQueueTab) || queueTabs[0];
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch =
      c.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesIssue = issueFilter === 'ALL' || c.issueType === issueFilter;
    return activeQueue.match(c) && matchesSearch && matchesStatus && matchesIssue;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-100">
      {/* DNCRP IDENTITY HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#090e1a]/95 via-[#070b14]/95 to-[#05070e]/95 border border-[#02baff]/20 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-amber-500 to-[#02baff]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold font-['Orbitron'] border border-amber-500/30 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                DNCRP AUTHORITY • {authorityCategoryLabel}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Orbitron'] tracking-tight">
              AUTHORITY CONSOLE: {user?.fullName?.toUpperCase()}
            </h1>

            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              <span className="px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs font-mono border border-blue-500/30 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
                Operational Jurisdiction: <strong className="text-white">{user?.stationOrThana || 'National HQ, Dhaka'}</strong>
              </span>
              {stats?.thanaKeyword && (
                <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                  Thana: {stats.thanaKeyword.toUpperCase()}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 flex items-center gap-3 font-mono">
              <span>Cell: <strong className="text-slate-200">{user?.department || 'National Market Surveillance Cell'}</strong></span>
              <span>•</span>
              <span>Designation: <strong className="text-slate-200">{user?.designation || 'Deputy Director'}</strong></span>
              <span>•</span>
              <span>Status: <strong className="text-amber-400">Mobile Court Warrant Active</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddBarcodeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-bold text-xs font-['Orbitron'] tracking-wider transition shadow-lg shadow-[#0147bf]/30 flex items-center gap-2 active:scale-95"
            >
              <Barcode className="w-4 h-4" />
              <span>Register Barcode</span>
            </button>

            <button
              onClick={() => fetchConsumerData(queueScope, false)}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#02baff]/20 transition hover:border-[#02baff]/50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="short-tabs flex items-center gap-1 overflow-x-auto pt-5 mt-5 border-t border-white/5 text-xs no-scrollbar">
          {[
            {
              id: 'complaints',
              label: 'Disputes & Inspection',
              badge: complaints.filter(c => c.status === ComplaintStatus.SUBMITTED).length > 0
                ? `${complaints.filter(c => c.status === ComplaintStatus.SUBMITTED).length} New`
                : null
            },
            { id: 'barcodes', label: `BSTI Registry (${barcodes.length})` },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-[#0147bf]/20 text-[#02baff] border border-[#02baff]/30 font-semibold'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="px-1.5 rounded-full bg-white/10 text-[10px] font-mono text-slate-300">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

      </div>

      {/* METRICS STRIP */}
      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="New Grievance Claims"
            value={stats.newComplaints}
            subtitle="Awaiting preliminary audit"
            icon={FileText}
            variant="amber"
          />

          <StatCard
            title="Field Investigations"
            value={stats.activeInvestigations}
            subtitle="Authorities deployed on-site"
            icon={Scale}
            variant="blue"
          />

          <StatCard
            title="Resolved & Penalized"
            value={stats.resolvedCases}
            subtitle="Fines imposed & 25% paid to citizen"
            icon={CheckCircle2}
            variant="emerald"
          />

          <StatCard
            title="Penalized Establishments"
            value={stats.penalizedShopsCount}
            subtitle={`${stats.totalRegisteredShops} Total monitored establishments`}
            icon={Building}
            variant="red"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: COMPLAINTS & GRIEVANCE INSPECTION                                  */}
      {/* ========================================================================= */}
      {activeTab === 'complaints' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Queue Scope Tabs */}
          <div className="flex flex-wrap items-center gap-2">
            {queueTabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveQueueTab(tab.id);
                  setQueueScope(isIntakeOfficer ? 'unassigned' : 'my_cases');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                  activeQueueTab === tab.id
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-md shadow-amber-500/10'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-bold ${
                  activeQueueTab === tab.id ? 'bg-amber-500/30 text-amber-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {complaints.filter(tab.match).length}
                </span>
              </button>
            ))}
          </div>

          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tracking # or shop name..."
                className="sx-input sx-input-with-icon"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="sx-input !w-auto"
              >
                <option value="ALL">All Statuses</option>
                <option value={ComplaintStatus.SUBMITTED}>Submitted (New)</option>
                <option value={ComplaintStatus.UNDER_REVIEW}>Under Review</option>
                <option value={ComplaintStatus.VERIFIED}>Verified Grievance</option>
                <option value={ComplaintStatus.INVESTIGATION}>Authority Dispatched</option>
                <option value={ComplaintStatus.RESOLVED}>Resolved (Fined)</option>
                <option value={ComplaintStatus.REJECTED}>Dismissed</option>
              </select>

              <select
                value={issueFilter}
                onChange={e => setIssueFilter(e.target.value)}
                className="sx-input !w-auto"
              >
                <option value="ALL">All Violations</option>
                <option value={ConsumerIssueType.PRICE_GOUGING}>Price Gouging / Overpricing</option>
                <option value={ConsumerIssueType.EXPIRED_GOODS}>Expired Products</option>
                <option value={ConsumerIssueType.FOOD_ADULTERATION}>Food Adulteration</option>
                <option value={ConsumerIssueType.COUNTERFEIT_PRODUCT}>Counterfeit Seal</option>
                <option value={ConsumerIssueType.WEIGHT_MEASUREMENT_FRAUD}>Weight Manipulation / Faulty Scale</option>
              </select>
            </div>
          </div>

          {/* COMPLAINTS DATA TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Tracking #</th>
                    <th className="py-3.5 px-4 font-semibold">Merchant / Shop</th>
                    <th className="py-3.5 px-4 font-semibold">Product & Violation</th>
                    <th className="py-3.5 px-4 font-semibold">Pricing (MRP vs Paid)</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Assigned Authority</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Enforcement Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {isLoading && complaints.length === 0 ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={7} />)
                  ) : filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 px-4 text-center">
                        <EmptyState
                          title="No Consumer Disputes in Queue"
                          description={
                            activeQueue.id === 'intake'
                              ? 'New citizen complaints awaiting Intake review will appear here.'
                              : `No cases are currently available in the ${activeQueue.label}.`
                          }
                          icon={Scale}
                        />
                      </td>
                    </tr>
                  ) : (
                    filteredComplaints.map(comp => (
                      <tr
                        key={comp.id}
                        onClick={() => setSelectedComplaint(comp)}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                          {comp.trackingNumber}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-white">
                          <div>{comp.shopName}</div>
                          <span className="text-[11px] text-slate-400 block font-normal">
                            {comp.shopThana}, {comp.shopDistrict}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-200">{comp.productName}</span>
                          <span className="text-[11px] text-amber-400/90 block mt-0.5">{comp.issueType}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px]">
                          {comp.mrp && comp.pricePaid ? (
                            <div>
                              <span>MRP: ৳{comp.mrp}</span>
                              <span className="text-amber-400 font-bold block">Paid: ৳{comp.pricePaid}</span>
                            </div>
                          ) : (
                            <span className="text-slate-500">Non-price grievance</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={comp.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          {comp.assignedOfficerName ? (
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="font-semibold text-slate-200">{comp.assignedOfficerName}</span>
                              {comp.assignedOfficerId === user?.id && (
                                <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 text-[10px] rounded font-mono">You</span>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[11px] font-mono">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setSelectedComplaint(comp);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                            >
                              View Details
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: BSTI BARCODE REGISTRY                                              */}
      {/* ========================================================================= */}
      {activeTab === 'barcodes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-display">
                BSTI National Barcode Registry ({barcodes.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Official approved consumer products and counterfeit alert registry.
              </p>
            </div>

            <button
              onClick={() => setShowAddBarcodeModal(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-blue-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Barcode Rule</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {barcodes.map(b => (
              <div
                key={b.barcode}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/30">
                    {b.barcode}
                  </span>
                  <StatusBadge status={b.status} size="sm" />
                </div>

                <div>
                  <h4 className="font-bold text-white text-sm font-display">{b.productName}</h4>
                  <p className="text-xs text-slate-400">{b.companyName}</p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 text-[11px]">{b.bstiStandard}</span>
                  <strong className="text-emerald-400">৳{b.mrp}</strong>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: DNCRP ENFORCEMENT & MOBILE COURT ACTION                          */}
      {/* ========================================================================= */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedComplaint(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                  {selectedComplaint.trackingNumber}
                </span>
                <StatusBadge status={selectedComplaint.status} size="sm" />
              </div>
              <h3 className="text-lg font-bold text-white font-display mt-2">
                {selectedComplaint.shopName}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Product: <strong className="text-slate-200">{selectedComplaint.productName}</strong> ({selectedComplaint.issueType})
              </p>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setComplaintModalTab('enforcement')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                  complaintModalTab === 'enforcement'
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>{isAdjudicationOfficer ? 'Mobile Court Enforcement & Fines' : 'Complaint Review Details'}</span>
              </button>

              <button
                type="button"
                onClick={() => setComplaintModalTab('chat')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                  complaintModalTab === 'chat'
                    ? 'bg-amber-600 text-slate-950 font-bold shadow-md shadow-amber-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Hearing & Complainant Chat</span>
              </button>
            </div>

            {complaintModalTab === 'chat' ? (
              <CaseChatThread
                caseId={selectedComplaint.trackingNumber}
                caseType="CONSUMER"
                caseTitle={`${selectedComplaint.shopName} - ${selectedComplaint.productName}`}
                counterpartName={selectedComplaint.complainantName}
                counterpartRole="Complainant Citizen"
              />
            ) : (
              <>
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Complainant Narrative:</span>
                  <p className="text-slate-200 leading-relaxed">{selectedComplaint.description}</p>
                </div>

                {selectedComplaint.investigationSummary && (
                  <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-500/20 text-xs space-y-2">
                    <span className="text-[11px] font-mono text-blue-300 uppercase font-semibold">Investigation Summary / Report:</span>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedComplaint.investigationSummary}</p>
                  </div>
                )}
                {selectedComplaint.finalFinding && (
                  <div className="p-4 rounded-2xl bg-amber-950/30 border border-amber-500/20 text-xs space-y-2">
                    <span className="text-[11px] font-mono text-amber-300 uppercase font-semibold">Final Finding / Reward Decision:</span>
                    <p className="text-slate-200 leading-relaxed whitespace-pre-wrap">{selectedComplaint.finalFinding}</p>
                    {selectedComplaint.rewardAmount != null && <p className="text-emerald-300 font-semibold">Citizen reward / compensation: ৳{selectedComplaint.rewardAmount.toLocaleString()}</p>}
                  </div>
                )}

                {selectedComplaint.mrp && selectedComplaint.pricePaid && (
                  <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] block">Approved MRP</span>
                      <strong className="text-slate-200">৳{selectedComplaint.mrp}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Demanded Price</span>
                      <strong className="text-amber-400">৳{selectedComplaint.pricePaid}</strong>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">Overcharge Delta</span>
                      <strong className="text-amber-300">+৳{(selectedComplaint.pricePaid - selectedComplaint.mrp).toFixed(2)}</strong>
                    </div>
                  </div>
                )}

                {/* Attached Violation Evidence */}
                {selectedComplaint.evidence && selectedComplaint.evidence.length > 0 && (
                  <div className="pt-1">
                    <EvidenceViewer
                      evidence={selectedComplaint.evidence}
                      title="Attached Violation Evidence (Receipts & Labels)"
                      accentColor="amber"
                      emptyMessage="No evidence files attached to this complaint."
                    />
                  </div>
                )}

                {/* DNCRP workflow stage controls */}
                <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
                  <div className="grid grid-cols-4 md:grid-cols-7 gap-1.5 text-center">
                    {[
                      ['Citizen submits', ComplaintStatus.SUBMITTED],
                      ['Intake', ComplaintStatus.UNDER_REVIEW],
                      ['Investigation', ComplaintStatus.INVESTIGATION],
                      ['Summary', ComplaintStatus.INVESTIGATION_SUMMARY],
                      ['Hearing', ComplaintStatus.ADJUDICATION_REVIEW],
                      ['Final decision', ComplaintStatus.FINAL_DECISION],
                      ['Final resolution', ComplaintStatus.RESOLVED]
                    ].map(([label, status]) => (
                      <div key={status} className={`rounded-lg border px-2 py-2 ${selectedComplaint.status === status ? 'border-amber-400/60 bg-amber-500/15 text-amber-200' : 'border-slate-800 bg-slate-950/50 text-slate-500'}`}>
                        <div className="text-[10px] font-semibold">{label}</div>
                      </div>
                    ))}
                  </div>

                  {isAdjudicationOfficer && (
                    <div>
                      <label className="block font-semibold text-slate-300 mb-1">
                        Administrative Fine Amount (৳ BDT)
                      </label>
                      <input
                        type="number"
                        value={fineAmount}
                        onChange={e => setFineAmount(e.target.value)}
                        placeholder="e.g. 50000"
                        className="sx-input font-mono"
                      />
                      <p className="text-[11px] text-emerald-400 mt-1">
                        Citizen Reward: <strong>৳{(Number(fineAmount || 0) * 0.25).toLocaleString()}</strong> (25% statutory entitlement under Section 76)
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      {isInvestigationOfficer ? 'Investigation Summary / Report' : isAdjudicationOfficer ? 'Hearing Notes & Final Finding' : 'Authority Notes & Enforcement Order'}
                    </label>
                    <textarea
                      rows={3}
                      value={inspectorNotes}
                      onChange={e => setInspectorNotes(e.target.value)}
                      placeholder={isInvestigationOfficer ? 'Record evidence reviewed, findings, interviews, and investigation conclusion...' : isAdjudicationOfficer ? 'Record hearing details, final finding, and compensation determination...' : 'Record intake notes and complaint review details...'}
                      className="sx-input"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    {(isIntakeOfficer || isSupervisingAuthority) && (selectedComplaint.status === ComplaintStatus.SUBMITTED || selectedComplaint.status === ComplaintStatus.UNDER_REVIEW) && (
                      <div className="consumer-intake-actions w-full flex flex-col gap-2 rounded-xl border border-slate-700/60 bg-slate-950/40 p-3">
                        <div>
                          <p className="font-bold text-slate-200">Intake decision</p>
                          <p className="text-[11px] text-slate-400">Choose an Investigation Officer to continue the case, or reject it at intake.</p>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                          <select aria-label="Investigation Officer for handover" value={selectedInvestigationOfficer} onChange={e => setSelectedInvestigationOfficer(e.target.value)} className="sx-input flex-1">
                          <option value="">Select Investigation Officer</option>
                          {investigationOfficers.map(officer => (
                            <option key={officer.id} value={officer.id}>{officer.fullName} ({officer.stationOrThana})</option>
                          ))}
                          </select>
                          <button type="button" aria-label="Hand over case to Investigation Officer" disabled={isUpdatingStatus || !selectedInvestigationOfficer} onClick={handleHandoverComplaint} className="consumer-intake-handover px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md">
                            <ChevronRight className="w-4 h-4" />
                            Hand Over Case to Investigation Officer
                          </button>
                        </div>
                      </div>
                    )}

                    {(isIntakeOfficer || isSupervisingAuthority) && (selectedComplaint.status === ComplaintStatus.SUBMITTED || selectedComplaint.status === ComplaintStatus.UNDER_REVIEW) && (
                      <button type="button" disabled={isUpdatingStatus} onClick={() => handleUpdateComplaint(ComplaintStatus.REJECTED)} className="consumer-intake-reject px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-semibold transition">
                        Reject Complaint at Intake
                      </button>
                    )}

                    {isInvestigationOfficer && selectedComplaint.status === ComplaintStatus.UNDER_REVIEW && (
                      <button type="button" disabled={isUpdatingStatus} onClick={() => handleUpdateComplaint(ComplaintStatus.INVESTIGATION)} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition">
                        Accept / Take Case
                      </button>
                    )}
                    {isInvestigationOfficer && selectedComplaint.status === ComplaintStatus.INVESTIGATION && (
                      <div className="w-full flex flex-col sm:flex-row gap-2">
                        <select value={selectedAdjudicationOfficer} onChange={e => setSelectedAdjudicationOfficer(e.target.value)} className="sx-input flex-1">
                          <option value="">Select Adjudication Officer</option>
                          {adjudicationOfficers.map(officer => (
                            <option key={officer.id} value={officer.id}>{officer.fullName} ({officer.stationOrThana})</option>
                          ))}
                        </select>
                        <button type="button" disabled={isUpdatingStatus || !selectedAdjudicationOfficer} onClick={handleHandoverComplaint} className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold transition">
                          Submit Summary & Handover
                        </button>
                      </div>
                    )}
                    {isAdjudicationOfficer && selectedComplaint.status === ComplaintStatus.INVESTIGATION_SUMMARY && (
                      <button type="button" disabled={isUpdatingStatus} onClick={() => handleUpdateComplaint(ComplaintStatus.ADJUDICATION_REVIEW)} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition">
                        Accept Case & Start Hearing
                      </button>
                    )}
                    {isAdjudicationOfficer && selectedComplaint.status === ComplaintStatus.ADJUDICATION_REVIEW && (
                      <button type="button" disabled={isUpdatingStatus} onClick={() => handleUpdateComplaint(ComplaintStatus.FINAL_DECISION)} className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-bold transition">
                        Record Final Finding
                      </button>
                    )}
                    {isAdjudicationOfficer && selectedComplaint.status === ComplaintStatus.FINAL_DECISION && (
                      <button type="button" disabled={isUpdatingStatus} onClick={() => handleUpdateComplaint(ComplaintStatus.RESOLVED)} className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5">
                        <Gavel className="w-3.5 h-3.5" />
                        <span>Determine Reward & Resolve</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADD BARCODE PRODUCT RULE                                         */}
      {/* ========================================================================= */}
      {showAddBarcodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-blue-500/50 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-4">
            <button
              onClick={() => setShowAddBarcodeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white font-display">Register Product Barcode</h3>
              <p className="text-xs text-slate-400 mt-0.5">BSTI Standards & Verification Index</p>
            </div>

            <form onSubmit={handleAddBarcode} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">EAN Barcode (13-digits)</label>
                <input
                  type="text"
                  value={newBarcode}
                  onChange={e => setNewBarcode(e.target.value)}
                  placeholder="e.g. 8941100998877"
                  className="sx-input font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Product Name</label>
                <input
                  type="text"
                  value={newProductName}
                  onChange={e => setNewProductName(e.target.value)}
                  placeholder="e.g. Fortified Mustard Oil 500ml"
                  className="sx-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Company / Manufacturer</label>
                <input
                  type="text"
                  value={newCompanyName}
                  onChange={e => setNewCompanyName(e.target.value)}
                  placeholder="e.g. Pran-RFL Consumer Products"
                  className="sx-input"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Approved MRP (৳)</label>
                  <input
                    type="number"
                    value={newMRP}
                    onChange={e => setNewMRP(e.target.value)}
                    className="sx-input font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={newBarcodeStatus}
                    onChange={e => setNewBarcodeStatus(e.target.value as any)}
                    className="sx-input"
                  >
                    <option value="AUTHENTIC">Authentic BSTI</option>
                    <option value="COUNTERFEIT_FLAGGED">Counterfeit Flagged</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold tracking-wide transition shadow-lg shadow-blue-600/30"
              >
                Register into Catalog
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
