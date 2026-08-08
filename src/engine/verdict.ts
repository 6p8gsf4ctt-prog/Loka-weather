import type { CityConfig, ConsensusHour, DisplayHour, LokaForecast, ModelForecast } from "../types";
import { hourOf, modelDailyRain } from "./consensus";
import { clamp, median, weightedSupport } from "./math";
import { assertPublicLanguage, joinSentences, noRainAllDay, rainFreeAfter, rainFreeBefore, rainWindow, temperatureDrop, temperatureStory, thunderstormWindow, uncertaintyAfter, windWindow } from "./editorial";

type RainKind = "dry"|"rain"|"showers"|"thunderstorm"|"uncertain";
interface RainAnalysis { dry:boolean; uncertain:boolean; confidence:number; startHour:number|null; endHour:number|null; medianDailyRainMm:number; weightedProbGt1Mm:number; peakSupport:number; kind:RainKind; maxRate:number; }
interface ThermalAnalysis { morningTempC:number; maxTempC:number; maxHour:number; eveningTempC:number; eveningHour:number; riseC:number; eveningDropC:number; }

const pointsForDate=(c:Map<string,ConsensusHour>,d:string)=>[...c.values()].filter(p=>p.time.slice(0,10)===d);
const nearestHour=(p:ConsensusHour[],h:number)=>[...p].sort((a,b)=>Math.abs(hourOf(a.time)-h)-Math.abs(hourOf(b.time)-h))[0];
const avg=(v:number[])=>v.length?v.reduce((a,b)=>a+b,0)/v.length:0;
const cloudCondition=(p:number)=>p<20?"soleil":p<40?"peu nuageux":p<65?"variable":p<85?"nuageux":"couvert";

function displayCondition(p:ConsensusHour):string {
  if(p.thunderstormSupport>=.45)return "orage";
  if(p.precipitationSupport>=.50&&p.precipitationMm>=.2)return p.showerSupport>=.45?"averse":"pluie";
  return cloudCondition(p.cloudCoverPct);
}

function analyzeThermal(day:ConsensusHour[]):ThermalAnalysis{
  const d=day.filter(p=>hourOf(p.time)>=7&&hourOf(p.time)<=21);
  const m=nearestHour(d,7)??d[0], e=nearestHour(d,21)??d[d.length-1];
  const x=[...d].sort((a,b)=>b.temperatureC-a.temperatureC)[0];
  return {morningTempC:m.temperatureC,maxTempC:x.temperatureC,maxHour:hourOf(x.time),eveningTempC:e.temperatureC,eveningHour:hourOf(e.time),riseC:x.temperatureC-m.temperatureC,eveningDropC:x.temperatureC-e.temperatureC};
}

function analyzeRain(date:string,day:ConsensusHour[],forecasts:ModelForecast[]):RainAnalysis{
  const d=day.filter(p=>hourOf(p.time)>=7&&hourOf(p.time)<=21);
  const totals=forecasts.map(f=>[modelDailyRain(f,date),f.weight] as [number,number]);
  const med=median(totals.map(([v])=>v)), prob=weightedSupport(totals,1), peak=Math.max(0,...d.map(p=>p.precipitationSupport)), thunder=Math.max(0,...d.map(p=>p.thunderstormSupport));
  const robust=d.filter(p=>p.precipitationMm>=.2&&(p.precipitationSupport>=.60||p.rainCodeSupport>=.60));
  const confidence=Math.round(clamp(100*(.48*Math.max(prob,1-prob)+.32*Math.max(peak,1-peak)+.20*Math.max(thunder,1-thunder)),50,98));
  if(med<.2&&prob<.25&&!robust.length&&thunder<.35)return {dry:true,uncertain:false,confidence,startHour:null,endHour:null,medianDailyRainMm:med,weightedProbGt1Mm:prob,peakSupport:peak,kind:"dry",maxRate:0};

  const cand=d.filter(p=>(p.precipitationMm>=.2&&p.precipitationSupport>=.45)||p.rainCodeSupport>=.55||p.thunderstormSupport>=.40);
  if(!cand.length||(prob>=.25&&prob<.50&&peak<.55)){
    const u=d.filter(p=>p.precipitationSupport>=.25||p.rainCodeSupport>=.30||p.thunderstormSupport>=.25);
    return {dry:false,uncertain:true,confidence,startHour:u.length?hourOf(u[0].time):18,endHour:null,medianDailyRainMm:med,weightedProbGt1Mm:prob,peakSupport:peak,kind:"uncertain",maxRate:0};
  }

  const blocks:ConsensusHour[][]=[[cand[0]]];
  for(const p of cand.slice(1)){const last=blocks.at(-1)!; if(hourOf(p.time)-hourOf(last.at(-1)!.time)<=1)last.push(p);else blocks.push([p]);}
  const score=(b:ConsensusHour[])=>b.reduce((s,p)=>s+p.precipitationMm+2.5*p.precipitationSupport+4*p.thunderstormSupport,0);
  const block=blocks.sort((a,b)=>score(b)-score(a))[0];
  const start=hourOf(block[0].time), end=Math.min(22,hourOf(block.at(-1)!.time)+1);
  const maxRate=Math.max(...block.map(p=>p.precipitationMm));
  const ts=Math.max(...block.map(p=>p.thunderstormSupport)), ss=Math.max(...block.map(p=>p.showerSupport));
  const continuity=block.length/Math.max(1,end-start);
  const kind:RainKind=ts>=.45?"thunderstorm":(continuity<.75||ss>=.45)?"showers":"rain";
  return {dry:false,uncertain:false,confidence,startHour:start,endHour:end,medianDailyRainMm:med,weightedProbGt1Mm:prob,peakSupport:peak,kind,maxRate};
}

