# Correctif Story — route publique `/weekly`

## Cause

La route publique `/weekly` appelait `renderWeeklyCarousel` avec `includeStory: false`. Le moteur conservait bien le rendu Story, mais le HTML public supprimait entièrement la section Story avant l’envoi au navigateur.

## Correction

La route appelle maintenant `renderWeeklyCarousel(surface.editorial, surface.renderOptions)` sans forcer `includeStory: false`. Les surfaces administratives qui doivent rester sans Story conservent leurs options dédiées.

## Validation

- `WEEKLY_CAROUSEL 92/92 PASS`
- `WEEKLY_RELEASE_CANDIDATE 33/33 PASS`
- Le test vérifie la présence de `id="story-relay"` et du bouton `Télécharger le relais Story`.

Le déploiement Cloudflare nécessite une authentification Wrangler (`wrangler login`) dans l’environnement de publication.
