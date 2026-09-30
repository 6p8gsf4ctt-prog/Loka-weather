-- Daily Insight enriched laboratory bundle.
-- This table is not read by the active Daily publication pipeline.
CREATE TABLE IF NOT EXISTS daily_insight_data_cache (
  city_slug TEXT NOT NULL,
  target_date TEXT NOT NULL,
  bundle_version TEXT NOT NULL,
  bundle_id TEXT NOT NULL,
  forecast_snapshot_id TEXT NOT NULL,
  reference_snapshot_id TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (city_slug, target_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_insight_data_cache_generated
ON daily_insight_data_cache(city_slug, generated_at DESC);
