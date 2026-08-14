import type { DayProfile, LokaForecast, Scene24Id } from "../types";
import { assertPublicLanguage, temperatureRange } from "./editorial";

export interface V24NativeEditorial {
  version: "11.3.0";
  source: "v24_native_v1";
  subtitle: string;
  summaryLines: string[];
  mainVerdict: string;
  rainVerdict: string;
  notableEvent: string | null;
}

const COPY: Record<Scene24Id, { subtitle: string; sky: string }> = {
  1:{subtitle:"Journée très ensoleillée.",sky:"Grand soleil dominant toute la journée."},
  2:{subtitle:"Journée lumineuse sous un léger voile.",sky:"Le soleil reste bien présent derrière un voile nuageux."},
  3:{subtitle:"Journée partagée entre nuages et éclaircies.",sky:"Des éclaircies alternent avec des passages nuageux."},
  4:{subtitle:"Journée variable mais lumineuse.",sky:"Le ciel change souvent tout en gardant de belles périodes lumineuses."},
  5:{subtitle:"Le temps se dégrade progressivement.",sky:"Le ciel devient de plus en plus chargé au fil de la journée."},
  6:{subtitle:"Journée ensoleillée et venteuse.",sky:"Le soleil domine avec un vent sensible."},
  7:{subtitle:"Soleil très filtré sous un voile épais.",sky:"La lumière reste présente sous un voile nuageux dense."},
  8:{subtitle:"Brume ou brouillard par moments.",sky:"La visibilité peut être réduite sous une ambiance grise."},
  9:{subtitle:"Journée couverte.",sky:"Le ciel reste largement couvert."},
  10:{subtitle:"Journée très venteuse.",sky:"Le vent devient le phénomène dominant de la journée."},
  11:{subtitle:"Le temps s’améliore progressivement.",sky:"Les éclaircies gagnent du terrain au fil de la journée."},
  12:{subtitle:"Journée marquée par une pluie durable.",sky:"La pluie s’installe de façon régulière et prolongée."},
  13:{subtitle:"Des averses rythment la journée.",sky:"Les averses alternent avec de vraies accalmies."},
  14:{subtitle:"Éclaircies et vent se partagent la journée.",sky:"Les éclaircies restent présentes dans une atmosphère venteuse."},
  15:{subtitle:"Une nette amélioration lumineuse se dessine.",sky:"Le ciel s’éclaircit franchement au fil de la journée."},
  16:{subtitle:"Beau temps avec quelques passages nuageux.",sky:"Le soleil domine malgré quelques passages temporaires."},
  17:{subtitle:"Brouillard dense par moments.",sky:"La visibilité peut devenir fortement réduite."},
  18:{subtitle:"Journée variable.",sky:"Nuages et périodes plus claires alternent régulièrement."},
  19:{subtitle:"Journée instable et changeante.",sky:"Les conditions évoluent rapidement sans phénomène durablement dominant."},
  20:{subtitle:"Journée nuageuse et venteuse.",sky:"Le ciel reste chargé avec un vent bien présent."},
  21:{subtitle:"De grandes éclaircies s’imposent.",sky:"De larges périodes lumineuses s’ouvrent dans un ciel encore partagé."},
  22:{subtitle:"Ambiance orageuse.",sky:"L’atmosphère devient menaçante avec un potentiel orageux marqué."},
  23:{subtitle:"Ciel très couvert et dense.",sky:"Une couverture nuageuse épaisse domine la journée."},
  24:{subtitle:"Pluie et vent marquent la journée.",sky:"La pluie s’accompagne d’un vent sensible à fort."}
};

const round5=(v:number)=>Math.round(v/5)*5;

function thirdLine(sceneId:Scene24Id,p:DayProfile):string|null{
  if(sceneId===5 && p.evolution.meanCloudAfternoon>p.evolution.meanCloudMorning+10)
    return "Les nuages prennent nettement le dessus l’après-midi.";
  if((sceneId===11||sceneId===15) && p.evolution.meanCloudAfternoon+10<p.evolution.meanCloudMorning)
    return "Le ciel devient nettement plus lumineux l’après-midi.";
  if([12,13,22,24].includes(sceneId)){
    if(p.rain.maxRainMmPerHour>=4) return "Des passages de forte pluie sont possibles.";
    if(p.rain.rainBlockMaxHours>=4) return "La pluie peut durer plusieurs heures sans vraie coupure.";
    if(p.rain.showerBlockCount>=2) return "Plusieurs passages pluvieux sont possibles dans la journée.";
  }
  if([6,10,14,20,24].includes(sceneId) && p.wind.notableHours>0)
    return `Rafales maximales autour de ${round5(p.wind.maxGustKmh)} km/h.`;
  return null;
}

function notable(sceneId:Scene24Id,p:DayProfile):string|null{
  if(sceneId===22 && p.convection.thunderHours>0) return "Des orages sont possibles dans la journée.";
  if([10,20,24].includes(sceneId) && p.wind.maxGustKmh>=60)
    return `Rafales pouvant approcher ${round5(p.wind.maxGustKmh)} km/h.`;
  if([12,24].includes(sceneId) && p.rain.maxRainMmPerHour>=4)
    return "Des passages de forte pluie sont possibles.";
  return null;
}

export function buildV24NativeEditorial(args:{sceneId:Scene24Id;profile:DayProfile;forecast:LokaForecast;}):V24NativeEditorial{
  const {sceneId,profile,forecast}=args;
  const copy=COPY[sceneId];
  const lines=[temperatureRange(forecast.tempMinC,forecast.tempMaxC),copy.sky];
  const extra=thirdLine(sceneId,profile);
  if(extra) lines.push(extra);
  const summaryLines=lines.slice(0,3);
  const notableEvent=notable(sceneId,profile);
  assertPublicLanguage(copy.subtitle);
  summaryLines.forEach(assertPublicLanguage);
  if(notableEvent) assertPublicLanguage(notableEvent);
  return {version:"11.3.0",source:"v24_native_v1",subtitle:copy.subtitle,summaryLines,mainVerdict:copy.subtitle,rainVerdict:summaryLines.join(" "),notableEvent};
}
