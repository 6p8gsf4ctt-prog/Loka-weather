export const SCENE_ENGINE_VERSION = "2.0.3";
export const SCENE_DOCTRINE_VERSION = "2.0.3";

export const SCENE_THRESHOLDS = {
  sky: {
    clearMax: 25,
    brightMax: 45,
    mixedMax: 69,
    cloudyMax: 89,
    denseMin: 90
  },
  rain: {
    wetHourMinMm: 0.2,
    supportMin: 0.45,
    sustainedMinHours: 5,
    sustainedBlockMinHours: 4,
    sustainedContinuityMin: 0.58,
    showersMinHours: 2,
    showersMinBreaks: 1,
    showersConvectiveFractionMin: 0.50
  },
  instability: {
    minTransitions: 5,
    minDistinctStates: 4,
    minReversals: 3,
    minIndependentEvidence: 2,
    skyContrastRangeMinPct: 45,
    skyContrastBrightFractionMin: 0.20,
    skyContrastCloudyFractionMin: 0.35,
    showerBlocksMin: 2,
    fogHoursMin: 2,
    notableWindHoursMin: 2
  },
  thunder: { supportMin: 0.35 },
  fog: { supportMin: 0.35, denseSupportMin: 0.65, denseMinHours: 3 },
  trend: {
    strongCloudDelta: 35,
    moderateCloudDelta: 25,
    luminousEarlyCloudMin: 70,
    luminousLateCloudMax: 35,
    luminousLateBrightMin: 0.65,
    luminousLastHoursBrightMin: 0.75
  }
} as const;
