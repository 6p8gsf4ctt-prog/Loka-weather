import type { Scene24Candidate, Scene24Id } from "../../src/types";
import { applyLocalHysteresis } from "../../src/engine/scenes24/hysteresis";
import { buildDayProfileV2 } from "../../src/engine/scenes24/profile";
import { chooseScene24V2 } from "../../src/engine/scenes24/classifier";
import { CITIES } from "../../src/config/cities";
import { canonicalPoints, classify } from "./fixtures";

let passed = 0;
function ok(condition: boolean, label: string): void { if (!condition) throw new Error(`FAIL:${label}`); passed++; }
function scene(id: Scene24Id, expected: Scene24Id, label: string): void { const d=classify(id).decision; ok(d.sceneId===expected, `${label}:got_${d.sceneId}_expected_${expected}`); }

// 24 canonical territories.
for (let id=1; id<=24; id++) scene(id as Scene24Id, id as Scene24Id, `canonical_${id}`);

// 48 robust variants: small deterministic cloud / temperature perturbations.
for (let id=1; id<=24; id++) {
  for (const delta of [-4,4]) {
    const points=canonicalPoints(id as Scene24Id);
    points.forEach((p,i)=>{ if(i%3===0) p.cloudCoverPct=Math.max(0,Math.min(100,p.cloudCoverPct+delta)); p.temperatureC+=delta>0?.3:-.3; });
    const profile=buildDayProfileV2(CITIES.tarnos,"2026-08-18",points); const d=chooseScene24V2(profile);
    ok(d.sceneId===id, `variant_${id}_${delta}:got_${d.sceneId}`);
  }
}

// 24 anti-cases: a canonical territory of another scene must not be falsely retained.
for (let id=1; id<=24; id++) {
  const other=((id+6-1)%24+1) as Scene24Id;
  const d=classify(other).decision;
  ok(d.sceneId!==id, `anti_${id}_using_${other}`);
}

// 30 boundary checks limited to authorized neighboring territories.
const pairs: Array<[Scene24Id,Scene24Id]>=[[1,16],[2,7],[3,21],[4,18],[8,17],[9,23],[11,15],[12,13],[6,14],[14,20]];
for(let i=0;i<30;i++){
  const [a,b]=pairs[i%pairs.length]; const base=i%2===0?a:b; const d=classify(base).decision;
  ok(d.sceneId===a||d.sceneId===b,`boundary_${i}_${a}_${b}:got_${d.sceneId}`);
}

// 12 structural priorities.
const priorityCases: Array<{base:Scene24Id; expected:Scene24Id; mutate:(p:ReturnType<typeof canonicalPoints>)=>void}> = [
  {base:1,expected:22,mutate:p=>p.forEach(x=>{if(x.time.includes('14:00')||x.time.includes('15:00'))x.thunderstormSupport=.8;})},
  {base:1,expected:24,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));if(h>=10&&h<=15){x.precipitationMm=.8;x.precipitationSupport=.8;x.rainCodeSupport=.8;x.windGustKmh=65;}})},
  {base:18,expected:10,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));if(h>=8&&h<=17)x.windGustKmh=82;})},
  {base:16,expected:12,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));if(h>=9&&h<=17){x.precipitationMm=.8;x.precipitationSupport=.8;x.rainCodeSupport=.8;}})},
  {base:1,expected:17,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));if(h>=7&&h<=11)x.fogSupport=.82;})},
  {base:16,expected:15,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));x.cloudCoverPct=h<=11?88:h<=15?58:18;})},
  {base:9,expected:20,mutate:p=>p.forEach(x=>{x.windGustKmh=63;})},
  {base:4,expected:14,mutate:p=>p.forEach(x=>{x.windGustKmh=63;})},
  {base:1,expected:6,mutate:p=>p.forEach(x=>{x.windGustKmh=63;})},
  {base:9,expected:23,mutate:p=>p.forEach(x=>{x.cloudCoverPct=98;})},
  {base:12,expected:24,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));if(h>=9&&h<=16)x.windGustKmh=63;})},
  {base:13,expected:22,mutate:p=>p.forEach(x=>{if(x.precipitationMm>.2)x.thunderstormSupport=.7;})}
];
for(let i=0;i<priorityCases.length;i++){const c=priorityCases[i];const points=canonicalPoints(c.base);c.mutate(points);const p=buildDayProfileV2(CITIES.tarnos,'2026-08-18',points);const d=chooseScene24V2(p);ok(d.sceneId===c.expected,`priority_${i}:got_${d.sceneId}_expected_${c.expected}`);}

// 8 uncertainty/model coverage cases.
for(const models of [5,4,3]){const d=classify(15,'2026-08-18',models).decision;ok(d.validity==='VALID'&&d.sceneId===15,`models_${models}`);}
{const d=classify(15,'2026-08-18',2).decision;ok(d.validity==='INVALID',`models_2_invalid`);}
for(const id of [3,18,21,16] as Scene24Id[]){const d=classify(id).decision;ok(['HIGH','MEDIUM','LOW'].includes(d.confidence)&&d.validity==='VALID',`uncertainty_stays_v24_${id}`);}

// 10 seasonality cases: same doctrine across summer/winter, with dynamic daylight window.
for(const id of [1,9,12,15,21] as Scene24Id[]){for(const date of ['2026-08-18','2026-12-18']){const d=classify(id,date).decision;ok(d.sceneId===id,`season_${id}_${date}:got_${d.sceneId}`);}}

// 12 perturbation cases around strong territories.
for(let i=0;i<12;i++){const id=([1,5,9,12,15,16,17,20,21,22,23,24] as Scene24Id[])[i];const points=canonicalPoints(id);points.forEach((p,j)=>{p.cloudCoverPct=Math.max(0,Math.min(100,p.cloudCoverPct+((j%5)-2)));p.windGustKmh+=((j%3)-1)*1.5;});const prof=buildDayProfileV2(CITIES.tarnos,'2026-08-18',points);const d=chooseScene24V2(prof);ok(d.sceneId===id,`perturb_${id}:got_${d.sceneId}`);}

// 8 hysteresis invariants, directly on the authorized local-neighbor mechanism.
const hc=(id:Scene24Id,score:number):Scene24Candidate=>({sceneId:id,sceneKey:classify(id).decision.sceneKey,score,confidence:'MEDIUM',reasons:[],penalties:[]});
const hCases:Array<[Scene24Id,Scene24Id,number,number,boolean]>=[[16,1,80,78,true],[7,2,77,74,true],[21,3,76,73,true],[18,4,79,76,true],[17,8,82,79,true],[23,9,81,78,true],[15,11,85,82,true],[24,1,90,88,false]];
for(let i=0;i<hCases.length;i++){const [selected,prev,s1,s2,expect]=hCases[i];const a=hc(selected,s1),b=hc(prev,s2);const r=applyLocalHysteresis(a,[a,b],prev);ok(r.applied===expect,`hysteresis_${i}`);}

// Determinism: same input 100 times -> exact same decision JSON.
{const p=classify(15).profile;const first=JSON.stringify(chooseScene24V2(p));let same=true;for(let i=0;i<100;i++)same=same&&JSON.stringify(chooseScene24V2(p))===first;ok(same,'determinism_100');}

if(passed!==177) throw new Error(`certification_count_mismatch:${passed}`);
console.log(`SCENE_ENGINE_V2_CERTIFICATION ${passed}/177 PASS`);
