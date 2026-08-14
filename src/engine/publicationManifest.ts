import type { LokaForecast } from "../types";
import { readStoredOfficialV24 } from "./publicProduct";

type Obj = Record<string, unknown>;

export type PublicationEngine = "LEGACY" | "V24";
export type PublicationSurface =
  | "api_latest"
  | "api_decision"
  | "dashboard"
  | "instagram";

export interface PublicationManifest {
  version: "12.6.0";
  surfaceContractVersion: "12.6.0";

  citySlug: string;
  forecastDate: string;
  generatedAt: string;
  effectiveEngine: PublicationEngine;

  scene: {
    key: string;
    v24Id: number | null;
    label: string | null;
    masterFileName: string | null;
    masterUrl: string | null;
    score: number | null;
    confidence: string | null;
  };

  editorial: {
    subtitle: string | null;
    summaryLines: string[];
    mainVerdict: string;
    rainVerdict: string;
    notableEvent: string | null;
  };

  temperatures: {
    minC: number;
    maxC: number;
  };

  hourly: LokaForecast["hourly"];

  safety: {
    guardStatus: string | null;
    guardReason: string | null;
    generationFallbackRequired: boolean;
    generationFallbackReason: string | null;
  };

  fingerprintSha256: string;
}

export interface PublicationIdentity {
  version: "12.6.0";
  generatedAt: string;
  engine: PublicationEngine;
  scene: string;
  fingerprint: string;
}

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};

    for (const key of Object.keys(obj).sort()) {
      out[key] = stable(obj[key]);
    }

    return out;
  }

  return value;
}

