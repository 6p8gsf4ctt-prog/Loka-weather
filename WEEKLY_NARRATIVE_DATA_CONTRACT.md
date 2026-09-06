# LOKA — Contrat de données des histoires météo
# Étape 3 — « La semaine à Tarnos »

Version cible du contrat : 0.2.0  
Date : 6 septembre 2026  
Statut : étape 3 terminée  
Étape suivante : étape 4 — consolidation des événements redondants

## 1. Rôle du contrat

Ce document définit les objets que le moteur devra faire circuler entre la
détection météo et la publication de « La semaine à Tarnos ».

Il ne constitue pas encore une modification du code actif. La version
hebdomadaire actuelle reste en `0.1.0` jusqu’aux étapes d’implémentation. Ce
contrat sert de cible commune pour éviter que la consolidation, la sélection,
l’éditorial et le rendu ne réinventent chacun leur propre structure.

Le contrat est entièrement déterministe et ne prévoit aucun champ produit par
ChatGPT, un LLM ou un service éditorial externe.

## 2. Principe de séparation des couches

Le moteur doit conserver quatre niveaux distincts :

```text
candidat brut
→ épisode météo consolidé
→ histoire sélectionnée
→ plan narratif publié
```

Un candidat brut est une observation détectée par une règle. Un épisode
consolidé regroupe les candidats qui racontent la même évolution. Une histoire
sélectionnée est un épisode qui mérite d’être publié. Le plan narratif fixe
ensuite le rôle, l’ordre, le texte, les activités, la scène et le format.

La présence d’un candidat ou d’un épisode ne signifie donc jamais qu’il doit
devenir une slide.

## 3. Types autorisés

Les détecteurs ne peuvent utiliser que ces types de signaux :

```text
HEAT
COLD
RAIN
WIND
IMPROVEMENT
DEGRADATION
BEST_WINDOW
THUNDER
```

Les types `IMPROVEMENT` et `DEGRADATION` restent distincts au niveau brut. Au
niveau consolidé, ils peuvent devenir une même famille de transition avec une
direction explicite. Cette distinction est importante : elle permet de fusionner
une progression sans perdre le sens météorologique initial.

Les activités autorisées restent limitées à :

```text
BEACH
OUTDOOR_WALK
OUTDOOR_SPORT
```

## 4. Niveau 1 — candidat météo brut

Le candidat brut est une donnée interne issue d’un profil hebdomadaire. Il doit
rester factuel, traçable et indépendant de toute formulation Instagram.

```ts
interface WeeklyRawCandidateV020 {
  version: "0.2.0";
  id: string;
  type: "HEAT" | "COLD" | "RAIN" | "WIND" |
    "IMPROVEMENT" | "DEGRADATION" | "BEST_WINDOW" | "THUNDER";
  startDate: string;
  endDate: string;
  dayIndexes: number[];
  detection: {
    rule: string;
    source: "WEEKLY_PROFILE";
    stage: "RAW";
  };
  evidence: WeeklyEvidenceV020;
}
```

Règles obligatoires :

- `id` est stable pour la même entrée et la même règle ;
- les dates sont des dates locales ISO de Tarnos ;
- `dayIndexes` référence les jours de la semaine, de 0 à 6 ;
- le candidat ne contient ni titre Instagram ni texte destiné au public ;
- le candidat conserve la règle exacte qui l’a déclenché ;
- un candidat peut être rejeté plus tard sans être supprimé de l’audit interne.

## 5. Preuves météo obligatoires

Toutes les étapes suivantes doivent pouvoir expliquer pourquoi une histoire a
été retenue. Les preuves ne doivent donc pas être réduites à une phrase.

```ts
interface WeeklyEvidenceV020 {
  metrics: Record<string, number | string | boolean | null>;
  thresholds: Record<string, number | string | boolean | null>;
  modelSupport: {
    modelCountMin: number;
    modelCountMean: number;
    signalUncertainty: boolean;
  };
  sourceDates: string[];
}
```

