# LOKA — retour à la version éditoriale stable V2

Ce paquet annule les architectures graphiques V3, V5 et V6. Il restaure le rendu validé avec une seule grande box éditoriale sous la box titre, tel qu'il apparaît sur les deux images de référence fournies.

## Installation

1. Ouvrir le dépôt GitHub actuel.
2. Copier tous les fichiers de ce ZIP à la racine du dépôt.
3. Conserver exactement les dossiers `src/` et `tests/`.
4. Accepter le remplacement de tous les fichiers portant le même nom.
5. Valider les changements pour déclencher le déploiement Cloudflare habituel.

N'installez pas ensuite les ZIP V3, V5 ou V6 : ils réappliqueraient les structures abandonnées.

## Rendu restauré

- slide 1 strictement inchangée ;
- en-tête, box titre et footer communs au moteur de la slide 1 ;
- une seule grande box sous le titre pour les slides 2, 3 et 4 ;
- pictogramme, chiffre principal, sous-titre, comparaisons et phrase éditoriale réunis dans cette box ;
- hiérarchie et espacements correspondant aux visuels de référence ;
- suppression du découpage en trois boxes introduit ensuite.

## Sélection manuelle sécurisée

- toutes les candidates détectées restent affichées ;
- une, deux ou trois données peuvent être cochées ;
- chaque donnée cochée produit exactement une slide complémentaire ;
- l'ordre des choix est conservé ;
- plusieurs données de même thème ou de même type ne sont plus supprimées lors de la génération ;
- le lien du carrousel est renvoyé après génération, sans mot de passe.

## Vérifications réalisées

- TypeScript : validé ;
- suite hebdomadaire : validée ;
- slides complémentaires : `16/16 PASS` ;
- pipeline contextuel : `8/8 PASS` ;
- carrousel : `91/91 PASS` ;
- test explicite : trois données sélectionnées produisent la slide 1 plus trois slides complémentaires.

Aucune migration D1 et aucune nouvelle variable Cloudflare ne sont nécessaires.
