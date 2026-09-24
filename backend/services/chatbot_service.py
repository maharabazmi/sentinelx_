import os
import re
import json
import time
import urllib.request
import urllib.error
from typing import Dict, Any, List, Optional
from ..database import get_db
from ..models import (
    CrimeReport,
    ConsumerComplaint,
    BarcodeVerification,
    ShopReputation,
    EmergencyAlert,
    utcnow_iso,
)

# 4-Tier Gemini Model Cascade to prevent 503 High Demand / 429 Quota failures
GEMINI_MODEL_CASCADE = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
]

THANA_TO_DISTRICT = {
    "uttara": ("Dhaka", "Uttara"),
    "gulshan": ("Dhaka", "Gulshan"),
    "dhanmondi": ("Dhaka", "Dhanmondi"),
    "mirpur": ("Dhaka", "Mirpur"),
    "motijheel": ("Dhaka", "Motijheel"),
    "tejgaon": ("Dhaka", "Tejgaon"),
    "banani": ("Dhaka", "Banani"),
    "badda": ("Dhaka", "Badda"),
    "vatara": ("Dhaka", "Vatara"),
    "mohammadpur": ("Dhaka", "Mohammadpur"),
    "shahbagh": ("Dhaka", "Shahbagh"),
    "ramna": ("Dhaka", "Ramna"),
    "paltan": ("Dhaka", "Paltan"),
    "khilgaon": ("Dhaka", "Khilgaon"),
    "jatrabari": ("Dhaka", "Jatrabari"),
    "kotwali": ("Chattogram", "Kotwali"),
    "panchlaish": ("Chattogram", "Panchlaish"),
    "pahartali": ("Chattogram", "Pahartali"),
    "halishahar": ("Chattogram", "Halishahar"),
    "agrabad": ("Chattogram", "Double Mooring"),
    "sylhet": ("Sylhet", "Sylhet Kotwali"),
    "rajshahi": ("Rajshahi", "Boalia"),
    "khulna": ("Khulna", "Khulna Kotwali"),
}


