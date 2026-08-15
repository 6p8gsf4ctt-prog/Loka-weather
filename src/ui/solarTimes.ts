export interface SolarTimes {
  dawn: string | null;
  sunrise: string | null;
  solarNoon: string | null;
  sunset: string | null;
  dusk: string | null;
  daylightMinutes: number | null;
  daylightDeltaMinutes: number | null;
  method: "NOAA";
  twilight: "CIVIL";
}

const OFFICIAL_ZENITH = 90.833;
const CIVIL_TWILIGHT_ZENITH = 96;

function normalizeDegrees(value: number): number {
  return ((value % 360) + 360) % 360;
}

function normalizeHours(value: number): number {
  return ((value % 24) + 24) % 24;
}

function dayOfYear(
  year: number,
  month: number,
  day: number
): number {
  const start = Date.UTC(year, 0, 0);
  const current = Date.UTC(year, month - 1, day);
  return Math.floor((current - start) / 86_400_000);
}

function solarUtcHours(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  rising: boolean,
  zenith: number
): number | null {
  const n = dayOfYear(year, month, day);
  const lngHour = longitude / 15;

  const t = n + (
    rising
      ? (6 - lngHour) / 24
      : (18 - lngHour) / 24
  );

  const meanAnomaly = 0.9856 * t - 3.289;

  const trueLongitude = normalizeDegrees(
    meanAnomaly +
    1.916 * Math.sin(meanAnomaly * Math.PI / 180) +
    0.020 * Math.sin(2 * meanAnomaly * Math.PI / 180) +
    282.634
  );

  let rightAscension = Math.atan(
    0.91764 * Math.tan(trueLongitude * Math.PI / 180)
  ) * 180 / Math.PI;

  rightAscension = normalizeDegrees(rightAscension);

  const longitudeQuadrant = Math.floor(trueLongitude / 90) * 90;
  const raQuadrant = Math.floor(rightAscension / 90) * 90;

  rightAscension = (
    rightAscension + longitudeQuadrant - raQuadrant
  ) / 15;

  const sinDeclination = 0.39782 * Math.sin(
    trueLongitude * Math.PI / 180
  );

  const cosDeclination = Math.cos(Math.asin(sinDeclination));

  const cosHourAngle = (
    Math.cos(zenith * Math.PI / 180) -
    sinDeclination * Math.sin(latitude * Math.PI / 180)
  ) / (
    cosDeclination * Math.cos(latitude * Math.PI / 180)
  );

  if (cosHourAngle > 1 || cosHourAngle < -1) {
    return null;
  }

  let hourAngle = Math.acos(cosHourAngle) * 180 / Math.PI;
  if (rising) hourAngle = 360 - hourAngle;
  hourAngle /= 15;

  const localMeanTime =
    hourAngle +
    rightAscension -
    0.06571 * t -
    6.622;

  return normalizeHours(localMeanTime - lngHour);
}

function midpointUtcHours(
  start: number | null,
  end: number | null
): number | null {
  if (start === null || end === null) return null;
  let adjustedEnd = end;
  if (adjustedEnd < start) adjustedEnd += 24;
  return normalizeHours(start + (adjustedEnd - start) / 2);
}

function daylightMinutes(
  sunriseUtc: number | null,
  sunsetUtc: number | null
): number | null {
  if (sunriseUtc === null || sunsetUtc === null) {
    return null;
  }

  let adjustedSunset = sunsetUtc;
  if (adjustedSunset < sunriseUtc) {
    adjustedSunset += 24;
  }

  return Math.round(
    (adjustedSunset - sunriseUtc) * 60
  );
}

function previousDateParts(
  year: number,
  month: number,
  day: number
): {
  year: number;
  month: number;
  day: number;
} {
  const d = new Date(
    Date.UTC(
      year,
      month - 1,
      day - 1,
      12,
      0,
      0
    )
  );

  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate()
  };
}

function formatUtcHours(
  year: number,
  month: number,
  day: number,
  utcHours: number | null,
  timezone: string
): string | null {
  if (utcHours === null) return null;

  const milliseconds =
    Date.UTC(year, month - 1, day, 0, 0, 0) +
    Math.round(utcHours * 60 * 60 * 1000);

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    ).format(new Date(milliseconds));
  } catch {
    return null;
  }
}

/**
 * Five solar landmarks for the local forecast date.
 *
 * - dawn / dusk = civil twilight (Sun centre at -6°)
 * - sunrise / sunset = standard apparent horizon
 * - solarNoon = midpoint of the NOAA sunrise/sunset pair, i.e. the local
 *   solar transit used here for the "Sun highest" display marker.
 *
 * Pure astronomy: no network request and no influence on weather scoring.
 */
export function calculateSolarTimes(
  date: string,
  latitude: number,
  longitude: number,
  timezone: string
): SolarTimes {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);

  if (
    !match ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      dawn: null,
      sunrise: null,
      solarNoon: null,
      sunset: null,
      dusk: null,
      daylightMinutes: null,
      daylightDeltaMinutes: null,
      method: "NOAA",
      twilight: "CIVIL"
    };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const dawnUtc = solarUtcHours(
    year, month, day,
    latitude, longitude,
    true,
    CIVIL_TWILIGHT_ZENITH
  );

  const sunriseUtc = solarUtcHours(
    year, month, day,
    latitude, longitude,
    true,
    OFFICIAL_ZENITH
  );

  const sunsetUtc = solarUtcHours(
    year, month, day,
    latitude, longitude,
    false,
    OFFICIAL_ZENITH
  );

  const duskUtc = solarUtcHours(
    year, month, day,
    latitude, longitude,
    false,
    CIVIL_TWILIGHT_ZENITH
  );

  const solarNoonUtc = midpointUtcHours(
    sunriseUtc,
    sunsetUtc
  );

  const todayDaylightMinutes =
    daylightMinutes(
      sunriseUtc,
      sunsetUtc
    );

  const previous =
    previousDateParts(
      year,
      month,
      day
    );

  const previousSunriseUtc =
    solarUtcHours(
      previous.year,
      previous.month,
      previous.day,
      latitude,
      longitude,
      true,
      OFFICIAL_ZENITH
    );

  const previousSunsetUtc =
    solarUtcHours(
      previous.year,
      previous.month,
      previous.day,
      latitude,
      longitude,
      false,
      OFFICIAL_ZENITH
    );

  const previousDaylightMinutes =
    daylightMinutes(
      previousSunriseUtc,
      previousSunsetUtc
    );

  const daylightDeltaMinutes =
    todayDaylightMinutes !== null &&
    previousDaylightMinutes !== null
      ? todayDaylightMinutes -
        previousDaylightMinutes
      : null;

  return {
    dawn: formatUtcHours(year, month, day, dawnUtc, timezone),
    sunrise: formatUtcHours(year, month, day, sunriseUtc, timezone),
    solarNoon: formatUtcHours(year, month, day, solarNoonUtc, timezone),
    sunset: formatUtcHours(year, month, day, sunsetUtc, timezone),
    dusk: formatUtcHours(year, month, day, duskUtc, timezone),
    daylightMinutes:
      todayDaylightMinutes,
    daylightDeltaMinutes,
    method: "NOAA",
    twilight: "CIVIL"
  };
}
