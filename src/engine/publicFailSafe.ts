import type { Env, LokaForecast } from "../types";
import {
  hasValidLegacyPublicFallback,
  resolveStoredPublicSurface,
  restoreLegacyPublicForecast,
  type V24OfficialPublicPayload
} from "./publicProduct";
import { verifyV24MasterAsset } from "./masterAsset";
import { loadLegacyPublicBackup } from "../storage/publicationSafety";

type Obj = Record<string, unknown>;

export type SafePublicSurface =
  | {
      engine: "V24";
      forecast: LokaForecast;
      payload: V24OfficialPublicPayload;
      fallback: false;
      reason: "v24_public_product_verified";
    }
  | {
      engine: "LEGACY";
      forecast: LokaForecast;
      payload: null;
      fallback: boolean;
      reason: string;
    }
  | {
      engine: "UNAVAILABLE";
      forecast: null;
      payload: null;
      fallback: true;
      reason: string;
    };

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function claimsV24(forecast: LokaForecast): boolean {
  const engine = asObj(forecast.diagnostics?.sceneEngine);
  return engine?.effectiveProduction === "V24";
}

function withRequestFallbackReason(
  forecast: LokaForecast,
  reason: string,
  source: "PERSISTENT_BACKUP" | "INLINE_BACKUP"
): LokaForecast {
  const clone = JSON.parse(JSON.stringify(forecast)) as LokaForecast;
  clone.diagnostics.sceneEngine = {
    ...(asObj(clone.diagnostics.sceneEngine) ?? {}),
    effectiveProduction: "LEGACY",
    publicSurfaceEngine: "LEGACY",
    requestTimeFallback: true,
    requestTimeFallbackReason: reason,
    requestTimeFallbackSource: source
  };
  return clone;
}

async function fallbackToLegacy(
  db: D1Database,
  original: LokaForecast,
  reason: string
): Promise<SafePublicSurface> {
  try {
    const persistent = await loadLegacyPublicBackup(db, original.citySlug);
    if (persistent) {
      return {
        engine: "LEGACY",
        forecast: withRequestFallbackReason(
          persistent,
          reason,
          "PERSISTENT_BACKUP"
        ),
        payload: null,
        fallback: true,
        reason
      };
    }
  } catch {
    // Continue to inline fallback.
  }

  if (hasValidLegacyPublicFallback(original)) {
    const inline = restoreLegacyPublicForecast(original);
    return {
      engine: "LEGACY",
      forecast: withRequestFallbackReason(
        inline,
        reason,
        "INLINE_BACKUP"
      ),
      payload: null,
      fallback: true,
      reason
    };
  }

  return {
    engine: "UNAVAILABLE",
    forecast: null,
    payload: null,
    fallback: true,
    reason: `${reason}:no_valid_legacy_backup`
  };
}

export async function resolvePublicSurfaceSafely(
  env: Env,
  forecast: LokaForecast
): Promise<SafePublicSurface> {
  const claim = claimsV24(forecast);
  const stored = resolveStoredPublicSurface(forecast);

  if (stored.engine === "LEGACY") {
    if (!claim) {
      return {
        engine: "LEGACY",
        forecast: stored.forecast,
        payload: null,
        fallback: false,
        reason: "legacy_generation"
      };
    }

    return fallbackToLegacy(
      env.DB,
      forecast,
      "stored_v24_product_rejected"
    );
  }

  // A V24 generation is never served unless a persistent Legacy backup is
  // still readable right now.
  let persistentBackup: LokaForecast | null = null;
  try {
    persistentBackup = await loadLegacyPublicBackup(
      env.DB,
      forecast.citySlug
    );
  } catch {
    persistentBackup = null;
  }

  if (!persistentBackup) {
    return fallbackToLegacy(
      env.DB,
      forecast,
      "persistent_legacy_backup_unavailable_at_request"
    );
  }

  const master = await verifyV24MasterAsset(
    env,
    stored.payload.scene.masterUrl
  );

  if (!master.available) {
    return {
      engine: "LEGACY",
      forecast: withRequestFallbackReason(
        persistentBackup,
        `master_asset_unavailable_at_request:${master.reason}`,
        "PERSISTENT_BACKUP"
      ),
      payload: null,
      fallback: true,
      reason: `master_asset_unavailable_at_request:${master.reason}`
    };
  }

  return {
    engine: "V24",
    forecast: stored.forecast,
    payload: stored.payload,
    fallback: false,
    reason: "v24_public_product_verified"
  };
}
