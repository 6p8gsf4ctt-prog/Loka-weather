import { SCENE24_CONFIG } from "../../config/scenes24";
import type { CityConfig, ConsensusHour, DayProfile, DaySkyState } from "../../types";
import { median, stddev } from "../math";

function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}

function mean(values: number[]): number {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function nullableMean(values: Array<number | null>): number | null {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  return valid.length ? mean(valid) : null;
}

function fraction(count: number, total: number): number {
  return total > 0 ? count / total : 0;
}

function maxConsecutive<T>(items: T[], predicate: (item: T) => boolean): number {
  let best = 0;
  let current = 0;
  for (const item of items) {
    if (predicate(item)) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }
  return best;
}

function countBlocks<T>(items: T[], predicate: (item: T) => boolean): number {
  let blocks = 0;
  let inside = false;
  for (const item of items) {
    const active = predicate(item);
    if (active && !inside) blocks++;
    inside = active;
  }
  return blocks;
}

function maxGapInsideEnvelope<T>(items: T[], predicate: (item: T) => boolean): number {
  const activeIndexes = items
    .map((item, index) => predicate(item) ? index : -1)
    .filter((index) => index >= 0);

  if (activeIndexes.length < 2) return 0;

  const first = activeIndexes[0];
  const last = activeIndexes[activeIndexes.length - 1];
  let best = 0;
  let current = 0;

  for (let i = first; i <= last; i++) {
    if (!predicate(items[i])) {
      current++;
      if (current > best) best = current;
    } else {
      current = 0;
    }
  }

  return best;
}

function countBreaksInsideEnvelope<T>(items: T[], predicate: (item: T) => boolean): number {
  const first = items.findIndex(predicate);
  if (first < 0) return 0;

  let last = -1;
  for (let i = items.length - 1; i >= 0; i--) {
    if (predicate(items[i])) {
      last = i;
      break;
    }
  }
  if (last <= first) return 0;

  let breaks = 0;
  let insideBreak = false;

  for (let i = first; i <= last; i++) {
    const active = predicate(items[i]);
    if (!active && !insideBreak) {
      breaks++;
      insideBreak = true;
    } else if (active) {
      insideBreak = false;
    }
  }

  return breaks;
}

function skyState(cloudCoverPct: number): DaySkyState {
  const s = SCENE24_CONFIG.skyState;
  if (cloudCoverPct <= s.clearMaxPct) return "CLEAR";
  if (cloudCoverPct <= s.brightMaxPct) return "BRIGHT";
  if (cloudCoverPct <= s.mixedMaxPct) return "MIXED";
  if (cloudCoverPct <= s.cloudyMaxPct) return "CLOUDY";
  return "DENSE";
}

function isBrightState(state: DaySkyState): boolean {
  return state === "CLEAR" || state === "BRIGHT";
}

function isCloudState(state: DaySkyState): boolean {
  return state === "CLOUDY" || state === "DENSE";
}

function isWet(point: ConsensusHour): boolean {
  return (
    point.precipitationMm >= SCENE24_CONFIG.rain.wetHourMinMm &&
    point.precipitationSupport >= 0.50
  ) || point.rainCodeSupport >= 0.55;
}

function isShower(point: ConsensusHour): boolean {
  return isWet(point) && point.showerSupport >= 0.45;
}

function isThunder(point: ConsensusHour): boolean {
  return point.thunderstormSupport >= SCENE24_CONFIG.thunder.robustSupport;
}

function isFog(point: ConsensusHour): boolean {
  return point.fogSupport >= SCENE24_CONFIG.fog.fog.supportPeakMin;
}

function isDenseFog(point: ConsensusHour): boolean {
  return point.fogSupport >= SCENE24_CONFIG.fog.denseFog.supportPeakMin;
}

function cloudMean(points: ConsensusHour[]): number {
  return mean(points.map((point) => point.cloudCoverPct));
}

function brightFraction(points: ConsensusHour[]): number {
  if (!points.length) return 0;
  return fraction(
    points.filter((point) => isBrightState(skyState(point.cloudCoverPct))).length,
    points.length
  );
}

function trendStrength(cloudTrend: number): DayProfile["evolution"]["trendStrength"] {
  const magnitude = Math.abs(cloudTrend);
  const t = SCENE24_CONFIG.trend;

  if (magnitude < t.weakMinPoints) return "STABLE";
  if (magnitude < t.moderateMinPoints) return "WEAK";
  if (magnitude < t.strongMinPoints) return "MODERATE";
  return "STRONG";
}

function trendDirectionDelta(a: number, b: number): -1 | 0 | 1 {
  const tolerance = SCENE24_CONFIG.trend.directionTolerancePoints;
  const delta = b - a;
  if (delta > tolerance) return 1;
  if (delta < -tolerance) return -1;
  return 0;
}

function countTrendReversals(blockMeans: number[]): number {
  const directions: Array<-1 | 0 | 1> = [];

  for (let i = 1; i < blockMeans.length; i++) {
    const direction = trendDirectionDelta(blockMeans[i - 1], blockMeans[i]);
    if (direction !== 0) directions.push(direction);
  }

  let reversals = 0;
  for (let i = 1; i < directions.length; i++) {
    if (directions[i] !== directions[i - 1]) reversals++;
  }
  return reversals;
}

type StructuralState =
  | "CLEAR"
  | "BRIGHT"
  | "MIXED"
  | "CLOUDY"
  | "DENSE"
  | "RAIN"
  | "SHOWER"
  | "THUNDER"
  | "FOG"
  | "WIND";

function structuralState(
  city: CityConfig,
  point: ConsensusHour
): StructuralState {
  if (isThunder(point)) return "THUNDER";
  if (isDenseFog(point) || isFog(point)) return "FOG";
  if (isShower(point)) return "SHOWER";
  if (isWet(point)) return "RAIN";

  // Wind becomes a structural hourly state only when the sky itself is not
  // already enough to describe a stronger hydrometeor/visibility event.
  if (point.windGustKmh >= city.wind.gustNotableKmh) return "WIND";

  return skyState(point.cloudCoverPct);
}

function countMeaningfulTransitions(
  city: CityConfig,
  points: ConsensusHour[]
): { transitions: number; distinctStateCount: number } {
  if (!points.length) return { transitions: 0, distinctStateCount: 0 };

  const rawStates = points.map((point) => structuralState(city, point));

  // Collapse adjacent duplicates. This intentionally counts meteorological
  // state changes rather than tiny numerical cloud-cover fluctuations.
  const collapsed = rawStates.filter((state, index) => index === 0 || state !== rawStates[index - 1]);

  return {
    transitions: Math.max(0, collapsed.length - 1),
    distinctStateCount: new Set(collapsed).size
  };
}

function uncertainWeather(points: ConsensusHour[]): boolean {
  if (!points.length) return false;

  // "Uncertain" means an important phenomenon has material but non-robust
  // ensemble support, not simply that clouds fluctuate around a threshold.
  const uncertainHours = points.filter((point) => {
    const rainUncertain =
      point.precipitationMm >= SCENE24_CONFIG.rain.wetHourMinMm &&
      point.precipitationSupport >= 0.30 &&
      point.precipitationSupport < 0.55;

    const thunderUncertain =
      point.thunderstormSupport >= 0.35 &&
      point.thunderstormSupport < SCENE24_CONFIG.thunder.robustSupport;

    const fogUncertain =
      point.fogSupport >= 0.35 &&
      point.fogSupport < SCENE24_CONFIG.fog.fog.supportPeakMin;

    return rainUncertain || thunderUncertain || fogUncertain;
  }).length;

  return uncertainHours >= 2;
}

/**
 * Build the neutral, scene-independent daily profile used by the future
 * 24-scene classifier.
 *
 * Shadow-mode guarantee:
 * - this function has no side effects;
 * - it does not call the legacy classifier;
 * - nothing in production imports it yet;
 * - it cannot change forecast.scene until a later integration block.
 */
export function buildDayProfile(
  city: CityConfig,
  points: ConsensusHour[]
): DayProfile {
  const daytime = points
    .filter((point) => {
      const hour = hourOf(point.time);
      return hour >= SCENE24_CONFIG.daytime.startHour &&
        hour <= SCENE24_CONFIG.daytime.endHour;
    })
    .sort((a, b) => a.time.localeCompare(b.time));

  if (!daytime.length) {
    throw new Error("V24 DayProfile: no points in 07h–21h window");
  }

  const states = daytime.map((point) => skyState(point.cloudCoverPct));
  const total = daytime.length;

  const clearCount = states.filter((state) => state === "CLEAR").length;
  const brightCount = states.filter((state) => state === "BRIGHT").length;
  const mixedCount = states.filter((state) => state === "MIXED").length;
  const cloudyCount = states.filter((state) => state === "CLOUDY").length;
  const denseCount = states.filter((state) => state === "DENSE").length;

  const clouds = daytime.map((point) => point.cloudCoverPct);

  const lowMeanPct = nullableMean(daytime.map((point) => point.cloudCoverLowPct));
  const midMeanPct = nullableMean(daytime.map((point) => point.cloudCoverMidPct));
  const highMeanPct = nullableMean(daytime.map((point) => point.cloudCoverHighPct));

  const highLayerValues = daytime
    .map((point) => point.cloudCoverHighPct)
    .filter((value): value is number => value !== null && Number.isFinite(value));

  const highFractionAbove70 = highLayerValues.length
    ? fraction(highLayerValues.filter((value) => value >= 70).length, highLayerValues.length)
    : null;

  const wet = (point: ConsensusHour) => isWet(point);
  const shower = (point: ConsensusHour) => isShower(point);

  const rainHours = daytime.filter(wet).length;
  const rainIndexes = daytime
    .map((point, index) => wet(point) ? index : -1)
    .filter((index) => index >= 0);

  const rainEnvelopeHours = rainIndexes.length
    ? rainIndexes[rainIndexes.length - 1] - rainIndexes[0] + 1
    : 0;

  const rainContinuityRatio = rainEnvelopeHours
    ? rainHours / rainEnvelopeHours
    : 0;

  const rainTotalMm = daytime.reduce((sum, point) => sum + point.precipitationMm, 0);
  const maxRainMmPerHour = Math.max(...daytime.map((point) => point.precipitationMm));

  const showerHours = daytime.filter(shower).length;
  const convectiveRainHours = daytime.filter(
    (point) => wet(point) && (point.showerSupport >= 0.45 || isThunder(point))
  ).length;

  const notableWind = (point: ConsensusHour) =>
    point.windGustKmh >= city.wind.gustNotableKmh;

  const strongWind = (point: ConsensusHour) =>
    point.windGustKmh >= city.wind.gustStrongKmh;

  const brightWindOverlap = daytime.filter(
    (point) => notableWind(point) && isBrightState(skyState(point.cloudCoverPct))
  ).length;

  const mixedWindOverlap = daytime.filter(
    (point) => notableWind(point) && skyState(point.cloudCoverPct) === "MIXED"
  ).length;

  const cloudWindOverlap = daytime.filter(
    (point) => notableWind(point) && point.cloudCoverPct >= 60
  ).length;

  const rainWindOverlap = daytime.filter(
    (point) => notableWind(point) && wet(point)
  ).length;

  const fogPoints = daytime.filter(isFog);
  const denseFogPoints = daytime.filter(isDenseFog);

  const morning = daytime.filter(
    (point) => hourOf(point.time) <= SCENE24_CONFIG.daytime.morningEndHour
  );
  const afternoon = daytime.filter((point) => {
    const hour = hourOf(point.time);
    return hour >= SCENE24_CONFIG.daytime.afternoonStartHour &&
      hour <= SCENE24_CONFIG.daytime.afternoonEndHour;
  });
  const evening = daytime.filter(
    (point) => hourOf(point.time) >= SCENE24_CONFIG.daytime.eveningStartHour
  );

  const meanCloudMorning = cloudMean(morning);
  const meanCloudAfternoon = cloudMean(afternoon);
  const meanCloudEvening = cloudMean(evening);
  const cloudTrend = meanCloudEvening - meanCloudMorning;

  const evolutionMeans = [
    meanCloudMorning,
    meanCloudAfternoon,
    meanCloudEvening
  ];

  const transitions = countMeaningfulTransitions(city, daytime);

  return {
    period: {
      startHour: SCENE24_CONFIG.daytime.startHour,
      endHour: SCENE24_CONFIG.daytime.endHour
    },

    light: {
      clearFraction: fraction(clearCount, total),
      brightFraction: fraction(brightCount, total),
      mixedFraction: fraction(mixedCount, total),
      cloudyFraction: fraction(cloudyCount, total),
      denseFraction: fraction(denseCount, total),
      brightBlockMaxHours: maxConsecutive(states, isBrightState),
      cloudBlockMaxHours: maxConsecutive(states, isCloudState)
    },

    cloud: {
      meanCoverPct: mean(clouds),
      medianCoverPct: median(clouds),
      minCoverPct: Math.min(...clouds),
      maxCoverPct: Math.max(...clouds),
      stdDevPct: stddev(clouds),
      lowMeanPct,
      midMeanPct,
      highMeanPct,
      highFractionAbove70,
      denseBlockMaxHours: maxConsecutive(states, (state) => state === "DENSE")
    },

    rain: {
      rainHours,
      rainBlockMaxHours: maxConsecutive(daytime, wet),
      rainBreakCount: countBreaksInsideEnvelope(daytime, wet),
      dryGapMaxHours: maxGapInsideEnvelope(daytime, wet),
      rainTotalMm,
      maxRainMmPerHour,
      continuityRatio: rainContinuityRatio,
      showerHours,
      showerBlockCount: countBlocks(daytime, shower),
      convectiveRainFraction: rainHours ? convectiveRainHours / rainHours : 0
    },

    wind: {
      notableHours: daytime.filter(notableWind).length,
      strongHours: daytime.filter(strongWind).length,
      maxGustKmh: Math.max(...daytime.map((point) => point.windGustKmh)),
      blockMaxHours: maxConsecutive(daytime, notableWind),
      strongBlockMaxHours: maxConsecutive(daytime, strongWind),
      brightOverlapHours: brightWindOverlap,
      mixedOverlapHours: mixedWindOverlap,
      cloudOverlapHours: cloudWindOverlap,
      rainOverlapHours: rainWindOverlap
    },

    convection: {
      thunderHours: daytime.filter(isThunder).length,
      peakThunderSupport: Math.max(...daytime.map((point) => point.thunderstormSupport))
    },

    visibility: {
      fogHours: fogPoints.length,
      denseFogHours: denseFogPoints.length,
      fogBlockMaxHours: maxConsecutive(daytime, isFog),
      denseFogBlockMaxHours: maxConsecutive(daytime, isDenseFog),
      fogSupportPeak: Math.max(...daytime.map((point) => point.fogSupport)),
      fogSupportMean: mean(daytime.map((point) => point.fogSupport)),
      // V1 does not fetch physical visibility yet. Keep absence explicit.
      visibilityMinKm: null
    },

    evolution: {
      meanCloudMorning,
      meanCloudAfternoon,
      meanCloudEvening,
      brightFractionMorning: brightFraction(morning),
      brightFractionAfternoon: brightFraction(afternoon),
      brightFractionEvening: brightFraction(evening),
      cloudTrend,
      trendStrength: trendStrength(cloudTrend),
      reversals: countTrendReversals(evolutionMeans)
    },

    structure: {
      meaningfulTransitions: transitions.transitions,
      uncertainWeather: uncertainWeather(daytime),
      distinctStateCount: transitions.distinctStateCount
    }
  };
}
