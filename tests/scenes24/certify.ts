import type { Scene24Candidate, Scene24Id } from "../../src/types";
import { applyLocalHysteresis } from "../../src/engine/scenes24/hysteresis";
import { buildDayProfileV2 } from "../../src/engine/scenes24/profile";
import { chooseScene24V2 } from "../../src/engine/scenes24/classifier";
import { instabilityEvidence, isStructuringInstability } from "../../src/engine/scenes24/instabilityDoctrine";
import { isStructuringShowers, isSustainedRain } from "../../src/engine/scenes24/rainDoctrine";
import { CITIES } from "../../src/config/cities";
import { canonicalPoints, classify, makeDay } from "./fixtures";

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
  {base:16,expected:12,mutate:p=>p.forEach(x=>{const h=Number(x.time.slice(11,13));if(h>=8&&h<=17){x.precipitationMm=.8;x.precipitationSupport=.8;x.rainCodeSupport=.8;}})},
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

// 14 rain-doctrine non-regression cases.
const rainCase = (points: ReturnType<typeof makeDay>, previous?: Scene24Id) => {
  const profile = buildDayProfileV2(CITIES.tarnos, "2026-08-18", points);
  return { profile, decision: chooseScene24V2(profile, previous) };
};
const weakRainDay = () => makeDay("2026-08-18", (h) => ({
  cloud: 82,
  rain: [8, 9, 10].includes(h) ? 0.27 : 0,
  precipSupport: [8, 9, 10].includes(h) ? 0.82 : 0.05,
  shower: 0.05
}));
{
  const { profile, decision } = rainCase(weakRainDay());
  ok(profile.rain.rainHours===3 && Math.abs(profile.rain.rainTotalMm-.81)<.01 && decision.sceneId===9 && decision.decisionFamily==="CLOUD" && !decision.candidateSceneIds.includes(12), "rain_R01_aug25_secondary_cloud");
}
{
  const wet=[9,10]; const { decision }=rainCase(makeDay("2026-08-18",h=>({cloud:25,rain:wet.includes(h)?.25:0,precipSupport:wet.includes(h)?.8:.05,shower:.05})));
  ok(decision.decisionFamily==="LIGHT" && !decision.candidateSceneIds.includes(12) && !decision.candidateSceneIds.includes(13), "rain_R02_two_regular_hours_keep_sky");
}
{
  const wet=[9,10,11,12]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:82,rain:wet.includes(h)?.4:0,precipSupport:wet.includes(h)?.8:.05,shower:.05})));
  ok(profile.rain.rainBlockMaxHours===4 && !isSustainedRain(profile) && decision.sceneId!==12, "rain_R03_four_continuous_hours_not_sustained");
}
{
  const wet=[8,10,12,14,16]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:82,rain:wet.includes(h)?.35:0,precipSupport:wet.includes(h)?.8:.05,shower:.05})));
  ok(profile.rain.rainHours===5 && profile.rain.continuityRatio<.58 && !isSustainedRain(profile) && decision.sceneId!==12, "rain_R04_five_hours_low_continuity_not_sustained");
}
{
  const wet=[7,8,9,11,12,13,15,16,17,20]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:82,rain:wet.includes(h)?.3:0,precipSupport:wet.includes(h)?.8:.05,shower:.05})));
  ok(profile.rain.rainHours===10 && profile.rain.continuityRatio>=.58 && profile.rain.rainBlockMaxHours<4 && !isSustainedRain(profile) && decision.sceneId!==12, "rain_R05_no_four_hour_block_not_sustained");
}
{
  const wet=[8,9,10,11,12,13,14,15,16,17]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:88,rain:wet.includes(h)?.6:0,precipSupport:wet.includes(h)?.85:.05,shower:.05})));
  ok(isSustainedRain(profile) && decision.sceneId===12 && decision.candidateSceneIds.includes(12), "rain_R06_sustained_threshold_allows_scene12");
}
{
  const { profile, decision }=classify(12);
  ok(isSustainedRain(profile) && decision.sceneId===12 && decision.validity==="VALID", "rain_R07_canonical12_preserved");
}
{
  const wet=[9,12]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:60,rain:wet.includes(h)?.7:0,precipSupport:wet.includes(h)?.8:.05,shower:wet.includes(h)?.8:.05})));
  ok(isStructuringShowers(profile) && decision.sceneId===13 && decision.decisionFamily==="RAIN", "rain_R08_separated_showers_allow_scene13");
}
{
  const wet=[9,10]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:60,rain:wet.includes(h)?.7:0,precipSupport:wet.includes(h)?.8:.05,shower:wet.includes(h)?.8:.05})));
  ok(profile.rain.rainBreakCount===0 && !isStructuringShowers(profile) && decision.sceneId!==13 && !decision.candidateSceneIds.includes(13), "rain_R09_consecutive_showers_not_structuring");
}
{
  const wet=[8,11,14,17]; const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:72,rain:wet.includes(h)?.45:0,precipSupport:wet.includes(h)?.8:.05,shower:wet.includes(h)?.3:.05})));
  ok(profile.rain.showerHours===0 && !isStructuringShowers(profile) && decision.sceneId!==13, "rain_R10_low_shower_support_not_scene13");
}
{
  const { profile, decision }=classify(13);
  ok(isStructuringShowers(profile) && decision.sceneId===13 && decision.validity==="VALID", "rain_R11_canonical13_preserved");
}
{
  const { decision }=rainCase(weakRainDay(),12);
  ok(decision.sceneId!==12 && !decision.candidateSceneIds.includes(12) && decision.hysteresisApplied===false, "rain_R12_old_scene12_cannot_survive_secondary_rain");
}
{
  const { profile, decision }=classify(12);
  const invariant=decision.invariantChecks.find(x=>x.name==="sustained_rain_scene_meets_doctrine");
  ok(decision.sceneId===12 && isSustainedRain(profile) && invariant?.pass===true, "rain_R13_scene12_invariant");
}
{
  const { profile, decision }=classify(13);
  const invariant=decision.invariantChecks.find(x=>x.name==="showers_scene_meets_doctrine");
  ok(decision.sceneId===13 && isStructuringShowers(profile) && invariant?.pass===true, "rain_R14_scene13_invariant");
}

