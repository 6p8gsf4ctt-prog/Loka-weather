# LOKA — Weekly Engine Boundary

This directory is the isolated boundary for « La semaine à Tarnos ».

## Status

The weekly engine is scaffolded but inactive. No production route, cron handler or daily pipeline imports this directory yet.

## Boundary rules

- Daily V24 behavior remains outside this directory and is not changed here.
- Weekly code must be deterministic and must not call ChatGPT or another editorial service.
- Weekly code may consume existing weather, consensus, scene and editorial primitives when explicitly needed by a later step.
- Weekly code must not write daily publication tables or alter the daily public payload contract.
- Weekly code must remain disabled unless `WEEKLY_ENABLED=true` is explicitly configured.
- Any future runtime integration must be added deliberately to the pipeline and routes, not through import-time side effects.

## Planned contents

The following responsibilities will be added in later numbered steps:

- seven-day input and daily projections;
- event detection and ranking;
- activity interpretation;
- weekly editorial output;
- carousel rendering and Story relay;
- weekly persistence and Monday scheduling.

This file records the boundary; it does not activate any of these responsibilities.
