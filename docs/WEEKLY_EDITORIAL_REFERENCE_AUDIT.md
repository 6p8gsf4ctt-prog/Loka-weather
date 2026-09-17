# LOKA — Références des signaux éditoriaux hebdomadaires

## Décision finale — étape 2 — 17 septembre 2026

LOKA conserve son consensus de prévision existant et ajoute une seule brique :
les observations historiques et normales officielles Météo-France de la station
**BIARRITZ-PAYS-BASQUE**.

Cette décision clôt l'étape 2. Elle ne modifie ni le moteur quotidien, ni la
maquette verrouillée des publications hebdomadaires.

## 1. Sources retenues

### Prévision et confiance

Le moteur continue d'utiliser, via Open-Meteo, les cinq prévisions déjà
intégrées : Météo-France AROME France, ECMWF IFS, ECMWF AIFS, DWD ICON-EU et
NOAA GFS.

Le consensus LOKA reste l'unique source de la valeur **prévue**. La dispersion
des modèles contribue au niveau de confiance. Une prévision n'est jamais
présentée comme une observation acquise.

### Historique local et normales

| Propriété | Valeur verrouillée |
|---|---|
| Source | Météo-France, portail public `meteo.data.gouv.fr` |
| Station | `BIARRITZ-PAYS-BASQUE` |
| Identifiant | `64024001` |
| Coordonnées | 43,469333° N · 1,534333° O |
| Altitude | 71 m |
| Point LOKA Tarnos | 43,5417° N · 1,4628° O |
| Distance calculée | 9,90 km |
| Normales officielles | 1991–2020 |
| Licence | Licence Ouverte / Open Licence 2.0 |

Cette station côtière est la référence V1 la plus proche et la plus cohérente
avec Tarnos. Son nom et son identifiant accompagnent toute preuve historique
stockée par le moteur.

## 2. Couverture réellement vérifiée

### Série quotidienne

L'archive quotidienne contient **25 203 journées**, du 1er janvier 1956 au
31 décembre 2024, pour la station `64024001`.

- Tmin : 25 203 valeurs ;
- Tmax : 25 203 valeurs ;
- pluie : 25 203 valeurs ;
- rafale maximale sur 3 secondes (`FXI3S`) : disponible de 1981 à 2024 ;
- contrôles qualité Météo-France présents dans les fichiers.

La période 1991–2020 est suffisamment complète pour la référence
climatologique quotidienne V1.

### Série horaire

L'audit montre que les années antérieures à 2000 ne sont pas toutes homogènes :
1990 est principalement tri-horaire et plusieurs années 1991–1994 sont
incomplètes. À partir de 2000, la couverture est horaire et quasi continue :

- 2000–2009 : 87 672 lignes, 87 651 températures présentes ;
- 2010–2019 : 87 648 lignes, 87 613 températures présentes ;
- 2020–2024 : 43 848 lignes, 43 845 températures présentes ;
- 2025–16 septembre 2026 : 14 956 lignes de station contrôlées.

La référence horaire V1 est donc **2000–2024**, et non 1991–2020. Elle ne sera
jamais appelée « normale 1991–2020 ».

### Fiche climatologique officielle

La fiche de la station indique explicitement « Statistiques 1991–2020 et
records ». Elle couvre notamment températures, précipitations, ensoleillement,
vent et fréquences de franchissement de seuils. L'édition auditée date du
6 septembre 2026 ; les records de température et pluie commencent en 1956,
ceux de rafales sur 3 secondes en 1981.

## 3. Conventions de comparaison

| Signal | Référence V1 | Convention |
|---|---|---|
| Écart à la normale de Tmin/Tmax | Observations quotidiennes 1991–2020 | Même variable ; fenêtre calendaire centrée de ±7 jours |
| Percentile quotidien | Observations quotidiennes 1991–2020 | Même variable ; même fenêtre de ±7 jours |
| « Le plus… depuis » | Série quotidienne 1956–dernier jour consolidé | Même variable et même définition |
| Pluie hebdomadaire inhabituelle | Sommes glissantes de 7 jours, 1991–2020 | Comparaison à la même période de l'année |
| Température à une heure donnée | Série horaire homogène 2000–2024 | Même heure locale et fenêtre saisonnière |
| Variation intrajournalière | Données horaires d'une même journée | Jamais le minimum d'un jour avec le maximum d'un autre |
| Rafale | `FXI3S` uniquement, à partir de 1981 | Ne jamais mélanger `FXI` et `FXI3S` |
| Record futur | Prévision comparée à l'observation | Formulation conditionnelle obligatoire |

