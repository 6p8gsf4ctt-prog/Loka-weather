import { SCENE_THRESHOLDS } from "../../config/scenes24";
import type { CityConfig, ConsensusHour, DayPeriodProfile, DayProfileV2, SkyBand } from "../../types";
import { countRuns, hourOf, maxRun, mean, median, stddev } from "../math";
import { solarWindow } from "../solar";

function band(cloud: number): SkyBand {
  const s = SCENE_THRESHOLDS.sky;
  if (cloud <= s.clearMax) return "CLEAR";
  if (cloud <= s.brightMax) return "BRIGHT";
  if (cloud <= s.mixedMax) return "MIXED";
  if (cloud <= s.cloudyMax) return "CLOUDY";
  return "DENSE";
}
function fraction<T>(values: T[], predicate: (v: T) => boolean): number {
  return values.length ? values.filter(predicate).length / values.length : 0;
}
function nullableMean(values: Array<number | null>): number | null {
  const valid = values.filter((x): x is number => x !== null && Number.isFinite(x));
  return valid.length ? mean(valid) : null;
}
function periodProfile(points: ConsensusHour[], city: CityConfig): DayPeriodProfile {
  return {
    count: points.length,
    meanCloudPct: mean(points.map((p) => p.cloudCoverPct)),
    brightFraction: fraction(points, (p) => p.cloudCoverPct <= SCENE_THRESHOLDS.sky.brightMax),
    cloudyFraction: fraction(points, (p) => p.cloudCoverPct >= 70),
    meanWindGustKmh: mean(points.map((p) => p.windGustKmh)),
    rainHours: points.filter(isWet).length
  };
}
function isWet(p: ConsensusHour): boolean {
  return (p.precipitationMm >= SCENE_THRESHOLDS.rain.wetHourMinMm && p.precipitationSupport >= SCENE_THRESHOLDS.rain.supportMin)
    || p.rainCodeSupport >= SCENE_THRESHOLDS.rain.supportMin;
}
function structuralState(p: ConsensusHour, city: CityConfig): string {
  if (p.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin) return "THUNDER";
  if (p.fogSupport >= SCENE_THRESHOLDS.fog.supportMin) return "FOG";
  if (isWet(p)) return p.showerSupport >= 0.4 ? "SHOWER" : "RAIN";
  if (p.windGustKmh >= city.wind.gustNotableKmh) return "WIND";
  return band(p.cloudCoverPct);
}

