# LOKA — Référence technique
# Moteur quotidien V24

Version de référence : 1.0  
Date de vérification : 5 septembre 2026  
Statut : référence établie  
Périmètre : génération météo quotidienne de Tarnos

## 1. Rôle du moteur

Le moteur quotidien produit une décision météo officielle pour une journée et une ville. Il ne fabrique pas une prévision indépendante : il agrège plusieurs modèles météo, interprète leur consensus, choisit une scène parmi les 24 scènes LOKA et génère les contenus associés.

Le flux actuel est le suivant :

```text
Cloudflare Cron
→ récupération de cinq modèles
→ consensus horaire pondéré
→ profil météo du jour
→ famille météo puis scène V24
→ éditorial déterministe
→ contrôles de publication
→ archivage et surface publique
```

Cette référence décrit le comportement à préserver pendant la création de « La semaine à Tarnos ».

## 2. Environnement d’exécution

| Élément | État actuel |
|---|---|
| Runtime | Cloudflare Worker TypeScript |
| Base de données | Cloudflare D1 |
| Ville configurée | Tarnos uniquement |
| Fuseau horaire | `Europe/Paris` |
| Moteur de scènes | V24 |
| Version du package | `2.0.0` |
| Version déclarée du moteur de scènes | `2.0.3` |
| Assets graphiques | 24 fonds maîtres dans `public/masters24/` |

## 3. Configuration de Tarnos

La ville est définie dans `src/config/cities.ts` :

- latitude : `43.5417` ;
- longitude : `-1.4628` ;
- heures d’affichage : `4, 6, 8, 10, 12, 14, 16, 18, 20, 22` ;
- rafales notables à partir de `55 km/h` ;
- rafales fortes à partir de `70 km/h` ;
- chaleur l’après-midi à partir de `27 °C` ;
- très forte chaleur à partir de `33 °C` ;
- hausse notable à partir de `7 °C` ;
- hausse forte à partir de `10 °C` ;
- baisse notable à partir de `6 °C`.

Ces seuils sont actuellement des paramètres du moteur quotidien. Ils ne doivent pas être modifiés dans le chantier hebdomadaire sans validation séparée.

## 4. Récupération météo

La récupération est définie dans `src/weather/openMeteo.ts`.

Le moteur utilise par défaut l’API Open-Meteo, avec possibilité de remplacer l’URL et d’ajouter une clé via les variables d’environnement `OPEN_METEO_BASE_URL` et `OPEN_METEO_API_KEY`.

Les cinq modèles sont interrogés en parallèle :

| Identifiant | Modèle | Famille | Poids |
|---|---|---|---:|
| `arome` | Météo-France AROME France | `meteofrance` | 0,30 |
| `ecmwf_ifs` | ECMWF IFS | `ecmwf_physics` | 0,25 |
| `ecmwf_aifs` | ECMWF AIFS | `ecmwf_ai` | 0,15 |
| `icon_eu` | DWD ICON-EU | `dwd` | 0,17 |
| `gfs` | NOAA GFS | `noaa` | 0,13 |

Variables horaires récupérées : température, température ressentie, précipitations, pluie, couverture nuageuse totale et par couche, vitesse du vent, rafales et code météo.

Paramètres de fonctionnement actuels :

- `forecast_days=2` est codé en dur ;
- délai maximal par modèle : 10 secondes ;
- les erreurs individuelles sont tolérées ;
- au moins trois modèles valides sont nécessaires ;
- une génération avec des modèles manquants est marquée `partial`.

L’extension à sept jours devra donc être ajoutée sans changer le comportement par défaut de cette récupération quotidienne.

## 5. Consensus horaire

`src/engine/consensus.ts` aligne les points des modèles par leur horodatage local.

Pour chaque heure, le moteur calcule :

- moyennes pondérées de la température, de la pluie, des nuages et du vent ;
- dispersion des températures entre modèles ;
- soutien pondéré à la pluie ;
- soutien aux codes pluie, averse, orage et brouillard ;
- nombre de modèles disponibles.

