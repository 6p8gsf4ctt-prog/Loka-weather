export interface BrowserRunScreenshotOptions {
  url: string;
  selector?: string;
  viewport?: { width: number; height: number; deviceScaleFactor?: number };
  gotoOptions?: { waitUntil?: string; timeout?: number };
  waitForSelector?: string;
}

export interface BrowserRunBinding {
  quickAction(action: "screenshot", options: BrowserRunScreenshotOptions): Promise<Response>;
}

export interface KvAssetValueWithMetadataLike {
  value: ArrayBuffer | null;
  metadata: Record<string, string> | null;
}

export interface KvAssetNamespaceLike {
  put(key: string, value: ArrayBuffer, options?: {
    expirationTtl?: number;
    metadata?: Record<string, string>;
  }): Promise<void>;
  getWithMetadata(key: string, type: "arrayBuffer"): Promise<KvAssetValueWithMetadataLike>;
}

export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  BROWSER?: BrowserRunBinding;
  INSTAGRAM_MEDIA?: KvAssetNamespaceLike;
  PUBLIC_BASE_URL?: string;
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
  wind: { gustNotableKmh: number; gustStrongKmh: number };
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
  cloudCoverLowPct: number | null;
  cloudCoverMidPct: number | null;
  cloudCoverHighPct: number | null;
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
  cloudCoverLowPct: number | null;
  cloudCoverMidPct: number | null;
  cloudCoverHighPct: number | null;
  cloudLayerModelCount: number;
  windSpeedKmh: number;
  windGustKmh: number;
  modelCount: number;
  temperatureSpreadC: number;
  precipitationSupport: number;
  rainCodeSupport: number;
  showerSupport: number;
  thunderstormSupport: number;
  fogSupport: number;
}

export interface DisplayHour {
  hour: number;
  temperatureC: number;
  condition: HourlyCondition;
  precipitationMm: number;
}

export type HourlyCondition =
  | "soleil"
  | "peu nuageux"
  | "variable"
  | "nuageux"
  | "couvert"
  | "brouillard"
  | "vent"
  | "averse"
  | "pluie"
  | "orage";

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
export type ResolutionMode = "DIRECT" | "NEIGHBOR_RESOLUTION" | "CONSERVATIVE" | "HYSTERESIS";
export type DecisionValidity = "VALID" | "INVALID";
export type VisualIcon = "sun" | "partly" | "cloud" | "veil" | "fog" | "wind" | "rain" | "shower" | "thunder" | "mixed" | "rain-wind" | "cloud-wind" | "sun-wind";

export interface Scene24Definition {
  id: Scene24Id;
  key: Scene24Key;
  label: string;
  family: Scene24Family;
  description: string;
  masterFileName: string;
  emoji: string;
  visualIcon: VisualIcon;
}

export interface Scene24Candidate {
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
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
  doctrineVersion: string;
  validity: DecisionValidity;
  decisionFamily: Scene24Family;
  resolutionMode: ResolutionMode;
  familyReason: string;
  candidateSceneIds: Scene24Id[];
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  sceneLabel: string;
  score: number;
  confidence: Scene24Confidence;
  runnerUp: Scene24RunnerUp | null;
  candidates: Scene24Candidate[];
  reasons: string[];
  fallbackUsed: false;
  hysteresisApplied: boolean;
  invariantChecks: Array<{ name: string; pass: boolean; detail: string }>;
  profileSummary: Record<string, number | string | boolean | null>;
}

export type SkyBand = "CLEAR" | "BRIGHT" | "MIXED" | "CLOUDY" | "DENSE";

export interface DayPeriodProfile {
  count: number;
  meanCloudPct: number;
  brightFraction: number;
  cloudyFraction: number;
  meanWindGustKmh: number;
  rainHours: number;
}

export interface DayProfileV2 {
  version: "2.0";
  citySlug: string;
  date: string;
  period: {
    startHour: number;
    endHour: number;
    sunriseLocalHour: number;
    sunsetLocalHour: number;
    daylightHours: number;
  };
  periods: {
    early: DayPeriodProfile;
    mid: DayPeriodProfile;
    late: DayPeriodProfile;
    lastHours: DayPeriodProfile;
  };
  light: {
    clearFraction: number;
    brightFraction: number;
    mixedFraction: number;
    cloudyFraction: number;
    denseFraction: number;
    brightBlockMaxHours: number;
    cloudBlockMaxHours: number;
    lastHoursBrightFraction: number;
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
    visibilityMinKm: null;
  };
  evolution: {
    earlyCloudPct: number;
    midCloudPct: number;
    lateCloudPct: number;
    earlyBrightFraction: number;
    midBrightFraction: number;
    lateBrightFraction: number;
    cloudTrend: number;
    trendStrength: "STABLE" | "WEAK" | "MODERATE" | "STRONG";
    reversals: number;
  };
  structure: {
    meaningfulTransitions: number;
    uncertainWeather: boolean;
    distinctStateCount: number;
    modelCountMin: number;
    modelCountMean: number;
  };
}

