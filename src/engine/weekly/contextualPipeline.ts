import type { ClimateDailyObservation } from "./climateReferences";
import { buildDatedTemperatureReference } from "./climateReferences";
import { buildWeeklyComplementarySlides } from "./complementarySlides";
import type { WeeklyComplementarySlidePlan } from "./complementarySlides";
import { assertWeeklyComplementaryPreflight } from "./complementaryPreflight";
import type { WeeklyComplementaryPreflight } from "./complementaryPreflight";
import { detectClimateDeparture, detectHistoricalExtreme, detectWeeklySignalCandidates } from "./signalDetectors";
import type { ForecastDailyFact, WeeklySignalCandidate } from "./signalDetectors";
import { rankAndDeduplicateWeeklySignals } from "./signalRanking";
import type { WeeklySignalRankingResult } from "./signalRanking";
import type { WeeklyProfileSet } from "./profiles";

export const WEEKLY_CONTEXTUAL_PIPELINE_VERSION = "1.0.0" as const;

export interface WeeklyContextualInput {
  /**
   * Official station rows supplied by the climate ingestion layer. Their
   * absence never invents a historical claim: only direct forecast phenomena
   * remain eligible in that case.
   */
  dailyArchive?: ClimateDailyObservation[];
}

export interface WeeklyContextualPipelineResult {
  version: typeof WEEKLY_CONTEXTUAL_PIPELINE_VERSION;
  climateStatus: "READY" | "UNAVAILABLE" | "REJECTED";
  climateDetail: string;
  candidates: WeeklySignalCandidate[];
  ranking: WeeklySignalRankingResult;
  slides: WeeklyComplementarySlidePlan;
  preflight: WeeklyComplementaryPreflight;
}

function confidence(day: WeeklyProfileSet["days"][number]): ForecastDailyFact["confidence"] {
  if (day.fullDay.modelCountMin >= 4 && day.fullDay.temperatureSpreadMeanC <= 2) return "HIGH";
  if (day.fullDay.modelCountMin >= 3 && day.fullDay.temperatureSpreadMeanC <= 4) return "MEDIUM";
  return "LOW";
}

function temperatureFacts(profiles: WeeklyProfileSet): ForecastDailyFact[] {
  return profiles.days.flatMap((day) => [
    { date: day.date, dayIndex: day.dayIndex, metric: "tminC" as const, value: day.fullDay.minTemperatureC, confidence: confidence(day) },
    { date: day.date, dayIndex: day.dayIndex, metric: "tmaxC" as const, value: day.fullDay.maxTemperatureC, confidence: confidence(day) }
  ]);
}

function historicalCandidates(profiles: WeeklyProfileSet, archive: ClimateDailyObservation[]): WeeklySignalCandidate[] {
  const result: WeeklySignalCandidate[] = [];
  for (const fact of temperatureFacts(profiles)) {
    if (fact.metric !== "tminC" && fact.metric !== "tmaxC") continue;
    const direction = fact.metric === "tmaxC" ? "HIGH" : "LOW";
    const historical = detectHistoricalExtreme(fact, archive, direction);
    if (historical) result.push(historical);
    try {
      const reference = buildDatedTemperatureReference(archive, { metric: fact.metric, targetDate: fact.date });
      result.push(...detectClimateDeparture(fact, reference));
    } catch {
      // A partial archive may disable one contextual comparison. It must never
      // be replaced by a different station or a synthetic normal.
    }
  }
  return result;
}

/**
 * Single N1 bridge between forecast profiles, contextual evidence, ranking and
 * the slide plan. It is pure so live, preview and controlled scenarios use
 * exactly the same editorial path.
 */
export function buildWeeklyContextualPipeline(
  profiles: WeeklyProfileSet,
  input: WeeklyContextualInput = {}
): WeeklyContextualPipelineResult {
  const direct = detectWeeklySignalCandidates({ profiles });
  let climateStatus: WeeklyContextualPipelineResult["climateStatus"] = "UNAVAILABLE";
  let climateDetail = "archive_locale_non_chargee";
  let candidates = [...direct];

  if (input.dailyArchive?.length) {
    try {
      candidates = [...candidates, ...historicalCandidates(profiles, input.dailyArchive)];
      climateStatus = "READY";
      climateDetail = `archive_locale:${input.dailyArchive.length}_observations`;
    } catch (error) {
      climateStatus = "REJECTED";
      climateDetail = error instanceof Error ? error.message : "archive_locale_invalide";
    }
  }

  const ranking = rankAndDeduplicateWeeklySignals(candidates);
  const slides = buildWeeklyComplementarySlides(ranking.selected);
  const preflight = assertWeeklyComplementaryPreflight(slides, { profiles, ranking, climateStatus });
  return {
    version: WEEKLY_CONTEXTUAL_PIPELINE_VERSION,
    climateStatus,
    climateDetail,
    candidates,
    ranking,
    slides,
    preflight
  };
}
