# LOKA — Détecteurs de signaux candidats N4

## Statut

Étape N4 terminée le 17 septembre 2026. Les détecteurs créent des candidats
prouvés ; ils ne les classent pas, ne les dédupliquent pas, ne rédigent pas le
texte public et ne les affectent pas définitivement aux slides.

## Familles couvertes

| Détecteur | Déclenchement | Preuve conservée |
|---|---|---|
| Historique depuis | dernière observation comparable atteignant la valeur prévue | date, valeur et nombre de jours |
| Record potentiel | prévision au-delà de l'extrême de l'archive fournie | extrême observé et date |
| Anomalie climatique | écart absolu d'au moins 3 °C à la moyenne datée | moyenne, écart et taille d'échantillon |
| Percentile extrême | prévision ≥ P95 ou ≤ P5 | percentile, seuil et taille d'échantillon |
| Pluie hebdomadaire rare | cumul de 7 jours ≥ P95 | P95 des cumuls glissants comparables |
| Première occurrence | seuil franchi et aucune occurrence antérieure dans la saison | seuil et historique des saisons |
| Phénomène important | franchissement d'un seuil pratique documenté | valeur, seuil et jour |
| Changement de régime | variation marquée entre deux jours consécutifs | valeurs avant/après et amplitude |
| Série remarquable | série projetée plus longue que la référence fournie | longueurs projetée et historique |
| Variation intrajournalière | amplitude ou baisse rapide dans une seule journée | heures, amplitude et seuil |

## Seuils candidats V1

Ces seuils servent à ouvrir une candidature. Ils ne garantissent pas une
publication : N5 appliquera importance, rareté, anomalie, intérêt et confiance.

- forte chaleur : Tmax ≥ 35 °C ;
- gel : Tmin ≤ 0 °C ;
- pluie journalière importante : ≥ 20 mm ;
- intensité horaire : ≥ 5 mm/h ;
- rafale forte : ≥ 70 km/h ;
- signal orageux : au moins 2 heures ;
- brouillard marqué : au moins 4 heures ;
- changement thermique journalier : ±7 °C ;
- arrivée de pluie : hausse ≥ 8 mm après une journée sous 1 mm ;
- renforcement des rafales : +25 km/h ;
- amplitude intrajournalière : ≥ 14 °C ;
- baisse en quatre heures au maximum : ≥ 7 °C.

## Invariants

1. Aucun candidat ne peut exister sans preuve conforme au contrat N1.
2. Une valeur historique conserve la même variable, unité et fenêtre que la
   prévision.
3. Les rafales historiques sont converties de m/s en km/h avant comparaison.
4. Une intensité horaire de pluie ne peut pas utiliser un seuil journalier.
5. Une variation intrajournalière commence et finit le même jour.
6. Une première occurrence est refusée si le seuil a déjà été franchi dans la
   saison courante.
7. Une valeur ordinaire, située entre P5 et P95 et proche de la moyenne, ne
   génère aucun candidat climatique.
8. Les rôles présents dans le contrat sont provisoires ; l'affectation finale
   aux slides appartient à N7.

## API interne

- `detectHistoricalExtreme`
- `detectClimateDeparture`
- `detectWeeklyRainfallDeparture`
- `detectSeasonalFirst`
- `detectImpactPhenomena`
- `detectRegimeChanges`
- `detectProjectedSeries`
- `detectIntradayChanges`
- `detectWeeklySignalCandidates`

## Étape suivante

N5 attribuera à chaque candidat les cinq notes internes — importance, rareté,
anomalie, intérêt éditorial et confiance — puis supprimera les doublons et les
signaux concurrents portant sur la même preuve.
