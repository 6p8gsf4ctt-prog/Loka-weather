# LOKA — Daily Insight OP3 : prévisualisation indépendante

## Route

`/daily-insight-lab-preview?city=tarnos`

Une date peut être fournie pour les scénarios de contrôle :

`/daily-insight-lab-preview?city=tarnos&date=2026-10-25`

## Isolation

La route :

- effectue sa propre capture des cinq modèles ;
- ne lit pas la prévision Daily officielle ;
- ne modifie pas `forecasts` ni `daily_scene_ledger` ;
- lit le cache climatique Daily Insight préparé en arrière-plan ;
- écrit seulement dans `daily_insight_data_cache` et `daily_insight_editorial_drafts` ;
- n’utilise aucun flag d’activation public ;
- ne publie rien sur Instagram ;
- exporte uniquement un PNG local après action manuelle.

## Contenu affiché

- état de chaque source ;
- nombre de modèles disponibles ;
- STORY gagnante ;
- score, priorité, confiance et format ;
- tous les candidats ;
- preuves et fenêtres de comparaison ;
- raisons d’exclusion ;
- pénalités de répétition ;
- temps de calcul de chaque étape.

## États possibles

- `READY` : le laboratoire a produit un bundle et une décision ;
- `REFERENCE_UNAVAILABLE` : le cache climatique de l’étape 1 n’est pas disponible ;
- `FAILED` : une erreur de collecte ou de construction a bloqué le laboratoire.

Un état `READY` peut contenir `NO_ELIGIBLE_CANDIDATE`. Dans ce cas, aucune STORY n’est inventée.

## Prérequis

- étape 1 installée et migration `0022` appliquée ;
- étape 2 installée et migration `0023` appliquée ;
- cache `daily_insight_reference_cache` déjà construit ;
- accès réseau Open-Meteo opérationnel.

Cette OP3 reste un outil de contrôle. Elle ne constitue pas une mise en production de Daily Insight.
