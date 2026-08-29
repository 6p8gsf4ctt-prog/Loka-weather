import type { EditorialFacts, Scene24Confidence, Scene24Id, Scene24Key, SkyBand } from "../src/types";
import type { EditorialDaypart, EditorialFactsV21, EditorialRainRole, EditorialTemperatureSalience } from "../src/engine/editorial24/facts";
import { buildHashtags } from "../src/engine/editorial24/hashtags";
import { buildSocialEditorial } from "../src/engine/editorial24/social";
import { buildVisualEditorial } from "../src/engine/editorial24/visual";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`EDITORIAL_LEARNING_REGRESSION_FAIL:${label}`);
  passed++;
}
function includes(haystack: string, needle: string, label: string): void {
  ok(haystack.toLowerCase().includes(needle.toLowerCase()), label);
}
function excludes(haystack: string, needle: string, label: string): void {
  ok(!haystack.toLowerCase().includes(needle.toLowerCase()), label);
}
function count(source: string, value: string): number {
  return source.split(value).length - 1;
}

interface HistoricalCase {
  id: number;
  date: string;
  emoji: string;
  sceneId: Scene24Id;
  sceneKey: Scene24Key;
  trajectory: EditorialFacts["trajectory"];
  startSky: SkyBand;
  middleSky: SkyBand;
  endSky: SkyBand;
  transitionStrength: EditorialFacts["transitionStrength"];
  brightestPeriod: EditorialFacts["brightestPeriod"];
  cloudiestPeriod: EditorialFacts["cloudiestPeriod"];
  precipitation: EditorialFacts["precipitation"];
  rainRole: EditorialRainRole;
  rainFirstHour: number | null;
  rainLastHour: number | null;
  rainPeriod: EditorialDaypart | null;
  transitionFirstHour: number | null;
  transitionDecisiveHour: number | null;
  transitionPeriod: EditorialDaypart | null;
  temperature: EditorialFacts["temperature"];
  temperatureRiseC: number;
  temperatureSalience: EditorialTemperatureSalience;
  peakHour: number | null;
  peakPeriod: EditorialDaypart | null;
  confidence?: Scene24Confidence;
  uncertain?: boolean;
}

function factsFor(c: HistoricalCase): EditorialFactsV21 {
  return {
    sceneId: c.sceneId,
    sceneKey: c.sceneKey,
    trajectory: c.trajectory,
    startSky: c.startSky,
    middleSky: c.middleSky,
    endSky: c.endSky,
    transitionStrength: c.transitionStrength,
    brightestPeriod: c.brightestPeriod,
    cloudiestPeriod: c.cloudiestPeriod,
    precipitation: c.precipitation,
    wind: { kind: "NONE", maxGustKmh: 40 },
    fog: { kind: "NONE", hours: 0 },
    temperature: c.temperature,
    confidence: c.confidence ?? "HIGH",
    modelSignalUncertain: c.uncertain ?? false,
    intelligence: {
      rain: {
        role: c.rainRole,
        firstHour: c.rainFirstHour,
        lastHour: c.rainLastHour,
        period: c.rainPeriod
      },
      transition: {
        direction: c.trajectory === "IMPROVING" || c.trajectory === "DEGRADING" ? c.trajectory : null,
        firstChangeHour: c.transitionFirstHour,
        decisiveHour: c.transitionDecisiveHour,
        period: c.transitionPeriod,
        source: c.transitionFirstHour === null ? "NONE" : "DISPLAY_HOURS"
      },
      temperature: {
        riseC: c.temperatureRiseC,
        salience: c.temperatureSalience,
        peakHour: c.peakHour,
        peakPeriod: c.peakPeriod
      },
      priority: {
        primary: c.rainRole === "SUSTAINED" ? "PRECIPITATION" : "SKY",
        secondary: c.rainRole === "SECONDARY" ? ["PRECIPITATION", ...(c.temperatureSalience === "NORMAL" ? [] : ["TEMPERATURE" as const])] : c.temperatureSalience === "NORMAL" ? [] : ["TEMPERATURE"]
      }
    }
  };
}

