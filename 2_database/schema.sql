-- =============================================================================
-- SENTINELX: AI-ASSISTED PUBLIC SAFETY & CONSUMER PROTECTION PLATFORM
-- JURISDICTION: PEOPLE'S REPUBLIC OF BANGLADESH
-- FORMAL RELATIONAL DATABASE SCHEMA (DDL) — POSTGRESQL / SQLITE COMPATIBLE
-- =============================================================================

PRAGMA foreign_keys = ON;

-- -----------------------------------------------------------------------------
-- 1. USERS TABLE (Citizens, Police Officers, DNCRP Officers, National Admins)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    fullName VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    phone VARCHAR(30) UNIQUE NOT NULL,
    nidNumber VARCHAR(30) UNIQUE,
    dob VARCHAR(20),
    role VARCHAR(30) NOT NULL CHECK (role IN ('CITIZEN', 'POLICE', 'CONSUMER_RIGHTS', 'ADMIN')),
    isVerified BOOLEAN NOT NULL DEFAULT 1,
    stationOrThana VARCHAR(150),
    badgeNumber VARCHAR(60),
    designation VARCHAR(120),
    assignedDistrict VARCHAR(80),
    officerRole VARCHAR(60),
    mustChangePassword BOOLEAN NOT NULL DEFAULT 0,
    emailVerified BOOLEAN NOT NULL DEFAULT 1,
    emailVerificationCode VARCHAR(16),
    emailVerificationExpiresAt VARCHAR(40),
    passwordHash VARCHAR(255) NOT NULL
);

CREATE INDEX IF NOT EXISTS ix_users_role_station ON users (role, stationOrThana);
CREATE INDEX IF NOT EXISTS ix_users_role_district ON users (role, assignedDistrict);

