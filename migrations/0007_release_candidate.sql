-- LOKA V24 — Bloc 12.7
-- Functional Release Candidate validation audit.
-- This migration does NOT activate V24 and does NOT authorize Instagram publication.

CREATE TABLE IF NOT EXISTS release_candidate_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,

  generated_at TEXT,
  effective_engine TEXT,
  scene_key TEXT,
  publication_fingerprint TEXT,

  technical_status TEXT NOT NULL
    CHECK (
      technical_status IN (
        'RC_TECHNICAL_READY',
        'RC_PENDING',
        'RC_BLOCKED'
      )
    ),

  activation_eligibility TEXT NOT NULL
    CHECK (
      activation_eligibility IN (
        'NOT_REQUESTED',
        'WAITING_READINESS',
        'WAITING_APPROVAL',
        'WAITING_VALID_V24',
        'READY_TO_ARM',
        'V24_EFFECTIVE',
        'UNAVAILABLE'
      )
    ),

  checks_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,

  go_live_instagram INTEGER NOT NULL DEFAULT 0
    CHECK (go_live_instagram = 0),

  production_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_mutated = 0),

  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_release_candidate_audit_city
ON release_candidate_audit(city_slug, evaluated_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_release_candidate_audit_no_update
BEFORE UPDATE ON release_candidate_audit
BEGIN
  SELECT RAISE(ABORT, 'release_candidate_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_release_candidate_audit_no_delete
BEFORE DELETE ON release_candidate_audit
BEGIN
  SELECT RAISE(ABORT, 'release_candidate_audit_is_append_only');
END;
