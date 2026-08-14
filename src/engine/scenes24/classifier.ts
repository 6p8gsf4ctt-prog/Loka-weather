import { SCENE24_CONFIG } from "../../config/scenes24";
import type {
  DayProfile,
  Scene24Candidate,
  Scene24Confidence,
  Scene24Id,
  Scene24Key,
  SceneDecisionV24
} from "../../types";
import {
  averageFit,
  finalConfidence,
  inverseFit,
  normalizedFit,
  profileModelConfidence,
  rangeFit,
  sceneSpecificityBonus,
  scoreCandidate
} from "./scoring";
import { getScene24ById } from "./registry";

export interface ChooseScene24Options {
  /**
   * Previous V24 scene, if available. Shadow mode can leave this undefined.
   * Later, this is what will drive inter-generation hysteresis.
   */
  previousSceneId?: Scene24Id;
  previousSceneScore?: number;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function p100(value: number): number {
  return clamp(value * 100);
}

function clearBright(profile: DayProfile): number {
  return profile.light.clearFraction + profile.light.brightFraction;
}

function cloudyDense(profile: DayProfile): number {
  return profile.light.cloudyFraction + profile.light.denseFraction;
}

function cloudyMixed(profile: DayProfile): number {
  return profile.light.cloudyFraction + profile.light.mixedFraction + profile.light.denseFraction;
}

function highLayerComplete(profile: DayProfile): boolean {
  return (
    profile.cloud.lowMeanPct !== null &&
    profile.cloud.midMeanPct !== null &&
    profile.cloud.highMeanPct !== null
  );
}

function reason(flag: boolean, value: string, into: string[]): void {
  if (flag) into.push(value);
}

function penalty(flag: boolean, value: string, into: string[]): void {
  if (flag) into.push(value);
}

function candidate(
  sceneId: Scene24Id,
  profile: DayProfile,
  eligible: boolean,
  reasons: string[],
  penalties: string[],
  phenomenonFit: number,
  durationFit: number,
  structureFit: number,
  uncertaintyPenalty = 0
): Scene24Candidate {
  const scene = getScene24ById(sceneId);
  return scoreCandidate({
    sceneId,
    eligible,
    reasons,
    penalties,
    parts: {
      phenomenonFit,
      durationFit,
      structureFit,
      modelConfidence: profileModelConfidence(profile, scene.key),
      specificityBonus: sceneSpecificityBonus(sceneId),
      uncertaintyPenalty
    }
  });
}

function score01(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.light.grandSoleil;
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    profile.light.clearFraction >= c.clearFractionMin &&
    cb >= c.clearPlusBrightFractionMin &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    profile.rain.rainHours === 0 &&
    profile.structure.meaningfulTransitions <= c.transitionsMax;

  reason(profile.light.clearFraction >= c.clearFractionMin, "clear_fraction_high", reasons);
  reason(profile.cloud.meanCoverPct <= c.meanCloudMaxPct, "mean_cloud_very_low", reasons);

  return candidate(
    1, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.light.clearFraction, 0.60, c.clearFractionMin),
      inverseFit(profile.cloud.meanCoverPct, c.meanCloudMaxPct, 35)
    ),
    averageFit(p100(cb), inverseFit(profile.rain.rainHours, 0, 2)),
    inverseFit(profile.structure.meaningfulTransitions, c.transitionsMax, 4)
  );
}

function score02(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.veil.soleilVoile;
  const reasons: string[] = [];
  const penalties: string[] = [];
  const complete = highLayerComplete(profile);

  const high = profile.cloud.highMeanPct;
  const low = profile.cloud.lowMeanPct;
  const mid = profile.cloud.midMeanPct;

  const eligible =
    complete &&
    high! >= c.highCloudMeanMinPct &&
    high! <= c.highCloudMeanMaxPct &&
    low! < c.lowCloudMeanMaxPct &&
    mid! < c.midCloudMeanMaxPct &&
    profile.cloud.meanCoverPct >= c.totalMeanCloudMinPct &&
    profile.cloud.meanCoverPct <= c.totalMeanCloudMaxPct &&
    high! - low! >= c.highMinusLowMinPoints &&
    profile.rain.rainHours === 0 &&
    profile.structure.meaningfulTransitions <= c.transitionsMax;

  penalty(!complete, "cloud_layers_missing", penalties);
  reason(eligible, "high_cloud_light_veil", reasons);

  return candidate(
    2, profile, eligible, reasons, penalties,
    complete ? averageFit(
      rangeFit(high!, c.highCloudMeanMinPct, c.highCloudMeanMaxPct, 15),
      inverseFit(low!, c.lowCloudMeanMaxPct, 45),
      normalizedFit(high! - low!, c.highMinusLowMinPoints, 45)
    ) : 0,
    inverseFit(profile.rain.rainHours, 0, 2),
    inverseFit(profile.structure.meaningfulTransitions, c.transitionsMax, 5),
    complete ? 0 : 15
  );
}

