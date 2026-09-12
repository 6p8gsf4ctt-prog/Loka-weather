import { buildWeeklyCarouselPlan, renderWeeklyCarousel, validateWeeklyActivation } from "../src/engine/weekly";
import type { WeeklyEditorial, WeeklyEditorialEvent, WeeklySceneReference } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_RELEASE_CANDIDATE_FAIL:${label}`);
  passed++;
}

function nextDate(offset: number): string {
  const date = new Date("2026-09-07T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function scene(date: string, dayIndex: number): WeeklySceneReference {
  return {
    source: "DAILY_V24_DECISION",
    date,
    dayIndex,
    id: 3,
    key: "ECLAIRCIES",
    title: "ÉCLAIRCIES",
    displayTitle: "BELLES ÉCLAIRCIES",
    family: "MIXED_SKY",
    masterUrl: "/masters24/03_ECLAIRCIES.png",
    visualIcon: "partly",
    emoji: "⛅",
    decisionVersion: "2.0.3",
    doctrineVersion: "2.0.3",
    validity: "VALID",
    confidence: "HIGH",
    resolutionMode: "DIRECT"
  };
}

function event(index: number): WeeklyEditorialEvent {
  const date = nextDate(index);
  return {
    id: `wind:${date}`,
    type: "WIND",
    startDate: date,
    endDate: date,
    title: "Vent fort",
    body: "Des rafales soutenues sont possibles.",
    activities: [],
    scene: scene(date, index)
  };
}

function editorial(count: number): WeeklyEditorial {
  const events = Array.from({ length: count }, (_, index) => event(index));
  return {
    version: "0.1.0",
    citySlug: "tarnos",
    startDate: "2026-09-07",
    endDate: "2026-09-13",
    status: count ? "EVENTS" : "CALM",
    overview: {
      title: count ? "La semaine à Tarnos" : "Une semaine calme à Tarnos",
      body: count ? "La semaine sera marquée par un épisode venteux." : "La semaine restera stable.",
      scene: scene("2026-09-07", 0)
    },
    dailySummaries: Array.from({ length: 7 }, (_, dayIndex) => ({
      date: nextDate(dayIndex),
      dayIndex,
      minTemperatureC: 12 + dayIndex,
      maxTemperatureC: 20 + dayIndex,
      scene: scene(nextDate(dayIndex), dayIndex)
    })),
    dailyHighlights: [],
    dailyCardDetails: [],
    events,
    signature: "Ici, cette semaine."
  };
}

for (const count of [0, 1, 2, 3, 4]) {
  const publication = editorial(count);
  const plan = buildWeeklyCarouselPlan(publication);
  const validation = validateWeeklyActivation(publication, plan);
  const html = renderWeeklyCarousel(publication);
  const canvasCount = html.match(/class="carousel-canvas"/g)?.length ?? 0;
  ok(plan.slides.length === count + 1, `adaptive_slide_count_${count}`);
  ok(validation.ok, `activation_ready_${count}`);
  ok(canvasCount === count + 1, `preview_canvas_count_${count}`);
  ok(html.includes('"source":"CAROUSEL"'), `story_source_${count}`);
  ok(count === 0 ? html.includes("Une semaine calme à Tarnos") : html.includes(`data-event-id="wind:${nextDate(0)}"`), `preview_identity_${count}`);
}

const fiveEvents = editorial(5);
const fiveValidation = validateWeeklyActivation(fiveEvents, buildWeeklyCarouselPlan(fiveEvents));
ok(!fiveValidation.ok, "fifth_event_is_blocked");
ok(fiveValidation.checks.find((check) => check.id === "publication_limit")?.ok === false, "fifth_event_limit_is_explicit");
ok(fiveValidation.checks.every((check) => check.id !== "story_relay" || check.ok), "relay_remains_valid_when_limit_blocks");

console.log(`WEEKLY_RELEASE_CANDIDATE ${passed}/28 PASS`);
