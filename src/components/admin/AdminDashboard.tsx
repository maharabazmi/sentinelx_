import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Shield,
  Users,
  Activity,
  AlertTriangle,
  FileText,
  Lock,
  Search,
  CheckCircle2,
  TrendingUp,
  BarChart3,
  Calendar,
  CloudSun,
  UserPlus,
  RefreshCw,
  Eye,
  Layers,
  Sparkles,
  X,
  Radio,
  Server,
  KeyRound
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { ApiClient } from '../../services/api';
import {
  User,
  UserRole,
  AIPredictionData,
  AuditLog,
  CrimeType,
  ComparativeRiskRank,
  ResourceAllocationAdvice,
  OperationalDirective
} from '../../types';
import { BANGLADESH_DIVISIONS, getThanasByDistrict } from '../../data/bangladeshGeo';
import { StatusBadge } from '../ui/StatusBadge';
import { StatCard } from '../ui/StatCard';
import { EmptyState } from '../ui/EmptyState';
import { TableRowSkeleton } from '../ui/SkeletonLoader';

const normalizeAdminPhone = (value: string) => {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('00880')) return `+${digits.slice(2)}`;
  if (digits.startsWith('880')) return `+${digits}`;
  if (digits.startsWith('01') && digits.length === 11) return `+880${digits.slice(1)}`;
  if (digits.startsWith('1') && digits.length === 10) return `+880${digits}`;
  return digits ? `+${digits}` : '';
};

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'system_overview' | 'ai_prediction' | 'audit_trail' | 'user_management'>('system_overview');

  const [systemStats, setSystemStats] = useState<any>(null);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [predictions, setPredictions] = useState<AIPredictionData[]>([]);
  const [riskMatrix, setRiskMatrix] = useState<ComparativeRiskRank[]>([]);
  const [resourceAllocations, setResourceAllocations] = useState<ResourceAllocationAdvice[]>([]);
  const [directivesList, setDirectivesList] = useState<OperationalDirective[]>([]);
  const [isIssuingDirective, setIsIssuingDirective] = useState(false);
  const [directiveSuccessNotice, setDirectiveSuccessNotice] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // AI Interactive Simulation State
  const [simDistrict, setSimDistrict] = useState('Dhaka');
  const [simThana, setSimThana] = useState('Gulshan');

  const handleSimDistrictChange = (newDistrict: string) => {
    setSimDistrict(newDistrict);
    const thanas = getThanasByDistrict(newDistrict);
    if (thanas.length > 0) setSimThana(thanas[0]);
  };

  const [simCrimeType, setSimCrimeType] = useState<CrimeType>(CrimeType.THEFT_ROBBERY);
  const [simWeather, setSimWeather] = useState('Heavy Monsoon');
  const [simFestival, setSimFestival] = useState(true);
  const [simResult, setSimResult] = useState<AIPredictionData | null>(null);
  const [isGeneratingSim, setIsGeneratingSim] = useState(false);

  // User Provisioning State
  const [newFullName, setNewFullName] = useState('');
  const [newNID, setNewNID] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('+8801700000000');
  const [newRole, setNewRole] = useState<UserRole>(UserRole.POLICE);
  const [newBadge, setNewBadge] = useState('DMP-');
  const [newDesignation, setNewDesignation] = useState('Sub-Inspector (SI)');
  const [newDepartment, setNewDepartment] = useState('General Investigation & GD Registry');
  const [policeDistrict, setPoliceDistrict] = useState('Dhaka');
  const [policeThana, setPoliceThana] = useState('Gulshan');
  const [newStation, setNewStation] = useState('Gulshan Police Station, Dhaka');

  const handlePoliceDistrictChange = (newDistrict: string) => {
    setPoliceDistrict(newDistrict);
    const thanas = getThanasByDistrict(newDistrict);
    const firstThana = thanas[0] || 'Sadar';
    setPoliceThana(firstThana);
    setNewStation(`${firstThana} Police Station, ${newDistrict}`);

    const distCode = newDistrict.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
    if (newDistrict === 'Dhaka') {
      setNewBadge('DMP-');
    } else if (newDistrict === 'Chattogram') {
      setNewBadge('CMP-');
    } else {
      setNewBadge(`BP-${distCode}-`);
    }
  };

  const handlePoliceThanaChange = (newThana: string) => {
    setPoliceThana(newThana);
    setNewStation(`${newThana} Police Station, ${policeDistrict}`);
  };

  const [newPassword, setNewPassword] = useState('demo1234');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Search & Filter State
  const [auditSearchQuery, setAuditSearchQuery] = useState('');
  const [auditRoleFilter, setAuditRoleFilter] = useState('ALL');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fetchAdminData = async () => {
    setIsLoading(true);
    try {
      const [statsRes, usersRes, predRes, logsRes] = await Promise.all([
        ApiClient.getAdminSystemOverview(),
        ApiClient.getAdminUsers(),
        ApiClient.getAdminAIPredictions(),
        ApiClient.getAdminAuditLogs()
      ]);

      if (statsRes.success) setSystemStats(statsRes.stats);
      if (usersRes.success) setUsersList(usersRes.users);
      if (predRes.success) {
        setPredictions(predRes.predictions || []);
        if ((predRes as any).riskMatrix) setRiskMatrix((predRes as any).riskMatrix);
        if ((predRes as any).resourceAllocations) setResourceAllocations((predRes as any).resourceAllocations);
        if ((predRes as any).directives) setDirectivesList((predRes as any).directives);
      }
      if (logsRes.success) setAuditLogs(logsRes.logs);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  // Issue Operational Command Directive to Station Police
  const handleIssueDirective = async () => {
    if (!simResult) return;
    setIsIssuingDirective(true);
    try {
      const res = await ApiClient.issueAdminDirective({
        targetDistrict: simResult.targetDistrict || (simResult as any).district || simDistrict,
        targetThana: simResult.targetThana || (simResult as any).thana || simThana,
        predictedRiskLevel: simResult.predictedRiskLevel,
        primaryRiskCrimeType: simResult.primaryRiskCrimeType || (simResult as any).crimeType,
        timeWindow: simResult.timeWindow || '19:00 - 02:00 (Peak Threat Window)',
        recommendedAction: (simResult as any).recommendedAction || simResult.recommendedPatrolStrategy,
        recommendedUnits: (simResult as any).recommendedUnits || 2,
        latitude: (simResult as any).latitude,
        longitude: (simResult as any).longitude
      });
      if (res.success) {
        setDirectiveSuccessNotice(`✓ Operational Directive ${res.directive.directiveCode} officially dispatched to ${res.directive.targetThana} Police!`);
        setDirectivesList(prev => [res.directive, ...prev]);
        setTimeout(() => setDirectiveSuccessNotice(null), 7000);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to issue directive.');
    } finally {
      setIsIssuingDirective(false);
    }
  };

  // Generate Interactive AI Simulation
  const handleGenerateSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsGeneratingSim(true);
    try {
      const res = await ApiClient.generateAIScenario({
        district: simDistrict,
        thana: simThana,
        crimeType: simCrimeType,
        weather: simWeather,
        isFestival: simFestival
      });
      if (res.success) {
        setSimResult(res.prediction);
      }
    } catch (err: any) {
      alert(err.message || 'Simulation execution failed.');
    } finally {
      setIsGeneratingSim(false);
    }
  };

  // Create Authority User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const requestedPhone = normalizeAdminPhone(newPhone);
    const duplicatePhone = usersList.some(user => normalizeAdminPhone(user.phone) === requestedPhone);
    if (duplicatePhone) {
      alert('Phone number already exists for another account. Use a unique mobile number.');
      return;
    }

    setIsCreatingUser(true);
    try {
      const res = await ApiClient.createAdminUser({
        fullName: newFullName,
        nidNumber: newNID,
        email: newEmail,
        phone: newPhone,
        role: newRole,
        badgeNumber: newBadge,
        designation: newDesignation,
        department: newRole === UserRole.POLICE ? newDepartment : undefined,
        stationOrThana: newStation,
        password: newPassword
      });

      if (res.success) {
        setShowAddUserModal(false);
        setNewFullName('');
        setNewNID('');
        setNewEmail('');
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to provision user account.');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch =
      log.action.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.userName.toLowerCase().includes(auditSearchQuery.toLowerCase()) ||
      log.details.toLowerCase().includes(auditSearchQuery.toLowerCase());
    const matchesRole = auditRoleFilter === 'ALL' || log.userRole === auditRoleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredUsers = usersList.filter(u =>
    u.fullName.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
    u.nidNumber.includes(userSearchQuery)
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 space-y-8 text-slate-100">
      {/* ADMIN IDENTITY HEADER */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#090e1a]/95 via-[#070b14]/95 to-[#05070e]/95 border border-[#02baff]/20 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <div className="absolute top-0 left-0 w-32 h-1 bg-gradient-to-r from-purple-500 via-[#0147bf] to-[#02baff]" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/15 text-purple-300 text-xs font-bold font-['Orbitron'] border border-purple-500/30 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#02baff]" />
                NATIONAL COMMAND & CYBER OPERATIONS HEADQUARTERS
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white font-['Orbitron'] tracking-tight">
              CYBER COMMAND: {user?.fullName?.toUpperCase()}
            </h1>

            <p className="text-xs text-slate-400 flex items-center gap-3 font-mono">
              <span>Jurisdiction: <strong className="text-slate-200">National Cyber Security Operations Center</strong></span>
              <span>•</span>
              <span>Classification: <strong className="text-[#02baff]">TOP SECRET // STRATEGIC CLEARANCE</strong></span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddUserModal(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#0147bf] to-[#02baff] hover:from-[#013ab0] hover:to-[#00a8e8] text-white font-bold text-xs font-['Orbitron'] tracking-wider transition shadow-lg shadow-[#0147bf]/30 flex items-center gap-2 active:scale-95"
            >
              <UserPlus className="w-4 h-4" />
              <span>Provision User</span>
            </button>

            <button
              onClick={fetchAdminData}
              className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-[#02baff]/20 transition hover:border-[#02baff]/50"
              title="Refresh telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex items-center gap-1 overflow-x-auto pt-5 mt-5 border-t border-white/5 text-xs no-scrollbar">
          {[
            { id: 'system_overview', label: 'System Telemetry' },
            { id: 'ai_prediction', label: 'AI Crime Model' },
            { id: 'audit_trail', label: `Audit Trail (${auditLogs.length})` },
            { id: 'user_management', label: `User Directory (${usersList.length})` },
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
            </button>
          ))}
        </div>

      </div>

      {/* SYSTEM TELEMETRY METRICS */}
      {systemStats && (
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Registered Citizens & Personnel"
            value={systemStats.totalUsers}
            subtitle={`${systemStats.usersByRole?.CITIZEN || 0} NID-verified citizens`}
            icon={Users}
            variant="emerald"
          />

          <StatCard
            title="Verified Crime Incidents"
            value={systemStats.verifiedCrimes}
            subtitle={`${systemStats.totalCrimesLodged} Total cases submitted`}
            icon={Shield}
            variant="blue"
          />

          <StatCard
            title="Consumer Disputes"
            value={systemStats.totalConsumerComplaints}
            subtitle="Regulated under DNCRP Act 2009"
            icon={Activity}
            variant="amber"
          />

          <StatCard
            title="Security Audit Logs"
            value={systemStats.securityStatus?.totalAuditLogs || auditLogs.length}
            subtitle={`${systemStats.securityStatus?.unauthorizedAttemptsBlocked || 0} Unauthorized attacks blocked`}
            icon={FileText}
            variant="purple"
          />
        </section>
      )}

      {/* ========================================================================= */}
      {/* TAB 1: SYSTEM OVERVIEW & SECURITY TELEMETRY                                */}
      {/* ========================================================================= */}
      {activeTab === 'system_overview' && systemStats && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* National Security Status */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Server className="w-4 h-4 text-emerald-400" />
                Infrastructure & Security Integrity
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Database Architecture:</span>
                  <strong className="text-emerald-400 font-mono">{systemStats.securityStatus?.databaseType}</strong>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">Encryption Engine:</span>
                  <strong className="text-slate-200 font-mono">{systemStats.securityStatus?.encryptionEngine}</strong>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">National NID Gateway:</span>
                  <strong className="text-emerald-400 font-mono">{systemStats.securityStatus?.porichoyGateway}</strong>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-slate-400">AI Predictive Model:</span>
                  <strong className="text-purple-400 font-mono">{systemStats.securityStatus?.aiPredictionEngine}</strong>
                </div>
              </div>
            </div>

            {/* Platform Users by Authority Agency */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                Authority Personnel Distribution
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30">
                  <span className="text-slate-400 block">Verified Citizens</span>
                  <strong className="text-2xl font-bold text-emerald-400 font-display mt-1 block">
                    {systemStats.usersByRole?.CITIZEN || 0}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">100% NID Authenticated</span>
                </div>

                <div className="p-4 rounded-2xl bg-blue-950/20 border border-blue-500/30">
                  <span className="text-slate-400 block">Police Authorities</span>
                  <strong className="text-2xl font-bold text-blue-400 font-display mt-1 block">
                    {systemStats.usersByRole?.POLICE || 0}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">Command Officers</span>
                </div>

                <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-500/30">
                  <span className="text-slate-400 block">DNCRP Inspectors</span>
                  <strong className="text-2xl font-bold text-amber-400 font-display mt-1 block">
                    {systemStats.usersByRole?.CONSUMER_RIGHTS || 0}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">Enforcement Cell</span>
                </div>

                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30">
                  <span className="text-slate-400 block">System Administrators</span>
                  <strong className="text-2xl font-bold text-purple-400 font-display mt-1 block">
                    {systemStats.usersByRole?.ADMIN || 0}
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">HQ Clearance</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: AI PREDICTIVE CRIME MODEL & SCENARIO SIMULATION                    */}
      {/* ========================================================================= */}
      {activeTab === 'ai_prediction' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/30 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-purple-300">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>
                <strong>Demonstration Inference Engine:</strong> Uses historical spatial-temporal incident patterns and holiday volatility models for resource planning.
              </span>
            </div>
          </div>

          {directiveSuccessNotice && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in slide-in-from-top">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span className="font-medium">{directiveSuccessNotice}</span>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Interactive Simulation Parameters Form */}
            <div className="lg:col-span-1 p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white font-display">
                  Scenario Simulator
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Simulate risk probability across varied weather and seasonal factors.
                </p>
              </div>

              <form onSubmit={handleGenerateSimulation} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target District</label>
                  <select
                    value={simDistrict}
                    onChange={e => handleSimDistrictChange(e.target.value)}
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
                  <label className="block font-semibold text-slate-300 mb-1">Target Thana / Upazila</label>
                  <select
                    value={simThana}
                    onChange={e => setSimThana(e.target.value)}
                    className="sx-input"
                    required
                  >
                    {getThanasByDistrict(simDistrict).map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Target Crime Focus</label>
                  <select
                    value={simCrimeType}
                    onChange={e => setSimCrimeType(e.target.value as CrimeType)}
                    className="sx-input"
                  >
                    <option value={CrimeType.THEFT_ROBBERY}>Theft & Armed Robbery</option>
                    <option value={CrimeType.HARASSMENT}>Harassment & Stalking</option>
                    <option value={CrimeType.CYBER_CRIME}>Cybercrime & MFS Fraud</option>
                    <option value={CrimeType.EXTORTION}>Extortion / Chandabaji</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Weather Context</label>
                  <select
                    value={simWeather}
                    onChange={e => setSimWeather(e.target.value)}
                    className="sx-input"
                  >
                    <option value="Clear Night">Clear Night</option>
                    <option value="Heavy Monsoon">Heavy Monsoon (High Rain)</option>
                    <option value="Dense Winter Fog">Dense Winter Fog</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="festivalCheck"
                    checked={simFestival}
                    onChange={e => setSimFestival(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 bg-slate-800 border-slate-700"
                  />
                  <label htmlFor="festivalCheck" className="text-slate-300 cursor-pointer">
                    Eid / Puja / Major Festival Season
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isGeneratingSim}
                  className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition shadow-md shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {isGeneratingSim ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Computing Gradient Boosted Tree...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Run Scenario Forecast</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Simulation Results Output */}
            <div className="lg:col-span-2 space-y-4">
              {simResult ? (
                <div className="p-6 rounded-3xl bg-slate-900 border border-purple-500/40 space-y-5 shadow-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[11px] font-mono text-purple-400 uppercase tracking-widest font-bold">
                        Simulation Forecast Result
                      </span>
                      <h3 className="text-xl font-bold text-white font-display mt-0.5">
                        {simResult.thana}, {simResult.district}
                      </h3>
                    </div>

                    <span className={`px-3 py-1 rounded-xl text-xs font-mono font-bold border ${
                      simResult.predictedRiskLevel === 'CRITICAL' || simResult.predictedRiskLevel === 'EXTREME'
                        ? 'bg-red-500/20 text-red-300 border-red-500/40'
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}>
                      {simResult.predictedRiskLevel} RISK
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Confidence Score</span>
                      <strong className="text-purple-400 text-sm">{simResult.confidenceScore}%</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Crime Category</span>
                      <strong className="text-slate-200 text-sm truncate block">{simResult.crimeType}</strong>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Weather Correlation</span>
                      <strong className="text-slate-200 text-sm truncate block">{simResult.weatherContext}</strong>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <span className="text-slate-400 font-semibold block">Contributing Risk Factors:</span>
                    <div className="space-y-1.5">
                      {simResult.factors.map((f, i) => (
                        <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800 text-[11px]">
                          <span className="text-slate-300">{f.name}</span>
                          <span className="font-mono text-purple-400 font-bold">+{f.impact}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300 space-y-3">
                    <div>
                      <span className="font-bold text-white font-display block">Recommended Command Action:</span>
                      <p className="leading-relaxed mt-0.5">{simResult.recommendedAction}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-[11px] text-purple-300">
                        <span>Recommended Reinforcement: </span>
                        <strong className="text-white font-mono">{(simResult as any).recommendedUnits || 2} Patrol Units</strong>
                      </div>

                      <button
                        type="button"
                        onClick={handleIssueDirective}
                        disabled={isIssuingDirective}
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs transition shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {isIssuingDirective ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Transmitting Directive to Station...</span>
                          </>
                        ) : (
                          <>
                            <Radio className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                            <span>Issue Operational Command Directive</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h4 className="text-sm font-bold text-white font-display">
                    Regional Historical Baselines ({predictions.length})
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {predictions.map(pred => (
                      <div
                        key={pred.id}
                        className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg"
                      >
                        <div className="flex items-center justify-between">
                          <h5 className="font-bold text-white text-sm">{pred.thana}, {pred.district}</h5>
                          <span className="text-xs font-mono font-bold text-purple-400">{pred.predictedRiskLevel}</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{pred.recommendedAction}</p>
                        <span className="text-[10px] text-slate-500 font-mono block pt-1 border-t border-slate-800">
                          Model Confidence: {pred.confidenceScore}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 1. National Comparative Risk Matrix */}
          {riskMatrix.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-400" />
                    National Comparative Risk Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live cross-jurisdictional threat rankings based on spatial-temporal incident velocity.
                  </p>
                </div>
                <span className="text-xs font-mono text-purple-400 font-bold bg-purple-500/10 px-3 py-1 rounded-xl border border-purple-500/20">
                  {riskMatrix.length} Monitored Sectors
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-2.5 px-3">Jurisdiction</th>
                      <th className="py-2.5 px-3">Risk Level</th>
                      <th className="py-2.5 px-3">Risk Index</th>
                      <th className="py-2.5 px-3">Primary Threat</th>
                      <th className="py-2.5 px-3">7-Day Trend</th>
                      <th className="py-2.5 px-3">Active Incidents</th>
                      <th className="py-2.5 px-3">Tactical Recommendation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {riskMatrix.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-semibold text-white">
                          {item.thana}, <span className="text-slate-400 font-normal">{item.district}</span>
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            item.riskLevel === 'CRITICAL'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : item.riskLevel === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          }`}>
                            {item.riskLevel}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-purple-400 font-bold">
                          {item.riskIndex}%
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {item.primaryThreat}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`font-bold ${
                            item.trendDirection === 'UP' ? 'text-red-400' : item.trendDirection === 'DOWN' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {item.sevenDayTrend}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-300">
                          {item.activeIncidents}
                        </td>
                        <td className="py-3 px-3 text-slate-400 max-w-xs truncate" title={item.recommendedAction}>
                          {item.recommendedAction}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. Resource Reallocation Advisor */}
          {resourceAllocations.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  Strategic Force Multiplier & Resource Allocation Advisor
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Algorithmic reallocation recommendations: reassign patrol units from low-risk zones to high-risk bottlenecks during peak threat windows.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {resourceAllocations.map(alloc => (
                  <div key={alloc.id} className="p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-emerald-400 font-bold">{alloc.id}</span>
                      <span className="text-slate-400">{alloc.timeWindow}</span>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Source (Low Risk):</span>
                        <span className="font-semibold text-slate-300">{alloc.sourceStation}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Target (Surge Risk):</span>
                        <span className="font-semibold text-red-400">{alloc.targetStation}</span>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[11px] text-purple-200">
                      <strong>Recommended Units:</strong> {alloc.recommendedUnits}
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {alloc.tacticalRationale}
                    </p>

                    <div className="text-[10px] text-emerald-400 font-mono pt-2 border-t border-slate-800/80">
                      Impact: {alloc.expectedImpact}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 3. Operational Directives Execution Tracker */}
          {directivesList.length > 0 && (
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                    <Radio className="w-4 h-4 text-purple-400" />
                    HQ Operational Directives Execution Tracker
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time execution status of tactical directives dispatched to Bangladesh Police stations.
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {directivesList.filter(d => d.status === 'DEPLOYED').length} Deployed &bull; {directivesList.filter(d => d.status === 'ACTIVE').length} Awaiting Response
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                      <th className="py-2.5 px-3">Directive Code</th>
                      <th className="py-2.5 px-3">Target Thana</th>
                      <th className="py-2.5 px-3">Threat Level</th>
                      <th className="py-2.5 px-3">Crime Type</th>
                      <th className="py-2.5 px-3">Time Window</th>
                      <th className="py-2.5 px-3">Units</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Deployment Log</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {directivesList.map(dir => (
                      <tr key={dir.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-3 font-mono font-bold text-purple-400">
                          {dir.directiveCode}
                        </td>
                        <td className="py-3 px-3 font-semibold text-white">
                          {dir.targetThana}
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                            dir.threatLevel === 'CRITICAL' || dir.threatLevel === 'EXTREME'
                              ? 'bg-red-500/20 text-red-300 border-red-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          }`}>
                            {dir.threatLevel}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">
                          {dir.primaryRiskCrimeType}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-mono text-[11px]">
                          {dir.timeWindow}
                        </td>
                        <td className="py-3 px-3 font-mono text-purple-300 font-bold">
                          {dir.recommendedUnits} Patrols
                        </td>
                        <td className="py-3 px-3 font-mono">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border flex items-center gap-1 w-fit ${
                            dir.status === 'DEPLOYED'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                          }`}>
                            {dir.status === 'DEPLOYED' && <CheckCircle2 className="w-3 h-3" />}
                            {dir.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[11px] text-slate-400">
                          {dir.acknowledgedBy ? (
                            <span className="text-emerald-400 font-medium">
                              {dir.acknowledgedBy}
                            </span>
                          ) : (
                            <span className="text-slate-500 italic">Pending Station Acknowledgement</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SECURITY AUDIT TRAIL                                              */}
      {/* ========================================================================= */}
      {activeTab === 'audit_trail' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={e => setAuditSearchQuery(e.target.value)}
                placeholder="Search audit action, user, or IP..."
                className="sx-input"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={auditRoleFilter}
                onChange={e => setAuditRoleFilter(e.target.value)}
                className="sx-input !w-auto"
              >
                <option value="ALL">All Roles</option>
                <option value="CITIZEN">Citizen</option>
                <option value="POLICE">Police</option>
                <option value="CONSUMER_RIGHTS">Consumer Rights</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 font-mono uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Timestamp</th>
                    <th className="py-3.5 px-4 font-semibold">User / Role</th>
                    <th className="py-3.5 px-4 font-semibold">Action Triggered</th>
                    <th className="py-3.5 px-4 font-semibold">Resource</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">IP Address</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4 text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="py-3 px-4">
                        <span className="font-bold text-white">{log.userName}</span>
                        <span className="text-[10px] text-slate-500 block font-normal">{log.userRole}</span>
                      </td>
                      <td className="py-3 px-4 text-purple-300 font-bold">{log.action}</td>
                      <td className="py-3 px-4 text-slate-300">{log.resource}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.status === 'SUCCESS'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : 'bg-rose-500/20 text-rose-300'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-400">{log.ipAddress || '127.0.0.1'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: USER & AUTHORITY PROVISIONING DIRECTORY                            */}
      {/* ========================================================================= */}
      {activeTab === 'user_management' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white font-display">
                Authorized Personnel Directory ({usersList.length})
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Centralized management of verified citizens, police officers, and DNCRP inspectors.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={e => setUserSearchQuery(e.target.value)}
                  placeholder="Search user name or NID..."
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Provision User</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredUsers.map(u => (
              <div
                key={u.id}
                className="p-5 rounded-3xl bg-slate-900 border border-slate-800 space-y-3 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm font-display">{u.fullName}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
                    {u.role}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-400">
                  <p>Email: <strong className="text-slate-300">{u.email}</strong></p>
                  <p>Phone: <strong className="text-slate-300">{u.phone}</strong></p>
                  <p>NID: <span className="font-mono text-slate-300">{u.nidNumber}</span></p>
                  {u.stationOrThana && (
                    <p>Station: <span className="text-slate-300">{u.stationOrThana}</span></p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PROVISION AUTHORITY USER                                           */}
      {/* ========================================================================= */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-purple-500/50 rounded-3xl w-full max-w-md p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowAddUserModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white font-display">Provision Official Account</h3>
              <p className="text-xs text-slate-400 mt-0.5">National Security Clearance Access Control</p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Legal Name</label>
                <input
                  type="text"
                  value={newFullName}
                  onChange={e => setNewFullName(e.target.value)}
                  placeholder="e.g. Inspector Rafiqul Islam"
                  className="sx-input"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">National ID (NID)</label>
                <input
                  type="text"
                  value={newNID}
                  onChange={e => setNewNID(e.target.value)}
                  placeholder="10, 13, or 17 digit NID"
                  className="sx-input font-mono"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Official Role</label>
                <select
                  value={newRole}
                  onChange={e => setNewRole(e.target.value as UserRole)}
                  className="sx-input"
                >
                  <option value={UserRole.POLICE}>Police Authority (DMP/CID)</option>
                  <option value={UserRole.CONSUMER_RIGHTS}>Consumer Rights (DNCRP Inspector)</option>
                  <option value={UserRole.ADMIN}>System Administrator</option>
                  <option value={UserRole.CITIZEN}>Verified Citizen</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="officer@dmp.gov.bd"
                    className="sx-input"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="sx-input"
                    required
                  />
                </div>
              </div>

              {newRole === UserRole.POLICE ? (
                <div className="space-y-3 p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center justify-between">
                    <label className="block font-semibold text-slate-300 text-xs">
                      Police Station Jurisdiction & Rank Assignment <span className="text-purple-400">*</span>
                    </label>
                    <span className="text-[10px] text-purple-400 font-mono">Rational Dispatch Active</span>
                  </div>

                  {/* Rank / Designation & Department Specialization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Official Rank / Designation</label>
                      <select
                        value={newDesignation}
                        onChange={e => setNewDesignation(e.target.value)}
                        className="sx-input"
                      >
                        <option value="Sub-Inspector (SI)">Sub-Inspector (SI)</option>
                        <option value="Inspector (Investigation)">Inspector (Investigation)</option>
                        <option value="Officer-in-Charge (OC)">Officer-in-Charge (OC)</option>
                        <option value="Assistant Sub-Inspector (ASI)">Assistant Sub-Inspector (ASI)</option>
                        <option value="Senior Superintendent of Police (SP)">Senior Superintendent of Police (SP)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Specialized Division / Dept</label>
                      <select
                        value={newDepartment}
                        onChange={e => setNewDepartment(e.target.value)}
                        className="sx-input"
                      >
                        <option value="General Investigation & GD Registry">General Investigation & GD Registry</option>
                        <option value="Cyber Crime & Digital Forensics Cell">Cyber Crime & Digital Forensics Cell</option>
                        <option value="Women & Children Support Desk">Women & Children Support Desk</option>
                        <option value="Detective Branch (DB) / Crime Wing">Detective Branch (DB) / Crime Wing</option>
                        <option value="Traffic & Public Safety">Traffic & Public Safety</option>
                      </select>
                    </div>
                  </div>

                  {/* Badge Number & Jurisdiction District */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Official Badge Number</label>
                      <input
                        type="text"
                        value={newBadge}
                        onChange={e => setNewBadge(e.target.value)}
                        placeholder="e.g. BP-MYM-4019"
                        className="sx-input font-mono"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Assigned District</label>
                      <select
                        value={policeDistrict}
                        onChange={e => handlePoliceDistrictChange(e.target.value)}
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
                  </div>

                  {/* Thana & Station Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Thana / Police Station</label>
                      <select
                        value={policeThana}
                        onChange={e => handlePoliceThanaChange(e.target.value)}
                        className="sx-input"
                      >
                        {getThanasByDistrict(policeDistrict).map(t => (
                          <option key={t} value={t}>
                            {t} Police Station
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Station Record Identifier</label>
                      <input
                        type="text"
                        value={newStation}
                        onChange={e => setNewStation(e.target.value)}
                        className="sx-input font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Station / Department / Office</label>
                  <input
                    type="text"
                    value={newStation}
                    onChange={e => setNewStation(e.target.value)}
                    placeholder="e.g. DNCRP Headquarters, Motijheel"
                    className="sx-input"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Temporary Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="sx-input"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingUser}
                className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold tracking-wide transition shadow-lg shadow-purple-600/30 active:scale-95 disabled:opacity-50"
              >
                {isCreatingUser ? 'Provisioning Credentials...' : 'Provision Official Account'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
