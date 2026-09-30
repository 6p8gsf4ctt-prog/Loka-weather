# Installation — Daily Insight OP3

## Objet

Cette mise à jour ajoute une prévisualisation Daily Insight totalement indépendante du moteur Daily actif.

## Installation dans Cloudflare

1. Remplacer les fichiers existants en conservant exactement leur arborescence.
2. Ajouter les nouveaux fichiers présents dans le ZIP.
3. Déployer le Worker depuis l’interface Cloudflare.

Aucune requête SQL supplémentaire n’est nécessaire pour l’OP3. Les migrations `0022` et `0023` des étapes précédentes doivent déjà être installées.

## Accès

Après déploiement :

`https://loka-weather.jpbm62n289.workers.dev/daily-insight-lab-preview?city=tarnos`

Pour tester une date précise :

`https://loka-weather.jpbm62n289.workers.dev/daily-insight-lab-preview?city=tarnos&date=2026-09-30`

## Garanties d’isolement

- aucune lecture de la publication Daily officielle ;
- aucune écriture dans les tables du moteur Daily actif ;
- aucune modification des crons ou des options d’activation ;
- aucune publication automatique ;
- export PNG manuel uniquement ;
- écritures limitées aux caches de laboratoire `daily_insight_data_cache` et `daily_insight_editorial_drafts`.

## Résultat attendu

La page affiche la STORY proposée, les sources utilisées, les scores, les preuves, les exclusions, les pénalités de répétition et les temps de calcul. Si le référentiel climatique n’est pas disponible, aucune STORY n’est inventée.
