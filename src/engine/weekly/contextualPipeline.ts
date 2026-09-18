import { buildWeeklyComplementarySlides } from "./complementarySlides";
import type { WeeklyComplementarySlidePlan } from "./complementarySlides";
import { preflightWeeklyComplementarySlides } from "./complementaryPreflight";
import type { WeeklyComplementaryPreflight } from "./complementaryPreflight";
import type { ClimateDailyObservation } from "./climateReferences";
import { activateWeeklyEditorialSignals } from "./editorialActivation";
import type { WeeklyEditorialActivationResult } from "./editorialActivation";
import { detectWeeklySignalCandidates } from "./signalDetectors";
import type { WeeklySignalCandidate } from "./signalDetectors";
import { rankAndDeduplicateWeeklySignals } from "./signalRanking";
import type { WeeklySignalRankingResult } from "./signalRanking";
import type { WeeklyProfileSet } from "./profiles";

export const WEEKLY_CONTEXTUAL_PIPELINE_VERSION = "2.0.0" as const;

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
  activation: WeeklyEditorialActivationResult | null;
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
  let activation: WeeklyEditorialActivationResult | null = null;

  if (input.dailyArchive?.length) {
    try {
      activation = activateWeeklyEditorialSignals(profiles, input.dailyArchive);
      candidates = [...candidates, ...activation.candidates];
      climateStatus = "READY";
      climateDetail = `archive_locale:${input.dailyArchive.length}_observations:${activation.candidates.length}_candidats_contextuels`;
    } catch (error) {
      climateStatus = "REJECTED";
      climateDetail = error instanceof Error ? error.message : "archive_locale_invalide";
    }
  }

  const ranking = rankAndDeduplicateWeeklySignals(candidates);
  const slides = buildWeeklyComplementarySlides(ranking.selected);
  // Keep the failed report instead of throwing. Phase 4 can then publish the
  // validated slide 1 as a safe fallback and expose the exact failed checks.
  const preflight = preflightWeeklyComplementarySlides(slides, { profiles, ranking, climateStatus });
  return {
    version: WEEKLY_CONTEXTUAL_PIPELINE_VERSION,
    climateStatus,
    climateDetail,
    candidates,
    ranking,
    slides,
    preflight,
    activation
  };
}
