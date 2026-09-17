# LOKA — Audit des références pour les signaux éditoriaux

## Constat local — 16 septembre 2026

Le dépôt fournit aujourd’hui :

- des prévisions multi-modèles et un consensus horaire sur sept jours ;
- les profils journaliers V24 ;
- un historique interne des générations et publications quotidiennes.

Il ne fournit pas encore :

- des observations météo locales historiques comparables ;
- une série de Tmin, Tmax, pluie et rafales observées pour Tarnos ;
- des normales climatiques 1991–2020 exploitables à la date ;
- un historique saisonnier suffisamment long pour les records, percentiles et
  séries « depuis… ».

L’archive interne de générations est une archive de **prévisions**, pas une
archive d’observations. Elle ne peut donc pas justifier une affirmation telle
que « le plus chaud depuis juin » ou « 6 °C au-dessus de la normale ».

## Décision à prendre avant intégration

La source retenue devra explicitement couvrir, pour une localisation proche de
Tarnos et avec des conditions d’utilisation compatibles :

1. observations historiques horaires ou quotidiennes ;
2. température, précipitation et vent au minimum ;
3. périodes et unités documentées ;
4. disponibilité stable pour un moteur automatisé ;
5. normales 1991–2020, ou une méthode documentée pour les dériver ;
6. traçabilité de chaque requête et de chaque valeur stockée.

## Conséquence éditoriale provisoire

Tant que cette source n’est pas choisie et intégrée, seuls les phénomènes
directement démontrés par le consensus peuvent devenir des candidats internes.
Ils ne peuvent pas employer les expressions « depuis… », « record », « au-dessus
de la normale », « rare » ou « parmi les X % ».
