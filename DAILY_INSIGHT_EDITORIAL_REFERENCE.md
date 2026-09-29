# LOKA — Référentiel éditorial Daily Insight

**Version :** 1.0.0  
**Date :** 29 septembre 2026  
**Statut :** spécification éditoriale de référence — aucune activation publique  
**Périmètre :** future STORY comparative journalière, construite en parallèle du moteur Daily actif

## 1. Mission

Daily Insight répond à une seule question :

> **Qu’y a-t-il d’intéressant aujourd’hui dans la météo locale ?**

La slide ne répète pas la prévision principale. Elle transforme une donnée locale
prouvée en information contextualisée, remarquable et immédiatement compréhensible.

Le moteur doit pouvoir conclure qu’aucune information ne mérite d’être publiée.
Une absence de slide est préférable à une comparaison exacte mais banale.

## 2. Invariants éditoriaux

1. **Une seule Daily Insight au maximum par jour.**
2. **Aucune slide de remplissage.** Le moteur publie uniquement si le score final
   atteint le seuil de publication et si toutes les portes de preuve sont franchies.
3. **La prévision journalière actuelle n’est pas modifiée.** Daily Insight est un
   produit parallèle et désactivé par défaut jusqu’à validation explicite.
4. **Une information déjà visible sur la première slide est exclue.** Sont notamment
   exclus la simple température, la pluie attendue, le vent attendu, le pictogramme
   dominant et la variation quotidienne de lumière déjà présentée ailleurs.
5. **Une comparaison conserve la même grandeur, unité et fenêtre temporelle.** Une
   température à 22 h ne se compare pas à une Tmin, ni une intensité horaire à un
   cumul journalier.
6. **Un fait prévu n’est jamais présenté comme observé.** Les records futurs sont
   toujours conditionnels.
7. **La preuve est locale et traçable.** La source, la station, la période, la taille
   de l’échantillon et la date de calcul restent accessibles dans les métadonnées.
8. **Une seule idée par slide.** Pas de mosaïque de statistiques ni de deuxième fait
   concurrent dans le sous-texte.
9. **Le texte public reste naturel.** La donnée sert le récit ; elle ne devient pas
   une fiche de base de données.

## 3. États de preuve et vocabulaire autorisé

| État | Condition | Formulation autorisée | Formulation interdite |
|---|---|---|---|
| `OBSERVED` | événement passé, mesure contrôlée et datée | « Ce matin a été… », « Cela fait 18 jours… » | futur affirmatif |
| `EXPECTED_HIGH` | consensus de prévision robuste | « devrait », « est attendu », « pourrait être le niveau le plus élevé depuis… » | « est », « a battu le record » |
| `EXPECTED_MEDIUM` | prévision exploitable mais moins robuste | « pourrait », « est possible » | « devrait », record affirmé |
| `CALENDAR_CERTAIN` | règle calendaire officielle et déterministe | présent affirmatif : « Cette nuit, nous passons… » | approximation astronomique non sourcée |
| `UNPUBLISHABLE` | confiance faible, preuve incomplète ou comparaison invalide | aucune publication | toute formulation publique |

### Règles de source

- **Prévision cible :** consensus LOKA, avec nombre de modèles, dispersion et heure
  de dernière mise à jour.
- **Passé local :** archive d’observations contrôlées, jamais une ancienne prévision.
- **Référence climatique :** distribution locale calculée sur des fenêtres
  calendaires comparables ; le terme « normale officielle » n’est utilisé que si la
  source l’est réellement.
- **Calendrier :** règle officielle `Europe/Paris` pour le changement d’heure ; date
  officielle pour saisons, équinoxes et solstices.
- **Localisation :** tant que la référence est la station 64024001
  BIARRITZ-PAYS-BASQUE, le texte parle de **« référence locale proche de Tarnos »**
  ou de **« notre historique local »**, jamais de « record mesuré à Tarnos ».

### Couverture minimale

| Type de revendication | Exigence minimale |
|---|---|
| « depuis X jours/semaines/mois » | 365 jours valides et dernière occurrence espacée d’au moins 30 jours |
| record potentiel | 10 années valides au minimum ; 20 ans recommandés |
| percentile ou anomalie calendaire | 300 observations comparables au minimum |
| première occurrence saisonnière | 20 saisons historiques |
| série « jamais aussi longue » | 10 années complètes au minimum |
| comparaison veille / intrajournalière | fenêtres homologues complètes et confiance prévisionnelle au moins moyenne |
| événement calendaire | source officielle, fuseau et date sans ambiguïté |

