import type { DayProfileV2 } from "../../types";
import { round } from "../math";
import { instabilityEvidence, isStructuringInstability } from "./instabilityDoctrine";
import { isStructuringShowers, isSustainedRain } from "./rainDoctrine";

export function profileSummary(p: DayProfileV2): Record<string, number | string | boolean | null> {
  const instability = instabilityEvidence(p);
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
    rainBlockMaxHours: p.rain.rainBlockMaxHours,
    rainTotalMm: round(p.rain.rainTotalMm, 2),
    rainContinuityPct: round(p.rain.continuityRatio * 100, 1),
    rainBreakCount: p.rain.rainBreakCount,
    showerHours: p.rain.showerHours,
    showerBlockCount: p.rain.showerBlockCount,
    convectiveRainPct: round(p.rain.convectiveRainFraction * 100, 1),
    sustainedRainEligible: isSustainedRain(p),
    structuringShowersEligible: isStructuringShowers(p),
    rainRole: p.rain.rainHours === 0 ? "NONE" : isSustainedRain(p) ? "SUSTAINED" : isStructuringShowers(p) ? "SHOWERS" : "SECONDARY",
    rainWindOverlap: p.wind.rainOverlapHours,
    notableWindHours: p.wind.notableHours,
    strongWindHours: p.wind.strongHours,
    fogHours: p.visibility.fogHours,
    denseFogHours: p.visibility.denseFogHours,
    thunderHours: p.convection.thunderHours,
    transitions: p.structure.meaningfulTransitions,
    distinctStates: p.structure.distinctStateCount,
    instabilityEligible: isStructuringInstability(p),
    instabilityEvidenceCount: instability.independentEvidenceCount,
    instabilitySkyContrast: instability.skyRegimeContrast,
    instabilityRepeatedShowers: instability.repeatedShowers,
    instabilityFogPhase: instability.fogPhase,
    instabilityWindPhase: instability.windPhase,
    modelCountMin: p.structure.modelCountMin,
    uncertainWeather: p.structure.uncertainWeather
  };
}
