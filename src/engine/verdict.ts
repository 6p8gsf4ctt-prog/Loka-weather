import type { CityConfig, ConsensusHour, DisplayHour, LokaForecast, ModelForecast } from "../types";
import { DECISION_CONFIG } from "../config/decision";
import { hourOf, modelDailyRain } from "./consensus";
import { clamp, median, weightedSupport } from "./math";
import { analyzeDay, chooseScene } from "./classifier";
import { assertPublicLanguage, prolongedHeatLine, rainLine, subtitleFor, temperatureRange, thunderLine, windLine } from "./editorial";

// V24 shadow-mode imports. These do not replace the legacy scene decision.
import { buildDayProfile } from "./scenes24/profile";
import { chooseScene24 } from "./scenes24/classifier";

function pointsForDate(consensus: Map<string, ConsensusHour>, date: string): ConsensusHour[] {
  return [...consensus.values()].filter((p) => p.time.slice(0, 10) === date);
}

function nearestHour(points: ConsensusHour[], hour: number): ConsensusHour {
  return [...points].sort((a, b) => Math.abs(hourOf(a.time) - hour) - Math.abs(hourOf(b.time) - hour))[0];
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function cloudCondition(pct: number): string {
  if (pct < 20) return "soleil";
  if (pct < 40) return "peu nuageux";
  if (pct < 65) return "variable";
  if (pct < 85) return "nuageux";
  return "couvert";
}

function displayCondition(point: ConsensusHour): string {
  if (point.thunderstormSupport >= DECISION_CONFIG.thunder.mentionSupport) return "orage";
  if (point.precipitationSupport >= 0.50 && point.precipitationMm >= DECISION_CONFIG.rain.wetHourMinMm) {
    return point.showerSupport >= 0.45 ? "averse" : "pluie";
  }
  return cloudCondition(point.cloudCoverPct);
}

function skySummary(daytime: ConsensusHour[]): string {
  const morning = daytime.filter((p) => hourOf(p.time) <= 11);
  const afternoon = daytime.filter((p) => hourOf(p.time) >= 12 && hourOf(p.time) <= 18);
  const morningCloud = avg(morning.map((p) => p.cloudCoverPct));
  const afternoonCloud = avg(afternoon.map((p) => p.cloudCoverPct));
  const c = DECISION_CONFIG.sky;

  if (morningCloud <= c.sunnyCloudMaxPct && afternoonCloud <= c.sunnyCloudMaxPct) return "Soleil présent toute la journée.";
  if (morningCloud >= c.cloudyCloudMinPct && afternoonCloud >= c.cloudyCloudMinPct) return "Ciel nuageux toute la journée.";
  if (morningCloud <= c.sunnyCloudMaxPct && afternoonCloud >= c.cloudyCloudMinPct) return "Soleil le matin, ciel de plus en plus couvert l’après-midi.";
  if (morningCloud >= c.cloudyCloudMinPct && afternoonCloud <= c.sunnyCloudMaxPct) return "Ciel nuageux le matin, soleil plus présent l’après-midi.";
  return "Soleil et nuages se partagent la journée.";
}

function firstLastHour(points: ConsensusHour[]): [number | null, number | null] {
  if (!points.length) return [null, null];
  return [hourOf(points[0].time), Math.min(22, hourOf(points[points.length - 1].time) + 1)];
}

/**
 * V24 is deliberately fail-open while it is in shadow mode.
 *
 * Any error from DayProfile or the V24 classifier is captured into diagnostics
 * and NEVER prevents the legacy V0.6.6 forecast from being produced.
 */
function buildV24Shadow(city: CityConfig, day: ConsensusHour[]): {
  scene24: ReturnType<typeof chooseScene24> | null;
  dayProfile24: ReturnType<typeof buildDayProfile> | null;
  scene24Error: string | null;
} {
  try {
    const dayProfile24 = buildDayProfile(city, day);
    const scene24 = chooseScene24(dayProfile24);

    return {
      scene24,
      dayProfile24,
      scene24Error: null
    };
  } catch (error) {
    return {
      scene24: null,
      dayProfile24: null,
      scene24Error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function buildLokaForecast(city: CityConfig, date: string, consensus: Map<string, ConsensusHour>, forecasts: ModelForecast[]): LokaForecast {
  const day = pointsForDate(consensus, date);
  if (!day.length) throw new Error(`No consensus data for ${date}`);

  // Legacy production decision — remains authoritative in Bloc 5.
  const analysis = analyzeDay(city, day);
  const daytime = analysis.daytime;
  if (!daytime.length) throw new Error(`No daytime data for ${date}`);

  const { scene, decisionLog } = chooseScene(city, analysis);

  // V24 shadow calculation. Result is diagnostic-only.
  const v24Shadow = buildV24Shadow(city, day);

  const minTemp = Math.round(Math.min(...daytime.map((p) => p.temperatureC)));
  const maxTemp = Math.round(Math.max(...daytime.map((p) => p.temperatureC)));
  const tempSpread = median(daytime.map((p) => p.temperatureSpreadC));
  const maxTempPoint = [...daytime].sort((a, b) => b.temperatureC - a.temperatureC)[0];
  const hot = maxTemp >= city.thermal.afternoonHotFromC;
  const veryHot = maxTemp >= city.thermal.afternoonVeryHotFromC;

  const subtitle = subtitleFor({
    scene,
    hot,
    veryHot,
    sunnyFraction: analysis.sunnyFraction,
    rainStartHour: analysis.rainStartHour,
    thunderStartHour: analysis.thunderStartHour
  });

  const summaryLines: string[] = [temperatureRange(minTemp, maxTemp), skySummary(daytime)];
  const strongRain = analysis.maxRainMmPerHour >= DECISION_CONFIG.rain.strongFromMmPerHour;

  if (analysis.thunderStartHour !== null && analysis.thunderEndHour !== null && analysis.peakThunderSupport >= DECISION_CONFIG.thunder.mentionSupport) {
    summaryLines.push(thunderLine(
      analysis.thunderStartHour,
      analysis.thunderEndHour,
      strongRain,
      analysis.windStartHour !== null ? analysis.maxGustKmh : null
    ));
  } else if (analysis.rainStartHour !== null && analysis.rainEndHour !== null) {
    summaryLines.push(rainLine(analysis.rainStartHour, analysis.rainEndHour, analysis.maxRainMmPerHour));
  } else if (analysis.windStartHour !== null && analysis.windEndHour !== null) {
    summaryLines.push(windLine(analysis.windStartHour, analysis.windEndHour, analysis.maxGustKmh));
  } else if (analysis.hotHours.length >= DECISION_CONFIG.heat.prolongedHotMinHours) {
    const [start, end] = firstLastHour(analysis.hotHours);
    if (start !== null && end !== null) summaryLines.push(prolongedHeatLine(start, end, DECISION_CONFIG.heat.prolongedHotFromC));
  }

  const publicLines = summaryLines.slice(0, 3);
  assertPublicLanguage(subtitle);
  publicLines.forEach(assertPublicLanguage);

  const modelTotals = forecasts.map((f) => [modelDailyRain(f, date), f.weight] as [number, number]);
  const weightedProbGt1Mm = weightedSupport(modelTotals, 1.0);
  const confidenceRain = Math.round(clamp(100 * Math.max(weightedProbGt1Mm, 1 - weightedProbGt1Mm), 50, 98));
  const confidenceMain = Math.round(clamp(96 - tempSpread * 10 - Math.max(0, 5 - forecasts.length) * 5, 50, 98));

  const hourly: DisplayHour[] = city.displayHours.map((hour) => {
    const p = nearestHour(daytime, hour);
    return {
      hour,
      temperatureC: Math.round(p.temperatureC),
      condition: displayCondition(p),
      precipitationMm: Math.round(p.precipitationMm * 100) / 100
    };
  });

  const diagnostics = {
    editorialVersion: "0.4.0",
    decisionConfigVersion: DECISION_CONFIG.version,

    // Production/legacy contract remains untouched.
    scene,
    subtitle,
    summaryLines: publicLines,
    decisionLog,

    // Bloc 5 — V24 shadow diagnostics only.
    sceneClassifierProduction: "legacy6",
    sceneLegacy: {
      scene,
      score: decisionLog.selectedScore,
      version: decisionLog.version
    },
    scene24: v24Shadow.scene24,
    dayProfile24: v24Shadow.dayProfile24,
    scene24Error: v24Shadow.scene24Error,

    modelsReceived: forecasts.map((f) => f.modelId),
    modelCount: forecasts.length,
    maxTemperatureC: maxTemp,
    maxTemperatureHour: hourOf(maxTempPoint.time),
    maxGustKmh: Math.round(analysis.maxGustKmh * 10) / 10,
    peakThunderstormSupport: Math.round(analysis.peakThunderSupport * 1000) / 1000,
    peakPrecipitationSupport: Math.round(analysis.peakRainSupport * 1000) / 1000,
    medianTemperatureSpreadC: Math.round(tempSpread * 100) / 100
  };

  return {
    city: city.name,
    citySlug: city.slug,
    date,
    generatedAt: new Date().toISOString(),
    tempMaxC: maxTemp,
    tempMinC: minTemp,

    // IMPORTANT: still the legacy 6-scene result in Bloc 5.
    scene,

    subtitle,
    summaryLines: publicLines,
    decisionLog,
    mainVerdict: subtitle,
    rainVerdict: publicLines.join(" "),
    notableEvent: publicLines[2] ?? null,
    confidenceMain,
    confidenceRain,
    hourly,
    diagnostics
  };
}
