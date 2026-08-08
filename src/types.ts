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

  wind: {
    gustNotableKmh: number;
    gustStrongKmh: number;
  };

  /**
   * Editorial temperature thresholds used by LOKA.
   * These are not warning thresholds. They only prevent absurd wording
   * such as calling 20°C "frais" on a summer morning in Tarnos.
   */
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

  /** Weighted share of models whose WMO code indicates rain/drizzle/showers. */
  rainCodeSupport: number;

  /** Weighted share of models whose WMO code indicates showers. */
  showerSupport: number;

  /** Weighted share of models whose WMO code indicates thunderstorm. */
  thunderstormSupport: number;
}

export interface DisplayHour {
  hour: number;
  temperatureC: number;
  condition: string;
  precipitationMm: number;
}

export interface LokaForecast {
  city: string;
  citySlug: string;
  date: string;
  generatedAt: string;
  tempMaxC: number;
  tempMinC: number;
  mainVerdict: string;
  rainVerdict: string;
  notableEvent: string | null;
  confidenceMain: number;
  confidenceRain: number;
  hourly: DisplayHour[];
  diagnostics: Record<string, unknown>;
}
