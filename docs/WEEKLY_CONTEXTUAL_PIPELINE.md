# LOKA — Phase 1 : intégration du moteur éditorial au pipeline

`src/engine/weekly/contextualPipeline.ts` est le pont unique entre les profils
hebdomadaires et les slides 2–4. Il exécute, dans cet ordre :

1. détection des phénomènes, régimes et variations horaires prouvés par le
   consensus LOKA ;
2. ajout des comparaisons historiques et climatiques quand l'archive officielle
   de la station `64024001` est fournie ;
3. classement et déduplication N5 ;
4. rédaction N6 et affectation N7 ;
5. prévol N8 au moment de construire le carrousel.

L'absence d'archive ne produit jamais de contexte historique imaginaire : le
résultat porte alors `climateStatus: UNAVAILABLE` et ne retient, le cas échéant,
que des phénomènes directement démontrés par le consensus. L'archive officielle
pourra être branchée par l'ingestion dédiée sans modifier les règles
éditoriales.

Le pipeline hebdomadaire réel appelle désormais ce module et transmet son plan
au carrousel. `/weekly-preview` dispose aussi du mode interne
`CONTEXTUAL_DEMO`, qui crée une chaleur forte et une journée pluvieuse
contrôlées : il vérifie les slides 2 et 3 sans jamais publier ces données.
Cette surface isole strictement les slides éditoriales : elle ne rend ni la
slide 1 validée, qui reste exclusivement dans « Prévisions réelles », ni le
relais Story historique. Les téléchargements conservent donc les numéros
réels des slides (`02`, `03`, puis `04` lorsqu'elle est disponible).

Les tests vérifient que le plan arrive bien au renderer, garde le master
hebdomadaire homogène et conserve le frame `WEEKLY_SHARED_V1`.
