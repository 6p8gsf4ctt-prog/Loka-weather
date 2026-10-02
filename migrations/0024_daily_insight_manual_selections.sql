-- One optional human editorial choice per city and local date.
-- The candidate is revalidated against the latest generated draft before use.
CREATE TABLE IF NOT EXISTS daily_insight_manual_selections (
  city_slug TEXT NOT NULL,
  target_date TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  selected_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (city_slug, target_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_insight_manual_selections_recent
ON daily_insight_manual_selections(city_slug, target_date DESC);
