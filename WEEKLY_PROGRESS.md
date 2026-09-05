# LOKA — Suivi du projet
# « La semaine à Tarnos »

Dernière mise à jour : 5 septembre 2026  
Dernière étape validée : 7 — Sélectionner adaptativement les événements et gérer la semaine calme  
Statut global : étapes 1 à 7 terminées

## Plan strict en 12 étapes

| Étape | Livrable unique | Statut |
|---:|---|---|
| 1 | Cadre de référence et règles de suivi | TERMINÉE |
| 2 | Référence technique du moteur quotidien | TERMINÉE |
| 3 | Espace isolé du moteur hebdomadaire | TERMINÉE |
| 4 | Récupération météo sur sept jours | TERMINÉE |
| 5 | Profils météo des sept journées | TERMINÉE |
| 6 | Détecteurs des événements autorisés | TERMINÉE |
| 7 | Sélection adaptative et semaine calme | TERMINÉE |
| 8 | Interprétation des activités | À FAIRE |
| 9 | Textes hebdomadaires et scènes LOKA | À FAIRE |
| 10 | Carrousel et relais Story | À FAIRE |
| 11 | Stockage, routes et automatisation | À FAIRE |
| 12 | Prévisualisation, validation et activation progressive | À FAIRE |

## Règles de pilotage

- Une seule étape est active à la fois.
- Une étape ne change de statut qu’après vérification de son livrable.
- Chaque étape doit indiquer les fichiers modifiés et les contrôles réalisés.
- Aucune nouvelle étape ne doit être ajoutée silencieusement.
- Tout blocage qui sort du périmètre doit être signalé avant de poursuivre.
- Toute régression du moteur quotidien bloque l’étape en cours.
- Le format hebdomadaire ne sera pas activé publiquement avant l’étape 12.

## Journal des décisions

### 5 septembre 2026

Le périmètre fonctionnel est confirmé :

- semaine fixe du lundi au dimanche ;
- génération le lundi matin ;
- carrousel Instagram avec slide de synthèse puis slides adaptatives ;
- relais en Story uniquement ;
- publication maintenue même pour une semaine calme ;
- sept catégories météo initiales, avec orage soumis à une condition de fiabilité ;
- trois catégories d’activités ;
- analyse entièrement automatisée et intégrée au moteur ;
- protection prioritaire du moteur quotidien existant.

### 5 septembre 2026 — référence technique

La référence technique du moteur quotidien a été établie à partir du code local et de l’instance déployée. Les éléments confirmés sont :

- cinq modèles météo pondérés et consensus horaire ;
- récupération quotidienne limitée à deux jours ;
- profil de décision principalement construit sur la fenêtre solaire ;
- classification hiérarchique dans les 24 scènes ;
- génération éditoriale déterministe ;
- officialisation quotidienne protégée par manifeste et garde-fous ;
- déclenchement principal à 5 h locales et tentative à 6 h locales ;
- studio Instagram quotidien indépendant du futur format hebdomadaire.

Les écarts de maintenance détectés sont enregistrés dans `docs/DAILY_ENGINE_REFERENCE.md` et ne sont pas corrigés dans cette étape.

### 5 septembre 2026 — isolation hebdomadaire

L’espace technique du moteur hebdomadaire a été créé dans `src/engine/weekly/`.

- le module est sans effet de bord à l’import ;
- l’activation est explicitement désactivée par défaut ;
- le flag accepté est uniquement `WEEKLY_ENABLED=true` ;
- aucune route, aucun cron et aucun pipeline quotidien n’utilise encore ce module ;
- un test d’isolation vérifie que l’absence de flag ne peut pas activer la fonctionnalité.

### 5 septembre 2026 — récupération sur sept jours

Le récupérateur hebdomadaire a été ajouté sans changer le défaut quotidien :

- le chemin quotidien conserve `forecast_days=2` ;
- le nouveau chemin utilise `forecast_days=7` pour les cinq modèles ;
- les requêtes restent parallèles et tolèrent les échecs individuels ;
- au moins trois modèles valides sont nécessaires ;
- le résultat contient les prévisions, les erreurs éventuelles et l’horizon utilisé ;
- aucune route, aucun cron et aucun pipeline de production n’utilise encore ce récupérateur.

### 5 septembre 2026 — profils journaliers hebdomadaires

L’étape 5 est terminée. Le livrable a été ajouté dans `src/engine/weekly/profiles.ts` :

- construction d’un consensus horaire sur les sept dates récupérées ;
- validation de sept dates ISO consécutives ;
- conservation du profil solaire V2 déjà utilisé par les 24 scènes ;
- ajout d’agrégats sur les 24 heures pour températures, précipitations, vent, orage, brouillard et dispersion inter-modèles ;
- aucune détection d’événement, hiérarchisation, génération de texte, route ou cron à ce stade.

Les contrôles dédiés valident 15/15 assertions sur les profils. La suite globale reste à 18/19 suites, avec un seul test éditorial historique déjà connu sur le libellé « Averses intermittentes ».

### 5 septembre 2026 — détection brute des événements

L’étape 6 est terminée. Les détecteurs isolés de `src/engine/weekly/events.ts` couvrent les catégories autorisées :

- chaleur marquée ;
- fraîcheur/froid marqué ;
- pluie significative ;
- vent fort ;
- amélioration nette ;
- dégradation nette ;
- fenêtres météo favorables ;
- orage uniquement avec durée minimale et support multi-modèles suffisant.

