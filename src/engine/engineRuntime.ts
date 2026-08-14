import type { LokaForecast } from "../types";
import type { SceneEngineResolution } from "./engineMode";
import { buildV24PublicPayloadPreview } from "./publicPreview";
import type { V24ActivationGuardResult } from "./activationGuard";
import {
  captureLegacyPublicFallback,
  promoteV24PreviewToOfficial
} from "./publicProduct";

type Obj = Record<string, unknown>;

export interface PipelineEngineInputs {
  controlAvailable: boolean;
  controlError: string | null;
  readinessError: string | null;
  readinessExcludesCurrentGeneration: true;
  activationGuard: V24ActivationGuardResult;
}

function buildPublicDecisionLog(args: {
  forecast: LokaForecast;
  candidate: ReturnType<typeof buildV24PublicPayloadPreview>;
}): Record<string, unknown> {
  const scene24 =
    args.forecast.diagnostics.scene24 &&
    typeof args.forecast.diagnostics.scene24 === "object"
      ? args.forecast.diagnostics.scene24 as Obj
      : {};

  return {
    version: "24.0-public-12.8",
    engine: "V24",
    selectedSceneId: args.candidate.scene.id,
    selectedScene: args.candidate.scene.key,
    selectedLabel: args.candidate.scene.label,
    selectedScore: args.candidate.scene.score,
    confidence: args.candidate.scene.confidence,
    runnerUp: scene24.runnerUp ?? null,
    candidates: Array.isArray(scene24.candidates)
      ? scene24.candidates
      : [],
    reasons: Array.isArray(scene24.reasons)
      ? scene24.reasons
      : [],
    fallbackUsed: scene24.fallbackUsed === true,
    hysteresisApplied: scene24.hysteresisApplied === true
  };
}

