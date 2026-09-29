import type { DisplayHour, OfficialPublicPayloadV24, Scene24Confidence } from "../../types";
import {
  calendarReferenceForDate,
  lastComparable,
  recentDrySpellDays,
  type DailyInsightMetric,
  type DailyInsightRecentTuple,
  type DailyInsightReferenceSnapshot
} from "./referenceData";

export const DAILY_INSIGHT_PREVIEW_VERSION = "1.0.0" as const;
export const DAILY_INSIGHT_PUBLICATION_SCORE = 70;

export type DailyInsightDetectorId =
  | "T01" | "T02" | "T04" | "T05" | "T06" | "T08" | "T09" | "T11" | "T13"
  | "S01" | "S02" | "S05"
  | "R01" | "R02" | "R03" | "R04" | "R05" | "R06" | "R07" | "R08"
  | "V01" | "V03" | "V04" | "O01" | "B01" | "C01";

export type DailyInsightPriority = "P0" | "P1" | "P2" | "P3";
export type DailyInsightSlideFormat = "F1_RARETE_LOCALE" | "F2_EVOLUTION_RAPIDE" | "F3_SEQUENCE" | "F4_REPERE_SAISONNIER" | "F5_PHENOMENE_LOCAL";
export type DailyInsightTheme = "TEMP_RARE" | "TEMP_SHIFT" | "SEQUENCE" | "WET_WEATHER" | "WIND" | "VISIBILITY" | "CALENDAR";
export type DailyInsightClaimStatus = "OBSERVED" | "EXPECTED_HIGH" | "EXPECTED_MEDIUM" | "CALENDAR_CERTAIN";

export interface DailyInsightScore {
  rarity: number;
  magnitude: number;
  utility: number;
  localSpecificity: number;
  clarity: number;
  confidence: number;
  penalties: Array<{ code: string; value: number }>;
  total: number;
}

export interface DailyInsightEvidence {
  kind: "LOCAL_ARCHIVE" | "CLIMATE_REFERENCE" | "CONSENSUS_FORECAST" | "CALENDAR";
  label: string;
  value: string;
}

export interface DailyInsightCandidate {
  id: string;
  detectorId: DailyInsightDetectorId;
  theme: DailyInsightTheme;
  priority: DailyInsightPriority;
  format: DailyInsightSlideFormat;
  claimStatus: DailyInsightClaimStatus;
  valueLabel: string;
  line1: string;
  line2: string;
  evidence: DailyInsightEvidence[];
  score: DailyInsightScore;
  eligible: boolean;
  rejectionReason: string | null;
}

export interface DailyInsightDeferredDetector {
  detectorId: string;
  reason: string;
}

export interface DailyInsightPreviewResult {
  version: typeof DAILY_INSIGHT_PREVIEW_VERSION;
  citySlug: string;
  targetDate: string;
  generatedAt: string;
  status: "SELECTED" | "NO_DAILY_INSIGHT" | "REFERENCE_STALE";
  publicationThreshold: typeof DAILY_INSIGHT_PUBLICATION_SCORE;
  winner: DailyInsightCandidate | null;
  candidates: DailyInsightCandidate[];
  deferred: DailyInsightDeferredDetector[];
  reference: {
    stationId: string;
    stationLabel: string;
    sourceSnapshotId: string;
    firstDate: string;
    lastDate: string;
    ageDays: number;
  };
}

interface CandidateInput extends Omit<DailyInsightCandidate, "id" | "score" | "eligible" | "rejectionReason"> {
  rarity: number;
  magnitude: number;
  utility: number;
  clarity?: number;
  penalty?: { code: string; value: number };
}

const DEFERRED: DailyInsightDeferredDetector[] = [
  { detectorId: "T03", reason: "Fenêtre nocturne complète non présente dans le payload public." },
  { detectorId: "T07", reason: "Le classement top 3 sera ajouté après validation du rang glissant." },
  { detectorId: "T10", reason: "Distribution historique des amplitudes à ajouter au cache." },
  { detectorId: "T12", reason: "Nécessite la prévision du lendemain matin, absente du payload Daily." },
  { detectorId: "S03", reason: "Qualification de dernière occurrence impossible avant observation." },
  { detectorId: "S04", reason: "Série d’anomalies à ajouter après calibration des références quotidiennes." },
  { detectorId: "S06", reason: "Fin de série à activer avec la prévision du jour suivant." },
  { detectorId: "V02", reason: "Rafales horaires non exposées dans le payload public." },
  { detectorId: "C02", reason: "Source officielle des équinoxes et solstices non encore raccordée." },
  { detectorId: "C03", reason: "Dépend de C02 et d’un signal météo P1 distinct." }
];

