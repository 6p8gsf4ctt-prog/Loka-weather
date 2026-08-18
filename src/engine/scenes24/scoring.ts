import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { DayProfileV2, Scene24Candidate, Scene24Confidence, Scene24Id } from "../../types";
import { clamp } from "../math";
import { scene24ById } from "./registry";

function closeness(value: number, target: number, tolerance: number): number {
  return clamp(100 - Math.abs(value - target) / Math.max(1, tolerance) * 50, 0, 100);
}
function confidence(score: number): Scene24Confidence {
  return score >= 82 ? "HIGH" : score >= 66 ? "MEDIUM" : "LOW";
}
function candidate(id: Scene24Id, score: number, reasons: string[], penalties: string[] = []): Scene24Candidate {
  const def = scene24ById(id);
  const s = Math.round(clamp(score, 0, 100));
  return { sceneId: id, sceneKey: def.key, score: s, confidence: confidence(s), reasons, penalties };
}

export function scoreScene(id: Scene24Id, p: DayProfileV2): Scene24Candidate {
  const e = p.evolution;
  const cloudy = p.light.cloudyFraction + p.light.denseFraction;
  const high = p.cloud.highMeanPct ?? 0;
  const reasons: string[] = [];
  let s = 50;
  switch (id) {
    case 1:
      s = 35 + 45 * p.light.clearFraction + 20 * p.light.brightFraction - 20 * Math.min(1, p.structure.meaningfulTransitions / 4) - 20 * Math.min(1, p.light.cloudBlockMaxHours / 3);
      reasons.push("clear_stable_day"); break;
    case 16:
      s = 35 + 45 * p.light.brightFraction + 15 * Math.min(1, p.light.cloudBlockMaxHours / 3) - 20 * p.light.denseFraction - 10 * p.light.clearFraction;
      reasons.push("sun_with_cloud_passages"); break;
    case 2:
      s = 45 + 0.35 * high + 20 * p.light.brightFraction - 0.2 * Math.max(0, p.cloud.meanCoverPct - 50);
      reasons.push("light_high_veil"); break;
    case 7:
      s = 35 + 0.45 * high + closeness(p.cloud.meanCoverPct, 62, 35) * 0.25;
      reasons.push("dense_high_veil"); break;
    case 3:
      s = 40 + 60 * cloudy + 40 * Math.min(0.35, p.light.brightFraction) + 8 * Math.min(1, p.structure.meaningfulTransitions / 4) - 40 * Math.max(0, p.light.brightFraction - 0.35);
      reasons.push("cloudy_with_openings"); break;
    case 4:
      s = 40 + 55 * p.light.brightFraction + 20 * Math.min(1, p.structure.meaningfulTransitions / 5) + 5 * p.light.mixedFraction - 10 * cloudy;
      reasons.push("frequent_bright_variability"); break;
    case 18:
      s = 35 + closeness(p.light.brightFraction, 0.45, 0.45) * 0.25 + 10 * Math.min(1, p.structure.meaningfulTransitions / 5) + 20 * Math.min(1, e.reversals / 3) + 15 * cloudy - 15 * Math.min(1, p.light.brightBlockMaxHours / 3);
      reasons.push("balanced_variability"); break;
    case 21:
      s = 43 + 30 * p.light.brightFraction + 35 * Math.min(1, p.light.brightBlockMaxHours / 4) + 10 * p.light.mixedFraction;
      reasons.push("long_bright_blocks"); break;
    case 5:
      s = 25 + clamp(e.cloudTrend, 0, 70) + 15 * e.earlyBrightFraction + 15 * (1 - e.lateBrightFraction) - 10 * Math.min(1, e.reversals / 2);
      reasons.push("degrading_trajectory"); break;
    case 11:
      s = 22 + clamp(-e.cloudTrend, 0, 48) + 12 * (1 - e.earlyBrightFraction) + 10 * Math.min(0.7, e.lateBrightFraction) - 10 * Math.min(1, e.reversals / 2);
      reasons.push("general_improvement"); break;
    case 15: {
      const t = SCENE_THRESHOLDS.trend;
      s = 25 + clamp(-e.cloudTrend, 0, 70)
        + (e.earlyCloudPct >= t.luminousEarlyCloudMin ? 12 : -12)
        + (e.lateCloudPct <= t.luminousLateCloudMax ? 12 : -12)
        + (e.lateBrightFraction >= t.luminousLateBrightMin ? 10 : -10)
        + (p.light.lastHoursBrightFraction >= t.luminousLastHoursBrightMin ? 10 : -10)
        - 12 * Math.min(1, e.reversals / 2);
      reasons.push("cloudy_start_bright_finish"); break;
    }
    case 6:
      s = 35 + 40 * p.light.brightFraction + 25 * Math.min(1, p.wind.notableHours / 5);
      reasons.push("bright_windy"); break;
    case 14:
      s = 35 + closeness(p.light.brightFraction, 0.5, 0.5) * 0.35 + 25 * Math.min(1, p.wind.notableHours / 5) + 10 * p.light.mixedFraction;
      reasons.push("openings_windy"); break;
    case 20:
      s = 35 + 35 * cloudy + 30 * Math.min(1, p.wind.notableHours / 5);
      reasons.push("cloudy_windy"); break;
    case 8:
      s = 35 + 25 * Math.min(1, p.visibility.fogHours / 3) + 25 * p.visibility.fogSupportPeak - 20 * Math.min(1, p.visibility.denseFogHours / 4);
      reasons.push("limited_fog"); break;
    case 17:
      s = 25 + 35 * Math.min(1, p.visibility.denseFogHours / 4) + 30 * p.visibility.fogSupportMean + 10 * Math.min(1, p.visibility.denseFogBlockMaxHours / 4);
      reasons.push("dense_persistent_fog"); break;
    case 9:
      s = 35 + 40 * cloudy + 20 * Math.min(1, p.light.cloudBlockMaxHours / 5) - 20 * p.light.denseFraction;
      reasons.push("stable_overcast"); break;
    case 23:
      s = 25 + 55 * p.light.denseFraction + 20 * Math.min(1, p.cloud.denseBlockMaxHours / 5) + 10 * (p.cloud.meanCoverPct / 100);
      reasons.push("uniform_dense_overcast"); break;
    case 10:
      s = 45 + 30 * Math.min(1, p.wind.strongHours / 5) + 25 * Math.min(1, p.wind.maxGustKmh / 90);
      reasons.push("strong_wind"); break;
    case 12:
      s = 30 + 30 * Math.min(1, p.rain.rainHours / 7) + 25 * p.rain.continuityRatio + 15 * Math.min(1, p.rain.rainBlockMaxHours / 5);
      reasons.push("sustained_rain"); break;
    case 13:
      s = 35 + 30 * Math.min(1, p.rain.showerHours / 5) + 20 * Math.min(1, p.rain.showerBlockCount / 3) + 15 * Math.min(1, p.rain.dryGapMaxHours / 3) - 15 * p.rain.continuityRatio;
      reasons.push("intermittent_showers"); break;
    case 19:
      s = 35 + 20 * Math.min(1, p.structure.distinctStateCount / 5) + 20 * Math.min(1, e.reversals / 4) + 20 * Math.min(1, p.structure.meaningfulTransitions / 7) + 5 * Math.min(1, p.rain.rainHours / 3);
      reasons.push("disordered_multi_state_day"); break;
    case 22:
      s = 55 + 20 * Math.min(1, p.convection.thunderHours / 3) + 25 * p.convection.peakThunderSupport;
      reasons.push("robust_thunder"); break;
    case 24:
      s = 45 + 25 * Math.min(1, p.wind.rainOverlapHours / 4) + 15 * Math.min(1, p.rain.rainHours / 5) + 15 * Math.min(1, p.wind.notableHours / 5);
      reasons.push("rain_wind_overlap"); break;
  }
  return candidate(id, s, reasons);
}
