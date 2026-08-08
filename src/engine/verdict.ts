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
  kind: "dry" | "rain" | "showers" | "thunderstorm";
  maxRate: number;
}

interface ThermalAnalysis {
  morningTempC: number;
  maxTempC: number;
  eveningTempC: number;
  riseC: number;
  eveningDropC: number;
  morningLabel: "cool" | "mild" | "warm";
  afternoonLabel: "normal" | "hot" | "very_hot";
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

function displayCondition(point: ConsensusHour): string {
  if (point.thunderstormSupport >= 0.45) return "orage";
  if (
    point.precipitationSupport >= 0.50 &&
    point.precipitationMm >= 0.2
  ) {
    return point.showerSupport >= 0.45 ? "averse" : "pluie";
  }
  return cloudCondition(point.cloudCoverPct);
}

function analyzeThermal(city: CityConfig, day: ConsensusHour[]): ThermalAnalysis {
  const daytime = day.filter((p) => hourOf(p.time) >= 7 && hourOf(p.time) <= 21);
  const morningPoint = nearestHour(daytime, 7) ?? daytime[0];
  const eveningPoint = nearestHour(daytime, 21) ?? daytime[daytime.length - 1];

  const maxTempC = Math.max(...daytime.map((p) => p.temperatureC));
  const morningTempC = morningPoint.temperatureC;
  const eveningTempC = eveningPoint.temperatureC;

  let morningLabel: ThermalAnalysis["morningLabel"] = "mild";
  if (morningTempC < city.thermal.morningCoolBelowC) morningLabel = "cool";
  else if (morningTempC >= city.thermal.morningWarmFromC) morningLabel = "warm";

  let afternoonLabel: ThermalAnalysis["afternoonLabel"] = "normal";
  if (maxTempC >= city.thermal.afternoonVeryHotFromC) afternoonLabel = "very_hot";
  else if (maxTempC >= city.thermal.afternoonHotFromC) afternoonLabel = "hot";

  return {
    morningTempC,
    maxTempC,
    eveningTempC,
    riseC: maxTempC - morningTempC,
    eveningDropC: maxTempC - eveningTempC,
    morningLabel,
    afternoonLabel
  };
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
  const peakThunder = Math.max(0, ...daytime.map((p) => p.thunderstormSupport));

  const robustWetHours = daytime.filter(
    (p) =>
      p.precipitationMm >= 0.2 &&
      (p.precipitationSupport >= 0.60 || p.rainCodeSupport >= 0.60)
  );

  const functionallyDry =
    medianDailyRainMm < 0.2 &&
    weightedProbGt1Mm < 0.25 &&
    robustWetHours.length === 0 &&
    peakThunder < 0.35;

  const agreement = Math.max(weightedProbGt1Mm, 1 - weightedProbGt1Mm);
  const confidence = Math.round(
    clamp(
      100 * (
        0.48 * agreement +
        0.32 * Math.max(peakSupport, 1 - peakSupport) +
        0.20 * Math.max(peakThunder, 1 - peakThunder)
      ),
      50,
      98
    )
  );

  if (functionallyDry) {
    return {
      verdict: "Journée sèche.",
      dry: true,
      confidence,
      startHour: null,
      endHour: null,
      medianDailyRainMm,
      weightedProbGt1Mm,
      peakSupport,
      kind: "dry",
      maxRate: 0
    };
  }

  const candidates = daytime.filter(
    (p) =>
      (p.precipitationMm >= 0.2 && p.precipitationSupport >= 0.45) ||
      p.rainCodeSupport >= 0.55 ||
      p.thunderstormSupport >= 0.40
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
      peakSupport,
      kind: "dry",
      maxRate: 0
    };
  }

  const blocks: ConsensusHour[][] = [[candidates[0]]];
  for (const p of candidates.slice(1)) {
    const previous = blocks[blocks.length - 1][blocks[blocks.length - 1].length - 1];
    if (hourOf(p.time) - hourOf(previous.time) <= 1) {
      blocks[blocks.length - 1].push(p);
    } else {
      blocks.push([p]);
    }
  }

  const block = blocks.sort((a, b) => {
    const score = (items: ConsensusHour[]) =>
      items.reduce(
        (sum, p) =>
          sum +
          p.precipitationMm +
          2.5 * p.precipitationSupport +
          4 * p.thunderstormSupport,
        0
      );
    return score(b) - score(a);
  })[0];

