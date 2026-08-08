import type { LokaForecast } from "../types";

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c] as string));
}

function weatherGlyph(condition: string): string {
  if (condition === "soleil") return "☀︎";
  if (condition === "peu nuageux") return "◒";
  if (condition === "couvert") return "●";
  if (condition === "nuageux") return "◐";
  if (condition === "pluie" || condition === "averse") return "☂︎";
  return "◑";
}

function formatForecastDate(date: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      weekday: "long",
      day: "numeric",
      month: "long"
    }).format(new Date(`${date}T12:00:00+02:00`));
  } catch {
    return date;
  }
}

function formatGeneratedAt(value: string): string {
  try {
    return new Intl.DateTimeFormat("fr-FR", {
      timeZone: "Europe/Paris",
      hour: "2-digit",
      minute: "2-digit"
    }).format(new Date(value));
  } catch {
    return "";
  }
}

export function renderDashboard(forecast: LokaForecast | null): string {
  const content = forecast ? `
    <main class="shell">
      <header class="topbar">
        <div class="brand">LOKA!</div>
        <div class="update">mis à jour à ${esc(formatGeneratedAt(forecast.generatedAt))}</div>
      </header>

      <section class="intro">
        <div class="city">${esc(forecast.city.toUpperCase())}</div>
        <div class="date">${esc(formatForecastDate(forecast.date))}</div>
      </section>

      <section class="hero">
        <div class="temperature">${forecast.tempMaxC}<sup>°</sup></div>
        <div class="minimum">minimum ${forecast.tempMinC}°</div>
        <h1>${esc(forecast.mainVerdict)}</h1>
      </section>

      <section class="hours" aria-label="Évolution de la journée">
        ${forecast.hourly.map((h) => `
          <div class="hour">
            <span class="hour-time">${h.hour}h</span>
            <span class="icon">${weatherGlyph(h.condition)}</span>
            <strong>${h.temperatureC}°</strong>
          </div>
        `).join("")}
      </section>

      <section class="decision">
        <div class="decision-label">Aujourd’hui</div>
        <div class="decision-text">${esc(forecast.rainVerdict)}</div>
      </section>

      ${forecast.notableEvent ? `
        <section class="notable">
          <span class="notable-dot"></span>
          <span>${esc(forecast.notableEvent)}</span>
        </section>
      ` : ""}

      <footer>Ici, aujourd’hui.</footer>
    </main>
  ` : `
    <main class="shell empty">
      <div class="brand">LOKA!</div>
      <div class="empty-mark"></div>
      <h1>Aucune prévision enregistrée.</h1>
      <p>La météo de Tarnos apparaîtra ici dès la prochaine génération.</p>
    </main>
  `;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#f3f1ed" />
<title>LOKA! — Tarnos</title>
<style>
:root{color-scheme:light;--ink:#22272d;--secondary:#7b8085;--paper:#f3f1ed;--surface:rgba(255,255,255,.78);--line:rgba(56,62,68,.08);--accent:#d6a84a}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;min-height:100%}
body{min-height:100vh;background:radial-gradient(circle at 76% 8%,rgba(255,229,174,.32),transparent 26rem),radial-gradient(circle at 4% 92%,rgba(197,214,229,.34),transparent 30rem),var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","SF Pro Text","Helvetica Neue",Arial,sans-serif;padding:max(20px,env(safe-area-inset-top)) 14px max(28px,env(safe-area-inset-bottom))}
.shell{width:min(100%,580px);min-height:calc(100vh - 48px);margin:0 auto;padding:24px 18px 28px;display:flex;flex-direction:column}
.topbar{display:flex;align-items:center;justify-content:space-between;min-height:28px}
.brand{font-size:12px;line-height:1;font-weight:620;letter-spacing:.16em;color:#77736e}
.update{color:#a3a09b;font-size:11px}
.intro{text-align:center;padding-top:46px}
.city{font-size:17px;font-weight:560;letter-spacing:.24em;padding-left:.24em}
.date{margin-top:8px;color:var(--secondary);font-size:13px;text-transform:capitalize}
.hero{text-align:center;padding:28px 0 38px}
.temperature{font-size:clamp(96px,31vw,156px);line-height:.82;font-weight:300;letter-spacing:-.075em;color:#1f2730}
.temperature sup{font-size:.33em;vertical-align:top;position:relative;top:.07em;margin-left:.03em;font-weight:330}
.minimum{margin-top:20px;color:#999691;font-size:12px}
h1{font-size:clamp(23px,6.2vw,32px);line-height:1.16;letter-spacing:-.04em;font-weight:470;margin:22px auto 0;max-width:430px}
.hours{background:var(--surface);border:1px solid rgba(255,255,255,.84);border-radius:34px;padding:22px 11px 21px;display:grid;grid-template-columns:repeat(6,minmax(0,1fr));box-shadow:0 16px 55px rgba(44,48,52,.055),inset 0 1px rgba(255,255,255,.8);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
.hour{min-width:0;text-align:center;display:grid;justify-items:center;gap:10px;position:relative}
.hour + .hour:before{content:"";position:absolute;left:0;top:4px;bottom:4px;width:1px;background:var(--line)}
.hour-time{color:#8e9296;font-size:11px;font-weight:520}
.icon{font-size:24px;line-height:1;color:var(--accent)}
.hour strong{font-size:17px;font-weight:430;letter-spacing:-.025em;color:#333941}
.decision{margin-top:18px;background:rgba(255,255,255,.46);border:1px solid rgba(255,255,255,.68);border-radius:27px;padding:22px 24px;text-align:center}
.decision-label{color:#a19e99;text-transform:uppercase;letter-spacing:.16em;font-size:9px;font-weight:600}
.decision-text{margin-top:7px;font-size:20px;font-weight:490;letter-spacing:-.025em}
.notable{margin-top:12px;border-radius:23px;padding:17px 20px;display:flex;justify-content:center;align-items:center;gap:10px;background:rgba(234,225,207,.72);color:#554d42;font-size:14px;font-weight:500;text-align:center}
.notable-dot{width:6px;height:6px;flex:0 0 auto;border-radius:99px;background:var(--accent)}
footer{margin-top:auto;padding-top:34px;text-align:center;color:#aaa6a0;font-family:Georgia,"Times New Roman",serif;font-size:17px;font-style:italic}
.empty{justify-content:center;text-align:center}
.empty-mark{width:44px;height:2px;background:#d7b86e;margin:0 auto 32px;border-radius:99px}
.empty h1{margin:0 auto}
.empty p{color:var(--secondary);line-height:1.55;max-width:360px;margin:18px auto 0}
@media(max-width:390px){body{padding-left:8px;padding-right:8px}.shell{padding-left:12px;padding-right:12px}.hours{padding-left:5px;padding-right:5px;border-radius:29px}.hour{gap:8px}.icon{font-size:21px}.hour strong{font-size:15px}}
</style>
</head>
<body>${content}</body>
</html>`;
}

export function renderAdmin(): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>LOKA Admin</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#f5f5f2;color:#171715;margin:0;padding:24px}.box{max-width:520px;margin:auto;background:#fff;border-radius:28px;padding:28px}input,button{width:100%;padding:16px;border-radius:14px;font-size:16px}input{border:1px solid #ddd;margin:18px 0 12px}button{border:0;background:#171715;color:#fff;font-weight:650}pre{white-space:pre-wrap;background:#f5f5f2;padding:14px;border-radius:14px;min-height:80px}</style></head>
<body><div class="box"><strong>LOKA!</strong><h1>Lancer Tarnos maintenant</h1><p>Le token reste uniquement dans cette page et n’est pas enregistré.</p><input id="token" type="password" placeholder="ADMIN_TOKEN"><button id="run">Générer la météo</button><pre id="out">Prêt.</pre></div>
<script>document.getElementById('run').onclick=async()=>{const out=document.getElementById('out');out.textContent='Génération…';try{const r=await fetch('/api/run?city=tarnos',{method:'POST',headers:{Authorization:'Bearer '+document.getElementById('token').value}});out.textContent=JSON.stringify(await r.json(),null,2)}catch(e){out.textContent=String(e)}}</script></body></html>`;
}
