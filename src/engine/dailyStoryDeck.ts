import type {
  CityConfig,
  ConsensusHour,
  HourlyCondition,
  OfficialPublicPayloadV24,
  VisualIcon
} from "../types";
import { hourOf } from "./math";
import { solarPresentation, type SolarPresentation } from "../ui/solarTimes";

export const DAILY_STORY_DECK_VERSION = "1.0.0" as const;
export const DAILY_STORY_DECK_HOURS = Object.freeze(
  Array.from({ length: 19 }, (_, index) => index + 4)
);

export type DailyStoryDeckSlideId =
  | "OVERVIEW"
  | "HOURLY"
  | "DAYLIGHT"
  | "MOON"
  | "SUMMARY";

export interface DailyStoryDeckSlideDescriptor {
  position: 1 | 2 | 3 | 4 | 5;
  id: DailyStoryDeckSlideId;
  title: string;
  dataKey: "overview" | "hourly" | "daylight" | "moon" | "summary";
}

export interface DailyStoryDeckHourlyPoint {
  hour: number;
  sourceTime: string | null;
  temperatureC: number | null;
  condition: HourlyCondition | null;
  precipitationMm: number | null;
  windGustKmh: number | null;
  modelCount: number | null;
  available: boolean;
}

export type MoonPhaseKey =
  | "NEW_MOON"
  | "WAXING_CRESCENT"
  | "FIRST_QUARTER"
  | "WAXING_GIBBOUS"
  | "FULL_MOON"
  | "WANING_GIBBOUS"
  | "LAST_QUARTER"
  | "WANING_CRESCENT";

export interface DailyMoonPresentation {
  phase: MoonPhaseKey;
  phaseLabel: string;
  illuminationPct: number;
  ageDays: number;
  trend: "CROISSANTE" | "DECROISSANTE";
  moonrise: string | null;
  moonset: string | null;
  nextPrincipalPhase: {
    phase: "FIRST_QUARTER" | "FULL_MOON" | "LAST_QUARTER" | "NEW_MOON";
    label: string;
    estimatedDate: string;
  };
  state: "COMPLETE" | "PARTIAL";
  method: "LOKA_ASTRONOMICAL_CALCULATION_V1";
}

export interface DailyStoryDeckData {
  version: typeof DAILY_STORY_DECK_VERSION;
  frame: "DAILY_STORY_SHARED_V2";
  city: string;
  citySlug: string;
  date: string;
  generatedAt: string;
  slides: DailyStoryDeckSlideDescriptor[];
  overview: {
    sceneId: number;
    conditionTitle: string;
    visualIcon: VisualIcon;
    minimumC: number;
    maximumC: number;
  };
  hourly: {
    startHour: 4;
    endHour: 22;
    intervalHours: 1;
    expectedCount: 19;
    availableCount: number;
    complete: boolean;
    points: DailyStoryDeckHourlyPoint[];
  };
  daylight: SolarPresentation & {
    durationLabel: string | null;
  };
  moon: DailyMoonPresentation;
  summary: {
    primaryLine: string;
    secondaryLine: string;
    legendText: string;
  };
  provenance: {
    weather: "LOKA_MULTI_MODEL_CONSENSUS";
    solar: "LOKA_NOAA_CALCULATION";
    moon: "LOKA_ASTRONOMICAL_CALCULATION_V1";
    modelCount: number;
  };
}

const RAD = Math.PI / 180;
const DAY_MS = 86_400_000;
const JULIAN_UNIX_EPOCH = 2_440_588;
const JULIAN_J2000 = 2_451_545;
const SYNODIC_MONTH_DAYS = 29.530588853;
const EARTH_SUN_DISTANCE_KM = 149_598_000;

interface EquatorialCoordinates {
  rightAscension: number;
  declination: number;
  distance?: number;
}

function normalizeRadians(value: number): number {
  const turn = Math.PI * 2;
  return ((value % turn) + turn) % turn;
}

function toJulian(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + JULIAN_UNIX_EPOCH;
}

function toDays(date: Date): number {
  return toJulian(date) - JULIAN_J2000;
}

function rightAscension(longitude: number, latitude: number): number {
  const obliquity = 23.4397 * RAD;
  return Math.atan2(
    Math.sin(longitude) * Math.cos(obliquity) - Math.tan(latitude) * Math.sin(obliquity),
    Math.cos(longitude)
  );
}

