# LOKA — Suivi du projet
# « La semaine à Tarnos »

Dernière mise à jour : 5 septembre 2026  
Dernière étape validée : 3 — Créer l’espace isolé du moteur hebdomadaire  
Statut global : étapes 1 à 3 terminées

## Plan strict en 12 étapes

| Étape | Livrable unique | Statut |
|---:|---|---|
| 1 | Cadre de référence et règles de suivi | TERMINÉE |
| 2 | Référence technique du moteur quotidien | TERMINÉE |
| 3 | Espace isolé du moteur hebdomadaire | TERMINÉE |
| 4 | Récupération météo sur sept jours | À FAIRE |
| 5 | Profils météo des sept journées | À FAIRE |
| 6 | Détecteurs des événements autorisés | À FAIRE |
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

## État à la fin de l’étape 3

- Le cadre de référence fonctionnel a été créé à l’étape 1.
- La référence technique du moteur quotidien a été créée.
- L’espace isolé du moteur hebdomadaire a été créé.
- Les contrôles TypeScript, de scènes, d’éditorial, de publication et de stress ont été exécutés.
- Le test d’isolation du flag hebdomadaire a été ajouté.
- L’instance déployée a été vérifiée par ses endpoints de santé et de contenu quotidien.
- Aucun fichier source du moteur quotidien n’a été modifié.
- Aucun changement de configuration ou de base de données n’a été effectué.
- Le format hebdomadaire n’est pas activé.

## Prochaine étape

Étape 4 : ajouter la récupération météo sur sept jours sans modifier la récupération quotidienne par défaut.
