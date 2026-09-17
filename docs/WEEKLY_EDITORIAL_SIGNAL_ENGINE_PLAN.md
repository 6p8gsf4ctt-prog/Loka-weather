# LOKA — Plan actif du moteur de signaux éditoriaux hebdomadaires

## Statut et règle de continuité

Ce document est la référence active des slides complémentaires de « La semaine
à Tarnos ». Il doit être relu avant l’ouverture de chaque étape et mis à jour
à sa clôture. Une seule étape peut être `EN COURS`.

La slide 1 est la V1 graphique verrouillée. La slide 2 conserve son squelette
graphique V20 — même fond, en-tête, title box, baseline basse et footer — mais
ne reçoit plus aucun chiffre brut. Les slides 3 et 4 restent non rendues tant
que leurs moteurs éditoriaux ne sont pas validés.

## Plan de mise en publication

| Phase | Livrable | Statut |
|---:|---|---|
| 1 | Intégration complète : profils → signaux → classement → slides → renderer | TERMINÉE — 17 septembre 2026 |
| 2 | Prévol automatisé : données, ex æquo, sources, texte, pictogrammes, frame et débordements | TERMINÉE — 17 septembre 2026 |
| 3 | Validation pilote : scénarios contrôlés et semaines réelles | EN COURS — outillage prêt, 4 semaines live à collecter |
| 4 | Publication progressive avec repli slide 1 | OUTILLÉE — activation par flags après validation pilote |

## Étapes

| # | Étape | Livrable | Statut |
|---:|---|---|---|
| 0 | Geler le cadre et neutraliser la V20 brute | Aucun chiffre brut publié ; cadre visuel conservé | TERMINÉE — 16 septembre 2026 |
| 1 | Contrat des signaux | Données, preuves, comparaisons et niveau de certitude normalisés | TERMINÉE — 16 septembre 2026 |
| 2 | Audit et choix des références | Source locale historique, normales et conventions de comparaison validées | TERMINÉE — 17 septembre 2026 |
| 3 | Références dérivées | Séries, normales, percentiles, seuils et compteurs saisonniers calculés | TERMINÉE — 17 septembre 2026 |
| 4 | Détecteurs candidats | Historique, anomalies, seuils, phénomènes, régimes et séries | TERMINÉE — 17 septembre 2026 |
| 5 | Score et déduplication | Importance, rareté, anomalie, intérêt, confiance et conflits | TERMINÉE — 17 septembre 2026 |
| 6 | Rédaction prudente | Phrases de prévision ou d’observation issues des preuves | TERMINÉE — 17 septembre 2026 |
| 7 | Liaison slides 2–4 | Un signal non redondant par slide, dans le cadre graphique partagé | TERMINÉE — 17 septembre 2026 |
| 8 | Prévol et validation | Cohérence, overflow, rejouage historique et activation progressive | TERMINÉE — 17 septembre 2026 |

## Règles non négociables

1. Une prévision n’est jamais annoncée comme un fait acquis.
2. Toute comparaison oppose des grandeurs comparables : même variable,
   même fenêtre horaire et même période de l’année.
3. Une amplitude n’est éditoriale que lorsqu’elle est vécue dans une même
   journée ; aucun minimum et maximum de jours différents ne sont associés.
4. Une valeur brute sans contexte historique, climatique, saisonnier,
   phénoménologique ou pratique ne peut pas devenir une slide.
5. Une même preuve ne peut pas alimenter plusieurs slides sous des formes
   concurrentes.
6. La publication est adaptative : slide 1 seule en l’absence de signal solide,
   puis au maximum trois slides complémentaires réellement distinctes.
7. Le moteur quotidien V24, ses scènes et son contrat public restent isolés.

## Ordre de priorité des signaux

1. phénomène avec conséquence concrète ;
2. record, rareté ou percentile extrême ;
3. anomalie aux normales, première occurrence ou série remarquable ;
4. détail météorologique curieux, mais démontré.

## Répartition cible

- **Slide 2 — Le chiffre de la semaine** : signal le plus frappant, contextualisé.
- **Slide 3 — À savoir cette semaine** : fait localisé, utile à anticiper.
- **Slide 4 — Le détail à remarquer** : repère saisonnier, rare ou inattendu.

