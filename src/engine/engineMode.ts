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
  requested: SceneEngineMode;

  /**
   * Bloc 12.3 arms the exact per-generation activation guards.
   * Public cutover is intentionally still locked until Bloc 12.4.
   */
  effectiveProduction: "LEGACY";

  previewEnabled: boolean;
  readiness: ReadinessStatus;
  v24Approved: boolean;
  activationGuardEnabled: boolean;
  reason: string;
  productionActivationLocked: true;
}

const VERSION = "12.3.0";

export function normalizeSceneEngineMode(value: unknown): SceneEngineMode {
  return value === "V24_PREVIEW" || value === "V24" ? value : "LEGACY";
}

export function resolveSceneEngineMode(args: {
  configuredMode?: unknown;
  control: EngineControlState | null;
  readiness: ReadinessStatus;
  hasValidV24Decision: boolean;
}): SceneEngineResolution {
  const configured = normalizeSceneEngineMode(args.configuredMode);
  const requested = args.control?.requestedMode ?? configured;
  const approved = args.control?.v24Approved === true;

  if (requested === "LEGACY") {
    return {
      version: VERSION,
      requested,
      effectiveProduction: "LEGACY",
      previewEnabled: false,
      readiness: args.readiness,
      v24Approved: approved,
      activationGuardEnabled: false,
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
      activationGuardEnabled: false,
      reason: args.hasValidV24Decision
        ? "preview_enabled_production_locked"
        : "preview_unavailable_no_valid_v24",
      productionActivationLocked: true
    };
  }

  const guardsEnabled =
    approved &&
    args.readiness === "READY_CANDIDATE" &&
    args.hasValidV24Decision;

  let reason = "v24_activation_guard_armed";

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
    activationGuardEnabled: guardsEnabled,
    reason,
    productionActivationLocked: true
  };
}