// Snapshots sémantiques issus de l’export LOKA_EDITORIAL_LEARNING du 29/08/2026.
// Ils ne cherchent pas à reproduire mot pour mot les retouches utilisateur : ils figent
// uniquement les décisions éditoriales généralisables validées par l’historique.
const CASES: HistoricalCase[] = [
  {
    id: 1, date: "2026-08-18", emoji: "🌤️", sceneId: 21, sceneKey: "GRANDES_ECLAIRCIES",
    trajectory: "IMPROVING", startSky: "CLOUDY", middleSky: "BRIGHT", endSky: "CLEAR", transitionStrength: "STRONG",
    brightestPeriod: "LATE", cloudiestPeriod: "EARLY", precipitation: { kind: "DRY", hours: 0, totalMm: 0 },
    rainRole: "NONE", rainFirstHour: null, rainLastHour: null, rainPeriod: null,
    transitionFirstHour: 12, transitionDecisiveHour: 14, transitionPeriod: "AFTERNOON",
    temperature: { minC: 21, maxC: 26, character: "WARM" }, temperatureRiseC: 5, temperatureSalience: "NORMAL", peakHour: 18, peakPeriod: "LATE_AFTERNOON"
  },
  {
    id: 2, date: "2026-08-19", emoji: "🌥️", sceneId: 18, sceneKey: "VARIABLE",
    trajectory: "STABLE", startSky: "MIXED", middleSky: "MIXED", endSky: "MIXED", transitionStrength: "NONE",
    brightestPeriod: "MID", cloudiestPeriod: "EARLY", precipitation: { kind: "DRY", hours: 0, totalMm: 0 },
    rainRole: "NONE", rainFirstHour: null, rainLastHour: null, rainPeriod: null,
    transitionFirstHour: null, transitionDecisiveHour: null, transitionPeriod: null,
    temperature: { minC: 19, maxC: 25, character: "WARM" }, temperatureRiseC: 6, temperatureSalience: "NORMAL", peakHour: 16, peakPeriod: "AFTERNOON", confidence: "LOW"
  },
  {
    id: 3, date: "2026-08-20", emoji: "🌧️", sceneId: 12, sceneKey: "PLUIE_SOUTENUE",
    trajectory: "STABLE", startSky: "DENSE", middleSky: "DENSE", endSky: "DENSE", transitionStrength: "NONE",
    brightestPeriod: "EARLY", cloudiestPeriod: "ALL_DAY", precipitation: { kind: "RAIN", hours: 16, totalMm: 9.423 },
    rainRole: "SUSTAINED", rainFirstHour: 6, rainLastHour: 22, rainPeriod: "ALL_DAY",
    transitionFirstHour: null, transitionDecisiveHour: null, transitionPeriod: null,
    temperature: { minC: 19, maxC: 22, character: "WARM" }, temperatureRiseC: 3, temperatureSalience: "NORMAL", peakHour: 16, peakPeriod: "AFTERNOON"
  },
  {
    id: 4, date: "2026-08-21", emoji: "🌧️", sceneId: 12, sceneKey: "PLUIE_SOUTENUE",
    trajectory: "STABLE", startSky: "CLOUDY", middleSky: "CLOUDY", endSky: "DENSE", transitionStrength: "NONE",
    brightestPeriod: "EARLY", cloudiestPeriod: "LATE", precipitation: { kind: "RAIN", hours: 12, totalMm: 7.366 },
    rainRole: "SUSTAINED", rainFirstHour: 4, rainLastHour: 18, rainPeriod: "ALL_DAY",
    transitionFirstHour: null, transitionDecisiveHour: null, transitionPeriod: null,
    temperature: { minC: 19, maxC: 21, character: "MILD" }, temperatureRiseC: 2, temperatureSalience: "NORMAL", peakHour: 14, peakPeriod: "AFTERNOON", uncertain: true
  },
  {
    id: 5, date: "2026-08-22", emoji: "⛅", sceneId: 16, sceneKey: "SOLEIL_PLUS_PASSAGES_NUAGEUX",
    trajectory: "VARIABLE", startSky: "CLEAR", middleSky: "CLEAR", endSky: "BRIGHT", transitionStrength: "WEAK",
    brightestPeriod: "MID", cloudiestPeriod: "LATE", precipitation: { kind: "DRY", hours: 0, totalMm: 0 },
    rainRole: "NONE", rainFirstHour: null, rainLastHour: null, rainPeriod: null,
    transitionFirstHour: null, transitionDecisiveHour: null, transitionPeriod: null,
    temperature: { minC: 14, maxC: 26, character: "WARM" }, temperatureRiseC: 12, temperatureSalience: "STRONG", peakHour: 16, peakPeriod: "AFTERNOON", confidence: "MEDIUM"
  },
  {
    id: 6, date: "2026-08-23", emoji: "🌥️", sceneId: 5, sceneKey: "DEGRADATION",
    trajectory: "DEGRADING", startSky: "CLEAR", middleSky: "CLEAR", endSky: "MIXED", transitionStrength: "STRONG",
    brightestPeriod: "MID", cloudiestPeriod: "LATE", precipitation: { kind: "RAIN", hours: 1, totalMm: 1.552 },
    rainRole: "SECONDARY", rainFirstHour: 22, rainLastHour: 22, rainPeriod: "EVENING",
    transitionFirstHour: 18, transitionDecisiveHour: 20, transitionPeriod: "EVENING",
    temperature: { minC: 19, maxC: 32, character: "HOT" }, temperatureRiseC: 13, temperatureSalience: "STRONG", peakHour: 16, peakPeriod: "AFTERNOON", uncertain: true
  },
  {
    id: 7, date: "2026-08-24", emoji: "🌥️", sceneId: 5, sceneKey: "DEGRADATION",
    trajectory: "DEGRADING", startSky: "CLEAR", middleSky: "BRIGHT", endSky: "MIXED", transitionStrength: "STRONG",
    brightestPeriod: "EARLY", cloudiestPeriod: "LATE", precipitation: { kind: "RAIN", hours: 1, totalMm: 0.32 },
    rainRole: "SECONDARY", rainFirstHour: null, rainLastHour: null, rainPeriod: null,
    transitionFirstHour: 12, transitionDecisiveHour: 16, transitionPeriod: "AFTERNOON",
    temperature: { minC: 21, maxC: 30, character: "HOT" }, temperatureRiseC: 9, temperatureSalience: "NOTABLE", peakHour: 16, peakPeriod: "AFTERNOON", uncertain: true
  },
  {
    id: 8, date: "2026-08-25", emoji: "🌧️", sceneId: 12, sceneKey: "PLUIE_SOUTENUE",
    trajectory: "VARIABLE", startSky: "CLOUDY", middleSky: "CLOUDY", endSky: "MIXED", transitionStrength: "WEAK",
    brightestPeriod: "LATE", cloudiestPeriod: "EARLY", precipitation: { kind: "RAIN", hours: 3, totalMm: 0.797 },
    rainRole: "SECONDARY", rainFirstHour: 10, rainLastHour: 10, rainPeriod: "MORNING",
    transitionFirstHour: null, transitionDecisiveHour: null, transitionPeriod: null,
    temperature: { minC: 22, maxC: 25, character: "WARM" }, temperatureRiseC: 3, temperatureSalience: "NORMAL", peakHour: 16, peakPeriod: "AFTERNOON", confidence: "LOW"
  },
  {
    id: 9, date: "2026-08-26", emoji: "🌥️", sceneId: 7, sceneKey: "SOLEIL_VOILE_DENSE",
    trajectory: "VARIABLE", startSky: "DENSE", middleSky: "CLOUDY", endSky: "CLOUDY", transitionStrength: "WEAK",
    brightestPeriod: "MID", cloudiestPeriod: "EARLY", precipitation: { kind: "DRY", hours: 0, totalMm: 0 },
    rainRole: "NONE", rainFirstHour: null, rainLastHour: null, rainPeriod: null,
    transitionFirstHour: null, transitionDecisiveHour: null, transitionPeriod: null,
    temperature: { minC: 19, maxC: 34, character: "VERY_HOT" }, temperatureRiseC: 15, temperatureSalience: "STRONG", peakHour: 16, peakPeriod: "AFTERNOON"
  },
  {
    id: 10, date: "2026-08-27", emoji: "🌦️", sceneId: 11, sceneKey: "AMELIORATION",
    trajectory: "IMPROVING", startSky: "DENSE", middleSky: "DENSE", endSky: "CLOUDY", transitionStrength: "MODERATE",
    brightestPeriod: "LATE", cloudiestPeriod: "EARLY", precipitation: { kind: "RAIN", hours: 3, totalMm: 1.527 },
    rainRole: "SECONDARY", rainFirstHour: 8, rainLastHour: 16, rainPeriod: "MIDDAY",
    transitionFirstHour: 18, transitionDecisiveHour: 20, transitionPeriod: "EVENING",
    temperature: { minC: 19, maxC: 25, character: "WARM" }, temperatureRiseC: 6, temperatureSalience: "NORMAL", peakHour: 18, peakPeriod: "LATE_AFTERNOON", confidence: "LOW", uncertain: true
  },
  {
    id: 11, date: "2026-08-28", emoji: "🌥️", sceneId: 5, sceneKey: "DEGRADATION",
    trajectory: "DEGRADING", startSky: "CLEAR", middleSky: "CLEAR", endSky: "BRIGHT", transitionStrength: "MODERATE",
    brightestPeriod: "EARLY", cloudiestPeriod: "LATE", precipitation: { kind: "DRY", hours: 0, totalMm: 0 },
    rainRole: "NONE", rainFirstHour: null, rainLastHour: null, rainPeriod: null,
    transitionFirstHour: 18, transitionDecisiveHour: 20, transitionPeriod: "EVENING",
    temperature: { minC: 18, maxC: 25, character: "WARM" }, temperatureRiseC: 7, temperatureSalience: "NOTABLE", peakHour: 16, peakPeriod: "AFTERNOON", confidence: "MEDIUM"
  }
];

