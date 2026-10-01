import type { CityConfig, OfficialPublicPayloadV24 } from "../types";
import type { DailyInsightOp5Decision } from "../engine/dailyInsight/op5Rollout";
import type { DailyInsightCandidateV2 } from "../engine/dailyInsight/editorialSelection";
import { dailyInsightToSharedGraphic } from "../engine/dailyInsight/sharedGraphicAdapter";
import { renderInstagramDailyComparisonGraphic } from "./instagramDailyGraphicPreview";

/** OP5 chooses content; the canonical Daily renderer owns every pixel. */
export function renderDailyInsightOp5Story(
  payload: OfficialPublicPayloadV24,
  city: CityConfig,
  rollout: DailyInsightOp5Decision
): string {
  const winner = rollout.selection?.winner;
  if (!winner) throw new Error("daily_insight_op5_winner_missing");
  return renderDailyInsightCandidateStory(payload, city, winner);
}

export function renderDailyInsightCandidateStory(
  payload: OfficialPublicPayloadV24,
  city: CityConfig,
  candidate: DailyInsightCandidateV2
): string {
  return renderInstagramDailyComparisonGraphic(payload, city, dailyInsightToSharedGraphic(candidate));
}
