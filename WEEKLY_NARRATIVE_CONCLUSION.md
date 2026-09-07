# LOKA — Conclusion générale de la semaine
# Étape 7 — « La semaine à Tarnos »

Version : 0.1.0  
Date : 6 septembre 2026  
Statut : étape 7 terminée  
Étape suivante : étape 8 — conséquences pratiques

## 1. Objectif

La première slide ne doit plus résumer la sélection par un compteur. Elle doit
donner immédiatement la conclusion que l’habitant doit retenir de la semaine.

Cette conclusion est générée par le moteur, avec des règles déterministes et
des données déjà sélectionnées. Aucun texte externe n’intervient.

## 2. Règles appliquées

- semaine calme : « La semaine restera globalement stable à Tarnos. » ;
- amélioration seule : « La semaine s’améliore progressivement à partir de… » ;
- dégradation seule : « La semaine se dégrade nettement à partir de… » ;
- dégradation suivie d’une amélioration : semaine perturbée au départ puis plus
  agréable ensuite ;
- un seul événement : il devient le fait dominant de la semaine ;
- plusieurs événements distincts : la conclusion les rassemble sans les
  transformer en liste de slides ;
- meilleure fenêtre seule ou associée : elle est formulée comme une fenêtre
  favorable, sans créer d’événement supplémentaire.

La conclusion ne change ni le nombre d’événements ni leur ordre. Elle prépare
la lecture du carrousel ; les conséquences pratiques seront traitées à l’étape
8.

## 3. Intégration

`buildWeeklyEditorial` ordonne d’abord les événements avec la règle de l’étape
6, puis transmet cette sélection à `buildWeeklyConclusion`. Le corps de la
vue d’ensemble reprend directement le résultat produit par cette fonction.

Le titre conserve la signature attendue : « La semaine à Tarnos », sauf pour la
semaine calme qui conserve « Une semaine calme à Tarnos ».

## 4. Garanties

- aucune analyse ponctuelle par ChatGPT ou LLM ;
- aucune dépendance à une source éditoriale externe ;
- aucun changement du moteur quotidien ;
- aucun changement des 24 scènes V24 ;
- aucune invention lorsque la semaine est stable ;
- texte stable pour des données identiques.

## 5. Fichiers de l’étape

| Fichier | Rôle |
|---|---|
| `src/engine/weekly/conclusion.ts` | Règles de conclusion déterministes |
| `src/engine/weekly/editorial.ts` | Injection de la conclusion dans la vue d’ensemble |
| `src/engine/weekly/index.ts` | Export public |
| `tests/weeklyConclusion.ts` | Tests des récits calme, simple, contrasté et favorable |
| `tests/weeklyEditorial.ts` | Vérification de l’intégration éditoriale |
| `tests/run-all.ts` | Inclusion de la suite dédiée |
| `docs/WEEKLY_NARRATIVE_CONCLUSION.md` | Référence de l’étape 7 |

## 6. Critère de fin

L’étape est validée lorsque la première slide formule une conclusion adaptée à
la sélection, sans compteur générique, sans événement inventé et sans rupture
avec la semaine calme.
