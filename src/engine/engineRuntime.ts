import type { LokaForecast } from "../types";
import type { SceneEngineResolution } from "./engineMode";
import { buildV24PublicPayloadPreview } from "./publicPreview";

export interface PipelineEngineInputs {
  controlAvailable: boolean;
  controlError: string | null;
  readinessError: string | null;
  readinessExcludesCurrentGeneration: true;
}

export function applyEngineResolutionToForecast(args: {
  forecast: LokaForecast;
  resolution: SceneEngineResolution;
  inputs: PipelineEngineInputs;
}): LokaForecast {
  const { forecast, resolution, inputs } = args;

  const legacy = {
    scene: forecast.scene,
    subtitle: forecast.subtitle,
    summaryLines: forecast.summaryLines ? [...forecast.summaryLines] : undefined,
    mainVerdict: forecast.mainVerdict,
    rainVerdict: forecast.rainVerdict,
    notableEvent: forecast.notableEvent
  };

  let candidate: ReturnType<typeof buildV24PublicPayloadPreview> | null = null;
  let candidateError: string | null = null;

  if (resolution.previewEnabled) {
    try {
      candidate = buildV24PublicPayloadPreview(forecast);
    } catch (error) {
      candidateError = error instanceof Error ? error.message : String(error);
    }
  }

  const runtimeForcedLegacy = String(resolution.effectiveProduction) !== "LEGACY";

  // Absolute Bloc 12.1 invariant: restore the complete Legacy public product.
  forecast.scene = legacy.scene;
  forecast.subtitle = legacy.subtitle;
  forecast.summaryLines = legacy.summaryLines;
  forecast.mainVerdict = legacy.mainVerdict;
  forecast.rainVerdict = legacy.rainVerdict;
  forecast.notableEvent = legacy.notableEvent;

  forecast.diagnostics.sceneEngine = {
    version: "12.1.0",
    connectedInPipeline: true,
    evaluatedAt: new Date().toISOString(),
    requested: resolution.requested,
    resolverEffective: resolution.effectiveProduction,
    effectiveProduction: "LEGACY",
    productionActivationLocked: true,
    previewEnabled: resolution.previewEnabled,
    readiness: resolution.readiness,
    v24Approved: resolution.v24Approved,
    reason: runtimeForcedLegacy ? "runtime_guard_forced_legacy" : resolution.reason,
    runtimeForcedLegacy,
    controlAvailable: inputs.controlAvailable,
    controlError: inputs.controlError,
    readinessError: inputs.readinessError,
    readinessExcludesCurrentGeneration: inputs.readinessExcludesCurrentGeneration,
    v24CandidateAvailable: candidate !== null,
    v24CandidateError: candidateError
  };

  forecast.diagnostics.v24PublicCandidate = candidate ? {
    version: candidate.version,
    mode: candidate.mode,
    publishable: candidate.publishable,
    scene: candidate.scene,
    editorial: candidate.editorial,
    temperatures: candidate.temperatures,
    legacyCompatibility: candidate.legacyCompatibility
  } : null;

  forecast.diagnostics.sceneClassifierProduction = "legacy6";
  return forecast;
}
