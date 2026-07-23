const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadMergeTournamentState() {
  const stateSource = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "state.js"
    ),
    "utf8"
  );
  const gameModesSource =
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "game-modes.js"
      ),
      "utf8"
    );
  const storageSource =
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "storage.js"
      ),
      "utf8"
    );
  const context = {
    structuredClone,
    window: {}
  };

  vm.runInNewContext(
    stateSource,
    context
  );
  context.PHDTournament =
    vm.runInNewContext(
      "PHDTournament",
      context
    );
  vm.runInNewContext(
    gameModesSource,
    context
  );
  vm.runInNewContext(
    storageSource,
    context
  );

  return {
    defaultState:
      context.PHDTournament
        .defaultState,
    mergeTournamentState:
      context.mergeTournamentState
  };
}

test("normalises legacy cloud state at the storage boundary", () => {
  const {
    defaultState,
    mergeTournamentState
  } = loadMergeTournamentState();
  const merged =
    mergeTournamentState({
      version: "0.9.0",
      games: [
        {
          id: "legacy-game",
          name: "Legacy"
        },
        {
          id: "unknown-game",
          name: "Unknown",
          mode: "unsupported"
        }
      ],
      rounds: "invalid",
      events: "invalid",
      tournament: {
        name: "Imported",
        settings: {
          winPoints: 5
        }
      }
    });

  assert.equal(
    merged.schemaVersion,
    defaultState.schemaVersion
  );
  assert.deepEqual(
    Array.from(
      merged.games,
      game => game.mode
    ),
    [
      "swiss",
      "swiss"
    ]
  );
  assert.deepEqual(
    Array.from(merged.rounds),
    []
  );
  assert.deepEqual(
    Array.from(merged.events),
    []
  );
  assert.equal(
    merged.tournament.name,
    "Imported"
  );
  assert.equal(
    merged.tournament.settings
      .winPoints,
    5
  );
  assert.equal(
    merged.tournament.settings
      .drawPoints,
    defaultState.tournament
      .settings.drawPoints
  );
});
