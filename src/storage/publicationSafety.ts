import type { LokaForecast } from "../types";
import { latestForecast, saveForecast } from "./db";
import {
  hasValidLegacyPublicFallback,
  resolveStoredPublicSurface,
  restoreLegacyPublicForecast
} from "../engine/publicProduct";

type Obj = Record<string, unknown>;

export interface PublicationFallbackAuditItem {
  id: number;
  eventAt: string;
  stage: string;
  requestedEngine: string | null;
  finalEngine: string | null;
  reason: string;
  detail: unknown;
}

export interface SafePublicationPreparation {
  forecast: LokaForecast;
  requestedEngine: "LEGACY" | "V24";
  fallbackForecast: LokaForecast | null;
  backupReady: boolean;
  preflightFallback: boolean;
  reason: string;
}

export interface SafePublicationCommit {
  forecast: LokaForecast;
  requestedEngine: "LEGACY" | "V24";
  finalEngine: "LEGACY" | "V24";
  fallbackApplied: boolean;
  reason: string;
  verified: boolean;
}

const LEGACY_SCENES = new Set([
  "SOLEIL",
  "NUAGES",
  "PLUIE",
  "ORAGES",
  "VENT FORT",
  "INSTABLE"
]);

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function engineOf(forecast: LokaForecast): "LEGACY" | "V24" {
  const engine = asObj(forecast.diagnostics?.sceneEngine);
  return engine?.effectiveProduction === "V24" ? "V24" : "LEGACY";
}