const outputs = new Map<number, { facts: EditorialFactsV21; primary: string; secondary: string; paragraph1: string; paragraph2: string; caption: string; hashtags: string }>();
for (const c of CASES) {
  const facts = factsFor(c);
  const visual = buildVisualEditorial(facts);
  const hashtags = buildHashtags("tarnos", "Tarnos", facts);
  const social = buildSocialEditorial("tarnos", "Tarnos", facts, c.emoji, hashtags);

  ok(visual.subtitle === "", `case_${c.id}_subtitle_retired`);
  ok(visual.primaryLine.length > 0 && visual.primaryLine.length <= 80, `case_${c.id}_primary_bounds`);
  ok(visual.secondaryLine.length > 0 && visual.secondaryLine.length <= 120, `case_${c.id}_secondary_bounds`);
  ok(count(social.caption, "Ici, aujourd’hui.") === 1, `case_${c.id}_signature_once`);
  ok(count(social.caption, "@loka.tarnos") === 1, `case_${c.id}_handle_once`);
  ok(hashtags === "#Tarnos #MeteoTarnos #Landes #MeteoLandes #LOKA", `case_${c.id}_stable_hashtags`);

  for (const banned of ["heures humides", "fenêtre utile", "précipitations restent dominantes", "d’après le consensus", "la tendance la plus probable indique"]) {
    excludes(`${visual.primaryLine} ${visual.secondaryLine} ${social.caption}`, banned, `case_${c.id}_ban_${banned}`);
  }

  if (c.rainRole === "SECONDARY") {
    excludes(visual.primaryLine, "Pluie durable", `case_${c.id}_secondary_rain_not_primary`);
    excludes(visual.secondaryLine, "dominantes", `case_${c.id}_secondary_rain_not_dominant_visual`);
    excludes(social.caption, "dominantes", `case_${c.id}_secondary_rain_not_dominant_social`);
  }
  if (c.rainRole === "SUSTAINED") {
    includes(visual.primaryLine, "Pluie durable", `case_${c.id}_sustained_rain_primary`);
    includes(social.caption, "pluie", `case_${c.id}_sustained_rain_social`);
  }

  outputs.set(c.id, { facts, primary: visual.primaryLine, secondary: visual.secondaryLine, paragraph1: social.paragraph1, paragraph2: social.paragraph2, caption: social.caption, hashtags });
}

