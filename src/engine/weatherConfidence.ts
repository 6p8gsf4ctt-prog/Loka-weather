import { SCENE_THRESHOLDS } from "../config/scenes24";
import type {
  CityConfig,
  DayClassification,
  DominantPhenomenon,
  HourPoint,
  ModelForecast,
  WeatherConfidence,
  WeatherUncertaintyType
} from "../types";
import { clamp, mean } from "./math";

interface ModelDaySignal {
  modelId: string;
  weight: number;
  rainPresent: boolean;
  rainStartHour: number | null;
  rainEndHour: number | null;
  rainHours: number;
  rainTotalMm: number;
  rainPeakMm: number;
  showersPresent: boolean;
  thunderPresent: boolean;
  thunderStartHour: number | null;
  fogPresent: boolean;
  fogEndHour: number | null;
  maxGustKmh: number;
  windPeakHour: number | null;
  notableWindHours: number;
  minTemperatureC: number;
  maxTemperatureC: number;
  maxTemperatureHour: number | null;
  meanCloudPct: number;
  brightFraction: number;
  cloudHeavyFraction: number;
  earlyCloudPct: number;
  lateCloudPct: number;
  cloudTrend: number;
}

function hourOfPoint(p: HourPoint): number { return Number(p.time.slice(11, 13)); }
function isRainCode(code: number | null): boolean {
  return code !== null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99));
}
function isShowerCode(code: number | null): boolean { return code !== null && code >= 80 && code <= 82; }
function isThunderCode(code: number | null): boolean { return code !== null && code >= 95 && code <= 99; }
function isFogCode(code: number | null): boolean { return code === 45 || code === 48; }
function isWet(p: HourPoint): boolean { return p.precipitationMm >= SCENE_THRESHOLDS.rain.wetHourMinMm || p.rainMm >= SCENE_THRESHOLDS.rain.wetHourMinMm || isRainCode(p.weatherCode); }

function averageNullable(values: Array<number | null>): number {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return valid.length ? mean(valid) : 0;
}

function signalForModel(city: CityConfig, date: string, forecast: ModelForecast): ModelDaySignal | null {
  const day = forecast.hourly
    .filter((p) => p.time.slice(0, 10) === date)
    .filter((p) => hourOfPoint(p) >= 6 && hourOfPoint(p) <= 22)
    .sort((a, b) => a.time.localeCompare(b.time));
  if (!day.length) return null;

  const wet = day.filter(isWet);
  const thunder = day.filter((p) => isThunderCode(p.weatherCode));
  const fog = day.filter((p) => isFogCode(p.weatherCode));
  const gusts = day.map((p) => p.windGustKmh ?? 0);
  const temps = day.map((p) => p.temperatureC).filter((x): x is number => x !== null && Number.isFinite(x));
  const clouds = day.map((p) => p.cloudCoverPct).filter((x): x is number => x !== null && Number.isFinite(x));
  const early = day.filter((p) => hourOfPoint(p) <= 11);
  const late = day.filter((p) => hourOfPoint(p) >= 17);
  const maxGust = gusts.length ? Math.max(...gusts) : 0;
  const maxGustIndex = day.findIndex((p) => (p.windGustKmh ?? 0) === maxGust);
  const maxTemp = temps.length ? Math.max(...temps) : 0;
  const minTemp = temps.length ? Math.min(...temps) : 0;
  const maxTempPoint = day.find((p) => p.temperatureC === maxTemp);
  const earlyCloud = averageNullable(early.map((p) => p.cloudCoverPct));
  const lateCloud = averageNullable(late.map((p) => p.cloudCoverPct));

  return {
    modelId: forecast.modelId,
    weight: forecast.weight,
    rainPresent: wet.length > 0,
    rainStartHour: wet.length ? hourOfPoint(wet[0]) : null,
    rainEndHour: wet.length ? hourOfPoint(wet[wet.length - 1]) : null,
    rainHours: wet.length,
    rainTotalMm: wet.reduce((s, p) => s + Math.max(p.precipitationMm, p.rainMm), 0),
    rainPeakMm: wet.length ? Math.max(...wet.map((p) => Math.max(p.precipitationMm, p.rainMm))) : 0,
    showersPresent: day.some((p) => isShowerCode(p.weatherCode)),
    thunderPresent: thunder.length > 0,
    thunderStartHour: thunder.length ? hourOfPoint(thunder[0]) : null,
    fogPresent: fog.length > 0,
    fogEndHour: fog.length ? hourOfPoint(fog[fog.length - 1]) : null,
    maxGustKmh: maxGust,
    windPeakHour: maxGustIndex >= 0 ? hourOfPoint(day[maxGustIndex]) : null,
    notableWindHours: day.filter((p) => (p.windGustKmh ?? 0) >= city.wind.gustNotableKmh).length,
    minTemperatureC: minTemp,
    maxTemperatureC: maxTemp,
    maxTemperatureHour: maxTempPoint ? hourOfPoint(maxTempPoint) : null,
    meanCloudPct: clouds.length ? mean(clouds) : 0,
    brightFraction: day.filter((p) => (p.cloudCoverPct ?? 100) <= SCENE_THRESHOLDS.sky.brightMax).length / day.length,
    cloudHeavyFraction: day.filter((p) => (p.cloudCoverPct ?? 0) >= 70).length / day.length,
    earlyCloudPct: earlyCloud,
    lateCloudPct: lateCloud,
    cloudTrend: lateCloud - earlyCloud
  };
}

