import type { DayProfileV2 } from "../../types";
import { round } from "../math";

export function profileSummary(p: DayProfileV2): Record<string, number | string | boolean | null> {
  return {
    daylightStart: p.period.startHour,
    daylightEnd: p.period.endHour,
    earlyCloud: round(p.evolution.earlyCloudPct, 1),
    lateCloud: round(p.evolution.lateCloudPct, 1),
    earlyBright: round(p.evolution.earlyBrightFraction * 100, 1),
    lateBright: round(p.evolution.lateBrightFraction * 100, 1),
    lastHoursBright: round(p.light.lastHoursBrightFraction * 100, 1),
    cloudTrend: round(p.evolution.cloudTrend, 1),
    reversals: p.evolution.reversals,
    rainHours: p.rain.rainHours,
    rainWindOverlap: p.wind.rainOverlapHours,
    notableWindHours: p.wind.notableHours,
    strongWindHours: p.wind.strongHours,
    fogHours: p.visibility.fogHours,
    denseFogHours: p.visibility.denseFogHours,
    thunderHours: p.convection.thunderHours,
    transitions: p.structure.meaningfulTransitions,
    distinctStates: p.structure.distinctStateCount,
    modelCountMin: p.structure.modelCountMin,
    uncertainWeather: p.structure.uncertainWeather
  };
}