## 4. Priorités

| Niveau | Rôle | Exemples |
|---|---|---|
| `P0 — signature` | information locale rare ou immédiatement utile, fortement différenciante | record potentiel, plus chaud/frais depuis plusieurs mois, chute rapide, retour de pluie après longue sécheresse, changement d’heure |
| `P1 — forte` | contexte local net, rareté ou séquence remarquable | P95/P5, anomalie forte, série chaude/froide, vent le plus fort depuis plusieurs semaines |
| `P2 — contextuelle` | évolution notable mais moins rare | écart marqué avec la veille, grande amplitude, arrivée d’un régime pluvieux |
| `P3 — appoint` | fait exact mais moins distinctif | seuil pratique isolé, repère saisonnier courant |

`P3` ne peut pas être publié seul sans score final supérieur au seuil. La priorité
ne remplace jamais la preuve ni la pertinence.

## 5. Formats éditoriaux de slide

Les formats ci-dessous définissent la structure de contenu, pas encore le graphisme.

| Code | Intention | Valeur forte | Ligne principale | Ligne de preuve |
|---|---|---|---|---|
| `F1_RARETE_LOCALE` | situer un niveau dans l’histoire locale | durée, rang ou percentile | fait rare en langage naturel | dernière date ou taille de référence |
| `F2_EVOLUTION_RAPIDE` | montrer un changement court et utile | écart signé + durée | direction, moment et ampleur | fenêtre horaire ou comparaison homologue |
| `F3_SEQUENCE` | matérialiser une série ou une absence | nombre de jours | phénomène continu | début de série et référence historique |
| `F4_REPERE_SAISONNIER` | annoncer une première/dernière occurrence | seuil ou événement | repère saisonnier | historique des saisons ou source calendaire |
| `F5_PHENOMENE_LOCAL` | mettre en avant un épisode à impact | valeur + unité | phénomène et moment | seuil moteur ou contexte récent |

Chaque slide contient : un surtitre stable `À REMARQUER AUJOURD’HUI`, une valeur
forte, une phrase principale, une phrase de preuve courte et une mention source
interne non dominante. Le format ne doit jamais afficher trois colonnes
« aujourd’hui / hier / différence ».

## 6. Catalogue complet des comparaisons

Les seuils ci-dessous constituent la **V1 de déclenchement**. Ils devront être
calibrés sur un jeu de rejeu local avant activation, sans être abaissés pour remplir
une journée vide.

### 6.1 Température — rareté et histoire locale

| ID | Fait détectable | Données nécessaires | Seuil V1 | Priorité | Preuve requise | Formulation autorisée | Exclusions | Format |
|---|---|---|---|---|---|---|---|---|
| `T01` | Matin le plus frais depuis une date remarquable | Tmin prévue, archive quotidienne des Tmin | dernière Tmin ≤ valeur prévue située à ≥30 j ; promotion P0 à ≥90 j | P0/P1 | même station, Tmin contrôlées, date de dernière valeur comparable | « Le matin le plus frais depuis fin mai pourrait nous attendre. » | moins de 365 j d’archive ; écart <2 °C avec médiane saisonnière ; faible confiance | F1 |
| `T02` | Après-midi la plus chaude depuis une date remarquable | Tmax prévue, archive quotidienne des Tmax | dernière Tmax ≥ valeur prévue à ≥30 j ; P0 à ≥90 j | P0/P1 | même station et Tmax ; dernière occurrence datée | « Cet après-midi pourrait être le plus chaud depuis six mois. » | archive incomplète ; niveau ordinaire pour la saison ; doublon avec T05 plus fort | F1 |
| `T03` | Nuit exceptionnellement douce ou froide | Tmin sur fenêtre nocturne, historique homologue | dernière valeur comparable ≥30 j et anomalie absolue ≥4 °C | P1 | heures nocturnes identiques, dates et couverture | « Une nuit rarement aussi douce à cette période. » | Tmin quotidienne non attribuable à la nuit ; changement de jour ambigu | F1 |
| `T04` | Record local potentiel | extrême prévu, record observé, durée d’archive | prévision au-delà du record ; marge ≥0,5 °C | P0 | ≥10 ans valides, record et date, confiance haute | « Si les prévisions se confirment, le record local de la période pourrait être approché ou dépassé. » | jamais « record battu » avant observation ; station mal attribuée ; arrondi créant artificiellement un dépassement | F1 |
| `T05` | Valeur dans les 5 % les plus hautes/basses de la période | Tmin/Tmax, distribution ±7 jours calendaires | ≥P95 ou ≤P5 et écart à la médiane ≥3 °C | P1 | ≥300 observations comparables, percentile daté | « Une chaleur parmi les plus marquées observées à cette période. » | P5–P95 ; distribution trop petite ; doublon avec record/historique plus parlant | F1 |
| `T06` | Forte anomalie saisonnière | prévision, moyenne ou médiane locale datée | écart ≥4 °C ; très fort à ≥6 °C | P1 | référence locale comparable et taille d’échantillon | « Environ 6 °C au-dessus de notre référence locale de fin septembre. » | appeler « normale officielle » une moyenne dérivée ; écart <4 °C | F1 |
| `T07` | Rang remarquable dans une fenêtre récente | valeur prévue, 30/90/180 derniers jours | rang 1 sur ≥30 j et écart au second ≥0,5 °C ; ou top 3 sur 180 j avec anomalie ≥4 °C | P1 | série continue, rang et fenêtre explicites | « L’une des trois après-midi les plus chaudes des six derniers mois. » | classement sur données manquantes ; top arbitraire sans rareté | F1 |

