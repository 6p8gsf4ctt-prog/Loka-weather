-- LOKA V24 — Bloc 12.8
-- Controlled, non-destructive fault-injection audit.
-- The lab never mutates engine_control or forecasts.

CREATE TABLE IF NOT EXISTS fault_injection_audit (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id TEXT NOT NULL UNIQUE,

  city_slug TEXT NOT NULL,
  release_version TEXT NOT NULL,
  run_at TEXT NOT NULL,

  generated_at TEXT,
  effective_engine TEXT,

  status TEXT NOT NULL
    CHECK (status IN ('PASS', 'FAIL', 'PENDING')),

  scenario_count INTEGER NOT NULL,
  passed_count INTEGER NOT NULL,
  failed_count INTEGER NOT NULL,
  pending_count INTEGER NOT NULL,

  scenarios_json TEXT NOT NULL,
  summary_json TEXT NOT NULL,

  production_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (production_mutated = 0),

  engine_control_mutated INTEGER NOT NULL DEFAULT 0
    CHECK (engine_control_mutated = 0),

  reason TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fault_injection_audit_city
ON fault_injection_audit(city_slug, run_at DESC);

CREATE TRIGGER IF NOT EXISTS trg_fault_injection_audit_no_update
BEFORE UPDATE ON fault_injection_audit
BEGIN
  SELECT RAISE(ABORT, 'fault_injection_audit_is_append_only');
END;

CREATE TRIGGER IF NOT EXISTS trg_fault_injection_audit_no_delete
BEFORE DELETE ON fault_injection_audit
BEGIN
  SELECT RAISE(ABORT, 'fault_injection_audit_is_append_only');
END;
