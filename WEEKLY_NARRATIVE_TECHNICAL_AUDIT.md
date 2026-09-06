# LOKA — Audit technique de l’évolution narrative
# Étape 2 — « La semaine à Tarnos »

Version : 1.0  
Date : 6 septembre 2026  
Statut : étape 2 terminée  
Étape suivante : étape 3 — contrat de données des histoires météo

## 1. Verdict de l’audit

Le dépôt contient bien une chaîne hebdomadaire isolée et prévisualisable. Elle
peut évoluer sans modifier directement le contrat public quotidien V24.

Le risque principal n’est pas une rupture du moteur quotidien. Il se situe dans
la couche éditoriale hebdomadaire : le moteur détecte, fusionne partiellement,
classe, puis publie presque tous les signaux qui dépassent le seuil minimal.
Il ne construit pas encore une histoire de la semaine.

Le diagnostic confirme donc le cap fixé à l’étape 1 : conserver les données et
la méthode V24 existantes, puis renforcer la chaîne située entre les candidats
bruts et le carrousel publié.

## 2. Périmètre réellement audité

L’audit a porté sur :

- la récupération météo quotidienne et hebdomadaire ;
- le consensus inter-modèles ;
- le profil journalier et le profil pleine journée ;
- la décision des 24 scènes V24 ;
- les détecteurs et la sélection hebdomadaires ;
- la traduction en activités ;
- l’éditorial, le carrousel et le relais Story ;
- la persistance D1 et le déclenchement du lundi matin ;
- le feature flag, les routes protégées et les tests ;
- les documents de référence et leurs éventuelles contradictions.

## 3. Chaîne actuelle vérifiée

| Chaînon | Implémentation actuelle | Conclusion pour la suite |
|---|---|---|
| Entrée 7 jours | `src/engine/weekly/forecast.ts` appelle `fetchModelForecast` avec `forecastDays=7` et la plage lundi-dimanche | Le chemin 7 jours existe ; le défaut quotidien reste à 2 jours |
| Modèles | Les cinq modèles de `src/config/models.ts`, seuil minimal de 3 modèles valides | Réutiliser le consensus ; ne pas créer une seconde logique de modèles |
| Consensus | `src/engine/consensus.ts` | Source commune des calculs météo |
| Profil journalier | `buildWeeklyProfiles` construit un profil pleine journée et un profil lumière V2 | Conserver la distinction événements pleine journée / scène de jour |
| Scène V24 | `resolveDailySceneV24` appelle `buildDayProfileV2` puis `chooseScene24V2` | Méthode quotidienne déjà centralisée et réutilisable |
| Détection brute | `detectWeeklyEvents` produit chaleur, fraîcheur, pluie, vent, tendance, meilleure fenêtre et orage | Les candidats doivent rester nombreux et factuels en interne |
| Sélection | `selectWeeklyEvents` fusionne par type et jours consécutifs, score, puis garde tout ce qui atteint 55 | C’est le principal point d’évolution : fusion sémantique, hiérarchie et plafond |
| Activités | `translateWeeklyActivities` évalue plage, promenade et sport extérieur sur les heures de jour | La traduction pratique vient après la sélection ; principe à conserver |
| Éditorial | `buildWeeklyEditorial` génère un titre, un corps et une scène par événement | Il manque la conclusion de semaine et la progression narrative |
| Carrousel | `buildWeeklyCarouselPlan` crée une vue d’ensemble puis une slide par événement | La structure adaptative existe, mais elle dépend d’une sélection encore trop large |
| Story | `WeeklyStoryRelay` est explicitement un relais | Conforme au cadre ; à conserver |
| Persistance | `weekly_publications` stocke seulement `editorial_json` et `carousel_json` | Les preuves de sélection ne sont pas conservées dans la publication |
| Planification | `runScheduledWeeklyCity` exige lundi et `WEEKLY_ENABLED=true` | Le rendez-vous lundi matin est correctement borné |

## 4. Ce qui est stable et doit être protégé

### Quotidien

Le pipeline quotidien reste dans `src/pipeline.ts`. Il conserve sa récupération
par défaut sur deux jours, son consensus, son produit officiel, son garde-fou,
son archivage et son contrat `OfficialPublicPayloadV24`.

Le code hebdomadaire n’écrit ni dans les tables de publication quotidiennes ni
dans le payload public quotidien. La fonctionnalité est désactivée lorsque
`WEEKLY_ENABLED` n’est pas exactement égal à `true` après normalisation.

