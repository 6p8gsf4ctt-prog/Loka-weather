export type SceneEngineMode = "LEGACY" | "V24_PREVIEW" | "V24";

export interface EngineControlState {
  citySlug: string;
  requestedMode: SceneEngineMode;
  v24Approved: boolean;
  approvedAt: string | null;
  approvedBy: string | null;
  rollbackAt: string | null;
  rollbackReason: string | null;
  updatedAt: string | null;
}

export type ReadinessStatus =
  | "NOT_READY"
  | "OBSERVATION"
  | "READY_CANDIDATE"
  | "UNAVAILABLE";

export interface SceneEngineResolution {
  version: string;

  /** Requested administrative/configuration intent. */
  requested: SceneEngineMode;

  /**
   * Production engine actually allowed to write the official public scene.
   * Bloc 11.1 deliberately hard-locks this to LEGACY.
   */
  effectiveProduction: "LEGACY";

  /**
   * Whether V24 may be rendered as a non-public preview.
   * This is the only V24 activation permitted by Bloc 11.1.
   */
  previewEnabled: boolean;

  readiness: ReadinessStatus;
  v24Approved: boolean;
  reason: string;

  productionActivationLocked: true;
}

const VERSION = "11.1.0";

export function normalizeSceneEngineMode(value: unknown): SceneEngineMode {
  return value === "V24_PREVIEW" || value === "V24"
    ? value
    : "LEGACY";
}

/**
 * Bloc 11.1 resolver.
 *
 * Safety invariant:
 * effectiveProduction is ALWAYS LEGACY in this sub-block.
 *
 * We intentionally implement the selector contract before connecting it to
 * forecast.scene. That makes accidental V24 publication impossible while the
 * control plane is being validated.
 */
export function resolveSceneEngineMode(args: {
  configuredMode?: unknown;
  control: EngineControlState | null;
  readiness: ReadinessStatus;
  hasValidV24Decision: boolean;
}): SceneEngineResolution {
  const configured = normalizeSceneEngineMode(args.configuredMode);
  const persisted = args.control?.requestedMode ?? "LEGACY";

  // D1 administrative state is authoritative once present. The environment
  // variable acts only as a requested/configured intent.
  const requested = args.control ? persisted : configured;
  const approved = args.control?.v24Approved === true;

  if (requested === "LEGACY") {
    return {
      version: VERSION,
      requested,
      effectiveProduction: "LEGACY",
      previewEnabled: false,
      readiness: args.readiness,
      v24Approved: approved,
      reason: "legacy_requested",
      productionActivationLocked: true
    };
  }

  if (requested === "V24_PREVIEW") {
    return {
      version: VERSION,
      requested,
      effectiveProduction: "LEGACY",
      previewEnabled: args.hasValidV24Decision,
      readiness: args.readiness,
      v24Approved: approved,
      reason: args.hasValidV24Decision
        ? "preview_enabled_production_locked"
        : "preview_unavailable_no_valid_v24",
      productionActivationLocked: true
    };
  }

  // V24 can be requested and audited, but Bloc 11.1 will never make it
  // effective in production.
  let reason = "production_activation_locked_bloc_11_1";

  if (args.readiness !== "READY_CANDIDATE") {
    reason = "readiness_not_ready";
  } else if (!approved) {
    reason = "v24_not_approved";
  } else if (!args.hasValidV24Decision) {
    reason = "no_valid_v24_decision";
  }

  return {
    version: VERSION,
    requested,
    effectiveProduction: "LEGACY",
    previewEnabled: args.hasValidV24Decision,
    readiness: args.readiness,
    v24Approved: approved,
    reason,
    productionActivationLocked: true
  };
}