export type DominantPhenomenon =
  | "THUNDER"
  | "RAIN"
  | "SHOWERS"
  | "FOG"
  | "WIND"
  | "HEAT"
  | "COLD"
  | "SKY_DEGRADATION"
  | "SKY_IMPROVEMENT"
  | "CLOUD"
  | "SUN"
  | "MIXED";

export type DayEvolution =
  | "STABLE"
  | "IMPROVING"
  | "DEGRADING"
  | "INTERMITTENT"
  | "VARIABLE"
  | "TWO_PHASES";

export type EvolutionStrength = "NONE" | "WEAK" | "MODERATE" | "STRONG";
export type ChangeLevel = "LOW" | "MODERATE" | "HIGH";

export interface DayClassification {
  version: "3.0";
  dominantPhenomenon: DominantPhenomenon;
  secondaryPhenomenon: DominantPhenomenon | "NONE";
  evolution: DayEvolution;
  evolutionStrength: EvolutionStrength;
  changeLevel: ChangeLevel;
  changeScore: number;
  transition: {
    startHour: number | null;
    peakHour: number | null;
    endHour: number | null;
  };
  keyPeriod: { startHour: number; endHour: number } | null;
}

export type WeatherConfidenceLevel = "STABLE" | "SOME_UNCERTAINTY" | "WATCH";
export type WeatherUncertaintyType =
  | "NONE"
  | "RAIN_PRESENCE"
  | "RAIN_START"
  | "RAIN_END"
  | "RAIN_INTENSITY"
  | "THUNDER_PRESENCE"
  | "FOG_PRESENCE"
  | "FOG_END"
  | "WIND_INTENSITY"
  | "WIND_PEAK"
  | "TEMPERATURE_MAX"
  | "CLOUD_EVOLUTION";

export interface WeatherConfidence {
  level: WeatherConfidenceLevel;
  score: number;
  agreements: {
    scenario: number;
    timing: number | null;
    intensity: number | null;
    duration: number | null;
    thermal: number;
  };
  mainUncertainty: WeatherUncertaintyType;
  period: { startHour: number; endHour: number } | null;
  impact: "LOW" | "MEDIUM" | "HIGH";
  availableModels: number;
  availableWeight: number;
  reasons: string[];
}

export type TimelinePointImportance = "NORMAL" | "IMPORTANT" | "KEY";
export type TimelinePointReason =
  | "DAY_START"
  | "DAY_END"
  | "TRANSITION"
  | "RAIN_START"
  | "RAIN_END"
  | "THUNDER"
  | "FOG_END"
  | "WIND_THRESHOLD"
  | "WIND_PEAK"
  | "TEMPERATURE_PEAK"
  | "WEATHER_CHANGE"
  | "SPACING";

export interface TimelinePoint extends DisplayHour {
  importance: TimelinePointImportance;
  reason: TimelinePointReason;
}

export interface AdaptiveTimeline {
  mode: "STABLE" | "STANDARD" | "DENSE" | "EVENT_FOCUSED";
  points: TimelinePoint[];
}

export type KeyTakeawayType =
  | "THUNDER"
  | "RAIN_START"
  | "RAIN_END"
  | "WIND"
  | "FOG"
  | "HEAT_PEAK"
  | "COOL"
  | "CHANGE"
  | "IMPROVEMENT"
  | "DRY_WINDOW"
  | "BEST_PERIOD"
  | "TEMPERATURE_PEAK"
  | "STABILITY";

export interface KeyTakeaway {
  type: KeyTakeawayType;
  startHour: number | null;
  endHour: number | null;
  uncertain?: boolean;
}

export type KeyMomentType =
  | "CHANGE"
  | "RAIN_START"
  | "RAIN_END"
  | "HOTTEST"
  | "BEST_WINDOW"
  | "DRY_WINDOW"
  | "WIND_PEAK"
  | "FOG_END"
  | "IMPROVEMENT"
  | "THUNDER";

