# LOKA — Cadre de référence
# « La semaine à Tarnos »

Version de référence : 1.0  
Date : 5 septembre 2026  
Statut : validé pour le développement

## 1. Objectif

Créer un format hebdomadaire automatisé qui transforme les prévisions météo en informations utiles pour la vie quotidienne à Tarnos.

Le moteur doit détecter les événements météo réellement importants de la semaine, les hiérarchiser et expliquer concrètement ce qu’ils signifient localement.

LOKA ne doit pas devenir une application météo supplémentaire. Sa valeur est d’interpréter les données météo pour Tarnos et de les mettre en scène dans son univers visuel.

## 2. Décisions validées

| Élément | Décision |
|---|---|
| Période | Du lundi au dimanche inclus |
| Génération | Le lundi matin, en heure locale de Tarnos |
| Format principal | Carrousel Instagram |
| Première slide | Vue d’ensemble de la semaine |
| Slides suivantes | Une slide par événement retenu |
| Nombre d’événements | Adaptatif, déterminé par le moteur |
| Relais | Une Story renvoie vers le carrousel |
| Story autonome | Exclue |
| Semaine sans événement | Publication courte maintenue |
| Événements initiaux | Chaleur, fraîcheur/froid, pluie, vent, amélioration, dégradation, meilleure fenêtre météo |
| Orage | Autorisé uniquement si le signal est suffisamment fiable |
| Activités initiales | Plage, promenade/sortie extérieure, sport extérieur |
| Analyse éditoriale | Entièrement intégrée au moteur |
| LLM ou ChatGPT | Non nécessaire et non utilisé pour produire le contenu |
| Périmètre géographique | Tarnos uniquement pour cette évolution |

## 3. Règle éditoriale centrale

Le moteur détecte d’abord les événements météo importants. Il traduit ensuite certains événements en conséquences concrètes ou en fenêtres favorables pour une activité.

```text
Données météo
→ événements candidats
→ hiérarchisation
→ sélection adaptative
→ traduction pratique éventuelle
→ texte et scène visuelle LOKA
```

Une semaine banale ne doit pas être artificiellement remplie. L’absence de changement majeur est une information valable.

## 4. Format de sortie attendu

Lorsque des événements sont retenus :

- slide 1 : synthèse de la semaine ;
- une slide pour chaque événement retenu ;
- ordre des slides déterminé par la pertinence des événements.

Lorsque aucun événement ne dépasse son seuil :

- conserver le rendez-vous hebdomadaire ;
- afficher une synthèse courte du type « Une semaine calme à Tarnos » ;
- ne pas inventer d’événement pour augmenter le nombre de slides.

## 5. Identité LOKA à préserver

Les événements doivent réutiliser les 24 scènes météo existantes, leurs fonds, leurs pictogrammes et leur logique visuelle.

Le format ne doit pas devenir un tableau météo ou un bulletin jour par jour. La scène ou l’image doit contribuer à faire comprendre la nature de l’événement mis en avant.

## 6. État technique de référence

Le moteur quotidien actuel est considéré comme une surface stable à préserver. Il repose notamment sur :

- Cloudflare Worker et Cloudflare D1 ;
- cinq modèles météo pondérés ;
- un consensus horaire ;
- un profil météo journalier ;
- une classification parmi 24 scènes ;
- une génération éditoriale déterministe ;
- une publication officielle quotidienne vérifiée.

Le moteur quotidien récupère actuellement un horizon de deux jours. L’extension à sept jours devra être isolée du chemin quotidien existant.

## 7. Invariants techniques

Les règles suivantes sont non négociables pendant cette évolution :

1. La génération quotidienne doit continuer à fonctionner sans modification de comportement.
2. Le contrat `OfficialPublicPayloadV24` quotidien ne doit pas être cassé.
3. Les 24 scènes existantes ne doivent pas être redéfinies dans ce chantier sans nécessité démontrée.
4. Une erreur du moteur hebdomadaire ne doit jamais bloquer la génération quotidienne.
5. Les données et publications hebdomadaires doivent être stockées séparément des données quotidiennes.
6. La fonctionnalité hebdomadaire doit pouvoir rester désactivée par un interrupteur de configuration.
7. Aucun événement retenu ne doit être dépourvu de données justificatives.
8. Aucun contenu ne doit être généré par une analyse ponctuelle de ChatGPT.
9. Aucun nouveau format social ou aucune nouvelle catégorie météo ne doit être ajouté sans validation explicite.
10. Aucun déploiement public du format hebdomadaire ne doit intervenir avant sa validation complète.

## 8. Critères de réussite

L’évolution sera considérée comme réussie lorsque le moteur pourra :

- analyser automatiquement une semaine complète du lundi au dimanche ;
- produire zéro, un ou plusieurs événements selon les données ;
- ne rien forcer lorsque la semaine est stable ;
- hiérarchiser les événements avec un score et une confiance ;
- rattacher chaque événement à une scène LOKA cohérente ;
- traduire certains événements en informations liées à la plage, aux sorties ou au sport extérieur ;
- générer le carrousel et son relais Story ;
- fonctionner le lundi matin de manière autonome ;
- préserver intégralement la production quotidienne existante.

## 9. Règle de non-déviation

Si une idée, une difficulté technique ou une amélioration potentielle ne sert pas directement cet objectif, elle est placée hors périmètre et n’est pas ajoutée au chantier.

Tout écart nécessaire devra être inscrit dans le carnet de progression et validé avant d’être intégré.