function declination(longitude: number, latitude: number): number {
  const obliquity = 23.4397 * RAD;
  return Math.asin(
    Math.sin(latitude) * Math.cos(obliquity) +
      Math.cos(latitude) * Math.sin(obliquity) * Math.sin(longitude)
  );
}

function sunCoordinates(days: number): EquatorialCoordinates {
  const meanAnomaly = RAD * (357.5291 + 0.98560028 * days);
  const equationOfCenter = RAD * (
    1.9148 * Math.sin(meanAnomaly) +
    0.02 * Math.sin(2 * meanAnomaly) +
    0.0003 * Math.sin(3 * meanAnomaly)
  );
  const perihelion = 102.9372 * RAD;
  const longitude = meanAnomaly + equationOfCenter + perihelion + Math.PI;
  return {
    declination: declination(longitude, 0),
    rightAscension: rightAscension(longitude, 0)
  };
}

function moonCoordinates(days: number): EquatorialCoordinates {
  const longitude = RAD * (218.316 + 13.176396 * days);
  const meanAnomaly = RAD * (134.963 + 13.064993 * days);
  const meanDistance = RAD * (93.272 + 13.22935 * days);
  const eclipticLongitude = longitude + RAD * 6.289 * Math.sin(meanAnomaly);
  const eclipticLatitude = RAD * 5.128 * Math.sin(meanDistance);
  const distance = 385_001 - 20_905 * Math.cos(meanAnomaly);
  return {
    rightAscension: rightAscension(eclipticLongitude, eclipticLatitude),
    declination: declination(eclipticLongitude, eclipticLatitude),
    distance
  };
}

function siderealTime(days: number, longitudeWest: number): number {
  return RAD * (280.16 + 360.9856235 * days) - longitudeWest;
}

function altitude(hourAngle: number, latitude: number, declinationValue: number): number {
  return Math.asin(
    Math.sin(latitude) * Math.sin(declinationValue) +
      Math.cos(latitude) * Math.cos(declinationValue) * Math.cos(hourAngle)
  );
}

function astronomicalRefraction(altitudeValue: number): number {
  const safeAltitude = altitudeValue < 0 ? 0 : altitudeValue;
  return 0.0002967 / Math.tan(safeAltitude + 0.00312536 / (safeAltitude + 0.08901179));
}

function moonAltitude(date: Date, latitude: number, longitude: number): number {
  const longitudeWest = -longitude * RAD;
  const latitudeRadians = latitude * RAD;
  const days = toDays(date);
  const moon = moonCoordinates(days);
  const hourAngle = siderealTime(days, longitudeWest) - moon.rightAscension;
  const geometric = altitude(hourAngle, latitudeRadians, moon.declination);
  return geometric + astronomicalRefraction(geometric);
}

function zonedDateParts(instant: Date, timezone: string): Record<string, string> {
  return Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23"
    }).formatToParts(instant).map((part) => [part.type, part.value])
  );
}

function localMidnightUtc(date: string, timezone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new Error(`daily_story_deck_invalid_date:${date}`);
  const desired = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 0, 0, 0);
  let candidate = desired;
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = zonedDateParts(new Date(candidate), timezone);
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    candidate += desired - represented;
  }
  return new Date(candidate);
}

function formatLocalTime(instant: Date | null, timezone: string): string | null {
  if (!instant) return null;
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone,
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    }).format(instant);
  } catch {
    return null;
  }
}

