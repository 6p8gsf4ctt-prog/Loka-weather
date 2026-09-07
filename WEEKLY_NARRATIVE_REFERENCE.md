# LOKA — Référence de l’évolution narrative
# « La semaine à Tarnos »

Version de référence : 1.0  
Date : 6 septembre 2026  
Statut : étape 7 terminée — conclusion générale implémentée, étape 8 suivante

## 1. Objet du document

Ce document est la référence de pilotage de l’évolution éditoriale de « La
semaine à Tarnos ». Il complète la référence technique hebdomadaire existante
et remplace, pour ce nouveau chantier, toute règle antérieure incompatible avec
les décisions ci-dessous.

Son rôle est double : définir le résultat attendu et empêcher que le
développement dérive vers une application météo classique, un bulletin
quotidien ou un nouveau projet graphique.

## 2. Objectif verrouillé

Le moteur doit transformer les prévisions des sept jours en une histoire météo
courte, utile et lisible pour les habitants de Tarnos.

Il doit répondre simplement à quatre questions :

- À quoi ressemble globalement la semaine ?
- Qu’est-ce qui change réellement ?
- Quelles conséquences concrètes faut-il anticiper ?
- Quand les conditions sont-elles les plus favorables ?

Le contenu doit être produit entièrement par le moteur, de manière déterministe,
sans ChatGPT, LLM ou analyse éditoriale externe.

## 3. Décisions fonctionnelles

| Élément | Décision verrouillée |
|---|---|
| Période analysée | Du lundi au dimanche inclus |
| Génération de production | Lundi matin, en heure locale de Tarnos |
| Format principal | Carrousel Instagram |
| Première slide | Conclusion générale de la semaine |
| Slides suivantes | Événements retenus dans un ordre narratif et chronologique |
| Nombre publié | Trois événements principaux maximum |
| Exception | Un quatrième événement uniquement s’il est indépendant, très important et fiable |
| Meilleure fenêtre | Compte dans la limite des événements et termine le carrousel si elle est réellement identifiable |
| Fenêtre absente | Aucune slide artificielle ne doit être créée |
| Semaine calme | Publication courte maintenue, sans événement inventé |
| Story | Relais de la publication, jamais un bulletin autonome |
| Activités | Plage, promenade/sortie extérieure et sport extérieur |
| Analyse | Entièrement intégrée au moteur |
| Zone | Tarnos uniquement pour cette évolution |

La règle précédente qui autorisait un nombre illimité d’événements publiés est
abandonnée pour cette évolution. Les détecteurs peuvent continuer à produire
autant de signaux bruts que nécessaire, mais seule la couche éditoriale décide
de ce qui mérite une slide.

## 4. Histoire attendue

Le carrousel doit suivre cette logique :

```text
contexte de la semaine
→ rupture ou évolution importante
→ conséquence concrète
→ meilleure fenêtre éventuelle
```

La première slide ne doit plus se limiter à annoncer le nombre d’événements.
Elle doit formuler la conclusion générale, par exemple : « Une semaine
perturbée au départ, nettement plus agréable ensuite. »

Les événements redondants ou complémentaires doivent être fusionnés lorsqu’ils
racontent la même évolution. Trois améliorations successives ne doivent pas
produire trois slides distinctes.

## 5. Règle visuelle LOKA

Le langage graphique existant est conservé :

- logo LOKA! officiel ;
- slogan et signature ;
- box translucides ;
- palette bleu marine et or ;
- pictogrammes redessinés ;
- fonds maîtres des 24 scènes ;
- méthode de décision V24 du moteur quotidien.

Chaque scène hebdomadaire doit provenir de la décision quotidienne réelle du
jour représentatif retenu. Un événement ne doit pas forcer artificiellement une
scène différente de celle que le moteur quotidien aurait choisie.

La scène doit cependant renforcer la lecture de l’histoire : lumière ouverte
pour une amélioration ou une bonne fenêtre, ambiance plus fermée pour une
dégradation, et atmosphère cohérente avec le vent ou la pluie lorsque la scène
V24 quotidienne le permet.

