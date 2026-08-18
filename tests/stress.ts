import { CITIES } from "../src/config/cities";
import { buildDayProfileV2 } from "../src/engine/scenes24/profile";
import { chooseScene24V2 } from "../src/engine/scenes24/classifier";
import type { Scene24Id } from "../src/types";
import { canonicalPoints } from "./scenes24/fixtures";

let total=0,invalid=0;const reached=new Set<number>();
for(let id=1;id<=24;id++){
 for(let k=0;k<50;k++){
  const points=canonicalPoints(id as Scene24Id);
  points.forEach((p,i)=>{
    const n=((i*17+k*13+id*7)%9)-4;
    p.cloudCoverPct=Math.max(0,Math.min(100,p.cloudCoverPct+n));
    p.windGustKmh=Math.max(0,p.windGustKmh+(((i+k)%5)-2));
    if(p.precipitationMm>0.2)p.precipitationMm=Math.max(.21,p.precipitationMm+(((i+k)%3)-1)*.05);
  });
  const profile=buildDayProfileV2(CITIES.tarnos,'2026-08-18',points);const d=chooseScene24V2(profile);total++;if(d.validity==='INVALID')invalid++;reached.add(d.sceneId);
 }
}
if(total!==1200||invalid!==0||reached.size!==24)throw new Error(`STRESS_FAIL total=${total} invalid=${invalid} reached=${reached.size}`);
console.log(`SCENE_STRESS ${total}/1200 PASS invalid=0 reached=24`);
