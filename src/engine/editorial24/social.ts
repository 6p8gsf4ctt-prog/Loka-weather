import type { EditorialFacts, SkyBand } from "../../types";
import type { EditorialDaypart, EditorialFactsV21 } from "./facts";

function formatDecimal(value: number): string {
  return String(Math.round(value * 10) / 10).replace(".", ",");
}

function daypartLabel(period: EditorialDaypart | null): string {
  switch (period) {
    case "NIGHT": return "dans la nuit";
    case "MORNING": return "dans la matinée";
    case "MIDDAY": return "autour de la mi-journée";
    case "AFTERNOON": return "dans l’après-midi";
    case "LATE_AFTERNOON": return "en fin d’après-midi";
    case "EVENING": return "en soirée";
    case "ALL_DAY": return "du matin au soir";
    default: return "";
  }
}

function transitionLabel(f: EditorialFactsV21): string {
  const transition = f.intelligence.transition;
  if (transition.decisiveHour !== null) return `à partir de ${Math.round(transition.decisiveHour)}h`;
  return daypartLabel(transition.period);
}

function bright(band: SkyBand): boolean {
  return band === "CLEAR" || band === "BRIGHT";
}

function cloudy(band: SkyBand): boolean {
  return band === "CLOUDY" || band === "DENSE";
}

function skyNarrative(f: EditorialFactsV21, cityName: string): string {
  const rainRole = f.intelligence.rain.role;
  const rain = f.intelligence.rain;
  const transition = f.intelligence.transition;

  if (rainRole === "THUNDER") {
    return `Un risque orageux pourra concerner ${cityName}, avec une évolution parfois rapide.`;
  }
  if (rainRole === "SUSTAINED") {
    if (rain.lastHour !== null && rain.lastHour <= 18) {
      return `La journée sera bien humide à ${cityName}, avant un temps plus calme en soirée.`;
    }
    return `Difficile de vraiment passer entre les gouttes à ${cityName} : la pluie devrait accompagner une bonne partie de la journée.`;
  }
  if (rainRole === "SHOWERS" && f.sceneId === 13) {
    return `Des averses alterneront avec des accalmies à ${cityName}.`;
  }

  if (f.sceneId === 12 && rainRole === "SECONDARY") {
    const timing = daypartLabel(rain.period);
    return `Le ciel restera souvent nuageux à ${cityName}, avec seulement quelques passages pluvieux possibles${timing ? ` ${timing}` : ""}.`;
  }
  if (f.sceneId === 11 && f.trajectory === "IMPROVING") {
    const timing = transition.period === "EVENING" ? " en soirée" : " ensuite";
    return `La journée démarre sous un ciel chargé à ${cityName}, avec encore quelques averses possibles, avant une amélioration progressive${timing}.`;
  }
  if (f.trajectory === "IMPROVING" && cloudy(f.startSky)) {
    const decisive = transition.decisiveHour;
    if ((f.sceneId === 15 || f.sceneId === 21) && decisive !== null && decisive >= 11 && decisive <= 18) {
      return `Après une matinée nuageuse à ${cityName}, les éclaircies devraient devenir plus franches à partir de ${Math.round(decisive)}h.`;
    }
    return `La journée démarre sous un ciel chargé à ${cityName}, avant des éclaircies plus franches au fil des heures.`;
  }
  if (f.trajectory === "DEGRADING" && bright(f.startSky) && f.sceneId === 5) {
    if (rain.firstHour !== null && rain.firstHour >= 20) {
      return `Le soleil devrait bien dominer une grande partie de la journée à ${cityName}, avant un ciel plus chargé en soirée.`;
    }
    if (f.endSky === "BRIGHT" && (transition.firstChangeHour ?? 0) >= 17) {
      return `Le soleil devrait bien dominer une grande partie de la journée à ${cityName}, avant l’arrivée de nuages plus nombreux en fin d’après-midi.`;
    }
    if (transition.period === "AFTERNOON" || transition.period === "LATE_AFTERNOON") {
      return `Le soleil devrait dominer le début de journée à ${cityName}, puis les nuages gagner progressivement du terrain dans l’après-midi.`;
    }
    if (transition.period === "EVENING") {
      return `Le soleil devrait bien dominer une grande partie de la journée à ${cityName}, avant un ciel plus couvert en soirée.`;
    }
  }

  switch (f.sceneId) {
    case 1: return `Le soleil devrait largement dominer la journée à ${cityName}.`;
    case 2: return `Le soleil restera présent à ${cityName}, malgré un voile nuageux par moments.`;
    case 3: return `Les nuages resteront nombreux à ${cityName}, avec quelques éclaircies possibles.`;
    case 4: return `Soleil et nuages alterneront à ${cityName}, avec de belles périodes lumineuses.`;
    case 5: return `Le début de journée restera lumineux à ${cityName}, avant davantage de nuages ensuite.`;
    case 6: return `Le temps restera lumineux à ${cityName}, dans une ambiance venteuse.`;
    case 7: return `Le ciel restera souvent voilé à ${cityName}, avec quelques éclaircies par moments.`;
    case 8: return `Brume ou brouillard pourront réduire temporairement la visibilité à ${cityName}.`;
    case 9: return `Le ciel restera souvent couvert à ${cityName}, avec peu d’évolution.`;
    case 10: return `Le vent sera le fait marquant de la journée à ${cityName}.`;
    case 11: return `Les conditions devraient progressivement s’améliorer à ${cityName}.`;
    case 12: return `Le ciel restera souvent nuageux à ${cityName}.`;
    case 13: return `Des averses alterneront avec des accalmies à ${cityName}.`;
    case 14: return `Des éclaircies se développeront à ${cityName}, sous un vent sensible.`;
    case 15: return `Après un début de journée nuageux à ${cityName}, les éclaircies deviendront plus franches.`;
    case 16: return `Le soleil devrait dominer à ${cityName}, malgré quelques passages nuageux.`;
    case 17: return `Un brouillard dense pourra marquer plusieurs heures à ${cityName}.`;
    case 18: return `Soleil et nuages alterneront à ${cityName}, sans changement majeur.`;
    case 19: return `Le temps restera changeant à ${cityName}, avec plusieurs évolutions possibles.`;
    case 20: return `Les nuages resteront nombreux à ${cityName}, sous un vent sensible.`;
    case 21: return `De longues éclaircies devraient se développer à ${cityName} entre les passages nuageux.`;
    case 22: return `Un risque orageux pourra rythmer une partie de la journée à ${cityName}.`;
    case 23: return `Une couche nuageuse dense restera installée à ${cityName}.`;
    case 24: return `Pluie et vent pourront se combiner pendant plusieurs heures à ${cityName}.`;
    default: return `Le temps restera variable à ${cityName}.`;
  }
}

