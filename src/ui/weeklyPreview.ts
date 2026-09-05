function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function renderWeeklyPreviewGate(message = ""): string {
  const feedback = message
    ? `<p class="feedback">${escapeHtml(message)}</p>`
    : "";
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Aperçu · La semaine à Tarnos</title>
<style>
:root{--ink:#12264a;--gold:#c9a45a;--paper:#f3f1eb;--muted:#6f716f;--dark:#171715}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.card{width:min(100%,520px);background:#fff;border-radius:26px;padding:26px;box-shadow:0 14px 46px rgba(18,38,74,.12)}.brand{font-size:28px;font-weight:850;letter-spacing:.06em}.brand::after{content:"";display:block;width:72px;height:3px;background:var(--gold);margin-top:8px}.eyebrow{margin:26px 0 8px;font-size:12px;font-weight:780;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.card h1{font-size:30px;line-height:1.05;margin:0 0 12px}.intro{color:var(--muted);font-size:15px;line-height:1.5}.field{display:block;margin:18px 0 0;font-size:13px;font-weight:700}.field span{display:block;margin-bottom:7px}.field input{width:100%;border:1px solid #d8d8d3;border-radius:12px;padding:13px 14px;font:16px -apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;color:var(--dark);background:#fff}.field small{display:block;margin-top:7px;color:var(--muted);font-weight:400;line-height:1.4}.primary{width:100%;border:0;border-radius:13px;padding:14px;margin-top:22px;background:var(--ink);color:#fff;font:750 14px -apple-system,BlinkMacSystemFont,sans-serif}.feedback{background:#f9e9e7;color:#8c302b;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.4}.note{margin:20px 0 0;color:var(--muted);font-size:12px;line-height:1.45}
</style></head><body><main class="card"><div class="brand">LOKA!</div><div class="eyebrow">Prévisualisation interne</div><h1>La semaine à Tarnos</h1><p class="intro">Génère le carrousel complet et son relais Story sans publier ni enregistrer de semaine en base.</p>${feedback}<form method="post" action="/weekly-preview" autocomplete="off"><label class="field"><span>Token administrateur</span><input type="password" name="token" required autocomplete="off" spellcheck="false"><small>Le token est transmis uniquement lors de cette requête sécurisée et n’est pas placé dans l’URL.</small></label><label class="field"><span>Lundi de la semaine à prévisualiser (facultatif)</span><input type="text" name="start" inputmode="numeric" placeholder="2026-09-07" pattern="\\d{4}-\\d{2}-\\d{2}"><small>Laisse vide pour utiliser automatiquement la prochaine semaine lundi-dimanche.</small></label><button class="primary" type="submit">Générer l’aperçu visuel</button></form><p class="note">La prévisualisation reste indépendante de <code>WEEKLY_ENABLED</code> et n’écrit pas dans D1.</p></main></body></html>`;
}
