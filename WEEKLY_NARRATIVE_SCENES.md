# LOKA — Liaison avec les scènes V24
# Étape 9 — « La semaine à Tarnos »

Version : 0.1.0  
Date : 7 septembre 2026  
Statut : étape 9 terminée  
Étape suivante : étape 10 — carrousel et relais Story

## 1. Objectif

Chaque histoire hebdomadaire doit utiliser la scène que le moteur quotidien
V24 a réellement choisie pour son jour représentatif. Une catégorie comme
`RAIN` ou `WIND` ne peut jamais sélectionner directement une illustration.

## 2. Chaîne obligatoire

Pour chaque jour des sept jours, le profil hebdomadaire conserve la chaîne :

```text
consensus horaire
→ resolveDailySceneV24
→ buildDayProfileV2
→ chooseScene24V2
→ décision V24
```

L’éditorial reprend ensuite la décision du jour représentatif de l’événement.
Le lien est donc fondé sur la méthodologie quotidienne complète : famille,
scores, voisins, confiance, mode de résolution et invariants.

## 3. Provenance obligatoire

`WeeklySceneReference` conserve maintenant :

- `source = DAILY_V24_DECISION` ;
- la date et l’index du jour source ;
- l’identifiant, le titre et le master de la scène ;
- la version du moteur et de la doctrine V24 ;
- la validité de la décision ;
- la confiance et le mode de résolution.

La provenance est propagée à la vue d’ensemble, aux slides événement et au
relais Story.

## 4. Garde d’activation

La validation de publication bloque une scène si :

- sa source n’est pas une décision quotidienne V24 ;
- la décision est invalide ;
- la version V24 n’est pas identifiable ;
- le jour source sort de la semaine ;
- la date source d’un événement est hors de sa période.

Le garde-fou vérifie les métadonnées, pas seulement le chemin du fichier image.
Il empêche ainsi qu’un master V24 soit utilisé avec une décision graphique
fabriquée ou détachée de la météo source.

## 5. Garanties LOKA

- les 24 scènes restent inchangées ;
- les pictogrammes, logos, fonds et box restent ceux de l’univers LOKA ;
- aucune table événement → illustration n’est créée ;
- le moteur quotidien reste la source de vérité visuelle ;
- une scène peut renforcer l’ambiance, mais ne peut pas contredire V24 ;
- le quotidien et ses contrats publics ne sont pas modifiés.

## 6. Fichiers de l’étape

| Fichier | Rôle |
|---|---|
| `src/engine/weekly/editorial.ts` | Transport de la provenance V24 |
| `src/engine/weekly/activation.ts` | Garde de validité et d’alignement |
| `tests/weeklyProfiles.ts` | Contrôle des métadonnées des décisions V24 |
| `tests/weeklyActivation.ts` | Contrôle de la garde de provenance |
| `tests/weeklyCarousel.ts` | Vérification de la propagation au carrousel |
| `docs/WEEKLY_NARRATIVE_SCENES.md` | Référence de l’étape 9 |

## 7. Critère de fin

L’étape est validée lorsque toutes les scènes hebdomadaires publiables
référencent une décision V24 quotidienne valide, que l’alignement temporel est
contrôlé et qu’aucune correspondance artificielle par catégorie météo n’est
utilisée.
