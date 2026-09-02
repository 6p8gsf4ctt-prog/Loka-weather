import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { DayProfileV2, Scene24Family, Scene24Id } from "../../types";
import { isStructuringInstability } from "./instabilityDoctrine";
import { isStructuringShowers, isSustainedRain } from "./rainDoctrine";

export interface FamilyDecision { family: Scene24Family; candidateSceneIds: Scene24Id[]; reason: string }

export function determineFamily(p: DayProfileV2): FamilyDecision {
  if (p.convection.thunderHours >= 1 && p.convection.peakThunderSupport >= SCENE_THRESHOLDS.thunder.supportMin) {
    return { family: "THUNDER", candidateSceneIds: [22], reason: "robust_thunder_signal" };
  }
  if (p.wind.rainOverlapHours >= 2 && p.rain.rainHours >= 2 && p.wind.notableHours >= 2) {
    return { family: "RAIN_WIND", candidateSceneIds: [24], reason: "rain_wind_overlap" };
  }
  if (p.wind.strongHours >= 3 && p.wind.strongBlockMaxHours >= 2) {
    return { family: "WIND", candidateSceneIds: [10], reason: "strong_wind_dominant" };
  }
  const sustainedRain = isSustainedRain(p);
  const structuringShowers = isStructuringShowers(p);
  if (sustainedRain) {
    return { family: "RAIN", candidateSceneIds: structuringShowers ? [12, 13] : [12], reason: "sustained_rain" };
  }
  if (p.visibility.denseFogHours >= SCENE_THRESHOLDS.fog.denseMinHours || p.visibility.denseFogBlockMaxHours >= 3) {
    return { family: "VISIBILITY", candidateSceneIds: [8, 17], reason: "dense_fog_structuring" };
  }
  const e = p.evolution;
  const brightDominant = p.light.brightFraction >= 0.65 && p.light.clearFraction >= 0.45;
  const strongImprovement = e.cloudTrend <= -SCENE_THRESHOLDS.trend.moderateCloudDelta && e.reversals <= 1;
  const strongDegradation = e.cloudTrend >= SCENE_THRESHOLDS.trend.moderateCloudDelta && e.reversals <= 1;
  if ((strongImprovement || strongDegradation) && !brightDominant) {
    const candidateSceneIds: Scene24Id[] = strongImprovement && e.earlyCloudPct < 65
      ? [5, 11]
      : [5, 11, 15];
    return { family: "TREND", candidateSceneIds, reason: strongImprovement ? "directional_improvement" : "directional_degradation" };
  }
  if (isStructuringInstability(p)) {
    return { family: "INSTABILITY", candidateSceneIds: [19], reason: "structuring_multi_regime_instability" };
  }
  if (structuringShowers) {
    return { family: "RAIN", candidateSceneIds: [13], reason: "structuring_showers" };
  }
  if (p.wind.notableHours >= 3) {
    return { family: "WIND_COMBINATION", candidateSceneIds: [6, 14, 20], reason: "notable_wind_combination" };
  }
  if (p.visibility.fogHours >= 2 || p.visibility.fogBlockMaxHours >= 2) {
    return { family: "VISIBILITY", candidateSceneIds: [8, 17], reason: "fog_significant" };
  }
  const high = p.cloud.highMeanPct ?? 0;
  const lowMid = (p.cloud.lowMeanPct ?? 0) + (p.cloud.midMeanPct ?? 0);
  if (high >= 55 && lowMid <= 55 && p.rain.rainHours === 0) {
    return { family: "VEIL", candidateSceneIds: [2, 7], reason: "high_cloud_veil" };
  }
  if (p.light.denseFraction >= 0.6 || (p.cloud.meanCoverPct >= 78 && p.light.cloudyFraction + p.light.denseFraction >= 0.7)) {
    return { family: "CLOUD", candidateSceneIds: [9, 23], reason: "cloud_dominant" };
  }
  if (brightDominant) {
    return { family: "LIGHT", candidateSceneIds: [1, 16], reason: "bright_dominant" };
  }
  if (p.structure.meaningfulTransitions >= 3 || p.light.mixedFraction >= 0.25 || (p.light.brightFraction >= 0.25 && p.light.brightFraction <= 0.75)) {
    return { family: "MIXED_SKY", candidateSceneIds: [3, 4, 18, 21], reason: "shared_or_variable_sky" };
  }
  return p.cloud.meanCoverPct >= 65
    ? { family: "CLOUD", candidateSceneIds: [9, 23], reason: "conservative_cloud" }
    : { family: "LIGHT", candidateSceneIds: [1, 16], reason: "conservative_bright" };
}
