import type { LokaForecast, Scene24Confidence, Scene24Family, Scene24Id, Scene24Key } from "../types";
import { getScene24ById } from "./scenes24/registry";
import { buildV24NativeEditorial } from "./editorial24";

export interface V24PublicPayloadPreview {
  version: "11.2.0";
  mode: "V24_PREVIEW";
  publishable: false;
  city: string;
  citySlug: string;
  date: string;
  generatedAt: string;
  scene: {
    engine: "V24";
    id: Scene24Id;
    key: Scene24Key;
    label: string;
    family: Scene24Family;
    masterFileName: string;
    masterUrl: string;
    score: number;
    confidence: Scene24Confidence;
  };
  editorial: {
    source: "v24_native_v1";
    subtitle: string | null;
    summaryLines: string[];
    mainVerdict: string;
    rainVerdict: string;
    notableEvent: string | null;
  };
  temperatures: { minC: number; maxC: number };
  hourly: LokaForecast["hourly"];
  legacyCompatibility: {
    forecastScene: LokaForecast["scene"];
    productionRemainsLegacy: true;
  };
  diagnostics: {
    scene24RawId: number | null;
    reliabilityApplied: boolean | null;
    reliabilityReason: string | null;
    runnerUp: { sceneId: number; score: number } | null;
  };
}

type Obj = Record<string, unknown>;
function asObj(v:unknown):Obj|null { return v && typeof v==="object" && !Array.isArray(v) ? v as Obj : null; }
function asNum(v:unknown):number|null { return typeof v==="number" && Number.isFinite(v) ? v : null; }
function asStr(v:unknown):string|null { return typeof v==="string" ? v : null; }
function isId(v:number):v is Scene24Id { return Number.isInteger(v) && v>=1 && v<=24; }

export function buildV24PublicPayloadPreview(forecast:LokaForecast):V24PublicPayloadPreview {
  const d=forecast.diagnostics??{};
  const s=asObj(d.scene24);
  if(!s) throw new Error("v24_preview_unavailable_no_scene24");

  const id=asNum(s.sceneId);
  if(id===null || !isId(id)) throw new Error("v24_preview_invalid_scene_id");

  const def=getScene24ById(id);
  const score=asNum(s.score);
  const confidence=asStr(s.confidence);

  if(score===null) throw new Error("v24_preview_invalid_score");
  if(confidence!=="HIGH" && confidence!=="MEDIUM" && confidence!=="LOW") {
    throw new Error("v24_preview_invalid_confidence");
  }

  const raw=asObj(d.scene24Raw);
  const rel=asObj(d.scene24Reliability);
  const runner=asObj(s.runnerUp);
  const runnerId=runner?asNum(runner.sceneId):null;
  const runnerScore=runner?asNum(runner.score):null;

  const profile=d.dayProfile24 as import("../types").DayProfile | undefined;
  if(!profile || typeof profile!=="object") throw new Error("v24_preview_unavailable_no_day_profile");
  const editorial=buildV24NativeEditorial({sceneId:id,profile,forecast});

  return {
    version:"11.2.0",
    mode:"V24_PREVIEW",
    publishable:false,
    city:forecast.city,
    citySlug:forecast.citySlug,
    date:forecast.date,
    generatedAt:forecast.generatedAt,
    scene:{
      engine:"V24",
      id:def.id,
      key:def.key,
      label:def.label,
      family:def.family,
      masterFileName:def.masterFileName,
      masterUrl:"/masters24/"+def.masterFileName,
      score,
      confidence
    },
    editorial:{
      source:"v24_native_v1",
      subtitle:editorial.subtitle,
      summaryLines:editorial.summaryLines,
      mainVerdict:editorial.mainVerdict,
      rainVerdict:editorial.rainVerdict,
      notableEvent:editorial.notableEvent
    },
    temperatures:{minC:forecast.tempMinC,maxC:forecast.tempMaxC},
    hourly:forecast.hourly,
    legacyCompatibility:{forecastScene:forecast.scene,productionRemainsLegacy:true},
    diagnostics:{
      scene24RawId:raw?asNum(raw.sceneId):null,
      reliabilityApplied:rel && typeof rel.applied==="boolean" ? rel.applied : null,
      reliabilityReason:rel?asStr(rel.reason):null,
      runnerUp:runnerId!==null && runnerScore!==null ? {sceneId:runnerId,score:runnerScore} : null
    }
  };
}
