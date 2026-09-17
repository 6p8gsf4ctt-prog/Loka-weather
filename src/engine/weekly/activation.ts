import { weeklyRangeForDate } from "./schedule";
import { WEEKLY_DAILY_CARD_HOURS } from "./editorial";
import type { WeeklyEditorial } from "./editorial";
import { WEEKLY_CAROUSEL_MAX_EVENT_SLIDES, WEEKLY_OVERVIEW_MASTER_URL, WEEKLY_SLIDE2_DAILY_FEED_GRID } from "./carousel";
import type { WeeklyCarouselPlan } from "./carousel";
import { PICTOGRAM_LIBRARY_VERSION, hourlyConditionToPictogram, visualIconToPictogram } from "../../ui/pictogramLibrary";
import { LOKA_DAILY_FEED_FRAME } from "../../ui/feedFrame";

export interface WeeklyActivationCheck {
  id: string;
  ok: boolean;
  detail: string;
}

export interface WeeklyActivationValidation {
  status: "READY" | "BLOCKED";
  ok: boolean;
  checks: WeeklyActivationCheck[];
}

function check(id: string, ok: boolean, detail: string): WeeklyActivationCheck {
  return { id, ok, detail };
}

function isValidDailyV24Scene(scene: WeeklyEditorial["overview"]["scene"]): boolean {
  return scene.source === "DAILY_V24_DECISION"
    && scene.validity === "VALID"
    && /^\d{4}-\d{2}-\d{2}$/.test(scene.date)
    && scene.dayIndex >= 0
    && scene.dayIndex <= 6
    && scene.decisionVersion.startsWith("2.0")
    && scene.doctrineVersion.startsWith("2.0");
}

function factMatches(fact: WeeklyEditorial["slide1"]["coldestMorning"]): typeof fact.matches {
  return fact.matches.length ? fact.matches : [{
    date: fact.date,
    dayIndex: fact.dayIndex,
    temperatureC: fact.temperatureC,
    sourceHour: fact.sourceHour
  }];
}

function sameFactMatches(
  left: WeeklyEditorial["slide1"]["coldestMorning"],
  right: WeeklyEditorial["slide1"]["coldestMorning"]
): boolean {
  const leftMatches = factMatches(left);
  const rightMatches = factMatches(right);
  return leftMatches.length === rightMatches.length
    && leftMatches.every((match, index) =>
      match.date === rightMatches[index]?.date
      && match.dayIndex === rightMatches[index]?.dayIndex
      && match.sourceHour === rightMatches[index]?.sourceHour
      && match.temperatureC === rightMatches[index]?.temperatureC
    );
}

function shortDateLabel(date: string): string {
  const parts = new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris", weekday: "short", day: "numeric"
  }).formatToParts(new Date(`${date}T12:00:00Z`));
  const weekday = parts.find((part) => part.type === "weekday")?.value.replace(/\.$/, "").toLocaleUpperCase("fr-FR") ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";
  return `${weekday}. ${day}`;
}

function isTraceableTemperatureFact(
  fact: WeeklyEditorial["slide1"]["coldestMorning"],
  summaries: WeeklyEditorial["dailySummaries"],
  minimumHour: number,
  maximumHour: number
): boolean {
  const matches = factMatches(fact);
  return matches.length > 0
    && matches[0]?.date === fact.date
    && matches[0]?.dayIndex === fact.dayIndex
    && matches[0]?.temperatureC === fact.temperatureC
    && matches.every((match) =>
      Number.isFinite(match.temperatureC)
      && match.sourceHour >= minimumHour
      && match.sourceHour <= maximumHour
      && summaries[match.dayIndex]?.date === match.date
      && match.temperatureC === fact.temperatureC
    )
    && new Set(matches.map((match) => match.dayIndex)).size === matches.length
    && fact.dateLabel === matches.map((match) => shortDateLabel(match.date)).join(" & ")
    && fact.temperatureLabel === `${Math.round(fact.temperatureC)} °C`;
}

