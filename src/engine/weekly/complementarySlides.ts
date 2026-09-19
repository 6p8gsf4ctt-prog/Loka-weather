import { buildWeeklySignalCopy } from "./signalCopy";
import type { WeeklySignalClaimStatus } from "./signalCopy";
import type { WeeklySignalCopy } from "./signalCopy";
import type { WeeklyEditorialMetric } from "./editorialSignals";
import type { RankedWeeklySignalCandidate } from "./signalRanking";
import type { WeeklySignalDetectorKind } from "./signalDetectors";

export const WEEKLY_COMPLEMENTARY_SLIDES_VERSION = "1.0.0" as const;

export type WeeklyComplementarySlideRole = "NUMBER" | "PRACTICAL" | "DETAIL";
export type WeeklyComplementaryTheme = "TEMPERATURE" | "WET_WEATHER" | "WIND" | "VISIBILITY" | "LIGHT" | "OTHER";
export type WeeklyComplementaryVisual = "THERMOMETER" | "RAIN" | "WIND" | "THUNDER" | "FOG" | "SUN" | "TREND";
export type WeeklyComplementaryLayout = "COMPARISON" | "SINGLE_STAT";

export interface WeeklyComplementaryComparisonItem {
  value: string;
  label: string;
}

export interface WeeklyComplementaryPresentation {
  layout: WeeklyComplementaryLayout;
  headline: string;
  subtitle: string;
  editorialLine: string;
  comparison: { left: WeeklyComplementaryComparisonItem; right: WeeklyComplementaryComparisonItem } | null;
}

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
  /** Short, social-first composition. The technical copy remains metadata only. */
  presentation?: WeeklyComplementaryPresentation;
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
    || detector === "HISTORICAL_SINCE" || detector === "RECENT_EXTREME" || detector === "EXTREME_PERCENTILE";
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

const WEEKDAYS = ["DIMANCHE", "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"] as const;

