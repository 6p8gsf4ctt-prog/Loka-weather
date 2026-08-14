import type { ShadowMetricRow } from "./shadowMetrics";
import { calculateShadowMetrics } from "./shadowMetrics";
import { SCENE24_REGISTRY } from "../engine/scenes24/registry";

export type V24ReadinessStatus = "NOT_READY" | "OBSERVATION" | "READY_CANDIDATE";

export interface V24ReadinessCriterion {
  id: string;
  label: string;
  value: number | null;
  target: string;
  passed: boolean;
  blocking: boolean;
  reason: string;
}

export interface V24FamilyHealth {
  family: string;
  generations: number;
  lowConfidenceRate: number;
  overrideRate: number;
  closeDecisionRate: number;
  averageWinnerScore: number | null;
  averageScoreGap: number | null;
  status: "INSUFFICIENT_SAMPLE" | "HEALTHY" | "WATCH" | "PROBLEM";
  reasons: string[];
}

export interface V24ReadinessReport {
  version: string;
  generatedAt: string;
  status: V24ReadinessStatus;
  summary: string;
  sampleSufficient: boolean;
  criteria: V24ReadinessCriterion[];
  blockers: string[];
  warnings: string[];
  familyHealth: V24FamilyHealth[];
  problematicFamilies: V24FamilyHealth[];
  metrics: ReturnType<typeof calculateShadowMetrics>;
}

const VERSION = "10.0.0";

/**
 * Readiness is deliberately conservative:
 * - NOT_READY = sample too small, regardless of apparent performance.
 * - OBSERVATION = enough history to evaluate, but at least one gate fails.
 * - READY_CANDIDATE = all gates pass. This NEVER switches production.
 */
const GATES = {
  minimum: {
    forecastDays: 7,
    generations: 21,
    comparableTransitions: 10
  },
  candidate: {
    forecastDays: 14,
    generations: 40,
    comparableTransitions: 20,
    finalStabilityRate: 0.85,
    averageScoreGap: 8,
    closeDecisionRateMax: 0.25,
    lowConfidenceRateMax: 0.25,
    reliabilityAppliedRateMax: 0.25,
    rawFinalOverrideRateMax: 0.20
  },
  family: {
    minimumGenerations: 3,
    lowWarning: 0.40,
    lowProblem: 0.60,
    overrideWarning: 0.30,
    overrideProblem: 0.50,
    closeWarning: 0.35,
    closeProblem: 0.55
  }
} as const;

