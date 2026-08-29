import type {
  CityConfig,
  DayProfileV2,
  DisplayHour,
  EditorialFacts,
  HourlyCondition,
  SceneDecisionV24,
  SkyBand
} from "../../types";
import { isStructuringShowers, isSustainedRain } from "../scenes24/rainDoctrine";

export type EditorialRainRole = "NONE" | "SECONDARY" | "SHOWERS" | "SUSTAINED" | "THUNDER";
export type EditorialDaypart = "NIGHT" | "MORNING" | "MIDDAY" | "AFTERNOON" | "LATE_AFTERNOON" | "EVENING" | "ALL_DAY";
export type EditorialPhenomenon = "SKY" | "PRECIPITATION" | "SHOWERS" | "THUNDER" | "WIND" | "FOG" | "TEMPERATURE";
export type EditorialTemperatureSalience = "NORMAL" | "NOTABLE" | "STRONG";

export interface EditorialIntelligence {
  rain: {
    role: EditorialRainRole;
    firstHour: number | null;
    lastHour: number | null;
    period: EditorialDaypart | null;
  };
  transition: {
    direction: "IMPROVING" | "DEGRADING" | null;
    firstChangeHour: number | null;
    decisiveHour: number | null;
    period: EditorialDaypart | null;
    source: "DISPLAY_HOURS" | "NONE";
  };
  temperature: {
    riseC: number;
    salience: EditorialTemperatureSalience;
    peakHour: number | null;
    peakPeriod: EditorialDaypart | null;
  };
  priority: {
    primary: EditorialPhenomenon;
    secondary: EditorialPhenomenon[];
  };
}

export type EditorialFactsV21 = EditorialFacts & {
  intelligence: EditorialIntelligence;
};

function skyBand(cloud: number): SkyBand {
  if (cloud <= 25) return "CLEAR";
  if (cloud <= 45) return "BRIGHT";
  if (cloud <= 69) return "MIXED";
  if (cloud <= 89) return "CLOUDY";
  return "DENSE";
}

function daypartForHour(hour: number): EditorialDaypart {
  if (hour < 6) return "NIGHT";
  if (hour < 11) return "MORNING";
  if (hour < 14) return "MIDDAY";
  if (hour < 17) return "AFTERNOON";
  if (hour < 20) return "LATE_AFTERNOON";
  return "EVENING";
}

function periodForSpan(firstHour: number | null, lastHour: number | null): EditorialDaypart | null {
  if (firstHour === null || lastHour === null) return null;
  if (lastHour - firstHour >= 12 || (firstHour <= 6 && lastHour >= 20)) return "ALL_DAY";
  return daypartForHour(Math.round((firstHour + lastHour) / 2));
}

function rainyCondition(condition: HourlyCondition): boolean {
  return condition === "pluie" || condition === "averse" || condition === "orage";
}

function skyRank(condition: HourlyCondition): number | null {
  switch (condition) {
    case "soleil": return 0;
    case "peu nuageux": return 1;
    case "variable": return 2;
    case "vent": return 2;
    case "nuageux": return 3;
    case "couvert": return 4;
    case "brouillard": return 4;
    case "averse": return 4;
    case "pluie": return 4;
    case "orage": return 4;
  }
}

function rainRole(profile: DayProfileV2): EditorialRainRole {
  if (profile.convection.thunderHours > 0) return "THUNDER";
  if (profile.rain.rainHours === 0) return "NONE";
  if (isSustainedRain(profile)) return "SUSTAINED";
  if (isStructuringShowers(profile)) return "SHOWERS";
  return "SECONDARY";
}