La pluie est donc évaluée à la fois par une quantité moyenne et par le nombre de modèles qui signalent le phénomène. Le champ `precipitationSupport` est un soutien inter-modèles, pas une probabilité météorologique calibrée.

## 6. Profil météo journalier

`src/engine/scenes24/profile.ts` transforme le consensus en `DayProfileV2`.

Le profil mesure notamment :

- les fractions de ciel clair, lumineux, mixte, nuageux et dense ;
- la durée des blocs lumineux ou couverts ;
- le nombre d’heures de pluie ;
- la continuité et le cumul de pluie ;
- les blocs d’averses et les périodes sèches ;
- les heures de vent notable ou fort ;
- le chevauchement pluie-vent ;
- le brouillard, le brouillard dense et les orages ;
- les transitions de régime météo ;
- les retournements de tendance ;
- l’incertitude du signal entre modèles.

Le profil de décision utilise une fenêtre solaire calculée par `src/engine/solar.ts`. Les heures retenues pour la caractérisation principale vont du lever approximatif au coucher approximatif.

Conséquence à conserver en mémoire : les événements nocturnes sont actuellement moins représentés dans la décision de scène que les événements diurnes. Le moteur hebdomadaire devra traiter ce point sans modifier le profil quotidien existant.

Les températures publiées dans `buildCandidateProduct` correspondent au minimum et au maximum des points de la fenêtre solaire, et non nécessairement aux extrêmes des 24 heures.

## 7. Choix de la scène V24

Le classement est réalisé en deux niveaux.

### Famille prioritaire

`src/engine/scenes24/families.ts` cherche d’abord une famille dominante selon une priorité structurelle :

1. orage ;
2. pluie et vent ;
3. vent fort ;
4. pluie ;
5. visibilité ;
6. évolution ;
7. instabilité et combinaisons de vent ;
8. voile ;
9. ciel couvert ;
10. ciel lumineux ou ciel partagé.

### Score de scène

`src/engine/scenes24/scoring.ts` attribue ensuite un score aux scènes candidates de la famille retenue.

Le moteur applique également :

- une confiance `HIGH`, `MEDIUM` ou `LOW` ;
- une résolution conservatrice en cas de faible confiance ;
- une résolution de voisinage en cas d’écart faible ;
- une hystérésis locale entre scènes voisines ;
- des invariants garantissant la cohérence entre scène et phénomène détecté.

Les 24 scènes sont définies dans `src/engine/scenes24/registry.ts`. Les titres de présentation sont séparés des identifiants stables utilisés par la classification et la persistance.

## 8. Génération éditoriale

Le moteur éditorial quotidien est déterministe et réparti dans `src/engine/editorial24/`.

Il produit :

- des faits éditoriaux structurés ;
- une ligne principale ;
- une ligne secondaire ;
- une légende Instagram ;
- des hashtags ;
- une question d’engagement.

La hiérarchie actuelle peut déjà distinguer le ciel, la pluie, les averses, le vent, le brouillard, les orages et la température. Elle reste toutefois conçue pour décrire une seule journée et ne compare pas plusieurs journées entre elles.

La génération est effectuée avec des règles et des formulations intégrées au code. Aucun appel à ChatGPT ou à un autre moteur de rédaction n’intervient dans le flux quotidien.

## 9. Publication et persistance

Le pipeline principal est défini dans `src/pipeline.ts`.

Pour une génération planifiée, le moteur :

1. détermine la date locale de Tarnos ;
2. récupère les modèles ;
3. construit le consensus ;
4. construit le produit quotidien ;
5. vérifie le garde-fou de publication ;
6. crée un manifeste avec empreinte SHA-256 ;
7. archive la génération ;
8. officialise la première génération planifiée de la date.

Les principales tables D1 sont :

| Table | Rôle |
|---|---|
| `runs` | Résultat technique de chaque exécution et erreurs des modèles |
| `shadow_history` | Historique append-only des générations et payloads V24 |
| `forecasts` | Surface officielle quotidienne consultée par le public |
| `daily_scene_tracking` | Suivi du traitement d’une date |
| `daily_scene_ledger` | Scène officielle et éventuelles révisions |
| `publication_generation_audit` | Vérification de cohérence des publications |
| `publication_surface_audit` | Contrôle de la surface publique |

