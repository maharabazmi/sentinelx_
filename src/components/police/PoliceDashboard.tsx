import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  Flame,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Search,
  Eye,
  EyeOff,
  UserCheck,
  Send,
  RefreshCw,
  Sliders,
  FileCheck,
  XCircle,
  PlusCircle,
  Lock,
  PhoneCall,
  User,
  Users,
  FileText,
  Image as ImageIcon,
  X,
  ChevronRight,
  Filter,
  Check,
  Layers,
  MessageSquare
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../services/api';
import {
  CrimeReport,
  ReportStatus,
  CrimeSeverity,
  EmergencyAlert,
  EmergencyType,
  AlertSeverity,
  SOSRequest,
  SOSStatus,
  CrimeType
} from '../../types';
import { HeatmapComponent } from './HeatmapComponent';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { TableRowSkeleton } from '../ui/SkeletonLoader';
import { EvidenceViewer } from '../common/EvidenceViewer';
import { CaseChatThread } from '../common/CaseChatThread';

export const PoliceDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'case_management' | 'heatmap' | 'emergency_broadcast' | 'sos_radar'
  >('case_management');

  // Stats & Core Police Telemetry
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<CrimeReport[]>([]);
  const [heatmapIncidents, setHeatmapIncidents] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<EmergencyAlert[]>([]);
  const [sosRequests, setSosRequests] = useState<SOSRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('ALL');
  const [selectedCrimeType, setSelectedCrimeType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Report Review & Action Drawer / Modal
  const [selectedReport, setSelectedReport] = useState<CrimeReport | null>(null);
  const [reviewModalTab, setReviewModalTab] = useState<'details' | 'chat'>('details');
  const [officerNote, setOfficerNote] = useState('');
  const [assignedOfficer, setAssignedOfficer] = useState('Sub-Inspector Faruq Ahmed (Badge DMP-4412)');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Create Broadcast Form State
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<EmergencyType>(EmergencyType.WEATHER_HAZARD);
  const [alertSeverity, setAlertSeverity] = useState<AlertSeverity>(AlertSeverity.HIGH);
  const [affectedArea, setAffectedArea] = useState('Gulshan, Banani, and Baridhara zones');
  const [alertDurationHours, setAlertDurationHours] = useState('4');
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // Fetch Police Data
  const fetchPoliceData = async () => {
    setIsLoading(true);
    try {
      const [sumRes, repRes, heatRes, alertRes, sosRes] = await Promise.all([
        ApiClient.getPoliceSummary(),
        ApiClient.getPoliceCrimeReports(),
        ApiClient.getPoliceCrimeHeatmap(),
        ApiClient.getPoliceEmergencyAlerts(),
        ApiClient.getPoliceSOSList()
      ]);

      if (sumRes.success) setStats(sumRes.stats);
      if (repRes.success) setReports(repRes.reports);
      if (heatRes.success) setHeatmapIncidents(heatRes.incidents);
      if (alertRes.success) setAlerts(alertRes.alerts);
      if (sosRes.success) setSosRequests(sosRes.sosRequests);
    } catch (err) {
      console.error('Error loading police data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPoliceData();
    const interval = setInterval(fetchPoliceData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Handle Verify or Reject
  const handleVerifyReport = async (action: 'VERIFY' | 'REJECT') => {
    if (!selectedReport) return;
    setIsProcessingAction(true);
    try {
      const res = await ApiClient.verifyCrimeReport(selectedReport.id, action, officerNote);
      if (res.success) {
        setSelectedReport(null);
        setOfficerNote('');
        fetchPoliceData();
      }
    } catch (err: any) {
      alert(err.message || 'Action failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Investigation Status Update
  const handleUpdateStatus = async (status: ReportStatus) => {
    if (!selectedReport) return;
    setIsProcessingAction(true);
    try {
      const res = await ApiClient.updateInvestigationStatus(selectedReport.id, {
        status,
        note: officerNote || `Case status updated to ${status} by reviewing officer.`,
        assignedOfficerName: assignedOfficer
      });
      if (res.success) {
        setSelectedReport(null);
        setOfficerNote('');
        fetchPoliceData();
      }
    } catch (err: any) {
      alert(err.message || 'Status update failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  // Handle Emergency Broadcast
  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsBroadcasting(true);
    try {
      const expiration = new Date(Date.now() + Number(alertDurationHours) * 60 * 60 * 1000).toISOString();
      const res = await ApiClient.createEmergencyAlert({
        title: alertTitle,
        message: alertMessage,
        emergencyType: alertType,
        severity: alertSeverity,
        affectedArea,
        expirationTime: expiration
      });

      if (res.success) {
        setAlertTitle('');
        setAlertMessage('');
        fetchPoliceData();
        setActiveTab('emergency_broadcast');
      }
    } catch (err: any) {
      alert(err.message || 'Failed to publish emergency alert.');
    } finally {
      setIsBroadcasting(false);
    }
  };

  // Handle Toggle Broadcast Status
  const handleToggleAlert = async (alertId: string) => {
    try {
      await ApiClient.toggleAlertActive(alertId);
      fetchPoliceData();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle alert status.');
    }
  };

  // Handle Respond to SOS
  const handleRespondToSOS = async (sosId: string, status: SOSStatus, unitName: string) => {
    try {
      await ApiClient.respondToSOS(sosId, {
        status,
        assignedUnit: unitName,
        notes: `Police command dispatched ${unitName} at ${new Date().toLocaleTimeString()}.`
      });
      fetchPoliceData();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch SOS response.');
    }
  };

  const filteredReports = reports.filter(r => {
    const matchesSearch =
      r.caseId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.thana.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesDistrict = selectedDistrict === 'ALL' || r.district.toLowerCase() === selectedDistrict.toLowerCase();
    const matchesCrime = selectedCrimeType === 'ALL' || r.crimeType === selectedCrimeType;
    return matchesSearch && matchesStatus && matchesDistrict && matchesCrime;
  });

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-100">
      {/* COMMAND CONTROL IDENTITY HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/15 text-blue-400 text-xs font-bold font-mono border border-blue-500/30 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-blue-400" />
                BANGLADESH POLICE • COMMAND & INVESTIGATION PORTAL
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Badge: <strong className="text-slate-200">{user?.badgeNumber || 'DMP-84920'}</strong>
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-extrabold text-white font-display tracking-tight">
              Officer Console: {user?.fullName}
            </h1>

            <p className="text-xs text-slate-400 flex items-center gap-3">
              <span>Station: <strong className="text-slate-200">{user?.stationOrThana || 'Dhaka Metropolitan Police'}</strong></span>
              <span>•</span>
              <span>Designation: <strong className="text-slate-200">{user?.designation || 'Inspector of Police'}</strong></span>
              <span>•</span>
              <span>Authorization: <strong className="text-blue-400">Classified GIS Access</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('heatmap')}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-blue-600/30 flex items-center gap-2 font-display active:scale-95"
            >
              <MapPin className="w-4 h-4" />
              <span>Restricted Heatmap</span>
            </button>

            <button
              onClick={fetchPoliceData}
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
            onClick={() => setActiveTab('case_management')}
            className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'case_management'
                ? 'bg-slate-800 text-blue-400 font-bold border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <FileCheck className="w-3.5 h-3.5 text-blue-400" />
            <span>Incident Registry & Case Review</span>
            {reports.filter(r => r.status === ReportStatus.SUBMITTED).length > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-amber-500/20 text-[10px] font-mono text-amber-300 font-bold">
                {reports.filter(r => r.status === ReportStatus.SUBMITTED).length} Pending
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('heatmap')}
            className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'heatmap'
                ? 'bg-blue-500/15 text-blue-400 font-bold border border-blue-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400" />
            <span>Criminal Heatmap Intelligence ({heatmapIncidents.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('sos_radar')}
            className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'sos_radar'
                ? 'bg-red-950/60 text-red-300 font-bold border border-red-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-400 animate-pulse" />
            <span>SOS Dispatch Radar</span>
            {sosRequests.filter(s => s.status !== SOSStatus.RESOLVED).length > 0 && (
              <span className="px-2 py-0.2 rounded-full bg-red-500/30 text-[10px] font-mono text-red-200 font-bold">
                {sosRequests.filter(s => s.status !== SOSStatus.RESOLVED).length} Live
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('emergency_broadcast')}
            className={`px-4 py-2.5 rounded-xl font-medium whitespace-nowrap transition flex items-center gap-2 ${
              activeTab === 'emergency_broadcast'
                ? 'bg-slate-800 text-amber-400 font-bold border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
            <span>Emergency Broadcasts ({alerts.filter(a => a.isActive).length})</span>
          </button>
        </div>
      </div>

      {/* METRICS STRIP */}
      {stats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Pending Verification"
            value={stats.pendingVerification}
            subtitle="Requires formal officer review"
            icon={Clock}
            variant="amber"
          />

          <StatCard
            title="Active Investigations"
            value={stats.activeInvestigations}
            subtitle="Under assigned SI / OC inquiry"
            icon={Shield}
            variant="blue"
          />

          <StatCard
            title="Active SOS Beacons"
            value={stats.activeSOS}
            subtitle="Requiring immediate patrol units"
            icon={Radio}
            variant="red"
          />

          <StatCard
            title="Closed Cases"
            value={stats.closedCases}
            subtitle={`${stats.totalLodgedCases} Total cases in registry`}
            icon={CheckCircle2}
            variant="emerald"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: INCIDENT REGISTRY & CASE MANAGEMENT                                */}
      {/* ========================================================================= */}
      {activeTab === 'case_management' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by Case ID or landmark..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800/90 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value={ReportStatus.SUBMITTED}>Pending Verification</option>
                <option value={ReportStatus.VERIFIED}>Verified</option>
                <option value={ReportStatus.INVESTIGATION}>Under Investigation</option>
                <option value={ReportStatus.CASE_CLOSED}>Case Closed</option>
                <option value={ReportStatus.REJECTED}>Rejected</option>
              </select>

              <select
                value={selectedDistrict}
                onChange={e => setSelectedDistrict(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Districts</option>
                <option value="Dhaka">Dhaka</option>
                <option value="Chattogram">Chattogram</option>
                <option value="Sylhet">Sylhet</option>
                <option value="Rajshahi">Rajshahi</option>
                <option value="Khulna">Khulna</option>
              </select>

              <select
                value={selectedCrimeType}
                onChange={e => setSelectedCrimeType(e.target.value)}
                className="px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Crime Categories</option>
                <option value={CrimeType.THEFT_ROBBERY}>Theft & Robbery</option>
                <option value={CrimeType.HARASSMENT}>Harassment</option>
                <option value={CrimeType.FRAUD_SCAM}>Fraud & Scam</option>
                <option value={CrimeType.PHYSICAL_ASSAULT}>Assault</option>
                <option value={CrimeType.CYBER_CRIME}>Cybercrime</option>
                <option value={CrimeType.DRUG_TRAFFICKING}>Narcotics</option>
                <option value={CrimeType.EXTORTION}>Extortion / Chandabaji</option>
              </select>
            </div>
          </div>

          {/* INCIDENT DATA TABLE */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Case ID</th>
                    <th className="py-3.5 px-4 font-semibold">Incident Details</th>
                    <th className="py-3.5 px-4 font-semibold">Jurisdiction</th>
                    <th className="py-3.5 px-4 font-semibold">Severity</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Officer Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60">
                  {isLoading && reports.length === 0 ? (
                    Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} cols={6} />)
                  ) : filteredReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No crime reports match current filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredReports.map(report => (
                      <tr
                        key={report.id}
                        className="hover:bg-slate-800/40 transition group cursor-pointer"
                        onClick={() => setSelectedReport(report)}
                      >
                        <td className="py-3.5 px-4 font-mono font-bold text-blue-400">
                          {report.caseId}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">{report.title}</span>
                            {report.requestConfidentiality && (
                              <StatusBadge status="CONFIDENTIAL" size="sm" showIcon={false} />
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 block truncate mt-0.5">
                            {report.crimeType} • {new Date(report.submittedAt).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span>{report.thana}, {report.district}</span>
                          <span className="text-[11px] text-slate-500 block truncate">{report.locationName}</span>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={report.severity} size="sm" />
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={report.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setSelectedReport(report);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition"
                          >
                            Review Case
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
      {/* TAB 2: CRIMINAL HEATMAP GIS INTELLIGENCE                                  */}
      {/* ========================================================================= */}
      {activeTab === 'heatmap' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-blue-300">
              <Shield className="w-4 h-4 text-blue-400" />
              <span>
                <strong>Classified GIS Heatmap:</strong> Displaying only formally verified crimes under Bangladesh Police Central Records.
              </span>
            </div>
            <span className="font-mono text-blue-400 font-bold">
              {heatmapIncidents.length} Verified Points Active
            </span>
          </div>

          <HeatmapComponent
            incidents={heatmapIncidents}
            selectedDistrict={selectedDistrict}
            onSelectDistrict={setSelectedDistrict}
            selectedCrimeType={selectedCrimeType}
            onSelectCrimeType={setSelectedCrimeType}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SOS DISPATCH RADAR                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'sos_radar' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white font-display flex items-center gap-2">
                <Radio className="w-5 h-5 text-red-400 animate-pulse" />
                Live Citizen SOS Dispatch Radar
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time distress beacons triggered by verified citizens with GPS coordinates.
              </p>
            </div>

            <button
              onClick={fetchPoliceData}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Scan Radar</span>
            </button>
          </div>

          {sosRequests.length === 0 ? (
            <EmptyState
              icon={Radio}
              title="Radar Clear: No Active Distress Beacons"
              description="No citizen emergency distress signals are currently active within patrol jurisdictions."
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sosRequests.map(sos => (
                <div
                  key={sos.id}
                  className={`p-6 rounded-3xl border shadow-xl space-y-4 ${
                    sos.status !== SOSStatus.RESOLVED
                      ? 'bg-red-950/30 border-red-500/40 ring-1 ring-red-500/20'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="font-mono text-xs text-slate-400 block">Distress ID:</span>
                      <h3 className="font-mono font-bold text-white text-sm">{sos.id}</h3>
                    </div>
                    <StatusBadge status={sos.status} size="sm" />
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-200">
                      <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                      <span className="font-bold">{sos.locationName}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono text-[11px] pt-1">
                      <span>Lat: {sos.latitude.toFixed(4)}</span>
                      <span>Lng: {sos.longitude.toFixed(4)}</span>
                      <span>Time: {new Date(sos.createdAt).toLocaleTimeString()}</span>
                      <span className="text-blue-300 font-bold">{sos.assignedUnit || 'Unassigned'}</span>
                    </div>

                    {sos.notes && (
                      <p className="text-[11px] text-slate-300 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                        {sos.notes}
                      </p>
                    )}
                  </div>

                  {sos.status !== SOSStatus.RESOLVED && (
                    <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                      <button
                        onClick={() => handleRespondToSOS(sos.id, SOSStatus.RESPONDING, 'Mobile Patrol Unit 04')}
                        className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition"
                      >
                        Dispatch Patrol Unit 04
                      </button>

                      <button
                        onClick={() => handleRespondToSOS(sos.id, SOSStatus.RESOLVED, 'Officer On Scene')}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition"
                      >
                        Mark Resolved
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EMERGENCY ALERTS BROADCAST PUBLISHER                               */}
      {/* ========================================================================= */}
      {activeTab === 'emergency_broadcast' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Create Alert Form */}
          <div className="max-w-3xl mx-auto p-6 sm:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-5">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-[11px] font-mono text-red-400 uppercase tracking-widest font-bold">
                Civil Defense Protocol
              </span>
              <h3 className="text-xl font-bold text-white font-display mt-0.5">
                Publish Public Safety Emergency Notice
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Broadcast temporary high-priority safety notices across affected civilian zones.
              </p>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Emergency Type</label>
                  <select
                    value={alertType}
                    onChange={e => setAlertType(e.target.value as EmergencyType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value={EmergencyType.WEATHER_HAZARD}>Severe Weather & Monsoon Hazard</option>
                    <option value={EmergencyType.MAJOR_FIRE}>Major Fire Outbreak</option>
                    <option value={EmergencyType.CIVIL_UNREST}>Civil Disturbance / Strike Alert</option>
                    <option value={EmergencyType.ATTACK}>Armed Incident Warning</option>
                    <option value={EmergencyType.PUBLIC_SAFETY_EMERGENCY}>General Public Safety Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1.5">Severity Level</label>
                  <select
                    value={alertSeverity}
                    onChange={e => setAlertSeverity(e.target.value as AlertSeverity)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                  >
                    <option value={AlertSeverity.MODERATE}>Public Advisory (Moderate)</option>
                    <option value={AlertSeverity.HIGH}>High Priority Danger</option>
                    <option value={AlertSeverity.CRITICAL}>Critical National Emergency</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Notice Headline</label>
                <input
                  type="text"
                  value={alertTitle}
                  onChange={e => setAlertTitle(e.target.value)}
                  placeholder="e.g. Flash Flood Alert: Mirpur & DOHS Zones"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Affected Geographic Zone</label>
                <input
                  type="text"
                  value={affectedArea}
                  onChange={e => setAffectedArea(e.target.value)}
                  placeholder="e.g. Uttara Sector 1 to 14, Dhaka"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Broadcasting Duration (Hours)</label>
                <select
                  value={alertDurationHours}
                  onChange={e => setAlertDurationHours(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:border-red-500"
                >
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours</option>
                  <option value="8">8 Hours</option>
                  <option value="24">24 Hours</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1.5">Official Broadcast Instructions</label>
                <textarea
                  rows={3}
                  value={alertMessage}
                  onChange={e => setAlertMessage(e.target.value)}
                  placeholder="Direct instructions to citizens: evacuation paths, shelter landmarks, hotline numbers..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isBroadcasting}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold tracking-wide transition shadow-lg shadow-red-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
              >
                {isBroadcasting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Broadcasting to Civilian Devices...</span>
                  </>
                ) : (
                  <>
                    <Radio className="w-4 h-4" />
                    <span>Publish Emergency Notice</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Active Broadcasts Registry */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-white font-display">
              Active Broadcast Notices ({alerts.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {alerts.map(alert => (
                <div
                  key={alert.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-white text-sm font-display">{alert.title}</h4>
                    <StatusBadge status={alert.isActive ? 'ACTIVE' : 'EXPIRED'} size="sm" />
                  </div>

                  <p className="text-slate-300 leading-relaxed">{alert.message}</p>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Zone: <strong className="text-slate-200">{alert.affectedArea}</strong></span>
                    <button
                      onClick={() => handleToggleAlert(alert.id)}
                      className="text-amber-400 hover:underline font-medium"
                    >
                      {alert.isActive ? 'Deactivate Notice' : 'Reactivate'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL / DRAWER: CASE REVIEW & OFFICER VERIFICATION                       */}
      {/* ========================================================================= */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedReport(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="font-mono font-bold text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/30">
                  {selectedReport.caseId}
                </span>
                <StatusBadge status={selectedReport.status} size="sm" />
                <StatusBadge status={selectedReport.severity} size="sm" />
              </div>
              <h3 className="text-lg font-bold text-white font-display mt-2">
                {selectedReport.title}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Lodged at {selectedReport.locationName} ({selectedReport.thana}, {selectedReport.district})
              </p>
            </div>

            {/* Modal Sub-Tabs */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
              <button
                type="button"
                onClick={() => setReviewModalTab('details')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                  reviewModalTab === 'details'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Case Findings & Evidence</span>
              </button>

              <button
                type="button"
                onClick={() => setReviewModalTab('chat')}
                className={`px-3.5 py-1.5 rounded-xl font-semibold transition flex items-center gap-1.5 ${
                  reviewModalTab === 'chat'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Citizen Inquiries & Channel</span>
              </button>
            </div>

            {reviewModalTab === 'chat' ? (
              <CaseChatThread
                caseId={selectedReport.caseId}
                caseType="CRIME"
                caseTitle={selectedReport.title}
                counterpartName={selectedReport.reporterName}
                counterpartRole="Citizen Reporter"
              />
            ) : (
              <>
                {/* Narrative */}
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs space-y-2">
                  <span className="text-[11px] font-mono text-slate-400 uppercase font-semibold">Incident Narrative:</span>
                  <p className="text-slate-200 leading-relaxed">{selectedReport.description}</p>
                </div>

                {/* Evidence Previews */}
                {selectedReport.evidence && selectedReport.evidence.length > 0 && (
                  <div className="pt-1">
                    <EvidenceViewer
                      evidence={selectedReport.evidence}
                      title="Attached Incident Evidence"
                      accentColor="blue"
                      emptyMessage="No photographic or documentary evidence was attached by the reporter."
                    />
                  </div>
                )}

                {/* Officer Action Form */}
                <div className="space-y-4 pt-2 border-t border-slate-800 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Assign Investigating Officer</label>
                    <input
                      type="text"
                      value={assignedOfficer}
                      onChange={e => setAssignedOfficer(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">Officer Findings / Investigation Note</label>
                    <textarea
                      rows={3}
                      value={officerNote}
                      onChange={e => setOfficerNote(e.target.value)}
                      placeholder="Record verification notes, preliminary evidence findings, or reason for closure..."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-xs"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                    {selectedReport.status === ReportStatus.SUBMITTED ? (
                      <>
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleVerifyReport('REJECT')}
                          className="px-4 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-500/40 text-xs font-semibold transition"
                        >
                          Reject Report
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleVerifyReport('VERIFY')}
                          className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow-md shadow-emerald-600/30"
                        >
                          Verify & Open Investigation
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateStatus(ReportStatus.INVESTIGATION)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition"
                        >
                          Update Investigation
                        </button>
                        <button
                          type="button"
                          disabled={isProcessingAction}
                          onClick={() => handleUpdateStatus(ReportStatus.CASE_CLOSED)}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition"
                        >
                          Close Case
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
