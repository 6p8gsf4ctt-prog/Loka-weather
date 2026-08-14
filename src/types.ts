export interface Env {
  DB: D1Database;
  OPEN_METEO_BASE_URL?: string;
  OPEN_METEO_API_KEY?: string;
  ADMIN_TOKEN?: string;
}

export type WeatherFamily =
  | "meteofrance"
  | "ecmwf_physics"
  | "ecmwf_ai"
  | "dwd"
  | "noaa";

export interface CityConfig {
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  timezone: string;
  displayHours: number[];
  wind: { gustNotableKmh: number; gustStrongKmh: number; };
  thermal: {
    morningCoolBelowC: number;
    morningMildBelowC: number;
    morningWarmFromC: number;
    afternoonHotFromC: number;
    afternoonVeryHotFromC: number;
    notableRiseC: number;
    strongRiseC: number;
    notableDropC: number;
  };
}

export interface ModelConfig {
  id: string;
  apiModel: string;
  family: WeatherFamily;
  baseWeight: number;
}

export interface HourPoint {
  time: string;
  temperatureC: number | null;
  apparentTemperatureC: number | null;
  precipitationMm: number;
  rainMm: number;
  cloudCoverPct: number | null;
  windSpeedKmh: number | null;
  windGustKmh: number | null;
  weatherCode: number | null;
}

export interface ModelForecast {
  modelId: string;
  family: WeatherFamily;
  weight: number;
  fetchedAt: string;
  latitude: number;
  longitude: number;
  generationTimeMs?: number;
  hourly: HourPoint[];
}

export interface ConsensusHour {
  time: string;
  temperatureC: number;
  apparentTemperatureC: number;
  precipitationMm: number;
  cloudCoverPct: number;
  windSpeedKmh: number;
  windGustKmh: number;
  modelCount: number;
  temperatureSpreadC: number;
  precipitationSupport: number;
  rainCodeSupport: number;
  showerSupport: number;
  thunderstormSupport: number;
}

export interface DisplayHour {
  hour: number;
  temperatureC: number;
  condition: string;
  precipitationMm: number;
}

export type LokaScene =
  | "SOLEIL"
  | "NUAGES"
  | "PLUIE"
  | "ORAGES"
  | "VENT FORT"
  | "INSTABLE";

export interface SceneCandidate {
  scene: LokaScene;
  score: number;
  eligible: boolean;
  reasons: string[];
}

export interface DecisionLog {
  version: string;
  selectedScene: LokaScene;
  selectedScore: number;
  candidates: SceneCandidate[];
  metrics: Record<string, number | string | boolean | null>;
  reasons: string[];
  suppressed: string[];
}

/**
 * Legacy alias kept explicitly during the V24 transition.
 * Production still uses LokaScene until the V24 classifier is validated.
 */
export type LegacyLokaScene = LokaScene;

export type Scene24Id =
  | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24;

export type Scene24Key =
  | "GRAND_SOLEIL"
  | "SOLEIL_VOILE"
  | "ECLAIRCIES"
  | "VARIABLE_LUMINEUX"
  | "DEGRADATION"
  | "SOLEIL_PLUS_VENT"
  | "SOLEIL_VOILE_DENSE"
  | "BRUME_BROUILLARD"
  | "COUVERT"
  | "VENT_FORT"
  | "AMELIORATION"
  | "PLUIE_SOUTENUE"
  | "AVERSES"
  | "ECLAIRCIES_PLUS_VENT"
  | "AMELIORATION_LUMINEUSE"
  | "SOLEIL_PLUS_PASSAGES_NUAGEUX"
  | "BROUILLARD_DENSE"
  | "VARIABLE"
  | "INSTABLE"
  | "NUAGEUX_PLUS_VENT"
  | "GRANDES_ECLAIRCIES"
  | "ORAGEUX"
  | "COUVERT_DENSE"
  | "PLUIE_PLUS_VENT";

