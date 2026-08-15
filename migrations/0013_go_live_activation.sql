-- LOKA V24 — Bloc 12.13
-- Final GO LIVE workflow.
--
-- Installing this migration DOES NOT activate V24.
-- Activation still requires:
-- READY_CANDIDATE + current FINAL_RC_PASS + current REHEARSAL_PASS
-- + current per-generation guard PASS + exact human confirmation.

CREATE TABLE IF NOT EXISTS go_live_challenge (
  challenge_id TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'PENDING',
        'ACTIVATING',
        'CONFIRMED',
        'FAILED',
        'EXPIRED',
        'CANCELLED'
      )
    ),

  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  confirmed_at TEXT,

  forecast_generated_at TEXT NOT NULL,
  public_fingerprint TEXT NOT NULL,

  readiness_status TEXT NOT NULL,
  readiness_fingerprint TEXT NOT NULL,

  final_release_audit_id INTEGER NOT NULL,
  mobile_rehearsal_audit_id INTEGER NOT NULL,

  scene24_id INTEGER NOT NULL,
  scene24_key TEXT NOT NULL,
  scene24_score REAL NOT NULL,
  scene24_confidence TEXT NOT NULL,
  master_file_name TEXT NOT NULL,

  snapshot_json TEXT NOT NULL,
  snapshot_fingerprint TEXT NOT NULL,

  failure_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_go_live_challenge_city
ON go_live_challenge(city_slug, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_go_live_challenge_status
ON go_live_challenge(city_slug, status, expires_at);

CREATE TABLE IF NOT EXISTS go_live_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (
      event_type IN (
        'PREPARE_REFUSED',
        'PREPARED',
        'CONFIRM_REFUSED',
        'ACTIVATION_STARTED',
        'ACTIVATED',
        'ACTIVATION_ABORTED'
      )
    ),

  event_at TEXT NOT NULL,
  challenge_id TEXT,

  generated_at_before TEXT,
  generated_at_after TEXT,

  requested_mode_before TEXT,
  requested_mode_after TEXT,

  v24_approved_before INTEGER
    CHECK (
      v24_approved_before IS NULL OR
      v24_approved_before IN (0, 1)
    ),

  v24_approved_after INTEGER
    CHECK (
      v24_approved_after IS NULL OR
      v24_approved_after IN (0, 1)
    ),

  effective_engine_after TEXT,
  scene_key_after TEXT,
  publication_fingerprint_after TEXT,

  readiness_status TEXT,
  readiness_fingerprint TEXT,

  final_release_audit_id INTEGER,
  mobile_rehearsal_audit_id INTEGER,

  snapshot_fingerprint TEXT,
  snapshot_json TEXT,

  legacy_restore_required INTEGER NOT NULL DEFAULT 0
    CHECK (legacy_restore_required IN (0, 1)),

  legacy_restore_verified INTEGER NOT NULL DEFAULT 0
    CHECK (legacy_restore_verified IN (0, 1)),

  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_go_live_audit_city
ON go_live_audit(city_slug, event_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_go_live_audit_no_update
BEFORE UPDATE ON go_live_audit
BEGIN
  SELECT RAISE(ABORT, 'go_live_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_go_live_audit_no_delete
BEFORE DELETE ON go_live_audit
BEGIN
  SELECT RAISE(ABORT, 'go_live_audit_is_append_only');
END;
