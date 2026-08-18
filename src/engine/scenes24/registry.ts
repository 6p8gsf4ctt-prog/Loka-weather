import type { Scene24Definition, Scene24Id, Scene24Key } from "../../types";

const rows: Scene24Definition[] = [
  { id: 1, key: "GRAND_SOLEIL", label: "GRAND SOLEIL", family: "LIGHT", description: "Journée presque entièrement claire et stable.", masterFileName: "01_GRAND_SOLEIL.png", emoji: "☀️", visualIcon: "sun" },
  { id: 2, key: "SOLEIL_VOILE", label: "SOLEIL VOILÉ", family: "VEIL", description: "Soleil dominant sous un voile élevé léger.", masterFileName: "02_SOLEIL_VOILE.png", emoji: "🌤️", visualIcon: "veil" },
  { id: 3, key: "ECLAIRCIES", label: "ÉCLAIRCIES", family: "MIXED_SKY", description: "Ciel souvent chargé avec ouvertures ponctuelles.", masterFileName: "03_ECLAIRCIES.png", emoji: "⛅", visualIcon: "partly" },
  { id: 4, key: "VARIABLE_LUMINEUX", label: "VARIABLE LUMINEUX", family: "MIXED_SKY", description: "Alternances fréquentes mais luminosité dominante.", masterFileName: "04_VARIABLE_LUMINEUX.png", emoji: "🌤️", visualIcon: "mixed" },
  { id: 5, key: "DEGRADATION", label: "DÉGRADATION", family: "TREND", description: "Début lumineux puis ciel de plus en plus chargé.", masterFileName: "05_DEGRADATION.png", emoji: "🌥️", visualIcon: "partly" },
  { id: 6, key: "SOLEIL_PLUS_VENT", label: "SOLEIL + VENT", family: "WIND_COMBINATION", description: "Temps lumineux avec vent notable durable.", masterFileName: "06_SOLEIL_PLUS_VENT.png", emoji: "🌬️", visualIcon: "sun-wind" },
  { id: 7, key: "SOLEIL_VOILE_DENSE", label: "SOLEIL VOILÉ DENSE", family: "VEIL", description: "Voile élevé dense limitant franchement la lumière.", masterFileName: "07_SOLEIL_VOILE_DENSE.png", emoji: "🌥️", visualIcon: "veil" },
  { id: 8, key: "BRUME_BROUILLARD", label: "BRUME / BROUILLARD", family: "VISIBILITY", description: "Brume ou brouillard significatif mais limité.", masterFileName: "08_BRUME_BROUILLARD.png", emoji: "🌫️", visualIcon: "fog" },
  { id: 9, key: "COUVERT", label: "COUVERT", family: "CLOUD", description: "Ciel couvert stable sans caractère exceptionnel.", masterFileName: "09_COUVERT.png", emoji: "☁️", visualIcon: "cloud" },
  { id: 10, key: "VENT_FORT", label: "VENT FORT", family: "WIND", description: "Vent fort comme caractère principal de la journée.", masterFileName: "10_VENT_FORT.png", emoji: "🌬️", visualIcon: "wind" },
  { id: 11, key: "AMELIORATION", label: "AMÉLIORATION", family: "TREND", description: "Amélioration nette sans fin de journée franchement lumineuse.", masterFileName: "11_AMELIORATION.png", emoji: "⛅", visualIcon: "partly" },
  { id: 12, key: "PLUIE_SOUTENUE", label: "PLUIE SOUTENUE", family: "RAIN", description: "Pluie durable et structurante.", masterFileName: "12_PLUIE_SOUTENUE.png", emoji: "🌧️", visualIcon: "rain" },
  { id: 13, key: "AVERSES", label: "AVERSES", family: "RAIN", description: "Précipitations intermittentes séparées par des accalmies.", masterFileName: "13_AVERSES.png", emoji: "🌦️", visualIcon: "shower" },
  { id: 14, key: "ECLAIRCIES_PLUS_VENT", label: "ÉCLAIRCIES + VENT", family: "WIND_COMBINATION", description: "Éclaircies et passages nuageux sous vent notable.", masterFileName: "14_ECLAIRCIES_PLUS_VENT.png", emoji: "🌬️", visualIcon: "sun-wind" },
  { id: 15, key: "AMELIORATION_LUMINEUSE", label: "AMÉLIORATION LUMINEUSE", family: "TREND", description: "Début franchement chargé puis fin nettement lumineuse.", masterFileName: "15_AMELIORATION_LUMINEUSE.png", emoji: "🌤️", visualIcon: "partly" },
  { id: 16, key: "SOLEIL_PLUS_PASSAGES_NUAGEUX", label: "SOLEIL + PASSAGES NUAGEUX", family: "LIGHT", description: "Soleil dominant avec passages nuageux temporaires.", masterFileName: "16_SOLEIL_PLUS_PASSAGES_NUAGEUX.png", emoji: "⛅", visualIcon: "partly" },
  { id: 17, key: "BROUILLARD_DENSE", label: "BROUILLARD DENSE", family: "VISIBILITY", description: "Brouillard dense et durable structurant la journée.", masterFileName: "17_BROUILLARD_DENSE.png", emoji: "🌫️", visualIcon: "fog" },
  { id: 18, key: "VARIABLE", label: "VARIABLE", family: "VARIABILITY", description: "Alternance équilibrée sans direction nette.", masterFileName: "18_VARIABLE.png", emoji: "🌥️", visualIcon: "mixed" },
  { id: 19, key: "INSTABLE", label: "INSTABLE", family: "INSTABILITY", description: "Journée désordonnée avec plusieurs états et retournements.", masterFileName: "19_INSTABLE.png", emoji: "🌦️", visualIcon: "shower" },
  { id: 20, key: "NUAGEUX_PLUS_VENT", label: "NUAGEUX + VENT", family: "WIND_COMBINATION", description: "Ciel majoritairement nuageux avec vent notable.", masterFileName: "20_NUAGEUX_PLUS_VENT.png", emoji: "🌬️", visualIcon: "cloud-wind" },
  { id: 21, key: "GRANDES_ECLAIRCIES", label: "GRANDES ÉCLAIRCIES", family: "MIXED_SKY", description: "Longues périodes lumineuses dans une journée partagée.", masterFileName: "21_GRANDES_ECLAIRCIES.png", emoji: "🌤️", visualIcon: "partly" },
  { id: 22, key: "ORAGEUX", label: "ORAGEUX", family: "THUNDER", description: "Risque orageux robuste structurant la journée.", masterFileName: "22_ORAGEUX.png", emoji: "⛈️", visualIcon: "thunder" },
  { id: 23, key: "COUVERT_DENSE", label: "COUVERT DENSE", family: "CLOUD", description: "Couche dense, uniforme et persistante.", masterFileName: "23_COUVERT_DENSE.png", emoji: "☁️", visualIcon: "cloud" },
  { id: 24, key: "PLUIE_PLUS_VENT", label: "PLUIE + VENT", family: "RAIN_WIND", description: "Pluie et vent se chevauchent suffisamment pour définir la journée.", masterFileName: "24_PLUIE_PLUS_VENT.png", emoji: "🌧️", visualIcon: "rain-wind" }
];

export const SCENES24 = rows as readonly Scene24Definition[];
const byId = new Map(rows.map((x) => [x.id, x]));
const byKey = new Map(rows.map((x) => [x.key, x]));

export function scene24ById(id: Scene24Id): Scene24Definition {
  const value = byId.get(id);
  if (!value) throw new Error(`unknown_scene24_id:${id}`);
  return value;
}
export function scene24ByKey(key: Scene24Key): Scene24Definition {
  const value = byKey.get(key);
  if (!value) throw new Error(`unknown_scene24_key:${key}`);
  return value;
}
export function masterUrlForScene(id: Scene24Id): string {
  return `/masters24/${scene24ById(id).masterFileName}`;
}
