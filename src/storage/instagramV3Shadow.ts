import type { InstagramV3ShadowPlan, InstagramV3ShadowStatus } from "../engine/instagramV3Shadow";

export interface InstagramV3ShadowAuditRow {
  id: number;
  eventId: string;
  citySlug: string;
  forecastDate: string;
  generatedAt: string;
  generationId: number | null;
  evaluatedAt: string;
  trigger: InstagramV3ShadowPlan["trigger"];
  status: InstagramV3ShadowStatus;
  fingerprintSha256: string;
  plan: InstagramV3ShadowPlan;
}

export async function recordInstagramV3ShadowAudit(db: D1Database, plan: InstagramV3ShadowPlan): Promise<void> {
  await db.prepare(`
    INSERT INTO instagram_v3_shadow_audit (
      event_id,
      city_slug,
      forecast_date,
      generated_at,
      generation_id,
      evaluated_at,
      trigger_source,
      status,
      plan_fingerprint_sha256,
      page_count,
      guard_status,
      analysis_version,
      publish_attempted,
      outbound_meta_requests,
      plan_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, ?, 0, 0, ?)
  `).bind(
    crypto.randomUUID(),
    plan.citySlug,
    plan.forecastDate,
    plan.generatedAt,
    plan.generationId,
    plan.evaluatedAt,
    plan.trigger,
    plan.status,
    plan.fingerprintSha256,
    plan.checks.find((item) => item.name === "publication_guard")?.pass ? "PASS" : "BLOCKED",
    plan.checks.find((item) => item.name === "analysis_v3_present")?.pass ? "3.0" : null,
    JSON.stringify(plan)
  ).run();
}

export async function recentInstagramV3ShadowAudits(
  db: D1Database,
  citySlug: string,
  limit = 14
): Promise<InstagramV3ShadowAuditRow[]> {
  const safeLimit = Math.max(1, Math.min(60, Math.floor(limit)));
  const result = await db.prepare(`
    SELECT id, event_id, city_slug, forecast_date, generated_at, generation_id,
           evaluated_at, trigger_source, status, plan_fingerprint_sha256, plan_json
    FROM instagram_v3_shadow_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT ?
  `).bind(citySlug, safeLimit).all<{
    id: number;
    event_id: string;
    city_slug: string;
    forecast_date: string;
    generated_at: string;
    generation_id: number | null;
    evaluated_at: string;
    trigger_source: InstagramV3ShadowPlan["trigger"];
    status: InstagramV3ShadowStatus;
    plan_fingerprint_sha256: string;
    plan_json: string;
  }>();

  return result.results.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    citySlug: row.city_slug,
    forecastDate: row.forecast_date,
    generatedAt: row.generated_at,
    generationId: row.generation_id,
    evaluatedAt: row.evaluated_at,
    trigger: row.trigger_source,
    status: row.status,
    fingerprintSha256: row.plan_fingerprint_sha256,
    plan: JSON.parse(row.plan_json) as InstagramV3ShadowPlan
  }));
}
