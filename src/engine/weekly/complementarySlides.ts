import { buildWeeklySignalCopy } from "./signalCopy";
import type { WeeklySignalClaimStatus } from "./signalCopy";
import type { WeeklyEditorialMetric } from "./editorialSignals";
import type { RankedWeeklySignalCandidate } from "./signalRanking";
import type { WeeklySignalDetectorKind } from "./signalDetectors";

export const WEEKLY_COMPLEMENTARY_SLIDES_VERSION = "1.0.0" as const;

export type WeeklyComplementarySlideRole = "NUMBER" | "PRACTICAL" | "DETAIL";
export type WeeklyComplementaryTheme = "TEMPERATURE" | "WET_WEATHER" | "WIND" | "VISIBILITY" | "LIGHT" | "OTHER";
export type WeeklyComplementaryVisual = "THERMOMETER" | "RAIN" | "WIND" | "THUNDER" | "FOG" | "SUN" | "TREND";

export interface WeeklyComplementarySlide {
  version: typeof WEEKLY_COMPLEMENTARY_SLIDES_VERSION;
  /** Physical carousel position after the permanent overview slide. */
  position: 2 | 3 | 4;
  role: WeeklyComplementarySlideRole;
  title: "LE CHIFFRE DE LA SEMAINE" | "À SAVOIR CETTE SEMAINE" | "LE DÉTAIL À REMARQUER";
  signalId: string;
  detector: WeeklySignalDetectorKind;
  theme: WeeklyComplementaryTheme;
  visual: WeeklyComplementaryVisual;
  displayValue: string;
  primaryLine: string;
  secondaryLine: string;
  claimStatus: WeeklySignalClaimStatus;
  sourceNote: string;
  /** N8 must place this content inside the exact shared weekly/daily frame. */
  frame: "WEEKLY_SHARED_V1";
}

export interface WeeklyComplementarySlidePlan {
  version: typeof WEEKLY_COMPLEMENTARY_SLIDES_VERSION;
  inputSignals: number;
  slides: WeeklyComplementarySlide[];
  omittedSignalIds: string[];
}

function theme(metric: WeeklyEditorialMetric): WeeklyComplementaryTheme {
  if (metric === "TEMPERATURE" || metric === "FROST") return "TEMPERATURE";
  if (metric === "PRECIPITATION" || metric === "THUNDER") return "WET_WEATHER";
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return "WIND";
  if (metric === "VISIBILITY") return "VISIBILITY";
  if (metric === "SUNLIGHT" || metric === "DAYLIGHT" || metric === "CLOUD_COVER") return "LIGHT";
  return "OTHER";
}

function visual(candidate: RankedWeeklySignalCandidate): WeeklyComplementaryVisual {
  const phenomenon = candidate.candidate.facts.phenomenon;
  if (phenomenon === "THUNDER" || candidate.candidate.signal.forecast.metric === "THUNDER") return "THUNDER";
  if (phenomenon === "FOG" || candidate.candidate.signal.forecast.metric === "VISIBILITY") return "FOG";
  if (phenomenon === "STRONG_WIND" || candidate.candidate.signal.forecast.metric === "WIND_GUST") return "WIND";
  if (phenomenon === "HEAVY_RAIN" || phenomenon === "INTENSE_RAIN" || candidate.candidate.signal.forecast.metric === "PRECIPITATION") return "RAIN";
  if (candidate.candidate.signal.forecast.metric === "TEMPERATURE") return "THERMOMETER";
  if (candidate.candidate.detector === "REGIME_CHANGE" || candidate.candidate.detector === "INTRADAY_CHANGE") return "TREND";
  return "SUN";
}

function detailSuitable(detector: WeeklySignalDetectorKind): boolean {
  return detector === "SEASONAL_FIRST" || detector === "REMARKABLE_SERIES" || detector === "INTRADAY_CHANGE"
    || detector === "HISTORICAL_SINCE" || detector === "EXTREME_PERCENTILE";
}

function practicalSuitable(detector: WeeklySignalDetectorKind): boolean {
  return detector === "IMPACT_PHENOMENON" || detector === "REGIME_CHANGE";
}

function signatureSuitable(detector: WeeklySignalDetectorKind): boolean {
  return !practicalSuitable(detector);
}

function title(role: WeeklyComplementarySlideRole): WeeklyComplementarySlide["title"] {
  if (role === "NUMBER") return "LE CHIFFRE DE LA SEMAINE";
  if (role === "PRACTICAL") return "À SAVOIR CETTE SEMAINE";
  return "LE DÉTAIL À REMARQUER";
}

