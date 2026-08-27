import { SCENE_THRESHOLDS } from "../config/scenes24";
import type {
  ChangeLevel,
  CityConfig,
  ConsensusHour,
  DayClassification,
  DayEvolution,
  DayProfileV2,
  DominantPhenomenon,
  EvolutionStrength
} from "../types";
import { clamp, hourOf } from "./math";

function isWet(p: ConsensusHour): boolean {
  return (p.precipitationMm >= SCENE_THRESHOLDS.rain.wetHourMinMm && p.precipitationSupport >= SCENE_THRESHOLDS.rain.supportMin)
    || p.rainCodeSupport >= SCENE_THRESHOLDS.rain.supportMin;
}

function structuralState(p: ConsensusHour, city: CityConfig): string {
  if (p.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin) return "THUNDER";
  if (p.fogSupport >= SCENE_THRESHOLDS.fog.supportMin) return "FOG";
  if (isWet(p)) return p.showerSupport >= 0.4 ? "SHOWER" : "RAIN";
  if (p.windGustKmh >= city.wind.gustNotableKmh) return "WIND";
  if (p.cloudCoverPct <= SCENE_THRESHOLDS.sky.clearMax) return "CLEAR";
  if (p.cloudCoverPct <= SCENE_THRESHOLDS.sky.brightMax) return "BRIGHT";
  if (p.cloudCoverPct <= SCENE_THRESHOLDS.sky.mixedMax) return "MIXED";
  if (p.cloudCoverPct <= SCENE_THRESHOLDS.sky.cloudyMax) return "CLOUDY";
  return "DENSE";
}

function daylightPoints(profile: DayProfileV2, date: string, points: ConsensusHour[]): ConsensusHour[] {
  return points
    .filter((p) => p.time.slice(0, 10) === date)
    .filter((p) => hourOf(p.time) >= profile.period.startHour && hourOf(p.time) <= profile.period.endHour)
    .sort((a, b) => a.time.localeCompare(b.time));
}

interface Run { start: number; end: number; }
function runs(values: boolean[]): Run[] {
  const out: Run[] = [];
  let start = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i] && start < 0) start = i;
    if (start >= 0 && (!values[i] || i === values.length - 1)) {
      const end = values[i] ? i : i - 1;
      out.push({ start, end });
      start = -1;
    }
  }
  return out;
}

function bestRun(day: ConsensusHour[], mask: boolean[], peakValue: (p: ConsensusHour) => number): Run | null {
  const candidates = runs(mask);
  if (!candidates.length) return null;
  return candidates
    .map((run) => ({
      run,
      score: day.slice(run.start, run.end + 1).reduce((s, p) => s + peakValue(p), 0)
    }))
    .sort((a, b) => b.score - a.score || (b.run.end - b.run.start) - (a.run.end - a.run.start))[0].run;
}

function runPeriod(day: ConsensusHour[], run: Run | null): { startHour: number; endHour: number } | null {
  if (!run) return null;
  return { startHour: hourOf(day[run.start].time), endHour: hourOf(day[run.end].time) };
}

function transitionAroundStart(day: ConsensusHour[], run: Run): DayClassification["transition"] | null {
  if (run.start < 2) return null;
  return {
    startHour: hourOf(day[Math.max(0, run.start - 2)].time),
    peakHour: hourOf(day[run.start].time),
    endHour: hourOf(day[Math.min(day.length - 1, run.start + 1)].time)
  };
}

function transitionAroundEnd(day: ConsensusHour[], run: Run): DayClassification["transition"] | null {
  if (run.end >= day.length - 2) return null;
  return {
    startHour: hourOf(day[Math.max(0, run.end - 1)].time),
    peakHour: hourOf(day[Math.min(day.length - 1, run.end + 1)].time),
    endHour: hourOf(day[Math.min(day.length - 1, run.end + 2)].time)
  };
}

function skyTransition(profile: DayProfileV2, day: ConsensusHour[]): DayClassification["transition"] | null {
  if (!day.length || Math.abs(profile.evolution.cloudTrend) < SCENE_THRESHOLDS.trend.moderateCloudDelta) return null;
  const midpoint = (profile.evolution.earlyCloudPct + profile.evolution.lateCloudPct) / 2;
  const degrading = profile.evolution.cloudTrend > 0;
  const idx = day.findIndex((p) => degrading ? p.cloudCoverPct >= midpoint : p.cloudCoverPct <= midpoint);
  if (idx <= 0) return null;
  return {
    startHour: hourOf(day[Math.max(0, idx - 1)].time),
    peakHour: hourOf(day[idx].time),
    endHour: hourOf(day[Math.min(day.length - 1, idx + 1)].time)
  };
}

