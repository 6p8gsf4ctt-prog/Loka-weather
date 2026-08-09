# LOKA Weather — V0.4

## Objectif

V0.4 est la première version du **moteur de décision configurable**. Elle prépare LOKA à évoluer jour après jour à partir des retours réels.

## Nouveautés

- 6 scènes automatiques : SOLEIL, NUAGES, PLUIE, ORAGES, VENT FORT, INSTABLE.
- Sous-titre toujours construit autour de « Journée… ».
- 3 lignes maximum : températures, ciel/évolution, événement remarquable.
- Journal de décision complet : scène choisie, scores, raisons, métriques, scènes concurrentes.
- Réglages centralisés dans `src/config/decision.ts`.
- Nouvelle route `/api/decision?city=tarnos` pour contrôler le raisonnement.
- Aucun changement de schéma D1 : les nouvelles données sont conservées dans `diagnostics_json`.

## À AJOUTER

- `src/config/decision.ts`
- `src/engine/classifier.ts`
- `tests/v04-config.test.ts` (facultatif)

## À REMPLACER

- `src/types.ts`
- `src/engine/editorial.ts`
- `src/engine/verdict.ts`
- `src/storage/db.ts`
- `src/index.ts`

## Inchangé

`wrangler.jsonc`, D1, ADMIN_TOKEN, Cron, `src/config/cities.ts`, `src/config/models.ts`, `src/engine/consensus.ts`, `src/engine/math.ts`, `src/pipeline.ts`, `src/weather/openMeteo.ts`.

## Installation téléphone / GitHub

1. Ajouter les 2 nouveaux fichiers TypeScript.
2. Remplacer les 5 fichiers indiqués.
3. Commit sur `main`.
4. Attendre le redéploiement Cloudflare.
5. Ouvrir `/admin` et générer Tarnos.
6. Ouvrir `/api/decision?city=tarnos`.
7. Vérifier `scene`, `subtitle`, `summaryLines` et surtout `decisionLog`.

## Philosophie d’évolution

On ne corrige plus chaque petite intuition immédiatement dans le code. On accumule les cas réels : prévision des modèles, décision LOKA, météo observée et retour éditorial. Les réglages sont ensuite regroupés dans des versions plus conséquentes.
