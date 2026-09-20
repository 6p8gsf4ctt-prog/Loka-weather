# Mise à jour définitive LOKA — formats Publication et Story

Cette mise à jour conserve l’architecture maître validée des scènes 1 et 2.

Modifications appliquées :

- suppression de la petite barre jaune placée avant le commentaire final des scènes éditoriales ;
- opacité légèrement renforcée de la grande box commune, pour mieux détacher les informations du fond ;
- maintien strict de la position, du texte et de la typographie du commentaire ;
- renforcement mesuré des graisses typographiques afin de retrouver la densité des maquettes ;
- renforcement léger des séparateurs internes, sans modifier leurs coordonnées ;
- conservation exacte des dimensions, marges, boxes, pictogrammes, accents, header et footer ;
- génération de la scène 1 en Publication `1080 × 1440` et en Story `1080 × 1920` ;
- génération des scènes 2 et 3 uniquement en Story `1080 × 1920` ;
- reprise exacte de la zone sûre du moteur journalier pour les Stories : logo centré à `Y 144`, ville et période à `Y 158`, premier cartouche à `Y 200` ;
- suppression de l’ancien relais Story au profit des vraies scènes hebdomadaires adaptées au format vertical ;
- aucune modification des données météo, des règles métier, de la sélection ou des sources.

Vérifications :

- `npm run typecheck` : succès ;
- `npm run test:weekly` : succès ;
- `WEEKLY_CAROUSEL` : 101/101 ;
- `WEEKLY_RELEASE_CANDIDATE` : 28/28.

Décompressez le ZIP à la racine du dépôt en autorisant le remplacement des fichiers existants.