function round(value: number, digits = 4): number {
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function rate(count: number, total: number): number {
  return total > 0 ? round(count / total) : 0;
}

function average(values: number[]): number | null {
  if (!values.length) return null;
  return round(values.reduce((a, b) => a + b, 0) / values.length, 2);
}

const FAMILY_BY_ID = new Map<number, string>(
  SCENE24_REGISTRY.map((scene) => [scene.id, scene.family])
);

function familyFor(sceneId: number | null): string | null {
  return sceneId === null ? null : FAMILY_BY_ID.get(sceneId) ?? null;
}

function familyHealth(rows: ShadowMetricRow[]): V24FamilyHealth[] {
  const families = new Map<string, ShadowMetricRow[]>();

  for (const row of rows) {
    const family = familyFor(row.finalSceneId);
    if (!family) continue;
    const group = families.get(family) ?? [];
    group.push(row);
    families.set(family, group);
  }

  return [...families.entries()]
    .map(([family, group]) => {
      const low = group.filter((row) => row.finalConfidence === "LOW").length;
      const overridden = group.filter((row) =>
        row.rawSceneId !== null &&
        row.finalSceneId !== null &&
        row.rawSceneId !== row.finalSceneId
      ).length;

      const withGap = group.filter((row) =>
        row.finalScore !== null && row.runnerUpScore !== null
      );
      const close = withGap.filter((row) =>
        (row.finalScore as number) - (row.runnerUpScore as number) < 7
      ).length;

      const lowRate = rate(low, group.length);
      const overrideRate = rate(overridden, group.length);
      const closeRate = rate(close, withGap.length);

      const scores = group
        .map((row) => row.finalScore)
        .filter((value): value is number => value !== null);

      const gaps = withGap.map((row) =>
        (row.finalScore as number) - (row.runnerUpScore as number)
      );

      const reasons: string[] = [];
      let status: V24FamilyHealth["status"] = "HEALTHY";

      if (group.length < GATES.family.minimumGenerations) {
        status = "INSUFFICIENT_SAMPLE";
        reasons.push(`moins de ${GATES.family.minimumGenerations} générations`);
      } else {
        const problem =
          lowRate > GATES.family.lowProblem ||
          overrideRate > GATES.family.overrideProblem ||
          closeRate > GATES.family.closeProblem;

        const watch =
          lowRate > GATES.family.lowWarning ||
          overrideRate > GATES.family.overrideWarning ||
          closeRate > GATES.family.closeWarning;

        if (problem) status = "PROBLEM";
        else if (watch) status = "WATCH";

        if (lowRate > GATES.family.lowWarning) {
          reasons.push(`confiance LOW ${Math.round(lowRate * 100)} %`);
        }
        if (overrideRate > GATES.family.overrideWarning) {
          reasons.push(`correction Reliability ${Math.round(overrideRate * 100)} %`);
        }
        if (closeRate > GATES.family.closeWarning) {
          reasons.push(`décisions serrées ${Math.round(closeRate * 100)} %`);
        }
      }

      return {
        family,
        generations: group.length,
        lowConfidenceRate: lowRate,
        overrideRate,
        closeDecisionRate: closeRate,
        averageWinnerScore: average(scores),
        averageScoreGap: average(gaps),
        status,
        reasons
      };
    })
    .sort((a, b) => {
      const order = { PROBLEM: 0, WATCH: 1, INSUFFICIENT_SAMPLE: 2, HEALTHY: 3 };
      return order[a.status] - order[b.status] || b.generations - a.generations;
    });
}

function criterion(
  id: string,
  label: string,
  value: number | null,
  target: string,
  passed: boolean,
  blocking: boolean,
  reason: string
): V24ReadinessCriterion {
  return { id, label, value, target, passed, blocking, reason };
}

export function evaluateV24Readiness(rows: ShadowMetricRow[]): V24ReadinessReport {
  const metrics = calculateShadowMetrics(rows);
  const sample = metrics.sample;
  const stability = metrics.stability;
  const scoring = metrics.scoring;
  const reliability = metrics.reliability;

  const sampleSufficient =
    sample.forecastDays >= GATES.minimum.forecastDays &&
    sample.generations >= GATES.minimum.generations &&
    sample.comparableTransitions >= GATES.minimum.comparableTransitions;

  const criteria: V24ReadinessCriterion[] = [
    criterion(
      "forecast_days",
      "Jours Shadow",
      sample.forecastDays,
      `≥ ${GATES.candidate.forecastDays}`,
      sample.forecastDays >= GATES.candidate.forecastDays,
      true,
      `${sample.forecastDays} jour(s) observé(s)`
    ),
    criterion(
      "generations",
      "Générations",
      sample.generations,
      `≥ ${GATES.candidate.generations}`,
      sample.generations >= GATES.candidate.generations,
      true,
      `${sample.generations} génération(s) archivée(s)`
    ),
    criterion(
      "transitions",
      "Transitions comparables",
      sample.comparableTransitions,
      `≥ ${GATES.candidate.comparableTransitions}`,
      sample.comparableTransitions >= GATES.candidate.comparableTransitions,
      true,
      `${sample.comparableTransitions} transition(s) intra-journée`
    ),
    criterion(
      "stability",
      "Stabilité finale",
      stability.finalStabilityRate,
      `≥ ${Math.round(GATES.candidate.finalStabilityRate * 100)} %`,
      stability.finalStabilityRate !== null &&
        stability.finalStabilityRate >= GATES.candidate.finalStabilityRate,
      true,
      stability.finalStabilityRate === null
        ? "pas encore mesurable"
        : `${Math.round(stability.finalStabilityRate * 100)} %`
    ),
    criterion(
      "score_gap",
      "Écart moyen gagnant / runner-up",
      scoring.averageScoreGap,
      `≥ ${GATES.candidate.averageScoreGap} pts`,
      scoring.averageScoreGap !== null &&
        scoring.averageScoreGap >= GATES.candidate.averageScoreGap,
      true,
      scoring.averageScoreGap === null
        ? "pas encore mesurable"
        : `${scoring.averageScoreGap} pts`
    ),
    criterion(
      "close_decisions",
      "Décisions serrées",
      scoring.closeDecisionRate,
      `≤ ${Math.round(GATES.candidate.closeDecisionRateMax * 100)} %`,
      scoring.closeDecisionRate <= GATES.candidate.closeDecisionRateMax,
      true,
      `${Math.round(scoring.closeDecisionRate * 100)} %`
    ),
    criterion(
      "low_confidence",
      "Confiance LOW",
      scoring.lowConfidenceRate,
      `≤ ${Math.round(GATES.candidate.lowConfidenceRateMax * 100)} %`,
      scoring.lowConfidenceRate <= GATES.candidate.lowConfidenceRateMax,
      true,
      `${Math.round(scoring.lowConfidenceRate * 100)} %`
    ),
    criterion(
      "reliability_rate",
      "Interventions Reliability",
      reliability.appliedRate,
      `≤ ${Math.round(GATES.candidate.reliabilityAppliedRateMax * 100)} %`,
      reliability.appliedRate <= GATES.candidate.reliabilityAppliedRateMax,
      true,
      `${Math.round(reliability.appliedRate * 100)} %`
    ),
    criterion(
      "override_rate",
      "Raw → Final modifié",
      reliability.rawFinalOverrideRate,
      `≤ ${Math.round(GATES.candidate.rawFinalOverrideRateMax * 100)} %`,
      reliability.rawFinalOverrideRate <= GATES.candidate.rawFinalOverrideRateMax,
      true,
      `${Math.round(reliability.rawFinalOverrideRate * 100)} %`
    )
  ];

  const families = familyHealth(rows);
  const problematicFamilies = families.filter((family) => family.status === "PROBLEM");
  const watchFamilies = families.filter((family) => family.status === "WATCH");

  const blockers = criteria
    .filter((item) => item.blocking && !item.passed)
    .map((item) => `${item.label} : ${item.reason} (objectif ${item.target})`);

  if (problematicFamilies.length) {
    blockers.push(
      ...problematicFamilies.map((family) =>
        `Famille ${family.family} problématique : ${family.reasons.join(", ")}`
      )
    );
  }

  const warnings = watchFamilies.map((family) =>
    `Famille ${family.family} à surveiller : ${family.reasons.join(", ")}`
  );

  let status: V24ReadinessStatus;
  let summary: string;

  if (!sampleSufficient) {
    status = "NOT_READY";
    summary =
      `Échantillon insuffisant : minimum ${GATES.minimum.forecastDays} jours, ` +
      `${GATES.minimum.generations} générations et ` +
      `${GATES.minimum.comparableTransitions} transitions avant une évaluation sérieuse.`;
  } else if (blockers.length > 0) {
    status = "OBSERVATION";
    summary =
      "L'échantillon permet l'analyse, mais au moins un critère de readiness reste hors cible.";
  } else {
    status = "READY_CANDIDATE";
    summary =
      "Tous les critères techniques du sas sont atteints. Une validation humaine reste obligatoire avant toute bascule.";
  }

  return {
    version: VERSION,
    generatedAt: new Date().toISOString(),
    status,
    summary,
    sampleSufficient,
    criteria,
    blockers,
    warnings,
    familyHealth: families,
    problematicFamilies,
    metrics
  };
}
