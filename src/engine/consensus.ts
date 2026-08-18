import type { ConsensusHour, ModelForecast } from "../types";
import { stddev, weightedMean, weightedSupport } from "./math";

function isRainCode(code: number | null): boolean {
  return code !== null && ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || (code >= 95 && code <= 99));
}
function isShowerCode(code: number | null): boolean { return code !== null && code >= 80 && code <= 82; }
function isThunderCode(code: number | null): boolean { return code !== null && code >= 95 && code <= 99; }
function isFogCode(code: number | null): boolean { return code === 45 || code === 48; }

function weightedBooleanSupport(
  rows: Array<{ forecast: ModelForecast; index: number }>,
  predicate: (code: number | null) => boolean
): number {
  const total = rows.reduce((sum, row) => sum + row.forecast.weight, 0);
  return total <= 0 ? 0 : rows.reduce((sum, { forecast, index }) =>
    sum + (predicate(forecast.hourly[index].weatherCode) ? forecast.weight : 0), 0) / total;
}

function weightedNullable(values: Array<[number | null, number]>): number | null {
  const valid = values.filter((x): x is [number, number] => x[0] !== null && Number.isFinite(x[0]));
  if (!valid.length) return null;
  return weightedMean(valid);
}

export function buildConsensus(forecasts: ModelForecast[]): Map<string, ConsensusHour> {
  const byTime = new Map<string, Array<{ forecast: ModelForecast; index: number }>>();
  for (const forecast of forecasts) {
    forecast.hourly.forEach((point, index) => {
      const rows = byTime.get(point.time) ?? [];
      rows.push({ forecast, index });
      byTime.set(point.time, rows);
    });
  }

  const result = new Map<string, ConsensusHour>();
  for (const [time, rows] of [...byTime.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const values = <K extends keyof ModelForecast["hourly"][number]>(key: K) =>
      rows.map(({ forecast, index }) => [forecast.hourly[index][key] as number | null, forecast.weight] as [number | null, number]);
    const precip = rows.map(({ forecast, index }) => [forecast.hourly[index].precipitationMm, forecast.weight] as [number, number]);
    const temps = rows.map(({ forecast, index }) => forecast.hourly[index].temperatureC).filter((x): x is number => x !== null);
    let cloudLayerModelCount = 0;
    rows.forEach(({ forecast, index }) => {
      const p = forecast.hourly[index];
      if (p.cloudCoverLowPct !== null || p.cloudCoverMidPct !== null || p.cloudCoverHighPct !== null) cloudLayerModelCount++;
    });
    result.set(time, {
      time,
      temperatureC: weightedMean(values("temperatureC")),
      apparentTemperatureC: weightedMean(values("apparentTemperatureC")),
      precipitationMm: weightedMean(precip),
      cloudCoverPct: weightedMean(values("cloudCoverPct")),
      cloudCoverLowPct: weightedNullable(values("cloudCoverLowPct")),
      cloudCoverMidPct: weightedNullable(values("cloudCoverMidPct")),
      cloudCoverHighPct: weightedNullable(values("cloudCoverHighPct")),
      cloudLayerModelCount,
      windSpeedKmh: weightedMean(values("windSpeedKmh")),
      windGustKmh: weightedMean(values("windGustKmh")),
      modelCount: rows.length,
      temperatureSpreadC: stddev(temps),
      precipitationSupport: weightedSupport(precip, 0.2),
      rainCodeSupport: weightedBooleanSupport(rows, isRainCode),
      showerSupport: weightedBooleanSupport(rows, isShowerCode),
      thunderstormSupport: weightedBooleanSupport(rows, isThunderCode),
      fogSupport: weightedBooleanSupport(rows, isFogCode)
    });
  }
  return result;
}
