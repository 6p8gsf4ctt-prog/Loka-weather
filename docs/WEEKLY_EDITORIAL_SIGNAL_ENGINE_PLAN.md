# LOKA — Plan actif du moteur de signaux éditoriaux hebdomadaires

## Statut et règle de continuité

Ce document est la référence active des slides complémentaires de « La semaine
à Tarnos ». Il doit être relu avant l’ouverture de chaque étape et mis à jour
à sa clôture. Une seule étape peut être `EN COURS`.

La slide 1 est la V1 graphique verrouillée. La slide 2 conserve son squelette
graphique V20 — même fond, en-tête, title box, baseline basse et footer — mais
ne reçoit plus aucun chiffre brut. Les slides 3 et 4 restent non rendues tant
que leurs moteurs éditoriaux ne sont pas validés.

## Étapes

| # | Étape | Livrable | Statut |
|---:|---|---|---|
| 0 | Geler le cadre et neutraliser la V20 brute | Aucun chiffre brut publié ; cadre visuel conservé | TERMINÉE — 16 septembre 2026 |
| 1 | Contrat des signaux | Données, preuves, comparaisons et niveau de certitude normalisés | TERMINÉE — 16 septembre 2026 |
| 2 | Audit et choix des références | Source locale historique, normales et conventions de comparaison validées | EN ATTENTE — source à choisir |
| 3 | Références dérivées | Séries, normales, percentiles, seuils et compteurs saisonniers calculés | À FAIRE |
| 4 | Détecteurs candidats | Historique, anomalies, seuils, phénomènes, régimes et séries | À FAIRE |
| 5 | Score et déduplication | Importance, rareté, anomalie, intérêt, confiance et conflits | À FAIRE |
| 6 | Rédaction prudente | Phrases de prévision ou d’observation issues des preuves | À FAIRE |
| 7 | Liaison slides 2–4 | Un signal non redondant par slide, dans le cadre graphique partagé | À FAIRE |
| 8 | Prévol et validation | Cohérence, overflow, rejouage historique et activation progressive | À FAIRE |

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

## Bilan de l’étape 1

Le contrat `src/engine/weekly/editorialSignals.ts` impose une preuve non vide,
une même variable, une même unité, une même fenêtre de comparaison et un jour
représentatif. Les tests bloquent les chiffres bruts, les comparaisons entre
variables différentes et les fausses amplitudes entre deux jours.

Avant l’étape 2, ce document doit être relu en entier. L’étape suivante ne peut
pas prétendre produire une référence historique ou une normale sans source
locale documentée, maintenue et comparable.
