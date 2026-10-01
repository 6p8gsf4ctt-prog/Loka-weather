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
import { dailyInsightPublicCopy } from "./publicCopy";

function theme(candidate: DailyInsightCandidateV2): WeeklyComplementaryTheme {
  if (candidate.detectorId === "R04") return "WET_WEATHER";
  if (candidate.family === "TEMPERATURE" || candidate.family === "HISTORY") return "TEMPERATURE";
  if (candidate.family === "RAIN") return "WET_WEATHER";
  if (candidate.family === "WIND") return "WIND";
  if (candidate.family === "VISIBILITY") return "VISIBILITY";
  if (candidate.family === "CALENDAR") return "LIGHT";
  return "OTHER";
}

function visual(candidate: DailyInsightCandidateV2): WeeklyComplementaryVisual {
  if (candidate.detectorId === "R04") return "RAIN";
  if (candidate.detectorId === "H01") return "TREND";
  if (candidate.family === "TEMPERATURE" || candidate.family === "HISTORY") return "THERMOMETER";
  if (candidate.family === "RAIN") return "RAIN";
  if (candidate.family === "WIND") return "WIND";
  if (candidate.family === "VISIBILITY") return "FOG";
  if (candidate.family === "CALENDAR" || candidate.family === "MARINE") return "SUN";
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
  const chosenVisual = visual(candidate);
  const evidenceComparison = comparison(candidate);
  const publicCopy = dailyInsightPublicCopy(candidate, evidenceComparison);
  const chosenComparison = publicCopy ? publicCopy.comparison : evidenceComparison;
  return {
    version: "1.0.0",
    title: "À REMARQUER AUJOURD’HUI",
    signalId: candidate.id,
    detector: candidate.detectorId,
    theme: theme(candidate),
    visual: chosenVisual,
    pictogramUrl: complementaryPictogramDataUrl(chosenVisual),
    presentation: {
      layout: chosenComparison ? "COMPARISON" : "SINGLE_STAT",
      headline: publicCopy?.headline ?? candidate.valueLabel,
      subtitle: publicCopy?.subtitle ?? subtitle(candidate.format, candidate.family),
      editorialLine: publicCopy?.editorialLine ?? candidate.headline,
      comparison: chosenComparison
    },
    claimStatus: claimStatus(candidate.claim),
    sourceNote: publicCopy?.sourceNote ?? candidate.proofLine,
    frame: "DAILY_STORY_SHARED_V1"
  };
}
