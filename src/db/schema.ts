import { relations } from 'drizzle-orm';
import {
  pgTable,
  text,
  boolean,
  timestamp,
  doublePrecision,
  integer,
  jsonb
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  nidNumber: text('nid_number').notNull().unique(),
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone').notNull(),
  role: text('role').notNull().default('CITIZEN'), // CITIZEN, POLICE, CONSUMER_RIGHTS, ADMIN
  badgeNumber: text('badge_number'),
  designation: text('designation'),
  department: text('department'),
  isNIDVerified: boolean('is_nid_verified').notNull().default(false),
  stationOrThana: text('station_or_thana'),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

export const crimeReports = pgTable('crime_reports', {
  id: text('id').primaryKey(),
  trackingNumber: text('tracking_number').notNull().unique(),
  citizenId: text('citizen_id').references(() => users.id).notNull(),
  crimeType: text('crime_type').notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  incidentDate: text('incident_date').notNull(),
  incidentTime: text('incident_time').notNull(),
  district: text('district').notNull(),
  thana: text('thana').notNull(),
  specificLocation: text('specific_location').notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  severity: text('severity').notNull().default('MEDIUM'),
  status: text('status').notNull().default('SUBMITTED'),
  isAnonymous: boolean('is_anonymous').notNull().default(false),
  evidenceFiles: jsonb('evidence_files').$type<Array<{
    id: string;
    fileName: string;
    fileType: string;
    fileUrl: string;
    fileSize: number;
    uploadedAt: string;
    sha256Hash?: string;
  }>>().notNull().default([]),
  assignedOfficerId: text('assigned_officer_id').references(() => users.id),
  officerNotes: text('officer_notes'),
  statusTimeline: jsonb('status_timeline').$type<Array<{
    status: string;
    updatedAt: string;
    updatedBy: string;
    note?: string;
  }>>().notNull().default([]),
  aiCategoryConfidence: doublePrecision('ai_category_confidence'),
  aiSuggestedDepartment: text('ai_suggested_department'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const emergencyAlerts = pgTable('emergency_alerts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  severity: text('severity').notNull(),
  affectedDistricts: jsonb('affected_districts').$type<string[]>().notNull().default([]),
  affectedThanas: jsonb('affected_thanas').$type<string[]>().notNull().default([]),
  latitude: doublePrecision('latitude'),
  longitude: doublePrecision('longitude'),
  radiusKm: doublePrecision('radius_km'),
  issuedByOfficerId: text('issued_by_officer_id').references(() => users.id).notNull(),
  issuedAt: timestamp('issued_at').defaultNow().notNull(),
  isActive: boolean('is_active').notNull().default(true),
  instructions: text('instructions')
});

export const sosRequests = pgTable('sos_requests', {
  id: text('id').primaryKey(),
  citizenId: text('citizen_id').references(() => users.id).notNull(),
  latitude: doublePrecision('latitude').notNull(),
  longitude: doublePrecision('longitude').notNull(),
  locationAddress: text('location_address').notNull(),
  audioUrl: text('audio_url'),
  status: text('status').notNull().default('SOS_SENT'),
  respondedOfficerId: text('responded_officer_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at')
});

export const consumerComplaints = pgTable('consumer_complaints', {
  id: text('id').primaryKey(),
  trackingNumber: text('tracking_number').notNull().unique(),
  citizenId: text('citizen_id').references(() => users.id).notNull(),
  shopName: text('shop_name').notNull(),
  shopBIN: text('shop_bin'),
  shopAddress: text('shop_address').notNull(),
  district: text('district').notNull(),
  thana: text('thana').notNull(),
  issueType: text('issue_type').notNull(),
  productName: text('product_name').notNull(),
  barcode: text('barcode'),
  expectedPrice: doublePrecision('expected_price'),
  chargedPrice: doublePrecision('charged_price'),
  claimedDescription: text('claimed_description').notNull(),
  receiptEvidenceUrl: text('receipt_evidence_url'),
  productPhotoUrl: text('product_photo_url'),
  status: text('status').notNull().default('SUBMITTED'),
  assignedInspectorId: text('assigned_inspector_id').references(() => users.id),
  inspectorVerdict: text('inspector_verdict'),
  penaltyAmount: doublePrecision('penalty_amount'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

export const barcodeRegistry = pgTable('barcode_registry', {
  barcode: text('barcode').primaryKey(),
  productName: text('product_name').notNull(),
  brand: text('brand').notNull(),
  category: text('category').notNull(),
  maximumRetailPrice: doublePrecision('maximum_retail_price').notNull(),
  bstiApproved: boolean('bsti_approved').notNull().default(true),
  bstiStandardCode: text('bsti_standard_code').notNull(),
  manufacturerName: text('manufacturer_name').notNull(),
  batchNumber: text('batch_number'),
  manufacturingDate: text('manufacturing_date'),
  expiryDate: text('expiry_date'),
  verified: boolean('verified').notNull().default(true),
  lastUpdated: timestamp('last_updated').defaultNow().notNull()
});

export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  actorId: text('actor_id').notNull(),
  actorName: text('actor_name').notNull(),
  actorRole: text('actor_role').notNull(),
  action: text('action').notNull(),
  targetEntity: text('target_entity').notNull(),
  targetId: text('target_id').notNull(),
  ipAddress: text('ip_address').notNull(),
  details: text('details').notNull()
});

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id').references(() => users.id).notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').notNull(),
  relatedEntityId: text('related_entity_id'),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  crimeReports: many(crimeReports),
  consumerComplaints: many(consumerComplaints),
  sosRequests: many(sosRequests),
  notifications: many(notifications)
}));

export const crimeReportsRelations = relations(crimeReports, ({ one }) => ({
  citizen: one(users, {
    fields: [crimeReports.citizenId],
    references: [users.id]
  }),
  assignedOfficer: one(users, {
    fields: [crimeReports.assignedOfficerId],
    references: [users.id]
  })
}));

export const consumerComplaintsRelations = relations(consumerComplaints, ({ one }) => ({
  citizen: one(users, {
    fields: [consumerComplaints.citizenId],
    references: [users.id]
  }),
  assignedInspector: one(users, {
    fields: [consumerComplaints.assignedInspectorId],
    references: [users.id]
  })
}));