Le contenu concret de `metrics` dépend du type, mais doit au minimum permettre
de retrouver :

| Type | Preuves minimales |
|---|---|
| `HEAT` | maximum, minimum éventuel, seuil de chaleur, date(s) |
| `COLD` | maximum, minimum éventuel, seuil de fraîcheur, date(s) |
| `RAIN` | cumul, heures humides, bloc maximal, intensité horaire maximale, soutien inter-modèles |
| `WIND` | rafale maximale, heures fortes, bloc maximal, seuil(s) utilisés |
| `IMPROVEMENT` | couverture nuageuse initiale/finale, variation, force de tendance |
| `DEGRADATION` | couverture nuageuse initiale/finale, variation, force de tendance |
| `BEST_WINDOW` | début, fin, durée, nébulosité moyenne, rafale maximale, pluie absente |
| `THUNDER` | heures orageuses, soutien maximal, seuil de soutien, nombre minimal de modèles |

Un épisode fusionné doit conserver les preuves de chacun de ses candidats via
leurs identifiants. Les valeurs agrégées ne remplacent pas cette traçabilité.

## 6. Niveau 2 — épisode météo consolidé

L’épisode est la structure de sortie de l’étape 4. Il porte une seule idée
météorologique cohérente, même si plusieurs candidats journaliers l’ont
alimentée.

```ts
type WeeklyStoryFamilyV020 =
  | "HEAT"
  | "COLD"
  | "RAIN"
  | "WIND"
  | "TRANSITION"
  | "BEST_WINDOW"
  | "THUNDER";

interface WeeklyStoryEpisodeV020 {
  version: "0.2.0";
  id: string;
  family: WeeklyStoryFamilyV020;
  direction: "NONE" | "IMPROVING" | "DEGRADING" | null;
  primaryType: WeeklyRawCandidateV020["type"];
  sourceCandidateIds: string[];
  sourceCandidateTypes: WeeklyRawCandidateV020["type"][];
  startDate: string;
  endDate: string;
  dayIndexes: number[];
  representativeDayIndex: number;
  evidence: WeeklyEpisodeEvidenceV020;
}
```

`sourceCandidateIds` est obligatoire, y compris lorsque l’épisode ne contient
qu’un seul candidat. `representativeDayIndex` indique le jour utilisé ensuite
pour la scène V24 et ne doit pas effacer les autres jours de l’épisode.

Une consolidation peut fusionner plusieurs jours et, lorsque la logique de
l’étape 4 le justifie, plusieurs types bruts complémentaires. Elle ne doit
jamais fusionner des signaux qui racontent des évolutions opposées ou des
événements indépendants.

```ts
interface WeeklyEpisodeEvidenceV020 extends WeeklyEvidenceV020 {
  sourceCandidateCount: number;
  absorbedDateCount: number;
  aggregatedMetrics: Record<string, number | string | boolean | null>;
}
```

## 7. Niveau 3 — histoire sélectionnée

L’histoire sélectionnée est l’unité comptée pour le carrousel. La slide 1 de
vue d’ensemble n’est pas comptée comme une histoire ; chaque histoire
sélectionnée correspond à une seule slide événement.

```ts
interface WeeklySelectedStoryV020 extends WeeklyStoryEpisodeV020 {
  selection: {
    score: number;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    reason: string;
    selected: true;
  };
  narrative: {
    role: "CONTEXT" | "CHANGE" | "CONSEQUENCE" | "BEST_WINDOW";
    orderKey: string;
    finalWindow: boolean;
  };
  scene: WeeklyDailySceneLinkV020;
  activities: WeeklyActivityInsightV020[];
}
```

Contraintes de sélection :

- 0 histoire sélectionnée est valide ;
- 1, 2 ou 3 histoires sélectionnées sont valides ;
- une quatrième histoire n’est valide que si elle est indépendante, très
  importante et fiable, avec une justification de sélection non vide ;
