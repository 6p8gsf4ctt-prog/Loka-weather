import { validateWeeklyEditorialSignal } from "./editorialSignals";
import type { WeeklyEditorialMetric, WeeklySignalMeasurement } from "./editorialSignals";
import { complementaryPictogramIsOfficial } from "./complementaryPictograms";
import type { WeeklyComplementarySlide, WeeklyComplementarySlidePlan } from "./complementarySlides";
import type { WeeklyProfileSet } from "./profiles";
import type { RankedWeeklySignalCandidate, WeeklySignalRankingResult } from "./signalRanking";
import { WEEKLY_CLIMATE_REFERENCE_VERSION, WEEKLY_CLIMATE_STATION_ID } from "./climateReferences";

export const WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION = "2.0.0" as const;

export type WeeklyComplementaryPreflightCheckId =
  | "count" | "positions" | "frame" | "titles" | "themes" | "copy"
  | "claim" | "source" | "weather" | "ties" | "pictograms" | "overflow";

export interface WeeklyComplementaryPreflightCheck {
  id: WeeklyComplementaryPreflightCheckId;
  ok: boolean;
  detail: string;
}

export interface WeeklyComplementaryPreflightContext {
  profiles: WeeklyProfileSet;
  ranking: WeeklySignalRankingResult;
  climateStatus: "READY" | "UNAVAILABLE" | "REJECTED";
  allowRepeatedThemes?: boolean;
}

export interface WeeklyComplementaryPreflight {
  version: typeof WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION;
  ok: boolean;
  comprehensive: boolean;
  planFingerprint: string;
  checks: WeeklyComplementaryPreflightCheck[];
}

const TITLES = {
  NUMBER: "LE CHIFFRE DE LA SEMAINE",
  PRACTICAL: "À SAVOIR CETTE SEMAINE",
  DETAIL: "LE DÉTAIL À REMARQUER"
} as const;

const CONTEXTUAL_DETECTORS = new Set([
  "HISTORICAL_SINCE", "RECORD_PROXIMITY", "CLIMATE_ANOMALY", "EXTREME_PERCENTILE",
  "SEASONAL_FIRST", "REMARKABLE_SERIES", "RECENT_EXTREME"
]);

function compact(value: string): string {
  return value.normalize("NFC").replace(/\s+/g, " ").trim();
}

function check(id: WeeklyComplementaryPreflightCheckId, ok: boolean, detail: string): WeeklyComplementaryPreflightCheck {
  return { id, ok, detail };
}

export function weeklyComplementaryPlanFingerprint(plan: WeeklyComplementarySlidePlan): string {
  return plan.slides.map((slide) => [
    slide.position, slide.role, slide.title, slide.signalId, slide.detector, slide.theme,
    slide.visual, compact(slide.displayValue), compact(slide.primaryLine),
    compact(slide.secondaryLine), slide.claimStatus, compact(slide.sourceNote), slide.frame
  ].join("|")).join("||");
}

function copyFitsContract(slide: WeeklyComplementarySlide): boolean {
  return compact(slide.displayValue).length > 0 && compact(slide.displayValue).length <= 32
    && compact(slide.primaryLine).length > 0 && compact(slide.primaryLine).length <= 80
    && compact(slide.secondaryLine).length > 0 && compact(slide.secondaryLine).length <= 120;
}

function claimIsCoherent(slide: WeeklyComplementarySlide): boolean {
  const copy = `${slide.primaryLine} ${slide.secondaryLine}`.toLocaleLowerCase("fr-FR");
  if (slide.claimStatus === "OBSERVED") return !/(prévu|pourrait|devrait|si les|attendu|possible)/.test(copy);
  if (slide.claimStatus === "IF_CONFIRMED") return /si les|se confirment/.test(copy) && /(pourrait|potentiel)/.test(copy);
  if (slide.claimStatus === "POSSIBLE") return /pourrai|possible/.test(copy);
  return /devrait|attendu|prévu/.test(copy);
}

function characterWidth(char: string): number {
  if (/\s/.test(char)) return .32;
  if (/[MW@%]/.test(char)) return .9;
  if (/[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜ]/.test(char)) return .68;
  if (/[ilI1.,:;!'’|]/.test(char)) return .3;
  if (/[mw]/.test(char)) return .82;
  return .54;
}

function estimatedWidth(value: string, size: number): number {
  return [...compact(value)].reduce((sum, char) => sum + characterWidth(char) * size, 0);
}

function fitsSingleLine(value: string, maxWidth: number, minimumSize: number): boolean {
  return estimatedWidth(value, minimumSize) <= maxWidth;
}

function fitsWrapped(value: string, maxWidth: number, maximumLines: number, minimumSize: number): boolean {
  const words = compact(value).split(" ").filter(Boolean);
  let lines = 1;
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && estimatedWidth(next, minimumSize) > maxWidth) {
      lines++;
      line = word;
    } else line = next;
    if (estimatedWidth(line, minimumSize) > maxWidth || lines > maximumLines) return false;
  }
  return true;
}

