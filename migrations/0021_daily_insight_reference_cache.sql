-- Daily Insight background reference cache.
-- The public Daily engine does not read this table. It is reserved for the
-- isolated Daily Insight preview until explicit activation.

CREATE TABLE IF NOT EXISTS daily_insight_reference_cache (
  station_id TEXT PRIMARY KEY,
  reference_version TEXT NOT NULL,
  source_snapshot_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source_last_date TEXT NOT NULL,
  row_count INTEGER NOT NULL CHECK (row_count > 0),
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_insight_reference_source
ON daily_insight_reference_cache(source_snapshot_id, generated_at DESC);

