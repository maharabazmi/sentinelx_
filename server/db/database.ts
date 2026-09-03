import {
  User,
  UserRole,
  CrimeReport,
  CrimeIncident,
  CrimeType,
  CrimeSeverity,
  ReportStatus,
  EmergencyAlert,
  EmergencyType,
  AlertSeverity,
  SOSRequest,
  SOSStatus,
  ConsumerComplaint,
  ConsumerIssueType,
  ComplaintStatus,
  ShopReputation,
  BarcodeVerification,
  AuditLog,
  NotificationItem
} from '../../src/types';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { prismaDataStore } from './prisma-store';

// In-Memory Database with relational data models and comprehensive seed data
class DatabaseStore {
  public users: Map<string, User & { passwordHash: string }> = new Map();
  public crimeReports: Map<string, CrimeReport> = new Map();
  public emergencyAlerts: Map<string, EmergencyAlert> = new Map();
  public sosRequests: Map<string, SOSRequest> = new Map();
  public consumerComplaints: Map<string, ConsumerComplaint> = new Map();
  public shops: Map<string, ShopReputation> = new Map();
  public barcodeRegistry: Map<string, BarcodeVerification> = new Map();
  public auditLogs: AuditLog[] = [];
  public notifications: NotificationItem[] = [];

  constructor() {
    this.seedInitialData();
  }

