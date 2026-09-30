# Installation — Daily Insight, étape 2

Cette livraison ajoute la sélection éditoriale au laboratoire Daily Insight. Elle nécessite que l’étape 1 soit déjà installée.

## Fichiers à importer

Conserver exactement l’arborescence du ZIP :

- `src/engine/dailyInsight/editorialSelection.ts`
- `src/storage/dailyInsightEditorialDrafts.ts`
- `migrations/0023_daily_insight_editorial_drafts.sql`
- `tests/dailyInsightEditorialSelection.ts`
- `tests/run-all.ts`
- `docs/DAILY_INSIGHT_EDITORIAL_SELECTION_STEP2.md`
- `INSTALLATION_DAILY_INSIGHT_ETAPE_2.md`

`tests/run-all.ts` est le seul fichier existant modifié. Il ajoute uniquement l’import du test de sélection éditoriale.

## Migration Cloudflare D1

Dans la console de la base D1 `loka-weather`, exécuter séparément les trois requêtes présentes dans `migrations/0023_daily_insight_editorial_drafts.sql` :

1. création de `daily_insight_editorial_drafts` ;
2. création de l’index par date de génération ;
3. création de l’index de rotation par détecteur.

La table restera vide : aucun cron ni aucune route ne déclenche encore le laboratoire.

## Déploiement

Aucune variable Cloudflare ne doit être ajoutée ou modifiée. En particulier, cette étape ne doit pas servir à modifier les interrupteurs de la STORY Daily Insight existante.

Après déploiement :

- le moteur Daily actif reste inchangé ;
- aucune nouvelle route n’apparaît ;
- aucune STORY supplémentaire n’est exposée ;
- aucun brouillon n’est créé automatiquement ;
- le sélecteur ne peut être appelé que par un futur point d’entrée de laboratoire.

## Retour arrière

Retirer les fichiers ajoutés et la ligne `import "./dailyInsightEditorialSelection";` de `tests/run-all.ts` suffit à restaurer le code précédent.

La table D1 peut rester en place sans effet. Sa suppression n’est ni nécessaire ni recommandée pendant les tests parallèles.
