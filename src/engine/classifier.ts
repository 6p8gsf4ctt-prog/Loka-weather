import { DECISION_CONFIG } from "../config/decision";
import type { CityConfig, ConsensusHour, DecisionLog, LokaScene, SceneCandidate } from "../types";
import { hourOf } from "./consensus";

export interface DayAnalysis {
  daytime: ConsensusHour[];
  sunnyHours: ConsensusHour[];
  cloudyHours: ConsensusHour[];
  rainHours: ConsensusHour[];
  thunderHours: ConsensusHour[];
  windyHours: ConsensusHour[];
  hotHours: ConsensusHour[];
  sunnyFraction: number;
  cloudyFraction: number;
  rainFraction: number;
  maxRainMmPerHour: number;
  maxGustKmh: number;
  peakThunderSupport: number;
  peakRainSupport: number;
  rainStartHour: number | null;
  rainEndHour: number | null;
  thunderStartHour: number | null;
  thunderEndHour: number | null;
  windStartHour: number | null;
  windEndHour: number | null;
  meaningfulTransitions: number;
  earlySunnyLateWet: boolean;
  uncertainWeather: boolean;
}

function range(hours: ConsensusHour[]): [number | null, number | null] {
  if (!hours.length) return [null, null];
  return [hourOf(hours[0].time), Math.min(22, hourOf(hours[hours.length - 1].time) + 1)];
}

function stateOf(p: ConsensusHour): "sun" | "cloud" | "rain" | "thunder" {
  if (p.thunderstormSupport >= DECISION_CONFIG.thunder.mentionSupport) return "thunder";
  if (p.precipitationMm >= DECISION_CONFIG.rain.wetHourMinMm && p.precipitationSupport >= 0.40) return "rain";
  if (p.cloudCoverPct >= DECISION_CONFIG.sky.cloudyCloudMinPct) return "cloud";
  return "sun";
}

export function analyzeDay(city: CityConfig, points: ConsensusHour[]): DayAnalysis {
  const daytime = points
    .filter((p) => hourOf(p.time) >= 7 && hourOf(p.time) <= 21)
    .sort((a, b) => a.time.localeCompare(b.time));

  const sunnyHours = daytime.filter((p) =>
    p.cloudCoverPct <= DECISION_CONFIG.sky.sunnyCloudMaxPct &&
    p.precipitationSupport < 0.40 &&
    p.thunderstormSupport < DECISION_CONFIG.thunder.mentionSupport
  );

  const cloudyHours = daytime.filter((p) =>
    p.cloudCoverPct >= DECISION_CONFIG.sky.cloudyCloudMinPct &&
    p.precipitationSupport < DECISION_CONFIG.rain.robustSupport &&
    p.thunderstormSupport < DECISION_CONFIG.thunder.mentionSupport
  );

  const rainHours = daytime.filter((p) =>
    p.precipitationMm >= DECISION_CONFIG.rain.wetHourMinMm &&
    (p.precipitationSupport >= DECISION_CONFIG.rain.robustSupport ||
     p.rainCodeSupport >= DECISION_CONFIG.rain.robustSupport)
  );

  const thunderHours = daytime.filter((p) =>
    p.thunderstormSupport >= DECISION_CONFIG.thunder.robustSupport
  );

  const windyHours = daytime.filter((p) => p.windGustKmh >= city.wind.gustNotableKmh);
  const hotHours = daytime.filter((p) => p.temperatureC >= DECISION_CONFIG.heat.prolongedHotFromC);

  const [rainStartHour, rainEndHour] = range(rainHours);
  const [thunderStartHour, thunderEndHour] = range(thunderHours);
  const [windStartHour, windEndHour] = range(windyHours);

  const states = daytime.map(stateOf);
  let meaningfulTransitions = 0;
  for (let i = 1; i < states.length; i++) if (states[i] !== states[i - 1]) meaningfulTransitions += 1;

  const early = daytime.filter((p) => hourOf(p.time) <= 12);
  const late = daytime.filter((p) => hourOf(p.time) >= 17);
  const earlySunny = early.length ? early.filter((p) => stateOf(p) === "sun").length / early.length >= 0.60 : false;
  const lateWet = late.some((p) => stateOf(p) === "rain" || stateOf(p) === "thunder");

  const ambiguousHours = daytime.filter((p) => {
    const rainMaybe = p.precipitationSupport >= DECISION_CONFIG.confidence.mentionFrom && p.precipitationSupport < DECISION_CONFIG.confidence.assertFrom;
    const thunderMaybe = p.thunderstormSupport >= DECISION_CONFIG.thunder.mentionSupport && p.thunderstormSupport < DECISION_CONFIG.thunder.robustSupport;
    return rainMaybe || thunderMaybe;
  });

  return {
    daytime, sunnyHours, cloudyHours, rainHours, thunderHours, windyHours, hotHours,
    sunnyFraction: daytime.length ? sunnyHours.length / daytime.length : 0,
    cloudyFraction: daytime.length ? cloudyHours.length / daytime.length : 0,
    rainFraction: daytime.length ? rainHours.length / daytime.length : 0,
    maxRainMmPerHour: Math.max(0, ...daytime.map((p) => p.precipitationMm)),
    maxGustKmh: Math.max(0, ...daytime.map((p) => p.windGustKmh)),
    peakThunderSupport: Math.max(0, ...daytime.map((p) => p.thunderstormSupport)),
    peakRainSupport: Math.max(0, ...daytime.map((p) => p.precipitationSupport)),
    rainStartHour, rainEndHour, thunderStartHour, thunderEndHour, windStartHour, windEndHour,
    meaningfulTransitions,
    earlySunnyLateWet: earlySunny && lateWet,
    uncertainWeather: ambiguousHours.length >= 2
  };
}

