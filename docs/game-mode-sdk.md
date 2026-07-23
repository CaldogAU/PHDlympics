# GameMode SDK

PHDlympics separates tournament rules from platform infrastructure through the
`PHDGameModes` registry. UI and platform modules should call the registry rather
than invoking a tournament algorithm directly.

## Current SDK version

The current compatibility version is `1.0.0`.

Every mode declares:

- `id`: stable lowercase identifier stored with game data
- `displayName`: operator-facing name (`name` remains a compatibility alias)
- `version`: version of the mode implementation
- `compatibilityVersion`: PHDlympics GameMode SDK version the mode targets
- `description`: concise operator-facing explanation
- `icon`: stable icon identifier for UI surfaces

Registration rejects duplicate IDs and incompatible SDK versions. Unknown IDs
must not silently dispatch tournament actions. Legacy game records can be
normalised with `PHDGameModes.migrateGames()`.

The game-creation UI reads its available mode options from the registry, so a
registered plugin does not require another hard-coded `<option>`.

## Required result lifecycle

Every registered mode implements:

- `getResultEntryType(context)`
- `calculateRankings(context)`
- `calculateChampionshipPoints(rankings, context)`
- `areResultsComplete(context)`
- `shouldRevealResults(context)`

`PHDGameModes.buildResult(mode, context)` converts those hooks into a common
result object:

```text
{
  modeId,
  complete,
  revealResults,
  leaderboard,
  resultEntryType
}
```

The core assigns shared positions after the mode returns its ordered ranking
data. Each mode then calculates its own championship points. Built-in modes use
the shared `awardChampionshipPoints()` helper, but a plugin can provide different
rules without changing the core.

## Optional capabilities

Round-based modes may implement:

- `createNextRound(context)`

Call this through:

```text
PHDGameModes.createNextRound(modeId, context)
```

The registry reports a clear error when the selected mode does not support
round generation.

## Built-in modes

- `swiss`: round generation and match-score standings
- `time-trial`: completion-time entry; results remain hidden until complete
- `grand-prix`: administrator-entered finishing order; results remain hidden
  until complete

## Extension rules

1. Keep mode implementations independent from DOM rendering and Firebase.
2. Accept changing application data through `context`.
3. Return structured data; do not update shared application state from ranking
   hooks.
4. Use stable IDs in stored records.
5. Add regression tests for registration, completion, ranking, ties, and
   championship points.
6. Increment the mode version when behavior changes.
7. Change `compatibilityVersion` only when adopting a new SDK contract.
