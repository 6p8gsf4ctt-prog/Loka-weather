import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { buildCandidateProduct } from "../src/engine/verdict";
import { SCENE24_DISPLAY_TITLES } from "../src/engine/scenes24/displayTitles";
import { renderInstagramCarouselV3Preview } from "../src/ui/instagramCarouselV3Preview";
import type { HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date = "2026-08-18";
const specs: Array<[string, WeatherFamily, number]> = [
  ["arome", "meteofrance", 0.30],
  ["ecmwf_ifs", "ecmwf_physics", 0.25],
  ["ecmwf_aifs", "ecmwf_ai", 0.15],
  ["icon_eu", "dwd", 0.17],
  ["gfs", "noaa", 0.13]
];

type Shape = { temp?: number; cloud?: number; rain?: number; code?: number; gust?: number; wind?: number };
type ShapeFn = (hour: number, modelId: string, modelIndex: number) => Shape;

function defaultCode(shape: Shape): number {
  if (shape.code !== undefined) return shape.code;
  const rain = shape.rain ?? 0, cloud = shape.cloud ?? 45;
  if (rain >= 0.2) return 61;
  if (cloud >= 85) return 3;
  if (cloud >= 50) return 2;
  if (cloud >= 20) return 1;
  return 0;
}

function forecasts(shapeFn: ShapeFn): ModelForecast[] {
  return specs.map(([modelId, family, weight], modelIndex) => {
    const hourly: HourPoint[] = [];
    for (let hour = 0; hour <= 23; hour++) {
      const shape = shapeFn(hour, modelId, modelIndex);
      const rain = shape.rain ?? 0, cloud = shape.cloud ?? 45;
      const temp = (shape.temp ?? 20) + (modelIndex - 2) * 0.15;
      hourly.push({
        time: `${date}T${String(hour).padStart(2,"0")}:00`, temperatureC: temp, apparentTemperatureC: temp,
        precipitationMm: rain, rainMm: rain, cloudCoverPct: cloud, cloudCoverLowPct: Math.max(0, cloud - 20),
        cloudCoverMidPct: Math.max(0, cloud - 30), cloudCoverHighPct: cloud, windSpeedKmh: shape.wind ?? 15,
        windGustKmh: shape.gust ?? 25, weatherCode: defaultCode(shape)
      });
    }
    return { modelId, family, weight, fetchedAt: new Date().toISOString(), latitude: 43.5417, longitude: -1.4628, hourly };
  });
}

const scenarios: Array<[string, ShapeFn]> = [
  ["01_grand_soleil_stable", h => ({ cloud: 8, temp: 17 + Math.max(0,1-Math.abs(h-16)/10)*11, code: 0 })],
  ["02_ciel_couvert_stable", h => ({ cloud: 94, temp: 16 + Math.max(0,1-Math.abs(h-15)/10)*4, code: 3 })],
  ["03_ciel_se_couvrant", h => ({ cloud: h<=10?16:h<=13?35:h<=16?65:92, temp: 18 + Math.max(0,1-Math.abs(h-15)/9)*7 })],
  ["04_journee_s_ameliorant", h => ({ cloud: h<=9?94:h<=12?75:h<=15?45:14, temp: 15 + Math.max(0,1-Math.abs(h-16)/10)*8 })],
  ["05_pluie_continue", h => ({ cloud:96,temp:16,rain:h>=6&&h<=21?.8:0,code:h>=6&&h<=21?61:3 })],
  ["06_averses_intermittentes", h => { const wet=[8,9,12,13,17,18].includes(h); return {cloud:wet?82:42,temp:17,rain:wet?.9:0,code:wet?80:2}; }],
  ["07_pluie_arrivant_en_journee", h => ({cloud:h<13?18:h<16?70:94,temp:18,rain:h>=16&&h<=21?.9:0,code:h>=16&&h<=21?61:h>=13?3:0})],
  ["08_pluie_cessant_en_journee", h => ({cloud:h<=11?94:h<=14?65:30,temp:16,rain:h>=6&&h<=10?.9:0,code:h>=6&&h<=10?61:h<=14?3:1})],
  ["09_journee_venteuse", h => ({cloud:76,temp:18,gust:h>=13&&h<=20?76:48,wind:h>=13&&h<=20?44:28,code:2})],
  ["10_brouillard_matinal", h => ({cloud:h<=10?94:20,temp:15,code:h>=6&&h<=9?45:h<=10?3:0})],
  ["11_forte_chaleur", h => ({cloud:8,temp:h>=14&&h<=18?35:h>=11&&h<=20?31:24,code:0})],
  ["12_journee_fraiche", h => ({cloud:35,temp:h>=14&&h<=17?17:12,code:1})],
  ["13_risque_orageux", h => ({cloud:h<16?55:95,temp:24,rain:h>=18&&h<=20?1.2:0,code:h>=18&&h<=20?95:h>=16?3:2})],
  ["14_prevision_tres_incertaine", (h,_id,i) => { const wetModel=i<=1,wet=wetModel&&h>=(15+i)&&h<=20; return {cloud:wetModel?(h>=14?92:45):30,temp:20,rain:wet?.9:0,code:wet?61:wetModel&&h>=14?3:1}; }],
  ["15_meteo_changeante_plusieurs_fois", h => h<=8?{cloud:12,temp:17,code:0}:h<=11?{cloud:90,temp:18,code:3}:h<=14?{cloud:28,temp:20,code:1}:h<=17?{cloud:92,temp:19,code:3}:h<=19?{cloud:35,temp:18,code:1}:{cloud:88,temp:17,code:3}]
];

function extractModel(html: string): any {
  const marker = "const m=";
  const start = html.indexOf(marker);
  const end = html.indexOf(";const p1=", start);
  if (start < 0 || end < 0) throw new Error("preview_model_not_found");
  return JSON.parse(html.slice(start + marker.length, end));
}

// Conservative width estimator for Helvetica/Arial. This is intentionally a little pessimistic.
function estimatedWidth(text: string, size: number): number {
  let units = 0;
  for (const ch of text) {
    if (ch === " ") units += .29;
    else if (/[MW@%&]/.test(ch)) units += .82;
    else if (/[A-ZÀÂÄÇÉÈÊËÎÏÔÖÙÛÜŒ]/.test(ch)) units += .64;
    else if (/[0-9]/.test(ch)) units += .57;
    else if (/[ilI1'’.,:;]/.test(ch)) units += .30;
    else units += .53;
  }
  return units * size;
}
function estimatedLines(text: string, size: number, width: number): number {
  const words = String(text).split(/\s+/).filter(Boolean);
  let lines = 1, line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && estimatedWidth(next, size) > width) { lines++; line = word; } else line = next;
  }
  return lines;
}

let checks = 0;
function ok(value: boolean, label: string): void { if (!value) throw new Error(`FAIL:${label}`); checks++; }

// All 24 public scene titles must fit on the single 64 px headline line (960 px usable width).
for (const [id, title] of Object.entries(SCENE24_DISPLAY_TITLES)) {
  ok(estimatedWidth(title, 64) <= 960, `scene_title_${id}_fits:${title}`);
}

for (const [name, shape] of scenarios) {
  const fs = forecasts(shape), payload = buildCandidateProduct(CITIES.tarnos, date, buildConsensus(fs), fs, {}, `VISUAL_CERT:${name}`);
  const html = renderInstagramCarouselV3Preview(payload, CITIES.tarnos), m = extractModel(html);
  ok(html.includes('id="page1" width="1080" height="1350"'), `${name}:page1_geometry`);
  ok(html.includes('id="page2" width="1080" height="1350"'), `${name}:page2_geometry`);
  ok(m.timeline.length >= 5 && m.timeline.length <= 9, `${name}:timeline_density:${m.timeline.length}`);
  const hours = m.timeline.map((p: any) => p.hour);
  const maxClockGap = hours.slice(1).reduce((max: number, hour: number, i: number) => Math.max(max, hour - hours[i]), 0);
  ok(maxClockGap <= 5, `${name}:timeline_clock_gap:${maxClockGap}`);
  const spacing = m.timeline.length <= 1 ? 940 : 940 / (m.timeline.length - 1);
  ok(spacing >= 117.5, `${name}:timeline_spacing:${spacing}`); // 9 points is the densest supported layout.
  ok(estimatedWidth(m.title, 64) <= 960, `${name}:headline_fits:${m.title}`);
  ok(estimatedLines(m.keyTakeaway, 26, 870) <= 2, `${name}:takeaway_2_lines:${m.keyTakeaway}`);
  ok(!m.context || estimatedWidth(m.context, 28) <= 960, `${name}:context_fits:${m.context ?? "none"}`);
  ok(estimatedLines(m.editorial.paragraph1, 32, 920) <= 3, `${name}:paragraph1_3_lines`);
  ok(!/[☀☁⛅🌤🌥🌦🌧⛈🌩🌫💨❄]/u.test(m.editorial.paragraph1), `${name}:no_emoji_in_page2_summary`);
  ok(!m.editorial.paragraph1.includes("°C") && !m.editorial.paragraph1.includes(" mm"), `${name}:no_technical_repetition_page2`);
  ok(!m.editorial.paragraph2 || estimatedLines(m.editorial.paragraph2, 24, 920) <= 3, `${name}:paragraph2_3_lines`);
  ok(estimatedLines(m.confidence.detail, 16, 900) <= 2, `${name}:confidence_2_lines`);
  ok(m.timeline.filter((p: any) => p.importance === "KEY").length <= 1, `${name}:single_key_point`);
  ok(html.includes("V3 PREVIEW · NON PUBLIÉ"), `${name}:isolated_preview`);
}

console.log(`instagramCarouselV3Scenarios: ${scenarios.length} scenarios, ${checks} visual-layout checks passed`);
