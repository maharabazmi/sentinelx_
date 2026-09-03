// Shared TypeScript types for SentinelX Platform

export enum UserRole {
  CITIZEN = 'CITIZEN',
  POLICE = 'POLICE',
  CONSUMER_RIGHTS = 'CONSUMER_RIGHTS',
  ADMIN = 'ADMIN'
}

export enum CrimeType {
  THEFT_ROBBERY = 'THEFT_ROBBERY',
  HARASSMENT = 'HARASSMENT',
  FRAUD_SCAM = 'FRAUD_SCAM',
  PHYSICAL_ASSAULT = 'PHYSICAL_ASSAULT',
  CYBER_CRIME = 'CYBER_CRIME',
  DRUG_TRAFFICKING = 'DRUG_TRAFFICKING',
  EXTORTION = 'EXTORTION',
  VANDALISM = 'VANDALISM',
  OTHER = 'OTHER'
}

export enum CrimeSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum ReportStatus {
  SUBMITTED = 'SUBMITTED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  OFFICER_ASSIGNED = 'OFFICER_ASSIGNED',
  INVESTIGATION = 'INVESTIGATION',
  CASE_CLOSED = 'CASE_CLOSED'
}

export enum ComplaintStatus {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  INVESTIGATION = 'INVESTIGATION',
  RESOLVED = 'RESOLVED'
}

export enum ConsumerIssueType {
  PRICE_GOUGING = 'PRICE_GOUGING',
  EXPIRED_GOODS = 'EXPIRED_GOODS',
  COUNTERFEIT_PRODUCT = 'COUNTERFEIT_PRODUCT',
  FOOD_ADULTERATION = 'FOOD_ADULTERATION',
  WEIGHT_MEASUREMENT_FRAUD = 'WEIGHT_MEASUREMENT_FRAUD',
  FALSE_ADVERTISING = 'FALSE_ADVERTISING',
  DEFECTIVE_PRODUCT = 'DEFECTIVE_PRODUCT',
  OTHER = 'OTHER'
}

export enum EmergencyType {
  MAJOR_FIRE = 'MAJOR_FIRE',
  ATTACK = 'ATTACK',
  PUBLIC_SAFETY_EMERGENCY = 'PUBLIC_SAFETY_EMERGENCY',
  WEATHER_HAZARD = 'WEATHER_HAZARD',
  CIVIL_UNREST = 'CIVIL_UNREST',
  HAZMAT_LEAK = 'HAZMAT_LEAK'
}