export function applyEngineResolutionToForecast(args: {
  forecast: LokaForecast;
  resolution: SceneEngineResolution;
  inputs: PipelineEngineInputs;
}): LokaForecast {
  const { forecast, resolution, inputs } = args;

  const legacy = captureLegacyPublicFallback(forecast);

  let candidate: ReturnType<typeof buildV24PublicPayloadPreview> | null = null;
  let candidateError: string | null = null;

  if (resolution.previewEnabled || resolution.effectiveProduction === "V24") {
    try {
      candidate = buildV24PublicPayloadPreview(forecast);
    } catch (error) {
      candidateError =
        error instanceof Error ? error.message : String(error);
    }
  }

  const cutoverRequested =
    resolution.effectiveProduction === "V24";

  const cutoverAllowed =
    cutoverRequested &&
    inputs.activationGuard.status === "PASS" &&
    inputs.activationGuard.activationReadyForCutover === true &&
    candidate !== null;

  let actualEngine: "LEGACY" | "V24" = "LEGACY";
  let generationReason = resolution.reason;

  if (cutoverAllowed && candidate) {
    try {
      const official = promoteV24PreviewToOfficial(
        candidate,
        inputs.activationGuard
      );

      const publicDecisionLog = buildPublicDecisionLog({
        forecast,
        candidate
      });

      // Preserve a complete request-time fallback before mutating anything.
      forecast.diagnostics.legacyPublicFallback = legacy;

      // Public fields now become V24 for this generation.
      (forecast as unknown as Obj).scene = candidate.scene.key;
      forecast.subtitle = candidate.editorial.subtitle ?? undefined;
      forecast.summaryLines = [...candidate.editorial.summaryLines];
      forecast.mainVerdict = candidate.editorial.mainVerdict;
      forecast.rainVerdict = candidate.editorial.rainVerdict;
      forecast.notableEvent = candidate.editorial.notableEvent;
      (forecast as unknown as Obj).decisionLog = publicDecisionLog;

      // These diagnostic fields are what storage/db.ts uses to reconstruct
      // scene/subtitle/summaryLines/decisionLog after reading from D1.
      forecast.diagnostics.scene = candidate.scene.key;
      forecast.diagnostics.subtitle =
        candidate.editorial.subtitle ?? null;
      forecast.diagnostics.summaryLines =
        [...candidate.editorial.summaryLines];
      forecast.diagnostics.decisionLog = publicDecisionLog;

      forecast.diagnostics.v24OfficialProduct = official;
      forecast.diagnostics.sceneClassifierProduction = "v24";

      actualEngine = "V24";
      generationReason = "v24_public_cutover_generation_pass";
    } catch (error) {
      candidateError =
        error instanceof Error ? error.message : String(error);
      actualEngine = "LEGACY";
      generationReason = "v24_promotion_exception_forced_legacy";
    }
  }

  if (actualEngine === "LEGACY") {
    // Restore the complete Legacy public product for every non-PASS generation.
    (forecast as unknown as Obj).scene = legacy.scene;
    forecast.subtitle = legacy.subtitle;
    forecast.summaryLines = legacy.summaryLines
      ? [...legacy.summaryLines]
      : undefined;
    forecast.mainVerdict = legacy.mainVerdict;
    forecast.rainVerdict = legacy.rainVerdict;
    forecast.notableEvent = legacy.notableEvent;
    forecast.confidenceMain = legacy.confidenceMain;
    forecast.confidenceRain = legacy.confidenceRain;
    (forecast as unknown as Obj).decisionLog =
      legacy.decisionLog ?? undefined;

    forecast.diagnostics.scene =
      legacy.diagnosticsPublic.scene ?? legacy.scene;
    forecast.diagnostics.subtitle =
      legacy.diagnosticsPublic.subtitle ?? legacy.subtitle ?? null;
    forecast.diagnostics.summaryLines =
      legacy.diagnosticsPublic.summaryLines ??
      legacy.summaryLines ??
      null;
    forecast.diagnostics.decisionLog =
      legacy.diagnosticsPublic.decisionLog ??
      legacy.decisionLog ??
      null;

    delete forecast.diagnostics.v24OfficialProduct;
    forecast.diagnostics.sceneClassifierProduction = "legacy6";
  }

  const generationFallbackRequired =
    cutoverRequested && actualEngine === "LEGACY";

  forecast.diagnostics.sceneEngine = {
    version: "12.8.0",
    connectedInPipeline: true,
    evaluatedAt: new Date().toISOString(),

    requested: resolution.requested,
    resolverEffective: resolution.effectiveProduction,
    effectiveProduction: actualEngine,

    productionActivationLocked:
      resolution.productionActivationLocked,
    publicCutoverEnabled: true,

    previewEnabled: resolution.previewEnabled,
    readiness: resolution.readiness,
    v24Approved: resolution.v24Approved,

    reason: generationFallbackRequired
      ? inputs.activationGuard.status === "BLOCKED"
        ? inputs.activationGuard.reason
        : generationReason
      : generationReason,

    controlAvailable: inputs.controlAvailable,
    controlError: inputs.controlError,
    readinessError: inputs.readinessError,
    readinessExcludesCurrentGeneration:
      inputs.readinessExcludesCurrentGeneration,

    v24CandidateAvailable: candidate !== null,
    v24CandidateError: candidateError,

    activationGuardStatus: inputs.activationGuard.status,
    activationGuardReason: inputs.activationGuard.reason,
    activationReadyForCutover:
      inputs.activationGuard.activationReadyForCutover,

    generationFallbackRequired,
    generationFallbackEngine:
      generationFallbackRequired ? "LEGACY" : null,

    publicSurfaceEngine: actualEngine
  };

  forecast.diagnostics.v24ActivationGuard =
    inputs.activationGuard;

  forecast.diagnostics.v24PublicCandidate = candidate ? {
    version: candidate.version,
    mode: candidate.mode,
    publishable: candidate.publishable,
    scene: candidate.scene,
    editorial: candidate.editorial,
    temperatures: candidate.temperatures,
    legacyCompatibility: candidate.legacyCompatibility
  } : null;

  return forecast;
}
