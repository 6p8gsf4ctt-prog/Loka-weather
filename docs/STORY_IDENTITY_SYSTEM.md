# LOKA — système graphique STORY

## Principe

La PUBLICATION 1080 × 1440 est l’unique composition graphique de référence.
La STORY 1080 × 1920 n’est plus un deuxième design : elle dessine le fond
météo sur toute sa hauteur, puis réutilise la composition de la PUBLICATION à
son échelle native, centrée verticalement.

Cette règle s’applique de manière identique au journalier et à l’hebdomadaire.

## Géométrie commune

| Élément | Valeur |
|---|---:|
| Canvas STORY | 1080 × 1920 px |
| Composition PUBLICATION | 1080 × 1440 px |
| Position de la PUBLICATION | x 0 · y 240 |
| Réduction | aucune, échelle 1:1 |
| Réserve Instagram supérieure | 240 px |
| Réserve Instagram inférieure | 240 px |

Le fond est rendu une seule fois en 1080 × 1920. La PUBLICATION n’est pas
collée comme une image et ne redessine pas son fond : seules ses primitives de
contenu sont exécutées après une translation verticale de 240 px. Il n’existe
donc ni couture, ni différence de recadrage, ni perte de netteté.

## Mutualisation

Pour chaque produit, la PUBLICATION et la STORY appellent le même renderer de
composition. Sont ainsi strictement identiques :

- logo, ville et date ;
- box titre ;
- modules de contenu et leurs dimensions ;
- pictogrammes, typographies, couleurs et contrastes ;
- rayons, contours, transparences, traits et séparateurs ;
- marges, espacements, alignements et signature.

Le fichier `src/ui/storyFrame.ts` ne contient que le contrat de l’enveloppe
STORY. Les coordonnées graphiques restent la responsabilité du cadre de
PUBLICATION et de son renderer.

## Responsabilités

| Partagé avec la PUBLICATION | Spécifique à la STORY |
|---|---|
| Toute la composition graphique | Canvas 1080 × 1920 |
| Toute la hiérarchie éditoriale | Fond étendu sur la hauteur |
| Toutes les box et leurs contenus | Translation verticale de 240 px |
| En-tête et signature | Réserves Instagram haute et basse |

## Contrôles de régression

- la composition doit être rendue à l’échelle 1:1 ;
- les réserves haute et basse doivent rester égales à 240 px ;
- aucun renderer parallèle de box STORY ne doit être réintroduit ;
- le journalier et l’hebdomadaire doivent tous deux appeler leur renderer de
  PUBLICATION depuis leur renderer STORY ;
- toute évolution graphique doit être faite sur la PUBLICATION, puis héritée
  automatiquement par la STORY.
