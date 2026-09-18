import {
  WEEKLY_CLIMATE_REFERENCE_VERSION,
  WEEKLY_CLIMATE_STATION_ID,
  WEEKLY_CLIMATE_STATION_NAME,
  type ClimateCoverageReport,
  type ClimateDailyObservation,
  type ClimateProvenance
} from "../engine/weekly/climateReferences";

export type ClimateArchiveCacheStatus = "READY" | "STALE" | "UNAVAILABLE" | "REJECTED";

export interface ClimateArchiveResourceRecord {
  id: string;
  title: string;
  url: string;
  format: string;
  lastModified: string;
  acquiredAt: string;
}

export interface ClimateArchiveCacheState {
  stationId: string;
  activeSnapshotId: string;
  status: Exclude<ClimateArchiveCacheStatus, "UNAVAILABLE">;
  datasetUrl: string;
  resources: ClimateArchiveResourceRecord[];
  coverage: Record<string, ClimateCoverageReport>;
  rowCount: number;
  firstDate: string;
  lastDate: string;
  sourceUpdatedAt: string;
  fetchedAt: string;
  validatedAt: string;
  freshUntil: string;
  lastError: string | null;
}

export interface ClimateArchiveCacheResult {
  status: ClimateArchiveCacheStatus;
  detail: string;
  observations: ClimateDailyObservation[];
  state: ClimateArchiveCacheState | null;
}

export interface SaveClimateDailyArchiveInput {
  snapshotId: string;
  datasetUrl: string;
  resources: ClimateArchiveResourceRecord[];
  coverage: Record<string, ClimateCoverageReport>;
  observations: ClimateDailyObservation[];
  sourceUpdatedAt: string;
  fetchedAt: string;
  validatedAt: string;
  freshUntil: string;
}

interface ClimateArchiveStateRow {
  station_id: string;
  active_snapshot_id: string;
  status: "READY" | "STALE" | "REJECTED";
  dataset_url: string;
  resources_json: string;
  coverage_json: string;
  row_count: number;
  first_date: string;
  last_date: string;
  source_updated_at: string;
  fetched_at: string;
  validated_at: string;
  fresh_until: string;
  last_error: string | null;
}

interface ClimateArchiveChunkRow {
  observations_json: string;
}

interface ClimateArchiveSnapshotRow {
  snapshot_id: string;
}

type StoredDailyTuple = [
  date: string,
  tminC: number | null,
  tmaxC: number | null,
  rainMm: number | null,
  gust3sMs: number | null,
  qTmin: number | null,
  qTmax: number | null,
  qRain: number | null,
  qGust: number | null,
  resourceId: string
];

function parseJson<T>(value: string, label: string): T {
  try { return JSON.parse(value) as T; }
  catch { throw new Error(`climate_archive_corrupt_${label}`); }
}

function hasDatabase(db: D1Database | undefined): db is D1Database {
  return !!db && typeof db.prepare === "function";
}

function stateFromRow(row: ClimateArchiveStateRow): ClimateArchiveCacheState {
  return {
    stationId: row.station_id,
    activeSnapshotId: row.active_snapshot_id,
    status: row.status,
    datasetUrl: row.dataset_url,
    resources: parseJson(row.resources_json, "resources"),
    coverage: parseJson(row.coverage_json, "coverage"),
    rowCount: row.row_count,
    firstDate: row.first_date,
    lastDate: row.last_date,
    sourceUpdatedAt: row.source_updated_at,
    fetchedAt: row.fetched_at,
    validatedAt: row.validated_at,
    freshUntil: row.fresh_until,
    lastError: row.last_error
  };
}

function tuple(observation: ClimateDailyObservation): StoredDailyTuple {
  return [
    observation.date,
    observation.tminC,
    observation.tmaxC,
    observation.rainMm,
    observation.gust3sMs,
    observation.quality.tminC ?? null,
    observation.quality.tmaxC ?? null,
    observation.quality.rainMm ?? null,
    observation.quality.gust3sMs ?? null,
    observation.provenance.resourceId
  ];
}

async function runStatements(db: D1Database, statements: D1PreparedStatement[]): Promise<void> {
  const batchSize = 50;
  for (let index = 0; index < statements.length; index += batchSize) {
    const batch = statements.slice(index, index + batchSize);
    if (typeof db.batch === "function") await db.batch(batch);
    else for (const statement of batch) await statement.run();
  }
}