function score03(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.light.eclaircies;
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    cb >= c.clearPlusBrightFractionMin &&
    cb <= c.clearPlusBrightFractionMax &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    profile.light.brightBlockMaxHours < c.brightBlockMaxHours &&
    profile.rain.rainHours <= c.rainHoursMax;

  reason(eligible, "fragmented_bright_openings", reasons);

  return candidate(
    3, profile, eligible, reasons, penalties,
    averageFit(
      rangeFit(cb, c.clearPlusBrightFractionMin, c.clearPlusBrightFractionMax, 0.15),
      rangeFit(profile.cloud.meanCoverPct, c.meanCloudMinPct, c.meanCloudMaxPct, 15)
    ),
    inverseFit(profile.rain.rainHours, c.rainHoursMax, 3),
    averageFit(
      normalizedFit(profile.structure.meaningfulTransitions, 1, 3),
      inverseFit(profile.light.brightBlockMaxHours, c.brightBlockMaxHours - 1, 5)
    )
  );
}

function score04(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.light.variableLumineux;
  const cb = clearBright(profile);
  const cm = cloudyMixed(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const dominant = Math.max(
    profile.light.clearFraction,
    profile.light.brightFraction,
    profile.light.mixedFraction,
    profile.light.cloudyFraction,
    profile.light.denseFraction
  );

  const eligible =
    profile.structure.meaningfulTransitions >= c.transitionsMin &&
    cb >= c.clearPlusBrightFractionMin &&
    cm >= c.cloudyPlusMixedFractionMin &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    dominant < c.dominantStateMaxFraction &&
    profile.rain.rainHours <= c.rainHoursMax;

  reason(eligible, "frequent_bright_variability", reasons);

  return candidate(
    4, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(cb, c.clearPlusBrightFractionMin, 0.75),
      rangeFit(profile.cloud.meanCoverPct, c.meanCloudMinPct, c.meanCloudMaxPct, 15)
    ),
    inverseFit(profile.rain.rainHours, c.rainHoursMax, 3),
    normalizedFit(profile.structure.meaningfulTransitions, c.transitionsMin, 6)
  );
}

function score05(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.trend.degradation;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const supportCount = [
    profile.evolution.meanCloudMorning <= c.morningCloudMaxPct,
    profile.evolution.meanCloudEvening >= c.eveningCloudMinPct,
    profile.evolution.brightFractionMorning >= c.morningBrightFractionMin,
    profile.evolution.brightFractionEvening <= c.eveningBrightFractionMax,
    profile.rain.rainHours >= 1
  ].filter(Boolean).length;

  const eligible =
    profile.evolution.cloudTrend >= c.cloudTrendMinPoints &&
    supportCount >= 2 &&
    profile.evolution.reversals <= 1;

  reason(profile.evolution.cloudTrend >= c.cloudTrendMinPoints, "clouds_increase_materially", reasons);
  reason(profile.evolution.reversals <= 1, "directional_trend", reasons);
  penalty(profile.evolution.reversals >= 2, "multiple_trend_reversals", penalties);

  return candidate(
    5, profile, eligible, reasons, penalties,
    normalizedFit(profile.evolution.cloudTrend, c.cloudTrendMinPoints, 55),
    normalizedFit(supportCount, 2, 5),
    inverseFit(profile.evolution.reversals, 1, 3)
  );
}

function score06(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.wind.soleilPlusVent;
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    cb >= c.clearPlusBrightFractionMin &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    profile.wind.notableHours >= c.notableHoursMin &&
    profile.wind.brightOverlapHours >= c.brightOverlapMinHours &&
    profile.wind.strongHours <= c.strongHoursMax &&
    profile.rain.rainHours <= c.rainHoursMax;

  reason(eligible, "bright_and_windy_overlap", reasons);

  return candidate(
    6, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(cb, c.clearPlusBrightFractionMin, 0.90),
      normalizedFit(profile.wind.notableHours, c.notableHoursMin, 7)
    ),
    normalizedFit(profile.wind.brightOverlapHours, c.brightOverlapMinHours, 7),
    inverseFit(profile.wind.strongHours, c.strongHoursMax, 4)
  );
}