function temperatureSentence(f: EditorialFactsV21): string {
  const min = f.temperature.minC;
  const max = f.temperature.maxC;
  const peak = daypartLabel(f.intelligence.temperature.peakPeriod);
  if (f.temperature.character === "VERY_HOT") {
    return `La chaleur sera marquée, avec des températures de ${min} à ${max} °C et un maximum attendu dans l’après-midi.`;
  }
  if (f.temperature.character === "HOT") {
    return `Les températures iront de ${min} à ${max} °C, avec une ambiance bien chaude dans l’après-midi.`;
  }
  return `Les températures iront de ${min} à ${max} °C.`;
}

function rainSentence(f: EditorialFactsV21): string | null {
  const role = f.intelligence.rain.role;
  const total = formatDecimal(f.precipitation.totalMm);
  const period = daypartLabel(f.intelligence.rain.period);

  if (role === "THUNDER") return `Le risque orageux restera à surveiller${period ? ` ${period}` : " par moments"}, avec une évolution parfois rapide.`;

  if (role === "SUSTAINED") {
    if (f.trajectory === "IMPROVING") {
      const improvement = daypartLabel(f.intelligence.transition.period);
      return `La pluie accompagnera une bonne partie de la journée, avec autour de ${total} mm au total${improvement ? ` avant un temps plus calme ${improvement}` : ""}.`;
    }
    return `La pluie accompagnera une bonne partie de la journée, avec autour de ${total} mm au total et seulement quelques pauses possibles.`;
  }

  if (role === "SHOWERS") {
    return `Quelques averses resteront possibles${period ? ` ${period}` : " par moments"}, avec des accalmies entre les passages.`;
  }

  if (role === "SECONDARY") {
    if (f.precipitation.totalMm <= 0.5) {
      return `La pluie restera très limitée, sans véritable dégradation annoncée.`;
    }
    if (f.precipitation.totalMm <= 1 && f.temperature.maxC >= 24) {
      return `Seulement un peu de pluie est attendue${period ? ` ${period}` : ""}.`;
    }
    if (f.trajectory === "IMPROVING") {
      return `Autour de ${total} mm de pluie sont attendus sur la journée.`;
    }
    if (f.intelligence.rain.firstHour !== null && f.intelligence.rain.firstHour >= 20) {
      return `Un peu de pluie pourra arriver en fin de soirée, autour de ${total} mm au total.`;
    }
    return `Quelques passages pluvieux restent possibles${period ? ` ${period}` : ""}, pour un cumul proche de ${total} mm.`;
  }

  return null;
}

