# V12.16.15 — TRUE VECTOR ICON SYSTEM

Ce dossier contient une **livraison de travail** pour la V12.16.15.

## Ce que contient ce dossier

- `src/ui/vectorWeatherIcons15.ts`
  - nouveau runtime vectoriel Canvas pour les pictogrammes météo ;
  - remplace les usages PNG/base64 pour la météo horaire et l'icône principale de la box générale.
- `patches/instagramDaily_v12_16_15.patch`
  - patch cible pour `src/ui/instagramDaily.ts`.
- `patches/instagramOfficial24_v12_16_15.patch`
  - patch cible pour `src/ui/instagramOfficial24.ts`.
- `patches/APPLICATION_NOTES.md`
  - consignes courtes d'application.

## Périmètre respecté

- ✅ système d'icônes météo vectoriel ;
- ✅ 7 familles principales + variantes utiles ;
- ✅ icônes horaires plus présentes ;
- ✅ aucune logique de lune imposée à 22h ;
- ✅ recalage vertical du nuage principal dans la box générale ;
- ✅ aucune modification demandée sur le moteur météo, D1, readiness, GO LIVE, masters, scènes, textes ou températures.

## Important

Je n'ai pas reconstruit ici l'intégralité du dépôt :
ce dossier est pensé comme un **overlay V12.16.15** à appliquer sur la base GitHub actuelle `main / V12.16.14`.

Autrement dit :
- on ajoute `src/ui/vectorWeatherIcons15.ts` ;
- on applique les patchs sur les deux renderers Instagram ;
- on ne touche pas au reste du projet.