function factNumber(item: RankedWeeklySignalCandidate, key: string): number | null {
  const value = item.candidate.facts[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function factString(item: RankedWeeklySignalCandidate, key: string): string | null {
  const value = item.candidate.facts[key];
  return typeof value === "string" ? value : null;
}

function formatNumber(value: number, digits = 1): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

function formatMetric(item: RankedWeeklySignalCandidate, value: number): string {
  const metric = item.candidate.signal.forecast.metric;
  const unit = item.candidate.signal.forecast.unit;
  if (metric === "TEMPERATURE") return `${formatNumber(value)} °C`;
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return `${formatNumber(value, 0)} km/h`;
  return `${formatNumber(value)} ${unit}`;
}

function weekday(item: RankedWeeklySignalCandidate): string {
  const date = new Date(`${item.candidate.signal.forecast.window.startDate}T12:00:00Z`);
  return WEEKDAYS[date.getUTCDay()] ?? "CETTE SEMAINE";
}

function sentence(value: string): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  const words = normalized.split(" ").filter(Boolean);
  const shortened = words.length <= 25 ? normalized : `${words.slice(0, 24).join(" ").replace(/[,:;]$/, "")}.`;
  return /[.!?]$/.test(shortened) ? shortened : `${shortened}.`;
}

/**
 * Turns a rigorous signal into one immediately readable social story.
 * The headline describes what is remarkable; raw values become a comparison
 * only when they help the reader understand that story.
 */
export function buildWeeklyComplementaryPresentation(
  ranked: RankedWeeklySignalCandidate,
  copy: WeeklySignalCopy = buildWeeklySignalCopy(ranked)
): WeeklyComplementaryPresentation {
  const signal = ranked.candidate.signal;
  const detector = ranked.candidate.detector;
  const day = weekday(ranked);
  const reference = signal.evidence[0]?.reference.value ?? signal.forecast.value;
  const forecast = formatMetric(ranked, signal.forecast.value);
  const referenceValue = formatMetric(ranked, reference);

  if (detector === "CLIMATE_ANOMALY") {
    const anomaly = factNumber(ranked, "anomalyC") ?? signal.forecast.value - reference;
    const above = anomaly >= 0;
    const magnitude = formatNumber(Math.abs(anomaly));
    return {
      layout: "COMPARISON",
      headline: `${above ? "+" : "−"}${magnitude} °C`,
      subtitle: `${above ? "AU-DESSUS" : "EN DESSOUS"} DE LA NORMALE À TARNOS`,
      comparison: {
        left: { value: forecast, label: `PRÉVUS ${day}` },
        right: { value: referenceValue, label: "HABITUELLEMENT" }
      },
      editorialLine: `Presque ${formatNumber(Math.abs(anomaly), 0)} °C ${above ? "de plus" : "de moins"} que ce qui est habituel à cette période.`
    };
  }

  if (detector === "INTRADAY_CHANGE" && factString(ranked, "change") === "AMPLITUDE") {
    const minimum = factNumber(ranked, "minC");
    const maximum = factNumber(ranked, "maxC");
    return {
      layout: minimum === null || maximum === null ? "SINGLE_STAT" : "COMPARISON",
      headline: forecast,
      subtitle: "D’ÉCART ENTRE LE MATIN ET L’APRÈS-MIDI",
      comparison: minimum === null || maximum === null ? null : {
        left: { value: formatMetric(ranked, minimum), label: "LE MATIN" },
        right: { value: formatMetric(ranked, maximum), label: "L’APRÈS-MIDI" }
      },
      editorialLine: `${day[0]}${day.slice(1).toLocaleLowerCase("fr-FR")}, à Tarnos, l’amplitude thermique devrait être très marquée au fil de la journée.`
    };
  }

  if (detector === "HISTORICAL_SINCE" || detector === "RECENT_EXTREME") {
    const days = factNumber(ranked, "daysSince");
    const direction = factString(ranked, "direction") ?? "HIGH";
    const subject = signal.forecast.metric === "PRECIPITATION" ? "UNE JOURNÉE AUSSI PLUVIEUSE"
      : signal.forecast.metric === "WIND_GUST" ? "DES RAFALES AUSSI FORTES"
        : direction === "LOW" ? "UN MATIN AUSSI FRAIS" : "UNE JOURNÉE AUSSI CHAUDE";
    return {
      layout: "COMPARISON",
      headline: days === null ? forecast : `${formatNumber(days, 0)} JOURS`,
      subtitle: days === null ? subject : `DEPUIS ${subject}`,
      comparison: {
        left: { value: forecast, label: `PRÉVUS ${day}` },
        right: { value: referenceValue, label: "DERNIÈRE VALEUR COMPARABLE" }
      },
      editorialLine: sentence(copy.primaryLine)
    };
  }

  if (detector === "EXTREME_PERCENTILE") {
    const percentile = factNumber(ranked, "percentile") ?? 95;
    const high = factString(ranked, "tail") !== "LOW";
    const share = Math.max(1, high ? 100 - percentile : percentile);
    return {
      layout: "COMPARISON",
      headline: `${formatNumber(share, 0)} %`,
      subtitle: `PARMI LES VALEURS LES PLUS ${high ? "ÉLEVÉES" : "BASSES"}`,
      comparison: {
        left: { value: forecast, label: `PRÉVUS ${day}` },
        right: { value: referenceValue, label: `SEUIL DES ${formatNumber(share, 0)} %` }
      },
      editorialLine: sentence(copy.primaryLine)
    };
  }

  if (detector === "REMARKABLE_SERIES") {
    const projected = factNumber(ranked, "projectedLength") ?? signal.forecast.value;
    const dry = signal.forecast.metric === "PRECIPITATION" && ["LT", "LTE"].includes(factString(ranked, "operator") ?? "");
    return {
      layout: "SINGLE_STAT",
      headline: `${formatNumber(projected, 0)} JOURS`,
      subtitle: dry ? "SANS PLUIE SIGNIFICATIVE" : "CONSÉCUTIFS AU-DESSUS DU SEUIL",
      comparison: null,
      editorialLine: sentence(copy.primaryLine)
    };
  }

  const subtitles: Partial<Record<WeeklySignalDetectorKind, string>> = {
    RECORD_PROXIMITY: "UN RECORD LOCAL POURRAIT ÊTRE APPROCHÉ",
    SEASONAL_FIRST: "UN PREMIER SEUIL CETTE SAISON",
    IMPACT_PHENOMENON: "LE PHÉNOMÈNE À SURVEILLER",
    REGIME_CHANGE: "UN CHANGEMENT NET EN 24 HEURES",
    INTRADAY_CHANGE: "UN CHANGEMENT RAPIDE DANS LA JOURNÉE"
  };
  return {
    layout: "SINGLE_STAT",
    headline: forecast,
    subtitle: subtitles[detector] ?? "LE DÉTAIL MÉTÉO À RETENIR",
    comparison: null,
    editorialLine: sentence(copy.primaryLine)
  };
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
    presentation: buildWeeklyComplementaryPresentation(ranked, copy),
    claimStatus: copy.claimStatus, sourceNote: copy.sourceNote, frame: "WEEKLY_SHARED_V1"
  };
}

/**
 * N7 creates at most three complementary slides. Automatic selection keeps
 * its role and theme safeguards. Manual selection may instead preserve every
 * explicit choice, in order, because the editor has final authority.
 */
export function buildWeeklyComplementarySlides(
  rankedCandidates: RankedWeeklySignalCandidate[],
  options: { allowRepeatedThemes?: boolean; preserveSelectionOrder?: boolean } = {}
): WeeklyComplementarySlidePlan {
  const candidates = selectedOnly(rankedCandidates);
  if (options.preserveSelectionOrder) {
    const roles: WeeklyComplementarySlideRole[] = ["NUMBER", "PRACTICAL", "DETAIL"];
    const slides = candidates.slice(0, 3).map((candidate, index) => slide((index + 2) as 2 | 3 | 4, roles[index]!, candidate));
    return {
      version: WEEKLY_COMPLEMENTARY_SLIDES_VERSION,
      inputSignals: candidates.length,
      slides,
      omittedSignalIds: candidates.slice(3).map((item) => item.candidate.signal.id)
    };
  }
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
