import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { buildCandidateProduct } from "../src/engine/verdict";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { enhanceInstagramWithV3MediaAccess } from "../src/ui/instagramV3MediaAccess";
import { enhanceInstagramWithV3OfficialStudio } from "../src/ui/instagramV3ParallelStudio";
import type { HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date="2026-08-27";
const specs:Array<[string,WeatherFamily,number]>=[["arome","meteofrance",.30],["ecmwf_ifs","ecmwf_physics",.25],["ecmwf_aifs","ecmwf_ai",.15],["icon_eu","dwd",.17],["gfs","noaa",.13]];
function forecast(id:string,family:WeatherFamily,weight:number):ModelForecast{const hourly:HourPoint[]=[];for(let h=0;h<24;h++){hourly.push({time:`${date}T${String(h).padStart(2,"0")}:00`,temperatureC:18,apparentTemperatureC:18,precipitationMm:0,rainMm:0,cloudCoverPct:20,cloudCoverLowPct:20,cloudCoverMidPct:20,cloudCoverHighPct:20,windSpeedKmh:12,windGustKmh:20,weatherCode:1});}return{modelId:id,family,weight,fetchedAt:new Date().toISOString(),latitude:43.54,longitude:-1.46,hourly};}
const forecasts=specs.map(([a,b,c])=>forecast(a,b,c));
const payload=buildCandidateProduct(CITIES.tarnos,date,buildConsensus(forecasts),forecasts,{},"TEST_7L2");
let checks=0;const ok=(v:boolean,l:string)=>{if(!v)throw new Error(`FAIL:${l}`);checks++;};
const base=renderInstagramOfficial24(payload,CITIES.tarnos);
const standalone=enhanceInstagramWithV3MediaAccess(base);
ok(standalone.includes('id="v3MediaAccessStandalone"'),'standalone_visible_without_v3_analysis_mount');
ok(standalone.includes('Voir PNG Page 1'),'page1');
ok(standalone.includes('Voir PNG Page 2'),'page2');
ok(standalone.includes('Générer / actualiser les PNG'),'generate');
ok(standalone.includes('/api/admin/instagram/v3-shadow/run?city='),'run_endpoint');
ok(standalone.indexOf('id="v3MediaAccessStandalone"') < standalone.indexOf('STORY / REEL'),'panel_before_story');
const official=enhanceInstagramWithV3OfficialStudio(base);
const deduped=enhanceInstagramWithV3MediaAccess(official);
ok((deduped.match(/id="v3AutoMedia"/g)||[]).length===1,'official_existing_panel_preserved_once');
ok(!deduped.includes('id="v3MediaAccessStandalone"'),'no_duplicate_panel');
console.log(`instagramV3MediaAccess: ${checks} checks passed`);
