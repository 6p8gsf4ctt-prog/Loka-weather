# LOKA — renforcement graphique hebdomadaire

Ce ZIP est différentiel. Copiez son contenu à la racine du dépôt en conservant
les dossiers `src/`, `tests/` et `docs/`.

## Mise à jour graphique hebdomadaire

- La PUBLICATION semaine conserve sa grille 1080 × 1440. Sa hiérarchie est
  renforcée de façon sélective : logo, en-tête, titres des sections, chiffres,
  pictogrammes, sous-texte éditorial, frise et slogan gagnent en présence.
- La STORY semaine utilise une zone de composition de 1680 px à partir de
  `y = 120`, avec deux réserves équilibrées de 120 px.
- Ses positions, hauteurs de boxes et espacements suivent un ratio vertical de
  1,167 ; l’échelle visuelle de base est 1,08, puis les mêmes coefficients
  sélectifs de hiérarchie s’appliquent en PUBLICATION et en STORY.
- Les largeurs, alignements et composants graphiques restent issus de la
  PUBLICATION de référence, sans étirement du canvas.
- La PUBLICATION et la STORY journalières restent inchangées.

## Déploiement

Aucune migration D1 ni nouvelle variable Cloudflare n’est requise. Le
déploiement Cloudflare habituel suffit après remplacement des fichiers.

## Vérifications incluses

- compilation TypeScript ;
- contrôle de non-régression du profil journalier ;
- contrôles de hiérarchie et de mutualisation PUBLICATION/STORY hebdomadaires ;
- validation complète de la chaîne hebdomadaire.
