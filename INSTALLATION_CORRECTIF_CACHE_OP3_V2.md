# Correctif cache OP3 — V2

Cette mise à jour empêche le rejet injustifié du fichier climatique compact lorsque Météo-France actualise uniquement l’horodatage de sa ressource historique.

## Installation

1. Remplacer `src/weather/meteoFranceClimate.ts`.
2. Ajouter ou remplacer `public/climate/64024001-daily-1956-2024.json`.
3. Déployer le Worker depuis Cloudflare.
4. Revenir sur `/daily-insight-control` et lancer la reconstruction une seule fois.
5. Attendre l’état `READY` avant de tester l’OP3.

Aucune migration SQL n’est nécessaire. Le moteur Daily officiel et ses publications ne sont pas modifiés.
