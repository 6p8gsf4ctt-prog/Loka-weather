# LOKA — Référence visuelle de la slide 1

Version : 1.5  
Date : 15 septembre 2026  
Format : Publication Instagram 1080 × 1350

Ce document verrouille la composition mesurée à partir de la maquette validée.
Il complète le cahier des charges fonctionnel sans modifier les calculs météo,
le moteur quotidien ou les 24 scènes.

## Géométrie de référence

| Zone | X | Y | Largeur | Hauteur | Rôle |
|---|---:|---:|---:|---:|---|
| En-tête | 45 | 58 | 990 | 55 | Logo, ville, période compacte sur deux lignes |
| Box titre | 45 | 185 | 990 | 110 | Titre seul et trait doré |
| Trois repères | 45 | 320 | 990 | 380 | Trois cartes de même largeur, espacées de 10 px |
| Synthèse | 45 | 725 | 990 | 100 | Une phrase courte, centrée |
| Frise sept jours | 45 | 850 | 990 | 300 | Sept colonnes égales |
| Signature | centré | 1262 | — | — | `Ici, cette semaine.` |

Les trois cartes de repères ont une largeur identique de 323,33 px ; aucun
contenu ne peut modifier leur grille. Les libellés, pictogrammes et valeurs des
deux cartes de température utilisent donc les mêmes lignes de référence.

## Hiérarchie typographique

| Élément | Taille cible | Graisse | Alignement |
|---|---:|---:|---|
| Titre principal | 56 px maximum | 760 | gauche |
| Libellé d’un repère | 19 px | 700 | centré, légèrement espacé |
| Jour du repère | 30 px | 560 | centré, sans contour |
| Température principale | 70 px maximum | 700 | centrée, bleu marine |
| Période de lumière | 30 px maximum | 560 | centrée, sans contour |
| Variation de lumière | 70 px maximum | 700 | centrée, bleu marine |
| Synthèse | 29 px maximum | 500 | centrée, sans contour, deux lignes maximum |
| Jour de la frise | 17 px | 700 | centré |
| Date de la frise | 19 px | 560 | centrée |
| Températures de la frise | 24 px | 600 | centrées, entièrement bleu marine |

## Pictogrammes

- Thermomètre : 155 × 140 px, tracé extérieur continu, colonne et bulbe bleus,
  trois graduations à droite. Aucun cercle ou rectangle ne doit se chevaucher.
- Journée chaude : pictogramme V24 du jour, 195 × 165 px.
- Lumière : pictogramme officiel de lever de soleil, 205 × 154 px.
- Frise : pictogrammes V24 à 106 × 82 px.

Ces tailles nominales sont volontairement différentes : les marges internes
des SVG ne sont pas identiques. Elles produisent une empreinte visuelle voisine
de 100 à 110 px pour chacun des trois pictogrammes.

## Règles de lisibilité

- Les valeurs principales dominent toujours les libellés et les détails.
- La période de l’en-tête suit le format compact validé : `14 — 20` puis
  `SEPTEMBRE`. Pour une semaine à cheval sur deux mois : `28 SEPT. —` puis
  `4 OCTOBRE`.
- La lumière suit la même séquence que les cartes de température : titre,
  pictogramme, période `LUN. N → DIM. N`, puis valeur `−N min`. Les horaires
  de lever et coucher sont conservés dans les données mais ne sont pas affichés
  dans cette slide.
- La synthèse est une phrase éditoriale descriptive de 70 à 100 caractères,
  limitée à deux lignes. Elle ne contient ni conseil, ni intertitre, ni les
  mots de remplissage « globalement » ou « progressivement ».
- Le bleu marine éditorial de la slide est `#061F4C`. Les températures froides,
  chaudes et celles de la frise utilisent toutes cette même couleur.
- Le jaune météo `#FDB515` est réservé aux pictogrammes et au cadre chaud. Le
  soulignement utilise le doré éditorial plus feutré `#C49A3A`.
- La frise utilise un fond blanc translucide à 74 % afin de
  préserver les pictogrammes sur la partie sombre de la scène.
- Les cartes utilisent un blanc à 36 % et la synthèse un blanc à 46 %.
- Les jours extrêmes sont encadrés avec un retrait identique de 8 px, un rayon
  de 12 px et un trait de 1,5 px : doré pour le maximum, bleu pour le minimum.
- En cas d’égalité brute, tous les jours concernés sont encadrés et les deux
  libellés de date sont affichés dans la carte factuelle.

Toute future retouche de la slide 1 doit être comparée à cette grille avant
livraison. Une variation est acceptée uniquement si un contenu réel ne tient
pas dans la zone prévue ; elle ne doit jamais modifier les sorties quotidiennes.
