import type { V24OfficialPublicPayload } from "../engine/publicProduct";

function esc(value: unknown): string {
  return String(value ?? "").replace(
    /[&<>'"]/g,
    (c) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    }[c] as string)
  );
}

function dateLabel(date: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date(`${date}T12:00:00`));
  } catch {
    return date;
  }
}

function glyph(condition: string): string {
  const c = String(condition || "").toLowerCase();
  if (c.includes("orage")) return "ϟ";
  if (c.includes("pluie") || c.includes("averse")) return "☂︎";
  if (c.includes("soleil")) return "☀︎";
  if (c.includes("vent")) return "≋";
  if (c.includes("couvert")) return "●";
  return "◐";
}

export function renderDashboard24(
  p: V24OfficialPublicPayload,
  timezone: string
): string {
  const hours = p.hourly.slice(0, 6);

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>LOKA! — ${esc(p.city)}</title><style>
*{box-sizing:border-box}body{margin:0;background:#f3f1ed;color:#22272d;font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;padding:18px 14px 28px}.shell{width:min(100%,580px);margin:auto;min-height:calc(100vh - 46px);display:flex;flex-direction:column}.top{display:flex;justify-content:space-between}.brand{font-size:12px;letter-spacing:.16em;color:#777}.engine{font-size:10px;color:#999;text-align:right}.intro{text-align:center;padding-top:38px}.city{font-size:17px;letter-spacing:.24em}.date{font-size:13px;color:#777;margin-top:8px}.scene{text-align:center;padding:26px 0 20px}.scene small{color:#999;letter-spacing:.12em}.scene h1{font-size:clamp(32px,8vw,46px);margin:8px 0}.hero{position:relative;border-radius:30px;overflow:hidden;height:310px;background:#ddd;box-shadow:0 18px 60px rgba(0,0,0,.10)}.hero img{width:100%;height:100%;object-fit:cover}.shade{position:absolute;inset:0;background:linear-gradient(to bottom,rgba(0,0,0,.04),rgba(0,0,0,.50))}.verdict{position:absolute;left:22px;right:22px;bottom:22px;color:#fff;font-size:24px;font-weight:650}.temps{text-align:center;padding:25px 0}.max{font-size:84px;line-height:.9;font-weight:320}.min{font-size:12px;color:#999;margin-top:12px}.hours{display:grid;grid-template-columns:repeat(6,1fr);background:rgba(255,255,255,.82);padding:20px 8px;border-radius:28px}.hour{text-align:center;display:grid;gap:8px}.hour span{font-size:10px;color:#92969a}.icon{font-size:21px;color:#d3a74b}.hour strong{font-size:16px;font-weight:500}.summary{margin-top:15px;background:rgba(255,255,255,.62);border-radius:24px;padding:18px 21px}.title{text-transform:uppercase;letter-spacing:.14em;color:#aaa;font-size:9px}.line{font-size:17px;line-height:1.35;padding:9px 0;border-top:1px solid rgba(0,0,0,.06)}.line:first-of-type{margin-top:5px;border-top:0}.ig{display:block;margin-top:14px;padding:15px;text-align:center;text-decoration:none;background:#171715;color:#fff;border-radius:18px;font-size:14px;font-weight:650}footer{margin-top:auto;padding-top:30px;text-align:center;color:#aaa;font-family:Georgia,serif;font-style:italic}
</style></head><body><main class="shell"><header class="top"><div class="brand">LOKA!</div><div class="engine">MOTEUR<br><strong>V24</strong></div></header><section class="intro"><div class="city">${esc(p.city.toUpperCase())}</div><div class="date">${esc(dateLabel(p.date,timezone))}</div></section><section class="scene"><small>${String(p.scene.id).padStart(2,"0")} · ${esc(p.scene.key)}</small><h1>${esc(p.scene.label)}</h1><small>${esc(p.scene.family)}</small></section><section class="hero"><img src="${esc(p.scene.masterUrl)}" alt=""><div class="shade"></div><div class="verdict">${esc(p.editorial.mainVerdict)}</div></section><section class="temps"><div class="max">${p.temperatures.maxC}°</div><div class="min">minimum ${p.temperatures.minC}°</div></section><section class="hours">${hours.map(h=>`<div class="hour"><span>${h.hour}h</span><div class="icon">${glyph(h.condition)}</div><strong>${h.temperatureC}°</strong></div>`).join("")}</section><section class="summary"><div class="title">Aujourd’hui</div>${p.editorial.summaryLines.map(l=>`<div class="line">${esc(l)}</div>`).join("")}</section>${p.editorial.notableEvent?`<section class="summary"><div class="title">À noter</div><div class="line">${esc(p.editorial.notableEvent)}</div></section>`:""}<a class="ig" href="/instagram">Créer le visuel Instagram</a><footer>Ici, aujourd’hui.</footer></main></body></html>`;
}