function score07(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.veil.soleilVoileDense;
  const reasons: string[] = [];
  const penalties: string[] = [];
  const complete = highLayerComplete(profile);
  const high = profile.cloud.highMeanPct;
  const low = profile.cloud.lowMeanPct;
  const mid = profile.cloud.midMeanPct;
  const fracHigh = profile.cloud.highFractionAbove70;

  const eligible =
    complete &&
    high! >= c.highCloudMeanMinPct &&
    fracHigh !== null &&
    fracHigh >= c.highCloudFractionAbove70Min &&
    low! < c.lowCloudMeanMaxPct &&
    mid! < c.midCloudMeanMaxPct &&
    profile.cloud.meanCoverPct >= c.totalMeanCloudMinPct &&
    high! - low! >= c.highMinusLowMinPoints &&
    profile.rain.rainHours === 0 &&
    profile.structure.meaningfulTransitions <= c.transitionsMax;

  penalty(!complete, "cloud_layers_missing", penalties);
  reason(eligible, "persistent_dense_high_veil", reasons);

  return candidate(
    7, profile, eligible, reasons, penalties,
    complete ? averageFit(
      normalizedFit(high!, c.highCloudMeanMinPct, 90),
      normalizedFit(fracHigh!, c.highCloudFractionAbove70Min, 0.90),
      normalizedFit(high! - low!, c.highMinusLowMinPoints, 55)
    ) : 0,
    inverseFit(profile.rain.rainHours, 0, 2),
    inverseFit(profile.structure.meaningfulTransitions, c.transitionsMax, 5),
    complete ? 0 : 15
  );
}

function score08(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.fog.fog;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    profile.visibility.fogBlockMaxHours >= c.fogBlockMinHours &&
    (
      profile.visibility.fogSupportPeak >= c.supportPeakMin ||
      (
        profile.visibility.fogHours >= c.alternativeFogHoursMin &&
        profile.visibility.fogSupportMean >= c.alternativeSupportMeanMin
      )
    );

  reason(eligible, "fog_signal_structuring", reasons);
  penalty(profile.visibility.visibilityMinKm === null, "physical_visibility_unavailable", penalties);

  return candidate(
    8, profile, eligible, reasons, penalties,
    normalizedFit(profile.visibility.fogSupportPeak, c.supportPeakMin, 0.85),
    normalizedFit(profile.visibility.fogHours, c.fogHoursMin, 6),
    normalizedFit(profile.visibility.fogBlockMaxHours, c.fogBlockMinHours, 5),
    profile.visibility.visibilityMinKm === null ? 5 : 0
  );
}

function score09(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.cloud.couvert;
  const cd = cloudyDense(profile);
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    cd >= c.cloudyOrDenseFractionMin &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    profile.light.denseFraction < c.denseFractionMax &&
    cb <= c.clearPlusBrightFractionMax &&
    profile.light.brightBlockMaxHours < c.brightOpeningBlockMaxHours &&
    profile.structure.meaningfulTransitions <= c.transitionsMax &&
    profile.wind.notableHours < SCENE24_CONFIG.wind.structuringMinHours &&
    profile.visibility.fogHours < SCENE24_CONFIG.fog.fog.fogHoursMin;

  reason(eligible, "stable_cloud_dominance", reasons);

  return candidate(
    9, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(cd, c.cloudyOrDenseFractionMin, 0.95),
      rangeFit(profile.cloud.meanCoverPct, c.meanCloudMinPct, c.meanCloudMaxPct, 10)
    ),
    normalizedFit(profile.light.cloudBlockMaxHours, 4, 10),
    inverseFit(profile.structure.meaningfulTransitions, c.transitionsMax, 5)
  );
}

function score10(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.wind.strongDominant;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const strength =
    profile.wind.strongHours >= c.strongHoursMin ||
    profile.wind.maxGustKmh >= c.maxGustAlternativeKmh ||
    (
      profile.wind.notableHours >= c.longEpisodeHoursMin &&
      profile.wind.maxGustKmh >= c.longEpisodeGustMinKmh
    );

  const eligible =
    profile.wind.notableHours >= c.notableHoursMin &&
    profile.wind.blockMaxHours >= c.blockMinHours &&
    strength &&
    !(profile.rain.rainHours >= 2 && profile.wind.rainOverlapHours >= 2);

  reason(strength, "wind_is_dominant", reasons);
  reason(profile.wind.blockMaxHours >= c.blockMinHours, "wind_block_persistent", reasons);

  return candidate(
    10, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.wind.maxGustKmh, 65, 85),
      normalizedFit(profile.wind.strongHours, 1, 4)
    ),
    normalizedFit(profile.wind.notableHours, c.notableHoursMin, 8),
    normalizedFit(profile.wind.blockMaxHours, c.blockMinHours, 7)
  );
}

