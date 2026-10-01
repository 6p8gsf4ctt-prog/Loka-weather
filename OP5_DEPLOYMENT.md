# LOKA Daily Insight — OP5

## Objet

L’OP5 met en service la sélection éditoriale V2 validée en OP4 sur l’unique route comparative :

`/daily-insight-story?city=tarnos`

Le moteur Daily officiel, ses PUBLICATIONS et ses STORIES ne sont pas modifiés. Le moteur Weekly reste également intact pendant toute la période de validation.

## Fonctionnement

- À 06 h 45 heure locale, une tâche indépendante prépare le brouillon Daily Insight du jour.
- La route publique lit uniquement ce brouillon en cache : aucun appel aux modèles météo n’est lancé à l’ouverture.
- Un gagnant éligible et suffisamment fort produit une STORY exportable manuellement.
- Un résultat `NO_ELIGIBLE_CANDIDATE` produit un silence éditorial assumé.
- Un cache absent, périmé, rejeté ou incohérent déclenche automatiquement l’ancien moteur Daily Insight.
- Aucun envoi Instagram automatique n’est ajouté.

## Commandes de sécurité Cloudflare

Les variables sont livrées avec ces valeurs :

```text
DAILY_INSIGHT_OP5_ENABLED=true
DAILY_INSIGHT_OP5_ROLLBACK=false
DAILY_INSIGHT_OP5_MAX_DRAFT_AGE_HOURS=30
```

Pour revenir immédiatement à l’ancien moteur comparatif sans redéployer :

```text
DAILY_INSIGHT_OP5_ROLLBACK=true
```

Pour réactiver l’OP5 :

```text
DAILY_INSIGHT_OP5_ROLLBACK=false
```

## Contrôle après déploiement

1. Ouvrir `/api/health` et vérifier `dailyInsightStory.op5.enabled: true` et `rollback: false`.
2. Ouvrir `/api/daily-insight/status` et vérifier `op5.mode`, `op5.reason` et `op5.draftStatus`.
3. Ouvrir `/daily-insight-story?city=tarnos`.
4. Vérifier que le canvas fait 1080 × 1920 et que le bouton d’export télécharge le PNG.
5. En cas d’anomalie, passer uniquement `DAILY_INSIGHT_OP5_ROLLBACK` à `true`.

## États possibles

| État | Effet |
| --- | --- |
| `ACTIVE` | La STORY OP5 validée est affichée. |
| `EDITORIAL_SILENCE` | Aucune information assez forte : aucune STORY n’est fabriquée. |
| `LEGACY_FALLBACK` | L’ancien moteur comparatif prend automatiquement le relais. |

La suppression du moteur Weekly comparatif n’est pas incluse dans cette étape. Elle ne devra intervenir qu’après plusieurs jours de stabilité vérifiée de l’OP5.

## Correctif P3 quotidien — version éditoriale 1.1.0

Le correctif ajoute quatre rendez-vous de secours fondés sur les données :

- `P301` : changement thermique principal du jour ;
- `P302` : meilleur créneau local de trois heures ;
- `P303` : plus longue fenêtre sèche ;
- `P304` : rythme thermique quotidien.

Ces contenus restent derrière les signaux P0 à P2 et ne revendiquent jamais un
record. Leurs seuils et leurs pénalités de rotation leur sont propres afin de
garantir un contenu utile sans affaiblir les exigences appliquées aux faits rares.

Le silence éditorial reste possible uniquement lorsque les données essentielles
ne sont pas prêtes ou que le consensus météo est insuffisamment fiable.

Les routes du Worker acceptent désormais indifféremment un chemin avec ou sans
slash final. Lors du premier accès après déploiement, l’ancien brouillon 1.0.0
est invalidé et le brouillon 1.1.0 est préparé en arrière-plan. Le premier rendu
peut utiliser brièvement l’ancien moteur ; il suffit alors de rafraîchir la page.