function clamp(value: number, min: number, max: number): number { return Math.max(min, Math.min(max, Math.round(value))); }
function isoDay(value: string): number { return Date.parse(`${value}T00:00:00Z`); }
function daysBetween(earlier: string, later: string): number { return Math.floor((isoDay(later) - isoDay(earlier)) / 86_400_000); }
function signed(value: number): string { return `${value > 0 ? "+" : "−"}${Math.abs(Math.round(value))} °C`; }
function statusFor(confidence: Scene24Confidence): DailyInsightClaimStatus { return confidence === "HIGH" ? "EXPECTED_HIGH" : "EXPECTED_MEDIUM"; }
function monthName(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { month: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}
function elapsedLabel(days: number): string {
  if (days >= 365) return `${Math.floor(days / 365)} an${days >= 730 ? "s" : ""}`;
  if (days >= 60) return `${Math.floor(days / 30)} mois`;
  if (days >= 14) return `${Math.floor(days / 7)} semaines`;
  return `${days} jours`;
}

function score(input: CandidateInput, confidence: Scene24Confidence): DailyInsightScore {
  const penalties = input.penalty ? [input.penalty] : [];
  const values = {
    rarity: clamp(input.rarity, 0, 25),
    magnitude: clamp(input.magnitude, 0, 20),
    utility: clamp(input.utility, 0, 20),
    localSpecificity: 15,
    clarity: clamp(input.clarity ?? 9, 0, 10),
    confidence: confidence === "HIGH" ? 10 : confidence === "MEDIUM" ? 7 : 0
  };
  return { ...values, penalties, total: Object.values(values).reduce((sum, value) => sum + value, 0) - penalties.reduce((sum, item) => sum + item.value, 0) };
}

function candidate(input: CandidateInput, confidence: Scene24Confidence): DailyInsightCandidate {
  const computed = score(input, confidence);
  const lowConfidence = confidence === "LOW" && input.claimStatus !== "OBSERVED" && input.claimStatus !== "CALENDAR_CERTAIN";
  const eligible = !lowConfidence && computed.total >= DAILY_INSIGHT_PUBLICATION_SCORE;
  return {
    ...input,
    id: `${input.detectorId}:${input.theme}:${input.valueLabel}`,
    score: computed,
    eligible,
    rejectionReason: lowConfidence ? "LOW_FORECAST_CONFIDENCE" : eligible ? null : "SCORE_BELOW_70"
  };
}

function recentRow(snapshot: DailyInsightReferenceSnapshot, date: string): DailyInsightRecentTuple | null {
  return snapshot.recent.find((row) => row[0] === date) ?? null;
}

function previousDate(date: string): string {
  return new Date(isoDay(date) - 86_400_000).toISOString().slice(0, 10);
}

function metricRecentIndex(metric: DailyInsightMetric): 1 | 2 | 3 | 4 {
  return metric === "tminC" ? 1 : metric === "tmaxC" ? 2 : metric === "rainMm" ? 3 : 4;
}

function continuousRun(snapshot: DailyInsightReferenceSnapshot, metric: DailyInsightMetric, operator: "GTE" | "LTE", threshold: number): number {
  const index = metricRecentIndex(metric);
  let length = 0;
  for (let cursor = snapshot.recent.length - 1; cursor >= 0; cursor--) {
    const value = snapshot.recent[cursor][index];
    if (value === null || (operator === "GTE" ? value < threshold : value > threshold)) break;
    length++;
  }
  return length;
}

function historicalCandidates(payload: OfficialPublicPayloadV24, snapshot: DailyInsightReferenceSnapshot): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  const facts = payload.editorial.facts;
  const configs: Array<{
    detectorId: "T01" | "T02" | "R03" | "V01";
    metric: DailyInsightMetric;
    direction: "HIGH" | "LOW";
    value: number;
    minimum: number;
    theme: DailyInsightTheme;
    label: (days: number, date: string) => [string, string, string];
  }> = [
    { detectorId: "T01", metric: "tminC", direction: "LOW", value: facts.temperature.minC, minimum: -50, theme: "TEMP_RARE", label: (days, date) => [`${elapsedLabel(days)}`, `Le matin le plus frais depuis ${monthName(date)} pourrait nous attendre.`, `Dernière valeur comparable le ${date}.`] },
    { detectorId: "T02", metric: "tmaxC", direction: "HIGH", value: facts.temperature.maxC, minimum: -50, theme: "TEMP_RARE", label: (days, date) => [`${elapsedLabel(days)}`, `L’après-midi la plus chaude depuis ${monthName(date)} pourrait se profiler.`, `Dernière valeur comparable le ${date}.`] },
    { detectorId: "R03", metric: "rainMm", direction: "HIGH", value: facts.precipitation.totalMm, minimum: 5, theme: "WET_WEATHER", label: (days, date) => [`${elapsedLabel(days)}`, `La journée la plus arrosée depuis ${monthName(date)} pourrait se profiler.`, `Dernier cumul comparable le ${date}.`] },
    { detectorId: "V01", metric: "gustKmh", direction: "HIGH", value: facts.wind.maxGustKmh, minimum: 40, theme: "WIND", label: (days, date) => [`${elapsedLabel(days)}`, `Les rafales les plus fortes depuis ${elapsedLabel(days)} pourraient souffler aujourd’hui.`, `Dernière rafale comparable le ${date}.`] }
  ];
  for (const config of configs) {
    if (config.value < config.minimum) continue;
    const match = lastComparable(snapshot, config.metric, config.direction, config.value);
    if (!match || match.date >= payload.date) continue;
    const days = daysBetween(match.date, payload.date);
    if (days < 30) continue;
    if ((config.detectorId === "T01" || config.detectorId === "T02")) {
      const climate = calendarReferenceForDate(snapshot, payload.date, config.metric);
      if (!climate || Math.abs(config.value - climate.p50) < 2) continue;
    }
    const [valueLabel, line1, line2] = config.label(days, match.date);
    result.push(candidate({
      detectorId: config.detectorId,
      theme: config.theme,
      priority: days >= 90 ? "P0" : "P1",
      format: "F1_RARETE_LOCALE",
      claimStatus: statusFor(confidence),
      valueLabel, line1, line2,
      evidence: [
        { kind: "LOCAL_ARCHIVE", label: "Dernière occurrence", value: `${match.date} · ${match.value.toFixed(1)}` },
        { kind: "CONSENSUS_FORECAST", label: "Valeur prévue", value: `${config.value.toFixed(1)}` }
      ],
      rarity: days >= 180 ? 25 : days >= 90 ? 23 : 19,
      magnitude: days >= 90 ? 17 : 14,
      utility: config.theme === "TEMP_RARE" ? 13 : 16
    }, confidence));
  }
  return result;
}

