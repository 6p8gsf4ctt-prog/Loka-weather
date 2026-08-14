import { SCENE24_CONFIG } from "../../config/scenes24";
import type {
  DayProfile,
  Scene24Candidate,
  Scene24Confidence,
  Scene24Id,
  Scene24Key
} from "../../types";
import { getScene24ById } from "./registry";

export interface Scene24ScoreParts {
  phenomenonFit: number;
  durationFit: number;
  structureFit: number;
  modelConfidence: number;
  specificityBonus?: number;
  uncertaintyPenalty?: number;
}

export interface Scene24CandidateInput {
  sceneId: Scene24Id;
  eligible: boolean;
  reasons: string[];
  penalties?: string[];
  parts: Scene24ScoreParts;
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizedFit(value: number, min: number, max: number): number {
  if (max <= min) return value >= max ? 100 : 0;
  return clamp(((value - min) / (max - min)) * 100);
}

export function inverseFit(value: number, goodMax: number, badFrom: number): number {
  if (badFrom <= goodMax) return value <= goodMax ? 100 : 0;
  return clamp(100 - ((value - goodMax) / (badFrom - goodMax)) * 100);
}

export function rangeFit(value: number, min: number, max: number, shoulder = 10): number {
  if (value >= min && value <= max) return 100;
  if (value < min) return clamp(100 - ((min - value) / shoulder) * 100);
  return clamp(100 - ((value - max) / shoulder) * 100);
}

export function averageFit(...values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + clamp(value), 0) / values.length;
}

export function scoreCandidate(input: Scene24CandidateInput): Scene24Candidate {
  const definition = getScene24ById(input.sceneId);
  const weights = SCENE24_CONFIG.scoring;

  if (!input.eligible) {
    return {
      sceneId: definition.id,
      sceneKey: definition.key,
      eligible: false,
      score: 0,
      confidence: "LOW",
      reasons: input.reasons,
      penalties: input.penalties ?? []
    };
  }

  const weighted =
    clamp(input.parts.phenomenonFit) * weights.phenomenonFitWeight +
    clamp(input.parts.durationFit) * weights.durationFitWeight +
    clamp(input.parts.structureFit) * weights.structureFitWeight +
    clamp(input.parts.modelConfidence) * weights.modelConfidenceWeight;

  const specificityBonus = Math.min(
    input.parts.specificityBonus ?? 0,
    weights.specificityBonusMax
  );

  const uncertaintyPenalty = Math.min(
    input.parts.uncertaintyPenalty ?? 0,
    weights.uncertaintyPenaltyMax
  );

  const score = clamp(weighted + specificityBonus - uncertaintyPenalty);

  return {
    sceneId: definition.id,
    sceneKey: definition.key,
    eligible: true,
    score: round1(score),
    confidence: confidenceForCandidate(score),
    reasons: input.reasons,
    penalties: input.penalties ?? []
  };
}

export function confidenceForCandidate(score: number): Scene24Confidence {
  if (score >= SCENE24_CONFIG.confidence.highScoreMin) return "HIGH";
  if (score >= SCENE24_CONFIG.confidence.mediumScoreMin) return "MEDIUM";
  return "LOW";
}

export function finalConfidence(
  winnerScore: number,
  runnerUpScore: number
): Scene24Confidence {
  const gap = winnerScore - runnerUpScore;
  const c = SCENE24_CONFIG.confidence;

  if (winnerScore >= c.highScoreMin && gap >= c.highGapMin) return "HIGH";
  if (winnerScore >= c.mediumScoreMin && gap >= c.mediumGapMin) return "MEDIUM";
  return "LOW";
}

/**
 * Confidence proxy based only on the completeness/robustness signals currently
 * available in DayProfile. It deliberately stays conservative in shadow mode.
 */
export function profileModelConfidence(profile: DayProfile, sceneKey: Scene24Key): number {
  let confidence = 88;

  if (profile.structure.uncertainWeather) confidence -= 12;

  if (
    sceneKey === "SOLEIL_VOILE" ||
    sceneKey === "SOLEIL_VOILE_DENSE"
  ) {
    const completeLayers =
      profile.cloud.lowMeanPct !== null &&
      profile.cloud.midMeanPct !== null &&
      profile.cloud.highMeanPct !== null;

    confidence += completeLayers ? 6 : -25;
  }

  if (
    sceneKey === "BRUME_BROUILLARD" ||
    sceneKey === "BROUILLARD_DENSE"
  ) {
    // V1 has WMO fog support but not physical visibility yet.
    confidence -= profile.visibility.visibilityMinKm === null ? 10 : 0;
  }

  return clamp(confidence);
}

export function sceneSpecificityBonus(sceneId: Scene24Id): number {
  // Combined/strongly distinctive scenes receive a modest bonus only after
  // eligibility has already been proven by the classifier.
  if ([6, 10, 14, 17, 22, 24].includes(sceneId)) return 6;
  if ([5, 7, 11, 12, 13, 15, 20, 23].includes(sceneId)) return 3;
  return 0;
}
