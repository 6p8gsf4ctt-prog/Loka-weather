import type { OfficialPublicPayloadV24 } from "../types";

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[c] as string));
}
function dateLabel(date: string, timezone: string): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: timezone, weekday: "long", day: "numeric", month: "long" }).format(new Date(`${date}T12:00:00Z`));
}
function glyph(condition: string): string {
  if (condition === "orage") return "ϟ";
  if (condition === "pluie" || condition === "averse") return "☂";
  if (condition === "brouillard") return "≡";
  if (condition === "vent") return "≋";
  if (condition === "soleil") return "☀";
  if (condition === "couvert") return "●";
  return "◐";
}

export function renderDashboard24(p: OfficialPublicPayloadV24, timezone: string): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — ${esc(p.city)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#071b3b;color:#fff;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:18px 14px 34px}.shell{width:min(100%,620px);margin:auto}.top{display:flex;justify-content:space-between;align-items:flex-start}.brand{font-size:24px;font-weight:800;letter-spacing:-.04em}.tag{font-size:10px;letter-spacing:.16em;color:#fdb515;text-align:right}.intro{text-align:center;padding:34px 0 18px}.city{font-size:15px;letter-spacing:.28em}.date{font-size:13px;color:#bfc8d8;margin-top:8px;text-transform:capitalize}.scene{text-align:center;padding:8px 0 22px}.scene small{font-size:10px;letter-spacing:.14em;color:#fdb515}.scene h1{font-size:clamp(32px,8vw,48px);line-height:1;margin:10px 0}.hero{height:310px;border-radius:30px;overflow:hidden;position:relative;background:#10284e;box-shadow:0 18px 60px rgba(0,0,0,.35)}.hero img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(7,27,59,.05),rgba(7,27,59,.78))}.heroText{position:absolute;left:24px;right:24px;bottom:22px}.heroText strong{display:block;font-size:22px}.heroText span{display:block;margin-top:7px;color:#e7edf6;line-height:1.35}.temps{text-align:center;padding:25px 0 18px}.temps strong{font-size:66px;font-weight:350}.temps span{display:block;color:#bfc8d8;margin-top:5px}.hours{display:grid;grid-template-columns:repeat(5,1fr);gap:8px}.hour{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);border-radius:18px;padding:12px 4px;text-align:center}.hour time{font-size:10px;color:#bfc8d8}.hour i{display:block;font-style:normal;color:#fdb515;font-size:20px;margin:7px}.hour b{font-size:15px}.summary{margin-top:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.10);border-radius:24px;padding:18px 20px}.summary div+div{border-top:1px solid rgba(255,255,255,.09);margin-top:12px;padding-top:12px}.ig{display:block;margin-top:16px;background:#fdb515;color:#071b3b;text-align:center;padding:15px;border-radius:18px;text-decoration:none;font-weight:800}footer{text-align:center;color:#bfc8d8;margin-top:28px;font-family:Georgia,serif;font-style:italic}
</style></head><body><main class="shell"><header class="top"><div class="brand">LOKA!</div><div class="tag">SCENE ENGINE<br>V2</div></header><section class="intro"><div class="city">${esc(p.city.toUpperCase())}</div><div class="date">${esc(dateLabel(p.date,timezone))}</div></section><section class="scene"><small>${String(p.scene.id).padStart(2,"0")} · ${esc(p.scene.key)}</small><h1>${esc(p.scene.label)}</h1></section><section class="hero"><img src="${esc(p.scene.masterUrl)}" alt=""><div class="shade"></div><div class="heroText"><strong>${esc(p.editorial.visual.subtitle)}</strong><span>${esc(p.editorial.visual.primaryLine)}</span></div></section><section class="temps"><strong>${p.temperatures.maxC}°</strong><span>minimum ${p.temperatures.minC}°</span></section><section class="hours">${p.hourly.map(h=>`<div class="hour"><time>${h.hour}h</time><i>${glyph(h.condition)}</i><b>${h.temperatureC}°</b></div>`).join("")}</section><section class="summary"><div>${esc(p.editorial.visual.primaryLine)}</div><div>${esc(p.editorial.visual.secondaryLine)}</div></section><a class="ig" href="/instagram">Créer le visuel Instagram</a><footer>Ici, aujourd’hui.</footer></main></body></html>`;
}
