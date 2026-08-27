import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { buildInstagramV3ShadowPlan } from "../src/engine/instagramV3Shadow";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date = "2026-08-27";
const specs: Array<[string, WeatherFamily, number]> = [
  ["arome", "meteofrance", .30],
  ["ecmwf_ifs", "ecmwf_physics", .25],
  ["ecmwf_aifs", "ecmwf_ai", .15],
  ["icon_eu", "dwd", .17],
  ["gfs", "noaa", .13]
];

function forecast(id: string, family: WeatherFamily, weight: number): ModelForecast {
  const hourly: HourPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const wet = h >= 16 && h <= 20;
    const cloud = h < 13 ? 20 : h < 16 ? 70 : 92;
    const temp = 17 + Math.min(h, 16) * .45 - (wet ? 1 : 0);
    hourly.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`,
      temperatureC: temp,
      apparentTemperatureC: temp,
      precipitationMm: wet ? .8 : 0,
      rainMm: wet ? .8 : 0,
      cloudCoverPct: cloud,
      cloudCoverLowPct: cloud,
      cloudCoverMidPct: cloud,
      cloudCoverHighPct: cloud,
      windSpeedKmh: 16,
      windGustKmh: 28,
      weatherCode: wet ? 61 : cloud >= 85 ? 3 : cloud >= 50 ? 2 : 1
    });
  }
  return { modelId: id, family, weight, fetchedAt: "2026-08-27T04:00:00.000Z", latitude: 43.54, longitude: -1.46, hourly };
}

const forecasts = specs.map(([id, family, weight]) => forecast(id, family, weight));
const payload = buildCandidateProduct(CITIES.tarnos, date, buildConsensus(forecasts), forecasts, {}, "TEST_7K");
let checks = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`INSTAGRAM_V3_SHADOW_FAIL:${label}`);
  checks++;
}

(async () => {
  const evaluatedAt = "2026-08-27T05:00:00.000Z";
  const plan = await buildInstagramV3ShadowPlan(payload, 42, "TEST", evaluatedAt);
  ok(plan.mode === "DRY_RUN", "dry_run_mode");
  ok(plan.status === "DRY_RUN_READY", "ready");
  ok(plan.pageCount === 2 && plan.pages.length === 2, "two_pages");
  ok(plan.pages.every((p) => p.width === 1080 && p.height === 1350 && p.mimeType === "image/png"), "instagram_dimensions");
  ok(plan.pages[0].canvasId === "v3Page1" && plan.pages[1].canvasId === "v3Page2", "canvas_contract");
  ok(plan.checks.every((c) => c.pass), "all_preflight_checks_pass");
  ok(plan.stages.some((s) => s.id === "PNG_RENDER_PAGE_1" && s.status === "WOULD_RUN"), "page1_render_simulated");
  ok(plan.stages.some((s) => s.id === "META_CREATE_CHILD_1" && s.status === "WOULD_RUN"), "meta_child_simulated");
  ok(plan.stages.some((s) => s.id === "META_CREATE_CAROUSEL" && s.status === "WOULD_RUN"), "meta_carousel_simulated");
  ok(plan.stages.some((s) => s.id === "META_MEDIA_PUBLISH" && s.status === "BLOCKED"), "publish_hard_stop");
  ok(plan.safety.publishAttempted === false, "publish_never_attempted");
  ok(plan.safety.outboundMetaRequests === 0, "zero_meta_requests");
  ok(plan.safety.realInstagramSideEffectsAllowed === false, "side_effects_forbidden");
  ok(plan.caption.source === "V2_SOCIAL_COMPAT" && plan.caption.characterCount > 0, "caption_compatibility_recorded");
  ok(plan.fingerprintSha256.length === 64, "fingerprint_sha256");

  const same = await buildInstagramV3ShadowPlan(payload, 42, "TEST", evaluatedAt);
  ok(same.fingerprintSha256 === plan.fingerprintSha256, "fingerprint_deterministic");

  const noAnalysis = { ...payload, analysis: undefined };
  const blockedAnalysis = await buildInstagramV3ShadowPlan(noAnalysis, 43, "TEST", evaluatedAt);
  ok(blockedAnalysis.status === "BLOCKED", "missing_analysis_blocks");
  ok(blockedAnalysis.stages.find((s) => s.id === "META_CREATE_CHILD_1")?.status === "BLOCKED", "blocked_never_reaches_meta_simulation");

  const tooFewModels = { ...payload, models: { ...payload.models, count: 2, ok: payload.models.ok.slice(0, 2) } };
  const blockedGuard = await buildInstagramV3ShadowPlan(tooFewModels, 44, "TEST", evaluatedAt);
  ok(blockedGuard.status === "BLOCKED", "publication_guard_blocks");
  ok(blockedGuard.stages.find((s) => s.id === "META_MEDIA_PUBLISH")?.status === "BLOCKED", "publish_always_blocked");

  console.log(`instagramV3Shadow: ${checks} checks passed`);
})().catch((error) => { throw error; });
