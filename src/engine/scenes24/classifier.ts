import { SCENE_DOCTRINE_VERSION, SCENE_ENGINE_VERSION } from "../../config/scenes24";
import type { DayProfileV2, ResolutionMode, Scene24Candidate, Scene24Confidence, Scene24Id, SceneDecisionV24 } from "../../types";
import { determineFamily } from "./families";
import { applyLocalHysteresis } from "./hysteresis";
import { profileSummary } from "./diagnostics";
import { isStructuringShowers, isSustainedRain } from "./rainDoctrine";
import { scene24ById } from "./registry";
import { scoreScene } from "./scoring";

function confidence(score: number, gap: number): Scene24Confidence {
  return score >= 82 && gap >= 8 ? "HIGH" : score >= 66 && gap >= 4 ? "MEDIUM" : "LOW";
}

export function chooseScene24V2(profile: DayProfileV2, previousSceneId?: Scene24Id | null): SceneDecisionV24 {
  const family = determineFamily(profile);
  const candidates = family.candidateSceneIds.map((id) => scoreScene(id, profile)).sort((a, b) => b.score - a.score || a.sceneId - b.sceneId);
  const raw = candidates[0];
  const runner = candidates[1] ?? null;
  const h = applyLocalHysteresis(raw, candidates, previousSceneId);
  const selected = h.selected;
  const selectedRunner = candidates.find((c) => c.sceneId !== selected.sceneId) ?? null;
  const gap = selectedRunner ? selected.score - selectedRunner.score : 100;
  const conf = confidence(selected.score, gap);
  let resolutionMode: ResolutionMode = h.applied ? "HYSTERESIS" : (selectedRunner && Math.abs(gap) <= 6 ? "NEIGHBOR_RESOLUTION" : "DIRECT");
  if (!h.applied && conf === "LOW") resolutionMode = "CONSERVATIVE";
  const def = scene24ById(selected.sceneId);
  const invariantChecks = [
    { name: "minimum_models", pass: profile.structure.modelCountMin >= 3, detail: `modelCountMin=${profile.structure.modelCountMin}` },
    { name: "thunder_scene_has_thunder", pass: selected.sceneId !== 22 || profile.convection.thunderHours > 0, detail: `thunderHours=${profile.convection.thunderHours}` },
    { name: "rain_wind_scene_has_overlap", pass: selected.sceneId !== 24 || profile.wind.rainOverlapHours > 0, detail: `overlap=${profile.wind.rainOverlapHours}` },
    { name: "sustained_rain_scene_meets_doctrine", pass: selected.sceneId !== 12 || isSustainedRain(profile), detail: `rainHours=${profile.rain.rainHours};rainBlockMaxHours=${profile.rain.rainBlockMaxHours};continuityRatio=${profile.rain.continuityRatio}` },
    { name: "showers_scene_meets_doctrine", pass: selected.sceneId !== 13 || isStructuringShowers(profile), detail: `showerHours=${profile.rain.showerHours};rainBreakCount=${profile.rain.rainBreakCount};convectiveRainFraction=${profile.rain.convectiveRainFraction}` },
    { name: "luminous_improvement_has_cloudy_start", pass: selected.sceneId !== 15 || profile.evolution.earlyCloudPct >= 65, detail: `earlyCloud=${profile.evolution.earlyCloudPct}` },
    { name: "dense_overcast_is_dense", pass: selected.sceneId !== 23 || profile.light.denseFraction >= 0.5, detail: `denseFraction=${profile.light.denseFraction}` }
  ];
  const validity = invariantChecks.every((x) => x.pass) ? "VALID" : "INVALID";
  return {
    version: SCENE_ENGINE_VERSION,
    doctrineVersion: SCENE_DOCTRINE_VERSION,
    validity,
    decisionFamily: family.family,
    resolutionMode,
    familyReason: family.reason,
    candidateSceneIds: family.candidateSceneIds,
    sceneId: def.id,
    sceneKey: def.key,
    sceneLabel: def.label,
    score: selected.score,
    confidence: conf,
    runnerUp: selectedRunner ? { sceneId: selectedRunner.sceneId, sceneKey: selectedRunner.sceneKey, score: selectedRunner.score } : null,
    candidates: candidates.map((c): Scene24Candidate => ({ ...c, confidence: c.sceneId === selected.sceneId ? conf : c.confidence })),
    reasons: [...selected.reasons, family.reason],
    fallbackUsed: false,
    hysteresisApplied: h.applied,
    invariantChecks,
    profileSummary: profileSummary(profile)
  };
}
