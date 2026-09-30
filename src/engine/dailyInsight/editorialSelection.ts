import {
  validateDailyInsightDataBundle,
  type DailyInsightDataBundle,
  type DailyInsightHourlyPoint
} from "./dataBundle";
import type { DailyInsightRecentTuple } from "./referenceData";

export const DAILY_INSIGHT_SELECTION_VERSION = "1.0.0" as const;
export const DAILY_INSIGHT_SELECTION_MODE = "LAB_ONLY" as const;
export const DAILY_INSIGHT_PUBLICATION_THRESHOLD = 70;

/**
 * A technically valid signal is not automatically Instagram-worthy. Generic
 * atmospheric shifts and historical analogues therefore need a higher
 * editorial score than an immediately perceptible local event.
 */
export function dailyInsightEditorialInterestFloor(detectorId: string): number {
  if (detectorId === "A01") return 80;
  if (detectorId === "H01") return 78;
  return DAILY_INSIGHT_PUBLICATION_THRESHOLD;
}

export type DailyInsightPriorityV2 = "P0" | "P1" | "P2" | "P3";
export type DailyInsightFamilyV2 = "TEMPERATURE" | "RAIN" | "WIND" | "VISIBILITY" | "ATMOSPHERE" | "MARINE" | "CALENDAR" | "HISTORY";
export type DailyInsightFormatV2 = "F1_RARETE_LOCALE" | "F2_EVOLUTION_RAPIDE" | "F3_SEQUENCE" | "F4_REPERE_SAISONNIER" | "F5_PHENOMENE_LOCAL";
export type DailyInsightClaimV2 = "OBSERVED" | "EXPECTED_HIGH" | "EXPECTED_MEDIUM" | "CALENDAR_CERTAIN" | "UNPUBLISHABLE";

export interface DailyInsightEvidenceV2 {
  source: "LOKA_CONSENSUS" | "METEO_FRANCE_ARCHIVE" | "CLIMATE_1991_2020" | "OPEN_METEO_ATMOSPHERE" | "OPEN_METEO_MARINE" | "DETERMINISTIC_CALENDAR";
  metric: string;
  value: number | string;
  unit: string | null;
  window: string;
  detail: string;
}

export interface DailyInsightScoreV2 {
  rarity: number;
  magnitude: number;
  utility: number;
  localSpecificity: number;
  clarity: number;
  confidence: number;
  base: number;
  penalties: Array<{ code: string; value: number; detail: string }>;
  final: number;
}

export interface DailyInsightCandidateV2 {
  id: string;
  detectorId: string;
  topicKey: string;
  family: DailyInsightFamilyV2;
  priority: DailyInsightPriorityV2;
  format: DailyInsightFormatV2;
  claim: DailyInsightClaimV2;
  valueLabel: string;
  headline: string;
  proofLine: string;
  evidence: DailyInsightEvidenceV2[];
  score: DailyInsightScoreV2;
  eligible: boolean;
  rejectionReasons: string[];
  trace: {
    threshold: string;
    observed: string;
    sourceKeys: string[];
  };
}

export interface DailyInsightSelectionHistory {
  date: string;
  detectorId: string;
  topicKey: string;
  family: DailyInsightFamilyV2;
  format: DailyInsightFormatV2;
}

export interface DailyInsightSelectionInput {
  bundle: DailyInsightDataBundle;
  recentSelections?: DailyInsightSelectionHistory[];
  /** Exact detector IDs or topic keys already used by the main Daily slide. */
  primarySlideTopics?: string[];
}

export interface DailyInsightSelectionResult {
  version: typeof DAILY_INSIGHT_SELECTION_VERSION;
  mode: typeof DAILY_INSIGHT_SELECTION_MODE;
  citySlug: string;
  targetDate: string;
  generatedAt: string;
  bundleId: string;
  status: "SELECTED" | "NO_ELIGIBLE_CANDIDATE" | "DATA_NOT_READY";
  publicationThreshold: typeof DAILY_INSIGHT_PUBLICATION_THRESHOLD;
  winner: DailyInsightCandidateV2 | null;
  candidates: DailyInsightCandidateV2[];
  audit: {
    generated: number;
    eligible: number;
    rejected: number;
    rejectionCounts: Record<string, number>;
    appliedRotationPenalties: number;
  };
}

interface CandidateDraft extends Omit<DailyInsightCandidateV2, "id" | "score" | "eligible" | "rejectionReasons"> {
  scoreParts: Omit<DailyInsightScoreV2, "base" | "penalties" | "final">;
  rejections?: string[];
}

const priorityRank: Record<DailyInsightPriorityV2, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
const dayMs = 86_400_000;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function round(value: number, digits = 1): number {
  return Number(value.toFixed(digits));
}

function previousDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) - dayMs).toISOString().slice(0, 10);
}

function hour(point: DailyInsightHourlyPoint): number {
  return Number(point.time.slice(11, 13));
}

function forecastClaim(bundle: DailyInsightDataBundle): DailyInsightClaimV2 {
  const averageSpread = bundle.hourly.reduce((sum, point) => sum + point.temperatureSpreadC, 0) / bundle.hourly.length;
  if (bundle.sources.forecast.state === "READY" && bundle.sources.forecast.modelCount >= 4 && averageSpread <= 2.5) return "EXPECTED_HIGH";
  if (["READY", "PARTIAL"].includes(bundle.sources.forecast.state) && bundle.sources.forecast.modelCount >= 3 && averageSpread <= 4) return "EXPECTED_MEDIUM";
  return "UNPUBLISHABLE";
}

