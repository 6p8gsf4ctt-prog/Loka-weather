# LOKA — Étape 2 : finalisation du moteur éditorial

## Résultat

L’étape 2 raccorde réellement l’ensemble des détecteurs éditoriaux aux données
unifiées de l’étape 1. Le pipeline hebdomadaire transforme maintenant le
consensus de prévision et l’archive officielle Météo-France en candidats
prouvés, les note, les déduplique, sélectionne au maximum trois informations
complémentaires distinctes et les soumet au prévol complet avant rendu.

La slide 1 reste strictement inchangée. En l’absence de signal suffisamment
fiable, ou lorsqu’un contrôle échoue, le carrousel revient automatiquement à
cette slide 1 validée.

## Détecteurs activés dans le pipeline réel

`src/engine/weekly/editorialActivation.ts` est désormais l’orchestrateur unique
des comparaisons fondées sur l’archive locale :

- record potentiel et « depuis… » uniquement pour une valeur située dans une
  queue climatique P5/P95 ;
- anomalie de Tmin ou Tmax à la référence datée 1991–2020 ;
- percentile extrême de température ;
- cumul hebdomadaire de pluie supérieur ou égal au P95 saisonnier ;
- première occurrence saisonnière d’un seuil documenté ;
- série sèche, chaude, très chaude ou fraîche projetée au-delà de la plus
  longue série de référence ;
- phénomènes importants, changements de régime et variations
  intrajournalières issus directement du consensus.

Une archive vide, mélangée avec une autre station ou contenant des dates
dupliquées est rejetée avant détection. Chaque candidat climatique conserve
l’identifiant `64024001`, la version de référence et le nombre de ressources
officielles utilisées.

## Classement et slides

Le classement existant sur 25 points reste l’autorité : importance, rareté,
anomalie, intérêt éditorial et confiance. Les portes de référence minimale et
la déduplication par preuve et événement sont appliquées avant toute rédaction.

La sélection reste adaptative :

- slide 2 : meilleur chiffre contextualisé ;
- slide 3 : meilleur phénomène ou changement pratique, s’il existe ;
- slide 4 : meilleur détail saisonnier, série ou variation distincte, s’il
  existe ;
- un thème météorologique ne peut apparaître qu’une fois ;
- aucune slide n’est ajoutée pour remplir artificiellement le carrousel.

## Rédaction et prévol

La rédaction distingue observation, prévision attendue, prévision possible et
record futur conditionnel. Les preuves climatiques sont désormais libellées
avec la source Météo-France Biarritz et l’identifiant de station.

Le prévol consolidé conserve douze contrôles bloquants : nombre et positions,
frame, titres, thèmes, longueurs, prudence verbale, sources, cohérence avec les
profils, ex æquo, pictogrammes officiels et encombrement du canvas. Une série
qui commence dans les observations et se prolonge dans la prévision est aussi
contrôlée sans imposer à tort que son premier jour appartienne à la semaine
affichée.

## Amorçage climatique Cloudflare

Le premier accès à `/weekly-preview` dépassait la limite d’exécution Cloudflare
avec l’erreur `1102`, car le Worker devait parcourir l’archive départementale
historique compressée de 13,9 Mo pour ne conserver que la station locale.

Le dépôt contient maintenant un amorçage compact de 25 203 journées officielles
de la station `64024001`, du 1er janvier 1956 au 31 décembre 2024. Sa source,
son horodatage et son intégrité sont vérifiés avant usage. Le fichier glissant
2025–2026 continue d’être récupéré automatiquement depuis Météo-France ; si la
ressource historique officielle change, le moteur abandonne l’amorçage et
revient à l’import officiel complet.

## Validation réelle du 18 septembre 2026

Le pipeline exact de production a été exécuté pour la semaine du 21 au 27
septembre 2026 :

- cinq modèles reçus : AROME, ECMWF IFS, ECMWF AIFS, ICON-EU et GFS ;
- aucune défaillance de modèle ;
- 25 826 observations Météo-France, du 1er janvier 1956 au 15 septembre 2026 ;
- statut climatique `READY` ;
- cinq candidats d’anomalie détectés ;
- classement et déduplication appliqués ;
- une slide 2 température retenue, les slides 3 et 4 restant absentes faute de
  thème distinct suffisamment solide ;
- prévol complet : 12/12 contrôles validés ;
- activation du carrousel : validée.

Le rapport et l’aperçu HTML issus de cette exécution sont conservés dans
`artifacts/weekly-real-report.json` et `artifacts/weekly-real-preview.html`.

## Vérifications techniques

- TypeScript principal : validé ;
- suite hebdomadaire isolée : 516/516 assertions validées ;
- scénario N2 d’activation climatique : 11/11 ;
- archive d’amorçage : 25 203 lignes, intégrité validée ;
- comparaison avec le dépôt reçu : `carousel.ts`, `editorial.ts`,
  `synthesis.ts` et `weeklyPreview.ts` inchangés, ce qui garantit que la slide
  1 n’a pas été modifiée.

La suite globale historique s’arrête toujours sur le test quotidien préexistant
`scene13_showers_context`. Cette anomalie est extérieure au moteur
hebdomadaire et n’a pas été masquée ni corrigée pendant N2.

## Déploiement

Les migrations distantes `0018` et `0019` doivent être présentes avant le
déploiement de cette archive. L’étape 2 n’ajoute aucune migration D1.
