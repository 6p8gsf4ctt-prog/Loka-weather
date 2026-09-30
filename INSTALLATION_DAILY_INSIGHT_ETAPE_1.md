# Installation — Daily Insight, étape 1

Cette livraison ajoute uniquement le laboratoire de données Daily Insight. Elle ne branche rien sur le moteur Daily actif.

## 1. Importer les fichiers

Conserver exactement l’arborescence présente dans le ZIP :

- `src/engine/dailyInsight/dataBundle.ts`
- `src/weather/dailyInsightDataSources.ts`
- `src/storage/dailyInsightDataCache.ts`
- `migrations/0022_daily_insight_data_cache.sql`
- `tests/dailyInsightDataLab.ts`
- `tests/run-all.ts`
- `docs/DAILY_INSIGHT_DATA_LAB_STEP1.md`
- `INSTALLATION_DAILY_INSIGHT_ETAPE_1.md`

`tests/run-all.ts` est le seul fichier existant modifié. La modification ajoute uniquement le nouveau test de laboratoire.

## 2. Créer la table D1 dans Cloudflare

Dans Cloudflare :

1. ouvrir **Workers & Pages** ;
2. ouvrir **D1 SQL Database** puis la base `loka-weather` ;
3. ouvrir **Console** ;
4. copier et exécuter le contenu de `migrations/0022_daily_insight_data_cache.sql`.

La création de cette table est sans effet sur les tables `forecasts`, `daily_scene_ledger` et `weekly_publications`.

## 3. Déployer le code source

Le déploiement peut ensuite être réalisé selon le processus habituel du projet. Aucune variable Cloudflare ne doit être ajoutée ou modifiée pour cette étape.

Après déploiement :

- aucune nouvelle route n’apparaît ;
- aucun cron n’est ajouté ;
- aucune STORY n’est publiée ;
- le moteur journalier reste inchangé ;
- la nouvelle table reste vide tant que l’étape suivante n’appelle pas explicitement le laboratoire.

## Retour arrière

Comme aucun point d’entrée actif n’importe ces modules, le retour arrière du code consiste uniquement à retirer les fichiers ajoutés et la ligne `import "./dailyInsightDataLab";` de `tests/run-all.ts`.

La table D1 peut rester en place : elle est isolée et inutilisée. Il n’est pas nécessaire de la supprimer pour restaurer le comportement antérieur.
