import type { Scene24Id } from "../../types";

export const DOCTRINE_PRIORITY = ["THUNDER", "RAIN_WIND", "WIND", "RAIN", "VISIBILITY", "TREND", "WIND_COMBINATION", "VEIL", "CLOUD", "MIXED_SKY", "VARIABILITY", "LIGHT"] as const;

export const TRUE_NEIGHBORS: ReadonlyArray<readonly [Scene24Id, Scene24Id]> = [
  [1, 16], [2, 7], [3, 21], [4, 18], [8, 17], [9, 23], [11, 15], [12, 13],
  [6, 14], [14, 20]
];

export function areTrueNeighbors(a: Scene24Id, b: Scene24Id): boolean {
  return TRUE_NEIGHBORS.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}
