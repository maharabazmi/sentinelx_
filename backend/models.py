import json
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Boolean,
    Float,
    Integer,
    Text,
    DateTime
)
from sqlalchemy.orm import declarative_base

Base = declarative_base()

def utcnow_iso():
    return datetime.now(timezone.utc).isoformat()


class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True)
    nidNumber = Column(String(32), unique=True, nullable=False, index=True)
    fullName = Column(String(128), nullable=False)
    email = Column(String(128), unique=True, nullable=False, index=True)
    phone = Column(String(32), nullable=False)
    role = Column(String(32), nullable=False, default="CITIZEN")
    badgeNumber = Column(String(64), nullable=True)
    designation = Column(String(128), nullable=True)
    department = Column(String(128), nullable=True)
    stationOrThana = Column(String(128), nullable=False)
    isNIDVerified = Column(Boolean, default=False)
    passwordHash = Column(String(256), nullable=False)
    createdAt = Column(String(64), default=utcnow_iso)

    def to_dict(self, safe=True):
        data = {
            "id": self.id,
            "nidNumber": self.nidNumber,
            "fullName": self.fullName,
            "email": self.email,
            "phone": self.phone,
            "role": self.role,
            "badgeNumber": self.badgeNumber,
            "designation": self.designation,
            "department": self.department,
            "stationOrThana": self.stationOrThana,
            "isNIDVerified": self.isNIDVerified,
            "createdAt": self.createdAt,
        }
        if not safe:
            data["passwordHash"] = self.passwordHash
        return data


class CrimeReport(Base):
    __tablename__ = "crime_reports"

    id = Column(String(64), primary_key=True)
    caseId = Column(String(64), nullable=False, index=True)
    reporterId = Column(String(64), nullable=False, index=True)
    reporterName = Column(String(128), nullable=False)
    reporterPhone = Column(String(32), nullable=False)
    reporterNID = Column(String(32), nullable=False)
    requestConfidentiality = Column(Boolean, default=False)
    crimeType = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    description = Column(Text, nullable=False)
    locationName = Column(String(256), nullable=False)
    district = Column(String(64), nullable=False, index=True)
    thana = Column(String(64), nullable=False, index=True)
    latitude = Column(Float, nullable=False, default=23.8103)
    longitude = Column(Float, nullable=False, default=90.4125)
    occurredAt = Column(String(64), nullable=False)
    submittedAt = Column(String(64), default=utcnow_iso)
    severity = Column(String(32), nullable=False, default="MEDIUM")
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)
    evidenceJson = Column(Text, default="[]")
    verificationNotes = Column(Text, nullable=True)
    verifiedByOfficerId = Column(String(64), nullable=True)
    assignedOfficerName = Column(String(128), nullable=True)
    assignedOfficerBadge = Column(String(64), nullable=True)
    assignedOfficerStation = Column(String(128), nullable=True)
    investigationUpdatesJson = Column(Text, default="[]")

    @property
    def evidence(self):
        try:
            return json.loads(self.evidenceJson or "[]")
        except Exception:
            return []

    @evidence.setter
    def evidence(self, val):
        self.evidenceJson = json.dumps(val if val is not None else [])

    @property
    def investigationUpdates(self):
        try:
            return json.loads(self.investigationUpdatesJson or "[]")
        except Exception:
            return []

    @investigationUpdates.setter
    def investigationUpdates(self, val):
        self.investigationUpdatesJson = json.dumps(val if val is not None else [])

    def to_dict(self):
        return {
            "id": self.id,
            "caseId": self.caseId,
            "reporterId": self.reporterId,
            "reporterName": self.reporterName,
            "reporterPhone": self.reporterPhone,
            "reporterNID": self.reporterNID,
            "requestConfidentiality": self.requestConfidentiality,
            "crimeType": self.crimeType,
            "title": self.title,
            "description": self.description,
            "locationName": self.locationName,
            "district": self.district,
            "thana": self.thana,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "occurredAt": self.occurredAt,
            "submittedAt": self.submittedAt,
            "severity": self.severity,
            "status": self.status,
            "evidence": self.evidence,
            "verificationNotes": self.verificationNotes,
            "verifiedByOfficerId": self.verifiedByOfficerId,
            "assignedOfficerName": self.assignedOfficerName,
            "assignedOfficerBadge": self.assignedOfficerBadge,
            "assignedOfficerStation": self.assignedOfficerStation,
            "investigationUpdates": self.investigationUpdates,
        }


