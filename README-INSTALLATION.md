# LOKA — renforcement graphique hebdomadaire

Ce ZIP est différentiel. Copiez son contenu à la racine du dépôt en conservant
les dossiers `src/`, `tests/` et `docs/`.

## Mise à jour graphique hebdomadaire

- La PUBLICATION semaine conserve sa grille 1080 × 1440, mais ses caractères,
  valeurs et pictogrammes gagnent 6 % de présence visuelle.
- La STORY semaine utilise une zone de composition de 1630 px à partir de
  `y = 145`, avec deux réserves équilibrées de 145 px.
- Ses positions, hauteurs de boxes et espacements suivent un ratio vertical de
  1,132 ; textes et pictogrammes utilisent une échelle de 1,08.
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
