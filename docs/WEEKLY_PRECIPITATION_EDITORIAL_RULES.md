# LOKA — règles éditoriales des précipitations hebdomadaires

## Problème corrigé

L’ancienne règle considérait la pluie comme « fréquente » dès que le cumul
hebdomadaire atteignait 2 mm ou que quatre heures humides étaient détectées.
Elle confondait donc l’intensité d’un épisode isolé avec sa fréquence.

## Preuves conservées

Le moteur expose maintenant, en plus du cumul et des heures humides :

- le nombre de jours humides ;
- les index exacts de ces jours ;
- le cumul quotidien maximal.

Un jour est humide lorsqu’au moins une heure franchit les seuils de pluie et
de consensus déjà définis par le moteur météorologique.

## Classification

| Classe | Condition | Formulation principale |
|---|---|---|
| Isolée | 1 jour humide | Un passage pluvieux possible |
| Dispersée | au moins 2 jours humides et au moins 3 h humides ou 2 mm cumulés | Quelques passages pluvieux |
| Fréquente | au moins 3 jours humides et au moins 6 h humides | Pluies fréquentes |

Les classes sont exclusives et évaluées de la plus forte à la plus faible.
Le cumul seul ne permet jamais d’utiliser « Pluies fréquentes ».

## Formulation prudente

Les quantités prévues utilisent « environ » et « possibles ». Les jours
concernés sont cités pour les épisodes isolés ou dispersés. La validation
d’activation recalcule la classe à partir des preuves et bloque toute
formulation incompatible.
