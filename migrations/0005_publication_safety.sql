-- LOKA V24 — Bloc 12.5
-- Persistent last-known-good Legacy backup and append-only publication fallback audit.

CREATE TABLE IF NOT EXISTS public_forecast_backup (
  city_slug TEXT PRIMARY KEY,
  forecast_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  source TEXT NOT NULL,
  engine TEXT NOT NULL CHECK (engine = 'LEGACY'),
  forecast_json TEXT NOT NULL,
  checksum_sha256 TEXT NOT NULL,
  backup_reason TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS publication_fallback_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,
  city_slug TEXT NOT NULL,
  forecast_date TEXT,
  generated_at TEXT,
  event_at TEXT NOT NULL,

  stage TEXT NOT NULL CHECK (
    stage IN (
      'PREFLIGHT',
      'BACKUP',
      'WRITE',
      'VERIFY',
      'RECOVERY'
    )
  ),

  requested_engine TEXT,
  final_engine TEXT,
  reason TEXT NOT NULL,
  detail_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_publication_fallback_audit_city
ON publication_fallback_audit(city_slug, event_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_publication_fallback_audit_no_update
BEFORE UPDATE ON publication_fallback_audit
BEGIN
  SELECT RAISE(ABORT, 'publication_fallback_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_publication_fallback_audit_no_delete
BEFORE DELETE ON publication_fallback_audit
BEGIN
  SELECT RAISE(ABORT, 'publication_fallback_audit_is_append_only');
END;
