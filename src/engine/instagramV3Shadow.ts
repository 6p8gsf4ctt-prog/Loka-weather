import { canonicalJson, sha256Hex } from "./publicationManifest";
import { evaluatePublicationGuard } from "./publicationGuard";
import type { OfficialPublicPayloadV24 } from "../types";

export type InstagramV3ShadowStatus = "DRY_RUN_READY" | "BLOCKED";
export type InstagramV3ShadowStageStatus = "PASS" | "WOULD_RUN" | "BLOCKED";

export interface InstagramV3ShadowCheck {
  name: string;
  pass: boolean;
  detail: string;
}

export interface InstagramV3ShadowStage {
  id:
    | "OFFICIAL_PAYLOAD"
    | "V3_ANALYSIS"
    | "PUBLICATION_GUARD"
    | "CAROUSEL_CONTRACT"
    | "PNG_RENDER_PAGE_1"
    | "PNG_RENDER_PAGE_2"
    | "META_CREATE_CHILD_1"
    | "META_CREATE_CHILD_2"
    | "META_CREATE_CAROUSEL"
    | "META_MEDIA_PUBLISH";
  status: InstagramV3ShadowStageStatus;
  detail: string;
}

export interface InstagramV3ShadowPage {
  position: 1 | 2;
  kind: "V3_PAGE_1" | "V3_PAGE_2";
  width: 1080;
  height: 1350;
  mimeType: "image/png";
  browserRenderSource: string;
  canvasId: "page1" | "page2";
}

export interface InstagramV3ShadowPlan {
  version: "7K.1" | "7L.1";
  mode: "DRY_RUN";
  status: InstagramV3ShadowStatus;
  citySlug: string;
  forecastDate: string;
  generatedAt: string;
  generationId: number | null;
  evaluatedAt: string;
  trigger: "CRON_PRIMARY" | "CRON_RETRY" | "MANUAL_ADMIN" | "TEST";
  publicationFormat: "INSTAGRAM_CAROUSEL";
  pageCount: 2;
  pages: [InstagramV3ShadowPage, InstagramV3ShadowPage];
  caption: {
    source: "V2_SOCIAL_COMPAT";
    characterCount: number;
  };
  checks: InstagramV3ShadowCheck[];
  stages: InstagramV3ShadowStage[];
  safety: {
    publishAttempted: false;
    outboundMetaRequests: 0;
    hardStopStage: "META_MEDIA_PUBLISH";
    realInstagramSideEffectsAllowed: false;
  };
  render?: InstagramV3ShadowRenderEvidence;
  fingerprintSha256: string;
}

export interface InstagramV3ShadowRenderAssetEvidence {
  position: 1 | 2;
  objectKey: string;
  publicPath: string;
  publicUrl: string;
  width: number;
  height: number;
  mimeType: string;
  byteLength: number;
  sha256: string;
  expiresAt: string;
}

export interface InstagramV3ShadowRenderEvidence {
  version: "7L.1";
  status: "RENDERED" | "BLOCKED";
  renderedAt: string;
  assets: InstagramV3ShadowRenderAssetEvidence[];
  detail: string;
}

function check(name: string, pass: boolean, detail: string): InstagramV3ShadowCheck {
  return { name, pass, detail };
}

function page(position: 1 | 2): InstagramV3ShadowPage {
  return {
    position,
    kind: position === 1 ? "V3_PAGE_1" : "V3_PAGE_2",
    width: 1080,
    height: 1350,
    mimeType: "image/png",
    browserRenderSource: `/instagram-v3-preview?embed=1&studio=official&automation=render&page=${position}`,
    canvasId: position === 1 ? "page1" : "page2"
  };
}

