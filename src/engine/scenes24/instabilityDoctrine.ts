import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { DayProfileV2 } from "../../types";

export interface InstabilityEvidence {
  skyRegimeContrast: boolean;
  repeatedShowers: boolean;
  fogPhase: boolean;
  windPhase: boolean;
  independentEvidenceCount: number;
}

export function instabilityEvidence(p: DayProfileV2): InstabilityEvidence {
  const t = SCENE_THRESHOLDS.instability;
  const cloudyFraction = p.light.cloudyFraction + p.light.denseFraction;
  const skyRange = p.cloud.maxCoverPct - p.cloud.minCoverPct;

  const skyRegimeContrast = skyRange >= t.skyContrastRangeMinPct
    && p.light.brightFraction >= t.skyContrastBrightFractionMin
    && cloudyFraction >= t.skyContrastCloudyFractionMin;

  const repeatedShowers = p.rain.showerBlockCount >= t.showerBlocksMin
    && p.rain.rainBreakCount >= 1;

  const fogPhase = p.visibility.fogHours >= t.fogHoursMin;
  const windPhase = p.wind.notableHours >= t.notableWindHoursMin;

  const independentEvidenceCount = [
    skyRegimeContrast,
    repeatedShowers,
    fogPhase,
    windPhase
  ].filter(Boolean).length;

  return {
    skyRegimeContrast,
    repeatedShowers,
    fogPhase,
    windPhase,
    independentEvidenceCount
  };
}

export function isStructuringInstability(p: DayProfileV2): boolean {
  const t = SCENE_THRESHOLDS.instability;
  const evidence = instabilityEvidence(p);

  return p.structure.meaningfulTransitions >= t.minTransitions
    && p.structure.distinctStateCount >= t.minDistinctStates
    && p.evolution.reversals >= t.minReversals
    && evidence.independentEvidenceCount >= t.minIndependentEvidence;
}
