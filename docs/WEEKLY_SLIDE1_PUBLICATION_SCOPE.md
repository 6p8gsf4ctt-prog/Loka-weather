# LOKA - Périmètre de publication
# Première slide « La semaine à Tarnos »

Version : 1.6  
Date : 13 septembre 2026  
Statut : étape 1 validée - périmètre verrouillé  
Référence éditoriale : `LOKA_Cahier_des_charges_Rendez_vous_hebdomadaire(1).pdf`

## 1. Objectif de cette livraison

Permettre la publication, dès le dimanche soir, de la première slide du
rendez-vous « La semaine à Tarnos », ainsi que de son relais Story.

Le moteur génère une lecture stable et immédiatement utile de la semaine à
venir. Il ne cherche pas encore à produire les trois slides variables prévues
par le cahier des charges.

## 2. Période et moment de publication

| Élément | Décision verrouillée |
|---|---|
| Publication visée | Dimanche soir, heure locale de Tarnos |
| Période décrite | Lundi au dimanche qui suivent ce dimanche |
| Exemple | Le dimanche 13 septembre : « LUNDI 14 AU DIMANCHE 20 SEPTEMBRE » |
| Prévisualisation | Une date de lundi peut être choisie explicitement pour contrôler une semaine donnée |
| Fuseau de référence | `Europe/Paris` |

L'automatisation planifiée du dimanche soir n'est pas incluse dans cette
première livraison : la génération pourra être lancée manuellement depuis la
prévisualisation sécurisée.

## 3. Sorties à produire

| Fichier | Dimensions | Rôle |
|---|---:|---|
| `YYYY-MM-DD_weekly_01_essentiel.png` | 1080 x 1350 | Publication Instagram 4:5 |
| `YYYY-MM-DD_weekly_story_relais.png` | 1080 x 1920 | Relais Story 9:16 |

La Story est une adaptation verticale de la même information. Elle ne devient
ni un bulletin quotidien autonome ni une cinquième idée éditoriale.

## 4. Contenu obligatoire de la slide Publication

La structure graphique reprend les composants du moteur quotidien : logo,
ville, période, boxes translucides arrondies, typographies, pictogrammes LOKA,
fond atmosphérique et signature.

1. En-tête : logo LOKA!, `TARNOS` et période dynamique.
2. Box de titre : `LA SEMAINE À TARNOS`, trait doré et sous-titre
   `L'essentiel de la semaine`.
3. Trois repères fixes :
   - **Matin le plus frais** : jour, date et température ;
   - **Journée la plus chaude** : jour, date et température maximale ;
   - **Lumière de la semaine** : différence de durée du jour entre lundi et
     dimanche, avec lever/coucher lorsque l'espace le permet.
4. Une phrase de synthèse, factuelle, sur deux lignes maximum.
5. Bande des sept jours : libellé, date, pictogramme officiel LOKA, Tmin et
   Tmax pour chaque journée. Le matin le plus frais peut recevoir un liseré
   bleu discret ; la journée la plus chaude un liseré doré discret.
6. Footer permanent : `Ici, cette semaine.` et trait doré.

## 5. Conventions de données verrouillées

| Repère | Calcul |
|---|---|
| Matin le plus frais | Minimum de température entre 05:00 et 10:00, heure locale, pour chacun des sept jours ; puis minimum hebdomadaire. |
| Journée la plus chaude | Maximum de température prévu entre 00:00 et 23:59, heure locale, pour chacun des sept jours ; puis maximum hebdomadaire. |
| Durée du jour | Coucher - lever, calculé pour Tarnos ; résultat = durée du dimanche - durée du lundi. |
| Pictogrammes | Décision et bibliothèque officielles V24 déjà utilisées par le moteur quotidien. |
| Températures et météo | Consensus hebdomadaire existant issu des modèles LOKA ; aucun texte ou calcul externe. |

La durée du jour astronomique ne doit jamais être présentée comme un nombre
d'heures d'ensoleillement.

## 6. Règles visuelles verrouillées

- Le fond de vue d'ensemble `SEMAINE_CONTRASTEE` reste le support de cette
  première slide, dans l'univers abstrait LOKA.
- Les pictogrammes, polices, palette bleu marine / doré et boxes proviennent
  des composants existants du moteur journalier.
- Aucun ciel réaliste, élément décoratif nouveau, police nouvelle ou effet
  tape-à-l'oeil n'est ajouté.
- La lisibilité sur écran de téléphone est prioritaire : une information se
  lit sans zoom et sans faire défiler la Story.
- La géométrie, les tailles et la hiérarchie du rendu Publication sont
  verrouillées dans `docs/WEEKLY_SLIDE1_VISUAL_REFERENCE.md`.

## 7. Hors périmètre explicite

Cette livraison ne doit pas inclure :

- les slides 2, 3 et 4 du futur carrousel ;
- la sélection de signaux variables, leur score, leur cooldown ou leur mémoire
  éditoriale ;