function score11(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.trend.improvement;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const supportCount = [
    profile.evolution.meanCloudMorning >= c.morningCloudMinPct,
    profile.evolution.meanCloudEvening <= c.eveningCloudMaxPct,
    profile.evolution.brightFractionMorning <= c.morningBrightFractionMax,
    profile.evolution.brightFractionEvening >= c.eveningBrightFractionMin,
    profile.rain.rainHours >= 1
  ].filter(Boolean).length;

  const luminous = score15(profile).eligible;

  const eligible =
    profile.evolution.cloudTrend <= c.cloudTrendMaxPoints &&
    supportCount >= 2 &&
    profile.evolution.reversals <= 1 &&
    !luminous;

  reason(profile.evolution.cloudTrend <= c.cloudTrendMaxPoints, "clouds_decrease_materially", reasons);
  reason(profile.evolution.reversals <= 1, "directional_improvement", reasons);

  return candidate(
    11, profile, eligible, reasons, penalties,
    normalizedFit(Math.abs(profile.evolution.cloudTrend), 25, 55),
    normalizedFit(supportCount, 2, 5),
    inverseFit(profile.evolution.reversals, 1, 3)
  );
}

function score12(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.rain.sustained;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const magnitude =
    profile.rain.maxRainMmPerHour >= c.maxRainAlternativeMmPerHour ||
    profile.rain.rainTotalMm >= c.totalRainAlternativeMm;

  const eligible =
    profile.rain.rainHours >= c.rainHoursMin &&
    profile.rain.rainBlockMaxHours >= c.rainBlockMinHours &&
    profile.rain.continuityRatio >= c.continuityRatioMin &&
    profile.rain.rainBreakCount <= c.rainBreakCountMax &&
    magnitude &&
    profile.convection.peakThunderSupport < SCENE24_CONFIG.thunder.robustSupport &&
    profile.wind.rainOverlapHours < SCENE24_CONFIG.rain.rainPlusWind.overlapMinHours;

  reason(eligible, "continuous_structuring_rain", reasons);

  return candidate(
    12, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.rain.rainTotalMm, 2, 8),
      normalizedFit(profile.rain.maxRainMmPerHour, 0.4, 3)
    ),
    averageFit(
      normalizedFit(profile.rain.rainHours, c.rainHoursMin, 8),
      normalizedFit(profile.rain.rainBlockMaxHours, c.rainBlockMinHours, 7)
    ),
    normalizedFit(profile.rain.continuityRatio, c.continuityRatioMin, 1)
  );
}

function score13(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.rain.showers;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const showerPattern =
    profile.rain.showerHours >= c.showerHoursMin ||
    profile.rain.showerBlockCount >= c.showerBlockCountMin;

  const breaks =
    profile.rain.rainBreakCount >= c.rainBreakCountMin ||
    profile.rain.dryGapMaxHours >= c.dryGapMinHours;

  const eligible =
    profile.rain.rainHours >= c.rainHoursMin &&
    showerPattern &&
    profile.rain.continuityRatio < c.continuityRatioMax &&
    breaks &&
    profile.convection.peakThunderSupport < SCENE24_CONFIG.thunder.robustSupport &&
    profile.wind.rainOverlapHours < SCENE24_CONFIG.rain.rainPlusWind.overlapMinHours;

  reason(eligible, "repeated_showers_with_dry_breaks", reasons);

  return candidate(
    13, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.rain.showerHours, c.showerHoursMin, 5),
      normalizedFit(profile.rain.showerBlockCount, 2, 4)
    ),
    normalizedFit(profile.rain.rainHours, c.rainHoursMin, 6),
    averageFit(
      inverseFit(profile.rain.continuityRatio, 0.45, c.continuityRatioMax),
      normalizedFit(profile.rain.rainBreakCount, c.rainBreakCountMin, 4)
    )
  );
}

function score14(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.wind.eclairciesPlusVent;
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const overlap = profile.wind.brightOverlapHours + profile.wind.mixedOverlapHours;

  const eligible =
    cb >= c.clearPlusBrightFractionMin &&
    cb <= c.clearPlusBrightFractionMax &&
    cloudyMixed(profile) >= c.cloudyPlusMixedFractionMin &&
    profile.wind.notableHours >= c.notableHoursMin &&
    overlap >= c.overlapMinHours &&
    profile.rain.rainHours <= c.rainHoursMax &&
    !score10(profile).eligible;

  reason(eligible, "mixed_sky_and_wind_overlap", reasons);

  return candidate(
    14, profile, eligible, reasons, penalties,
    averageFit(
      rangeFit(cb, c.clearPlusBrightFractionMin, c.clearPlusBrightFractionMax, 0.15),
      normalizedFit(profile.wind.notableHours, c.notableHoursMin, 7)
    ),
    normalizedFit(overlap, c.overlapMinHours, 7),
    normalizedFit(profile.structure.meaningfulTransitions, 1, 4)
  );
}

