# LOKA — N8 : prévol et rendu des slides complémentaires

## Barrière avant rendu

`src/engine/weekly/complementaryPreflight.ts` produit désormais un rapport
unique de douze contrôles avant que les slides 2 à 4 puissent entrer dans
`buildWeeklyCarouselPlan`. Un échec lève une erreur explicite : aucune slide
tronquée ou incohérente n'est rendue silencieusement.

Le prévol bloque notamment :

- plus de trois slides ;
- une position non continue après la slide 1 (`2`, puis `3`, puis `4`) ;
- tout frame différent de `WEEKLY_SHARED_V1` ;
- un titre non conforme au rôle ;
- un signal ou un thème répété ;
- une valeur, ligne principale ou ligne secondaire vide ou hors limite ;
- une formulation de prévision présentée comme une observation, et inversement ;
- une source non démontrée par les preuves structurées du signal ;
- une valeur qui ne correspond pas aux profils météo horaires ou journaliers ;
- une formulation superlative qui masquerait un ex æquo exact ;
- un pictogramme extérieur à la bibliothèque officielle LOKA ou incohérent
  avec le thème ;
- un texte qui dépasserait les dimensions réelles du canvas, même s'il reste
  sous la limite brute de caractères.

Les limites éditoriales restent de 32 caractères pour la valeur, 80 pour la
ligne principale et 120 pour la ligne secondaire. Le prévol simule en plus la
largeur typographique aux corps minimums réellement employés par le canvas.

Un rapport sans profils ni classement est marqué `comprehensive: false`. Il
peut servir à un test structurel isolé, mais `validateWeeklyActivation` refuse
de l'utiliser pour autoriser une publication. Seul le rapport complet, calculé
par `buildWeeklyContextualPipeline`, peut franchir la barrière d'activation.

## Frame verrouillé

Les trois slides utilisent `WEEKLY_COMPLEMENTARY_DAILY_FEED_GRID`, alias direct
de `WEEKLY_SLIDE2_DAILY_FEED_GRID` :

- canvas `1080 × 1440` ;
- en-tête quotidien partagé ;
- title box `x=50, y=160, 980 × 150` ;
- box basse terminée à `y=1305` ;
- signature `Ici, cette semaine.` à `y=1368`.

Le fond est toujours `SEMAINE_HOMOGENE.jpeg`, identique à la slide 1. Les
slides complémentaires n'utilisent pas un fond V24 de journée. Seul le module
intérieur varie ; les pictogrammes restent issus de la bibliothèque officielle
LOKA.

## Intégration

Le pipeline éditorial calcule le rapport complet à partir des mêmes profils,
du même classement et du même état de référence climatique que les slides.
Le fingerprint du plan empêche ensuite de réutiliser ce rapport après une
modification du texte, de la valeur, du thème, du pictogramme ou de la source.

La slide 1 reste hors de cette surface : elle demeure validée et générée dans
« Prévisions réelles ». Le prévol décrit ici protège uniquement les slides
éditoriales 2 à 4.

## Contrôles

- `tests/weeklyComplementaryPreflight.ts` : 16 scénarios couvrant les 12
  garde-fous, le contrôle de largeur canvas et le verrou d'empreinte ;
- `tests/weeklyCarousel.ts` : 5 intégrations de frame et de renderer ;
- les tests N7, activation et carousel existants restent exécutés.