-- -----------------------------------------------------------------------------
-- 2. CRIME REPORTS / POLICE GD & FIR REGISTRY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS crime_reports (
    id VARCHAR(64) PRIMARY KEY,
    caseId VARCHAR(64) UNIQUE NOT NULL,
    reporterId VARCHAR(64) NOT NULL,
    reporterName VARCHAR(150) NOT NULL,
    reporterPhone VARCHAR(30),
    reporterNID VARCHAR(30),
    requestConfidentiality BOOLEAN NOT NULL DEFAULT 0,
    crimeType VARCHAR(60) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    locationName VARCHAR(255) NOT NULL,
    district VARCHAR(80) NOT NULL,
    thana VARCHAR(80) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    occurredAt VARCHAR(40) NOT NULL,
    submittedAt VARCHAR(40) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
    assignedOfficerId VARCHAR(64),
    assignedOfficerName VARCHAR(150),
    assignedOfficerBadge VARCHAR(60),
    assignedStation VARCHAR(150),
    firNumber VARCHAR(64),
    firRegisteredAt VARCHAR(40),
    penalCodeSections VARCHAR(255),
    evidence JSON,
    investigationUpdates JSON,
    FOREIGN KEY (reporterId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedOfficerId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_crime_reports_thana_status ON crime_reports (thana, status);
CREATE INDEX IF NOT EXISTS ix_crime_reports_district_status ON crime_reports (district, status);
CREATE INDEX IF NOT EXISTS ix_crime_reports_reporter ON crime_reports (reporterId);

-- -----------------------------------------------------------------------------
-- 3. SHOP REPUTATION & MERCHANT SURVEILLANCE DIRECTORY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS shop_reputations (
    id VARCHAR(64) PRIMARY KEY,
    shopName VARCHAR(200) NOT NULL,
    shopAddress VARCHAR(255) NOT NULL,
    district VARCHAR(80),
    thana VARCHAR(80),
    tradeLicenseOrBIN VARCHAR(80),
    reputationScore FLOAT NOT NULL DEFAULT 100.0,
    totalComplaints INTEGER NOT NULL DEFAULT 0,
    verifiedViolations INTEGER NOT NULL DEFAULT 0,
    totalFinesBdt FLOAT NOT NULL DEFAULT 0.0,
    riskLevel VARCHAR(30) NOT NULL DEFAULT 'COMPLIANT',
    lastInspectedAt VARCHAR(40)
);

CREATE INDEX IF NOT EXISTS ix_shop_reputations_name ON shop_reputations (shopName);
CREATE INDEX IF NOT EXISTS ix_shop_reputations_district_thana ON shop_reputations (district, thana);

-- -----------------------------------------------------------------------------
-- 4. DNCRP CONSUMER COMPLAINTS & 25% CITIZEN REWARD TABLE (ACT 2009)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS consumer_complaints (
    id VARCHAR(64) PRIMARY KEY,
    trackingNumber VARCHAR(64) UNIQUE NOT NULL,
    complainantId VARCHAR(64) NOT NULL,
    complainantName VARCHAR(150) NOT NULL,
    complainantPhone VARCHAR(30),
    complainantNID VARCHAR(30),
    shopName VARCHAR(200) NOT NULL,
    shopAddress VARCHAR(255) NOT NULL,
    shopDistrict VARCHAR(80),
    shopThana VARCHAR(80),
    tradeLicenseOrBIN VARCHAR(80),
    productName VARCHAR(200) NOT NULL,
    brandName VARCHAR(120),
    barcode VARCHAR(40),
    issueType VARCHAR(60) NOT NULL,
    mrp FLOAT NOT NULL DEFAULT 0.0,
    pricePaid FLOAT NOT NULL DEFAULT 0.0,
    description TEXT NOT NULL,
    submittedAt VARCHAR(40) NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'SUBMITTED',
    workflowQueue VARCHAR(40) NOT NULL DEFAULT 'INTAKE',
    assignedOfficerId VARCHAR(64),
    assignedOfficerName VARCHAR(150),
    assignedOffice VARCHAR(150),
    intakeVerifiedBy VARCHAR(150),
    intakeVerifiedAt VARCHAR(40),
    investigationSummary TEXT,
    investigatedBy VARCHAR(150),
    investigatedAt VARCHAR(40),
    fineAmount FLOAT DEFAULT 0.0,
    rewardAmount FLOAT DEFAULT 0.0,
    adjudicatedBy VARCHAR(150),
    adjudicatedAt VARCHAR(40),
    evidence JSON,
    timeline JSON,
    FOREIGN KEY (complainantId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assignedOfficerId) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS ix_consumer_complaints_district_queue ON consumer_complaints (shopDistrict, workflowQueue);
CREATE INDEX IF NOT EXISTS ix_consumer_complaints_complainant ON consumer_complaints (complainantId);

-- -----------------------------------------------------------------------------
-- 5. BSTI & GS1 BANGLADESH (894) BARCODE VERIFICATION REGISTRY TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS barcode_verifications (
    barcode VARCHAR(40) PRIMARY KEY,
    productName VARCHAR(200) NOT NULL,
    companyName VARCHAR(200) NOT NULL,
    bstiStandard VARCHAR(120) NOT NULL,
    mrp FLOAT NOT NULL,
    isRegistered BOOLEAN NOT NULL DEFAULT 1,
    status VARCHAR(40) NOT NULL CHECK (status IN ('AUTHENTIC', 'COUNTERFEIT_FLAGGED'))
);

-- -----------------------------------------------------------------------------
-- 6. EMERGENCY SOS DISTRESS BEACONS & OFFLINE STORE-AND-FORWARD UPLINK TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sos_requests (
    id VARCHAR(64) PRIMARY KEY,
    citizenId VARCHAR(64) NOT NULL,
    citizenName VARCHAR(150) NOT NULL,
    citizenPhone VARCHAR(30) NOT NULL,
    citizenNID VARCHAR(30),
    locationName VARCHAR(255) NOT NULL,
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'SOS_SENT',
    createdAt VARCHAR(40) NOT NULL,
    assignedStation VARCHAR(150),
    assignedUnit VARCHAR(150),
    notes TEXT,
    FOREIGN KEY (citizenId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_sos_requests_station_status ON sos_requests (assignedStation, status);
CREATE INDEX IF NOT EXISTS ix_sos_requests_citizen ON sos_requests (citizenId, status);

-- -----------------------------------------------------------------------------
-- 7. PUBLIC SAFETY EMERGENCY BROADCAST ALERTS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS emergency_alerts (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    alertType VARCHAR(60) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    affectedArea VARCHAR(150) NOT NULL,
    createdAt VARCHAR(40) NOT NULL,
    expirationTime VARCHAR(40) NOT NULL,
    isActive BOOLEAN NOT NULL DEFAULT 1,
    issuedBy VARCHAR(150)
);

-- -----------------------------------------------------------------------------
-- 8. TWO-WAY CASE & HEARING INQUIRY MESSAGES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS case_messages (
    id VARCHAR(64) PRIMARY KEY,
    caseId VARCHAR(64) NOT NULL,
    caseType VARCHAR(30) NOT NULL CHECK (caseType IN ('CRIME', 'CONSUMER')),
    senderId VARCHAR(64) NOT NULL,
    senderName VARCHAR(150) NOT NULL,
    senderRole VARCHAR(40) NOT NULL,
    message TEXT NOT NULL,
    attachmentUrl TEXT,
    attachmentName VARCHAR(200),
    attachmentType VARCHAR(60),
    isOfficialNotice BOOLEAN NOT NULL DEFAULT 0,
    createdAt VARCHAR(40) NOT NULL,
    FOREIGN KEY (senderId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_case_messages_case_id ON case_messages (caseId, createdAt);

-- -----------------------------------------------------------------------------
-- 9. REAL-TIME SYSTEM NOTIFICATIONS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    userId VARCHAR(64) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    relatedId VARCHAR(64),
    severity VARCHAR(30) NOT NULL DEFAULT 'INFO',
    createdAt VARCHAR(40) NOT NULL,
    isRead BOOLEAN NOT NULL DEFAULT 0,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS ix_notifications_user_read ON notifications (userId, isRead);

-- -----------------------------------------------------------------------------
-- 10. IMMUTABLE NATIONAL SECURITY & RBAC AUDIT LOGS TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp VARCHAR(40) NOT NULL,
    userId VARCHAR(64) NOT NULL,
    userName VARCHAR(150) NOT NULL,
    userRole VARCHAR(40) NOT NULL,
    action VARCHAR(120) NOT NULL,
    resource VARCHAR(80) NOT NULL,
    resourceId VARCHAR(80),
    ipAddress VARCHAR(60),
    status VARCHAR(30) NOT NULL,
    details TEXT
);

CREATE INDEX IF NOT EXISTS ix_audit_logs_timestamp ON audit_logs (timestamp DESC);
