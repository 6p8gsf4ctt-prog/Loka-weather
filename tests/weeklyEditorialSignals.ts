import { validateWeeklyEditorialSignal, WEEKLY_EDITORIAL_SIGNAL_VERSION } from "../src/engine/weekly";
import type { WeeklyEditorialSignal } from "../src/engine/weekly";

let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_EDITORIAL_SIGNALS_FAIL:${label}`);
  passed++;
}

const forecast = {
  metric: "TEMPERATURE" as const,
  value: 29,
  unit: "°C",
  window: { startDate: "2026-09-22", endDate: "2026-09-22", basis: "DAILY_EXTREME" as const }
};

const base: WeeklyEditorialSignal = {
  version: WEEKLY_EDITORIAL_SIGNAL_VERSION,
  id: "historical:tmax:2026-09-22",
  role: "NUMBER",
  family: "HISTORICAL",
  topicKey: "temperature:tmax:2026-09-22",
  mode: "FORECAST",
  confidence: "HIGH",
  representativeDayIndex: 1,
  forecast,
  evidence: [{
    kind: "HISTORICAL_SINCE",
    source: "LOCAL_ARCHIVE",
    reference: { metric: "TEMPERATURE", value: 28.7, unit: "°C", window: { startDate: "2026-06-18", endDate: "2026-06-18", basis: "DAILY_EXTREME" } },
    explanation: "Maximum journalier comparable le plus élevé depuis le 18 juin."
  }]
};

ok(validateWeeklyEditorialSignal(base).ok, "historical_same_metric_same_window_is_valid");
ok(!validateWeeklyEditorialSignal({ ...base, evidence: [] }).ok, "raw_forecast_number_is_blocked");
ok(validateWeeklyEditorialSignal({
  ...base,
  evidence: [{ ...base.evidence[0], reference: { metric: "PRECIPITATION", value: 12, unit: "mm", window: { startDate: "2026-06-18", endDate: "2026-06-18", basis: "DAILY_TOTAL" } } }]
}).issues.some((issue) => issue.startsWith("non_comparable")), "different_metrics_cannot_be_compared");
ok(validateWeeklyEditorialSignal({
  ...base,
  family: "INTRADAY_CHANGE",
  forecast: { ...forecast, value: 16, window: { startDate: "2026-09-22", endDate: "2026-09-23", basis: "HOURLY", startHour: 7, endHour: 16 } },
  evidence: [{ kind: "INTRADAY_CHANGE", source: "CONSENSUS_FORECAST", direct: true, reference: { metric: "TEMPERATURE", value: 9, unit: "°C", window: { startDate: "2026-09-22", endDate: "2026-09-22", basis: "HOURLY", startHour: 7, endHour: 16 } }, explanation: "Écart entre le lever et l’après-midi." }]
}).issues.includes("intraday_must_stay_within_one_day"), "cross_day_amplitude_is_blocked");
ok(validateWeeklyEditorialSignal({
  ...base,
  family: "INTRADAY_CHANGE",
  forecast: { ...forecast, value: 8, window: { startDate: "2026-09-22", endDate: "2026-09-22", basis: "HOURLY", startHour: 15, endHour: 19 } },
  evidence: [{ kind: "INTRADAY_CHANGE", source: "CONSENSUS_FORECAST", direct: true, reference: { metric: "TEMPERATURE", value: 7, unit: "°C", window: { startDate: "2026-09-22", endDate: "2026-09-22", basis: "HOURLY", startHour: 15, endHour: 19 } }, explanation: "Baisse rapide calculée dans une seule journée." }]
}).ok, "same_day_consensus_intraday_change_is_valid");
ok(validateWeeklyEditorialSignal({
  ...base,
  role: "PRACTICAL",
  family: "PHENOMENON",
  topicKey: "rain:friday",
  forecast: { metric: "PRECIPITATION", value: 11, unit: "mm", window: { startDate: "2026-09-25", endDate: "2026-09-25", basis: "DAILY_TOTAL" } },
  evidence: [{ kind: "PHENOMENON", source: "CONSENSUS_FORECAST", direct: true, reference: { metric: "PRECIPITATION", value: 11, unit: "mm", window: { startDate: "2026-09-25", endDate: "2026-09-25", basis: "DAILY_TOTAL" } }, explanation: "Cumul journalier significatif confirmé par le consensus." }]
}).ok, "direct_consensus_phenomenon_is_valid");

console.log(`WEEKLY_EDITORIAL_SIGNALS ${passed}/6 PASS`);
