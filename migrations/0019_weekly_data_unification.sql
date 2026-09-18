-- LOKA weekly data unification.
-- Stores immutable forecast captures and versioned Météo-France daily archives.

CREATE TABLE IF NOT EXISTS forecast_snapshots (
  snapshot_id TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,
  purpose TEXT NOT NULL CHECK (purpose IN ('DAILY', 'WEEKLY')),
  start_date TEXT,
  end_date TEXT,
  forecast_days INTEGER NOT NULL CHECK (forecast_days BETWEEN 1 AND 16),
  generated_at TEXT NOT NULL,
  model_ids_json TEXT NOT NULL,
  failures_json TEXT NOT NULL,
  forecasts_json TEXT NOT NULL,
  consensus_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_forecast_snapshots_city_generated
ON forecast_snapshots(city_slug, generated_at DESC);

CREATE TABLE IF NOT EXISTS climate_daily_archive_chunks (
  station_id TEXT NOT NULL,
  snapshot_id TEXT NOT NULL,
  year INTEGER NOT NULL CHECK (year BETWEEN 1800 AND 2200),
  observations_json TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  first_date TEXT NOT NULL,
  last_date TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (station_id, snapshot_id, year)
);

CREATE INDEX IF NOT EXISTS idx_climate_daily_chunks_snapshot
ON climate_daily_archive_chunks(station_id, snapshot_id, year);

CREATE TABLE IF NOT EXISTS climate_archive_state (
  station_id TEXT NOT NULL,
  archive_kind TEXT NOT NULL CHECK (archive_kind = 'DAILY'),
  active_snapshot_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('READY', 'STALE', 'REJECTED')),
  dataset_url TEXT NOT NULL,
  resources_json TEXT NOT NULL,
  coverage_json TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count >= 0),
  first_date TEXT NOT NULL,
  last_date TEXT NOT NULL,
  source_updated_at TEXT NOT NULL,
  fetched_at TEXT NOT NULL,
  validated_at TEXT NOT NULL,
  fresh_until TEXT NOT NULL,
  last_error TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (station_id, archive_kind)
);