### 6.2 Température — changements utiles

| ID | Fait détectable | Données nécessaires | Seuil V1 | Priorité | Preuve requise | Formulation autorisée | Exclusions | Format |
|---|---|---|---|---|---|---|---|---|
| `T08` | Chute rapide au cours de la journée | températures horaires prévues | baisse ≥7 °C en ≤4 h ; P0 à ≥10 °C en ≤3 h | P0 | points horaires du même jour, heures début/fin, confiance ≥moyenne | « Grosse chute ce soir : 10 °C de moins en seulement 3 heures. » | fenêtre traversant minuit ; interpolation excessive ; simple passage jour/nuit <7 °C | F2 |
| `T09` | Hausse rapide au cours de la journée | températures horaires prévues | hausse ≥7 °C en ≤4 h ; P0 à ≥10 °C en ≤3 h | P1 | mêmes exigences que T08 | « La température gagnera 9 °C entre 8 h et midi. » | hausse matinale ordinaire pour la saison ; fenêtre non complète | F2 |
| `T10` | Amplitude journalière remarquable | Tmin/Tmax et historique des amplitudes | amplitude ≥14 °C et ≥P90 ; P0 à ≥P95 ou 18 °C | P1/P2 | extrêmes du même jour et distribution locale d’amplitude | « Une journée à deux visages, avec 15 °C d’écart entre le matin et l’après-midi. » | amplitude élevée mais habituelle localement ; heures d’extrêmes inconnues | F2 |
| `T11` | Fort écart avec la veille | valeur observée homologue de la veille, valeur prévue du jour | écart absolu Tmin ou Tmax ≥5 °C ; fort ≥7 °C | P1/P2 | observation de la veille, même métrique, prévision du jour | « Cet après-midi devrait être 8 °C plus chaud qu’hier. » | comparer deux heures différentes ; écart <5 °C ; veille issue d’une ancienne prévision | F2 |
| `T12` | Fort écart demain matin vs ce matin | observation du matin, prévision homologue du lendemain | écart absolu ≥5 °C ; fort ≥7 °C | P1 | fenêtres 05–09 h homologues | « Demain matin, il pourrait faire 7 °C de moins qu’aujourd’hui. » | Daily Insight centré strictement sur aujourd’hui si l’information n’est pas utile dès ce soir | F2 |
| `T13` | Bascule thermique jour/nuit utile | valeur au pic, valeur en soirée/nuit | baisse ≥8 °C avant 23 h ou ≥10 °C avant 02 h | P0/P1 | heures locales explicites ; données horaires continues | « Après 29 °C cet après-midi, retour vers 19 °C en soirée. » | doublon T08 ; franchissement de minuit non explicité | F2 |

### 6.3 Séquences et seuils saisonniers

