-- LOKA Scene Engine V2 — official daily scene ledger.
-- Keeps shadow_history as append-only generation history and adds the compact
-- immutable public snapshot needed to promote a verified generation later.

ALTER TABLE shadow_history ADD COLUMN public_payload_json TEXT;
ALTER TABLE shadow_history ADD COLUMN manifest_json TEXT;
ALTER TABLE shadow_history ADD COLUMN manifest_hash TEXT;
ALTER TABLE shadow_history ADD COLUMN resolution_mode TEXT;
ALTER TABLE shadow_history ADD COLUMN doctrine_version TEXT;
ALTER TABLE shadow_history ADD COLUMN engine_version TEXT;

CREATE TABLE IF NOT EXISTS daily_scene_tracking (
  city_slug TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  started_at TEXT NOT NULL,
  PRIMARY KEY (city_slug, forecast_date)
);

CREATE TABLE IF NOT EXISTS daily_scene_ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_slug TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  revision INTEGER NOT NULL CHECK (revision >= 1),
  status TEXT NOT NULL CHECK (status IN ('OFFICIAL', 'RECOVERED')),
  generation_id INTEGER NOT NULL,
  scene_id INTEGER NOT NULL CHECK (scene_id BETWEEN 1 AND 24),
  scene_key TEXT NOT NULL,
  scene_label TEXT NOT NULL,
  forecast_generated_at TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence TEXT NOT NULL CHECK (confidence IN ('HIGH', 'MEDIUM', 'LOW')),
  resolution_mode TEXT NOT NULL CHECK (resolution_mode IN ('DIRECT', 'NEIGHBOR_RESOLUTION', 'CONSERVATIVE', 'HYSTERESIS')),
  runner_up_scene_id INTEGER CHECK (runner_up_scene_id IS NULL OR runner_up_scene_id BETWEEN 1 AND 24),
  engine_version TEXT NOT NULL,
  doctrine_version TEXT NOT NULL,
  manifest_hash TEXT NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (city_slug, forecast_date, revision),
  UNIQUE (generation_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_scene_ledger_city_date
ON daily_scene_ledger(city_slug, forecast_date DESC, revision DESC);

CREATE INDEX IF NOT EXISTS idx_daily_scene_ledger_scene
ON daily_scene_ledger(city_slug, scene_id, forecast_date DESC);
