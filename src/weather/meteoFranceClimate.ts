import {
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME,
  WEEKLY_DAILY_REFERENCE_END_YEAR,
  WEEKLY_DAILY_REFERENCE_START_YEAR,
  dailyCoverage,
  normalizeDailyArchiveRow,
  type ClimateCoverageReport,
  type ClimateDailyObservation,
  type ClimateProvenance
} from "../engine/weekly/climateReferences";
import {
  loadClimateDailyArchive,
  saveClimateDailyArchive,
  type ClimateArchiveCacheResult,
  type ClimateArchiveResourceRecord
} from "../storage/climateArchive";
import type { Env } from "../types";

export const METEO_FRANCE_DAILY_DATASET_API = "https://www.data.gouv.fr/api/1/datasets/donnees-climatologiques-de-base-quotidiennes/";
export const METEO_FRANCE_CLIMATE_DEPARTMENT = "64";
export const METEO_FRANCE_CLIMATE_REFRESH_HOURS = 12;
export const METEO_FRANCE_CLIMATE_MAX_OBSERVATION_AGE_DAYS = 7;
export const METEO_FRANCE_CLIMATE_FETCH_TIMEOUT_MS = 60_000;

export interface DataGouvClimateResource {
  id: string;
  title: string;
  url: string;
  format?: string | null;
  last_modified?: string | null;
}

export interface DataGouvClimateDataset {
  id: string;
  last_update?: string;
  resources: DataGouvClimateResource[];
}

export interface ClimateArchiveQuality {
  acceptable: boolean;
  rowCount: number;
  firstDate: string;
  lastDate: string;
  latestObservationAgeDays: number;
  coverage: Record<string, ClimateCoverageReport>;
  issues: string[];
}

function envNumber(value: string | undefined, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(minimum, Math.min(maximum, Math.round(parsed))) : fallback;
}

function resourcePeriodPriority(title: string): number {
  if (/periode_1950-\d{4}/i.test(title)) return 1;
  if (/periode_\d{4}-\d{4}/i.test(title) || /latest/i.test(title)) return 2;
  return 0;
}

/** Selects the stable historical file and the rolling two-year file for dept. 64. */
export function selectMeteoFranceDailyResources(dataset: DataGouvClimateDataset): DataGouvClimateResource[] {
  const prefix = `QUOT_departement_${METEO_FRANCE_CLIMATE_DEPARTMENT}_periode_`;
  const selected = dataset.resources
    .filter((item) => item.title.startsWith(prefix))
    .filter((item) => /RR-T-Vent/i.test(item.title))
    .filter((item) => !/avant-1949/i.test(item.title))
    .filter((item) => (item.format ?? "").toLowerCase() === "csv.gz" || item.url.toLowerCase().endsWith(".csv.gz"))
    .sort((a, b) => resourcePeriodPriority(a.title) - resourcePeriodPriority(b.title) || a.title.localeCompare(b.title));
  const historical = selected.filter((item) => resourcePeriodPriority(item.title) === 1).slice(-1);
  const rolling = selected.filter((item) => resourcePeriodPriority(item.title) === 2).slice(-1);
  const result = [...historical, ...rolling];
  if (result.length !== 2) throw new Error(`meteo_france_daily_resources_incomplete:${result.map((item) => item.title).join(",")}`);
  return result;
}

function record(line: string, headers: string[]): Record<string, string> {
  const values = line.split(";");
  return Object.fromEntries(headers.map((header, index) => [header, values[index]?.trim() ?? ""]));
}

export async function readMeteoFranceDailyResource(response: Response, provenance: ClimateProvenance): Promise<ClimateDailyObservation[]> {
  if (!response.body) throw new Error("meteo_france_daily_empty_body");
  let bytes: ReadableStream<Uint8Array> = response.body;
  bytes = bytes.pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>);
  const reader = bytes.pipeThrough(new TextDecoderStream() as unknown as TransformStream<Uint8Array, string>).getReader();
  const observations: ClimateDailyObservation[] = [];
  let buffer = "";
  let headers: string[] | null = null;
  const consume = (rawLine: string): void => {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) return;
    if (!headers) {
      headers = line.replace(/^\uFEFF/, "").split(";").map((item) => item.trim());
      if (!headers.includes("NUM_POSTE") || !headers.includes("AAAAMMJJ")) throw new Error("meteo_france_daily_header_invalid");
      return;
    }
    if (!line.startsWith(`${WEEKLY_CLIMATE_STATION_ID};`)) return;
    const normalized = normalizeDailyArchiveRow(record(line, headers), provenance);
    if (normalized) observations.push(normalized);
  };
  while (true) {
    const next = await reader.read();
    if (next.done) break;
    buffer += next.value;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      consume(buffer.slice(0, newline));
      buffer = buffer.slice(newline + 1);
      newline = buffer.indexOf("\n");
    }
  }
  if (buffer.trim()) consume(buffer);
  if (!headers || observations.length === 0) throw new Error(`meteo_france_daily_station_missing:${provenance.resourceId}`);
  return observations;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal, headers: { "User-Agent": "LOKA-Weather/2.0 climate-ingestion" } });
  } finally {
    clearTimeout(timeout);
  }
}

function daysBetween(left: string, right: Date): number {
  return Math.max(0, Math.floor((right.getTime() - Date.parse(`${left}T12:00:00Z`)) / 86_400_000));
}

