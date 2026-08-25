import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { DayProfileV2 } from "../../types";

export function isSustainedRain(p: DayProfileV2): boolean {
  const r = p.rain;
  return r.rainHours >= SCENE_THRESHOLDS.rain.sustainedMinHours
    && r.rainBlockMaxHours >= SCENE_THRESHOLDS.rain.sustainedBlockMinHours
    && r.continuityRatio >= SCENE_THRESHOLDS.rain.sustainedContinuityMin;
}

export function isStructuringShowers(p: DayProfileV2): boolean {
  const r = p.rain;
  return r.showerHours >= SCENE_THRESHOLDS.rain.showersMinHours
    && r.rainBreakCount >= SCENE_THRESHOLDS.rain.showersMinBreaks
    && r.convectiveRainFraction >= SCENE_THRESHOLDS.rain.showersConvectiveFractionMin;
}
