# Daily Insight — bascule contrôlée (étape 5)

## Décision de mise en service

La STORY comparative Daily est exposée sur une route autonome :

`/daily-insight-story?city=tarnos`

Cette activation ne remplace ni la scène journalière, ni sa publication, ni sa STORY principale. Elle ajoute uniquement la STORY comparative Daily lorsqu'un signal sélectionné franchit toutes les barrières éditoriales et techniques.

Les routes suivantes restent inchangées :

- `/` — moteur journalier officiel ;
- `/daily-graphic-preview` — atelier graphique journalier ;
- `/weekly` et `/weekly-preview` — moteur Weekly conservé comme sécurité ;
- `/daily-insight-preview` — audit éditorial isolé ;
- `/daily-insight-preview/scenarios` — scénarios graphiques de contrôle.

## Interrupteurs Cloudflare

| Variable | Valeur déployée | Rôle |
|---|---:|---|
| `DAILY_INSIGHT_STORY_ENABLED` | `true` | Autorise la route réelle Daily Insight |
| `DAILY_INSIGHT_STORY_ROLLBACK` | `false` | Arrêt d'urgence prioritaire |
| `DAILY_INSIGHT_CPU_BUDGET_MS` | `20` | Limite du calcul synchrone du moteur |

L'arrêt immédiat s'effectue en plaçant :

`DAILY_INSIGHT_STORY_ROLLBACK=true`

Il n'est pas nécessaire de supprimer l'activation. Le rollback gagne toujours sur `DAILY_INSIGHT_STORY_ENABLED` et la route ne renvoie alors aucune STORY.

Pour une désactivation durable après diagnostic :

`DAILY_INSIGHT_STORY_ENABLED=false`

## Conditions cumulatives d'exposition

Une STORY est disponible uniquement si :

1. l'activation vaut exactement `true` ;
2. le rollback ne vaut pas `true` ;
3. le cache historique est disponible et accepté ;
4. le moteur retourne `SELECTED` avec un gagnant ;
5. le calcul synchrone respecte le budget configuré ;
6. le fond graphique officiel est disponible.

Sinon, le moteur conserve le silence éditorial. Aucun contenu de remplacement n'est inventé.

## Observabilité

La route réelle fournit :

- `x-loka-daily-insight-rollout` : `ACTIVE`, `NO_SIGNAL`, `CPU_GUARD`, `DISABLED` ou `ROLLBACK` ;
- `x-loka-daily-insight-reason` : justification de la décision ;
- `x-loka-daily-insight-engine-ms` : durée du calcul synchrone ;
- `Server-Timing` : durées du cache, du moteur, du rendu et de la requête totale.

Chaque décision écrit également un événement structuré `LOKA_DAILY_INSIGHT_STORY_ROLLOUT` dans les logs Cloudflare.

`/api/health` expose l'état des deux interrupteurs sans lancer le moteur ni lire le cache.

## Export

- canvas 1080 × 1920 ;
- export PNG manuel uniquement ;
- partage natif lorsqu'il est disponible, téléchargement sinon ;
- aucun appel réseau de publication ;
- aucun export lorsque le résultat est silencieux ou bloqué.

## Maintien du moteur Weekly

Cette étape ne modifie aucun flag Weekly et ne supprime aucun fichier de comparaison Weekly. Le moteur reste disponible comme solution de sécurité pendant l'observation de Daily Insight.

Sa suppression ne devra intervenir qu'après une validation explicite fondée sur plusieurs jours de fonctionnement stable.

## Protocole de validation après déploiement

1. ouvrir `/api/health` et vérifier `enabled: true`, `rollback: false` ;
2. ouvrir `/daily-insight-story?city=tarnos` ;
3. contrôler les en-têtes de réponse et les temps dans Cloudflare ;
4. exporter le PNG et vérifier 1080 × 1920 ;
5. vérifier `/`, `/daily-graphic-preview`, `/weekly` et `/weekly-preview` ;
6. surveiller plusieurs jours les événements de rollout et les absences de signal ;
7. tester une fois l'arrêt d'urgence, puis remettre `DAILY_INSIGHT_STORY_ROLLBACK=false` ;
8. ne retirer Weekly qu'après décision séparée.

