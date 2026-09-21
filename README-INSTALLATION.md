# LOKA — slide 1 hebdomadaire · Story + Publication

Ce ZIP est différentiel. Remplacez les fichiers qu’il contient à la racine du dépôt GitHub, en conservant les dossiers `src/` et `tests/`.

## Ce qui change

- La slide 1 Publication reprend la maquette validée : cartouche titre, trois cartes de faits séparées, box éditoriale et frise hebdomadaire.
- La slide 1 Story est générée nativement en 1080 × 1920 avec le même header, les mêmes tokens de verre, les mêmes séparateurs, la même hiérarchie et le même footer.
- Les slides éditoriales complémentaires sont proposées en Story uniquement dans l’aperçu.
- Les séparateurs, pictogrammes, températures, repères, textes, données métier et sources restent inchangés.
- L’ancien relais Story séparé n’est plus généré.
- Les sorties restent pilotées par les données du moteur : un changement de semaine ne demande aucune intervention graphique.

## Déploiement

Aucune migration D1, variable Cloudflare ou commande supplémentaire n’est requise. Validez les fichiers dans GitHub : le déploiement Cloudflare habituel suffit.

## Vérifications

- TypeScript validé ;
- `WEEKLY_CAROUSEL` : 92/92 ;
- validation hebdomadaire de production validée ;
- archive ZIP contrôlée sans erreur.