function out(id: number) {
  const value = outputs.get(id);
  if (!value) throw new Error(`missing_case_${id}`);
  return value;
}

// 18 août — la chronologie robuste doit remonter jusqu’à l’heure utile.
includes(out(1).primary, "Matinée nuageuse", "case_1_cloudy_morning");
includes(out(1).primary, "14h", "case_1_exact_transition_hour");
includes(out(1).secondary, "14h", "case_1_secondary_transition_hour");

// 19 août — ne pas inventer de pluie et valoriser la température utile sans sur-interpréter une tendance faible.
includes(out(2).primary, "Soleil et nuages", "case_2_variable_identity");
includes(out(2).secondary, "25 °C", "case_2_temperature_useful");
includes(out(2).secondary, "sans pluie", "case_2_dry_signal");

// 20 août — pluie réellement structurante : formulation forte autorisée, jargon technique interdit.
includes(out(3).primary, "Peu de véritables accalmies", "case_3_sustained_continuity");
includes(out(3).paragraph1, "passer entre les gouttes", "case_3_lived_rain_experience");

// 21 août — même journée humide, mais l’amélioration du soir doit être visible.
includes(out(4).primary, "Plus calme en soirée", "case_4_evening_escape_window");
includes(out(4).paragraph1, "plus calme en soirée", "case_4_evening_social_window");

