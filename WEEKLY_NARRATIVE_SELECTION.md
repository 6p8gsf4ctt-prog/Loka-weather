# LOKA — Hiérarchisation et plafond de publication
# Étape 5 — « La semaine à Tarnos »

Version : 0.2.0  
Date : 6 septembre 2026  
Statut : étape 5 terminée  
Étape suivante : étape 6 — construction de l’ordre narratif

## 1. Objectif réalisé

La sélection hebdomadaire ne publie plus tous les épisodes qui franchissent le
seuil technique minimal. Elle compare maintenant les épisodes consolidés,
retient les plus importants et limite le nombre d’histoires utilisables pour le
carrousel.

La consolidation de l’étape 4 reste inchangée. La hiérarchisation intervient
après elle et avant l’éditorial.

## 2. Règle de publication

```text
maximum normal : 3 histoires
maximum absolu : 4 histoires
```

Une quatrième histoire n’est acceptée que si les trois conditions suivantes
sont réunies :

- score au moins égal à 78 ;
- confiance `HIGH` ;
- indépendance vis-à-vis de toutes les histoires déjà retenues.

L’indépendance est vérifiée de manière déterministe : la quatrième histoire ne
doit partager ni famille d’histoire ni journée contributrice avec une histoire
déjà retenue.

La quatrième histoire reçoit en plus la raison explicite :
`exceptional_fourth_independent_high_confidence`.

La meilleure fenêtre est une candidate comme les autres. Elle compte dans la
limite et peut être rejetée si les histoires plus importantes occupent déjà le
plafond. La décision de la placer en dernier relève de l’étape 6.

## 3. Classement de l’importance

Chaque épisode est scoré avec les règles déjà présentes dans le moteur :

- intensité et durée pour chaleur, fraîcheur, pluie et vent ;
- force de variation pour amélioration et dégradation ;
- durée et luminosité pour une fenêtre favorable ;
- durée et soutien inter-modèles pour l’orage.

Le score reste borné entre 0 et 100. La confiance est dérivée du score :

```text
HIGH   : score ≥ 78
MEDIUM : score ≥ 63
LOW    : score < 63
```

À score égal, le moteur applique toujours le même départage : date de début,
puis identifiant déterministe. Le comportement ne dépend donc pas de l’ordre
d’arrivée des appels réseau.

Le classement par score n’est pas encore l’ordre de lecture du carrousel. Cette
séparation est volontaire et sera traitée à l’étape suivante.

## 4. Éléments écartés

La sélection expose maintenant un audit de rejet au niveau des épisodes :

| Raison | Signification |
|---|---|
| `LOW_SCORE` | L’épisode n’atteint pas le seuil de sélection |
| `LESS_RELEVANT` | Une autre fenêtre ou un autre épisode est plus pertinent |
| `CAP_REACHED` | Le plafond est atteint après comparaison des épisodes |

Chaque rejet conserve :

- l’identifiant de l’épisode ;
- son score lorsqu’il a été calculé ;
- sa source `EPISODE` ;
- une éventuelle histoire sélectionnée liée par famille ou journée.

Le moteur ne supprime donc pas silencieusement les éléments non publiés. Cette
trace sera réutilisée pour les contrôles et les prévisualisations des étapes
suivantes.

## 5. Semaine calme

Si aucun épisode n’atteint le seuil minimal :

- le statut reste `CALM` ;
- aucune histoire n’est sélectionnée ;
- l’audit de rejet reste disponible ;
- la semaine conserve une publication courte.

Le plafond ne force jamais la création d’un événement.

## 6. Garde de sécurité du carrousel

La validation d’activation vérifie désormais que le nombre d’événements
éditoriaux ne dépasse jamais quatre. La sélection de production est la couche
qui décide si le quatrième est autorisé ; la validation du carrousel empêche
néanmoins toute publication de cinq slides événement ou davantage, même en cas
de données éditoriales incohérentes.

La première slide de vue d’ensemble reste hors du décompte :

```text
nombre de slides du carrousel = 1 + nombre d’histoires sélectionnées
```

## 7. Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `src/config/weeklySelection.ts` | Limites et seuil de l’exception à quatre |
| `src/engine/weekly/selection.ts` | Scoring, sélection plafonnée et audit des rejets |
| `src/engine/weekly/activation.ts` | Garde absolue à quatre événements maximum |
| `src/engine/weekly/index.ts` | Export des types de rejet |
| `src/engine/weekly/README.md` | Documentation de la nouvelle limite |
| `tests/weeklySelection.ts` | Tests du plafond, des rejets et de l’exception à quatre |
| `tests/weeklyActivation.ts` | Test de blocage d’un cinquième événement |
| `docs/WEEKLY_REFERENCE.md` | Harmonisation de la référence hebdomadaire |
| `docs/WEEKLY_NARRATIVE_REFERENCE.md` | Mise à jour du suivi des 12 étapes |

Le moteur quotidien, ses contrats publics, les 24 scènes et les migrations D1
n’ont pas été modifiés.

## 8. Vérifications réalisées

- TypeScript du Worker : réussite ;
- tests hebdomadaires : toutes les suites passent ;
- sélection : `20/20 PASS` ;
- activation : `11/11 PASS` ;
- scènes V24 : `204/204 PASS` ;
- moteur éditorial quotidien : `216/216 PASS` ;
- stress scènes : `1200/1200 PASS` ;
- publication V24 : `10/10 PASS` ;
- architecture et surfaces Instagram : suites passantes.

L’échec global déjà connu reste hors périmètre :
`EDITORIAL_DOCTRINE_STEP4_FAIL:scene13_showers_context`. Il concerne une
formulation quotidienne et n’a pas été modifié.

## 9. Critère de fin de l’étape 5

L’étape est validée car :

- les épisodes sont hiérarchisés avant publication ;
- le plafond normal de trois est appliqué ;
- l’exception à quatre est contrôlée et justifiée ;
- la meilleure fenêtre compte dans le plafond ;
- les éléments écartés sont traçables ;
- le carrousel bloque un cinquième événement ;
- l’ordre narratif n’a pas été mélangé à cette étape ;
- le moteur quotidien reste intact.

La seule étape active suivante est l’étape 6 : organiser les histoires retenues
pour raconter la semaine dans l’ordre contexte, rupture, conséquence et fenêtre
finale éventuelle.