function transitionTiming(
  trajectory: EditorialFacts["trajectory"],
  hourly: DisplayHour[]
): EditorialIntelligence["transition"] {
  if ((trajectory !== "IMPROVING" && trajectory !== "DEGRADING") || hourly.length < 2) {
    return { direction: null, firstChangeHour: null, decisiveHour: null, period: null, source: "NONE" };
  }

  const ranked = [...hourly]
    .sort((a, b) => a.hour - b.hour)
    .map((point) => ({ hour: point.hour, rank: skyRank(point.condition) }))
    .filter((point): point is { hour: number; rank: number } => point.rank !== null);

  if (ranked.length < 2) {
    return { direction: trajectory, firstChangeHour: null, decisiveHour: null, period: null, source: "NONE" };
  }

  const baselinePoints = ranked.slice(0, Math.min(3, ranked.length));
  const baseline = baselinePoints.reduce((sum, point) => sum + point.rank, 0) / baselinePoints.length;
  const improvement = trajectory === "IMPROVING";
  const delta = (rank: number) => improvement ? baseline - rank : rank - baseline;

  const firstIndex = ranked.findIndex((point, index) => index > 0 && delta(point.rank) >= 0.75);
  let decisiveIndex = ranked.findIndex((point, index) => index > 0 && delta(point.rank) >= 1.75);

  if (decisiveIndex < 0 && firstIndex >= 0) {
    for (let index = firstIndex; index < ranked.length - 1; index++) {
      if (delta(ranked[index].rank) >= 0.75 && delta(ranked[index + 1].rank) >= 0.75) {
        decisiveIndex = index;
        break;
      }
    }
  }

  const firstChangeHour = firstIndex >= 0 ? ranked[firstIndex].hour : null;
  const decisiveHour = decisiveIndex >= 0 ? ranked[decisiveIndex].hour : firstChangeHour;
  return {
    direction: trajectory,
    firstChangeHour,
    decisiveHour,
    period: decisiveHour === null ? null : daypartForHour(decisiveHour),
    source: firstChangeHour === null ? "NONE" : "DISPLAY_HOURS"
  };
}

function temperatureIntelligence(
  city: CityConfig,
  tempMinC: number,
  tempMaxC: number,
  character: EditorialFacts["temperature"]["character"],
  hourly: DisplayHour[]
): EditorialIntelligence["temperature"] {
  const riseC = tempMaxC - tempMinC;
  const salience: EditorialTemperatureSalience =
    character === "VERY_HOT" || riseC >= city.thermal.strongRiseC ? "STRONG" :
    character === "HOT" || riseC >= city.thermal.notableRiseC ? "NOTABLE" : "NORMAL";

  const sorted = [...hourly].sort((a, b) => a.hour - b.hour);
  const peakTemperature = sorted.length ? Math.max(...sorted.map((point) => point.temperatureC)) : null;
  const peak = peakTemperature === null ? null : sorted.find((point) => point.temperatureC === peakTemperature) ?? null;

  return {
    riseC,
    salience,
    peakHour: peak?.hour ?? null,
    peakPeriod: peak ? daypartForHour(peak.hour) : null
  };
}

function editorialPriority(
  decision: SceneDecisionV24,
  precipitationRole: EditorialRainRole,
  wind: EditorialFacts["wind"],
  fog: EditorialFacts["fog"],
  temperature: EditorialIntelligence["temperature"],
  trajectory: EditorialFacts["trajectory"]
): EditorialIntelligence["priority"] {
  let primary: EditorialPhenomenon = "SKY";

  if (precipitationRole === "THUNDER") primary = "THUNDER";
  else if (precipitationRole === "SUSTAINED") primary = "PRECIPITATION";
  else if (decision.decisionFamily === "VISIBILITY" && fog.kind !== "NONE") primary = "FOG";
  else if ((decision.decisionFamily === "WIND" || decision.decisionFamily === "WIND_COMBINATION") && wind.kind !== "NONE") primary = "WIND";

  const secondary: EditorialPhenomenon[] = [];
  const add = (value: EditorialPhenomenon) => {
    if (value !== primary && !secondary.includes(value)) secondary.push(value);
  };

  if (precipitationRole === "SECONDARY") add("PRECIPITATION");
  if (precipitationRole === "SHOWERS") add("SHOWERS");
  if (wind.kind !== "NONE") add("WIND");
  if (fog.kind !== "NONE") add("FOG");
  if (temperature.salience !== "NORMAL") add("TEMPERATURE");
  if (primary !== "SKY" && trajectory !== "STABLE") add("SKY");

  return { primary, secondary };
}