## 6. Invariants techniques

1. Le moteur quotidien doit conserver son comportement et son contrat public.
2. Une erreur de la chaîne narrative hebdomadaire ne doit jamais bloquer le quotidien.
3. Les détecteurs bruts restent séparés de la consolidation éditoriale.
4. La consolidation, le classement et les textes restent déterministes.
5. Aucun appel à ChatGPT, LLM ou service éditorial externe n’est autorisé.
6. La limite de trois événements, avec exception contrôlée à quatre, doit être vérifiable par test.
7. Les événements fusionnés doivent conserver leurs preuves météo et leurs dates.
8. Le carrousel calme ne doit contenir qu’une synthèse courte.
9. La Story doit rester un relais du carrousel.
10. `WEEKLY_ENABLED` reste désactivé jusqu’à la validation visuelle et technique complète.
11. Toute modification de code livrée doit être fournie dans un ZIP contenant uniquement les fichiers à remplacer.

## 7. Plan strict en 12 étapes

| Étape | Livrable unique | Statut |
|---:|---|---|
| 1 | Cadre de référence et règles de suivi | TERMINÉE |
| 2 | Audit technique des chaînes existantes | TERMINÉE |
| 3 | Contrat de données des histoires météo | TERMINÉE |
| 4 | Consolidation des événements redondants | TERMINÉE |
| 5 | Hiérarchisation et plafond de publication | TERMINÉE |
| 6 | Construction de l’ordre narratif | TERMINÉE |
| 7 | Génération de la conclusion générale | TERMINÉE |
| 8 | Intégration des conséquences pratiques | À FAIRE |
| 9 | Liaison entre histoires et scènes V24 | À FAIRE |
| 10 | Refonte du carrousel et du relais Story | À FAIRE |
| 11 | Tests de non-régression et prévisualisation | À FAIRE |
| 12 | Déploiement contrôlé et activation progressive | À FAIRE |

## 8. Règle anti-déviation

Une seule étape est active à la fois. Une étape n’est terminée que lorsque son
livrable unique et son critère de validation sont vérifiés.

À chaque étape, le suivi doit indiquer explicitement : l’objectif traité, les
fichiers modifiés, les tests exécutés, les écarts rencontrés et la décision de
passage à l’étape suivante.

Toute idée qui ne concerne pas directement la narration météo de Tarnos, la
préservation du quotidien ou l’identité LOKA est placée hors périmètre. Elle ne
peut être intégrée qu’après une décision explicite et une mise à jour de cette
référence.

Chaque ZIP doit contenir uniquement les fichiers nécessaires à l’étape active.
Les anciennes archives ne doivent jamais être mélangées à une nouvelle
livraison.

## 9. Critère de validation de l’étape 1

L’étape 1 est validée lorsque :

- l’objectif du chantier est formulé en une phrase claire ;
- la limite de trois événements et l’exception à quatre sont actées ;
- la meilleure fenêtre est comptée dans cette limite ;
- le rôle de conclusion de la première slide est acté ;
- la réutilisation de la méthode V24 quotidienne est non négociable ;
- les invariants de protection du moteur quotidien sont écrits ;
- le plan comporte exactement 12 étapes ;
- le mécanisme anti-déviation est inscrit dans le document maître ;
- aucun code de production n’a été modifié à cette étape.

## 10. Journal de décision initial

### 6 septembre 2026

Le chantier est recentré sur la consolidation éditoriale et la narration. La
détection brute n’est pas supprimée : elle devient une matière interne que le
moteur doit trier, fusionner et ordonner avant publication.

La priorité est désormais la lisibilité de l’histoire publiée, et non la
restitution exhaustive de tous les signaux détectés.

### 6 septembre 2026 — étape 2

L’audit technique confirme que le moteur quotidien et la chaîne hebdomadaire
sont suffisamment séparés pour permettre une évolution progressive. La méthode
de décision des scènes V24 est déjà réutilisée dans les profils hebdomadaires.