| ID | Fait détectable | Données nécessaires | Seuil V1 | Priorité | Preuve requise | Formulation autorisée | Exclusions | Format |
|---|---|---|---|---|---|---|---|---|
| `S01` | Première chaleur marquée de la saison | Tmax et saisons passées | premier ≥25 °C, ≥30 °C ou ≥35 °C selon saison | P1 | aucune occurrence antérieure ; ≥20 saisons | « Premier cap des 30 °C de l’année en vue. » | seuil déjà franchi ; simple premier jour calendaire chaud sans contrôle | F4 |
| `S02` | Premier froid, gel ou nuit tropicale | Tmin et saisons passées | premier ≤5 °C, ≤0 °C ou ≥20 °C | P0/P1 | même seuil, saison définie, ≥20 saisons | « Le premier risque de gel de la saison pourrait arriver ce matin. » | confusion prévision/observation ; seuil non pertinent pour la période | F4 |
| `S03` | Dernière occurrence tardive potentielle | valeur, dates de dernières occurrences historiques | après P90 des dates de dernière occurrence et seuil franchi | P1 | ≥20 saisons et distribution des dates | « Une chaleur particulièrement tardive pour la saison. » | annoncer « dernière de l’année » avant que l’année soit terminée | F4 |
| `S04` | Série chaude ou froide remarquable | anomalies journalières observées + jour prévu | ≥3 jours consécutifs avec anomalie ≥3 °C ; P0 si série ≥5 j ou record historique | P1 | continuité, seuil constant, archive de référence pour le record | « Quatrième journée d’affilée nettement au-dessus de la référence locale. » | journées non consécutives ; changement de définition en cours de série | F3 |
| `S05` | Série au-dessus/dessous d’un seuil parlant | Tmax/Tmin quotidiennes | ≥3 jours ; publication si longueur ≥P90 ou nouveau jalon 5/7/10 j | P1/P2 | série datée et seuil explicite | « Cinquième journée consécutive au-dessus de 25 °C. » | seuil choisi après coup ; série ordinaire ; doublon S04 | F3 |
| `S06` | Fin nette d’une série | série en cours + valeur prévue qui la rompt | série préalable ≥5 j ou ≥P90 ; rupture ≥3 °C au-delà du seuil | P1 | preuve de la série et du jour de rupture | « La série de six journées chaudes devrait prendre fin aujourd’hui. » | série trop courte ; rupture incertaine à l’arrondi | F3 |

### 6.4 Pluie et sécheresse locale

| ID | Fait détectable | Données nécessaires | Seuil V1 | Priorité | Preuve requise | Formulation autorisée | Exclusions | Format |
|---|---|---|---|---|---|---|---|---|
| `R01` | Nombre de jours sans pluie mesurable | archive RR quotidienne | jalons 10/15/20/30 jours, avec pluie <1 mm/j | P0/P1 | observations continues jusqu’à hier ; définition affichable | « Cela fait 18 jours qu’il n’est pas tombé 1 mm de pluie. » | données manquantes interprétées comme 0 ; pluie locale non contrôlée | F3 |
| `R02` | Retour de la pluie après une période sèche | R01 + pluie prévue | sécheresse ≥10 j et cumul prévu ≥2 mm avec probabilité suffisante ; fort si ≥15 j et ≥5 mm | P0 | série observée + consensus de pluie ; fenêtre du jour | « La pluie pourrait faire son retour après 18 jours presque secs. » | traces <2 mm ; confiance faible ; dire que la sécheresse est finie avant observation | F3/F5 |
| `R03` | Journée la plus arrosée depuis une date | cumul prévu, archive RR | cumul ≥5 mm et dernière journée ≥ cumul située à ≥30 j ; P0 à ≥90 j | P0/P1 | RR quotidien comparable et date | « La journée la plus arrosée depuis juin pourrait se profiler. » | cumul trop faible ; pluie convective très incertaine ; archive lacunaire | F1 |
| `R04` | Pluie rare pour la période | cumul prévu, distribution calendaire | ≥P95 et ≥10 mm | P1 | ≥300 fenêtres comparables | « Un cumul parmi les 5 % les plus élevés pour cette période. » | seuil P95 inférieur à un cumul utile ; doublon R03 plus lisible | F1 |
| `R05` | Épisode de pluie à impact | cumul/jour et intensité horaire | ≥20 mm/j ou ≥5 mm/h ; promotion selon vigilance locale | P0/P1 | consensus, heure du pic, unité correcte | « Jusqu’à 20 mm attendus aujourd’hui, avec un passage plus marqué cet après-midi. » | simple pluie déjà décrite en slide 1 sans caractère remarquable ; mm/h comparé aux mm/j | F5 |
| `R06` | Rupture humide par rapport à la veille | pluie observée hier et prévue aujourd’hui | hier <1 mm, aujourd’hui ≥8 mm, écart ≥8 mm | P1/P2 | observation + prévision, cumuls journaliers | « Après une journée sèche, un vrai changement de régime aujourd’hui. » | écart dû à une prévision très incertaine ; R02 plus fort disponible | F2 |
| `R07` | Série de jours pluvieux remarquable | RR observée/prévue | ≥3 jours à ≥1 mm ; publier à ≥P90 ou jalon 5/7 j | P1 | continuité et historique des séries | « Quatrième journée pluvieuse d’affilée. » | simples traces ; doublon avec cumul exceptionnel | F3 |
| `R08` | Fin d’une longue période pluvieuse | série R07 et journée sèche prévue | série ≥5 j ou ≥P90 ; jour prévu <1 mm | P1/P2 | série observée et confiance ≥moyenne | « Une première journée presque sèche après cinq jours de pluie. » | éclaircie de quelques heures seulement ; cumul prévu ≥1 mm | F3 |

