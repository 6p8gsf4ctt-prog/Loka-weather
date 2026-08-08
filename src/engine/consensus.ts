import type { ConsensusHour, ModelForecast } from "../types";
import { stddev, weightedMean, weightedSupport } from "./math";

function isRainCode(code: number | null): boolean {
  if (code === null) return false;
  // WMO weather interpretation codes used by Open-Meteo:
  // 51-67 drizzle/rain/freezing rain, 80-82 showers, 95-99 thunderstorms.
  return (code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99);
}

function isShowerCode(code: number | null): boolean {
  return code !== null && code >= 80 && code <= 82;
}

function isThunderstormCode(code: number | null): boolean {
  return code !== null && code >= 95 && code <= 99;
}

function weightedBooleanSupport(
  rows: Array<{ forecast: ModelForecast; index: number }>,
  predicate: (code: number | null) => boolean
): number {
  const total = rows.reduce((sum, row) => sum + row.forecast.weight, 0);
  if (total <= 0) return 0;

  return rows.reduce((sum, { forecast, index }) => {
    return sum + (predicate(forecast.hourly[index].weatherCode) ? forecast.weight : 0);
  }, 0) / total;
}

export function buildConsensus(forecasts: ModelForecast[]): Map<string, ConsensusHour> {
  const byTime = new Map<string, Array<{ forecast: ModelForecast; index: number }>>();

  for (const forecast of forecasts) {
    forecast.hourly.forEach((_, index) => {
      const time = forecast.hourly[index].time;
      const rows = byTime.get(time) ?? [];
      rows.push({ forecast, index });
      byTime.set(time, rows);
    });
  }

  const result = new Map<string, ConsensusHour>();

  for (const [time, rows] of [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const tempValues: Array<[number | null, number]> = [];
    const apparentValues: Array<[number | null, number]> = [];
    const precipValues: Array<[number, number]> = [];
    const cloudValues: Array<[number | null, number]> = [];
    const windValues: Array<[number | null, number]> = [];
    const gustValues: Array<[number | null, number]> = [];
    const temps: number[] = [];

    for (const { forecast, index } of rows) {
      const point = forecast.hourly[index];
      const weight = forecast.weight;

      tempValues.push([point.temperatureC, weight]);
      apparentValues.push([point.apparentTemperatureC ?? point.temperatureC, weight]);
      precipValues.push([point.precipitationMm, weight]);
      cloudValues.push([point.cloudCoverPct, weight]);
      windValues.push([point.windSpeedKmh, weight]);
      gustValues.push([point.windGustKmh, weight]);

      if (point.temperatureC !== null) temps.push(point.temperatureC);
    }

    result.set(time, {
      time,
      temperatureC: weightedMean(tempValues),
      apparentTemperatureC: weightedMean(apparentValues),
      precipitationMm: weightedMean(precipValues),
      cloudCoverPct: weightedMean(cloudValues),
      windSpeedKmh: weightedMean(windValues),
      windGustKmh: weightedMean(gustValues),
      modelCount: rows.length,
      temperatureSpreadC: stddev(temps),
      precipitationSupport: weightedSupport(precipValues, 0.2),
      rainCodeSupport: weightedBooleanSupport(rows, isRainCode),
      showerSupport: weightedBooleanSupport(rows, isShowerCode),
      thunderstormSupport: weightedBooleanSupport(rows, isThunderstormCode)
    });
  }

  return result;
}

export function modelDailyRain(forecast: ModelForecast, date: string): number {
  return forecast.hourly
    .filter((p) => p.time.slice(0, 10) === date && hourOf(p.time) >= 7 && hourOf(p.time) <= 21)
    .reduce((sum, p) => sum + p.precipitationMm, 0);
}

export function hourOf(time: string): number {
  return Number(time.slice(11, 13));
}
