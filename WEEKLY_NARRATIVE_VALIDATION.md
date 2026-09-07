# LOKA — Validation et prévisualisation
# Étape 11 — « La semaine à Tarnos »

Version : 0.1.0  
Date : 7 septembre 2026  
Statut : étape 11 terminée  
Étape suivante : étape 12 — déploiement contrôlé et activation progressive

## 1. Objectif

Vérifier la chaîne hebdomadaire complète avant toute activation publique et
confirmer qu’elle ne modifie pas le moteur quotidien.

Cette étape est une certification. Elle n’active pas `WEEKLY_ENABLED`, ne
modifie pas Cloudflare et n’écrit pas dans D1.

## 2. Certification du format adaptatif

La suite `tests/weeklyReleaseCandidate.ts` exécute le plan complet du rendu
pour :

- zéro événement ;
- un événement ;
- deux événements ;
- trois événements ;
- quatre événements exceptionnels.

Pour chaque cas, elle vérifie le nombre de slides, la validation d’activation,
le nombre de canvas du preview, l’identité de l’événement et le caractère
relais de la Story. Elle vérifie également qu’un cinquième événement est
bloqué.

## 3. Prévisualisation contrôlée

La prévisualisation existante `/weekly-preview` reste la surface de contrôle
visuel :

- elle est protégée par le token administrateur ;
- elle peut être utilisée avant le lundi de production ;
- elle génère le carrousel complet et la Story ;
- elle permet le téléchargement de chaque image ;
- elle n’écrit pas dans D1 ;
- elle reste indépendante de `WEEKLY_ENABLED`.

Le rendu est vérifié sur les dimensions Instagram :

```text
carrousel : 1080 × 1350
Story     : 1080 × 1920
```

## 4. Résultats

Les vérifications ciblées de l’étape 11 sont passées :

- TypeScript du Worker : réussite ;
- compilation des tests : réussite ;
- certification release candidate : `28/28 PASS` ;
- suites hebdomadaires existantes : toutes passantes ;
- suites quotidiennes et V24 ciblées : toutes passantes ;
- stress test des 24 scènes : `1200/1200 PASS` ;
- aucune modification du chemin quotidien, de D1 ou du flag d’activation.

La suite globale conserve un échec historique hors périmètre sur
`EDITORIAL_DOCTRINE_STEP4_FAIL:scene13_showers_context`, lié au libellé
quotidien « Averses intermittentes ». Il est documenté mais n’est pas modifié
par cette évolution hebdomadaire.

## 5. Anti-déviation

Le suivi actif reste centralisé dans
`docs/WEEKLY_NARRATIVE_REFERENCE.md`. Le document historique
`docs/WEEKLY_PROGRESS.md` pointe désormais explicitement vers cette référence.

Les critères de passage à l’étape 12 sont donc limités à :

1. certification technique passée ;
2. prévisualisation visuelle contrôlée ;
3. absence de régression quotidienne ;
4. activation toujours désactivée jusqu’à la décision finale.

## 6. Fichiers de l’étape

| Fichier | Rôle |
|---|---|
| `tests/weeklyReleaseCandidate.ts` | Certification complète des scénarios 0 à 5 |
| `tests/run-all.ts` | Inclusion de la certification |
| `docs/WEEKLY_NARRATIVE_VALIDATION.md` | Référence de l’étape 11 |
| `docs/WEEKLY_NARRATIVE_REFERENCE.md` | Suivi actif et journal de validation |
| `docs/WEEKLY_PROGRESS.md` | Balisage de l’ancien suivi historique |

## 7. Critère de fin

L’étape est validée lorsque les scénarios adaptatifs sont certifiés, que le
preview rend le carrousel et le relais Story, que les tests quotidiens passent
et que la fonctionnalité reste inactive en production.