La fenêtre de ±7 jours donne 450 observations potentielles sur 30 ans et évite
qu'une comparaison repose sur seulement trente dates. Il s'agit d'une
**référence climatologique dérivée**, pas d'une normale quotidienne officielle.

Les normales mensuelles publiées dans la fiche Météo-France restent les seules
valeurs qualifiées de « normales officielles 1991–2020 ».

## 4. Règles de qualité et de traçabilité

Un signal est invalidé si l'une des conditions suivantes n'est pas satisfaite :

1. variable, unité, fenêtre temporelle et méthode de mesure comparables ;
2. couverture d'au moins 90 % sur la période de référence visée ;
3. indicateur qualité Météo-France acceptable et valeur non manquante ;
4. au moins 20 années comparables pour un signal climatologique horaire ;
5. date, heure et fuseau normalisés avant tout regroupement journalier ;
6. provenance complète : station, ressource, période, date d'acquisition et
   version de la méthode de calcul ;
7. distinction explicite entre observation, statistique dérivée et prévision.

Le moteur normalisera les horodatages dans `Europe/Paris`. Le sens exact du
champ source `AAAAMMJJHH` sera confirmé par le schéma d'ingestion de l'étape 3
avant toute conversion ; aucune hypothèse silencieuse sur le fuseau n'est
autorisée.

## 5. Politique de station et de données manquantes

- La station `64024001` est la référence unique de la V1.
- Le moteur ne recolle jamais deux stations pour fabriquer une série continue.
- Si une variable est absente ou insuffisamment fiable, le signal concerné est
  désactivé ; une autre station ne la remplace pas silencieusement.
- ERA5-Land et les agrégateurs ne servent ni de preuve locale, ni de secours
  automatique.
- Une éventuelle deuxième station fera l'objet d'une décision et d'un libellé
  explicites dans une version ultérieure.

## 6. Accès et actualisation

Les ressources sélectionnées sont publiques et téléchargeables sans secret
applicatif pour la V1. Aucun identifiant supplémentaire n'est demandé à
l'utilisateur à la clôture de cette étape.

Stratégie prévue pour l'étape 3 :

- importer une fois l'archive quotidienne historique ;
- importer une fois la référence horaire 2000–2024 ;
- actualiser régulièrement les fichiers de l'année en cours ;
- rafraîchir mensuellement la fiche climatologique ;
- conserver localement les références dérivées nécessaires au moteur, plutôt
  que télécharger les archives complètes à chaque génération.

## 7. Périmètre V1 autorisé

La V1 pourra produire des preuves historiques sur :

- Tmin, Tmax et température horaire ;
- pluie quotidienne et cumul glissant ;
- rafales `FXI3S` ;
- franchissements de seuils et séries dérivées de ces variables.

Ensoleillement, nébulosité, brouillard, phénomènes côtiers et poussières
sahariennes restent hors du périmètre historique V1 tant qu'une série locale
comparable et une règle de preuve spécifique ne sont pas validées.

## 8. Ressources auditées

- Portail public : `https://meteo.data.gouv.fr/`
- Données climatologiques horaires :
  `https://meteo.data.gouv.fr/datasets/donnees-climatologiques-de-base-horaires`
- Archive quotidienne 1950–2024 du département 64 :
  `https://www.data.gouv.fr/api/1/datasets/r/8f62ed7c-1d50-4812-9a1d-b549e9f92a33`
- Fiche climatologique de la station 64024001 :
  `https://www.data.gouv.fr/api/1/datasets/r/da500ce4-14e6-4581-9f1d-0d9c64d97477`

## Conclusion

L'étape 2 est validée avec une architecture volontairement simple : prévision
multi-modèles LOKA d'un côté, preuve locale officielle Météo-France de l'autre.
Aucune source supplémentaire n'est ajoutée tant qu'une lacune précise ne le
justifie. L'étape 3 peut maintenant construire les séries dérivées, normales,
percentiles, seuils et compteurs saisonniers sur ce contrat.
