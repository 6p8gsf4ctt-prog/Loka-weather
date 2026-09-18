# LOKA — Étape 1 : unification des données

## Résultat

Le moteur quotidien et le moteur hebdomadaire partagent désormais le même
chemin de capture prévisionnelle. Chaque génération interroge les modèles LOKA
existants en parallèle, produit un consensus unique et en conserve un
instantané immuable et traçable dans D1.

Le pipeline hebdomadaire charge en complément l'historique quotidien officiel
de la station Météo-France `BIARRITZ-PAYS-BASQUE` (`64024001`), référence locale
retenue pour Tarnos. L'absence ou le rejet de cet historique ne modifie jamais
la prévision brute ni la slide 1 : seuls les signaux éditoriaux qui exigent une
comparaison climatique sont désactivés.

## Prévision commune

`src/weather/forecastSnapshot.ts` est l'unique point de capture pour les deux
horizons :

- quotidien : horizon de deux jours ;
- hebdomadaire : période exacte du lundi au dimanche ;
- récupération parallèle des modèles configurés ;
- minimum de trois modèles valides avant consensus ;
- conservation des réponses, erreurs, dates et consensus utilisés ;
- empreinte SHA-256 stable de chaque capture.

La configuration actuelle reste inchangée : AROME France, ECMWF IFS, ECMWF
AIFS, ICON-EU et GFS. AROME, ECMWF, ICON-EU et GFS demeurent donc les familles
du consensus ; aucune nouvelle source prévisionnelle n'est introduite.

## Historique Météo-France

`src/weather/meteoFranceClimate.ts` découvre automatiquement les fichiers
officiels depuis le catalogue public data.gouv.fr. Il sélectionne pour le
département 64 :

1. le fichier historique `1950–année close` de type `RR-T-Vent` ;
2. le fichier glissant couvrant les deux années courantes.

Les fichiers CSV compressés sont lus en flux, décompressés sans copie complète
en mémoire, filtrés sur la station `64024001`, puis normalisés au contrat N3.
Le fichier courant remplace les éventuels doublons de date du fichier
historique.

## Contrôles avant activation

Une archive n'est mise en cache que si elle respecte tous les contrôles :

- profondeur minimale de 20 000 journées ;
- couverture d'au moins 90 % pour Tmin, Tmax et pluie sur 1991–2020 ;
- observation la plus récente âgée de sept jours au maximum ;
- station, provenance et version de référence identifiables ;
- nombre de lignes relu identique au manifeste du cache.

Une archive valide est fraîche pendant 12 heures par défaut. Si le fournisseur
est momentanément indisponible, la dernière archive validée reste lisible avec
le statut `STALE`. Sans archive validée, le pipeline retourne `UNAVAILABLE` et
n'invente aucune comparaison.

## Cache et traçabilité

La migration `0019_weekly_data_unification.sql` ajoute :

- `forecast_snapshots` pour les captures multi-modèles ;
- `climate_daily_archive_chunks` pour l'historique découpé par année ;
- `climate_archive_state` pour le manifeste actif, les ressources, la
  couverture et la fraîcheur.

Le cache climatique conserve la capture active et une capture de repli. Les
ressources sources, dates de mise à jour, date d'acquisition, couverture et
empreinte de capture restent auditables.

## Raccordement opérationnel

- le cron hebdomadaire recharge l'archive avant de construire les signaux ;
- un réchauffement automatique du cache est tenté à 5 h locale les autres
  jours lorsque le moteur hebdomadaire est activé ;
- `/weekly-preview` déclenche aussi le chargement si le cache n'existe pas ;
- les contrôles et le rendu quotidien ne sont pas modifiés ;
- le graphisme et les règles éditoriales validées de la slide 1 ne sont pas
  modifiés.

## Paramètres optionnels

Les valeurs par défaut conviennent à la production. Trois variables permettent
uniquement une adaptation opérationnelle :

- `METEO_FRANCE_DAILY_DATASET_URL` : catalogue de ressources ;
- `METEO_FRANCE_CLIMATE_REFRESH_HOURS` : durée de fraîcheur (12 h par défaut) ;
- `METEO_FRANCE_CLIMATE_FETCH_TIMEOUT_MS` : délai réseau (60 s par défaut).

## Déploiement

Après import des fichiers, appliquer la migration distante avant le Worker :

```sh
npm run db:migrate:remote
npm run deploy
```

La première lecture peut être plus longue car elle importe la série complète.
Les lectures suivantes utilisent le cache D1 et ne retéléchargent l'archive que
lorsqu'elle est périmée.
