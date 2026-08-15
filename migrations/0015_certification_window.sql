-- LOKA V24 — Bloc 12.15
-- Fenêtre de certification / gel temporaire des générations.
--
-- Objectif :
-- empêcher une génération manuelle ou cron de rendre obsolètes les preuves
-- 12.8 -> 12.12 pendant la recertification finale.
--
-- Le GO LIVE 12.13 conserve le droit de lancer UNE génération de cutover.
-- L'installation de cette migration n'ouvre aucune fenêtre.

CREATE TABLE IF NOT EXISTS certification_window (
  window_id TEXT PRIMARY KEY,
  city_slug TEXT NOT NULL,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'ACTIVE',
        'CONSUMED',
        'CANCELLED',
        'EXPIRED'
      )
    ),

  opened_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  closed_at TEXT,

  generated_at TEXT NOT NULL,
  public_engine TEXT NOT NULL,
  scene_key TEXT NOT NULL,
  publication_fingerprint TEXT NOT NULL,

  readiness_status TEXT NOT NULL,
  readiness_fingerprint TEXT NOT NULL,

  opened_by TEXT NOT NULL,
  close_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_certification_window_city
ON certification_window(city_slug, opened_at DESC);

CREATE INDEX IF NOT EXISTS idx_certification_window_active
ON certification_window(city_slug, status, expires_at);

CREATE TABLE IF NOT EXISTS certification_window_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  event_type TEXT NOT NULL
    CHECK (
      event_type IN (
        'OPEN_REFUSED',
        'OPENED',
        'GENERATION_BLOCKED',
        'CANCELLED',
        'CONSUMED',
        'EXPIRED'
      )
    ),

  event_at TEXT NOT NULL,
  window_id TEXT,

  generated_at TEXT,
  source TEXT,
  reason TEXT NOT NULL,

  snapshot_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_certification_window_audit_city
ON certification_window_audit(city_slug, event_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_certification_window_audit_no_update
BEFORE UPDATE ON certification_window_audit
BEGIN
  SELECT RAISE(
    ABORT,
    'certification_window_audit_is_append_only'
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_certification_window_audit_no_delete
BEFORE DELETE ON certification_window_audit
BEGIN
  SELECT RAISE(
    ABORT,
    'certification_window_audit_is_append_only'
  );
END;