function synthesisEvidenceIsConsistent(slide1: WeeklyEditorial["slide1"]): boolean {
  const synthesis = slide1.synthesis;
  const evidence = synthesis.evidence;
  const primary = synthesis.primaryLine;
  const text = `${synthesis.primaryLine} ${synthesis.secondaryLine}`;
  const finiteEvidence = [
    evidence.maximumTemperatureC,
    evidence.minimumDailyMaximumC,
    evidence.totalPrecipitationMm,
    evidence.wetHours,
    evidence.meanBrightFraction,
    evidence.startBrightFraction,
    evidence.endBrightFraction,
    evidence.startCloudCoverPct,
    evidence.endCloudCoverPct
  ].every(Number.isFinite);
  const thermalLanguage: Record<typeof evidence.thermalClass, string> = {
    COLD: "Temps froid",
    COOL: "Temps frais",
    MILD: "Temps doux",
    PLEASANT: "Temps agréable",
    WARM: "Temps chaud",
    MARKED_HEAT: "Chaleur marquée"
  };
  const heatLanguageIsCorrect = primary.startsWith("Pluies fréquentes") || primary.includes(thermalLanguage[evidence.thermalClass]);
  const solarDominant = evidence.dryWeek && evidence.meanBrightFraction >= .6;
  const significantRain = evidence.wetHours >= 4 || evidence.totalPrecipitationMm >= 2;
  const factMaximumMatches = Math.abs(evidence.maximumTemperatureC - slide1.facts.hottestDay.temperatureC) < 1e-9
    && evidence.maximumDayIndexes.length === factMatches(slide1.hottestDay).length
    && evidence.maximumDayIndexes.every((dayIndex, index) => dayIndex === factMatches(slide1.hottestDay)[index]?.dayIndex);

  return finiteEvidence
    && evidence.minimumDailyMaximumC <= evidence.maximumTemperatureC
    && evidence.maximumDayIndexes.length > 0
    && heatLanguageIsCorrect
    && (!/\bTemps doux\b/.test(text) || evidence.thermalClass === "MILD")
    && (!/\bTemps frais\b/.test(text) || evidence.thermalClass === "COOL")
    && (!/\bTemps froid\b/.test(text) || evidence.thermalClass === "COLD")
    && (!/\bTemps agréable\b/.test(text) || evidence.thermalClass === "PLEASANT")
    && (!/\bTemps chaud\b/.test(text) || evidence.thermalClass === "WARM")
    && (!/\bChaleur marquée\b/.test(text) || evidence.thermalClass === "MARKED_HEAT")
    && (!/Davantage de soleil/.test(text) || evidence.measuredBrightening)
    && (!/Plus nuageux/.test(text) || evidence.measuredClouding)
    && (!/\bsec\b/i.test(text) || evidence.dryWeek)
    && (!/Soleil bien présent/.test(text) || solarDominant)
    && (!/Pluies fréquentes/.test(text) || significantRain)
    && factMaximumMatches;
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function slide1PreflightCopyIsValid(slide1: WeeklyEditorial["slide1"]): boolean {
  const daylight = slide1.daylight;
  return [
    slide1.title,
    slide1.synthesis.primaryLine,
    slide1.synthesis.secondaryLine,
    slide1.coldestMorning.label,
    slide1.coldestMorning.dateLabel,
    slide1.coldestMorning.temperatureLabel,
    slide1.hottestDay.label,
    slide1.hottestDay.dateLabel,
    slide1.hottestDay.temperatureLabel,
    daylight.label,
    daylight.deltaLabel,
    daylight.periodLabel,
    daylight.start.sunriseLabel,
    daylight.start.sunsetLabel,
    daylight.end.sunriseLabel,
    daylight.end.sunsetLabel
  ].every(hasText)
    && slide1.synthesis.primaryLine.length <= 80
    && slide1.synthesis.secondaryLine.length <= 120
    && slide1.synthesis.primaryMaximumLines === 1
    && slide1.synthesis.secondaryMaximumLines === 2
    && !/\b(conseil|privilégier|surveiller|globalement|progressivement)\b/i.test(`${slide1.synthesis.primaryLine} ${slide1.synthesis.secondaryLine}`)
    && synthesisEvidenceIsConsistent(slide1)
    && /^[-−–+]?\d+ min de jour$|^Durée du jour stable$/.test(daylight.deltaLabel)
    && /^[A-ZÉÙÛÀÂÎÔÇ]{3,4}\. \d{1,2} → [A-ZÉÙÛÀÂÎÔÇ]{3,4}\. \d{1,2}$/.test(daylight.periodLabel)
    && /^\d{2}:\d{2}$/.test(daylight.start.sunriseLabel)
    && /^\d{2}:\d{2}$/.test(daylight.start.sunsetLabel)
    && /^\d{2}:\d{2}$/.test(daylight.end.sunriseLabel)
    && /^\d{2}:\d{2}$/.test(daylight.end.sunsetLabel)
    && daylight.start.sunriseMinutes < daylight.start.sunsetMinutes
    && daylight.end.sunriseMinutes < daylight.end.sunsetMinutes
    && daylight.deltaMinutes === daylight.end.durationMinutes - daylight.start.durationMinutes;
}

/**
 * Validates the complete weekly publication contract before it can be stored
 * or exposed publicly. This is a deterministic guard, not an editorial step.
 */
export function validateWeeklyActivation(
  editorial: WeeklyEditorial,
  carousel: WeeklyCarouselPlan
): WeeklyActivationValidation {
  const checks: WeeklyActivationCheck[] = [];
  let expectedRange: { startDate: string; endDate: string } | null = null;
  try { expectedRange = weeklyRangeForDate(editorial.startDate); }
  catch { expectedRange = null; }

  checks.push(check("versions", editorial.version === "0.1.0" && carousel.version === "0.1.0", "versions_0_1"));
  checks.push(check(
    "monday_to_sunday",
    expectedRange !== null && editorial.endDate === expectedRange.endDate && carousel.startDate === editorial.startDate && carousel.endDate === editorial.endDate,
    expectedRange ? `${editorial.startDate}:${editorial.endDate}` : "invalid_week_range"
  ));
  const slide2 = carousel.slides[1];
  const hasContextualNumber = editorial.weeklyNumber !== undefined;
  const complementarySlides = carousel.slides.slice(1).filter((slide) => slide.complementary !== undefined);
  const hasComplementarySlides = complementarySlides.length > 0;
  const complementaryKinds = new Set(["COMPLEMENTARY_NUMBER", "COMPLEMENTARY_PRACTICAL", "COMPLEMENTARY_DETAIL"]);
  checks.push(check(
    "editorial_signal_gate",
    hasComplementarySlides
      ? !hasContextualNumber
        && carousel.slides.length >= 2 && carousel.slides.length <= 4
        && complementarySlides.length === carousel.slides.length - 1
        && complementarySlides.every((slide, index) => complementaryKinds.has(slide.kind) && slide.complementary?.position === index + 2)
        && carousel.complementaryPreflight?.ok === true
      : hasContextualNumber
        ? carousel.slides.length === 2 && slide2?.kind === "WEEKLY_NUMBER"
        : carousel.slides.length === 1 && slide2 === undefined,
    hasComplementarySlides ? "preflight_approved_contextual_slides" : hasContextualNumber ? "contextual_signal_has_slide2" : "no_uncontextualized_number_published"
  ));
  checks.push(check("publication_limit", editorial.events.length <= WEEKLY_CAROUSEL_MAX_EVENT_SLIDES, `${editorial.events.length}_event_slides_max_${WEEKLY_CAROUSEL_MAX_EVENT_SLIDES}`));
  checks.push(check("overview_first", carousel.slides[0]?.kind === "OVERVIEW" && carousel.slides[0]?.eventId === null, "overview_first"));
  checks.push(check(
    "slide2_number_identity",
    hasComplementarySlides || !hasContextualNumber || (
      slide2?.kind === "WEEKLY_NUMBER"
      && slide2.eventId === null
      && slide2.weeklyNumber?.title === "LE CHIFFRE DE LA SEMAINE"
      && slide2.weeklyNumber?.valueLabel.length > 0
      && slide2.weeklyNumber?.unitLabel.length > 0
      && slide2.weeklyNumber?.explanation.length > 0
      && slide2.weeklyNumber?.dayIndex >= 0
      && slide2.weeklyNumber?.dayIndex <= 6
    ),
    hasComplementarySlides ? "contextual_slide_plan_is_preflighted" : hasContextualNumber ? "single_traceable_weekly_number" : "no_signal_no_slide2"
  ));
  checks.push(check("calm_contract", editorial.status !== "CALM" || editorial.events.length === 0, "calm_week_keeps_the_same_two_slide_format"));
  checks.push(check("carousel_dimensions", carousel.width === 1080 && carousel.height === 1440, "1080x1440"));
  checks.push(check("story_dimensions", carousel.story.width === 1080 && carousel.story.height === 1920, "1080x1920"));
  checks.push(check("story_relay", carousel.story.relay.kind === "RELAY" && carousel.story.relay.source === "CAROUSEL" && carousel.story.relay.cta.length > 0, "relay_only_story"));
  checks.push(check(
    "weekly_slide1_content",
    editorial.slide1.title.length > 0
      && editorial.slide1.synthesis.primaryLine.length > 0
      && editorial.slide1.synthesis.secondaryLine.length > 0
      && editorial.slide1.synthesis.primaryLine.length <= 80
      && editorial.slide1.synthesis.secondaryLine.length <= 120
      && editorial.slide1.synthesis.primaryMaximumLines === 1
      && editorial.slide1.synthesis.secondaryMaximumLines === 2
      && !/\b(globalement|progressivement)\b/i.test(`${editorial.slide1.synthesis.primaryLine} ${editorial.slide1.synthesis.secondaryLine}`)
      && synthesisEvidenceIsConsistent(editorial.slide1)
      && isTraceableTemperatureFact(editorial.slide1.coldestMorning, editorial.dailySummaries, 5, 10)
      && isTraceableTemperatureFact(editorial.slide1.hottestDay, editorial.dailySummaries, 0, 23)
      && factMatches(editorial.slide1.hottestDay).every((match) => editorial.dailySummaries[match.dayIndex]?.maxTemperatureC === match.temperatureC)
      && editorial.slide1.daylight.deltaMinutes === editorial.slide1.facts.daylight.deltaMinutes
      && editorial.slide1.daylight.start.date === editorial.startDate
      && editorial.slide1.daylight.end.date === editorial.endDate
      && editorial.slide1.dailyStrip.length === 7
      && editorial.slide1.dailyStrip.every((day, index) => day.date === editorial.dailySummaries[index]?.date && day.scene.id === editorial.dailySummaries[index]?.scene.id)
      && carousel.slide1.title === editorial.slide1.title
      && sameFactMatches(editorial.slide1.coldestMorning, carousel.slide1.coldestMorning)
      && sameFactMatches(editorial.slide1.hottestDay, carousel.slide1.hottestDay)
      && carousel.slide1.dailyStrip.length === 7
      && carousel.slide1.dailyStrip.every((day, index) => day.date === editorial.slide1.dailyStrip[index]?.date && day.pictogram.kind === visualIconToPictogram(day.scene.visualIcon)),
    "permanent_first_slide_facts_are_complete_and_v24_bound"
  ));
  checks.push(check(
    "weekly_daily_summaries",
    editorial.dailySummaries.length === 7
      && carousel.dailySummaries.length === 7
      && editorial.dailySummaries.every((day, index) => day.dayIndex === index && Number.isFinite(day.minTemperatureC) && Number.isFinite(day.maxTemperatureC) && day.minTemperatureC <= day.maxTemperatureC && isValidDailyV24Scene(day.scene))
      && carousel.dailySummaries.every((day, index) => day.dayIndex === index && day.date === editorial.dailySummaries[index]?.date && day.scene.id === editorial.dailySummaries[index]?.scene.id && day.weekdayLabel.length >= 3 && /^\d{1,2}$/.test(day.dayLabel)),
    "seven_ordered_daily_v24_summaries"
  ));
  checks.push(check(
    "weekly_slide1_preflight_copy",
    slide1PreflightCopyIsValid(editorial.slide1),
    "no_empty_boxes_bounded_text_and_coherent_daylight_labels"
  ));
  checks.push(check(
    "weekly_daily_pictograms",
    carousel.dailySummaries.length === 7
      && carousel.dailySummaries.every((day) =>
        day.pictogram.source === "LOKA_OFFICIAL_PICTOGRAM_LIBRARY"
        && day.pictogram.libraryVersion === PICTOGRAM_LIBRARY_VERSION
        && day.pictogram.kind === visualIconToPictogram(day.scene.visualIcon)
      ),
    "daily_v24_icons_bound_to_official_loka_library"
  ));
  const highlightByDay = new Map(editorial.dailyHighlights.map((highlight) => [highlight.dayIndex, highlight]));
  const watchTypes = new Set(["THUNDER", "RAIN", "WIND", "DEGRADATION", "HEAT", "COLD"]);
  checks.push(check(
    "weekly_daily_highlights",
    editorial.dailyHighlights.length <= 2
      && (editorial.status !== "CALM" || editorial.dailyHighlights.length === 0)
      && new Set(editorial.dailyHighlights.map((highlight) => highlight.dayIndex)).size === editorial.dailyHighlights.length
      && editorial.dailyHighlights.every((highlight) =>
        highlight.dayIndex >= 0
        && highlight.dayIndex <= 6
        && editorial.dailySummaries[highlight.dayIndex]?.date === highlight.date
        && editorial.events.some((event) => event.id === highlight.sourceEventId && event.type === highlight.sourceEventType)
        && (highlight.kind === "PREFERRED" ? highlight.sourceEventType === "BEST_WINDOW" : watchTypes.has(highlight.sourceEventType))
      )
      && carousel.dailyHighlights.length === editorial.dailyHighlights.length
      && carousel.dailySummaries.every((day) => day.highlight === (highlightByDay.get(day.dayIndex)?.kind ?? null)),
    "optional_preferred_and_watch_markers_must_follow_selected_events"
  ));
  const editorialCardByKind = new Map(editorial.dailyCardDetails.map((card) => [card.kind, card]));
  const carouselCardByKind = new Map(carousel.dailyCardDetails.map((card) => [card.kind, card]));
  checks.push(check(
    "weekly_daily_card_details",
    editorial.dailyCardDetails.length === editorial.dailyHighlights.length
      && carousel.dailyCardDetails.length === editorial.dailyCardDetails.length
      && editorial.dailyCardDetails.every((card) => {
        const summary = editorial.dailySummaries[card.dayIndex];
        const highlight = highlightByDay.get(card.dayIndex);
        return summary?.date === card.date
          && card.scene.id === summary.scene.id
          && card.weatherLabel === card.scene.displayTitle
          && card.minTemperatureC === summary.minTemperatureC
          && card.maxTemperatureC === summary.maxTemperatureC
          && highlight?.kind === card.kind
          && highlight.sourceEventId === card.sourceEventId
          && highlight.sourceEventType === card.sourceEventType
          && card.slots.length === WEEKLY_DAILY_CARD_HOURS.length
          && card.slots.every((slot, index) =>
            slot.hour === WEEKLY_DAILY_CARD_HOURS[index]
            && Number.isInteger(slot.sourceHour)
            && slot.sourceHour >= 0
            && slot.sourceHour <= 23
            && Number.isFinite(slot.temperatureC)
          );
      })
      && editorial.dailyHighlights.every((highlight) => editorialCardByKind.get(highlight.kind)?.dayIndex === highlight.dayIndex)
      && carousel.dailyCardDetails.every((card) => {
        const editorialCard = editorialCardByKind.get(card.kind);
        return editorialCard !== undefined
          && card.dayIndex === editorialCard.dayIndex
          && card.date === editorialCard.date
          && card.sourceEventId === editorialCard.sourceEventId
          && card.sourceEventType === editorialCard.sourceEventType
          && card.weatherLabel === editorialCard.weatherLabel
          && card.pictogram.source === "LOKA_OFFICIAL_PICTOGRAM_LIBRARY"
          && card.pictogram.libraryVersion === PICTOGRAM_LIBRARY_VERSION
          && card.pictogram.kind === visualIconToPictogram(card.scene.visualIcon)
          && card.slots.length === editorialCard.slots.length
          && card.slots.every((slot, index) => {
            const source = editorialCard.slots[index];
            return source !== undefined
              && slot.hour === source.hour
              && slot.sourceHour === source.sourceHour
              && slot.temperatureC === source.temperatureC
              && slot.condition === source.condition
              && slot.pictogram.source === "LOKA_OFFICIAL_PICTOGRAM_LIBRARY"
              && slot.pictogram.libraryVersion === PICTOGRAM_LIBRARY_VERSION
              && slot.pictogram.kind === hourlyConditionToPictogram(slot.condition);
          });
      })
      && carousel.dailyHighlights.every((highlight) => carouselCardByKind.get(highlight.kind)?.dayIndex === highlight.dayIndex),
    "central_cards_must_reuse_daily_v24_and_hourly_pictogram_rules"
  ));
  checks.push(check(
    "scene_assets",
    [editorial.overview.scene, ...carousel.slides.map((slide) => slide.scene)].every((scene) => scene.masterUrl.startsWith("/masters24/")),
    "v24_master_assets"
  ));
  checks.push(check(
    "weekly_background_assets",
    [...carousel.slides.map((slide) => slide.backgroundUrl), carousel.story.relay.backgroundUrl]
      .every((url) => url.startsWith("/masters24/")),
    "weekly_master_assets"
  ));
  checks.push(check(
    "overview_background",
    carousel.slides[0]?.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL
      && carousel.story.relay.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL,
    "dedicated_weekly_overview_master"
  ));
  checks.push(check(
    "shared_slide2_background",
    hasComplementarySlides
      ? complementarySlides.every((slide) => slide.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL)
      : !hasContextualNumber || slide2?.backgroundUrl === WEEKLY_OVERVIEW_MASTER_URL,
    hasComplementarySlides ? "all_contextual_slides_use_the_same_weekly_master_as_slide1" : hasContextualNumber ? "slide2_uses_the_same_weekly_master_as_slide1" : "no_signal_no_slide2_background"
  ));
  checks.push(check(
    "slide2_shared_frame",
    WEEKLY_SLIDE2_DAILY_FEED_GRID.title === LOKA_DAILY_FEED_FRAME.title
      && WEEKLY_SLIDE2_DAILY_FEED_GRID.numberBox.bottom === LOKA_DAILY_FEED_FRAME.lowerBox.bottom
      && WEEKLY_SLIDE2_DAILY_FEED_GRID.signature === LOKA_DAILY_FEED_FRAME.signature,
    "daily_title_box_lower_baseline_and_signature"
  ));
  checks.push(check(
    "daily_v24_scene_provenance",
    [editorial.overview.scene, ...editorial.events.map((event) => event.scene), ...carousel.slides.map((slide) => slide.scene), carousel.story.relay.scene].every(isValidDailyV24Scene),
    "scenes_must_reference_valid_daily_v24_decisions"
  ));
  checks.push(check(
    "event_scene_alignment",
    editorial.events.every((event) => event.scene.date >= event.startDate && event.scene.date <= event.endDate),
    "event_scene_date_is_inside_event_range"
  ));

  const ok = checks.every((item) => item.ok);
  return { status: ok ? "READY" : "BLOCKED", ok, checks };
}
