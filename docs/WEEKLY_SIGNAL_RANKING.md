# LOKA — Notation et déduplication des signaux N5

## Statut

Étape N5 terminée le 17 septembre 2026. Le classement reste interne : il ne
produit aucun texte public et n'affecte pas encore définitivement les signaux
aux slides 2, 3 et 4.

## Grille de notation

Chaque candidat reçoit cinq notes entières de 0 à 5 :

| Dimension | Question posée |
|---|---|
| Importance | Le phénomène a-t-il une conséquence réelle ? |
| Rareté | Est-il historiquement ou statistiquement inhabituel ? |
| Anomalie | De combien s'éloigne-t-il de sa référence ou de son seuil ? |
| Intérêt éditorial | Peut-il être compris et raconté immédiatement ? |
| Confiance | La prévision est-elle suffisamment robuste ? |

Le total maximal est de 25. Le seuil minimal d'éligibilité est fixé à 13, mais
ce seuil ne remplace jamais les portes de sécurité.

## Portes éliminatoires

Un candidat est rejeté quel que soit son total dans les situations suivantes :

- contrat N1 invalide ;
- confiance `LOW` ;
- record potentiel avec moins de 3 650 observations quotidiennes valides ;
- affirmation « depuis… » avec moins de 365 observations ou moins de 30 jours
  d'écart ;
- percentile ou anomalie sans au moins 300 observations comparables ;
- première occurrence sans 20 saisons historiques ;
- série remarquable sans dix années de référence ;
- total inférieur à 13.

## Hiérarchie

Le classement principal utilise le total sur 25. En cas d'égalité :

1. phénomène important ou changement de régime ;
2. record ou percentile extrême ;
3. historique, anomalie, seuil saisonnier ou série ;
4. curiosité intrajournalière ;
5. niveau de confiance ;
6. identifiant stable pour rendre le résultat indépendant de l'ordre d'entrée.

## Déduplication

Deux niveaux de conflit sont appliqués après notation :

1. **preuve identique** : même métrique, valeur, unité, fenêtre et preuve ;
2. **événement concurrent** : même thème, même jour représentatif et même date
   de fin.

Les thèmes pluie et orage sont regroupés en `WET_WEATHER`. Une pluie forte et
un orage issus du même épisode ne peuvent donc pas occuper deux places dans le
classement. Température, vent et visibilité possèdent leurs propres thèmes.

Le candidat supprimé conserve :

- sa notation complète ;
- la raison `DUPLICATE_PROOF` ou `COMPETING_EVENT` ;
- l'identifiant du candidat qui l'a remplacé.

## Sortie

`rankAndDeduplicateWeeklySignals` retourne :

- tous les candidats notés ;
- le nombre admissible avant déduplication ;
- les gagnants avec un rang continu ;
- les candidats rejetés et leurs raisons ;
- les explications de chaque dimension de notation.

N5 ne limite pas encore le résultat à trois signaux. La complémentarité finale
et l'affectation aux slides appartiennent à N7, après la rédaction prudente N6.
