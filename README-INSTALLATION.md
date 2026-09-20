# LOKA — scènes éditoriales 2 et 3 · maquette v1

Ce ZIP est une mise à jour différentielle à installer après le retour stable V2.
Il contient uniquement les deux fichiers à remplacer.

## Installation dans GitHub

1. Décompresser le ZIP.
2. Importer son contenu à la racine du dépôt.
3. Conserver l’arborescence `src/` et `tests/`.
4. Accepter le remplacement des deux fichiers existants.
5. Valider les changements pour déclencher le déploiement Cloudflare habituel.

Aucune commande de terminal, migration D1 ou variable Cloudflare supplémentaire n’est nécessaire.

## Modification graphique

- slide 1 strictement inchangée ;
- en-tête, fond, box titre, grande box, marges, ligne inférieure et footer inchangés ;
- conservation du moteur graphique commun et du rendu stable V2 ;
- phrase éditoriale maintenue à l’intérieur de la grande box ;
- ajout d’un repère éditorial interne : disque translucide, pictogramme doré et séparateur vertical court ;
- aucun quatrième bloc et aucune box supplémentaire ;
- composition appliquée à toutes les slides complémentaires pour garantir la continuité des scènes 2, 3 et 4 ;
- moteur de détection, classement et sélection manuelle inchangé.

## Vérifications

- TypeScript : validé ;
- suite hebdomadaire complète : validée ;
- `WEEKLY_CAROUSEL` : 92/92 ;
- contrôle ajouté pour interdire la création d’une box éditoriale séparée.
