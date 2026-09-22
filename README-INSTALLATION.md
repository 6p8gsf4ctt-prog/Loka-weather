# LOKA — mise à jour STORY et moteur éditorial

Ce ZIP est différentiel. Copiez son contenu à la racine du dépôt en conservant
les dossiers `src/`, `tests/` et `docs/`.

## Mise à jour graphique

- La STORY journalière et la STORY semaine utilisent désormais la PUBLICATION
  1080 × 1440 comme composition canonique.
- La grille horizontale reste identique à la PUBLICATION. Sa grille verticale
  est étendue de 1440 à 1580 px à partir de `y = 170`.
- Les réserves équilibrées de 170 px réduisent le vide tout en protégeant le
  visuel des interfaces et hashtags Instagram.
- Les positions, hauteurs de boxes et espacements suivent un ratio vertical
  commun de 1,097 ; textes et pictogrammes gagnent 4 % sans déformation.
- Les anciens renderers STORY parallèles ont été supprimés : toute évolution
  de la PUBLICATION est désormais héritée automatiquement par la STORY.

## Mise à jour éditoriale

Le vocabulaire des précipitations dépend maintenant de leur distribution :

- un seul jour humide : passage pluvieux possible ;
- deux jours humides avec un signal suffisant : quelques passages pluvieux ;
- au moins trois jours humides et six heures pluvieuses : pluies fréquentes.

Le cumul en millimètres ne peut donc plus, à lui seul, déclencher la formule
« Pluies fréquentes ».

## Déploiement

Aucune migration D1 ni nouvelle variable Cloudflare n’est requise. Le
déploiement Cloudflare habituel suffit après remplacement des fichiers.

## Vérifications incluses

- compilation TypeScript ;
- contrôles de mutualisation PUBLICATION/STORY journaliers ;
- contrôles de mutualisation PUBLICATION/STORY hebdomadaires ;
- tests éditoriaux dédiés aux pluies isolées, dispersées et fréquentes ;
- validation de cohérence des preuves éditoriales avant activation.