function normalizedWeights(signals: ModelDaySignal[]): Array<ModelDaySignal & { normalizedWeight: number }> {
  const total = signals.reduce((s, x) => s + Math.max(0, x.weight), 0);
  return signals.map((x) => ({ ...x, normalizedWeight: total > 0 ? Math.max(0, x.weight) / total : 1 / signals.length }));
}

function weightedSupport(signals: Array<ModelDaySignal & { normalizedWeight: number }>, predicate: (s: ModelDaySignal) => boolean): number {
  return signals.reduce((sum, signal) => sum + (predicate(signal) ? signal.normalizedWeight : 0), 0);
}

function scenarioSupport(city: CityConfig, dominant: DominantPhenomenon, signals: Array<ModelDaySignal & { normalizedWeight: number }>): number {
  switch (dominant) {
    case "THUNDER": return weightedSupport(signals, (s) => s.thunderPresent);
    case "RAIN": return weightedSupport(signals, (s) => s.rainPresent);
    case "SHOWERS": return weightedSupport(signals, (s) => s.showersPresent || s.rainPresent);
    case "FOG": return weightedSupport(signals, (s) => s.fogPresent);
    case "WIND": return weightedSupport(signals, (s) => s.maxGustKmh >= city.wind.gustNotableKmh);
    case "HEAT": return weightedSupport(signals, (s) => s.maxTemperatureC >= city.thermal.afternoonVeryHotFromC);
    case "COLD": return weightedSupport(signals, (s) => s.maxTemperatureC < city.thermal.morningMildBelowC);
    case "SKY_DEGRADATION": return weightedSupport(signals, (s) => s.cloudTrend >= 15);
    case "SKY_IMPROVEMENT": return weightedSupport(signals, (s) => s.cloudTrend <= -15);
    case "SUN": return weightedSupport(signals, (s) => s.brightFraction >= 0.60);
    case "CLOUD": return weightedSupport(signals, (s) => s.cloudHeavyFraction >= 0.50 || s.meanCloudPct >= 70);
    case "MIXED": return weightedSupport(signals, (s) => s.brightFraction < 0.60 && s.cloudHeavyFraction < 0.55 && s.meanCloudPct < 70);
  }
}

function span(values: Array<number | null>): number | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return valid.length >= 2 ? Math.max(...valid) - Math.min(...valid) : null;
}

function timingScore(range: number | null): number | null {
  if (range === null) return null;
  if (range <= 1) return 95;
  if (range <= 2) return 70;
  if (range <= 3) return 50;
  if (range <= 4) return 35;
  return 20;
}

function spreadScore(range: number | null, highMax: number, mediumMax: number): number | null {
  if (range === null) return null;
  if (range <= highMax) return 95;
  if (range <= mediumMax) return 65;
  return 30;
}

function rangePeriod(values: Array<number | null>): { startHour: number; endHour: number } | null {
  const valid = values.filter((v): v is number => v !== null && Number.isFinite(v));
  return valid.length ? { startHour: Math.min(...valid), endHour: Math.max(...valid) } : null;
}

function weightedScore(parts: Array<[number | null, number]>): number {
  const valid = parts.filter((p): p is [number, number] => p[0] !== null && Number.isFinite(p[0]));
  const weight = valid.reduce((s, [, w]) => s + w, 0);
  return weight ? valid.reduce((s, [v, w]) => s + v * w, 0) / weight : 100;
}