export function buildEditorialFacts(
  city: CityConfig,
  profile: DayProfileV2,
  decision: SceneDecisionV24,
  tempMinC: number,
  tempMaxC: number,
  hourly: DisplayHour[] = []
): EditorialFactsV21 {
  const trajectory: EditorialFacts["trajectory"] =
    profile.evolution.cloudTrend <= -25 ? "IMPROVING" :
    profile.evolution.cloudTrend >= 25 ? "DEGRADING" :
    profile.structure.meaningfulTransitions >= 3 ? "VARIABLE" : "STABLE";
  const strength: EditorialFacts["transitionStrength"] =
    profile.evolution.trendStrength === "STRONG" ? "STRONG" :
    profile.evolution.trendStrength === "MODERATE" ? "MODERATE" :
    profile.evolution.trendStrength === "WEAK" ? "WEAK" : "NONE";
  const periodCloud = [
    ["EARLY", profile.periods.early.meanCloudPct],
    ["MID", profile.periods.mid.meanCloudPct],
    ["LATE", profile.periods.late.meanCloudPct]
  ] as const;
  const brightest = [...periodCloud].sort((a, b) => a[1] - b[1])[0][0];
  const cloudiest = [...periodCloud].sort((a, b) => b[1] - a[1])[0][0];

  // Le kind historique reste inchangé à l'étape 1 pour ne pas modifier les textes publics.
  // Le nouveau role porte la hiérarchie réelle qui sera utilisée par l'étape 2.
  const precipitation: EditorialFacts["precipitation"] = profile.convection.thunderHours > 0
    ? { kind: "THUNDER", hours: profile.convection.thunderHours, totalMm: profile.rain.rainTotalMm }
    : profile.rain.showerHours >= 2 && profile.rain.continuityRatio < 0.55
      ? { kind: "SHOWERS", hours: profile.rain.rainHours, totalMm: profile.rain.rainTotalMm }
      : profile.rain.rainHours > 0
        ? { kind: "RAIN", hours: profile.rain.rainHours, totalMm: profile.rain.rainTotalMm }
        : { kind: "DRY", hours: 0, totalMm: 0 };

  const wind: EditorialFacts["wind"] = profile.wind.strongHours >= 2
    ? { kind: "STRONG", maxGustKmh: profile.wind.maxGustKmh }
    : profile.wind.notableHours >= 2
      ? { kind: "NOTABLE", maxGustKmh: profile.wind.maxGustKmh }
      : { kind: "NONE", maxGustKmh: profile.wind.maxGustKmh };
  const fog: EditorialFacts["fog"] = profile.visibility.denseFogHours >= 3
    ? { kind: "DENSE", hours: profile.visibility.fogHours }
    : profile.visibility.fogHours >= 1
      ? { kind: "BRIEF", hours: profile.visibility.fogHours }
      : { kind: "NONE", hours: 0 };
  const temperature: EditorialFacts["temperature"] = {
    minC: tempMinC,
    maxC: tempMaxC,
    character: tempMaxC >= city.thermal.afternoonVeryHotFromC ? "VERY_HOT"
      : tempMaxC >= city.thermal.afternoonHotFromC ? "HOT"
      : tempMaxC >= 22 ? "WARM"
      : tempMaxC >= 16 ? "MILD" : "COOL"
  };

  const wetDisplay = [...hourly].filter((point) => rainyCondition(point.condition)).sort((a, b) => a.hour - b.hour);
  const firstRainHour = wetDisplay[0]?.hour ?? null;
  const lastRainHour = wetDisplay[wetDisplay.length - 1]?.hour ?? null;
  const role = rainRole(profile);
  const transition = transitionTiming(trajectory, hourly);
  const temperatureSignals = temperatureIntelligence(city, tempMinC, tempMaxC, temperature.character, hourly);

  const intelligence: EditorialIntelligence = {
    rain: {
      role,
      firstHour: firstRainHour,
      lastHour: lastRainHour,
      period: periodForSpan(firstRainHour, lastRainHour)
    },
    transition,
    temperature: temperatureSignals,
    priority: editorialPriority(decision, role, wind, fog, temperatureSignals, trajectory)
  };

  return {
    sceneId: decision.sceneId,
    sceneKey: decision.sceneKey,
    trajectory,
    startSky: skyBand(profile.periods.early.meanCloudPct),
    middleSky: skyBand(profile.periods.mid.meanCloudPct),
    endSky: skyBand(profile.periods.late.meanCloudPct),
    transitionStrength: strength,
    brightestPeriod: profile.evolution.trendStrength === "STABLE" && profile.light.brightFraction > 0.8 ? "ALL_DAY" : brightest,
    cloudiestPeriod: profile.evolution.trendStrength === "STABLE" && profile.light.denseFraction > 0.7 ? "ALL_DAY" : cloudiest,
    precipitation,
    wind,
    fog,
    temperature,
    confidence: decision.confidence,
    modelSignalUncertain: profile.structure.uncertainWeather || profile.structure.modelCountMin === 3,
    intelligence
  };
}
