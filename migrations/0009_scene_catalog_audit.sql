-- LOKA V24 — Bloc 12.9
-- Exhaustive audit of the 24-scene registry, masters and native editorials.

CREATE TABLE IF NOT EXISTS scene_catalog_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  run_at TEXT NOT NULL,

  generated_at TEXT,

  status TEXT NOT NULL
    CHECK (status IN ('PASS', 'FAIL', 'PENDING')),

  registry_count INTEGER NOT NULL,
  scene_count INTEGER NOT NULL,
  passed_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  pending_count INTEGER NOT NULL,

  registry_checks_json TEXT NOT NULL,
  scenes_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,

  production_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_mutated = 0),

  engine_control_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (engine_control_mutated = 0),

  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scene_catalog_audit_city
ON scene_catalog_audit(city_slug, run_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_scene_catalog_audit_no_update
BEFORE UPDATE ON scene_catalog_audit
BEGIN
  SELECT RAISE(ABORT, 'scene_catalog_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_scene_catalog_audit_no_delete
BEFORE DELETE ON scene_catalog_audit
BEGIN
  SELECT RAISE(ABORT, 'scene_catalog_audit_is_append_only');
END;
