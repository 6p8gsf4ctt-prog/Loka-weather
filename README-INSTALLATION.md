# LOKA — continuité graphique de la slide 1 — V6

Cette mise à jour remplace la V5. Elle ne modifie pas la slide 1.

## Fichiers à remplacer

- `src/engine/weekly/carousel.ts`
- `src/engine/weekly/index.ts`
- `src/ui/weeklyPreview.ts`
- `tests/weeklyCarousel.ts`

Le fichier `index.ts` reste fonctionnellement identique à celui de la V5 ; il est conservé pour fournir un paquet d'intégration cohérent.

## Règle graphique définitive

Les slides éditoriales 2, 3 et 4 utilisent dorénavant une structure immuable de **trois boxes** :

1. box titre ;
2. box information (pictogramme, chiffre clé, sous-titre et comparaison) ;
3. box phrase éditoriale.

Les positions et dimensions sont communes à toutes les slides 2, 3 et 4 ; seul leur contenu varie. La slide 1 n'est pas modifiée.

## Ajustements inclus

- en-tête, box titre et footer strictement inchangés ;
- box information : `x 50`, `y 336`, `980 × 690 px` ;
- box éditoriale : `x 50`, `y 1056`, `980 × 175 px`, soit exactement la hauteur éditoriale de la slide 1 ;
- espacement entre les deux boxes : 30 px, comme sur la slide 1 ;
- box information basée sur le style des cartes statistiques de la slide 1 ;
- box éditoriale basée sur le style de synthèse de la slide 1 ;
- pictogramme cadré dans une zone de `155 × 140 px` ;
- chiffre principal allégé à une graisse 720 ;
- sous-titre limité à 22–27 px, graisse 700 ;
- valeurs comparatives limitées à 35–48 px, graisse 700 ;
- labels comparatifs limités à 17–19 px ;
- séparateur vertical ramené à 86 px et 1,25 px d'épaisseur ;
- traits dorés internes harmonisés à `52 × 3 px` ;
- phrase éditoriale centrée automatiquement sur une ou deux lignes ;
- dimensions strictement communes aux slides 2, 3 et 4 ;
- aperçu individuel des candidates aligné sur les nouvelles proportions.

## Vérification

```bash
npm run typecheck
npm run test:weekly
```

Résultat de référence : `WEEKLY_CAROUSEL 92/92 PASS`.

## Déploiement

Après avoir remplacé les fichiers dans GitHub, utilisez votre procédure Cloudflare habituelle. Aucune migration D1 et aucune nouvelle variable ne sont nécessaires.