function score15(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.trend.luminousImprovement;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    profile.evolution.cloudTrend <= c.cloudTrendMaxPoints &&
    profile.evolution.brightFractionEvening >= c.eveningBrightFractionMin &&
    profile.evolution.meanCloudEvening <= c.eveningCloudMaxPct &&
    profile.evolution.reversals <= 1;

  reason(eligible, "improvement_ends_bright", reasons);

  return candidate(
    15, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(Math.abs(profile.evolution.cloudTrend), 30, 60),
      normalizedFit(profile.evolution.brightFractionEvening, c.eveningBrightFractionMin, 1)
    ),
    inverseFit(profile.evolution.meanCloudEvening, c.eveningCloudMaxPct, 55),
    inverseFit(profile.evolution.reversals, 1, 3)
  );
}

function score16(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.light.soleilPassagesNuageux;
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    cb >= c.clearPlusBrightFractionMin &&
    profile.light.clearFraction >= c.clearFractionMin &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    profile.light.mixedFraction >= c.mixedFractionMin &&
    profile.light.mixedFraction <= c.mixedFractionMax &&
    profile.light.cloudyFraction < c.cloudyFractionMax &&
    profile.rain.rainHours === 0 &&
    profile.structure.meaningfulTransitions <= c.transitionsMax;

  reason(eligible, "sun_dominant_with_cloud_passages", reasons);

  return candidate(
    16, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(cb, c.clearPlusBrightFractionMin, 0.90),
      rangeFit(profile.light.mixedFraction, c.mixedFractionMin, c.mixedFractionMax, 0.15)
    ),
    inverseFit(profile.rain.rainHours, 0, 2),
    inverseFit(profile.structure.meaningfulTransitions, c.transitionsMax, 6)
  );
}

function score17(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.fog.denseFog;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    profile.visibility.fogHours >= c.fogHoursMin &&
    profile.visibility.denseFogHours >= c.denseFogHoursMin &&
    profile.visibility.denseFogBlockMaxHours >= c.denseFogBlockMinHours &&
    profile.visibility.fogSupportPeak >= c.supportPeakMin &&
    profile.visibility.fogSupportMean >= c.supportMeanMin;

  reason(eligible, "dense_fog_persistent", reasons);
  penalty(profile.visibility.visibilityMinKm === null, "physical_visibility_unavailable", penalties);

  return candidate(
    17, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.visibility.fogSupportPeak, c.supportPeakMin, 0.95),
      normalizedFit(profile.visibility.fogSupportMean, c.supportMeanMin, 0.85)
    ),
    normalizedFit(profile.visibility.fogHours, c.fogHoursMin, 8),
    normalizedFit(profile.visibility.denseFogBlockMaxHours, c.denseFogBlockMinHours, 6),
    profile.visibility.visibilityMinKm === null ? 8 : 0
  );
}

function score18(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.light.variable;
  const cb = clearBright(profile);
  const cm = profile.light.cloudyFraction + profile.light.mixedFraction;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const balance = Math.abs(cb - cloudyDense(profile));

  const eligible =
    profile.structure.meaningfulTransitions >= c.transitionsMin &&
    cb >= c.clearPlusBrightFractionMin &&
    cb <= c.clearPlusBrightFractionMax &&
    cm >= c.cloudyPlusMixedFractionMin &&
    cm <= c.cloudyPlusMixedFractionMax &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    balance <= c.brightCloudyBalanceMaxDelta &&
    profile.rain.rainHours <= c.rainHoursMax;

  reason(eligible, "balanced_sky_variability", reasons);

  return candidate(
    18, profile, eligible, reasons, penalties,
    averageFit(
      rangeFit(cb, c.clearPlusBrightFractionMin, c.clearPlusBrightFractionMax, 0.15),
      inverseFit(balance, c.brightCloudyBalanceMaxDelta, 0.40)
    ),
    inverseFit(profile.rain.rainHours, c.rainHoursMax, 3),
    normalizedFit(profile.structure.meaningfulTransitions, c.transitionsMin, 6)
  );
}

