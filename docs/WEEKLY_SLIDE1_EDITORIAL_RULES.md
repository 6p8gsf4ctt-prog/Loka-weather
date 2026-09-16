# LOKA — Règles éditoriales de la slide hebdomadaire

Version : 1.0  
Date : 16 septembre 2026

## 1. Périmètre

Ces règles ne modifient aucun élément graphique. Elles régissent uniquement
les deux lignes de la box éditoriale et les contrôles qui précèdent l’export.

## 2. Extrêmes et ex æquo

- **Matin le plus frais** : minimum réel des températures horaires entre 05 h
  et 10 h, sans arrondi préalable.
- **Journée la plus chaude** : maximum réel des températures horaires sur les
  24 heures, sans arrondi préalable.
- Une égalité est reconnue seulement si les valeurs brutes sont égales. Tous
  les jours concernés sont inscrits dans la carte (`LUN. 21 & MER. 23`) et
  encadrés dans la frise.
- Deux valeurs qui s’affichent avec le même entier après arrondi ne constituent
  pas une égalité si leurs valeurs brutes diffèrent.

## 3. Vocabulaire thermique V1

| Tmax hebdomadaire | Qualification autorisée |
|---:|---|
| `< 10 °C` | Temps froid |
| `10–14,9 °C` | Temps frais |
| `15–19,9 °C` | Temps doux |
| `20–24,9 °C` | Temps agréable |
| `25–29,9 °C` | Temps chaud |
| `≥ 30 °C` | Chaleur marquée |

Le moteur ne peut donc jamais employer « temps doux » pour une semaine qui
culmine à `30 °C` ou davantage.

## 4. Forme éditoriale

La synthèse contient exactement deux niveaux :

1. une tendance dominante ;
2. une précision factuelle.

Exemple avec une Tmax isolée de `31 °C` le jeudi :

```text
Chaleur marquée · Temps majoritairement sec
Les températures culmineront à 31 °C jeudi.
```

Le moteur utilise « davantage de soleil » uniquement lorsque, entre les deux
premiers et les deux derniers jours, la fraction lumineuse progresse d’au moins
20 points **et** que la nébulosité moyenne baisse d’au moins 15 points. La
formulation « plus nuageux » exige les seuils inverses. « Sec » exige zéro heure
humide et au plus 0,2 mm sur la semaine ; « soleil bien présent » exige en plus
une fraction lumineuse moyenne d’au moins 60 %.

## 5. Préflight obligatoire

Avant export, le moteur bloque la publication si :

- un extrême ou son libellé ne représente pas tous les jours ex æquo ;
- la carte chaude ne correspond pas au maximum brut de la frise ;
- un mot thermique ne correspond pas au seuil de Tmax ;
- une progression du soleil, une dégradation nuageuse, le sec ou le soleil
  dominant est affirmé sans preuve chiffrée ;
- une ligne éditoriale dépasse ses limites de longueur ;
- une carte, une journée de frise ou un pictogramme ne correspond pas à la
  donnée V24 source.
