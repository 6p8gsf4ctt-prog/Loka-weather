-- LOKA V24 — Bloc 12.10
-- Real, controlled rollback drill audit.
--
-- The drill intentionally mutates engine_control only while the precondition
-- is LEGACY + unapproved, then returns it to LEGACY.
-- It never writes a forecast and never grants V24 approval.

CREATE TABLE IF NOT EXISTS rollback_drill_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  run_at TEXT NOT NULL,

  generated_at_before TEXT,
  generated_at_after TEXT,

  status TEXT NOT NULL
    CHECK (status IN ('PASS', 'FAIL', 'REFUSED')),

  requested_mode_before TEXT,
  requested_mode_after TEXT,
  approved_before INTEGER NOT NULL DEFAULT 0
    CHECK (approved_before IN (0, 1)),
  approved_after INTEGER NOT NULL DEFAULT 0
    CHECK (approved_after IN (0, 1)),

  public_engine_before TEXT,
  public_engine_after TEXT,
  public_fingerprint_before TEXT,
  public_fingerprint_after TEXT,

  preview_step_verified INTEGER NOT NULL DEFAULT 0
    CHECK (preview_step_verified IN (0, 1)),
  locked_intent_step_verified INTEGER NOT NULL DEFAULT 0
    CHECK (locked_intent_step_verified IN (0, 1)),
  rollback_verified INTEGER NOT NULL DEFAULT 0
    CHECK (rollback_verified IN (0, 1)),
  public_identity_unchanged INTEGER NOT NULL DEFAULT 0
    CHECK (public_identity_unchanged IN (0, 1)),

  production_forecast_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_forecast_mutated = 0),

  v24_approval_granted INTEGER NOT NULL DEFAULT 0
    CHECK (v24_approval_granted = 0),

  engine_control_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (engine_control_mutated IN (0, 1)),

  emergency_cleanup_used INTEGER NOT NULL DEFAULT 0
    CHECK (emergency_cleanup_used IN (0, 1)),

  steps_json TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rollback_drill_audit_city
ON rollback_drill_audit(city_slug, run_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_rollback_drill_audit_no_update
BEFORE UPDATE ON rollback_drill_audit
BEGIN
  SELECT RAISE(ABORT, 'rollback_drill_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_rollback_drill_audit_no_delete
BEFORE DELETE ON rollback_drill_audit
BEGIN
  SELECT RAISE(ABORT, 'rollback_drill_audit_is_append_only');
END;
