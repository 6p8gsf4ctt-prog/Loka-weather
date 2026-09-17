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

## État du moteur

La sélection V20 de cumul brut, amplitude entre jours, heures chaudes ou heures
lumineuses est retirée du chemin de publication. Ces valeurs pourront devenir
des preuves internes, mais ne suffisent pas à elles seules à justifier une
slide.

La slide 2 est volontairement absente tant qu’un signal contextualisé n’a pas
été validé par le moteur décrit dans
`docs/WEEKLY_EDITORIAL_SIGNAL_ENGINE_PLAN.md`.

## Historique V20 — non publiable

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

Les slides 3 et 4 recevront leurs propres contrats de sélection. Aucun ancien
template « temps fort météo » ne sera republié.
