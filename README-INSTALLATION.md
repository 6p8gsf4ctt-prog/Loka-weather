# LOKA — mise à jour éditoriale hebdomadaire v2

Ce ZIP est différentiel : il contient uniquement les fichiers à remplacer dans le dépôt GitHub existant.

## Installation

1. Décompresser le ZIP.
2. Copier son contenu à la racine du dépôt en conservant les dossiers `src/` et `tests/`.
3. Accepter le remplacement des fichiers existants.
4. Valider les changements dans GitHub pour déclencher le déploiement Cloudflare habituel.

Aucune nouvelle migration D1 et aucune nouvelle variable Cloudflare ne sont nécessaires.

## Contenu fonctionnel

- slide 1 strictement inchangée ;
- cadre graphique unique partagé par les slides 1 à 4 ;
- mêmes coordonnées pour l’en-tête, la box du titre, la limite inférieure et la signature ;
- anomalie présentée par l’écart remarquable, avec prévision et valeur habituelle en comparaison ;
- amplitude présentée avec les températures du matin et de l’après-midi ;
- une seule phrase éditoriale, limitée à 25 mots ;
- compositions adaptées aux anomalies, amplitudes, durées, séries, percentiles, records et phénomènes ;
- suppression de la génération de l’ancienne slide `WEEKLY_NUMBER` ;
- aperçu des candidates aligné sur la composition finale ;
- choix de zéro à trois données, sans exclusion automatique ;
- génération sans mot de passe depuis un brouillon D1 temporaire et limité à la ville/semaine affichée ;
- lien immédiat vers le carrousel enregistré.

## Vérifications

- TypeScript : validé ;
- suite hebdomadaire : validée ;
- `WEEKLY_COMPLEMENTARY_SLIDES` : 15/15 ;
- `WEEKLY_COMPLEMENTARY_PREFLIGHT` : 16/16 ;
- `WEEKLY_CAROUSEL` : 91/91 ;
- validation hebdomadaire de production : validée.
