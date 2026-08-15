import type {
  EngineControlState
} from "../engine/engineMode";
import {
  ensureEngineControl,
  rollbackToLegacy
} from "./engineControl";
import {
  auditRollback
} from "./engineApproval";
import {
  latestForecast
} from "./db";
import {
  resolveStoredPublicSurface
} from "../engine/publicProduct";
import {
  commitSafePublication,
  loadLegacyPublicBackup,
  prepareSafePublication
} from "./publicationSafety";

export interface GlobalRollbackResult {
  version: "12.13.0";
  citySlug: string;
  reason: string;
  before: EngineControlState;
  after: EngineControlState;
  authoritativeRollbackVerified: boolean;
  approvalAuditRecorded: boolean;

  publicRestoreRequired: boolean;
  publicRestoreAttempted: boolean;
  publicRestoreVerified: boolean;
  publicRestoreError: string | null;
  restoredGeneratedAt: string | null;
}

/**
 * Authoritative global rollback.
 *
 * Since Bloc 12.13 can make V24 genuinely public, rollback now has TWO jobs:
 * 1. immediately disarm V24 in engine_control;
 * 2. if the currently stored public product is V24, restore the persistent
 *    Legacy backup as the current public forecast.
 *
 * Control rollback remains authoritative even if the public restore or audit
 * encounters an error.
 */
export async function executeGlobalRollback(
  db: D1Database,
  citySlug: string,
  reason: string
): Promise<GlobalRollbackResult> {
  const before =
    await ensureEngineControl(
      db,
      citySlug
    );

  let publicRestoreRequired = false;

  try {
    const current =
      await latestForecast(
        db,
        citySlug
      );

    publicRestoreRequired =
      !!current &&
      resolveStoredPublicSurface(
        current
      ).engine === "V24";
  } catch {
    // Control rollback must continue.
  }

  // First make every future generation ineligible for V24.
  const after =
    await rollbackToLegacy(
      db,
      citySlug,
      reason
    );

  const authoritativeRollbackVerified =
    after.requestedMode === "LEGACY" &&
    after.v24Approved === false;

  if (!authoritativeRollbackVerified) {
    throw new Error(
      "global_rollback_verification_failed"
    );
  }

  let publicRestoreAttempted = false;
  let publicRestoreVerified =
    !publicRestoreRequired;
  let publicRestoreError:
    string | null = null;
  let restoredGeneratedAt:
    string | null = null;

  if (publicRestoreRequired) {
    publicRestoreAttempted = true;

    try {
      const backup =
        await loadLegacyPublicBackup(
          db,
          citySlug
        );

      if (!backup) {
        throw new Error(
          "global_rollback_legacy_backup_unavailable"
        );
      }

      const prepared =
        await prepareSafePublication(
          db,
          backup,
          "global_rollback_restore"
        );

      const committed =
        await commitSafePublication(
          db,
          prepared,
          "global_rollback_restore"
        );

      const surface =
        resolveStoredPublicSurface(
          committed.forecast
        );

      publicRestoreVerified =
        surface.engine === "LEGACY";
      restoredGeneratedAt =
        committed.forecast.generatedAt;

      if (!publicRestoreVerified) {
        throw new Error(
          "global_rollback_public_restore_not_legacy"
        );
      }
    } catch (error) {
      publicRestoreVerified = false;
      publicRestoreError =
        error instanceof Error
          ? error.message
          : String(error);
    }
  }

  let approvalAuditRecorded = false;

  try {
    await auditRollback(
      db,
      citySlug,
      reason
    );
    approvalAuditRecorded = true;
  } catch {
    // Never make control rollback dependent on audit availability.
  }

  return {
    version: "12.13.0",
    citySlug,
    reason,
    before,
    after,
    authoritativeRollbackVerified,
    approvalAuditRecorded,
    publicRestoreRequired,
    publicRestoreAttempted,
    publicRestoreVerified,
    publicRestoreError,
    restoredGeneratedAt
  };
}
