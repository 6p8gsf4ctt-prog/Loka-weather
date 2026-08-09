# LOKA V0.5.2

Mise à jour ciblée du générateur Instagram.

## Modifications
- rendu plus doux et plus proche de la direction graphique validée ;
- transition centrale/basse fortement atténuée ;
- zone inférieure moins massive ;
- pictogramme inférieur réduit ;
- palette INSTABLE plus fondue ;
- texte inférieur désormais dérivé de la chronologie horaire quand c'est possible ;
- suppression de formulations générales du type « Soleil et nuages se partagent la journée » lorsque des horaires peuvent être donnés.

## Installation manuelle
Remplacer uniquement :
- `src/ui/instagram.ts`
- `src/index.ts`

Puis laisser Cloudflare redéployer.

## Vérification
1. `/api/health` doit afficher `0.5.2`.
2. Ouvrir `/instagram`.
3. Vérifier le visuel.
4. Télécharger le PNG.
