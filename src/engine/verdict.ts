import type { CityConfig, ConsensusHour, DisplayHour, LokaForecast, ModelForecast } from "../types";
import { hourOf, modelDailyRain } from "./consensus";
import { clamp, median, weightedSupport } from "./math";

interface RainAnalysis {
  verdict: string;
  dry: boolean;
  confidence: number;
  startHour: number | null;
  endHour: number | null;
  medianDailyRainMm: number;
  weightedProbGt1Mm: number;
  peakSupport: number;
}

function pointsForDate(consensus: Map<string, ConsensusHour>, date: string): ConsensusHour[] {
  return [...consensus.values()].filter((p) => p.time.slice(0, 10) === date);
}

function nearestHour(points: ConsensusHour[], hour: number): ConsensusHour | undefined {
  return [...points].sort((a, b) => Math.abs(hourOf(a.time) - hour) - Math.abs(hourOf(b.time) - hour))[0];
}

function avg(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}

function cloudCondition(pct: number): string {
  if (pct < 20) return "soleil";
  if (pct < 40) return "peu nuageux";
  if (pct < 65) return "variable";
  if (pct < 85) return "nuageux";
  return "couvert";
}

function analyzeRain(
  date: string,
  day: ConsensusHour[],
  forecasts: ModelForecast[]
): RainAnalysis {
  const daytime = day.filter((p) => hourOf(p.time) >= 7 && hourOf(p.time) <= 21);
  const modelTotals = forecasts.map((f) => [modelDailyRain(f, date), f.weight] as [number, number]);
  const medianDailyRainMm = median(modelTotals.map(([v]) => v));
  const weightedProbGt1Mm = weightedSupport(modelTotals, 1.0);
  const peakSupport = Math.max(0, ...daytime.map((p) => p.precipitationSupport));

  const robustWetHours = daytime.filter(
    (p) => p.precipitationMm >= 0.2 && p.precipitationSupport >= 0.60
  );

  const functionallyDry =
    medianDailyRainMm < 0.2 &&
    weightedProbGt1Mm < 0.25 &&
    robustWetHours.length === 0;

  const agreement = Math.max(weightedProbGt1Mm, 1 - weightedProbGt1Mm);
  const confidence = Math.round(clamp(100 * (0.58 * agreement + 0.42 * Math.max(peakSupport, 1 - peakSupport)), 50, 98));

  if (functionallyDry) {
    return {
      verdict: "Journée sèche.",
      dry: true,
      confidence,
      startHour: null,
      endHour: null,
      medianDailyRainMm,
      weightedProbGt1Mm,
      peakSupport
    };
  }

  const candidates = daytime.filter(
    (p) => p.precipitationMm >= 0.2 && p.precipitationSupport >= 0.45
  );

  if (!candidates.length) {
    return {
      verdict: "Journée globalement sèche.",
      dry: true,
      confidence,
      startHour: null,
      endHour: null,
      medianDailyRainMm,
      weightedProbGt1Mm,
      peakSupport
    };
  }

  const blocks: ConsensusHour[][] = [[candidates[0]]];
  for (const p of candidates.slice(1)) {
    const previous = blocks[blocks.length - 1][blocks[blocks.length - 1].length - 1];
    if (hourOf(p.time) - hourOf(previous.time) <= 1) blocks[blocks.length - 1].push(p);
    else blocks.push([p]);
  }

  const block = blocks.sort(
    (a, b) => b.reduce((s, p) => s + p.precipitationMm, 0) - a.reduce((s, p) => s + p.precipitationMm, 0)
  )[0];
  const start = hourOf(block[0].time);
  const end = Math.min(22, hourOf(block[block.length - 1].time) + 1);
  const duration = end - start;
  const continuity = block.length / Math.max(1, duration);
  const maxRate = Math.max(...block.map((p) => p.precipitationMm));

  let noun = "Pluie";
  if (continuity < 0.75) noun = "Averses";
  else if (maxRate >= 4) noun = "Forte pluie";
  else if (maxRate < 1) noun = "Pluie faible";

  return {
    verdict: `${noun} de ${start} h à ${end} h.`,
    dry: false,
    confidence,
    startHour: start,
    endHour: end,
    medianDailyRainMm,
    weightedProbGt1Mm,
    peakSupport
  };
}

