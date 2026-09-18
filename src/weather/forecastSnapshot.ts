import { MODELS } from "../config/models";
import { buildConsensus } from "../engine/consensus";
import { persistForecastSnapshot } from "../storage/forecastSnapshots";
import type { CityConfig, ConsensusHour, Env, ModelForecast } from "../types";
import { fetchModelForecast, type ForecastRequestOptions } from "./openMeteo";

export const FORECAST_SNAPSHOT_VERSION = "1.0.0" as const;

export interface ForecastSnapshotRequest {
  forecastDays: number;
  startDate?: string;
  endDate?: string;
  timeoutMs?: number;
}

export interface ForecastSnapshot {
  version: typeof FORECAST_SNAPSHOT_VERSION;
  id: string;
  citySlug: string;
  purpose: "DAILY" | "WEEKLY";
  generatedAt: string;
  request: ForecastSnapshotRequest;
  forecasts: ModelForecast[];
  failures: Record<string, string>;
  consensus: ConsensusHour[];
}

function hex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

async function snapshotId(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return hex(await crypto.subtle.digest("SHA-256", bytes));
}

function normalizedRequest(options: ForecastRequestOptions): ForecastSnapshotRequest {
  return {
    forecastDays: options.forecastDays ?? 2,
    ...(options.startDate ? { startDate: options.startDate } : {}),
    ...(options.endDate ? { endDate: options.endDate } : {}),
    ...(options.timeoutMs ? { timeoutMs: options.timeoutMs } : {})
  };
}

/** One shared capture path for the daily and weekly publications. */
export async function captureForecastSnapshot(
  env: Env,
  city: CityConfig,
  purpose: ForecastSnapshot["purpose"],
  options: ForecastRequestOptions = {}
): Promise<ForecastSnapshot> {
  const request = normalizedRequest(options);
  const settled = await Promise.allSettled(MODELS.map((model) => fetchModelForecast(env, city, model, request)));
  const forecasts: ModelForecast[] = [];
  const failures: Record<string, string> = {};
  settled.forEach((result, index) => {
    if (result.status === "fulfilled") forecasts.push(result.value);
    else failures[MODELS[index].id] = result.reason instanceof Error ? result.reason.message : String(result.reason);
  });
  const consensus = forecasts.length >= 3 ? [...buildConsensus(forecasts).values()].sort((a, b) => a.time.localeCompare(b.time)) : [];
  const generatedAt = new Date().toISOString();
  const id = await snapshotId({
    version: FORECAST_SNAPSHOT_VERSION,
    citySlug: city.slug,
    purpose,
    request,
    forecasts: forecasts.map((forecast) => ({ modelId: forecast.modelId, fetchedAt: forecast.fetchedAt, hourly: forecast.hourly })),
    failures
  });
  const snapshot: ForecastSnapshot = {
    version: FORECAST_SNAPSHOT_VERSION,
    id,
    citySlug: city.slug,
    purpose,
    generatedAt,
    request,
    forecasts,
    failures,
    consensus
  };
  await persistForecastSnapshot(env.DB, snapshot);
  return snapshot;
}

export function consensusMapFromSnapshot(snapshot: ForecastSnapshot): Map<string, ConsensusHour> {
  if (snapshot.consensus.length === 0) throw new Error("forecast_snapshot_consensus_unavailable");
  return new Map(snapshot.consensus.map((point) => [point.time, point]));
}

