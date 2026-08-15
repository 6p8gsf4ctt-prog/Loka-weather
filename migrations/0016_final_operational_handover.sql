-- LOKA V24 — Bloc 12.16
-- Certification finale du système / handover opérationnel.
--
-- Cette migration n'active jamais V24, ne bloque aucune génération
-- et ne déclenche aucun rollback. Elle enregistre uniquement des audits
-- append-only de l'état technique final.

CREATE TABLE IF NOT EXISTS operational_handover_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  evaluated_at TEXT NOT NULL,
  generated_at TEXT,

  status TEXT NOT NULL
    CHECK (
      status IN (
        'SYSTEM_READY_WAITING_READINESS',
        'SYSTEM_READY_FOR_CERTIFICATION',
        'SYSTEM_READY_FOR_GO_LIVE',
        'SYSTEM_READY_V24_LIVE',
        'SYSTEM_LIVE_WATCH',
        'SYSTEM_BLOCKED',
        'UNAVAILABLE'
      )
    ),

  public_engine TEXT,
  requested_mode TEXT,
  v24_approved INTEGER NOT NULL DEFAULT 0
    CHECK (v24_approved IN (0, 1)),

  readiness_status TEXT,
  supervisor_status TEXT,
  certification_window_status TEXT,
  go_live_status TEXT,

  schema_complete INTEGER NOT NULL DEFAULT 0
    CHECK (schema_complete IN (0, 1)),

  legacy_backup_available INTEGER NOT NULL DEFAULT 0
    CHECK (legacy_backup_available IN (0, 1)),

  technical_chain_complete INTEGER NOT NULL DEFAULT 0
    CHECK (technical_chain_complete IN (0, 1)),

  checks_json TEXT NOT NULL,
  recommendation TEXT NOT NULL,

  production_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_mutated = 0),

  v24_activated INTEGER NOT NULL DEFAULT 0
    CHECK (v24_activated = 0),

  rollback_triggered INTEGER NOT NULL DEFAULT 0
    CHECK (rollback_triggered = 0)
);

CREATE INDEX IF NOT EXISTS idx_operational_handover_city
ON operational_handover_audit(
  city_slug,
  evaluated_at DESC
);

CREATE INDEX IF NOT EXISTS idx_operational_handover_status
ON operational_handover_audit(
  city_slug,
  status,
  evaluated_at DESC
);

CREATE TRIGGER IF NOT EXISTS trg_operational_handover_no_update
BEFORE UPDATE ON operational_handover_audit
BEGIN
  SELECT RAISE(
    ABORT,
    'operational_handover_audit_is_append_only'
  );
END;

CREATE TRIGGER IF NOT EXISTS trg_operational_handover_no_delete
BEFORE DELETE ON operational_handover_audit
BEGIN
  SELECT RAISE(
    ABORT,
    'operational_handover_audit_is_append_only'
  );
END;
