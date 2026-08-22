import type { Scene24Id } from "../../types";

/**
 * Public-facing titles for the 24 canonical weather scenes.
 *
 * The scene registry labels remain unchanged and continue to be the stable
 * identifiers used by classification, publication guards, persistence and
 * editorial learning. These titles are presentation-only.
 */
export const SCENE24_DISPLAY_TITLES: Readonly<Record<Scene24Id, string>> = Object.freeze({
  1: "PLEIN SOLEIL",
  2: "SOLEIL VOILÉ",
  3: "BELLES ÉCLAIRCIES",
  4: "CIEL CHANGEANT",
  5: "CIEL SE COUVRANT",
  6: "SOLEIL & VENT",
  7: "SOLEIL TRÈS VOILÉ",
  8: "BRUME & BROUILLARD",
  9: "CIEL COUVERT",
  10: "GRAND VENT",
  11: "AMÉLIORATION",
  12: "PLUIE SOUTENUE",
  13: "AVERSES",
  14: "ÉCLAIRCIES & VENT",
  15: "BELLE EMBELLIE",
  16: "SOLEIL & NUAGES",
  17: "ÉPAIS BROUILLARD",
  18: "TEMPS CHANGEANT",
  19: "TEMPS INSTABLE",
  20: "NUAGES & VENT",
  21: "LARGES ÉCLAIRCIES",
  22: "RISQUE D’ORAGE",
  23: "CIEL TRÈS GRIS",
  24: "PLUIE & VENT"
});

export function scene24DisplayTitle(id: Scene24Id): string {
  return SCENE24_DISPLAY_TITLES[id];
}
