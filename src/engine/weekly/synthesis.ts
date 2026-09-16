import { buildLokaEditorialCopy, type LokaEditorialCopy } from "../editorialCopy";
import type { WeeklyFixedFacts } from "./fixedFacts";
import type { WeeklyDayProfile } from "./profiles";

/** Thermal vocabulary intentionally follows the V1 thresholds approved for the weekly product. */
export type WeeklyThermalClass = "COLD" | "COOL" | "MILD" | "PLEASANT" | "WARM" | "MARKED_HEAT";

export const WEEKLY_THERMAL_VOCABULARY: ReadonlyArray<{ maximumExclusive: number; thermalClass: WeeklyThermalClass }> = [
  { maximumExclusive: 10, thermalClass: "COLD" },
  { maximumExclusive: 15, thermalClass: "COOL" },
  { maximumExclusive: 20, thermalClass: "MILD" },
  { maximumExclusive: 25, thermalClass: "PLEASANT" },
  { maximumExclusive: 30, thermalClass: "WARM" },
  { maximumExclusive: Number.POSITIVE_INFINITY, thermalClass: "MARKED_HEAT" }
];

export interface WeeklySynthesisEvidence {
  thermalClass: WeeklyThermalClass;
  maximumTemperatureC: number;
  minimumDailyMaximumC: number;
  maximumDayIndexes: number[];
  totalPrecipitationMm: number;
  wetHours: number;
  dryWeek: boolean;
  meanBrightFraction: number;
  startBrightFraction: number;
  endBrightFraction: number;
  startCloudCoverPct: number;
  endCloudCoverPct: number;
  measuredBrightening: boolean;
  measuredClouding: boolean;
}

export interface WeeklySlide1Synthesis extends LokaEditorialCopy {
  primaryMaximumLines: 1;
  secondaryMaximumLines: 2;
  evidence: WeeklySynthesisEvidence;
}

export function weeklyThermalClass(maximumTemperatureC: number): WeeklyThermalClass {
  if (!Number.isFinite(maximumTemperatureC)) throw new Error("weekly_thermal_class_requires_temperature");
  return WEEKLY_THERMAL_VOCABULARY.find((item) => maximumTemperatureC < item.maximumExclusive)?.thermalClass ?? "MARKED_HEAT";
}

function thermalLead(thermalClass: WeeklyThermalClass): string {
  switch (thermalClass) {
    case "COLD": return "Temps froid";
    case "COOL": return "Temps frais";
    case "MILD": return "Temps doux";
    case "PLEASANT": return "Temps agréable";
    case "WARM": return "Temps chaud";
    case "MARKED_HEAT": return "Chaleur marquée";
  }
}

