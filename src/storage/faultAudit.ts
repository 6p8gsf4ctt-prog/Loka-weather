import type {
  FaultInjectionReport
} from "../engine/faultLab";

export async function recordFaultInjectionAudit(
  db: D1Database,
  report: FaultInjectionReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO fault_injection_audit (
      event_id,
      city_slug,
      release_version,
      run_at,
      generated_at,
      effective_engine,
      status,
      scenario_count,
      passed_count,
      failed_count,
      pending_count,
      scenarios_json,
      summary_json,
      production_mutated,
      engine_control_mutated,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.runAt,
    report.generatedAt,
    report.effectiveEngine,
    report.status,
    report.summary.total,
    report.summary.passed,
    report.summary.failed,
    report.summary.pending,
    JSON.stringify(report.scenarios),
    JSON.stringify(report.summary),
    report.reason
  ).run();
}

export async function latestFaultInjectionAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  runAt: string;
  generatedAt: string | null;
  effectiveEngine: string | null;
  status: "PASS" | "FAIL" | "PENDING";
  scenarioCount: number;
  passedCount: number;
  failedCount: number;
  pendingCount: number;
  reason: string;
} | null> {
  const row = await db.prepare(`
    SELECT
      id,
      run_at,
      generated_at,
      effective_engine,
      status,
      scenario_count,
      passed_count,
      failed_count,
      pending_count,
      reason
    FROM fault_injection_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    run_at: string;
    generated_at: string | null;
    effective_engine: string | null;
    status: "PASS" | "FAIL" | "PENDING";
    scenario_count: number;
    passed_count: number;
    failed_count: number;
    pending_count: number;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    runAt: row.run_at,
    generatedAt: row.generated_at,
    effectiveEngine: row.effective_engine,
    status: row.status,
    scenarioCount: row.scenario_count,
    passedCount: row.passed_count,
    failedCount: row.failed_count,
    pendingCount: row.pending_count,
    reason: row.reason
  } : null;
}