class ChatbotService:
    """
    SentinelX Dual-Engine Action Copilot:
    - Tier 1..3: Multi-Model Gemini Cascade (handles 503 High Demand & 429 Rate Limits automatically)
    - Tier 4: Deterministic Local Legal RAG + Live SQLite Database Action Engine (0ms offline fallback)
    """

    @classmethod
    def process_message(cls, user, message: str, history: Optional[List[Dict[str, str]]] = None) -> Dict[str, Any]:
        clean_msg = (message or "").strip()
        if not clean_msg:
            return {
                "reply": "Hello! I am the **SentinelX AI Civic & Legal Copilot**. How can I assist you today?",
                "engine": "SentinelX Local NLU",
                "actions": [],
                "suggestions": [
                    "Track my latest case",
                    "Shop overcharged me above MRP",
                    "Verify barcode 8901030491024",
                    "How does the 25% DNCRP reward work?",
                ],
            }

        # 1. Gather Live SQLite Context for the logged-in citizen
        db_context = cls._gather_live_context(user, clean_msg)

        # 2. Extract deterministic UI Actions (Auto-fill forms, Case cards, Barcode cards, Reward calculator, SOS)
        actions = cls._extract_actions(user, clean_msg, db_context)

        # 3. Try Gemini Multi-Model Cascade if API key is configured
        gemini_reply, used_model = cls._try_gemini_cascade(user, clean_msg, history or [], db_context, actions)
        if gemini_reply:
            return {
                "reply": gemini_reply,
                "engine": f"Gemini Cascade ({used_model})",
                "actions": actions,
                "suggestions": cls._get_contextual_suggestions(clean_msg, actions),
            }

        # 4. Tier 4 Fallback: Deterministic Local Legal RAG + Live Database Engine
        local_reply = cls._generate_local_rag_reply(user, clean_msg, db_context, actions)
        return {
            "reply": local_reply,
            "engine": "SentinelX Hybrid Legal & DB Engine",
            "actions": actions,
            "suggestions": cls._get_contextual_suggestions(clean_msg, actions),
        }

    @classmethod
    def _gather_live_context(cls, user, message: str) -> Dict[str, Any]:
        now_iso = utcnow_iso()
        msg_lower = message.lower()
        with get_db() as db:
            my_reports = (
                db.query(CrimeReport)
                .filter(CrimeReport.reporterId == user.id)
                .order_by(CrimeReport.submittedAt.desc())
                .limit(5)
                .all()
            )
            my_complaints = (
                db.query(ConsumerComplaint)
                .filter(ConsumerComplaint.complainantId == user.id)
                .order_by(ConsumerComplaint.submittedAt.desc())
                .limit(5)
                .all()
            )
            active_alerts = (
                db.query(EmergencyAlert)
                .filter(EmergencyAlert.isActive == True, EmergencyAlert.expirationTime > now_iso)
                .order_by(EmergencyAlert.createdAt.desc())
                .limit(3)
                .all()
            )

            # Check if message mentions a specific tracking/case number
            matched_report = None
            matched_complaint = None
            code_match = re.search(r"\b(CR-[A-Z0-9-]+|GD-[A-Z0-9-]+|DNCRP-[A-Z0-9-]+)\b", message, re.IGNORECASE)
            if code_match:
                code = code_match.group(1).upper()
                if code.startswith("DNCRP-"):
                    matched_complaint = (
                        db.query(ConsumerComplaint)
                        .filter(ConsumerComplaint.trackingNumber.ilike(code))
                        .first()
                    )
                else:
                    matched_report = (
                        db.query(CrimeReport)
                        .filter(CrimeReport.caseId.ilike(code))
                        .first()
                    )

            # Check if message mentions a 10-14 digit barcode
            matched_barcode = None
            queried_barcode_str = None
            barcode_match = re.search(r"\b(\d{10,14})\b", message)
            if barcode_match:
                queried_barcode_str = barcode_match.group(1)
                matched_barcode = (
                    db.query(BarcodeVerification)
                    .filter(BarcodeVerification.barcode == queried_barcode_str)
                    .first()
                )

            # Check if message mentions any registered shop name
            matched_shop = None
            all_shops = db.query(ShopReputation).all()
            for s in all_shops:
                if s.shopName.lower() in msg_lower or any(
                    word in msg_lower for word in s.shopName.lower().split() if len(word) >= 5 and word not in ("store", "super", "shop", "market", "bazaar")
                ):
                    matched_shop = s
                    break

            return {
                "my_reports": [r.to_dict() for r in my_reports],
                "my_complaints": [c.to_dict() for c in my_complaints],
                "active_alerts": [a.to_dict() for a in active_alerts],
                "matched_report": matched_report.to_dict() if matched_report else None,
                "matched_complaint": matched_complaint.to_dict() if matched_complaint else None,
                "matched_barcode": matched_barcode.to_dict() if matched_barcode else None,
                "queried_barcode_str": queried_barcode_str,
                "matched_shop": matched_shop.to_dict() if matched_shop else None,
            }

    @classmethod
    def _extract_actions(cls, user, message: str, db_context: Dict[str, Any]) -> List[Dict[str, Any]]:
        actions: List[Dict[str, Any]] = []
        msg_lower = message.lower()

        # 1. Emergency SOS Detection
        emergency_keywords = ("robbery happening", "attacking", "kidnap", "gun", "fire hazard", "help me now", "emergency sos", "life in danger", "বাচান", "আক্রমণ", "ডাকাতি হচ্ছে")
        if any(k in msg_lower for k in emergency_keywords):
            actions.append({
                "type": "EMERGENCY_SOS_CARD",
                "title": "Immediate Threat Detected — Dispatch SOS",
                "description": "Click below to open the Emergency SOS Beacon and transmit your live GPS coordinates to the nearest Police Station immediately.",
                "activeAlerts": db_context.get("active_alerts", [])[:2],
            })

        # 2. Specific or Latest Case Tracking Card
        if db_context.get("matched_complaint"):
            c = db_context["matched_complaint"]
            actions.append({
                "type": "CASE_STATUS_CARD",
                "caseType": "CONSUMER",
                "id": c["id"],
                "trackingNumber": c["trackingNumber"],
                "title": f"{c['shopName']} — {c['productName']}",
                "status": c["status"],
                "workflowQueue": c.get("workflowQueue") or "INTAKE",
                "assignedOfficer": c.get("assignedOfficerName") or "Awaiting Officer Assignment",
                "latestNote": (c.get("timeline") or [{}])[-1].get("note", "Registered in DNCRP queue."),
            })
        elif db_context.get("matched_report"):
            r = db_context["matched_report"]
            actions.append({
                "type": "CASE_STATUS_CARD",
                "caseType": "CRIME",
                "id": r["id"],
                "trackingNumber": r["caseId"],
                "title": r["title"],
                "status": r["status"],
                "workflowQueue": r.get("workflowQueue") or "INTAKE",
                "assignedOfficer": r.get("assignedOfficerName") or r.get("assignedStation") or "Thana Duty Officer",
                "latestNote": (r.get("timeline") or [{}])[-1].get("note", "Logged in Police GD registry."),
            })
        elif any(k in msg_lower for k in ("track", "status", "my case", "my complaint", "my report", "latest case", "দরখাস্ত", "মামলার অবস্থা", "আপডেট")):
            for c in db_context.get("my_complaints", [])[:2]:
                actions.append({
                    "type": "CASE_STATUS_CARD",
                    "caseType": "CONSUMER",
                    "id": c["id"],
                    "trackingNumber": c["trackingNumber"],
                    "title": f"{c['shopName']} — {c['productName']}",
                    "status": c["status"],
                    "workflowQueue": c.get("workflowQueue") or "INTAKE",
                    "assignedOfficer": c.get("assignedOfficerName") or "DNCRP Intake Cell",
                    "latestNote": (c.get("timeline") or [{}])[-1].get("note", "In review."),
                })
            for r in db_context.get("my_reports", [])[:2]:
                actions.append({
                    "type": "CASE_STATUS_CARD",
                    "caseType": "CRIME",
                    "id": r["id"],
                    "trackingNumber": r["caseId"],
                    "title": r["title"],
                    "status": r["status"],
                    "workflowQueue": r.get("workflowQueue") or "INTAKE",
                    "assignedOfficer": r.get("assignedOfficerName") or r.get("assignedStation") or "Police Command",
                    "latestNote": (r.get("timeline") or [{}])[-1].get("note", "In review."),
                })

        # 3. Barcode Lookup Card
        if db_context.get("queried_barcode_str"):
            product = db_context.get("matched_barcode")
            actions.append({
                "type": "BARCODE_VERIFICATION_CARD",
                "barcode": db_context["queried_barcode_str"],
                "found": bool(product),
                "product": product,
            })

        # 4. Price / Overcharge & 25% DNCRP Reward Calculator + Auto-Fill Consumer Complaint
        numbers = [float(n.replace(",", "")) for n in re.findall(r"\b(\d{2,6}(?:,\d{3})*(?:\.\d+)?)\b", message) if not (len(n) >= 10)]
        consumer_keywords = (
            "mrp", "overcharge", "price", "expired", "adulterat", "fake", "counterfeit",
            "weight", "short weight", "shop", "store", "pharmacy", "superstore", "dncrp",
            "reward", "25%", "fine", "দাম", "মেয়াদ", "ভেজাল", "ওজন", "দোকান"
        )
        crime_keywords = (
            "theft", "stolen", "robbery", "mugged", "snatch", "extortion", "harass",
            "assault", "cyber", "scam", "fraud", "hacked", "bkash", "nagad", "threat",
            "চুরি", "ছিনতাই", "হুমকি", "প্রতারণা"
        )

        # Detect district/thana from text
        detected_district, detected_thana = "Dhaka", "Gulshan"
        for kw, (dist, th) in THANA_TO_DISTRICT.items():
            if kw in msg_lower:
                detected_district, detected_thana = dist, th
                break

        if any(k in msg_lower for k in consumer_keywords):
            mrp_val = 0.0
            paid_val = 0.0
            if len(numbers) >= 2:
                sorted_nums = sorted(numbers[:2])
                mrp_val, paid_val = sorted_nums[0], sorted_nums[1]
            elif len(numbers) == 1:
                paid_val = numbers[0]
                mrp_val = round(paid_val * 0.8, 2)

            issue_type = "PRICE_GOUGING"
            if any(w in msg_lower for w in ("expir", "date", "medicine", "মেয়াদ")):
                issue_type = "EXPIRED_GOODS"
            elif any(w in msg_lower for w in ("weight", "gram", "kg", "liter", "scale", "ওজন")):
                issue_type = "WEIGHT_MEASUREMENT_FRAUD"
            elif any(w in msg_lower for w in ("fake", "counterfeit", "duplicate", "নকল")):
                issue_type = "COUNTERFEIT_PRODUCT"
            elif any(w in msg_lower for w in ("adulterat", "chemical", "hygiene", "rotten", "ভেজাল")):
                issue_type = "ADULTERATION"

            shop_name = db_context["matched_shop"]["shopName"] if db_context.get("matched_shop") else "Reported Merchant Store"
            shop_match = re.search(r"(?:at|from|shop|store)\s+([A-Z][A-Za-z0-9\s&-]{2,30})", message)
            if shop_match and not db_context.get("matched_shop"):
                shop_name = shop_match.group(1).strip()

            if mrp_val > 0 and paid_val > mrp_val:
                est_fine = 50000.0 if (paid_val - mrp_val) >= 200 else 20000.0
                actions.append({
                    "type": "REWARD_CALCULATOR_CARD",
                    "mrp": mrp_val,
                    "pricePaid": paid_val,
                    "overcharge": round(paid_val - mrp_val, 2),
                    "estimatedFine": est_fine,
                    "statutoryReward25": round(est_fine * 0.25, 2),
                    "lawSection": "Section 40 & Section 76(4) of DNCRP Act 2009",
                })

            if any(w in msg_lower for w in ("overcharge", "charged", "bought", "sold", "expired", "fake", "weight", "report", "complain", "file", "দাম", "নকল", "মেয়াদ")) or len(numbers) >= 2:
                actions.append({
                    "type": "PREFILL_CONSUMER_COMPLAINT",
                    "payload": {
                        "shopName": shop_name,
                        "shopDistrict": detected_district,
                        "shopThana": detected_thana,
                        "shopAddress": f"{detected_thana}, {detected_district}",
                        "productName": "Consumer Retail Product",
                        "issueType": issue_type,
                        "mrp": str(int(mrp_val)) if mrp_val else "1850",
                        "pricePaid": str(int(paid_val)) if paid_val else "2450",
                        "description": message,
                    },
                })

        elif any(k in msg_lower for k in crime_keywords):
            crime_type = "THEFT_ROBBERY"
            severity = "MEDIUM"
            if any(w in msg_lower for w in ("cyber", "scam", "fraud", "bkash", "nagad", "hack", "phish", "প্রতারণা")):
                crime_type = "FRAUD_SCAM"
            elif any(w in msg_lower for w in ("extort", "ransom", "চাঁদাবাজি")):
                crime_type = "EXTORTION"
                severity = "HIGH"
            elif any(w in msg_lower for w in ("assault", "attack", "beat", "weapon", "মারধর")):
                crime_type = "ASSAULT"
                severity = "HIGH"
            elif any(w in msg_lower for w in ("harass", "stalk", "threat", "হুমকি")):
                crime_type = "HARASSMENT"

            actions.append({
                "type": "PREFILL_CRIME_REPORT",
                "payload": {
                    "crimeType": crime_type,
                    "severity": severity,
                    "district": detected_district,
                    "thana": detected_thana,
                    "locationName": f"{detected_thana}, {detected_district}",
                    "title": f"Reported {crime_type.replace('_', ' ').title()} Incident in {detected_thana}",
                    "description": message,
                },
            })

        return actions

    @classmethod
    def _try_gemini_cascade(
        cls,
        user,
        message: str,
        history: List[Dict[str, str]],
        db_context: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ):
        """
        Attempts Gemini models in priority order:
        gemini-2.5-flash -> gemini-2.0-flash -> gemini-2.0-flash-lite -> gemini-1.5-flash
        Automatically catches 503 (High Demand / Overloaded) and 429 (Quota) and cascades immediately.
        """
        api_keys = [
            k.strip()
            for k in [os.getenv("GEMINI_API_KEY"), os.getenv("GEMINI_API_KEY_BACKUP")]
            if k and k.strip()
        ]
        if not api_keys:
            return None, None

        system_prompt = (
            f"You are SentinelX AI Civic & Legal Copilot assisting citizen {user.fullName} in Bangladesh.\n"
            "Keep responses concise (3-6 bullet points or 2 short paragraphs), empathetic, and legally accurate.\n"
            "Key Bangladesh Law Facts:\n"
            "- DNCRP Act 2009 Section 40: Selling above MRP carries up to BDT 50,000 fine or 1 year imprisonment.\n"
            "- DNCRP Act 2009 Section 41/51: Adulterated or expired goods carry up to BDT 2,00,000 fine.\n"
            "- DNCRP Act 2009 Section 76(4): Citizens receive 25% of the collected administrative fine as a statutory reward.\n"
            "- Filing deadline: Must file within 30 days of the cause of action with a valid purchase receipt/cash memo.\n"
            "- Criminal incidents (Theft, Robbery, Cyber Fraud, Extortion, Assault) go to the Police GD/Crime Docket.\n"
            f"Citizen's Active Consumer Complaints: {json.dumps(db_context.get('my_complaints', [])[:3])}\n"
            f"Citizen's Active Police Reports: {json.dumps(db_context.get('my_reports', [])[:3])}\n"
            f"Matched Barcode Registry: {json.dumps(db_context.get('matched_barcode'))}\n"
            f"Matched Shop Trust Profile: {json.dumps(db_context.get('matched_shop'))}\n"
            "If an interactive Action Card is already attached below your message (such as Auto-Fill Form or Case Status Card), "
            "mention that the user can click the interactive card below to proceed in 1 click."
        )

        contents = []
        for turn in history[-6:]:
            role = "user" if turn.get("sender") == "user" else "model"
            text = turn.get("text", "")
            if text:
                contents.append({"role": role, "parts": [{"text": text}]})
        contents.append({"role": "user", "parts": [{"text": message}]})

        payload = {
            "system_instruction": {"parts": [{"text": system_prompt}]},
            "contents": contents,
            "generationConfig": {"temperature": 0.35, "maxOutputTokens": 450},
        }
        body_bytes = json.dumps(payload).encode("utf-8")

        for api_key in api_keys:
            for model_name in GEMINI_MODEL_CASCADE:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={api_key}"
                req = urllib.request.Request(
                    url,
                    data=body_bytes,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                try:
                    with urllib.request.urlopen(req, timeout=4.5) as resp:
                        resp_data = json.loads(resp.read().decode("utf-8"))
                        candidates = resp_data.get("candidates") or []
                        if candidates:
                            parts = candidates[0].get("content", {}).get("parts") or []
                            text_out = "".join(p.get("text", "") for p in parts).strip()
                            if text_out:
                                return text_out, model_name
                except urllib.error.HTTPError as http_err:
                    # 503 (High Demand/Overloaded) or 429 (Rate Limit): brief jitter and cascade to next model
                    if http_err.code in (429, 500, 503):
                        time.sleep(0.25)
                        continue
                    continue
                except Exception:
                    continue

        return None, None

    @classmethod
    def _generate_local_rag_reply(
        cls,
        user,
        message: str,
        db_context: Dict[str, Any],
        actions: List[Dict[str, Any]],
    ) -> str:
        msg_lower = message.lower()
        action_types = {a["type"] for a in actions}

        if "EMERGENCY_SOS_CARD" in action_types:
            return (
                "**URGENT SAFETY PROTOCOL ACTIVATED**\n\n"
                "I detected an active emergency or threat in your message. Please use the **1-Click Emergency SOS Dispatch Card** below to transmit your GPS location to the nearest Police Command immediately, or call **999**."
            )

        if "BARCODE_VERIFICATION_CARD" in action_types:
            bc_action = next(a for a in actions if a["type"] == "BARCODE_VERIFICATION_CARD")
            if bc_action["found"]:
                p = bc_action["product"]
                status_label = "✅ BSTI AUTHENTIC" if p["status"] == "AUTHENTIC" else "⚠️ FLAGGED COUNTERFEIT"
                return (
                    f"**BSTI Registry Lookup Complete for `{p['barcode']}`**\n\n"
                    f"- **Product**: {p['productName']} ({p['companyName']})\n"
                    f"- **BSTI Certification**: `{p['bstiStandard']}` — **{status_label}**\n"
                    f"- **Official Government MRP**: **৳{p['mrp']}**\n\n"
                    "If a merchant charged you more than **৳"
                    f"{p['mrp']}** or sold a tampered batch, you can file a DNCRP complaint in 1 click."
                )
            else:
                return (
                    f"⚠️ **Barcode `{bc_action['barcode']}` Not Found in BSTI Registry**\n\n"
                    "This barcode is not registered in the verified BSTI product catalog. Exercise caution and keep your purchase cash memo if you suspect a counterfeit product under **Section 50 of the DNCRP Act 2009**."
                )

        if "CASE_STATUS_CARD" in action_types:
            cards = [a for a in actions if a["type"] == "CASE_STATUS_CARD"]
            lines = [f"Here is the live status of your **{len(cards)} active docket(s)** from the SentinelX database:"]
            for c in cards:
                lines.append(
                    f"- **`{c['trackingNumber']}`** ({c['title']}): Status **`{c['status']}`** in **`{c['workflowQueue']}`** queue • Assigned to **{c['assignedOfficer']}**"
                )
            lines.append("\nYou can click **Open Officer Chat** on any card below to message the assigned authority directly.")
            return "\n".join(lines)

        if "REWARD_CALCULATOR_CARD" in action_types or "PREFILL_CONSUMER_COMPLAINT" in action_types:
            reward_card = next((a for a in actions if a["type"] == "REWARD_CALCULATOR_CARD"), None)
            if reward_card:
                return (
                    f"**DNCRP Legal Assessment & 25% Statutory Reward Calculation**\n\n"
                    f"- **Violation Identified**: Selling above printed MRP (**+৳{reward_card['overcharge']} overcharge**) violates **Section 40 of the Consumer Rights Protection Act 2009**.\n"
                    f"- **Statutory Penalty**: Up to **৳50,000 administrative fine** (or up to 1 year imprisonment).\n"
                    f"- **Your 25% Citizen Reward (Section 76(4))**: Upon fine realization (est. ৳{int(reward_card['estimatedFine']):,}), you are legally entitled to **৳{int(reward_card['statutoryReward25']):,}**.\n"
                    f"- **Mandatory Checklist**: File within **30 days** and attach a photo of the **Cash Memo / Receipt** and the **MRP label**.\n\n"
                    "Click **Auto-Fill DNCRP Complaint Form** below to load all extracted details directly into the filing form!"
                )
            return (
                "**Consumer Rights Violation Detected (DNCRP Act 2009)**\n\n"
                "- **Jurisdiction**: Directorate of National Consumer Rights Protection (**DNCRP**).\n"
                "- **Citizen Entitlement**: Under **Section 76(4)**, complainants receive **25% of the administrative fine** imposed by the Mobile Court / Adjudication Officer.\n"
                "- **Evidence Required**: Attach your purchase receipt/cash memo and product photo so the Complaint Intake Officer approves your claim immediately.\n\n"
                "Click the **1-Click Auto-Fill DNCRP Form** button below to open the pre-populated complaint form."
            )

        if "PREFILL_CRIME_REPORT" in action_types:
            return (
                "**Police Criminal / GD Jurisdiction Identified**\n\n"
                "- **Routing**: This incident falls under **Bangladesh Police Thana Command** (`Crime / GD Docket`).\n"
                "- **Workflow**: Your report is routed to the Thana Duty / Intake Officer $\\rightarrow$ Field Investigation Officer $\\rightarrow$ Case Resolution, with encrypted two-way chat.\n"
                "- **Identity Protection**: You can enable **Confidential / Anonymous Shield** on Step 3 of the form.\n\n"
                "Click **Auto-Fill Police Crime Report** below to pre-populate the form with your incident details."
            )

        if any(k in msg_lower for k in ("reward", "25%", "section 76", "fine", "compensation", "পুরস্কার")):
            return (
                "**How the 25% DNCRP Citizen Reward Works (Section 76(4) of DNCRP Act 2009)**\n\n"
                "1. **File Within 30 Days**: Submit your complaint on SentinelX within 30 days of the purchase with a receipt/cash memo.\n"
                "2. **3-Stage Verification**:\n"
                "   - **Complaint Intake Officer**: Verifies your receipt and hands over to Investigation.\n"
                "   - **Investigation Officer**: Conducts a physical market/shop inspection and submits an Investigation Summary.\n"
                "   - **Adjudication Officer**: Conducts the hearing and imposes an administrative fine (e.g., ৳20,000–৳50,000).\n"
                "3. **Automatic 25% Disbursement**: Under **Section 76(4)**, **25% of the collected fine** is awarded directly to you and recorded on your official DNCRP Docket."
            )

        return (
            f"Hello **{user.fullName}**! I am your **SentinelX Dual-Engine Civic & Legal Copilot**.\n\n"
            "Here is what I can do for you right now:\n"
            "- **Auto-Fill Forms from Natural Text**: Tell me what happened (e.g., *\"A shop in Uttara charged me 2450 BDT for 1850 BDT milk\"* or *\"My phone was stolen in Dhanmondi\"*) and I will auto-fill the **DNCRP** or **Police GD** form in 1 click.\n"
            "- **Track Live Dockets**: Ask *\"What is the status of my latest case?\"* or paste any `DNCRP-...` / `CR-...` tracking ID.\n"
            "- **Verify Barcodes & Calculate 25% Rewards**: Paste any 13-digit barcode (like `8901030491024`) or ask about your **25% statutory reward under Section 76(4)**."
        )

    @classmethod
    def _get_contextual_suggestions(cls, message: str, actions: List[Dict[str, Any]]) -> List[str]:
        action_types = {a["type"] for a in actions}
        if "PREFILL_CONSUMER_COMPLAINT" in action_types:
            return [
                "How does the 25% DNCRP reward work?",
                "Verify barcode 8901030491024",
                "Track my latest case",
            ]
        if "CASE_STATUS_CARD" in action_types:
            return [
                "Shop in Uttara charged 2450 BDT for 1850 BDT baby milk",
                "Verify barcode 8901030491024",
                "How does the 25% DNCRP reward work?",
            ]
        return [
            "Track my latest case",
            "Shop in Uttara charged 2450 BDT for 1850 BDT baby milk",
            "Verify barcode 8901030491024",
            "How does the 25% DNCRP reward work?",
        ]