export async function buildInstagramV3ShadowPlan(
  payload: OfficialPublicPayloadV24,
  generationId: number | null,
  trigger: InstagramV3ShadowPlan["trigger"],
  evaluatedAt = new Date().toISOString()
): Promise<InstagramV3ShadowPlan> {
  const guard = evaluatePublicationGuard(payload);
  const analysis = payload.analysis;
  const timelinePoints = analysis?.timeline.points ?? [];
  const keyCount = timelinePoints.filter((p) => p.importance === "KEY").length;
  const caption = payload.editorial.social.caption ?? "";

  const checks: InstagramV3ShadowCheck[] = [
    check("official_payload_v24", payload.version === "2.0", `version=${payload.version}`),
    check("analysis_v3_present", analysis?.version === "3.0", `analysis=${analysis?.version ?? "missing"}`),
    check("publication_guard", guard.status === "PASS", guard.reason),
    check("timeline_5_to_9", !!analysis && timelinePoints.length >= 5 && timelinePoints.length <= 9, `points=${timelinePoints.length}`),
    check("timeline_single_key_max", keyCount <= 1, `key=${keyCount}`),
    check("scene_master_defined", payload.scene.masterUrl.startsWith("/masters24/"), payload.scene.masterUrl),
    check("carousel_two_pages", true, "pages=2"),
    check("instagram_dimensions", true, "1080x1350")
  ];

  const ready = checks.every((item) => item.pass);
  const stages: InstagramV3ShadowStage[] = [
    { id: "OFFICIAL_PAYLOAD", status: checks[0].pass ? "PASS" : "BLOCKED", detail: checks[0].detail },
    { id: "V3_ANALYSIS", status: checks[1].pass ? "PASS" : "BLOCKED", detail: checks[1].detail },
    { id: "PUBLICATION_GUARD", status: checks[2].pass ? "PASS" : "BLOCKED", detail: checks[2].detail },
    { id: "CAROUSEL_CONTRACT", status: ready ? "PASS" : "BLOCKED", detail: ready ? "2 pages · 1080x1350 · PNG" : "preflight_blocked" },
    { id: "PNG_RENDER_PAGE_1", status: ready ? "WOULD_RUN" : "BLOCKED", detail: ready ? "browser render #page1" : "preflight_blocked" },
    { id: "PNG_RENDER_PAGE_2", status: ready ? "WOULD_RUN" : "BLOCKED", detail: ready ? "browser render #page2" : "preflight_blocked" },
    { id: "META_CREATE_CHILD_1", status: ready ? "WOULD_RUN" : "BLOCKED", detail: ready ? "simulated only · no HTTP" : "preflight_blocked" },
    { id: "META_CREATE_CHILD_2", status: ready ? "WOULD_RUN" : "BLOCKED", detail: ready ? "simulated only · no HTTP" : "preflight_blocked" },
    { id: "META_CREATE_CAROUSEL", status: ready ? "WOULD_RUN" : "BLOCKED", detail: ready ? "simulated only · no HTTP" : "preflight_blocked" },
    { id: "META_MEDIA_PUBLISH", status: "BLOCKED", detail: "7K dry-run hard stop · publication forbidden" }
  ];

  const base = {
    version: "7K.1" as const,
    mode: "DRY_RUN" as const,
    status: ready ? "DRY_RUN_READY" as const : "BLOCKED" as const,
    citySlug: payload.citySlug,
    forecastDate: payload.date,
    generatedAt: payload.generatedAt,
    generationId,
    evaluatedAt,
    trigger,
    publicationFormat: "INSTAGRAM_CAROUSEL" as const,
    pageCount: 2 as const,
    pages: [page(1), page(2)] as [InstagramV3ShadowPage, InstagramV3ShadowPage],
    caption: {
      source: "V2_SOCIAL_COMPAT" as const,
      characterCount: caption.length
    },
    checks,
    stages,
    safety: {
      publishAttempted: false as const,
      outboundMetaRequests: 0 as const,
      hardStopStage: "META_MEDIA_PUBLISH" as const,
      realInstagramSideEffectsAllowed: false as const
    }
  };

  return {
    ...base,
    fingerprintSha256: await sha256Hex(canonicalJson(base))
  };
}

export async function finalizeInstagramV3ShadowPlanWithRender(
  plan: InstagramV3ShadowPlan,
  render: InstagramV3ShadowRenderEvidence
): Promise<InstagramV3ShadowPlan> {
  const rendered = render.status === "RENDERED"
    && render.assets.length === 2
    && render.assets.every((asset) => asset.width === 1080 && asset.height === 1350 && asset.mimeType === "image/png" && asset.byteLength > 24);

  const checks = [
    ...plan.checks,
    check("real_png_page_1", rendered && render.assets.some((asset) => asset.position === 1), rendered ? "1080x1350 stored in KV" : render.detail),
    check("real_png_page_2", rendered && render.assets.some((asset) => asset.position === 2), rendered ? "1080x1350 stored in KV" : render.detail),
    check("temporary_public_urls", rendered && render.assets.every((asset) => /^https:\/\//.test(asset.publicUrl)), rendered ? "2 temporary HTTPS media URLs" : render.detail)
  ];

  const publicationReady = plan.status === "DRY_RUN_READY" && rendered;
  const stages = plan.stages.map((stage): InstagramV3ShadowStage => {
    if (stage.id === "PNG_RENDER_PAGE_1") return { ...stage, status: rendered ? "PASS" : "BLOCKED", detail: rendered ? "real PNG rendered · KV stored" : render.detail };
    if (stage.id === "PNG_RENDER_PAGE_2") return { ...stage, status: rendered ? "PASS" : "BLOCKED", detail: rendered ? "real PNG rendered · KV stored" : render.detail };
    if (stage.id === "META_CREATE_CHILD_1" || stage.id === "META_CREATE_CHILD_2" || stage.id === "META_CREATE_CAROUSEL") {
      return { ...stage, status: publicationReady ? "WOULD_RUN" : "BLOCKED", detail: publicationReady ? "real PNG URL ready · Meta HTTP still simulated" : (rendered ? "png_ready_but_shadow_preflight_blocked" : "png_render_blocked") };
    }
    if (stage.id === "META_MEDIA_PUBLISH") return { ...stage, status: "BLOCKED", detail: "7L hard stop · Instagram publication forbidden" };
    return stage;
  });

  const base = {
    ...plan,
    version: "7L.1" as const,
    status: publicationReady ? "DRY_RUN_READY" as const : "BLOCKED" as const,
    checks,
    stages,
    render,
    safety: {
      publishAttempted: false as const,
      outboundMetaRequests: 0 as const,
      hardStopStage: "META_MEDIA_PUBLISH" as const,
      realInstagramSideEffectsAllowed: false as const
    }
  };
  const { fingerprintSha256: _oldFingerprint, ...fingerprintSource } = base;
  return {
    ...base,
    fingerprintSha256: await sha256Hex(canonicalJson(fingerprintSource))
  };
}
