import type {
  CityConfig,
  EditorialEngagementV2,
  EditorialFacts,
  HourlyCondition,
  OfficialPublicPayloadV24,
  Scene24Id,
  SkyBand
} from "../types";
import { scene24DisplayTitle } from "../engine/scenes24/displayTitles";
import { masterUrlForScene, scene24ById } from "../engine/scenes24/registry";

interface PreviewScenePreset {
  minC: number;
  maxC: number;
  hourly: HourlyCondition[];
  primaryLine: string;
  secondaryLine: string;
  paragraph1: string;
  paragraph2: string;
  engagement: EditorialEngagementV2;
}

const PRESETS: Readonly<Record<Scene24Id, PreviewScenePreset>> = {
  1: {
    minC: 18, maxC: 30,
    hourly: ["soleil","soleil","soleil","soleil","soleil","soleil","soleil","soleil","soleil","soleil"],
    primaryLine: "Soleil sans partage · Ciel limpide du matin au soir",
    secondaryLine: "Ambiance très lumineuse avec une chaleur bien installée l’après-midi.",
    paragraph1: "☀️ À Tarnos, la journée s’annonce franchement radieuse du lever au coucher du soleil.",
    paragraph2: "Une scène parfaite pour profiter d’un ciel net et très lumineux.",
    engagement: { format: "QUESTION", question: "Team plein soleil aujourd’hui : plage, terrasse ou balade ?", options: null }
  },
  2: {
    minC: 19, maxC: 29,
    hourly: ["peu nuageux","peu nuageux","peu nuageux","soleil","soleil","soleil","peu nuageux","peu nuageux","peu nuageux","peu nuageux"],
    primaryLine: "Soleil dominant · Léger voile en altitude",
    secondaryLine: "La lumière reste généreuse malgré un ciel parfois un peu filtré.",
    paragraph1: "🌤️ Le soleil garde l’avantage à Tarnos, avec un voile discret qui adoucit simplement le ciel.",
    paragraph2: "Une atmosphère douce et lumineuse, sans vraie contrariété météo.",
    engagement: { format: "POLL", question: "Tu préfères un ciel pur ou légèrement voilé ?", options: ["Ciel pur", "Voilé"] }
  },
  3: {
    minC: 17, maxC: 27,
    hourly: ["nuageux","peu nuageux","peu nuageux","variable","peu nuageux","soleil","peu nuageux","variable","peu nuageux","nuageux"],
    primaryLine: "Belles trouées de lumière · Journée vivante",
    secondaryLine: "Les éclaircies prennent régulièrement le dessus au fil des heures.",
    paragraph1: "⛅ Entre passages nuageux et belles éclaircies, la journée garde un vrai relief visuel.",
    paragraph2: "Le ciel bouge, mais la lumière revient souvent.",
    engagement: { format: "QUESTION", question: "Tu aimes ces journées à éclaircies régulières ?", options: null }
  },
  4: {
    minC: 18, maxC: 26,
    hourly: ["variable","peu nuageux","variable","nuageux","peu nuageux","soleil","variable","peu nuageux","variable","nuageux"],
    primaryLine: "Alternances fréquentes · Belle souplesse du ciel",
    secondaryLine: "Les ambiances changent souvent, sans jamais basculer franchement.",
    paragraph1: "🌥️ Tarnos évolue aujourd’hui sous un ciel mobile, changeant mais plutôt agréable à suivre.",
    paragraph2: "Une scène idéale pour mettre en valeur la variété du moteur visuel.",
    engagement: { format: "POLL", question: "Tu trouves ce ciel changeant agréable ?", options: ["Oui", "Pas vraiment"] }
  },
  5: {
    minC: 18, maxC: 25,
    hourly: ["soleil","peu nuageux","variable","nuageux","nuageux","couvert","couvert","couvert","couvert","couvert"],
    primaryLine: "Début lumineux · Ciel de plus en plus chargé",
    secondaryLine: "La journée perd progressivement de sa clarté à mesure que les nuages gagnent du terrain.",
    paragraph1: "🌥️ Belle entame à Tarnos, mais le ciel se couvre peu à peu au fil de la journée.",
    paragraph2: "La sensation générale devient nettement plus grise en deuxième partie de journée.",
    engagement: { format: "QUESTION", question: "Tu préfères profiter du matin ou de la fin de journée quand le ciel se couvre ?", options: null }
  },
  6: {
    minC: 19, maxC: 28,
    hourly: ["vent","vent","soleil","soleil","vent","vent","soleil","vent","vent","soleil"],
    primaryLine: "Temps lumineux · Vent bien sensible",
    secondaryLine: "Le soleil reste présent, mais les rafales accompagnent la journée d’un bout à l’autre.",
    paragraph1: "🌬️ Soleil bien présent à Tarnos, avec un vent déjà perceptible dès le matin.",
    paragraph2: "Une journée lumineuse, mais clairement animée par l’air marin.",
    engagement: { format: "POLL", question: "Le vent te dérange quand le soleil est là ?", options: ["Oui", "Non"] }
  },
  7: {
    minC: 18, maxC: 26,
    hourly: ["peu nuageux","variable","variable","variable","peu nuageux","peu nuageux","variable","variable","peu nuageux","variable"],
    primaryLine: "Lumière adoucie · Voile plus dense qu’à l’ordinaire",
    secondaryLine: "Le soleil filtre encore, mais l’ambiance paraît plus tamisée tout au long de la journée.",
    paragraph1: "🌤️ Le ciel reste lumineux à Tarnos, avec un voile plus marqué qui atténue un peu l’éclat du soleil.",
    paragraph2: "Une scène subtile, entre douceur et lumière filtrée.",
    engagement: { format: "QUESTION", question: "Tu aimes cette ambiance de soleil très voilé ?", options: null }
  },
  8: {
    minC: 15, maxC: 24,
    hourly: ["brouillard","brouillard","brouillard","variable","peu nuageux","peu nuageux","variable","peu nuageux","nuageux","nuageux"],
    primaryLine: "Brumes matinales · Levée progressive en cours de journée",
    secondaryLine: "La visibilité s’améliore ensuite, avec une ambiance de plus en plus respirable.",
    paragraph1: "🌫️ La journée démarre dans une ambiance brumeuse à Tarnos, avant une amélioration progressive.",
    paragraph2: "Le rendu visuel joue ici sur les tons laiteux et la levée de brume.",
    engagement: { format: "POLL", question: "La brume du matin, tu trouves ça beau ?", options: ["Oui", "Non"] }
  },
  9: {
    minC: 17, maxC: 23,
    hourly: ["couvert","couvert","couvert","couvert","couvert","couvert","couvert","couvert","couvert","couvert"],
    primaryLine: "Gris uniforme · Peu d’évolution au fil des heures",
    secondaryLine: "Le ciel reste bouché, sans véritable trouée lumineuse en vue.",
    paragraph1: "☁️ Tarnos reste sous un ciel couvert, homogène et sans grande variation.",
    paragraph2: "Une scène sobre, utile pour juger les ambiances les plus douces du système.",
    engagement: { format: "QUESTION", question: "Tu supportes bien les journées totalement couvertes ?", options: null }
  },
  10: {
    minC: 18, maxC: 24,
    hourly: ["vent","vent","vent","vent","vent","vent","vent","vent","vent","vent"],
    primaryLine: "Rafales dominantes · Impression très dynamique",
    secondaryLine: "Le vent devient clairement le fait marquant de la journée.",
    paragraph1: "🌬️ À Tarnos, le vent s’impose aujourd’hui comme l’élément principal du décor.",
    paragraph2: "Même sans météo agitée, le rendu donne une vraie énergie à la scène.",
    engagement: { format: "POLL", question: "Tu aimes les journées de grand vent ?", options: ["Plutôt oui", "Plutôt non"] }
  },
  11: {
    minC: 16, maxC: 25,
    hourly: ["couvert","nuageux","variable","peu nuageux","peu nuageux","soleil","soleil","peu nuageux","peu nuageux","variable"],
    primaryLine: "Début chargé · Retour progressif de la lumière",
    secondaryLine: "L’ambiance s’éclaircit peu à peu avec une nette amélioration au fil des heures.",
    paragraph1: "⛅ La journée commence timidement à Tarnos, puis les éclaircies gagnent progressivement.",
    paragraph2: "Une scène très utile pour juger la sensation d’ouverture du ciel.",
    engagement: { format: "QUESTION", question: "Tu préfères voir le ciel s’améliorer ou se dégrader ?", options: null }
  },
  12: {
    minC: 18, maxC: 22,
    hourly: ["pluie","pluie","pluie","pluie","pluie","pluie","pluie","pluie","pluie","pluie"],
    primaryLine: "Pluie durable · Journée très humide",
    secondaryLine: "Les précipitations dominent largement, avec peu de vraies accalmies.",
    paragraph1: "🌧️ La pluie s’installe sérieusement à Tarnos, avec une impression de continuité marquée.",
    paragraph2: "Une scène forte pour vérifier les ambiances froides et humides.",
    engagement: { format: "POLL", question: "Parapluie aujourd’hui : indispensable ?", options: ["Évidemment", "Probablement"] }
  },
  13: {
    minC: 17, maxC: 24,
    hourly: ["averse","variable","averse","variable","averse","peu nuageux","averse","variable","averse","nuageux"],
    primaryLine: "Passages pluvieux · Accalmies entre deux averses",
    secondaryLine: "Le ciel alterne entre éclaircies brèves et averses parfois plus marquées.",
    paragraph1: "🌦️ À Tarnos, les averses rythment la journée sans occuper chaque instant.",
    paragraph2: "Le rendu doit rester vivant, plus haché que pour la pluie continue.",
    engagement: { format: "QUESTION", question: "Tu tentes la sortie entre deux averses ?", options: null }
  },
  14: {
    minC: 18, maxC: 25,
    hourly: ["vent","variable","peu nuageux","vent","peu nuageux","vent","peu nuageux","variable","vent","peu nuageux"],
    primaryLine: "Belles ouvertures · Vent toujours présent",
    secondaryLine: "La lumière revient souvent, mais l’atmosphère reste bien brassée.",
    paragraph1: "🌬️ Les éclaircies font le spectacle à Tarnos, avec un vent qui accompagne toute la scène.",
    paragraph2: "Un bon cas pour juger l’équilibre entre ciel lumineux et énergie visuelle.",
    engagement: { format: "POLL", question: "Vent + éclaircies, combo agréable ?", options: ["Oui", "Bof"] }
  },
  15: {
    minC: 16, maxC: 26,
    hourly: ["pluie","nuageux","variable","peu nuageux","peu nuageux","soleil","soleil","peu nuageux","peu nuageux","variable"],
    primaryLine: "Départ maussade · Belle ouverture ensuite",
    secondaryLine: "La journée change franchement de visage avec un retour progressif puis net du soleil.",
    paragraph1: "🌤️ Après un début un peu gris, Tarnos retrouve une ambiance bien plus lumineuse au fil des heures.",
    paragraph2: "Cette scène met bien en valeur la sensation d’embellie.",
    engagement: { format: "QUESTION", question: "Tu adores quand la journée se transforme ainsi ?", options: null }
  },
  16: {
    minC: 17, maxC: 27,
    hourly: ["peu nuageux","peu nuageux","peu nuageux","soleil","peu nuageux","soleil","soleil","peu nuageux","peu nuageux","peu nuageux"],
    primaryLine: "Soleil dominant · Nuages décoratifs par moments",
    secondaryLine: "La lumière reste très présente tout au long de la journée.",
    paragraph1: "⛅ Tarnos profite d’une très belle journée, avec seulement quelques passages nuageux pour nuancer le ciel.",
    paragraph2: "Le titre plus court doit ici rester très lisible dans le cartouche principal.",
    engagement: { format: "POLL", question: "Tu préfères plein soleil ou soleil & nuages ?", options: ["Plein soleil", "Soleil & nuages"] }
  },
  17: {
    minC: 14, maxC: 21,
    hourly: ["brouillard","brouillard","brouillard","brouillard","brouillard","nuageux","variable","nuageux","brouillard","brouillard"],
    primaryLine: "Brouillard très présent · Visibilité souvent réduite",
    secondaryLine: "L’atmosphère reste épaisse longtemps, avec une amélioration limitée.",
    paragraph1: "🌫️ L’ambiance reste bien plus opaque que pour une simple brume, avec un brouillard qui s’impose durablement.",
    paragraph2: "Un excellent test pour les scènes les plus sourdes et diffuses.",
    engagement: { format: "QUESTION", question: "Ce type d’ambiance épaisse te plaît visuellement ?", options: null }
  },
  18: {
    minC: 17, maxC: 25,
    hourly: ["variable","peu nuageux","nuageux","peu nuageux","variable","soleil","variable","nuageux","peu nuageux","variable"],
    primaryLine: "Temps partagé · Aucun régime ne s’impose vraiment",
    secondaryLine: "Le ciel change souvent, sans vraie ligne directrice.",
    paragraph1: "🌥️ La journée reste changeante à Tarnos, avec des séquences différentes qui se succèdent.",
    paragraph2: "Cette scène sert à contrôler la neutralité des ambiances intermédiaires.",
    engagement: { format: "POLL", question: "Tu aimes les journées impossibles à résumer ?", options: ["Oui", "Non"] }
  },
  19: {
    minC: 18, maxC: 25,
    hourly: ["variable","averse","nuageux","averse","peu nuageux","averse","nuageux","variable","averse","nuageux"],
    primaryLine: "Ciel remuant · Atmosphère parfois désordonnée",
    secondaryLine: "Les séquences se succèdent vite, avec une impression plus nerveuse qu’une simple alternance.",
    paragraph1: "🌦️ À Tarnos, le temps joue aujourd’hui la carte de l’instabilité avec plusieurs humeurs dans la même journée.",
    paragraph2: "Le rendu doit rester vivant, sans tomber dans l’orage franc.",
    engagement: { format: "QUESTION", question: "Tu trouves ce temps instable agaçant ou intéressant ?", options: null }
  },
  20: {
    minC: 17, maxC: 23,
    hourly: ["nuageux","vent","nuageux","vent","nuageux","vent","nuageux","vent","nuageux","vent"],
    primaryLine: "Nuages majoritaires · Vent bien installé",
    secondaryLine: "L’ensemble garde une tonalité grise, animée par un ressenti plus dynamique.",
    paragraph1: "🌬️ Tarnos reste sous un ciel plutôt nuageux, avec un vent qui renforce la sensation de mouvement.",
    paragraph2: "La scène est utile pour contrôler les rendus plus frais et plus toniques.",
    engagement: { format: "POLL", question: "Nuages & vent : ambiance que tu aimes ?", options: ["Oui", "Pas trop"] }
  },
  21: {
    minC: 17, maxC: 28,
    hourly: ["peu nuageux","peu nuageux","soleil","soleil","peu nuageux","soleil","peu nuageux","peu nuageux","variable","peu nuageux"],
    primaryLine: "Très belles ouvertures · Ciel souvent généreux",
    secondaryLine: "Les éclaircies occupent une large partie de la journée et structurent l’ambiance.",
    paragraph1: "🌤️ Tarnos profite de longues périodes lumineuses, avec des nuages bien moins présents que la veille.",
    paragraph2: "Une scène claire et aérée, très agréable à lire.",
    engagement: { format: "QUESTION", question: "Pour toi, c’est presque une journée d’été idéale ?", options: null }
  },
  22: {
    minC: 19, maxC: 27,
    hourly: ["orage","variable","orage","pluie","variable","orage","averse","variable","orage","nuageux"],
    primaryLine: "Ambiance lourde · Risque orageux bien installé",
    secondaryLine: "Le ciel devient plus sombre et plus contrasté, avec un potentiel orageux visible.",
    paragraph1: "⛈️ Le ton devient nettement plus menaçant à Tarnos, avec une ambiance orageuse qui structure la journée.",
    paragraph2: "C’est la scène idéale pour juger les fonds les plus dramatiques du moteur.",
    engagement: { format: "POLL", question: "Les ciels d’orage, tu trouves ça impressionnant ?", options: ["Magnifique", "Inquiétant"] }
  },
  23: {
    minC: 16, maxC: 21,
    hourly: ["couvert","couvert","couvert","couvert","couvert","couvert","nuageux","couvert","couvert","couvert"],
    primaryLine: "Gris compact · Lumière très retenue",
    secondaryLine: "Le ciel paraît plus dense et plus fermé qu’une simple journée couverte.",
    paragraph1: "☁️ Une chape grise domine à Tarnos, avec une sensation plus lourde et plus terne que d’habitude.",
    paragraph2: "Parfait pour contrôler les tonalités les plus sourdes de la bibliothèque.",
    engagement: { format: "QUESTION", question: "Le ciel très gris, tu le trouves déprimant ?", options: null }
  },
  24: {
    minC: 17, maxC: 22,
    hourly: ["pluie","vent","pluie","vent","pluie","pluie","vent","pluie","vent","pluie"],
    primaryLine: "Pluie et rafales · Journée franchement inconfortable",
    secondaryLine: "Le vent renforce la sensation humide et accentue le caractère de la scène.",
    paragraph1: "🌧️ Entre pluie et vent, Tarnos compose aujourd’hui avec une ambiance plutôt rugueuse.",
    paragraph2: "Une scène très pratique pour valider les situations les plus agitées sans orage.",
    engagement: { format: "POLL", question: "Pluie & vent ensemble : pire combo météo ?", options: ["Oui", "Pas forcément"] }
  }
} as const;