function detailNarrative(f: EditorialFactsV21): string {
  const rain = rainSentence(f);
  if (rain) {
    if (f.intelligence.rain.role === "SECONDARY" && f.trajectory === "IMPROVING") {
      return `${temperatureSentence(f)} ${rain}`;
    }
    if (f.intelligence.rain.role === "SECONDARY" && f.intelligence.rain.firstHour !== null && f.intelligence.rain.firstHour >= 20) {
      return `${temperatureSentence(f)} ${rain}`;
    }
    return `${rain} ${temperatureSentence(f)}`;
  }

  if (f.wind.kind === "STRONG") {
    return `Les rafales pourront approcher ${Math.round(f.wind.maxGustKmh)} km/h. ${temperatureSentence(f)}`;
  }
  if (f.wind.kind === "NOTABLE") {
    return `Le vent restera sensible, avec des rafales proches de ${Math.round(f.wind.maxGustKmh)} km/h. ${temperatureSentence(f)}`;
  }
  if (f.fog.kind !== "NONE") {
    return `La visibilité devrait ensuite s’améliorer progressivement. ${temperatureSentence(f)}`;
  }

  if (f.temperature.character === "VERY_HOT" || f.temperature.character === "HOT") {
    return `${temperatureSentence(f)} Le temps restera globalement sec.`;
  }
  if (f.trajectory === "DEGRADING") {
    return `${temperatureSentence(f)} Le temps restera sec du matin au soir.`;
  }
  if (f.trajectory === "IMPROVING") {
    return `${temperatureSentence(f)} Le temps restera sec, avec des éclaircies de plus en plus franches.`;
  }
  if (f.trajectory === "VARIABLE") {
    return `Le temps restera sec tout au long de la journée. ${temperatureSentence(f)}`;
  }
  return `${temperatureSentence(f)} Le temps restera sec sur la journée.`;
}

function legacySkyPhrase(f: EditorialFacts, cityName: string): string {
  return `La météo du jour à ${cityName} reste dominée par la scène ${f.sceneKey.toLowerCase().replace(/_/g, " ")}.`;
}

export function buildSocialEditorial(citySlug: string, cityName: string, facts: EditorialFacts | EditorialFactsV21, emoji: string, hashtags: string): {
  paragraph1: string; paragraph2: string; signature: "Ici, aujourd’hui."; handle: string; caption: string; hashtags: string;
} {
  const f = facts as EditorialFactsV21;
  const paragraph1 = `${emoji} ${f.intelligence ? skyNarrative(f, cityName) : legacySkyPhrase(f, cityName)}`;
  const paragraph2 = f.intelligence ? detailNarrative(f) : `Les températures iront de ${f.temperature.minC} à ${f.temperature.maxC} °C.`;
  const signature = "Ici, aujourd’hui." as const;
  const handle = `@loka.${citySlug}`;
  const caption = `${paragraph1}\n\n${paragraph2}\n\n${signature}\n${handle}`;
  return { paragraph1, paragraph2, signature, handle, caption, hashtags };
}
