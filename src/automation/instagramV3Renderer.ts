import type { InstagramV3ShadowPlan } from "../engine/instagramV3Shadow";
import type { Env, OfficialPublicPayloadV24 } from "../types";

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10] as const;
const EXPECTED_WIDTH = 1080;
const EXPECTED_HEIGHT = 1350;
const ASSET_TTL_MS = 48 * 60 * 60 * 1000;

export interface InstagramV3RenderedAsset {
  position: 1 | 2;
  objectKey: string;
  publicPath: string;
  publicUrl: string;
  width: 1080;
  height: 1350;
  mimeType: "image/png";
  byteLength: number;
  sha256: string;
  expiresAt: string;
}

export interface InstagramV3RenderResult {
  version: "7L.1";
  status: "RENDERED" | "BLOCKED";
  renderedAt: string;
  assets: InstagramV3RenderedAsset[];
  detail: string;
}

async function sha256BytesHex(bytes: Uint8Array): Promise<string> {
  const view = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  const digest = await crypto.subtle.digest("SHA-256", view);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readUint32BE(bytes: Uint8Array, offset: number): number {
  return (((bytes[offset] << 24) >>> 0) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

export function inspectPng(bytes: Uint8Array): { width: number; height: number } {
  if (bytes.length < 24) throw new Error("png_too_small");
  for (let i = 0; i < PNG_SIGNATURE.length; i++) {
    if (bytes[i] !== PNG_SIGNATURE[i]) throw new Error("png_signature_invalid");
  }
  const chunkType = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
  if (chunkType !== "IHDR") throw new Error("png_ihdr_missing");
  return { width: readUint32BE(bytes, 16), height: readUint32BE(bytes, 20) };
}

function ensureExpectedDimensions(bytes: Uint8Array): void {
  const dimensions = inspectPng(bytes);
  if (dimensions.width !== EXPECTED_WIDTH || dimensions.height !== EXPECTED_HEIGHT) {
    throw new Error(`png_dimensions_invalid:${dimensions.width}x${dimensions.height}`);
  }
}

function renderUrl(baseUrl: string, position: 1 | 2): string {
  const url = new URL("/instagram-v3-preview", baseUrl);
  url.searchParams.set("embed", "1");
  url.searchParams.set("studio", "official");
  url.searchParams.set("automation", "render");
  url.searchParams.set("page", String(position));
  return url.toString();
}

async function screenshotOnce(env: Env, url: string, position: 1 | 2): Promise<Response> {
  if (!env.BROWSER) throw new Error("browser_binding_missing");
  const selector = position === 1 ? "#page1" : "#page2";
  return env.BROWSER.quickAction("screenshot", {
    url,
    selector,
    viewport: { width: EXPECTED_WIDTH, height: EXPECTED_HEIGHT, deviceScaleFactor: 1 },
    gotoOptions: { waitUntil: "networkidle0", timeout: 60000 },
    waitForSelector: `${selector}[data-render-ready="1"]`
  });
}

async function screenshotWithOneRetry(env: Env, url: string, position: 1 | 2): Promise<Response> {
  let response = await screenshotOnce(env, url, position);
  if (response.status !== 429) return response;
  // Workers Free allows a lower Quick Action request rate. A single bounded retry
  // keeps the once-daily two-page render compatible without creating a loop.
  await new Promise((resolve) => setTimeout(resolve, 10_500));
  response = await screenshotOnce(env, url, position);
  return response;
}

function assetKey(payload: OfficialPublicPayloadV24, plan: InstagramV3ShadowPlan, position: 1 | 2): string {
  const generation = plan.generationId === null ? "manual" : String(plan.generationId);
  const fingerprint = plan.fingerprintSha256.slice(0, 16);
  return `instagram-v3/${payload.citySlug}/${payload.date}/${generation}-${fingerprint}/page-${position}.png`;
}

async function renderOne(
  env: Env,
  payload: OfficialPublicPayloadV24,
  plan: InstagramV3ShadowPlan,
  position: 1 | 2,
  baseUrl: string,
  renderedAt: string
): Promise<InstagramV3RenderedAsset> {
  if (!env.INSTAGRAM_MEDIA) throw new Error("instagram_media_kv_binding_missing");
  const response = await screenshotWithOneRetry(env, renderUrl(baseUrl, position), position);
  if (!response.ok) throw new Error(`browser_screenshot_failed:${position}:${response.status}`);
  const arrayBuffer = await response.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  ensureExpectedDimensions(bytes);

  const objectKey = assetKey(payload, plan, position);
  const publicPath = `/media/${objectKey}`;
  const publicUrl = new URL(publicPath, baseUrl).toString();
  const sha256 = await sha256BytesHex(bytes);
  const expiresAt = new Date(new Date(renderedAt).getTime() + ASSET_TTL_MS).toISOString();

  await env.INSTAGRAM_MEDIA.put(objectKey, arrayBuffer, {
    expirationTtl: ASSET_TTL_MS / 1000,
    metadata: {
      citySlug: payload.citySlug,
      forecastDate: payload.date,
      generationId: plan.generationId === null ? "" : String(plan.generationId),
      page: String(position),
      mimeType: "image/png",
      sha256,
      expiresAt
    }
  });

  return {
    position,
    objectKey,
    publicPath,
    publicUrl,
    width: EXPECTED_WIDTH,
    height: EXPECTED_HEIGHT,
    mimeType: "image/png",
    byteLength: bytes.byteLength,
    sha256,
    expiresAt
  };
}

export async function renderInstagramV3Assets(
  env: Env,
  payload: OfficialPublicPayloadV24,
  plan: InstagramV3ShadowPlan,
  renderedAt = new Date().toISOString()
): Promise<InstagramV3RenderResult> {
  if (plan.status !== "DRY_RUN_READY") {
    return { version: "7L.1", status: "BLOCKED", renderedAt, assets: [], detail: "shadow_plan_not_ready" };
  }
  if (!env.PUBLIC_BASE_URL) {
    return { version: "7L.1", status: "BLOCKED", renderedAt, assets: [], detail: "public_base_url_missing" };
  }
  if (!env.BROWSER || !env.INSTAGRAM_MEDIA) {
    return { version: "7L.1", status: "BLOCKED", renderedAt, assets: [], detail: "browser_or_kv_binding_missing" };
  }

  try {
    const baseUrl = new URL(env.PUBLIC_BASE_URL).toString();
    const first = await renderOne(env, payload, plan, 1, baseUrl, renderedAt);
    const second = await renderOne(env, payload, plan, 2, baseUrl, renderedAt);
    return {
      version: "7L.1",
      status: "RENDERED",
      renderedAt,
      assets: [first, second],
      detail: "two_png_assets_rendered_and_stored"
    };
  } catch (error) {
    return {
      version: "7L.1",
      status: "BLOCKED",
      renderedAt,
      assets: [],
      detail: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function serveInstagramV3Asset(env: Env, pathname: string): Promise<Response> {
  if (!env.INSTAGRAM_MEDIA) return Response.json({ error: "instagram_media_kv_binding_missing" }, { status: 503 });
  const prefix = "/media/";
  if (!pathname.startsWith(`${prefix}instagram-v3/`)) return Response.json({ error: "not_found" }, { status: 404 });
  const objectKey = pathname.slice(prefix.length);
  if (!/^instagram-v3\/[a-z0-9-]+\/\d{4}-\d{2}-\d{2}\/[a-z0-9-]+\/page-[12]\.png$/.test(objectKey)) {
    return Response.json({ error: "invalid_media_key" }, { status: 400 });
  }
  const object = await env.INSTAGRAM_MEDIA.getWithMetadata(objectKey, "arrayBuffer");
  if (!object.value) return Response.json({ error: "not_found" }, { status: 404 });
  const expiresAt = object.metadata?.expiresAt;
  if (expiresAt && Date.parse(expiresAt) <= Date.now()) {
    return Response.json({ error: "media_expired" }, { status: 410, headers: { "cache-control": "no-store" } });
  }
  const headers = new Headers({
    "content-type": object.metadata?.mimeType ?? "image/png",
    "cache-control": "public, max-age=3600",
    "x-content-type-options": "nosniff"
  });
  const sha256 = object.metadata?.sha256;
  if (sha256) headers.set("etag", `"${sha256}"`);
  return new Response(object.value, { headers });
}
