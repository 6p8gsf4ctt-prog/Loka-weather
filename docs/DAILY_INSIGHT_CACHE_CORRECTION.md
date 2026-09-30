# Daily Insight — correction du cache historique

## Incident constaté

Le 29 septembre 2026, la STORY réelle répondait `NO_SIGNAL` avec la raison
`reference_unavailable`. La preview précisait :

- `CACHE_UNAVAILABLE` ;
- `daily_insight_reference_empty`.

Ce résultat n'était pas un silence éditorial. Le référentiel nécessaire aux
comparaisons n'avait jamais été construit.

## Cause

La reconstruction était conditionnée à l'heure locale `04`, mais le premier
cron disponible était `45 3 * * *`.

Pendant l'heure d'été française, 03:45 UTC correspond à 05:45 à Tarnos. Aucun
déclenchement ne pouvait donc satisfaire la condition locale.

## Correction

### Rafraîchissement quotidien

Les deux créneaux suivants couvrent maintenant les changements d'heure :

- `45 2 * * *` — 04:45 à Tarnos pendant l'heure d'été ;
- `45 3 * * *` — 04:45 à Tarnos pendant l'heure d'hiver.

Le moteur vérifie également l'heure locale avant de lancer le rafraîchissement.

### Auto-réparation

Le cron `15 * * * *` effectue un contrôle horaire léger :

- si le cache est `READY`, aucune reconstruction n'est lancée ;
- s'il est absent, rejeté ou indisponible, la reconstruction est déclenchée en
  arrière-plan.

Ce mécanisme permet de réparer automatiquement un premier déploiement ou une
perte de cache sans recalcul permanent.

### Contrôle manuel

Une interface est disponible sur :

`/daily-insight-control`

Elle affiche le statut public du cache et accepte le mot de passe
administrateur pour demander une reconstruction protégée.

Routes associées :

- `GET /api/daily-insight/status` ;
- `POST /api/admin/daily-insight/rebuild-reference` avec le jeton
  administrateur ;
- `GET /daily-insight-story?city=tarnos` pour la STORY réelle.

La reconstruction manuelle est exécutée en arrière-plan et ne publie rien.

## Vérification après déploiement

1. ouvrir `/daily-insight-control` ;
2. vérifier si le cache passe à `READY` au prochain quart d'heure de l'heure ;
3. si nécessaire, saisir le mot de passe administrateur et lancer la
   reconstruction ;
4. attendre le message « Référentiel prêt » ;
5. ouvrir `/daily-insight-story?city=tarnos` ;
6. distinguer désormais :
   - `READY` + `NO_DAILY_INSIGHT` : véritable silence éditorial ;
   - cache différent de `READY` : incident de données.

## Périmètre

Cette correction ne modifie ni le moteur journalier officiel, ni ses contenus,
ni le moteur Weekly. Elle concerne uniquement l'alimentation historique de
Daily Insight et ses outils de diagnostic.

