import type { LokaForecast } from "../types";
import type { V24ActivationGuardResult } from "./activationGuard";
import type { V24PublicPayloadPreview } from "./publicPreview";

export interface V24OfficialPublicPayload
  extends Omit<
    V24PublicPayloadPreview,
    "version" | "mode" | "publishable"
  > {
  version: "12.4.0";
  mode: "V24";
  publishable: true;
  cutover: {
    guardVersion: string;
    guardReason: string;
    activatedAt: string;
    effectiveEngine: "V24";
  };
}

export interface LegacyPublicFallback {
  scene: unknown;
  subtitle: string | undefined;
  summaryLines: string[] | undefined;
  decisionLog: unknown;
  mainVerdict: string;
  rainVerdict: string;
  notableEvent: string | null;
  confidenceMain: number;
  confidenceRain: number;
  diagnosticsPublic: {
    scene: unknown;
    subtitle: unknown;
    summaryLines: unknown;
    decisionLog: unknown;
  };
}

type Obj = Record<string, unknown>;

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

export function captureLegacyPublicFallback(
  forecast: LokaForecast
): LegacyPublicFallback {
  const d = forecast.diagnostics ?? {};

  return {
    scene: forecast.scene,
    subtitle: forecast.subtitle,
    summaryLines: forecast.summaryLines
      ? [...forecast.summaryLines]
      : undefined,
    decisionLog: forecast.decisionLog ?? null,
    mainVerdict: forecast.mainVerdict,
    rainVerdict: forecast.rainVerdict,
    notableEvent: forecast.notableEvent,
    confidenceMain: forecast.confidenceMain,
    confidenceRain: forecast.confidenceRain,
    diagnosticsPublic: {
      scene: d.scene ?? forecast.scene ?? null,
      subtitle: d.subtitle ?? forecast.subtitle ?? null,
      summaryLines: d.summaryLines ?? forecast.summaryLines ?? null,
      decisionLog: d.decisionLog ?? forecast.decisionLog ?? null
    }
  };
}

export function promoteV24PreviewToOfficial(
  preview: V24PublicPayloadPreview,
  guard: V24ActivationGuardResult
): V24OfficialPublicPayload {
  if (guard.status !== "PASS" || !guard.activationReadyForCutover) {
    throw new Error("v24_official_promotion_requires_guard_pass");
  }

  return {
    ...preview,
    version: "12.4.0",
    mode: "V24",
    publishable: true,
    cutover: {
      guardVersion: guard.version,
      guardReason: guard.reason,
      activatedAt: new Date().toISOString(),
      effectiveEngine: "V24"
    }
  };
}

export function readStoredOfficialV24(
  forecast: LokaForecast
): V24OfficialPublicPayload | null {
  const value = asObj(forecast.diagnostics?.v24OfficialProduct);
  if (!value) return null;

  if (
    value.version !== "12.4.0" ||
    value.mode !== "V24" ||
    value.publishable !== true
  ) {
    return null;
  }

  const scene = asObj(value.scene);
  const editorial = asObj(value.editorial);
  const temperatures = asObj(value.temperatures);
  const cutover = asObj(value.cutover);

  if (!scene || !editorial || !temperatures || !cutover) return null;

  const id = num(scene.id);
  const key = str(scene.key);
  const label = str(scene.label);
  const masterFileName = str(scene.masterFileName);
  const masterUrl = str(scene.masterUrl);
  const score = num(scene.score);
  const confidence = str(scene.confidence);

  if (
    id === null ||
    id < 1 ||
    id > 24 ||
    !key ||
    !label ||
    !masterFileName ||
    !masterUrl ||
    score === null ||
    (confidence !== "LOW" &&
      confidence !== "MEDIUM" &&
      confidence !== "HIGH")
  ) {
    return null;
  }

  if (
    typeof editorial.mainVerdict !== "string" ||
    !Array.isArray(editorial.summaryLines) ||
    typeof editorial.rainVerdict !== "string" ||
    !Array.isArray(value.hourly) ||
    cutover.effectiveEngine !== "V24"
  ) {
    return null;
  }

  return value as unknown as V24OfficialPublicPayload;
}

export function restoreLegacyPublicForecast(
  forecast: LokaForecast
): LokaForecast {
  const stored = asObj(forecast.diagnostics?.legacyPublicFallback);
  if (!stored) return forecast;

  const clone = {
    ...forecast,
    diagnostics: { ...forecast.diagnostics }
  } as LokaForecast;

  const scene = stored.scene;
  const subtitle =
    stored.subtitle === undefined || typeof stored.subtitle === "string"
      ? stored.subtitle
      : undefined;
  const summaryLines =
    stored.summaryLines === undefined ||
    Array.isArray(stored.summaryLines)
      ? stored.summaryLines as string[] | undefined
      : undefined;

  (clone as unknown as Obj).scene = scene;
  clone.subtitle = subtitle;
  clone.summaryLines = summaryLines
    ? [...summaryLines]
    : undefined;

  if (typeof stored.mainVerdict === "string") {
    clone.mainVerdict = stored.mainVerdict;
  }
  if (typeof stored.rainVerdict === "string") {
    clone.rainVerdict = stored.rainVerdict;
  }

  clone.notableEvent =
    stored.notableEvent === null || typeof stored.notableEvent === "string"
      ? stored.notableEvent
      : null;

  if (typeof stored.confidenceMain === "number") {
    clone.confidenceMain = stored.confidenceMain;
  }
  if (typeof stored.confidenceRain === "number") {
    clone.confidenceRain = stored.confidenceRain;
  }

  const publicDiag = asObj(stored.diagnosticsPublic);
  if (publicDiag) {
    clone.diagnostics.scene = publicDiag.scene ?? scene;
    clone.diagnostics.subtitle = publicDiag.subtitle ?? subtitle;
    clone.diagnostics.summaryLines =
      publicDiag.summaryLines ?? summaryLines ?? null;
    clone.diagnostics.decisionLog =
      publicDiag.decisionLog ?? stored.decisionLog ?? null;
  }

  (clone as unknown as Obj).decisionLog = stored.decisionLog ?? undefined;

  clone.diagnostics.sceneEngine = {
    ...(asObj(clone.diagnostics.sceneEngine) ?? {}),
    effectiveProduction: "LEGACY",
    requestTimeFallback: true,
    requestTimeFallbackReason:
      "stored_v24_public_product_invalid_or_unavailable"
  };

  return clone;
}

export function resolveStoredPublicSurface(
  forecast: LokaForecast
):
  | {
      engine: "V24";
      forecast: LokaForecast;
      payload: V24OfficialPublicPayload;
    }
  | {
      engine: "LEGACY";
      forecast: LokaForecast;
      payload: null;
    } {
  const sceneEngine = asObj(forecast.diagnostics?.sceneEngine);
  const guard = asObj(forecast.diagnostics?.v24ActivationGuard);

  const claimsV24 =
    sceneEngine?.effectiveProduction === "V24" &&
    guard?.status === "PASS" &&
    guard?.activationReadyForCutover === true;

  if (claimsV24) {
    const payload = readStoredOfficialV24(forecast);
    if (payload) {
      return {
        engine: "V24",
        forecast,
        payload
      };
    }

    return {
      engine: "LEGACY",
      forecast: restoreLegacyPublicForecast(forecast),
      payload: null
    };
  }

  return {
    engine: "LEGACY",
    forecast:
      sceneEngine?.effectiveProduction === "V24"
        ? restoreLegacyPublicForecast(forecast)
        : forecast,
    payload: null
  };
}
