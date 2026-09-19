import os
import sys
import json
import base64
import zlib
import urllib.request

ERD_MERMAID = """erDiagram
    User ||--o{ CrimeReport : "lodges"
    User ||--o{ CrimeReport : "assigned_investigator"
    User ||--o{ ConsumerComplaint : "lodges"
    User ||--o{ SOSRequest : "triggers"
    User ||--o{ CaseMessage : "sends"
    User ||--o{ AuditLog : "initiates"
    User ||--o{ NotificationItem : "receives"

    ShopReputation ||--o{ ConsumerComplaint : "subject_of"
    BarcodeVerification ||--o{ ConsumerComplaint : "cross_referenced_by"

    User {
        string id PK
        string nidNumber UK
        string fullName
        string email UK
        string phone
        string role
        string badgeNumber
        string designation
        string department
        string stationOrThana
        boolean isNIDVerified
        string passwordHash
        string createdAt
    }

    CrimeReport {
        string id PK
        string caseId UK
        string reporterId FK
        string reporterName
        string reporterPhone
        string reporterNID
        boolean requestConfidentiality
        string crimeType
        string title
        text description
        string locationName
        string district
        string thana
        float latitude
        float longitude
        string severity
        string status
        text evidenceJson
        string assignedOfficerId FK
        string assignedOfficerName
        string assignedOfficerBadge
        string assignedOfficerStation
        text investigationUpdatesJson
        string occurredAt
        string submittedAt
    }

    ConsumerComplaint {
        string id PK
        string trackingNumber UK
        string complainantId FK
        string complainantName
        string shopName
        string shopAddress
        string shopDistrict
        string shopThana
        string tradeLicenseOrBIN FK
        string productName
        string barcode FK
        string issueType
        float pricePaid
        float mrp
        text description
        string status
        text penaltyImposed
        text evidenceJson
        string hearingDate
        string submittedAt
    }

    ShopReputation {
        string id PK
        string shopName
        string tradeLicenseOrBIN UK
        string district
        string thana
        float trustScore
        int totalComplaints
        int resolvedComplaints
        int verifiedFinesCount
        string complianceStatus
        string lastAuditedAt
    }

    SOSRequest {
        string id PK
        string citizenId FK
        string citizenName
        string citizenPhone
        string locationName
        float latitude
        float longitude
        string status
        string assignedUnit
        string notes
        string createdAt
        string respondedAt
    }

    EmergencyAlert {
        string id PK
        string alertCode UK
        string emergencyType
        string title
        text message
        string affectedArea
        string district
        float radiusKm
        string severity
        string expirationTime
        boolean isActive
        string issuedAt
    }

    BarcodeVerification {
        string barcode PK
        string productName
        string companyName
        string bstiStandard
        float mrp
        boolean isRegistered
        string status
        string category
    }

    CaseMessage {
        string id PK
        string caseId
        string caseType
        string senderId FK
        string senderName
        string senderRole
        string senderBadge
        text message
        boolean isOfficialNotice
        string timestamp
    }

    AuditLog {
        string id PK
        string timestamp
        string userId FK
        string userName
        string userRole
        string action
        string resource
        string ipAddress
        string status
        text details
    }

    NotificationItem {
        string id PK
        string userId FK
        string type
        string title
        text message
        string relatedId
        boolean isRead
        string createdAt
    }
"""

SYSTEM_ARCHITECTURE_MERMAID = """flowchart TB
    subgraph ClientLayer["Frontend Client (React 19 + TypeScript + Vite 6 + Tailwind CSS)"]
        UI_Landing["Public Civic Portal<br/>(Landing, Emergency Tickers, Verification)"]
        UI_Citizen["Citizen Dashboard<br/>(Crime Lodging, GD Docket, SOS, DNCRP Disputes)"]
        UI_Police["Police Command Console<br/>(Station Case Management, Thana Heatmap, Dispatch)"]
        UI_DNCRP["Consumer Affairs (DNCRP)<br/>(Merchant Surveillance, Fines, 25% Rewards)"]
        UI_Admin["Admin HQ Governance<br/>(AI Simulation, Security Audit, User Provisioning)"]
    end

    subgraph GatewayLayer["API Gateway & Middleware Layer (Flask 3)"]
        AuthMid["JWT Authentication & RBAC Guard"]
        AuditMid["Tamper-Evident System Audit Logger"]
    end

    subgraph ServiceLayer["Core Domain Services"]
        NIDService["Porichoy National ID Verification Service"]
        JurisdictionService["Rational Multi-Criteria Dispatch Engine"]
        AISimService["AI Crime Risk Simulation & Predictive Modeling"]
        NotifService["Multi-Channel Case Notification Engine"]
    end

    subgraph DataLayer["Resilient Data Persistence Engine"]
        PG[("PostgreSQL Primary Engine")]
        SQLite[("SQLite Development Fallback Engine")]
        DualEngine{"Dual-Engine Auto-Fallback Controller"}
    end

    ClientLayer --> GatewayLayer
    GatewayLayer --> ServiceLayer
    ServiceLayer --> DualEngine
    DualEngine --> PG
    DualEngine --> SQLite
"""

def pako_deflate_base64(data_str: str) -> str:
    """Compress string using deflate and encode as url-safe base64 (mermaid.ink pako format)."""
    compressor = zlib.compressobj(9, zlib.DEFLATED, 15, 8, zlib.Z_DEFAULT_STRATEGY)
    deflated = compressor.compress(data_str.encode('utf-8')) + compressor.flush()
    return base64.urlsafe_b64encode(deflated).decode('ascii')

def download_mermaid(mermaid_text: str, output_base: str, title: str):
    print(f"Downloading {title}...")
    # Plain base64
    b64_plain = base64.b64encode(mermaid_text.encode('utf-8')).decode('ascii')
    
    # Try pako format as well
    payload = json.dumps({"code": mermaid_text, "mermaid": {"theme": "default"}})
    pako_b64 = pako_deflate_base64(payload)
    
    urls = [
        ("svg", f"https://mermaid.ink/svg/pako:{pako_b64}"),
        ("svg", f"https://mermaid.ink/svg/{b64_plain}"),
        ("png", f"https://mermaid.ink/img/pako:{pako_b64}"),
        ("png", f"https://mermaid.ink/img/{b64_plain}"),
    ]
    
    # Download SVG
    svg_success = False
    for fmt, url in urls[:2]:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status == 200:
                    content = resp.read()
                    svg_file = f"{output_base}.svg"
                    with open(svg_file, "wb") as f:
                        f.write(content)
                    print(f"  -> Successfully generated {svg_file} ({len(content)} bytes)")
                    svg_success = True
                    break
        except Exception as e:
            print(f"  [Attempt failed: {e}]")
            
    # Download PNG
    png_success = False
    for fmt, url in urls[2:]:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
            with urllib.request.urlopen(req, timeout=20) as resp:
                if resp.status == 200:
                    content = resp.read()
                    png_file = f"{output_base}.png"
                    with open(png_file, "wb") as f:
                        f.write(content)
                    print(f"  -> Successfully generated {png_file} ({len(content)} bytes)")
                    png_success = True
                    break
        except Exception as e:
            print(f"  [Attempt failed: {e}]")

def main():
    os.makedirs("docs", exist_ok=True)
    download_mermaid(ERD_MERMAID, "docs/sentinelx_erd", "SentinelX Entity-Relationship Diagram (ERD)")
    download_mermaid(SYSTEM_ARCHITECTURE_MERMAID, "docs/sentinelx_architecture", "SentinelX High-Level System Architecture")

if __name__ == "__main__":
    main()
