# LOKA — slides hebdomadaires : architecture verrouillée V5

Ce paquet remplace les mises à jour précédentes V3 et V4. Importez **tous** les fichiers en conservant exactement leur arborescence, puis redéployez le Worker.

## Fichiers à remplacer

- `src/engine/weekly/carousel.ts`
- `src/engine/weekly/index.ts`
- `src/ui/weeklyPreview.ts`
- `tests/weeklyCarousel.ts`

## Règle graphique définitive

Les slides éditoriales 2, 3 et 4 utilisent dorénavant une structure immuable de **trois boxes** :

1. box titre ;
2. box information (pictogramme, chiffre clé, sous-titre et comparaison) ;
3. box phrase éditoriale.

Les positions et dimensions sont communes à toutes les slides 2, 3 et 4 ; seul leur contenu varie. La slide 1 n'est pas modifiée.

## Ajustements inclus

- box éditoriale : 210 px de haut, soit une réduction de 27,6 % par rapport à l'ancienne hauteur de 290 px ;
- valeurs secondaires de comparaison : réduction d'environ 9 % ;
- séparateur vertical : raccourci à 122 px ;
- comparaisons : remontées dans la box information, plus près du chiffre principal ;
- espace redistribué dans la box information, avec une composition plus dense ;
- en-tête, pied de page, box titre et trait doré de la troisième box préservés selon le cadre partagé de la slide 1.

## Vérification locale

```bash
npm run typecheck
npm run test:weekly
```

Résultat attendu : `WEEKLY_CAROUSEL 92/92 PASS`.

## Déploiement

```bash
npm run deploy
```