function stableStringify(value: unknown): string {
  return JSON.stringify(stable(value));
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function effectiveEngine(forecast: LokaForecast): PublicationEngine {
  const sceneEngine = asObj(forecast.diagnostics?.sceneEngine);
  return sceneEngine?.effectiveProduction === "V24" ? "V24" : "LEGACY";
}

function coreManifest(
  forecast: LokaForecast
): Omit<PublicationManifest, "fingerprintSha256"> {
  const engine = effectiveEngine(forecast);
  const sceneEngine = asObj(forecast.diagnostics?.sceneEngine);
  const guard = asObj(forecast.diagnostics?.v24ActivationGuard);

  if (engine === "V24") {
    const official = readStoredOfficialV24(forecast);

    if (!official) {
      throw new Error("publication_manifest_v24_product_invalid");
    }

    return {
      version: "12.6.0",
      surfaceContractVersion: "12.6.0",
      citySlug: forecast.citySlug,
      forecastDate: forecast.date,
      generatedAt: forecast.generatedAt,
      effectiveEngine: "V24",

      scene: {
        key: official.scene.key,
        v24Id: official.scene.id,
        label: official.scene.label,
        masterFileName: official.scene.masterFileName,
        masterUrl: official.scene.masterUrl,
        score: official.scene.score,
        confidence: official.scene.confidence
      },

      editorial: {
        subtitle: official.editorial.subtitle,
        summaryLines: [...official.editorial.summaryLines],
        mainVerdict: official.editorial.mainVerdict,
        rainVerdict: official.editorial.rainVerdict,
        notableEvent: official.editorial.notableEvent
      },

      temperatures: {
        minC: official.temperatures.minC,
        maxC: official.temperatures.maxC
      },

      hourly: JSON.parse(
        JSON.stringify(official.hourly)
      ) as LokaForecast["hourly"],

      safety: {
        guardStatus:
          typeof guard?.status === "string" ? guard.status : null,
        guardReason:
          typeof guard?.reason === "string" ? guard.reason : null,
        generationFallbackRequired:
          sceneEngine?.generationFallbackRequired === true,
        generationFallbackReason:
          sceneEngine?.generationFallbackRequired === true &&
          typeof sceneEngine.reason === "string"
            ? sceneEngine.reason
            : null
      }
    };
  }

  return {
    version: "12.6.0",
    surfaceContractVersion: "12.6.0",
    citySlug: forecast.citySlug,
    forecastDate: forecast.date,
    generatedAt: forecast.generatedAt,
    effectiveEngine: "LEGACY",

    scene: {
      key: String(forecast.scene ?? ""),
      v24Id: null,
      label: null,
      masterFileName: null,
      masterUrl: null,
      score:
        typeof forecast.decisionLog?.selectedScore === "number"
          ? forecast.decisionLog.selectedScore
          : null,
      confidence: null
    },

    editorial: {
      subtitle: forecast.subtitle ?? null,
      summaryLines: forecast.summaryLines
        ? [...forecast.summaryLines]
        : [],
      mainVerdict: forecast.mainVerdict,
      rainVerdict: forecast.rainVerdict,
      notableEvent: forecast.notableEvent
    },

    temperatures: {
      minC: forecast.tempMinC,
      maxC: forecast.tempMaxC
    },

    hourly: JSON.parse(
      JSON.stringify(forecast.hourly)
    ) as LokaForecast["hourly"],

    safety: {
      guardStatus:
        typeof guard?.status === "string" ? guard.status : null,
      guardReason:
        typeof guard?.reason === "string" ? guard.reason : null,
      generationFallbackRequired:
        sceneEngine?.generationFallbackRequired === true,
      generationFallbackReason:
        sceneEngine?.generationFallbackRequired === true &&
        typeof sceneEngine.reason === "string"
          ? sceneEngine.reason
          : null
    }
  };
}

export async function buildPublicationManifest(
  forecast: LokaForecast
): Promise<PublicationManifest> {
  const core = coreManifest(forecast);
  const fingerprintSha256 = await sha256(stableStringify(core));

  return {
    ...core,
    fingerprintSha256
  };
}

export async function attachPublicationManifest(
  forecast: LokaForecast
): Promise<LokaForecast> {
  const clone = JSON.parse(JSON.stringify(forecast)) as LokaForecast;
  clone.diagnostics.publicationManifest =
    await buildPublicationManifest(clone);
  return clone;
}

export function readPublicationManifest(
  forecast: LokaForecast
): PublicationManifest | null {
  const value = asObj(forecast.diagnostics?.publicationManifest);
  if (!value) return null;

  if (
    value.version !== "12.6.0" ||
    value.surfaceContractVersion !== "12.6.0" ||
    typeof value.fingerprintSha256 !== "string" ||
    typeof value.generatedAt !== "string" ||
    (value.effectiveEngine !== "LEGACY" &&
      value.effectiveEngine !== "V24")
  ) {
    return null;
  }

  return value as unknown as PublicationManifest;
}

export async function verifyPublicationManifest(
  forecast: LokaForecast
): Promise<{
  valid: boolean;
  reason: string;
  manifest: PublicationManifest | null;
}> {
  const stored = readPublicationManifest(forecast);
  if (!stored) {
    return {
      valid: false,
      reason: "publication_manifest_missing_or_invalid",
      manifest: null
    };
  }

  let rebuilt: PublicationManifest;
  try {
    rebuilt = await buildPublicationManifest(forecast);
  } catch (error) {
    return {
      valid: false,
      reason:
        error instanceof Error ? error.message : String(error),
      manifest: stored
    };
  }

  if (rebuilt.fingerprintSha256 !== stored.fingerprintSha256) {
    return {
      valid: false,
      reason: "publication_manifest_fingerprint_mismatch",
      manifest: stored
    };
  }

  if (
    stored.generatedAt !== forecast.generatedAt ||
    stored.citySlug !== forecast.citySlug ||
    stored.forecastDate !== forecast.date ||
    stored.effectiveEngine !== effectiveEngine(forecast) ||
    stored.scene.key !== String(forecast.scene ?? "")
  ) {
    return {
      valid: false,
      reason: "publication_manifest_identity_mismatch",
      manifest: stored
    };
  }

  return {
    valid: true,
    reason: "publication_manifest_verified",
    manifest: stored
  };
}

export function publicationIdentity(
  forecast: LokaForecast
): PublicationIdentity | null {
  const manifest = readPublicationManifest(forecast);
  if (!manifest) return null;

  return {
    version: "12.6.0",
    generatedAt: manifest.generatedAt,
    engine: manifest.effectiveEngine,
    scene: manifest.scene.key,
    fingerprint: manifest.fingerprintSha256
  };
}

export function publicationResponseHeaders(
  forecast: LokaForecast,
  surface: PublicationSurface
): Record<string, string> {
  const identity = publicationIdentity(forecast);

  return {
    "x-loka-publication-version":
      identity?.version ?? "PRE_12_6",
    "x-loka-generated-at":
      identity?.generatedAt ?? forecast.generatedAt,
    "x-loka-engine":
      identity?.engine ?? effectiveEngine(forecast),
    "x-loka-scene":
      identity?.scene ?? String(forecast.scene ?? ""),
    "x-loka-publication-fingerprint":
      identity?.fingerprint ?? "UNMANIFESTED",
    "x-loka-surface": surface,
    "access-control-expose-headers":
      "x-loka-publication-version, x-loka-generated-at, x-loka-engine, x-loka-scene, x-loka-publication-fingerprint, x-loka-surface"
  };
}
