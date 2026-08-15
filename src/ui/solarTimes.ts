export interface SolarTimes {
  sunrise: string | null;
  sunset: string | null;
  method: "NOAA";
}

const ZENITH = 90.833;

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
  return Math.floor(
    (current - start) / 86_400_000
  );
}

function solarUtcHours(
  year: number,
  month: number,
  day: number,
  latitude: number,
  longitude: number,
  sunrise: boolean
): number | null {
  const n = dayOfYear(
    year,
    month,
    day
  );

  const lngHour =
    longitude / 15;

  const t =
    n +
    (
      sunrise
        ? (6 - lngHour) / 24
        : (18 - lngHour) / 24
    );

  const meanAnomaly =
    0.9856 * t - 3.289;

  const trueLongitude =
    normalizeDegrees(
      meanAnomaly +
      1.916 *
        Math.sin(
          meanAnomaly *
          Math.PI /
          180
        ) +
      0.020 *
        Math.sin(
          2 *
          meanAnomaly *
          Math.PI /
          180
        ) +
      282.634
    );

  let rightAscension =
    Math.atan(
      0.91764 *
      Math.tan(
        trueLongitude *
        Math.PI /
        180
      )
    ) *
    180 /
    Math.PI;

  rightAscension =
    normalizeDegrees(
      rightAscension
    );

  const longitudeQuadrant =
    Math.floor(
      trueLongitude / 90
    ) * 90;

  const raQuadrant =
    Math.floor(
      rightAscension / 90
    ) * 90;

  rightAscension =
    (
      rightAscension +
      longitudeQuadrant -
      raQuadrant
    ) / 15;

  const sinDeclination =
    0.39782 *
    Math.sin(
      trueLongitude *
      Math.PI /
      180
    );

  const cosDeclination =
    Math.cos(
      Math.asin(
        sinDeclination
      )
    );

  const cosHourAngle =
    (
      Math.cos(
        ZENITH *
        Math.PI /
        180
      ) -
      sinDeclination *
      Math.sin(
        latitude *
        Math.PI /
        180
      )
    ) /
    (
      cosDeclination *
      Math.cos(
        latitude *
        Math.PI /
        180
      )
    );

  if (
    cosHourAngle > 1 ||
    cosHourAngle < -1
  ) {
    return null;
  }

  let hourAngle =
    Math.acos(
      cosHourAngle
    ) *
    180 /
    Math.PI;

  if (sunrise) {
    hourAngle =
      360 - hourAngle;
  }

  hourAngle /= 15;

  const localMeanTime =
    hourAngle +
    rightAscension -
    0.06571 * t -
    6.622;

  return normalizeHours(
    localMeanTime -
    lngHour
  );
}

function formatUtcHours(
  year: number,
  month: number,
  day: number,
  utcHours: number | null,
  timezone: string
): string | null {
  if (utcHours === null) {
    return null;
  }

  const milliseconds =
    Date.UTC(
      year,
      month - 1,
      day,
      0,
      0,
      0
    ) +
    Math.round(
      utcHours *
      60 *
      60 *
      1000
    );

  try {
    return new Intl.DateTimeFormat(
      "fr-FR",
      {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    ).format(
      new Date(milliseconds)
    );
  } catch {
    return null;
  }
}

/**
 * Sunrise / sunset for the local forecast date.
 *
 * Pure astronomical calculation: no network call and no impact on the
 * weather classifier. Times are formatted in the city timezone.
 */
export function calculateSolarTimes(
  date: string,
  latitude: number,
  longitude: number,
  timezone: string
): SolarTimes {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})$/
      .exec(date);

  if (
    !match ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return {
      sunrise: null,
      sunset: null,
      method: "NOAA"
    };
  }

  const year =
    Number(match[1]);
  const month =
    Number(match[2]);
  const day =
    Number(match[3]);

  const rise =
    solarUtcHours(
      year,
      month,
      day,
      latitude,
      longitude,
      true
    );

  const set =
    solarUtcHours(
      year,
      month,
      day,
      latitude,
      longitude,
      false
    );

  return {
    sunrise:
      formatUtcHours(
        year,
        month,
        day,
        rise,
        timezone
      ),
    sunset:
      formatUtcHours(
        year,
        month,
        day,
        set,
        timezone
      ),
    method: "NOAA"
  };
}