function makeMainVerdict(day: ConsensusHour[], rain: RainAnalysis): string {
  const daytime = day.filter((p) => hourOf(p.time) >= 7 && hourOf(p.time) <= 21);
  const morning = daytime.filter((p) => hourOf(p.time) <= 11);
  const afternoon = daytime.filter((p) => hourOf(p.time) >= 12 && hourOf(p.time) <= 18);
  const morningCloud = avg(morning.map((p) => p.cloudCoverPct));
  const afternoonCloud = avg(afternoon.map((p) => p.cloudCoverPct));
  const maxTemp = Math.max(...daytime.map((p) => p.temperatureC));
  const p7 = nearestHour(daytime, 7);
  const delta = maxTemp - (p7?.temperatureC ?? Math.min(...daytime.map((p) => p.temperatureC)));

  if (!rain.dry && rain.startHour !== null) {
    if (rain.startHour >= 16 && morningCloud <= 45) return "Soleil le matin, pluie en fin de journée.";
    if (rain.endHour !== null && rain.endHour <= 13) return "Pluvieux le matin, plus sec ensuite.";
  }

  if (delta >= 9 && morningCloud <= 55 && afternoonCloud <= 55) {
    return "Plus frais ce matin, chaud et ensoleillé ensuite.";
  }
  if (morningCloud >= 75 && afternoonCloud <= 35) return "Gris le matin, soleil ensuite.";
  if (morningCloud <= 35 && afternoonCloud >= 75) return "Soleil le matin, plus couvert ensuite.";
  if (morningCloud <= 25 && afternoonCloud <= 25) return "Grand soleil toute la journée.";
  if (morningCloud <= 45 && afternoonCloud <= 45) return "Ensoleillé avec quelques nuages.";
  if (morningCloud >= 85 && afternoonCloud >= 85) return rain.dry ? "Gris mais sec toute la journée." : "Couvert toute la journée.";
  return "Alternance de soleil et de nuages.";
}

export function buildLokaForecast(
  city: CityConfig,
  date: string,
  consensus: Map<string, ConsensusHour>,
  forecasts: ModelForecast[]
): LokaForecast {
  const day = pointsForDate(consensus, date);
  if (!day.length) throw new Error(`No consensus data for ${date}`);
  const daytime = day.filter((p) => hourOf(p.time) >= 7 && hourOf(p.time) <= 21);
  if (!daytime.length) throw new Error(`No daytime data for ${date}`);

  const rain = analyzeRain(date, day, forecasts);
  const maxTemp = Math.round(Math.max(...daytime.map((p) => p.temperatureC)));
  const minTemp = Math.round(Math.min(...daytime.map((p) => p.temperatureC)));
  const maxGust = Math.max(...daytime.map((p) => p.windGustKmh));
  const medianTempSpread = median(daytime.map((p) => p.temperatureSpreadC));
  const confidenceMain = Math.round(clamp(96 - medianTempSpread * 10 - Math.max(0, 5 - forecasts.length) * 5, 50, 98));

  let notableEvent: string | null = null;
  if (maxGust >= city.wind.gustStrongKmh) {
    notableEvent = `Fortes rafales jusqu’à ${Math.round(maxGust / 5) * 5} km/h.`;
  } else if (maxGust >= city.wind.gustNotableKmh) {
    notableEvent = "Vent soutenu cet après-midi.";
  }

  const hourly: DisplayHour[] = city.displayHours.map((hour) => {
    const p = nearestHour(daytime, hour)!;
    return {
      hour,
      temperatureC: Math.round(p.temperatureC),
      condition: cloudCondition(p.cloudCoverPct),
      precipitationMm: Math.round(p.precipitationMm * 100) / 100
    };
  });

  return {
    city: city.name,
    citySlug: city.slug,
    date,
    generatedAt: new Date().toISOString(),
    tempMaxC: maxTemp,
    tempMinC: minTemp,
    mainVerdict: makeMainVerdict(day, rain),
    rainVerdict: rain.verdict,
    notableEvent,
    confidenceMain,
    confidenceRain: rain.confidence,
    hourly,
    diagnostics: {
      modelsReceived: forecasts.map((f) => f.modelId),
      modelCount: forecasts.length,
      medianDailyRainMm: Math.round(rain.medianDailyRainMm * 100) / 100,
      weightedProbGt1Mm: Math.round(rain.weightedProbGt1Mm * 1000) / 1000,
      peakPrecipitationSupport: Math.round(rain.peakSupport * 1000) / 1000,
      maxGustKmh: Math.round(maxGust * 10) / 10,
      medianTemperatureSpreadC: Math.round(medianTempSpread * 100) / 100
    }
  };
}
