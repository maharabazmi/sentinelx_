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
  MessageSquare
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
  const [activeTab, setActiveTab] = useState<'complaints' | 'barcodes'>('complaints');

  const [stats, setStats] = useState<any>(null);
  const [complaints, setComplaints] = useState<ConsumerComplaint[]>([]);
  const [barcodes, setBarcodes] = useState<BarcodeVerification[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  const fetchConsumerData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, compRes, barRes] = await Promise.all([
        ApiClient.getConsumerSummary(),
        ApiClient.getConsumerComplaints(),
        ApiClient.getBarcodes()
      ]);

      if (sumRes.success) setStats(sumRes.stats);
      if (compRes.success) setComplaints(compRes.complaints);
      if (barRes.success) setBarcodes(barRes.barcodes);
    } catch (err) {
      console.error('Error fetching consumer rights data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConsumerData();
    const interval = setInterval(fetchConsumerData, 10000);
    return () => clearInterval(interval);
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
        penaltyImposed: penaltyStr
      });

      if (res.success) {
        setSelectedComplaint(null);
        setInspectorNotes('');
        setFineAmount('50000');
        fetchConsumerData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update complaint record.');
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
        fetchConsumerData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to register barcode.');
    }
  };

  const filteredComplaints = complaints.filter(c => {
    const matchesSearch =
      c.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.shopName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.productName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    const matchesIssue = issueFilter === 'ALL' || c.issueType === issueFilter;
    return matchesSearch && matchesStatus && matchesIssue;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-100">
      {/* DNCRP IDENTITY HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-xs font-bold font-mono border border-amber-500/30 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-amber-400" />
                DIRECTORATE OF NATIONAL CONSUMER RIGHT PROTECTION (DNCRP)
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              Inspector: {user?.fullName}
            </h1>

            <p className="text-xs text-slate-400 flex items-center gap-3">
              <span>Department: <strong className="text-slate-200">{user?.department || 'National Market Surveillance Cell'}</strong></span>
              <span>•</span>
              <span>Designation: <strong className="text-slate-200">{user?.designation || 'Deputy Director'}</strong></span>
              <span>•</span>
              <span>Enforcement Authority: <strong className="text-amber-400">Mobile Court Warrant Active</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddBarcodeModal(true)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-blue-600/25 flex items-center gap-2 font-display active:scale-95"
            >
              <Barcode className="w-4 h-4" />
              <span>Register Barcode</span>
            </button>

            <button
              onClick={fetchConsumerData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-6 mt-6 border-t border-slate-800/80 text-xs no-scrollbar">
          <button
            onClick={() => setActiveTab('complaints')}
            className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'complaints'
                ? 'bg-slate-800 text-amber-400 font-bold border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Gavel className="w-3.5 h-3.5 text-amber-400" />
            <span>Disputes & Mobile Court Inspection</span>
            {complaints.filter(c => c.status === ComplaintStatus.SUBMITTED).length > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono text-amber-300 font-bold">
                {complaints.filter(c => c.status === ComplaintStatus.SUBMITTED).length} New
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('barcodes')}
            className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'barcodes'
                ? 'bg-slate-800 text-blue-400 font-bold border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Barcode className="w-3.5 h-3.5 text-blue-400" />
            <span>BSTI Barcode Standards Registry ({barcodes.length})</span>
          </button>
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
            subtitle="Inspectors deployed on-site"
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
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search tracking # or shop name..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
              >
                <option value="ALL">All Statuses</option>
                <option value={ComplaintStatus.SUBMITTED}>Submitted (New)</option>
                <option value={ComplaintStatus.UNDER_REVIEW}>Under Review</option>
                <option value={ComplaintStatus.VERIFIED}>Verified Grievance</option>
                <option value={ComplaintStatus.INVESTIGATION}>Inspector Dispatched</option>
                <option value={ComplaintStatus.RESOLVED}>Resolved (Fined)</option>
                <option value={ComplaintStatus.REJECTED}>Dismissed</option>
              </select>

              <select
                value={issueFilter}
                onChange={e => setIssueFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
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
                    <th className="py-3.5 px-4 font-semibold text-right">Enforcement Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {isLoading && complaints.length === 0 ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  ) : filteredComplaints.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No consumer dispute records match current filter criteria.
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
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedComplaint(comp);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold transition"
                          >
                            Enforce
                          </button>
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
                <span>Mobile Court Enforcement & Fines</span>
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

                {/* Mobile Court Penalty Controls */}
                <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Administrative Fine Amount (৳ BDT)
                    </label>
                    <input
                      type="number"
                      value={fineAmount}
                      onChange={e => setFineAmount(e.target.value)}
                      placeholder="e.g. 50000"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono text-xs"
                    />
                    <p className="text-[11px] text-emerald-400 mt-1">
                      Citizen Reward: <strong>৳{(Number(fineAmount || 0) * 0.25).toLocaleString()}</strong> (25% statutory entitlement under Section 76)
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Inspector Notes & Enforcement Order</label>
                    <textarea
                      rows={3}
                      value={inspectorNotes}
                      onChange={e => setInspectorNotes(e.target.value)}
                      placeholder="Record mobile court findings, shop trade license verification, and fine realization details..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateComplaint(ComplaintStatus.REJECTED)}
                      className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-semibold transition"
                    >
                      Dismiss Grievance
                    </button>

                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateComplaint(ComplaintStatus.INVESTIGATION)}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                    >
                      Dispatch Inspector
                    </button>

                    <button
                      type="button"
                      disabled={isUpdatingStatus}
                      onClick={() => handleUpdateComplaint(ComplaintStatus.RESOLVED)}
                      className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30 flex items-center gap-1.5"
                    >
                      <Gavel className="w-3.5 h-3.5" />
                      <span>Impose Fine & Resolve</span>
                    </button>
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={newBarcodeStatus}
                    onChange={e => setNewBarcodeStatus(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100"
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
