# LOKA — Daily Insight Preview isolé

**Étape :** 3/5  
**Version :** 1.0.0  
**Route :** `/daily-insight-preview?city=tarnos`  
**Statut :** audit uniquement, aucune publication

## Fonctionnement

La preview lit uniquement la référence compacte préparée par l’étape 2 et la
prévision Daily officielle déjà enregistrée. Elle ne reconstruit jamais l’archive
climatique pendant une requête utilisateur.

Le moteur :

1. vérifie l’âge et l’intégrité de la référence locale ;
2. exécute les détecteurs dont toutes les preuves sont disponibles ;
3. calcule les six dimensions du score sur 100 ;
4. applique les pénalités et la porte de confiance ;
5. classe tous les candidats ;
6. sélectionne au maximum un gagnant à partir de 70 ;
7. retourne `NO_DAILY_INSIGHT` si aucun fait n’est assez fort.

## Audit visible

La page présente :

- le gagnant éventuel ;
- la valeur et les deux lignes éditoriales proposées ;
- les preuves locales utilisées ;
- les six composantes du score ;
- les pénalités ;
- les candidats rejetés et leur motif ;
- les détecteurs différés faute de preuve suffisante.

Les détecteurs différés ne sont pas simulés. Ils seront activés seulement après
raccordement de leurs données : amplitude climatique, nuit complète, lendemain
matin, rafales horaires ou calendrier astronomique officiel.

## Isolation

- aucune modification de la page `/` ;
- aucune modification de `/daily-graphic-preview` ;
- aucune STORY ou PUBLICATION supplémentaire ;
- aucune écriture dans la publication officielle ;
- aucune activation automatique ;
- aucun calcul climatique lourd dans la route de preview.

L’étape 4 pourra maintenant travailler le graphisme de la slide comparative à
partir du gagnant préparé par ce moteur, tout en conservant cette page d’audit.

