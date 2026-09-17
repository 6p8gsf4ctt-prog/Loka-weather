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
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Publication indisponible · LOKA</title>
<style>:root{--ink:#12264a;--gold:#c9a45a;--paper:#f3f1eb;--muted:#6f716f}*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Helvetica Neue",Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:22px}.card{width:min(100%,520px);background:#fff;border-radius:26px;padding:26px;box-shadow:0 14px 46px rgba(18,38,74,.12)}.brand{font-size:28px;font-weight:850;letter-spacing:.06em}.brand::after{content:"";display:block;width:72px;height:3px;background:var(--gold);margin-top:8px}.eyebrow{margin:26px 0 8px;font-size:12px;font-weight:780;letter-spacing:.1em;color:var(--muted);text-transform:uppercase}.card h1{font-size:30px;line-height:1.05;margin:0 0 12px}.intro{color:var(--muted);font-size:15px;line-height:1.5}.feedback{background:#f9e9e7;color:#8c302b;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.4}.primary{display:block;text-align:center;text-decoration:none;border-radius:13px;padding:14px;margin-top:22px;background:var(--ink);color:#fff;font:750 14px -apple-system,BlinkMacSystemFont,sans-serif}.note{margin:20px 0 0;color:var(--muted);font-size:12px;line-height:1.45}</style></head><body><main class="card"><div class="brand">LOKA!</div><div class="eyebrow">Publication hebdomadaire</div><h1>Les slides ne sont pas disponibles</h1><p class="intro">La génération des prévisions réelles n’a pas pu aboutir. Réessaie dans quelques instants.</p>${feedback}<a class="primary" href="/weekly-preview">Réessayer</a><p class="note">La page publique utilise toujours les prévisions réelles et le prochain lundi. Aucun mode Démo n’est utilisé.</p></main></body></html>`;
}