L’écart principal est éditorial et contractuel : la sélection actuelle fusionne
certains jours consécutifs, classe les événements par score puis les publie tous,
sans plafond, sans ordre narratif et sans conclusion générale. La prochaine
évolution doit donc agir entre la détection brute et le rendu, sans modifier le
chemin quotidien.

Le détail, les preuves et les points de raccord sont consignés dans
`docs/WEEKLY_NARRATIVE_TECHNICAL_AUDIT.md`. L’étape active suivante est l’étape
3 : contrat de données des histoires météo.

### 6 septembre 2026 — étape 3

Le contrat de données des histoires météo est défini dans
`docs/WEEKLY_NARRATIVE_DATA_CONTRACT.md`. Il sépare désormais explicitement les
candidats bruts, les épisodes consolidés, les histoires sélectionnées et le
plan narratif publié. Il impose la conservation des preuves, des candidats
fusionnés, du score, de la confiance, de la scène V24 source et des conséquences
pratiques.

Le contrat fixe également la limite de trois histoires publiées, l’exception
contrôlée à quatre, la semaine calme sans histoire artificielle et le fait que
la meilleure fenêtre compte dans cette limite. Aucun code de production ni
schéma D1 n’est modifié à cette étape ; l’étape 4 pourra maintenant implémenter
la consolidation sur une base stable.

### 6 septembre 2026 — étape 4

La consolidation est implémentée dans `src/engine/weekly/consolidation.ts` et
appelée par la sélection hebdomadaire. Les candidats consécutifs d’un même type
sont regroupés en un épisode unique. Les tendances directionnelles peuvent
également absorber une journée intermédiaire sans signal opposé. Les épisodes
séparés, les fenêtres distinctes et les évolutions contradictoires restent
séparés.

Chaque épisode conserve les identifiants et types des candidats sources, les
preuves agrégées, les dates couvertes et un jour représentatif. Le plafond de
publication, le classement éditorial et l’ordre narratif restent volontairement
réservés aux étapes 5 et 6.

L’étape active suivante est l’étape 5 : hiérarchisation et plafond de publication.

### 6 septembre 2026 — étape 5

La sélection hebdomadaire applique désormais une hiérarchie éditoriale et un
plafond de publication. Trois histoires sont retenues au maximum ; une
quatrième n’est admise que si elle est indépendante, très importante et à
confiance haute. La meilleure fenêtre compte comme une histoire ordinaire.

Les épisodes non publiés sont conservés dans un audit avec leur score et une
raison de rejet. Le classement par importance reste distinct de l’ordre
narratif, qui sera traité à l’étape 6. La sélection conserve donc son ordre de
score actuel jusqu’à cette prochaine étape.

L’étape active suivante est l’étape 6 : construction de l’ordre narratif.

### 6 septembre 2026 — étape 6

L’ordre de publication est maintenant séparé du classement par importance. Les
histoires retenues sont ordonnées chronologiquement, avec la meilleure fenêtre
placée en dernière position lorsqu’elle existe afin de terminer le carrousel
par une réponse pratique.

La sélection conserve son ordre par score pour l’audit ; seul le passage vers
l’éditorial applique l’ordre de lecture Instagram. La liste fournie au
réordonnancement n’est pas mutée et une semaine calme conserve une seule slide.

L’étape active suivante est l’étape 7 : génération de la conclusion générale.

### 6 septembre 2026 — étape 7

La première slide ne résume plus la sélection par un compteur. Le moteur
génère désormais une conclusion déterministe selon la forme de la semaine :
semaine calme, événement dominant, semaine contrastée, amélioration,
dégradation ou retournement entre dégradation et amélioration. La meilleure
fenêtre peut compléter cette conclusion sans créer de temps fort artificiel.

L’éditorial conserve le titre LOKA attendu et réutilise les événements déjà
ordonnés à l’étape 6. Aucun changement n’est apporté au moteur quotidien, aux
24 scènes V24 ou aux contrats D1.

L’étape active suivante est l’étape 8 : traduction des événements en
conséquences pratiques.