export type Scene24Family =
  | "LIGHT"
  | "VEIL"
  | "MIXED_SKY"
  | "VARIABILITY"
  | "TREND"
  | "WIND_COMBINATION"
  | "VISIBILITY"
  | "CLOUD"
  | "WIND"
  | "RAIN"
  | "INSTABILITY"
  | "THUNDER"
  | "RAIN_WIND";

export type Scene24Confidence = "HIGH" | "MEDIUM" | "LOW";

export interface Scene24Definition {
  id: Scene24Id;
  key: Scene24Key;
  label: string;
  family: Scene24Family;
  description: string;
  masterFileName: string;
}

export interface Scene24Candidate {
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  eligible: boolean;
  score: number;
  confidence: Scene24Confidence;
  reasons: string[];
  penalties: string[];
}

export interface Scene24RunnerUp {
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  score: number;
}

export interface SceneDecisionV24 {
  version: string;
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  sceneLabel: string;
  score: number;
  confidence: Scene24Confidence;
  runnerUp: Scene24RunnerUp | null;
  candidates: Scene24Candidate[];
  reasons: string[];
  fallbackUsed: boolean;
  hysteresisApplied: boolean;
}

export type DaySkyState = "CLEAR" | "BRIGHT" | "MIXED" | "CLOUDY" | "DENSE";

export interface DayProfile {
  period: { startHour: number; endHour: number };

  light: {
    clearFraction: number;
    brightFraction: number;
    mixedFraction: number;
    cloudyFraction: number;
    denseFraction: number;
    brightBlockMaxHours: number;
    cloudBlockMaxHours: number;
  };

  cloud: {
    meanCoverPct: number;
    medianCoverPct: number;
    minCoverPct: number;
    maxCoverPct: number;
    stdDevPct: number;
    lowMeanPct: number | null;
    midMeanPct: number | null;
    highMeanPct: number | null;
    highFractionAbove70: number | null;
    denseBlockMaxHours: number;
  };

  rain: {
    rainHours: number;
    rainBlockMaxHours: number;
    rainBreakCount: number;
    dryGapMaxHours: number;
    rainTotalMm: number;
    maxRainMmPerHour: number;
    continuityRatio: number;
    showerHours: number;
    showerBlockCount: number;
    convectiveRainFraction: number;
  };

  wind: {
    notableHours: number;
    strongHours: number;
    maxGustKmh: number;
    blockMaxHours: number;
    strongBlockMaxHours: number;
    brightOverlapHours: number;
    mixedOverlapHours: number;
    cloudOverlapHours: number;
    rainOverlapHours: number;
  };

  convection: {
    thunderHours: number;
    peakThunderSupport: number;
  };

  visibility: {
    fogHours: number;
    denseFogHours: number;
    fogBlockMaxHours: number;
    denseFogBlockMaxHours: number;
    fogSupportPeak: number;
    fogSupportMean: number;
    visibilityMinKm: number | null;
  };

  evolution: {
    meanCloudMorning: number;
    meanCloudAfternoon: number;
    meanCloudEvening: number;
    brightFractionMorning: number;
    brightFractionAfternoon: number;
    brightFractionEvening: number;
    cloudTrend: number;
    trendStrength: "STABLE" | "WEAK" | "MODERATE" | "STRONG";
    reversals: number;
  };

  structure: {
    meaningfulTransitions: number;
    uncertainWeather: boolean;
    distinctStateCount: number;
  };
}

export interface LokaForecast {
  city: string;
  citySlug: string;
  date: string;
  generatedAt: string;
  tempMaxC: number;
  tempMinC: number;
  scene?: LokaScene;
  subtitle?: string;
  summaryLines?: string[];
  decisionLog?: DecisionLog;
  mainVerdict: string;
  rainVerdict: string;
  notableEvent: string | null;
  confidenceMain: number;
  confidenceRain: number;
  hourly: DisplayHour[];
  diagnostics: Record<string, unknown>;
}
