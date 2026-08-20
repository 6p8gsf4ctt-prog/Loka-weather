# LOKA! — Story 2 Interaction

## Périmètre

Cette évolution ajoute une troisième sortie au Studio Instagram : **Story 2 · Interaction**.

- Le PNG 1080 × 1920 reprend le master de la scène météo officielle du jour.
- Seuls l’en-tête LOKA! / ville / date et le pied de page « Ici, aujourd’hui. » sont dessinés.
- Aucun sondage, aucune question et aucune réponse ne sont incrustés dans l’image : le sticker reste natif Instagram.
- Editorial Engine V2 génère chaque jour une interaction liée aux faits météo : `POLL` ou `QUESTION`.
- Pour `POLL`, deux réponses courtes sont également suggérées.
- Le Studio permet de modifier le format, la question et les réponses avant publication.
- Ces champs sont enregistrés dans la mémoire éditoriale existante avec les autres retouches Story.
- L’export d’apprentissage passe en schéma `1.2` et expose les différences d’interaction séparément.

## Compatibilité

Aucune migration D1 n’est requise. Les nouveaux champs sont stockés dans le JSON Story existant.
Les payloads officiels V2 créés avant cette évolution restent lisibles : la question est reconstruite de manière déterministe à partir de la date, de la scène et des faits météo.

## Validation

- `npm test` : PASS
- `npm run typecheck` : PASS
- 24 scènes éditoriales couvertes
- Story 2 vérifiée sans blocs météo centraux
- Compatibilité des anciens payloads vérifiée
