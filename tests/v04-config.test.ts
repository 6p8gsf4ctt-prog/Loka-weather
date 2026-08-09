import { DECISION_CONFIG } from "../src/config/decision";

function ok(value: unknown, message: string): void {
  if (!value) throw new Error(message);
}

ok(DECISION_CONFIG.confidence.assertFrom > DECISION_CONFIG.confidence.mentionFrom,
  "assertFrom doit être supérieur à mentionFrom");
ok(DECISION_CONFIG.rain.strongFromMmPerHour > DECISION_CONFIG.rain.weakMaxMmPerHour,
  "le seuil de forte pluie doit être supérieur au seuil de pluie faible");
ok(DECISION_CONFIG.sky.dominantFraction >= 0.60 && DECISION_CONFIG.sky.dominantFraction <= 0.85,
  "la fraction dominante doit rester raisonnable");
ok(DECISION_CONFIG.wind.sceneMinHours >= 2,
  "VENT FORT ne doit pas être déclenché par une seule heure isolée");

console.log("LOKA V0.4 configuration guards: OK");
