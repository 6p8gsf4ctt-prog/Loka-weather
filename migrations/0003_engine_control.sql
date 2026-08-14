-- LOKA V24 — Bloc 11.1
-- Contrôle de moteur et rollback.
-- Ce sous-bloc ne permet PAS encore d'activer V24 en production.

CREATE TABLE IF NOT EXISTS engine_control (
  city_slug TEXT PRIMARY KEY,

  requested_mode TEXT NOT NULL DEFAULT 'LEGACY'
    CHECK (requested_mode IN ('LEGACY', 'V24_PREVIEW', 'V24')),

  v24_approved INTEGER NOT NULL DEFAULT 0
    CHECK (v24_approved IN (0, 1)),

  approved_at TEXT,
  approved_by TEXT,

  rollback_at TEXT,
  rollback_reason TEXT,

  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO engine_control (
  city_slug,
  requested_mode,
  v24_approved
) VALUES (
  'tarnos',
  'LEGACY',
  0
);