function cloneForecast(forecast: LokaForecast): LokaForecast {
  return JSON.parse(JSON.stringify(forecast)) as LokaForecast;
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function validateForecastSerialization(
  forecast: LokaForecast
): { ok: true; json: string } | { ok: false; error: string } {
  try {
    const json = JSON.stringify(forecast);

    if (!json || json.length < 20) {
      return { ok: false, error: "forecast_serialization_empty" };
    }

    return { ok: true, json };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function isStrictLegacyForecast(forecast: LokaForecast): boolean {
  return (
    typeof forecast.scene === "string" &&
    LEGACY_SCENES.has(forecast.scene) &&
    typeof forecast.mainVerdict === "string" &&
    !!forecast.mainVerdict.trim() &&
    typeof forecast.rainVerdict === "string" &&
    Array.isArray(forecast.summaryLines) &&
    forecast.summaryLines.every((line) => typeof line === "string")
  );
}

function annotate(
  forecast: LokaForecast,
  values: Record<string, unknown>
): LokaForecast {
  const clone = cloneForecast(forecast);
  clone.diagnostics.publicationSafety = {
    version: "12.5.0",
    ...(asObj(clone.diagnostics.publicationSafety) ?? {}),
    ...values
  };
  return clone;
}

async function appendFallbackAudit(
  db: D1Database,
  args: {
    forecast: LokaForecast;
    stage: "PREFLIGHT" | "BACKUP" | "WRITE" | "VERIFY" | "RECOVERY";
    requestedEngine: "LEGACY" | "V24";
    finalEngine: "LEGACY" | "V24" | null;
    reason: string;
    detail?: unknown;
  }
): Promise<void> {
  try {
    await db.prepare(`
      INSERT INTO publication_fallback_audit (
        event_id,
        city_slug,
        forecast_date,
        generated_at,
        event_at,
        stage,
        requested_engine,
        final_engine,
        reason,
        detail_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      args.forecast.citySlug,
      args.forecast.date,
      args.forecast.generatedAt,
      new Date().toISOString(),
      args.stage,
      args.requestedEngine,
      args.finalEngine,
      args.reason,
      args.detail === undefined ? null : JSON.stringify(args.detail)
    ).run();
  } catch {
    // Fallback correctness must never depend on audit availability.
  }
}

export async function saveLegacyPublicBackup(
  db: D1Database,
  forecast: LokaForecast,
  source: string,
  reason: string
): Promise<void> {
  if (!isStrictLegacyForecast(forecast)) {
    throw new Error("legacy_backup_invalid_forecast");
  }

  const serial = validateForecastSerialization(forecast);
  if (!serial.ok) {
    throw new Error(`legacy_backup_serialization_failed:${serial.error}`);
  }

  const checksum = await sha256(serial.json);

  await db.prepare(`
    INSERT INTO public_forecast_backup (
      city_slug,
      forecast_date,
      generated_at,
      source,
      engine,
      forecast_json,
      checksum_sha256,
      backup_reason,
      updated_at
    ) VALUES (?, ?, ?, ?, 'LEGACY', ?, ?, ?, ?)
    ON CONFLICT(city_slug) DO UPDATE SET
      forecast_date = excluded.forecast_date,
      generated_at = excluded.generated_at,
      source = excluded.source,
      engine = 'LEGACY',
      forecast_json = excluded.forecast_json,
      checksum_sha256 = excluded.checksum_sha256,
      backup_reason = excluded.backup_reason,
      updated_at = excluded.updated_at
  `).bind(
    forecast.citySlug,
    forecast.date,
    forecast.generatedAt,
    source,
    serial.json,
    checksum,
    reason,
    new Date().toISOString()
  ).run();
}

export async function loadLegacyPublicBackup(
  db: D1Database,
  citySlug: string
): Promise<LokaForecast | null> {
  const row = await db.prepare(`
    SELECT forecast_json, checksum_sha256
    FROM public_forecast_backup
    WHERE city_slug = ?
      AND engine = 'LEGACY'
    LIMIT 1
  `).bind(citySlug).first<{
    forecast_json: string;
    checksum_sha256: string;
  }>();

  if (!row) return null;

  const checksum = await sha256(row.forecast_json);
  if (checksum !== row.checksum_sha256) return null;

  try {
    const forecast = JSON.parse(row.forecast_json) as LokaForecast;
    return isStrictLegacyForecast(forecast) ? forecast : null;
  } catch {
    return null;
  }
}

export async function recentPublicationFallbackAudit(
  db: D1Database,
  citySlug: string,
  limit = 12
): Promise<PublicationFallbackAuditItem[]> {
  const safeLimit = Math.min(50, Math.max(1, limit));

  const result = await db.prepare(`
    SELECT
      id,
      event_at,
      stage,
      requested_engine,
      final_engine,
      reason,
      detail_json
    FROM publication_fallback_audit
    WHERE city_slug = ?
    ORDER BY id DESC
    LIMIT ?
  `).bind(citySlug, safeLimit).all<{
    id: number;
    event_at: string;
    stage: string;
    requested_engine: string | null;
    final_engine: string | null;
    reason: string;
    detail_json: string | null;
  }>();

  return result.results.map((row) => {
    let detail: unknown = null;
    try {
      detail = row.detail_json ? JSON.parse(row.detail_json) : null;
    } catch {
      detail = null;
    }

    return {
      id: row.id,
      eventAt: row.event_at,
      stage: row.stage,
      requestedEngine: row.requested_engine,
      finalEngine: row.final_engine,
      reason: row.reason,
      detail
    };
  });
}

export async function prepareSafePublication(
  db: D1Database,
  forecast: LokaForecast,
  source: string
): Promise<SafePublicationPreparation> {
  const serial = validateForecastSerialization(forecast);
  if (!serial.ok) {
    await appendFallbackAudit(db, {
      forecast,
      stage: "PREFLIGHT",
      requestedEngine: engineOf(forecast),
      finalEngine: null,
      reason: "forecast_not_serializable",
      detail: { error: serial.error }
    });
    throw new Error(`forecast_not_serializable:${serial.error}`);
  }

  const requestedEngine = engineOf(forecast);

  if (requestedEngine === "LEGACY") {
    let backupReady = false;

    if (isStrictLegacyForecast(forecast)) {
      try {
        await saveLegacyPublicBackup(
          db,
          forecast,
          source,
          "latest_good_legacy_generation"
        );
        backupReady = true;
      } catch (error) {
        await appendFallbackAudit(db, {
          forecast,
          stage: "BACKUP",
          requestedEngine,
          finalEngine: "LEGACY",
          reason: "legacy_backup_refresh_failed_non_blocking",
          detail: {
            error: error instanceof Error ? error.message : String(error)
          }
        });
      }
    }

    return {
      forecast: annotate(forecast, {
        requestedEngine,
        backupReady,
        failSafeArmed: true,
        preflightFallback: false
      }),
      requestedEngine,
      fallbackForecast: null,
      backupReady,
      preflightFallback: false,
      reason: "legacy_publication_prepared"
    };
  }

  if (!hasValidLegacyPublicFallback(forecast)) {
    await appendFallbackAudit(db, {
      forecast,
      stage: "PREFLIGHT",
      requestedEngine,
      finalEngine: null,
      reason: "v24_missing_valid_inline_legacy_fallback"
    });
    throw new Error("v24_missing_valid_inline_legacy_fallback");
  }

  const fallback = restoreLegacyPublicForecast(forecast);

  if (!isStrictLegacyForecast(fallback)) {
    await appendFallbackAudit(db, {
      forecast,
      stage: "PREFLIGHT",
      requestedEngine,
      finalEngine: null,
      reason: "v24_legacy_fallback_invalid"
    });
    throw new Error("v24_legacy_fallback_invalid");
  }

  try {
    await saveLegacyPublicBackup(
      db,
      fallback,
      source,
      "pre_v24_cutover_last_known_good"
    );
  } catch (error) {
    const forced = annotate(fallback, {
      requestedEngine: "V24",
      effectiveEngine: "LEGACY",
      backupReady: false,
      failSafeArmed: false,
      preflightFallback: true,
      fallbackReason: "persistent_legacy_backup_failed"
    });

    forced.diagnostics.sceneEngine = {
      ...(asObj(forced.diagnostics.sceneEngine) ?? {}),
      effectiveProduction: "LEGACY",
      publicSurfaceEngine: "LEGACY",
      generationFallbackRequired: true,
      generationFallbackEngine: "LEGACY",
      reason: "persistent_legacy_backup_failed"
    };

    await appendFallbackAudit(db, {
      forecast,
      stage: "BACKUP",
      requestedEngine,
      finalEngine: "LEGACY",
      reason: "persistent_legacy_backup_failed",
      detail: {
        error: error instanceof Error ? error.message : String(error)
      }
    });

    return {
      forecast: forced,
      requestedEngine,
      fallbackForecast: fallback,
      backupReady: false,
      preflightFallback: true,
      reason: "persistent_legacy_backup_failed"
    };
  }

  return {
    forecast: annotate(forecast, {
      requestedEngine: "V24",
      backupReady: true,
      failSafeArmed: true,
      preflightFallback: false,
      persistentBackupReason: "pre_v24_cutover_last_known_good"
    }),
    requestedEngine,
    fallbackForecast: fallback,
    backupReady: true,
    preflightFallback: false,
    reason: "v24_publication_prepared"
  };
}

async function verifyCommitted(
  db: D1Database,
  expected: LokaForecast,
  expectedEngine: "LEGACY" | "V24"
): Promise<boolean> {
  const readback = await latestForecast(db, expected.citySlug);
  if (!readback) return false;
  if (readback.generatedAt !== expected.generatedAt) return false;

  const surface = resolveStoredPublicSurface(readback);
  return surface.engine === expectedEngine;
}

async function recoverLegacy(
  db: D1Database,
  fallback: LokaForecast,
  source: string,
  requestedEngine: "LEGACY" | "V24",
  reason: string,
  detail?: unknown
): Promise<SafePublicationCommit> {
  const recovered = annotate(fallback, {
    requestedEngine,
    effectiveEngine: "LEGACY",
    backupReady: true,
    failSafeArmed: true,
    recoveryApplied: true,
    fallbackReason: reason
  });

  recovered.diagnostics.sceneEngine = {
    ...(asObj(recovered.diagnostics.sceneEngine) ?? {}),
    effectiveProduction: "LEGACY",
    publicSurfaceEngine: "LEGACY",
    generationFallbackRequired: requestedEngine === "V24",
    generationFallbackEngine: requestedEngine === "V24" ? "LEGACY" : null,
    reason
  };

  await saveForecast(db, recovered, source);
  const verified = await verifyCommitted(db, recovered, "LEGACY");

  await appendFallbackAudit(db, {
    forecast: recovered,
    stage: "RECOVERY",
    requestedEngine,
    finalEngine: "LEGACY",
    reason,
    detail: { verified, detail }
  });

  if (!verified) {
    throw new Error("legacy_recovery_write_not_verified");
  }

  return {
    forecast: recovered,
    requestedEngine,
    finalEngine: "LEGACY",
    fallbackApplied: true,
    reason,
    verified: true
  };
}

export async function commitSafePublication(
  db: D1Database,
  preparation: SafePublicationPreparation,
  source: string
): Promise<SafePublicationCommit> {
  const target = engineOf(preparation.forecast);

  try {
    await saveForecast(db, preparation.forecast, source);
  } catch (error) {
    await appendFallbackAudit(db, {
      forecast: preparation.forecast,
      stage: "WRITE",
      requestedEngine: preparation.requestedEngine,
      finalEngine: null,
      reason: "official_forecast_write_failed",
      detail: {
        target,
        error: error instanceof Error ? error.message : String(error)
      }
    });

    if (preparation.fallbackForecast) {
      try {
        return await recoverLegacy(
          db,
          preparation.fallbackForecast,
          source,
          preparation.requestedEngine,
          "v24_write_failed_recovered_legacy",
          error instanceof Error ? error.message : String(error)
        );
      } catch {
        // If both writes fail, the previous public forecast remains the only
        // trustworthy product. Do not claim the new generation was published.
      }
    }

    throw new Error("publication_write_failed_previous_forecast_retained");
  }

  let verified = false;
  try {
    verified = await verifyCommitted(db, preparation.forecast, target);
  } catch (error) {
    await appendFallbackAudit(db, {
      forecast: preparation.forecast,
      stage: "VERIFY",
      requestedEngine: preparation.requestedEngine,
      finalEngine: target,
      reason: "publication_readback_exception",
      detail: {
        error: error instanceof Error ? error.message : String(error)
      }
    });
  }

  if (!verified) {
    await appendFallbackAudit(db, {
      forecast: preparation.forecast,
      stage: "VERIFY",
      requestedEngine: preparation.requestedEngine,
      finalEngine: target,
      reason: "publication_readback_not_verified"
    });

    if (preparation.fallbackForecast) {
      return recoverLegacy(
        db,
        preparation.fallbackForecast,
        source,
        preparation.requestedEngine,
        "v24_readback_failed_recovered_legacy"
      );
    }

    throw new Error("legacy_publication_readback_not_verified");
  }

  return {
    forecast: preparation.forecast,
    requestedEngine: preparation.requestedEngine,
    finalEngine: target,
    fallbackApplied:
      preparation.requestedEngine === "V24" && target === "LEGACY",
    reason: preparation.reason,
    verified: true
  };
}