### 6.5 Vent, orage et visibilité

| ID | Fait détectable | Données nécessaires | Seuil V1 | Priorité | Preuve requise | Formulation autorisée | Exclusions | Format |
|---|---|---|---|---|---|---|---|---|
| `V01` | Rafale la plus forte depuis une date | rafale maximale prévue, archive | prévue ≥40 km/h et dernière rafale ≥ valeur à ≥30 j ; P0 à ≥90 j | P0/P1 | même définition de rafale, conversion m/s→km/h, date | « Les rafales les plus fortes depuis plusieurs semaines pourraient souffler cet après-midi. » | mélange vent moyen/rafale ; capteur ou durée de rafale différents | F1 |
| `V02` | Renforcement rapide du vent | rafales horaires ou jours homologues | +25 km/h en ≤6 h ou vs veille ; valeur finale ≥50 km/h | P1 | valeurs avant/après et heures | « Le vent se renforcera nettement cet après-midi : près de 30 km/h gagnés. » | valeur finale faible ; variation issue d’un seul modèle | F2 |
| `V03` | Vent à impact | rafale maximale | ≥70 km/h ; très fort ≥90 km/h | P0 | consensus, heure, éventuelle vigilance séparée | « Des rafales proches de 75 km/h sont attendues cet après-midi. » | sensation subjective ; vigilance non sourcée ; doublon V01 plus rare | F5 |
| `V04` | Premier coup de vent de la saison | rafale et saisons passées | première rafale ≥70 km/h depuis le début de saison | P1 | aucune occurrence antérieure ; ≥20 saisons pour qualifier la date | « Premier vrai coup de vent de la saison en vue. » | seuil déjà franchi ; vocabulaire « tempête » sans critère officiel | F4 |
| `O01` | Orage local inhabituel ou premier de saison | heures/indices orageux, archive d’occurrences | ≥2 h de signal concordant et première occurrence ou rareté ≥P90 | P1 | au moins deux sources/modèles concordants ; historique comparable | « Le premier signal orageux notable de la saison pourrait apparaître. » | simple risque isolé ; foudre non prévue précisément ; déjà décrit sans contexte | F4/F5 |
| `B01` | Brouillard durable ou premier épisode marqué | visibilité/humidité + durée | ≥4 h et première occurrence ou rareté ≥P90 | P1/P2 | fenêtre horaire, consensus, archive d’occurrences | « Un brouillard plus durable qu’à l’habitude pourrait tenir jusqu’en matinée. » | humidité seule ; visibilité non disponible ; phénomène banal sans comparaison | F5 |

### 6.6 Repères calendaires utiles

