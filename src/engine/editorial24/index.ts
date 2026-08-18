import type { CityConfig, DayProfileV2, EditorialProductV2, SceneDecisionV24 } from "../../types";
import { scene24ById } from "../scenes24/registry";
import { buildEditorialFacts } from "./facts";
import { buildHashtags } from "./hashtags";
import { buildSocialEditorial } from "./social";
import { buildVisualEditorial } from "./visual";

export function buildEditorialProductV2(
  city: CityConfig,
  profile: DayProfileV2,
  decision: SceneDecisionV24,
  tempMinC: number,
  tempMaxC: number
): EditorialProductV2 {
  const scene = scene24ById(decision.sceneId);
  const facts = buildEditorialFacts(city, profile, decision, tempMinC, tempMaxC);
  const visual = buildVisualEditorial(facts);
  const hashtags = buildHashtags(city.slug, city.name, facts);
  const social = buildSocialEditorial(city.slug, city.name, facts, scene.emoji, hashtags);
  if (scene.label === visual.subtitle.toUpperCase()) throw new Error("editorial_subtitle_redundant");
  return {
    version: "2.0",
    scene: { id: scene.id, key: scene.key, title: scene.label, emoji: scene.emoji, visualIcon: scene.visualIcon },
    visual,
    social,
    facts
  };
}
