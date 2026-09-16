# LOKA — Référence visuelle de la slide 1

Version : 2.1  
Date : 15 septembre 2026  
Format : Publication Instagram 1080 × 1440

Ce document verrouille la composition mesurée à partir de la maquette validée
et de la publication quotidienne LOKA au format 1080 × 1440. Les deux sorties
partagent maintenant le même cadre de feed. Il complète le
cahier des charges fonctionnel sans modifier les calculs météo, le rendu
visuel quotidien ou les 24 scènes.

## Statut graphique V1 — verrouillé

Cette maquette est la référence graphique de la publication hebdomadaire.
Toute évolution ultérieure doit préserver les coordonnées, dimensions,
proportions, fond, trois cartes, box éditoriale, frise et signature décrits
ci-dessous. Les ajustements V19 concernent exclusivement les données,
l’éditorial et les contrôles avant export.

## Repères repris de la publication quotidienne

| Référence quotidienne | Valeur | Transposition hebdomadaire 1080 × 1440 |
|---|---:|---:|
| Marge latérale | 50 px | 50 px |
| Largeur utile | 980 px | 980 px |
| Box titre | `Y=160`, `H=150` | Identique |
| Bas de la box inférieure | `Y=1305` | Identique |
| Footer, ligne de base | 72 px du bas | 72 px du bas (`Y=1368`) |
| Footer, trait doré | 53 px du bas | 53 px du bas (`Y=1387`) |
| Footer, texte | 18 px / poids 500 / marine à 88 % | Identique, seul « aujourd’hui » devient « cette semaine » |

## Géométrie de référence

| Zone | X | Y | Largeur | Hauteur | Rôle |
|---|---:|---:|---:|---:|---|
| En-tête | 50 | 50 | 980 | 88 | Même ancrage que la publication quotidienne ; période hebdomadaire sur une ligne |
| Box titre | 50 | 160 | 980 | 150 | Même box que la publication quotidienne ; titre et trait doré propres à la semaine |
| Trois repères | 50 | 336 | 980 | 490 | Trois cartes de 320 px, espacées de 10 px |
| Synthèse | 50 | 856 | 980 | 175 | Même composant éditorial à deux lignes que la publication quotidienne |
| Frise sept jours | 50 | 1065 | 980 | 240 | Composant secondaire compact, bas ancré à `Y=1305` |
| Signature | centré | 1368 | — | — | `Ici, cette semaine.` — même position que la publication quotidienne |

Les trois cartes de repères ont une largeur identique de 320 px ; aucun
contenu ne peut modifier leur grille. Les libellés, pictogrammes et valeurs des
deux cartes de température utilisent donc les mêmes lignes de référence.

La frise compte strictement sept colonnes de 140 px. Chaque journée conserve
la même séquence — jour, date, pictogramme, Tmin/Tmax — et la même hauteur,
qu’elle soit mise en avant ou non. Un contour bleu ou doré est le seul signal
de distinction ; il n’agrandit jamais une colonne. La hauteur de 240 px est
fixe et son bas est ancré à `Y=1305`, exactement comme la box solaire de la
publication quotidienne. L’espace vertical disponible est réparti entre les
boxes intérieures, pas dans la frise.

## Hiérarchie typographique

| Élément | Taille cible | Graisse | Alignement |
|---|---:|---:|---|
| Titre principal | 56 px maximum | 760 | gauche |
| Libellé d’un repère | 19 px | 700 | centré, légèrement espacé |
| Jour du repère | 30 px | 560 | centré, sans contour |
| Température principale | 70 px maximum | 700 | centrée, bleu marine |
| Période de lumière | 30 px maximum | 560 | centrée, sans contour |
| Variation de lumière | 70 px maximum | 700 | centrée, bleu marine |
| Tendance éditoriale | 29 px maximum | 650 | gauche, une ligne, même hiérarchie que la publication quotidienne |
| Précision factuelle | 21 px maximum | 550 | gauche, deux lignes maximum |
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
- La période de l’en-tête utilise la ligne et la ligne de base quotidiennes :
  `14 — 20 SEPTEMBRE`. Pour une semaine à cheval sur deux mois :
  `28 SEPT. — 4 OCTOBRE`.
- La lumière suit la même séquence que les cartes de température : titre,
  pictogramme, période `LUN. N → DIM. N`, puis valeur `−N min`. Les horaires
  de lever et coucher sont conservés dans les données mais ne sont pas affichés
  dans cette slide.
- La synthèse utilise exactement le même contrat éditorial que la publication
  quotidienne : une **tendance dominante · évolution**, puis une précision
  factuelle. Exemple : `Temps doux et lumineux · Davantage d’éclaircies en fin
  de semaine` puis `Des maximales de 24 à 30 °C, sous un temps majoritairement
  sec.`
- La tendance tient sur une ligne ; la précision factuelle tient sur deux
  lignes au plus. Toutes deux sont alignées à gauche, séparées par le même
  trait doré que la publication quotidienne. Elles ne contiennent ni conseil,
  ni intertitre, ni les mots de remplissage « globalement » ou
  « progressivement ».
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