function expectedVerb(claim: DailyInsightClaimV2): string {
  return claim === "EXPECTED_HIGH" ? "devrait" : "pourrait";
}

function metricEvidence(metric: string, value: number, unit: string, window: string, detail: string): DailyInsightEvidenceV2 {
  return { source: "LOKA_CONSENSUS", metric, value: round(value), unit, window, detail };
}

function strongestTemperatureChange(points: DailyInsightHourlyPoint[]): { rise: number; drop: number; risePair: [DailyInsightHourlyPoint, DailyInsightHourlyPoint]; dropPair: [DailyInsightHourlyPoint, DailyInsightHourlyPoint] } {
  let rise = 0, drop = 0;
  let risePair: [DailyInsightHourlyPoint, DailyInsightHourlyPoint] = [points[0], points[0]];
  let dropPair: [DailyInsightHourlyPoint, DailyInsightHourlyPoint] = [points[0], points[0]];
  for (let start = 0; start < points.length; start++) {
    for (let end = start + 1; end < points.length; end++) {
      const duration = hour(points[end]) - hour(points[start]);
      if (duration > 4) break;
      if (duration <= 0) continue;
      const delta = points[end].temperatureC - points[start].temperatureC;
      const riseDuration = hour(risePair[1]) - hour(risePair[0]);
      const dropDuration = hour(dropPair[1]) - hour(dropPair[0]);
      if (delta > rise || (delta === rise && duration < riseDuration)) { rise = delta; risePair = [points[start], points[end]]; }
      if (-delta > drop || (-delta === drop && duration < dropDuration)) { drop = -delta; dropPair = [points[start], points[end]]; }
    }
  }
  return { rise, drop, risePair, dropPair };
}

function strongestWindRise(points: DailyInsightHourlyPoint[]): { delta: number; pair: [DailyInsightHourlyPoint, DailyInsightHourlyPoint] } {
  let delta = 0;
  let pair: [DailyInsightHourlyPoint, DailyInsightHourlyPoint] = [points[0], points[0]];
  for (let start = 0; start < points.length; start++) {
    for (let end = start + 1; end < points.length; end++) {
      const duration = hour(points[end]) - hour(points[start]);
      if (duration > 6) break;
      const candidate = points[end].windGustKmh - points[start].windGustKmh;
      const previousDuration = hour(pair[1]) - hour(pair[0]);
      if (candidate > delta || (candidate === delta && duration < previousDuration)) { delta = candidate; pair = [points[start], points[end]]; }
    }
  }
  return { delta, pair };
}

function consecutiveFogHours(points: DailyInsightHourlyPoint[]): { count: number; start: number; end: number } {
  let best = { count: 0, start: 0, end: 0 };
  let current = { count: 0, start: 0, end: 0 };
  for (const point of points) {
    const fog = point.visibilityM !== null && point.visibilityM <= 1_000
      && point.relativeHumidityPct !== null && point.relativeHumidityPct >= 95;
    if (!fog) { current = { count: 0, start: 0, end: 0 }; continue; }
    if (current.count === 0) current.start = hour(point);
    current.count++;
    current.end = hour(point);
    if (current.count > best.count) best = { ...current };
  }
  return best;
}

function previousObservation(bundle: DailyInsightDataBundle): DailyInsightRecentTuple | null {
  const expected = previousDate(bundle.targetDate);
  return bundle.recentObservations.find((row) => row[0] === expected) ?? null;
}

function calendarCandidates(bundle: DailyInsightDataBundle): CandidateDraft[] {
  const result: CandidateDraft[] = [];
  if (bundle.calendar.clockChange) {
    const winter = bundle.calendar.clockChange === "WINTER_TIME_START";
    result.push({
      detectorId: "C01", topicKey: `CLOCK_CHANGE:${bundle.targetDate}`, family: "CALENDAR", priority: "P0", format: "F4_REPERE_SAISONNIER", claim: "CALENDAR_CERTAIN",
      valueLabel: winter ? "−1 HEURE" : "+1 HEURE",
      headline: winter ? "Cette nuit, nous passons à l’heure d’hiver." : "Cette nuit, nous passons à l’heure d’été.",
      proofLine: winter ? "À 3 h, il sera de nouveau 2 h." : "À 2 h, il sera directement 3 h.",
      evidence: [{ source: "DETERMINISTIC_CALENDAR", metric: "Europe/Paris clock change", value: bundle.calendar.clockChange, unit: null, window: bundle.targetDate, detail: "Dernier dimanche réglementaire de mars ou octobre." }],
      trace: { threshold: "official_clock_change_date", observed: bundle.calendar.clockChange, sourceKeys: ["calendar.clockChange"] },
      scoreParts: { rarity: 25, magnitude: 18, utility: 20, localSpecificity: 15, clarity: 10, confidence: 10 }
    });
  }
  if (bundle.calendar.firstDayOfSeason) {
    const labels = { WINTER: "l’hiver météorologique", SPRING: "le printemps météorologique", SUMMER: "l’été météorologique", AUTUMN: "l’automne météorologique" } as const;
    result.push({
      detectorId: "C04", topicKey: `METEOROLOGICAL_SEASON:${bundle.calendar.meteorologicalSeason}:${bundle.targetDate}`, family: "CALENDAR", priority: "P2", format: "F4_REPERE_SAISONNIER", claim: "CALENDAR_CERTAIN",
      valueLabel: "NOUVELLE SAISON", headline: `Aujourd’hui commence ${labels[bundle.calendar.meteorologicalSeason]}.`,
      proofLine: "Un repère calendaire fixe, indépendant des conditions du jour.",
      evidence: [{ source: "DETERMINISTIC_CALENDAR", metric: "meteorological season", value: bundle.calendar.meteorologicalSeason, unit: null, window: bundle.targetDate, detail: "Saisons météorologiques : 1er mars, juin, septembre et décembre." }],
      trace: { threshold: "first_meteorological_season_day", observed: bundle.targetDate.slice(5), sourceKeys: ["calendar.firstDayOfSeason"] },
      scoreParts: { rarity: 13, magnitude: 8, utility: 11, localSpecificity: 12, clarity: 10, confidence: 10 }
    });
  }
  return result;
}

