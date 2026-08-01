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

`js/capacity.js` is the shared pure capacity engine. It validates capacity,
normalises per-game office entries, and allocates indivisible office console
groups into the minimum number of valid lobbies. It then optimises competitor
balance, office-count balance, Swiss rank proximity, and deterministic ordering.

## Game-centric operator workflow

Each configured game receives its own navigation page. Mode-specific management
is rendered on that page:

- Swiss games own their round sequence, pairings, scores, and completion state.
- Time Trial games own event creation, time entry, completion, and reopening.
- Grand Prix games own event creation, finishing-order entry, completion, and
  reopening.

There are no separate global Schedule or Events workspaces. Shared standings,
reports, and displays remain core-platform views.

## Game capacity and participation

Games store `capacity.maxPlayersPerConsole`, `capacity.maxPlayersPerLobby`, and
a `competitorEntries` map keyed by team ID. Each office has one console during a
simultaneous round, so its entry limit equals `maxPlayersPerConsole`. A separate
`maxEntriesPerOffice` field is deliberately not stored because it would duplicate
the same rule.

An office entry is an indivisible console group. Allocation never splits it,
never exceeds lobby capacity, uses the minimum feasible lobby count, and balances
actual competitors before office counts.

Schema version 3 adds these fields. Legacy games receive a conservative
1-per-console and 1-per-lobby fallback marked `configured: false`; they continue
using all teams until an administrator explicitly confirms participation. New
games require positive whole-number capacities and begin with zero entries.

Swiss lobbies are rebuilt for every round from the current ranking, so membership
is not permanent. Round Robin, Single Elimination, and Time Trial honour the
entry list without inventing leagues. Four Player Swiss expands each office's
indivisible console entry into labelled players inside complete four-player
lobbies, records placement per player, and aggregates Swiss points by office.
Grand Prix likewise records a finishing position for each labelled player,
requires positions to be unique only within that player's lobby, and ranks
offices by their combined lobby points. Fall Guys continues to display the
balanced lobby plan while retaining its existing overall-result workflow.

Every feature card on a game page is collapsible. The explanatory mode diagram
is deliberately the first card below the game header so operators can review the
format before configuring participation or entering results.

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