function pseudo(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function buildHourlyTemperatures(minC: number, maxC: number, sceneId: Scene24Id): number[] {
  const spread = Math.max(4, maxC - minC);
  const curve = [0.12, 0, 0.08, 0.28, 0.5, 0.76, 1, 0.86, 0.62, 0.4];
  return curve.map((ratio, index) => {
    const jitter = Math.round((pseudo(sceneId * 30 + index + 1) - 0.5) * 2);
    const value = minC + Math.round(spread * ratio) + jitter;
    return Math.max(minC, Math.min(maxC, value));
  });
}

function skyBands(sceneId: Scene24Id): { start: SkyBand; middle: SkyBand; end: SkyBand } {
  switch (sceneId) {
    case 1: return { start: "CLEAR", middle: "CLEAR", end: "CLEAR" };
    case 2: return { start: "BRIGHT", middle: "BRIGHT", end: "BRIGHT" };
    case 3: return { start: "MIXED", middle: "BRIGHT", end: "MIXED" };
    case 4: return { start: "MIXED", middle: "BRIGHT", end: "MIXED" };
    case 5: return { start: "BRIGHT", middle: "MIXED", end: "CLOUDY" };
    case 6: return { start: "CLEAR", middle: "CLEAR", end: "BRIGHT" };
    case 7: return { start: "BRIGHT", middle: "MIXED", end: "MIXED" };
    case 8: return { start: "DENSE", middle: "MIXED", end: "MIXED" };
    case 9: return { start: "CLOUDY", middle: "CLOUDY", end: "CLOUDY" };
    case 10: return { start: "MIXED", middle: "MIXED", end: "MIXED" };
    case 11: return { start: "CLOUDY", middle: "MIXED", end: "BRIGHT" };
    case 12: return { start: "CLOUDY", middle: "CLOUDY", end: "CLOUDY" };
    case 13: return { start: "MIXED", middle: "MIXED", end: "CLOUDY" };
    case 14: return { start: "MIXED", middle: "BRIGHT", end: "MIXED" };
    case 15: return { start: "CLOUDY", middle: "MIXED", end: "BRIGHT" };
    case 16: return { start: "BRIGHT", middle: "CLEAR", end: "BRIGHT" };
    case 17: return { start: "DENSE", middle: "DENSE", end: "CLOUDY" };
    case 18: return { start: "MIXED", middle: "MIXED", end: "MIXED" };
    case 19: return { start: "MIXED", middle: "CLOUDY", end: "MIXED" };
    case 20: return { start: "CLOUDY", middle: "CLOUDY", end: "CLOUDY" };
    case 21: return { start: "BRIGHT", middle: "CLEAR", end: "BRIGHT" };
    case 22: return { start: "MIXED", middle: "DENSE", end: "CLOUDY" };
    case 23: return { start: "DENSE", middle: "DENSE", end: "DENSE" };
    case 24: return { start: "CLOUDY", middle: "CLOUDY", end: "CLOUDY" };
  }
}

function trajectoryForScene(sceneId: Scene24Id): EditorialFacts["trajectory"] {
  if ([5].includes(sceneId)) return "DEGRADING";
  if ([11, 15].includes(sceneId)) return "IMPROVING";
  if ([4, 18, 19].includes(sceneId)) return "VARIABLE";
  return "STABLE";
}

function precipitationForScene(sceneId: Scene24Id): EditorialFacts["precipitation"] {
  if (sceneId === 22) return { kind: "THUNDER", hours: 4, totalMm: 7.4 };
  if ([12, 24].includes(sceneId)) return { kind: "RAIN", hours: 8, totalMm: sceneId === 24 ? 6.1 : 9.4 };
  if ([13, 19].includes(sceneId)) return { kind: "SHOWERS", hours: 5, totalMm: 4.2 };
  return { kind: "DRY", hours: 0, totalMm: 0 };
}

function windForScene(sceneId: Scene24Id): EditorialFacts["wind"] {
  if (sceneId === 10) return { kind: "STRONG", maxGustKmh: 74 };
  if ([6, 14, 20, 24].includes(sceneId)) return { kind: "NOTABLE", maxGustKmh: sceneId === 24 ? 63 : 57 };
  return { kind: "NONE", maxGustKmh: 24 };
}

function fogForScene(sceneId: Scene24Id): EditorialFacts["fog"] {
  if (sceneId === 17) return { kind: "DENSE", hours: 7 };
  if (sceneId === 8) return { kind: "BRIEF", hours: 3 };
  return { kind: "NONE", hours: 0 };
}

function temperatureCharacter(maxC: number): EditorialFacts["temperature"]["character"] {
  if (maxC >= 33) return "VERY_HOT";
  if (maxC >= 27) return "HOT";
  if (maxC >= 21) return "WARM";
  if (maxC >= 16) return "MILD";
  return "COOL";
}

function factsForScene(sceneId: Scene24Id, preset: PreviewScenePreset): EditorialFacts {
  const scene = scene24ById(sceneId);
  const bands = skyBands(sceneId);
  return {
    sceneId,
    sceneKey: scene.key,
    trajectory: trajectoryForScene(sceneId),
    startSky: bands.start,
    middleSky: bands.middle,
    endSky: bands.end,
    transitionStrength: trajectoryForScene(sceneId) === "STABLE" ? "WEAK" : "MODERATE",
    brightestPeriod: [1, 2, 6, 16, 21].includes(sceneId) ? "ALL_DAY" : [11, 15].includes(sceneId) ? "LATE" : "MID",
    cloudiestPeriod: [5].includes(sceneId) ? "LATE" : [11, 15].includes(sceneId) ? "EARLY" : [9, 12, 23, 24].includes(sceneId) ? "ALL_DAY" : "MID",
    precipitation: precipitationForScene(sceneId),
    wind: windForScene(sceneId),
    fog: fogForScene(sceneId),
    temperature: { minC: preset.minC, maxC: preset.maxC, character: temperatureCharacter(preset.maxC) },
    confidence: "HIGH",
    modelSignalUncertain: false
  };
}

function buildCaption(preset: PreviewScenePreset): string {
  return `${preset.paragraph1}\n\n${preset.paragraph2}\n\nIci, aujourd’hui.\n@loka.tarnos`;
}

export function previewSceneIdsForPack(pack: number): Scene24Id[] {
  const normalized = Number.isFinite(pack) ? Math.max(1, Math.min(5, Math.trunc(pack))) : 1;
  const all = Array.from({ length: 24 }, (_, i) => (i + 1) as Scene24Id);
  const start = (normalized - 1) * 5;
  return all.slice(start, Math.min(start + 5, 24));
}

export function buildPreviewPayload(city: CityConfig, sceneId: Scene24Id): OfficialPublicPayloadV24 {
  const scene = scene24ById(sceneId);
  const preset = PRESETS[sceneId];
  const date = `2026-08-${String(((sceneId - 1) % 28) + 1).padStart(2, "0")}`;
  const temps = buildHourlyTemperatures(preset.minC, preset.maxC, sceneId);
  const facts = factsForScene(sceneId, preset);
  const caption = buildCaption(preset);
  const hashtags = "#Tarnos #MeteoTarnos #Landes #MeteoLandes #Loka";
  return {
    version: "2.0",
    city: city.name,
    citySlug: city.slug,
    date,
    generatedAt: new Date().toISOString(),
    source: "PREVIEW_SCENE_GALLERY",
    scene: {
      id: scene.id,
      key: scene.key,
      label: scene.label,
      family: scene.family,
      masterUrl: masterUrlForScene(scene.id),
      visualIcon: scene.visualIcon,
      emoji: scene.emoji
    },
    temperatures: { minC: preset.minC, maxC: preset.maxC },
    hourly: city.displayHours.map((hour, index) => ({
      hour,
      temperatureC: temps[index] ?? preset.minC,
      condition: preset.hourly[index] ?? preset.hourly[preset.hourly.length - 1],
      precipitationMm: ["pluie", "averse", "orage"].includes(preset.hourly[index] ?? "") ? Math.round((0.4 + pseudo(sceneId * 100 + index) * 2.2) * 10) / 10 : 0
    })),
    editorial: {
      version: "2.0",
      scene: {
        id: scene.id,
        key: scene.key,
        title: scene.label,
        emoji: scene.emoji,
        visualIcon: scene.visualIcon
      },
      visual: {
        subtitle: scene24DisplayTitle(scene.id),
        primaryLine: preset.primaryLine,
        secondaryLine: preset.secondaryLine
      },
      social: {
        paragraph1: preset.paragraph1,
        paragraph2: preset.paragraph2,
        signature: "Ici, aujourd’hui.",
        handle: "@loka.tarnos",
        caption,
        hashtags
      },
      engagement: preset.engagement,
      facts
    },
    decision: {
      version: "2.0",
      doctrineVersion: "preview",
      validity: "VALID",
      decisionFamily: scene.family,
      resolutionMode: "DIRECT",
      familyReason: "preview_scene_forced",
      candidateSceneIds: [scene.id],
      sceneId: scene.id,
      sceneKey: scene.key,
      sceneLabel: scene.label,
      score: 0.99,
      confidence: "HIGH",
      runnerUp: null,
      candidates: [{ sceneId: scene.id, sceneKey: scene.key, score: 0.99, confidence: "HIGH", reasons: ["preview_scene_forced"], penalties: [] }],
      reasons: ["preview_scene_forced"],
      fallbackUsed: false,
      hysteresisApplied: false,
      invariantChecks: [{ name: "preview_scene_selected", pass: true, detail: "forced_for_visual_review" }],
      profileSummary: {
        preview: true,
        packScene: scene.id,
        displayTitle: scene24DisplayTitle(scene.id)
      }
    },
    models: { count: 0, ok: [], failed: {} }
  };
}
