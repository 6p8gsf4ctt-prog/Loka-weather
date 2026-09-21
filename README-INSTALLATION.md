# LOKA — slides éditoriales en boxes v3

Ce ZIP est différentiel. Remplacez les fichiers qu’il contient à la racine du dépôt GitHub, en conservant les dossiers `src/` et `tests/`.

## Ce qui change

- La slide 1 reste inchangée.
- Les slides 2, 3 et 4 gardent son en-tête, sa box titre, ses coordonnées et sa signature.
- Elles adoptent désormais trois boxes intérieures :
  1. pictogramme, chiffre clé et sous-titre ;
  2. informations de comparaison ou repère ;
  3. phrase éditoriale unique.
- Les trois boxes se terminent à la même ligne basse que la slide 1.
- L’aperçu de chaque candidate reprend ce même schéma avant publication.

## Déploiement

Aucune migration D1, variable Cloudflare ou commande supplémentaire n’est requise. Validez les fichiers dans GitHub : le déploiement Cloudflare habituel suffit.

## Vérifications

- TypeScript validé ;
- `WEEKLY_CAROUSEL` : 92/92 ;
- validation hebdomadaire de production validée ;
- archive ZIP contrôlée sans erreur.