- le nombre maximal normal est 3 ; le nombre maximal absolu est 4 ;
- une `BEST_WINDOW` compte exactement comme une autre histoire ;
- `finalWindow=true` est réservé à la meilleure fenêtre réellement retenue ;
- aucune histoire ne peut être sélectionnée sans preuves et sans scène source.

Le contrat n’autorise pas un cinquième élément publié, même si le nombre de
candidats bruts ou d’épisodes internes est supérieur.

## 8. Candidats écartés et audit de sélection

La sélection doit expliquer les éléments non publiés. Cette information peut
rester interne, mais elle est nécessaire pour diagnostiquer un moteur trop
verbeux ou trop silencieux.

```ts
interface WeeklySelectionAuditV020 {
  version: "0.2.0";
  rawCandidateCount: number;
  episodeCount: number;
  selectedStoryCount: number;
  normalMaximum: 3;
  absoluteMaximum: 4;
  rejected: Array<{
    id: string;
    source: "CANDIDATE" | "EPISODE";
    reason: "LOW_SCORE" | "REDUNDANT" | "UNCERTAIN" | "LESS_RELEVANT" | "CAP_REACHED" | "CONFLICTING_STORY";
    score: number | null;
    relatedSelectedStoryId: string | null;
  }>;
}
```

Le champ `CAP_REACHED` ne doit être utilisé qu’après comparaison des candidats
selon les règles d’importance. Il ne doit pas servir à tronquer arbitrairement
la liste dans son ordre d’arrivée.

## 9. Niveau 4 — plan narratif de la semaine

Le plan narratif rassemble la conclusion et les histoires dans l’ordre de
lecture. Il est distinct du classement par importance.

```ts
interface WeeklyNarrativePlanV020 {
  version: "0.2.0";
  citySlug: "tarnos";
  startDate: string;
  endDate: string;
  status: "EVENTS" | "CALM";
  overview: {
    title: string;
    body: string;
    evidenceStoryIds: string[];
    scene: WeeklyDailySceneLinkV020;
  };
  stories: WeeklySelectedStoryV020[];
  selectionAudit: WeeklySelectionAuditV020;
  bestWindowStoryId: string | null;
  storyRelay: {
    kind: "RELAY";
    source: "CAROUSEL";
    title: string;
    body: string;
    cta: string;
  };
}
```

Le plan respecte toujours :

```text
conclusion générale
→ contexte éventuel
→ rupture ou évolution
→ conséquence concrète
→ meilleure fenêtre éventuelle
```

Le classement par score peut être conservé dans `selectionAudit`, mais l’ordre
des éléments de `stories` est l’ordre narratif final. La meilleure fenêtre est
la dernière lorsqu’elle existe et est réellement retenue.

### Contrat d’une semaine calme

Pour une semaine calme :

- `status` vaut `CALM` ;
- `stories` est vide ;
- `bestWindowStoryId` vaut `null` ;
- `selectionAudit.selectedStoryCount` vaut 0 ;
- la vue d’ensemble explique brièvement la stabilité ;
- aucune slide événement n’est créée ;
- le relais Story reste un relais de cette publication courte.

## 10. Liaison obligatoire avec la scène quotidienne V24

Une histoire ne choisit pas une illustration par son seul nom. Elle référence
la décision quotidienne du jour représentatif retenu.

```ts
interface WeeklyDailySceneLinkV020 {
  source: "DAILY_V24_DECISION";
  date: string;
  dayIndex: number;
  sceneId: number;
  sceneKey: string;
  sceneLabel: string;
  masterUrl: string;
  visualIcon: string;
  emoji: string;
  decisionVersion: string;
  doctrineVersion: string;
  validity: "VALID" | "INVALID";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  resolutionMode: string;
}
```

