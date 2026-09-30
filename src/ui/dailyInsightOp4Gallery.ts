import type { CityConfig } from "../types";
import type { DailyInsightLabPreviewResult } from "../dailyInsightLab";
import { LOKA_LOGO_DATA_URL } from "./lokaBrand";
import { solarPictogramDataUrl, temperaturePictogramDataUrl, weatherPictogramDataUrl } from "./pictogramLibrary";
import { dailyInsightCanvasCard, dailyInsightStoryRuntime, type DailyInsightStoryModel } from "./dailyInsightStory";

interface Op4Scenario {
  group: "NIVEAU RARE" | "BASCULE HORAIRE" | "SÉRIE LOCALE" | "REPÈRE UTILE";
  score: number;
  reason: string;
  model: DailyInsightStoryModel;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

function model(args: Omit<DailyInsightStoryModel, "version" | "city" | "date" | "timezone" | "logoUrl">, city: CityConfig, date: string): DailyInsightStoryModel {
  return { version: "1.0.0", city: city.name, date, timezone: city.timezone, logoUrl: LOKA_LOGO_DATA_URL, ...args };
}

export function dailyInsightOp4Scenarios(city: CityConfig, date: string): Op4Scenario[] {
  const base = "/masters24/03_ECLAIRCIES.png";
  return [
    {
      group: "NIVEAU RARE", score: 96, reason: "Dernière occurrence locale clairement datée.",
      model: model({ canvasId: "op4RareHeat", label: "Cas 1 · chaleur rare", masterUrl: base, pictogramUrl: temperaturePictogramDataUrl("thermometer"), detectorId: "T02", theme: "TEMP_RARE", format: "F1_RARETE_LOCALE", valueLabel: "6 MOIS", line1: "La journée la plus chaude depuis six mois pourrait se profiler.", line2: "Dernière valeur comparable observée le 18 mars.", evidence: [{ label: "Prévision", value: "34 °C" }, { label: "Dernière occurrence", value: "18 mars" }] }, city, date)
    },
    {
      group: "NIVEAU RARE", score: 91, reason: "Position explicite dans la distribution climatique locale.",
      model: model({ canvasId: "op4RareCool", label: "Cas 2 · fraîcheur inhabituelle", masterUrl: base, pictogramUrl: temperaturePictogramDataUrl("thermometer"), detectorId: "T05", theme: "TEMP_RARE", format: "F1_RARETE_LOCALE", valueLabel: "BAS 5 %", line1: "Une fraîcheur parmi les plus marquées pour la période.", line2: "8 °C prévus, comparés à 450 matinées locales.", evidence: [{ label: "Prévision", value: "8 °C" }, { label: "Seuil local P05", value: "9,4 °C" }] }, city, date)
    },
    {
      group: "BASCULE HORAIRE", score: 98, reason: "Variation forte, rapide et directement perceptible.",
      model: model({ canvasId: "op4ThermalDrop", label: "Cas 3 · chute thermique", masterUrl: base, pictogramUrl: temperaturePictogramDataUrl("thermometer"), detectorId: "T08", theme: "TEMP_SHIFT", format: "F2_EVOLUTION_RAPIDE", valueLabel: "−10 °C", line1: "Grosse chute des températures ce soir.", line2: "10 °C de moins en seulement trois heures.", evidence: [{ label: "Fenêtre", value: "20 h → 23 h" }, { label: "Départ", value: "27 °C" }, { label: "Arrivée", value: "17 °C" }] }, city, date)
    },
    {
      group: "BASCULE HORAIRE", score: 88, reason: "Renforcement utile pour organiser les déplacements.",
      model: model({ canvasId: "op4WindRise", label: "Cas 4 · renforcement du vent", masterUrl: "/masters24/10_VENT_FORT.png", pictogramUrl: weatherPictogramDataUrl("wind"), detectorId: "V02", theme: "WIND", format: "F2_EVOLUTION_RAPIDE", valueLabel: "+35 KM/H", line1: "Le vent devrait nettement se renforcer cet après-midi.", line2: "Les rafales passeraient de 30 à 65 km/h.", evidence: [{ label: "12 h", value: "30 km/h" }, { label: "17 h", value: "65 km/h" }] }, city, date)
    },
    {
      group: "SÉRIE LOCALE", score: 94, reason: "Séquence observée et retour d’un phénomène attendu.",
      model: model({ canvasId: "op4RainReturn", label: "Cas 5 · retour de la pluie", masterUrl: "/masters24/12_PLUIE_SOUTENUE.png", pictogramUrl: weatherPictogramDataUrl("rain"), detectorId: "R02", theme: "WET_WEATHER", format: "F3_SEQUENCE", valueLabel: "18 JOURS", line1: "La pluie pourrait faire son retour après 18 jours presque secs.", line2: "Environ 8 mm sont attendus aujourd’hui.", evidence: [{ label: "Séquence sèche", value: "18 jours" }, { label: "Cumul prévu", value: "8 mm" }] }, city, date)
    },
    {
      group: "SÉRIE LOCALE", score: 84, reason: "Jalon régulier, local et facile à comprendre.",
      model: model({ canvasId: "op4WarmSequence", label: "Cas 6 · série douce", masterUrl: base, pictogramUrl: temperaturePictogramDataUrl("thermometer"), detectorId: "S04", theme: "SEQUENCE", format: "F3_SEQUENCE", valueLabel: "4 JOURS", line1: "Quatrième journée consécutive au-dessus des normales locales.", line2: "La série a commencé dimanche.", evidence: [{ label: "Durée", value: "4 jours" }, { label: "Écart moyen", value: "+4,2 °C" }] }, city, date)
    },
    {
      group: "REPÈRE UTILE", score: 100, reason: "Événement certain, rare et immédiatement partageable.",
      model: model({ canvasId: "op4Clock", label: "Cas 7 · changement d’heure", masterUrl: base, pictogramUrl: solarPictogramDataUrl("sunrise"), detectorId: "C01", theme: "CALENDAR", format: "F4_REPERE_SAISONNIER", valueLabel: "−1 HEURE", line1: "Cette nuit, nous passons à l’heure d’hiver.", line2: "À 3 h, il sera de nouveau 2 h.", evidence: [{ label: "Fuseau", value: "Europe/Paris" }, { label: "Bascule", value: "03 h → 02 h" }] }, city, date)
    },
    {
      group: "REPÈRE UTILE", score: 90, reason: "Phénomène côtier local, concret et différenciant.",
      model: model({ canvasId: "op4SeaAir", label: "Cas 8 · contraste océan", masterUrl: base, pictogramUrl: solarPictogramDataUrl("sunrise"), detectorId: "M01", theme: "CALENDAR", format: "F5_PHENOMENE_LOCAL", valueLabel: "11 °C", line1: "Un net contraste entre la plage et l’océan aujourd’hui.", line2: "29 °C dans l’air contre environ 18 °C dans l’eau.", evidence: [{ label: "Air", value: "29 °C" }, { label: "Océan", value: "18 °C" }] }, city, date)
    }
  ];
}

export function renderDailyInsightOp4Gallery(city: CityConfig, date: string, actual: DailyInsightLabPreviewResult): string {
  const scenarios = dailyInsightOp4Scenarios(city, date);
  const winner = actual.selection?.winner ?? null;
  const actualStatus = winner ? `${winner.detectorId} · ${winner.score.final}/100` : "SILENCE ÉDITORIAL";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · OP4 Galerie éditoriale</title><style>
  :root{--ink:#12264a;--gold:#fdb515;--paper:#eef2f7;--line:#d8e0eb;--muted:#64748b;--green:#087f5b}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{width:min(1320px,calc(100% - 28px));margin:30px auto 70px}.top{display:flex;justify-content:space-between;align-items:end;gap:20px}.brand{font-size:38px;font-weight:900}.brand i{color:var(--gold);font-style:normal}h1{margin:5px 0 0}.meta{text-align:right;color:var(--muted)}.guard{margin:22px 0;padding:18px 22px;border-radius:18px;background:var(--ink);color:white}.guard b{color:var(--gold)}.actual{display:flex;justify-content:space-between;gap:20px;background:white;border:1px solid var(--line);border-radius:18px;padding:18px 22px}.actual span{color:var(--muted)}.actual strong{font-size:20px}.rules{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:20px 0 32px}.rule{background:white;border:1px solid var(--line);border-radius:16px;padding:16px}.rule b{display:block}.rule small{color:var(--muted)}.group{margin:34px 0 14px;display:flex;align-items:end;justify-content:space-between}.group h2{margin:0}.group span{color:var(--muted)}.stories{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:24px}.scenario{min-width:0}.scenario-meta{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px;padding:0 4px}.scenario-meta span{color:var(--muted);font-size:12px}.score{font-size:20px;font-weight:900;color:var(--green)}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block}.story-head span,.story-head small{display:block;color:var(--muted);font-size:12px}.story-canvas{border-radius:22px;overflow:hidden;background:#ccd5e0;box-shadow:0 16px 45px #1737671c}.story-canvas canvas{width:100%;height:auto;display:block}.story-card button{width:100%;margin-top:9px;border:0;border-radius:13px;padding:13px;background:var(--ink);color:white;font-weight:800}.silence{margin-top:28px;padding:22px;border:2px dashed #aab7c8;border-radius:18px;background:white}.silence b{display:block;font-size:21px}.silence p{margin-bottom:0;color:var(--muted)}@media(max-width:800px){.top,.actual{display:block}.meta{text-align:left;margin-top:8px}.rules,.stories{grid-template-columns:1fr}}
  </style></head><body><main><header class="top"><div><div class="brand">LOKA<i>!</i></div><h1>OP4 · Galerie éditoriale comparative</h1></div><div class="meta">${escapeHtml(city.name)} · ${escapeHtml(date)}<br>LABORATOIRE UNIQUEMENT</div></header><section class="guard"><b>AUCUNE PUBLICATION AUTOMATIQUE</b><br>Les huit scènes sont des cas de contrôle. Elles n’écrivent ni dans le moteur Daily officiel ni sur Instagram.</section><section class="actual"><div><span>Décision réelle du jour après hiérarchisation OP4</span><strong>${escapeHtml(actualStatus)}</strong></div><div><span>Candidats calculés</span><strong>${actual.selection?.audit.generated ?? 0} · ${actual.selection?.audit.eligible ?? 0} éligible(s)</strong></div></section><section class="rules"><article class="rule"><b>Niveau rare</b><small>Occurrence, percentile ou record local prouvé.</small></article><article class="rule"><b>Bascule horaire</b><small>Évolution forte et perceptible en quelques heures.</small></article><article class="rule"><b>Série locale</b><small>Durée observée ou enchaînement remarquable.</small></article><article class="rule"><b>Repère utile</b><small>Événement certain, pratique ou typiquement local.</small></article></section>${["NIVEAU RARE","BASCULE HORAIRE","SÉRIE LOCALE","REPÈRE UTILE"].map((group) => `<section><header class="group"><h2>${group}</h2><span>2 scénarios de contrôle</span></header><div class="stories">${scenarios.filter((scenario) => scenario.group === group).map((scenario) => `<article class="scenario"><div class="scenario-meta"><div><b>${escapeHtml(scenario.model.label)}</b><span>${escapeHtml(scenario.reason)}</span></div><div class="score">${scenario.score}/100</div></div>${dailyInsightCanvasCard(scenario.model)}</article>`).join("")}</div></section>`).join("")}<section class="silence"><b>Cas obligatoire : silence éditorial</b><p>Si aucun fait ne franchit son seuil d’intérêt propre, aucune STORY n’est proposée. Une donnée techniquement correcte mais faible ne devient plus automatiquement un contenu Instagram.</p></section></main>${dailyInsightStoryRuntime(scenarios.map((scenario) => scenario.model))}</body></html>`;
}
