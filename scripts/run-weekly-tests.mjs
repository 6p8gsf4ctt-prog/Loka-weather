import { spawnSync } from "node:child_process";

const tests = [
  "weeklyIsolation", "weeklyForecast", "weeklyProfiles", "weeklyFixedFacts",
  "weeklyEvents", "weeklyConsolidation", "weeklySelection", "weeklyNarrativeOrder",
  "weeklyConclusion", "weeklyActivities", "weeklyEditorial", "weeklySynthesis",
  "weeklyEditorialSignals", "weeklyClimateReferences", "weeklyDataUnification",
  "weeklySignalDetectors", "weeklyEditorialActivation", "weeklySignalRanking",
  "weeklySignalCopy", "weeklyComplementarySlides", "weeklyComplementaryPreflight",
  "weeklyContextualPipeline", "weeklyPilotValidation", "weeklyProgressivePublication",
  "weeklyProductionReadiness", "weeklyCarousel", "weeklyOperations", "weeklyActivation", "weeklyReleaseCandidate"
];

for (const test of tests) {
  const result = spawnSync(process.execPath, [`.test-dist/tests/${test}.js`], { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
