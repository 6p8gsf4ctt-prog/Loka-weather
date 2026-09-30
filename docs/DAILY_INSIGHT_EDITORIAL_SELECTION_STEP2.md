# LOKA — Daily Insight, étape 2 : sélection éditoriale

**Version :** 1.0.0  
**Statut :** laboratoire uniquement  
**Effet sur le moteur Daily actif :** aucun

## Fonctionnement

Le sélecteur consomme exclusivement le bundle `LAB_ONLY` de l’étape 1. Il :

1. génère tous les faits détectables avec les données disponibles ;
2. rattache chaque fait à une priorité P0, P1, P2 ou P3 ;
3. vérifie la confiance de la prévision et la présence des preuves ;
4. exclut les doublons explicitement signalés comme déjà présents sur la slide principale ;
5. applique des pénalités de répétition sur sept sélections ;
6. classe les candidats par priorité puis par score final ;
7. sélectionne au maximum un sujet ;
8. conserve la trace complète des seuils et données utilisés.

## Familles implémentées

- bascule thermique horaire ;
- écart avec la veille ;
- anomalie et percentile climatique ;
- séquence sèche et retour de pluie ;
- pluie à impact et pluie rare pour la période ;
- rafales fortes et renforcement rapide du vent ;
- brouillard durable ;
- variation marquée de pression ;
- contraste air–océan ;
- changement d’heure et saisons météorologiques ;
- analogue local récent en appoint P3.

## Portes de publication

- score final minimal : 70/100 ;
- consensus d’au moins trois modèles ;
- au moins deux preuves, sauf événement calendaire certain ;
- 300 observations comparables pour une affirmation climatique ;
- vocabulaire conditionnel pour toute prévision ;
- aucune donnée manquante transformée en valeur ;
- aucune sélection si le bundle n’est pas `coreReady`.

## Rotation

Les sept dernières sélections peuvent être fournies au moteur. Les répétitions entraînent une pénalité :

- même détecteur sur sept jours ;
- même famille que la veille ;
- famille déjà utilisée dans les trois dernières sélections ;
- même structure graphique que la veille.

Une information P0 reste prioritaire et reçoit une pénalité réduite : la rotation ne doit jamais masquer un fait réellement exceptionnel.

## Isolation

- aucun import dans `src/index.ts`, `src/pipeline.ts` ou `src/weeklyPipeline.ts` ;
- aucune route et aucun cron ajoutés ;
- aucun flag modifié ;
- stockage dédié dans `daily_insight_editorial_drafts` ;
- aucun rendu graphique ni publication automatique.

## Fichiers

- `src/engine/dailyInsight/editorialSelection.ts`
- `src/storage/dailyInsightEditorialDrafts.ts`
- `migrations/0023_daily_insight_editorial_drafts.sql`
- `tests/dailyInsightEditorialSelection.ts`
- `docs/DAILY_INSIGHT_EDITORIAL_SELECTION_STEP2.md`

La prochaine étape pourra présenter cette sélection dans une preview de contrôle, sans l’exposer publiquement.
