import { renderInstagramV3Assets, inspectPng, serveInstagramV3Asset } from "../src/automation/instagramV3Renderer";
import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { buildInstagramV3ShadowPlan, finalizeInstagramV3ShadowPlanWithRender } from "../src/engine/instagramV3Shadow";
import { buildCandidateProduct } from "../src/engine/verdict";
import { renderInstagramCarouselV3Preview } from "../src/ui/instagramCarouselV3Preview";
import type { Env, HourPoint, ModelForecast, R2BucketLike, R2ObjectBodyLike, WeatherFamily } from "../src/types";

const date = "2026-08-27";
const specs: Array<[string, WeatherFamily, number]> = [
  ["arome", "meteofrance", .30], ["ecmwf_ifs", "ecmwf_physics", .25], ["ecmwf_aifs", "ecmwf_ai", .15], ["icon_eu", "dwd", .17], ["gfs", "noaa", .13]
];

function forecast(id: string, family: WeatherFamily, weight: number): ModelForecast {
  const hourly: HourPoint[] = [];
  for (let h = 0; h < 24; h++) {
    const wet = h >= 16 && h <= 20;
    const cloud = h < 13 ? 20 : h < 16 ? 70 : 92;
    const temp = 17 + Math.min(h, 16) * .45 - (wet ? 1 : 0);
    hourly.push({
      time: `${date}T${String(h).padStart(2, "0")}:00`, temperatureC: temp, apparentTemperatureC: temp,
      precipitationMm: wet ? .8 : 0, rainMm: wet ? .8 : 0, cloudCoverPct: cloud,
      cloudCoverLowPct: cloud, cloudCoverMidPct: cloud, cloudCoverHighPct: cloud,
      windSpeedKmh: 16, windGustKmh: 28, weatherCode: wet ? 61 : cloud >= 85 ? 3 : cloud >= 50 ? 2 : 1
    });
  }
  return { modelId: id, family, weight, fetchedAt: "2026-08-27T04:00:00.000Z", latitude: 43.54, longitude: -1.46, hourly };
}

function fakePng(width = 1080, height = 1350): Uint8Array {
  const b = new Uint8Array(25);
  b.set([137,80,78,71,13,10,26,10], 0);
  b.set([0,0,0,13,73,72,68,82], 8);
  b[16] = (width >>> 24) & 255; b[17] = (width >>> 16) & 255; b[18] = (width >>> 8) & 255; b[19] = width & 255;
  b[20] = (height >>> 24) & 255; b[21] = (height >>> 16) & 255; b[22] = (height >>> 8) & 255; b[23] = height & 255;
  return b;
}

class MemoryR2 implements R2BucketLike {
  objects = new Map<string, { bytes: ArrayBuffer; customMetadata?: Record<string,string>; contentType?: string; cacheControl?: string }>();
  async put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string; cacheControl?: string }; customMetadata?: Record<string, string> }): Promise<unknown> {
    this.objects.set(key, { bytes: value.slice(0), customMetadata: options?.customMetadata, contentType: options?.httpMetadata?.contentType, cacheControl: options?.httpMetadata?.cacheControl });
    return {};
  }
  async get(key: string): Promise<R2ObjectBodyLike | null> {
    const item = this.objects.get(key); if (!item) return null;
    return {
      body: new Blob([item.bytes]).stream(), customMetadata: item.customMetadata, httpEtag: '"mock"',
      writeHttpMetadata(headers: Headers) { if (item.contentType) headers.set("content-type", item.contentType); if (item.cacheControl) headers.set("cache-control", item.cacheControl); }
    };
  }
}

let checks = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`INSTAGRAM_V3_RENDER_FAIL:${label}`); checks++; }