- les cartes `Jour à privilégier` et `Jour à surveiller` ;
- un format spécial « semaine calme » ;
- l'automatisation planifiée du dimanche soir ;
- toute modification du pipeline quotidien, des 24 scènes, des seuils
  quotidiens, du contrat public quotidien ou des tables D1 quotidiennes.

## 8. Contrôles de validation avant publication

La première slide est publiable uniquement lorsque :

1. la période est exactement lundi-dimanche et correspond à la semaine
   prévisualisée ;
2. les trois repères fixes sont présents et calculés selon les conventions
   ci-dessus ;
3. les sept pictogrammes proviennent de la bibliothèque officielle LOKA ;
4. les deux images exportées respectent 1080 x 1350 et 1080 x 1920 ;
5. le moteur quotidien compile et ses tests ciblés restent inchangés ;
6. la prévisualisation n'écrit pas dans D1 et ne publie rien automatiquement.

## 9. Règle de suivi

Cette référence prévaut pour toute modification réalisée dans le cadre de la
première publication. Une seule étape du plan est active à la fois.

| Étape | Livrable | Statut |
|---:|---|---|
| 1 | Périmètre et critères de publication | VALIDÉE |
| 2 | Calculs des trois repères fixes | VALIDÉE |
| 3 | Contrat de contenu de la slide | VALIDÉE |
| 4 | Rendu Publication 4:5 | VALIDÉE |
| 5 | Rendu Story 9:16 | À FAIRE |
| 6 | Exports dans la prévisualisation | À FAIRE |
| 7 | Vérification sur données réelles | À FAIRE |
| 8 | Livraison prête à publier | À FAIRE |

Toute idée qui ne sert pas directement la publication de cette première slide
est reportée après l'étape 8.

## 10. Journal de validation

### 13 septembre 2026 - étape 2

Les trois repères fixes sont calculés dans le module isolé
`src/engine/weekly/fixedFacts.ts`. Il lit uniquement le consensus hebdomadaire
à sept jours et le calculateur astronomique déjà utilisé par LOKA.

Chaque température conserve son jour, son index, son heure source et sa valeur.
La lumière de la semaine conserve les levers, couchers et durées de lundi et
dimanche, puis calcule leur différence en minutes. Le module ne construit ni
texte, ni visuel, ni écriture D1 et n'importe pas le pipeline quotidien.

### 13 septembre 2026 - étape 3

Le contrat `slide1` est désormais joint à la sortie éditoriale hebdomadaire
et au plan de carrousel. Il fournit des libellés et formats prêts à afficher :
titre, sous-titre, synthèse bornée à deux lignes, matin le plus frais, journée
la plus chaude, lumière de la semaine et bande des sept jours.

Le contrat conserve la preuve brute de chaque repère, puis diffuse uniquement
des données calculées par le moteur : dates, heures sources, températures,
lever, coucher et différence de durée du jour. Le navigateur reçoit les
pictogrammes officiels liés aux décisions V24 ; il ne recalcule aucune météo.

### 13 septembre 2026 - étape 4

Le rendu Publication 1080 × 1350 affiche désormais les trois repères fixes
dans la box centrale : matin le plus frais, journée la plus chaude et lumière
de la semaine. Les pictogrammes météo sont ceux de la décision V24 du jour
concerné ; les pictogrammes de lever et coucher sont issus de la même
bibliothèque LOKA.

La première slide ne rend plus visuellement les anciennes cartes « Jour à
privilégier » et « Jour à surveiller ». La bande inférieure conserve les sept
jours et distingue uniquement le matin le plus frais (liseré bleu) et la
journée la plus chaude (liseré doré). Le rendu Story reste volontairement
hors de cette étape.

### 13 septembre 2026 - correction de l’étape 4

La composition est ajustée à partir de la maquette de référence, sans ajouter
de données ni de pictogrammes étrangers au moteur. Les trois repères occupent
désormais trois boxes plus aérées et n’affichent que le jour et la température
utile. Les heures sources restent conservées dans le contrat, mais ne sont pas
affichées.

La lumière de la semaine indique maintenant les deux évolutions astronomiques
complètes, du lundi au dimanche : lever et coucher. La synthèse est placée dans
sa propre box et le moteur la borne à une phrase complète ; le canvas refuse
de la couper au milieu. La bande des sept jours reçoit un fond plus lumineux
pour conserver sa lisibilité sur la partie sombre de la scène.

### 13 septembre 2026 - ajustement final de la hiérarchie visuelle

La box de titre gagne en respiration. Les trois repères sont resserrés pour
laisser davantage de place à la synthèse et à la bande hebdomadaire. Le matin
le plus frais s’appuie sur un thermomètre utilitaire LOKA, généré avec le même
trait, la même palette et la même ombre que les pictogrammes officiels ; la
journée la plus chaude conserve le pictogramme V24 de sa journée.

La lumière de la semaine n’utilise plus deux pictogrammes concurrents : un
seul symbole solaire LOKA accompagne les deux évolutions horaires. Enfin, la
box des sept jours est renforcée pour rester lisible sur le fond contrasté.
