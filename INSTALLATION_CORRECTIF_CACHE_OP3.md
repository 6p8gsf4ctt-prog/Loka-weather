# Correctif d’initialisation du cache OP3

Ce correctif concerne uniquement la commande administrateur de reconstruction du référentiel Daily Insight.

## Installation

1. Remplacer `src/index.ts`.
2. Remplacer `src/ui/dailyInsightControl.ts`.
3. Déployer le Worker depuis Cloudflare.
4. Ouvrir `/daily-insight-control`.
5. Saisir le mot de passe administrateur et lancer la reconstruction une seule fois.
6. Attendre que la page affiche `READY` avant d’ouvrir `/daily-insight-lab-preview?city=tarnos`.

Aucune migration SQL n’est nécessaire. Le moteur Daily officiel, les publications et les crons ne sont pas modifiés.
