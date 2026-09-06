# LOKA — Ordre narratif de la semaine
# Étape 6 — « La semaine à Tarnos »

Version : 0.1.0  
Date : 6 septembre 2026  
Statut : étape 6 terminée  
Étape suivante : étape 7 — génération de la conclusion générale

## 1. Objectif

Séparer définitivement deux décisions :

- la sélection détermine les événements assez importants pour être publiés ;
- l’ordre narratif détermine la manière dont ces événements sont lus dans le
  carrousel.

L’ordre de publication ne reprend donc plus mécaniquement le classement par
score de l’étape 5.

## 2. Règle d’ordre

Les histoires retenues sont placées :

1. dans l’ordre chronologique de leur début ;
2. puis selon leur date de fin et leur identifiant en cas d’égalité ;
3. avec la `BEST_WINDOW` en dernière position lorsqu’elle est retenue.

Cette règle produit la progression minimale attendue :

```text
contexte ou perturbation initiale
→ évolution de la semaine
→ conséquence météo
→ meilleure fenêtre pratique éventuelle
```

La meilleure fenêtre est ainsi la conclusion pratique du carrousel, même si
son score était inférieur à celui d’un événement antérieur.

## 3. Garanties

- Le tableau fourni à l’ordre narratif n’est jamais muté.
- L’ordre est déterministe et ne dépend pas de l’ordre d’arrivée des données.
- Une semaine sans événement reste une publication d’une seule slide.
- Aucun événement n’est ajouté ou supprimé à cette étape.
- Le moteur quotidien et son ordre de décision V24 ne sont pas concernés.

## 4. Intégration

`buildWeeklyEditorial` applique `orderWeeklyEvents` juste avant de construire
les cartes éditoriales. Le plan de carrousel reprend ensuite cet ordre sans le
réordonner.

La sélection conserve son classement par importance pour l’audit et la
traçabilité. L’éditorial est la première couche qui impose l’ordre de lecture
destiné à Instagram.

## 5. Fichiers de l’étape

| Fichier | Rôle |
|---|---|
| `src/engine/weekly/narrativeOrder.ts` | Règle d’ordre déterministe |
| `src/engine/weekly/editorial.ts` | Application de l’ordre avant rédaction |
| `src/engine/weekly/index.ts` | Export public de la règle |
| `tests/weeklyNarrativeOrder.ts` | Tests de chronologie, conclusion et non-mutation |
| `tests/weeklyEditorial.ts` | Vérification de l’ordre éditorial produit |
| `tests/run-all.ts` | Inclusion de la suite dédiée |
| `docs/WEEKLY_NARRATIVE_ORDER.md` | Référence de l’étape 6 |

## 6. Critère de fin

L’étape est validée lorsque les événements sélectionnés sont publiés dans un
ordre chronologique déterministe, que la meilleure fenêtre termine le récit
lorsqu’elle existe, et que le moteur quotidien reste inchangé.
