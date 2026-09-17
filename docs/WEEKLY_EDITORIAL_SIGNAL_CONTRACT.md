# LOKA — Contrat des signaux éditoriaux hebdomadaires

## But

Un signal est une affirmation potentiellement publiable, et non une valeur
météo brute. Il porte sa mesure prévue, son motif éditorial, sa référence et sa
confiance avant toute rédaction ou tout rendu graphique.

## Contrat minimal

Chaque signal contient :

- son rôle cible : `NUMBER`, `PRACTICAL` ou `DETAIL` ;
- sa famille : historique, normale, percentile, seuil saisonnier, phénomène,
  changement de régime, série ou variation intra-journée ;
- une clé de sujet pour empêcher les doublons ;
- son statut `FORECAST` ou `OBSERVATION` ;
- la valeur et la fenêtre analysée ;
- au moins une preuve contextualisante ;
- un niveau de confiance ;
- le jour représentatif, limité à l’horizon lundi–dimanche.

## Comparabilité obligatoire

Une preuve de comparaison doit conserver :

- la même variable ;
- la même unité ;
- la même nature de fenêtre (`HOURLY`, `DAILY_EXTREME`, `DAILY_TOTAL`, etc.) ;
- les mêmes heures lorsqu’il s’agit d’une mesure horaire.

Une valeur à 22 h ne peut donc pas être comparée à une Tmin, ni une pluie
quotidienne à un cumul hebdomadaire. Une variation intra-journée est refusée
si elle traverse deux dates.

## Sources de preuve

- `LOCAL_ARCHIVE` : observations locales archivées comparables ;
- `CLIMATE_NORMALS_1991_2020` : normale climatique validée ;
- `CONSENSUS_FORECAST` : preuve directe d’un phénomène ou d’un changement de
  régime, sans prétention historique ou climatique.

Les sources ne seront raccordées qu’à l’étape 2. En attendant, aucune donnée
brute ne peut alimenter la slide 2.
