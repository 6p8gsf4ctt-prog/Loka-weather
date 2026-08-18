import type { CityConfig } from "../types";
import { clamp } from "./math";

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

function dayOfYear(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  const start = Date.UTC(y, 0, 0);
  return Math.floor((Date.UTC(y, m - 1, d) - start) / 86400000);
}

function timezoneOffsetHours(date: string, timezone: string): number {
  const instant = new Date(`${date}T12:00:00Z`);
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  const localAsUtc = Date.UTC(
    Number(values.year), Number(values.month) - 1, Number(values.day),
    Number(values.hour), Number(values.minute), Number(values.second)
  );
  return (localAsUtc - instant.getTime()) / 3600000;
}

/** NOAA-style sunrise/sunset approximation, sufficient for hourly profile partitioning. */
export function solarWindow(city: CityConfig, date: string): {
  sunriseLocalHour: number;
  sunsetLocalHour: number;
  startHour: number;
  endHour: number;
} {
  const n = dayOfYear(date);
  const gamma = 2 * Math.PI / 365 * (n - 1);
  const eqtime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const decl = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  const lat = city.latitude * RAD;
  const zenith = 90.833 * RAD;
  const cosHa = clamp((Math.cos(zenith) / (Math.cos(lat) * Math.cos(decl))) - Math.tan(lat) * Math.tan(decl), -1, 1);
  const haDeg = Math.acos(cosHa) * DEG;
  const offset = timezoneOffsetHours(date, city.timezone);
  const solarNoonMinutes = 720 - 4 * city.longitude - eqtime + offset * 60;
  const sunrise = (solarNoonMinutes - haDeg * 4) / 60;
  const sunset = (solarNoonMinutes + haDeg * 4) / 60;
  return {
    sunriseLocalHour: sunrise,
    sunsetLocalHour: sunset,
    startHour: Math.max(5, Math.floor(sunrise)),
    endHour: Math.min(22, Math.ceil(sunset))
  };
}
