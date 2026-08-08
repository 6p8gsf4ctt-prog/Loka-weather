# LOKA Weather V0.3.1

Cette version verrouille le langage public LOKA.

## À ajouter
- `src/engine/editorial.ts`

## À remplacer
- `src/engine/verdict.ts`

## Facultatif
- `tests/editorial.test.ts`

V0.3 doit déjà être installée. Aucun changement à D1, Cron, ADMIN_TOKEN, wrangler.jsonc, dashboard.ts, types.ts, consensus.ts ou cities.ts.

## Installation
1. Ajouter `src/engine/editorial.ts`.
2. Remplacer entièrement `src/engine/verdict.ts`.
3. Optionnel: ajouter `tests/editorial.test.ts`.
4. Commit sur `main`.
5. Attendre le déploiement Cloudflare.
6. Ouvrir `/admin` et générer Tarnos.
7. Recharger `/tarnos`.

## Doctrine V0.3.1
- LOKA décrit; elle ne donne jamais d'ordre.
- Heures précises plutôt que "fin de journée".
- Mots ordinaires plutôt que jargon météo.
- Chiffres lorsque les adjectifs sont ambigus.
- Si les modèles divergent réellement, l'incertitude est localisée dans le temps.
- Les mots publics comme "précipitations", "risque orageux", "averses marquées", "nébulosité", "éclaircies", "temps sec", "vent soutenu", "fin de journée" et "plus frais" sont bloqués.
