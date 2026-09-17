# LOKA — Affectation des slides complémentaires N7

## Statut

Étape N7 terminée le 17 septembre 2026. La sélection relie les candidats
classés N5 et les textes N6 aux trois rôles éditoriaux du carrousel, sans encore
dessiner les slides.

## Rôles

| Position | Titre | Sélection privilégiée |
|---:|---|---|
| 2 | `LE CHIFFRE DE LA SEMAINE` | record, historique, anomalie, percentile, seuil ou série contextualisés |
| 3 | `À SAVOIR CETTE SEMAINE` | phénomène important ou changement de régime à anticiper |
| 4 | `LE DÉTAIL À REMARQUER` | première occurrence, série, variation intrajournalière ou curiosité prouvée |

La position est adaptative. Si aucun signal pratique distinct n’existe mais
qu’un détail est pertinent, le détail devient la troisième page physique du
carrousel. S’il n’existe qu’un phénomène important, il peut devenir la seule
slide complémentaire, en position 2.

## Complémentarité obligatoire

Un thème ne peut être retenu qu’une fois :

- température ;
- pluie/orage ;
- vent ;
- visibilité ;
- lumière ;
- autre variable démontrée.

Ainsi, un chiffre de pluie ne peut pas être suivi d’une information pratique
sur ce même épisode puis d’un détail orageux concurrent. Les candidats non
retenus restent traçables dans `omittedSignalIds`.

## Contrat rendu

Chaque slide N7 reçoit uniquement des données préparées :

- titre fixe ;
- valeur forte ;
- deux lignes N6 ;
- statut de prudence ;
- note de source ;
- thème et intention de pictogramme ;
- identifiant du signal et du détecteur ;
- frame obligatoire `WEEKLY_SHARED_V1`.

Cette dernière contrainte impose à N8 de réutiliser le même fond, en-tête,
title box, baseline basse et footer que la slide 1 et la publication
quotidienne. Aucun nouveau cadre graphique n’est autorisé.

## Limites volontaires

N7 ne sélectionne jamais plus de trois slides, ne crée jamais une slide pour
remplir une place vide et ne réécrit jamais les phrases N6. Les règles de
prévol, rendu, tailles de texte et activation publique restent à réaliser en
N8.
