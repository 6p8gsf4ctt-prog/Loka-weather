# Correction — isolation des STORIES journalières

Cette archive corrige la mise à jour hebdomadaire précédente.

- `src/ui/instagramOfficial24.ts`, `src/ui/feedFrame.ts` et
  `src/ui/lokaBrand.ts` restaurent le moteur journalier de référence.
- Les paramètres de la STORY et les styles de l’hebdomadaire sont isolés dans
  `src/ui/weeklyStoryFrame.ts` et `src/ui/weeklyPublicationStyle.ts`.
- `src/ui/storyFrame.ts`, ajouté par l’archive précédente, n’est plus utilisé
  et peut être supprimé après extraction.

Les scènes journalières ne lisent aucun fichier de configuration hebdomadaire.
