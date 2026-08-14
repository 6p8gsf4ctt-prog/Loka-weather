import type { Env, LokaForecast } from "../types";
import {
  captureLegacyPublicFallback,
  resolveStoredPublicSurface,
  restoreLegacyPublicForecast
} from "./publicProduct";
import {
  loadLegacyPublicBackup,
  validateForecastSerialization
} from "../storage/publicationSafety";
import {
  verifyV24CandidateMasterAsset,
  verifyV24MasterAsset
} from "./masterAsset";
import { resolvePublicSurfaceSafely } from "./publicFailSafe";

type Obj = Record<string, unknown>;

export interface FallbackSelfTestItem {
  id: string;
  passed: boolean;
  status: "PASS" | "FAIL" | "PENDING";
  detail: string;
}

export interface FallbackSelfTestReport {
  version: "12.5.0";
  generatedAt: string;
  status: "PASS" | "FAIL" | "PENDING";
  tests: FallbackSelfTestItem[];
  productionMutationPerformed: false;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function test(
  id: string,
  passed: boolean,
  detail: string,
  pending = false
): FallbackSelfTestItem {
  return {
    id,
    passed,
    status: pending ? "PENDING" : passed ? "PASS" : "FAIL",
    detail
  };
}

export async function runFallbackSelfTest(
  env: Env,
  forecast: LokaForecast
): Promise<FallbackSelfTestReport> {
  const tests: FallbackSelfTestItem[] = [];

  // 1. Current selected V24 master, when a candidate exists.
  const currentMaster = await verifyV24CandidateMasterAsset(
    env,
    forecast,
    true
  );

  tests.push(
    test(
      "current_candidate_master",
      currentMaster.available,
      currentMaster.available
        ? `${currentMaster.masterUrl} disponible (${currentMaster.contentType}).`
        : `${currentMaster.reason}${currentMaster.error ? ` : ${currentMaster.error}` : ""}`
    )
  );

  // 2. A deliberately missing master must be detected.
  const missing = await verifyV24MasterAsset(
    env,
    "/masters24/__LOKA_12_5_MISSING__.png"
  );

  tests.push(
    test(
      "missing_master_detected",
      !missing.available,
      !missing.available
        ? `Master absent correctement refusé (${missing.reason}).`
        : "Le faux master a été considéré disponible."
    )
  );

  // 3. Corrupt stored V24 product must never be accepted as V24.
  const corrupt = clone(forecast);
  corrupt.diagnostics.legacyPublicFallback =
    captureLegacyPublicFallback(forecast);
  corrupt.diagnostics.sceneEngine = {
    effectiveProduction: "V24"
  };
  corrupt.diagnostics.v24ActivationGuard = {
    status: "PASS",
    activationReadyForCutover: true
  };
  corrupt.diagnostics.v24OfficialProduct = {
    mode: "V24",
    publishable: true,
    version: "12.5.0",
    scene: null
  };

  tests.push(
    test(
      "corrupt_v24_product_rejected",
      resolveStoredPublicSurface(corrupt).engine === "LEGACY",
      "Un produit V24 corrompu doit être refusé avant rendu."
    )
  );

  // 4. Guard BLOCKED must force Legacy even if engine claims V24.
  const blocked = clone(corrupt);
  blocked.diagnostics.v24ActivationGuard = {
    status: "BLOCKED",
    activationReadyForCutover: false
  };

  tests.push(
    test(
      "blocked_guard_forces_legacy",
      resolveStoredPublicSurface(blocked).engine === "LEGACY",
      "Une génération BLOCKED ne peut jamais être servie comme V24."
    )
  );

  // 5. Inline Legacy restore must reconstruct the official Legacy product.
  const inline = clone(forecast);
  inline.diagnostics.legacyPublicFallback =
    captureLegacyPublicFallback(forecast);
  const originalScene = forecast.scene;
  inline.scene = "COUVERT" as never;
  inline.mainVerdict = "__FAULT_V24__";
  const restored = restoreLegacyPublicForecast(inline);

  tests.push(
    test(
      "inline_legacy_restore",
      restored.scene === originalScene &&
        restored.mainVerdict === forecast.mainVerdict,
      "Le snapshot Legacy inline doit restaurer scène et éditorial."
    )
  );

  // 6. Serialization guard must reject BigInt / invalid JSON payloads.
  const serializationFault = clone(forecast) as LokaForecast & {
    diagnostics: Record<string, unknown>;
  };
  serializationFault.diagnostics.__bloc125BigInt = BigInt(1);

  tests.push(
    test(
      "serialization_fault_detected",
      !validateForecastSerialization(serializationFault).ok,
      "Une génération non sérialisable doit être bloquée avant D1."
    )
  );

  // 7. Persistent backup table/checksum.
  let backup: LokaForecast | null = null;
  let backupError: string | null = null;

  try {
    backup = await loadLegacyPublicBackup(env.DB, forecast.citySlug);
  } catch (error) {
    backupError = error instanceof Error ? error.message : String(error);
  }

  tests.push(
    test(
      "persistent_legacy_backup",
      backup !== null,
      backup
        ? `Backup Legacy vérifié : ${backup.generatedAt}.`
        : backupError
          ? `Backup indisponible : ${backupError}`
          : "Aucun backup encore enregistré : générer une météo après déploiement 12.5.",
      backup === null && backupError === null
    )
  );

  // 8. Current public surface must resolve safely.
  let currentSafe = null as Awaited<ReturnType<typeof resolvePublicSurfaceSafely>> | null;
  let currentSafeError: string | null = null;

  try {
    currentSafe = await resolvePublicSurfaceSafely(env, forecast);
  } catch (error) {
    currentSafeError = error instanceof Error ? error.message : String(error);
  }

  tests.push(
    test(
      "current_public_surface_safe",
      currentSafe !== null && currentSafe.engine !== "UNAVAILABLE",
      currentSafe
        ? `Surface actuelle : ${currentSafe.engine} (${currentSafe.reason}).`
        : `Résolution impossible : ${currentSafeError ?? "unknown"}.`
    )
  );

  const failed = tests.some((item) => item.status === "FAIL");
  const pending = tests.some((item) => item.status === "PENDING");

  return {
    version: "12.5.0",
    generatedAt: new Date().toISOString(),
    status: failed ? "FAIL" : pending ? "PENDING" : "PASS",
    tests,
    productionMutationPerformed: false
  };
}
