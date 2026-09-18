import { buildLokaEditorialCopy } from "../editorialCopy";
import type { LokaEditorialCopy } from "../editorialCopy";
import type { WeeklyEditorialMetric, WeeklyEditorialSignalMode } from "./editorialSignals";
import type { WeeklySignalCandidate } from "./signalDetectors";
import type { RankedWeeklySignalCandidate } from "./signalRanking";
import { WEEKLY_CLIMATE_STATION_ID } from "./climateReferences";

export const WEEKLY_SIGNAL_COPY_VERSION = "1.0.0" as const;

export type WeeklySignalClaimStatus = "OBSERVED" | "EXPECTED" | "POSSIBLE" | "IF_CONFIRMED";

export interface WeeklySignalCopy extends LokaEditorialCopy {
  version: typeof WEEKLY_SIGNAL_COPY_VERSION;
  signalId: string;
  mode: WeeklyEditorialSignalMode;
  claimStatus: WeeklySignalClaimStatus;
  displayValue: string;
  sourceNote: string;
  accessibilityText: string;
}

const WEEKDAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"] as const;
const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"] as const;

function factNumber(candidate: WeeklySignalCandidate, key: string): number | null {
  const value = candidate.facts[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function factString(candidate: WeeklySignalCandidate, key: string): string | null {
  const value = candidate.facts[key];
  return typeof value === "string" ? value : null;
}

function round(value: number, digits = 0): string {
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

function dateObject(iso: string): Date {
  const value = new Date(`${iso}T12:00:00Z`);
  if (Number.isNaN(value.getTime())) throw new Error("weekly_signal_copy_invalid_date");
  return value;
}

function weekday(iso: string, capitalized = false): string {
  const value = WEEKDAYS[dateObject(iso).getUTCDay()];
  return capitalized ? value[0].toUpperCase() + value.slice(1) : value;
}

function longDate(iso: string, referenceIso?: string): string {
  const date = dateObject(iso);
  const reference = referenceIso ? dateObject(referenceIso) : date;
  const year = date.getUTCFullYear() === reference.getUTCFullYear() ? "" : ` ${date.getUTCFullYear()}`;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}${year}`;
}

function valueText(metric: WeeklyEditorialMetric, value: number, unit: string): string {
  if (metric === "TEMPERATURE") return `${round(value, 1)} °C`;
  if (metric === "PRECIPITATION") return `${round(value, 1)} ${unit}`;
  if (metric === "WIND_GUST" || metric === "WIND_SPEED") return `${round(value)} km/h`;
  if (unit === "jours") return `${round(value)} jours`;
  if (unit === "h") return `${round(value)} h`;
  return `${round(value, 1)} ${unit}`;
}

function status(ranked: RankedWeeklySignalCandidate): WeeklySignalClaimStatus {
  const signal = ranked.candidate.signal;
  if (signal.mode === "OBSERVATION") return "OBSERVED";
  if (ranked.candidate.detector === "RECORD_PROXIMITY") return "IF_CONFIRMED";
  return signal.confidence === "HIGH" ? "EXPECTED" : "POSSIBLE";
}

function modal(claimStatus: WeeklySignalClaimStatus): { could: string; expected: string } {
  if (claimStatus === "OBSERVED") return { could: "a", expected: "a" };
  if (claimStatus === "EXPECTED") return { could: "devrait", expected: "est attendu" };
  return { could: "pourrait", expected: "est possible" };
}

function historicalCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const date = signal.forecast.window.startDate;
  const previousDate = factString(candidate, "previousDate") ?? signal.evidence[0].reference.window.startDate;
  const direction = factString(candidate, "direction") ?? "HIGH";
  const topic = signal.topicKey;
  let description = direction === "LOW" ? "la valeur la plus basse" : "la valeur la plus élevée";
  if (topic.startsWith("tmaxC:")) description = direction === "LOW" ? "l’après-midi le plus frais" : "l’après-midi le plus chaud";
  if (topic.startsWith("tminC:")) description = direction === "LOW" ? "la matinée la plus fraîche" : "la matinée la plus douce";
  if (topic.startsWith("rainMm:")) description = "la journée la plus pluvieuse";
  if (topic.startsWith("gust3sMs:")) description = "les rafales les plus fortes";
  const subject = weekday(date, true);
  const primary = claimStatus === "OBSERVED"
    ? `${subject} a connu ${description} depuis le ${longDate(previousDate, date)}.`
    : `${subject} ${modal(claimStatus).could} connaître ${description} depuis le ${longDate(previousDate, date)}.`;
  const secondary = claimStatus === "OBSERVED"
    ? `${valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit)} ont été observés.`
    : `${valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit)} sont prévus.`;
  return buildLokaEditorialCopy(primary, secondary);
}

function recordCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const signal = ranked.candidate.signal;
  const reference = signal.evidence[0].reference;
  const referenceDate = reference.window.startDate;
  const current = valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit);
  const previous = valueText(reference.metric, reference.value, reference.unit);
  if (claimStatus === "OBSERVED") return buildLokaEditorialCopy(
    `${current} ont été observés : l’extrême de l’archive locale est dépassé.`,
    `La référence précédente était de ${previous}, le ${longDate(referenceDate, signal.forecast.window.startDate)}.`
  );
  return buildLokaEditorialCopy(
    `Si les ${current} prévus se confirment, l’extrême local pourrait être dépassé.`,
    `La référence observée est de ${previous}, le ${longDate(referenceDate, signal.forecast.window.startDate)}.`
  );
}

function anomalyCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const anomaly = factNumber(candidate, "anomalyC") ?? signal.forecast.value - signal.evidence[0].reference.value;
  const above = anomaly >= 0;
  const subject = weekday(signal.forecast.window.startDate, true);
  const verb = claimStatus === "OBSERVED" ? "s’est situé" : `${modal(claimStatus).could} se situer`;
  const primary = `${subject} ${verb} ${round(Math.abs(anomaly), 1)} °C ${above ? "au-dessus" : "en dessous"} de la référence locale.`;
  const reference = factNumber(candidate, "referenceMeanC") ?? signal.evidence[0].reference.value;
  const secondary = `${valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit)}, contre environ ${valueText(signal.forecast.metric, reference, signal.forecast.unit)} sur la période comparable.`;
  return buildLokaEditorialCopy(primary, secondary);
}

function percentileCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const percentile = factNumber(candidate, "percentile") ?? 95;
  const high = factString(candidate, "tail") !== "LOW";
  const share = Math.max(1, high ? 100 - percentile : percentile);
  const subject = signal.forecast.window.basis === "WEEKLY_TOTAL" ? "Le cumul de la semaine" : weekday(signal.forecast.window.startDate, true);
  const verb = claimStatus === "OBSERVED" ? "s’est placé" : `${modal(claimStatus).could} se placer`;
  const primary = `${subject} ${verb} parmi les ${share} % des valeurs les plus ${high ? "élevées" : "basses"}.`;
  const secondary = `${valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit)} ${claimStatus === "OBSERVED" ? "ont été relevés" : "sont prévus"}, pour une référence P${percentile}.`;
  return buildLokaEditorialCopy(primary, secondary);
}

function seasonalCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const threshold = factNumber(candidate, "threshold") ?? signal.evidence[0].reference.value;
  const operator = factString(candidate, "operator") ?? "GTE";
  const day = weekday(signal.forecast.window.startDate, true);
  const crossing = operator === "LT" || operator === "LTE" ? `sous ${valueText(signal.forecast.metric, threshold, signal.forecast.unit)}` : `au-dessus de ${valueText(signal.forecast.metric, threshold, signal.forecast.unit)}`;
  const primary = claimStatus === "OBSERVED"
    ? `${day} marque le premier passage ${crossing} de la saison.`
    : `${day} ${modal(claimStatus).could} marquer le premier passage ${crossing} de la saison.`;
  const secondary = `${valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit)} ${claimStatus === "OBSERVED" ? "ont été observés" : "sont prévus"}.`;
  return buildLokaEditorialCopy(primary, secondary);
}

function phenomenonCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const phenomenon = factString(candidate, "phenomenon") ?? "PHENOMENON";
  const day = weekday(signal.forecast.window.startDate);
  const observed = claimStatus === "OBSERVED";
  const planned = claimStatus === "EXPECTED" ? "est prévu" : "est possible";
  const value = valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit);
  if (phenomenon === "STRONG_HEAT") return buildLokaEditorialCopy(observed ? `Une forte chaleur a marqué ${day}.` : `Une forte chaleur ${planned}e ${day}.`, observed ? `Le maximum a atteint ${value}.` : `Le maximum ${modal(claimStatus).could} atteindre ${value}.`);
  if (phenomenon === "FROST") return buildLokaEditorialCopy(observed ? `Le gel a été observé ${day}.` : `Un risque de gel est prévu ${day}.`, observed ? `La température est descendue à ${value}.` : `La température ${modal(claimStatus).could} descendre à ${value}.`);
  if (phenomenon === "HEAVY_RAIN") return buildLokaEditorialCopy(observed ? `Un épisode pluvieux marqué a concerné ${day}.` : `Un épisode pluvieux marqué ${planned} ${day}.`, observed ? `${value} sont tombés sur la journée.` : `Autour de ${value} pourraient tomber sur la journée.`);
  if (phenomenon === "INTENSE_RAIN") return buildLokaEditorialCopy(observed ? `Une forte intensité pluvieuse a été relevée ${day}.` : `Une forte intensité pluvieuse est possible ${day}.`, observed ? `Le pic a atteint ${value}.` : `Le pic pourrait atteindre ${value}.`);
  if (phenomenon === "STRONG_WIND") return buildLokaEditorialCopy(observed ? `Le vent a soufflé fortement ${day}.` : `Un fort coup de vent est possible ${day}.`, observed ? `Les rafales ont atteint ${value}.` : `Les rafales pourraient atteindre ${value}.`);
  if (phenomenon === "THUNDER") return buildLokaEditorialCopy(observed ? `Une activité orageuse a concerné ${day}.` : `Un risque orageux est présent ${day}.`, observed ? `${value} de signal orageux ont été relevées.` : `Le signal pourrait durer autour de ${value}.`);
  return buildLokaEditorialCopy(observed ? `Un brouillard marqué a concerné ${day}.` : `Un brouillard marqué est possible ${day}.`, observed ? `La visibilité a été réduite pendant environ ${value}.` : `La visibilité pourrait être réduite pendant environ ${value}.`);
}

function regimeCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const direction = factString(candidate, "direction");
  const day = weekday(signal.forecast.window.endDate);
  const observed = claimStatus === "OBSERVED";
  const value = valueText(signal.forecast.metric, Math.abs(signal.forecast.value), signal.forecast.unit);
  if (direction === "COOLING" || direction === "WARMING") {
    const noun = direction === "COOLING" ? "refroidissement" : "réchauffement";
    const expectation = claimStatus === "EXPECTED" ? "est attendu" : "est possible";
    return buildLokaEditorialCopy(observed ? `Un net ${noun} s’est produit ${day}.` : `Un net ${noun} ${expectation} ${day}.`, observed ? `L’écart a atteint ${value} en 24 heures.` : `L’écart pourrait atteindre ${value} en 24 heures.`);
  }
  if (direction === "RAIN_ARRIVAL") return buildLokaEditorialCopy(observed ? `La pluie a fait son retour ${day}.` : `La pluie ${modal(claimStatus).could} faire son retour ${day}.`, observed ? `Le cumul a augmenté de ${value} en 24 heures.` : `Le cumul pourrait augmenter de ${value} en 24 heures.`);
  return buildLokaEditorialCopy(observed ? `Le vent s’est nettement renforcé ${day}.` : `Le vent ${modal(claimStatus).could} nettement se renforcer ${day}.`, observed ? `Les rafales ont gagné ${value} en 24 heures.` : `Les rafales pourraient gagner ${value} en 24 heures.`);
}

function seriesCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const projected = factNumber(candidate, "projectedLength") ?? signal.forecast.value;
  const historical = factNumber(candidate, "historicalLongestRun") ?? signal.evidence[0].reference.value;
  const dry = signal.forecast.metric === "PRECIPITATION" && (factString(candidate, "operator") === "LT" || factString(candidate, "operator") === "LTE");
  const label = dry ? "sans pluie significative" : "consécutifs au-dessus du seuil";
  const primary = claimStatus === "OBSERVED"
    ? `La série atteint ${round(projected)} jours ${label}.`
    : `La série ${modal(claimStatus).could} atteindre ${round(projected)} jours ${label}.`;
  const secondary = `La plus longue séquence de la référence fournie comptait ${round(historical)} jours.`;
  return buildLokaEditorialCopy(primary, secondary);
}

function intradayCopy(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const candidate = ranked.candidate;
  const signal = candidate.signal;
  const day = weekday(signal.forecast.window.startDate, true);
  const observed = claimStatus === "OBSERVED";
  const value = valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit);
  if (factString(candidate, "change") === "RAPID_DROP") {
    const start = factNumber(candidate, "startHour"); const end = factNumber(candidate, "endHour");
    return buildLokaEditorialCopy(observed ? `${day} a perdu ${value} en quelques heures.` : `${day} pourrait perdre ${value} en quelques heures.`, `La baisse se concentre entre ${start ?? "?"} h et ${end ?? "?"} h.`);
  }
  return buildLokaEditorialCopy(observed ? `${day} a connu une amplitude de ${value}.` : `${day} pourrait connaître une amplitude de ${value}.`, "L’écart est calculé entre le minimum et le maximum de la même journée.");
}

function write(ranked: RankedWeeklySignalCandidate, claimStatus: WeeklySignalClaimStatus): LokaEditorialCopy {
  const detector = ranked.candidate.detector;
  if (detector === "HISTORICAL_SINCE") return historicalCopy(ranked, claimStatus);
  if (detector === "RECORD_PROXIMITY") return recordCopy(ranked, claimStatus);
  if (detector === "CLIMATE_ANOMALY") return anomalyCopy(ranked, claimStatus);
  if (detector === "EXTREME_PERCENTILE") return percentileCopy(ranked, claimStatus);
  if (detector === "SEASONAL_FIRST") return seasonalCopy(ranked, claimStatus);
  if (detector === "IMPACT_PHENOMENON") return phenomenonCopy(ranked, claimStatus);
  if (detector === "REGIME_CHANGE") return regimeCopy(ranked, claimStatus);
  if (detector === "REMARKABLE_SERIES") return seriesCopy(ranked, claimStatus);
  return intradayCopy(ranked, claimStatus);
}

export function buildWeeklySignalCopy(ranked: RankedWeeklySignalCandidate): WeeklySignalCopy {
  if (!ranked.eligible || ranked.rank === null || ranked.rejectionReasons.length) throw new Error("weekly_signal_copy_requires_selected_candidate");
  if (ranked.candidate.signal.mode === "OBSERVATION" && ranked.candidate.signal.evidence.some((proof) => proof.source === "CONSENSUS_FORECAST")) {
    throw new Error("weekly_signal_copy_observation_requires_observed_source");
  }
  const claimStatus = status(ranked);
  const copy = write(ranked, claimStatus);
  const signal = ranked.candidate.signal;
  const displayValue = valueText(signal.forecast.metric, signal.forecast.value, signal.forecast.unit);
  const directConsensus = signal.evidence.every((proof) => proof.source === "CONSENSUS_FORECAST" && proof.direct === true);
  const sourceNote = signal.mode === "OBSERVATION"
    ? "Observation locale Météo-France comparée à la référence historique retenue."
    : directConsensus
      ? "Prévision issue du consensus LOKA, comparée à un seuil moteur documenté."
      : `Prévision LOKA comparée à Météo-France Biarritz (${WEEKLY_CLIMATE_STATION_ID}).`;
  return {
    version: WEEKLY_SIGNAL_COPY_VERSION,
    signalId: signal.id,
    mode: signal.mode,
    claimStatus,
    displayValue,
    primaryLine: copy.primaryLine,
    secondaryLine: copy.secondaryLine,
    sourceNote,
    accessibilityText: `${copy.primaryLine} ${copy.secondaryLine}`
  };
}

export function buildWeeklySignalCopies(ranked: RankedWeeklySignalCandidate[]): WeeklySignalCopy[] {
  return ranked.map(buildWeeklySignalCopy);
}
