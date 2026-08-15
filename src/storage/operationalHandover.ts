import type {
  OperationalHandoverReport,
  OperationalHandoverStatus
} from "../engine/operationalHandover16";

export interface OperationalHandoverAuditRow {
  id: number;
  evaluatedAt: string;
  generatedAt: string | null;
  status: OperationalHandoverStatus;
  publicEngine: string | null;
  readinessStatus: string | null;
  supervisorStatus: string | null;
  certificationWindowStatus: string | null;
  goLiveStatus: string | null;
  schemaComplete: boolean;
  legacyBackupAvailable: boolean;
  technicalChainComplete: boolean;
  recommendation: string;
}

export async function recordOperationalHandoverAudit(
  db: D1Database,
  report: OperationalHandoverReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO operational_handover_audit (
      event_id,
      city_slug,
      release_version,
      evaluated_at,
      generated_at,
      status,
      public_engine,
      requested_mode,
      v24_approved,
      readiness_status,
      supervisor_status,
      certification_window_status,
      go_live_status,
      schema_complete,
      legacy_backup_available,
      technical_chain_complete,
      checks_json,
      recommendation,
      production_mutated,
      v24_activated,
      rollback_triggered
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0
    )
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.evaluatedAt,
    report.generatedAt,
    report.status,
    report.publicEngine,
    report.requestedMode,
    report.v24Approved ? 1 : 0,
    report.readinessStatus,
    report.supervisorStatus,
    report.certificationWindowStatus,
    report.goLiveStatus,
    report.schemaComplete ? 1 : 0,
    report.legacyBackupAvailable ? 1 : 0,
    report.technicalChainComplete ? 1 : 0,
    JSON.stringify(report.checks),
    report.recommendation
  ).run();
}

export async function recentOperationalHandoverAudits(
  db: D1Database,
  citySlug: string,
  limit = 12
): Promise<OperationalHandoverAuditRow[]> {
  const safeLimit = Math.max(
    1,
    Math.min(30, Math.floor(limit))
  );

  const result = await db.prepare(`
    SELECT
      id,
      evaluated_at,
      generated_at,
      status,
      public_engine,
      readiness_status,
      supervisor_status,
      certification_window_status,
      go_live_status,
      schema_complete,
      legacy_backup_available,
      technical_chain_complete,
      recommendation
    FROM operational_handover_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT ?
  `).bind(
    citySlug,
    safeLimit
  ).all<{
    id: number;
    evaluated_at: string;
    generated_at: string | null;
    status: OperationalHandoverStatus;
    public_engine: string | null;
    readiness_status: string | null;
    supervisor_status: string | null;
    certification_window_status: string | null;
    go_live_status: string | null;
    schema_complete: number;
    legacy_backup_available: number;
    technical_chain_complete: number;
    recommendation: string;
  }>();

  return result.results.map((row) => ({
    id: row.id,
    evaluatedAt: row.evaluated_at,
    generatedAt: row.generated_at,
    status: row.status,
    publicEngine: row.public_engine,
    readinessStatus: row.readiness_status,
    supervisorStatus: row.supervisor_status,
    certificationWindowStatus:
      row.certification_window_status,
    goLiveStatus: row.go_live_status,
    schemaComplete:
      row.schema_complete === 1,
    legacyBackupAvailable:
      row.legacy_backup_available === 1,
    technicalChainComplete:
      row.technical_chain_complete === 1,
    recommendation: row.recommendation
  }));
}