### Scènes V24

Pour chaque jour, `buildWeeklyProfiles` appelle le même adaptateur que le
quotidien :

```text
resolveDailySceneV24
→ buildDayProfileV2
→ chooseScene24V2
→ décision V24 avec famille, score, confiance et invariants
```

Le format hebdomadaire ne mappe donc pas directement « pluie » vers une image
inventée. Il récupère la scène réellement décidée pour le jour représentatif.
Les 24 masters, les pictogrammes, le logo et les box LOKA sont déjà utilisés par
le rendu hebdomadaire.

### Isolation opérationnelle

La prévisualisation `/weekly-preview` est protégée par le token administrateur,
n’écrit pas dans D1 et reste indépendante de `WEEKLY_ENABLED`. La publication
manuelle et la publication planifiée sont, elles, bloquées lorsque le flag est
désactivé.

## 5. Écarts importants constatés

### Écart A — absence de plafond éditorial

`WEEKLY_SELECTION_RULES.minimumScore` vaut 55 et `scoreEvent` commence à 55
pour la plupart des types. En pratique, un candidat brut qui atteint son seuil
de détection est souvent publié.

La sélection peut donc produire cinq événements ou davantage. Cela correspond
à l’ancien contrat adaptatif, mais contredit désormais la règle LOKA : trois
événements principaux maximum, exceptionnellement quatre.

**Conséquence :** l’étape 5 devra ajouter un plafond explicite, une règle
d’exception et une trace des candidats écartés.

### Écart B — fusion par type, pas par histoire

La fonction actuelle `mergeConsecutive` regroupe les événements consécutifs du
même type. Elle ne sait pas encore reconnaître qu’une série d’améliorations
successives raconte une seule évolution, ni qu’une dégradation et une pluie
associée peuvent former une même histoire.

**Conséquence :** l’étape 4 doit créer des épisodes météo consolidés, avec les
dates et les preuves de tous les candidats absorbés.

### Écart C — ordre par score, pas ordre narratif

Après sélection, les événements sont triés par score décroissant. La première
slide événement peut donc être située au milieu de la semaine et la meilleure
fenêtre n’est pas obligatoirement la dernière.

**Conséquence :** l’étape 6 doit séparer importance et ordre de lecture : le
score choisit ce qui mérite d’être raconté, puis une règle narrative ordonne
contexte, rupture, conséquence et meilleure fenêtre éventuelle.

### Écart D — la première slide ne conclut pas la semaine

`buildWeeklyEditorial` écrit actuellement un corps de type « un/deux temps
forts météo sont retenus ». Il ne décrit pas la trajectoire générale de la
semaine.

**Conséquence :** l’étape 7 doit produire une conclusion déterministe à partir
des épisodes retenus, sans appel à un modèle de langage.

### Écart E — preuves non persistées dans la publication

Les preuves existent dans `WeeklyEvent` et `SelectedWeeklyEvent` pendant le
calcul. Elles disparaissent ensuite de `WeeklyEditorialEvent`, qui ne conserve
que le texte, les dates, les activités et la scène. La table
`weekly_publications` ne stocke donc pas la sélection ni ses preuves.

**Conséquence :** l’étape 3 doit définir le contrat d’une histoire météo et la
façon de conserver son evidence, ses candidats absorbés, son score, sa
confiance et sa raison de sélection.

### Écart F — garde d’activation incomplète

`validateWeeklyActivation` vérifie les dimensions, le mapping des slides, la
plage lundi-dimanche, le relais Story et les chemins des masters V24. Elle ne
vérifie pas encore :

- le plafond de trois ou quatre événements ;
- l’ordre chronologique et la position finale de la meilleure fenêtre ;
- la présence des preuves météo ;
- la conclusion générale de la première slide ;
- l’absence de redondance entre événements publiés.

Ces contrôles doivent être ajoutés avec les contrats correspondants, et non
introduits isolément avant que les étapes 3 à 7 soient définies.

### Écart G — documentation et tests encore alignés sur l’ancien contrat

Les documents et tests suivants mentionnent encore un nombre illimité ou
adaptatif sans plafond :

- `docs/WEEKLY_REFERENCE.md` ;
- `src/engine/weekly/README.md` ;
- `tests/weeklySelection.ts`, qui vérifie cinq événements sans plafond.

