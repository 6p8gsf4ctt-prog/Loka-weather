import { SCENE_THRESHOLDS } from "../config/scenes24";
import type {
  AdaptiveTimeline,
  CityConfig,
  ConsensusHour,
  ContextualData,
  DayClassification,
  DayProfileV2,
  EditorialSignals,
  KeyMoment,
  KeyTakeaway,
  WeatherConfidence
} from "../types";
import { hourOf } from "./math";

function isWet(p: ConsensusHour): boolean {
  return (p.precipitationMm >= SCENE_THRESHOLDS.rain.wetHourMinMm && p.precipitationSupport >= SCENE_THRESHOLDS.rain.supportMin)
    || p.rainCodeSupport >= SCENE_THRESHOLDS.rain.supportMin;
}

function dayPoints(date: string, allPoints: ConsensusHour[]): ConsensusHour[] {
  return allPoints
    .filter((p) => p.time.slice(0, 10) === date)
    .filter((p) => hourOf(p.time) >= 6 && hourOf(p.time) <= 22)
    .sort((a, b) => a.time.localeCompare(b.time));
}

function hottest(day: ConsensusHour[]): ConsensusHour {
  return [...day].sort((a, b) => b.temperatureC - a.temperatureC || a.time.localeCompare(b.time))[0];
}

function gustiest(day: ConsensusHour[]): ConsensusHour {
  return [...day].sort((a, b) => b.windGustKmh - a.windGustKmh || a.time.localeCompare(b.time))[0];
}

function wetBounds(day: ConsensusHour[]): { startHour: number; endHour: number } | null {
  const wet = day.filter(isWet);
  return wet.length ? { startHour: hourOf(wet[0].time), endHour: hourOf(wet[wet.length - 1].time) } : null;
}

function fogBounds(day: ConsensusHour[]): { startHour: number; endHour: number } | null {
  const fog = day.filter((p) => p.fogSupport >= SCENE_THRESHOLDS.fog.supportMin);
  return fog.length ? { startHour: hourOf(fog[0].time), endHour: hourOf(fog[fog.length - 1].time) } : null;
}

function firstDryAfter(day: ConsensusHour[], hour: number): number | null {
  const p = day.find((x) => hourOf(x.time) > hour && !isWet(x));
  return p ? hourOf(p.time) : null;
}

function longestDryWindow(day: ConsensusHour[]): { startHour: number; endHour: number; hours: number } | null {
  let best: { startHour: number; endHour: number; hours: number } | null = null;
  let start = -1;
  for (let i = 0; i <= day.length; i++) {
    const dry = i < day.length ? !isWet(day[i]) : false;
    if (dry && start < 0) start = i;
    if (start >= 0 && (!dry || i === day.length)) {
      const end = i - 1;
      const candidate = {
        startHour: hourOf(day[start].time),
        endHour: hourOf(day[end].time),
        hours: end - start + 1
      };
      if (!best || candidate.hours > best.hours) best = candidate;
      start = -1;
    }
  }
  return best;
}

function uncertaintyWindow(confidence: WeatherConfidence, type: WeatherConfidence["mainUncertainty"]): { startHour: number; endHour: number } | null {
  return confidence.mainUncertainty === type ? confidence.period : null;
}

function rainTakeaway(day: ConsensusHour[], classification: DayClassification, confidence: WeatherConfidence): KeyTakeaway {
  const bounds = wetBounds(day);
  if (!bounds) return { type: "CHANGE", startHour: classification.transition.startHour, endHour: classification.transition.endHour };
  const uncertainStart = uncertaintyWindow(confidence, "RAIN_START");
  if (uncertainStart) return { type: "RAIN_START", startHour: uncertainStart.startHour, endHour: uncertainStart.endHour, uncertain: true };

  const firstWet = bounds.startHour;
  const lastWet = bounds.endHour;
  const daylightStart = day.length ? hourOf(day[0].time) : 6;
  const daylightEnd = day.length ? hourOf(day[day.length - 1].time) : 22;
  if (firstWet >= daylightStart + 3) return { type: "RAIN_START", startHour: firstWet, endHour: null };
  const dryAfter = firstDryAfter(day, lastWet);
  if (dryAfter !== null && lastWet <= daylightEnd - 3) return { type: "RAIN_END", startHour: dryAfter, endHour: null };
  return { type: "CHANGE", startHour: classification.transition.startHour, endHour: classification.transition.endHour };
}

function keyTakeaway(city: CityConfig, day: ConsensusHour[], classification: DayClassification, confidence: WeatherConfidence): KeyTakeaway {
  const period = classification.keyPeriod;
  switch (classification.dominantPhenomenon) {
    case "THUNDER":
      return { type: "THUNDER", startHour: period?.startHour ?? classification.transition.peakHour, endHour: period?.endHour ?? null, uncertain: confidence.mainUncertainty === "THUNDER_PRESENCE" };
    case "RAIN":
    case "SHOWERS":
      return rainTakeaway(day, classification, confidence);
    case "WIND":
      return { type: "WIND", startHour: period?.startHour ?? null, endHour: period?.endHour ?? null };
    case "FOG": {
      const fog = fogBounds(day);
      return { type: "FOG", startHour: fog?.startHour ?? null, endHour: fog?.endHour ?? null, uncertain: confidence.mainUncertainty === "FOG_END" || confidence.mainUncertainty === "FOG_PRESENCE" };
    }
    case "HEAT":
      return { type: "HEAT_PEAK", startHour: period?.startHour ?? hourOf(hottest(day).time), endHour: period?.endHour ?? null };
    case "COLD":
      return { type: "COOL", startHour: day.length ? hourOf(day[0].time) : null, endHour: day.length ? hourOf(day[day.length - 1].time) : null };
    case "SKY_DEGRADATION":
      return { type: "CHANGE", startHour: classification.transition.startHour, endHour: classification.transition.endHour };
    case "SKY_IMPROVEMENT":
      return { type: "IMPROVEMENT", startHour: classification.transition.startHour, endHour: classification.transition.endHour };
    default: {
      const hot = hottest(day);
      if (hot.temperatureC >= city.thermal.afternoonHotFromC) return { type: "TEMPERATURE_PEAK", startHour: hourOf(hot.time), endHour: null };
      return { type: "STABILITY", startHour: null, endHour: null };
    }
  }
}

