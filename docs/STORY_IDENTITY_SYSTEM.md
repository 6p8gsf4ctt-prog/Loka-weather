# LOKA — système graphique STORY

## Principe

La PUBLICATION 1080 × 1440 reste l’unique composition graphique de référence.
La STORY 1080 × 1920 n’est pas un deuxième design : elle dessine le fond météo
sur toute sa hauteur, puis réutilise les mêmes composants avec un profil de
mise en page vertical dérivé de la PUBLICATION.

Cette règle s’applique aux deux produits, avec deux profils distincts : le
journalier reste la référence fine ; l’hebdomadaire adopte une présence plus
affirmée adaptée à sa densité d’information.

## Géométrie commune

| Élément | Journalier | Hebdomadaire |
|---|---:|---:|
| Canvas STORY | 1080 × 1920 px | 1080 × 1920 px |
| Grille source PUBLICATION | 1080 × 1440 px | 1080 × 1440 px |
| Zone de composition STORY | 1080 × 1580 px | 1080 × 1680 px |
| Position de la composition | x 0 · y 170 | x 0 · y 120 |
| Échelle horizontale | 1:1 | 1:1 |
| Ratio vertical | 1,0972 | 1,1667 |
| Échelle visuelle de base (avant hiérarchie sélective) | 1,04 | 1,08 |
| Réserve Instagram supérieure | 170 px | 120 px |
| Réserve Instagram inférieure | 170 px | 120 px |

Le fond est rendu une seule fois en 1080 × 1920. La PUBLICATION n’est pas
collée comme une image : le moteur recalcule individuellement les coordonnées
verticales, les hauteurs de boxes et les espacements. Les textes et
pictogrammes conservent leurs proportions ; aucun étirement du canvas ou du
contenu n’est appliqué.

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
| Toutes les box et leurs contenus | Profils verticaux journalier et hebdomadaire |
| En-tête et signature | Réserves Instagram haute et basse |

## Contrôles de régression

- la largeur et la grille horizontale doivent rester à l’échelle 1:1 ;
- les réserves haute et basse doivent rester symétriques dans chaque profil ;
- positions, boxes et espacements doivent utiliser le même ratio vertical ;
- textes et pictogrammes ne doivent jamais être étirés verticalement ;
- une évolution hebdomadaire ne doit pas modifier le profil journalier ;
- aucun renderer parallèle de box STORY ne doit être réintroduit ;
- le journalier et l’hebdomadaire doivent tous deux appeler leur renderer de
  PUBLICATION depuis leur renderer STORY ;
- toute évolution graphique doit être faite sur la PUBLICATION, puis héritée
  automatiquement par la STORY.
