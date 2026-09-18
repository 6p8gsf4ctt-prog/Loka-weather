import { validateWeeklyEditorialSignal } from "./editorialSignals";
import type { WeeklyEditorialMetric } from "./editorialSignals";
import type { WeeklySignalCandidate, WeeklySignalDetectorKind } from "./signalDetectors";

export const WEEKLY_SIGNAL_RANKING_VERSION = "1.0.0" as const;
export const WEEKLY_SIGNAL_MIN_TOTAL_SCORE = 13;

export type WeeklySignalScoreDimension = "importance" | "rarity" | "anomaly" | "editorialInterest" | "confidence";
export type WeeklySignalRejectionReason =
  | "INVALID_CONTRACT"
  | "LOW_CONFIDENCE"
  | "INSUFFICIENT_REFERENCE_DEPTH"
  | "TRIVIAL_HISTORICAL_INTERVAL"
  | "BELOW_SCORE_THRESHOLD"
  | "DUPLICATE_PROOF"
  | "COMPETING_EVENT";

export interface WeeklySignalScores {
  importance: number;
  rarity: number;
  anomaly: number;
  editorialInterest: number;
  confidence: number;
  total: number;
}

export interface RankedWeeklySignalCandidate {
  rankingVersion: typeof WEEKLY_SIGNAL_RANKING_VERSION;
  candidate: WeeklySignalCandidate;
  scores: WeeklySignalScores;
  priorityTier: 1 | 2 | 3 | 4;
  eligible: boolean;
  rejectionReasons: WeeklySignalRejectionReason[];
  scoringReasons: Record<WeeklySignalScoreDimension, string>;
  proofKey: string;
  eventKey: string;
  rank: number | null;
  /** Stable automatic ranking position, including candidates not selected by the default plan. */
  automaticRank: number;
  suppressedById: string | null;
}

export interface WeeklySignalRankingResult {
  version: typeof WEEKLY_SIGNAL_RANKING_VERSION;
  inputCount: number;
  eligibleBeforeDeduplication: number;
  selected: RankedWeeklySignalCandidate[];
  rejected: RankedWeeklySignalCandidate[];
  all: RankedWeeklySignalCandidate[];
}