function weatherStory(city:CityConfig,day:ConsensusHour[],rain:RainAnalysis,t:ThermalAnalysis){
  const d=day.filter(p=>hourOf(p.time)>=7&&hourOf(p.time)<=21), morning=d.filter(p=>hourOf(p.time)<=11), afternoon=d.filter(p=>hourOf(p.time)>=12&&hourOf(p.time)<=18);
  const mc=avg(morning.map(p=>p.cloudCoverPct)), ac=avg(afternoon.map(p=>p.cloudCoverPct));
  let rainText:string;
  if(rain.dry) rainText=noRainAllDay();
  else if(rain.uncertain&&rain.startHour!==null) rainText=joinSentences(rainFreeBefore(rain.startHour),uncertaintyAfter(rain.startHour));
  else if(rain.startHour!==null&&rain.endHour!==null){
    const event=rain.kind==="thunderstorm"?thunderstormWindow(rain.startHour,rain.endHour):rainWindow(rain.startHour,rain.endHour,rain.maxRate>=4?"strong":"normal",rain.kind==="showers");
    rainText=joinSentences(rain.startHour>=9?rainFreeBefore(rain.startHour):null,event,rain.endHour<=20?rainFreeAfter(rain.endHour):null);
  } else rainText=noRainAllDay();

  let sky=mc<=25&&ac<=25?"Soleil toute la journée.":mc>=75&&ac<=35?"Nuages le matin. Le soleil revient dans la journée.":mc<=35&&ac>=75?"Soleil le matin. Plus de nuages dans l’après-midi.":mc<=45&&ac<=45?"Soleil avec quelques nuages.":mc>=85&&ac>=85?"Nuages toute la journée.":"Soleil et nuages dans la journée.";
  let main=joinSentences(temperatureStory(t.morningTempC,t.maxTempC,t.maxHour),sky);
  if(!rain.dry&&!rain.uncertain&&rain.startHour!==null&&rain.endHour!==null){
    if(rain.kind==="thunderstorm")main=thunderstormWindow(rain.startHour,rain.endHour);
    else if(rain.maxRate>=4)main=rainWindow(rain.startHour,rain.endHour,"strong");
  }

  const maxGust=Math.max(...d.map(p=>p.windGustKmh)); let notable:string|null=null;
  if(maxGust>=city.wind.gustNotableKmh){const w=d.filter(p=>p.windGustKmh>=city.wind.gustNotableKmh);notable=windWindow(hourOf(w[0].time),Math.min(22,hourOf(w.at(-1)!.time)+1),maxGust);}
  else if(t.eveningDropC>=city.thermal.notableDropC&&t.maxTempC>=city.thermal.afternoonHotFromC) notable=temperatureDrop(t.maxHour,t.maxTempC,t.eveningHour,t.eveningTempC);
  assertPublicLanguage(main);assertPublicLanguage(rainText);if(notable)assertPublicLanguage(notable);
  return {main,rain:rainText,notable};
}

export function buildLokaForecast(city:CityConfig,date:string,consensus:Map<string,ConsensusHour>,forecasts:ModelForecast[]):LokaForecast{
  const day=pointsForDate(consensus,date); if(!day.length)throw new Error(`No consensus data for ${date}`);
  const daytime=day.filter(p=>hourOf(p.time)>=7&&hourOf(p.time)<=21); if(!daytime.length)throw new Error(`No daytime data for ${date}`);
  const rain=analyzeRain(date,day,forecasts), thermal=analyzeThermal(day), story=weatherStory(city,day,rain,thermal);
  const maxTemp=Math.round(Math.max(...daytime.map(p=>p.temperatureC))), minTemp=Math.round(Math.min(...daytime.map(p=>p.temperatureC))), maxGust=Math.max(...daytime.map(p=>p.windGustKmh)), peakThunder=Math.max(...daytime.map(p=>p.thunderstormSupport)), spread=median(daytime.map(p=>p.temperatureSpreadC));
  const confidenceMain=Math.round(clamp(96-spread*10-Math.max(0,5-forecasts.length)*5,50,98));
  const hourly:DisplayHour[]=city.displayHours.map(hour=>{const p=nearestHour(daytime,hour)!;return {hour,temperatureC:Math.round(p.temperatureC),condition:displayCondition(p),precipitationMm:Math.round(p.precipitationMm*100)/100};});
  return {city:city.name,citySlug:city.slug,date,generatedAt:new Date().toISOString(),tempMaxC:maxTemp,tempMinC:minTemp,mainVerdict:story.main,rainVerdict:story.rain,notableEvent:story.notable,confidenceMain,confidenceRain:rain.confidence,hourly,diagnostics:{editorialVersion:"0.3.1",modelsReceived:forecasts.map(f=>f.modelId),modelCount:forecasts.length,medianDailyRainMm:Math.round(rain.medianDailyRainMm*100)/100,weightedProbGt1Mm:Math.round(rain.weightedProbGt1Mm*1000)/1000,peakPrecipitationSupport:Math.round(rain.peakSupport*1000)/1000,rainKind:rain.kind,rainUncertain:rain.uncertain,rainStartHour:rain.startHour,rainEndHour:rain.endHour,peakThunderstormSupport:Math.round(peakThunder*1000)/1000,maxGustKmh:Math.round(maxGust*10)/10,morningTemperatureC:Math.round(thermal.morningTempC*10)/10,maxTemperatureC:Math.round(thermal.maxTempC*10)/10,maxTemperatureHour:thermal.maxHour,eveningTemperatureC:Math.round(thermal.eveningTempC*10)/10,morningToMaxDeltaC:Math.round(thermal.riseC*10)/10,maxToEveningDeltaC:Math.round(thermal.eveningDropC*10)/10,medianTemperatureSpreadC:Math.round(spread*100)/100}};
}
