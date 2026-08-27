import { CITIES } from "../src/config/cities";
import { buildConsensus } from "../src/engine/consensus";
import { buildCandidateProduct } from "../src/engine/verdict";
import { renderInstagramOfficial24 } from "../src/ui/instagramOfficial24";
import { renderInstagramCarouselV3Preview } from "../src/ui/instagramCarouselV3Preview";
import { enhanceInstagramWithV3ParallelStudio } from "../src/ui/instagramV3ParallelStudio";
import type { HourPoint, ModelForecast, WeatherFamily } from "../src/types";

const date="2026-08-27";
const specs:Array<[string,WeatherFamily,number]>=[["arome","meteofrance",.30],["ecmwf_ifs","ecmwf_physics",.25],["ecmwf_aifs","ecmwf_ai",.15],["icon_eu","dwd",.17],["gfs","noaa",.13]];
function forecast(id:string,family:WeatherFamily,weight:number):ModelForecast{const hourly:HourPoint[]=[];for(let h=0;h<24;h++){const wet=h>=16&&h<=20,cloud=h<13?20:h<16?70:92,temp=17+Math.min(h,16)*.45-(wet?1:0);hourly.push({time:`${date}T${String(h).padStart(2,"0")}:00`,temperatureC:temp,apparentTemperatureC:temp,precipitationMm:wet?.8:0,rainMm:wet?.8:0,cloudCoverPct:cloud,cloudCoverLowPct:cloud,cloudCoverMidPct:cloud,cloudCoverHighPct:cloud,windSpeedKmh:16,windGustKmh:28,weatherCode:wet?61:cloud>=85?3:cloud>=50?2:1});}return{modelId:id,family,weight,fetchedAt:new Date().toISOString(),latitude:43.54,longitude:-1.46,hourly};}
const forecasts=specs.map(([a,b,c])=>forecast(a,b,c));
const payload=buildCandidateProduct(CITIES.tarnos,date,buildConsensus(forecasts),forecasts,{},"TEST_7E");
let checks=0;const ok=(value:boolean,label:string)=>{if(!value)throw new Error(`FAIL:${label}`);checks++;};
const official=renderInstagramOfficial24(payload,CITIES.tarnos);
const enhanced=enhanceInstagramWithV3ParallelStudio(official);
ok(enhanced.includes('id="v3ParallelStudio"'),'parallel_section');
ok(enhanced.includes('/instagram-v3-preview?embed=1'),'embedded_iframe');
ok(enhanced.includes('Publication V2 actuelle ↔ Carrousel V3'),'comparison_title');
ok(enhanced.includes('PUBLICATION'),'v2_reference_still_present');
ok(enhanced.includes('<!--LOKA_EDITORIAL_STUDIO_MOUNT-->'),'editorial_marker_preserved');
const embedded=renderInstagramCarouselV3Preview(payload,CITIES.tarnos,{embedded:true});
ok(embedded.includes('V3 PARALLÈLE · NON OFFICIEL'),'embedded_badge');
ok(embedded.includes('id="exportPage1"'),'page1_export');
ok(embedded.includes('id="exportPage2"'),'page2_export');
ok(embedded.includes('id="exportBoth"'),'both_export');
ok(!embedded.includes('Studio V2 actuel'),'embedded_no_duplicate_toolbar');
console.log(`instagramV3ParallelStudio: ${checks} checks passed`);
