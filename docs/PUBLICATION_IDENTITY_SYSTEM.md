# LOKA — système graphique commun des PUBLICATIONS

Version : 1.0  
Référence : PUBLICATION journalière 1080 × 1440  
Déclinaison : PUBLICATION hebdomadaire 1080 × 1440

## Décision de conception

La PUBLICATION journalière est la source de vérité graphique. Le format
hebdomadaire ne possède plus sa propre charte : il utilise le même cadre, les
mêmes primitives et les mêmes assets. Seuls le contenu et, lorsque la quantité
de texte varie, la hauteur utile des box changent.

La box titre est verrouillée à `x=50`, `y=160`, `980 × 150 px` dans les deux
formats. Elle ne participe jamais au calcul adaptatif.

## Mesures de référence

| Élément | Valeur commune |
| --- | ---: |
| Canvas | 1080 × 1440 px |
| Marge latérale | 50 px |
| Largeur utile | 980 px |
| Logo | x=50, centre y=79, max. 174 × 58 px |
| Ville | x=540, baseline 94, 22 px, poids 680, tracking 8 px |
| Date/période | x=1030, baseline 94, 19 px, poids 540 |
| Box titre | x=50, y=160, 980 × 150 px |
| Bas de contenu | y=1305 |
| Signature | baseline 1368, 18 px, poids 500, opacité 88 % |
| Trait de signature | x=518→562, y=1387, 1,2 px |

## Palette et typographie

- Police de canvas : `"Helvetica Neue", Arial, sans-serif`.
- Marine : `#12264A`.
- Or météo et accents : `#FDB515`.
- Blanc : `#FFFFFF`.
- Les pictogrammes proviennent exclusivement de la bibliothèque officielle
  `LOKA_PREMIUM_1.2`.
- Les textes de canvas utilisent le même renfort de contour (`0,44 px`), le
  même joint arrondi et la même limite de raccord dans les deux formats.

Les anciennes couleurs hebdomadaires `#061F4C`, `#C49A3A` et `#5FA7E7` ne
constituent plus des tokens de publication. Les distinctions chaud/frais sont
désormais exprimées avec l’or et le marine officiels, éventuellement avec une
opacité réduite.

## Primitive de box commune

Toutes les box de publication utilisent la même fonction de dessin :

- rayon extérieur : 36 px ;
- contour blanc : 88 %, 1,45 px ;
- dégradé vertical blanc : 19 % → 14,5 % → 10,5 % ;
- reflet supérieur : 20 % → 2 % ;
- rayon intérieur du reflet : 34 px ;
- séparateurs : marine à 13 %, 1,05 px.

Il n’existe plus de fond à 36 %, 46 % ou 74 % propre à l’hebdomadaire. Cette
suppression évite que la frise ou la synthèse paraissent appartenir à une autre
famille graphique.

## Règle d’adaptation

La zone située entre `y=336` et `y=1305` est la zone de contenu variable. Les
slides éditoriales hebdomadaires y placent trois box avec un intervalle commun
de 22 px.

Le calcul tient compte de trois quantités mesurées avec la vraie police du
canvas :

1. nombre de lignes du sous-titre principal ;
2. présence d’une comparaison ou nombre de lignes du repère ;
3. nombre de lignes de la conclusion éditoriale.

Les hauteurs désirées sont calculées à partir de ces mesures, puis le reliquat
est réparti entre les trois box. En cas de contenu plus long, l’espace est
repris proportionnellement sans passer sous les hauteurs minimales. La dernière
box termine toujours exactement à `y=1305` ; la grille et la signature ne
bougent donc jamais.

## Mutualisé dans le moteur

| Élément | Source commune |
| --- | --- |
| Dimensions, en-tête, box titre, ligne basse, signature | `src/ui/feedFrame.ts` |
| Opacités, contours, rayons, séparateurs, épaisseur de texte hebdomadaires | `src/ui/weeklyPublicationStyle.ts` |
| Logo, police, slogans | `src/ui/lokaBrand.ts` |
| Marine, or et pictogrammes | `src/ui/pictogramLibrary.ts` |
| Hiérarchie de la synthèse éditoriale | `src/ui/editorialSummaryFrame.ts` |
| Rendu journalier de référence | `src/ui/instagramOfficial24.ts` |
| Déclinaison hebdomadaire | `src/engine/weekly/carousel.ts` |

## Spécifique au contenu hebdomadaire

- période lundi–dimanche dans le champ date ;
- trois repères de semaine et frise de sept jours ;
- contenus contextuels sélectionnés par le moteur éditorial ;
- slogan `Ici, cette semaine.` ;
- adaptation de hauteur des box contextuelles.

Ces éléments peuvent modifier le texte, le pictogramme choisi et la place
nécessaire au contenu. Ils ne peuvent pas modifier le logo, la police, la
palette, la primitive de box, les marges, la box titre, la ligne basse ou la
signature.

## Contrôles de non-régression

- compilation TypeScript ;
- suite hebdomadaire complète ;
- tests du cadre quotidien, de la marque, du logo et de la hiérarchie visuelle ;
- vérification que les box adaptatives conservent `y=336`, `y=1305` et 22 px
  entre elles ;
- vérification que les deux renderers consomment les mêmes tokens de verre et
  d’épaisseur de texte.