  private seedInitialData() {
    const defaultPasswordHash = bcrypt.hashSync('demo1234', 8);

    // 1. Users for each role
    // CITIZEN: Tanvir Hossain (NID Verified)
    this.users.set('user-cit-1', {
      id: 'user-cit-1',
      nidNumber: '19922692015000123',
      fullName: 'Tanvir Hossain',
      email: 'citizen.tanvir@example.com',
      phone: '+8801711234567',
      role: UserRole.CITIZEN,
      isNIDVerified: true,
      stationOrThana: 'Uttara, Dhaka',
      createdAt: '2026-01-10T10:00:00Z',
      passwordHash: defaultPasswordHash
    });

    // CITIZEN 2: Farhana Sultana
    this.users.set('user-cit-2', {
      id: 'user-cit-2',
      nidNumber: '5508192841',
      fullName: 'Farhana Sultana',
      email: 'farhana.s@example.com',
      phone: '+8801819876543',
      role: UserRole.CITIZEN,
      isNIDVerified: true,
      stationOrThana: 'Panchlaish, Chattogram',
      createdAt: '2026-02-14T09:30:00Z',
      passwordHash: defaultPasswordHash
    });

    // POLICE OFFICER: Inspector Kamrul Islam (DMP)
    this.users.set('user-pol-1', {
      id: 'user-pol-1',
      nidNumber: '1098472918',
      fullName: 'Inspector Kamrul Islam',
      email: 'police.kamrul@dmp.gov.bd',
      phone: '+8801713001122',
      role: UserRole.POLICE,
      badgeNumber: 'DMP-84920',
      designation: 'Officer-in-Charge (OC)',
      department: 'Dhaka Metropolitan Police - Crime Division',
      stationOrThana: 'Gulshan Thana, Dhaka',
      isNIDVerified: true,
      createdAt: '2025-06-01T08:00:00Z',
      passwordHash: defaultPasswordHash
    });

    // POLICE OFFICER: Sub-Inspector Nazmul Huda (CMP)
    this.users.set('user-pol-2', {
      id: 'user-pol-2',
      nidNumber: '2948103948',
      fullName: 'SI Nazmul Huda',
      email: 'nazmul.huda@cmp.gov.bd',
      phone: '+8801713009988',
      role: UserRole.POLICE,
      badgeNumber: 'CMP-31409',
      designation: 'Sub-Inspector',
      department: 'Chattogram Metropolitan Police',
      stationOrThana: 'Agrabad / Kotwali, Chattogram',
      isNIDVerified: true,
      createdAt: '2025-07-15T08:00:00Z',
      passwordHash: defaultPasswordHash
    });

    // CONSUMER RIGHTS AUTHORITY: Deputy Director Shamim Reza
    this.users.set('user-cr-1', {
      id: 'user-cr-1',
      nidNumber: '3948102948',
      fullName: 'Shamim Reza',
      email: 'shamim.reza@dncrp.gov.bd',
      phone: '+8801712884433',
      role: UserRole.CONSUMER_RIGHTS,
      badgeNumber: 'DNCRP-OFFICER-44',
      designation: 'Deputy Director (Enforcement & Vigilance)',
      department: 'Directorate of National Consumers Right Protection (DNCRP)',
      stationOrThana: 'Dhaka Central Directorate',
      isNIDVerified: true,
      createdAt: '2025-08-01T08:00:00Z',
      passwordHash: defaultPasswordHash
    });

    // SYSTEM ADMINISTRATOR: Dr. Tariqul Alam
    this.users.set('user-adm-1', {
      id: 'user-adm-1',
      nidNumber: '19800029381928371',
      fullName: 'Dr. Tariqul Alam',
      email: 'admin@sentinelx.gov.bd',
      phone: '+8801710000001',
      role: UserRole.ADMIN,
      badgeNumber: 'ADMIN-SYS-001',
      designation: 'Chief Information & Security Officer',
      department: 'National Cyber Security & Public Safety Commission',
      stationOrThana: 'Central Command HQ, Dhaka',
      isNIDVerified: true,
      createdAt: '2025-01-01T00:00:00Z',
      passwordHash: defaultPasswordHash
    });

    // 2. Sample Crime Reports
    const sampleReports: CrimeReport[] = [
      {
        id: 'rep-001',
        caseId: 'CR-DHK-2026-0814',
        reporterId: 'user-cit-1',
        reporterName: 'Tanvir Hossain',
        reporterPhone: '+8801711234567',
        reporterNID: '19922692015000123',
        requestConfidentiality: true, // Citizen requested confidentiality!
        crimeType: CrimeType.THEFT_ROBBERY,
        title: 'Armed snatching incident near Gulshan 2 roundabout',
        description: 'Two perpetrators on an unnumbered motorcycle intercepted pedestrian carrying cash bag containing BDT 1,20,000 withdrawn from nearby commercial bank. They brandished sharp weapons and fled toward Kamal Ataturk Ave.',
        locationName: 'Gulshan 2, Near Landmark Tower',
        district: 'Dhaka',
        thana: 'Gulshan',
        latitude: 23.7925,
        longitude: 90.4078,
        occurredAt: '2026-08-28T21:15:00Z',
        submittedAt: '2026-08-28T21:40:00Z',
        severity: CrimeSeverity.HIGH,
        status: ReportStatus.INVESTIGATION,
        evidence: [
          {
            id: 'ev-1',
            fileName: 'cctv_screenshot_snatching.jpg',
            fileType: 'image',
            fileUrl: 'https://images.unsplash.com/photo-1557597774-9d273605dfa9?auto=format&fit=crop&w=600&q=80',
            fileSize: '1.4 MB',
            uploadedAt: '2026-08-28T21:40:00Z'
          }
        ],
        verificationNotes: 'Verified via physical visit and CCTV footage from Gulshan Shopping Centre camera 4.',
        verifiedByOfficerId: 'user-pol-1',
        assignedOfficerName: 'Inspector Kamrul Islam',
        assignedOfficerBadge: 'DMP-84920',
        assignedOfficerStation: 'Gulshan Thana, DMP',
        investigationUpdates: [
          {
            id: 'inv-1',
            timestamp: '2026-08-29T09:00:00Z',
            officerName: 'Inspector Kamrul Islam',
            status: ReportStatus.VERIFIED,
            note: 'Preliminary verification completed. Incident confirmed with physical evidence.'
          },
          {
            id: 'inv-2',
            timestamp: '2026-08-29T14:30:00Z',
            officerName: 'Inspector Kamrul Islam',
            status: ReportStatus.OFFICER_ASSIGNED,
            note: 'Case assigned to Sub-Inspector Al-Amin for motorcycle registration cross-check.'
          },
          {
            id: 'inv-3',
            timestamp: '2026-08-30T16:00:00Z',
            officerName: 'Inspector Kamrul Islam',
            status: ReportStatus.INVESTIGATION,
            note: 'Suspect motorcycle tracked on Banani bridge surveillance camera.'
          }
        ]
      },
      {
        id: 'rep-002',
        caseId: 'CR-DHK-2026-0820',
        reporterId: 'user-cit-1',
        reporterName: 'Tanvir Hossain',
        reporterPhone: '+8801711234567',
        reporterNID: '19922692015000123',
        requestConfidentiality: false,
        crimeType: CrimeType.CYBER_CRIME,
        title: 'Mobile Financial Service (MFS) OTP Phishing scam',
        description: 'Impersonator called claiming to be bKash security officer and tricked store clerk into sharing PIN code, transferring BDT 45,000 fraudulently.',
        locationName: 'Sector 4, Uttara, Dhaka',
        district: 'Dhaka',
        thana: 'Uttara',
        latitude: 23.8759,
        longitude: 90.3795,
        occurredAt: '2026-08-29T11:00:00Z',
        submittedAt: '2026-08-29T11:30:00Z',
        severity: CrimeSeverity.MEDIUM,
        status: ReportStatus.VERIFIED,
        evidence: [
          {
            id: 'ev-2',
            fileName: 'sms_transaction_receipt.png',
            fileType: 'image',
            fileUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=600&q=80',
            fileSize: '480 KB',
            uploadedAt: '2026-08-29T11:30:00Z'
          }
        ],
        verificationNotes: 'MFS transaction ID verified with bKash Bangladesh cyber liaison unit.',
        verifiedByOfficerId: 'user-pol-1',
        assignedOfficerName: 'Inspector Kamrul Islam',
        investigationUpdates: [
          {
            id: 'inv-4',
            timestamp: '2026-08-30T10:00:00Z',
            officerName: 'Inspector Kamrul Islam',
            status: ReportStatus.VERIFIED,
            note: 'Verification approved. Forwarded to Cyber Crime Division for IP/SIM lock.'
          }
        ]
      },
      {
        id: 'rep-003',
        caseId: 'CR-CTG-2026-0855',
        reporterId: 'user-cit-2',
        reporterName: 'Farhana Sultana',
        reporterPhone: '+8801819876543',
        reporterNID: '5508192841',
        requestConfidentiality: true,
        crimeType: CrimeType.EXTORTION,
        title: 'Extortion and intimidation at local wholesale trading shop',
        description: 'Local syndicate demanding monthly illegal levy of BDT 20,000 from grocery distributor under threat of shop disruption.',
        locationName: 'GEC Circle, Nasirabad, Chattogram',
        district: 'Chattogram',
        thana: 'Panchlaish',
        latitude: 22.3590,
        longitude: 91.8215,
        occurredAt: '2026-08-27T16:00:00Z',
        submittedAt: '2026-08-27T18:00:00Z',
        severity: CrimeSeverity.HIGH,
        status: ReportStatus.SUBMITTED,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'rep-004',
        caseId: 'CR-DHK-2026-0901',
        reporterId: 'user-cit-2',
        reporterName: 'Farhana Sultana',
        reporterPhone: '+8801819876543',
        reporterNID: '5508192841',
        requestConfidentiality: false,
        crimeType: CrimeType.HARASSMENT,
        title: 'Eve-teasing and aggressive stalking near Mirpur Girls College',
        description: 'Repeated stalking and offensive verbal abuse directed at female students during college departure hours.',
        locationName: 'Mirpur Section 2, Dhaka',
        district: 'Dhaka',
        thana: 'Mirpur',
        latitude: 23.8071,
        longitude: 90.3686,
        occurredAt: '2026-08-26T13:30:00Z',
        submittedAt: '2026-08-26T14:15:00Z',
        severity: CrimeSeverity.MEDIUM,
        status: ReportStatus.CASE_CLOSED,
        evidence: [],
        verificationNotes: 'Community police dispatched. Culprits apprehended and warning executed with parental bond.',
        verifiedByOfficerId: 'user-pol-1',
        assignedOfficerName: 'Inspector Kamrul Islam',
        investigationUpdates: [
          {
            id: 'inv-5',
            timestamp: '2026-08-26T15:00:00Z',
            officerName: 'Inspector Kamrul Islam',
            status: ReportStatus.VERIFIED,
            note: 'College administration statement recorded.'
          },
          {
            id: 'inv-6',
            timestamp: '2026-08-27T11:00:00Z',
            officerName: 'Inspector Kamrul Islam',
            status: ReportStatus.CASE_CLOSED,
            note: 'Resolved via Mobile Court action and strict patrolling guarantee.'
          }
        ]
      }
    ];

    sampleReports.forEach(r => this.crimeReports.set(r.id, r));

    // 3. Pre-populated Verified Crime Incidents for Police-Only Heatmap
    // (Notice: only VERIFIED incidents are included, matching the core requirement)
    const seedIncidents: CrimeReport[] = [
      {
        id: 'inc-01',
        caseId: 'INC-DHK-GUL-01',
        reporterId: 'user-cit-1',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801700000000',
        reporterNID: '1000000001',
        requestConfidentiality: false,
        crimeType: CrimeType.THEFT_ROBBERY,
        title: 'Vehicle break-in at Kemal Ataturk Ave',
        description: 'Laptop and documents stolen from parked private car.',
        locationName: 'Banani 11, Dhaka',
        district: 'Dhaka',
        thana: 'Banani',
        latitude: 23.7937,
        longitude: 90.4043,
        occurredAt: '2026-08-20T22:00:00Z',
        submittedAt: '2026-08-20T22:30:00Z',
        severity: CrimeSeverity.HIGH,
        status: ReportStatus.VERIFIED,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'inc-02',
        caseId: 'INC-DHK-MIR-02',
        reporterId: 'user-cit-1',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801700000000',
        reporterNID: '1000000002',
        requestConfidentiality: false,
        crimeType: CrimeType.THEFT_ROBBERY,
        title: 'Pickpocketing cluster near Mirpur 10 Metro Station',
        description: 'Multiple wallet snatching incidents reported during rush hour.',
        locationName: 'Mirpur 10 Roundabout',
        district: 'Dhaka',
        thana: 'Mirpur',
        latitude: 23.8069,
        longitude: 90.3687,
        occurredAt: '2026-08-22T19:30:00Z',
        submittedAt: '2026-08-22T20:00:00Z',
        severity: CrimeSeverity.MEDIUM,
        status: ReportStatus.INVESTIGATION,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'inc-03',
        caseId: 'INC-DHK-DHA-03',
        reporterId: 'user-cit-1',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801700000000',
        reporterNID: '1000000003',
        requestConfidentiality: false,
        crimeType: CrimeType.FRAUD_SCAM,
        title: 'Fake Job Agency Scam at Dhanmondi 27',
        description: 'Unlicensed agency collecting fake visa processing fees.',
        locationName: 'Dhanmondi 27, Dhaka',
        district: 'Dhaka',
        thana: 'Dhanmondi',
        latitude: 23.7538,
        longitude: 90.3756,
        occurredAt: '2026-08-18T14:00:00Z',
        submittedAt: '2026-08-18T16:00:00Z',
        severity: CrimeSeverity.HIGH,
        status: ReportStatus.CASE_CLOSED,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'inc-04',
        caseId: 'INC-DHK-MOT-04',
        reporterId: 'user-cit-1',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801700000000',
        reporterNID: '1000000004',
        requestConfidentiality: false,
        crimeType: CrimeType.DRUG_TRAFFICKING,
        title: 'Yaba tablets consignment seized at Kamalapur Railway area',
        description: 'Inter-district drug syndicate consignment intercepted by joint patrol.',
        locationName: 'Kamalapur Station, Motijheel',
        district: 'Dhaka',
        thana: 'Motijheel',
        latitude: 23.7314,
        longitude: 90.4253,
        occurredAt: '2026-08-25T03:00:00Z',
        submittedAt: '2026-08-25T04:00:00Z',
        severity: CrimeSeverity.CRITICAL,
        status: ReportStatus.INVESTIGATION,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'inc-05',
        caseId: 'INC-CTG-AGR-05',
        reporterId: 'user-cit-2',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801800000000',
        reporterNID: '1000000005',
        requestConfidentiality: false,
        crimeType: CrimeType.EXTORTION,
        title: 'Transport extortion at Badamtali intersection',
        description: 'Truck drivers harassed for unauthorized parking fees.',
        locationName: 'Agrabad Commercial Area, Chattogram',
        district: 'Chattogram',
        thana: 'Agrabad',
        latitude: 22.3275,
        longitude: 91.8122,
        occurredAt: '2026-08-24T18:00:00Z',
        submittedAt: '2026-08-24T18:45:00Z',
        severity: CrimeSeverity.HIGH,
        status: ReportStatus.VERIFIED,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'inc-06',
        caseId: 'INC-CTG-KOT-06',
        reporterId: 'user-cit-2',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801800000000',
        reporterNID: '1000000006',
        requestConfidentiality: false,
        crimeType: CrimeType.THEFT_ROBBERY,
        title: 'Jewelry shop burglary attempt at New Market',
        description: 'Lock-cutting tools seized after alarm system triggered.',
        locationName: 'Kotwali, Chattogram New Market',
        district: 'Chattogram',
        thana: 'Kotwali',
        latitude: 22.3350,
        longitude: 91.8325,
        occurredAt: '2026-08-27T02:15:00Z',
        submittedAt: '2026-08-27T02:45:00Z',
        severity: CrimeSeverity.CRITICAL,
        status: ReportStatus.INVESTIGATION,
        evidence: [],
        investigationUpdates: []
      },
      {
        id: 'inc-07',
        caseId: 'INC-SYL-ZIN-07',
        reporterId: 'user-cit-1',
        reporterName: 'Verified Reporter',
        reporterPhone: '+8801700000000',
        reporterNID: '1000000007',
        requestConfidentiality: false,
        crimeType: CrimeType.HARASSMENT,
        title: 'Harassment reported near City Centre Plaza',
        description: 'Verified incident with disciplinary action taken.',
        locationName: 'Zindabazar, Sylhet',
        district: 'Sylhet',
        thana: 'Kotwali',
        latitude: 24.8949,
        longitude: 91.8687,
        occurredAt: '2026-08-21T17:00:00Z',
        submittedAt: '2026-08-21T17:30:00Z',
        severity: CrimeSeverity.LOW,
        status: ReportStatus.CASE_CLOSED,
        evidence: [],
        investigationUpdates: []
      }
    ];

    seedIncidents.forEach(inc => this.crimeReports.set(inc.id, inc));

    // 4. Temporary Emergency Alerts (Issued by Police)
    const alert1: EmergencyAlert = {
      id: 'alert-001',
      alertCode: 'ALERT-DHK-FIRE-01',
      emergencyType: EmergencyType.MAJOR_FIRE,
      title: 'Major Chemical Warehouse Fire Hazard - Evacuation Advisory',
      message: 'A significant industrial fire broke out near Tejgaon Industrial Area Block B. Severe toxic smoke plume spreading toward Mohakhali and Nakhalpara. Fire Service & Civil Defence units are active on site. Citizens are advised to close windows, wear masks, and avoid the Shaheed Tajuddin Ahmad Sarani corridor.',
      affectedArea: 'Tejgaon Industrial Area & Mohakhali, Dhaka',
      district: 'Dhaka',
      latitude: 23.7685,
      longitude: 90.3980,
      radiusKm: 3.5,
      severity: AlertSeverity.CRITICAL,
      issuedByOfficerId: 'user-pol-1',
      issuedByOfficerName: 'Inspector Kamrul Islam',
      issuedByStation: 'Tejgaon / Gulshan Command, DMP',
      startTime: new Date(Date.now() - 3600 * 1000 * 3).toISOString(), // 3 hours ago
      expirationTime: new Date(Date.now() + 3600 * 1000 * 6).toISOString(), // expires in 6 hours
      isActive: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString()
    };

    const alert2: EmergencyAlert = {
      id: 'alert-002',
      alertCode: 'ALERT-CTG-WEATHER-02',
      emergencyType: EmergencyType.WEATHER_HAZARD,
      title: 'Severe Coastal Tidal Surge & Flash Flood Warning',
      message: 'Meteorological Dept issues Signal 7 for Chittagong Port. High astronomical tide combined with deep depression may inundate low-lying areas of Halishahar, Patenga, and Agrabad. Emergency shelter centers activated.',
      affectedArea: 'Patenga & Halishahar Coastal Belt, Chattogram',
      district: 'Chattogram',
      latitude: 22.2500,
      longitude: 91.8000,
      radiusKm: 12.0,
      severity: AlertSeverity.HIGH,
      issuedByOfficerId: 'user-pol-2',
      issuedByOfficerName: 'SI Nazmul Huda',
      issuedByStation: 'CMP Coastal Security Command',
      startTime: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
      expirationTime: new Date(Date.now() + 3600 * 1000 * 18).toISOString(),
      isActive: true,
      createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
    };

    this.emergencyAlerts.set(alert1.id, alert1);
    this.emergencyAlerts.set(alert2.id, alert2);

    // 5. Sample SOS Requests
    const sos1: SOSRequest = {
      id: 'sos-001',
      citizenId: 'user-cit-1',
      citizenName: 'Tanvir Hossain',
      citizenPhone: '+8801711234567',
      citizenNID: '19922692015000123',
      locationName: 'Near Jasimuddin Road, Uttara Sector 3, Dhaka',
      latitude: 23.8680,
      longitude: 90.3950,
      status: SOSStatus.RESPONDING,
      createdAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(), // 25 mins ago
      respondedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
      assignedUnit: 'DMP Mobile Patrol Van 14 (Uttara East)',
      notes: 'Officer contacted citizen via phone; patrol vehicle arrived at location.'
    };

    this.sosRequests.set(sos1.id, sos1);

    // 6. Consumer Complaints & Directorate Data
    const comp1: ConsumerComplaint = {
      id: 'comp-001',
      trackingNumber: 'DNCRP-DHK-2026-1049',
      complainantId: 'user-cit-1',
      complainantName: 'Tanvir Hossain',
      complainantPhone: '+8801711234567',
      shopName: 'Al-Madina Super Store',
      shopAddress: 'Plot 12, Main Road, Uttara Sector 6, Dhaka',
      shopDistrict: 'Dhaka',
      shopThana: 'Uttara',
      tradeLicenseOrBIN: 'BIN-948201948',
      productName: 'Imported Baby Milk Formula (900g)',
      brandName: 'NutriGrow Stage 2',
      barcode: '8901030491024',
      batchNumber: 'BATCH-NG-889',
      issueType: ConsumerIssueType.PRICE_GOUGING,
      pricePaid: 2450,
      mrp: 1850,
      description: 'The store charged BDT 2,450 for a baby milk tin with printed government Maximum Retail Price (MRP) of BDT 1,850. Merchant altered price sticker with manual marker.',
      submittedAt: '2026-08-25T15:00:00Z',
      status: ComplaintStatus.INVESTIGATION,
      evidence: [
        {
          id: 'ev-comp-1',
          fileName: 'cash_memo_overcharging.jpg',
          fileType: 'image',
          fileUrl: 'https://images.unsplash.com/photo-1554415707-9e49016a3b63?auto=format&fit=crop&w=600&q=80',
          fileSize: '890 KB',
          uploadedAt: '2026-08-25T15:00:00Z'
        }
      ],
      inspectorNotes: 'DNCRP inspection team conducted physical audit. Found 42 units of tampering with MRP. Notice served under Consumer Rights Protection Act 2009 Section 40.',
      penaltyImposed: 'Show-cause notice issued with penalty assessment of BDT 50,000.',
      assignedOfficerName: 'Shamim Reza',
      timeline: [
        {
          timestamp: '2026-08-25T15:00:00Z',
          status: ComplaintStatus.SUBMITTED,
          note: 'Complaint registered by citizen with purchase receipt.'
        },
        {
          timestamp: '2026-08-26T10:00:00Z',
          status: ComplaintStatus.UNDER_REVIEW,
          note: 'Initial scrutiny confirmed evidence meets legal threshold.',
          officerName: 'Shamim Reza'
        },
        {
          timestamp: '2026-08-27T11:30:00Z',
          status: ComplaintStatus.VERIFIED,
          note: 'Physical raid on merchant premises confirmed violations.',
          officerName: 'Shamim Reza'
        },
        {
          timestamp: '2026-08-28T14:00:00Z',
          status: ComplaintStatus.INVESTIGATION,
          note: 'Formal inquiry hearing scheduled under DNCRP rules.',
          officerName: 'Shamim Reza'
        }
      ]
    };

    const comp2: ConsumerComplaint = {
      id: 'comp-002',
      trackingNumber: 'DNCRP-CTG-2026-0422',
      complainantId: 'user-cit-2',
      complainantName: 'Farhana Sultana',
      complainantPhone: '+8801819876543',
      shopName: 'Green Life Pharmacy & Surgicals',
      shopAddress: 'Chawkbazar Circle, Chattogram',
      shopDistrict: 'Chattogram',
      shopThana: 'Kotwali',
      tradeLicenseOrBIN: 'BIN-110294829',
      productName: 'Paracetamol 500mg (100 Tablets Box)',
      brandName: 'Napa Extend',
      barcode: '8941100349281',
      issueType: ConsumerIssueType.EXPIRED_GOODS,
      pricePaid: 120,
      mrp: 120,
      description: 'Sold expired medication with scratch-off expiration date stamp.',
      submittedAt: '2026-08-20T10:00:00Z',
      status: ComplaintStatus.RESOLVED,
      evidence: [],
      inspectorNotes: 'Mobile court fine of BDT 30,000 imposed. Expired stock confiscated and destroyed in presence of Magistrate. Citizen awarded 25% fine incentive (BDT 7,500) per DNCRP Act Section 76(4).',
      penaltyImposed: 'BDT 30,000 Administrative Fine + 25% reward disbursed to complainant.',
      assignedOfficerName: 'Shamim Reza',
      timeline: [
        {
          timestamp: '2026-08-20T10:00:00Z',
          status: ComplaintStatus.SUBMITTED,
          note: 'Complaint submitted with product batch photograph.'
        },
        {
          timestamp: '2026-08-22T14:00:00Z',
          status: ComplaintStatus.VERIFIED,
          note: 'Directorate inspectors verified expired lot numbers.',
          officerName: 'Shamim Reza'
        },
        {
          timestamp: '2026-08-24T16:30:00Z',
          status: ComplaintStatus.RESOLVED,
          note: 'Case resolved. Fine deposited and incentive paid to citizen.',
          officerName: 'Shamim Reza'
        }
      ]
    };

    this.consumerComplaints.set(comp1.id, comp1);
    this.consumerComplaints.set(comp2.id, comp2);

    // 7. Shop Reputation Database
    const shopsSeed: ShopReputation[] = [
      {
        id: 'shop-01',
        shopName: 'Al-Madina Super Store',
        tradeLicenseOrBIN: 'BIN-948201948',
        address: 'Plot 12, Main Road, Uttara Sector 6, Dhaka',
        district: 'Dhaka',
        thana: 'Uttara',
        category: 'Grocery & Departmental',
        trustScore: 2.8,
        totalComplaints: 4,
        resolvedComplaints: 3,
        verifiedFinesCount: 2,
        lastInspectedAt: '2026-08-27T00:00:00Z',
        complianceStatus: 'UNDER_WATCH'
      },
      {
        id: 'shop-02',
        shopName: 'Shwapno Super Shop (Gulshan 1 Branch)',
        tradeLicenseOrBIN: 'BIN-839201847',
        address: 'Gulshan 1 DIT Market, Dhaka',
        district: 'Dhaka',
        thana: 'Gulshan',
        category: 'Superstore Chain',
        trustScore: 4.8,
        totalComplaints: 2,
        resolvedComplaints: 2,
        verifiedFinesCount: 0,
        lastInspectedAt: '2026-08-15T00:00:00Z',
        complianceStatus: 'EXEMPLARY'
      },
      {
        id: 'shop-03',
        shopName: 'Green Life Pharmacy & Surgicals',
        tradeLicenseOrBIN: 'BIN-110294829',
        address: 'Chawkbazar Circle, Chattogram',
        district: 'Chattogram',
        thana: 'Kotwali',
        category: 'Pharmacy & Healthcare',
        trustScore: 3.2,
        totalComplaints: 3,
        resolvedComplaints: 3,
        verifiedFinesCount: 1,
        lastInspectedAt: '2026-08-24T00:00:00Z',
        complianceStatus: 'GOOD'
      },
      {
        id: 'shop-04',
        shopName: 'Bengal Pure Oil Mills',
        tradeLicenseOrBIN: 'BIN-449102948',
        address: 'Khatunganj Wholesale Market, Chattogram',
        district: 'Chattogram',
        thana: 'Kotwali',
        category: 'Edible Oils & Commodities',
        trustScore: 1.6,
        totalComplaints: 7,
        resolvedComplaints: 2,
        verifiedFinesCount: 4,
        lastInspectedAt: '2026-08-10T00:00:00Z',
        complianceStatus: 'SUSPENDED'
      }
    ];

    shopsSeed.forEach(s => this.shops.set(s.id, s));

    // 8. Barcode Registry Database (BSTI Standards)
    const barcodesSeed: BarcodeVerification[] = [
      {
        barcode: '8901030491024',
        productName: 'NutriGrow Stage 2 Baby Formula (900g)',
        companyName: 'Apex Nutrition BD Ltd',
        bstiStandard: 'BDS-CAC-72:2018',
        mrp: 1850,
        isRegistered: true,
        status: 'AUTHENTIC'
      },
      {
        barcode: '8941100349281',
        productName: 'Napa Extend 665mg (Box of 120)',
        companyName: 'Beximco Pharmaceuticals Ltd',
        bstiStandard: 'DGDA-REG-014-049',
        mrp: 240,
        isRegistered: true,
        status: 'AUTHENTIC'
      },
      {
        barcode: '8941100001029',
        productName: 'Radhuni Pure Mustard Oil (1 Litre)',
        companyName: 'Square Consumer Products Ltd',
        bstiStandard: 'BDS 427:2019 (BSTI Verified)',
        mrp: 320,
        isRegistered: true,
        status: 'AUTHENTIC'
      },
      {
        barcode: '8900000999999',
        productName: 'Counterfeit Foreign Cosmetics Lot',
        companyName: 'Unregistered Entity',
        bstiStandard: 'NONE (Flagged by Customs)',
        mrp: 1500,
        isRegistered: false,
        status: 'COUNTERFEIT_FLAGGED'
      }
    ];

    barcodesSeed.forEach(b => this.barcodeRegistry.set(b.barcode, b));

    // 9. Initial Audit Logs
    this.auditLogs.push(
      {
        id: 'audit-001',
        timestamp: new Date(Date.now() - 3600 * 1000 * 24).toISOString(),
        userId: 'user-adm-1',
        userName: 'Dr. Tariqul Alam',
        userRole: UserRole.ADMIN,
        action: 'SYSTEM_BOOTSTRAP',
        resource: 'PLATFORM_CORE',
        ipAddress: '10.0.4.12',
        status: 'SUCCESS',
        details: 'SentinelX National Public Safety & Consumer Protection Engine initialized with encryption parameters.'
      },
      {
        id: 'audit-002',
        timestamp: new Date(Date.now() - 3600 * 1000 * 10).toISOString(),
        userId: 'user-pol-1',
        userName: 'Inspector Kamrul Islam',
        userRole: UserRole.POLICE,
        action: 'VERIFY_CRIME_REPORT',
        resource: 'CR-DHK-2026-0814',
        ipAddress: '103.14.88.22',
        status: 'SUCCESS',
        details: 'Officer verified snatching incident; reporter confidentiality flag protected.'
      },
      {
        id: 'audit-003',
        timestamp: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
        userId: 'user-pol-1',
        userName: 'Inspector Kamrul Islam',
        userRole: UserRole.POLICE,
        action: 'PUBLISH_EMERGENCY_ALERT',
        resource: 'ALERT-DHK-FIRE-01',
        ipAddress: '103.14.88.22',
        status: 'SUCCESS',
        details: 'Critical emergency alert broadcast for Tejgaon fire hazard with expiration timer.'
      },
      {
        id: 'audit-004',
        timestamp: new Date(Date.now() - 3600 * 1000 * 1).toISOString(),
        userId: 'user-adm-1',
        userName: 'Dr. Tariqul Alam',
        userRole: UserRole.ADMIN,
        action: 'RUN_AI_PREDICTION_SYNTHESIS',
        resource: 'AI_CRIME_PREDICTOR',
        ipAddress: '10.0.4.12',
        status: 'SUCCESS',
        details: 'Synthesized high-risk spatial temporal clusters for Gulshan and Mirpur sectors.'
      }
    );

    // 10. Initial Notifications for Citizen 1
    this.notifications.push(
      {
        id: 'notif-1',
        userId: 'user-cit-1',
        type: 'EMERGENCY_ALERT',
        title: '⚠️ EMERGENCY ALERT: Major Fire Hazard',
        message: 'Major industrial chemical fire near Tejgaon. Evacuation advisory in effect. Stay indoors.',
        relatedId: 'alert-001',
        severity: 'EMERGENCY',
        createdAt: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
        isRead: false
      },
      {
        id: 'notif-2',
        userId: 'user-cit-1',
        type: 'CASE_STATUS',
        title: 'Crime Case Status Update: CR-DHK-2026-0814',
        message: 'Your report has been verified by Inspector Kamrul Islam. Status: Active Investigation.',
        relatedId: 'rep-001',
        severity: 'INFO',
        createdAt: new Date(Date.now() - 3600 * 1000 * 8).toISOString(),
        isRead: false
      },
      {
        id: 'notif-3',
        userId: 'user-cit-1',
        type: 'COMPLAINT_UPDATE',
        title: 'Consumer Complaint Verified: DNCRP-DHK-2026-1049',
        message: 'DNCRP enforcement team conducted physical inspection at Al-Madina Super Store. Show-cause notice issued.',
        relatedId: 'comp-001',
        severity: 'INFO',
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
        isRead: true
      }
    );
  }
}

export const db = new DatabaseStore();
