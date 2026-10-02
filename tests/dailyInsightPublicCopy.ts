import type { DailyInsightCandidateV2 } from "../src/engine/dailyInsight/editorialSelection";
import { dailyInsightToSharedGraphic } from "../src/engine/dailyInsight/sharedGraphicAdapter";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_INSIGHT_PUBLIC_COPY_FAIL:${label}`);
  passed++;
}

function candidate(overrides: Partial<DailyInsightCandidateV2>): DailyInsightCandidateV2 {
  return {
    id: "test", detectorId: "T08", topicKey: "test", family: "TEMPERATURE", priority: "P0",
    format: "F2_EVOLUTION_RAPIDE", claim: "EXPECTED_HIGH", valueLabel: "−10 °C",
    headline: "Grosse chute des températures entre 20 h et 23 h.", proofLine: "10 °C de moins en seulement trois heures.",
    evidence: [
      { source: "LOKA_CONSENSUS", metric: "temperature", value: 27, unit: "°C", window: "2026-10-01T20:00", detail: "Début." },
      { source: "LOKA_CONSENSUS", metric: "temperature", value: 17, unit: "°C", window: "2026-10-01T23:00", detail: "Fin." }
    ],
    score: { rarity: 20, magnitude: 20, utility: 20, localSpecificity: 15, clarity: 10, confidence: 10, base: 95, penalties: [], final: 95 },
    eligible: true, rejectionReasons: [], trace: { threshold: "test", observed: "test", sourceKeys: ["test"] },
    ...overrides
  };
}

const drop = dailyInsightToSharedGraphic(candidate({}));
ok(drop.presentation.headline === "10 °C DE MOINS" && drop.presentation.subtitle.includes("20 H") && drop.presentation.subtitle.includes("23 H"), "temperature_drop_is_unambiguous");
ok(drop.presentation.comparison?.left.value === "27 °C" && drop.presentation.comparison.right.value === "17 °C", "temperature_drop_shows_start_and_end");

const percentile = dailyInsightToSharedGraphic(candidate({
  detectorId: "T05", family: "HISTORY", format: "F1_RARETE_LOCALE", valueLabel: "BAS 5 %",
  headline: "Une fraîcheur parmi les plus marquées pour la période.", proofLine: "8 °C prévus ce matin, comparés à 450 matinées locales.",
  evidence: [
    { source: "LOKA_CONSENSUS", metric: "tminC", value: 8, unit: "°C", window: "2026-10-01", detail: "Prévision cible." },
    { source: "CLIMATE_1991_2020", metric: "tminC", value: 9.4, unit: "°C", window: "1991-2020 ±7 jours", detail: "P05 sur 450 observations." }
  ]
}));
ok(percentile.presentation.headline === "8 °C CE MATIN" && !JSON.stringify(percentile.presentation).includes("P05"), "percentile_jargon_is_hidden");
ok(percentile.presentation.subtitle.includes("5 %") && percentile.presentation.editorialLine.includes("fraîche"), "percentile_is_explained_in_plain_language");

const rareHeat = dailyInsightToSharedGraphic(candidate({
  detectorId: "T02", family: "HISTORY", format: "F1_RARETE_LOCALE", valueLabel: "6 MOIS",
  headline: "La journée la plus chaude depuis six mois pourrait se profiler.", proofLine: "Dernière valeur comparable observée le 2026-03-18.",
  evidence: [
    { source: "METEO_FRANCE_ARCHIVE", metric: "tmaxC", value: 34.2, unit: "°C", window: "2026-03-18", detail: "Dernière occurrence." },
    { source: "LOKA_CONSENSUS", metric: "tmaxC", value: 34, unit: "°C", window: "2026-10-01", detail: "Maximum prévu." }
  ]
}));
ok(rareHeat.presentation.headline === "34 °C" && rareHeat.presentation.subtitle === "", "rare_heat_uses_one_dominant_metric_without_technical_subtitle");
ok(rareHeat.presentation.editorialLine === "Une chaleur remarquable\npour la période." && rareHeat.sourceNote === "Valeur comparable observée le 18 mars.", "rare_heat_uses_the_validated_public_copy_and_semantic_line_break");

const wind = dailyInsightToSharedGraphic(candidate({
  detectorId: "V02", family: "WIND", valueLabel: "+35 KM/H", headline: "Le vent devrait se renforcer.", proofLine: "Les rafales gagneraient 35 km/h.",
  evidence: [
    { source: "LOKA_CONSENSUS", metric: "wind gust", value: 30, unit: "km/h", window: "2026-10-01T12:00", detail: "Début." },
    { source: "LOKA_CONSENSUS", metric: "wind gust", value: 65, unit: "km/h", window: "2026-10-01T17:00", detail: "Fin." }
  ]
}));
ok(wind.presentation.headline === "RAFALES EN FORTE HAUSSE" && wind.presentation.subtitle.includes("30 À 65"), "wind_message_explains_the_change");

const rain = dailyInsightToSharedGraphic(candidate({ detectorId: "R02", family: "RAIN", format: "F3_SEQUENCE", valueLabel: "18 JOURS", headline: "La pluie pourrait faire son retour après 18 jours presque secs.", proofLine: "8 mm prévus aujourd’hui." }));
ok(rain.presentation.headline === "PLUIE APRÈS 18 JOURS" && rain.presentation.comparison === null, "rain_sequence_reveals_what_the_days_mean");

const clock = dailyInsightToSharedGraphic(candidate({ detectorId: "C01", family: "CALENDAR", format: "F4_REPERE_SAISONNIER", claim: "CALENDAR_CERTAIN", valueLabel: "−1 HEURE", headline: "Cette nuit, nous passons à l’heure d’hiver.", proofLine: "À 3 h, il sera de nouveau 2 h." }));
ok(clock.presentation.headline === "CHANGEMENT D’HEURE" && clock.presentation.subtitle.includes("HEURE D’HIVER"), "clock_change_leads_with_the_event");

const marine = dailyInsightToSharedGraphic(candidate({
  detectorId: "M01", family: "MARINE", format: "F5_PHENOMENE_LOCAL", valueLabel: "11 °C", headline: "Un net contraste entre la plage et l’océan aujourd’hui.", proofLine: "29 °C dans l’air contre 18 °C dans l’eau.",
  evidence: [
    { source: "LOKA_CONSENSUS", metric: "air temperature", value: 29, unit: "°C", window: "2026-10-01", detail: "Maximum prévu." },
    { source: "OPEN_METEO_MARINE", metric: "sea surface temperature", value: 18, unit: "°C", window: "2026-10-01", detail: "Moyenne prévue." }
  ]
}));
ok(marine.presentation.headline === "11 °C D’ÉCART" && marine.presentation.comparison?.right.label === "DANS L’OCÉAN", "marine_contrast_is_immediate_and_local");

const usefulWindow = dailyInsightToSharedGraphic(candidate({ detectorId: "P302", family: "ATMOSPHERE", format: "F5_PHENOMENE_LOCAL", priority: "P3", valueLabel: "14 H — 17 H", headline: "Voici le créneau le plus favorable de la journée.", proofLine: "Une fenêtre sèche et peu venteuse." }));
ok(usefulWindow.presentation.headline.startsWith("MEILLEUR CRÉNEAU") && !usefulWindow.presentation.headline.includes("+"), "fallback_window_remains_immediately_useful");

const fog = dailyInsightToSharedGraphic(candidate({ detectorId: "B01", family: "VISIBILITY", format: "F5_PHENOMENE_LOCAL", valueLabel: "6 HEURES", headline: "Un brouillard durable pourrait tenir jusqu’en matinée.", proofLine: "Visibilité inférieure à 1 km entre 4 h et 10 h." }));
ok(fog.presentation.headline === "6 H DE BROUILLARD", "fog_duration_always_names_the_phenomenon");

ok([drop, percentile, wind, rain, clock, marine, usefulWindow, fog].every((story) => story.frame === "DAILY_STORY_SHARED_V1"), "editorial_update_never_changes_the_graphic_frame");

console.log(`DAILY_INSIGHT_PUBLIC_COPY ${passed}/13 PASS`);
