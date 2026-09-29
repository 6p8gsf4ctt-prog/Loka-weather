# LOKA — Daily Insight, données et calculs d’arrière-plan

**Étape :** 2/5  
**Version :** 1.0.0  
**Statut :** implémenté en mode isolé, sans lecture par le moteur Daily public

## Objectif

Préparer hors requête interactive toutes les références nécessaires au futur moteur
Daily Insight. L’ouverture de `/daily-graphic-preview` ne doit jamais charger ni
reconstruire l’archive climatique complète.

## Chaîne de données

1. À 04 h, heure locale de Tarnos, le job planifié vérifie l’archive officielle
   Météo-France déjà utilisée par LOKA.
2. Si le snapshot climatique a changé, le calculateur construit une nouvelle
   référence Daily Insight.
3. La référence est validée, sérialisée puis enregistrée dans une table D1 dédiée.
4. Le moteur Daily actif démarre à 05 h comme auparavant et n’importe aucun module
   Daily Insight.
5. La future preview utilisera uniquement le cache compact préparé à 04 h.

## Contenu du cache compact

| Bloc | Usage futur |
|---|---|
| `calendar` | distributions 1991–2020 P5/P50/P95 et moyenne dans une fenêtre calendaire ±7 jours |
| `comparable` | dernière date ayant atteint un niveau affichable, pour les formulations « depuis… » |
| `extremes` | minima et maxima absolus contrôlés |
| `series` | plus longues séquences sur les seuils éditoriaux validés |
| `seasonal` | premières et dernières occurrences par saison |
| `recent` | 400 derniers jours, pour veille, séries en cours et périodes sèches |
| `validCounts` | contrôle de profondeur par variable |

Variables préparées : Tmin, Tmax, pluie quotidienne et rafale maximale. Les rafales
sont converties une seule fois de m/s vers km/h.

## Garanties

- seules les valeurs de qualité Météo-France valides sont utilisées ;
- chaque cache est lié à l’identifiant exact du snapshot climatique source ;
- un cache lié à un ancien snapshot est marqué `STALE`, jamais présenté comme prêt ;
- les versions inconnues ou les manifestes incohérents sont rejetés ;
- le précédent cache reste disponible si une reconstruction échoue ;
- aucune route publique, aucune STORY et aucun texte éditorial ne sont ajoutés à
  cette étape ;
- aucun calcul n’est déclenché depuis une requête utilisateur.

## Fichiers de l’étape

- `src/engine/dailyInsight/referenceData.ts` : contrat, préparation et lectures
  légères de la référence ;
- `src/storage/dailyInsightReferences.ts` : persistance et validation D1 ;
- `src/weather/dailyInsightReference.ts` : orchestration du job d’arrière-plan ;
- `migrations/0021_daily_insight_reference_cache.sql` : table isolée ;
- `tests/dailyInsightReference.ts` : tests de qualité, compacité et calculs.

## Limites volontaires

Cette étape ne sélectionne aucun insight, ne calcule aucun score éditorial et ne
génère aucune formulation publique. Ces responsabilités appartiennent aux étapes
suivantes. Le fichier historique complet reste la source de vérité ; le cache est
un produit dérivé reproductible et supprimable.