function isSustainedRain(profile: DayProfileV2): boolean {
  const r = profile.rain;
  return r.rainHours >= SCENE_THRESHOLDS.rain.sustainedMinHours
    && r.rainBlockMaxHours >= SCENE_THRESHOLDS.rain.sustainedBlockMinHours
    && r.continuityRatio >= SCENE_THRESHOLDS.rain.sustainedContinuityMin;
}

function isStructuringShowers(profile: DayProfileV2): boolean {
  const r = profile.rain;
  return r.showerHours >= SCENE_THRESHOLDS.rain.showersMinHours
    && r.rainBreakCount >= SCENE_THRESHOLDS.rain.showersMinBreaks
    && r.convectiveRainFraction >= SCENE_THRESHOLDS.rain.showersConvectiveFractionMin;
}

/** Editorial impact is intentionally broader than the scene-12 sustained-rain doctrine. */
function isImpactfulRain(profile: DayProfileV2): boolean {
  if (isSustainedRain(profile)) return true;
  const r = profile.rain;
  return r.rainHours >= 3
    && r.rainBlockMaxHours >= 2
    && (r.rainTotalMm >= 0.8 || r.maxRainMmPerHour >= 0.6);
}

function strongWindIsStructuring(city: CityConfig, profile: DayProfileV2): boolean {
  return profile.wind.strongHours >= 2
    || profile.wind.strongBlockMaxHours >= 2
    || (profile.wind.maxGustKmh >= city.wind.gustStrongKmh + 10 && profile.wind.strongHours >= 1);
}

function heatIsStructuring(city: CityConfig, day: ConsensusHour[]): boolean {
  const threshold = city.thermal.afternoonVeryHotFromC;
  return day.filter((p) => p.temperatureC >= threshold).length >= 2;
}

function coldIsStructuring(city: CityConfig, day: ConsensusHour[]): boolean {
  if (!day.length) return false;
  const maxTemperatureC = Math.max(...day.map((p) => p.temperatureC));
  return maxTemperatureC < city.thermal.morningMildBelowC;
}

function skyFallback(profile: DayProfileV2): DominantPhenomenon {
  const cloudHeavy = profile.light.cloudyFraction + profile.light.denseFraction;
  if (profile.light.brightFraction >= 0.6) return "SUN";
  if (cloudHeavy >= 0.55 || profile.cloud.meanCoverPct >= 70) return "CLOUD";
  return "MIXED";
}

function dominantPhenomenon(city: CityConfig, profile: DayProfileV2, day: ConsensusHour[]): DominantPhenomenon {
  if (profile.convection.thunderHours >= 1 && profile.convection.peakThunderSupport >= SCENE_THRESHOLDS.thunder.supportMin) return "THUNDER";
  if (isStructuringShowers(profile) && !isSustainedRain(profile)) return "SHOWERS";
  if (isImpactfulRain(profile)) return "RAIN";
  if (profile.visibility.denseFogHours >= SCENE_THRESHOLDS.fog.denseMinHours) return "FOG";
  if (strongWindIsStructuring(city, profile)) return "WIND";
  if (heatIsStructuring(city, day)) return "HEAT";
  if (coldIsStructuring(city, day)) return "COLD";
  if (profile.evolution.cloudTrend >= SCENE_THRESHOLDS.trend.moderateCloudDelta && profile.evolution.reversals <= 1) return "SKY_DEGRADATION";
  if (profile.evolution.cloudTrend <= -SCENE_THRESHOLDS.trend.moderateCloudDelta && profile.evolution.reversals <= 1) return "SKY_IMPROVEMENT";
  return skyFallback(profile);
}

