import { AIPredictionData, CrimeType } from '../../src/types';

export interface IAIPredictionService {
  getPredictions(district?: string, thana?: string): Promise<AIPredictionData[]>;
  generatePredictiveAnalysis(params: {
    district: string;
    thana: string;
    targetDate: string;
    crimeType?: CrimeType;
    weather?: string;
    isFestival?: boolean;
  }): Promise<AIPredictionData>;
}

export class DemonstrationAIPredictionService implements IAIPredictionService {
  private basePredictions: AIPredictionData[] = [
    {
      id: 'PRED-DHK-GUL-001',
      targetDistrict: 'Dhaka',
      targetThana: 'Gulshan & Banani',
      predictedRiskLevel: 'HIGH',
      confidenceScore: 84.6,
      primaryRiskCrimeType: CrimeType.FRAUD_SCAM,
      riskProbability: 0.78,
      timeWindow: '20:00 - 02:00 (Evening / Night)',
      temporalFactors: {
        dayOfWeek: 'Thursday & Friday',
        timeOfDay: 'Late Evening',
        holidayOrFestival: 'Upcoming Weekend Surge',
        weatherCondition: 'Clear Night',
        trafficDensity: 'HEAVY',
        commercialActivity: 'HIGH'
      },
      keyContributingIndicators: [
        'Concentration of high-value commercial transactions & ATM clusters along Gulshan Ave',
        'Historical 34% spike in cyber financial scams during weekend retail peaks',
        'High density of international diplomatic and hospitality venues'
      ],
      recommendedPatrolStrategy: 'Deploy 4 mobile cyber-patrol vans and coordinate with bank security officers around Kemal Ataturk Ave.',
      modelInfo: {
        modelName: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
        algorithm: 'XGBoost with Spatial Kernel Density Estimation',
        trainedOnIncidentsCount: 14820,
        lastTrainedAt: '2026-08-15T00:00:00.000Z',
        isDemo: true
      },
      generatedAt: new Date().toISOString()
    },
    {
      id: 'PRED-DHK-MIR-002',
      targetDistrict: 'Dhaka',
      targetThana: 'Mirpur (Section 1 & 10)',
      predictedRiskLevel: 'EXTREME',
      confidenceScore: 91.2,
      primaryRiskCrimeType: CrimeType.THEFT_ROBBERY,
      riskProbability: 0.89,
      timeWindow: '18:00 - 23:00 (Rush Hour)',
      temporalFactors: {
        dayOfWeek: 'Sunday to Wednesday',
        timeOfDay: 'Evening Commute',
        weatherCondition: 'Light Rain / Monsoon overcast',
        trafficDensity: 'HEAVY',
        commercialActivity: 'HIGH'
      },
      keyContributingIndicators: [
        'High pedestrian footfall around Mirpur 10 roundabout and metro stations',
        'Alleyways with inadequate street lighting near commercial shopping zones',
        'Historical clustering of pickpocketing and mobile snatching incidents'
      ],
      recommendedPatrolStrategy: 'Station undercover anti-snatching squads at Metro station exits and deploy motorcycle rapid response units.',
      modelInfo: {
        modelName: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
        algorithm: 'XGBoost with Spatial Kernel Density Estimation',
        trainedOnIncidentsCount: 14820,
        lastTrainedAt: '2026-08-15T00:00:00.000Z',
        isDemo: true
      },
      generatedAt: new Date().toISOString()
    },
    {
      id: 'PRED-CTG-AGR-003',
      targetDistrict: 'Chattogram',
      targetThana: 'Agrabad Commercial Area',
      predictedRiskLevel: 'MEDIUM',
      confidenceScore: 76.4,
      primaryRiskCrimeType: CrimeType.EXTORTION,
      riskProbability: 0.54,
      timeWindow: '11:00 - 17:00 (Banking Hours)',
      temporalFactors: {
        dayOfWeek: 'Monday & Tuesday',
        timeOfDay: 'Afternoon',
        holidayOrFestival: 'Month-end corporate clearing',
        weatherCondition: 'Humid / Coastal',
        trafficDensity: 'MODERATE',
        commercialActivity: 'HIGH'
      },
      keyContributingIndicators: [
        'Import-export container freight clearing office proximity',
        'Previous extortion reports targeting local logistics brokerage agencies',
        'Large physical cash handling outside banking hours'
      ],
      recommendedPatrolStrategy: 'Visible patrol car stationed near Badamtali intersection with CCTV live monitoring linked to CMP Command.',
      modelInfo: {
        modelName: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
        algorithm: 'XGBoost with Spatial Kernel Density Estimation',
        trainedOnIncidentsCount: 14820,
        lastTrainedAt: '2026-08-15T00:00:00.000Z',
        isDemo: true
      },
      generatedAt: new Date().toISOString()
    },
    {
      id: 'PRED-SYL-ZIN-004',
      targetDistrict: 'Sylhet',
      targetThana: 'Zindabazar & Bandarbazar',
      predictedRiskLevel: 'MEDIUM',
      confidenceScore: 79.1,
      primaryRiskCrimeType: CrimeType.HARASSMENT,
      riskProbability: 0.62,
      timeWindow: '16:00 - 21:00',
      temporalFactors: {
        dayOfWeek: 'Friday',
        timeOfDay: 'Evening',
        holidayOrFestival: 'Tourist inflow weekend',
        weatherCondition: 'Clear',
        trafficDensity: 'MODERATE',
        commercialActivity: 'HIGH'
      },
      keyContributingIndicators: [
        'High influx of domestic travelers around shopping complexes and tea-garden transit routes',
        'Narrow corridors around busy textile markets'
      ],
      recommendedPatrolStrategy: 'Deploy female community police officers and tourist police units near Kin Bridge & Zindabazar points.',
      modelInfo: {
        modelName: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
        algorithm: 'XGBoost with Spatial Kernel Density Estimation',
        trainedOnIncidentsCount: 14820,
        lastTrainedAt: '2026-08-15T00:00:00.000Z',
        isDemo: true
      },
      generatedAt: new Date().toISOString()
    },
    {
      id: 'PRED-DHK-MOT-005',
      targetDistrict: 'Dhaka',
      targetThana: 'Motijheel Commercial District',
      predictedRiskLevel: 'LOW',
      confidenceScore: 88.0,
      primaryRiskCrimeType: CrimeType.CYBER_CRIME,
      riskProbability: 0.28,
      timeWindow: '09:00 - 18:00',
      temporalFactors: {
        dayOfWeek: 'Working Days',
        timeOfDay: 'Business Hours',
        weatherCondition: 'Sunny',
        trafficDensity: 'HEAVY',
        commercialActivity: 'HIGH'
      },
      keyContributingIndicators: [
        'Central bank and commercial banking headquarters with high physical security',
        'CCTV coverage coverage above 92%'
      ],
      recommendedPatrolStrategy: 'Maintain standard traffic control and regular checkpoint monitoring.',
      modelInfo: {
        modelName: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
        algorithm: 'XGBoost with Spatial Kernel Density Estimation',
        trainedOnIncidentsCount: 14820,
        lastTrainedAt: '2026-08-15T00:00:00.000Z',
        isDemo: true
      },
      generatedAt: new Date().toISOString()
    }
  ];

