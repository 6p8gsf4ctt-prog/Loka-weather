import type {
  SceneCatalogAuditReport
} from "../engine/sceneCatalogAudit";

export async function recordSceneCatalogAudit(
  db: D1Database,
  report: SceneCatalogAuditReport
): Promise<void> {
  await db.prepare(`
    INSERT INTO scene_catalog_audit (
      event_id,
      city_slug,
      release_version,
      run_at,
      generated_at,
      status,
      registry_count,
      scene_count,
      passed_count,
      failed_count,
      pending_count,
      registry_checks_json,
      scenes_json,
      summary_json,
      production_mutated,
      engine_control_mutated,
      reason
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?)
  `).bind(
    crypto.randomUUID(),
    report.citySlug,
    report.version,
    report.runAt,
    report.generatedAt,
    report.status,
    report.summary.registryCount,
    report.summary.sceneCount,
    report.summary.passed,
    report.summary.failed,
    report.summary.pending,
    JSON.stringify(report.registryChecks),
    JSON.stringify(report.scenes),
    JSON.stringify(report.summary),
    report.reason
  ).run();
}

export async function latestSceneCatalogAudit(
  db: D1Database,
  citySlug: string
): Promise<{
  id: number;
  runAt: string;
  generatedAt: string | null;
  status: "PASS" | "FAIL" | "PENDING";
  registryCount: number;
  sceneCount: number;
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
      status,
      registry_count,
      scene_count,
      passed_count,
      failed_count,
      pending_count,
      reason
    FROM scene_catalog_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT 1
  `).bind(citySlug).first<{
    id: number;
    run_at: string;
    generated_at: string | null;
    status: "PASS" | "FAIL" | "PENDING";
    registry_count: number;
    scene_count: number;
    passed_count: number;
    failed_count: number;
    pending_count: number;
    reason: string;
  }>();

  return row ? {
    id: row.id,
    runAt: row.run_at,
    generatedAt: row.generated_at,
    status: row.status,
    registryCount: row.registry_count,
    sceneCount: row.scene_count,
    passedCount: row.passed_count,
    failedCount: row.failed_count,
    pendingCount: row.pending_count,
    reason: row.reason
  } : null;
}