class EmergencyAlert(Base):
    __tablename__ = "emergency_alerts"

    id = Column(String(64), primary_key=True)
    alertCode = Column(String(64), nullable=False)
    emergencyType = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    affectedArea = Column(String(256), nullable=False)
    district = Column(String(64), nullable=False)
    latitude = Column(Float, nullable=False, default=23.8103)
    longitude = Column(Float, nullable=False, default=90.4125)
    radiusKm = Column(Float, nullable=False, default=5.0)
    severity = Column(String(32), nullable=False, default="HIGH")
    issuedByOfficerId = Column(String(64), nullable=False)
    issuedByOfficerName = Column(String(128), nullable=False)
    issuedByStation = Column(String(128), nullable=False)
    startTime = Column(String(64), default=utcnow_iso)
    expirationTime = Column(String(64), nullable=False)
    isActive = Column(Boolean, default=True)
    createdAt = Column(String(64), default=utcnow_iso)

    def to_dict(self):
        return {
            "id": self.id,
            "alertCode": self.alertCode,
            "emergencyType": self.emergencyType,
            "title": self.title,
            "message": self.message,
            "affectedArea": self.affectedArea,
            "district": self.district,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "radiusKm": self.radiusKm,
            "severity": self.severity,
            "issuedByOfficerId": self.issuedByOfficerId,
            "issuedByOfficerName": self.issuedByOfficerName,
            "issuedByStation": self.issuedByStation,
            "startTime": self.startTime,
            "expirationTime": self.expirationTime,
            "isActive": self.isActive,
            "createdAt": self.createdAt,
        }


class SOSRequest(Base):
    __tablename__ = "sos_requests"

    id = Column(String(64), primary_key=True)
    citizenId = Column(String(64), nullable=False, index=True)
    citizenName = Column(String(128), nullable=False)
    citizenPhone = Column(String(32), nullable=False)
    citizenNID = Column(String(32), nullable=False)
    locationName = Column(String(256), nullable=False)
    latitude = Column(Float, nullable=False, default=23.8103)
    longitude = Column(Float, nullable=False, default=90.4125)
    status = Column(String(32), nullable=False, default="SOS_SENT")
    createdAt = Column(String(64), default=utcnow_iso)
    respondedAt = Column(String(64), nullable=True)
    assignedUnit = Column(String(128), nullable=True)
    notes = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "citizenId": self.citizenId,
            "citizenName": self.citizenName,
            "citizenPhone": self.citizenPhone,
            "citizenNID": self.citizenNID,
            "locationName": self.locationName,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "status": self.status,
            "createdAt": self.createdAt,
            "respondedAt": self.respondedAt,
            "assignedUnit": self.assignedUnit,
            "notes": self.notes,
        }


class ConsumerComplaint(Base):
    __tablename__ = "consumer_complaints"

    id = Column(String(64), primary_key=True)
    trackingNumber = Column(String(64), nullable=False, index=True)
    complainantId = Column(String(64), nullable=False, index=True)
    complainantName = Column(String(128), nullable=False)
    complainantPhone = Column(String(32), nullable=False)
    shopName = Column(String(256), nullable=False)
    shopAddress = Column(String(256), nullable=False)
    shopDistrict = Column(String(64), nullable=False, index=True)
    shopThana = Column(String(64), nullable=False)
    tradeLicenseOrBIN = Column(String(64), nullable=True)
    productName = Column(String(256), nullable=False)
    brandName = Column(String(128), nullable=True)
    barcode = Column(String(64), nullable=True)
    batchNumber = Column(String(64), nullable=True)
    issueType = Column(String(64), nullable=False)
    pricePaid = Column(Float, nullable=True)
    mrp = Column(Float, nullable=True)
    description = Column(Text, nullable=False)
    submittedAt = Column(String(64), default=utcnow_iso)
    status = Column(String(32), nullable=False, default="SUBMITTED", index=True)
    evidenceJson = Column(Text, default="[]")
    inspectorNotes = Column(Text, nullable=True)
    penaltyImposed = Column(Text, nullable=True)
    assignedOfficerName = Column(String(128), nullable=True)
    timelineJson = Column(Text, default="[]")

    @property
    def evidence(self):
        try:
            return json.loads(self.evidenceJson or "[]")
        except Exception:
            return []

    @evidence.setter
    def evidence(self, val):
        self.evidenceJson = json.dumps(val if val is not None else [])

    @property
    def timeline(self):
        try:
            return json.loads(self.timelineJson or "[]")
        except Exception:
            return []

    @timeline.setter
    def timeline(self, val):
        self.timelineJson = json.dumps(val if val is not None else [])

    def to_dict(self):
        return {
            "id": self.id,
            "trackingNumber": self.trackingNumber,
            "complainantId": self.complainantId,
            "complainantName": self.complainantName,
            "complainantPhone": self.complainantPhone,
            "shopName": self.shopName,
            "shopAddress": self.shopAddress,
            "shopDistrict": self.shopDistrict,
            "shopThana": self.shopThana,
            "tradeLicenseOrBIN": self.tradeLicenseOrBIN,
            "productName": self.productName,
            "brandName": self.brandName,
            "barcode": self.barcode,
            "batchNumber": self.batchNumber,
            "issueType": self.issueType,
            "pricePaid": self.pricePaid,
            "mrp": self.mrp,
            "description": self.description,
            "submittedAt": self.submittedAt,
            "status": self.status,
            "evidence": self.evidence,
            "inspectorNotes": self.inspectorNotes,
            "penaltyImposed": self.penaltyImposed,
            "assignedOfficerName": self.assignedOfficerName,
            "timeline": self.timeline,
        }


