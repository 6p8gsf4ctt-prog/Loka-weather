import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { buildCandidateProduct } from "../src/engine/verdict";
import { renderInstagramCarouselV3Preview } from "../src/ui/instagramCarouselV3Preview";
import type { HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date = "2026-08-18";
const specs: Array<[string, WeatherFamily, number, number]> = [
  ["arome", "meteofrance", 0.30, 15], ["ecmwf_ifs", "ecmwf_physics", 0.25, 16],
  ["ecmwf_aifs", "ecmwf_ai", 0.15, 16], ["icon_eu", "dwd", 0.17, 17], ["gfs", "noaa", 0.13, 17]
];
function model(id: string, family: WeatherFamily, weight: number, rainStart: number): ModelForecast {
  const hourly: HourPoint[] = [];
  for (let h = 0; h <= 23; h++) {
    const wet = h >= rainStart && h <= 20, cloud = h < 13 ? 22 : h < rainStart ? 72 : 92, temp = 17 + Math.min(h, 15) * .45 - (wet ? 1.5 : 0);
    hourly.push({ time:`${date}T${String(h).padStart(2,"0")}:00`, temperatureC:temp, apparentTemperatureC:temp, precipitationMm:wet?.8:0, rainMm:wet?.8:0, cloudCoverPct:cloud, cloudCoverLowPct:cloud, cloudCoverMidPct:Math.max(0,cloud-10), cloudCoverHighPct:cloud, windSpeedKmh:18, windGustKmh:30, weatherCode:wet?61:cloud>=85?3:cloud>=50?2:1 });
  }
  return { modelId:id, family, weight, fetchedAt:new Date().toISOString(), latitude:43.54, longitude:-1.46, hourly };
}
const forecasts=specs.map(([id,f,w,r])=>model(id,f,w,r));
const payload=buildCandidateProduct(CITIES.tarnos,date,buildConsensus(forecasts),forecasts,{},"TEST_V3_PREVIEW");
const html=renderInstagramCarouselV3Preview(payload,CITIES.tarnos);
let passed=0;function ok(v:boolean,label:string){if(!v)throw new Error(`FAIL:${label}`);passed++;}
ok(html.includes('V3 PREVIEW · NON PUBLIÉ'),'preview_badge');
ok(html.includes('id="page1" width="1080" height="1350"'),'page1_4_5');
ok(html.includes('id="page2" width="1080" height="1350"'),'page2_4_5');
ok(html.includes('PAGE 1 · MÉTÉO UTILE'),'page1_title');
ok(html.includes('PAGE 2 · COMPRENDRE LA JOURNÉE'),'page2_title');
ok(html.includes('analysis V3'),'analysis_source_note');
ok(!html.includes('const wanted=[4,6,8,10,12,14,16,18,20,22]'),'no_fixed_timeline');
ok(html.includes('Studio V2 actuel'),'v2_return_link');
const marker='const m='; const start=html.indexOf(marker), end=html.indexOf(';const p1=',start);
const previewModel=JSON.parse(html.slice(start+marker.length,end));
ok(!/[☀☁⛅🌤🌥🌦🌧⛈🌩🌫💨❄]/u.test(previewModel.editorial.paragraph1),'page2_summary_no_emoji');
ok(!previewModel.editorial.paragraph1.includes('°C') && !previewModel.editorial.paragraph1.includes(' mm'),'page2_summary_no_technical_repeat');
ok(previewModel.editorial.paragraph2==='','page2_no_legacy_secondary_paragraph');
console.log(`instagramCarouselV3Preview: ${passed} checks passed`);