function average(values: number[]): number {
  if (!values.length || values.some((value) => !Number.isFinite(value))) throw new Error("weekly_synthesis_requires_finite_values");
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function weekdayName(date: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", weekday: "long" })
    .format(new Date(`${date}T12:00:00Z`));
}

function joinFrench(values: string[]): string {
  if (values.length === 1) return values[0] ?? "";
  if (values.length === 2) return `${values[0]} et ${values[1]}`;
  return `${values.slice(0, -1).join(", ")} et ${values.at(-1)}`;
}

function formatMillimetres(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return String(rounded).replace(".", ",");
}

function rangeSentence(minimumDailyMaximumC: number, maximumTemperatureC: number): string {
  const min = Math.round(minimumDailyMaximumC);
  const max = Math.round(maximumTemperatureC);
  return min === max
    ? `Les maximales resteront proches de ${max} °C.`
    : `Les maximales évolueront de ${min} à ${max} °C.`;
}

/**
 * Produces only statements that can be proven from the seven daily profiles.
 * “Davantage de soleil” and “plus nuageux” deliberately require simultaneous
 * and significant changes in brightness and mean cloud cover.
 */
export function buildWeeklySlide1Synthesis(days: WeeklyDayProfile[], facts: WeeklyFixedFacts): WeeklySlide1Synthesis {
  const ordered = [...days].sort((left, right) => left.dayIndex - right.dayIndex);
  if (ordered.length !== 7 || ordered.some((day, index) => day.dayIndex !== index)) {
    throw new Error(`weekly_synthesis_requires_ordered_7_days:${ordered.length}`);
  }

  const dailyMaximums = ordered.map((day) => day.fullDay.maxTemperatureC);
  const maximumTemperatureC = Math.max(...dailyMaximums);
  const minimumDailyMaximumC = Math.min(...dailyMaximums);
  const start = ordered.slice(0, 2);
  const end = ordered.slice(-2);
  const startBrightFraction = average(start.map((day) => day.daylight.light.brightFraction));
  const endBrightFraction = average(end.map((day) => day.daylight.light.brightFraction));
  const startCloudCoverPct = average(start.map((day) => day.daylight.cloud.meanCoverPct));
  const endCloudCoverPct = average(end.map((day) => day.daylight.cloud.meanCoverPct));
  const meanBrightFraction = average(ordered.map((day) => day.daylight.light.brightFraction));
  const totalPrecipitationMm = ordered.reduce((sum, day) => sum + day.fullDay.precipitation.totalMm, 0);
  const wetHours = ordered.reduce((sum, day) => sum + day.fullDay.precipitation.wetHours, 0);
  const dryWeek = wetHours === 0 && totalPrecipitationMm <= 0.2;
  const measuredBrightening = endBrightFraction - startBrightFraction >= 0.2
    && startCloudCoverPct - endCloudCoverPct >= 15;
  const measuredClouding = startBrightFraction - endBrightFraction >= 0.2
    && endCloudCoverPct - startCloudCoverPct >= 15;
  const thermalClass = weeklyThermalClass(maximumTemperatureC);
  const maximumDays = facts.hottestDay.matches.length ? facts.hottestDay.matches : [facts.hottestDay];
  const maximumDayIndexes = maximumDays.map((match) => match.dayIndex);
  const maximumDayNames = joinFrench(maximumDays.map((match) => weekdayName(match.date)));
  const evidence: WeeklySynthesisEvidence = {
    thermalClass,
    maximumTemperatureC,
    minimumDailyMaximumC,
    maximumDayIndexes,
    totalPrecipitationMm,
    wetHours,
    dryWeek,
    meanBrightFraction,
    startBrightFraction,
    endBrightFraction,
    startCloudCoverPct,
    endCloudCoverPct,
    measuredBrightening,
    measuredClouding
  };

  let primaryLine: string;
  let secondaryLine: string;
  const significantRain = wetHours >= 4 || totalPrecipitationMm >= 2;
  const solarDominant = dryWeek && meanBrightFraction >= 0.6;

  if (thermalClass === "MARKED_HEAT") {
    primaryLine = dryWeek
      ? "Chaleur marquée · Temps majoritairement sec"
      : solarDominant
        ? "Chaleur marquée · Soleil bien présent cette semaine"
        : "Chaleur marquée · Des conditions variables selon les journées";
    secondaryLine = `Les températures culmineront à ${Math.round(maximumTemperatureC)} °C ${maximumDayNames}.`;
  } else if (significantRain) {
    primaryLine = measuredClouding
      ? "Pluies fréquentes · Un ciel plus nuageux en fin de semaine"
      : "Pluies fréquentes · Des conditions souvent humides";
    secondaryLine = `Autour de ${formatMillimetres(totalPrecipitationMm)} mm attendus sur la semaine.`;
  } else if (measuredBrightening) {
    primaryLine = `${thermalLead(thermalClass)} · Davantage de soleil en fin de semaine`;
    secondaryLine = rangeSentence(minimumDailyMaximumC, maximumTemperatureC);
  } else if (measuredClouding) {
    primaryLine = `${thermalLead(thermalClass)} · Plus nuageux en fin de semaine`;
    secondaryLine = rangeSentence(minimumDailyMaximumC, maximumTemperatureC);
  } else if (solarDominant) {
    primaryLine = `${thermalLead(thermalClass)} et sec · Soleil bien présent cette semaine`;
    secondaryLine = rangeSentence(minimumDailyMaximumC, maximumTemperatureC);
  } else if (dryWeek) {
    primaryLine = `${thermalLead(thermalClass)} · Temps sec cette semaine`;
    secondaryLine = rangeSentence(minimumDailyMaximumC, maximumTemperatureC);
  } else {
    primaryLine = `${thermalLead(thermalClass)} · Des conditions variables selon les journées`;
    secondaryLine = rangeSentence(minimumDailyMaximumC, maximumTemperatureC);
  }

  return {
    ...buildLokaEditorialCopy(primaryLine, secondaryLine),
    primaryMaximumLines: 1,
    secondaryMaximumLines: 2,
    evidence
  };
}
