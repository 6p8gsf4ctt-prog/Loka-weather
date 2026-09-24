# Variante graphique journalière

La variante est disponible à l’adresse :

`/daily-graphic-preview`

Elle utilise la prévision journalière officielle du jour et conserve exactement
les mêmes contenus et données que la page de production. La hiérarchie de la
variante et le moteur hebdomadaire consomment désormais le même système LOKA :
palette, verre, contours, séparateurs et coefficients typographiques.

La page contient toujours une seule PUBLICATION. Une STORY comparative
supplémentaire est proposée lorsqu’un signal local franchit les seuils de
fiabilité du moteur (anomalie climatique, percentile extrême ou extrême récent).
En l’absence de signal suffisamment solide, le moteur l’indique et ne fabrique
pas de comparaison artificielle. La référence climatique actuellement validée
est celle de Tarnos / Biarritz-Pays-Basque.

La page de production reste accessible à la racine `/` et continue d’utiliser
`src/ui/instagramOfficial24.ts`.

Exemples :

- Tarnos : `/daily-graphic-preview`
- autre ville configurée : `/daily-graphic-preview?city=nom-de-la-ville`

Le navigateur reçoit l’en-tête
`x-loka-daily-graphic-variant: weekly-inspired-v2-comparison-story`, ce qui permet de distinguer
la variante lors des contrôles techniques.
