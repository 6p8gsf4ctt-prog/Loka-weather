/**
 * LOKA — configuration du futur classificateur 24 scènes.
 *
 * Phase Bloc 1 : cette configuration est ajoutée sans être importée par le
 * pipeline de production. Les seuils sont donc sans effet sur V0.6.6.1 tant
 * que le classificateur V24 n'est pas branché.
 */
export const SCENE24_CONFIG = {
  version: "24.0.0-alpha.1",

  daytime: {
    startHour: 7,
    endHour: 21,
    morningEndHour: 11,
    afternoonStartHour: 12,
    afternoonEndHour: 16,
    eveningStartHour: 17
  },

  skyState: {
    clearMaxPct: 25,
    brightMaxPct: 45,
    mixedMaxPct: 69,
    cloudyMaxPct: 89,
    denseFromPct: 90
  },

  scoring: {
    phenomenonFitWeight: 0.40,
    durationFitWeight: 0.25,
    structureFitWeight: 0.20,
    modelConfidenceWeight: 0.15,
    specificityBonusMax: 8,
    uncertaintyPenaltyMax: 15,
    switchMargin: 7,
    trendBonus: 10
  },

  neighborSwitchMargins: {
    "01_16": 6,
    "03_21": 6,
    "04_18": 7,
    "09_23": 6,
    "11_15": 6,
    "02_07": 8,
    "08_17": 8
  },

  confidence: {
    highScoreMin: 80,
    highGapMin: 10,
    mediumScoreMin: 65,
    mediumGapMin: 5
  },

  light: {
    grandSoleil: {
      clearFractionMin: 0.75,
      clearPlusBrightFractionMin: 0.90,
      meanCloudMaxPct: 22,
      cloudPassageMaxPct: 45,
      cloudPassageMaxHours: 2,
      transitionsMax: 1
    },

    soleilPassagesNuageux: {
      clearPlusBrightFractionMin: 0.65,
      clearFractionMin: 0.40,
      meanCloudMaxPct: 38,
      mixedFractionMin: 0.15,
      mixedFractionMax: 0.40,
      cloudyFractionMax: 0.20,
      cloudPassageMinHours: 2,
      transitionsMax: 3
    },

    grandesEclaircies: {
      clearPlusBrightFractionMin: 0.50,
      clearPlusBrightFractionMax: 0.69,
      meanCloudMinPct: 38,
      meanCloudMaxPct: 58,
      brightBlockMinHours: 3,
      rainHoursMax: 1
    },

    eclaircies: {
      clearPlusBrightFractionMin: 0.25,
      clearPlusBrightFractionMax: 0.49,
      meanCloudMinPct: 50,
      meanCloudMaxPct: 72,
      brightBlockMaxHours: 3,
      rainHoursMax: 1
    },

    variableLumineux: {
      transitionsMin: 3,
      clearPlusBrightFractionMin: 0.50,
      cloudyPlusMixedFractionMin: 0.25,
      meanCloudMinPct: 32,
      meanCloudMaxPct: 58,
      dominantStateMaxFraction: 0.70,
      rainHoursMax: 1
    },

    variable: {
      transitionsMin: 3,
      clearPlusBrightFractionMin: 0.30,
      clearPlusBrightFractionMax: 0.49,
      cloudyPlusMixedFractionMin: 0.40,
      cloudyPlusMixedFractionMax: 0.65,
      meanCloudMinPct: 45,
      meanCloudMaxPct: 65,
      dominantStateMaxFraction: 0.65,
      brightCloudyBalanceMaxDelta: 0.20,
      rainHoursMax: 1
    }
  },

  veil: {
    soleilVoile: {
      highCloudMeanMinPct: 35,
      highCloudMeanMaxPct: 69,
      lowCloudMeanMaxPct: 25,
      midCloudMeanMaxPct: 35,
      totalMeanCloudMinPct: 30,
      totalMeanCloudMaxPct: 60,
      highMinusLowMinPoints: 20,
      transitionsMax: 2
    },

    soleilVoileDense: {
      highCloudMeanMinPct: 70,
      highCloudFractionAbove70Min: 0.60,
      lowCloudMeanMaxPct: 30,
      midCloudMeanMaxPct: 40,
      totalMeanCloudMinPct: 60,
      highMinusLowMinPoints: 30,
      transitionsMax: 2
    }
  },

  cloud: {
    couvert: {
      cloudyOrDenseFractionMin: 0.70,
      meanCloudMinPct: 72,
      meanCloudMaxPct: 89,
      denseFractionMax: 0.65,
      clearPlusBrightFractionMax: 0.20,
      brightOpeningBlockMaxHours: 2,
      transitionsMax: 2
    },

    couvertDense: {
      denseFractionMin: 0.65,
      cloudyOrDenseFractionMin: 0.90,
      meanCloudMinPct: 90,
      medianCloudMinPct: 92,
      clearPlusBrightFractionMax: 0.05,
      denseBlockMinHours: 6,
      cloudStdDevMaxPct: 10
    }
  },

  wind: {
    notableKmh: 55,
    strongKmh: 70,
    notableZoneLowKmh: 52,
    notableZoneHighKmh: 58,
    strongZoneLowKmh: 67,
    strongZoneHighKmh: 73,

    structuringMinHours: 3,

    strongDominant: {
      notableHoursMin: 4,
      strongHoursMin: 2,
      maxGustAlternativeKmh: 75,
      longEpisodeHoursMin: 6,
      longEpisodeGustMinKmh: 65,
      blockMinHours: 3
    },

    soleilPlusVent: {
      clearPlusBrightFractionMin: 0.65,
      meanCloudMaxPct: 40,
      notableHoursMin: 3,
      brightOverlapMinHours: 3,
      strongHoursMax: 2,
      rainHoursMax: 1
    },

    eclairciesPlusVent: {
      clearPlusBrightFractionMin: 0.30,
      clearPlusBrightFractionMax: 0.64,
      cloudyPlusMixedFractionMin: 0.30,
      notableHoursMin: 3,
      overlapMinHours: 3,
      rainHoursMax: 1
    },

    nuageuxPlusVent: {
      cloudyPlusDenseFractionMin: 0.55,
      meanCloudMinPct: 65,
      clearPlusBrightFractionMax: 0.30,
      notableHoursMin: 3,
      cloudOverlapMinHours: 3,
      rainHoursMax: 1
    }
  },

  rain: {
    wetHourMinMm: 0.20,

    sustained: {
      rainHoursMin: 3,
      rainBlockMinHours: 3,
      continuityRatioMin: 0.70,
      rainBreakCountMax: 2,
      maxRainAlternativeMmPerHour: 0.40,
      totalRainAlternativeMm: 3.0
    },

    showers: {
      rainHoursMin: 2,
      showerHoursMin: 2,
      showerBlockCountMin: 2,
      continuityRatioMax: 0.65,
      rainBreakCountMin: 2,
      dryGapMinHours: 1
    },

    rainPlusWind: {
      rainHoursMin: 2,
      notableWindHoursMin: 3,
      overlapMinHours: 2,
      totalRainAlternativeMm: 2,
      maxRainAlternativeMmPerHour: 0.8,
      rainBlockAlternativeHours: 2
    }
  },

  thunder: {
    robustSupport: 0.55,
    strongSupport: 0.60,
    dominantSupport: 0.65,
    primaryHoursMin: 1,
    alternativeHoursMin: 2,
    rainSignalMinMmPerHour: 1.0
  },

  trend: {
    neutralBandPoints: 15,
    weakMinPoints: 15,
    moderateMinPoints: 25,
    strongMinPoints: 40,
    directionTolerancePoints: 10,
    reversalPenaltyFrom: 2,

    degradation: {
      cloudTrendMinPoints: 25,
      morningCloudMaxPct: 50,
      eveningCloudMinPct: 70,
      morningBrightFractionMin: 0.50,
      eveningBrightFractionMax: 0.25
    },

    improvement: {
      cloudTrendMaxPoints: -25,
      morningCloudMinPct: 65,
      eveningCloudMaxPct: 50,
      morningBrightFractionMax: 0.25,
      eveningBrightFractionMin: 0.45
    },

    luminousImprovement: {
      cloudTrendMaxPoints: -30,
      eveningBrightFractionMin: 0.70,
      eveningCloudMaxPct: 35,
      lastHoursBrightFractionMin: 0.75,
      lastHoursWindow: 3
    }
  },

  fog: {
    fog: {
      fogHoursMin: 2,
      fogBlockMinHours: 2,
      supportPeakMin: 0.55,
      alternativeFogHoursMin: 3,
      alternativeSupportMeanMin: 0.45,
      futureVisibilityKmMax: 5
    },

    denseFog: {
      fogHoursMin: 4,
      denseFogHoursMin: 3,
      denseFogBlockMinHours: 3,
      supportPeakMin: 0.70,
      supportMeanMin: 0.60,
      futureVisibilityKmMax: 1
    },

    morningSecondary: {
      fogEndHourMax: 10,
      afternoonBrightFractionMin: 0.60
    }
  },

  instability: {
    transitionsMin: 3,
    reversalsForDirectionalPenalty: 2,
    distinctStatesMin: 3
  },

  fallback: {
    sunnySceneId: 16,
    sunnyClearPlusBrightFractionMin: 0.70,

    mixedBrightSceneId: 21,
    mixedBrightClearPlusBrightFractionMin: 0.45,

    cloudySceneId: 9,
    cloudyPlusDenseFractionMin: 0.75,

    absoluteSceneId: 18
  }
} as const;

export type Scene24Config = typeof SCENE24_CONFIG;