Les titres ne forcent jamais la sélection : si un seul signal atteint le seuil,
le carrousel reste court.

## Bilan de l'étape 8

N8 apporte le prévol `complementaryPreflight.ts` et le renderer partagé : une
slide complémentaire est refusée avant rendu si ses positions, titres, thèmes,
sources, longueur de texte ou formulation prévision/observation ne sont pas
valides. Les limites sont ensuite doublées d'un fit canvas explicite : aucun
débordement n'est coupé silencieusement.

Les slides 2 à 4 réutilisent désormais exactement le frame quotidien/slide 1 :
canvas `1080 × 1440`, en-tête, title box, fond hebdomadaire homogène, baseline
basse et signature. Le flag `WEEKLY_CONTEXTUAL_SLIDES_ENABLED` reste désactivé
par défaut et le pipeline de publication existant n'injecte pas encore N7 : la
mise en production demeure donc progressive, après aperçu et validation.

Les tests N8 couvrent les garde-fous de prévol et l'intégration renderer. Les
tests TypeScript, N7, carousel et activation passent. La suite exhaustive
reste arrêtée par l'échec quotidien préexistant `scene13_showers_context`, hors
périmètre hebdomadaire.

## Bilan de la phase 1 de mise en publication

Le pipeline réel appelle maintenant `buildWeeklyContextualPipeline` avant de
construire le carrousel. Les candidats directs et les références historiques
lorsqu'elles sont disponibles traversent donc la même chaîne N4 → N5 → N6 →
N7 → N8. Le résultat est transmis à `buildWeeklyCarouselPlan` et devient
visible dans `/weekly-preview`.

La surface « Prévisions réelles » reste l'unique surface de la slide 1
factuelle, validée et publiable. Le laboratoire `CONTEXTUAL_DEMO` ne rend que
les slides complémentaires déjà disponibles, à partir de la position 2 ; il
exclut explicitement la slide 1 et l'ancien relais Story. Cette séparation
empêche toute régression du socle prévisionnel pendant le développement des
slides éditoriales.

Un mode interne `CONTEXTUAL_DEMO` vérifie ce parcours avec une chaleur forte et
une journée pluvieuse contrôlées. Il permet de voir les slides 2 et 3 sans
annoncer de faux signal pour Tarnos. Sans archive officielle chargée, le moteur
porte explicitement l'état `UNAVAILABLE` et ne fabrique aucune comparaison
historique ; les phénomènes consensus restent néanmoins possibles.

## Bilan de la phase 2 de mise en publication

Le prévol des slides éditoriales est regroupé dans un rapport unique, lié au
plan par une empreinte. Douze contrôles couvrent maintenant la cohérence avec
les profils météo, les ex æquo des formulations superlatives, les preuves et
leurs sources, la prudence observation/prévision, la non-redondance des thèmes,
le frame partagé, les pictogrammes officiels et l'encombrement réel du canvas.

Un contrôle seulement structurel porte `comprehensive: false` et ne peut pas
activer une publication. Le pipeline réel transmet le rapport complet au
renderer ; toute modification ultérieure du plan invalide son empreinte. La
slide 1 validée reste entièrement hors de ce prévol éditorial.

## Bilan provisoire de la phase 3 de mise en publication

`pilotValidation.ts` produit un rapport `PASS`, `REVIEW` ou `BLOCKED` à partir
des profils, du prévol, du classement, du carousel et de l'activation exacts.
Deux scénarios contrôlés sont certifiés : semaine calme sans signal, puis
chaleur et pluie avec slides 2 et 3. Un échec d'activation est bloquant.

Pour une vraie semaine, l'aperçu administrateur expose désormais ce rapport
dans le champ `pilot`. Sans archive climatique locale réellement injectée, le
rapport reste volontairement `REVIEW` : LOKA ne valide pas une couverture
historique qu'il n'a pas chargée. La phase passe à `TERMINÉE` après quatre
semaines live distinctes, sans blocage et avec référence locale disponible.

## Bilan de l’étape 1

