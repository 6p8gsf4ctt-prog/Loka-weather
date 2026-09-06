# LOKA — Consolidation des événements redondants
# Étape 4 — « La semaine à Tarnos »

Version : 0.2.0  
Date : 6 septembre 2026  
Statut : étape 4 terminée  
Étape suivante : étape 5 — hiérarchisation et plafond de publication

## 1. Objectif réalisé

La chaîne hebdomadaire ne transforme plus automatiquement chaque candidat brut
en événement indépendant. Elle dispose maintenant d’une couche explicite de
consolidation qui regroupe les candidats racontant le même épisode météo.

Cette couche est déterministe, située avant le score de sélection et séparée du
moteur quotidien.

## 2. Implémentation

Le nouveau module est :

```text
src/engine/weekly/consolidation.ts
```

La fonction publique est :

```ts
consolidateWeeklyEvents(rawEvents: WeeklyEvent[]): WeeklyStoryEpisode[]
```

La sélection hebdomadaire appelle désormais cette fonction avant de calculer
les scores. Les épisodes enrichis restent compatibles avec le fonctionnement
actuel de l’éditorial et des activités.

## 3. Règles de fusion

### Même type sur des jours consécutifs

Deux candidats de même type sont fusionnés lorsqu’ils se suivent dans la
semaine. Cela s’applique aux épisodes de chaleur, fraîcheur, pluie, vent,
orage et aux tendances de même direction.

Exemple :

```text
chaleur lundi + chaleur mardi
→ un épisode chaleur du lundi au mardi
```

### Tendance avec une journée intermédiaire

Une amélioration ou une dégradation peut absorber une journée intermédiaire
sans candidat opposé. Cette règle traite le cas d’une évolution progressive
qui n’est pas détectée chaque jour avec la même intensité.

```text
amélioration lundi + amélioration mercredi
→ une transition d’amélioration lundi-mercredi
```

Si une dégradation intervient entre les deux, la fusion est bloquée. Le moteur
ne doit pas raconter une tendance continue lorsque les signaux montrent une
rupture contraire.

### Épisodes qui restent séparés

- deux épisodes de pluie séparés restent deux épisodes ;
- deux épisodes de vent séparés restent deux épisodes ;
- une amélioration et une dégradation ne sont jamais absorbées ensemble ;
- deux meilleures fenêtres restent distinctes jusqu’à l’étape de sélection,
  qui pourra ensuite choisir la meilleure ;
- les candidats de types différents ne sont pas fusionnés arbitrairement à
  cette étape.

Cette dernière limite évite d’introduire prématurément une histoire composite
pluie-vent ou chaleur-amélioration sans règle éditoriale validée.

## 4. Données conservées

Chaque `WeeklyStoryEpisode` produit contient :

- un identifiant d’épisode déterministe ;
- une famille d’histoire ;
- une direction lorsqu’il s’agit d’une transition ;
- le type principal ;
- les identifiants de tous les candidats sources ;
- les types de tous les candidats sources ;
- la date de début et la date de fin ;
- les indices de tous les jours contributeurs ;
- un jour représentatif choisi selon la force factuelle du signal ;
- les preuves conservées ou agrégées ;
- une règle indiquant si l’épisode a été fusionné.

Les preuves agrégées conservent notamment les maxima, cumuls, durées,
variations de nébulosité et soutiens inter-modèles adaptés au type. Les données
de provenance restent accessibles par `sourceCandidateIds`.

## 5. Ce que l’étape 4 ne fait pas

Pour rester dans le périmètre prévu :

- aucun plafond de publication n’est appliqué ;
- aucun candidat n’est rejeté selon une limite de slides ;
- aucun ordre narratif n’est imposé ;
- la conclusion générale n’est pas générée ;
- le rendu du carrousel et de la Story n’est pas modifié ;
- les scènes V24 et le moteur quotidien ne sont pas modifiés ;
- aucun nouveau type météo n’est ajouté.

Le nombre de candidats bruts peut donc encore être supérieur au nombre
d’épisodes, et le nombre d’épisodes sélectionnables peut encore dépasser la
future limite éditoriale. C’est attendu avant l’étape 5.

## 6. Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `src/engine/weekly/consolidation.ts` | Nouvelle logique de consolidation déterministe |
| `src/engine/weekly/selection.ts` | Utilisation des épisodes consolidés et conservation de leur provenance |
| `src/engine/weekly/index.ts` | Export public de la consolidation et de ses types |
| `tests/weeklyConsolidation.ts` | Tests des fusions, ruptures, fenêtres et preuves |
| `tests/run-all.ts` | Intégration de la suite de consolidation |
| `docs/WEEKLY_NARRATIVE_REFERENCE.md` | Mise à jour du suivi des 12 étapes |

Le moteur quotidien, les migrations D1, les routes de production et les assets
visuels n’ont pas été modifiés.

## 7. Vérifications réalisées

- vérification TypeScript du Worker : réussite ;
- compilation des tests avec la résolution compatible déjà utilisée par le
  dépôt : réussite ;
- consolidation : `15/15 PASS` ;
- isolation hebdomadaire : `8/8 PASS` ;
- récupération hebdomadaire : `10/10 PASS` ;
- profils : `17/17 PASS` ;
- détection : `13/13 PASS` ;
- sélection : `13/13 PASS` ;
- activités : `10/10 PASS` ;
- éditorial : `17/17 PASS` ;
- carrousel : `22/22 PASS` ;
- opérations : `13/13 PASS` ;
- activation : `10/10 PASS`.

La suite globale conserve l’échec quotidien déjà identifié avant cette étape :
`EDITORIAL_DOCTRINE_STEP4_FAIL:scene13_showers_context`. Il ne concerne pas la
consolidation hebdomadaire et aucun correctif quotidien n’a été introduit.

## 8. Critère de fin de l’étape 4

L’étape est validée car :

- les signaux redondants peuvent devenir un épisode unique ;
- les tendances progressives sont regroupées sans absorber une tendance
  opposée ;
- les épisodes indépendants restent séparés ;
- les fenêtres restent disponibles pour la sélection ultérieure ;
- la provenance et les preuves sont conservées ;
- la logique est déterministe et testée ;
- aucune règle de plafond ou d’ordre narratif n’a été anticipée ;
- le moteur quotidien n’a pas été modifié.

La seule étape active suivante est l’étape 5 : hiérarchiser les épisodes et
limiter la publication à trois histoires, exceptionnellement quatre.