Les règles et leurs seuils sont regroupés dans `src/config/weeklyEvents.ts`. Les détecteurs renvoient uniquement des candidats factuels avec leur preuve et leur périmètre. Ils ne classent pas les événements, ne les fusionnent pas et ne produisent aucun texte. Le test dédié valide les huit catégories et leurs preuves en 13/13 assertions.

### 5 septembre 2026 — sélection adaptative

L’étape 7 est terminée. `src/engine/weekly/selection.ts` :

- fusionne les journées consécutives portant le même phénomène ;
- calcule un score et une confiance à partir de l’intensité, de la durée et de la nature du signal ;
- conserve tous les événements distincts qui dépassent le seuil, sans plafond fixe ;
- retient la meilleure fenêtre météo parmi les créneaux candidats ;
- renvoie explicitement `CALM` et une raison lorsque rien n’est retenu ;
- ne génère ni texte, ni visuel, ni stockage, ni publication.

Le test dédié valide 13/13 assertions, dont la fusion d’un épisode, le choix de la meilleure fenêtre et la semaine calme.

## Audit des étapes 1 à 6

Audit réalisé avant l’étape 7 sur la copie synchronisée du dépôt et sur l’instance déployée :

- étape 1 : documents de référence présents et décisions lundi-dimanche, carrousel adaptatif, semaine calme et automatisation interne cohérentes ;
- étape 2 : référence quotidienne cohérente avec cinq modèles, 24 scènes, consensus, publication déterministe et défaut quotidien à deux jours ;
- étape 3 : module hebdomadaire isolé, flag désactivé par défaut et absence d’import dans `src/index.ts` et `src/pipeline.ts` ;
- étape 4 : récupérateur hebdomadaire à sept jours, minimum de trois modèles, erreurs individuelles conservées et comportement quotidien inchangé ;
- étape 5 : sept profils consécutifs, consensus horaire, profil solaire V2 réutilisé et agrégats 24 heures disponibles ;
- étape 6 : huit détecteurs autorisés, candidats factuels, seuils documentés et aucune hiérarchisation prématurée ;
- les six ZIP précédents sont lisibles et sans erreur d’archive ;
- compilation principale et compilation des tests réussies ;
- instance : `/api/health` répond V24 avec cinq modèles et 24 scènes ; `/api/latest?city=tarnos` renvoie un payload quotidien valide avec cinq modèles.

Une correction documentaire a été effectuée pendant l’audit : `forecast_days=2` est décrit comme la valeur par défaut, et non comme une valeur impossible à remplacer. Le dépôt de travail ne contient pas les métadonnées Git ; l’audit ne vérifie donc pas le hash du commit distant, mais vérifie les fichiers synchronisés, les ZIP livrés et le comportement de l’instance.

## État à la fin de l’étape 4

- Le cadre de référence fonctionnel a été créé à l’étape 1.
- La référence technique du moteur quotidien a été créée.
- L’espace isolé du moteur hebdomadaire a été créé.
- La récupération isolée sur sept jours a été ajoutée.
- Les contrôles TypeScript, de scènes, d’éditorial, de publication et de stress ont été exécutés.
- Le test d’isolation du flag hebdomadaire a été ajouté.
- Le test de récupération vérifie l’horizon de sept jours et la conservation du défaut quotidien à deux jours.
- L’instance déployée a été vérifiée par ses endpoints de santé et de contenu quotidien.
- Aucun route, cron, pipeline ou contrat quotidien n’a été modifié. Le récupérateur partagé a reçu une option explicite, mais le chemin quotidien conserve son comportement par défaut à deux jours.
- Aucun changement de configuration ou de base de données n’a été effectué.
- Le format hebdomadaire n’est pas activé.

## État à la fin de l’étape 5

- Chaque journée possède ses heures de consensus et son index dans la semaine.
- Le profil solaire V2 existant est réutilisé sans modification.
- Les agrégats 24 heures sont disponibles pour les futurs détecteurs météo.
- Les sept dates sont obligatoirement ISO, consécutives et complètes.
- La dispersion entre modèles est conservée pour mesurer l’incertitude plus tard.
- Aucun événement n’est encore détecté ou classé.
- Le quotidien et la production restent inchangés.

## État à la fin de l’étape 6

- Les huit catégories initiales disposent d’un détecteur automatisé.
- Les seuils thermiques et de vent utilisent la configuration de Tarnos.
- Les seuils de pluie, brouillard, orage et consensus restent alignés sur les règles V2 existantes.
- Les fenêtres favorables sont détectées comme des créneaux horaires bruts, sans recommandation d’activité.
- Les événements sont retournés sans score ni rang : la sélection adaptative est réservée à l’étape 7.
- Aucun texte, visuel, stockage, route, cron ou déploiement n’a été ajouté.

## État à la fin de l’étape 7

- Les épisodes consécutifs identiques sont fusionnés pour éviter les doublons artificiels.
- Le nombre final d’événements dépend uniquement des seuils et des données ; aucun top 3 ou top 5 n’est imposé.
- Une seule meilleure fenêtre est conservée pour la catégorie correspondante.
- Une semaine sans événement retenu produit un état `CALM` exploitable par l’étape éditoriale.
- Chaque événement retenu conserve son score, sa confiance, sa période et ses preuves.
- Le moteur quotidien reste isolé et le format hebdomadaire demeure inactif.

## Prochaine étape

Étape 8 : traduire certains événements en activités concrètes.
