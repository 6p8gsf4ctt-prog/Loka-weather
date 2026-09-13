# LOKA — Référence visuelle de la slide 1

Version : 1.1  
Date : 13 septembre 2026  
Format : Publication Instagram 1080 × 1350

Ce document verrouille la composition mesurée à partir de la maquette validée.
Il complète le cahier des charges fonctionnel sans modifier les calculs météo,
le moteur quotidien ou les 24 scènes.

## Géométrie de référence

| Zone | X | Y | Largeur | Hauteur | Rôle |
|---|---:|---:|---:|---:|---|
| En-tête | 45 | 58 | 990 | 55 | Logo, ville, période |
| Box titre | 45 | 185 | 990 | 210 | Titre et sous-titre |
| Trois repères | 45 | 420 | 990 | 380 | Trois cartes, espacées de 10 px |
| Synthèse | 45 | 820 | 990 | 105 | Une phrase centrée |
| Frise sept jours | 45 | 945 | 990 | 250 | Sept colonnes égales |
| Signature | centré | 1274 | — | — | `Ici, cette semaine.` |

La frise se termine à Y=1195. Il reste environ 79 px avant la ligne de base de
la signature, contre plus de 150 px dans la version précédente.

## Hiérarchie typographique

| Élément | Taille cible | Graisse | Alignement |
|---|---:|---:|---|
| Titre principal | 68 px maximum | 820 | gauche |
| Sous-titre | 36 px maximum | 400 | gauche, sans contour |
| Libellé d’un repère | 19 px | 700 | centré, légèrement espacé |
| Jour du repère | 30 px | 560 | centré, sans contour |
| Température principale | 70 px maximum | 700 | centrée, bleu marine |
| Variation de lumière | 38 px maximum | 700 | centrée, bleu marine |
| Détail lever/coucher | 14 px maximum | 450 | une seule ligne centrée |
| Synthèse | 32 px maximum | 400 | centrée, sans contour, deux lignes maximum |
| Jour de la frise | 17 px | 700 | centré |
| Date de la frise | 19 px | 560 | centrée |
| Températures de la frise | 24 px | 600 | centrées, entièrement bleu marine |

## Pictogrammes

- Thermomètre : 148 × 132 px, tracé extérieur continu, colonne et bulbe bleus,
  trois graduations à droite. Aucun cercle ou rectangle ne doit se chevaucher.
- Journée chaude : pictogramme V24 du jour, 170 × 145 px.
- Lumière : pictogramme officiel de lever de soleil, 205 × 154 px.
- Frise : pictogrammes V24 à 106 × 82 px.

Ces tailles nominales sont volontairement différentes : les marges internes
des SVG ne sont pas identiques. Elles produisent une empreinte visuelle voisine
de 100 à 110 px pour chacun des trois pictogrammes.

## Règles de lisibilité

- Les valeurs principales dominent toujours les libellés et les détails.
- La lumière affiche une seule donnée forte : `−N min de jour`, puis une seule
  ligne compacte de lever et coucher.
- La synthèse est informative mais non dominante ; elle n’utilise pas une
  graisse de titre.
- Le bleu marine éditorial de la slide est `#061F4C`. Les températures froides,
  chaudes et celles de la frise utilisent toutes cette même couleur.
- Le jaune météo `#FDB515` est réservé aux pictogrammes et au cadre chaud. Le
  soulignement utilise le doré éditorial plus feutré `#C49A3A`.
- La frise utilise un fond blanc translucide à 80 % afin de
  préserver les pictogrammes sur la partie sombre de la scène.
- Les cartes utilisent un blanc à 48 % et la synthèse un blanc à 66 %.
- Les jours extrêmes sont encadrés avec un retrait identique de 8 px, un rayon
  de 12 px et un trait de 2 px : doré pour le maximum, bleu pour le minimum.

Toute future retouche de la slide 1 doit être comparée à cette grille avant
livraison. Une variation est acceptée uniquement si un contenu réel ne tient
pas dans la zone prévue ; elle ne doit jamais modifier les sorties quotidiennes.