  async getPredictions(district?: string, thana?: string): Promise<AIPredictionData[]> {
    if (!district) return this.basePredictions;
    return this.basePredictions.filter(
      p => p.targetDistrict.toLowerCase().includes(district.toLowerCase()) &&
        (!thana || p.targetThana.toLowerCase().includes(thana.toLowerCase()))
    );
  }

  async generatePredictiveAnalysis(params: {
    district: string;
    thana: string;
    targetDate: string;
    crimeType?: CrimeType;
    weather?: string;
    isFestival?: boolean;
  }): Promise<AIPredictionData> {
    const riskLevels: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'> = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
    const chosenType = params.crimeType || CrimeType.THEFT_ROBBERY;
    const probability = Number((0.4 + Math.random() * 0.55).toFixed(2));
    const riskLevel = probability > 0.8 ? 'EXTREME' : probability > 0.65 ? 'HIGH' : probability > 0.45 ? 'MEDIUM' : 'LOW';
    const confidence = Number((75 + Math.random() * 20).toFixed(1));

    return {
      id: `PRED-${Date.now().toString(36).toUpperCase()}`,
      targetDistrict: params.district,
      targetThana: params.thana,
      predictedRiskLevel: riskLevel,
      confidenceScore: confidence,
      primaryRiskCrimeType: chosenType,
      riskProbability: probability,
      timeWindow: '18:00 - 01:00 Peak Risk Window',
      temporalFactors: {
        dayOfWeek: new Date(params.targetDate).toLocaleDateString('en-US', { weekday: 'long' }),
        timeOfDay: 'Evening & Night',
        holidayOrFestival: params.isFestival ? 'Festival / Public Holiday Cluster' : 'Standard Routine',
        weatherCondition: params.weather || 'Variable Seasonal Conditions',
        trafficDensity: params.isFestival ? 'HEAVY' : 'MODERATE',
        commercialActivity: 'HIGH'
      },
      keyContributingIndicators: [
        `Historical temporal clustering of ${chosenType.replace(/_/g, ' ')} reports in ${params.thana}`,
        'High urban transit density and localized footfall patterns',
        params.isFestival ? 'Festival commerce creates higher volume of cash movements and crowded market zones' : 'Regular weekly business cycle indicators'
      ],
      recommendedPatrolStrategy: `Intensify static check-posts across primary access nodes of ${params.thana} and synchronize wireless dispatch patrols.`,
      modelInfo: {
        modelName: 'SentinelX-CrimeRisk-GradientBoostedTree v2.4 (Demo)',
        algorithm: 'XGBoost with Spatial Kernel Density Estimation',
        trainedOnIncidentsCount: 14820,
        lastTrainedAt: '2026-08-15T00:00:00.000Z',
        isDemo: true
      },
      generatedAt: new Date().toISOString()
    };
  }
}