export async function saveClimateDailyArchive(db: D1Database, input: SaveClimateDailyArchiveInput): Promise<void> {
  if (!hasDatabase(db)) throw new Error("climate_archive_database_unavailable");
  if (!input.observations.length) throw new Error("climate_archive_empty");
  const ordered = [...input.observations].sort((a, b) => a.date.localeCompare(b.date));
  const byYear = new Map<number, ClimateDailyObservation[]>();
  for (const observation of ordered) {
    const year = Number(observation.date.slice(0, 4));
    const bucket = byYear.get(year) ?? [];
    bucket.push(observation);
    byYear.set(year, bucket);
  }
  const statements = [...byYear.entries()].map(([year, rows]) => db.prepare(`
    INSERT INTO climate_daily_archive_chunks (
      station_id, snapshot_id, year, observations_json, row_count, first_date, last_date
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(station_id, snapshot_id, year) DO UPDATE SET
      observations_json = excluded.observations_json,
      row_count = excluded.row_count,
      first_date = excluded.first_date,
      last_date = excluded.last_date
  `).bind(
    WEEKLY_CLIMATE_STATION_ID,
    input.snapshotId,
    year,
    JSON.stringify(rows.map(tuple)),
    rows.length,
    rows[0].date,
    rows[rows.length - 1].date
  ));
  await runStatements(db, statements);
  await db.prepare(`
    INSERT INTO climate_archive_state (
      station_id, archive_kind, active_snapshot_id, status, dataset_url,
      resources_json, coverage_json, row_count, first_date, last_date,
      source_updated_at, fetched_at, validated_at, fresh_until, last_error
    ) VALUES (?, 'DAILY', ?, 'READY', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)
    ON CONFLICT(station_id, archive_kind) DO UPDATE SET
      active_snapshot_id = excluded.active_snapshot_id,
      status = excluded.status,
      dataset_url = excluded.dataset_url,
      resources_json = excluded.resources_json,
      coverage_json = excluded.coverage_json,
      row_count = excluded.row_count,
      first_date = excluded.first_date,
      last_date = excluded.last_date,
      source_updated_at = excluded.source_updated_at,
      fetched_at = excluded.fetched_at,
      validated_at = excluded.validated_at,
      fresh_until = excluded.fresh_until,
      last_error = NULL,
      updated_at = CURRENT_TIMESTAMP
  `).bind(
    WEEKLY_CLIMATE_STATION_ID,
    input.snapshotId,
    input.datasetUrl,
    JSON.stringify(input.resources),
    JSON.stringify(input.coverage),
    ordered.length,
    ordered[0].date,
    ordered[ordered.length - 1].date,
    input.sourceUpdatedAt,
    input.fetchedAt,
    input.validatedAt,
    input.freshUntil
  ).run();

  // The archive is reproducible from the official source. Keep the active
  // capture and one rollback capture only, so refreshes cannot grow D1 without
  // bound.
  const snapshots = await db.prepare(`
    SELECT snapshot_id
    FROM climate_daily_archive_chunks
    WHERE station_id = ?
    GROUP BY snapshot_id
    ORDER BY MAX(created_at) DESC, snapshot_id DESC
  `).bind(WEEKLY_CLIMATE_STATION_ID).all<ClimateArchiveSnapshotRow>();
  for (const stale of snapshots.results.slice(2)) {
    await db.prepare(`
      DELETE FROM climate_daily_archive_chunks
      WHERE station_id = ? AND snapshot_id = ?
    `).bind(WEEKLY_CLIMATE_STATION_ID, stale.snapshot_id).run();
  }
}

export async function loadClimateDailyArchive(db: D1Database | undefined, now = new Date()): Promise<ClimateArchiveCacheResult> {
  if (!hasDatabase(db)) return { status: "UNAVAILABLE", detail: "climate_cache_database_unavailable", observations: [], state: null };
  try {
    const row = await db.prepare(`
      SELECT * FROM climate_archive_state
      WHERE station_id = ? AND archive_kind = 'DAILY'
      LIMIT 1
    `).bind(WEEKLY_CLIMATE_STATION_ID).first<ClimateArchiveStateRow>();
    if (!row) return { status: "UNAVAILABLE", detail: "climate_cache_empty", observations: [], state: null };
    const state = stateFromRow(row);
    const chunks = await db.prepare(`
      SELECT observations_json FROM climate_daily_archive_chunks
      WHERE station_id = ? AND snapshot_id = ?
      ORDER BY year
    `).bind(WEEKLY_CLIMATE_STATION_ID, state.activeSnapshotId).all<ClimateArchiveChunkRow>();
    const resources = new Map(state.resources.map((item) => [item.id, item]));
    const observations: ClimateDailyObservation[] = [];
    for (const chunk of chunks.results) {
      for (const stored of parseJson<StoredDailyTuple[]>(chunk.observations_json, "chunk")) {
        const resource = resources.get(stored[9]);
        if (!resource) throw new Error("climate_archive_resource_missing");
        const provenance: ClimateProvenance = {
          provider: "METEO_FRANCE",
          stationId: WEEKLY_CLIMATE_STATION_ID,
          stationName: WEEKLY_CLIMATE_STATION_NAME,
          resourceId: resource.id,
          acquiredAt: resource.acquiredAt,
          referenceVersion: WEEKLY_CLIMATE_REFERENCE_VERSION
        };
        observations.push({
          stationId: WEEKLY_CLIMATE_STATION_ID,
          date: stored[0],
          tminC: stored[1],
          tmaxC: stored[2],
          rainMm: stored[3],
          gust3sMs: stored[4],
          quality: { tminC: stored[5], tmaxC: stored[6], rainMm: stored[7], gust3sMs: stored[8] },
          provenance
        });
      }
    }
    if (observations.length !== state.rowCount) throw new Error("climate_archive_row_count_mismatch");
    const fresh = state.status === "READY" && Date.parse(state.freshUntil) >= now.getTime();
    return {
      status: fresh ? "READY" : "STALE",
      detail: fresh ? `climate_cache_ready:${observations.length}` : `climate_cache_stale:${state.freshUntil}`,
      observations,
      state
    };
  } catch (error) {
    return {
      status: "REJECTED",
      detail: error instanceof Error ? error.message : "climate_cache_rejected",
      observations: [],
      state: null
    };
  }
}