function temperatureCandidates(bundle: DailyInsightDataBundle, claim: DailyInsightClaimV2): CandidateDraft[] {
  const result: CandidateDraft[] = [];
  const change = strongestTemperatureChange(bundle.hourly);
  if (change.drop >= 7) {
    const [start, end] = change.dropPair;
    const duration = hour(end) - hour(start);
    result.push({
      detectorId: "T08", topicKey: `TEMP_DROP:${hour(start)}-${hour(end)}`, family: "TEMPERATURE", priority: change.drop >= 10 && duration <= 3 ? "P0" : "P1", format: "F2_EVOLUTION_RAPIDE", claim,
      valueLabel: `−${Math.round(change.drop)} °C`, headline: `Grosse chute des températures entre ${hour(start)} h et ${hour(end)} h.`,
      proofLine: `${Math.round(change.drop)} °C de moins en seulement ${duration} heures.`,
      evidence: [metricEvidence("temperature", start.temperatureC, "°C", start.time, "Début de la fenêtre."), metricEvidence("temperature", end.temperatureC, "°C", end.time, "Fin de la fenêtre."), { source: "LOKA_CONSENSUS", metric: "model_count", value: Math.min(start.modelCount, end.modelCount), unit: null, window: `${start.time}/${end.time}`, detail: "Nombre minimal de modèles." }],
      trace: { threshold: "drop>=7C within<=4h; P0>=10C within<=3h", observed: `${round(change.drop)}C/${duration}h`, sourceKeys: ["hourly.temperatureC", "hourly.modelCount"] },
      scoreParts: { rarity: change.drop >= 10 ? 24 : 19, magnitude: clamp(change.drop * 2, 14, 20), utility: 20, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  if (change.rise >= 7) {
    const [start, end] = change.risePair;
    const duration = hour(end) - hour(start);
    result.push({
      detectorId: "T09", topicKey: `TEMP_RISE:${hour(start)}-${hour(end)}`, family: "TEMPERATURE", priority: change.rise >= 10 && duration <= 3 ? "P0" : "P1", format: "F2_EVOLUTION_RAPIDE", claim,
      valueLabel: `+${Math.round(change.rise)} °C`, headline: `La température ${expectedVerb(claim)} gagner ${Math.round(change.rise)} °C entre ${hour(start)} h et ${hour(end)} h.`,
      proofLine: `Une hausse concentrée sur ${duration} heures.`,
      evidence: [metricEvidence("temperature", start.temperatureC, "°C", start.time, "Début de la fenêtre."), metricEvidence("temperature", end.temperatureC, "°C", end.time, "Fin de la fenêtre.")],
      trace: { threshold: "rise>=7C within<=4h; P0>=10C within<=3h", observed: `${round(change.rise)}C/${duration}h`, sourceKeys: ["hourly.temperatureC"] },
      scoreParts: { rarity: change.rise >= 10 ? 22 : 17, magnitude: clamp(change.rise * 2, 14, 20), utility: 16, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const yesterday = previousObservation(bundle);
  if (yesterday) {
    const comparisons = [
      { period: "Ce matin", current: bundle.daily.minTemperatureC, previous: yesterday[1], metric: "tminC" },
      { period: "Cet après-midi", current: bundle.daily.maxTemperatureC, previous: yesterday[2], metric: "tmaxC" }
    ];
    for (const item of comparisons) {
      if (item.previous === null) continue;
      const delta = item.current - item.previous;
      if (Math.abs(delta) < 5) continue;
      result.push({
        detectorId: "T11", topicKey: `DAY_DELTA:${item.metric}`, family: "TEMPERATURE", priority: Math.abs(delta) >= 8 ? "P0" : Math.abs(delta) >= 7 ? "P1" : "P2", format: "F2_EVOLUTION_RAPIDE", claim,
        valueLabel: `${delta > 0 ? "+" : "−"}${Math.abs(Math.round(delta))} °C`, headline: `${item.period}, il ${expectedVerb(claim)} faire ${Math.abs(Math.round(delta))} °C ${delta > 0 ? "de plus" : "de moins"} qu’hier.`,
        proofLine: `Comparaison avec la mesure locale du ${yesterday[0]}.`,
        evidence: [metricEvidence(item.metric, item.current, "°C", bundle.targetDate, "Valeur prévue."), { source: "METEO_FRANCE_ARCHIVE", metric: item.metric, value: item.previous, unit: "°C", window: yesterday[0], detail: "Observation homologue de la veille." }],
        trace: { threshold: "absolute day delta>=5C; P1>=7C; P0>=8C", observed: `${round(delta)}C`, sourceKeys: ["daily", "recentObservations"] },
        scoreParts: { rarity: Math.abs(delta) >= 8 ? 22 : 17, magnitude: clamp(Math.abs(delta) * 2.5, 12, 20), utility: 16, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
      });
    }
  }
  for (const config of [
    { metric: "tminC" as const, value: bundle.daily.minTemperatureC, period: "ce matin" },
    { metric: "tmaxC" as const, value: bundle.daily.maxTemperatureC, period: "cet après-midi" }
  ]) {
    const ref = bundle.climate[config.metric];
    if (!ref || ref.count < 300) continue;
    const anomaly = config.value - ref.mean;
    const tail = config.value >= ref.p95 ? "HIGH" : config.value <= ref.p05 ? "LOW" : null;
    if (tail && Math.abs(config.value - ref.p50) >= 3) {
      result.push({
        detectorId: "T05", topicKey: `CLIMATE_TAIL:${config.metric}:${tail}`, family: "HISTORY", priority: "P1", format: "F1_RARETE_LOCALE", claim,
        valueLabel: tail === "HIGH" ? "TOP 5 %" : "BAS 5 %", headline: tail === "HIGH" ? "Une chaleur parmi les plus marquées pour la période." : "Une fraîcheur parmi les plus marquées pour la période.",
        proofLine: `${Math.round(config.value)} °C prévus ${config.period}, comparés à ${ref.count} journées locales.`,
        evidence: [metricEvidence(config.metric, config.value, "°C", bundle.targetDate, "Prévision cible."), { source: "CLIMATE_1991_2020", metric: config.metric, value: tail === "HIGH" ? ref.p95 : ref.p05, unit: "°C", window: "1991-2020 ±7 jours", detail: `${tail === "HIGH" ? "P95" : "P05"} sur ${ref.count} observations.` }],
        trace: { threshold: "outside P05/P95 and >=3C from median; sample>=300", observed: `${round(config.value)}C vs P05=${round(ref.p05)}/P95=${round(ref.p95)}`, sourceKeys: [`climate.${config.metric}`, "daily"] },
        scoreParts: { rarity: 23, magnitude: clamp(Math.abs(config.value - ref.p50) * 3, 12, 20), utility: 12, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
      });
    }
    if (Math.abs(anomaly) >= 5) {
      result.push({
        detectorId: "T06", topicKey: `CLIMATE_ANOMALY:${config.metric}:${anomaly > 0 ? "HIGH" : "LOW"}`, family: "HISTORY", priority: Math.abs(anomaly) >= 7 ? "P0" : "P1", format: "F1_RARETE_LOCALE", claim,
        valueLabel: `${anomaly > 0 ? "+" : "−"}${Math.abs(Math.round(anomaly))} °C`, headline: `${Math.abs(Math.round(anomaly))} °C ${anomaly > 0 ? "au-dessus" : "au-dessous"} de notre référence locale ${config.period}.`,
        proofLine: `Référence calculée sur ${ref.count} journées comparables entre 1991 et 2020.`,
        evidence: [metricEvidence(config.metric, config.value, "°C", bundle.targetDate, "Prévision cible."), { source: "CLIMATE_1991_2020", metric: config.metric, value: ref.mean, unit: "°C", window: "1991-2020 ±7 jours", detail: `Moyenne locale sur ${ref.count} observations.` }],
        trace: { threshold: "absolute anomaly>=5C; P0>=7C; sample>=300", observed: `${round(anomaly)}C`, sourceKeys: [`climate.${config.metric}`, "daily"] },
        scoreParts: { rarity: Math.abs(anomaly) >= 7 ? 23 : 19, magnitude: clamp(Math.abs(anomaly) * 3, 15, 20), utility: 13, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
      });
    }
  }
  return result;
}

function rainCandidates(bundle: DailyInsightDataBundle, claim: DailyInsightClaimV2): CandidateDraft[] {
  const result: CandidateDraft[] = [];
  const rain = bundle.daily.precipitationTotalMm;
  const dryDays = bundle.drySpellDays;
  const milestone = [10, 15, 20, 30].includes(dryDays) || (dryDays > 30 && dryDays % 5 === 0);
  if (milestone && rain < 1) {
    result.push({
      detectorId: "R01", topicKey: `DRY_SPELL:${dryDays}`, family: "RAIN", priority: dryDays >= 20 ? "P0" : "P1", format: "F3_SEQUENCE", claim: "OBSERVED",
      valueLabel: `${dryDays} JOURS`, headline: `Cela fait ${dryDays} jours qu’il n’est pas tombé 1 mm de pluie.`, proofLine: "Une séquence mesurée par notre historique local jusqu’à hier.",
      evidence: [{ source: "METEO_FRANCE_ARCHIVE", metric: "rainMm", value: dryDays, unit: "jours", window: `jusqu'au ${previousDate(bundle.targetDate)}`, detail: "Jours consécutifs avec moins de 1 mm." }, { source: "LOKA_CONSENSUS", metric: "rainMm", value: rain, unit: "mm", window: bundle.targetDate, detail: "Cumul prévu aujourd’hui." }],
      trace: { threshold: "milestones 10/15/20/30 then every 5 days", observed: `${dryDays}d`, sourceKeys: ["drySpellDays", "daily.precipitationTotalMm"] },
      scoreParts: { rarity: dryDays >= 20 ? 24 : 19, magnitude: clamp(dryDays, 12, 20), utility: 13, localSpecificity: 15, clarity: 10, confidence: 10 }
    });
  }
  if (dryDays >= 10 && rain >= 2 && bundle.hourly.some((point) => point.precipitationSupport >= .6)) {
    result.push({
      detectorId: "R02", topicKey: `RAIN_RETURN:${dryDays}`, family: "RAIN", priority: dryDays >= 21 && rain >= 5 ? "P0" : "P1", format: "F3_SEQUENCE", claim,
      valueLabel: `${dryDays} JOURS`, headline: `La pluie ${expectedVerb(claim)} faire son retour après ${dryDays} jours presque secs.`, proofLine: `${round(rain)} mm prévus aujourd’hui par le consensus LOKA.`,
      evidence: [{ source: "METEO_FRANCE_ARCHIVE", metric: "dry_spell", value: dryDays, unit: "jours", window: `jusqu'au ${previousDate(bundle.targetDate)}`, detail: "Séquence observée." }, metricEvidence("precipitation", rain, "mm", bundle.targetDate, "Cumul prévu.")],
      trace: { threshold: "dry>=10d and rain>=2mm with support>=60%; P0 dry>=21d and rain>=5mm", observed: `${dryDays}d/${round(rain)}mm`, sourceKeys: ["drySpellDays", "daily.precipitationTotalMm", "hourly.precipitationSupport"] },
      scoreParts: { rarity: dryDays >= 21 ? 25 : 20, magnitude: clamp(rain, 12, 20), utility: 18, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const peak = Math.max(...bundle.hourly.map((point) => point.precipitationMm));
  if (rain >= 20 || peak >= 5) {
    const peakPoint = bundle.hourly.find((point) => point.precipitationMm === peak)!;
    result.push({
      detectorId: "R05", topicKey: `RAIN_IMPACT:${bundle.targetDate}`, family: "RAIN", priority: rain >= 30 || peak >= 10 ? "P0" : "P1", format: "F5_PHENOMENE_LOCAL", claim,
      valueLabel: rain >= 20 ? `${Math.round(rain)} MM` : `${round(peak)} MM/H`, headline: `Un passage pluvieux marqué ${expectedVerb(claim)} concerner la journée.`, proofLine: `Le créneau le plus arrosé est prévu vers ${hour(peakPoint)} h.`,
      evidence: [metricEvidence("daily precipitation", rain, "mm", bundle.targetDate, "Cumul journalier."), metricEvidence("hourly precipitation", peak, "mm/h", peakPoint.time, "Pic horaire.")],
      trace: { threshold: "daily>=20mm or hourly>=5mm; P0 daily>=30mm or hourly>=10mm", observed: `${round(rain)}mm/${round(peak)}mmh`, sourceKeys: ["daily.precipitationTotalMm", "hourly.precipitationMm"] },
      scoreParts: { rarity: rain >= 30 || peak >= 10 ? 24 : 20, magnitude: clamp(Math.max(rain / 1.5, peak * 2), 15, 20), utility: 20, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const ref = bundle.climate.rainMm;
  if (ref && ref.count >= 300 && rain >= Math.max(10, ref.p95)) {
    result.push({
      detectorId: "R04", topicKey: `RAIN_CLIMATE_TAIL:${bundle.targetDate}`, family: "HISTORY", priority: "P1", format: "F1_RARETE_LOCALE", claim,
      valueLabel: "TOP 5 %", headline: "Un cumul parmi les plus élevés pour cette période pourrait se présenter.", proofLine: `${round(rain)} mm prévus, contre un seuil local P95 de ${round(ref.p95)} mm.`,
      evidence: [metricEvidence("rainMm", rain, "mm", bundle.targetDate, "Cumul prévu."), { source: "CLIMATE_1991_2020", metric: "rainMm", value: ref.p95, unit: "mm", window: "1991-2020 ±7 jours", detail: `P95 sur ${ref.count} observations.` }],
      trace: { threshold: "rain>=10mm and >=P95; sample>=300", observed: `${round(rain)}mm/P95=${round(ref.p95)}`, sourceKeys: ["climate.rainMm", "daily.precipitationTotalMm"] },
      scoreParts: { rarity: 23, magnitude: clamp(rain, 14, 20), utility: 17, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  return result;
}

function localPhenomenonCandidates(bundle: DailyInsightDataBundle, claim: DailyInsightClaimV2): CandidateDraft[] {
  const result: CandidateDraft[] = [];
  const gust = bundle.daily.maxWindGustKmh;
  if (gust >= 70) {
    result.push({
      detectorId: "V03", topicKey: `WIND_IMPACT:${bundle.targetDate}`, family: "WIND", priority: gust >= 90 ? "P0" : "P1", format: "F5_PHENOMENE_LOCAL", claim,
      valueLabel: `${Math.round(gust)} KM/H`, headline: `Des rafales proches de ${Math.round(gust)} km/h ${expectedVerb(claim)} souffler aujourd’hui.`, proofLine: "Valeur maximale issue du consensus multi-modèles.",
      evidence: [metricEvidence("wind gust", gust, "km/h", bundle.targetDate, "Rafale maximale prévue."), { source: "LOKA_CONSENSUS", metric: "model_count", value: bundle.sources.forecast.modelCount, unit: null, window: bundle.targetDate, detail: "Modèles intégrés au consensus." }],
      trace: { threshold: "gust>=70km/h; P0>=90km/h", observed: `${round(gust)}kmh`, sourceKeys: ["daily.maxWindGustKmh", "sources.forecast.modelCount"] },
      scoreParts: { rarity: gust >= 90 ? 24 : 19, magnitude: clamp(gust / 4, 14, 20), utility: 20, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const windRise = strongestWindRise(bundle.hourly);
  if (windRise.delta >= 25 && windRise.pair[1].windGustKmh >= 50) {
    const [start, end] = windRise.pair;
    result.push({
      detectorId: "V02", topicKey: `WIND_RISE:${hour(start)}-${hour(end)}`, family: "WIND", priority: "P1", format: "F2_EVOLUTION_RAPIDE", claim,
      valueLabel: `+${Math.round(windRise.delta)} KM/H`, headline: `Le vent ${expectedVerb(claim)} se renforcer nettement entre ${hour(start)} h et ${hour(end)} h.`, proofLine: `Les rafales gagneraient près de ${Math.round(windRise.delta)} km/h.`,
      evidence: [metricEvidence("wind gust", start.windGustKmh, "km/h", start.time, "Début."), metricEvidence("wind gust", end.windGustKmh, "km/h", end.time, "Fin.")],
      trace: { threshold: "rise>=25km/h within<=6h and final>=50km/h", observed: `${round(windRise.delta)}kmh`, sourceKeys: ["hourly.windGustKmh"] },
      scoreParts: { rarity: 19, magnitude: clamp(windRise.delta / 1.5, 14, 20), utility: 19, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const fog = consecutiveFogHours(bundle.hourly);
  if (fog.count >= 4 && bundle.sources.atmosphere.state === "READY") {
    result.push({
      detectorId: "B01", topicKey: `FOG_WINDOW:${fog.start}-${fog.end}`, family: "VISIBILITY", priority: fog.count >= 6 ? "P1" : "P2", format: "F5_PHENOMENE_LOCAL", claim,
      valueLabel: `${fog.count} HEURES`, headline: `Un brouillard durable ${expectedVerb(claim)} tenir jusqu’en matinée.`, proofLine: `Visibilité inférieure à 1 km entre ${fog.start} h et ${fog.end} h.`,
      evidence: [{ source: "OPEN_METEO_ATMOSPHERE", metric: "visibility", value: "<=1000", unit: "m", window: `${fog.start}h-${fog.end}h`, detail: `${fog.count} heures consécutives.` }, { source: "OPEN_METEO_ATMOSPHERE", metric: "relative humidity", value: ">=95", unit: "%", window: `${fog.start}h-${fog.end}h`, detail: "Humidité concomitante requise." }],
      trace: { threshold: "visibility<=1000m and humidity>=95% for>=4h", observed: `${fog.count}h`, sourceKeys: ["hourly.visibilityM", "hourly.relativeHumidityPct"] },
      scoreParts: { rarity: fog.count >= 6 ? 20 : 16, magnitude: clamp(fog.count * 3, 12, 20), utility: 20, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const pressure = bundle.daily.pressureChangeHpa;
  if (pressure !== null && Math.abs(pressure) >= 8 && bundle.sources.atmosphere.state === "READY") {
    result.push({
      detectorId: "A01", topicKey: `PRESSURE_SHIFT:${pressure > 0 ? "RISE" : "DROP"}`, family: "ATMOSPHERE", priority: Math.abs(pressure) >= 12 ? "P1" : "P2", format: "F2_EVOLUTION_RAPIDE", claim,
      valueLabel: `${pressure > 0 ? "+" : "−"}${Math.abs(round(pressure))} HPA`, headline: `La pression ${expectedVerb(claim)} ${pressure > 0 ? "remonter" : "chuter"} nettement au fil de la journée.`, proofLine: `Une variation de ${Math.abs(round(pressure))} hPa entre le premier et le dernier relevé prévu.`,
      evidence: [{ source: "OPEN_METEO_ATMOSPHERE", metric: "surface pressure change", value: pressure, unit: "hPa", window: bundle.targetDate, detail: "Dernière valeur moins première valeur horaire." }, metricEvidence("model_count", bundle.sources.forecast.modelCount, "modèles", bundle.targetDate, "Consensus météo associé.")],
      trace: { threshold: "absolute pressure change>=8hPa; P1>=12hPa", observed: `${round(pressure)}hPa`, sourceKeys: ["daily.pressureChangeHpa"] },
      scoreParts: { rarity: Math.abs(pressure) >= 12 ? 19 : 15, magnitude: clamp(Math.abs(pressure) * 1.5, 12, 20), utility: 13, localSpecificity: 14, clarity: 9, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
    });
  }
  const sea = bundle.marine.seaSurfaceTemperatureC;
  if (sea !== null && bundle.sources.marine.state === "READY") {
    const contrast = bundle.daily.maxTemperatureC - sea;
    if (Math.abs(contrast) >= 8) {
      result.push({
        detectorId: "M01", topicKey: `SEA_AIR_CONTRAST:${contrast > 0 ? "AIR_WARMER" : "SEA_WARMER"}`, family: "MARINE", priority: Math.abs(contrast) >= 12 ? "P1" : "P2", format: "F5_PHENOMENE_LOCAL", claim,
        valueLabel: `${Math.abs(Math.round(contrast))} °C`, headline: contrast > 0 ? "Un net contraste entre la plage et l’océan aujourd’hui." : "L’océan restera sensiblement plus doux que l’air.",
        proofLine: `${Math.round(bundle.daily.maxTemperatureC)} °C dans l’air contre environ ${round(sea)} °C dans l’eau.`,
        evidence: [metricEvidence("air temperature", bundle.daily.maxTemperatureC, "°C", bundle.targetDate, "Maximum prévu."), { source: "OPEN_METEO_MARINE", metric: "sea surface temperature", value: sea, unit: "°C", window: bundle.targetDate, detail: "Moyenne horaire prévue au point côtier." }],
        trace: { threshold: "absolute sea-air contrast>=8C; P1>=12C", observed: `${round(contrast)}C`, sourceKeys: ["marine.seaSurfaceTemperatureC", "daily.maxTemperatureC"] },
        scoreParts: { rarity: Math.abs(contrast) >= 12 ? 19 : 15, magnitude: clamp(Math.abs(contrast) * 1.5, 12, 20), utility: 16, localSpecificity: 15, clarity: 10, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
      });
    }
  }
  return result;
}

function historicalAnalogueCandidate(bundle: DailyInsightDataBundle, claim: DailyInsightClaimV2): CandidateDraft | null {
  const rows = bundle.recentObservations.filter((row) => row[1] !== null && row[2] !== null && row[3] !== null && row[4] !== null);
  if (rows.length < 14) return null;
  const distance = (row: DailyInsightRecentTuple): number => Math.sqrt(
    ((bundle.daily.minTemperatureC - row[1]!) / 3) ** 2
    + ((bundle.daily.maxTemperatureC - row[2]!) / 3) ** 2
    + ((bundle.daily.precipitationTotalMm - row[3]!) / 5) ** 2
    + ((bundle.daily.maxWindGustKmh - row[4]!) / 15) ** 2
  ) / 2;
  const match = rows.map((row) => ({ row, distance: distance(row) })).sort((a, b) => a.distance - b.distance)[0];
  if (!match || match.distance > 1) return null;
  return {
    detectorId: "H01", topicKey: `LOCAL_ANALOGUE:${match.row[0]}`, family: "HISTORY", priority: "P3", format: "F1_RARETE_LOCALE", claim,
    valueLabel: "AIR DE DÉJÀ-VU", headline: `Le profil prévu ressemble particulièrement au ${match.row[0]}.`, proofLine: "Températures, pluie et rafales présentent un équilibre local très proche.",
    evidence: [metricEvidence("daily profile", round(match.distance, 2), "distance", bundle.targetDate, "Distance normalisée du profil prévu."), { source: "METEO_FRANCE_ARCHIVE", metric: "daily profile", value: match.row[0], unit: null, window: match.row[0], detail: "Meilleur analogue parmi les 31 derniers jours observés." }],
    trace: { threshold: "at least 14 complete days and normalized distance<=1", observed: `${round(match.distance, 2)}`, sourceKeys: ["daily", "recentObservations"] },
    scoreParts: { rarity: 12, magnitude: clamp((1 - match.distance) * 10 + 8, 8, 18), utility: 10, localSpecificity: 15, clarity: 9, confidence: claim === "EXPECTED_HIGH" ? 10 : 7 }
  };
}

function repetitionPenalties(candidate: CandidateDraft, history: DailyInsightSelectionHistory[]): DailyInsightScoreV2["penalties"] {
  const recent = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  const yesterday = recent.at(-1);
  const p0 = candidate.priority === "P0";
  const penalties: DailyInsightScoreV2["penalties"] = [];
  if (recent.some((item) => item.detectorId === candidate.detectorId)) penalties.push({ code: "DETECTOR_7D", value: p0 ? 5 : 18, detail: "Même détecteur utilisé dans les sept dernières sélections." });
  if (yesterday?.family === candidate.family) penalties.push({ code: "FAMILY_YESTERDAY", value: p0 ? 3 : 12, detail: "Même famille que la dernière sélection." });
  else if (recent.slice(-3).some((item) => item.family === candidate.family)) penalties.push({ code: "FAMILY_3D", value: p0 ? 2 : 6, detail: "Famille déjà utilisée récemment." });
  if (yesterday?.format === candidate.format) penalties.push({ code: "FORMAT_YESTERDAY", value: p0 ? 1 : 4, detail: "Même structure de slide que la dernière sélection." });
  return penalties;
}

function finalizeCandidate(draft: CandidateDraft, input: DailyInsightSelectionInput): DailyInsightCandidateV2 {
  const { scoreParts, rejections: draftRejections, ...publicDraft } = draft;
  const rejections = [...(draftRejections ?? [])];
  if (draft.claim === "UNPUBLISHABLE") rejections.push("FORECAST_CONFIDENCE_TOO_LOW");
  const minimumEvidence = draft.claim === "CALENDAR_CERTAIN" ? 1 : 2;
  if (draft.evidence.length < minimumEvidence) rejections.push("EVIDENCE_INCOMPLETE");
  if (input.primarySlideTopics?.includes(draft.detectorId) || input.primarySlideTopics?.includes(draft.topicKey)) rejections.push("DUPLICATES_PRIMARY_SLIDE");
  const penalties = repetitionPenalties(draft, input.recentSelections ?? []);
  const base = Object.values(scoreParts).reduce((sum, value) => sum + value, 0);
  const final = Math.max(0, base - penalties.reduce((sum, penalty) => sum + penalty.value, 0));
  const interestFloor = dailyInsightEditorialInterestFloor(draft.detectorId);
  if (final < interestFloor) {
    rejections.push("SCORE_BELOW_THRESHOLD");
    if (interestFloor > DAILY_INSIGHT_PUBLICATION_THRESHOLD) rejections.push(`EDITORIAL_INTEREST_FLOOR_${interestFloor}`);
  }
  const id = `${draft.detectorId}:${input.bundle.targetDate}:${draft.topicKey}`;
  return {
    ...publicDraft,
    id,
    score: { ...scoreParts, base, penalties, final },
    eligible: rejections.length === 0,
    rejectionReasons: [...new Set(rejections)]
  };
}

function rejectionCounts(candidates: DailyInsightCandidateV2[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const candidate of candidates) for (const reason of candidate.rejectionReasons) counts[reason] = (counts[reason] ?? 0) + 1;
  return counts;
}

export function selectDailyInsightEditorial(input: DailyInsightSelectionInput): DailyInsightSelectionResult {
  const bundle = validateDailyInsightDataBundle(input.bundle);
  const base = {
    version: DAILY_INSIGHT_SELECTION_VERSION,
    mode: DAILY_INSIGHT_SELECTION_MODE,
    citySlug: bundle.city.slug,
    targetDate: bundle.targetDate,
    generatedAt: bundle.generatedAt,
    bundleId: bundle.id,
    publicationThreshold: DAILY_INSIGHT_PUBLICATION_THRESHOLD
  } as const;
  if (!bundle.quality.coreReady) {
    return { ...base, status: "DATA_NOT_READY", winner: null, candidates: [], audit: { generated: 0, eligible: 0, rejected: 0, rejectionCounts: { CORE_DATA_NOT_READY: 1 }, appliedRotationPenalties: 0 } };
  }
  const claim = forecastClaim(bundle);
  const analogue = historicalAnalogueCandidate(bundle, claim);
  const drafts = [
    ...calendarCandidates(bundle),
    ...temperatureCandidates(bundle, claim),
    ...rainCandidates(bundle, claim),
    ...localPhenomenonCandidates(bundle, claim),
    ...(analogue ? [analogue] : [])
  ];
  const candidates = drafts.map((draft) => finalizeCandidate(draft, input)).sort((left, right) =>
    priorityRank[left.priority] - priorityRank[right.priority]
    || right.score.final - left.score.final
    || left.detectorId.localeCompare(right.detectorId)
  );
  const winner = candidates.find((candidate) => candidate.eligible) ?? null;
  return {
    ...base,
    status: winner ? "SELECTED" : "NO_ELIGIBLE_CANDIDATE",
    winner,
    candidates,
    audit: {
      generated: candidates.length,
      eligible: candidates.filter((candidate) => candidate.eligible).length,
      rejected: candidates.filter((candidate) => !candidate.eligible).length,
      rejectionCounts: rejectionCounts(candidates),
      appliedRotationPenalties: candidates.reduce((sum, candidate) => sum + candidate.score.penalties.length, 0)
    }
  };
}

export function validateDailyInsightSelection(value: unknown): DailyInsightSelectionResult {
  if (!value || typeof value !== "object") throw new Error("daily_insight_selection_invalid");
  const selection = value as Partial<DailyInsightSelectionResult>;
  if (selection.version !== DAILY_INSIGHT_SELECTION_VERSION || selection.mode !== DAILY_INSIGHT_SELECTION_MODE) throw new Error("daily_insight_selection_version_invalid");
  if (!selection.citySlug || !selection.targetDate || !selection.generatedAt || !selection.bundleId) throw new Error("daily_insight_selection_identity_invalid");
  if (!selection.audit || !Array.isArray(selection.candidates)) throw new Error("daily_insight_selection_audit_invalid");
  if (selection.status === "SELECTED" && (!selection.winner || !selection.winner.eligible)) throw new Error("daily_insight_selection_winner_invalid");
  if (selection.status !== "SELECTED" && selection.winner !== null) throw new Error("daily_insight_selection_silence_invalid");
  return selection as DailyInsightSelectionResult;
}
