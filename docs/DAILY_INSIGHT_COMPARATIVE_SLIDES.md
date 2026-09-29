# Daily Insight — slides comparatives (étape 4)

## Objectif

Transformer le signal éditorial sélectionné par Daily Insight en une STORY LOKA immédiatement compréhensible, sans modifier le moteur journalier public et sans publication automatique.

La slide n'est créée que si le moteur isolé retourne un gagnant au-dessus du seuil éditorial. `NO_DAILY_INSIGHT`, `CACHE_UNAVAILABLE` et `REFERENCE_STALE` restent des résultats valides et ne produisent aucun visuel réel.

## Socle graphique commun

Toutes les structures réemploient les mêmes éléments de l'identité LOKA :

- format STORY 1080 × 1920 ;
- fond maître de la scène du jour ;
- logo officiel, ville et date ;
- palette marine et or ;
- typographie et règles de contour du système graphique LOKA ;
- box en verre, rayons, bordures et transparences communs ;
- pictogrammes officiels ;
- titre commun « À remarquer aujourd'hui » ;
- box éditoriale et signature « Ici, aujourd'hui. » ;
- ligne de preuve locale affichée dans le visuel.

## Quatre structures

| Structure | Formats éditoriaux | Rôle visuel | Exemples |
|---|---|---|---|
| Niveau rare | `F1_RARETE_LOCALE` | Mettre au premier plan la durée depuis la dernière valeur comparable | chaleur rare, fraîcheur inhabituelle |
| Bascule horaire | `F2_EVOLUTION_RAPIDE` | Montrer une variation, ses heures de départ et d'arrivée et les deux températures | chute de 10 °C en 3 h |
| Série locale | `F3_SEQUENCE` | Matérialiser la longueur d'une séquence et son interruption | pluie après 18 jours secs |
| Repère utile ou calendaire | `F4_REPERE_SAISONNIER`, `F5_PHENOMENE_LOCAL` | Donner une information actionnable ou un repère de calendrier sans inventer une comparaison | heure d'hiver, rafales remarquables |

`F4` et `F5` partagent volontairement la même architecture graphique : ce sont deux variantes éditoriales d'une seule structure utile.

## Scénarios de contrôle

La galerie intégrée vérifie six situations :

1. forte chaleur — niveau rare ;
2. fraîcheur inhabituelle — niveau rare ;
3. chute thermique — bascule horaire ;
4. pluie après une longue période sèche — série locale ;
5. vent remarquable — repère utile ;
6. passage à l'heure d'hiver — repère calendaire.

Un septième état, sans canvas, valide explicitement l'absence de signal pertinent.

## Accès après déploiement

- signal réel et audit : `/daily-insight-preview?city=tarnos` ;
- galerie des scénarios : `/daily-insight-preview/scenarios?city=tarnos`.

La galerie fonctionne immédiatement avec des scénarios contrôlés. Le signal réel dépend du cache `daily_insight_reference_cache`, préparé en arrière-plan à 04:00 heure de Paris.

## Fonctionnement en parallèle

- aucune route publique existante n'est remplacée ;
- `/` et `/daily-graphic-preview` ne sont pas modifiées par cette étape ;
- aucune requête de publication n'existe dans le renderer ;
- l'export PNG est une action manuelle depuis la preview ;
- un seul signal réel peut produire une slide ;
- le moteur peut tourner plusieurs jours en observation avant toute décision de mise en production.

## Contrôles automatisés

- compilation TypeScript ;
- présence des six scénarios et des cinq formats éditoriaux dans les quatre structures ;
- syntaxe du renderer Canvas ;
- dimensions 1080 × 1920 ;
- absence de transport de publication ;
- absence de canvas lorsque le moteur répond `NO_DAILY_INSIGHT` ;
- conservation du seuil et de la sélection unique du moteur éditorial.

