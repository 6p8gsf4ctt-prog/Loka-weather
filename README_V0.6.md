# LOKA V0.6.0 — Compositeur Instagram déterministe

## Objectif
V0.6 remplace uniquement la couche graphique Instagram de V0.5.2. Le moteur météo, la classification, le consensus multi-modèles et Cloudflare D1 restent inchangés.

## Principe
- `forecast.scene` sélectionne l'univers graphique parmi SOLEIL, NUAGES/COUVERT, PLUIE, ORAGES/ORAGEUX, VENT FORT et INSTABLE.
- Le fond maître de la scène est embarqué dans `src/ui/backgrounds.ts`.
- Les 6 icônes horaires restent totalement dynamiques et suivent `forecast.hourly`.
- La géométrie 1080 × 1350, la grille, la frise solaire et la bulle basse sont fixes.
- Le PNG est généré dans `/instagram` et reste publié manuellement.

## Fichiers à ajouter/remplacer
1. **AJOUTER** `src/ui/backgrounds.ts`
2. **REMPLACER** `src/ui/instagram.ts`
3. **REMPLACER** `src/index.ts`

Aucun changement de D1, migration, configuration météo ou moteur éditorial n'est nécessaire.

## Déploiement GitHub / Cloudflare
Depuis GitHub, ajouter/remplacer exactement ces trois fichiers sur `main`, puis attendre le redéploiement Cloudflare.

## Vérification
1. Ouvrir `/api/health` → la version doit être `0.6.0`.
2. Ouvrir `/instagram`.
3. Vérifier que le fond correspond à la scène LOKA du jour.
4. Vérifier que les 6 pictogrammes correspondent indépendamment aux 6 conditions horaires.
5. Vérifier la date, les températures, AUBE / LEVER / COUCHER / CRÉPUSCULE et la bulle basse.
6. Télécharger le PNG.

## Important
Cette V0.6 ne cherche pas encore à perfectionner le moteur éditorial. Elle verrouille d'abord l'architecture graphique afin que les futurs retours météo et texte puissent continuer à être traités dans le laboratoire LOKA sans casser le rendu.
