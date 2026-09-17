# LOKA — Phase 3 : validation pilote des slides éditoriales

## Finalité

La validation pilote n'altère ni la slide 1 validée, ni la maquette des slides
2 à 4. Elle relit le résultat exact du pipeline avant publication et produit un
verdict explicite :

- `PASS` : données, prévol, renderer et activation sont cohérents ;
- `REVIEW` : le rendu est techniquement sain, mais une condition de couverture
  éditoriale manque ;
- `BLOCKED` : un contrôle de données, de prévol, de renderer ou d'activation
  a échoué.

Le module est `src/engine/weekly/pilotValidation.ts`.

## Contrôles du rapport de pilote

Chaque rapport vérifie les mêmes objets que le renderer :

1. sept profils météo contigus, de lundi à dimanche ;
2. prévol complet et empreinte identique au plan transmis au renderer ;
3. signal sélectionné, preuve valide et détecteur identique à la slide ;
4. positions des slides 2 à 4 dans le frame `WEEKLY_SHARED_V1` ;
5. validation d'activation hebdomadaire ;
6. couverture climatique locale pour une semaine live.

Une absence d'archive locale ne fabrique pas de comparaison historique. La
semaine peut rester techniquement valide, mais le pilote devient `REVIEW` tant
que la référence Météo-France n'est pas réellement chargée.

## Scénarios contrôlés exécutés

| Scénario | Résultat attendu | Verdict actuel |
|---|---|---|
| Semaine calme | Aucune slide éditoriale ; aucune donnée inventée | `PASS` |
| Chaleur + pluie | Slides 2 et 3, thèmes distincts, prévol complet | `PASS` |
| Activation refusée | Aucun passage en publication | `BLOCKED` |
| Live sans archive locale | Pas de faux contexte historique | `REVIEW` |

## Collecte des semaines réelles

Après déploiement, appeler l'aperçu administrateur pour chaque lundi à tester :

```text
POST /api/admin/weekly/preview?city=tarnos&start=YYYY-MM-DD
Authorization: Bearer <ADMIN_TOKEN>
```

La réponse contient désormais `pilot`, avec les six contrôles, les signaux
retenus, les positions rendues et l'état de référence climatique. Le même
verdict est visible au-dessus du carrousel dans `/weekly-preview`, sans être
dessiné dans une slide. L'appel reste un aperçu : il ne publie rien et n'écrit
aucune semaine en base.

## Critère de sortie de phase 3

La fonction `summarizeWeeklyEditorialPilot` ne donne `PASS` que si :

- au moins deux scénarios contrôlés passent ;
- quatre semaines live distinctes sont collectées ;
- aucune semaine live n'est bloquée ;
- chaque semaine live dispose de la référence climatique locale nécessaire.

À ce stade, l'outillage et les scénarios contrôlés sont terminés. La collecte
des quatre semaines live reste volontairement ouverte : elle dépend des vraies
prévisions du moteur et de la disponibilité effective des archives locales.
