CREATE TABLE IF NOT EXISTS forecasts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_slug TEXT NOT NULL,
  city_name TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source TEXT NOT NULL,
  temp_max_c INTEGER NOT NULL,
  temp_min_c INTEGER NOT NULL,
  main_verdict TEXT NOT NULL,
  rain_verdict TEXT NOT NULL,
  notable_event TEXT,
  confidence_main INTEGER NOT NULL,
  confidence_rain INTEGER NOT NULL,
  hourly_json TEXT NOT NULL,
  diagnostics_json TEXT NOT NULL,
  UNIQUE(city_slug, forecast_date)
);

CREATE INDEX IF NOT EXISTS idx_forecasts_city_date
ON forecasts(city_slug, forecast_date DESC);

CREATE TABLE IF NOT EXISTS runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_slug TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  models_ok_json TEXT NOT NULL,
  models_failed_json TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_runs_city_generated
ON runs(city_slug, generated_at DESC);
