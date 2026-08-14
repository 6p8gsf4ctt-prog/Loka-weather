export type PublicationFailureStage =
  | "PERSISTENT_BACKUP"
  | "OFFICIAL_WRITE"
  | "READBACK_VERIFY"
  | "GENERATION_AUDIT"
  | "LEGACY_RECOVERY_WRITE";

export type PublicationFailureAction =
  | "FORCE_LEGACY_CURRENT"
  | "RECOVER_LEGACY"
  | "RETAIN_PREVIOUS_FORECAST";

export type RequestFallbackAction =
  | "SERVE_PERSISTENT_LEGACY"
  | "SERVE_INLINE_LEGACY"
  | "SAFE_503";

export function publicationFailureAction(args: {
  stage: PublicationFailureStage;
  targetEngine: "LEGACY" | "V24";
  legacyFallbackAvailable: boolean;
}): PublicationFailureAction {
  if (args.stage === "PERSISTENT_BACKUP") {
    return args.targetEngine === "V24"
      ? "FORCE_LEGACY_CURRENT"
      : "RETAIN_PREVIOUS_FORECAST";
  }

  if (args.stage === "LEGACY_RECOVERY_WRITE") {
    return "RETAIN_PREVIOUS_FORECAST";
  }

  if (args.targetEngine === "V24" && args.legacyFallbackAvailable) {
    return "RECOVER_LEGACY";
  }

  return "RETAIN_PREVIOUS_FORECAST";
}

export function requestFallbackAction(args: {
  persistentLegacyAvailable: boolean;
  inlineLegacyAvailable: boolean;
}): RequestFallbackAction {
  if (args.persistentLegacyAvailable) {
    return "SERVE_PERSISTENT_LEGACY";
  }

  if (args.inlineLegacyAvailable) {
    return "SERVE_INLINE_LEGACY";
  }

  return "SAFE_503";
}
