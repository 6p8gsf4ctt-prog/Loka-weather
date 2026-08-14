import type { Scene24Definition, Scene24Id, Scene24Key } from "../../types";

/**
 * LOKA — registre officiel des 24 masters météo.
 *
 * Les identifiants numériques 01–24 sont stables et proviennent de la
 * livraison finale des masters. Ce registre ne contient aucune logique
 * météorologique : il décrit uniquement le catalogue officiel des scènes.
 */
export const SCENE24_REGISTRY: readonly Scene24Definition[] = [
  { id: 1, key: "GRAND_SOLEIL", label: "GRAND SOLEIL", family: "LIGHT", description: "Ciel très dégagé, journée lumineuse et stable.", masterFileName: "01_GRAND_SOLEIL.png" },
  { id: 2, key: "SOLEIL_VOILE", label: "SOLEIL VOILÉ", family: "VEIL", description: "Soleil présent sous un voile léger, lumière douce.", masterFileName: "02_SOLEIL_VOILE.png" },
  { id: 3, key: "ECLAIRCIES", label: "ÉCLAIRCIES", family: "MIXED_SKY", description: "Alternance de passages nuageux et d'ouvertures lumineuses.", masterFileName: "03_ECLAIRCIES.png" },
  { id: 4, key: "VARIABLE_LUMINEUX", label: "VARIABLE LUMINEUX", family: "VARIABILITY", description: "Ciel changeant mais lumineux, éclaircies fréquentes.", masterFileName: "04_VARIABLE_LUMINEUX.png" },
  { id: 5, key: "DEGRADATION", label: "DÉGRADATION", family: "TREND", description: "Le ciel se charge progressivement au fil de la journée.", masterFileName: "05_DEGRADATION.png" },
  { id: 6, key: "SOLEIL_PLUS_VENT", label: "SOLEIL + VENT", family: "WIND_COMBINATION", description: "Temps lumineux avec vent sensible et ciel mobile.", masterFileName: "06_SOLEIL_PLUS_VENT.png" },
  { id: 7, key: "SOLEIL_VOILE_DENSE", label: "SOLEIL VOILÉ DENSE", family: "VEIL", description: "Lumière blanche très filtrée, voile épais et temps calme.", masterFileName: "07_SOLEIL_VOILE_DENSE.png" },
  { id: 8, key: "BRUME_BROUILLARD", label: "BRUME / BROUILLARD", family: "VISIBILITY", description: "Visibilité réduite, ambiance grise et uniforme.", masterFileName: "08_BRUME_BROUILLARD.png" },
  { id: 9, key: "COUVERT", label: "COUVERT", family: "CLOUD", description: "Ciel bas et couvert, lumière faible mais temps plutôt stable.", masterFileName: "09_COUVERT.png" },
  { id: 10, key: "VENT_FORT", label: "VENT FORT", family: "WIND", description: "Atmosphère très mobile, vent soutenu et ciel changeant.", masterFileName: "10_VENT_FORT.png" },
  { id: 11, key: "AMELIORATION", label: "AMÉLIORATION", family: "TREND", description: "Les éclaircies gagnent du terrain et la lumière revient.", masterFileName: "11_AMELIORATION.png" },
  { id: 12, key: "PLUIE_SOUTENUE", label: "PLUIE SOUTENUE", family: "RAIN", description: "Pluie durable, continue et régulière, sans vent dominant.", masterFileName: "12_PLUIE_SOUTENUE.png" },
  { id: 13, key: "AVERSES", label: "AVERSES", family: "RAIN", description: "Averses localisées, séparées par de vraies accalmies.", masterFileName: "13_AVERSES.png" },
  { id: 14, key: "ECLAIRCIES_PLUS_VENT", label: "ÉCLAIRCIES + VENT", family: "WIND_COMBINATION", description: "Alternance lumineuse avec vent marqué et ciel mobile.", masterFileName: "14_ECLAIRCIES_PLUS_VENT.png" },
  { id: 15, key: "AMELIORATION_LUMINEUSE", label: "AMÉLIORATION LUMINEUSE", family: "TREND", description: "La lumière domine, les derniers nuages se retirent.", masterFileName: "15_AMELIORATION_LUMINEUSE.png" },
  { id: 16, key: "SOLEIL_PLUS_PASSAGES_NUAGEUX", label: "SOLEIL + PASSAGES NUAGEUX", family: "LIGHT", description: "Beau temps dominant avec quelques passages temporaires.", masterFileName: "16_SOLEIL_PLUS_PASSAGES_NUAGEUX.png" },
  { id: 17, key: "BROUILLARD_DENSE", label: "BROUILLARD DENSE", family: "VISIBILITY", description: "Matière diffuse et compacte, visibilité très fortement réduite.", masterFileName: "17_BROUILLARD_DENSE.png" },
  { id: 18, key: "VARIABLE", label: "VARIABLE", family: "VARIABILITY", description: "Alternance régulière de zones claires et plus nuageuses.", masterFileName: "18_VARIABLE.png" },
  { id: 19, key: "INSTABLE", label: "INSTABLE", family: "INSTABILITY", description: "Changements rapides et désordonnés, sans phénomène dominant.", masterFileName: "19_INSTABLE.png" },
  { id: 20, key: "NUAGEUX_PLUS_VENT", label: "NUAGEUX + VENT", family: "WIND_COMBINATION", description: "Ciel chargé avec mouvement soutenu et vent bien présent.", masterFileName: "20_NUAGEUX_PLUS_VENT.png" },
  { id: 21, key: "GRANDES_ECLAIRCIES", label: "GRANDES ÉCLAIRCIES", family: "MIXED_SKY", description: "De larges trouées lumineuses s'ouvrent dans un ciel encore partagé.", masterFileName: "21_GRANDES_ECLAIRCIES.png" },
  { id: 22, key: "ORAGEUX", label: "ORAGEUX", family: "THUNDER", description: "Atmosphère lourde et menaçante, forte instabilité possible.", masterFileName: "22_ORAGEUX.png" },
  { id: 23, key: "COUVERT_DENSE", label: "COUVERT DENSE", family: "CLOUD", description: "Couverture nuageuse épaisse et uniforme, lumière atténuée.", masterFileName: "23_COUVERT_DENSE.png" },
  { id: 24, key: "PLUIE_PLUS_VENT", label: "PLUIE + VENT", family: "RAIN_WIND", description: "Pluie poussée par le vent, conditions humides et agitées.", masterFileName: "24_PLUIE_PLUS_VENT.png" }
] as const;

export const SCENE24_BY_ID = Object.fromEntries(
  SCENE24_REGISTRY.map((scene) => [scene.id, scene])
) as Record<Scene24Id, Scene24Definition>;

export const SCENE24_BY_KEY = Object.fromEntries(
  SCENE24_REGISTRY.map((scene) => [scene.key, scene])
) as Record<Scene24Key, Scene24Definition>;

export function getScene24ById(id: Scene24Id): Scene24Definition {
  return SCENE24_BY_ID[id];
}

export function getScene24ByKey(key: Scene24Key): Scene24Definition {
  return SCENE24_BY_KEY[key];
}