function score19(profile: DayProfile, others: Scene24Candidate[]): Scene24Candidate {
  const c = SCENE24_CONFIG.instability;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const dominantSpecialist = others.some((item) =>
    item.eligible &&
    [5, 10, 12, 13, 15, 17, 22, 24].includes(item.sceneId) &&
    item.score >= 65
  );

  const multiState =
    profile.structure.distinctStateCount >= c.distinctStatesMin;

  const eligible =
    profile.structure.meaningfulTransitions >= c.transitionsMin &&
    (profile.structure.uncertainWeather || multiState || profile.evolution.reversals >= 2) &&
    !dominantSpecialist;

  reason(profile.structure.meaningfulTransitions >= c.transitionsMin, "many_transitions", reasons);
  reason(profile.structure.uncertainWeather, "weather_uncertainty", reasons);
  reason(multiState, "multiple_weather_states", reasons);
  penalty(dominantSpecialist, "specialist_scene_dominates", penalties);

  return candidate(
    19, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.structure.distinctStateCount, c.distinctStatesMin, 5),
      profile.structure.uncertainWeather ? 100 : 55
    ),
    normalizedFit(profile.structure.meaningfulTransitions, c.transitionsMin, 7),
    averageFit(
      normalizedFit(profile.evolution.reversals, 1, 3),
      normalizedFit(profile.structure.distinctStateCount, c.distinctStatesMin, 5)
    )
  );
}

function score20(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.wind.nuageuxPlusVent;
  const cb = clearBright(profile);
  const cd = cloudyDense(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    cd >= c.cloudyPlusDenseFractionMin &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    cb < c.clearPlusBrightFractionMax &&
    profile.wind.notableHours >= c.notableHoursMin &&
    profile.wind.cloudOverlapHours >= c.cloudOverlapMinHours &&
    profile.rain.rainHours <= c.rainHoursMax &&
    !score10(profile).eligible;

  reason(eligible, "cloud_dominant_with_wind", reasons);

  return candidate(
    20, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(cd, c.cloudyPlusDenseFractionMin, 0.90),
      normalizedFit(profile.wind.notableHours, c.notableHoursMin, 7)
    ),
    normalizedFit(profile.wind.cloudOverlapHours, c.cloudOverlapMinHours, 7),
    inverseFit(cb, c.clearPlusBrightFractionMax, 0.50)
  );
}

function score21(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.light.grandesEclaircies;
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    cb >= c.clearPlusBrightFractionMin &&
    cb <= c.clearPlusBrightFractionMax &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    profile.cloud.meanCoverPct <= c.meanCloudMaxPct &&
    profile.light.brightBlockMaxHours >= c.brightBlockMinHours &&
    profile.rain.rainHours <= c.rainHoursMax;

  reason(eligible, "large_contiguous_bright_openings", reasons);

  return candidate(
    21, profile, eligible, reasons, penalties,
    averageFit(
      rangeFit(cb, c.clearPlusBrightFractionMin, c.clearPlusBrightFractionMax, 0.15),
      normalizedFit(profile.light.brightBlockMaxHours, c.brightBlockMinHours, 6)
    ),
    inverseFit(profile.rain.rainHours, c.rainHoursMax, 3),
    inverseFit(profile.structure.meaningfulTransitions, 2, 5)
  );
}

function score22(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.thunder;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const robust =
    (
      profile.convection.thunderHours >= c.primaryHoursMin &&
      profile.convection.peakThunderSupport >= c.strongSupport
    ) ||
    (
      profile.convection.thunderHours >= c.alternativeHoursMin &&
      profile.convection.peakThunderSupport >= c.robustSupport
    );

  const rainSignal =
    profile.rain.showerHours >= 1 ||
    profile.rain.rainHours >= 1 ||
    profile.rain.maxRainMmPerHour >= c.rainSignalMinMmPerHour;

  const eligible = robust && rainSignal;

  reason(robust, "robust_thunder_support", reasons);
  reason(rainSignal, "convective_rain_signal", reasons);

  return candidate(
    22, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.convection.peakThunderSupport, c.robustSupport, 0.85),
      normalizedFit(profile.convection.thunderHours, 1, 4)
    ),
    normalizedFit(profile.convection.thunderHours, 1, 4),
    normalizedFit(profile.rain.convectiveRainFraction, 0.25, 0.80)
  );
}

function score23(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.cloud.couvertDense;
  const cd = cloudyDense(profile);
  const cb = clearBright(profile);
  const reasons: string[] = [];
  const penalties: string[] = [];

  const eligible =
    profile.light.denseFraction >= c.denseFractionMin &&
    cd >= c.cloudyOrDenseFractionMin &&
    profile.cloud.meanCoverPct >= c.meanCloudMinPct &&
    profile.cloud.medianCoverPct >= c.medianCloudMinPct &&
    cb <= c.clearPlusBrightFractionMax &&
    profile.cloud.denseBlockMaxHours >= c.denseBlockMinHours &&
    profile.cloud.stdDevPct <= c.cloudStdDevMaxPct &&
    profile.visibility.fogHours < SCENE24_CONFIG.fog.fog.fogHoursMin;

  reason(eligible, "uniform_dense_cloud_cover", reasons);

  return candidate(
    23, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.light.denseFraction, c.denseFractionMin, 0.95),
      normalizedFit(profile.cloud.meanCoverPct, c.meanCloudMinPct, 100)
    ),
    normalizedFit(profile.cloud.denseBlockMaxHours, c.denseBlockMinHours, 12),
    inverseFit(profile.cloud.stdDevPct, c.cloudStdDevMaxPct, 25)
  );
}

