-- LOKA V24 — Bloc 9
-- Historique append-only des décisions shadow.
-- Ne modifie pas la table forecasts et ne touche pas forecast.scene.

CREATE TABLE IF NOT EXISTS shadow_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  city_slug TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source TEXT NOT NULL,

  production_scene TEXT,
  legacy_score REAL,
  legacy_version TEXT,

  raw_scene_id INTEGER,
  raw_scene_key TEXT,
  raw_score REAL,
  raw_confidence TEXT,

  final_scene_id INTEGER,
  final_scene_key TEXT,
  final_score REAL,
  final_confidence TEXT,

  runner_up_scene_id INTEGER,
  runner_up_score REAL,

  fallback_used INTEGER NOT NULL DEFAULT 0,
  hysteresis_applied INTEGER NOT NULL DEFAULT 0,

  reliability_applied INTEGER NOT NULL DEFAULT 0,
  reliability_reason TEXT,
  reliability_version TEXT,

  model_count INTEGER NOT NULL DEFAULT 0,
  models_ok_json TEXT NOT NULL DEFAULT '[]',
  models_failed_json TEXT NOT NULL DEFAULT '{}',

  scene24_raw_json TEXT,
  scene24_json TEXT,
  reliability_json TEXT,
  day_profile_json TEXT,
  candidates_json TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(city_slug, generated_at)
);

CREATE INDEX IF NOT EXISTS idx_shadow_history_city_generated
ON shadow_history(city_slug, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shadow_history_city_date
ON shadow_history(city_slug, forecast_date DESC, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_shadow_history_final_scene
ON shadow_history(city_slug, final_scene_id, generated_at DESC);
