import random
import time
from datetime import datetime
from ..models import utcnow_iso

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
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
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
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
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
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        },
        {
            "id": "PRED-SYL-ZIN-004",
            "targetDistrict": "Sylhet",
            "targetThana": "Zindabazar & Bandarbazar",
            "predictedRiskLevel": "MEDIUM",
            "confidenceScore": 79.1,
            "primaryRiskCrimeType": "HARASSMENT",
            "riskProbability": 0.62,
            "timeWindow": "16:00 - 21:00",
            "temporalFactors": {
                "dayOfWeek": "Friday",
                "timeOfDay": "Evening",
                "holidayOrFestival": "Tourist inflow weekend",
                "weatherCondition": "Clear",
                "trafficDensity": "MODERATE",
                "commercialActivity": "HIGH",
            },
            "keyContributingIndicators": [
                "High influx of domestic travelers around shopping complexes and tea-garden transit routes",
                "Narrow corridors around busy textile markets",
            ],
            "recommendedPatrolStrategy": "Deploy female community police officers and tourist police units near Kin Bridge & Zindabazar points.",
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        },
        {
            "id": "PRED-DHK-MOT-005",
            "targetDistrict": "Dhaka",
            "targetThana": "Motijheel Commercial District",
            "predictedRiskLevel": "LOW",
            "confidenceScore": 88.0,
            "primaryRiskCrimeType": "CYBER_CRIME",
            "riskProbability": 0.28,
            "timeWindow": "09:00 - 18:00",
            "temporalFactors": {
                "dayOfWeek": "Working Days",
                "timeOfDay": "Business Hours",
                "weatherCondition": "Sunny",
                "trafficDensity": "HEAVY",
                "commercialActivity": "HIGH",
            },
            "keyContributingIndicators": [
                "Central bank and commercial banking headquarters with high physical security",
                "CCTV coverage coverage above 92%",
            ],
            "recommendedPatrolStrategy": "Maintain standard traffic control and regular checkpoint monitoring.",
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        },
    ]

    def get_predictions(self, district: str = None, thana: str = None) -> list:
        if not district:
            return self.BASE_PREDICTIONS
        result = []
        for p in self.BASE_PREDICTIONS:
            if district.lower() in p["targetDistrict"].lower():
                if not thana or thana.lower() in p["targetThana"].lower():
                    result.append(p)
        return result

    def generate_predictive_analysis(
        self,
        district: str,
        thana: str,
        target_date: str = None,
        crime_type: str = None,
        weather: str = None,
        is_festival: bool = False,
    ) -> dict:
        chosen_type = crime_type or "THEFT_ROBBERY"
        probability = round(0.4 + random.random() * 0.55, 2)
        if probability > 0.8:
            risk_level = "EXTREME"
        elif probability > 0.65:
            risk_level = "HIGH"
        elif probability > 0.45:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"

        confidence = round(75.0 + random.random() * 20.0, 1)

        weekday = "General Routine Day"
        if target_date:
            try:
                dt = datetime.fromisoformat(target_date.replace("Z", "+00:00"))
                weekday = dt.strftime("%A")
            except Exception:
                pass

        return {
            "id": f"PRED-{int(time.time() * 1000)}",
            "targetDistrict": district,
            "targetThana": thana,
            "predictedRiskLevel": risk_level,
            "confidenceScore": confidence,
            "primaryRiskCrimeType": chosen_type,
            "riskProbability": probability,
            "timeWindow": "18:00 - 01:00 Peak Risk Window",
            "temporalFactors": {
                "dayOfWeek": weekday,
                "timeOfDay": "Evening & Night",
                "holidayOrFestival": "Festival / Public Holiday Cluster" if is_festival else "Standard Routine",
                "weatherCondition": weather or "Variable Seasonal Conditions",
                "trafficDensity": "HEAVY" if is_festival else "MODERATE",
                "commercialActivity": "HIGH",
            },
            "keyContributingIndicators": [
                f"Historical temporal clustering of {chosen_type.replace('_', ' ')} reports in {thana}",
                "High urban transit density and localized footfall patterns",
                "Festival commerce creates higher volume of cash movements and crowded market zones" if is_festival else "Regular weekly business cycle indicators",
            ],
            "recommendedPatrolStrategy": f"Intensify static check-posts across primary access nodes of {thana} and synchronize wireless dispatch patrols.",
            "modelInfo": {
                "modelName": "SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)",
                "algorithm": "XGBoost with Spatial Kernel Density Estimation",
                "trainedOnIncidentsCount": 14820,
                "lastTrainedAt": "2026-08-15T00:00:00.000Z",
                "isDemo": True,
            },
            "generatedAt": utcnow_iso(),
        }
