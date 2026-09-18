# LOKA — Activation progressive de « La semaine à Tarnos »

## Réponse courte

Les opérations peuvent être réalisées sans terminal depuis GitHub et le tableau
de bord Cloudflare. Les migrations D1 `0018_weekly_publications.sql` et
`0019_weekly_data_unification.sql` doivent être présentes sur la base distante.
Elles ne modifient pas les tables quotidiennes.

Ne pas activer `WEEKLY_ENABLED` avant cette migration et avant le déploiement
du code correspondant.

## Ordre recommandé

### 1. Déployer le code avec le flag hebdomadaire désactivé

Le dépôt doit d’abord contenir les fichiers de l’étape 12. Le flag peut rester
absent ou être défini à `false`.

### 2. Appliquer la migration distante

Depuis le dépôt, la méthode recommandée est :

```bash
npx wrangler d1 migrations apply DB --remote
```

Sans terminal, ouvrir Cloudflare → D1 → `loka-weather` → Console, puis exécuter
uniquement le contenu des migrations `0018_weekly_publications.sql` et
`0019_weekly_data_unification.sql` si leurs tables sont absentes. Il ne faut
exécuter aucun `DROP`, `DELETE` ou `UPDATE` sur `forecasts`, `runs` ou
`daily_scene_ledger`.

Vérification non destructive :

```sql
SELECT name
FROM sqlite_master
WHERE type = 'table'
  AND name IN (
    'weekly_publications',
    'forecast_snapshots',
    'climate_daily_archive_chunks',
    'climate_archive_state'
  );
```

Le résultat attendu contient les quatre tables.

### 3. Prévisualiser sans écrire dans D1

Un administrateur peut demander une génération de contrôle :

```bash
curl -X POST \
  "https://loka-weather.jpbm62n289.workers.dev/api/admin/weekly/preview?city=tarnos" \
  -H "Authorization: Bearer VOTRE_ADMIN_TOKEN"
```

Cette route ne stocke rien et ne publie rien. Elle peut être utilisée avant
lundi : par défaut, elle prévisualise la prochaine semaine complète du lundi
au dimanche. Pour cibler explicitement un lundi, ajouter par exemple
`&start=2026-09-07`.

Pour vérifier le rendu visuel du carrousel et du relais Story, ouvrir ensuite :

```text
https://loka-weather.jpbm62n289.workers.dev/weekly-preview
```

La page ne demande plus de token. Laisser la date vide pour la prochaine semaine
ou ajouter `?start=YYYY-MM-DD` avec un lundi, puis télécharger les slides. Elle
reste disponible même si `WEEKLY_ENABLED` est désactivé et n'écrit rien en D1.

### 4. Activer progressivement

Après une prévisualisation satisfaisante, ajouter la variable Worker
`WEEKLY_ENABLED` avec la valeur exacte `true`, puis redéployer si Cloudflare le
demande.

Le cron du lundi générera alors la publication. Le lancement manuel protégé est
également disponible le lundi :

```bash
curl -X POST \
  "https://loka-weather.jpbm62n289.workers.dev/api/admin/weekly/run?city=tarnos" \
  -H "Authorization: Bearer VOTRE_ADMIN_TOKEN"
```

### 5. Vérifier les surfaces

```bash
curl -i "https://loka-weather.jpbm62n289.workers.dev/api/weekly?city=tarnos"
curl -i "https://loka-weather.jpbm62n289.workers.dev/weekly?city=tarnos"
curl -i "https://loka-weather.jpbm62n289.workers.dev/api/latest?city=tarnos"
```

La dernière requête confirme que le quotidien continue de répondre. Pour
désactiver le format, retirer `WEEKLY_ENABLED` ou le remettre à `false` ; il
n’est pas nécessaire de supprimer les snapshots D1.

## État de sécurité

- aucune commande distante n’a été exécutée pendant le développement ;
- le flag est désactivé par défaut ;
- les routes d’écriture exigent `ADMIN_TOKEN` ;
- la prévisualisation n’écrit pas en base ;
- le quotidien reste indépendant des snapshots hebdomadaires.
