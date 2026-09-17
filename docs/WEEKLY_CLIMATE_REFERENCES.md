# LOKA — Références climatiques dérivées N3

## Statut

Étape N3 terminée le 17 septembre 2026. Cette couche calcule des références
climatiques comparables ; elle ne détecte pas encore les signaux éditoriaux et
n'active aucune slide.

## Contrat d'import

Le module `src/engine/weekly/climateReferences.ts` :

- lit les archives Météo-France séparées par des points-virgules ;
- normalise les décimales françaises ;
- filtre strictement la station `64024001` ;
- conserve valeurs, indicateurs qualité et provenance ;
- conserve chaque ressource décennale utilisée ;
- interdit le mélange de stations ;
- exige un convertisseur de fuseau explicite pour les données horaires.

Le moteur ne suppose jamais que `AAAAMMJJHH` est déjà en heure locale. Le
connecteur d'ingestion de production devra documenter le référentiel temporel
du fichier puis fournir la conversion vers `Europe/Paris`.

## Références calculées

| Référence | Période | Méthode |
|---|---|---|
| Tmin/Tmax datées | 1991–2020 | fenêtre calendaire ±7 jours, soit jusqu'à 450 valeurs |
| Percentiles | distribution comparable | P1, P5, P10, P50, P90, P95 et P99 interpolés |
| Pluie hebdomadaire | 1991–2020 | sommes glissantes complètes de 7 jours dans la même fenêtre saisonnière |
| Seuils saisonniers | 1991–2020 | nombre annuel et première occurrence entre le début de saison et la date cible |
| Séries consécutives | période demandée | parcours calendaire continu ; une date absente interrompt la série |
| Température/pluie/rafale horaire | 2000–2024 | même heure locale, fenêtre ±7 jours, au moins 20 années distinctes |

## Garde-fous

- couverture quotidienne minimale : 90 % ;
- fenêtre de pluie acceptée uniquement si 90 % des sommes sont complètes ;
- valeur exclue si son indicateur qualité est renseigné et différent de `1` ;
- comparaison horaire refusée sous 20 années distinctes ;
- aucune interpolation d'une journée manquante ;
- aucun remplacement silencieux par une autre station ;
- toutes les ressources et dates d'acquisition restent attachées au résultat.

## API publique interne

- `parseSemicolonArchive`
- `normalizeDailyArchiveRow`
- `normalizeHourlyArchiveRow`
- `dailyCoverage`
- `distribution` et `percentile`
- `buildDatedTemperatureReference`
- `buildRollingRainfallReference`
- `buildSeasonalThresholdReference`
- `buildConsecutiveSeriesReference`
- `buildHourlyClimateReference`

## Limite volontaire

N3 construit la matière climatologique fiable. La détection d'un record, d'une
anomalie, d'une première occurrence ou d'une série remarquable appartient à
N4. Aucun texte tel que « le plus chaud depuis… » ou « parmi les 5 %… » ne doit
être produit directement par cette couche.
