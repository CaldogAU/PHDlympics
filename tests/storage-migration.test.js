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
  const capacitySource =
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "capacity.js"
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
  const exportSource =
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "export.js"
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
    capacitySource,
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
  vm.runInNewContext(
    exportSource,
    context
  );

  return {
    defaultState:
      context.PHDTournament
        .defaultState,
    mergeTournamentState:
      context.mergeTournamentState,
    normaliseImportedState:
      context.normaliseImportedState,
    createTournamentProgressResetState:
      context.createTournamentProgressResetState
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
  assert.equal(
    merged.games[0].capacity
      .configured,
    false
  );
  assert.equal(
    merged.games[0].capacity
      .maxPlayersPerConsole,
    1
  );
});

test("migrates every legacy team into an independent office", () => {
  const { mergeTournamentState } = loadMergeTournamentState();
  const merged = mergeTournamentState({
    teams: [
      { id: "sg-a", name: "Singapore A", shortName: "SGA" },
      { id: "sg-b", name: "Singapore B", shortName: "SGB" }
    ],
    games: [],
    rounds: [],
    events: []
  });

  assert.deepEqual(
    Array.from(merged.teams, team => team.officeId),
    ["legacy-office-sg-a", "legacy-office-sg-b"]
  );
  assert.deepEqual(
    Array.from(merged.offices, office => [office.id, office.name]),
    [
      ["legacy-office-sg-a", "Singapore A"],
      ["legacy-office-sg-b", "Singapore B"]
    ]
  );
});

test("creates independent collections when resetting to defaults", () => {
  const {
    defaultState,
    mergeTournamentState
  } = loadMergeTournamentState();
  const resetState =
    mergeTournamentState(
      defaultState
    );

  resetState.teams.push({
    id: "new-team",
    name: "New Team"
  });
  resetState.games.push({
    id: "new-game",
    name: "New Game"
  });

  assert.equal(
    defaultState.teams.length,
    0
  );
  assert.equal(
    defaultState.games.length,
    0
  );
  assert.notStrictEqual(
    resetState.teams,
    defaultState.teams
  );
  assert.notStrictEqual(
    resetState.games,
    defaultState.games
  );
});

test("preserves game capacity and competitor entries through state normalisation", () => {
  const { mergeTournamentState } =
    loadMergeTournamentState();
  const merged = mergeTournamentState({
    teams: [
      { id: "alpha", name: "Alpha" },
      { id: "bravo", name: "Bravo" }
    ],
    games: [
      {
        id: "kart",
        name: "Mario Kart",
        mode: "grand-prix",
        capacity: {
          maxPlayersPerConsole: 2,
          maxPlayersPerLobby: 12,
          configured: true
        },
        competitorEntries: {
          alpha: 2,
          bravo: 1
        }
      }
    ],
    rounds: [],
    events: []
  });

  assert.deepEqual(
    JSON.parse(JSON.stringify(merged.games[0].capacity)),
    {
      maxPlayersPerConsole: 2,
      maxPlayersPerLobby: 12,
      configured: true
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(merged.games[0].competitorEntries)),
    { alpha: 2, bravo: 1 }
  );
});

test("preserves capacity and entries through a JSON export and import round trip", () => {
  const { normaliseImportedState } =
    loadMergeTournamentState();
  const exported = JSON.stringify({
    app: "PHDlympics",
    data: {
      teams: [
        { id: "alpha", name: "Alpha" }
      ],
      games: [
        {
          id: "kart",
          name: "Mario Kart",
          mode: "grand-prix",
          capacity: {
            maxPlayersPerConsole: 2,
            maxPlayersPerLobby: 12,
            configured: true
          },
          competitorEntries: {
            alpha: 2
          }
        }
      ],
      rounds: [],
      events: []
    }
  });
  const imported =
    normaliseImportedState(
      JSON.parse(exported)
    );

  assert.deepEqual(
    JSON.parse(JSON.stringify(imported.games[0].capacity)),
    {
      maxPlayersPerConsole: 2,
      maxPlayersPerLobby: 12,
      configured: true
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(imported.games[0].competitorEntries)),
    { alpha: 2 }
  );
});

test("tournament progress reset preserves teams and game configuration while clearing results", () => {
  const {
    createTournamentProgressResetState
  } = loadMergeTournamentState();
  const source = {
    tournament: {
      name: "Office Cup",
      bannerUrl: "banner.jpg"
    },
    access: {
      assignments: {
        "staff@example.com": {
          teamId: "alpha"
        }
      }
    },
    championship: {
      pointsByPosition: [3, 2, 1]
    },
    archive: [{ id: "past-event" }],
    teams: [
      { id: "alpha", name: "Alpha" }
    ],
    games: [
      {
        id: "kart",
        name: "Mario Kart",
        mode: "grand-prix",
        logoUrl: "kart.png",
        completed: true,
        completedAt: "2026-08-01T00:00:00Z",
        capacity: {
          maxPlayersPerConsole: 2,
          maxPlayersPerLobby: 12,
          configured: true
        },
        competitorEntries: {
          alpha: 2
        }
      },
      {
        id: "fall-guys",
        name: "Fall Guys",
        mode: "fall-guys-grand-prix",
        fallGuysGrandPrix: {
          targetHeats: 8,
          countedResults: 3,
          heats: [{ id: "heat-1" }],
          closed: true,
          closedAt: "2026-08-01T00:00:00Z",
          finalStandings: [{ teamId: "alpha" }]
        }
      },
      {
        id: "swiss-four",
        name: "Four Player",
        mode: "four-player-swiss",
        fourPlayerSwiss: {
          entrantIds: ["alpha"],
          rounds: [{ id: "round-1" }],
          closed: true,
          closedAt: "2026-08-01T00:00:00Z",
          finalStandings: [{ teamId: "alpha" }]
        }
      }
    ],
    rounds: [{ id: "round-1" }],
    events: [{ id: "event-1" }]
  };

  const reset =
    createTournamentProgressResetState(
      source
    );

  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.teams)),
    source.teams
  );
  assert.equal(reset.games.length, 3);
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.games[0].capacity)),
    source.games[0].capacity
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.games[0].competitorEntries)),
    source.games[0].competitorEntries
  );
  assert.equal(reset.games[0].completed, false);
  assert.equal(reset.games[0].completedAt, "");
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.rounds)),
    []
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.events)),
    []
  );
  assert.equal(reset.games[1].fallGuysGrandPrix.targetHeats, 8);
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.games[1].fallGuysGrandPrix.heats)),
    []
  );
  assert.equal(reset.games[1].fallGuysGrandPrix.closed, false);
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.games[2].fourPlayerSwiss.rounds)),
    []
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.games[2].fourPlayerSwiss.entrantIds)),
    []
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(reset.archive)),
    source.archive
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(source.rounds)),
    [{ id: "round-1" }]
  );
});
