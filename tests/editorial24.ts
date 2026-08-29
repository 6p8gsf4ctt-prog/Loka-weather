import { CITIES } from "../src/config/cities";
import { buildEditorialProductV2 } from "../src/engine/editorial24/index";
import { scene24ById } from "../src/engine/scenes24/registry";
import type { Scene24Confidence, Scene24Id } from "../src/types";
import { classify } from "./scenes24/fixtures";

let passed=0;
function ok(v:boolean,label:string){if(!v)throw new Error(`EDITORIAL_FAIL:${label}`);passed++;}
const confidences:Scene24Confidence[]=["HIGH","MEDIUM","LOW"];
const temps:Array<[number,number]>=[[8,14],[16,23],[21,31]];
let products=0;
for(let id=1;id<=24;id++){
  const base=classify(id as Scene24Id);
  for(const confidence of confidences){
    for(const [min,max] of temps){
      const decision={...base.decision,confidence};
      const product=buildEditorialProductV2(CITIES.tarnos,base.profile,decision,min,max);
      const def=scene24ById(id as Scene24Id);
      ok(product.scene.title===def.label,`title_${id}_${confidence}_${max}`);
      ok(product.scene.emoji===def.emoji,`emoji_${id}_${confidence}_${max}`);
      ok(product.scene.visualIcon===def.visualIcon,`icon_${id}_${confidence}_${max}`);
      ok(product.visual.subtitle==="",`subtitle_legacy_empty_${id}_${confidence}_${max}`);
      ok(product.visual.primaryLine.trim().length>0&&product.visual.secondaryLine.trim().length>0,`visual_complete_${id}_${confidence}_${max}`);
      ok(product.visual.primaryLine!==product.visual.secondaryLine,`distinct_${id}_${confidence}_${max}`);
      ok(product.visual.primaryLine.length<=80&&product.visual.secondaryLine.length<=120,`visual_length_${id}_${confidence}_${max}`);
      ok(product.social.caption.startsWith(def.emoji+" "),`caption_emoji_${id}_${confidence}_${max}`);
      ok(product.social.caption.includes("Ici, aujourd’hui.")&&product.social.caption.includes("@loka.tarnos"),`signature_${id}_${confidence}_${max}`);
      ok(product.social.hashtags.includes("#LOKA"),`hashtags_${id}_${confidence}_${max}`);
      ok(!product.social.caption.includes("fenêtre utile")&&!product.social.caption.includes("heures humides"),`public_language_${id}_${confidence}_${max}`);
      ok(product.engagement.question.length>0&&product.engagement.question.length<=140,`engagement_question_${id}_${confidence}_${max}`);
      ok(product.engagement.format==="QUESTION"&&product.engagement.options===null,`engagement_question_only_${id}_${confidence}_${max}`);
      products++;
    }
  }
}
ok(products===216,`product_count_${products}`);
const p15=buildEditorialProductV2(CITIES.tarnos,classify(15).profile,classify(15).decision,21,26);
ok(p15.scene.title==="AMÉLIORATION LUMINEUSE",'scene15_title');
ok(p15.visual.subtitle==="",'scene15_subtitle_retired');
ok(p15.visual.primaryLine.toLowerCase().includes('éclaircies'),'scene15_trajectory');
const p10=buildEditorialProductV2(CITIES.tarnos,classify(10).profile,classify(10).decision,15,20);
ok(p10.visual.secondaryLine.includes('km/h'),'scene10_wind_detail');
const p21=buildEditorialProductV2(CITIES.tarnos,classify(21).profile,classify(21).decision,21,26);
ok(p21.visual.secondaryLine.toLowerCase().includes('temps sec'),'scene21_dry_context');
const p22=buildEditorialProductV2(CITIES.tarnos,classify(22).profile,classify(22).decision,15,20);
ok(p22.visual.primaryLine.startsWith('Risque orageux'),'scene22_thunder_detail');
const p24=buildEditorialProductV2(CITIES.tarnos,classify(24).profile,classify(24).decision,15,20);
ok(p24.visual.primaryLine.toLowerCase().includes('pluie')&&p24.visual.primaryLine.toLowerCase().includes('vent'),'scene24_combo');
ok(p24.visual.secondaryLine.includes('mm'),'scene24_rain_detail');
console.log(`EDITORIAL_ENGINE_V2 ${products}/216 PASS (${passed} invariants)`);