function canvasCopyFits(slide: WeeklyComplementarySlide): boolean {
  return fitsSingleLine(slide.title, 870, 44)
    && fitsSingleLine(slide.displayValue, 870, 64)
    && fitsWrapped(slide.primaryLine, 838, 2, 23)
    && fitsWrapped(slide.secondaryLine, 838, 2, 18);
}

function rankedForSlide(slide: WeeklyComplementarySlide, context: WeeklyComplementaryPreflightContext): RankedWeeklySignalCandidate | null {
  return context.ranking.selected.find((item) => item.candidate.signal.id === slide.signalId) ?? null;
}

function profileDay(context: WeeklyComplementaryPreflightContext, date: string) {
  return context.profiles.days.find((day) => day.date === date) ?? null;
}

function close(left: number, right: number): boolean {
  return Number.isFinite(left) && Number.isFinite(right) && Math.abs(left - right) < 1e-6;
}

function hourValue(day: WeeklyProfileSet["days"][number], hour: number, metric: WeeklyEditorialMetric): number | null {
  const point = day.hours.find((item) => Number(item.time.slice(11, 13)) === hour);
  if (!point) return null;
  if (metric === "TEMPERATURE") return point.temperatureC;
  if (metric === "PRECIPITATION") return point.precipitationMm;
  if (metric === "WIND_GUST") return point.windGustKmh;
  if (metric === "WIND_SPEED") return point.windSpeedKmh;
  return null;
}

function dailyValue(item: RankedWeeklySignalCandidate, measurement: WeeklySignalMeasurement, context: WeeklyComplementaryPreflightContext): number | null {
  const signal = item.candidate.signal;
  if (measurement.window.basis === "SEASON_TO_DATE") return measurement.value;
  const start = profileDay(context, measurement.window.startDate);
  const end = profileDay(context, measurement.window.endDate);
  if (!start || !end) return null;
  if (item.candidate.detector === "REGIME_CHANGE") {
    if (measurement.metric === "TEMPERATURE") return end.fullDay.meanTemperatureC - start.fullDay.meanTemperatureC;
    if (measurement.metric === "PRECIPITATION") return end.fullDay.precipitation.totalMm - start.fullDay.precipitation.totalMm;
    if (measurement.metric === "WIND_GUST") return end.fullDay.wind.maxGustKmh - start.fullDay.wind.maxGustKmh;
  }
  if (item.candidate.detector === "INTRADAY_CHANGE") {
    if (item.candidate.facts.change === "AMPLITUDE") return start.fullDay.maxTemperatureC - start.fullDay.minTemperatureC;
    const first = hourValue(start, measurement.window.startHour ?? -1, measurement.metric);
    const last = hourValue(start, measurement.window.endHour ?? -1, measurement.metric);
    return first === null || last === null ? null : first - last;
  }
  if (measurement.window.basis === "HOURLY") return hourValue(start, measurement.window.startHour ?? -1, measurement.metric);
  if (measurement.window.basis === "WEEKLY_TOTAL" && measurement.metric === "PRECIPITATION") {
    return context.profiles.days.reduce((sum, day) => sum + day.fullDay.precipitation.totalMm, 0);
  }
  if (measurement.metric === "TEMPERATURE") {
    const minimum = signal.topicKey.startsWith("tminC:") || item.candidate.facts.phenomenon === "FROST";
    return minimum ? start.fullDay.minTemperatureC : start.fullDay.maxTemperatureC;
  }
  if (measurement.metric === "PRECIPITATION") return start.fullDay.precipitation.totalMm;
  if (measurement.metric === "WIND_GUST") return start.fullDay.wind.maxGustKmh;
  if (measurement.metric === "WIND_SPEED") return start.fullDay.wind.maxSpeedKmh;
  if (measurement.metric === "THUNDER") return start.fullDay.thunderHours;
  if (measurement.metric === "VISIBILITY") return start.fullDay.fogHours;
  return null;
}

function weatherIsCoherent(slide: WeeklyComplementarySlide, context: WeeklyComplementaryPreflightContext): boolean {
  const ranked = rankedForSlide(slide, context);
  if (!ranked || ranked.candidate.detector !== slide.detector || !ranked.eligible || ranked.rank === null || ranked.rejectionReasons.length) return false;
  const signal = ranked.candidate.signal;
  const day = context.profiles.days[signal.representativeDayIndex];
  if (!day || day.date < signal.forecast.window.startDate || day.date > signal.forecast.window.endDate) return false;
  const derived = dailyValue(ranked, signal.forecast, context);
  return derived !== null && close(derived, signal.forecast.value);
}

function sourceIsTraceable(slide: WeeklyComplementarySlide, context?: WeeklyComplementaryPreflightContext): boolean {
  if (compact(slide.sourceNote).length < 20) return false;
  if (!context) return true;
  const ranked = rankedForSlide(slide, context);
  if (!ranked || !validateWeeklyEditorialSignal(ranked.candidate.signal).ok) return false;
  const evidence = ranked.candidate.signal.evidence;
  if (!evidence.length || evidence.some((item) => !compact(item.explanation) || !item.source)) return false;
  if (CONTEXTUAL_DETECTORS.has(ranked.candidate.detector)) {
    return context.climateStatus === "READY"
      && ranked.candidate.facts.stationId === WEEKLY_CLIMATE_STATION_ID
      && ranked.candidate.facts.referenceVersion === WEEKLY_CLIMATE_REFERENCE_VERSION
      && typeof ranked.candidate.facts.resourceCount === "number"
      && ranked.candidate.facts.resourceCount >= 1
      && evidence.every((item) => item.source !== "CONSENSUS_FORECAST");
  }
  return evidence.every((item) => item.source === "CONSENSUS_FORECAST" && item.direct === true);
}

