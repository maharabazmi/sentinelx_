import { db as drizzleDb } from '../../src/db/index.ts';
import * as schema from '../../src/db/schema.ts';
import { eq } from 'drizzle-orm';
import {
  User,
  UserRole,
  CrimeReport,
  EmergencyAlert,
  SOSRequest,
  ConsumerComplaint,
  BarcodeVerification,
  AuditLog,
  NotificationItem
} from '../../src/types';
import bcrypt from 'bcryptjs';

export class PostgresService {
  private static seeded = false;

  public static async initAndSeed() {
    if (this.seeded) return;
    try {
      // Check if users exist
      const existingUsers = await drizzleDb.select().from(schema.users).limit(1);
      if (existingUsers.length === 0) {
        console.log('🌱 Seeding PostgreSQL initial records via Drizzle...');
        const defaultPasswordHash = bcrypt.hashSync('demo1234', 8);

        // 1. Seed Users
        await drizzleDb.insert(schema.users).values([
          {
            id: 'user-cit-1',
            nidNumber: '19922692015000123',
            fullName: 'Tanvir Hossain',
            email: 'citizen.tanvir@example.com',
            phone: '+8801711234567',
            role: 'CITIZEN',
            isNIDVerified: true,
            stationOrThana: 'Uttara, Dhaka',
            passwordHash: defaultPasswordHash
          },
          {
            id: 'user-cit-2',
            nidNumber: '5508192841',
            fullName: 'Farhana Sultana',
            email: 'farhana.s@example.com',
            phone: '+8801819876543',
            role: 'CITIZEN',
            isNIDVerified: true,
            stationOrThana: 'Panchlaish, Chattogram',
            passwordHash: defaultPasswordHash
          },
          {
            id: 'user-pol-1',
            nidNumber: '1098472918',
            fullName: 'Inspector Kamrul Islam',
            email: 'police.kamrul@dmp.gov.bd',
            phone: '+8801713001122',
            role: 'POLICE',
            badgeNumber: 'DMP-84920',
            designation: 'Officer-in-Charge (OC)',
            department: 'Dhaka Metropolitan Police - Crime Division',
            stationOrThana: 'Gulshan Thana, Dhaka',
            isNIDVerified: true,
            passwordHash: defaultPasswordHash
          },
          {
            id: 'user-pol-2',
            nidNumber: '2948103948',
            fullName: 'SI Nazmul Huda',
            email: 'nazmul.huda@cmp.gov.bd',
            phone: '+8801713009988',
            role: 'POLICE',
            badgeNumber: 'CMP-31409',
            designation: 'Sub-Inspector',
            department: 'Chattogram Metropolitan Police - Patrol Wing',
            stationOrThana: 'Kotwali Thana, Chattogram',
            isNIDVerified: true,
            passwordHash: defaultPasswordHash
          },
          {
            id: 'user-con-1',
            nidNumber: '4820194820',
            fullName: 'Mahbubur Rahman',
            email: 'mahbub.dncrp@mofa.gov.bd',
            phone: '+8801715887766',
            role: 'CONSUMER_RIGHTS',
            designation: 'Assistant Director (Enforcement)',
            department: 'Directorate of National Consumer Right Protection (DNCRP)',
            stationOrThana: 'Kawran Bazar Head Office, Dhaka',
            isNIDVerified: true,
            passwordHash: defaultPasswordHash
          },
          {
            id: 'user-adm-1',
            nidNumber: '9901928301',
            fullName: 'Dr. Tariqul Alam',
            email: 'admin.cyber@police.gov.bd',
            phone: '+8801700999888',
            role: 'ADMIN',
            designation: 'Director of National Cyber & Intelligence Command',
            department: 'National Cyber Security Operations Center',
            stationOrThana: 'Police Headquarters, Phoenix Road, Dhaka',
            isNIDVerified: true,
            passwordHash: defaultPasswordHash
          }
        ]);

        // 2. Seed Barcode Registry
        await drizzleDb.insert(schema.barcodeRegistry).values([
          {
            barcode: '8941100234012',
            productName: 'Teer Fortified Soybean Oil 1 Litre',
            brand: 'City Group (Teer)',
            category: 'Edible Cooking Oil',
            maximumRetailPrice: 175.00,
            bstiApproved: true,
            bstiStandardCode: 'BDS 1769:2014',
            manufacturerName: 'City Edible Oil Ltd, Narayanganj',
            batchNumber: 'TR-2026-B89',
            manufacturingDate: '2026-01-15',
            expiryDate: '2027-01-14',
            verified: true
          },
          {
            barcode: '8941100456123',
            productName: 'Fresh Refined Sugar 1 Kg Pack',
            brand: 'Meghna Group (Fresh)',
            category: 'Sugar & Sweeteners',
            maximumRetailPrice: 135.00,
            bstiApproved: true,
            bstiStandardCode: 'BDS 138:2006',
            manufacturerName: 'Meghna Sugar Refinery Ltd',
            batchNumber: 'MG-SUG-401',
            manufacturingDate: '2026-02-01',
            expiryDate: '2028-01-31',
            verified: true
          },
          {
            barcode: '8941100998811',
            productName: 'Aarong Dairy Pasteurized Liquid Milk 500ml',
            brand: 'BRAC Dairy (Aarong)',
            category: 'Dairy Products',
            maximumRetailPrice: 50.00,
            bstiApproved: true,
            bstiStandardCode: 'BDS 860:2001',
            manufacturerName: 'BRAC Dairy & Food Project, Gazipur',
            batchNumber: 'AR-MLK-9902',
            manufacturingDate: '2026-09-01',
            expiryDate: '2026-09-08',
            verified: true
          },
          {
            barcode: '8941100778899',
            productName: 'Ispahani Mirzapore Best Blend Tea 400g',
            brand: 'Ispahani (Mirzapore)',
            category: 'Beverages & Tea',
            maximumRetailPrice: 220.00,
            bstiApproved: true,
            bstiStandardCode: 'BDS 1586:2007',
            manufacturerName: 'Ispahani Foods Ltd, Chattogram',
            batchNumber: 'ISP-TEA-332',
            manufacturingDate: '2026-01-10',
            expiryDate: '2027-07-10',
            verified: true
          }
        ]);

        // 3. Seed Emergency Alerts
        await drizzleDb.insert(schema.emergencyAlerts).values([
          {
            id: 'alert-001',
            title: 'Flash Flood & Traffic Diversion Warning - Mirpur & Dhanmondi',
            message: 'Due to severe monsoonal cloudburst, heavy waterlogging reported on Rokeya Sarani and Dhanmondi 27. Citizens are advised to use alternative flyovers and avoid submerged power transformers.',
            type: 'WEATHER_HAZARD',
            severity: 'HIGH',
            affectedDistricts: ['Dhaka'],
            affectedThanas: ['Mirpur', 'Dhanmondi', 'Kafrul'],
            latitude: 23.7925,
            longitude: 90.3725,
            radiusKm: 4.5,
            issuedByOfficerId: 'user-pol-1',
            isActive: true,
            instructions: 'Stay indoors, keep emergency 999 hotline on standby, and do not approach open drainage canals.'
          },
          {
            id: 'alert-002',
            title: 'Anti-Price Gouging Public Notice - Edible Oil MRP Strict Enforcement',
            message: 'DNCRP Mobile Court operations active across Kawran Bazar and Chittagong Khatunganj. Charging over Govt MRP for soybean oil will attract immediate legal action and store sealing.',
            type: 'PUBLIC_SAFETY_EMERGENCY',
            severity: 'MODERATE',
            affectedDistricts: ['Dhaka', 'Chattogram'],
            affectedThanas: ['Tejgaon', 'Kotwali'],
            latitude: 23.7530,
            longitude: 90.3920,
            radiusKm: 15.0,
            issuedByOfficerId: 'user-pol-1',
            isActive: true,
            instructions: 'Report any overpricing with merchant receipt evidence on SentinelX consumer grievance section.'
          }
        ]);

        // 4. Seed Crime Reports
        await drizzleDb.insert(schema.crimeReports).values([
          {
            id: 'rep-001',
            trackingNumber: 'CR-2026-0901-8841',
            citizenId: 'user-cit-1',
            crimeType: 'THEFT_ROBBERY',
            title: 'Motorcycle Theft outside Dhanmondi Lake Walking Track',
            description: 'Yamaha FZS V3 (Dhaka Metro-LA-55-1234) stolen while parked near Road 8/A lakeside. CCTV footage shows two suspects on another scooter breaking handle lock.',
            incidentDate: '2026-09-01',
            incidentTime: '19:45',
            district: 'Dhaka',
            thana: 'Dhanmondi',
            specificLocation: 'Near Dhanmondi Lake Bridge, Road 8/A',
            latitude: 23.7465,
            longitude: 90.3776,
            severity: 'HIGH',
            status: 'INVESTIGATION',
            isAnonymous: false,
            evidenceFiles: [
              {
                id: 'ev-1',
                fileName: 'cctv_screenshot_robbery.jpg',
                fileType: 'image/jpeg',
                fileUrl: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?w=600&auto=format&fit=crop',
                fileSize: 1024000,
                uploadedAt: '2026-09-01T20:15:00Z',
                sha256Hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
              }
            ],
            assignedOfficerId: 'user-pol-1',
            officerNotes: 'CCTV footage acquired from Road 8 security gate. Vehicle registration flagged across DMP checkpoint database.',
            statusTimeline: [
              { status: 'SUBMITTED', updatedAt: '2026-09-01T20:00:00Z', updatedBy: 'Tanvir Hossain' },
              { status: 'VERIFIED', updatedAt: '2026-09-01T20:30:00Z', updatedBy: 'Inspector Kamrul Islam' },
              { status: 'INVESTIGATION', updatedAt: '2026-09-01T21:00:00Z', updatedBy: 'Inspector Kamrul Islam', note: 'SI assigned for CCTV perimeter check' }
            ],
            aiCategoryConfidence: 0.94,
            aiSuggestedDepartment: 'Vehicular Theft Investigation Unit (DMP)'
          },
          {
            id: 'rep-002',
            trackingNumber: 'CR-2026-0902-1209',
            citizenId: 'user-cit-2',
            crimeType: 'CYBER_CRIME',
            title: 'bKash Account OTP Impersonation & Financial Phishing Scam',
            description: 'Received fake SMS spoofing official bKash header claiming account suspension. Fraudster called claiming to be customer care and manipulated 25,000 BDT fund transfer.',
            incidentDate: '2026-09-02',
            incidentTime: '11:20',
            district: 'Chattogram',
            thana: 'Panchlaish',
            specificLocation: 'GEC Circle, Chattogram',
            latitude: 22.3590,
            longitude: 91.8215,
            severity: 'MEDIUM',
            status: 'VERIFIED',
            isAnonymous: false,
            evidenceFiles: [
              {
                id: 'ev-2',
                fileName: 'fraud_sms_screenshot.png',
                fileType: 'image/png',
                fileUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop',
                fileSize: 512000,
                uploadedAt: '2026-09-02T11:45:00Z',
                sha256Hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08'
              }
            ],
            assignedOfficerId: 'user-pol-2',
            statusTimeline: [
              { status: 'SUBMITTED', updatedAt: '2026-09-02T11:40:00Z', updatedBy: 'Farhana Sultana' },
              { status: 'VERIFIED', updatedAt: '2026-09-02T12:00:00Z', updatedBy: 'SI Nazmul Huda' }
            ],
            aiCategoryConfidence: 0.98,
            aiSuggestedDepartment: 'Cyber Crime Investigation Division (CID)'
          }
        ]);

        // 5. Seed Consumer Complaints
        await drizzleDb.insert(schema.consumerComplaints).values([
          {
            id: 'comp-001',
            trackingNumber: 'DNCRP-2026-0901-4411',
            citizenId: 'user-cit-1',
            shopName: 'Bismillah General Store & Traders',
            shopBIN: 'BIN-99201948',
            shopAddress: 'Shop 14, Block C, Uttara Sector 3 Market',
            district: 'Dhaka',
            thana: 'Uttara',
            issueType: 'PRICE_GOUGING',
            productName: 'Teer Fortified Soybean Oil 1 Litre',
            barcode: '8941100234012',
            expectedPrice: 175.00,
            chargedPrice: 215.00,
            claimedDescription: 'Store owner refused to sell 1L soybean oil at Government declared MRP of 175 BDT, forcibly demanded 215 BDT cash and refused to issue cash memo receipt.',
            receiptEvidenceUrl: 'https://images.unsplash.com/photo-1554415707-9e4966a604f7?w=600&auto=format&fit=crop',
            productPhotoUrl: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=600&auto=format&fit=crop',
            status: 'INVESTIGATION',
            assignedInspectorId: 'user-con-1',
            inspectorVerdict: 'Physical inspection team dispatched to Uttara Sector 3. Show-cause notice issued under Consumer Protection Act 2009 Section 40.'
          }
        ]);
        console.log('✅ PostgreSQL initial records seeded successfully.');
      }
      this.seeded = true;
    } catch (err: any) {
      console.error('PostgresService seed error:', err);
    }
  }
}
