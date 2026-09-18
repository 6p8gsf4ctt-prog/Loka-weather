-- Temporary editorial drafts used by the Sunday weekly preview workflow.
-- They are not public publications and expire automatically at read time.

CREATE TABLE IF NOT EXISTS weekly_preview_drafts (
  draft_id TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  payload_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_weekly_preview_drafts_range
ON weekly_preview_drafts(city_slug, start_date, generated_at DESC);
