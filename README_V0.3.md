# LOKA Weather Engine V0.3

Cette mise à jour améliore le moteur décisionnel sans toucher à Cloudflare D1, au Cron, au secret ADMIN_TOKEN ni à l'interface V0.2.

## Fichiers à remplacer

Copier exactement ces 4 fichiers dans le dépôt GitHub :

- `src/types.ts`
- `src/config/cities.ts`
- `src/engine/consensus.ts`
- `src/engine/verdict.ts`

Faire ensuite un commit sur `main`. Cloudflare doit redéployer automatiquement.

## Ce que corrige V0.3

### 1. Température
LOKA ne déduit plus « frais » d'une simple forte amplitude thermique.

Pour Tarnos V0.3 :
- moins de 15°C le matin : frais
- 15 à moins de 21°C : doux
- 21°C et plus : matin déjà doux/chaud
- 27°C et plus au maximum : après-midi chaud
- 33°C et plus : très chaud

Ainsi une journée 20° → 28° ne peut plus produire « Plus frais ce matin ».

### 2. Pluie
- « Journée sèche » reste possible même avec un faible bruit probabiliste.
- Les codes météo des modèles sont maintenant pris en compte en plus des quantités.
- « Averses » signifie réellement intermittent / signal de showers.
- Le timing reste explicite : « Pluie de 17 h à 20 h. »

### 3. Orages
Les codes WMO 95–99 des modèles sont agrégés en `thunderstormSupport`.
Si le signal est assez robuste, le verdict peut devenir :
- « Orages de 18 h à 21 h. »
- « Chaud dans la journée, orageux en soirée. »

### 4. Vent
Toujours invisible lorsqu'il est banal à Tarnos.
- rafales ≥55 km/h : vent notable
- rafales ≥70 km/h : fortes rafales

### 5. Variations thermiques
Une forte hausse ou baisse n'est affichée que si les températures absolues rendent cette information réellement utile.

## À vérifier après déploiement

1. Ouvrir `/admin`
2. Générer manuellement Tarnos
3. Vérifier le JSON
4. Ouvrir `/tarnos`

Pour la journée test autour de 20° le matin et 28° l'après-midi, la phrase attendue est plutôt :
`Doux ce matin, chaud et ensoleillé ensuite.`
ou, si le point 7h dépasse 21°C :
`Doux dès le matin, chaud et ensoleillé ensuite.`

## Aucun changement de base de données

Le schéma D1 ne change pas. `diagnostics_json` stocke déjà un objet JSON libre, donc les nouveaux diagnostics n'exigent aucune migration SQL.
