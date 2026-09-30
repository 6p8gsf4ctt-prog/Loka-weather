# LOKA — Daily Insight, étape 1 : moteur de données isolé

**Version :** 1.0.0  
**Statut :** laboratoire uniquement  
**Effet sur le moteur Daily actif :** aucun

## Objectif

Créer un contrat unique réunissant les données nécessaires au futur moteur éditorial Daily Insight, sans importer ce laboratoire dans les routes ou pipelines actifs.

## Données réunies

| Bloc | Source | Règle |
|---|---|---|
| Prévisions horaires | consensus multi-modèles LOKA existant | minimum trois modèles pour `coreReady` |
| Résumé journalier | calculé depuis le consensus horaire | aucune seconde prévision contradictoire |
| Historique local | cache officiel Météo-France Daily Insight | lien obligatoire vers le snapshot source |
| Normales saisonnières | référence 1991–2020, fenêtre ±7 jours | quatre métriques : Tmin, Tmax, pluie et rafales |
| Humidité, pression, visibilité, rayonnement | collecteur Open-Meteo séparé | enrichissement facultatif et traçable |
| Soleil | calcul NOAA déjà utilisé par LOKA | source déterministe locale |
| Mer | collecteur marin séparé | température de surface et vagues |
| Marées | adaptateur prévu mais non configuré | aucune valeur n’est inventée |
| Calendrier | calcul déterministe | saisons météorologiques et changements d’heure français |

## Isolation

- Le bundle porte obligatoirement le mode `LAB_ONLY`.
- Aucun nouveau module n’est importé dans `src/index.ts`, `src/pipeline.ts` ou `src/weeklyPipeline.ts`.
- Aucune route publique n’est ajoutée.
- Aucun cron existant n’est modifié.
- La table D1 est dédiée : `daily_insight_data_cache`.
- L’absence d’une source d’enrichissement produit `UNAVAILABLE` ou `NOT_CONFIGURED`, jamais une donnée de remplacement inventée.
- Le moteur journalier actif continue d’utiliser exactement son contrat actuel.

## Qualité et traçabilité

Chaque bundle conserve :

- l’identifiant du snapshot de prévision ;
- l’identifiant du snapshot climatique ;
- l’état et le fournisseur de chaque source ;
- les blocs manquants ;
- les incohérences de volume horaire ;
- la couverture des enrichissements ;
- la date de génération et la date cible.

`coreReady` signifie uniquement que le consensus météo et les quatre références climatiques nécessaires sont présents. Cela ne signifie pas que le bundle peut être publié.

## Fichiers

- `src/engine/dailyInsight/dataBundle.ts` : contrat, fusion et validation pure ;
- `src/weather/dailyInsightDataSources.ts` : collecteurs atmosphérique et marin ;
- `src/storage/dailyInsightDataCache.ts` : cache D1 isolé ;
- `migrations/0022_daily_insight_data_cache.sql` : schéma dédié ;
- `tests/dailyInsightDataLab.ts` : tests de fusion, provenance et absence d’invention ;
- `docs/DAILY_INSIGHT_DATA_LAB_STEP1.md` : présent document.

## Non inclus dans cette étape

- aucun détecteur éditorial ;
- aucun score P0/P1/P2/P3 ;
- aucune formulation ;
- aucune STORY ;
- aucune activation de production.

La prochaine étape pourra consommer ce bundle dans une preview dédiée, toujours sans modifier le moteur Daily actif.