export interface KeyMoment {
  type: KeyMomentType;
  hour: number | null;
  startHour: number | null;
  endHour: number | null;
}

export type ContextualDataType =
  | "WIND_GUST"
  | "RAIN_TOTAL"
  | "DRY_WINDOW"
  | "FOG_DURATION"
  | "TEMPERATURE_MAX"
  | "TEMPERATURE_RANGE";

export interface ContextualData {
  type: ContextualDataType;
  value: number | null;
  unit: string | null;
  startHour?: number | null;
  endHour?: number | null;
}

export interface EditorialSignals {
  keyTakeaway: KeyTakeaway;
  keyMoment: KeyMoment;
  contextualData: ContextualData | null;
}

export interface LokaDayAnalysisV3 {
  version: "3.0";
  profile: DayProfileV2;
  classification: DayClassification;
  weatherConfidence: WeatherConfidence;
  timeline: AdaptiveTimeline;
  editorialSignals: EditorialSignals;
}

export interface EditorialFacts {
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  trajectory: "STABLE" | "IMPROVING" | "DEGRADING" | "VARIABLE";
  startSky: SkyBand;
  middleSky: SkyBand;
  endSky: SkyBand;
  transitionStrength: "NONE" | "WEAK" | "MODERATE" | "STRONG";
  brightestPeriod: "EARLY" | "MID" | "LATE" | "ALL_DAY";
  cloudiestPeriod: "EARLY" | "MID" | "LATE" | "ALL_DAY";
  precipitation: { kind: "DRY" | "SHOWERS" | "RAIN" | "THUNDER"; hours: number; totalMm: number };
  wind: { kind: "NONE" | "NOTABLE" | "STRONG"; maxGustKmh: number };
  fog: { kind: "NONE" | "BRIEF" | "DENSE"; hours: number };
  temperature: { minC: number; maxC: number; character: "COOL" | "MILD" | "WARM" | "HOT" | "VERY_HOT" };
  confidence: Scene24Confidence;
  modelSignalUncertain: boolean;
}

export interface EditorialProductV2 {
  version: "2.0";
  scene: {
    id: Scene24Id;
    key: Scene24Key;
    title: string;
    emoji: string;
    visualIcon: VisualIcon;
  };
  visual: {
    subtitle: string;
    primaryLine: string;
    secondaryLine: string;
  };
  social: {
    paragraph1: string;
    paragraph2: string;
    signature: "Ici, aujourd’hui.";
    handle: string;
    caption: string;
    hashtags: string;
  };
  engagement: EditorialEngagementV2;
  facts: EditorialFacts;
}

export type EditorialEngagementFormat = "POLL" | "QUESTION";

export interface EditorialEngagementV2 {
  format: EditorialEngagementFormat;
  question: string;
  options: [string, string] | null;
}

export interface OfficialPublicPayloadV24 {
  version: "2.0";
  city: string;
  citySlug: string;
  date: string;
  generatedAt: string;
  source: string;
  scene: {
    id: Scene24Id;
    key: Scene24Key;
    label: string;
    family: Scene24Family;
    masterUrl: string;
    visualIcon: VisualIcon;
    emoji: string;
  };
  temperatures: { minC: number; maxC: number };
  hourly: DisplayHour[];
  editorial: EditorialProductV2;
  decision: SceneDecisionV24;
  models: { count: number; ok: string[]; failed: Record<string, string> };
  analysis?: LokaDayAnalysisV3;
}

export interface PublicationManifestV24 {
  version: "2.0";
  engine: "V24";
  citySlug: string;
  forecastDate: string;
  generatedAt: string;
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  payloadSha256: string;
  createdAt: string;
}

export type DailySceneStatus = "OFFICIAL" | "RECOVERED";

export interface DailySceneLedgerRow {
  id: number;
  citySlug: string;
  forecastDate: string;
  revision: number;
  status: DailySceneStatus;
  generationId: number;
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  sceneLabel: string;
  confidence: Scene24Confidence;
  resolutionMode: ResolutionMode;
  runnerUpSceneId: Scene24Id | null;
  engineVersion: string;
  doctrineVersion: string;
  manifestHash: string;
  reason: string | null;
  createdAt: string;
}

export interface GenerationArchiveRow {
  id: number;
  citySlug: string;
  forecastDate: string;
  generatedAt: string;
  source: string;
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  score: number;
  confidence: Scene24Confidence;
  modelCount: number;
  publicPayload: OfficialPublicPayloadV24;
  manifestHash: string;
}
