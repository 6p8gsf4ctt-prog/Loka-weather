import type { Scene24Candidate, Scene24Id } from "../../types";
import { areTrueNeighbors } from "./doctrine";

export function applyLocalHysteresis(
  selected: Scene24Candidate,
  candidates: Scene24Candidate[],
  previousSceneId?: Scene24Id | null
): { selected: Scene24Candidate; applied: boolean } {
  if (!previousSceneId || previousSceneId === selected.sceneId || !areTrueNeighbors(previousSceneId, selected.sceneId)) {
    return { selected, applied: false };
  }
  const previous = candidates.find((c) => c.sceneId === previousSceneId);
  if (!previous) return { selected, applied: false };
  if (selected.score - previous.score <= 4) return { selected: previous, applied: true };
  return { selected, applied: false };
}
