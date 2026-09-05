# LOKA — Suivi du projet
# « La semaine à Tarnos »

Dernière mise à jour : 5 septembre 2026  
Dernière étape validée : 6 — Détecter les événements météo autorisés  
Statut global : étapes 1 à 6 terminées

## Plan strict en 12 étapes

| Étape | Livrable unique | Statut |
|---:|---|---|
| 1 | Cadre de référence et règles de suivi | TERMINÉE |
| 2 | Référence technique du moteur quotidien | TERMINÉE |
| 3 | Espace isolé du moteur hebdomadaire | TERMINÉE |
| 4 | Récupération météo sur sept jours | TERMINÉE |
| 5 | Profils météo des sept journées | TERMINÉE |
| 6 | Détecteurs des événements autorisés | TERMINÉE |
| 7 | Sélection adaptative et semaine calme | À FAIRE |
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

## État à la fin de l’étape 4

- Le cadre de référence fonctionnel a été créé à l’étape 1.
- La référence technique du moteur quotidien a été créée.
- L’espace isolé du moteur hebdomadaire a été créé.
- La récupération isolée sur sept jours a été ajoutée.
- Les contrôles TypeScript, de scènes, d’éditorial, de publication et de stress ont été exécutés.
- Le test d’isolation du flag hebdomadaire a été ajouté.
- Le test de récupération vérifie l’horizon de sept jours et la conservation du défaut quotidien à deux jours.
- L’instance déployée a été vérifiée par ses endpoints de santé et de contenu quotidien.
- Aucun fichier source du moteur quotidien n’a été modifié.
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

## Prochaine étape

Étape 7 : sélectionner adaptativement les événements et gérer la semaine calme.
