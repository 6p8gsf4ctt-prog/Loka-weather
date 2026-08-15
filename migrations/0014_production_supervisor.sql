-- LOKA V24 — Bloc 12.14
-- Production supervisor / post-GO-LIVE stabilisation.
--
-- This table is observational only. It cannot activate V24 and it cannot
-- automatically rollback production. Global rollback remains a separate,
-- explicit safety action.

CREATE TABLE IF NOT EXISTS production_supervisor_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  generated_at TEXT NOT NULL,

  phase TEXT NOT NULL
    CHECK (phase IN ('PRE_GO_LIVE', 'V24_LIVE')),

  status TEXT NOT NULL
    CHECK (
      status IN (
        'WAITING_READINESS',
        'RECERTIFICATION_REQUIRED',
        'GO_LIVE_ELIGIBLE',
        'PRE_GO_LIVE_BLOCKED',
        'V24_LIVE_HEALTHY',
        'V24_LIVE_STABLE',
        'V24_LIVE_WATCH',
        'ROLLBACK_RECOMMENDED',
        'UNAVAILABLE'
      )
    ),

  public_engine TEXT,
  requested_mode TEXT,
  v24_approved INTEGER NOT NULL DEFAULT 0
    CHECK (v24_approved IN (0, 1)),

  scene_key TEXT,
  publication_fingerprint TEXT,
  readiness_status TEXT,

  final_rc_current INTEGER NOT NULL DEFAULT 0
    CHECK (final_rc_current IN (0, 1)),
  rehearsal_current INTEGER NOT NULL DEFAULT 0
    CHECK (rehearsal_current IN (0, 1)),
  go_live_eligible INTEGER NOT NULL DEFAULT 0
    CHECK (go_live_eligible IN (0, 1)),

  guard_status TEXT,
  fallback_detected INTEGER NOT NULL DEFAULT 0
    CHECK (fallback_detected IN (0, 1)),

  legacy_backup_available INTEGER NOT NULL DEFAULT 0
    CHECK (legacy_backup_available IN (0, 1)),

  consecutive_v24_generations INTEGER NOT NULL DEFAULT 0
    CHECK (consecutive_v24_generations >= 0),

  checks_json TEXT NOT NULL,
  recommendation TEXT NOT NULL,

  production_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_mutated = 0),

  auto_rollback_triggered INTEGER NOT NULL DEFAULT 0
    CHECK (auto_rollback_triggered = 0),

  UNIQUE(city_slug, generated_at, phase)
);

CREATE INDEX IF NOT EXISTS idx_production_supervisor_city
ON production_supervisor_audit(city_slug, evaluated_at DESC);

CREATE INDEX IF NOT EXISTS idx_production_supervisor_status
ON production_supervisor_audit(city_slug, status, evaluated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_production_supervisor_no_update
BEFORE UPDATE ON production_supervisor_audit
BEGIN
  SELECT RAISE(ABORT, 'production_supervisor_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_production_supervisor_no_delete
BEFORE DELETE ON production_supervisor_audit
BEGIN
  SELECT RAISE(ABORT, 'production_supervisor_audit_is_append_only');
END;
