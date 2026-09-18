# Sélection manuelle de la publication hebdomadaire

`/weekly-preview` conserve la génération automatique, mais expose désormais
toutes les candidates éditoriales produites par les détecteurs. Le classement
automatique est conservé comme aide à la décision, sans supprimer de candidate.
Chaque candidate possède un aperçu réel de la slide et reste sélectionnable.
Les alertes automatiques (score faible, événement concurrent, confiance faible)
restent visibles mais ne constituent plus un filtre éditorial.

## Publication

1. Ouvrir `/weekly-preview`.
2. Cocher jusqu’à trois candidates fiables pour les slides 2, 3 et 4.
3. Laisser toutes les cases décochées pour publier uniquement la slide 1.
4. Saisir le `ADMIN_TOKEN` et cliquer sur « Enregistrer cette sélection ».

La route protégée régénère la semaine, vérifie que les identifiants choisis
font partie du classement complet, reconstruit les slides, puis rejoue le
prévol technique avant d’écrire `weekly_publications`. La slide 1 n’est jamais
réécrite.

La publication manuelle utilise la source `manual_weekly_selection` et devient
la publication officielle de la période sélectionnée.
