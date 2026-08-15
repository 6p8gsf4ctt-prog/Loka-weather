-- LOKA V24 — Bloc 12.12
-- Full mobile rehearsal audit.
--
-- The rehearsal temporarily enables V24_PREVIEW only.
-- It never grants V24 approval, never writes a forecast and always requires
-- a final rollback to LEGACY before PASS.

CREATE TABLE IF NOT EXISTS mobile_rehearsal_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  run_at TEXT NOT NULL,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'REHEARSAL_PASS',
        'REHEARSAL_FAIL',
        'REHEARSAL_REFUSED'
      )
    ),

  final_release_audit_id INTEGER,

  generated_at_before TEXT,
  generated_at_after TEXT,

  public_engine_before TEXT,
  public_engine_after TEXT,
  public_scene_before TEXT,
  public_scene_after TEXT,
  public_fingerprint_before TEXT,
  public_fingerprint_after TEXT,

  preview_scene_id INTEGER,
  preview_scene_key TEXT,
  preview_master_file_name TEXT,

  public_surfaces_verified INTEGER NOT NULL DEFAULT 0
    CHECK (public_surfaces_verified IN (0, 1)),

  preview_dashboard_verified INTEGER NOT NULL DEFAULT 0
    CHECK (preview_dashboard_verified IN (0, 1)),

  preview_instagram_verified INTEGER NOT NULL DEFAULT 0
    CHECK (preview_instagram_verified IN (0, 1)),

  preview_master_verified INTEGER NOT NULL DEFAULT 0
    CHECK (preview_master_verified IN (0, 1)),

  rollback_verified INTEGER NOT NULL DEFAULT 0
    CHECK (rollback_verified IN (0, 1)),

  final_control_legacy INTEGER NOT NULL DEFAULT 0
    CHECK (final_control_legacy IN (0, 1)),

  public_identity_unchanged INTEGER NOT NULL DEFAULT 0
    CHECK (public_identity_unchanged IN (0, 1)),

  production_forecast_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_forecast_mutated = 0),

  v24_approval_granted INTEGER NOT NULL DEFAULT 0
    CHECK (v24_approval_granted = 0),

  engine_control_temporarily_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (engine_control_temporarily_mutated IN (0, 1)),

  checks_json TEXT NOT NULL,
  observations_json TEXT NOT NULL,
  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mobile_rehearsal_audit_city
ON mobile_rehearsal_audit(city_slug, run_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_mobile_rehearsal_audit_no_update
BEFORE UPDATE ON mobile_rehearsal_audit
BEGIN
  SELECT RAISE(ABORT, 'mobile_rehearsal_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_mobile_rehearsal_audit_no_delete
BEFORE DELETE ON mobile_rehearsal_audit
BEGIN
  SELECT RAISE(ABORT, 'mobile_rehearsal_audit_is_append_only');
END;