Une génération manuelle est archivée comme prévisualisation et n’officialise pas automatiquement la date. La surface publique utilise uniquement un produit officiel vérifié.

## 10. Automatisation actuelle

`wrangler.jsonc` déclare les déclenchements UTC suivants :

```text
45 3 * * *
45 4 * * *
45 5 * * *
```

Le handler planifié vérifie ensuite l’heure dans `Europe/Paris` :

- heure locale 5 : génération `PRIMARY` ;
- heure locale 6 : génération `RETRY` ;
- les autres déclenchements ne lancent pas de génération.

Le retry peut officialiser une génération avec le statut `RECOVERED`. Une date déjà officialisée est ignorée afin d’éviter une seconde publication quotidienne automatique.

## 11. Surface publique et studio Instagram

Les routes quotidiennes actuelles sont :

- `/` : studio Instagram de la journée officielle ;
- `/api/latest?city=tarnos` : payload officiel du jour ;
- `/api/decision?city=tarnos` : décision V24 ;
- `/api/history?city=tarnos` : historique quotidien ;
- `/api/health` : état du Worker ;
- `/api/run?city=tarnos` : prévisualisation manuelle protégée.

`/tarnos` et `/instagram` redirigent vers `/`.

Le rendu Instagram est effectué dans le navigateur avec Canvas :

- Story : `1080 × 1920` ;
- publication : `1080 × 1440` ;
- fonds maîtres : `1080 × 1350` ;
- logo, pictogrammes, horaires, scène et textes sont superposés au fond météo.

Le rendu actuel produit une Story météo, une Story dédiée à la légende et une publication. Le futur carrousel hebdomadaire devra disposer d’un rendu séparé et ne devra pas modifier celui-ci.

## 12. Vérifications réalisées le 5 septembre 2026

### Code local

- vérification TypeScript du moteur : réussite ;
- compilation des tests avec résolution compatible : réussite ;
- certification scènes : `204/204` ;
- moteur éditorial : `216/216` ;
- régressions éditoriales : `11/11` cas ;
- stress scènes : `1200/1200`, aucune décision invalide, 24 scènes atteintes ;
- publication V24 : `10/10` ;
- suites d’architecture, de rendu, de marque et d’export : réussies.

### Instance déployée

`/api/health` répond actuellement :

- moteur `V24` ;
- version de surface `2.0.0` ;
- cinq modèles ;
- 24 scènes.

Le payload quotidien en production du 5 septembre 2026 contient une décision V24 valide, les cinq modèles disponibles et la scène 7 `SOLEIL_VOILE_DENSE`.

## 13. Observations de maintenance enregistrées

Ces observations ne sont pas des modifications du moteur et ne doivent pas être mélangées au chantier hebdomadaire :

1. La configuration de compilation des tests combine `module=CommonJS` et `moduleResolution=Bundler`, combinaison refusée par la version récente de TypeScript sans surcharge de résolution.
2. Un test éditorial attend encore la formulation « Averses intermittentes », tandis que le code produit « Averses par moments ».
3. La documentation générale indique deux déclenchements UTC, alors que `wrangler.jsonc` en déclare trois.
4. Les versions package, surface publique et moteur de scènes ne sont pas unifiées.

Ces points devront être traités séparément ou explicitement laissés inchangés. Ils ne justifient pas une modification immédiate du moteur quotidien dans le cadre de l’étape 2.

## 14. Contraintes pour l’évolution hebdomadaire

La nouvelle fonctionnalité devra :

- conserver le chemin quotidien et son contrat V24 ;
- conserver la récupération quotidienne par défaut sur deux jours ;
- ajouter un chemin de récupération et d’analyse sur sept jours ;
- ne pas réutiliser les tables quotidiennes pour stocker une publication hebdomadaire ;
- isoler ses erreurs du cron quotidien ;
- conserver les fonds et la logique visuelle des 24 scènes ;
- fournir des preuves pour chaque événement retenu ;
- pouvoir être désactivée sans rollback général de LOKA.
