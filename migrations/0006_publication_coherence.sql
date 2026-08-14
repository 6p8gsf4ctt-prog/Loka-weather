-- LOKA V24 — Bloc 12.6
-- Immutable audit for each official generation and end-to-end public surface checks.

CREATE TABLE IF NOT EXISTS publication_generation_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  forecast_date TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  recorded_at TEXT NOT NULL,
  source TEXT NOT NULL,

  effective_engine TEXT NOT NULL
    CHECK (effective_engine IN ('LEGACY', 'V24')),

  scene_key TEXT NOT NULL,
  v24_scene_id INTEGER,
  fingerprint_sha256 TEXT NOT NULL,
  manifest_json TEXT NOT NULL,

  guard_status TEXT,
  fallback_applied INTEGER NOT NULL DEFAULT 0
    CHECK (fallback_applied IN (0, 1)),
  fallback_reason TEXT,

  surface_contract_version TEXT NOT NULL,
  verification_status TEXT NOT NULL
    CHECK (verification_status = 'VERIFIED'),

  UNIQUE(city_slug, generated_at)
);

CREATE INDEX IF NOT EXISTS idx_publication_generation_audit_city
ON publication_generation_audit(city_slug, recorded_at DESC);

CREATE TABLE IF NOT EXISTS publication_surface_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  checked_at TEXT NOT NULL,

  expected_engine TEXT NOT NULL,
  expected_scene TEXT NOT NULL,
  expected_fingerprint TEXT NOT NULL,

  status TEXT NOT NULL
    CHECK (status IN ('PASS', 'FAIL')),

  observations_json TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_publication_surface_audit_city
ON publication_surface_audit(city_slug, checked_at DESC);

-- Both audit tables are append-only.
CREATE TRIGGER IF NOT EXISTS trg_publication_generation_audit_no_update
BEFORE UPDATE ON publication_generation_audit
BEGIN
  SELECT RAISE(ABORT, 'publication_generation_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_publication_generation_audit_no_delete
BEFORE DELETE ON publication_generation_audit
BEGIN
  SELECT RAISE(ABORT, 'publication_generation_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_publication_surface_audit_no_update
BEFORE UPDATE ON publication_surface_audit
BEGIN
  SELECT RAISE(ABORT, 'publication_surface_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_publication_surface_audit_no_delete
BEFORE DELETE ON publication_surface_audit
BEGIN
  SELECT RAISE(ABORT, 'publication_surface_audit_is_append_only');
END;
