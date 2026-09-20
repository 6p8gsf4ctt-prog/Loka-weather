# LOKA — slide 1 · box statistique unique

Cette mise à jour différentielle s’installe après `LOKA-weekly-scenes23-maquette-v1-direct`.
Elle contient uniquement les deux fichiers à remplacer.

## Installation dans GitHub

1. Décompresser le ZIP.
2. Importer son contenu à la racine du dépôt.
3. Conserver l’arborescence `src/` et `tests/`.
4. Accepter le remplacement des deux fichiers existants.
5. Valider les changements pour déclencher le déploiement Cloudflare habituel.

Aucune commande de terminal, migration D1 ou variable Cloudflare supplémentaire n’est nécessaire.

## Modification graphique

- une seule box pour les trois données principales de la slide 1 ;
- trois colonnes de largeur strictement identique ;
- suppression des espaces et contours entre les anciennes petites boxes ;
- deux séparateurs verticaux utilisant le séparateur déjà présent dans la frise hebdomadaire ;
- contenu, pictogrammes, tailles, alignements et hauteur du bloc conservés ;
- box éditoriale, frise, en-tête, titre et footer inchangés ;
- scènes 2, 3 et 4 inchangées.

## Vérifications

- TypeScript : validé ;
- suite hebdomadaire complète : validée ;
- `WEEKLY_CAROUSEL` : 93/93 ;
- contrôle automatique : une seule box et réutilisation du séparateur commun.