function secondaryPhenomenon(
  city: CityConfig,
  profile: DayProfileV2,
  day: ConsensusHour[],
  dominant: DominantPhenomenon
): DominantPhenomenon | "NONE" {
  const candidates: Array<[DominantPhenomenon, boolean]> = [
    ["THUNDER", profile.convection.thunderHours >= 1 && profile.convection.peakThunderSupport >= SCENE_THRESHOLDS.thunder.supportMin],
    ["SHOWERS", isStructuringShowers(profile) && !isSustainedRain(profile)],
    ["RAIN", isImpactfulRain(profile)],
    ["FOG", profile.visibility.denseFogHours >= SCENE_THRESHOLDS.fog.denseMinHours],
    ["WIND", profile.wind.notableHours >= 2 && profile.wind.maxGustKmh >= city.wind.gustNotableKmh],
    ["HEAT", heatIsStructuring(city, day)],
    ["COLD", coldIsStructuring(city, day)],
    ["SKY_DEGRADATION", profile.evolution.cloudTrend >= SCENE_THRESHOLDS.trend.moderateCloudDelta && profile.evolution.reversals <= 1],
    ["SKY_IMPROVEMENT", profile.evolution.cloudTrend <= -SCENE_THRESHOLDS.trend.moderateCloudDelta && profile.evolution.reversals <= 1],
    ["SUN", profile.light.brightFraction >= 0.6],
    ["CLOUD", profile.light.cloudyFraction + profile.light.denseFraction >= 0.55]
  ];
  return candidates.find(([phenomenon, eligible]) => eligible && phenomenon !== dominant)?.[0] ?? "NONE";
}

function rainTwoPhase(day: ConsensusHour[]): { kind: "ARRIVAL" | "CLEARING"; run: Run } | null {
  const wet = day.map(isWet);
  const wetRuns = runs(wet).filter((r) => r.end - r.start + 1 >= 2);
  if (!wetRuns.length || day.length < 7) return null;

  for (const run of wetRuns) {
    if (run.start >= 3) {
      const left = wet.slice(0, run.start);
      const right = wet.slice(run.start);
      const leftWet = left.filter(Boolean).length / Math.max(1, left.length);
      const rightWet = right.filter(Boolean).length / Math.max(1, right.length);
      if (leftWet <= 0.2 && rightWet >= 0.5) return { kind: "ARRIVAL", run };
    }
  }
  for (let i = wetRuns.length - 1; i >= 0; i--) {
    const run = wetRuns[i];
    if (run.end <= day.length - 4) {
      const left = wet.slice(0, run.end + 1);
      const right = wet.slice(run.end + 1);
      const leftWet = left.filter(Boolean).length / Math.max(1, left.length);
      const rightWet = right.filter(Boolean).length / Math.max(1, right.length);
      if (leftWet >= 0.5 && rightWet <= 0.2) return { kind: "CLEARING", run };
    }
  }
  return null;
}

function classifyEvolution(profile: DayProfileV2, day: ConsensusHour[]): { evolution: DayEvolution; twoPhase: ReturnType<typeof rainTwoPhase> } {
  if (profile.rain.showerBlockCount >= 2 || isStructuringShowers(profile)) return { evolution: "INTERMITTENT", twoPhase: null };
  const twoPhase = rainTwoPhase(day);
  if (twoPhase) return { evolution: "TWO_PHASES", twoPhase };
  if (profile.evolution.cloudTrend <= -SCENE_THRESHOLDS.trend.moderateCloudDelta && profile.evolution.reversals <= 1) return { evolution: "IMPROVING", twoPhase: null };
  if (profile.evolution.cloudTrend >= SCENE_THRESHOLDS.trend.moderateCloudDelta && profile.evolution.reversals <= 1) return { evolution: "DEGRADING", twoPhase: null };
  if (profile.structure.meaningfulTransitions >= SCENE_THRESHOLDS.instability.minTransitions
      || profile.structure.distinctStateCount >= SCENE_THRESHOLDS.instability.minDistinctStates
      || profile.evolution.reversals >= SCENE_THRESHOLDS.instability.minReversals) {
    return { evolution: "VARIABLE", twoPhase: null };
  }
  return { evolution: "STABLE", twoPhase: null };
}

