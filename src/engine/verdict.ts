import type { CityConfig, ConsensusHour, DisplayHour, HourlyCondition, ModelForecast, OfficialPublicPayloadV24, Scene24Id } from "../types";
import { buildEditorialProductV2 } from "./editorial24/index";
import { hourOf } from "./math";
import { chooseScene24V2 } from "./scenes24/classifier";
import { buildDayProfileV2 } from "./scenes24/profile";
import { masterUrlForScene, scene24ById } from "./scenes24/registry";

function pointsForDate(consensus: Map<string, ConsensusHour>, date: string): ConsensusHour[] {
  return [...consensus.values()].filter((p) => p.time.slice(0, 10) === date).sort((a, b) => a.time.localeCompare(b.time));
}
function nearestHour(points: ConsensusHour[], hour: number): ConsensusHour {
  return [...points].sort((a, b) => Math.abs(hourOf(a.time) - hour) - Math.abs(hourOf(b.time) - hour))[0];
}
export function conditionForHour(p: ConsensusHour): HourlyCondition {
  if (p.thunderstormSupport >= 0.35) return "orage";
  if (p.fogSupport >= 0.45) return "brouillard";
  if ((p.precipitationMm >= 0.2 && p.precipitationSupport >= 0.45) || p.rainCodeSupport >= 0.45) return p.showerSupport >= 0.4 ? "averse" : "pluie";
  if (p.windGustKmh >= 70 && p.cloudCoverPct < 70) return "vent";
  if (p.cloudCoverPct < 20) return "soleil";
  if (p.cloudCoverPct < 40) return "peu nuageux";
  if (p.cloudCoverPct < 65) return "variable";
  if (p.cloudCoverPct < 85) return "nuageux";
  return "couvert";
}

export function buildCandidateProduct(
  city: CityConfig,
  date: string,
  consensus: Map<string, ConsensusHour>,
  forecasts: ModelForecast[],
  failures: Record<string, string>,
  source: string,
  previousSceneId?: Scene24Id | null
): OfficialPublicPayloadV24 {
  const day = pointsForDate(consensus, date);
  if (!day.length) throw new Error(`no_consensus_for_date:${date}`);
  const profile = buildDayProfileV2(city, date, day);
  const decision = chooseScene24V2(profile, previousSceneId);
  const solarPoints = day.filter((p) => hourOf(p.time) >= profile.period.startHour && hourOf(p.time) <= profile.period.endHour);
  const tempMinC = Math.round(Math.min(...solarPoints.map((p) => p.temperatureC)));
  const tempMaxC = Math.round(Math.max(...solarPoints.map((p) => p.temperatureC)));
  const hourly: DisplayHour[] = city.displayHours.map((hour) => {
    const p = nearestHour(day, hour);
    return { hour, temperatureC: Math.round(p.temperatureC), condition: conditionForHour(p), precipitationMm: Math.round(p.precipitationMm * 100) / 100 };
  });
  const editorial = buildEditorialProductV2(city, profile, decision, tempMinC, tempMaxC, hourly);
  const scene = scene24ById(decision.sceneId);
  return {
    version: "2.0",
    city: city.name,
    citySlug: city.slug,
    date,
    generatedAt: new Date().toISOString(),
    source,
    scene: {
      id: scene.id, key: scene.key, label: scene.label, family: scene.family,
      masterUrl: masterUrlForScene(scene.id), visualIcon: scene.visualIcon, emoji: scene.emoji
    },
    temperatures: { minC: tempMinC, maxC: tempMaxC },
    hourly,
    editorial,
    decision,
    models: { count: forecasts.length, ok: forecasts.map((f) => f.modelId), failed: failures }
  };
}
