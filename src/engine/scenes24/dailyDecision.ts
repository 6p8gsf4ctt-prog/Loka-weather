import type { CityConfig, ConsensusHour, DayProfileV2, Scene24Id, SceneDecisionV24 } from "../../types";
import { chooseScene24V2 } from "./classifier";
import { buildDayProfileV2 } from "./profile";

export interface DailySceneResolution {
  profile: DayProfileV2;
  decision: SceneDecisionV24;
}

/**
 * Single source of truth for the V24 daily scene methodology.
 *
 * The weekly engine calls this same sequence for each day. It does not map a
 * weekly event category directly to a visual scene: the scene remains the
 * result of the daily profile, family priority, scoring and invariants.
 */
export function resolveDailySceneV24(
  city: CityConfig,
  date: string,
  points: ConsensusHour[],
  previousSceneId?: Scene24Id | null
): DailySceneResolution {
  const profile = buildDayProfileV2(city, date, points);
  return { profile, decision: chooseScene24V2(profile, previousSceneId) };
}
