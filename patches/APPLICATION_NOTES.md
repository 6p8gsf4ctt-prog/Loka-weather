# Application notes — V12.16.15

## 1. Ajouter le nouveau fichier

Ajouter `src/ui/vectorWeatherIcons15.ts`.

## 2. Mettre à jour les deux renderers

Appliquer les deux patchs :
- `instagramDaily_v12_16_15.patch`
- `instagramOfficial24_v12_16_15.patch`

## 3. Vérifications attendues

- la story garde le vrai master de scène en fond ;
- la box générale garde sa structure actuelle ;
- le nuage principal est légèrement abaissé ;
- les 10 cellules utilisent les icônes vectorielles ;
- 22h affiche la condition météo réelle ;
- la box solaire reste inchangée dans son langage.

## 4. Rendu attendu

Le rendu visuel doit rester celui du projet LOKA avec les 24 scènes :
le changement doit être visible uniquement sur les pictogrammes météo et sur le réalignement vertical du nuage principal.
