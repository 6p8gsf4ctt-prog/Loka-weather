# LOKA — Étape 3 : validation et mise en production

## Statut

La validation technique est terminée le 18 septembre 2026. Le paquet est prêt
à être envoyé dans GitHub puis déployé par Cloudflare. La version actuellement
en ligne n'est pas encore ce paquet : son `/weekly-preview` retourne toujours
une erreur Cloudflare `1102` tant que le nouveau code n'est pas déployé.

## Scénarios contrôlés

Deux scénarios traversent le pipeline de production complet :

| Scénario | Résultat |
|---|---|
| Semaine calme | `PASS` — slide 1 seule |
| Chaleur forte et pluie marquée | `PASS` — slides 2 et 3, thèmes distincts |

Le test `weeklyProductionReadiness` force également un prévol invalide. Le
renderer reçoit alors uniquement la slide 1, sans ancien chiffre hebdomadaire
brut et sans exception utilisateur.

## Quatre semaines réelles rejouées

Les semaines du 17 août, 24 août, 31 août et 7 septembre 2026 ont été rejouées
avec les archives de prévisions Open-Meteo et le consensus LOKA complet :
AROME, ECMWF IFS, ECMWF AIFS, ICON-EU et GFS. L'historique Météo-France a été
tronqué à la veille de chaque semaine afin d'éviter toute utilisation
d'observations futures.

| Semaine | Modèles | Climat | Slides | Verdict |
|---|---:|---|---:|---|
| 17–23 août | 5/5 | `READY` | 3 | `PASS` |
| 24–30 août | 5/5 | `READY` | 2 | `PASS` |
| 31 août–6 septembre | 5/5 | `READY` | 2 | `PASS` |
| 7–13 septembre | 5/5 | `READY` | 2 | `PASS` |

Le premier passage a correctement bloqué une incohérence rédactionnelle : une
série à confiance élevée utilisait « pourrait » malgré le statut `EXPECTED`.
La modalité est désormais alignée sur le niveau de confiance et le rejeu passe.

## Seuils

Les seuils N2 sont conservés. Les quatre semaines produisent un nombre adaptatif
de slides, sans remplissage artificiel, avec déduplication et prévol complet.
Aucun assouplissement n'est justifié par le pilote.

## Vérification graphique

Le prévol valide pour chaque slide les dimensions `1080 × 1440`, le frame
`WEEKLY_SHARED_V1`, les titres, les pictogrammes, les longueurs de texte et le
fit canvas. Quatre aperçus HTML réels ont été générés dans
`artifacts/weekly-production/`.

La vérification visuelle de la surface Cloudflare doit être faite juste après
le déploiement, car l'URL publique sert encore l'ancien Worker. Ouvrir
`/weekly-preview`, contrôler les canvases affichés puis enregistrer chaque
photo. Ce contrôle final ne nécessite aucun terminal.

## Repli automatique

`weeklyPreviewRenderOptions` n'expose les slides complémentaires que si :

- l'activation hebdomadaire est valide ;
- le prévol est complet et sans erreur ;
- au moins un signal complémentaire a été retenu.

Dans tous les autres cas, `/weekly-preview` rend une seule slide : la slide 1
validée. Le header HTTP `x-loka-weekly-contextual` indique `approved`,
`no-signal` ou `slide1-fallback`.

## Vérifications finales

- TypeScript : validé ;
- tests hebdomadaires : 524/524 assertions validées ;
- pilote : 2 scénarios contrôlés et 4 semaines réelles, tous `PASS` ;
- consensus réel : 5/5 modèles sur les quatre semaines ;
- archive : 25 827 journées, de 1956 au 16 septembre 2026 ;
- build Cloudflare : dry-run validé, 33 assets, 675,11 KiB ;
- fichiers de la slide 1 : empreintes strictement inchangées ;
- suite quotidienne complète : arrêt connu et antérieur sur
  `EDITORIAL_DOCTRINE_STEP4_FAIL:scene13_showers_context`, hors périmètre semaine.

## Mise en ligne sans terminal

1. Remplacer dans GitHub uniquement les fichiers du ZIP de mise à jour N3.
2. Attendre le déploiement automatique Cloudflare.
3. Dans D1 `loka-weather`, vérifier la présence de `weekly_publications`,
   `forecast_snapshots`, `climate_daily_archive_chunks` et
   `climate_archive_state`.
4. Ouvrir `/api/health`, puis `/weekly-preview`.
5. Vérifier visuellement les slides et leur téléchargement.
6. Pour la publication stockée, commencer en mode shadow avant l'exposition
   progressive décrite dans `docs/WEEKLY_PROGRESSIVE_PUBLICATION.md`.

Aucune nouvelle migration n'est ajoutée par l'étape 3.
