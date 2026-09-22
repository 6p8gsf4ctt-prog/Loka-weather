import { CITIES } from "../src/config/cities";
import { buildWeeklyFixedFacts, buildWeeklyProfiles, buildWeeklySlide1Synthesis, weeklyThermalClass } from "../src/engine/weekly";
import type { HourPoint, ModelForecast } from "../src/types";

const city = CITIES.tarnos;
const startDate = "2026-09-21";
const modelIds = ["arome", "ecmwf_ifs", "ecmwf_aifs", "icon_eu", "gfs"] as const;
let passed = 0;

function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`WEEKLY_SYNTHESIS_FAIL:${label}`);
  passed++;
}

function dateAt(offset: number): string {
  const date = new Date(`${startDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function forecasts(options: { heatDay?: number; cloudAt?: (dayIndex: number) => number; rainAt?: (dayIndex: number, hour: number) => number }): ModelForecast[] {
  return modelIds.map((modelId, modelIndex) => ({
    modelId,
    family: "meteofrance",
    weight: 1 / modelIds.length,
    fetchedAt: "2026-09-20T18:00:00.000Z",
    latitude: city.latitude,
    longitude: city.longitude,
    hourly: Array.from({ length: 7 * 24 }, (_, index): HourPoint => {
      const dayIndex = Math.floor(index / 24);
      const hour = index % 24;
      const cloudCoverPct = options.cloudAt?.(dayIndex) ?? 15;
      const peak = options.heatDay === dayIndex ? 31 : 24;
      const temperatureC = hour === 15 ? peak + modelIndex * .1 : 16 + Math.sin((hour / 24) * Math.PI) * 7 + modelIndex * .1;
      const precipitationMm = options.rainAt?.(dayIndex, hour) ?? 0;
      return {
        time: `${dateAt(dayIndex)}T${String(hour).padStart(2, "0")}:00`,
        temperatureC,
        apparentTemperatureC: temperatureC,
        precipitationMm,
        rainMm: precipitationMm,
        cloudCoverPct,
        cloudCoverLowPct: cloudCoverPct * .5,
        cloudCoverMidPct: cloudCoverPct * .25,
        cloudCoverHighPct: cloudCoverPct * .25,
        windSpeedKmh: 12,
        windGustKmh: 20,
        weatherCode: cloudCoverPct <= 20 ? 1 : 3
      };
    })
  }));
}

ok(weeklyThermalClass(9.9) === "COLD" && weeklyThermalClass(10) === "COOL" && weeklyThermalClass(15) === "MILD" && weeklyThermalClass(20) === "PLEASANT" && weeklyThermalClass(25) === "WARM" && weeklyThermalClass(30) === "MARKED_HEAT", "thermal_threshold_grid_is_exact");

const heatProfiles = buildWeeklyProfiles(city, forecasts({ heatDay: 3 }));
const heatFacts = buildWeeklyFixedFacts(city, heatProfiles);
const heatSynthesis = buildWeeklySlide1Synthesis(heatProfiles.days, heatFacts);
ok(heatSynthesis.evidence.thermalClass === "MARKED_HEAT" && heatSynthesis.primaryLine === "Chaleur marquée · Temps majoritairement sec", "thirty_one_degrees_never_uses_mild_vocabulary");
ok(heatSynthesis.secondaryLine === "Les températures culmineront à 31 °C jeudi." && heatSynthesis.evidence.maximumDayIndexes.join(",") === "3", "heat_sentence_is_traceable_to_its_real_peak_day");
const improvingProfiles = buildWeeklyProfiles(city, forecasts({ cloudAt: (dayIndex) => dayIndex < 2 ? 80 : 10 }));
const improvingFacts = buildWeeklyFixedFacts(city, improvingProfiles);
const improvingSynthesis = buildWeeklySlide1Synthesis(improvingProfiles.days, improvingFacts);
ok(improvingSynthesis.evidence.measuredBrightening && improvingSynthesis.primaryLine.includes("Davantage de soleil en fin de semaine"), "more_sun_requires_measured_brightening_and_cloud_drop");

const stableProfiles = buildWeeklyProfiles(city, forecasts({ cloudAt: () => 40 }));
const stableFacts = buildWeeklyFixedFacts(city, stableProfiles);
const stableSynthesis = buildWeeklySlide1Synthesis(stableProfiles.days, stableFacts);
ok(!stableSynthesis.evidence.measuredBrightening && !/Davantage de soleil/.test(stableSynthesis.primaryLine), "no_more_sun_wording_without_measured_progression");
ok(stableSynthesis.secondaryLine === "Les maximales resteront proches de 24 °C.", "secondary_line_uses_the_factual_temperature_range_only");

const isolatedProfiles = buildWeeklyProfiles(city, forecasts({
  rainAt: (dayIndex, hour) => dayIndex === 6 && hour === 8 ? 12.6 : 0
}));
const isolatedSynthesis = buildWeeklySlide1Synthesis(isolatedProfiles.days, buildWeeklyFixedFacts(city, isolatedProfiles));
ok(isolatedSynthesis.evidence.wetDays === 1 && isolatedSynthesis.evidence.wetDayIndexes.join(",") === "6", "isolated_rain_evidence_tracks_distribution_by_day");
ok(isolatedSynthesis.primaryLine.startsWith("Un passage pluvieux possible") && !isolatedSynthesis.primaryLine.startsWith("Pluies fréquentes"), "one_wet_day_is_never_called_frequent_rain");

const scatteredProfiles = buildWeeklyProfiles(city, forecasts({
  rainAt: (dayIndex, hour) => ([1, 4].includes(dayIndex) && [8, 9].includes(hour)) ? .8 : 0
}));
const scatteredSynthesis = buildWeeklySlide1Synthesis(scatteredProfiles.days, buildWeeklyFixedFacts(city, scatteredProfiles));
ok(scatteredSynthesis.evidence.wetDays === 2 && scatteredSynthesis.primaryLine.startsWith("Quelques passages pluvieux"), "two_wet_days_use_scattered_rain_language");

const frequentProfiles = buildWeeklyProfiles(city, forecasts({
  rainAt: (dayIndex, hour) => ([1, 3, 5].includes(dayIndex) && [8, 9].includes(hour)) ? .8 : 0
}));
const frequentSynthesis = buildWeeklySlide1Synthesis(frequentProfiles.days, buildWeeklyFixedFacts(city, frequentProfiles));
ok(frequentSynthesis.evidence.wetDays === 3 && frequentSynthesis.evidence.wetHours === 6 && frequentSynthesis.primaryLine.startsWith("Pluies fréquentes"), "frequent_rain_requires_three_distributed_wet_days");

console.log(`WEEKLY_SYNTHESIS ${passed}/10 PASS`);
