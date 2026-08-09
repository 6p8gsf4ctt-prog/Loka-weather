# LOKA V0.5 — générateur Instagram manuel

Cette version ne publie rien automatiquement sur Instagram.

Elle ajoute `/instagram`, qui génère un visuel 1080 × 1350 px à partir de la dernière prévision LOKA.

## Visuel conservé
- LOKA! / TARNOS / date
- titre SOLEIL / NUAGES / PLUIE / ORAGES / VENT FORT / INSTABLE
- sous-titre `Journée...`
- 6 horaires + pictogrammes + températures
- frise aube / lever / coucher / crépuscule
- transition douce vers la section basse
- un seul pictogramme dans la section basse
- maximum 3 lignes d'information
- couleurs différentes selon la scène

## Fichier à ajouter
- `src/ui/instagram.ts`

## Fichiers à remplacer
- `src/index.ts`
- `src/ui/dashboard.ts`

## Utilisation
1. Déployer.
2. Ouvrir `/admin`.
3. Générer Tarnos si nécessaire.
4. Appuyer sur `Créer le visuel Instagram`.
5. Vérifier le rendu.
6. Télécharger le PNG.
7. Publier manuellement dans Instagram.

Aucune connexion Meta, aucun R2, aucune publication automatique.
