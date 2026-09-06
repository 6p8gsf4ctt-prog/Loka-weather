import { consolidateWeeklyEvents } from "../src/engine/weekly";
import type { WeeklyEvent } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_CONSOLIDATION_FAIL:${label}`);
  passed++;
}

function raw(
  type: WeeklyEvent["type"],
  dayIndex: number,
  date: string,
  evidence: WeeklyEvent["evidence"] = {}
): WeeklyEvent {
  return {
    id: `${type.toLowerCase()}:${date}`,
    type,
    startDate: date,
    endDate: date,
    dayIndexes: [dayIndex],
    rule: "test_fixture",
    evidence
  };
}

const dates = [
  "2026-09-07", "2026-09-08", "2026-09-09", "2026-09-10",
  "2026-09-11", "2026-09-12", "2026-09-13"
];

const heatMonday = raw("HEAT", 0, dates[0], { maxTemperatureC: 30, minTemperatureC: 18, thresholdC: 27 });
const heatTuesday = raw("HEAT", 1, dates[1], { maxTemperatureC: 33, minTemperatureC: 19, thresholdC: 27 });
const improvementMonday = raw("IMPROVEMENT", 0, dates[0], { earlyCloudPct: 90, lateCloudPct: 60, cloudTrend: -30, trendStrength: "MODERATE" });
const improvementWednesday = raw("IMPROVEMENT", 2, dates[2], { earlyCloudPct: 80, lateCloudPct: 15, cloudTrend: -65, trendStrength: "STRONG" });
const degradationTuesday = raw("DEGRADATION", 1, dates[1], { earlyCloudPct: 20, lateCloudPct: 75, cloudTrend: 55, trendStrength: "STRONG" });
const rainThursday = raw("RAIN", 3, dates[3], { totalMm: 12, wetHours: 8, wetBlockMaxHours: 5 });
const rainSaturday = raw("RAIN", 5, dates[5], { totalMm: 6, wetHours: 6, wetBlockMaxHours: 4 });
const windowFriday = raw("BEST_WINDOW", 4, dates[4], { startHour: 10, endHour: 15, hours: 6 });
const windowSunday = raw("BEST_WINDOW", 6, dates[6], { startHour: 9, endHour: 16, hours: 8 });

const consecutive = consolidateWeeklyEvents([heatTuesday, heatMonday]);
const mergedHeat = consecutive.find((item) => item.type === "HEAT");
ok(mergedHeat?.startDate === dates[0] && mergedHeat.endDate === dates[1], "consecutive_days_are_merged");
ok(mergedHeat?.sourceCandidateIds.join(",") === `${heatMonday.id},${heatTuesday.id}`, "source_candidates_are_preserved");
ok(mergedHeat?.evidence.durationDays === 2 && mergedHeat.evidence.sourceEventCount === 2, "merged_evidence_keeps_span");
ok(mergedHeat?.representativeDayIndex === 1, "representative_day_uses_strongest_signal");
ok(mergedHeat?.storyFamily === "HEAT" && mergedHeat.direction === null, "ordinary_story_family_is_explicit");
ok(mergedHeat?.sourceCandidateTypes.join(",") === "HEAT", "source_candidate_types_are_preserved");

const trend = consolidateWeeklyEvents([improvementMonday, improvementWednesday]);
const mergedTrend = trend.find((item) => item.storyFamily === "TRANSITION");
ok(trend.length === 1 && mergedTrend?.direction === "IMPROVING", "directional_trend_with_one_gap_is_merged");
ok(mergedTrend?.dayIndexes.join(",") === "0,2", "trend_keeps_contributing_days");
ok(mergedTrend?.rule === "merged_directional_trend_episode", "trend_merge_rule_is_traceable");

const interruptedTrend = consolidateWeeklyEvents([improvementMonday, degradationTuesday, improvementWednesday]);
ok(interruptedTrend.filter((item) => item.type === "IMPROVEMENT").length === 2, "opposite_trend_blocks_false_merge");
ok(interruptedTrend.some((item) => item.type === "DEGRADATION"), "opposite_trend_is_not_absorbed");

const separatedRain = consolidateWeeklyEvents([rainThursday, rainSaturday]);
ok(separatedRain.filter((item) => item.type === "RAIN").length === 2, "separated_rain_episodes_stay_separate");

const windows = consolidateWeeklyEvents([windowFriday, windowSunday]);
ok(windows.filter((item) => item.type === "BEST_WINDOW").length === 2, "best_windows_remain_candidates_until_selection");
ok(windows.every((item) => item.sourceCandidateIds.length === 1), "single_candidates_still_have_provenance");

const reversed = consolidateWeeklyEvents([rainSaturday, heatMonday, windowSunday]);
ok(reversed.map((item) => item.dayIndexes[0]).join(",") === "0,5,6", "output_order_is_deterministic_by_week_position");

console.log(`WEEKLY_CONSOLIDATION ${passed}/15 PASS`);
