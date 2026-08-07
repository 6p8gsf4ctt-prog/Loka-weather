# LOKA Cloud v0.1

Première version cloud du moteur météo **LOKA!**, conçue pour fonctionner automatiquement sans ordinateur.

## Ce que fait cette version

Chaque matin vers **05:45 heure de Tarnos**, Cloudflare :

1. récupère séparément cinq modèles météo ;
2. tolère l'échec d'un modèle sans bloquer la publication ;
3. construit un consensus pondéré ;
4. génère un verdict LOKA ;
5. enregistre le résultat dans Cloudflare D1 ;
6. rend le résultat consultable depuis un téléphone sur `/tarnos`.

Modèles V0.1 :

- Météo-France AROME France ;
- ECMWF IFS ;
- ECMWF AIFS ;
- DWD ICON-EU ;
- NOAA GFS.

## Structure

```text
src/
  config/       villes et modèles
  weather/      récupération Open-Meteo
  engine/       consensus + verdicts LOKA
  storage/      Cloudflare D1
  ui/           page mobile
  index.ts      routes HTTP + cron
migrations/     schéma D1
wrangler.jsonc  configuration Cloudflare
```

## 1 — Déposer dans GitHub

Copier le contenu de ce dossier à la racine du dépôt `Loka-weather`.

## 2 — Créer la base D1

Dans Cloudflare, créer une base D1 nommée :

```text
loka-weather
```

Récupérer son `database_id`, puis remplacer dans `wrangler.jsonc` :

```text
REPLACE_WITH_YOUR_D1_DATABASE_ID
```

## 3 — Installer et appliquer la migration

Sur un environnement disposant de Node.js :

```bash
npm install
npx wrangler login
npm run db:migrate:remote
```

La migration crée les tables `forecasts` et `runs`.

## 4 — Secret administrateur

Créer un secret Cloudflare :

```bash
npx wrangler secret put ADMIN_TOKEN
```

Choisir une longue valeur aléatoire. Elle permet de lancer manuellement LOKA depuis `/admin` sur le téléphone.

## 5 — Déployer

```bash
npm run deploy
```

Cloudflare fournira une adresse du type :

```text
https://loka-weather.<compte>.workers.dev
```

Endpoints principaux :

```text
/                    page mobile LOKA
/tarnos              page mobile Tarnos
/admin                déclenchement manuel mobile
/api/health           état du service
/api/latest?city=tarnos
/api/history?city=tarnos&limit=30
POST /api/run?city=tarnos
```

## 6 — Heure automatique et changement été/hiver

Cloudflare exécute ses Crons en UTC. Deux déclenchements sont donc enregistrés :

```text
03:45 UTC
04:45 UTC
```

Le Worker vérifie l'heure réelle en `Europe/Paris` et n'exécute le moteur que lorsqu'il est **05 h** localement. Ainsi, le passage CET ↔ CEST ne demande aucune intervention manuelle.

## 7 — Développement local

Copier :

```text
.dev.vars.example → .dev.vars
```

puis :

```bash
npm install
npm run db:migrate:local
npm run dev
```

Le test manuel du cron est disponible avec Wrangler `--test-scheduled`.

## 8 — Open-Meteo et usage commercial

La V0.1 utilise par défaut :

```text
https://api.open-meteo.com/v1/forecast
```

Pour une utilisation commerciale, vérifier les conditions/licences et, si nécessaire, utiliser l'offre commerciale Open-Meteo. Le code prévoit :

```text
OPEN_METEO_BASE_URL
OPEN_METEO_API_KEY
```

sans modifier le moteur.

## 9 — Ce que LOKA affiche

Exemple :

```text
TARNOS

29°
Grand soleil toute la journée.

7h  9h  12h  15h  18h  21h

Journée sèche.
```

Le moteur ne donne pas de conseil du type « prenez un parapluie » ou « mettez une veste ». Il donne une conclusion météo suffisamment claire pour que la décision soit naturelle.

## Limites connues de V0.1

Cette version utilise cinq modèles déterministes. Son `confidenceRain` représente encore la convergence entre modèles, **pas une vraie probabilité météorologique calibrée**.

V0.2 ajoutera :

- ECMWF IFS Ensemble ;
- ECMWF AIFS Ensemble ;
- ICON-EU-EPS ;
- GEFS ;
- PEAROME si l'accès retenu le permet ;
- observations et radar ;
- backtesting False Dry / False Rain ;
- apprentissage des poids par ville, variable et échéance.

## Sécurité

- `ADMIN_TOKEN` est un secret Cloudflare, jamais commité dans GitHub.
- `/api/run` exige `Authorization: Bearer <ADMIN_TOKEN>`.
- `/admin` ne stocke pas le token : il sert uniquement à envoyer la requête depuis le navigateur.
- les pages météo publiques ne donnent accès à aucun secret.
