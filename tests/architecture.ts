import { MODELS } from "../src/config/models";
import { SCENES24 } from "../src/engine/scenes24/registry";

let passed=0;function ok(v:boolean,l:string){if(!v)throw new Error(`ARCH_FAIL:${l}`);passed++;}
ok(MODELS.length===5,'five_models');
ok(new Set(MODELS.map(m=>m.family)).size===5,'five_families');
ok(Math.abs(MODELS.reduce((s,m)=>s+m.baseWeight,0)-1)<1e-9,'weights_sum_one');
ok(SCENES24.length===24,'scene_count');
ok(new Set(SCENES24.map(s=>s.id)).size===24,'scene_ids_unique');
ok(new Set(SCENES24.map(s=>s.key)).size===24,'scene_keys_unique');
ok(new Set(SCENES24.map(s=>s.masterFileName)).size===24,'masters_unique');
ok(SCENES24.every((s,i)=>s.id===i+1),'scene_ids_contiguous');
ok(SCENES24.every(s=>s.masterFileName.startsWith(String(s.id).padStart(2,'0')+'_')),'master_prefixes');
ok(SCENES24.every(s=>!!s.emoji&&!!s.visualIcon),'scene_presentation_identity');
console.log(`ARCHITECTURE_V2 ${passed}/10 PASS`);
