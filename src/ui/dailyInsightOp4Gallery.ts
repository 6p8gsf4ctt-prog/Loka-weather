import type { CityConfig, OfficialPublicPayloadV24 } from "../types";
import type { DailyInsightLabPreviewResult } from "../dailyInsightLab";
import type { DailyComparisonStory } from "../engine/dailyComparison";
import type { WeeklyComplementaryTheme, WeeklyComplementaryVisual } from "../engine/weekly/complementarySlides";
import { complementaryPictogramDataUrl } from "../engine/weekly/complementaryPictograms";
import { renderInstagramDailyComparisonGraphic } from "./instagramDailyGraphicPreview";

interface Op4Scenario {
  group: "NIVEAU RARE" | "BASCULE HORAIRE" | "SÉRIE LOCALE" | "REPÈRE UTILE";
  score: number;
  reason: string;
  label: string;
  story: DailyComparisonStory;
}

interface ScenarioInput {
  canvasId: string;
  label: string;
  detectorId: string;
  theme: "TEMP_RARE" | "TEMP_SHIFT" | "WIND" | "WET_WEATHER" | "SEQUENCE" | "CALENDAR";
  format: "F1_RARETE_LOCALE" | "F2_EVOLUTION_RAPIDE" | "F3_SEQUENCE" | "F4_REPERE_SAISONNIER" | "F5_PHENOMENE_LOCAL";
  valueLabel: string;
  line1: string;
  line2: string;
  evidence: Array<{ label: string; value: string }>;
  masterUrl?: string;
  pictogramUrl?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

function model(args: ScenarioInput, _city: CityConfig, date: string): Pick<Op4Scenario, "label" | "story"> {
  const visual: WeeklyComplementaryVisual = args.theme === "WIND" ? "WIND"
    : args.theme === "WET_WEATHER" ? "RAIN"
      : args.theme === "CALENDAR" ? "SUN" : "THERMOMETER";
  const theme: WeeklyComplementaryTheme = args.theme === "WIND" ? "WIND"
    : args.theme === "WET_WEATHER" ? "WET_WEATHER"
      : args.theme === "CALENDAR" ? "LIGHT" : "TEMPERATURE";
  const useComparison = args.format === "F1_RARETE_LOCALE" || args.format === "F2_EVOLUTION_RAPIDE" || args.format === "F5_PHENOMENE_LOCAL";
  const comparisonItems = args.detectorId === "T08" ? args.evidence.slice(1, 3) : [args.evidence[0], args.evidence[args.evidence.length - 1]];
  const publicCopy: Record<string, { headline: string; subtitle: string; editorialLine?: string; sourceNote?: string }> = {
    T02: { headline: "34 °C AUJOURD’HUI", subtitle: "UNE TEMPÉRATURE PLUS ATTEINTE DEPUIS MARS" },
    T05: { headline: "8 °C CE MATIN", subtitle: "PARMI LES 5 % DES PLUS FRAIS DE LA PÉRIODE", editorialLine: "Une matinée particulièrement fraîche pour la saison.", sourceNote: "Seulement 5 % des matinées comparables ont été plus froides." },
    T08: { headline: "10 °C DE MOINS CE SOIR", subtitle: "DE 27 °C À 17 °C ENTRE 20 H ET 23 H", editorialLine: "La température devrait chuter rapidement ce soir." },
    V02: { headline: "RAFALES EN FORTE HAUSSE", subtitle: "DE 30 À 65 KM/H CET APRÈS-MIDI" },
    R02: { headline: "PLUIE APRÈS 18 JOURS", subtitle: "LE RETOUR D’UN TEMPS PLUS ARROSÉ AUJOURD’HUI" },
    S04: { headline: "4e JOUR PLUS CHAUD", subtitle: "ÉCART MOYEN : +4,2 °C AU-DESSUS DES NORMALES", editorialLine: "Quatrième journée plus chaude que d’habitude pour la saison." },
    C01: { headline: "CHANGEMENT D’HEURE", subtitle: "CETTE NUIT, PASSAGE À L’HEURE D’HIVER" },
    M01: { headline: "11 °C D’ÉCART", subtitle: "ENTRE L’AIR ET L’OCÉAN AUJOURD’HUI" }
  };
  const copy = publicCopy[args.detectorId];
  return {
    label: args.label,
    story: {
      version: "1.0.0",
      title: "À REMARQUER AUJOURD’HUI",
      signalId: `${date}:${args.detectorId}`,
      detector: args.detectorId,
      theme,
      visual,
      pictogramUrl: complementaryPictogramDataUrl(visual),
      presentation: {
        layout: useComparison && args.evidence.length >= 2 ? "COMPARISON" : "SINGLE_STAT",
        headline: copy?.headline ?? args.valueLabel,
        subtitle: copy?.subtitle ?? (args.format === "F1_RARETE_LOCALE" ? "UN REPÈRE DANS L’HISTOIRE MÉTÉO LOCALE"
          : args.format === "F2_EVOLUTION_RAPIDE" ? "LE CHANGEMENT PRINCIPAL DE LA JOURNÉE"
            : args.format === "F3_SEQUENCE" ? "UNE SÉQUENCE LOCALE À RETENIR"
              : args.format === "F4_REPERE_SAISONNIER" ? "UN REPÈRE CALENDAIRE UTILE" : "LE PHÉNOMÈNE LOCAL À RETENIR"),
        editorialLine: copy?.editorialLine ?? args.line1,
        comparison: useComparison && comparisonItems.length >= 2 ? {
          left: comparisonItems[0], right: comparisonItems[1]
        } : null
      },
      claimStatus: args.format === "F4_REPERE_SAISONNIER" ? "OBSERVED" : "EXPECTED",
      sourceNote: copy?.sourceNote ?? args.line2,
      frame: "DAILY_STORY_SHARED_V1"
    }
  };
}

export function dailyInsightOp4Scenarios(city: CityConfig, date: string): Op4Scenario[] {
  const base = "/masters24/03_ECLAIRCIES.png";
  return [
    {
      group: "NIVEAU RARE", score: 96, reason: "Dernière occurrence locale clairement datée.",
      ...model({ canvasId: "op4RareHeat", label: "Cas 1 · chaleur rare", masterUrl: base, detectorId: "T02", theme: "TEMP_RARE", format: "F1_RARETE_LOCALE", valueLabel: "6 MOIS", line1: "La journée la plus chaude depuis six mois pourrait se profiler.", line2: "Dernière valeur comparable observée le 18 mars.", evidence: [{ label: "Prévision", value: "34 °C" }, { label: "Dernière occurrence", value: "18 mars" }] }, city, date)
    },
    {
      group: "NIVEAU RARE", score: 91, reason: "Position explicite dans la distribution climatique locale.",
      ...model({ canvasId: "op4RareCool", label: "Cas 2 · fraîcheur inhabituelle", masterUrl: base, detectorId: "T05", theme: "TEMP_RARE", format: "F1_RARETE_LOCALE", valueLabel: "BAS 5 %", line1: "Une fraîcheur parmi les plus marquées pour la période.", line2: "8 °C prévus, comparés à 450 matinées locales.", evidence: [{ label: "Prévision", value: "8 °C" }, { label: "Seuil local P05", value: "9,4 °C" }] }, city, date)
    },
    {
      group: "BASCULE HORAIRE", score: 98, reason: "Variation forte, rapide et directement perceptible.",
      ...model({ canvasId: "op4ThermalDrop", label: "Cas 3 · chute thermique", masterUrl: base, detectorId: "T08", theme: "TEMP_SHIFT", format: "F2_EVOLUTION_RAPIDE", valueLabel: "−10 °C", line1: "Grosse chute des températures ce soir.", line2: "10 °C de moins en seulement trois heures.", evidence: [{ label: "Fenêtre", value: "20 h → 23 h" }, { label: "Départ", value: "27 °C" }, { label: "Arrivée", value: "17 °C" }] }, city, date)
    },
    {
      group: "BASCULE HORAIRE", score: 88, reason: "Renforcement utile pour organiser les déplacements.",
      ...model({ canvasId: "op4WindRise", label: "Cas 4 · renforcement du vent", masterUrl: "/masters24/10_VENT_FORT.png", detectorId: "V02", theme: "WIND", format: "F2_EVOLUTION_RAPIDE", valueLabel: "+35 KM/H", line1: "Le vent devrait nettement se renforcer cet après-midi.", line2: "Les rafales passeraient de 30 à 65 km/h.", evidence: [{ label: "12 h", value: "30 km/h" }, { label: "17 h", value: "65 km/h" }] }, city, date)
    },
    {
      group: "SÉRIE LOCALE", score: 94, reason: "Séquence observée et retour d’un phénomène attendu.",
      ...model({ canvasId: "op4RainReturn", label: "Cas 5 · retour de la pluie", masterUrl: "/masters24/12_PLUIE_SOUTENUE.png", detectorId: "R02", theme: "WET_WEATHER", format: "F3_SEQUENCE", valueLabel: "18 JOURS", line1: "La pluie pourrait faire son retour après 18 jours presque secs.", line2: "Environ 8 mm sont attendus aujourd’hui.", evidence: [{ label: "Séquence sèche", value: "18 jours" }, { label: "Cumul prévu", value: "8 mm" }] }, city, date)
    },
    {
      group: "SÉRIE LOCALE", score: 84, reason: "Jalon régulier, local et facile à comprendre.",
      ...model({ canvasId: "op4WarmSequence", label: "Cas 6 · série douce", masterUrl: base, detectorId: "S04", theme: "SEQUENCE", format: "F3_SEQUENCE", valueLabel: "4 JOURS", line1: "Quatrième journée consécutive au-dessus des normales locales.", line2: "La série a commencé dimanche.", evidence: [{ label: "Durée", value: "4 jours" }, { label: "Écart moyen", value: "+4,2 °C" }] }, city, date)
    },
    {
      group: "REPÈRE UTILE", score: 100, reason: "Événement certain, rare et immédiatement partageable.",
      ...model({ canvasId: "op4Clock", label: "Cas 7 · changement d’heure", masterUrl: base, detectorId: "C01", theme: "CALENDAR", format: "F4_REPERE_SAISONNIER", valueLabel: "−1 HEURE", line1: "Cette nuit, nous passons à l’heure d’hiver.", line2: "À 3 h, il sera de nouveau 2 h.", evidence: [{ label: "Fuseau", value: "Europe/Paris" }, { label: "Bascule", value: "03 h → 02 h" }] }, city, date)
    },
    {
      group: "REPÈRE UTILE", score: 90, reason: "Phénomène côtier local, concret et différenciant.",
      ...model({ canvasId: "op4SeaAir", label: "Cas 8 · contraste océan", masterUrl: base, detectorId: "M01", theme: "CALENDAR", format: "F5_PHENOMENE_LOCAL", valueLabel: "11 °C", line1: "Un net contraste entre la plage et l’océan aujourd’hui.", line2: "29 °C dans l’air contre environ 18 °C dans l’eau.", evidence: [{ label: "Air", value: "29 °C" }, { label: "Océan", value: "18 °C" }] }, city, date)
    }
  ];
}

export function renderDailyInsightOp4Gallery(city: CityConfig, date: string, actual: DailyInsightLabPreviewResult): string {
  const scenarios = dailyInsightOp4Scenarios(city, date);
  const winner = actual.selection?.winner ?? null;
  const actualStatus = winner ? `${winner.detectorId} · ${winner.score.final}/100` : "SILENCE ÉDITORIAL";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · OP4 Galerie éditoriale</title><style>
  :root{--ink:#12264a;--gold:#fdb515;--paper:#eef2f7;--line:#d8e0eb;--muted:#64748b;--green:#087f5b}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1320px,calc(100% - 28px));margin:30px auto 70px}.top{display:flex;justify-content:space-between;align-items:end;gap:20px}.brand{font-size:38px;font-weight:900}.brand i{color:var(--gold);font-style:normal}h1{margin:5px 0 0}.meta{text-align:right;color:var(--muted)}.guard{margin:22px 0;padding:18px 22px;border-radius:18px;background:var(--ink);color:white}.guard b{color:var(--gold)}.actual{display:flex;justify-content:space-between;gap:20px;background:white;border:1px solid var(--line);border-radius:18px;padding:18px 22px}.actual span{color:var(--muted)}.actual strong{font-size:20px}.rules{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 32px}.rule{background:white;border:1px solid var(--line);border-radius:16px;padding:16px}.rule b{display:block}.rule small{color:var(--muted)}.group{margin:34px 0 14px;display:flex;align-items:end;justify-content:space-between}.group h2{margin:0}.group span{color:var(--muted)}.stories{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.scenario{min-width:0}.scenario-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;padding:0 4px}.scenario-meta span{color:var(--muted);font-size:12px}.score{font-size:20px;font-weight:900;color:var(--green)}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block}.story-head span,.story-head small{display:block;color:var(--muted);font-size:12px}.story-canvas{border-radius:22px;overflow:hidden;background:#ccd5e0;box-shadow:0 16px 45px #1737671c}.story-canvas canvas{width:100%;height:auto;display:block}.story-card button{width:100%;margin-top:9px;border:0;border-radius:13px;padding:13px;background:var(--ink);color:white;font-weight:800}.silence{margin-top:28px;padding:22px;border:2px dashed #aab7c8;border-radius:18px;background:white}.silence b{display:block;font-size:21px}.silence p{margin-bottom:0;color:var(--muted)}@media(max-width:800px){.top,.actual{display:block}.meta{text-align:left;margin-top:8px}.rules,.stories{grid-template-columns:1fr}}
  .shared-frame{width:100%;aspect-ratio:9/16;border:0;border-radius:22px;background:#ccd5e0;box-shadow:0 16px 45px #1737671c}
  </style></head><body><main><header class="top"><div><div class="brand">LOKA<i>!</i></div><h1>OP4 · Galerie éditoriale comparative</h1></div><div class="meta">${escapeHtml(city.name)} · ${escapeHtml(date)}<br>LABORATOIRE UNIQUEMENT</div></header><section class="guard"><b>AUCUNE PUBLICATION AUTOMATIQUE</b><br>Les huit scènes sont des cas de contrôle. Chaque aperçu est produit par le moteur graphique Daily partagé, sans moteur graphique OP4.</section><section class="actual"><div><span>Décision réelle du jour après hiérarchisation OP4</span><strong>${escapeHtml(actualStatus)}</strong></div><div><span>Candidats calculés</span><strong>${actual.selection?.audit.generated ?? 0} · ${actual.selection?.audit.eligible ?? 0} éligible(s)</strong></div></section><section class="rules"><article class="rule"><b>Niveau rare</b><small>Occurrence, percentile ou record local prouvé.</small></article><article class="rule"><b>Bascule horaire</b><small>Évolution forte et perceptible en quelques heures.</small></article><article class="rule"><b>Série locale</b><small>Durée observée ou enchaînement remarquable.</small></article><article class="rule"><b>Repère utile</b><small>Événement certain, pratique ou typiquement local.</small></article></section>${["NIVEAU RARE","BASCULE HORAIRE","SÉRIE LOCALE","REPÈRE UTILE"].map((group) => `<section><header class="group"><h2>${group}</h2><span>2 scénarios de contrôle</span></header><div class="stories">${scenarios.filter((scenario) => scenario.group === group).map((scenario) => `<article class="scenario"><div class="scenario-meta"><div><b>${escapeHtml(scenario.label)}</b><span>${escapeHtml(scenario.reason)}</span></div><div class="score">${scenario.score}/100</div></div><iframe class="shared-frame" loading="lazy" title="${escapeHtml(scenario.label)}" src="/daily-insight-op4-scenario?city=${encodeURIComponent(city.slug)}&date=${encodeURIComponent(date)}&case=${encodeURIComponent(scenario.story.detector)}"></iframe></article>`).join("")}</div></section>`).join("")}<section class="silence"><b>Cas obligatoire : silence éditorial</b><p>Si aucun fait ne franchit son seuil d’intérêt propre, aucune STORY n’est proposée. Une donnée techniquement correcte mais faible ne devient plus automatiquement un contenu Instagram.</p></section></main></body></html>`;
}

export function renderDailyInsightOp4Scenario(
  payload: OfficialPublicPayloadV24,
  city: CityConfig,
  date: string,
  caseId: string
): string | null {
  const scenario = dailyInsightOp4Scenarios(city, date).find((item) => item.story.detector === caseId);
  return scenario ? renderInstagramDailyComparisonGraphic(payload, city, scenario.story) : null;
}
