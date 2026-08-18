import type { CityConfig } from "../types";
import { solarWindow } from "../engine/solar";

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
function hhmm(decimalHour: number): string {
  let h = Math.floor(decimalHour);
  let m = Math.round((decimalHour - h) * 60);
  if (m === 60) { h++; m = 0; }
  return `${String((h + 24) % 24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
export function solarPresentation(city: CityConfig, date: string): {
  sunrise: string; sunset: string; daylightMinutes: number; daylightDeltaMinutes: number;
} {
  const today = solarWindow(city, date);
  const previous = solarWindow(city, addDays(date, -1));
  const daylight = today.sunsetLocalHour - today.sunriseLocalHour;
  const previousDaylight = previous.sunsetLocalHour - previous.sunriseLocalHour;
  return {
    sunrise: hhmm(today.sunriseLocalHour), sunset: hhmm(today.sunsetLocalHour),
    daylightMinutes: Math.round(daylight * 60), daylightDeltaMinutes: Math.round((daylight - previousDaylight) * 60)
  };
}