| ID | Fait détectable | Données nécessaires | Seuil V1 | Priorité | Preuve requise | Formulation autorisée | Exclusions | Format |
|---|---|---|---|---|---|---|---|---|
| `C01` | Passage à l’heure d’hiver ou d’été | règle `Europe/Paris`, date locale | nuit exacte du changement | P0 | base officielle de fuseau ; heures avant/après | « Cette nuit, nous passons à l’heure d’hiver : à 3 h, il sera 2 h. » | fuseau non confirmé ; publication plus de 24 h trop tôt ; doublon dans une autre slide | F4 |
| `C02` | Premier jour d’une saison | date officielle de l’équinoxe/solstice ou règle éditoriale explicitée | jour exact uniquement | P2/P3 | source officielle et convention précisée | « Aujourd’hui marque le premier jour du printemps. » | mélanger saison météorologique et astronomique ; date approximative | F4 |
| `C03` | Date locale symbolique reliée à un vrai fait météo | calendrier + signal météo indépendant | événement calendaire certain **et** signal météo ≥ seuil P1 | P2 | deux preuves distinctes | « Un premier jour d’automne qui prendra des airs d’été. » | jeu de mots sans anomalie mesurée ; remplace un P0 météo plus utile | F4 |

**Exclusion explicite :** les variations de durée du jour, lever, coucher, aube et
crépuscule ne génèrent pas de Daily Insight, car ces informations figurent déjà sur
la première slide journalière.

## 7. Sélection et hiérarchie

### 7.1 Portes éliminatoires

Un candidat est rejeté avant notation si l’un des cas suivants s’applique :

- contrat de comparabilité invalide ;
- source, station, unité ou fenêtre non traçable ;
- confiance `LOW` ;
- couverture minimale non atteinte ;
- seuil propre au détecteur non franchi ;
- information déjà donnée par la slide météo principale ;
- formulation honnête impossible en 2 lignes ;
- fait entièrement expliqué par un arrondi ;
- doublon thématique d’un candidat plus fort ;
- données manquantes interprétées comme absence de phénomène.

### 7.2 Score sur 100

| Dimension | Poids | Question |
|---|---:|---|
| Rareté locale | 25 | Ce niveau, cette date ou cette série sont-ils réellement inhabituels ? |
| Ampleur | 20 | L’écart franchit-il nettement le seuil plutôt que de le frôler ? |
| Utilité immédiate | 20 | L’information change-t-elle la manière de préparer la journée ? |
| Spécificité locale | 15 | L’information apporte-t-elle ce qu’une application générique ne montre pas ? |
| Clarté narrative | 10 | Le fait se comprend-il en une lecture, sans jargon ? |
| Confiance | 10 | La preuve et la prévision sont-elles robustes ? |

Pénalités cumulables :

- `−20` si le phénomène est déjà central sur la slide 1 ;
- `−15` si la valeur se trouve à moins de 10 % du seuil de déclenchement ;
- `−15` si le fait dépend d’un seul modèle ;
- `−10` si une explication méthodologique est nécessaire pour le comprendre ;
- `−10` si un insight de même thème a été publié la veille sans nouveau jalon.

### 7.3 Décision

- score final **≥70** : publiable ;
- **60–69** : conservé pour audit, non publié en V1 ;
- **<60** : rejet éditorial ;
- un `P0` n’est jamais automatiquement publié ;
- parmi les candidats ≥70, le plus haut score gagne ;
- à égalité : utilité immédiate, puis rareté, puis confiance, puis priorité ;
- maximum : **une slide par date et par ville**.

### 7.4 Déduplication thématique

Les groupes suivants ne peuvent produire qu’un seul gagnant :

- `TEMP_RARE` : T01–T07 ;
- `TEMP_SHIFT` : T08–T13 ;
- `SEQUENCE` : S01–S06 ;
- `WET_WEATHER` : R01–R08 et O01 si même épisode ;
- `WIND` : V01–V04 ;
- `VISIBILITY` : B01 ;
- `CALENDAR` : C01–C03.

Un candidat historique précis l’emporte sur un percentile abstrait à score proche.
Exemple : « plus chaud depuis six mois » est préféré à « dans les 5 % les plus
chauds », car il est plus immédiat et plus mémorable.

## 8. Contrat de rédaction

### 8.1 Structure

- **Valeur forte :** 1 à 12 caractères utiles (`−10 °C`, `18 jours`, `6 mois`).
- **Ligne 1 :** 80 caractères maximum, idée principale.
- **Ligne 2 :** 120 caractères maximum, preuve ou précision.
- La date et les heures sont exprimées en heure locale.
- Une valeur est arrondie une seule fois, selon la précision de sa source.

### 8.2 Formulations recommandées

- « Le matin le plus frais depuis… »
- « L’après-midi la plus chaude depuis… »
- « Grosse chute ce soir : … en seulement … »
- « Cela fait … jours que… »
- « La pluie pourrait faire son retour après… »
- « … journée d’affilée… »
- « Pourrait », « devrait », « est attendu » selon l’état de preuve.