function candidate(scene: LokaScene, score: number, eligible: boolean, reasons: string[]): SceneCandidate {
  return { scene, score: Math.round(score * 100) / 100, eligible, reasons };
}

export function chooseScene(city: CityConfig, analysis: DayAnalysis): { scene: LokaScene; decisionLog: DecisionLog } {
  const c = DECISION_CONFIG;
  const reasons: string[] = [];
  const suppressed: string[] = [];

  const thunderScore = analysis.thunderHours.length * c.score.thunderHour + analysis.peakThunderSupport * c.score.thunderPeak;
  const rainScore = analysis.rainHours.length * c.score.rainHour + Math.min(6, analysis.maxRainMmPerHour) * c.score.rainPeak;
  const windExcess = Math.max(0, analysis.maxGustKmh - city.wind.gustNotableKmh);
  const windScore = analysis.windyHours.length * c.score.windHour + (windExcess / 10) * c.wind.scorePer10KmhAboveThreshold;
  const unstableScore = analysis.meaningfulTransitions * c.score.transition + (analysis.earlySunnyLateWet ? c.unstable.strongTransitionBonus : 0) + (analysis.uncertainWeather ? c.unstable.uncertainWeatherBonus : 0);
  const sunScore = analysis.sunnyFraction * c.score.sunnyFraction;
  const cloudScore = analysis.cloudyFraction * c.score.cloudyFraction;

  const thunderEligible = analysis.thunderHours.length >= c.thunder.sceneMinHours && analysis.peakThunderSupport >= c.thunder.robustSupport;
  const rainEligible = analysis.rainHours.length >= c.rain.sceneMinHours;
  const windEligible = analysis.windyHours.length >= c.wind.sceneMinHours;
  const unstableEligible =
    (analysis.meaningfulTransitions >= c.unstable.minMeaningfulTransitions && analysis.earlySunnyLateWet) ||
    (analysis.uncertainWeather && analysis.meaningfulTransitions >= c.unstable.minMeaningfulTransitions);
  const sunEligible = analysis.sunnyFraction >= c.sky.dominantFraction;
  const cloudEligible = analysis.cloudyFraction >= c.sky.dominantFraction;

  const candidates: SceneCandidate[] = [
    candidate("ORAGES", thunderScore, thunderEligible, [
      `${analysis.thunderHours.length} h d’orage robuste`,
      `pic d’accord orage ${(analysis.peakThunderSupport * 100).toFixed(0)} %`
    ]),
    candidate("PLUIE", rainScore, rainEligible, [
      `${analysis.rainHours.length} h de pluie robuste`,
      `intensité max ${analysis.maxRainMmPerHour.toFixed(1)} mm/h`
    ]),
    candidate("VENT FORT", windScore, windEligible, [
      `${analysis.windyHours.length} h au-dessus du seuil local`,
      `rafale max ${analysis.maxGustKmh.toFixed(0)} km/h`
    ]),
    candidate("INSTABLE", unstableScore, unstableEligible, [
      `${analysis.meaningfulTransitions} transitions significatives`,
      analysis.earlySunnyLateWet ? "soleil en première partie puis temps dégradé" : "pas de bascule soleil → temps dégradé",
      analysis.uncertainWeather ? "plusieurs heures avec désaccord des modèles" : "pas d’incertitude durable"
    ]),
    candidate("SOLEIL", sunScore, sunEligible, [`${Math.round(analysis.sunnyFraction * 100)} % de la journée dominée par le soleil`]),
    candidate("NUAGES", cloudScore, cloudEligible, [`${Math.round(analysis.cloudyFraction * 100)} % de la journée dominée par les nuages`])
  ];

  let selected: SceneCandidate | undefined;
  if (unstableEligible && analysis.earlySunnyLateWet) {
    const unstable = candidates.find((x) => x.scene === "INSTABLE")!;
    const thunder = candidates.find((x) => x.scene === "ORAGES")!;
    if (!thunderEligible || unstable.score >= thunder.score + 1.5) {
      selected = unstable;
      reasons.push("La transformation de la journée structure davantage le post que l’épisode final.");
    }
  }

  if (!selected) {
    selected = candidates.filter((x) => x.eligible).sort((a, b) => b.score - a.score)[0];
  }

  if (!selected) {
    selected = analysis.sunnyFraction >= analysis.cloudyFraction
      ? candidates.find((x) => x.scene === "SOLEIL")!
      : candidates.find((x) => x.scene === "NUAGES")!;
    reasons.push("Aucun phénomène n’atteint les seuils de scène : choix du ciel dominant.");
  }

  for (const x of candidates) {
    if (x.scene !== selected.scene && x.eligible) suppressed.push(`${x.scene} (${x.score}) derrière ${selected.scene} (${selected.score})`);
  }
  reasons.push(...selected.reasons);

  return {
    scene: selected.scene,
    decisionLog: {
      version: c.version,
      selectedScene: selected.scene,
      selectedScore: selected.score,
      candidates,
      metrics: {
        sunnyFraction: Math.round(analysis.sunnyFraction * 1000) / 1000,
        cloudyFraction: Math.round(analysis.cloudyFraction * 1000) / 1000,
        rainFraction: Math.round(analysis.rainFraction * 1000) / 1000,
        rainHours: analysis.rainHours.length,
        thunderHours: analysis.thunderHours.length,
        windyHours: analysis.windyHours.length,
        meaningfulTransitions: analysis.meaningfulTransitions,
        earlySunnyLateWet: analysis.earlySunnyLateWet,
        uncertainWeather: analysis.uncertainWeather,
        maxRainMmPerHour: Math.round(analysis.maxRainMmPerHour * 100) / 100,
        maxGustKmh: Math.round(analysis.maxGustKmh * 10) / 10,
        peakThunderSupport: Math.round(analysis.peakThunderSupport * 1000) / 1000,
        peakRainSupport: Math.round(analysis.peakRainSupport * 1000) / 1000
      },
      reasons,
      suppressed
    }
  };
}