Le nouveau document maître `docs/WEEKLY_NARRATIVE_REFERENCE.md` est la référence
prioritaire pour ce chantier. Ces documents et tests seront harmonisés lorsque
la nouvelle structure de données et les règles de sélection seront implémentées.

### Écart H — deux points de rendu à traiter plus tard

Le rendu est bien séparé du quotidien et réutilise l’univers LOKA. Deux détails
ne doivent toutefois pas être oubliés à l’étape 10 :

- la date longue de l’en-tête de certaines slides peut entrer en conflit avec
  le libellé « TARNOS » ;
- l’en-tête Story utilise actuellement une plage ISO courte, moins éditoriale
  qu’une formulation française.

Ce sont des sujets de rendu et de formulation, pas des raisons pour modifier
les scènes V24 ou le moteur quotidien à ce stade.

## 6. Risques de non-régression

| Risque | État observé | Mesure de protection |
|---|---|---|
| Modification du quotidien | Aucun changement nécessaire pour l’étape 2 | Ne modifier que la couche weekly aux étapes de code |
| Horizon quotidien modifié | Le client météo garde `forecastDays=2` par défaut | Ajouter uniquement des options au chemin hebdomadaire |
| Scene V24 dupliquée ou divergente | L’adaptateur partagé existe déjà | Continuer à appeler `resolveDailySceneV24` |
| Écriture dans les tables quotidiennes | La table hebdomadaire est séparée | Conserver `weekly_publications` et ses futures extensions séparées |
| Activation accidentelle | Le flag est désactivé par défaut | Garder `WEEKLY_ENABLED=false` jusqu’à l’étape 12 |
| Erreur hebdomadaire bloquant le quotidien | Les tâches sont attendues via `Promise.allSettled` | Ajouter une observabilité explicite avant l’activation |
| Charge du lundi matin | Le quotidien et l’hebdomadaire lancent chacun les modèles | Vérifier la charge et le comportement D1 à l’étape 12 |

Le dernier point est le seul risque opérationnel notable : le lundi, le job
quotidien et le job hebdomadaire peuvent interroger les cinq modèles en même
temps. L’isolation logique est bonne, mais la charge et les logs devront être
validés avant l’activation.

## 7. Correspondance avec les étapes restantes

| Étape | Utilisation directe de l’audit |
|---:|---|
| 3 | Définir l’objet histoire, les preuves, la confiance et les candidats absorbés |
| 4 | Remplacer la fusion seulement « par type » par une consolidation d’épisodes |
| 5 | Introduire le score éditorial, le plafond 3/exception 4 et les rejets justifiés |
| 6 | Ordonner le carrousel en contexte, rupture, conséquence, fenêtre éventuelle |
| 7 | Générer la conclusion générale de la semaine |
| 8 | Attacher les activités seulement aux histoires qui le justifient |
| 9 | Maintenir la scène décidée par la méthode quotidienne V24 |
| 10 | Corriger le rendu, les en-têtes et le relais Story sans toucher au quotidien |
| 11 | Tester plafonds, fusion, ordre, preuves, scènes et non-régression quotidienne |
| 12 | Vérifier migration, charge du lundi, logs, flag et activation progressive |

## 8. Vérifications exécutées

### Réussites

- vérification TypeScript du Worker : réussite ;
- tests hebdomadaires isolés : `8/8`, `10/10`, `17/17`, `13/13`, `13/13`,
  `10/10`, `17/17`, `22/22`, `13/13` et `10/10` ;
- toutes les suites hebdomadaires actuellement présentes passent donc leur
  contrat historique.

### Échec préexistant hors périmètre

La suite complète s’arrête sur :

```text
EDITORIAL_DOCTRINE_STEP4_FAIL:scene13_showers_context
```

Ce test concerne une formulation éditoriale quotidienne (« Averses
intermittentes » contre « Averses par moments »). Aucun code n’a été modifié
pour l’étape 2 ; cet écart reste donc séparé du chantier narratif hebdomadaire.

## 9. Décision de fin d’étape 2

L’étape 2 est validée.

- Le dépôt transféré contient bien la chaîne hebdomadaire attendue.
- Les points de raccord avec le quotidien et les 24 scènes sont identifiés.
- Les divergences avec le nouveau cadre narratif sont documentées.
- Les risques de non-régression sont explicitement bornés.
- Aucun code de production n’a été modifié pendant cette étape.

L’étape active suivante est uniquement l’étape 3 : définir le contrat de
données des histoires météo avant de modifier la consolidation ou la sélection.
