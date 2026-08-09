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
