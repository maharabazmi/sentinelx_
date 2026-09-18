import random
import time
import re
from datetime import datetime, timezone
from ..models import (
    User,
    CrimeReport,
    OperationalDirective,
    NotificationItem,
    AuditLog,
    utcnow_iso
)
from ..services.audit_service import AuditService
from ..services.notification_service import NotificationService

THANA_COORDINATES = {
    "gulshan": (23.7925, 90.4078),
    "banani": (23.7937, 90.4043),
    "mirpur": (23.8223, 90.3654),
    "dhanmondi": (23.7461, 90.3742),
    "motijheel": (23.7330, 90.4172),
    "uttara": (23.8759, 90.3795),
    "mohammadpur": (23.7658, 90.3584),
    "paltan": (23.7358, 90.4125),
    "chawkbazar": (23.7174, 90.3957),
    "badda": (23.7805, 90.4267),
    "ramna": (23.7410, 90.4030),
    "tejgaon": (23.7598, 90.3912),
    "agrabad": (22.3275, 91.8123),
    "kotwali": (22.3384, 91.8385),
    "panchlaish": (22.3686, 91.8290),
    "halishahar": (22.3167, 91.7833),
    "pahartali": (22.3556, 91.7833),
    "zindabazar": (24.8967, 91.8687),
    "bandarbazar": (24.8917, 91.8710),
    "boalia": (24.3685, 88.6042),
    "motihar": (24.3639, 88.6283),
    "khulna sadar": (22.8157, 89.5681),
    "sonadanga": (22.8256, 89.5467),
    "fulbaria": (24.6333, 90.2667),
    "cox's bazar sadar": (21.4272, 92.0058),
}

DISTRICT_FALLBACK_COORDINATES = {
    "dhaka": (23.8103, 90.4125),
    "chattogram": (22.3569, 91.7832),
    "sylhet": (24.8949, 91.8687),
    "rajshahi": (24.3745, 88.6042),
    "khulna": (22.8456, 89.5403),
    "barishal": (22.7010, 90.3535),
    "rangpur": (25.7439, 89.2752),
    "mymensingh": (24.7471, 90.4203),
}

