import {
  buildDailyInsightReference,
  type DailyInsightReferenceSnapshot
} from "../engine/dailyInsight/referenceData";
import {
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME
} from "../engine/weekly/climateReferences";
import {
  loadDailyInsightReference,
  saveDailyInsightReference,
  type DailyInsightReferenceCacheResult
} from "../storage/dailyInsightReferences";
import type { Env } from "../types";
import { ensureMeteoFranceDailyArchive } from "./meteoFranceClimate";

export interface DailyInsightBackgroundResult extends DailyInsightReferenceCacheResult {
  rebuilt: boolean;
}

/**
 * Background-only orchestration. It is deliberately not imported by the public
 * Daily pipeline or by an interactive route.
 */
export async function ensureDailyInsightBackgroundReference(
  env: Env,
  now = new Date(),
  forceClimateRefresh = false
): Promise<DailyInsightBackgroundResult> {
  const climate = await ensureMeteoFranceDailyArchive(env, now, forceClimateRefresh);
  const sourceSnapshotId = climate.state?.activeSnapshotId;
  if (!sourceSnapshotId || !climate.observations.length) {
    return {
      status: "UNAVAILABLE",
      detail: `daily_insight_climate_unavailable:${climate.detail}`,
      snapshot: null,
      rebuilt: false
    };
  }

  const cached = await loadDailyInsightReference(env.DB, WEEKLY_CLIMATE_STATION_ID, sourceSnapshotId);
  if (cached.status === "READY") return { ...cached, rebuilt: false };

  try {
    const snapshot: DailyInsightReferenceSnapshot = buildDailyInsightReference({
      stationId: WEEKLY_CLIMATE_STATION_ID,
      stationName: WEEKLY_CLIMATE_STATION_NAME,
      sourceSnapshotId,
      generatedAt: now.toISOString(),
      observations: climate.observations
    });
    await saveDailyInsightReference(env.DB, snapshot);
    return {
      status: "READY",
      detail: `daily_insight_reference_rebuilt:${snapshot.rowCount}`,
      snapshot,
      rebuilt: true
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "daily_insight_reference_build_failed";
    console.error("daily_insight_reference_build_failed", detail);
    return {
      status: cached.snapshot ? "STALE" : "REJECTED",
      detail,
      snapshot: cached.snapshot,
      rebuilt: false
    };
  }
}

