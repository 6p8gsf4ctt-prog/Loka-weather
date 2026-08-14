import type { LokaForecast } from "../types";
import type { SceneEngineResolution } from "./engineMode";
import { buildV24PublicPayloadPreview } from "./publicPreview";

export interface V24ApprovalProof {
  eventId: string;
  eventAt: string;
  challengeId: string | null;
  readinessFingerprint: string | null;
}

export type ActivationGuardCheckId =
  | "mode_requested"
  | "admin_approved"
  | "approval_audit_proof"
  | "readiness"
  | "scene24_available"
  | "scene24_error_free"
  | "day_profile_available"
  | "model_count"
  | "payload_build"
  | "winner_score"
  | "confidence"
  | "score_gap"
  | "visibility_evidence"
  | "thunder_evidence";

export interface ActivationGuardCheck {
  id: ActivationGuardCheckId;
  label: string;
  passed: boolean;
  blocking: boolean;
  value: string | number | boolean | null;
  target: string;
  reason: string;
}

export interface V24ActivationGuardResult {
  version: "12.3.0";
  status: "NOT_ARMED" | "BLOCKED" | "PASS";
  evaluatedAt: string;
  fallbackRequired: boolean;
  activationReadyForCutover: boolean;
  reason: string;
  checks: ActivationGuardCheck[];
  candidate: null | {
    sceneId: number;
    sceneKey: string;
    sceneLabel: string;
    score: number;
    confidence: string;
    masterFileName: string;
    scoreGap: number | null;
  };
}

type Obj = Record<string, unknown>;

const MIN_MODEL_COUNT = 4;
const MIN_WINNER_SCORE = 55;
const MIN_SCORE_GAP = 7;

function asObj(value: unknown): Obj | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Obj
    : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : null;
}

function check(
  id: ActivationGuardCheckId,
  label: string,
  passed: boolean,
  value: ActivationGuardCheck["value"],
  target: string,
  reason: string,
  blocking = true
): ActivationGuardCheck {
  return { id, label, passed, blocking, value, target, reason };
}

function firstBlockingReason(checks: ActivationGuardCheck[]): string | null {
  const failed = checks.find((item) => item.blocking && !item.passed);
  return failed ? failed.id : null;
}

/**
 * Exact per-generation safety gate for the future V24 public cutover.
 *
 * Bloc 12.3 does NOT publish V24. It runs the exact checks that a later
 * public cutover will require, and forces a generation fallback decision
 * whenever one of them fails.
 */