function primaryEvent(
  city: CityConfig,
  profile: DayProfileV2,
  day: ConsensusHour[],
  dominant: DominantPhenomenon,
  twoPhase: ReturnType<typeof rainTwoPhase>
): { transition: DayClassification["transition"] | null; keyPeriod: DayClassification["keyPeriod"] } {
  const thunderRun = bestRun(day, day.map((p) => p.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin), (p) => p.thunderstormSupport);
  const wetRun = bestRun(day, day.map(isWet), (p) => p.precipitationMm + p.precipitationSupport);
  const fogRun = bestRun(day, day.map((p) => p.fogSupport >= SCENE_THRESHOLDS.fog.supportMin), (p) => p.fogSupport);
  const windRun = bestRun(day, day.map((p) => p.windGustKmh >= city.wind.gustNotableKmh), (p) => p.windGustKmh / 100);
  const hotRun = bestRun(day, day.map((p) => p.temperatureC >= city.thermal.afternoonVeryHotFromC), (p) => p.temperatureC / 50);

  if (dominant === "THUNDER" && thunderRun) return { transition: transitionAroundStart(day, thunderRun) ?? transitionAroundEnd(day, thunderRun), keyPeriod: runPeriod(day, thunderRun) };
  if ((dominant === "RAIN" || dominant === "SHOWERS") && wetRun) {
    const transition = twoPhase?.kind === "CLEARING" ? transitionAroundEnd(day, twoPhase.run) : transitionAroundStart(day, twoPhase?.run ?? wetRun);
    return { transition, keyPeriod: runPeriod(day, wetRun) };
  }
  if (dominant === "FOG" && fogRun) return { transition: transitionAroundEnd(day, fogRun) ?? transitionAroundStart(day, fogRun), keyPeriod: runPeriod(day, fogRun) };
  if (dominant === "WIND" && windRun) return { transition: transitionAroundStart(day, windRun) ?? transitionAroundEnd(day, windRun), keyPeriod: runPeriod(day, windRun) };
  if (dominant === "HEAT" && hotRun) return { transition: null, keyPeriod: runPeriod(day, hotRun) };
  if (dominant === "SKY_DEGRADATION" || dominant === "SKY_IMPROVEMENT") {
    const transition = skyTransition(profile, day);
    const keyPeriod = transition?.startHour !== null && transition?.startHour !== undefined && transition.endHour !== null
      ? { startHour: transition.startHour, endHour: transition.endHour }
      : null;
    return { transition, keyPeriod };
  }
  if (twoPhase) {
    const transition = twoPhase.kind === "CLEARING" ? transitionAroundEnd(day, twoPhase.run) : transitionAroundStart(day, twoPhase.run);
    return { transition, keyPeriod: runPeriod(day, twoPhase.run) };
  }
  return { transition: skyTransition(profile, day), keyPeriod: null };
}

function changeScore(profile: DayProfileV2, hasMajorTransition: boolean): number {
  const transitions = Math.min(1, profile.structure.meaningfulTransitions / 6) * 35;
  const distinct = Math.min(1, Math.max(0, profile.structure.distinctStateCount - 1) / 4) * 20;
  const trend = Math.min(1, Math.abs(profile.evolution.cloudTrend) / 50) * 20;
  const reversals = Math.min(1, profile.evolution.reversals / 3) * 15;
  const major = hasMajorTransition ? 10 : 0;
  return Math.round(clamp(transitions + distinct + trend + reversals + major, 0, 100));
}

function changeLevel(score: number): ChangeLevel {
  if (score <= 30) return "LOW";
  if (score <= 65) return "MODERATE";
  return "HIGH";
}

function evolutionStrength(evolution: DayEvolution, score: number, profile: DayProfileV2): EvolutionStrength {
  if (evolution === "STABLE") return "NONE";
  if (evolution === "TWO_PHASES" || evolution === "INTERMITTENT") return score >= 55 ? "STRONG" : "MODERATE";
  if (profile.evolution.trendStrength === "STRONG" || score >= 66) return "STRONG";
  if (profile.evolution.trendStrength === "MODERATE" || score >= 40) return "MODERATE";
  return "WEAK";
}

export function buildDayClassification(
  city: CityConfig,
  date: string,
  profile: DayProfileV2,
  allPoints: ConsensusHour[]
): DayClassification {
  const day = daylightPoints(profile, date, allPoints);
  if (!day.length) throw new Error(`day_classification_no_points:${date}`);

  const dominant = dominantPhenomenon(city, profile, day);
  const secondary = secondaryPhenomenon(city, profile, day, dominant);
  const evolutionResult = classifyEvolution(profile, day);
  const event = primaryEvent(city, profile, day, dominant, evolutionResult.twoPhase);
  const score = changeScore(profile, event.transition !== null);

  return {
    version: "3.0",
    dominantPhenomenon: dominant,
    secondaryPhenomenon: secondary,
    evolution: evolutionResult.evolution,
    evolutionStrength: evolutionStrength(evolutionResult.evolution, score, profile),
    changeLevel: changeLevel(score),
    changeScore: score,
    transition: event.transition ?? { startHour: null, peakHour: null, endHour: null },
    keyPeriod: event.keyPeriod
  };
}
