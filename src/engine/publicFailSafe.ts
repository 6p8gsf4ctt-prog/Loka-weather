import type { Env, LokaForecast } from "../types";
import {
  hasValidLegacyPublicFallback,
  resolveStoredPublicSurface,
  restoreLegacyPublicForecast,
  type V24OfficialPublicPayload
} from "./publicProduct";
import {
  verifyV24MasterAsset,
  type V24MasterAvailability
} from "./masterAsset";
import { loadLegacyPublicBackup } from "../storage/publicationSafety";
import { verifyPublicationManifest } from "./publicationManifest";
import { requestFallbackAction } from "./publicationRecoveryPolicy";

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

export interface PublicFailSafeDependencies {
  loadLegacyBackup(
    citySlug: string
  ): Promise<LokaForecast | null>;

  verifyMaster(
    masterUrl: string
  ): Promise<V24MasterAvailability>;
}

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

async function loadPersistent(
  deps: PublicFailSafeDependencies,
  citySlug: string
): Promise<LokaForecast | null> {
  try {
    return await deps.loadLegacyBackup(citySlug);
  } catch {
    return null;
  }
}

async function fallbackToLegacy(
  deps: PublicFailSafeDependencies,
  original: LokaForecast,
  reason: string,
  knownPersistent?: LokaForecast | null
): Promise<SafePublicSurface> {
  const persistent =
    knownPersistent === undefined
      ? await loadPersistent(deps, original.citySlug)
      : knownPersistent;

  const inlineAvailable =
    hasValidLegacyPublicFallback(original);

  const action = requestFallbackAction({
    persistentLegacyAvailable: persistent !== null,
    inlineLegacyAvailable: inlineAvailable
  });

  if (action === "SERVE_PERSISTENT_LEGACY" && persistent) {
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

  if (action === "SERVE_INLINE_LEGACY" && inlineAvailable) {
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

export async function resolvePublicSurfaceWithDependencies(
  forecast: LokaForecast,
  deps: PublicFailSafeDependencies
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
      deps,
      forecast,
      "stored_v24_product_rejected"
    );
  }

  const persistentBackup = await loadPersistent(
    deps,
    forecast.citySlug
  );

  if (!persistentBackup) {
    return fallbackToLegacy(
      deps,
      forecast,
      "persistent_legacy_backup_unavailable_at_request",
      null
    );
  }

  const manifest = await verifyPublicationManifest(
    stored.forecast
  );

  if (!manifest.valid) {
    return fallbackToLegacy(
      deps,
      forecast,
      `publication_manifest_invalid:${manifest.reason}`,
      persistentBackup
    );
  }

  const master = await deps.verifyMaster(
    stored.payload.scene.masterUrl
  );

  if (!master.available) {
    return fallbackToLegacy(
      deps,
      forecast,
      `master_asset_unavailable_at_request:${master.reason}`,
      persistentBackup
    );
  }

  return {
    engine: "V24",
    forecast: stored.forecast,
    payload: stored.payload,
    fallback: false,
    reason: "v24_public_product_verified"
  };
}

export async function resolvePublicSurfaceSafely(
  env: Env,
  forecast: LokaForecast
): Promise<SafePublicSurface> {
  return resolvePublicSurfaceWithDependencies(
    forecast,
    {
      loadLegacyBackup: (citySlug) =>
        loadLegacyPublicBackup(env.DB, citySlug),
      verifyMaster: (masterUrl) =>
        verifyV24MasterAsset(env, masterUrl)
    }
  );
}
