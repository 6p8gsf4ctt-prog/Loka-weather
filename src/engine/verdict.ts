import type { CityConfig, ConsensusHour, DisplayHour, ModelForecast, OfficialPublicPayloadV24, Scene24Id } from "../types";
import { buildEditorialProductV2 } from "./editorial24/index";
import { hourOf } from "./math";
import { resolveDailySceneV24 } from "./scenes24/dailyDecision";
import { masterUrlForScene, scene24ById } from "./scenes24/registry";
import { buildDailyStoryDeckData, conditionForStoryHour } from "./dailyStoryDeck";

function pointsForDate(consensus: Map<string, ConsensusHour>, date: string): ConsensusHour[] {
  return [...consensus.values()].filter((p) => p.time.slice(0, 10) === date).sort((a, b) => a.time.localeCompare(b.time));
}
function nearestHour(points: ConsensusHour[], hour: number): ConsensusHour {
  return [...points].sort((a, b) => Math.abs(hourOf(a.time) - hour) - Math.abs(hourOf(b.time) - hour))[0];
}
export const conditionForHour = conditionForStoryHour;

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
  const { profile, decision } = resolveDailySceneV24(city, date, day, previousSceneId);
  const solarPoints = day.filter((p) => hourOf(p.time) >= profile.period.startHour && hourOf(p.time) <= profile.period.endHour);
  const tempMinC = Math.round(Math.min(...solarPoints.map((p) => p.temperatureC)));
  const tempMaxC = Math.round(Math.max(...solarPoints.map((p) => p.temperatureC)));
  const hourly: DisplayHour[] = city.displayHours.map((hour) => {
    const p = nearestHour(day, hour);
    return { hour, temperatureC: Math.round(p.temperatureC), condition: conditionForHour(p), precipitationMm: Math.round(p.precipitationMm * 100) / 100 };
  });
  const editorial = buildEditorialProductV2(city, profile, decision, tempMinC, tempMaxC, hourly);
  const scene = scene24ById(decision.sceneId);
  const payload: OfficialPublicPayloadV24 = {
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
  payload.storyDeck = buildDailyStoryDeckData(payload, city, consensus);
  return payload;
}
