import type {
  DayProfile,
  Scene24Candidate,
  Scene24Confidence,
  Scene24Id,
  SceneDecisionV24
} from "../../types";
import { getScene24ById } from "./registry";

export interface Scene24ReliabilityReport {
  version: string;
  applied: boolean;
  reason: string | null;
  rawSceneId: Scene24Id;
  finalSceneId: Scene24Id;
  rawScore: number;
  finalScore: number;
  weakInstability: boolean;
  instabilityEvidenceCount: number;
  fallbackSceneId: Scene24Id;
  fallbackScore: number;
}

export interface StabilizedScene24 {
  decision: SceneDecisionV24;
  report: Scene24ReliabilityReport;
}

const RELIABILITY_VERSION = "24.0.0-alpha.2";

const RELIABILITY = {
  // A LOW decision below this score must be challenged by a conservative
  // sky-state fallback before it can remain the shadow recommendation.
  lowConfidenceReviewScore: 65,

  // If the conservative fallback is essentially tied with a weak specialist,
  // prefer the generic but robust scene.
  fallbackTolerancePoints: 3,

  instability: {
    minTransitions: 4,
    minDistinctStates: 3,
    minIndependentEvidence: 2
  }
} as const;

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function clearBright(profile: DayProfile): number {
  return profile.light.clearFraction + profile.light.brightFraction;
}

function cloudyDense(profile: DayProfile): number {
  return profile.light.cloudyFraction + profile.light.denseFraction;
}

function fallbackFor(profile: DayProfile): Scene24Candidate {
  const cb = clearBright(profile);
  const cd = cloudyDense(profile);

  let sceneId: Scene24Id;
  let score: number;
  let reason: string;

  if (cb >= 0.70) {
    sceneId = 16;
    score = 56 + clamp((cb - 0.70) / 0.30 * 8, 0, 8);
    reason = "reliability_fallback_bright";
  } else if (cb >= 0.45) {
    sceneId = 21;
    score = 54 + clamp((cb - 0.45) / 0.25 * 8, 0, 8);
    reason = "reliability_fallback_mixed_bright";
  } else if (cd >= 0.75) {
    sceneId = 9;
    score = 56 + clamp((cd - 0.75) / 0.25 * 8, 0, 8);
    reason = "reliability_fallback_cloudy";
  } else {
    sceneId = 18;

    // VARIABLE is the absolute technical fallback, but its score stays
    // deliberately modest. It is not allowed to masquerade as a confident
    // meteorological diagnosis.
    const balance = Math.abs(cb - cd);
    score = 52 + clamp((0.45 - balance) / 0.45 * 6, 0, 6);
    reason = "reliability_fallback_variable";
  }

  const definition = getScene24ById(sceneId);

  return {
    sceneId,
    sceneKey: definition.key,
    eligible: true,
    score: Math.round(score * 10) / 10,
    confidence: "LOW",
    reasons: [reason],
    penalties: ["reliability_fallback"]
  };
}

function instabilityEvidence(profile: DayProfile): {
  count: number;
  weak: boolean;
  reasons: string[];
} {
  const reasons: string[] = [];

  const enoughTransitions =
    profile.structure.meaningfulTransitions >= RELIABILITY.instability.minTransitions;

  const enoughStates =
    profile.structure.distinctStateCount >= RELIABILITY.instability.minDistinctStates;

  const evidence = [
    profile.structure.uncertainWeather,
    profile.evolution.reversals >= 2,
    profile.rain.rainBreakCount >= 2,
    profile.rain.showerBlockCount >= 2,
    profile.rain.convectiveRainFraction >= 0.40 && profile.rain.rainHours >= 2
  ];

  const count = evidence.filter(Boolean).length;

  if (enoughTransitions) reasons.push("instability_transitions_confirmed");
  if (enoughStates) reasons.push("instability_states_confirmed");
  if (profile.structure.uncertainWeather) reasons.push("instability_model_uncertainty");
  if (profile.evolution.reversals >= 2) reasons.push("instability_trend_reversals");
  if (profile.rain.rainBreakCount >= 2) reasons.push("instability_wet_dry_breaks");
  if (profile.rain.showerBlockCount >= 2) reasons.push("instability_multiple_showers");

  const weak =
    !enoughTransitions ||
    !enoughStates ||
    count < RELIABILITY.instability.minIndependentEvidence;

  return { count, weak, reasons };
}

