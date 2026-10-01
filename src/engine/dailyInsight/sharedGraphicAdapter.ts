import type { DailyComparisonStory } from "../dailyComparison";
import type {
  DailyInsightCandidateV2,
  DailyInsightClaimV2,
  DailyInsightEvidenceV2,
  DailyInsightFamilyV2,
  DailyInsightFormatV2
} from "./editorialSelection";
import type {
  WeeklyComplementaryComparisonItem,
  WeeklyComplementaryTheme,
  WeeklyComplementaryVisual
} from "../weekly/complementarySlides";
import type { WeeklySignalClaimStatus } from "../weekly/signalCopy";
import { complementaryPictogramDataUrl } from "../weekly/complementaryPictograms";

function theme(family: DailyInsightFamilyV2): WeeklyComplementaryTheme {
  if (family === "TEMPERATURE" || family === "HISTORY") return "TEMPERATURE";
  if (family === "RAIN") return "WET_WEATHER";
  if (family === "WIND") return "WIND";
  if (family === "VISIBILITY") return "VISIBILITY";
  if (family === "CALENDAR") return "LIGHT";
  return "OTHER";
}

function visual(family: DailyInsightFamilyV2): WeeklyComplementaryVisual {
  if (family === "TEMPERATURE" || family === "HISTORY") return "THERMOMETER";
  if (family === "RAIN") return "RAIN";
  if (family === "WIND") return "WIND";
  if (family === "VISIBILITY") return "FOG";
  if (family === "CALENDAR" || family === "MARINE") return "SUN";
  return "TREND";
}

function claimStatus(claim: DailyInsightClaimV2): WeeklySignalClaimStatus {
  if (claim === "OBSERVED" || claim === "CALENDAR_CERTAIN") return "OBSERVED";
  if (claim === "EXPECTED_HIGH") return "EXPECTED";
  return "POSSIBLE";
}

function subtitle(format: DailyInsightFormatV2, family: DailyInsightFamilyV2): string {
  if (format === "F1_RARETE_LOCALE") return "UN REPÈRE DANS L’HISTOIRE MÉTÉO LOCALE";
  if (format === "F2_EVOLUTION_RAPIDE") return "LE CHANGEMENT PRINCIPAL DE LA JOURNÉE";
  if (format === "F3_SEQUENCE") return "UNE SÉQUENCE LOCALE À RETENIR";
  if (format === "F4_REPERE_SAISONNIER") return "UN REPÈRE CALENDAIRE UTILE";
  if (family === "MARINE") return "UN CONTRASTE TRÈS LOCAL ENTRE TERRE ET OCÉAN";
  return "LE PHÉNOMÈNE LOCAL À RETENIR";
}

function labelForEvidence(item: DailyInsightEvidenceV2): string {
  const detail = item.detail.replace(/[.!]$/g, "").trim();
  if (/début/i.test(detail)) return "DÉBUT";
  if (/fin/i.test(detail)) return "FIN";
  if (/seuil|percentile|normale|référence/i.test(`${item.metric} ${detail}`)) return "RÉFÉRENCE LOCALE";
  const window = item.window.includes("T") ? item.window.slice(11, 16).replace(":", " h ").replace(/ 00$/, "") : item.window;
  return window || item.metric.replace(/_/g, " ").toUpperCase();
}

function valueForEvidence(item: DailyInsightEvidenceV2): string {
  const value = typeof item.value === "number"
    ? new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 }).format(item.value)
    : String(item.value);
  return item.unit ? `${value} ${item.unit}` : value;
}

function comparisonEvidence(candidate: DailyInsightCandidateV2): DailyInsightEvidenceV2[] {
  const meaningful = candidate.evidence.filter((item) => item.metric !== "model_count");
  if (candidate.format === "F3_SEQUENCE" || candidate.format === "F4_REPERE_SAISONNIER") return [];
  if (candidate.format === "F2_EVOLUTION_RAPIDE") {
    const sameMetric = meaningful.filter((item) => item.metric === meaningful[0]?.metric);
    return sameMetric.length >= 2 ? [sameMetric[0], sameMetric[sameMetric.length - 1]] : meaningful.slice(0, 2);
  }
  return meaningful.slice(0, 2);
}

function comparison(candidate: DailyInsightCandidateV2): { left: WeeklyComplementaryComparisonItem; right: WeeklyComplementaryComparisonItem } | null {
  const evidence = comparisonEvidence(candidate);
  if (evidence.length < 2) return null;
  return {
    left: { value: valueForEvidence(evidence[0]), label: labelForEvidence(evidence[0]) },
    right: { value: valueForEvidence(evidence[1]), label: labelForEvidence(evidence[1]) }
  };
}

/**
 * Content-only bridge between Daily Insight and the canonical Daily renderer.
 * No geometry, font, colour, opacity, icon drawing or export rule lives here.
 */
export function dailyInsightToSharedGraphic(candidate: DailyInsightCandidateV2): DailyComparisonStory {
  const chosenVisual = visual(candidate.family);
  const evidenceComparison = comparison(candidate);
  return {
    version: "1.0.0",
    title: "À REMARQUER AUJOURD’HUI",
    signalId: candidate.id,
    detector: candidate.detectorId,
    theme: theme(candidate.family),
    visual: chosenVisual,
    pictogramUrl: complementaryPictogramDataUrl(chosenVisual),
    presentation: {
      layout: evidenceComparison ? "COMPARISON" : "SINGLE_STAT",
      headline: candidate.valueLabel,
      subtitle: subtitle(candidate.format, candidate.family),
      editorialLine: candidate.headline,
      comparison: evidenceComparison
    },
    claimStatus: claimStatus(candidate.claim),
    sourceNote: candidate.proofLine,
    frame: "DAILY_STORY_SHARED_V1"
  };
}
