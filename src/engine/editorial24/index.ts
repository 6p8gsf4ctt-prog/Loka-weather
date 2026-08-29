import type { CityConfig, DayProfileV2, DisplayHour, EditorialProductV2, SceneDecisionV24 } from "../../types";
import { scene24ById } from "../scenes24/registry";
import { buildEditorialFacts } from "./facts";
import { buildHashtags } from "./hashtags";
import { buildSocialEditorial } from "./social";
import { buildVisualEditorial } from "./visual";
import { buildEngagementEditorial } from "./engagement";

export function buildEditorialProductV2(
  city: CityConfig,
  profile: DayProfileV2,
  decision: SceneDecisionV24,
  tempMinC: number,
  tempMaxC: number,
  hourly: DisplayHour[] = []
): EditorialProductV2 {
  const scene = scene24ById(decision.sceneId);
  const facts = buildEditorialFacts(city, profile, decision, tempMinC, tempMaxC, hourly);
  const visual = buildVisualEditorial(facts);
  const hashtags = buildHashtags(city.slug, city.name, facts);
  const social = buildSocialEditorial(city.slug, city.name, facts, scene.emoji, hashtags);
  const engagement = buildEngagementEditorial(city.name, profile.date, facts);
  if (visual.subtitle !== "") throw new Error("editorial_subtitle_legacy_not_empty");
  if (!visual.primaryLine.trim() || !visual.secondaryLine.trim() || visual.primaryLine === visual.secondaryLine) {
    throw new Error("editorial_visual_invalid");
  }
  if (visual.primaryLine.length > 80 || visual.secondaryLine.length > 120) {
    throw new Error("editorial_visual_too_long");
  }
  return {
    version: "2.0",
    scene: { id: scene.id, key: scene.key, title: scene.label, emoji: scene.emoji, visualIcon: scene.visualIcon },
    visual,
    social,
    engagement,
    facts
  };
}