// Property checks: forbidden territories must never emit scenes 12 or 13.
{
  let pass=true;
  for(let n=0;n<=10;n++){
    const wet=Array.from({length:n},(_,i)=>8+i);
    const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:82,rain:wet.includes(h)?.35:0,precipSupport:wet.includes(h)?.8:.05,shower:.05})));
    if(!isSustainedRain(profile) && decision.sceneId===12) pass=false;
  }
  ok(pass,"rain_property_scene12_requires_sustained_doctrine");
}
{
  const patterns=[[9,10],[9,12],[8,11,14],[8,9,13]];
  let pass=true;
  for(const wet of patterns){
    for(const shower of [.05,.3,.8]){
      const { profile, decision }=rainCase(makeDay("2026-08-18",h=>({cloud:62,rain:wet.includes(h)?.55:0,precipSupport:wet.includes(h)?.8:.05,shower:wet.includes(h)?shower:.05})));
      if(!isStructuringShowers(profile) && decision.sceneId===13) pass=false;
    }
  }
  ok(pass,"rain_property_scene13_requires_structuring_showers");
}


// 9 instability-doctrine non-regression cases.
const instabilityCase = (points: ReturnType<typeof makeDay>, previous?: Scene24Id) => {
  const profile = buildDayProfileV2(CITIES.tarnos, "2026-08-18", points);
  return { profile, decision: chooseScene24V2(profile, previous) };
};
const aug25InstabilityTrap = () => {
  const clouds = [84,72,90,78,88,74,93,78,86,69,82,70,88,72,84];
  return makeDay("2026-08-18", h => ({
    cloud: h >= 7 && h <= 21 ? clouds[h - 7] : 80,
    rain: h >= 8 && h <= 12 ? .2 : 0,
    precipSupport: h >= 8 && h <= 12 ? .8 : .05,
    shower: .05,
    fog: .03,
    gust: 30
  }));
};
{
  const { profile, decision } = instabilityCase(aug25InstabilityTrap());
  ok(profile.structure.distinctStateCount===4 && profile.evolution.reversals>=3 && !isStructuringInstability(profile) && decision.sceneId===9 && decision.decisionFamily==="CLOUD" && !decision.candidateSceneIds.includes(19) && decision.profileSummary.instabilityEligible===false, "instability_I01_aug25_cloud_not_instable");
}
{
  const { profile, decision } = classify(19);
  ok(isStructuringInstability(profile) && decision.sceneId===19 && decision.decisionFamily==="INSTABILITY" && decision.validity==="VALID", "instability_I02_canonical19_preserved");
}
{
  const { profile, decision } = instabilityCase(aug25InstabilityTrap());
  const e=instabilityEvidence(profile);
  ok(profile.structure.meaningfulTransitions>=5 && profile.evolution.reversals>=3 && e.independentEvidenceCount===0 && decision.sceneId!==19, "instability_I03_numeric_oscillation_alone_insufficient");
}
{
  const points=aug25InstabilityTrap();
  points.forEach(p=>{ if(p.time.includes("13:00")){p.precipitationMm=.1;p.precipitationSupport=.4;} });
  const { profile, decision }=instabilityCase(points);
  ok(profile.structure.uncertainWeather===true && instabilityEvidence(profile).independentEvidenceCount===0 && !isStructuringInstability(profile) && decision.sceneId!==19, "instability_I04_model_uncertainty_not_physical_evidence");
}
{
  const points=canonicalPoints(19);
  points.forEach(p=>{p.precipitationMm=0;p.precipitationSupport=.05;p.rainCodeSupport=.05;p.showerSupport=.05;p.fogSupport=.03;p.windGustKmh=30;p.windSpeedKmh=15;});
  const profile=buildDayProfileV2(CITIES.tarnos,"2026-08-18",points); const decision=chooseScene24V2(profile); const e=instabilityEvidence(profile);
  ok(e.skyRegimeContrast===true && e.independentEvidenceCount===1 && !isStructuringInstability(profile) && decision.sceneId!==19, "instability_I05_sky_contrast_alone_insufficient");
}
{
  const points=canonicalPoints(19);
  points.forEach(p=>{p.fogSupport=.03;p.windGustKmh=30;p.windSpeedKmh=15;});
  const profile=buildDayProfileV2(CITIES.tarnos,"2026-08-18",points); const decision=chooseScene24V2(profile); const e=instabilityEvidence(profile);
  ok(e.skyRegimeContrast===true && e.repeatedShowers===true && e.independentEvidenceCount===2 && isStructuringInstability(profile) && decision.sceneId===19, "instability_I06_two_independent_signals_allow_scene19");
}
{
  const { profile, decision }=classify(19);
  const invariant=decision.invariantChecks.find(x=>x.name==="instability_scene_meets_doctrine");
  ok(decision.sceneId===19 && isStructuringInstability(profile) && invariant?.pass===true, "instability_I07_scene19_invariant");
}
{
  const { decision }=instabilityCase(aug25InstabilityTrap(),19);
  ok(decision.sceneId!==19 && !decision.candidateSceneIds.includes(19) && decision.hysteresisApplied===false, "instability_I08_old_scene19_cannot_survive_stable_cloud_day");
}
{
  let pass=true;
  const patterns = [aug25InstabilityTrap(), makeDay("2026-08-18",h=>({cloud:[35,82,38,85][h%4],gust:30})), makeDay("2026-08-18",h=>({cloud:[55,92,58,88][h%4],rain:[9,12].includes(h)?.6:0,precipSupport:[9,12].includes(h)?.8:.05,shower:.05}))];
  for(const points of patterns){
    const { profile, decision }=instabilityCase(points);
    if(!isStructuringInstability(profile) && decision.sceneId===19) pass=false;
  }
  ok(pass,"instability_I09_property_scene19_requires_doctrine");
}

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

if(passed!==202) throw new Error(`certification_count_mismatch:${passed}`);
console.log(`SCENE_ENGINE_V2_CERTIFICATION ${passed}/202 PASS`);
