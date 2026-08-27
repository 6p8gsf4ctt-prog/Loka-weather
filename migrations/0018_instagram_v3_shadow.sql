-- LOKA V3 — Étape 7K
-- Audit append-only du dry-run d'automatisation Instagram V3.
-- Cette table ne peut ni publier sur Instagram ni autoriser une publication réelle.

CREATE TABLE IF NOT EXISTS instagram_v3_shadow_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  generation_id INTEGER,
  evaluated_at TEXT NOT NULL,

  trigger_source TEXT NOT NULL
    CHECK (trigger_source IN ('CRON_PRIMARY', 'CRON_RETRY', 'MANUAL_ADMIN', 'TEST')),

  status TEXT NOT NULL
    CHECK (status IN ('DRY_RUN_READY', 'BLOCKED')),

  plan_fingerprint_sha256 TEXT NOT NULL,
  page_count INTEGER NOT NULL CHECK (page_count = 2),
  guard_status TEXT NOT NULL CHECK (guard_status IN ('PASS', 'BLOCKED')),
  analysis_version TEXT,

  publish_attempted INTEGER NOT NULL DEFAULT 0 CHECK (publish_attempted = 0),
  outbound_meta_requests INTEGER NOT NULL DEFAULT 0 CHECK (outbound_meta_requests = 0),

  plan_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_instagram_v3_shadow_city
ON instagram_v3_shadow_audit(city_slug, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_instagram_v3_shadow_status
ON instagram_v3_shadow_audit(city_slug, status, evaluated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_instagram_v3_shadow_no_update
BEFORE UPDATE ON instagram_v3_shadow_audit
BEGIN
  SELECT RAISE(ABORT, 'instagram_v3_shadow_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_instagram_v3_shadow_no_delete
BEFORE DELETE ON instagram_v3_shadow_audit
BEGIN
  SELECT RAISE(ABORT, 'instagram_v3_shadow_audit_is_append_only');
END;