function keyMomentFor(day: ConsensusHour[], classification: DayClassification, takeaway: KeyTakeaway): KeyMoment {
  const transition = classification.transition;
  const hot = hottest(day);
  const wind = gustiest(day);
  const fog = fogBounds(day);
  const dry = longestDryWindow(day);

  switch (takeaway.type) {
    case "THUNDER": return { type: "THUNDER", hour: transition.peakHour, startHour: takeaway.startHour, endHour: takeaway.endHour };
    case "RAIN_START": return { type: "CHANGE", hour: transition.peakHour ?? takeaway.startHour, startHour: transition.startHour ?? takeaway.startHour, endHour: transition.endHour ?? takeaway.endHour };
    case "RAIN_END": return { type: "RAIN_END", hour: takeaway.startHour, startHour: takeaway.startHour, endHour: null };
    case "WIND": return { type: "WIND_PEAK", hour: hourOf(wind.time), startHour: classification.keyPeriod?.startHour ?? null, endHour: classification.keyPeriod?.endHour ?? null };
    case "FOG": return { type: "FOG_END", hour: fog ? Math.min(22, fog.endHour + 1) : transition.peakHour, startHour: fog?.startHour ?? null, endHour: fog?.endHour ?? null };
    case "HEAT_PEAK":
    case "COOL":
    case "TEMPERATURE_PEAK": return { type: "HOTTEST", hour: hourOf(hot.time), startHour: classification.keyPeriod?.startHour ?? null, endHour: classification.keyPeriod?.endHour ?? null };
    case "IMPROVEMENT": return { type: "IMPROVEMENT", hour: transition.peakHour, startHour: transition.startHour, endHour: transition.endHour };
    case "CHANGE": return { type: "CHANGE", hour: transition.peakHour, startHour: transition.startHour, endHour: transition.endHour };
    case "DRY_WINDOW":
    case "BEST_PERIOD": return { type: "BEST_WINDOW", hour: null, startHour: dry?.startHour ?? null, endHour: dry?.endHour ?? null };
    case "STABILITY": return { type: "HOTTEST", hour: hourOf(hot.time), startHour: null, endHour: null };
  }
}

function contextualData(day: ConsensusHour[], profile: DayProfileV2, takeaway: KeyTakeaway, keyMoment: KeyMoment): ContextualData | null {
  const bounds = wetBounds(day);
  const dry = longestDryWindow(day);
  const maxGust = gustiest(day).windGustKmh;
  const hot = hottest(day).temperatureC;
  const min = Math.min(...day.map((p) => p.temperatureC));

  if (takeaway.type === "RAIN_START" && bounds && bounds.startHour > 8) {
    return { type: "DRY_WINDOW", value: null, unit: null, startHour: day.length ? hourOf(day[0].time) : 6, endHour: bounds.startHour - 1 };
  }
  if ((takeaway.type === "RAIN_END" || takeaway.type === "CHANGE") && profile.rain.rainTotalMm >= 1 && keyMoment.type !== "RAIN_START") {
    return { type: "RAIN_TOTAL", value: Math.round(profile.rain.rainTotalMm * 10) / 10, unit: "mm" };
  }
  if (takeaway.type === "WIND") {
    return { type: "WIND_GUST", value: Math.round(maxGust), unit: "km/h" };
  }
  if (takeaway.type === "FOG" && profile.visibility.fogHours > 0) {
    return { type: "FOG_DURATION", value: profile.visibility.fogHours, unit: "h" };
  }
  if (takeaway.type === "COOL") {
    return { type: "TEMPERATURE_MAX", value: Math.round(hot), unit: "°C" };
  }
  if (takeaway.type === "STABILITY" && hot - min >= 8) {
    return { type: "TEMPERATURE_RANGE", value: Math.round(hot - min), unit: "°C" };
  }
  if ((takeaway.type === "CHANGE" || takeaway.type === "IMPROVEMENT") && dry && dry.hours >= 4) {
    return { type: "DRY_WINDOW", value: null, unit: null, startHour: dry.startHour, endHour: dry.endHour };
  }
  return null;
}

export function buildEditorialSignals(
  city: CityConfig,
  date: string,
  profile: DayProfileV2,
  classification: DayClassification,
  confidence: WeatherConfidence,
  _timeline: AdaptiveTimeline,
  allPoints: ConsensusHour[]
): EditorialSignals {
  const day = dayPoints(date, allPoints);
  if (!day.length) throw new Error(`editorial_signals_no_points:${date}`);
  const takeaway = keyTakeaway(city, day, classification, confidence);
  const moment = keyMomentFor(day, classification, takeaway);
  const context = contextualData(day, profile, takeaway, moment);
  return { keyTakeaway: takeaway, keyMoment: moment, contextualData: context };
}
