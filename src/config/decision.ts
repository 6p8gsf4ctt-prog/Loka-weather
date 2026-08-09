/**
 * LOKA V0.4 — configuration centrale du moteur de décision.
 *
 * Tous les seuils éditoriaux importants sont regroupés ici pour pouvoir
 * faire évoluer LOKA à partir des retours quotidiens sans disperser les
 * réglages dans le code.
 */
export const DECISION_CONFIG = {
  version: "0.4.0",

  confidence: {
    assertFrom: 0.70,
    mentionFrom: 0.50,
    ignoreBelow: 0.50
  },

  sky: {
    sunnyCloudMaxPct: 35,
    cloudyCloudMinPct: 70,
    dominantFraction: 0.70
  },

  rain: {
    wetHourMinMm: 0.20,
    robustSupport: 0.55,
    weakMaxMmPerHour: 0.80,
    strongFromMmPerHour: 4.0,
    sceneMinHours: 2
  },

  thunder: {
    robustSupport: 0.55,
    mentionSupport: 0.40,
    sceneMinHours: 1
  },

  wind: {
    sceneMinHours: 3,
    scorePer10KmhAboveThreshold: 1.0
  },

  unstable: {
    minMeaningfulTransitions: 2,
    strongTransitionBonus: 5,
    uncertainWeatherBonus: 3
  },

  heat: {
    prolongedHotFromC: 30,
    prolongedHotMinHours: 4
  },

  score: {
    thunderHour: 3.2,
    thunderPeak: 6.0,
    rainHour: 2.0,
    rainPeak: 1.4,
    windHour: 1.7,
    sunnyFraction: 10,
    cloudyFraction: 9,
    transition: 2.1
  }
} as const;

export type DecisionConfig = typeof DECISION_CONFIG;