### 8.3 Formulations interdites

- « record battu » sur une prévision ;
- « jamais vu » sans archive exhaustive et qualifiée ;
- « historique » sans période chiffrée ;
- « normale officielle » pour une référence calculée en interne ;
- « tempête », « canicule », « sécheresse » ou « vigilance » hors définition
  officielle applicable ;
- superlatifs vagues : « incroyable », « exceptionnel » sans preuve ;
- jargon brut : « écart intrajournalier », « percentile 95 », « anomalie +σ » ;
- tableau mécanique « aujourd’hui / hier / différence » ;
- causalité non démontrée : « à cause du changement climatique ».

## 9. Cas où aucune slide ne doit être générée

Le moteur doit retourner `NO_DAILY_INSIGHT` si :

- tous les écarts sont faibles ;
- le seul fait disponible est déjà visible sur la slide 1 ;
- le meilleur candidat obtient moins de 70 ;
- la preuve historique ou climatique est insuffisante ;
- les modèles divergent trop ;
- le texte honnête nécessite trop de précautions ;
- deux candidats se contredisent après arrondi ;
- une panne de source empêche la vérification.

`NO_DAILY_INSIGHT` est un succès fonctionnel, pas une erreur.

## 10. Données de sortie obligatoires

Chaque candidat doit conserver, même s’il est rejeté :

```text
id, detectorId, cityId, targetDate, generatedAt
theme, priority, slideFormat, status
forecastMeasurement, comparisonMeasurement, timeWindow
sourceProvider, stationId, stationLabel, archivePeriod
sampleSize, coverage, confidence, threshold
scoreBreakdown, penalties, finalScore
eligibility, rejectionReason, competingCandidateId
copyValue, copyLine1, copyLine2, accessibilityText
```

Cette traçabilité permettra d’expliquer pourquoi une slide a été publiée, pourquoi
une autre a été écartée et pourquoi certaines journées restent sans insight.

## 11. Scénarios de validation obligatoires

| Scénario | Résultat attendu |
|---|---|
| +1 °C par rapport à hier, aucune rareté | aucune slide |
| −10 °C entre 20 h et 23 h, consensus robuste | T08, P0, F2 |
| Tmax prévue la plus haute depuis six mois | T02, formulation conditionnelle, F1 |
| prévision au-dessus du record avec seulement 4 ans d’archive | rejet `INSUFFICIENT_ARCHIVE` |
| 18 jours observés sans ≥1 mm, pluie faible incertaine prévue | R01 possible ; R02 rejeté si confiance faible |
| 18 jours secs puis 8 mm robustes aujourd’hui | R02 prioritaire sur R01 |
| pluie 20 mm et orage issus du même épisode | un seul gagnant `WET_WEATHER` |
| changement d’heure cette nuit + faible variation météo | C01 publié |
| changement d’heure + chute de 10 °C utile ce soir | arbitrage au score ; T08 gagne sauf enjeu horaire supérieur démontré |
| jour −3 min, déjà affiché dans la première slide | rejet `ALREADY_ON_PRIMARY_SLIDE` |
| première gelée prévue, modèles très divergents | aucune slide |
| record prévu puis valeur observée le lendemain | le statut peut passer de conditionnel à observé dans une nouvelle génération |

## 12. Critères de clôture de l’étape 1

L’étape est considérée validée lorsque :

1. chaque insight possède un identifiant, un seuil, une preuve et un format ;
2. le statut prévision/observation/calendrier est impossible à confondre ;
3. chaque superlatif est soutenu par une période et une source ;
4. les exclusions et le silence éditorial sont explicites ;
5. la sélection produit au maximum un gagnant ;
6. les seuils sont rejouables et calibrables sans modifier la charte ;
7. aucune dépendance n’est ajoutée au moteur Daily public actif.

## 13. Décisions reportées aux étapes suivantes

Ce document ne décide pas encore :

- du format physique du cache climatique compact ;
- de l’implémentation des détecteurs ;
- du raccordement aux sources en production ;
- du dessin final de la STORY ;
- de l’activation publique.

Ces sujets seront traités dans un moteur `Daily Insight Preview` isolé, puis validés
sur rejeu avant toute intégration au parcours journalier existant.
