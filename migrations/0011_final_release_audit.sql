-- LOKA V24 — Bloc 12.11
-- Final technical Release Candidate audit.
--
-- This audit does not activate V24, does not generate a forecast, does not
-- mutate engine_control and does not authorize Instagram publication.

CREATE TABLE IF NOT EXISTS final_release_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,

  generated_at TEXT,
  effective_engine TEXT,
  scene_key TEXT,
  publication_fingerprint TEXT,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'FINAL_RC_PASS',
        'FINAL_RC_PENDING',
        'FINAL_RC_BLOCKED'
      )
    ),

  readiness_status TEXT,
  requested_mode TEXT,
  v24_approved INTEGER NOT NULL DEFAULT 0
    CHECK (v24_approved IN (0, 1)),

  blocking_pass_count INTEGER NOT NULL,
  blocking_fail_count INTEGER NOT NULL,
  blocking_pending_count INTEGER NOT NULL,

  checks_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,

  rehearsal_eligible INTEGER NOT NULL DEFAULT 0
    CHECK (rehearsal_eligible IN (0, 1)),

  go_live_instagram INTEGER NOT NULL DEFAULT 0
    CHECK (go_live_instagram = 0),

  production_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_mutated = 0),

  engine_control_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (engine_control_mutated = 0),

  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_final_release_audit_city
ON final_release_audit(city_slug, evaluated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_final_release_audit_no_update
BEFORE UPDATE ON final_release_audit
BEGIN
  SELECT RAISE(ABORT, 'final_release_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_final_release_audit_no_delete
BEFORE DELETE ON final_release_audit
BEGIN
  SELECT RAISE(ABORT, 'final_release_audit_is_append_only');
END;
