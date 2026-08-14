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
   * This is the engine requested after global authorization/readiness checks.
   * The per-generation activation guard remains authoritative and may force
   * the actual generation back to LEGACY.
   */
  effectiveProduction: "LEGACY" | "V24";

  previewEnabled: boolean;
  readiness: ReadinessStatus;
  v24Approved: boolean;
  activationGuardEnabled: boolean;
  reason: string;

  /**
   * false only when V24 has passed the global authorization/readiness layer.
   * This does NOT bypass the per-generation activation guard.
   */
  productionActivationLocked: boolean;
}

const VERSION = "12.6.0";

export function normalizeSceneEngineMode(value: unknown): SceneEngineMode {
  return value === "V24_PREVIEW" || value === "V24"
    ? value
    : "LEGACY";
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

  if (args.readiness !== "READY_CANDIDATE") {
    return {
      version: VERSION,
      requested,
      effectiveProduction: "LEGACY",
      previewEnabled: args.hasValidV24Decision,
      readiness: args.readiness,
      v24Approved: approved,
      activationGuardEnabled: false,
      reason: "readiness_not_ready",
      productionActivationLocked: true
    };
  }

  if (!approved) {
    return {
      version: VERSION,
      requested,
      effectiveProduction: "LEGACY",
      previewEnabled: args.hasValidV24Decision,
      readiness: args.readiness,
      v24Approved: false,
      activationGuardEnabled: false,
      reason: "v24_not_approved",
      productionActivationLocked: true
    };
  }

  if (!args.hasValidV24Decision) {
    return {
      version: VERSION,
      requested,
      effectiveProduction: "LEGACY",
      previewEnabled: false,
      readiness: args.readiness,
      v24Approved: true,
      activationGuardEnabled: false,
      reason: "no_valid_v24_decision",
      productionActivationLocked: true
    };
  }

  return {
    version: VERSION,
    requested,
    effectiveProduction: "V24",
    previewEnabled: true,
    readiness: args.readiness,
    v24Approved: true,
    activationGuardEnabled: true,
    reason: "v24_armed_generation_guard_required",
    productionActivationLocked: false
  };
}