function climateCandidates(payload: OfficialPublicPayloadV24, snapshot: DailyInsightReferenceSnapshot): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  const inputs: Array<{ metric: "tminC" | "tmaxC"; value: number; period: string }> = [
    { metric: "tminC", value: payload.editorial.facts.temperature.minC, period: "ce matin" },
    { metric: "tmaxC", value: payload.editorial.facts.temperature.maxC, period: "cet après-midi" }
  ];
  for (const input of inputs) {
    const ref = calendarReferenceForDate(snapshot, payload.date, input.metric);
    if (!ref || ref.count < 300) continue;
    const anomaly = input.value - ref.mean;
    const tail = input.value >= ref.p95 ? "HIGH" : input.value <= ref.p05 ? "LOW" : null;
    if (tail && Math.abs(input.value - ref.p50) >= 3) {
      result.push(candidate({
        detectorId: "T05", theme: "TEMP_RARE", priority: "P1", format: "F1_RARETE_LOCALE",
        claimStatus: statusFor(confidence), valueLabel: tail === "HIGH" ? "TOP 5 %" : "BAS 5 %",
        line1: tail === "HIGH" ? `Une chaleur parmi les plus marquées à cette période.` : `Une fraîcheur parmi les plus marquées à cette période.`,
        line2: `${input.value.toFixed(0)} °C prévus ${input.period}, sur ${ref.count} observations comparables.`,
        evidence: [{ kind: "CLIMATE_REFERENCE", label: tail === "HIGH" ? "Seuil P95" : "Seuil P5", value: `${(tail === "HIGH" ? ref.p95 : ref.p05).toFixed(1)} °C` }],
        rarity: 23, magnitude: clamp(Math.abs(input.value - ref.p50) * 3, 12, 20), utility: 11
      }, confidence));
    }
    if (Math.abs(anomaly) >= 4) {
      result.push(candidate({
        detectorId: "T06", theme: "TEMP_RARE", priority: Math.abs(anomaly) >= 6 ? "P1" : "P2", format: "F1_RARETE_LOCALE",
        claimStatus: statusFor(confidence), valueLabel: signed(anomaly),
        line1: `${Math.abs(Math.round(anomaly))} °C ${anomaly > 0 ? "au-dessus" : "au-dessous"} de notre référence locale.`,
        line2: `Comparaison avec ${ref.count} journées de la période 1991–2020.`,
        evidence: [{ kind: "CLIMATE_REFERENCE", label: "Moyenne locale", value: `${ref.mean.toFixed(1)} °C` }],
        rarity: Math.abs(anomaly) >= 6 ? 21 : 17, magnitude: clamp(Math.abs(anomaly) * 3, 12, 20), utility: 10
      }, confidence));
    }
  }
  return result;
}