function moonRiseAndSet(
  date: string,
  latitude: number,
  longitude: number,
  timezone: string
): { moonrise: string | null; moonset: string | null } {
  const start = localMidnightUtc(date, timezone);
  const horizon = 0.133 * RAD;
  let previousAltitude = moonAltitude(start, latitude, longitude) - horizon;
  let riseHour: number | null = null;
  let setHour: number | null = null;

  for (let hour = 1; hour <= 23; hour += 2) {
    const middleAltitude = moonAltitude(new Date(start.valueOf() + hour * 3_600_000), latitude, longitude) - horizon;
    const endAltitude = moonAltitude(new Date(start.valueOf() + (hour + 1) * 3_600_000), latitude, longitude) - horizon;
    const a = (previousAltitude + endAltitude) / 2 - middleAltitude;
    const b = (endAltitude - previousAltitude) / 2;
    const extremumX = Math.abs(a) < 1e-12 ? 0 : -b / (2 * a);
    const extremumY = (a * extremumX + b) * extremumX + middleAltitude;
    const discriminant = b * b - 4 * a * middleAltitude;
    let roots = 0;
    let firstRoot = 0;
    let secondRoot = 0;

    if (discriminant >= 0 && Math.abs(a) >= 1e-12) {
      const distance = Math.sqrt(discriminant) / (Math.abs(a) * 2);
      firstRoot = extremumX - distance;
      secondRoot = extremumX + distance;
      if (Math.abs(firstRoot) <= 1) roots++;
      if (Math.abs(secondRoot) <= 1) roots++;
      if (firstRoot < -1) firstRoot = secondRoot;
    } else if (Math.abs(b) >= 1e-12) {
      firstRoot = -middleAltitude / b;
      if (Math.abs(firstRoot) <= 1) roots = 1;
    }

    if (roots === 1) {
      if (previousAltitude < 0) riseHour = hour + firstRoot;
      else setHour = hour + firstRoot;
    } else if (roots === 2) {
      riseHour = hour + (extremumY < 0 ? secondRoot : firstRoot);
      setHour = hour + (extremumY < 0 ? firstRoot : secondRoot);
    }
    previousAltitude = endAltitude;
  }

  const instantForHour = (hour: number | null): Date | null =>
    hour === null ? null : new Date(start.valueOf() + hour * 3_600_000);
  return {
    moonrise: formatLocalTime(instantForHour(riseHour), timezone),
    moonset: formatLocalTime(instantForHour(setHour), timezone)
  };
}

function phaseDefinition(phase: number): { phase: MoonPhaseKey; label: string } {
  if (phase < 0.03 || phase >= 0.97) return { phase: "NEW_MOON", label: "Nouvelle lune" };
  if (phase < 0.22) return { phase: "WAXING_CRESCENT", label: "Premier croissant" };
  if (phase < 0.28) return { phase: "FIRST_QUARTER", label: "Premier quartier" };
  if (phase < 0.47) return { phase: "WAXING_GIBBOUS", label: "Lune gibbeuse croissante" };
  if (phase < 0.53) return { phase: "FULL_MOON", label: "Pleine lune" };
  if (phase < 0.72) return { phase: "WANING_GIBBOUS", label: "Lune gibbeuse décroissante" };
  if (phase < 0.78) return { phase: "LAST_QUARTER", label: "Dernier quartier" };
  return { phase: "WANING_CRESCENT", label: "Dernier croissant" };
}

function isoDateAtOffset(date: string, days: number): string {
  const instant = new Date(`${date}T12:00:00Z`);
  instant.setUTCDate(instant.getUTCDate() + days);
  return instant.toISOString().slice(0, 10);
}

function nextPrincipalPhase(phase: number, date: string): DailyMoonPresentation["nextPrincipalPhase"] {
  const definitions = [
    { value: 0.25, phase: "FIRST_QUARTER", label: "Premier quartier" },
    { value: 0.5, phase: "FULL_MOON", label: "Pleine lune" },
    { value: 0.75, phase: "LAST_QUARTER", label: "Dernier quartier" },
    { value: 1, phase: "NEW_MOON", label: "Nouvelle lune" }
  ] as const;
  const next = definitions.find((item) => item.value > phase + 1e-6) ?? definitions[0];
  const target = next === definitions[0] && phase >= 0.25 ? 1.25 : next.value;
  const days = Math.max(0, Math.round((target - phase) * SYNODIC_MONTH_DAYS));
  return { phase: next.phase, label: next.label, estimatedDate: isoDateAtOffset(date, days) };
}

