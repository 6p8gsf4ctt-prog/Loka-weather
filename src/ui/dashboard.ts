import type { LokaForecast } from "../types";

function esc(value: unknown): string {
  return String(value ?? "").replace(/[&<>'"]/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;"
  }[c] as string));
}

function weatherGlyph(condition: string): string {
  if (condition === "soleil") return "☀︎";
  if (condition === "peu nuageux") return "☼";
  if (condition === "couvert") return "●";
  if (condition === "nuageux") return "◐";
  return "◑";
}

export function renderDashboard(forecast: LokaForecast | null): string {
  const content = forecast ? `
    <main class="card">
      <header>
        <div class="brand">LOKA!</div>
        <div class="date">${esc(new Date(forecast.generatedAt).toLocaleString("fr-FR", { timeZone: "Europe/Paris", dateStyle: "medium", timeStyle: "short" }))}</div>
      </header>
      <div class="city">${esc(forecast.city.toUpperCase())}</div>
      <section class="hero">
        <div class="temperature">${forecast.tempMaxC}°</div>
        <div class="minimum">min ${forecast.tempMinC}°</div>
        <h1>${esc(forecast.mainVerdict)}</h1>
      </section>
      <section class="hours">
        ${forecast.hourly.map((h) => `
          <div class="hour">
            <span>${h.hour}h</span>
            <b>${weatherGlyph(h.condition)}</b>
            <strong>${h.temperatureC}°</strong>
          </div>
        `).join("")}
      </section>
      <section class="verdict">${esc(forecast.rainVerdict)}</section>
      ${forecast.notableEvent ? `<section class="notable">${esc(forecast.notableEvent)}</section>` : ""}
      <footer>Prévision générée automatiquement · ${forecast.confidenceMain}/100 interne</footer>
    </main>
  ` : `
    <main class="card empty">
      <div class="brand">LOKA!</div>
      <h1>Aucune prévision enregistrée.</h1>
      <p>Après le premier lancement du moteur, la météo de Tarnos apparaîtra ici automatiquement.</p>
    </main>
  `;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#f5f5f2" />
<title>LOKA! — Tarnos</title>
<style>
:root { color-scheme: light; --ink:#171715; --muted:#777772; --paper:#f5f5f2; --card:#fff; --line:#e9e9e5; }
* { box-sizing:border-box; }
body { margin:0; min-height:100vh; background:var(--paper); color:var(--ink); font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif; display:grid; place-items:center; padding:24px 14px; }
.card { width:min(100%,560px); background:var(--card); border-radius:36px; padding:28px 24px 22px; box-shadow:0 20px 70px rgba(0,0,0,.06); }
header { display:flex; align-items:center; justify-content:space-between; color:var(--muted); font-size:12px; }
.brand { font-size:15px; font-weight:650; letter-spacing:-.02em; color:#555550; }
.city { text-align:center; margin-top:36px; font-size:14px; font-weight:650; letter-spacing:.18em; }
.hero { text-align:center; padding:15px 0 30px; }
.temperature { font-size:clamp(78px,24vw,128px); line-height:.95; letter-spacing:-.07em; font-weight:520; }
.minimum { margin-top:8px; color:var(--muted); font-size:14px; }
h1 { font-size:clamp(22px,6vw,30px); line-height:1.18; letter-spacing:-.035em; font-weight:540; margin:24px auto 0; max-width:420px; }
.hours { border-top:1px solid var(--line); border-bottom:1px solid var(--line); padding:20px 0; display:grid; grid-template-columns:repeat(6,1fr); gap:4px; }
.hour { text-align:center; display:grid; gap:9px; color:var(--muted); font-size:12px; }
.hour b { font-size:21px; font-weight:400; color:#cda628; }
.hour strong { color:var(--ink); font-size:16px; font-weight:520; }
.verdict { text-align:center; font-size:20px; font-weight:550; letter-spacing:-.025em; padding:26px 8px 10px; }
.notable { text-align:center; margin:12px 0 4px; padding:14px 16px; background:#f4f4f1; border-radius:18px; font-weight:520; }
footer { text-align:center; color:#aaa9a2; font-size:10px; margin-top:24px; }
.empty { text-align:center; padding-top:60px; padding-bottom:60px; }
.empty h1 { margin-top:50px; }
.empty p { color:var(--muted); line-height:1.5; }
@media (max-width:380px) { .card{padding-left:16px;padding-right:16px;border-radius:28px}.hours{gap:1px}.hour strong{font-size:14px}.hour b{font-size:18px} }
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