function strongestHourlyChange(hours: DisplayHour[]): { rise: number; drop: number; riseWindow: [number, number]; dropWindow: [number, number] } {
  let rise = 0, drop = 0;
  let riseWindow: [number, number] = [0, 0], dropWindow: [number, number] = [0, 0];
  const ordered = [...hours].sort((a, b) => a.hour - b.hour);
  for (let start = 0; start < ordered.length; start++) for (let end = start + 1; end < ordered.length; end++) {
    const duration = ordered[end].hour - ordered[start].hour;
    if (duration > 4) break;
    const change = ordered[end].temperatureC - ordered[start].temperatureC;
    if (change > rise) { rise = change; riseWindow = [ordered[start].hour, ordered[end].hour]; }
    if (-change > drop) { drop = -change; dropWindow = [ordered[start].hour, ordered[end].hour]; }
  }
  return { rise, drop, riseWindow, dropWindow };
}

function shiftCandidates(payload: OfficialPublicPayloadV24, snapshot: DailyInsightReferenceSnapshot): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  const changes = strongestHourlyChange(payload.hourly);
  if (changes.drop >= 7) {
    const [start, end] = changes.dropWindow;
    result.push(candidate({
      detectorId: "T08", theme: "TEMP_SHIFT", priority: changes.drop >= 10 && end - start <= 3 ? "P0" : "P1", format: "F2_EVOLUTION_RAPIDE",
      claimStatus: statusFor(confidence), valueLabel: `−${Math.round(changes.drop)} °C`,
      line1: `Grosse chute des températures entre ${start} h et ${end} h.`,
      line2: `${Math.round(changes.drop)} °C de moins en seulement ${end - start} heures.`,
      evidence: [{ kind: "CONSENSUS_FORECAST", label: "Fenêtre", value: `${start} h → ${end} h` }],
      rarity: changes.drop >= 10 ? 22 : 17, magnitude: clamp(changes.drop * 2, 14, 20), utility: 20
    }, confidence));
  }
  if (changes.rise >= 7) {
    const [start, end] = changes.riseWindow;
    result.push(candidate({
      detectorId: "T09", theme: "TEMP_SHIFT", priority: changes.rise >= 10 && end - start <= 3 ? "P0" : "P1", format: "F2_EVOLUTION_RAPIDE",
      claimStatus: statusFor(confidence), valueLabel: `+${Math.round(changes.rise)} °C`,
      line1: `La température grimpera nettement entre ${start} h et ${end} h.`,
      line2: `${Math.round(changes.rise)} °C gagnés en ${end - start} heures.`,
      evidence: [{ kind: "CONSENSUS_FORECAST", label: "Fenêtre", value: `${start} h → ${end} h` }],
      rarity: changes.rise >= 10 ? 20 : 15, magnitude: clamp(changes.rise * 2, 14, 20), utility: 15
    }, confidence));
  }
  const yesterday = recentRow(snapshot, previousDate(payload.date));
  if (yesterday) {
    const comparisons: Array<{ value: number; previous: number | null; label: string }> = [
      { value: payload.editorial.facts.temperature.minC, previous: yesterday[1], label: "Ce matin" },
      { value: payload.editorial.facts.temperature.maxC, previous: yesterday[2], label: "Cet après-midi" }
    ];
    for (const item of comparisons) {
      if (item.previous === null) continue;
      const delta = item.value - item.previous;
      if (Math.abs(delta) < 5) continue;
      result.push(candidate({
        detectorId: "T11", theme: "TEMP_SHIFT", priority: Math.abs(delta) >= 7 ? "P1" : "P2", format: "F2_EVOLUTION_RAPIDE",
        claimStatus: statusFor(confidence), valueLabel: signed(delta),
        line1: `${item.label}, il devrait faire ${Math.abs(Math.round(delta))} °C ${delta > 0 ? "de plus" : "de moins"} qu’hier.`,
        line2: `Comparaison avec l’observation locale du ${yesterday[0]}.`,
        evidence: [{ kind: "LOCAL_ARCHIVE", label: "Hier", value: `${item.previous.toFixed(1)} °C` }],
        rarity: Math.abs(delta) >= 7 ? 18 : 14, magnitude: clamp(Math.abs(delta) * 2.5, 13, 20), utility: 16
      }, confidence));
    }
  }
  return result;
}

