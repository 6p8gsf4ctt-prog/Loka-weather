# Variante graphique journalière

La variante est disponible à l’adresse :

`/daily-graphic-preview`

Elle utilise la prévision journalière officielle du jour et conserve exactement
les mêmes contenus, données, pictogrammes et exports que la page de production.
Seule la hiérarchie graphique est renforcée en s’inspirant du format
hebdomadaire.

La page de production reste accessible à la racine `/` et continue d’utiliser
`src/ui/instagramOfficial24.ts`.

Exemples :

- Tarnos : `/daily-graphic-preview`
- autre ville configurée : `/daily-graphic-preview?city=nom-de-la-ville`

Le navigateur reçoit l’en-tête
`x-loka-daily-graphic-variant: weekly-inspired-v1`, ce qui permet de distinguer
la variante lors des contrôles techniques.