export function evaluateV24ActivationGuard(args: {
  forecast: LokaForecast;
  resolution: SceneEngineResolution;
  approvalProof: V24ApprovalProof | null;
}): V24ActivationGuardResult {
  const { forecast, resolution, approvalProof } = args;
  const evaluatedAt = new Date().toISOString();

  const modeRequested = resolution.requested === "V24";
  const approved = resolution.v24Approved === true;
  const ready = resolution.readiness === "READY_CANDIDATE";

  if (!modeRequested) {
    return {
      version: "12.3.0",
      status: "NOT_ARMED",
      evaluatedAt,
      fallbackRequired: false,
      activationReadyForCutover: false,
      reason: resolution.requested === "V24_PREVIEW"
        ? "preview_mode_not_production_armed"
        : "legacy_mode_not_production_armed",
      checks: [
        check(
          "mode_requested",
          "Mode V24 demandé",
          false,
          resolution.requested,
          "V24",
          "Le mode administratif n'est pas V24."
        )
      ],
      candidate: null
    };
  }

  const diagnostics = forecast.diagnostics ?? {};
  const scene24 = asObj(diagnostics.scene24);
  const profile = asObj(diagnostics.dayProfile24);
  const scene24Error = diagnostics.scene24Error;
  const modelCount = asNumber(diagnostics.modelCount) ?? 0;

  const sceneId = scene24 ? asNumber(scene24.sceneId) : null;
  const sceneKey =
    scene24 && typeof scene24.sceneKey === "string"
      ? scene24.sceneKey
      : null;
  const sceneLabel =
    scene24 && typeof scene24.sceneLabel === "string"
      ? scene24.sceneLabel
      : sceneKey;
  const score = scene24 ? asNumber(scene24.score) : null;
  const confidence =
    scene24 && typeof scene24.confidence === "string"
      ? scene24.confidence
      : null;

  const runner = scene24 ? asObj(scene24.runnerUp) : null;
  const runnerScore = runner ? asNumber(runner.score) : null;
  const scoreGap =
    score !== null && runnerScore !== null
      ? Math.round((score - runnerScore) * 10) / 10
      : null;

  let payload:
    | ReturnType<typeof buildV24PublicPayloadPreview>
    | null = null;
  let payloadError: string | null = null;

  try {
    payload = buildV24PublicPayloadPreview(forecast);
  } catch (error) {
    payloadError = error instanceof Error ? error.message : String(error);
  }

  const visibility = profile ? asObj(profile.visibility) : null;
  const visibilityMinKm =
    visibility ? asNumber(visibility.visibilityMinKm) : null;

  const convection = profile ? asObj(profile.convection) : null;
  const thunderHours =
    convection ? asNumber(convection.thunderHours) ?? 0 : 0;
  const peakThunderSupport =
    convection ? asNumber(convection.peakThunderSupport) ?? 0 : 0;

  const visibilityScene = sceneId === 8 || sceneId === 17;
  const thunderScene = sceneId === 22;

  const checks: ActivationGuardCheck[] = [
    check(
      "mode_requested",
      "Mode V24 demandé",
      modeRequested,
      resolution.requested,
      "V24",
      modeRequested ? "Mode V24 demandé." : "Mode V24 non demandé."
    ),
    check(
      "admin_approved",
      "Autorisation administrative",
      approved,
      approved,
      "v24Approved = true",
      approved
        ? "Double confirmation administrative présente."
        : "Autorisation V24 absente."
    ),
    check(
      "approval_audit_proof",
      "Preuve d'audit APPROVED",
      approvalProof !== null,
      approvalProof?.eventId ?? null,
      "événement APPROVED présent",
      approvalProof
        ? "Autorisation retrouvée dans l'audit append-only."
        : "Aucun événement APPROVED correspondant."
    ),
    check(
      "readiness",
      "Readiness courant",
      ready,
      resolution.readiness,
      "READY_CANDIDATE",
      ready
        ? "Readiness toujours conforme."
        : "Le readiness n'autorise pas V24."
    ),
    check(
      "scene24_available",
      "Décision V24 disponible",
      scene24 !== null && sceneId !== null && sceneKey !== null,
      sceneKey,
      "scène V24 valide",
      scene24
        ? "Décision V24 disponible."
        : "Décision V24 absente."
    ),
    check(
      "scene24_error_free",
      "Moteur V24 sans erreur",
      scene24Error === null || scene24Error === undefined,
      scene24Error === undefined ? null : String(scene24Error),
      "scene24Error = null",
      scene24Error === null || scene24Error === undefined
        ? "Aucune erreur V24."
        : "Le moteur V24 a signalé une erreur."
    ),
    check(
      "day_profile_available",
      "DayProfile disponible",
      profile !== null,
      profile !== null,
      "dayProfile24 présent",
      profile
        ? "DayProfile V24 disponible."
        : "DayProfile V24 absent."
    ),
    check(
      "model_count",
      "Modèles météo disponibles",
      modelCount >= MIN_MODEL_COUNT,
      modelCount,
      `≥ ${MIN_MODEL_COUNT}`,
      modelCount >= MIN_MODEL_COUNT
        ? `${modelCount} modèles disponibles.`
        : `Seulement ${modelCount} modèle(s) disponible(s).`
    ),
    check(
      "payload_build",
      "Payload public V24 valide",
      payload !== null,
      payloadError,
      "construction sans erreur",
      payload
        ? "Payload public V24 construit."
        : `Payload V24 invalide : ${payloadError ?? "unknown"}.`
    ),
    check(
      "winner_score",
      "Score gagnant",
      score !== null && score >= MIN_WINNER_SCORE,
      score,
      `≥ ${MIN_WINNER_SCORE}`,
      score !== null && score >= MIN_WINNER_SCORE
        ? `Score ${score}.`
        : `Score insuffisant ou absent.`
    ),
    check(
      "confidence",
      "Confiance de génération",
      confidence === "MEDIUM" || confidence === "HIGH",
      confidence,
      "MEDIUM ou HIGH",
      confidence === "MEDIUM" || confidence === "HIGH"
        ? `Confiance ${confidence}.`
        : "Une génération LOW ne peut pas basculer publiquement."
    ),
    check(
      "score_gap",
      "Écart gagnant / runner-up",
      scoreGap === null
        ? score !== null && score >= 70 && confidence === "HIGH"
        : scoreGap >= MIN_SCORE_GAP,
      scoreGap,
      `≥ ${MIN_SCORE_GAP} pts, ou score ≥ 70 + HIGH sans runner-up`,
      scoreGap === null
        ? "Pas de runner-up : exigence renforcée score ≥ 70 et HIGH."
        : `Écart ${scoreGap} pts.`
    ),
    check(
      "visibility_evidence",
      "Preuve de visibilité pour brouillard",
      !visibilityScene || visibilityMinKm !== null,
      visibilityMinKm,
      visibilityScene ? "visibilityMinKm disponible" : "non applicable",
      visibilityScene
        ? visibilityMinKm !== null
          ? `Visibilité minimale ${visibilityMinKm} km.`
          : "Scène brouillard interdite sans mesure physique de visibilité."
        : "Non applicable."
    ),
    check(
      "thunder_evidence",
      "Preuve orage renforcée",
      !thunderScene ||
        (thunderHours >= 1 && peakThunderSupport >= 0.6),
      thunderScene
        ? `${thunderHours}h / ${Math.round(peakThunderSupport * 100)}%`
        : null,
      thunderScene
        ? "≥ 1 h et support ≥ 60 %"
        : "non applicable",
      thunderScene
        ? `Orage : ${thunderHours} h, support ${Math.round(peakThunderSupport * 100)} %.`
        : "Non applicable."
    )
  ];

  const failed = firstBlockingReason(checks);
  const passed = failed === null;

  return {
    version: "12.3.0",
    status: passed ? "PASS" : "BLOCKED",
    evaluatedAt,
    fallbackRequired: !passed,
    activationReadyForCutover: passed,
    reason: passed
      ? "all_generation_guards_passed_waiting_public_cutover_bloc_12_4"
      : `generation_guard_failed_${failed}`,
    checks,
    candidate:
      payload && sceneId !== null && sceneKey && sceneLabel && score !== null && confidence
        ? {
            sceneId,
            sceneKey,
            sceneLabel,
            score,
            confidence,
            masterFileName: payload.scene.masterFileName,
            scoreGap
          }
        : null
  };
}
