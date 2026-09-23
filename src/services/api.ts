import {
  User,
  UserRole,
  CrimeReport,
  ConsumerComplaint,
  EmergencyAlert,
  SOSRequest,
  NIDVerificationResult,
  AIPredictionData,
  AuditLog,
  NotificationItem,
  ShopReputation,
  BarcodeVerification,
  CaseMessage,
  OperationalDirective,
  ComparativeRiskRank,
  ResourceAllocationAdvice,
  HotspotAnomaly,
  AIForecastZone
} from '../types';

const API_BASE = '/api';

export class ApiClient {
  private static getToken(): string | null {
    return sessionStorage.getItem('sentinelx_token');
  }

  public static setToken(token: string) {
    sessionStorage.setItem('sentinelx_token', token);
  }

  public static clearToken() {
    sessionStorage.removeItem('sentinelx_token');
    localStorage.removeItem('sentinelx_token');
  }

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = this.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {})
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `Request failed with status ${response.status}`);
    }

    return data;
  }

  // --- Auth & NID ---
  static async verifyNID(nidNumber: string, dob: string, usePorichoyLive = false): Promise<{ success: boolean; verification: NIDVerificationResult; alreadyRegistered: boolean }> {
    return this.request('/auth/verify-nid', {
      method: 'POST',
      body: JSON.stringify({ nidNumber, dob, usePorichoyLive })
    });
  }

  static async register(data: any): Promise<{ success: boolean; token: string; user: User }> {
    const res = await this.request<{ success: boolean; token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  static async login(identifier: string, password: string): Promise<{ success: boolean; token: string; user: User }> {
    const res = await this.request<{ success: boolean; token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password })
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  static async adminClearance(data: { clearanceKey: string; identifier: string; password: string }): Promise<{ success: boolean; token: string; user: User }> {
    const res = await this.request<{ success: boolean; token: string; user: User }>('/auth/admin-clearance', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  static async getMe(): Promise<{ success: boolean; user: User }> {
    return this.request('/auth/me');
  }

  static async sendEmailOtp(email: string, fullName?: string): Promise<{
    success: boolean;
    message: string;
    expiresInSeconds: number;
    emailMode: string;
    devOtp?: string;
  }> {
    return this.request('/auth/send-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, fullName })
    });
  }

  static async verifyEmailOtp(email: string, otp: string): Promise<{
    success: boolean;
    message: string;
    verifiedEmail: string;
  }> {
    return this.request('/auth/verify-email-otp', {
      method: 'POST',
      body: JSON.stringify({ email, otp })
    });
  }

  static async changePassword(currentPassword: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
    token: string;
    user: User;
  }> {
    const res = await this.request<{ success: boolean; message: string; token: string; user: User }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword })
    });
    if (res.token) this.setToken(res.token);
    return res;
  }

  static async requestPasswordResetOtp(identifier: string): Promise<{
    success: boolean;
    message: string;
    email: string;
    expiresInSeconds: number;
    emailMode: string;
    devOtp?: string;
  }> {
    return this.request('/auth/forgot-password/request-otp', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
  }

  static async resetPasswordWithOtp(data: { email: string; otp: string; newPassword: string }): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request('/auth/forgot-password/reset', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Citizen API ---
  static async submitCrimeReport(data: Partial<CrimeReport>): Promise<{ success: boolean; report: CrimeReport; message: string }> {
    return this.request('/citizen/reports', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getMyCrimeReports(): Promise<{ success: boolean; reports: CrimeReport[] }> {
    return this.request('/citizen/reports');
  }

  static async submitConsumerComplaint(data: Partial<ConsumerComplaint>): Promise<{ success: boolean; complaint: ConsumerComplaint; message: string }> {
    return this.request('/citizen/complaints', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getMyComplaints(): Promise<{ success: boolean; complaints: ConsumerComplaint[] }> {
    return this.request('/citizen/complaints');
  }

  static async triggerSOS(data: { locationName?: string; latitude?: number; longitude?: number }): Promise<{ success: boolean; sos: SOSRequest }> {
    return this.request('/citizen/sos', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getActiveSOS(): Promise<{ success: boolean; activeSOS: SOSRequest | null }> {
    return this.request('/citizen/sos/active');
  }

  static async resolveActiveSOS(sosId?: string): Promise<{ success: boolean }> {
    return this.request('/citizen/sos/resolve', {
      method: 'POST',
      body: JSON.stringify({ sosId })
    });
  }

  static async getActiveEmergencyAlerts(): Promise<{ success: boolean; alerts: EmergencyAlert[] }> {
    return this.request('/citizen/emergency-alerts');
  }

  static async getNotifications(): Promise<{ success: boolean; notifications: NotificationItem[] }> {
    return this.request('/citizen/notifications');
  }

  static async markNotificationRead(id: string): Promise<{ success: boolean }> {
    return this.request(`/citizen/notifications/${id}/read`, { method: 'POST' });
  }

  static async lookupBarcode(barcode: string): Promise<{ success: boolean; found: boolean; product?: BarcodeVerification; message?: string }> {
    return this.request(`/citizen/barcode/${encodeURIComponent(barcode)}`);
  }

  // --- Police API ---
  static async getPoliceSummary(): Promise<{ success: boolean; stats: any }> {
    return this.request('/police/dashboard-summary');
  }

  static async getPoliceCrimeReports(params?: any): Promise<{ success: boolean; reports: CrimeReport[] }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/police/reports${query}`);
  }

  static async verifyCrimeReport(id: string, action: 'VERIFY' | 'REJECT', notes?: string): Promise<{ success: boolean; report: CrimeReport }> {
    return this.request(`/police/reports/${id}/verify`, {
      method: 'POST',
      body: JSON.stringify({ action, notes })
    });
  }

  static async updateInvestigationStatus(id: string, data: any): Promise<{ success: boolean; report: CrimeReport }> {
    return this.request(`/police/reports/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async claimCrimeReport(id: string, note?: string): Promise<{ success: boolean; message: string; report: CrimeReport }> {
    return this.request(`/police/reports/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ note })
    });
  }

  static async assignCrimeReport(id: string, officerId: string, note?: string): Promise<{ success: boolean; message: string; report: CrimeReport }> {
    return this.request(`/police/reports/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ officerId, note })
    });
  }

  static async getPoliceOfficers(station?: string): Promise<{ success: boolean; officers: any[] }> {
    const query = station ? `?station=${encodeURIComponent(station)}` : '';
    return this.request(`/police/officers${query}`);
  }

  static async getPoliceCrimeHeatmap(): Promise<{
    success: boolean;
    totalVerifiedIncidents: number;
    incidents: any[];
    aiForecastZones: AIForecastZone[];
    hotspotAnomalies: HotspotAnomaly[];
  }> {
    return this.request('/police/heatmap');
  }

  static async takePoliceHeatmapAction(data: {
    actionType: 'DISPATCH_PATROL' | 'SET_CHECKPOST' | 'ACKNOWLEDGE_DIRECTIVE';
    directiveId?: string;
    locationName?: string;
    latitude?: number;
    longitude?: number;
    notes?: string;
  }): Promise<{ success: boolean; message: string; directive?: OperationalDirective; dispatchReference?: string; checkpostReference?: string }> {
    return this.request('/police/heatmap/action', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getPoliceEmergencyAlerts(): Promise<{ success: boolean; alerts: EmergencyAlert[] }> {
    return this.request('/police/emergency-alerts');
  }

  static async createEmergencyAlert(data: Partial<EmergencyAlert>): Promise<{ success: boolean; alert: EmergencyAlert }> {
    return this.request('/police/emergency-alerts', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async toggleAlertActive(id: string): Promise<{ success: boolean; alert: EmergencyAlert }> {
    return this.request(`/police/emergency-alerts/${id}/toggle-active`, { method: 'POST' });
  }

  static async getPoliceSOSList(params?: { scope?: string }): Promise<{ success: boolean; sosRequests: SOSRequest[] }> {
    const query = params?.scope ? `?scope=${encodeURIComponent(params.scope)}` : '';
    return this.request(`/police/sos${query}`);
  }

  static async respondToSOS(id: string, data: { status: string; assignedUnit?: string; notes?: string }): Promise<{ success: boolean; sos: SOSRequest }> {
    return this.request(`/police/sos/${id}/respond`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Consumer Rights API ---
  static async getConsumerSummary(params?: any): Promise<{ success: boolean; stats: any }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/consumer/dashboard-summary${query}`);
  }

  static async getConsumerComplaints(params?: any): Promise<{ success: boolean; complaints: ConsumerComplaint[] }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/consumer/complaints${query}`);
  }

  static async claimConsumerComplaint(id: string): Promise<{ success: boolean; complaint: ConsumerComplaint; message: string }> {
    return this.request(`/consumer/complaints/${id}/claim`, {
      method: 'POST'
    });
  }

  static async updateComplaintStatus(id: string, data: any): Promise<{ success: boolean; complaint: ConsumerComplaint }> {
    return this.request(`/consumer/complaints/${id}/status`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getConsumerOfficers(): Promise<{ success: boolean; officers: any[] }> {
    return this.request('/consumer/officers');
  }

  static async getShops(params?: any): Promise<{ success: boolean; shops: ShopReputation[] }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/consumer/shops${query}`);
  }

  static async registerShop(data: Partial<ShopReputation>): Promise<{ success: boolean; shop: ShopReputation }> {
    return this.request('/consumer/shops', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getBarcodes(): Promise<{ success: boolean; barcodes: BarcodeVerification[] }> {
    return this.request('/consumer/barcodes');
  }

  static async registerBarcode(data: Partial<BarcodeVerification>): Promise<{ success: boolean; product: BarcodeVerification }> {
    return this.request('/consumer/barcodes', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // --- Admin API ---
  static async getAdminSystemOverview(): Promise<{ success: boolean; stats: any }> {
    return this.request('/admin/system-overview');
  }

  static async getAdminUsers(): Promise<{ success: boolean; users: User[] }> {
    return this.request('/admin/users');
  }

  static async createAdminUser(data: any): Promise<{
    success: boolean;
    user: User;
    temporaryPassword?: string;
    emailDispatched?: boolean;
    emailMode?: string;
    emailMessage?: string;
  }> {
    return this.request('/admin/users', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getAdminAIPredictions(district?: string, thana?: string): Promise<{
    success: boolean;
    disclaimer: string;
    predictions: AIPredictionData[];
    riskMatrix: ComparativeRiskRank[];
    resourceAllocations: ResourceAllocationAdvice[];
    directives: OperationalDirective[];
  }> {
    const query = district ? `?district=${encodeURIComponent(district)}${thana ? `&thana=${encodeURIComponent(thana)}` : ''}` : '';
    return this.request(`/admin/ai-predictions${query}`);
  }

  static async issueAdminDirective(data: {
    targetDistrict: string;
    targetThana: string;
    predictedRiskLevel?: string;
    threatLevel?: string;
    primaryRiskCrimeType?: string;
    timeWindow?: string;
    recommendedAction?: string;
    patrolStrategy?: string;
    recommendedUnits?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<{ success: boolean; message: string; directive: OperationalDirective }> {
    return this.request('/admin/ai-predictions/directives', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getAdminDirectives(): Promise<{ success: boolean; directives: OperationalDirective[] }> {
    return this.request('/admin/ai-predictions/directives');
  }

  static async generateAIScenario(data: any): Promise<{ success: boolean; prediction: AIPredictionData }> {
    return this.request('/admin/ai-predictions/generate', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  static async getAdminAuditLogs(params?: any): Promise<{ success: boolean; totalLogs: number; logs: AuditLog[] }> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.request(`/admin/audit-logs${query}`);
  }

  static async getAdminSecurityConfig(): Promise<{ success: boolean; config: any }> {
    return this.request('/admin/security-config');
  }

  static async getAdminCrimeReports(): Promise<{ success: boolean; total: number; reports: CrimeReport[] }> {
    return this.request('/admin/reports');
  }

  static async logAdminAuditExport(recordCount: number): Promise<{ success: boolean }> {
    return this.request('/admin/audit-logs/log-export', {
      method: 'POST',
      body: JSON.stringify({ recordCount })
    });
  }

  // --- Case Messages & Hearing Inquiries ---
  static async getCaseMessages(caseId: string): Promise<{ success: boolean; caseId: string; count: number; messages: CaseMessage[] }> {
    return this.request(`/cases/${encodeURIComponent(caseId)}/messages`);
  }

  static async sendCaseMessage(
    caseId: string,
    data: {
      message?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      attachmentType?: string;
      caseType?: string;
      isOfficialNotice?: boolean;
    }
  ): Promise<{ success: boolean; message: CaseMessage }> {
    return this.request(`/cases/${encodeURIComponent(caseId)}/messages`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
}