function replaceCandidate(
  candidates: Scene24Candidate[],
  replacement: Scene24Candidate
): Scene24Candidate[] {
  const next = candidates.filter((candidate) => candidate.sceneId !== replacement.sceneId);
  next.push(replacement);
  return next.sort((a, b) => a.sceneId - b.sceneId);
}

function confidence(
  score: number,
  runnerUpScore: number,
  fallbackUsed: boolean
): Scene24Confidence {
  if (fallbackUsed) return "LOW";
  const gap = score - runnerUpScore;
  if (score >= 80 && gap >= 10) return "HIGH";
  if (score >= 65 && gap >= 5) return "MEDIUM";
  return "LOW";
}

/**
 * Reliability gate for V24 shadow mode.
 *
 * It does not alter the legacy production scene. It only stabilizes the V24
 * diagnostic recommendation before that recommendation is shown in /admin and
 * /instagram24.
 *
 * Main purpose in alpha.2:
 * - prevent scene 19 INSTABLE from winning merely because it is the only
 *   eligible candidate at ~50 points;
 * - always provide a meaningful runner-up when a low-confidence decision has
 *   no real competitor;
 * - prefer a conservative sky-state fallback when the specialist diagnosis is
 *   weak and essentially tied.
 */
export function stabilizeScene24Decision(
  profile: DayProfile,
  raw: SceneDecisionV24
): StabilizedScene24 {
  const fallback = fallbackFor(profile);
  const instability = instabilityEvidence(profile);

  let winner = raw;
  let applied = false;
  let reason: string | null = null;

  const rawWeakInstability =
    raw.sceneId === 19 &&
    (
      instability.weak ||
      raw.confidence === "LOW" ||
      raw.score < RELIABILITY.lowConfidenceReviewScore
    );

  const lowConfidenceNeedsReview =
    raw.confidence === "LOW" &&
    raw.score < RELIABILITY.lowConfidenceReviewScore;

  const fallbackCompetitive =
    fallback.score >= raw.score - RELIABILITY.fallbackTolerancePoints;

  if (rawWeakInstability) {
    const definition = getScene24ById(fallback.sceneId);

    winner = {
      ...raw,
      sceneId: fallback.sceneId,
      sceneKey: fallback.sceneKey,
      sceneLabel: definition.label,
      score: fallback.score,
      confidence: "LOW",
      runnerUp: {
        sceneId: raw.sceneId,
        sceneKey: raw.sceneKey,
        score: raw.score
      },
      candidates: replaceCandidate(raw.candidates, fallback),
      reasons: [
        ...fallback.reasons,
        "reliability_override_weak_instability"
      ],
      fallbackUsed: true
    };

    applied = true;
    reason = "weak_instability_replaced_by_conservative_fallback";
  } else if (lowConfidenceNeedsReview && fallbackCompetitive && fallback.sceneId !== raw.sceneId) {
    const definition = getScene24ById(fallback.sceneId);

    winner = {
      ...raw,
      sceneId: fallback.sceneId,
      sceneKey: fallback.sceneKey,
      sceneLabel: definition.label,
      score: fallback.score,
      confidence: "LOW",
      runnerUp: {
        sceneId: raw.sceneId,
        sceneKey: raw.sceneKey,
        score: raw.score
      },
      candidates: replaceCandidate(raw.candidates, fallback),
      reasons: [
        ...fallback.reasons,
        "reliability_override_low_confidence"
      ],
      fallbackUsed: true
    };

    applied = true;
    reason = "low_confidence_specialist_replaced_by_fallback";
  } else if (!raw.runnerUp && fallback.sceneId !== raw.sceneId) {
    // Keep the winner but ensure the shadow diagnostics show an actual
    // comparison rather than "Runner-up: —".
    winner = {
      ...raw,
      runnerUp: {
        sceneId: fallback.sceneId,
        sceneKey: fallback.sceneKey,
        score: fallback.score
      },
      candidates: replaceCandidate(raw.candidates, fallback),
      confidence: confidence(raw.score, fallback.score, raw.fallbackUsed),
      reasons: [...raw.reasons, "reliability_runner_up_injected"]
    };

    applied = true;
    reason = "missing_runner_up_repaired";
  }

  return {
    decision: winner,
    report: {
      version: RELIABILITY_VERSION,
      applied,
      reason,
      rawSceneId: raw.sceneId,
      finalSceneId: winner.sceneId,
      rawScore: raw.score,
      finalScore: winner.score,
      weakInstability: instability.weak,
      instabilityEvidenceCount: instability.count,
      fallbackSceneId: fallback.sceneId,
      fallbackScore: fallback.score
    }
  };
}
