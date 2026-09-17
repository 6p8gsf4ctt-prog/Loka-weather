# LOKA — Phase 4 : publication progressive

## Périmètre

La slide 1 validée reste le socle public et n'est jamais modifiée par cette
phase. Les slides éditoriales 2 à 4 sont exposées uniquement par la surface
hebdomadaire progressive, après validation du même plan et de son prévol.

Le module `src/engine/weekly/progressivePublication.ts` décide la surface à
montrer à partir de la publication stockée. Il ne réécrit pas la publication
et ne touche pas au moteur quotidien V24.

## Parcours manuel du dimanche

`/weekly-preview` est désormais un parcours public dédié : il lance directement
la génération LIVE du prochain lundi-dimanche, sans token, sans sélecteur de
mode et sans date à saisir. Il affiche la slide 1 et les slides 2 à 4 réellement
retenues par le moteur. Les scénarios contrôlés restent des fonctions de test
internes et ne sont pas proposés sur cette page.

Chaque carte possède une action de partage/enregistrement. Sur iPhone, elle
ouvre la feuille de partage iOS avec un fichier PNG ; choisir « Enregistrer
l’image » pour l’ajouter directement à Photos. Sur un navigateur sans Web
Share, le bouton conserve le téléchargement PNG classique.

## Modes

| Mode | Conditions | Surface publique |
|---|---|---|
| `DISABLED` | `WEEKLY_ENABLED` absent ou faux | aucune surface hebdomadaire |
| `SLIDE1_ONLY` | mode par défaut, ou rollback | slide 1 uniquement |
| `SHADOW` | `WEEKLY_PROGRESSIVE_SHADOW_MODE=true` | slide 1 ; le carrousel éditorial est contrôlé mais non exposé |
| `PROGRESSIVE` | les deux flags d'exposition sont vrais et le prévol passe | slide 1 + slides éditoriales validées |

Les variables suivantes sont optionnelles et restent désactivées par défaut :

```text
WEEKLY_ENABLED=true
WEEKLY_CONTEXTUAL_SLIDES_ENABLED=true
WEEKLY_PROGRESSIVE_SHADOW_MODE=true
WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED=true
WEEKLY_PROGRESSIVE_ROLLBACK=false
```

`WEEKLY_PROGRESSIVE_ROLLBACK=true` est prioritaire sur tous les autres flags.
Il force immédiatement la surface publique à la slide 1 sans supprimer le
carrousel stocké.

## Garde-fous avant exposition

Le mode `PROGRESSIVE` n'est accordé que si :

- l'activation hebdomadaire est valide ;
- le prévol est complet et réussi ;
- l'empreinte du prévol correspond exactement aux slides stockées ;
- les slides complémentaires sont issues du plan éditorial validé.

En cas d'échec, la requête publique répond avec le plan slide 1 uniquement.
La décision contient `fallbackToSlide1=true` et les contrôles en échec sont
journalisés par l'observabilité Cloudflare sous l'événement
`LOKA_WEEKLY_PROGRESSIVE_PUBLICATION`.

## Déploiement progressif

1. Déployer avec `WEEKLY_PROGRESSIVE_SHADOW_MODE=true` et les deux flags
   d'exposition à `false`.
2. Vérifier `/weekly` et `/api/weekly?city=tarnos` : la surface reste la
   slide 1 et les décisions de rollout sont observables.
3. Après la validation pilote de quatre semaines réelles, activer
   `WEEKLY_CONTEXTUAL_SLIDES_ENABLED=true`, puis
   `WEEKLY_PROGRESSIVE_PUBLICATION_ENABLED=true`.
4. Surveiller les décisions et les prévols. En cas d'anomalie, positionner
   `WEEKLY_PROGRESSIVE_ROLLBACK=true`.

La génération hebdomadaire conserve toujours un plan slide 1 de secours si le
prévol éditorial échoue ; aucune erreur de slides 2 à 4 ne doit interrompre
silencieusement la publication du socle validé.