export function evaluateMeteoFranceDailyArchive(observations: ClimateDailyObservation[], now: Date): ClimateArchiveQuality {
  const ordered = [...observations].sort((a, b) => a.date.localeCompare(b.date));
  if (!ordered.length) return { acceptable: false, rowCount: 0, firstDate: "", lastDate: "", latestObservationAgeDays: Number.POSITIVE_INFINITY, coverage: {}, issues: ["empty_archive"] };
  const coverage = {
    tminC: dailyCoverage(ordered, "tminC", WEEKLY_DAILY_REFERENCE_START_YEAR, WEEKLY_DAILY_REFERENCE_END_YEAR),
    tmaxC: dailyCoverage(ordered, "tmaxC", WEEKLY_DAILY_REFERENCE_START_YEAR, WEEKLY_DAILY_REFERENCE_END_YEAR),
    rainMm: dailyCoverage(ordered, "rainMm", WEEKLY_DAILY_REFERENCE_START_YEAR, WEEKLY_DAILY_REFERENCE_END_YEAR)
  };
  const firstDate = ordered[0].date;
  const lastDate = ordered[ordered.length - 1].date;
  const latestObservationAgeDays = daysBetween(lastDate, now);
  const issues: string[] = [];
  if (ordered.length < 20_000) issues.push(`insufficient_depth:${ordered.length}`);
  for (const [metric, report] of Object.entries(coverage)) if (!report.acceptable) issues.push(`insufficient_coverage:${metric}:${report.coverage.toFixed(3)}`);
  if (latestObservationAgeDays > METEO_FRANCE_CLIMATE_MAX_OBSERVATION_AGE_DAYS) issues.push(`latest_observation_too_old:${lastDate}`);
  return { acceptable: issues.length === 0, rowCount: ordered.length, firstDate, lastDate, latestObservationAgeDays, coverage, issues };
}

function mergeObservations(resourceRows: ClimateDailyObservation[][]): ClimateDailyObservation[] {
  const merged = new Map<string, ClimateDailyObservation>();
  for (const rows of resourceRows) for (const observation of rows) merged.set(observation.date, observation);
  return [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function maxIso(values: string[]): string {
  return [...values].sort().at(-1) ?? new Date(0).toISOString();
}

function addHours(value: Date, hours: number): string {
  return new Date(value.getTime() + hours * 3_600_000).toISOString();
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((item) => item.toString(16).padStart(2, "0")).join("");
}

async function importMeteoFranceDailyArchive(env: Env, now: Date): Promise<ClimateArchiveCacheResult> {
  const datasetUrl = env.METEO_FRANCE_DAILY_DATASET_URL || METEO_FRANCE_DAILY_DATASET_API;
  const timeoutMs = envNumber(env.METEO_FRANCE_CLIMATE_FETCH_TIMEOUT_MS, METEO_FRANCE_CLIMATE_FETCH_TIMEOUT_MS, 5_000, 120_000);
  const metadataResponse = await fetchWithTimeout(datasetUrl, timeoutMs);
  if (!metadataResponse.ok) throw new Error(`meteo_france_dataset_http_${metadataResponse.status}`);
  const dataset = await metadataResponse.json() as DataGouvClimateDataset;
  const selected = selectMeteoFranceDailyResources(dataset);
  const acquiredAt = now.toISOString();
  const resources: ClimateArchiveResourceRecord[] = [];
  const resourceRows: ClimateDailyObservation[][] = [];
  for (const item of selected) {
    const response = await fetchWithTimeout(item.url, timeoutMs);
    if (!response.ok) throw new Error(`meteo_france_resource_http_${response.status}:${item.id}`);
    const resource: ClimateArchiveResourceRecord = {
      id: item.id,
      title: item.title,
      url: item.url,
      format: item.format ?? "csv.gz",
      lastModified: item.last_modified || dataset.last_update || acquiredAt,
      acquiredAt
    };
    const provenance: ClimateProvenance = {
      provider: "METEO_FRANCE",
      stationId: WEEKLY_CLIMATE_STATION_ID,
      stationName: WEEKLY_CLIMATE_STATION_NAME,
      resourceId: item.id,
      acquiredAt,
      referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION
    };
    resources.push(resource);
    resourceRows.push(await readMeteoFranceDailyResource(response, provenance));
  }
  const observations = mergeObservations(resourceRows);
  const quality = evaluateMeteoFranceDailyArchive(observations, now);
  if (!quality.acceptable) throw new Error(`meteo_france_archive_rejected:${quality.issues.join(",")}`);
  const sourceUpdatedAt = maxIso(resources.map((item) => item.lastModified));
  const snapshotId = await sha256(JSON.stringify({ resources: resources.map((item) => [item.id, item.lastModified]), rowCount: quality.rowCount, firstDate: quality.firstDate, lastDate: quality.lastDate }));
  const refreshHours = envNumber(env.METEO_FRANCE_CLIMATE_REFRESH_HOURS, METEO_FRANCE_CLIMATE_REFRESH_HOURS, 1, 168);
  await saveClimateDailyArchive(env.DB, {
    snapshotId,
    datasetUrl,
    resources,
    coverage: quality.coverage,
    observations,
    sourceUpdatedAt,
    fetchedAt: acquiredAt,
    validatedAt: acquiredAt,
    freshUntil: addHours(now, refreshHours)
  });
  return loadClimateDailyArchive(env.DB, now);
}

/** Loads a validated local snapshot and refreshes it automatically when stale. */
export async function ensureMeteoFranceDailyArchive(env: Env, now = new Date(), force = false): Promise<ClimateArchiveCacheResult> {
  const cached = await loadClimateDailyArchive(env.DB, now);
  if (!force && cached.status === "READY") return cached;
  try {
    return await importMeteoFranceDailyArchive(env, now);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "meteo_france_archive_refresh_failed";
    console.error("meteo_france_climate_refresh_failed", detail);
    if (cached.observations.length) return { ...cached, status: "STALE", detail: `climate_refresh_failed:${detail}` };
    return { status: "UNAVAILABLE", detail, observations: [], state: null };
  }
}
