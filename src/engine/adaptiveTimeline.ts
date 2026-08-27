import { SCENE_THRESHOLDS } from "../config/scenes24";
import type {
  AdaptiveTimeline,
  CityConfig,
  ConsensusHour,
  DayClassification,
  HourlyCondition,
  TimelinePoint,
  TimelinePointImportance,
  TimelinePointReason,
  WeatherConfidence
} from "../types";
import { hourOf } from "./math";

interface Candidate {
  hour: number;
  priority: number;
  importance: TimelinePointImportance;
  reason: TimelinePointReason;
}

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

function conditionForPoint(p: ConsensusHour): HourlyCondition {
  if (p.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin) return "orage";
  if (p.fogSupport >= 0.45) return "brouillard";
  if (isWet(p)) return p.showerSupport >= 0.4 ? "averse" : "pluie";
  if (p.windGustKmh >= 70 && p.cloudCoverPct < 70) return "vent";
  if (p.cloudCoverPct < 20) return "soleil";
  if (p.cloudCoverPct < 40) return "peu nuageux";
  if (p.cloudCoverPct < 65) return "variable";
  if (p.cloudCoverPct < 85) return "nuageux";
  return "couvert";
}

function dayPoints(date: string, points: ConsensusHour[]): ConsensusHour[] {
  return points
    .filter((p) => p.time.slice(0, 10) === date)
    .filter((p) => hourOf(p.time) >= 6 && hourOf(p.time) <= 22)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function addCandidate(map: Map<number, Candidate>, candidate: Candidate, available: Set<number>): void {
  if (!available.has(candidate.hour)) return;
  const current = map.get(candidate.hour);
  if (!current || candidate.priority > current.priority) map.set(candidate.hour, candidate);
}

interface Run { start: number; end: number; }
function runs(values: boolean[]): Run[] {
  const out: Run[] = [];
  let start = -1;
  for (let i = 0; i < values.length; i++) {
    if (values[i] && start < 0) start = i;
    if (start >= 0 && (!values[i] || i === values.length - 1)) {
      out.push({ start, end: values[i] ? i : i - 1 });
      start = -1;
    }
  }
  return out;
}

function modeFor(classification: DayClassification, confidence: WeatherConfidence): AdaptiveTimeline["mode"] {
  const eventDominants = new Set(["THUNDER", "RAIN", "SHOWERS", "FOG", "WIND"]);
  if ((eventDominants.has(classification.dominantPhenomenon) && classification.transition.peakHour !== null)
      || (confidence.period && confidence.impact === "HIGH")) return "EVENT_FOCUSED";
  if (classification.changeLevel === "HIGH") return "DENSE";
  if (classification.changeLevel === "MODERATE") return "STANDARD";
  return "STABLE";
}

function limits(mode: AdaptiveTimeline["mode"]): { target: number; max: number } {
  if (mode === "STABLE") return { target: 5, max: 5 };
  if (mode === "STANDARD") return { target: 6, max: 8 };
  if (mode === "EVENT_FOCUSED") return { target: 7, max: 9 };
  return { target: 8, max: 9 };
}

function trimCandidates(candidates: Candidate[], max: number): Candidate[] {
  if (candidates.length <= max) return candidates;
  const mandatory = candidates.filter((c) => c.reason === "DAY_START" || c.reason === "DAY_END" || c.importance === "KEY");
  const mandatoryHours = new Set(mandatory.map((c) => c.hour));
  const remaining = candidates.filter((c) => !mandatoryHours.has(c.hour)).sort((a, b) => b.priority - a.priority || a.hour - b.hour);
  const selected = [...mandatory];
  for (const candidate of remaining) {
    if (selected.length >= max) break;
    selected.push(candidate);
  }
  if (selected.length > max) return selected.sort((a, b) => b.priority - a.priority || a.hour - b.hour).slice(0, max);
  return selected;
}

function minDistance(hour: number, selected: Set<number>): number {
  if (!selected.size) return 99;
  return Math.min(...[...selected].map((h) => Math.abs(h - hour)));
}

function fillerScore(hour: number, selected: Set<number>): number {
  const anchors = new Set([10, 14, 18]);
  return minDistance(hour, selected) * 10 + (anchors.has(hour) ? 5 : 0);
}

function fillToTarget(selected: Map<number, Candidate>, day: ConsensusHour[], target: number): void {
  const hours = day.map((p) => hourOf(p.time));
  while (selected.size < target) {
    const chosen = new Set(selected.keys());
    const candidates = hours.filter((h) => !chosen.has(h));
    if (!candidates.length) break;
    candidates.sort((a, b) => fillerScore(b, chosen) - fillerScore(a, chosen) || a - b);
    const hour = candidates[0];
    selected.set(hour, { hour, priority: 20, importance: "NORMAL", reason: "SPACING" });
  }
}

function fillLargeGaps(selected: Map<number, Candidate>, day: ConsensusHour[], max: number): void {
  const available = new Set(day.map((p) => hourOf(p.time)));
  while (selected.size < max) {
    const sorted = [...selected.keys()].sort((a, b) => a - b);
    let gapStart: number | null = null;
    let gapEnd: number | null = null;
    let largest = 0;
    for (let i = 1; i < sorted.length; i++) {
      const gap = sorted[i] - sorted[i - 1];
      if (gap > largest) { largest = gap; gapStart = sorted[i - 1]; gapEnd = sorted[i]; }
    }
    if (largest <= 4 || gapStart === null || gapEnd === null) break;
    const midpoint = Math.round((gapStart + gapEnd) / 2);
    const choices = [...available].filter((h) => h > gapStart! && h < gapEnd! && !selected.has(h));
    if (!choices.length) break;
    choices.sort((a, b) => Math.abs(a - midpoint) - Math.abs(b - midpoint));
    const hour = choices[0];
    selected.set(hour, { hour, priority: 25, importance: "NORMAL", reason: "SPACING" });
  }
}

export function buildAdaptiveTimeline(
  city: CityConfig,
  date: string,
  allPoints: ConsensusHour[],
  classification: DayClassification,
  confidence: WeatherConfidence
): AdaptiveTimeline {
  const day = dayPoints(date, allPoints);
  if (!day.length) throw new Error(`adaptive_timeline_no_points:${date}`);
  const byHour = new Map(day.map((p) => [hourOf(p.time), p]));
  const available = new Set(byHour.keys());
  const candidates = new Map<number, Candidate>();
  const firstHour = day[0] ? hourOf(day[0].time) : 6;
  const lastHour = day[day.length - 1] ? hourOf(day[day.length - 1].time) : 22;

  addCandidate(candidates, { hour: available.has(6) ? 6 : firstHour, priority: 110, importance: "IMPORTANT", reason: "DAY_START" }, available);
  addCandidate(candidates, { hour: available.has(22) ? 22 : lastHour, priority: 110, importance: "IMPORTANT", reason: "DAY_END" }, available);

  const t = classification.transition;
  if (t.startHour !== null) addCandidate(candidates, { hour: t.startHour, priority: 92, importance: "IMPORTANT", reason: "TRANSITION" }, available);
  if (t.peakHour !== null) {
    addCandidate(candidates, { hour: t.peakHour, priority: 118, importance: "KEY", reason: "TRANSITION" }, available);
    if (["THUNDER", "RAIN", "SHOWERS", "FOG", "WIND"].includes(classification.dominantPhenomenon)) {
      addCandidate(candidates, { hour: t.peakHour - 1, priority: 101, importance: "IMPORTANT", reason: "TRANSITION" }, available);
    }
  }
  if (t.endHour !== null) addCandidate(candidates, { hour: t.endHour, priority: 94, importance: "IMPORTANT", reason: "TRANSITION" }, available);

  const wetMask = day.map(isWet);
  for (const run of runs(wetMask)) {
    const startHour = hourOf(day[run.start].time);
    if (startHour > firstHour) addCandidate(candidates, { hour: startHour, priority: 125, importance: "KEY", reason: "RAIN_START" }, available);
    const firstDryAfter = run.end + 1 < day.length ? hourOf(day[run.end + 1].time) : null;
    if (firstDryAfter !== null) addCandidate(candidates, { hour: firstDryAfter, priority: 112, importance: "KEY", reason: "RAIN_END" }, available);
  }

  const thunder = day.find((p) => p.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin);
  if (thunder) addCandidate(candidates, { hour: hourOf(thunder.time), priority: 135, importance: "KEY", reason: "THUNDER" }, available);

  const fogMask = day.map((p) => p.fogSupport >= SCENE_THRESHOLDS.fog.supportMin);
  const fogRuns = runs(fogMask);
  if (fogRuns.length) {
    const lastFog = fogRuns[fogRuns.length - 1];
    if (lastFog.end + 1 < day.length) addCandidate(candidates, { hour: hourOf(day[lastFog.end + 1].time), priority: 116, importance: "KEY", reason: "FOG_END" }, available);
  }

  const firstWind = day.find((p) => p.windGustKmh >= city.wind.gustNotableKmh);
  if (firstWind) addCandidate(candidates, { hour: hourOf(firstWind.time), priority: 90, importance: "IMPORTANT", reason: "WIND_THRESHOLD" }, available);
  const windPeak = [...day].sort((a, b) => b.windGustKmh - a.windGustKmh)[0];
  if (windPeak && windPeak.windGustKmh >= city.wind.gustNotableKmh) addCandidate(candidates, { hour: hourOf(windPeak.time), priority: 105, importance: classification.dominantPhenomenon === "WIND" ? "KEY" : "IMPORTANT", reason: "WIND_PEAK" }, available);

  const tempPeak = [...day].sort((a, b) => b.temperatureC - a.temperatureC)[0];
  if (tempPeak && (classification.dominantPhenomenon === "HEAT" || tempPeak.temperatureC >= city.thermal.afternoonHotFromC)) {
    addCandidate(candidates, { hour: hourOf(tempPeak.time), priority: classification.dominantPhenomenon === "HEAT" ? 108 : 78, importance: classification.dominantPhenomenon === "HEAT" ? "KEY" : "IMPORTANT", reason: "TEMPERATURE_PEAK" }, available);
  }

  for (let i = 1; i < day.length; i++) {
    if (structuralState(day[i], city) !== structuralState(day[i - 1], city)) {
      addCandidate(candidates, { hour: hourOf(day[i].time), priority: 62, importance: "IMPORTANT", reason: "WEATHER_CHANGE" }, available);
    }
  }

  if (confidence.period) {
    addCandidate(candidates, { hour: confidence.period.startHour, priority: 88, importance: "IMPORTANT", reason: "TRANSITION" }, available);
    addCandidate(candidates, { hour: confidence.period.endHour, priority: 88, importance: "IMPORTANT", reason: "TRANSITION" }, available);
  }

  const mode = modeFor(classification, confidence);
  const { target, max } = limits(mode);
  const trimmed = trimCandidates([...candidates.values()], max);
  const selected = new Map(trimmed.map((c) => [c.hour, c]));
  fillToTarget(selected, day, Math.min(target, max));
  fillLargeGaps(selected, day, max);

  // The visual system deliberately highlights a single key hour. Several events can
  // remain IMPORTANT, but multiple KEY points would compete for attention in the
  // Instagram timeline and contradict the editorial hierarchy.
  const keyCandidate = [...selected.values()]
    .filter((candidate) => candidate.importance === "KEY")
    .sort((a, b) => b.priority - a.priority || a.hour - b.hour)[0] ?? null;

  const points: TimelinePoint[] = [...selected.values()]
    .sort((a, b) => a.hour - b.hour)
    .map((candidate) => {
      const p = byHour.get(candidate.hour);
      if (!p) throw new Error(`adaptive_timeline_missing_hour:${candidate.hour}`);
      const importance: TimelinePointImportance = candidate.importance === "KEY" && candidate.hour !== keyCandidate?.hour
        ? "IMPORTANT"
        : candidate.importance;
      return {
        hour: candidate.hour,
        temperatureC: Math.round(p.temperatureC),
        condition: conditionForPoint(p),
        precipitationMm: Math.round(p.precipitationMm * 100) / 100,
        importance,
        reason: candidate.reason
      };
    });

  return { mode, points };
}
