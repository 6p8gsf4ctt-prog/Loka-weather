import type { CityConfig } from "../types";
import type { DailyInsightOp5Decision } from "../engine/dailyInsight/op5Rollout";
import { buildDailyInsightV2StoryModel } from "./dailyInsightLabPreview";
import { dailyInsightCanvasCard, dailyInsightStoryRuntime } from "./dailyInsightStory";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char]!));
}

export function renderDailyInsightOp5Story(city: CityConfig, targetDate: string, rollout: DailyInsightOp5Decision): string {
  const winner = rollout.selection?.winner;
  if (!winner) throw new Error("daily_insight_op5_winner_missing");
  const model = buildDailyInsightV2StoryModel(city, targetDate, winner, "dailyInsightOp5Story", "STORY comparative Daily");
  const age = rollout.draftAgeHours === null ? "—" : `${rollout.draftAgeHours.toFixed(1)} h`;
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA · Daily Insight OP5</title><style>
  :root{--ink:#12264a;--paper:#eef2f7;--muted:#64748b;--gold:#fdb515}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif}main{width:min(570px,calc(100% - 24px));margin:24px auto 60px}.status{display:flex;justify-content:space-between;gap:12px;align-items:end;margin-bottom:14px}.status b{display:block;font-size:20px}.status span,.status small{display:block;color:var(--muted);font-size:12px}.story-head{display:flex;justify-content:space-between;align-items:end;margin-bottom:10px}.story-head b{display:block;font-size:18px}.story-head span,.story-head small{display:block;color:var(--muted);font-size:12px}.story-canvas{border-radius:24px;overflow:hidden;box-shadow:0 18px 55px #17376720;background:#cad4e1}.story-canvas canvas{display:block;width:100%;height:auto}.story-card button{width:100%;margin-top:10px;border:0;border-radius:14px;padding:15px;background:var(--ink);color:white;font-weight:800;cursor:pointer}.safety{margin-top:12px;padding:14px 16px;background:white;border-radius:16px;color:var(--muted);font-size:12px;line-height:1.5}.safety strong{color:var(--ink)}
  </style></head><body><main><header class="status"><div><b>LOKA · Daily Insight</b><span>${escapeHtml(city.name)} · ${escapeHtml(targetDate)}</span></div><small>OP5 ACTIVE · cache ${escapeHtml(age)}</small></header>${dailyInsightCanvasCard(model)}<div class="safety"><strong>Publication contrôlée.</strong> Export manuel uniquement. Le moteur Daily officiel reste inchangé et l’arrêt d’urgence OP5 rebascule immédiatement sur l’ancien moteur comparatif.</div></main>${dailyInsightStoryRuntime([model])}</body></html>`;
}