(async () => {
  const forecasts = specs.map(([id, family, weight]) => forecast(id, family, weight));
  const payload = buildCandidateProduct(CITIES.tarnos, date, buildConsensus(forecasts), forecasts, {}, "TEST_7L");
  const plan = await buildInstagramV3ShadowPlan(payload, 77, "TEST", "2026-08-27T05:00:00.000Z");
  const r2 = new MemoryR2();
  let browserCalls = 0;
  const env = {
    DB: {} as any,
    PUBLIC_BASE_URL: "https://loka-weather.example.test",
    INSTAGRAM_MEDIA: r2,
    BROWSER: {
      async quickAction(action: "screenshot", options: any): Promise<Response> {
        browserCalls++;
        ok(action === "screenshot", `browser_action_${browserCalls}`);
        ok(options.selector === (browserCalls === 1 ? "#page1" : "#page2"), `browser_selector_${browserCalls}`);
        ok(String(options.waitForSelector).includes("data-render-ready"), `browser_wait_ready_${browserCalls}`);
        return new Response(fakePng(), { status: 200, headers: { "content-type": "image/png" } });
      }
    }
  } satisfies Env;

  const render = await renderInstagramV3Assets(env, payload, plan, "2026-08-27T05:01:00.000Z");
  ok(render.status === "RENDERED", "rendered");
  ok(render.assets.length === 2 && browserCalls === 2 && r2.objects.size === 2, "two_real_assets");
  ok(render.assets.every((a) => a.width === 1080 && a.height === 1350 && a.mimeType === "image/png"), "dimensions");
  ok(render.assets.every((a) => a.byteLength === 25 && a.sha256.length === 64), "asset_integrity");
  ok(render.assets.every((a) => a.publicUrl.startsWith("https://loka-weather.example.test/media/instagram-v3/")), "temporary_https_urls");
  ok(render.assets.every((a) => Date.parse(a.expiresAt) > Date.parse(render.renderedAt)), "expiry_present");

  const served = await serveInstagramV3Asset(env, new URL(render.assets[0].publicUrl).pathname);
  ok(served.status === 200 && served.headers.get("content-type") === "image/png", "r2_public_route");
  ok((await served.arrayBuffer()).byteLength === 25, "r2_public_route_bytes");

  const finalized = await finalizeInstagramV3ShadowPlanWithRender(plan, render);
  ok(finalized.version === "7L.1" && finalized.status === "DRY_RUN_READY", "finalized_ready");
  ok(finalized.stages.filter((s) => s.id.startsWith("PNG_RENDER")).every((s) => s.status === "PASS"), "png_stages_pass");
  ok(finalized.stages.find((s) => s.id === "META_CREATE_CAROUSEL")?.status === "WOULD_RUN", "meta_still_simulated");
  ok(finalized.stages.find((s) => s.id === "META_MEDIA_PUBLISH")?.status === "BLOCKED", "publish_still_blocked");
  ok(finalized.safety.publishAttempted === false && finalized.safety.outboundMetaRequests === 0, "zero_meta_side_effects");

  const html = renderInstagramCarouselV3Preview(payload, CITIES.tarnos, { embedded: true, studioOfficial: true, automationRender: true, automationPage: 2 });
  ok(html.includes('.visual[data-page="2"]'), "automation_page_css");
  ok(html.includes('p1.dataset.renderReady="1"') && html.includes('p2.dataset.renderReady="1"'), "canvas_ready_markers");
  ok(html.includes('width:1080px!important;height:1350px!important'), "automation_exact_canvas_css");

  const dims = inspectPng(fakePng());
  ok(dims.width === 1080 && dims.height === 1350, "png_inspector");
  let badDims = false;
  try { inspectPng(new Uint8Array(3)); } catch { badDims = true; }
  ok(badDims, "png_inspector_rejects_invalid");

  const missingBindings = await renderInstagramV3Assets({ DB: {} as any }, payload, plan);
  ok(missingBindings.status === "BLOCKED" && missingBindings.assets.length === 0, "missing_bindings_non_throwing_block");

  console.log(`instagramV3Render: ${checks} checks passed`);
})().catch((error) => { throw error; });