function score24(profile: DayProfile): Scene24Candidate {
  const c = SCENE24_CONFIG.rain.rainPlusWind;
  const reasons: string[] = [];
  const penalties: string[] = [];

  const rainMagnitude =
    profile.rain.rainTotalMm >= c.totalRainAlternativeMm ||
    profile.rain.maxRainMmPerHour >= c.maxRainAlternativeMmPerHour ||
    profile.rain.rainBlockMaxHours >= c.rainBlockAlternativeHours;

  const eligible =
    profile.rain.rainHours >= c.rainHoursMin &&
    profile.wind.notableHours >= c.notableWindHoursMin &&
    profile.wind.rainOverlapHours >= c.overlapMinHours &&
    rainMagnitude &&
    profile.convection.peakThunderSupport < SCENE24_CONFIG.thunder.dominantSupport;

  reason(profile.wind.rainOverlapHours >= c.overlapMinHours, "rain_wind_overlap", reasons);
  reason(rainMagnitude, "rain_is_significant", reasons);

  return candidate(
    24, profile, eligible, reasons, penalties,
    averageFit(
      normalizedFit(profile.rain.rainTotalMm, 1.5, 8),
      normalizedFit(profile.wind.maxGustKmh, 55, 80)
    ),
    averageFit(
      normalizedFit(profile.rain.rainHours, c.rainHoursMin, 6),
      normalizedFit(profile.wind.notableHours, c.notableWindHoursMin, 7)
    ),
    normalizedFit(profile.wind.rainOverlapHours, c.overlapMinHours, 6)
  );
}

function buildPrimaryCandidates(profile: DayProfile): Scene24Candidate[] {
  return [
    score01(profile),
    score02(profile),
    score03(profile),
    score04(profile),
    score05(profile),
    score06(profile),
    score07(profile),
    score08(profile),
    score09(profile),
    score10(profile),
    score11(profile),
    score12(profile),
    score13(profile),
    score14(profile),
    score15(profile),
    score16(profile),
    score17(profile),
    score18(profile),
    score20(profile),
    score21(profile),
    score22(profile),
    score23(profile),
    score24(profile)
  ];
}

function applyConflictRules(
  profile: DayProfile,
  candidates: Scene24Candidate[]
): Scene24Candidate[] {
  const byId = new Map(candidates.map((item) => [item.sceneId, item]));

  function suppress(sceneId: Scene24Id, reasonText: string): void {
    const item = byId.get(sceneId);
    if (!item || !item.eligible) return;
    item.eligible = false;
    item.score = 0;
    item.penalties = [...item.penalties, reasonText];
  }

  // Strong convection outranks rain+wind if the convective signal is dominant.
  const thunder = byId.get(22);
  if (
    thunder?.eligible &&
    profile.convection.peakThunderSupport >= SCENE24_CONFIG.thunder.dominantSupport
  ) {
    suppress(24, "suppressed_by_dominant_thunder");
    suppress(12, "suppressed_by_dominant_thunder");
    suppress(13, "suppressed_by_dominant_thunder");
  }

  // Real rain+wind overlap outranks pure wind or rain scenes.
  if (byId.get(24)?.eligible) {
    suppress(10, "suppressed_by_rain_wind_combination");
    suppress(12, "suppressed_by_rain_wind_combination");
    suppress(13, "suppressed_by_rain_wind_combination");
  }

  // Dominant wind outranks sky+wind variants.
  if (byId.get(10)?.eligible) {
    suppress(6, "suppressed_by_dominant_wind");
    suppress(14, "suppressed_by_dominant_wind");
    suppress(20, "suppressed_by_dominant_wind");
  }

  // Luminous improvement is the specific version of improvement.
  if (byId.get(15)?.eligible) {
    suppress(11, "suppressed_by_luminous_improvement");
  }

  // Dense fog outranks generic fog and dense cloud.
  if (byId.get(17)?.eligible) {
    suppress(8, "suppressed_by_dense_fog");
    suppress(23, "suppressed_by_dense_fog");
    suppress(9, "suppressed_by_dense_fog");
  } else if (byId.get(8)?.eligible) {
    suppress(23, "suppressed_by_fog");
    suppress(9, "suppressed_by_fog");
  }

  return [...byId.values()];
}

