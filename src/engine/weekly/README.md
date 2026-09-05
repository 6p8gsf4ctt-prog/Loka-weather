# LOKA — Weekly Engine Boundary

This directory is the isolated boundary for « La semaine à Tarnos ».

## Status

The weekly engine is scaffolded but inactive. Its seven-day retrieval function
exists for isolated tests, but no production route, cron handler or daily
pipeline imports this directory yet.

## Boundary rules

- Daily V24 behavior remains outside this directory and is not changed here.
- Weekly code must be deterministic and must not call ChatGPT or another editorial service.
- Weekly code may consume existing weather, consensus, scene and editorial primitives when explicitly needed by a later step.
- Weekly code must not write daily publication tables or alter the daily public payload contract.
- Weekly code must remain disabled unless `WEEKLY_ENABLED=true` is explicitly configured.
- Any future runtime integration must be added deliberately to the pipeline and routes, not through import-time side effects.

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
- event detection and ranking;
- activity interpretation;
- weekly editorial output;
- carousel rendering and Story relay;
- weekly persistence and Monday scheduling.

This file records the boundary; it does not activate any of these responsibilities.

The event detector only emits factual raw candidates. The selection layer may
merge neighboring days carrying the same event, rank retained candidates and
keep the best window, but it has no fixed maximum event count. Neither layer
generates copy or publishes anything. Activity interpretation also returns
statuses, windows, reason codes and numeric evidence only; editorial wording
belongs to a later step.