// 22 août — journée sèche et lumineuse : la température complète l’information sans voler la dominante.
includes(out(5).primary, "Soleil dominant", "case_5_sun_primary");
includes(out(5).secondary, "Temps sec toute la journée", "case_5_dry_all_day");
includes(out(5).secondary, "26 °C", "case_5_max_temperature");

// 23 août — pluie tardive secondaire : soleil/chaleur d’abord, pluie ensuite et temporalisée.
includes(out(6).primary, "Soleil dominant", "case_6_sun_before_late_rain");
includes(out(6).primary, "soirée", "case_6_evening_degradation");
includes(out(6).secondary, "32 °C", "case_6_heat_salient");
includes(out(6).secondary, "1,6 mm", "case_6_rain_amount_supports_story");
includes(out(6).secondary, "fin de journée", "case_6_late_rain_timing");

// 24 août — très faible pluie : ne jamais transformer la journée en journée pluvieuse.
includes(out(7).secondary, "30 °C", "case_7_heat_before_tiny_rain");
includes(out(7).secondary, "très peu de pluie", "case_7_tiny_rain_downgraded");
includes(out(7).caption, "sans véritable dégradation", "case_7_no_false_degradation");

// 25 août — ancienne scène PLUIE_SOUTENUE mais faits réels secondaires : le texte doit corriger la sévérité de la scène.
includes(out(8).primary, "Nuages nombreux", "case_8_scene_sanity_clouds_first");
includes(out(8).primary, "le matin", "case_8_morning_rain_timing");
includes(out(8).secondary, "25 °C", "case_8_temperature_context");
includes(out(8).secondary, "seulement un peu de pluie", "case_8_secondary_rain_guardrail");

// 26 août — chaleur très marquée : la température devient l’information secondaire prioritaire.
includes(out(9).primary, "Ciel souvent voilé", "case_9_veil_softened");
includes(out(9).primary, "Quelques éclaircies", "case_9_some_brightness");
includes(out(9).secondary, "34 °C", "case_9_very_hot_secondary");
includes(out(9).caption, "chaleur", "case_9_heat_in_caption");

// 27 août — contradiction historique corrigée : rainRole SECONDARY interdit toute notion de pluie dominante.
includes(out(10).primary, "Début chargé", "case_10_loaded_start");
includes(out(10).secondary, "Quelques averses possibles", "case_10_secondary_showers_wording");
includes(out(10).secondary, "1,5 mm", "case_10_amount_kept_as_support");
includes(out(10).secondary, "amélioration progressive", "case_10_improvement_trajectory");
includes(out(10).caption, "amélioration progressive", "case_10_social_improvement");

// 28 août — journée très lumineuse malgré la scène DÉGRADATION : la dégradation ne doit pas être dramatisée.
includes(out(11).primary, "Soleil dominant", "case_11_dominant_sun");
includes(out(11).primary, "fin d’après-midi", "case_11_clouds_late");
includes(out(11).secondary, "jusqu’en milieu d’après-midi", "case_11_bright_until_mid_afternoon");
includes(out(11).caption, "fin d’après-midi", "case_11_social_late_clouds");
excludes(out(11).caption, "dégradation", "case_11_no_scene_label_dramatization");

ok(CASES.length === 11, "historical_case_count_11");
console.log(`EDITORIAL_LEARNING_REGRESSION ${CASES.length}/11 cases PASS (${passed} invariants)`);