class DemonstrationAIPredictionService:
    BASE_PREDICTIONS = [
        {
            "id": "PRED-DHK-GUL-001",
            "targetDistrict": "Dhaka",
            "targetThana": "Gulshan & Banani",
            "predictedRiskLevel": "HIGH",
            "confidenceScore": 84.6,
            "primaryRiskCrimeType": "FRAUD_SCAM",
            "riskProbability": 0.78,
            "timeWindow": "20:00 - 02:00 (Evening / Night)",
            "temporalFactors": {
                "dayOfWeek": "Thursday & Friday",
                "timeOfDay": "Late Evening",
                "holidayOrFestival": "Upcoming Weekend Surge",
                "weatherCondition": "Clear Night",
                "trafficDensity": "HEAVY",
                "commercialActivity": "HIGH",
            },
            "keyContributingIndicators": [
                "Concentration of high-value commercial transactions & ATM clusters along Gulshan Ave",
                "Historical 34% spike in cyber financial scams during weekend retail peaks",
                "High density of international diplomatic and hospitality venues",
            ],
            "recommendedPatrolStrategy": "Deploy 4 mobile cyber-patrol vans and coordinate with bank security officers around Kemal Ataturk Ave.",
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        },
        {
            "id": "PRED-DHK-MIR-002",
            "targetDistrict": "Dhaka",
            "targetThana": "Mirpur (Section 1 & 10)",
            "predictedRiskLevel": "EXTREME",
            "confidenceScore": 91.2,
            "primaryRiskCrimeType": "THEFT_ROBBERY",
            "riskProbability": 0.89,
            "timeWindow": "18:00 - 23:00 (Rush Hour)",
            "temporalFactors": {
                "dayOfWeek": "Sunday to Wednesday",
                "timeOfDay": "Evening Commute",
                "weatherCondition": "Light Rain / Monsoon overcast",
                "trafficDensity": "HEAVY",
                "commercialActivity": "HIGH",
            },
            "keyContributingIndicators": [
                "High pedestrian footfall around Mirpur 10 roundabout and metro stations",
                "Alleyways with inadequate street lighting near commercial shopping zones",
                "Historical clustering of pickpocketing and mobile snatching incidents",
            ],
            "recommendedPatrolStrategy": "Station undercover anti-snatching squads at Metro station exits and deploy motorcycle rapid response units.",
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        },
        {
            "id": "PRED-CTG-AGR-003",
            "targetDistrict": "Chattogram",
            "targetThana": "Agrabad Commercial Area",
            "predictedRiskLevel": "MEDIUM",
            "confidenceScore": 76.4,
            "primaryRiskCrimeType": "EXTORTION",
            "riskProbability": 0.54,
            "timeWindow": "11:00 - 17:00 (Banking Hours)",
            "temporalFactors": {
                "dayOfWeek": "Monday & Tuesday",
                "timeOfDay": "Afternoon",
                "holidayOrFestival": "Month-end corporate clearing",
                "weatherCondition": "Humid / Coastal",
                "trafficDensity": "MODERATE",
                "commercialActivity": "HIGH",
            },
            "keyContributingIndicators": [
                "Import-export container freight clearing office proximity",
                "Previous extortion reports targeting local logistics brokerage agencies",
                "Large physical cash handling outside banking hours",
            ],
            "recommendedPatrolStrategy": "Visible patrol car stationed near Badamtali intersection with CCTV live monitoring linked to CMP Command.",
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        },
    ]

    def get_coordinates_for_thana(self, thana: str, district: str, db=None) -> tuple:
        clean_thana = (thana or "").lower().strip()
        for kw, coords in THANA_COORDINATES.items():
            if kw in clean_thana or clean_thana in kw:
                return coords

        if db:
            # Check if any crime in this thana has coordinates
            report = db.query(CrimeReport).filter(
                CrimeReport.thana.ilike(f"%{thana}%"),
                CrimeReport.latitude.isnot(None),
                CrimeReport.longitude.isnot(None)
            ).first()
            if report and report.latitude and report.longitude:
                return (report.latitude, report.longitude)

        clean_dist = (district or "").lower().strip()
        for dkw, coords in DISTRICT_FALLBACK_COORDINATES.items():
            if dkw in clean_dist or clean_dist in dkw:
                return coords

        return (23.8103, 90.4125)

    def get_predictions(self, district: str = None, thana: str = None) -> list:
        if not district:
            return self.BASE_PREDICTIONS
        result = []
        for p in self.BASE_PREDICTIONS:
            if district.lower() in p["targetDistrict"].lower():
                if not thana or thana.lower() in p["targetThana"].lower():
                    result.append(p)
        return result

    def get_comparative_risk_matrix(self, db=None) -> list:
        """Calculates a comparative national risk ranking across major Thanas in Bangladesh."""
        matrix = [
            {
                "thana": "Mirpur (Sec 1, 10)",
                "district": "Dhaka",
                "riskLevel": "CRITICAL",
                "riskIndex": 91.2,
                "primaryThreat": "THEFT_ROBBERY",
                "sevenDayTrend": "+18.4%",
                "trendDirection": "UP",
                "activeIncidents": 14,
                "recommendedAction": "Deploy motorcycle rapid response squads at Metro Station gates",
            },
            {
                "thana": "Gulshan & Banani",
                "district": "Dhaka",
                "riskLevel": "HIGH",
                "riskIndex": 84.6,
                "primaryThreat": "FRAUD_SCAM",
                "sevenDayTrend": "+8.2%",
                "trendDirection": "UP",
                "activeIncidents": 9,
                "recommendedAction": "Cyber Crime mobile forensics van along Kemal Ataturk Ave",
            },
            {
                "thana": "Agrabad Commercial",
                "district": "Chattogram",
                "riskLevel": "MEDIUM",
                "riskIndex": 68.5,
                "primaryThreat": "EXTORTION",
                "sevenDayTrend": "-4.1%",
                "trendDirection": "DOWN",
                "activeIncidents": 5,
                "recommendedAction": "CCTV integration with CMP Command and logistics patrol",
            },
            {
                "thana": "Dhanmondi",
                "district": "Dhaka",
                "riskLevel": "HIGH",
                "riskIndex": 79.4,
                "primaryThreat": "HARASSMENT",
                "sevenDayTrend": "+12.0%",
                "trendDirection": "UP",
                "activeIncidents": 8,
                "recommendedAction": "Increase foot patrols around Dhanmondi Lake bridge and schools",
            },
            {
                "thana": "Zindabazar",
                "district": "Sylhet",
                "riskLevel": "MEDIUM",
                "riskIndex": 58.1,
                "primaryThreat": "THEFT_ROBBERY",
                "sevenDayTrend": "-8.5%",
                "trendDirection": "DOWN",
                "activeIncidents": 4,
                "recommendedAction": "Community policing and market evening foot beats",
            },
            {
                "thana": "Motijheel",
                "district": "Dhaka",
                "riskLevel": "LOW",
                "riskIndex": 38.0,
                "primaryThreat": "CYBER_CRIME",
                "sevenDayTrend": "-2.0%",
                "trendDirection": "STABLE",
                "activeIncidents": 3,
                "recommendedAction": "Routine checkpoint monitoring and commercial banking CCTV sweeps",
            },
        ]

        if db:
            try:
                # Add real verified case count highlights from DB
                for item in matrix:
                    count = db.query(CrimeReport).filter(
                        CrimeReport.thana.ilike(f"%{item['thana'].split()[0]}%")
                    ).count()
                    if count > 0:
                        item["activeIncidents"] = max(item["activeIncidents"], count)
            except Exception:
                pass

        return matrix

    def get_resource_allocation_advice(self, db=None) -> list:
        """Strategic force multiplication advisor: suggests patrol reassignments from low to high risk areas."""
        return [
            {
                "id": "ALLOC-001",
                "sourceStation": "Uttara Model Thana (Dhaka)",
                "sourceRisk": "LOW (Index: 32%)",
                "targetStation": "Mirpur 10 / Pallabi (Dhaka)",
                "targetRisk": "CRITICAL (Index: 91%)",
                "recommendedUnits": "2 Mobile Patrol Vans + 4 Officers",
                "timeWindow": "18:00 - 23:00 (Rush Hour Surge)",
                "tacticalRationale": "Uttara evening incident density is 68% below baseline, while Mirpur Metro nodes experience intense pedestrian snatching clusters.",
                "expectedImpact": "Estimated 28% decrease in evening snatching reports near Mirpur 10 roundabout.",
            },
            {
                "id": "ALLOC-002",
                "sourceStation": "Motijheel Commercial (Dhaka)",
                "sourceRisk": "LOW (Index: 38%)",
                "targetStation": "Gulshan Diplomatic Zone (Dhaka)",
                "targetRisk": "HIGH (Index: 85%)",
                "recommendedUnits": "1 Cyber Crime Unit + 2 Plainclothes Investigators",
                "timeWindow": "20:00 - 02:00 (Weekend Night)",
                "tacticalRationale": "Commercial banking hours in Motijheel conclude by 18:00; Gulshan financial nightlife and ATM transaction scams peak between 20:00 and midnight.",
                "expectedImpact": "Faster response to MFS digital cash withdrawal fraud and ATM skimmer detection.",
            },
            {
                "id": "ALLOC-003",
                "sourceStation": "Pahartali Thana (Chattogram)",
                "sourceRisk": "LOW (Index: 29%)",
                "targetStation": "Agrabad Commercial (Chattogram)",
                "targetRisk": "MEDIUM (Index: 69%)",
                "recommendedUnits": "1 Mobile Patrol Vehicle",
                "timeWindow": "11:00 - 17:00 (Corporate Clearing Hours)",
                "tacticalRationale": "Reinforces logistics security along Badamtali intersection during month-end container freight clearance.",
                "expectedImpact": "Deterrence of local extortion networks targeting freight forwarders.",
            },
        ]

    def generate_predictive_analysis(
        self,
        district: str,
        thana: str,
        target_date: str = None,
        crime_type: str = None,
        weather: str = None,
        is_festival: bool = False,
        db=None,
    ) -> dict:
        chosen_type = crime_type or "THEFT_ROBBERY"
        base_prob = 0.45

        # Check real crime reports in DB for this thana
        real_incident_count = 0
        if db:
            try:
                real_incident_count = db.query(CrimeReport).filter(
                    CrimeReport.district.ilike(f"%{district}%"),
                    CrimeReport.thana.ilike(f"%{thana}%")
                ).count()
                if real_incident_count > 5:
                    base_prob += 0.2
                elif real_incident_count > 2:
                    base_prob += 0.1
            except Exception:
                pass

        # Multipliers
        weather_str = weather or "Clear Night"
        if "Monsoon" in weather_str or "Rain" in weather_str:
            base_prob += 0.12
        elif "Fog" in weather_str:
            base_prob += 0.15

        if is_festival:
            base_prob += 0.18

        probability = min(0.96, round(base_prob + random.random() * 0.15, 2))

        if probability >= 0.85:
            risk_level = "CRITICAL"
        elif probability >= 0.70:
            risk_level = "HIGH"
        elif probability >= 0.50:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        confidence = round(78.0 + random.random() * 18.0, 1)

        weekday = "General Routine Day"
        if target_date:
            try:
                dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
                weekday = dt.strftime("%A")
            except Exception:
                pass

        lat, lng = self.get_coordinates_for_thana(thana, district, db)

        # Dynamic contributing factors with % impact
        factors = [
            {"name": f"Spatial Clustering: Historical {chosen_type.replace('_', ' ')} incident density in {thana}", "impact": 38},
            {"name": f"Environmental Modifier: {weather_str} reduces visibility and foot patrol response speed", "impact": 22 if ('Monsoon' in weather_str or 'Fog' in weather_str) else 12},
            {"name": "Crowd Density: Commercial transport intersections and retail transit volume", "impact": 28 if is_festival else 16},
            {"name": f"Temporal Cycle: {weekday} peak pedestrian & digital financial transaction rush", "impact": 18},
        ]

        strategy = (
            f"Deploy {3 if risk_level in ('CRITICAL', 'HIGH') else 2} mobile rapid response units across primary arterial nodes of {thana}. "
            f"Coordinate static checkposts near commercial hubs and maintain continuous wireless telemetry linked to district control."
        )

        return {
            "id": f"PRED-{int(time.time() * 1000)}",
            "targetDistrict": district,
            "targetThana": thana,
            "predictedRiskLevel": risk_level,
            "confidenceScore": confidence,
            "primaryRiskCrimeType": chosen_type,
            "riskProbability": probability,
            "timeWindow": "19:00 - 02:00 (Peak Threat Window)",
            "latitude": lat,
            "longitude": lng,
            "radiusMeters": 750 if risk_level in ("CRITICAL", "HIGH") else 500,
            "weatherContext": weather_str,
            "factors": factors,
            "recommendedUnits": 3 if risk_level in ("CRITICAL", "HIGH") else 2,
            "recommendedAction": strategy,
            "temporalFactors": {
                "dayOfWeek": weekday,
                "timeOfDay": "Evening & Night",
                "holidayOrFestival": "Festival / Surge Cluster" if is_festival else "Standard Routine",
                "weatherCondition": weather_str,
                "trafficDensity": "HEAVY" if is_festival else "MODERATE",
                "commercialActivity": "HIGH",
            },
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820 + real_incident_count,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        }

    def issue_operational_directive(self, db, admin_user, data: dict) -> dict:
        """Issues an official high-priority operational directive to a Thana's police station."""
        target_district = data.get("targetDistrict", "Dhaka").strip()
        target_thana = data.get("targetThana", "Gulshan").strip()
        threat_level = data.get("predictedRiskLevel") or data.get("threatLevel") or "HIGH"
        crime_type = data.get("primaryRiskCrimeType") or data.get("crimeType") or "THEFT_ROBBERY"
        time_window = data.get("timeWindow") or "19:00 - 02:00 (Peak Threat Window)"
        strategy = data.get("recommendedAction") or data.get("patrolStrategy") or f"Deploy static checkpoints and mobile patrol teams across {target_thana}."
        recommended_units = int(data.get("recommendedUnits") or 2)
        lat = data.get("latitude")
        lng = data.get("longitude")

        if lat is None or lng is None:
            lat, lng = self.get_coordinates_for_thana(target_thana, target_district, db)

        dist_prefix = target_district[:3].upper()
        thana_prefix = re.sub(r"[^A-Za-z]", "", target_thana)[:3].upper()
        rand_num = random.randint(100, 999)
        year = datetime.now().year
        directive_code = f"DIR-{dist_prefix}-{thana_prefix}-{year}-{rand_num}"
        directive_id = f"dir-{int(time.time() * 1000)}"

        directive = OperationalDirective(
            id=directive_id,
            directiveCode=directive_code,
            targetDistrict=target_district,
            targetThana=target_thana,
            threatLevel=threat_level,
            primaryRiskCrimeType=crime_type,
            timeWindow=time_window,
            patrolStrategy=strategy,
            recommendedUnits=recommended_units,
            status="ACTIVE",
            latitude=float(lat),
            longitude=float(lng),
            radiusMeters=800 if threat_level in ("CRITICAL", "HIGH") else 550,
            issuedBy=f"HQ Command: {admin_user.fullName}",
            createdAt=utcnow_iso(),
        )
        db.add(directive)

        # Notify all police officers posted in this target Thana
        officers = db.query(User).filter(
            User.role == "POLICE",
            User.stationOrThana.ilike(f"%{target_thana}%")
        ).all()

        # If no officers matched by exact thana, fallback to district officers
        if not officers:
            officers = db.query(User).filter(
                User.role == "POLICE",
                User.stationOrThana.ilike(f"%{target_district}%")
            ).all()

        for officer in officers:
            notif = NotificationItem(
                id=f"notif-{int(time.time() * 1000)}-{random.randint(10, 99)}",
                userId=officer.id,
                type="ADMIN_DIRECTIVE",
                severity="CRITICAL",
                title=f"HQ DIRECTIVE: {threat_level} Alert for {target_thana}",
                message=f"HQ Command ({admin_user.fullName}) has issued operational directive {directive_code}. Time Window: {time_window}. Strategy: {strategy}. Recommended Units: {recommended_units}.",
                relatedId=directive.id,
                createdAt=utcnow_iso(),
                isRead=False,
            )
            db.add(notif)

        AuditService.log(
            user_id=admin_user.id,
            user_name=admin_user.fullName,
            user_role=admin_user.role,
            action="ISSUE_OPERATIONAL_DIRECTIVE",
            resource=directive_code,
            status="SUCCESS",
            details=f"Admin issued {threat_level} directive ({directive_code}) to {target_thana} ({len(officers)} officers notified).",
        )

        db.commit()
        return directive.to_dict()

    def get_directives(self, db, thana: str = None) -> list:
        query = db.query(OperationalDirective)
        if thana:
            clean_thana = thana.split(",")[0].strip()
            query = query.filter(
                OperationalDirective.targetThana.ilike(f"%{clean_thana}%")
            )
        directives = query.order_by(OperationalDirective.createdAt.desc()).all()
        return [d.to_dict() for d in directives]

    def update_directive_status(self, db, directive_id: str, officer_user, status: str) -> dict:
        directive = db.query(OperationalDirective).filter(OperationalDirective.id == directive_id).first()
        if not directive:
            raise ValueError("Directive not found.")

        directive.status = status
        directive.acknowledgedBy = f"{officer_user.designation or 'Officer'} {officer_user.fullName} ({officer_user.badgeNumber or officer_user.stationOrThana})"
        directive.acknowledgedAt = utcnow_iso()

        AuditService.log(
            user_id=officer_user.id,
            user_name=officer_user.fullName,
            user_role=officer_user.role,
            action="UPDATE_DIRECTIVE_STATUS",
            resource=directive.directiveCode,
            status="SUCCESS",
            details=f"Officer updated directive status to [{status}].",
        )

        db.commit()
        return directive.to_dict()
