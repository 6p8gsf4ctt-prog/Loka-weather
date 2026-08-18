import { CITIES } from "../src/config/cities";
import { buildPublicationManifest, verifyPublicationManifest } from "../src/engine/publicationManifest";
import { evaluatePublicationGuard } from "../src/engine/publicationGuard";
import { resolvePublicSurfaceSafely } from "../src/engine/publicFailSafe";
import { buildCandidateProduct } from "../src/engine/verdict";
import type { ModelForecast, OfficialPublicPayloadV24 } from "../src/types";
import { canonicalPoints } from "./scenes24/fixtures";

let passed=0;function ok(v:boolean,l:string){if(!v)throw new Error(`PUBLICATION_FAIL:${l}`);passed++;}
function payloadFor(scene:number):OfficialPublicPayloadV24{
 const pts=canonicalPoints(scene as never);const map=new Map(pts.map(p=>[p.time,p]));
 const forecasts:ModelForecast[]=Array.from({length:5},(_,i)=>({modelId:'m'+i,family:'noaa',weight:.2,fetchedAt:'x',latitude:0,longitude:0,hourly:[]}));
 return buildCandidateProduct(CITIES.tarnos,'2026-08-18',map,forecasts,{},'test');
}
(async()=>{
 const p=payloadFor(15);ok(evaluatePublicationGuard(p).status==='PASS','normal_pass');
 const low={...p,decision:{...p.decision,confidence:'LOW' as const}};ok(evaluatePublicationGuard(low).status==='PASS','low_publishable');
 const three={...p,models:{...p.models,count:3,ok:p.models.ok.slice(0,3)}};ok(evaluatePublicationGuard(three).status==='PASS','three_models');
 const two={...p,models:{...p.models,count:2,ok:p.models.ok.slice(0,2)}};ok(evaluatePublicationGuard(two).status==='BLOCKED','two_models_blocked');
 const missingMaster={...p,scene:{...p.scene,masterUrl:'/masters24/missing.png'}};ok(evaluatePublicationGuard(missingMaster,false).status==='PASS','master_not_weather_blocker');
 const storm=payloadFor(22);const impossible={...storm,decision:{...storm.decision,profileSummary:{...storm.decision.profileSummary,thunderHours:0}}};ok(evaluatePublicationGuard(impossible).status==='BLOCKED','thunder_invariant');
 const manifest=await buildPublicationManifest(p);ok(await verifyPublicationManifest(p,manifest),'manifest_verify');
 const tampered={...p,temperatures:{...p.temperatures,maxC:p.temperatures.maxC+1}};ok(!(await verifyPublicationManifest(tampered,manifest)),'manifest_tamper');
 const safe=await resolvePublicSurfaceSafely(p,manifest);ok(safe.engine==='V24','safe_v24');
 const unavailable=await resolvePublicSurfaceSafely(null,null);ok(unavailable.engine==='UNAVAILABLE','safe_unavailable');
 console.log(`PUBLICATION_V24 ${passed}/10 PASS`);
})().catch(e=>{throw e});