function rolePriority(role: WeeklyComplementarySlideRole, item: RankedWeeklySignalCandidate): number {
  if (role === "PRACTICAL") return item.candidate.detector === "IMPACT_PHENOMENON" ? 2 : item.candidate.detector === "REGIME_CHANGE" ? 1 : 0;
  if (role === "DETAIL") return item.candidate.detector === "SEASONAL_FIRST" ? 4
    : item.candidate.detector === "REMARKABLE_SERIES" ? 3
      : item.candidate.detector === "INTRADAY_CHANGE" ? 2 : 1;
  return signatureSuitable(item.candidate.detector) ? 1 : 0;
}

function choose(candidates: RankedWeeklySignalCandidate[], role: WeeklyComplementarySlideRole, usedThemes: Set<WeeklyComplementaryTheme>, allowFallback: boolean, allowRepeatedThemes: boolean): RankedWeeklySignalCandidate | null {
  const suited = candidates.filter((item) => {
    const detector = item.candidate.detector;
    const matches = role === "NUMBER" ? signatureSuitable(detector) : role === "PRACTICAL" ? practicalSuitable(detector) : detailSuitable(detector);
    return (allowRepeatedThemes || !usedThemes.has(theme(item.candidate.signal.forecast.metric))) && (matches || allowFallback);
  });
  const pool = suited.length ? suited : [];
  return pool.sort((a, b) => rolePriority(role, b) - rolePriority(role, a)
    || b.scores.total - a.scores.total
    || (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER)
    || a.candidate.signal.id.localeCompare(b.candidate.signal.id))[0] ?? null;
}

function selectedOnly(items: RankedWeeklySignalCandidate[]): RankedWeeklySignalCandidate[] {
  const seen = new Set<string>();
  return items.map((item) => {
    if (!item.eligible || item.rank === null || item.rejectionReasons.length) throw new Error("weekly_complementary_slides_requires_selected_signals");
    if (seen.has(item.candidate.signal.id)) throw new Error("weekly_complementary_slides_duplicate_signal");
    seen.add(item.candidate.signal.id);
    return item;
  }).sort((a, b) => (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER));
}

function slide(position: 2 | 3 | 4, role: WeeklyComplementarySlideRole, ranked: RankedWeeklySignalCandidate): WeeklyComplementarySlide {
  const copy = buildWeeklySignalCopy(ranked);
  return {
    version: WEEKLY_COMPLEMENTARY_SLIDES_VERSION,
    position, role, title: title(role), signalId: ranked.candidate.signal.id,
    detector: ranked.candidate.detector, theme: theme(ranked.candidate.signal.forecast.metric), visual: visual(ranked),
    displayValue: copy.displayValue, primaryLine: copy.primaryLine, secondaryLine: copy.secondaryLine,
    claimStatus: copy.claimStatus, sourceNote: copy.sourceNote, frame: "WEEKLY_SHARED_V1"
  };
}

/**
 * N7 creates at most three complementary slides. It never creates a slide to
 * fill a vacant role, and it never repeats a meteorological theme.
 */
export function buildWeeklyComplementarySlides(rankedCandidates: RankedWeeklySignalCandidate[], options: { allowRepeatedThemes?: boolean } = {}): WeeklyComplementarySlidePlan {
  const candidates = selectedOnly(rankedCandidates);
  const usedIds = new Set<string>();
  const usedThemes = new Set<WeeklyComplementaryTheme>();
  const slides: WeeklyComplementarySlide[] = [];
  const take = (position: 2 | 3 | 4, role: WeeklyComplementarySlideRole, fallback = false): boolean => {
    const candidate = choose(candidates.filter((item) => !usedIds.has(item.candidate.signal.id)), role, usedThemes, fallback, options.allowRepeatedThemes === true);
    if (!candidate) return false;
    slides.push(slide(position, role, candidate));
    usedIds.add(candidate.candidate.signal.id);
    usedThemes.add(theme(candidate.candidate.signal.forecast.metric));
    return true;
  };

  // Prefer a contextual statistic for slide 2. If the week only has a useful
  // phenomenon, it may still become the sole number slide rather than vanish.
  if (!take(2, "NUMBER")) take(2, "NUMBER", true);
  const practicalAdded = take(3, "PRACTICAL");
  take(practicalAdded ? 4 : 3, "DETAIL");
  return {
    version: WEEKLY_COMPLEMENTARY_SLIDES_VERSION,
    inputSignals: candidates.length,
    slides,
    omittedSignalIds: candidates.filter((item) => !usedIds.has(item.candidate.signal.id)).map((item) => item.candidate.signal.id)
  };
}
