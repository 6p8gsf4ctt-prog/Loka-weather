# LOKA — Conséquences pratiques
# Étape 8 — « La semaine à Tarnos »

Version : 0.1.0  
Date : 7 septembre 2026  
Statut : étape 8 terminée  
Étape suivante : étape 9 — liaison avec les scènes V24

## 1. Objectif

Transformer certains événements météo retenus en informations directement
utiles pour les habitants de Tarnos, sans transformer chaque slide en bulletin
de recommandations.

Les trois catégories initiales restent strictement limitées à :

- plage ;
- promenade / sortie extérieure ;
- sport extérieur.

## 2. Principe en deux temps

Le moteur calcule d’abord des indicateurs horaires structurés : température,
pluie, vent, orage, brouillard, nébulosité, durée favorable et meilleure
fenêtre.

L’éditorial ne transforme ensuite ces indicateurs en texte que si le lien avec
l’événement sélectionné est direct et prouvé.

```text
conditions horaires
→ statut de l’activité
→ preuve météo associée
→ conseil public éventuel
```

Un événement météo ne crée jamais une nouvelle catégorie et une activité ne
crée jamais une nouvelle histoire.

## 3. Conditions de traduction

| Événement | Preuve directe acceptée |
|---|---|
| `HEAT` | code `HEAT` |
| `COLD` | code `COLD` |
| `RAIN` | code `RAIN` |
| `WIND` | code `WIND` |
| `THUNDER` | code `THUNDER` |
| `IMPROVEMENT` | ciel chargé ou fenêtre favorable |
| `DEGRADATION` | ciel chargé |
| `BEST_WINDOW` | fenêtre favorable utilisable |

Les conseils sans preuve directe sont ignorés. Une semaine ou un événement
peut donc ne produire aucun conseil d’activité, ce qui est préférable à une
recommandation artificielle.

## 4. Formes publiques

Le texte est factuel et court :

- « Plage : meilleur créneau entre 10 h et 15 h. » ;
- « Plage : conditions peu favorables en raison de vent. » ;
- « Promenade : conditions variables en raison de pluie et de fraîcheur. ».

La date est portée par la slide de l’événement. L’horaire n’est affiché que
lorsqu’une fenêtre exploitable est calculée.

## 5. Garanties

- le calcul reste déterministe et local au moteur ;
- les preuves numériques restent conservées dans les insights ;
- les conseils sont rattachés à l’événement qui les justifie ;
- les activités non directement concernées sont omises ;
- le moteur quotidien et les 24 scènes V24 sont inchangés ;
- aucun service externe ou LLM n’est utilisé.

## 6. Fichiers de l’étape

| Fichier | Rôle |
|---|---|
| `src/engine/weekly/editorial.ts` | Filtrage des conseils directement justifiés |
| `tests/weeklyEditorial.ts` | Vérification de l’absence de conseil non prouvé |
| `docs/WEEKLY_NARRATIVE_ACTIVITIES.md` | Référence de l’étape 8 |

Le calcul structuré de `src/engine/weekly/activities.ts` est conservé et
réutilisé ; il n’est pas remplacé par une règle éditoriale approximative.

## 7. Critère de fin

L’étape est validée lorsque les trois catégories d’activités restent
disponibles, que les fenêtres et statuts sont issus des données horaires, et
qu’aucun conseil n’est publié sans relation factuelle avec l’événement.