export enum AlertSeverity {
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export enum SOSStatus {
  SOS_SENT = 'SOS_SENT',
  POLICE_NOTIFIED = 'POLICE_NOTIFIED',
  RESPONDING = 'RESPONDING',
  RESOLVED = 'RESOLVED'
}

export interface NIDVerificationResult {
  verified: boolean;
  nidNumber: string;
  fullNameEn: string;
  fullNameBn: string;
  dob: string;
  fatherName: string;
  motherName: string;
  address: string;
  district: string;
  thana: string;
  photoUrl?: string;
  bloodGroup?: string;
  verificationSource: 'PORICHOY_API' | 'MOCK_VERIFICATION';
  verifiedAt: string;
}

export interface User {
  id: string;
  nidNumber: string;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  badgeNumber?: string; // Police
  designation?: string; // Police / Authority
  department?: string; // Police division / Consumer Directorate
  stationOrThana?: string;
  isNIDVerified: boolean;
  createdAt: string;
}

export interface EvidenceFile {
  id: string;
  fileName: string;
  fileType: 'image' | 'video' | 'audio' | 'document';
  fileUrl: string;
  fileSize: string;
  uploadedAt: string;
}

export interface CrimeReport {
  id: string;
  caseId: string;
  reporterId: string;
  reporterName: string;
  reporterPhone: string;
  reporterNID: string;
  requestConfidentiality: boolean; // Citizen requested confidentiality
  crimeType: CrimeType;
  title: string;
  description: string;
  locationName: string;
  district: string;
  thana: string;
  latitude: number;
  longitude: number;
  occurredAt: string;
  submittedAt: string;
  severity: CrimeSeverity;
  status: ReportStatus;
  evidence: EvidenceFile[];
  verificationNotes?: string;
  verifiedByOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficerBadge?: string;
  assignedOfficerStation?: string;
  investigationUpdates: Array<{
    id: string;
    timestamp: string;
    officerName: string;
    status: ReportStatus;
    note: string;
  }>;
}

export interface CrimeIncident {
  id: string;
  caseId: string;
  crimeType: CrimeType;
  severity: CrimeSeverity;
  locationName: string;
  district: string;
  thana: string;
  latitude: number;
  longitude: number;
  occurredAt: string;
  verifiedAt: string;
  intensity: number; // 0.1 to 1.0 for heatmap rendering
}

export interface EmergencyAlert {
  id: string;
  alertCode: string;
  emergencyType: EmergencyType;
  title: string;
  message: string;
  affectedArea: string;
  district: string;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  severity: AlertSeverity;
  issuedByOfficerId: string;
  issuedByOfficerName: string;
  issuedByStation: string;
  startTime: string;
  expirationTime: string;
  isActive: boolean;
  createdAt: string;
}

export interface SOSRequest {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenPhone: string;
  citizenNID: string;
  locationName: string;
  latitude: number;
  longitude: number;
  status: SOSStatus;
  createdAt: string;
  respondedAt?: string;
  assignedUnit?: string;
  notes?: string;
}

export interface ConsumerComplaint {
  id: string;
  trackingNumber: string;
  complainantId: string;
  complainantName: string;
  complainantPhone: string;
  shopName: string;
  shopAddress: string;
  shopDistrict: string;
  shopThana: string;
  tradeLicenseOrBIN?: string;
  productName: string;
  brandName?: string;
  barcode?: string;
  batchNumber?: string;
  issueType: ConsumerIssueType;
  pricePaid?: number;
  mrp?: number;
  description: string;
  submittedAt: string;
  status: ComplaintStatus;
  evidence: EvidenceFile[];
  inspectorNotes?: string;
  penaltyImposed?: string;
  assignedOfficerName?: string;
  timeline: Array<{
    timestamp: string;
    status: ComplaintStatus;
    note: string;
    officerName?: string;
  }>;
}

export interface ShopReputation {
  id: string;
  shopName: string;
  tradeLicenseOrBIN: string;
  address: string;
  district: string;
  thana: string;
  category: string;
  trustScore: number; // 1.0 to 5.0
  totalComplaints: number;
  resolvedComplaints: number;
  verifiedFinesCount: number;
  lastInspectedAt: string;
  complianceStatus: 'EXEMPLARY' | 'GOOD' | 'UNDER_WATCH' | 'SUSPENDED';
}

export interface BarcodeVerification {
  barcode: string;
  productName: string;
  companyName: string;
  bstiStandard: string;
  mrp: number;
  isRegistered: boolean;
  status: 'AUTHENTIC' | 'WARNING' | 'COUNTERFEIT_FLAGGED';
}

export interface AIPredictionData {
  id: string;
  targetDistrict: string;
  targetThana: string;
  predictedRiskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  confidenceScore: number; // 0 - 100%
  primaryRiskCrimeType: CrimeType;
  riskProbability: number;
  timeWindow: string;
  temporalFactors: {
    dayOfWeek: string;
    timeOfDay: string;
    holidayOrFestival?: string;
    weatherCondition: string;
    trafficDensity: 'LOW' | 'MODERATE' | 'HEAVY';
    commercialActivity: 'LOW' | 'MODERATE' | 'HIGH';
  };
  keyContributingIndicators: string[];
  recommendedPatrolStrategy: string;
  modelInfo: {
    modelName: string;
    algorithm: string;
    trainedOnIncidentsCount: number;
    lastTrainedAt: string;
    isDemo: boolean;
  };
  generatedAt: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  status: 'SUCCESS' | 'DENIED' | 'FLAGGED';
  details: string;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: 'CASE_STATUS' | 'EMERGENCY_ALERT' | 'SOS_UPDATE' | 'COMPLAINT_UPDATE' | 'SYSTEM';
  title: string;
  message: string;
  relatedId?: string;
  severity?: 'INFO' | 'WARNING' | 'EMERGENCY';
  createdAt: string;
  isRead: boolean;
}

export interface CaseMessage {
  id: string;
  caseId: string;
  caseType: 'CRIME' | 'CONSUMER';
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  senderBadge?: string;
  message: string;
  isOfficialNotice: boolean;
  timestamp: string;
}

