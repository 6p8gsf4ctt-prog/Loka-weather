import { CITIES } from "../src/config/cities";
import {
  buildDailyStoryDeckData,
  calculateMoonPresentation,
  DAILY_STORY_DECK_HOURS,
  DAILY_STORY_DECK_VERSION,
  precipitationPresentationForStoryHour
} from "../src/engine/dailyStoryDeck";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ConsensusHour, ModelForecast } from "../src/types";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`DAILY_STORY_DECK_FAIL:${label}`);
  passed++;
}

const date = "2026-10-06";

function consensusPoint(hour: number): ConsensusHour {
  return {
    time: `${date}T${String(hour).padStart(2, "0")}:00`,
    temperatureC: 12 + hour * 0.55,
    apparentTemperatureC: 11 + hour * 0.5,
    precipitationMm: hour >= 19 ? 0.4 : 0,
    cloudCoverPct: hour < 8 ? 72 : hour < 18 ? 34 : 66,
    cloudCoverLowPct: 20,
    cloudCoverMidPct: 30,
    cloudCoverHighPct: 15,
    cloudLayerModelCount: 5,
    windSpeedKmh: 18,
    windGustKmh: 31 + hour,
    modelCount: 5,
    temperatureSpreadC: 1.2,
    precipitationSupport: hour >= 19 ? 0.7 : 0.1,
    rainCodeSupport: hour >= 19 ? 0.6 : 0.1,
    showerSupport: 0.2,
    thunderstormSupport: 0.05,
    fogSupport: 0.05
  };
}

function consensus(): Map<string, ConsensusHour> {
  const points = Array.from({ length: 24 }, (_, hour) => consensusPoint(hour));
  return new Map(points.map((point) => [point.time, point]));
}

const forecasts: ModelForecast[] = Array.from({ length: 5 }, (_, index) => ({
  modelId: `model-${index + 1}`,
  family: "noaa",
  weight: 0.2,
  fetchedAt: `${date}T00:00:00Z`,
  latitude: CITIES.tarnos.latitude,
  longitude: CITIES.tarnos.longitude,
  hourly: []
}));

const completeConsensus = consensus();
const payload = buildCandidateProduct(
  CITIES.tarnos,
  date,
  completeConsensus,
  forecasts,
  {},
  "daily-story-deck-test"
);
const deck = payload.storyDeck;

ok(deck?.version === DAILY_STORY_DECK_VERSION && deck.frame === "DAILY_STORY_SHARED_V2", "deck_contract_is_versioned");
ok(deck?.slides.map((slide) => slide.id).join(",") === "OVERVIEW,HOURLY_EARLY,HOURLY_LATE,DAYLIGHT,MOON,SUMMARY", "six_story_sequence_is_fixed");
ok(deck?.slides.find((slide) => slide.id === "DAYLIGHT")?.title === "DE L’AUBE AU CRÉPUSCULE", "daylight_story_uses_the_validated_public_title");
ok(deck?.slides.map((slide) => slide.position).join(",") === "1,2,3,4,5,6", "story_positions_are_explicit");
ok(DAILY_STORY_DECK_HOURS.join(",") === Array.from({ length: 20 }, (_, index) => index + 4).join(","), "hour_contract_is_every_hour_from_four_to_twenty_three");
ok(deck?.hourly.points.length === 20 && deck.hourly.availableCount === 20 && deck.hourly.complete, "all_twenty_hourly_points_are_available");
ok(deck?.hourly.points.every((point, index) => point.hour === index + 4 && point.sourceTime?.endsWith(`${String(index + 4).padStart(2, "0")}:00`) === true) === true, "hourly_points_are_exact_not_interpolated");
ok(payload.hourly.length === CITIES.tarnos.displayHours.length && payload.hourly.map((point) => point.hour).join(",") === CITIES.tarnos.displayHours.join(","), "legacy_publication_hours_are_unchanged");
ok(deck?.overview.conditionTitle === payload.scene.label && deck.overview.minimumC === payload.temperatures.minC && deck.overview.maximumC === payload.temperatures.maxC, "overview_reuses_official_daily_data");
ok(deck?.summary.primaryLine === payload.editorial.visual.primaryLine && deck.summary.secondaryLine === payload.editorial.visual.secondaryLine, "summary_reuses_official_editorial_copy");
ok(deck?.summary.legendText === `${payload.editorial.social.paragraph1}\n\n${payload.editorial.social.paragraph2}`, "summary_reuses_official_legend");
ok(Boolean(deck?.daylight.sunrise && deck.daylight.sunset && deck.daylight.durationLabel), "daylight_data_are_ready");
ok(deck?.provenance.weather === "LOKA_MULTI_MODEL_CONSENSUS" && deck.provenance.modelCount === 5, "weather_provenance_is_explicit");

const precipitationStates = [
  { precipitationMm: 0, precipitationSupport: 0.1, rainCodeSupport: 0.1 },
  { precipitationMm: 0.3, precipitationSupport: 0.2, rainCodeSupport: 0.2 },
  { precipitationMm: 0.3, precipitationSupport: 0.4, rainCodeSupport: 0.4 },
  { precipitationMm: 0.3, precipitationSupport: 0.7, rainCodeSupport: 0.7 },
  { precipitationMm: 0.8, precipitationSupport: 0.7, rainCodeSupport: 0.7 }
].map(precipitationPresentationForStoryHour);
ok(precipitationStates.map((item) => item.state).join(",") === "NONE,LOW_RISK,DRIZZLE,DRIZZLE,RAIN", "precipitation_display_states_follow_support_and_amount");
ok(precipitationStates.map((item) => item.label).join("|") === "0 mm|Faible risque|0,3 mm|0,3 mm|0,8 mm", "precipitation_labels_never_present_a_low_support_mean_as_certain_rain");

const moon = calculateMoonPresentation(CITIES.tarnos, date);
ok(moon.illuminationPct >= 0 && moon.illuminationPct <= 100 && moon.ageDays >= 0 && moon.ageDays <= 29.6, "moon_phase_values_are_bounded");
ok(/^\d{4}-\d{2}-\d{2}$/.test(moon.nextPrincipalPhase.estimatedDate) && moon.method === "LOKA_ASTRONOMICAL_CALCULATION_V1", "moon_next_phase_is_traceable");
ok((moon.moonrise === null || /^\d{2}:\d{2}$/.test(moon.moonrise)) && (moon.moonset === null || /^\d{2}:\d{2}$/.test(moon.moonset)), "moon_times_are_local_clock_values_or_explicitly_missing");

const incompleteConsensus = consensus();
incompleteConsensus.delete(`${date}T11:00`);
const incompleteDeck = buildDailyStoryDeckData(payload, CITIES.tarnos, incompleteConsensus);
const missingHour = incompleteDeck.hourly.points.find((point) => point.hour === 11);
ok(incompleteDeck.hourly.availableCount === 19 && !incompleteDeck.hourly.complete, "missing_hour_marks_the_deck_incomplete");
ok(missingHour?.available === false && missingHour.temperatureC === null && missingHour.sourceTime === null, "missing_hour_is_never_invented_or_interpolated");

if (passed !== 20) throw new Error(`daily_story_deck_count_mismatch:${passed}`);
console.log(`DAILY_STORY_DECK ${passed}/20 PASS`);