Le lien doit être construit à partir de `resolveDailySceneV24` et non d’une
table de correspondance indépendante du type d’histoire. La scène peut
renforcer l’ambiance de l’événement, mais elle ne doit pas contredire la
décision V24 du jour source.

## 11. Conséquences pratiques structurées

Les activités sont attachées à une histoire sélectionnée et restent
numériques avant la rédaction finale.

```ts
interface WeeklyActivityInsightV020 {
  activity: "BEACH" | "OUTDOOR_WALK" | "OUTDOOR_SPORT";
  date: string;
  dayIndex: number;
  status: "FAVORABLE" | "MIXED" | "UNFAVORABLE";
  reasonCodes: Array<"DRY" | "RAIN" | "WIND" | "THUNDER" | "FOG" | "COLD" | "HEAT" | "CLOUD" | "FAVORABLE_WINDOW">;
  evaluatedHours: number;
  favorableHours: number;
  mixedHours: number;
  unfavorableHours: number;
  bestWindow: { startHour: number; endHour: number; hours: number } | null;
  evidence: Record<string, number | boolean | null>;
}
```

Le texte public d’une activité est produit plus tard à partir de cette
structure. Une activité ne doit pas créer une nouvelle histoire météo et ne
doit pas élargir la liste des catégories autorisées.

## 12. Persistance cible

La publication hebdomadaire devra conserver suffisamment d’information pour
être relue, contrôlée et régénérée sans perdre la décision du moteur.

La cible minimale de persistance est :

```text
range lundi-dimanche
→ version du moteur
→ plan narratif
→ histoires sélectionnées avec preuves
→ audit de sélection et rejets
→ scènes V24 source
→ activités structurées
→ plan carrousel
→ relais Story
```

Les prévisions brutes complètes de chaque modèle ne sont pas obligées d’être
recopiées dans la publication si les profils et les preuves nécessaires sont
déjà archivés ailleurs. En revanche, les identifiants, dates, métriques,
seuils, soutien inter-modèles et raisons de sélection ne peuvent pas être
abandonnés.

La migration D1 et la version active de `WeeklyPublicationRecord` seront
traitées dans les étapes d’implémentation concernées. Cette étape ne modifie pas
le schéma de production.

## 13. Invariants testables

Les tests futurs devront pouvoir vérifier que :

1. chaque type brut appartient à la liste autorisée ;
2. chaque épisode référence au moins un candidat existant ;
3. les dates et `dayIndexes` sont cohérents avec la semaine lundi-dimanche ;
4. chaque histoire sélectionnée a des preuves, un score, une confiance et une
   scène V24 source ;
5. le nombre d’histoires est inférieur ou égal à 3, ou égal à 4 avec exception
   justifiée ;
6. la meilleure fenêtre est comptée dans ce nombre ;
7. une semaine calme ne contient aucune histoire sélectionnée ;
8. l’ordre narratif est distinct du classement par score et respecte le rôle de
   chaque histoire ;
9. aucun texte ne contient `undefined`, `null` ou `NaN` ;
10. le relais Story référence le carrousel et ne constitue pas un bulletin
    autonome ;
11. le contrat quotidien `OfficialPublicPayloadV24` reste inchangé.

## 14. Critère de fin de l’étape 3

L’étape 3 est validée lorsque :

- les quatre niveaux de données sont définis ;
- les huit types météo autorisés sont conservés ;
- les preuves des événements et des fusions sont obligatoires ;
- le plafond 3, l’exception 4 et la meilleure fenêtre sont définis dans le
  contrat ;
- la semaine calme est représentée sans événement artificiel ;
- les activités sont attachées aux histoires et restent limitées à trois
  catégories ;
- la scène V24 quotidienne est une référence obligatoire ;
- la persistance cible est décrite ;
- aucun code de production n’a été modifié.

La prochaine modification fonctionnelle doit concerner uniquement l’étape 4 :
consolider les candidats redondants en épisodes qui racontent une seule
évolution météo.
