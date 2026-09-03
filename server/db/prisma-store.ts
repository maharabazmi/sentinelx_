import { prisma } from './prisma';
import {
  User,
  UserRole,
  CrimeReport,
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

/**
 * PostgreSQL / Prisma persistence layer with seamless fallback/bootstrap capabilities.
 * Manages full relational CRUD operations for SentinelX.
 */
export class PrismaDataStore {
  private isConnected = false;

  constructor() {
    this.checkConnectionAndBootstrap();
  }

  private async checkConnectionAndBootstrap() {
    try {
      if (process.env.DATABASE_URL) {
        await prisma.$connect();
        this.isConnected = true;
        console.log('✅ PostgreSQL connected via Prisma');
        await this.ensureSeedData();
      }
    } catch (err: any) {
      console.warn('ℹ️ PostgreSQL / Prisma operating in resilient mode:', err.message);
      this.isConnected = false;
    }
  }

  public async ensureSeedData() {
    try {
      const userCount = await prisma.user.count();
      if (userCount === 0) {
        console.log('🌱 Seeding initial PostgreSQL data via Prisma...');
        const defaultPasswordHash = bcrypt.hashSync('demo1234', 8);

        // Seed Users
        const tanvir = await prisma.user.create({
          data: {
            id: 'user-cit-1',
            nidNumber: '19922692015000123',
            fullName: 'Tanvir Hossain',
            email: 'citizen.tanvir@example.com',
            phone: '+8801711234567',
            role: 'CITIZEN',
            isNIDVerified: true,
            stationOrThana: 'Uttara, Dhaka',
            passwordHash: defaultPasswordHash
          }
        });

        const farhana = await prisma.user.create({
          data: {
            id: 'user-cit-2',
            nidNumber: '5508192841',
            fullName: 'Farhana Sultana',
            email: 'farhana.s@example.com',
            phone: '+8801819876543',
            role: 'CITIZEN',
            isNIDVerified: true,
            stationOrThana: 'Panchlaish, Chattogram',
            passwordHash: defaultPasswordHash
          }
        });

        await prisma.user.create({
          data: {
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
          }
        });

        await prisma.user.create({
          data: {
            id: 'user-cr-1',
            nidNumber: '3948102948',
            fullName: 'Shamim Reza',
            email: 'shamim.reza@dncrp.gov.bd',
            phone: '+8801712884433',
            role: 'CONSUMER_RIGHTS',
            badgeNumber: 'DNCRP-OFFICER-44',
            designation: 'Deputy Director (Enforcement & Vigilance)',
            department: 'Directorate of National Consumers Right Protection (DNCRP)',
            stationOrThana: 'Dhaka Central Directorate',
            isNIDVerified: true,
            passwordHash: defaultPasswordHash
          }
        });

        await prisma.user.create({
          data: {
            id: 'user-adm-1',
            nidNumber: '19800029381928371',
            fullName: 'Dr. Tariqul Alam',
            email: 'admin@sentinelx.gov.bd',
            phone: '+8801710000001',
            role: 'ADMIN',
            badgeNumber: 'ADMIN-SYS-001',
            designation: 'Chief Information & Security Officer',
            department: 'National Cyber Security & Public Safety Commission',
            stationOrThana: 'Central Command HQ, Dhaka',
            isNIDVerified: true,
            passwordHash: defaultPasswordHash
          }
        });

        // Seed Shops
        await prisma.shopReputation.createMany({
          data: [
            {
              id: 'shop-01',
              shopName: 'Al-Madina Super Store',
              tradeLicenseNo: 'TRAD/DNCC/082910',
              ownerName: 'Hazi Rafiqul Islam',
              phone: '+8801715001122',
              address: 'Shop 14-16, DCC Market, Gulshan 1',
              marketArea: 'Gulshan 1 DCC Market',
              thana: 'Gulshan',
              district: 'Dhaka',
              category: 'Grocery & FMCG',
              trustScore: 48,
              totalFinesBDT: 50000,
              violationCount: 3,
              isBlacklisted: false
            },
            {
              id: 'shop-02',
              shopName: 'Green Life General Pharmacy',
              tradeLicenseNo: 'TRAD/DSCC/110948',
              ownerName: 'Dr. Anwar Hossain',
              phone: '+8801819334455',
              address: 'House 42, Road 7, Dhanmondi',
              marketArea: 'Dhanmondi Central',
              thana: 'Dhanmondi',
              district: 'Dhaka',
              category: 'Medicine & Healthcare',
              trustScore: 94,
              totalFinesBDT: 0,
              violationCount: 0,
              isBlacklisted: false
            }
          ]
        });

        // Seed Barcodes
        await prisma.barcodeVerification.createMany({
          data: [
            {
              barcode: '8901030491024',
              productName: 'NutriGrow Stage 2 Baby Formula (900g)',
              brand: 'Apex Nutrition BD Ltd',
              category: 'Baby Care & Nutrition',
              maxRetailPriceBDT: 1850,
              bstiStandardCode: 'BDS-CAC-72:2018',
              manufacturer: 'Apex Nutrition BD Ltd',
              isBSTIApproved: true,
              batchNumber: 'LOT-2026-N2',
              expiryDate: '2027-12-31'
            },
            {
              barcode: '8941100349281',
              productName: 'Napa Extend 665mg (Box of 120)',
              brand: 'Beximco Pharmaceuticals Ltd',
              category: 'Pharmaceuticals',
              maxRetailPriceBDT: 240,
              bstiStandardCode: 'DGDA-REG-014-049',
              manufacturer: 'Beximco Pharma Ltd',
              isBSTIApproved: true,
              batchNumber: 'BX-9948',
              expiryDate: '2028-06-30'
            },
            {
              barcode: '8941100001029',
              productName: 'Radhuni Pure Mustard Oil (1 Litre)',
              brand: 'Square Consumer Products Ltd',
              category: 'Edible Oils',
              maxRetailPriceBDT: 320,
              bstiStandardCode: 'BDS 427:2019 (BSTI Verified)',
              manufacturer: 'Square Food & Beverage Ltd',
              isBSTIApproved: true,
              batchNumber: 'SQ-8172',
              expiryDate: '2027-04-15'
            }
          ]
        });

        // Seed Emergency Alerts
        await prisma.emergencyAlert.create({
          data: {
            id: 'alert-001',
            title: '⚠️ URGENT: Major Fire Hazard Advisory',
            message: 'Major industrial chemical fire near Tejgaon Industrial Area. Fire Services & Civil Defence deployed. Evacuate 500m radius.',
            type: 'FIRE_OUTBREAK',
            severity: 'CRITICAL',
            division: 'Dhaka',
            district: 'Dhaka',
            thana: 'Tejgaon',
            latitude: 23.7594,
            longitude: 90.3907,
            radiusKm: 2.5,
            active: true,
            broadcastBy: 'Inspector Kamrul Islam (DMP Operations)'
          }
        });

        console.log('✅ PostgreSQL seeded successfully.');
      }
    } catch (err: any) {
      console.warn('Seed operation status:', err.message);
    }
  }
}

export const prismaDataStore = new PrismaDataStore();