export function calculateMoonPresentation(city: CityConfig, date: string): DailyMoonPresentation {
  const observation = new Date(`${date}T12:00:00Z`);
  const days = toDays(observation);
  const sun = sunCoordinates(days);
  const moon = moonCoordinates(days);
  const moonDistance = moon.distance ?? 385_001;
  const separation = Math.acos(
    Math.sin(sun.declination) * Math.sin(moon.declination) +
      Math.cos(sun.declination) * Math.cos(moon.declination) *
        Math.cos(sun.rightAscension - moon.rightAscension)
  );
  const incidence = Math.atan2(
    EARTH_SUN_DISTANCE_KM * Math.sin(separation),
    moonDistance - EARTH_SUN_DISTANCE_KM * Math.cos(separation)
  );
  const angle = Math.atan2(
    Math.cos(sun.declination) * Math.sin(sun.rightAscension - moon.rightAscension),
    Math.sin(sun.declination) * Math.cos(moon.declination) -
      Math.cos(sun.declination) * Math.sin(moon.declination) *
        Math.cos(sun.rightAscension - moon.rightAscension)
  );
  const illumination = (1 + Math.cos(incidence)) / 2;
  const phase = normalizeRadians(Math.PI + incidence * (angle < 0 ? -1 : 1)) / (Math.PI * 2);
  const definition = phaseDefinition(phase);
  const times = moonRiseAndSet(date, city.latitude, city.longitude, city.timezone);
  return {
    phase: definition.phase,
    phaseLabel: definition.label,
    illuminationPct: Math.round(illumination * 100),
    ageDays: Math.round(phase * SYNODIC_MONTH_DAYS * 10) / 10,
    trend: phase < 0.5 ? "CROISSANTE" : "DECROISSANTE",
    moonrise: times.moonrise,
    moonset: times.moonset,
    nextPrincipalPhase: nextPrincipalPhase(phase, date),
    state: times.moonrise && times.moonset ? "COMPLETE" : "PARTIAL",
    method: "LOKA_ASTRONOMICAL_CALCULATION_V1"
  };
}

export function conditionForStoryHour(point: ConsensusHour): HourlyCondition {
  if (point.thunderstormSupport >= 0.35) return "orage";
  if (point.fogSupport >= 0.45) return "brouillard";
  if ((point.precipitationMm >= 0.2 && point.precipitationSupport >= 0.45) || point.rainCodeSupport >= 0.45) {
    return point.showerSupport >= 0.4 ? "averse" : "pluie";
  }
  if (point.windGustKmh >= 70 && point.cloudCoverPct < 70) return "vent";
  if (point.cloudCoverPct < 20) return "soleil";
  if (point.cloudCoverPct < 40) return "peu nuageux";
  if (point.cloudCoverPct < 65) return "variable";
  if (point.cloudCoverPct < 85) return "nuageux";
  return "couvert";
}

function durationLabel(minutes: number | null): string | null {
  if (minutes === null) return null;
  const hours = Math.floor(minutes / 60);
  const remaining = Math.abs(minutes % 60);
  return `${hours} h ${String(remaining).padStart(2, "0")}`;
}

function storySlides(cityName: string): DailyStoryDeckSlideDescriptor[] {
  return [
    { position: 1, id: "OVERVIEW", title: `LA JOURNÉE À ${cityName.toUpperCase()}`, dataKey: "overview" },
    { position: 2, id: "HOURLY", title: "HEURE PAR HEURE", dataKey: "hourly" },
    { position: 3, id: "DAYLIGHT", title: "LES HEURES DU JOUR", dataKey: "daylight" },
    { position: 4, id: "MOON", title: "LA LUNE CE SOIR", dataKey: "moon" },
    { position: 5, id: "SUMMARY", title: "LA JOURNÉE EN QUELQUES MOTS", dataKey: "summary" }
  ];
}

