# LOKA — Carrousel et relais Story
# Étape 10 — « La semaine à Tarnos »

Version : 0.1.0  
Date : 7 septembre 2026  
Statut : étape 10 terminée  
Étape suivante : étape 11 — tests, prévisualisation et validation

## 1. Format publié

Le plan de publication est strictement adaptatif :

```text
1 slide de vue d’ensemble
+ 1 slide pour chaque histoire retenue
```

Une semaine calme contient donc une seule slide. Une semaine avec quatre
histoires contient cinq slides au total. Le cinquième événement est bloqué par
la sélection et par la validation d’activation.

La première slide reprend la conclusion générale de l’étape 7 et présente la
liste courte des histoires dans l’ordre narratif de l’étape 6. En semaine calme,
elle affiche une zone dédiée « UNE SEMAINE CALME » et ne conserve pas un titre
de temps forts vide.

## 2. Slides événement

Chaque histoire retenue dispose d’une slide dédiée avec :

- son titre et sa période ;
- la scène V24 du jour représentatif ;
- le pictogramme correspondant à cette décision ;
- les conséquences pratiques directement prouvées ;
- la signature LOKA « Ici, cette semaine. ».

Le plan conserve l’identifiant de l’événement et l’identité de sa scène afin
que la prévisualisation et les exports restent traçables.

## 3. Identité graphique conservée

Le rendu réutilise les éléments existants du moteur :

- logo LOKA! ;
- slogan et signature ;
- palette bleu marine et or ;
- box translucides ;
- pictogrammes redessinés ;
- fonds maîtres des 24 scènes ;
- police et traitement typographique du moteur.

La scène n’est jamais choisie par le rendu. Elle vient de la décision V24
validée à l’étape 9.

## 4. Story hebdomadaire

La Story est produite au format 1080 × 1920 et conserve dans son contrat :

```text
kind = RELAY
source = CAROUSEL
```

Elle utilise la scène de vue d’ensemble et reprend la synthèse validée de la
première publication. Le moteur dessine le fond en 1080 × 1920, puis appelle
le renderer exact de la PUBLICATION semaine avec le profil STORY. La largeur
reste à l’échelle 1:1 ; les coordonnées et dimensions verticales sont réparties
sur 1580 px à partir de `y=170`. Les réserves haute et basse restent donc
équilibrées à 170 px pour les interfaces Instagram.

La Story ne crée pas une seconde ligne éditoriale et ne remplace pas le
carrousel. Le contrat détaillé est documenté dans
`docs/STORY_IDENTITY_SYSTEM.md`.

## 5. Prévisualisation et exports

La prévisualisation protégée affiche toutes les slides générées, dans leur
ordre final, avec un bouton d’export PNG pour chaque slide et pour le relais
Story. Les dimensions sont vérifiées avant activation :

- carrousel : 1080 × 1440, aligné sur le cadre de publication quotidien ;
- Story : 1080 × 1920.

La prévisualisation reste indépendante de `WEEKLY_ENABLED` et n’écrit pas dans
D1.

## 6. Fichiers de l’étape

| Fichier | Rôle |
|---|---|
| `src/ui/storyFrame.ts` | Enveloppe commune des Stories et réserves Instagram |
| `src/engine/weekly/carousel.ts` | Composition PUBLICATION partagée avec la STORY |
| `src/engine/weekly/synthesis.ts` | Classification éditoriale des précipitations |
| `src/engine/weekly/activation.ts` | Garde du plafond et du relais |
| `src/engine/weekly/index.ts` | Export de la limite de slides |
| `tests/weeklyCarousel.ts` | Contrôles du carrousel, du calme et des exports |
| `tests/weeklyActivation.ts` | Contrôle du relais et du plafond |
| `docs/WEEKLY_NARRATIVE_CAROUSEL.md` | Référence de l’étape 10 |

## 7. Critère de fin

L’étape est validée lorsque le nombre de slides suit exactement le nombre
d’histoires retenues, que le calme produit une publication courte, que la
Story conserve son rôle de relais et que les deux Stories consomment le même
cadre graphique sans dupliquer leurs coordonnées.
