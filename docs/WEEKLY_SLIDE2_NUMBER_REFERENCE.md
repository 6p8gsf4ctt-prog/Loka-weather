# LOKA — Slide 2 : « Le chiffre de la semaine »

## Contrat visuel verrouillé

La slide 2 est le jumeau structurel de la slide 1 et du cadre quotidien :

- format `1080 × 1440` ;
- même fond `SEMAINE_HOMOGENE` ;
- même en-tête (logo, Tarnos, période) ;
- même box de titre : `x=50`, `y=160`, `980 × 150` ;
- même footer `Ici, cette semaine.` ;
- ligne basse de la grande box à `y=1305`, exactement comme la box basse du
  cadre quotidien.

Seul le contenu intérieur varie. La grande box contient un pictogramme LOKA,
une seule valeur très lisible, son libellé et une phrase explicative bornée à
deux lignes. Aucune seconde statistique, aucun tableau et aucune décoration
concurrente ne sont ajoutés.

## Choix moteur V1

Le moteur évalue, dans cet ordre de force, une seule statistique basée sur les
sept profils horaires consensuels :

1. cumul hebdomadaire de pluie significatif ;
2. amplitude thermique forte ;
3. heures au-dessus de `20 °C` ;
4. heures lumineuses évaluées pendant le jour.

Chaque candidate conserve sa valeur brute, sa mesure affichée, une phrase
factuelle et un jour représentatif. À défaut de seuil remarquable, l’amplitude
thermique devient le repli : la slide ne reste jamais vide et ne formule jamais
une information non calculée.

Les slides 3 et 4 ne sont pas rendues dans cette étape : leurs composants
« À savoir cette semaine » et « Le détail à remarquer » recevront chacun leur
propre contrat de sélection, afin de ne pas republier l’ancien template
« temps fort météo ».