export function buildDayProfileV2(city: CityConfig, date: string, allPoints: ConsensusHour[]): DayProfileV2 {
  const solar = solarWindow(city, date);
  const day = allPoints
    .filter((p) => p.time.slice(0, 10) === date && hourOf(p.time) >= solar.startHour && hourOf(p.time) <= solar.endHour)
    .sort((a, b) => a.time.localeCompare(b.time));
  if (!day.length) throw new Error(`day_profile_no_points:${date}`);

  const third = Math.max(1, Math.ceil(day.length / 3));
  const early = day.slice(0, third);
  const mid = day.slice(third, Math.max(third + 1, day.length - third));
  const late = day.slice(Math.max(third, day.length - third));
  const lastHours = day.slice(-3);
  const clouds = day.map((p) => p.cloudCoverPct);
  const bands = day.map((p) => band(p.cloudCoverPct));
  const wet = day.map(isWet);
  const notableWind = day.map((p) => p.windGustKmh >= city.wind.gustNotableKmh);
  const strongWind = day.map((p) => p.windGustKmh >= city.wind.gustStrongKmh);
  const fog = day.map((p) => p.fogSupport >= SCENE_THRESHOLDS.fog.supportMin);
  const denseFog = day.map((p) => p.fogSupport >= SCENE_THRESHOLDS.fog.denseSupportMin);
  const states = day.map((p) => structuralState(p, city));
  let transitions = 0;
  for (let i = 1; i < states.length; i++) if (states[i] !== states[i - 1]) transitions++;
  const cloudDiffs = clouds.slice(1).map((v, i) => v - clouds[i]).filter((d) => Math.abs(d) >= 12);
  let reversals = 0;
  for (let i = 1; i < cloudDiffs.length; i++) if (Math.sign(cloudDiffs[i]) !== Math.sign(cloudDiffs[i - 1])) reversals++;
  const earlyCloud = mean(early.map((p) => p.cloudCoverPct));
  const lateCloud = mean(late.map((p) => p.cloudCoverPct));
  const cloudTrend = lateCloud - earlyCloud;
  const absTrend = Math.abs(cloudTrend);
  const trendStrength = absTrend >= 35 ? "STRONG" : absTrend >= 25 ? "MODERATE" : absTrend >= 12 ? "WEAK" : "STABLE";
  const rainHours = wet.filter(Boolean).length;
  const showerHours = day.filter((p, i) => wet[i] && p.showerSupport >= 0.4).length;
  const fogSupports = day.filter((_, i) => fog[i]).map((p) => p.fogSupport);

  return {
    version: "2.0", citySlug: city.slug, date,
    period: {
      startHour: solar.startHour, endHour: solar.endHour,
      sunriseLocalHour: solar.sunriseLocalHour, sunsetLocalHour: solar.sunsetLocalHour,
      daylightHours: Math.max(0, solar.sunsetLocalHour - solar.sunriseLocalHour)
    },
    periods: {
      early: periodProfile(early, city), mid: periodProfile(mid, city), late: periodProfile(late, city), lastHours: periodProfile(lastHours, city)
    },
    light: {
      clearFraction: fraction(bands, (x) => x === "CLEAR"),
      brightFraction: fraction(bands, (x) => x === "CLEAR" || x === "BRIGHT"),
      mixedFraction: fraction(bands, (x) => x === "MIXED"),
      cloudyFraction: fraction(bands, (x) => x === "CLOUDY"),
      denseFraction: fraction(bands, (x) => x === "DENSE"),
      brightBlockMaxHours: maxRun(bands.map((x) => x === "CLEAR" || x === "BRIGHT")),
      cloudBlockMaxHours: maxRun(bands.map((x) => x === "CLOUDY" || x === "DENSE")),
      lastHoursBrightFraction: fraction(lastHours, (p) => p.cloudCoverPct <= SCENE_THRESHOLDS.sky.brightMax)
    },
    cloud: {
      meanCoverPct: mean(clouds), medianCoverPct: median(clouds), minCoverPct: Math.min(...clouds), maxCoverPct: Math.max(...clouds),
      stdDevPct: stddev(clouds), lowMeanPct: nullableMean(day.map((p) => p.cloudCoverLowPct)),
      midMeanPct: nullableMean(day.map((p) => p.cloudCoverMidPct)), highMeanPct: nullableMean(day.map((p) => p.cloudCoverHighPct)),
      highFractionAbove70: day.some((p) => p.cloudCoverHighPct !== null) ? fraction(day.filter((p) => p.cloudCoverHighPct !== null), (p) => (p.cloudCoverHighPct ?? 0) >= 70) : null,
      denseBlockMaxHours: maxRun(bands.map((x) => x === "DENSE"))
    },
    rain: {
      rainHours, rainBlockMaxHours: maxRun(wet), rainBreakCount: Math.max(0, countRuns(wet) - 1), dryGapMaxHours: maxRun(wet.map((x) => !x)),
      rainTotalMm: day.reduce((s, p) => s + p.precipitationMm, 0), maxRainMmPerHour: Math.max(...day.map((p) => p.precipitationMm)),
      continuityRatio: day.length ? rainHours / day.length : 0, showerHours, showerBlockCount: countRuns(day.map((p, i) => wet[i] && p.showerSupport >= 0.4)),
      convectiveRainFraction: rainHours ? showerHours / rainHours : 0
    },
    wind: {
      notableHours: notableWind.filter(Boolean).length, strongHours: strongWind.filter(Boolean).length, maxGustKmh: Math.max(...day.map((p) => p.windGustKmh)),
      blockMaxHours: maxRun(notableWind), strongBlockMaxHours: maxRun(strongWind),
      brightOverlapHours: day.filter((p, i) => notableWind[i] && p.cloudCoverPct <= 45).length,
      mixedOverlapHours: day.filter((p, i) => notableWind[i] && p.cloudCoverPct > 45 && p.cloudCoverPct < 70).length,
      cloudOverlapHours: day.filter((p, i) => notableWind[i] && p.cloudCoverPct >= 70).length,
      rainOverlapHours: day.filter((_, i) => notableWind[i] && wet[i]).length
    },
    convection: {
      thunderHours: day.filter((p) => p.thunderstormSupport >= SCENE_THRESHOLDS.thunder.supportMin).length,
      peakThunderSupport: Math.max(...day.map((p) => p.thunderstormSupport))
    },
    visibility: {
      fogHours: fog.filter(Boolean).length, denseFogHours: denseFog.filter(Boolean).length, fogBlockMaxHours: maxRun(fog), denseFogBlockMaxHours: maxRun(denseFog),
      fogSupportPeak: Math.max(...day.map((p) => p.fogSupport)), fogSupportMean: fogSupports.length ? mean(fogSupports) : 0, visibilityMinKm: null
    },
    evolution: {
      earlyCloudPct: earlyCloud, midCloudPct: mean(mid.map((p) => p.cloudCoverPct)), lateCloudPct: lateCloud,
      earlyBrightFraction: fraction(early, (p) => p.cloudCoverPct <= 45), midBrightFraction: fraction(mid, (p) => p.cloudCoverPct <= 45),
      lateBrightFraction: fraction(late, (p) => p.cloudCoverPct <= 45), cloudTrend, trendStrength, reversals
    },
    structure: {
      meaningfulTransitions: transitions,
      uncertainWeather: day.some((p) => (p.precipitationSupport > 0.3 && p.precipitationSupport < 0.55) || (p.fogSupport > 0.25 && p.fogSupport < 0.5) || (p.thunderstormSupport > 0.2 && p.thunderstormSupport < 0.4)),
      distinctStateCount: new Set(states).size,
      modelCountMin: Math.min(...day.map((p) => p.modelCount)),
      modelCountMean: mean(day.map((p) => p.modelCount))
    }
  };
}
