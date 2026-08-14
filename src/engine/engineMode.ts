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
   * Bloc 12.2 may create a real human approval in D1, but it still cannot
   * publish V24. A later block must explicitly remove this literal lock.
   */
  effectiveProduction: "LEGACY";

  previewEnabled: boolean;
  readiness: ReadinessStatus;
  v24Approved: boolean;
  reason: string;
  productionActivationLocked: true;
}

const VERSION = "12.2.0";

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

  let reason = "production_activation_locked_bloc_12_2";

  if (args.readiness !== "READY_CANDIDATE") {
    reason = "readiness_not_ready";
  } else if (!approved) {
    reason = "v24_not_approved";
  } else if (!args.hasValidV24Decision) {
    reason = "no_valid_v24_decision";
  } else {
    reason = "v24_authorized_waiting_activation_bloc_12_3";
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
