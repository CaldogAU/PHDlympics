# Architecture

## Current form

PHDlympics is a framework-free browser application. `index.html` loads modules
in dependency order and Firebase provides authentication, shared tournament
state, audit logs, and restore points.

Shared state includes a numeric `schemaVersion`. The storage boundary merges
missing defaults, validates collection shapes, and normalises legacy or unknown
GameMode IDs before the state reaches UI modules.

## Responsibility boundaries

### Core platform

- authentication and operator access
- Firebase and Firestore synchronization
- teams, games, and shared tournament state
- audit logs and restore points
- UI, reports, exports, and public displays
- shared championship position and point assignment

### GameMode layer

- tournament-specific result entry type
- round or event generation when supported
- completion rules
- ranking and tie fields
- result visibility
- game-specific metrics

### Tournament engines

Algorithm-heavy code should be pure and independent from the browser. The Swiss
pairing algorithm lives in `js/swiss-engine.js`; `js/rounds.js` adapts browser
state, IDs, timestamps, rendering, persistence, and audit behavior around it.

## Dependency direction

```text
UI / workflows
    -> PHDGameModes registry
        -> tournament engine

UI / workflows
    -> storage and audit adapters
        -> Firebase
```

Tournament engines must not call the DOM, Firebase, alerts, or shared mutable
state directly.

## Incremental migration

1. Protect current behavior with regression tests.
2. Route tournament actions through the GameMode registry.
3. Extract algorithms into pure engine modules.
4. Replace shared Swiss assumptions with structured GameMode results.
5. Add a second round-based mode to validate the abstraction.
6. Evolve Firestore from one shared document only after conflict and migration
   behavior is specified and tested.

The repository remains the implementation source of truth. The project bible is
the intended architecture; differences should be resolved deliberately rather
than through sweeping rewrites.
