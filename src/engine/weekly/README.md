# LOKA — Weekly Engine Boundary

This directory is the isolated boundary for « La semaine à Tarnos ».

## Status

The weekly engine is implemented through the editorial, carousel, storage and
scheduling layers but remains inactive in production by default. The worker
knows how to expose and schedule it, but every weekly path is gated by
`WEEKLY_ENABLED=true`.

## Boundary rules

- Daily V24 behavior remains outside this directory and is not changed here.
- Weekly code must be deterministic and must not call ChatGPT or another editorial service.
- Weekly code may consume existing weather, consensus, scene and editorial primitives when explicitly needed by a later step.
- Weekly code must not write daily publication tables or alter the daily public payload contract.
- Weekly code must remain disabled unless `WEEKLY_ENABLED=true` is explicitly configured.
- Runtime integration is deliberately gated in the worker and has no import-time side effects.

## Planned contents

The following responsibilities are either available for isolated development or
will be added in later numbered steps:

- seven-day input (`fetchWeeklyForecasts`) and daily profiles (`buildWeeklyProfiles`);
- a daylight profile reused from the existing V2 scene engine;
- full-day aggregates for temperature, precipitation, wind, thunder and fog;
- raw event detectors (`detectWeeklyEvents`) for the initial authorized categories;
- adaptive selection (`selectWeeklyEvents`) with episode merging, scoring,
  confidence and an explicit calm-week state;
- structured activity interpretation (`translateWeeklyActivities`) for beach,
  outdoor walking and outdoor sport;
- deterministic weekly editorial output (`buildWeeklyEditorial`) with a
  representative V24 scene for the overview and each selected event;
- adaptive carousel planning and rendering (`buildWeeklyCarouselPlan`,
  `renderWeeklyCarousel`) with a relay-only Story;
- D1 weekly publication snapshots and Monday morning scheduling, inactive until
  the explicit feature flag is enabled.

This file records the boundary; the feature flag and the final activation step
remain separate from the implementation.

The event detector only emits factual raw candidates. The selection layer may
merge neighboring days carrying the same event, rank retained candidates and
keep the best window, but it has no fixed maximum event count. Neither layer
generates copy or publishes anything. Activity interpretation also returns
statuses, windows, reason codes and numeric evidence only; editorial wording
belongs to a later step.