Le contrat `src/engine/weekly/editorialSignals.ts` impose une preuve non vide,
une même variable, une même unité, une même fenêtre de comparaison et un jour
représentatif. Les tests bloquent les chiffres bruts, les comparaisons entre
variables différentes et les fausses amplitudes entre deux jours.

Avant l’étape 2, ce document doit être relu en entier. L’étape suivante ne peut
pas prétendre produire une référence historique ou une normale sans source
locale documentée, maintenue et comparable.

## Bilan de l'étape 2

La référence locale V1 est verrouillée sur la station Météo-France
`BIARRITZ-PAYS-BASQUE` (`64024001`), située à 9,90 km du point Tarnos utilisé
par LOKA. Sa série quotidienne couvre 1956–2024 et ses normales officielles
sont celles de 1991–2020. Les comparaisons quotidiennes utiliseront cette
période ; les analyses à heure précise utiliseront la série horaire homogène
2000–2024, sans la présenter comme une normale officielle.

Le consensus des cinq modèles déjà utilisés reste la source de prévision et de
confiance. Météo-France apporte uniquement l'observation historique et la
référence climatologique manquantes. Aucun agrégateur ni ERA5-Land ne sert de
preuve ou de secours automatique. Une absence de donnée désactive le signal au
lieu de provoquer un mélange silencieux de stations ou de méthodes.

Les conventions, seuils de couverture, règles de traçabilité et ressources
auditées sont consignés dans `docs/WEEKLY_EDITORIAL_REFERENCE_AUDIT.md`.
L'étape 3 peut commencer, mais aucune affirmation contextuelle n'est encore
activée en production et la maquette graphique reste figée.

## Bilan de l'étape 3

Le module `src/engine/weekly/climateReferences.ts` importe et normalise les
archives quotidiennes et horaires de la station `64024001`, conserve leurs
indicateurs qualité et leur provenance, puis calcule :

- références datées Tmin/Tmax 1991–2020 sur une fenêtre de ±7 jours ;
- distributions et percentiles P1, P5, P10, P50, P90, P95 et P99 ;
- cumuls glissants de pluie sur sept jours comparables à la même saison ;
- nombres et premières occurrences des seuils saisonniers ;
- séries consécutives sans interpolation des dates manquantes ;
- références horaires 2000–2024 à heure locale identique.

Les garde-fous imposent 90 % de couverture quotidienne, 90 % de fenêtres de
pluie complètes, au moins vingt années horaires, un convertisseur de fuseau
explicite et l'interdiction de mélanger plusieurs stations. Plusieurs fichiers
décennaux Météo-France peuvent être réunis, mais chaque provenance demeure
attachée au résultat.

Les 18 tests N3 et l'ensemble des tests hebdomadaires passent. La suite globale
rencontre encore l'échec préexistant du test quotidien
`scene13_showers_context`, avant d'atteindre les modules hebdomadaires. N3 ne
modifie ni le moteur quotidien, ni le rendu graphique, ni l'activation des
slides. Son contrat détaillé est documenté dans
`docs/WEEKLY_CLIMATE_REFERENCES.md`.

## Bilan de l'étape 4

Le module `src/engine/weekly/signalDetectors.ts` transforme les prévisions et
références N3 en candidats prouvés pour les familles suivantes : historique
« depuis », record potentiel, anomalie, percentile, pluie hebdomadaire rare,
première occurrence saisonnière, phénomène important, changement de régime,
série remarquable et variation intrajournalière.

Chaque candidat conserve sa règle de déclenchement, sa valeur, son seuil, sa
preuve comparable, son jour représentatif et des faits lisibles par le moteur.
Les valeurs ordinaires sont rejetées. Les variations intrajournalières restent
strictement contenues dans une même journée, et les seuils horaires et
journaliers de pluie sont séparés.

Les 24 tests N4 passent, ainsi que les 6 tests du contrat des signaux et tous
les tests hebdomadaires. Aucune note, déduplication, rédaction ou activation de
slide n'est encore appliquée. Les règles complètes et les seuils candidats V1
sont documentés dans `docs/WEEKLY_SIGNAL_DETECTORS.md`.

## Bilan de l'étape 5

