# LOKA — système graphique STORY unifié

Ce ZIP est différentiel. Remplacez les fichiers qu’il contient à la racine du dépôt GitHub, en conservant les dossiers `src/` et `tests/`.

## Ce qui change

- La STORY journalière devient la référence graphique 1080 × 1920.
- Les deux formats utilisent désormais le même en-tête, la même box titre, les
  mêmes bornes de contenu et la même signature.
- La STORY semaine reprend les couleurs, typographies, pictogrammes, contours,
  transparences, séparateurs et épaisseurs de texte du journalier.
- Les trois boxes hebdomadaires redistribuent uniquement leur hauteur utile en
  fonction du texte, sans déplacer la grille extérieure.
- Le voile de contraste propre à l’ancien rendu hebdomadaire est supprimé.

## Déploiement

Aucune migration D1, variable Cloudflare ou commande supplémentaire n’est requise. Validez les fichiers dans GitHub : le déploiement Cloudflare habituel suffit.

## Vérifications

- TypeScript validé ;
- `WEEKLY_CAROUSEL` : 102/102 ;
- contrôles visuels journaliers ciblés : 68/68 ;
- validation hebdomadaire de production validée ;
- archive ZIP contrôlée sans erreur.
