import type { ShadowMetricRow } from "../analytics/shadowMetrics";

interface Row {
  forecast_date:string; generated_at:string;
  raw_scene_id:number|null; raw_score:number|null; raw_confidence:string|null;
  final_scene_id:number|null; final_score:number|null; final_confidence:string|null;
  runner_up_scene_id:number|null; runner_up_score:number|null;
  fallback_used:number; hysteresis_applied:number;
  reliability_applied:number; reliability_reason:string|null;
}

export async function loadShadowMetricRows(
  db:D1Database,
  citySlug:string,
  days=14,
  limit=500
):Promise<ShadowMetricRow[]> {
  const safeDays=Math.min(90,Math.max(1,days));
  const safeLimit=Math.min(5000,Math.max(10,limit));
  const result=await db.prepare(`
    SELECT forecast_date, generated_at,
      raw_scene_id, raw_score, raw_confidence,
      final_scene_id, final_score, final_confidence,
      runner_up_scene_id, runner_up_score,
      fallback_used, hysteresis_applied,
      reliability_applied, reliability_reason
    FROM shadow_history
    WHERE city_slug = ?
      AND forecast_date >= date('now', '-' || ? || ' days')
    ORDER BY generated_at ASC
    LIMIT ?
  `).bind(citySlug,safeDays,safeLimit).all<Row>();

  return result.results.map((r:Row)=>({
    forecastDate:r.forecast_date, generatedAt:r.generated_at,
    rawSceneId:r.raw_scene_id, rawScore:r.raw_score, rawConfidence:r.raw_confidence,
    finalSceneId:r.final_scene_id, finalScore:r.final_score, finalConfidence:r.final_confidence,
    runnerUpSceneId:r.runner_up_scene_id, runnerUpScore:r.runner_up_score,
    fallbackUsed:r.fallback_used===1,
    hysteresisApplied:r.hysteresis_applied===1,
    reliabilityApplied:r.reliability_applied===1,
    reliabilityReason:r.reliability_reason
  }));
}
