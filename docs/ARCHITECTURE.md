# LOKA Cloud v0.1 — architecture

```text
Cloudflare Cron (05:45 Europe/Paris)
            ↓
      Worker TypeScript
            ↓
  5 appels indépendants
    ├─ AROME France
    ├─ ECMWF IFS
    ├─ ECMWF AIFS
    ├─ DWD ICON-EU
    └─ NOAA GFS
            ↓
    Consensus pondéré
            ↓
   LOKA Decision Engine
     ├─ verdict principal
     ├─ journée sèche/pluie
     ├─ 7/9/12/15/18/21h
     └─ événement notable
            ↓
       Cloudflare D1
            ↓
   /tarnos — mobile web
            ↓
  future image / Instagram
```

## V0.1 volontairement limitée

- Les cinq modèles déterministes sont présents.
- La probabilité pluie V0.1 est un **support inter-modèles pondéré**, pas encore une vraie distribution d'ensemble.
- La V0.2 branchera les ensembles ECMWF/AIFS, ICON-EPS, GEFS et, selon l'accès retenu, PEAROME.
- Radar et observations Météo-France arrivent ensuite pour le nowcasting.
- Aucun conseil comportemental n'est généré : le moteur décrit clairement la situation et laisse l'utilisateur décider.

## Nettoyage final de l’interface historique

`src/ui/dashboard24.ts` a été retiré après migration de ses deux derniers contrôles vers `src/ui/instagramOfficial24.ts`.

Le Studio LOKA est désormais l’interface publique de référence. Les migrations D1 et les masters V24 restent intégralement conservés.
