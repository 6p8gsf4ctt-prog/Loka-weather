import type { OfficialPublicPayloadV24 } from "../types";
import {
  buildDatedTemperatureReference,
  type ClimateDailyObservation
} from "./weekly/climateReferences";
import {
  detectClimateDeparture,
  detectRecentExtreme,
  type ForecastDailyFact,
  type WeeklySignalCandidate
} from "./weekly/signalDetectors";
import { rankAndDeduplicateWeeklySignals } from "./weekly/signalRanking";
import {
  buildWeeklyComplementaryPresentation,
  type WeeklyComplementaryPresentation,
  type WeeklyComplementaryTheme,
  type WeeklyComplementaryVisual
} from "./weekly/complementarySlides";
import { complementaryPictogramDataUrl } from "./weekly/complementaryPictograms";
import { buildWeeklySignalCopy, type WeeklySignalClaimStatus } from "./weekly/signalCopy";

export const DAILY_COMPARISON_VERSION = "1.0.0" as const;

export interface DailyComparisonStory {
  version: typeof DAILY_COMPARISON_VERSION;
  title: "LE CHIFFRE DU JOUR";
  signalId: string;
  detector: WeeklySignalCandidate["detector"];
  theme: WeeklyComplementaryTheme;
  visual: WeeklyComplementaryVisual;
  pictogramUrl: string;
  presentation: WeeklyComplementaryPresentation;
  claimStatus: WeeklySignalClaimStatus;
  sourceNote: string;
  frame: "DAILY_STORY_SHARED_V1";
}

function theme(candidate: WeeklySignalCandidate): WeeklyComplementaryTheme {
  const metric = candidate.signal.forecast.metric;
  if (metric === "TEMPERATURE" || metric === "FROST") return "TEMPERATURE";
  if (metric === "PRECIPITATION" || metric === "THUNDER") return "WET_WEATHER";
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return "WIND";
  if (metric === "VISIBILITY") return "VISIBILITY";
  if (metric === "SUNLIGHT" || metric === "DAYLIGHT" || metric === "CLOUD_COVER") return "LIGHT";
  return "OTHER";
}

function visual(candidate: WeeklySignalCandidate): WeeklyComplementaryVisual {
  const metric = candidate.signal.forecast.metric;
  if (metric === "TEMPERATURE" || metric === "FROST") return "THERMOMETER";
  if (metric === "PRECIPITATION") return "RAIN";
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return "WIND";
  if (metric === "VISIBILITY") return "FOG";
  return "TREND";
}

function forecastFacts(payload: OfficialPublicPayloadV24): ForecastDailyFact[] {
  const facts = payload.editorial.facts;
  const confidence = facts.confidence;
  return [
    { date: payload.date, dayIndex: 0, metric: "tminC", value: facts.temperature.minC, confidence },
    { date: payload.date, dayIndex: 0, metric: "tmaxC", value: facts.temperature.maxC, confidence },
    { date: payload.date, dayIndex: 0, metric: "rainMm", value: facts.precipitation.totalMm, confidence },
    { date: payload.date, dayIndex: 0, metric: "gust3sMs", value: facts.wind.maxGustKmh / 3.6, confidence }
  ];
}

/**
 * Selects one evidence-backed daily comparison, using the same detectors,
 * ranking, cautious copy and official pictogram resolver as the weekly engine.
 * Returning null is intentional when no signal clears the editorial gates.
 */
export function buildDailyComparisonStory(
  payload: OfficialPublicPayloadV24,
  archive: ClimateDailyObservation[]
): DailyComparisonStory | null {
  if (!archive.length || payload.citySlug !== "tarnos") return null;
  const facts = forecastFacts(payload);
  const candidates: WeeklySignalCandidate[] = [];

  for (const fact of facts) {
    const recent = detectRecentExtreme(fact, archive);
    if (recent) candidates.push(recent);
    if (fact.metric === "tminC" || fact.metric === "tmaxC") {
      try {
        const reference = buildDatedTemperatureReference(archive, {
          metric: fact.metric,
          targetDate: fact.date
        });
        candidates.push(...detectClimateDeparture(fact, reference));
      } catch {
        // An incomplete archive must suppress the claim, never weaken its proof.
      }
    }
  }

  const winner = rankAndDeduplicateWeeklySignals(candidates).selected[0];
  if (!winner) return null;
  const copy = buildWeeklySignalCopy(winner);
  const chosenVisual = visual(winner.candidate);
  return {
    version: DAILY_COMPARISON_VERSION,
    title: "LE CHIFFRE DU JOUR",
    signalId: winner.candidate.signal.id,
    detector: winner.candidate.detector,
    theme: theme(winner.candidate),
    visual: chosenVisual,
    pictogramUrl: complementaryPictogramDataUrl(chosenVisual),
    presentation: buildWeeklyComplementaryPresentation(winner, copy),
    claimStatus: copy.claimStatus,
    sourceNote: copy.sourceNote,
    frame: "DAILY_STORY_SHARED_V1"
  };
}