export function buildWeatherConfidence(
  city: CityConfig,
  date: string,
  forecasts: ModelForecast[],
  classification: DayClassification
): WeatherConfidence {
  const signals = forecasts.map((f) => signalForModel(city, date, f)).filter((x): x is ModelDaySignal => x !== null);
  if (!signals.length) {
    return {
      level: "WATCH", score: 0,
      agreements: { scenario: 0, timing: null, intensity: null, duration: null, thermal: 0 },
      mainUncertainty: "CLOUD_EVOLUTION", period: null, impact: "HIGH",
      availableModels: 0, availableWeight: 0,
      reasons: ["no_model_signal_available"]
    };
  }

  const weighted = normalizedWeights(signals);
  const availableWeight = clamp(signals.reduce((s, x) => s + Math.max(0, x.weight), 0), 0, 1);
  const scenario = Math.round(scenarioSupport(city, classification.dominantPhenomenon, weighted) * 100);
  const rainSupport = weightedSupport(weighted, (s) => s.rainPresent);
  const thunderSupport = weightedSupport(weighted, (s) => s.thunderPresent);
  const fogSupport = weightedSupport(weighted, (s) => s.fogPresent);
  const windSupport = weightedSupport(weighted, (s) => s.maxGustKmh >= city.wind.gustNotableKmh);

  let timing: number | null = null;
  let intensity: number | null = null;
  let duration: number | null = null;
  let timingPeriod: { startHour: number; endHour: number } | null = null;
  let timingUncertainty: WeatherUncertaintyType = "NONE";

  switch (classification.dominantPhenomenon) {
    case "THUNDER": {
      const supporters = signals.filter((s) => s.thunderPresent);
      timing = timingScore(span(supporters.map((s) => s.thunderStartHour)));
      timingPeriod = rangePeriod(supporters.map((s) => s.thunderStartHour));
      timingUncertainty = "THUNDER_PRESENCE";
      break;
    }
    case "RAIN":
    case "SHOWERS": {
      const supporters = signals.filter((s) => s.rainPresent);
      timing = timingScore(span(supporters.map((s) => s.rainStartHour)));
      timingPeriod = rangePeriod(supporters.map((s) => s.rainStartHour));
      timingUncertainty = "RAIN_START";
      intensity = spreadScore(span(supporters.map((s) => s.rainPeakMm)), 0.8, 2.5);
      duration = spreadScore(span(supporters.map((s) => s.rainHours)), 2, 4);
      break;
    }
    case "FOG": {
      const supporters = signals.filter((s) => s.fogPresent);
      timing = timingScore(span(supporters.map((s) => s.fogEndHour)));
      timingPeriod = rangePeriod(supporters.map((s) => s.fogEndHour));
      timingUncertainty = "FOG_END";
      duration = spreadScore(span(supporters.map((s) => s.fogEndHour)), 1, 3);
      break;
    }
    case "WIND": {
      timing = timingScore(span(signals.map((s) => s.windPeakHour)));
      timingPeriod = rangePeriod(signals.map((s) => s.windPeakHour));
      timingUncertainty = "WIND_PEAK";
      intensity = spreadScore(span(signals.map((s) => s.maxGustKmh)), 10, 20);
      duration = spreadScore(span(signals.map((s) => s.notableWindHours)), 2, 4);
      break;
    }
    case "HEAT":
    case "COLD": {
      timing = timingScore(span(signals.map((s) => s.maxTemperatureHour)));
      timingPeriod = rangePeriod(signals.map((s) => s.maxTemperatureHour));
      timingUncertainty = "TEMPERATURE_MAX";
      intensity = spreadScore(span(signals.map((s) => s.maxTemperatureC)), 2, 4);
      break;
    }
    case "SKY_DEGRADATION":
    case "SKY_IMPROVEMENT": {
      intensity = spreadScore(span(signals.map((s) => s.cloudTrend)), 15, 30);
      timingUncertainty = "CLOUD_EVOLUTION";
      break;
    }
    default: {
      intensity = spreadScore(span(signals.map((s) => s.meanCloudPct)), 15, 30);
      break;
    }
  }

  const thermal = spreadScore(span(signals.map((s) => s.maxTemperatureC)), 2, 4) ?? 100;
  let mainUncertainty: WeatherUncertaintyType = "NONE";
  let impact: WeatherConfidence["impact"] = "LOW";
  let level: WeatherConfidence["level"] = "STABLE";
  const reasons: string[] = [];

  const thunderSplit = thunderSupport >= 0.25 && thunderSupport < 0.75;
  const rainSplit = rainSupport >= 0.35 && rainSupport < 0.70;
  const fogSplit = fogSupport >= 0.35 && fogSupport < 0.70;
  const windSplit = windSupport >= 0.35 && windSupport < 0.70;

  if (thunderSplit) {
    level = "WATCH"; mainUncertainty = "THUNDER_PRESENCE"; impact = "HIGH"; reasons.push(`thunder_support_split:${Math.round(thunderSupport * 100)}`);
  } else if (rainSplit) {
    level = "WATCH"; mainUncertainty = "RAIN_PRESENCE"; impact = "HIGH"; reasons.push(`rain_support_split:${Math.round(rainSupport * 100)}`);
  } else if (scenario < 55) {
    level = "WATCH"; impact = "HIGH";
    mainUncertainty = classification.dominantPhenomenon === "FOG" ? "FOG_PRESENCE"
      : classification.dominantPhenomenon === "WIND" ? "WIND_INTENSITY"
      : classification.dominantPhenomenon === "RAIN" || classification.dominantPhenomenon === "SHOWERS" ? "RAIN_PRESENCE"
      : classification.dominantPhenomenon === "THUNDER" ? "THUNDER_PRESENCE"
      : "CLOUD_EVOLUTION";
    reasons.push(`scenario_agreement_low:${scenario}`);
  } else if (timing !== null && timing < 50) {
    level = "WATCH"; mainUncertainty = timingUncertainty; impact = "HIGH"; reasons.push(`timing_agreement_low:${timing}`);
  } else if (fogSplit && classification.dominantPhenomenon === "FOG") {
    level = "SOME_UNCERTAINTY"; mainUncertainty = "FOG_PRESENCE"; impact = "MEDIUM"; reasons.push(`fog_support_split:${Math.round(fogSupport * 100)}`);
  } else if (windSplit && classification.dominantPhenomenon === "WIND") {
    level = "SOME_UNCERTAINTY"; mainUncertainty = "WIND_INTENSITY"; impact = "MEDIUM"; reasons.push(`wind_support_split:${Math.round(windSupport * 100)}`);
  } else if ((timing !== null && timing < 80) || (intensity !== null && intensity < 60) || (duration !== null && duration < 60) || scenario < 75) {
    level = "SOME_UNCERTAINTY";
    impact = classification.dominantPhenomenon === "RAIN" || classification.dominantPhenomenon === "SHOWERS" || classification.dominantPhenomenon === "THUNDER" ? "HIGH" : "MEDIUM";
    if (timing !== null && timing < 80) mainUncertainty = timingUncertainty;
    else if ((classification.dominantPhenomenon === "RAIN" || classification.dominantPhenomenon === "SHOWERS") && intensity !== null && intensity < 60) mainUncertainty = "RAIN_INTENSITY";
    else if (classification.dominantPhenomenon === "WIND") mainUncertainty = "WIND_INTENSITY";
    else if (classification.dominantPhenomenon === "HEAT" || classification.dominantPhenomenon === "COLD") mainUncertainty = "TEMPERATURE_MAX";
    else mainUncertainty = "CLOUD_EVOLUTION";
    reasons.push("moderate_model_divergence");
  }

  if (signals.length === 3 && level === "STABLE") reasons.push("reduced_model_count:3");

  let score = weightedScore([
    [scenario, 0.40], [timing, 0.20], [intensity, 0.15], [duration, 0.10], [thermal, 0.15]
  ]);
  if (signals.length === 4) score -= 3;
  if (signals.length === 3) score -= 8;
  score = Math.round(clamp(score, 0, 100));
  if (level === "WATCH") score = Math.min(score, 44);
  if (level === "SOME_UNCERTAINTY") score = Math.min(score, 74);
  if (level === "STABLE") score = Math.max(score, 75);

  return {
    level,
    score,
    agreements: { scenario, timing, intensity, duration, thermal },
    mainUncertainty,
    period: mainUncertainty === "RAIN_START" || mainUncertainty === "FOG_END" || mainUncertainty === "WIND_PEAK" || mainUncertainty === "TEMPERATURE_MAX" || mainUncertainty === "THUNDER_PRESENCE" ? timingPeriod : null,
    impact,
    availableModels: signals.length,
    availableWeight,
    reasons
  };
}