  const start = hourOf(block[0].time);
  const end = Math.min(22, hourOf(block[block.length - 1].time) + 1);
  const duration = end - start;
  const continuity = block.length / Math.max(1, duration);
  const maxRate = Math.max(...block.map((p) => p.precipitationMm));
  const thunderSupport = Math.max(...block.map((p) => p.thunderstormSupport));
  const showerSupport = Math.max(...block.map((p) => p.showerSupport));

  let kind: RainAnalysis["kind"] = "rain";
  let noun = "Pluie";

  if (thunderSupport >= 0.45) {
    kind = "thunderstorm";
    noun = "Orages";
  } else if (continuity < 0.75 || showerSupport >= 0.45) {
    kind = "showers";
    noun = maxRate >= 4 ? "Fortes averses" : "Averses";
  } else if (maxRate >= 4) {
    noun = "Forte pluie";
  } else if (maxRate < 1) {
    noun = "Pluie faible";
  }

  return {
    verdict: `${noun} de ${start} h à ${end} h.`,
    dry: false,
    confidence,
    startHour: start,
    endHour: end,
    medianDailyRainMm,
    weightedProbGt1Mm,
    peakSupport,
    kind,
    maxRate
  };
}

function makeMainVerdict(
  city: CityConfig,
  day: ConsensusHour[],
  rain: RainAnalysis,
  thermal: ThermalAnalysis
): string {
  const daytime = day.filter((p) => hourOf(p.time) >= 7 && hourOf(p.time) <= 21);
  const morning = daytime.filter((p) => hourOf(p.time) <= 11);
  const afternoon = daytime.filter((p) => hourOf(p.time) >= 12 && hourOf(p.time) <= 18);

  const morningCloud = avg(morning.map((p) => p.cloudCoverPct));
  const afternoonCloud = avg(afternoon.map((p) => p.cloudCoverPct));

  // High-impact weather gets the first right to describe the day.
  if (!rain.dry && rain.startHour !== null) {
    if (rain.kind === "thunderstorm") {
      if (rain.startHour >= 17) return "Chaud dans la journée, orageux en soirée.";
      if (rain.startHour >= 13) return "Temps calme le matin, orageux cet après-midi.";
      return "Orageux dès ce matin.";
    }

    if (rain.startHour >= 16 && morningCloud <= 45) {
      return "Soleil jusqu’en fin d’après-midi, pluie ensuite.";
    }

    if (rain.endHour !== null && rain.endHour <= 13) {
      return "Pluvieux le matin, plus sec ensuite.";
    }
  }

  // Thermal wording is allowed only when the absolute values justify the words.
  // This is the V0.3 fix for the erroneous "Plus frais" at 20°C.
  if (
    thermal.morningLabel === "cool" &&
    thermal.afternoonLabel === "hot" &&
    thermal.riseC >= city.thermal.strongRiseC &&
    morningCloud <= 55 &&
    afternoonCloud <= 55
  ) {
    return "Frais ce matin, chaud et ensoleillé ensuite.";
  }

  if (
    thermal.morningLabel === "mild" &&
    thermal.afternoonLabel === "hot" &&
    thermal.riseC >= city.thermal.notableRiseC &&
    morningCloud <= 55 &&
    afternoonCloud <= 55
  ) {
    return "Doux ce matin, chaud et ensoleillé ensuite.";
  }

  if (
    thermal.morningLabel === "warm" &&
    thermal.afternoonLabel === "hot" &&
    morningCloud <= 55 &&
    afternoonCloud <= 55
  ) {
    return "Doux dès le matin, chaud et ensoleillé ensuite.";
  }

  if (
    thermal.afternoonLabel === "very_hot" &&
    afternoonCloud <= 60
  ) {
    return "Très chaud et largement ensoleillé cet après-midi.";
  }

  // Strong late-day cooling can matter more than ordinary cloud variation.
  if (
    thermal.eveningDropC >= city.thermal.notableDropC &&
    thermal.maxTempC >= city.thermal.afternoonHotFromC
  ) {
    return "Chaud l’après-midi, nettement plus doux en soirée.";
  }

  if (morningCloud >= 75 && afternoonCloud <= 35) {
    return "Gris le matin, soleil ensuite.";
  }

  if (morningCloud <= 35 && afternoonCloud >= 75) {
    return "Soleil le matin, plus couvert ensuite.";
  }

  if (morningCloud <= 25 && afternoonCloud <= 25) {
    if (thermal.afternoonLabel === "hot" || thermal.afternoonLabel === "very_hot") {
      return "Grand soleil et chaud toute la journée.";
    }
    return "Grand soleil toute la journée.";
  }

  if (morningCloud <= 45 && afternoonCloud <= 45) {
    return thermal.afternoonLabel === "hot"
      ? "Ensoleillé et chaud dans l’après-midi."
      : "Ensoleillé avec quelques nuages.";
  }

  if (morningCloud >= 85 && afternoonCloud >= 85) {
    return rain.dry ? "Gris mais sec toute la journée." : "Couvert toute la journée.";
  }

  return "Alternance de soleil et de nuages.";
}