export function buildDailyStoryDeckData(
  payload: OfficialPublicPayloadV24,
  city: CityConfig,
  consensus: Map<string, ConsensusHour>
): DailyStoryDeckData {
  const day = [...consensus.values()]
    .filter((point) => point.time.slice(0, 10) === payload.date)
    .sort((left, right) => left.time.localeCompare(right.time));
  const byHour = new Map(day.map((point) => [hourOf(point.time), point]));
  const points: DailyStoryDeckHourlyPoint[] = DAILY_STORY_DECK_HOURS.map((hour) => {
    const point = byHour.get(hour);
    if (!point) {
      return {
        hour,
        sourceTime: null,
        temperatureC: null,
        condition: null,
        precipitationMm: null,
        windGustKmh: null,
        modelCount: null,
        available: false
      };
    }
    return {
      hour,
      sourceTime: point.time,
      temperatureC: Math.round(point.temperatureC),
      condition: conditionForStoryHour(point),
      precipitationMm: Math.round(point.precipitationMm * 100) / 100,
      windGustKmh: Math.round(point.windGustKmh),
      modelCount: point.modelCount,
      available: true
    };
  });
  const solar = solarPresentation(city, payload.date);
  const availableCount = points.filter((point) => point.available).length;
  return {
    version: DAILY_STORY_DECK_VERSION,
    frame: "DAILY_STORY_SHARED_V2",
    city: payload.city,
    citySlug: payload.citySlug,
    date: payload.date,
    generatedAt: payload.generatedAt,
    slides: storySlides(payload.city),
    overview: {
      sceneId: payload.scene.id,
      conditionTitle: payload.scene.label,
      visualIcon: payload.scene.visualIcon,
      minimumC: payload.temperatures.minC,
      maximumC: payload.temperatures.maxC
    },
    hourly: {
      startHour: 4,
      endHour: 22,
      intervalHours: 1,
      expectedCount: 19,
      availableCount,
      complete: availableCount === DAILY_STORY_DECK_HOURS.length,
      points
    },
    daylight: {
      ...solar,
      durationLabel: durationLabel(solar.daylightMinutes)
    },
    moon: calculateMoonPresentation(city, payload.date),
    summary: {
      primaryLine: payload.editorial.visual.primaryLine,
      secondaryLine: payload.editorial.visual.secondaryLine,
      legendText: [payload.editorial.social.paragraph1, payload.editorial.social.paragraph2]
        .filter(Boolean)
        .join("\n\n")
    },
    provenance: {
      weather: "LOKA_MULTI_MODEL_CONSENSUS",
      solar: "LOKA_NOAA_CALCULATION",
      moon: "LOKA_ASTRONOMICAL_CALCULATION_V1",
      modelCount: payload.models.count
    }
  };
}

/**
 * Compatibility path for payloads generated before the Story deck contract
 * existed. It never interpolates the missing odd hours: those cells remain
 * explicitly unavailable until a fresh consensus-backed payload is produced.
 */
export function buildLegacyDailyStoryDeckData(
  payload: OfficialPublicPayloadV24,
  city: CityConfig
): DailyStoryDeckData {
  const legacyByHour = new Map(
    payload.hourly.map((point) => [Number(point.hour), point])
  );
  const points: DailyStoryDeckHourlyPoint[] = DAILY_STORY_DECK_HOURS.map((hour) => {
    const point = legacyByHour.get(hour);
    if (!point) {
      return {
        hour,
        sourceTime: null,
        temperatureC: null,
        condition: null,
        precipitationMm: null,
        windGustKmh: null,
        modelCount: null,
        available: false
      };
    }
    return {
      hour,
      sourceTime: null,
      temperatureC: Math.round(point.temperatureC),
      condition: point.condition,
      precipitationMm: Math.round(point.precipitationMm * 100) / 100,
      windGustKmh: null,
      modelCount: payload.models.count,
      available: true
    };
  });
  const solar = solarPresentation(city, payload.date);
  const availableCount = points.filter((point) => point.available).length;
  return {
    version: DAILY_STORY_DECK_VERSION,
    frame: "DAILY_STORY_SHARED_V2",
    city: payload.city,
    citySlug: payload.citySlug,
    date: payload.date,
    generatedAt: payload.generatedAt,
    slides: storySlides(payload.city),
    overview: {
      sceneId: payload.scene.id,
      conditionTitle: payload.scene.label,
      visualIcon: payload.scene.visualIcon,
      minimumC: payload.temperatures.minC,
      maximumC: payload.temperatures.maxC
    },
    hourly: {
      startHour: 4,
      endHour: 22,
      intervalHours: 1,
      expectedCount: 19,
      availableCount,
      complete: false,
      points
    },
    daylight: {
      ...solar,
      durationLabel: durationLabel(solar.daylightMinutes)
    },
    moon: calculateMoonPresentation(city, payload.date),
    summary: {
      primaryLine: payload.editorial.visual.primaryLine,
      secondaryLine: payload.editorial.visual.secondaryLine,
      legendText: [payload.editorial.social.paragraph1, payload.editorial.social.paragraph2]
        .filter(Boolean)
        .join("\n\n")
    },
    provenance: {
      weather: "LOKA_MULTI_MODEL_CONSENSUS",
      solar: "LOKA_NOAA_CALCULATION",
      moon: "LOKA_ASTRONOMICAL_CALCULATION_V1",
      modelCount: payload.models.count
    }
  };
}