function bounded(value: number): number { return Math.max(0, Math.min(5, Math.round(value))); }
function factNumber(candidate: WeeklySignalCandidate, key: string): number | null {
  const value = candidate.facts[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
function factString(candidate: WeeklySignalCandidate, key: string): string | null {
  const value = candidate.facts[key];
  return typeof value === "string" ? value : null;
}

function priorityTier(detector: WeeklySignalDetectorKind): 1 | 2 | 3 | 4 {
  if (detector === "IMPACT_PHENOMENON" || detector === "REGIME_CHANGE") return 1;
  if (detector === "RECORD_PROXIMITY" || detector === "EXTREME_PERCENTILE") return 2;
  if (detector === "HISTORICAL_SINCE" || detector === "CLIMATE_ANOMALY" || detector === "SEASONAL_FIRST" || detector === "REMARKABLE_SERIES") return 3;
  return 4;
}

function importance(candidate: WeeklySignalCandidate): { value: number; reason: string } {
  if (candidate.detector === "IMPACT_PHENOMENON") {
    const phenomenon = factString(candidate, "phenomenon");
    const value = phenomenon === "FOG" ? 4 : 5;
    return { value, reason: `Phénomène à conséquence concrète : ${phenomenon ?? "non précisé"}.` };
  }
  if (candidate.detector === "REGIME_CHANGE") return { value: 4, reason: "Transition météorologique nette à anticiper." };
  if (candidate.detector === "RECORD_PROXIMITY") return { value: 4, reason: "Extrême de l'archive potentiellement dépassé." };
  if (candidate.detector === "SEASONAL_FIRST") return { value: 3, reason: "Étape saisonnière identifiable." };
  if (candidate.detector === "REMARKABLE_SERIES") return { value: 3, reason: "Séquence durable plutôt qu'une valeur isolée." };
  if (candidate.detector === "HISTORICAL_SINCE" || candidate.detector === "EXTREME_PERCENTILE") return { value: 3, reason: "Mise en perspective historique ou statistique forte." };
  if (candidate.detector === "CLIMATE_ANOMALY") return { value: 2, reason: "Écart climatique sans conséquence pratique automatique." };
  return { value: 2, reason: "Curiosité intrajournalière démontrée." };
}

function rarity(candidate: WeeklySignalCandidate): { value: number; reason: string } {
  if (candidate.detector === "RECORD_PROXIMITY") return { value: 5, reason: "Valeur au-delà de l'extrême de l'archive fournie." };
  if (candidate.detector === "HISTORICAL_SINCE") {
    const days = factNumber(candidate, "daysSince") ?? 0;
    const value = days >= 365 ? 5 : days >= 180 ? 4 : days >= 90 ? 3 : days >= 30 ? 2 : 1;
    return { value, reason: `${days} jours depuis la dernière valeur comparable.` };
  }
  if (candidate.detector === "EXTREME_PERCENTILE") {
    const percentile = factNumber(candidate, "percentile") ?? 95;
    return { value: percentile >= 99 ? 5 : 4, reason: `Positionnement statistique P${percentile}.` };
  }
  if (candidate.detector === "CLIMATE_ANOMALY") {
    const magnitude = Math.abs(factNumber(candidate, "anomalyC") ?? 0);
    return { value: magnitude >= 8 ? 5 : magnitude >= 6 ? 4 : magnitude >= 4 ? 3 : 2, reason: `Anomalie absolue de ${magnitude.toFixed(1)} °C.` };
  }
  if (candidate.detector === "SEASONAL_FIRST") return { value: 3, reason: "Première occurrence de la saison courante." };
  if (candidate.detector === "REMARKABLE_SERIES") {
    const projected = factNumber(candidate, "projectedLength") ?? 0;
    const previous = factNumber(candidate, "historicalLongestRun") ?? 1;
    const ratio = projected / Math.max(1, previous);
    return { value: ratio >= 1.5 ? 5 : ratio >= 1.25 ? 4 : 3, reason: `Série projetée à ${(ratio * 100).toFixed(0)} % de la référence maximale.` };
  }
  if (candidate.detector === "IMPACT_PHENOMENON") return { value: 2, reason: "Importance démontrée, rareté historique non présumée." };
  if (candidate.detector === "REGIME_CHANGE") return { value: 2, reason: "Transition nette, sans rareté historique présumée." };
  return { value: 2, reason: "Particularité intrajournalière, sans climatologie de rareté." };
}

function anomaly(candidate: WeeklySignalCandidate): { value: number; reason: string } {
  if (candidate.detector === "CLIMATE_ANOMALY") {
    const magnitude = Math.abs(factNumber(candidate, "anomalyC") ?? 0);
    return { value: magnitude >= 8 ? 5 : magnitude >= 6 ? 4 : magnitude >= 4 ? 3 : 2, reason: `Écart mesuré : ${magnitude.toFixed(1)} °C.` };
  }
  if (candidate.detector === "EXTREME_PERCENTILE") return { value: 4, reason: "Valeur dans une queue extrême de la distribution." };
  if (candidate.detector === "RECORD_PROXIMITY") return { value: 5, reason: "Dépassement potentiel de l'extrême observé." };
  if (candidate.detector === "HISTORICAL_SINCE") return { value: 3, reason: "Niveau suffisamment inhabituel pour nécessiter une recherche historique." };
  if (candidate.detector === "REMARKABLE_SERIES") return { value: 4, reason: "Durée projetée supérieure à la référence fournie." };
  if (candidate.detector === "SEASONAL_FIRST") return { value: 3, reason: "Franchissement saisonnier explicite." };
  const threshold = candidate.signal.evidence[0]?.reference.value ?? 0;
  const value = Math.abs(candidate.signal.forecast.value);
  const ratio = threshold === 0 ? (value === 0 ? 1 : 2) : value / Math.abs(threshold);
  return { value: ratio >= 1.5 ? 5 : ratio >= 1.25 ? 4 : ratio >= 1 ? 3 : 1, reason: `Rapport valeur/seuil : ${ratio.toFixed(2)}.` };
}

function editorialInterest(detector: WeeklySignalDetectorKind): { value: number; reason: string } {
  if (detector === "RECORD_PROXIMITY" || detector === "IMPACT_PHENOMENON") return { value: 5, reason: "Compréhension immédiate par le grand public." };
  if (detector === "HISTORICAL_SINCE" || detector === "SEASONAL_FIRST" || detector === "REGIME_CHANGE" || detector === "REMARKABLE_SERIES" || detector === "INTRADAY_CHANGE") return { value: 4, reason: "Information contextualisée facilement racontable." };
  return { value: 3, reason: "Statistique utile mais nécessitant une formulation claire." };
}

function confidence(candidate: WeeklySignalCandidate): { value: number; reason: string } {
  if (candidate.signal.confidence === "HIGH") return { value: 5, reason: "Confiance prévisionnelle élevée." };
  if (candidate.signal.confidence === "MEDIUM") return { value: 3, reason: "Confiance prévisionnelle moyenne." };
  return { value: 1, reason: "Confiance prévisionnelle insuffisante pour une publication." };
}

function referenceGate(candidate: WeeklySignalCandidate): WeeklySignalRejectionReason[] {
  const reasons: WeeklySignalRejectionReason[] = [];
  const archiveSize = factNumber(candidate, "archiveSize");
  const sampleSize = factNumber(candidate, "sampleSize");
  const seasons = factNumber(candidate, "historicalSeasons");
  if (candidate.detector === "HISTORICAL_SINCE" && (archiveSize === null || archiveSize < 365)) reasons.push("INSUFFICIENT_REFERENCE_DEPTH");
  if (candidate.detector === "RECORD_PROXIMITY" && (archiveSize === null || archiveSize < 3650)) reasons.push("INSUFFICIENT_REFERENCE_DEPTH");
  if ((candidate.detector === "CLIMATE_ANOMALY" || candidate.detector === "EXTREME_PERCENTILE") && (sampleSize === null || sampleSize < 300)) reasons.push("INSUFFICIENT_REFERENCE_DEPTH");
  if (candidate.detector === "SEASONAL_FIRST" && (seasons === null || seasons < 20)) reasons.push("INSUFFICIENT_REFERENCE_DEPTH");
  if (candidate.detector === "REMARKABLE_SERIES" && (factNumber(candidate, "referenceDays") ?? 0) < 3650) reasons.push("INSUFFICIENT_REFERENCE_DEPTH");
  if (candidate.detector === "HISTORICAL_SINCE" && (factNumber(candidate, "daysSince") ?? 0) < 30) reasons.push("TRIVIAL_HISTORICAL_INTERVAL");
  return reasons;
}

function metricTheme(metric: WeeklyEditorialMetric): string {
  if (metric === "PRECIPITATION" || metric === "THUNDER") return "WET_WEATHER";
  if (metric === "TEMPERATURE" || metric === "FROST") return "TEMPERATURE";
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return "WIND";
  if (metric === "VISIBILITY") return "VISIBILITY";
  return metric;
}

function proofKey(candidate: WeeklySignalCandidate): string {
  const signal = candidate.signal;
  const window = signal.forecast.window;
  const evidence = signal.evidence.map((item) => `${item.kind}:${item.source}:${item.reference.value}`).sort().join("|");
  return [signal.forecast.metric, signal.forecast.unit, window.basis, window.startDate, window.endDate, window.startHour ?? "-", window.endHour ?? "-", signal.forecast.value, evidence].join(":");
}

function eventKey(candidate: WeeklySignalCandidate): string {
  return `${metricTheme(candidate.signal.forecast.metric)}:${candidate.signal.representativeDayIndex}:${candidate.signal.forecast.window.endDate}`;
}

export function scoreWeeklySignalCandidate(candidate: WeeklySignalCandidate): RankedWeeklySignalCandidate {
  const importanceScore = importance(candidate);
  const rarityScore = rarity(candidate);
  const anomalyScore = anomaly(candidate);
  const interestScore = editorialInterest(candidate.detector);
  const confidenceScore = confidence(candidate);
  const scores: WeeklySignalScores = {
    importance: bounded(importanceScore.value), rarity: bounded(rarityScore.value), anomaly: bounded(anomalyScore.value),
    editorialInterest: bounded(interestScore.value), confidence: bounded(confidenceScore.value), total: 0
  };
  scores.total = scores.importance + scores.rarity + scores.anomaly + scores.editorialInterest + scores.confidence;
  const rejectionReasons = referenceGate(candidate);
  if (!validateWeeklyEditorialSignal(candidate.signal).ok) rejectionReasons.push("INVALID_CONTRACT");
  if (candidate.signal.confidence === "LOW") rejectionReasons.push("LOW_CONFIDENCE");
  if (scores.total < WEEKLY_SIGNAL_MIN_TOTAL_SCORE) rejectionReasons.push("BELOW_SCORE_THRESHOLD");
  return {
    rankingVersion: WEEKLY_SIGNAL_RANKING_VERSION, candidate, scores, priorityTier: priorityTier(candidate.detector), automaticRank: 0,
    eligible: rejectionReasons.length === 0, rejectionReasons,
    scoringReasons: { importance: importanceScore.reason, rarity: rarityScore.reason, anomaly: anomalyScore.reason, editorialInterest: interestScore.reason, confidence: confidenceScore.reason },
    proofKey: proofKey(candidate), eventKey: eventKey(candidate), rank: null, suppressedById: null
  };
}

function compareRank(a: RankedWeeklySignalCandidate, b: RankedWeeklySignalCandidate): number {
  return b.scores.total - a.scores.total
    || a.priorityTier - b.priorityTier
    || b.scores.confidence - a.scores.confidence
    || a.candidate.signal.id.localeCompare(b.candidate.signal.id);
}

/** Scores all candidates, then retains one winner for each proof or event. */
export function rankAndDeduplicateWeeklySignals(candidates: WeeklySignalCandidate[]): WeeklySignalRankingResult {
  const scored = candidates.map(scoreWeeklySignalCandidate).sort(compareRank);
  scored.forEach((item, index) => { item.automaticRank = index + 1; });
  const eligibleBeforeDeduplication = scored.filter((item) => item.eligible).length;
  const selected: RankedWeeklySignalCandidate[] = [];
  const rejected: RankedWeeklySignalCandidate[] = [];
  for (const item of scored) {
    if (!item.eligible) { rejected.push(item); continue; }
    const sameProof = selected.find((winner) => winner.proofKey === item.proofKey);
    const sameEvent = selected.find((winner) => winner.eventKey === item.eventKey);
    const winner = sameProof ?? sameEvent;
    if (winner) {
      const reason: WeeklySignalRejectionReason = sameProof ? "DUPLICATE_PROOF" : "COMPETING_EVENT";
      item.eligible = false;
      item.rejectionReasons.push(reason);
      item.suppressedById = winner.candidate.signal.id;
      rejected.push(item);
      continue;
    }
    selected.push(item);
  }
  selected.forEach((item, index) => { item.rank = index + 1; });
  return { version: WEEKLY_SIGNAL_RANKING_VERSION, inputCount: candidates.length, eligibleBeforeDeduplication, selected, rejected, all: [...selected, ...rejected].sort(compareRank) };
}
