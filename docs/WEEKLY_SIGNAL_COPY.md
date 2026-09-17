# LOKA — Rédaction prudente des signaux N6

## Statut

Étape N6 terminée le 17 septembre 2026. La rédaction est déterministe : aucune
phrase libre n'est inventée et chaque élément publié provient d'un fait retenu
par N4–N5.

## Contrat éditorial partagé

Les textes hebdomadaires utilisent `buildLokaEditorialCopy`, le même contrat
que les synthèses quotidiennes :

- première ligne : information principale, 80 caractères maximum ;
- deuxième ligne : précision factuelle, 120 caractères maximum ;
- deux lignes non vides et différentes ;
- espaces et caractères normalisés.

## Statuts de formulation

| Statut | Usage | Formulation |
|---|---|---|
| `OBSERVED` | fait passé et source observée | passé affirmatif |
| `EXPECTED` | prévision de confiance élevée | « devrait », « est prévu » |
| `POSSIBLE` | prévision de confiance moyenne | « pourrait », « est possible » |
| `IF_CONFIRMED` | record futur potentiel | « Si … se confirment… » |

Une prévision à faible confiance ne peut pas être rédigée. Un signal marqué
`OBSERVATION` est également refusé si l'une de ses preuves provient encore du
consensus de prévision.

## Règles par famille

- **Historique depuis** : conditionnel en prévision, date comparable citée.
- **Record potentiel** : jamais annoncé comme battu avant observation.
- **Anomalie** : « référence locale » ou « période comparable » ; jamais
  « normale officielle » pour une statistique dérivée.
- **Percentile** : traduction grand public, par exemple « parmi les 5 % des
  valeurs les plus élevées ».
- **Première occurrence** : seuil et saison explicitement indiqués.
- **Phénomène important** : valeur et unité concrètes, sans dramatisation.
- **Changement de régime** : direction et amplitude en 24 heures.
- **Série** : définition de la série et longueur historique comparée.
- **Intrajournalier** : même journée et horaires conservés.

## Sortie interne

`buildWeeklySignalCopy` retourne :

- l'identifiant du signal ;
- le mode prévision/observation ;
- le statut de prudence ;
- la valeur destinée à l'affichage ;
- les deux lignes éditoriales ;
- une note de source interne ;
- un texte d'accessibilité complet.

La fonction refuse tout candidat rejeté, supprimé par déduplication ou non
classé. N6 ne choisit pas encore le titre de slide, le pictogramme ou la mise
en page : ces responsabilités appartiennent à N7 et N8.
