# Mise à jour — Story comparative journalière

## Accès

La variante reste accessible sur :

`/daily-graphic-preview`

La racine `/` et son moteur journalier de production ne sont pas modifiés.

## Comportement

- La page conserve une seule **PUBLICATION** journalière.
- Une **STORY · COMPARAISON DU JOUR** supplémentaire est affichée lorsqu’un
  signal local est suffisamment solide.
- Le moteur réutilise les références, détecteurs, seuils de qualité, classement,
  formulation prudente et pictogrammes officiels du système hebdomadaire.
- Si aucun signal ne franchit les seuils, aucune comparaison artificielle n’est
  produite.
- La comparaison climatique est pour l’instant activée pour Tarnos, sur la
  station de référence Météo-France Biarritz-Pays-Basque (64024001).

## Système graphique partagé

`src/ui/lokaGraphicSystem.ts` centralise les primitives communes aux variantes
journalière et hebdomadaire : palette, typographie, verre, contours,
séparateurs, échelle et hiérarchie. Les géométries propres à chaque contenu
restent indépendantes.

## Contrôles

- TypeScript : validé.
- Story comparative : 10/10.
- Variante graphique journalière : 11/11.
- Suite hebdomadaire : validée, dont carousel 104/104.
- Le fichier `src/ui/instagramOfficial24.ts` n’est pas inclus dans la mise à
  jour : il n’a pas été modifié.
