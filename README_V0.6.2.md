# LOKA V0.6.2

Recalage graphique du master INSTABLE uniquement.

## Modifications
- titre et sous-titre plus présents et mieux espacés ;
- bloc horaire descendu et agrandi ;
- pictogrammes horaires agrandis ;
- courbe de température abaissée et amplitude visuelle légèrement renforcée ;
- températures agrandies ;
- frise solaire descendue et arc élargi ;
- panneau inférieur légèrement descendu, pictogrammes et texte agrandis ;
- signature abaissée.

Aucun changement du moteur météo, de D1, du consensus, des règles éditoriales ou des cinq autres scènes.

## Déploiement
Remplacer uniquement `src/ui/instagram.ts` et `src/index.ts`. `src/ui/backgrounds.ts` reste inchangé.

Après déploiement, `/api/health` doit afficher `0.6.2`.
