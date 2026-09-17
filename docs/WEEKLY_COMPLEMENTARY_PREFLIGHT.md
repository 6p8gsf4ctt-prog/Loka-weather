# LOKA — N8 : prévol et rendu des slides complémentaires

## Barrière avant rendu

`src/engine/weekly/complementaryPreflight.ts` valide tout plan issu de N7 avant
qu'il puisse entrer dans `buildWeeklyCarouselPlan`. Un échec lève une erreur
explicite : aucune slide tronquée ou incohérente n'est rendue silencieusement.

Le prévol bloque notamment :

- plus de trois slides ;
- une position non continue après la slide 1 (`2`, puis `3`, puis `4`) ;
- tout frame différent de `WEEKLY_SHARED_V1` ;
- un titre non conforme au rôle ;
- un signal ou un thème répété ;
- une valeur, ligne principale ou ligne secondaire vide ou hors limite ;
- une formulation de prévision présentée comme une observation, et inversement ;
- une note de source trop courte pour assurer la traçabilité.

Les limites éditoriales sont de 32 caractères pour la valeur, 80 pour la ligne
principale et 120 pour la ligne secondaire. Le canvas applique ensuite un fit
borné sur deux lignes : il ne coupe jamais un texte pour le faire rentrer.

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

## Activation progressive

Le flag `WEEKLY_CONTEXTUAL_SLIDES_ENABLED` est volontairement absent par défaut
et `isWeeklyContextualSlidesEnabled` renvoie `false` dans ce cas. Le pipeline
de publication actuel ne transmet aucun plan N7 : il reste donc strictement
sur la slide 1 tant qu'une activation explicitement revue n'est pas réalisée.

La phase de déploiement doit se faire ainsi : aperçu manuel avec un plan N7
prévolé, validation éditoriale, activation du flag en environnement de test,
puis seulement activation de production. Un rejet de prévol doit conserver la
publication existante plutôt que publier une slide incomplète.

## Contrôles

- `tests/weeklyComplementaryPreflight.ts` : 7 garde-fous N8 ;
- `tests/weeklyCarousel.ts` : 5 intégrations de frame et de renderer ;
- les tests N7, activation et carousel existants restent exécutés.