class ShopReputation(Base):
    __tablename__ = "shops"

    id = Column(String(64), primary_key=True)
    shopName = Column(String(256), nullable=False)
    tradeLicenseOrBIN = Column(String(64), nullable=False, unique=True)
    address = Column(String(256), nullable=False)
    district = Column(String(64), nullable=False)
    thana = Column(String(64), nullable=False)
    category = Column(String(128), nullable=False)
    trustScore = Column(Float, default=4.5)
    totalComplaints = Column(Integer, default=0)
    resolvedComplaints = Column(Integer, default=0)
    verifiedFinesCount = Column(Integer, default=0)
    lastInspectedAt = Column(String(64), nullable=True)
    complianceStatus = Column(String(32), default="GOOD")

    def to_dict(self):
        return {
            "id": self.id,
            "shopName": self.shopName,
            "tradeLicenseOrBIN": self.tradeLicenseOrBIN,
            "address": self.address,
            "district": self.district,
            "thana": self.thana,
            "category": self.category,
            "trustScore": self.trustScore,
            "totalComplaints": self.totalComplaints,
            "resolvedComplaints": self.resolvedComplaints,
            "verifiedFinesCount": self.verifiedFinesCount,
            "lastInspectedAt": self.lastInspectedAt,
            "complianceStatus": self.complianceStatus,
        }


class BarcodeVerification(Base):
    __tablename__ = "barcode_registry"

    barcode = Column(String(64), primary_key=True)
    productName = Column(String(256), nullable=False)
    companyName = Column(String(256), nullable=False)
    bstiStandard = Column(String(128), nullable=False)
    mrp = Column(Float, nullable=False)
    isRegistered = Column(Boolean, default=True)
    status = Column(String(32), default="AUTHENTIC")

    def to_dict(self):
        return {
            "barcode": self.barcode,
            "productName": self.productName,
            "companyName": self.companyName,
            "bstiStandard": self.bstiStandard,
            "mrp": self.mrp,
            "isRegistered": self.isRegistered,
            "status": self.status,
        }


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True)
    timestamp = Column(String(64), default=utcnow_iso)
    userId = Column(String(64), nullable=False)
    userName = Column(String(128), nullable=False)
    userRole = Column(String(32), nullable=False)
    action = Column(String(128), nullable=False)
    resource = Column(String(256), nullable=False)
    resourceId = Column(String(64), nullable=True)
    ipAddress = Column(String(64), default="127.0.0.1")
    status = Column(String(32), default="SUCCESS")
    details = Column(Text, nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "userId": self.userId,
            "userName": self.userName,
            "userRole": self.userRole,
            "action": self.action,
            "resource": self.resource,
            "resourceId": self.resourceId,
            "ipAddress": self.ipAddress,
            "status": self.status,
            "details": self.details,
        }


class NotificationItem(Base):
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True)
    userId = Column(String(64), nullable=False, index=True)
    type = Column(String(64), nullable=False)
    title = Column(String(256), nullable=False)
    message = Column(Text, nullable=False)
    relatedId = Column(String(64), nullable=True)
    severity = Column(String(32), default="INFO")
    createdAt = Column(String(64), default=utcnow_iso)
    isRead = Column(Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "userId": self.userId,
            "type": self.type,
            "title": self.title,
            "message": self.message,
            "relatedId": self.relatedId,
            "severity": self.severity,
            "createdAt": self.createdAt,
            "isRead": self.isRead,
        }


class CaseMessage(Base):
    __tablename__ = "case_messages"

    id = Column(String(64), primary_key=True)
    caseId = Column(String(64), nullable=False, index=True)
    caseType = Column(String(32), nullable=False, default="CRIME")  # CRIME or CONSUMER
    senderId = Column(String(64), nullable=False, index=True)
    senderName = Column(String(128), nullable=False)
    senderRole = Column(String(32), nullable=False)
    senderBadge = Column(String(64), nullable=True)
    message = Column(Text, nullable=False)
    isOfficialNotice = Column(Boolean, default=False)
    timestamp = Column(String(64), default=utcnow_iso)

    def to_dict(self):
        return {
            "id": self.id,
            "caseId": self.caseId,
            "caseType": self.caseType,
            "senderId": self.senderId,
            "senderName": self.senderName,
            "senderRole": self.senderRole,
            "senderBadge": self.senderBadge,
            "message": self.message,
            "isOfficialNotice": self.isOfficialNotice,
            "timestamp": self.timestamp,
        }

