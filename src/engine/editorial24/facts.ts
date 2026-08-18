import type { CityConfig, DayProfileV2, EditorialFacts, SceneDecisionV24, SkyBand } from "../../types";

function skyBand(cloud: number): SkyBand {
  if (cloud <= 25) return "CLEAR";
  if (cloud <= 45) return "BRIGHT";
  if (cloud <= 69) return "MIXED";
  if (cloud <= 89) return "CLOUDY";
  return "DENSE";
}

export function buildEditorialFacts(
  city: CityConfig,
  profile: DayProfileV2,
  decision: SceneDecisionV24,
  tempMinC: number,
  tempMaxC: number
): EditorialFacts {
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
    modelSignalUncertain: profile.structure.uncertainWeather || profile.structure.modelCountMin === 3
  };
}