function tiedDates(item: RankedWeeklySignalCandidate, context: WeeklyComplementaryPreflightContext): string[] {
  const signal = item.candidate.signal;
  if (signal.forecast.window.basis !== "DAILY_EXTREME") return [];
  const metric = signal.forecast.metric;
  return context.profiles.days.filter((day) => {
    if (metric === "TEMPERATURE") {
      const minimum = signal.topicKey.startsWith("tminC:") || item.candidate.facts.phenomenon === "FROST";
      return close(minimum ? day.fullDay.minTemperatureC : day.fullDay.maxTemperatureC, signal.forecast.value);
    }
    if (metric === "WIND_GUST") return close(day.fullDay.wind.maxGustKmh, signal.forecast.value);
    return false;
  }).map((day) => day.date);
}

function tiesAreHandled(slide: WeeklyComplementarySlide, context: WeeklyComplementaryPreflightContext): boolean {
  const ranked = rankedForSlide(slide, context);
  if (!ranked) return false;
  const uniqueClaim = /\b(le|la) plus (chaud|chaude|frais|fraîche|élevé|élevée|bas|basse|fort|forte)\b/i.test(`${slide.primaryLine} ${slide.secondaryLine}`);
  if (!uniqueClaim) return true;
  const dates = tiedDates(ranked, context);
  if (dates.length <= 1) return true;
  return dates.every((date) => slide.primaryLine.includes(date) || slide.secondaryLine.includes(date));
}

export function preflightWeeklyComplementarySlides(plan: WeeklyComplementarySlidePlan, context?: WeeklyComplementaryPreflightContext): WeeklyComplementaryPreflight {
  const slides = plan.slides;
  const positions = slides.map((slide) => slide.position);
  const expected = slides.map((_, index) => (index + 2) as 2 | 3 | 4);
  const checks: WeeklyComplementaryPreflightCheck[] = [
    check("count", slides.length <= 3, "at_most_three_contextual_slides"),
    check("positions", positions.every((position, index) => position === expected[index]), "positions_are_contiguous_after_overview"),
    check("frame", slides.every((slide) => slide.frame === "WEEKLY_SHARED_V1"), "daily_weekly_shared_frame_required"),
    check("titles", slides.every((slide) => slide.title === TITLES[slide.role]), "fixed_title_per_role"),
    check("themes", (context?.allowRepeatedThemes || new Set(slides.map((slide) => slide.theme)).size === slides.length) && new Set(slides.map((slide) => slide.signalId)).size === slides.length, context?.allowRepeatedThemes ? "manual_selection_may_repeat_a_theme" : "one_theme_and_signal_once"),
    check("copy", slides.every(copyFitsContract), "bounded_nonempty_display_and_editorial_copy"),
    check("claim", slides.every(claimIsCoherent), "forecast_observation_wording_is_coherent"),
    check("source", slides.every((slide) => sourceIsTraceable(slide, context)), context ? "structured_evidence_and_source_status_are_traceable" : "source_note_only_context_not_supplied"),
    check("weather", context ? slides.every((slide) => weatherIsCoherent(slide, context)) : true, context ? "displayed_measurements_match_weekly_profiles" : "not_evaluated_without_profiles"),
    check("ties", context ? slides.every((slide) => tiesAreHandled(slide, context)) : true, context ? "no_unique_claim_masks_an_exact_tie" : "not_evaluated_without_profiles"),
    check("pictograms", slides.every((slide) => complementaryPictogramIsOfficial(slide.theme, slide.visual)), "official_loka_pictogram_and_theme_mapping"),
    check("overflow", slides.every(canvasCopyFits), "all_text_fits_the_real_shared_canvas_bounds")
  ];
  return {
    version: WEEKLY_COMPLEMENTARY_PREFLIGHT_VERSION,
    ok: checks.every((item) => item.ok),
    comprehensive: context !== undefined,
    planFingerprint: weeklyComplementaryPlanFingerprint(plan),
    checks
  };
}

export function assertWeeklyComplementaryPreflight(
  plan: WeeklyComplementarySlidePlan,
  context?: WeeklyComplementaryPreflightContext,
  prepared?: WeeklyComplementaryPreflight
): WeeklyComplementaryPreflight {
  const result = prepared ?? preflightWeeklyComplementarySlides(plan, context);
  if (result.planFingerprint !== weeklyComplementaryPlanFingerprint(plan)) throw new Error("weekly_complementary_preflight_failed:fingerprint");
  if (!result.ok) throw new Error(`weekly_complementary_preflight_failed:${result.checks.filter((item) => !item.ok).map((item) => item.id).join(",")}`);
  return result;
}