function makeNotableEvent(
  city: CityConfig,
  daytime: ConsensusHour[],
  rain: RainAnalysis,
  thermal: ThermalAnalysis
): string | null {
  const maxGust = Math.max(...daytime.map((p) => p.windGustKmh));
  const peakThunder = Math.max(...daytime.map((p) => p.thunderstormSupport));

  // Orage: the rain verdict already carries the timing. Secondary line adds only
  // something truly additional, e.g. severe wind.
  if (rain.kind === "thunderstorm" && maxGust >= city.wind.gustStrongKmh) {
    return `Fortes rafales jusqu’à ${Math.round(maxGust / 5) * 5} km/h sous les orages.`;
  }

  if (peakThunder >= 0.45 && rain.kind !== "thunderstorm") {
    return "Signal orageux notable dans les modèles.";
  }

  if (maxGust >= city.wind.gustStrongKmh) {
    return `Fortes rafales jusqu’à ${Math.round(maxGust / 5) * 5} km/h.`;
  }

  if (maxGust >= city.wind.gustNotableKmh) {
    return "Vent soutenu cet après-midi.";
  }

  // Only highlight an exceptional thermal change when it is not already
  // clearly expressed in the main verdict.
  if (
    thermal.riseC >= 13 &&
    thermal.morningLabel === "cool" &&
    thermal.afternoonLabel !== "normal"
  ) {
    return `${Math.round(thermal.morningTempC)}° le matin, jusqu’à ${Math.round(thermal.maxTempC)}° l’après-midi.`;
  }

  return null;
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
  const thermal = analyzeThermal(city, day);

  const maxTemp = Math.round(Math.max(...daytime.map((p) => p.temperatureC)));
  const minTemp = Math.round(Math.min(...daytime.map((p) => p.temperatureC)));
  const maxGust = Math.max(...daytime.map((p) => p.windGustKmh));
  const peakThunder = Math.max(...daytime.map((p) => p.thunderstormSupport));
  const medianTempSpread = median(daytime.map((p) => p.temperatureSpreadC));

  const confidenceMain = Math.round(
    clamp(
      96 - medianTempSpread * 10 - Math.max(0, 5 - forecasts.length) * 5,
      50,
      98
    )
  );

  const hourly: DisplayHour[] = city.displayHours.map((hour) => {
    const p = nearestHour(daytime, hour)!;
    return {
      hour,
      temperatureC: Math.round(p.temperatureC),
      condition: displayCondition(p),
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
    mainVerdict: makeMainVerdict(city, day, rain, thermal),
    rainVerdict: rain.verdict,
    notableEvent: makeNotableEvent(city, daytime, rain, thermal),
    confidenceMain,
    confidenceRain: rain.confidence,
    hourly,
    diagnostics: {
      modelsReceived: forecasts.map((f) => f.modelId),
      modelCount: forecasts.length,

      medianDailyRainMm: Math.round(rain.medianDailyRainMm * 100) / 100,
      weightedProbGt1Mm: Math.round(rain.weightedProbGt1Mm * 1000) / 1000,
      peakPrecipitationSupport: Math.round(rain.peakSupport * 1000) / 1000,
      rainKind: rain.kind,
      rainStartHour: rain.startHour,
      rainEndHour: rain.endHour,

      peakThunderstormSupport: Math.round(peakThunder * 1000) / 1000,

      maxGustKmh: Math.round(maxGust * 10) / 10,

      morningTemperatureC: Math.round(thermal.morningTempC * 10) / 10,
      maxTemperatureC: Math.round(thermal.maxTempC * 10) / 10,
      eveningTemperatureC: Math.round(thermal.eveningTempC * 10) / 10,
      morningToMaxDeltaC: Math.round(thermal.riseC * 10) / 10,
      maxToEveningDeltaC: Math.round(thermal.eveningDropC * 10) / 10,
      morningThermalLabel: thermal.morningLabel,
      afternoonThermalLabel: thermal.afternoonLabel,

      medianTemperatureSpreadC: Math.round(medianTempSpread * 100) / 100
    }
  };
}