function wetWeatherCandidates(payload: OfficialPublicPayloadV24, snapshot: DailyInsightReferenceSnapshot): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  const rain = payload.editorial.facts.precipitation.totalMm;
  const dryDays = recentDrySpellDays(snapshot);
  if (dryDays >= 10 && rain < 2) {
    result.push(candidate({
      detectorId: "R01", theme: "WET_WEATHER", priority: dryDays >= 20 ? "P0" : "P1", format: "F3_SEQUENCE",
      claimStatus: "OBSERVED", valueLabel: `${dryDays} jours`,
      line1: `Cela fait ${dryDays} jours qu’il n’est pas tombé 1 mm de pluie.`,
      line2: `Une séquence sèche mesurée par notre référence locale.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Seuil sec", value: "moins de 1 mm/jour" }],
      rarity: dryDays >= 30 ? 25 : dryDays >= 20 ? 22 : 18, magnitude: clamp(dryDays, 12, 20), utility: 12
    }, "HIGH"));
  }
  if (dryDays >= 10 && rain >= 2) {
    result.push(candidate({
      detectorId: "R02", theme: "WET_WEATHER", priority: dryDays >= 15 && rain >= 5 ? "P0" : "P1", format: "F3_SEQUENCE",
      claimStatus: statusFor(confidence), valueLabel: `${dryDays} jours`,
      line1: `La pluie pourrait faire son retour après ${dryDays} jours presque secs.`,
      line2: `${rain.toFixed(1)} mm sont actuellement prévus aujourd’hui.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Séquence sèche", value: `${dryDays} jours` }, { kind: "CONSENSUS_FORECAST", label: "Cumul prévu", value: `${rain.toFixed(1)} mm` }],
      rarity: dryDays >= 20 ? 24 : 20, magnitude: rain >= 5 ? 18 : 14, utility: 19
    }, confidence));
  }
  const rainRef = calendarReferenceForDate(snapshot, payload.date, "rainMm");
  if (rain >= 10 && rainRef && rainRef.count >= 300 && rain >= rainRef.p95) {
    result.push(candidate({
      detectorId: "R04", theme: "WET_WEATHER", priority: "P1", format: "F1_RARETE_LOCALE",
      claimStatus: statusFor(confidence), valueLabel: "TOP 5 %", line1: `Un cumul parmi les plus élevés pour cette période.`,
      line2: `${rain.toFixed(1)} mm prévus, contre un seuil P95 de ${rainRef.p95.toFixed(1)} mm.`,
      evidence: [{ kind: "CLIMATE_REFERENCE", label: "Échantillon", value: `${rainRef.count} journées` }],
      rarity: 23, magnitude: clamp((rain / Math.max(1, rainRef.p95)) * 15, 15, 20), utility: 17
    }, confidence));
  }
  if (rain >= 20) {
    result.push(candidate({
      detectorId: "R05", theme: "WET_WEATHER", priority: "P0", format: "F5_PHENOMENE_LOCAL",
      claimStatus: statusFor(confidence), valueLabel: `${Math.round(rain)} mm`, line1: `Un épisode pluvieux marqué est attendu aujourd’hui.`,
      line2: `Le cumul prévu atteint environ ${Math.round(rain)} mm sur la journée.`,
      evidence: [{ kind: "CONSENSUS_FORECAST", label: "Seuil d’impact", value: "20 mm/jour" }],
      rarity: 17, magnitude: clamp(rain, 18, 20), utility: 20,
      penalty: { code: "ALREADY_ON_PRIMARY_SLIDE", value: 20 }
    }, confidence));
  }
  const yesterday = recentRow(snapshot, previousDate(payload.date));
  if (yesterday?.[3] !== null && yesterday?.[3] !== undefined && yesterday[3] < 1 && rain >= 8) {
    result.push(candidate({
      detectorId: "R06", theme: "WET_WEATHER", priority: "P2", format: "F2_EVOLUTION_RAPIDE",
      claimStatus: statusFor(confidence), valueLabel: `+${Math.round(rain - yesterday[3])} mm`, line1: `Un vrai changement de régime humide aujourd’hui.`,
      line2: `Après moins de 1 mm hier, environ ${rain.toFixed(1)} mm sont prévus.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Hier", value: `${yesterday[3].toFixed(1)} mm` }],
      rarity: 14, magnitude: 15, utility: 16
    }, confidence));
  }
  const wetRun = continuousRun(snapshot, "rainMm", "GTE", 1);
  if (wetRun >= 3 && rain >= 1) {
    result.push(candidate({
      detectorId: "R07", theme: "WET_WEATHER", priority: wetRun >= 5 ? "P1" : "P2", format: "F3_SEQUENCE",
      claimStatus: statusFor(confidence), valueLabel: `${wetRun + 1} jours`, line1: `${wetRun + 1}e journée pluvieuse d’affilée en vue.`,
      line2: `Chaque journée de la série atteint au moins 1 mm.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Série observée", value: `${wetRun} jours` }],
      rarity: wetRun >= 5 ? 20 : 15, magnitude: clamp(wetRun * 3, 12, 20), utility: 12
    }, confidence));
  } else if (wetRun >= 5 && rain < 1) {
    result.push(candidate({
      detectorId: "R08", theme: "WET_WEATHER", priority: "P1", format: "F3_SEQUENCE",
      claimStatus: statusFor(confidence), valueLabel: `${wetRun} jours`, line1: `Une première journée presque sèche après ${wetRun} jours de pluie.`,
      line2: `Le cumul prévu reste inférieur à 1 mm.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Série pluvieuse", value: `${wetRun} jours` }],
      rarity: 19, magnitude: 15, utility: 14
    }, confidence));
  }
  return result;
}

function seasonalCandidates(payload: OfficialPublicPayloadV24, snapshot: DailyInsightReferenceSnapshot): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  const definitions = [
    { detectorId: "S01" as const, referenceId: "first-tmax-25", metric: "tmaxC" as const, threshold: 25, operator: "GTE" as const, value: payload.editorial.facts.temperature.maxC, label: "25 °C", line: "Premier cap des 25 °C de l’année en vue." },
    { detectorId: "S01" as const, referenceId: "first-tmax-30", metric: "tmaxC" as const, threshold: 30, operator: "GTE" as const, value: payload.editorial.facts.temperature.maxC, label: "30 °C", line: "Premier cap des 30 °C de l’année en vue." },
    { detectorId: "S02" as const, referenceId: "first-frost-cold-season", metric: "tminC" as const, threshold: 0, operator: "LTE" as const, value: payload.editorial.facts.temperature.minC, label: "0 °C", line: "Le premier risque de gel de la saison pourrait arriver." },
    { detectorId: "V04" as const, referenceId: "first-gust-70-cold-season", metric: "gustKmh" as const, threshold: 70, operator: "GTE" as const, value: payload.editorial.facts.wind.maxGustKmh, label: "70 km/h", line: "Premier vrai coup de vent de la saison en vue." }
  ];
  for (const definition of definitions) {
    const reference = snapshot.seasonal.find((item) => item.id === definition.referenceId);
    if (!reference || reference.seasons.length < 20) continue;
    const crossed = definition.operator === "GTE" ? definition.value >= definition.threshold : definition.value <= definition.threshold;
    if (!crossed) continue;
    const year = Number(payload.date.slice(0, 4));
    const seasonYear = payload.date.slice(5) >= reference.seasonStartMonthDay ? year : year - 1;
    const startDate = `${seasonYear}-${reference.seasonStartMonthDay}`;
    const index = metricRecentIndex(definition.metric);
    const alreadyObserved = snapshot.recent.some((row) => row[0] >= startDate && row[0] < payload.date && row[index] !== null
      && (definition.operator === "GTE" ? (row[index] as number) >= definition.threshold : (row[index] as number) <= definition.threshold));
    if (alreadyObserved) continue;
    result.push(candidate({
      detectorId: definition.detectorId, theme: definition.detectorId === "V04" ? "WIND" : "SEQUENCE",
      priority: definition.detectorId === "S02" ? "P0" : "P1", format: "F4_REPERE_SAISONNIER",
      claimStatus: statusFor(confidence), valueLabel: definition.label, line1: definition.line,
      line2: `Aucune occurrence observée depuis le ${startDate}.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Saisons documentées", value: `${reference.seasons.length}` }],
      rarity: 21, magnitude: 16, utility: definition.detectorId === "S02" ? 20 : 14
    }, confidence));
  }
  const seriesPolicies = [
    { id: "tmax-gte-25", metric: "tmaxC" as const, threshold: 25, value: payload.editorial.facts.temperature.maxC, label: "au-dessus de 25 °C" },
    { id: "tmin-lte-5", metric: "tminC" as const, threshold: 5, value: payload.editorial.facts.temperature.minC, label: "à 5 °C ou moins" }
  ];
  for (const policy of seriesPolicies) {
    const operator = policy.id.includes("lte") ? "LTE" as const : "GTE" as const;
    const crossed = operator === "GTE" ? policy.value >= policy.threshold : policy.value <= policy.threshold;
    if (!crossed) continue;
    const run = continuousRun(snapshot, policy.metric, operator, policy.threshold) + 1;
    if (run < 3 || ![3, 5, 7, 10].includes(run)) continue;
    result.push(candidate({
      detectorId: "S05", theme: "SEQUENCE", priority: run >= 5 ? "P1" : "P2", format: "F3_SEQUENCE",
      claimStatus: statusFor(confidence), valueLabel: `${run} jours`, line1: `${run}e journée consécutive ${policy.label}.`,
      line2: `Un nouveau jalon dans la séquence locale en cours.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Jours déjà observés", value: `${run - 1}` }],
      rarity: run >= 7 ? 23 : run >= 5 ? 19 : 14, magnitude: clamp(run * 2.5, 12, 20), utility: 11
    }, confidence));
  }
  return result;
}

function impactAndCalendarCandidates(payload: OfficialPublicPayloadV24): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  const facts = payload.editorial.facts;
  if (facts.wind.maxGustKmh >= 70) result.push(candidate({
    detectorId: "V03", theme: "WIND", priority: "P0", format: "F5_PHENOMENE_LOCAL", claimStatus: statusFor(confidence),
    valueLabel: `${Math.round(facts.wind.maxGustKmh)} km/h`, line1: `De fortes rafales sont attendues aujourd’hui.`,
    line2: `Le maximum prévu atteint environ ${Math.round(facts.wind.maxGustKmh)} km/h.`,
    evidence: [{ kind: "CONSENSUS_FORECAST", label: "Seuil d’impact", value: "70 km/h" }],
    rarity: 17, magnitude: 19, utility: 20, penalty: { code: "ALREADY_ON_PRIMARY_SLIDE", value: 20 }
  }, confidence));
  if (facts.precipitation.kind === "THUNDER" && facts.precipitation.hours >= 2) result.push(candidate({
    detectorId: "O01", theme: "WET_WEATHER", priority: "P1", format: "F5_PHENOMENE_LOCAL", claimStatus: statusFor(confidence),
    valueLabel: `${facts.precipitation.hours} h`, line1: `Un signal orageux notable est présent aujourd’hui.`,
    line2: `Au moins ${facts.precipitation.hours} heures sont concernées dans le consensus.`,
    evidence: [{ kind: "CONSENSUS_FORECAST", label: "Signal", value: "orage" }],
    rarity: 15, magnitude: 15, utility: 18, penalty: { code: "ALREADY_ON_PRIMARY_SLIDE", value: 20 }
  }, confidence));
  if (facts.fog.kind === "DENSE" && facts.fog.hours >= 4) result.push(candidate({
    detectorId: "B01", theme: "VISIBILITY", priority: "P2", format: "F5_PHENOMENE_LOCAL", claimStatus: statusFor(confidence),
    valueLabel: `${facts.fog.hours} h`, line1: `Un brouillard durable pourrait tenir une partie de la matinée.`,
    line2: `${facts.fog.hours} heures de brouillard sont identifiées.`,
    evidence: [{ kind: "CONSENSUS_FORECAST", label: "Durée", value: `${facts.fog.hours} heures` }],
    rarity: 14, magnitude: 14, utility: 18, penalty: { code: "ALREADY_ON_PRIMARY_SLIDE", value: 20 }
  }, confidence));

  const date = new Date(`${payload.date}T12:00:00Z`);
  const next = new Date(date.getTime() + 86_400_000);
  const offset = (instant: Date): string => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", timeZoneName: "longOffset" })
    .formatToParts(instant).find((part) => part.type === "timeZoneName")?.value ?? "";
  const todayOffset = offset(date), tomorrowOffset = offset(next);
  if (todayOffset && tomorrowOffset && todayOffset !== tomorrowOffset) {
    const winter = tomorrowOffset.includes("+01");
    result.push(candidate({
      detectorId: "C01", theme: "CALENDAR", priority: "P0", format: "F4_REPERE_SAISONNIER", claimStatus: "CALENDAR_CERTAIN",
      valueLabel: winter ? "+1 h" : "−1 h",
      line1: `Cette nuit, nous passons à l’heure ${winter ? "d’hiver" : "d’été"}.`,
      line2: winter ? `À 3 h, il sera de nouveau 2 h.` : `À 2 h, il sera directement 3 h.`,
      evidence: [{ kind: "CALENDAR", label: "Fuseau", value: `Europe/Paris · ${todayOffset} → ${tomorrowOffset}` }],
      rarity: 20, magnitude: 15, utility: 20, clarity: 10
    }, "HIGH"));
  }
  return result;
}

function recordCandidates(payload: OfficialPublicPayloadV24, snapshot: DailyInsightReferenceSnapshot): DailyInsightCandidate[] {
  const result: DailyInsightCandidate[] = [];
  const confidence = payload.editorial.facts.confidence;
  if (snapshot.rowCount < 3650) return result;
  const values: Array<{ metric: "tminC" | "tmaxC"; value: number; direction: "LOW" | "HIGH" }> = [
    { metric: "tminC", value: payload.editorial.facts.temperature.minC, direction: "LOW" },
    { metric: "tmaxC", value: payload.editorial.facts.temperature.maxC, direction: "HIGH" }
  ];
  for (const item of values) {
    const extreme = item.direction === "HIGH" ? snapshot.extremes[item.metric].max : snapshot.extremes[item.metric].min;
    if (!extreme) continue;
    const margin = item.direction === "HIGH" ? item.value - extreme.value : extreme.value - item.value;
    if (margin < 0.5) continue;
    result.push(candidate({
      detectorId: "T04", theme: "TEMP_RARE", priority: "P0", format: "F1_RARETE_LOCALE", claimStatus: statusFor(confidence),
      valueLabel: `${Math.round(item.value)} °C`, line1: `Si la prévision se confirme, un record local pourrait être dépassé.`,
      line2: `L’extrême de l’archive est de ${extreme.value.toFixed(1)} °C, observé le ${extreme.date}.`,
      evidence: [{ kind: "LOCAL_ARCHIVE", label: "Archive", value: `${snapshot.firstDate} → ${snapshot.lastDate}` }],
      rarity: 25, magnitude: 20, utility: 14
    }, confidence));
  }
  return result;
}

export function buildDailyInsightPreview(
  payload: OfficialPublicPayloadV24,
  snapshot: DailyInsightReferenceSnapshot,
  generatedAt = new Date().toISOString()
): DailyInsightPreviewResult {
  const ageDays = daysBetween(snapshot.lastDate, payload.date);
  const reference = {
    stationId: snapshot.stationId,
    stationLabel: snapshot.stationName,
    sourceSnapshotId: snapshot.sourceSnapshotId,
    firstDate: snapshot.firstDate,
    lastDate: snapshot.lastDate,
    ageDays
  };
  if (ageDays > 10) {
    return { version: DAILY_INSIGHT_PREVIEW_VERSION, citySlug: payload.citySlug, targetDate: payload.date, generatedAt, status: "REFERENCE_STALE", publicationThreshold: DAILY_INSIGHT_PUBLICATION_SCORE, winner: null, candidates: [], deferred: DEFERRED, reference };
  }
  const candidates = [
    ...recordCandidates(payload, snapshot),
    ...historicalCandidates(payload, snapshot),
    ...climateCandidates(payload, snapshot),
    ...shiftCandidates(payload, snapshot),
    ...seasonalCandidates(payload, snapshot),
    ...wetWeatherCandidates(payload, snapshot),
    ...impactAndCalendarCandidates(payload)
  ].sort((a, b) => b.score.total - a.score.total || a.detectorId.localeCompare(b.detectorId));
  const winner = candidates.find((item) => item.eligible) ?? null;
  return {
    version: DAILY_INSIGHT_PREVIEW_VERSION,
    citySlug: payload.citySlug,
    targetDate: payload.date,
    generatedAt,
    status: winner ? "SELECTED" : "NO_DAILY_INSIGHT",
    publicationThreshold: DAILY_INSIGHT_PUBLICATION_SCORE,
    winner,
    candidates,
    deferred: DEFERRED,
    reference
  };
}

