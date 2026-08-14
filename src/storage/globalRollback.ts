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

export interface GlobalRollbackResult {
  version: "12.10.0";
  citySlug: string;
  reason: string;
  before: EngineControlState;
  after: EngineControlState;
  authoritativeRollbackVerified: boolean;
  approvalAuditRecorded: boolean;
}

/**
 * Single authoritative rollback orchestrator.
 *
 * Rule:
 * 1. rollbackToLegacy() is executed first and is authoritative.
 * 2. approval/challenge audit is best-effort only.
 * 3. rollback success never depends on the audit table.
 *
 * Both the normal Admin rollback route and the Bloc 12.10 drill call this
 * exact function.
 */
export async function executeGlobalRollback(
  db: D1Database,
  citySlug: string,
  reason: string
): Promise<GlobalRollbackResult> {
  const before = await ensureEngineControl(
    db,
    citySlug
  );

  const after = await rollbackToLegacy(
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

  let approvalAuditRecorded = false;

  try {
    await auditRollback(
      db,
      citySlug,
      reason
    );
    approvalAuditRecorded = true;
  } catch {
    // Deliberately non-blocking. The rollback has already succeeded.
  }

  return {
    version: "12.10.0",
    citySlug,
    reason,
    before,
    after,
    authoritativeRollbackVerified,
    approvalAuditRecorded
  };
}
