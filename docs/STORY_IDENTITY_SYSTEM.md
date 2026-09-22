# LOKA — système graphique STORY

Référence : STORY journalière 1080 × 1920  
Déclinaison : STORY hebdomadaire 1080 × 1920

## Principe

La STORY journalière est l’unique source de vérité graphique. Le contenu
hebdomadaire conserve son sens éditorial, mais ne possède plus de cadre, de
contraste ou de primitives visuelles autonomes.

Le contrat est centralisé dans `src/ui/storyFrame.ts`. Les deux moteurs
consomment les mêmes valeurs au lieu de recopier des coordonnées.

## Cadre permanent

| Élément | Valeur commune |
|---|---:|
| Canvas | 1080 × 1920 px |
| Logo | x 50 · centre y 144 · 190 × 64 px max. |
| Ville | x 540 · ligne de base 158 · 25 px · graisse 680 · approche 8 |
| Date | x 1030 · ligne de base 158 · 22 px · graisse 540 |
| Box titre | x 44 · y 200 · 992 × 150 px |
| Début des contenus | y 396 |
| Fin des contenus | y 1734 |
| Signature | x 540 · ligne de base 1810 · 22 px · graisse 500 |
| Soulignement | x 514–566 · y 1834 · 1,4 px |

## Primitives partagées

Les deux formats utilisent la même police Helvetica Neue/Arial, le bleu
`#12264A`, l’or `#FDB515`, la même épaisseur de texte et la primitive de box
translucide définie par `LOKA_PUBLICATION_STYLE` : rayon, contour, dégradé,
reflet et séparateurs sont identiques.

Le rendu hebdomadaire ne pose plus de voile sombre supplémentaire sur le fond.
Son niveau de contraste dépend désormais des mêmes box et des mêmes textes que
le journalier.

## Adaptation hebdomadaire

La grille extérieure ne varie jamais. Les trois modules hebdomadaires occupent
la zone `396–1734` avec les deux espacements issus du journalier : 39 puis
44 px.

| Module | Hauteur préférée | Hauteur minimale |
|---|---:|---:|
| Faits de la semaine | 704 px | 620 px |
| Synthèse éditoriale | 272 px | 220 px |
| Bandeau des sept jours | 279 px | 279 px |

La synthèse reçoit de la hauteur supplémentaire lorsque ses lignes en ont
besoin. Cette hauteur est prélevée uniquement sur la box des faits, jusqu’à sa
limite minimale. Le bandeau inférieur, les marges, les espacements et la
signature restent fixes.

## Responsabilités

| Partagé | Spécifique à la STORY semaine |
|---|---|
| Canvas et zones sûres | Trois faits hebdomadaires |
| En-tête et logo | Synthèse de semaine |
| Box titre et primitive de verre | Bandeau de sept jours |
| Police, palette et épaisseur de texte | Marqueurs froid/chaud |
| Séparateurs et accent or | Calcul des hauteurs utiles |
| Bornes de contenu et signature | Données météo hebdomadaires |

## Contrôles de régression

- le TypeScript doit compiler sans erreur ;
- les tests journaliers doivent conserver les coordonnées historiques ;
- la suite `WEEKLY_CAROUSEL` contrôle le cadre partagé, l’adaptation des box et
  l’absence du voile hebdomadaire ;
- toute modification future des coordonnées STORY doit être faite dans
  `storyFrame.ts`, puis validée sur les deux formats.
