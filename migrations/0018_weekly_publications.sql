-- LOKA weekly publication snapshots.
-- Separate from forecasts and daily_scene_ledger so the daily contract remains untouched.

CREATE TABLE IF NOT EXISTS weekly_publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  city_slug TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('EVENTS', 'CALM')),
  engine_version TEXT NOT NULL,
  editorial_json TEXT NOT NULL,
  carousel_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (city_slug, start_date, end_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_publications_city_start
ON weekly_publications(city_slug, start_date DESC);
