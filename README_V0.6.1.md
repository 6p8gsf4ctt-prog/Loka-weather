# LOKA Weather — V0.6.1

Correctif contrôlé du renderer Instagram V0.6, concentré sur le master INSTABLE.

## Modifications
- suppression des doublons dans le panneau inférieur ;
- la ligne température ne peut plus être répétée comme événement ;
- mapping condition → pictogramme normalisé et strict ;
- pour INSTABLE, recherche d’une évolution horaire concrète (ex. ciel plus nuageux à partir de 18 h) avant les fallbacks éditoriaux ;
- recalage typographique et vertical du master INSTABLE : titre, pictogrammes, températures, frise solaire et panneau inférieur ;
- aucun changement du moteur météo, du consensus, de D1 ni de la classification.

## Déploiement
Remplacer `src/ui/instagram.ts` et `src/index.ts`. `src/ui/backgrounds.ts` reste identique à V0.6.

Après déploiement, `/api/health` doit afficher `0.6.1`.