Le module `src/engine/weekly/signalRanking.ts` attribue à chaque candidat cinq
notes explicables sur 5 : importance, rareté, anomalie, intérêt éditorial et
confiance. Le total sur 25 sert au classement, avec un seuil minimal de 13 et
des portes éliminatoires qui empêchent un bon score de masquer une preuve trop
faible.

Sont notamment bloqués : confiance faible, record avec moins de dix ans de
données, percentile ou anomalie avec moins de 300 observations, « depuis… » de
moins de 30 jours, première occurrence sans vingt saisons et série sans dix
ans de référence.

La déduplication conserve un seul gagnant lorsqu'une preuve est identique ou
que plusieurs formulations décrivent le même événement. Pluie et orage du
même jour appartiennent ainsi au même thème humide. Chaque rejet garde sa note,
sa raison et l'identifiant du gagnant, ce qui rend le classement auditable.

Les 18 tests N5, les 24 tests N4 et tous les tests hebdomadaires passent. N5 ne
limite pas encore le résultat à trois signaux et ne rédige aucun contenu
public. La grille complète est documentée dans
`docs/WEEKLY_SIGNAL_RANKING.md`.

## Bilan de l'étape 6

Le module `src/engine/weekly/signalCopy.ts` transforme uniquement les candidats
sélectionnés par N5 en deux lignes éditoriales. Il réutilise le contrat commun
du moteur quotidien : 80 caractères maximum pour l'information principale et
120 pour sa précision factuelle.

Quatre statuts distinguent strictement observation et prévision : passé
affirmatif pour `OBSERVED`, « devrait » pour `EXPECTED`, « pourrait » pour
`POSSIBLE`, et « si … se confirment » pour tout record futur potentiel. Une
preuve issue du consensus ne peut pas être rebaptisée observation.

Les références climatiques dérivées sont décrites comme « référence locale »
ou « période comparable », jamais comme normale officielle. Percentiles,
seuils, séries, changements de régime et phénomènes importants disposent de
gabarits factuels spécifiques sans dramatisation.

Les 53 tests N6 et tous les tests hebdomadaires passent. Aucun titre de slide,
pictogramme, rendu graphique ou activation publique n'est encore produit. Le
contrat complet est documenté dans `docs/WEEKLY_SIGNAL_COPY.md`.

## Bilan de l'étape 7

Le module `src/engine/weekly/complementarySlides.ts` affecte les candidats N5
sélectionnés et les copies N6 aux rôles complémentaires : chiffre, information
pratique et détail à remarquer. La sélection est adaptative et plafonnée à trois
slides : elle ne crée aucune page sans signal solide.

La slide 2 privilégie une statistique contextualisée ; la slide 3 privilégie
un phénomène ou un changement de régime utile à anticiper ; la slide 4 reçoit
un repère saisonnier ou curieux. Si le rôle pratique est absent, le détail se
place directement en troisième page physique du carrousel.

La complémentarité est imposée par thème : température, pluie/orage, vent,
visibilité et lumière ne peuvent chacun apparaître qu'une seule fois. Chaque
slide transporte déjà sa valeur, ses deux lignes prudentes, son statut, sa
source, son pictogramme indicatif et la contrainte `WEEKLY_SHARED_V1`, qui
interdit tout nouveau langage graphique.

Les 12 tests N7 et tous les tests hebdomadaires passent. Le rendu dans le cadre
visuel partagé, le prévol, les contrôles d'overflow et l'activation restent
volontairement réservés à N8. La règle complète est documentée dans
`docs/WEEKLY_COMPLEMENTARY_SLIDES.md`.

## Bilan de la phase 4 de mise en publication

`progressivePublication.ts` protège désormais la surface publique : slide 1
seule par défaut, mode shadow pour l'observation, exposition progressive après
double opt-in, et repli automatique en cas d'échec du prévol ou de l'activation.
Le rollback opérateur est immédiat via `WEEKLY_PROGRESSIVE_ROLLBACK=true`.
Les routes `/weekly` et `/api/weekly` réutilisent le plan réellement autorisé,
sans modifier la slide 1 ni le moteur quotidien. La publication officielle
reste conditionnée à la sortie de la phase 3 : quatre semaines live distinctes
avec couverture climatique locale.
