import type { WeeklyDayProfile, WeeklyProfileSet } from "./profiles";

/** One verified, single-subject fact for « Le chiffre de la semaine ». */
export type WeeklyNumberKind = "RAIN_TOTAL" | "THERMAL_RANGE" | "HOT_HOURS" | "BRIGHT_HOURS";

export interface WeeklyNumber {
  title: "LE CHIFFRE DE LA SEMAINE";
  kind: WeeklyNumberKind;
  valueLabel: string;
  unitLabel: string;
  explanation: string;
  /** The representative V24 day is retained for traceability, not as a background choice. */
  dayIndex: number;
}

interface Candidate extends WeeklyNumber {
  score: number;
}

function representativeDay(days: WeeklyDayProfile[], measure: (day: WeeklyDayProfile) => number): WeeklyDayProfile {
  return [...days].sort((left, right) => measure(right) - measure(left) || left.dayIndex - right.dayIndex)[0]!;
}

/**
 * Retired V20 helper. It is intentionally no longer exported or called:
 * a raw forecast statistic cannot populate slide 2 without historical,
 * climatological or seasonal context. It will be replaced by the validated
 * editorial signal engine defined in WEEKLY_EDITORIAL_SIGNAL_ENGINE_PLAN.md.
 */
export function buildWeeklyNumber(profiles: WeeklyProfileSet): WeeklyNumber {
  const days = [...profiles.days].sort((left, right) => left.dayIndex - right.dayIndex);
  if (days.length !== 7) throw new Error(`weekly_number_requires_7_days:${days.length}`);

  const points = days.flatMap((day) => day.hours);
  const lowest = Math.min(...points.map((point) => point.temperatureC));
  const highest = Math.max(...points.map((point) => point.temperatureC));
  const thermalRange = highest - lowest;
  const totalRain = days.reduce((sum, day) => sum + day.fullDay.precipitation.totalMm, 0);
  const hotHours = points.filter((point) => point.temperatureC >= 20).length;
  const brightHours = days.reduce((sum, day) => sum + day.hours.filter((point) => {
    const hour = Number(point.time.slice(11, 13));
    return hour >= day.daylight.period.startHour
      && hour <= day.daylight.period.endHour
      && point.cloudCoverPct <= 35
      && point.precipitationMm < 0.1;
  }).length, 0);

  const candidates: Candidate[] = [];
  if (totalRain >= 8) {
    const day = representativeDay(days, (item) => item.fullDay.precipitation.totalMm);
    candidates.push({ title: "LE CHIFFRE DE LA SEMAINE", kind: "RAIN_TOTAL", valueLabel: `${Math.round(totalRain)} mm`, unitLabel: "DE PLUIE ATTENDUS", explanation: "Cumul prévu du lundi au dimanche.", dayIndex: day.dayIndex, score: 500 + totalRain });
  }
  if (thermalRange >= 9) {
    const day = representativeDay(days, (item) => item.fullDay.maxTemperatureC);
    candidates.push({ title: "LE CHIFFRE DE LA SEMAINE", kind: "THERMAL_RANGE", valueLabel: `${Math.round(thermalRange)} °C`, unitLabel: "D’ÉCART THERMIQUE", explanation: `Entre ${Math.round(lowest)} °C et ${Math.round(highest)} °C au cours de la semaine.`, dayIndex: day.dayIndex, score: 400 + thermalRange });
  }
  if (hotHours >= 18) {
    const day = representativeDay(days, (item) => item.hours.filter((point) => point.temperatureC >= 20).length);
    candidates.push({ title: "LE CHIFFRE DE LA SEMAINE", kind: "HOT_HOURS", valueLabel: `${hotHours} h`, unitLabel: "AU-DESSUS DE 20 °C", explanation: "Cumul prévu sur les 168 heures de la semaine.", dayIndex: day.dayIndex, score: 300 + hotHours });
  }
  if (brightHours >= 18) {
    const day = representativeDay(days, (item) => item.hours.filter((point) => {
      const hour = Number(point.time.slice(11, 13));
      return hour >= item.daylight.period.startHour && hour <= item.daylight.period.endHour && point.cloudCoverPct <= 35 && point.precipitationMm < 0.1;
    }).length);
    candidates.push({ title: "LE CHIFFRE DE LA SEMAINE", kind: "BRIGHT_HOURS", valueLabel: `${brightHours} h`, unitLabel: "LUMINEUSES", explanation: "Estimées sur les périodes de jour de la semaine.", dayIndex: day.dayIndex, score: 200 + brightHours });
  }

  const selected = candidates.sort((left, right) => right.score - left.score || left.kind.localeCompare(right.kind))[0];
  if (selected) {
    const { score: _score, ...number } = selected;
    return number;
  }

  const day = representativeDay(days, (item) => item.fullDay.maxTemperatureC);
  return {
    title: "LE CHIFFRE DE LA SEMAINE",
    kind: "THERMAL_RANGE",
    valueLabel: `${Math.max(0, Math.round(thermalRange))} °C`,
    unitLabel: "D’ÉCART THERMIQUE",
    explanation: `Entre ${Math.round(lowest)} °C et ${Math.round(highest)} °C au cours de la semaine.`,
    dayIndex: day.dayIndex
  };
}