function fallbackCandidate(profile: DayProfile): Scene24Candidate {
  const f = SCENE24_CONFIG.fallback;
  const cb = clearBright(profile);
  const cd = cloudyDense(profile);

  let sceneId: Scene24Id;
  let reasonText: string;

  if (cb >= f.sunnyClearPlusBrightFractionMin) {
    sceneId = f.sunnySceneId;
    reasonText = "fallback_bright";
  } else if (cb >= f.mixedBrightClearPlusBrightFractionMin) {
    sceneId = f.mixedBrightSceneId;
    reasonText = "fallback_mixed_bright";
  } else if (cd >= f.cloudyPlusDenseFractionMin) {
    sceneId = f.cloudySceneId;
    reasonText = "fallback_cloudy";
  } else {
    sceneId = f.absoluteSceneId;
    reasonText = "fallback_absolute_variable";
  }

  const definition = getScene24ById(sceneId);

  return {
    sceneId,
    sceneKey: definition.key,
    eligible: true,
    score: 50,
    confidence: "LOW",
    reasons: [reasonText],
    penalties: ["fallback_used"]
  };
}

function neighborMargin(a: Scene24Id, b: Scene24Id): number {
  const key = [a, b].sort((x, y) => x - y).map((id) => String(id).padStart(2, "0")).join("_");
  const margins = SCENE24_CONFIG.neighborSwitchMargins as Record<string, number>;
  return margins[key] ?? SCENE24_CONFIG.scoring.switchMargin;
}

function applyHysteresis(
  winner: Scene24Candidate,
  eligibleCandidates: Scene24Candidate[],
  options: ChooseScene24Options
): { winner: Scene24Candidate; applied: boolean } {
  const previousId = options.previousSceneId;
  if (!previousId || previousId === winner.sceneId) {
    return { winner, applied: false };
  }

  const previous = eligibleCandidates.find((item) => item.sceneId === previousId);
  if (!previous?.eligible) {
    return { winner, applied: false };
  }

  // Critical phenomena bypass hysteresis when newly robust.
  if ([10, 17, 22, 24].includes(winner.sceneId) && winner.score >= 70) {
    return { winner, applied: false };
  }

  const margin = neighborMargin(previous.sceneId, winner.sceneId);
  if (winner.score < previous.score + margin) {
    return { winner: previous, applied: true };
  }

  return { winner, applied: false };
}

function withFinalConfidence(
  winner: Scene24Candidate,
  runnerUp: Scene24Candidate | undefined
): Scene24Confidence {
  return finalConfidence(winner.score, runnerUp?.score ?? 0);
}

/**
 * Pure V24 scene decision. Nothing in production calls this function yet.
 * It can therefore be imported later by verdict.ts in shadow mode without
 * changing forecast.scene.
 */
export function chooseScene24(
  profile: DayProfile,
  options: ChooseScene24Options = {}
): SceneDecisionV24 {
  const primary = buildPrimaryCandidates(profile);
  const instability = score19(profile, primary);
  const all = applyConflictRules(profile, [...primary, instability]);

  let eligible = all
    .filter((item) => item.eligible)
    .sort((a, b) => b.score - a.score || a.sceneId - b.sceneId);

  let fallbackUsed = false;

  if (!eligible.length || eligible[0].score < 45) {
    const fallback = fallbackCandidate(profile);
    all.push(fallback);
    eligible = [fallback, ...eligible].sort((a, b) => b.score - a.score || a.sceneId - b.sceneId);
    fallbackUsed = true;
  }

  const rawWinner = eligible[0];
  const hysteresis = applyHysteresis(rawWinner, eligible, options);
  const winner = hysteresis.winner;

  const runnerUp = eligible
    .filter((item) => item.sceneId !== winner.sceneId)
    .sort((a, b) => b.score - a.score || a.sceneId - b.sceneId)[0];

  const definition = getScene24ById(winner.sceneId);
  const confidence = withFinalConfidence(winner, runnerUp);

  return {
    version: SCENE24_CONFIG.version,
    sceneId: winner.sceneId,
    sceneKey: winner.sceneKey,
    sceneLabel: definition.label,
    score: winner.score,
    confidence,
    runnerUp: runnerUp ? {
      sceneId: runnerUp.sceneId,
      sceneKey: runnerUp.sceneKey,
      score: runnerUp.score
    } : null,
    candidates: all.sort((a, b) => a.sceneId - b.sceneId),
    reasons: winner.reasons,
    fallbackUsed,
    hysteresisApplied: hysteresis.applied
  };
}
