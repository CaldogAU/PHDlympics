const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadGameModes(overrides = {}) {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "game-modes.js"
    ),
    "utf8"
  );

  const window = {
    ...overrides
  };

  vm.runInNewContext(source, {
    window
  });

  return window.PHDGameModes;
}

function loadAllGameModes() {
  const window = {
    crypto: {
      randomUUID() {
        return "id";
      }
    }
  };
  const context = { window, crypto: window.crypto };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "competition-formats.js"), "utf8"),
    context
  );
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "game-modes.js"), "utf8"),
    context
  );
  return window.PHDGameModes;
}

test("registers the supported game modes", () => {
  const gameModes = loadGameModes();

  assert.equal(
    gameModes.SDK_VERSION,
    "1.0.0"
  );

  assert.deepEqual(
    Array.from(
      gameModes.list(),
      mode => mode.id
    ),
    [
      "swiss",
      "time-trial",
      "grand-prix"
    ]
  );

  gameModes.list().forEach(mode => {
    assert.equal(
      mode.displayName,
      mode.name
    );
    assert.equal(
      typeof mode.icon,
      "string"
    );
    assert.equal(
      mode.version,
      "1.0.0"
    );
    assert.equal(
      mode.compatibilityVersion,
      gameModes.SDK_VERSION
    );
  });
});

test("registers approved bracket modes when format engines are available", () => {
  const gameModes = loadAllGameModes();
  assert.deepEqual(
    Array.from(gameModes.list(), mode => mode.id),
    ["swiss", "time-trial", "grand-prix", "single-elimination", "round-robin"]
  );
  assert.equal(gameModes.getRequired("single-elimination").getResultEntryType(), "match-score");
});

test("single elimination advances winners into the next round", () => {
  const gameModes = loadAllGameModes();
  const mode = gameModes.getRequired("single-elimination");
  const state = { teams: ["a", "b", "c", "d"].map(id => ({ id })) };
  const first = mode.createNextRound({ state, gameId: "game", rounds: [] });
  first.completed = true;
  first.matches.forEach((match, index) => {
    match.completed = true;
    match.winnerId = index ? "b" : "a";
  });
  const final = mode.createNextRound({ state, gameId: "game", rounds: [first] });
  assert.equal(final.number, 2);
  assert.equal(final.matches.length, 1);
  assert.deepEqual(
    [final.matches[0].teamAId, final.matches[0].teamBId].sort(),
    ["a", "b"]
  );
});

test("rejects plugins targeting an incompatible SDK", () => {
  const gameModes = loadGameModes();

  assert.throws(
    () =>
      gameModes.register({
        id: "future-mode",
        name: "Future Mode",
        version: "1.0.0",
        compatibilityVersion:
          "2.0.0",
        getResultEntryType() {
          return "custom";
        },
        calculateRankings() {
          return [];
        },
        calculateChampionshipPoints(
          rankings
        ) {
          return rankings;
        },
        areResultsComplete() {
          return false;
        },
        shouldRevealResults() {
          return false;
        }
      }),
    /targets SDK 2\.0\.0/
  );
});

test("accepts displayName metadata and validates plugin IDs", () => {
  const gameModes = loadGameModes();

  const mode = gameModes.register({
    id: "single-elimination",
    displayName:
      "Single Elimination",
    description:
      "Knockout bracket.",
    icon: "bracket",
    version: "1.0.0",
    compatibilityVersion:
      gameModes.SDK_VERSION,
    getResultEntryType() {
      return "match-score";
    },
    calculateRankings() {
      return [];
    },
    calculateChampionshipPoints(
      rankings
    ) {
      return rankings;
    },
    areResultsComplete() {
      return false;
    },
    shouldRevealResults() {
      return false;
    }
  });

  assert.equal(
    mode.name,
    "Single Elimination"
  );
  assert.equal(
    mode.icon,
    "bracket"
  );

  assert.throws(
    () =>
      gameModes.register({
        ...mode,
        id: "invalid mode"
      }),
    /must use lowercase letters/
  );
});

test("rejects duplicate and unknown mode dispatch", () => {
  const gameModes = loadGameModes();
  const swiss =
    gameModes.getRequired("swiss");

  assert.equal(
    gameModes.has("swiss"),
    true
  );
  assert.equal(
    gameModes.has("unknown"),
    false
  );

  assert.throws(
    () =>
      gameModes.register({
        ...swiss
      }),
    /already registered/
  );

  assert.throws(
    () =>
      gameModes.createNextRound(
        "unknown"
      ),
    /is not registered/
  );
});

test("delegates championship points to the selected mode", () => {
  const gameModes = loadGameModes();

  gameModes.register({
    id: "custom-points",
    name: "Custom Points",
    version: "1.0.0",
    compatibilityVersion:
      gameModes.SDK_VERSION,
    getResultEntryType() {
      return "custom";
    },
    calculateRankings() {
      return [
        {
          teamId: "team-a",
          rankValue: 10
        }
      ];
    },
    calculateChampionshipPoints(
      rankings
    ) {
      return rankings.map(entry => ({
        ...entry,
        championshipPoints: 42
      }));
    },
    areResultsComplete() {
      return true;
    },
    shouldRevealResults() {
      return true;
    }
  });

  const result = gameModes.buildResult(
    gameModes.getRequired(
      "custom-points"
    ),
    {}
  );

  assert.equal(
    result.leaderboard[0]
      .championshipPoints,
    42
  );
});

test("migrates missing and unknown modes to Swiss", () => {
  const gameModes = loadGameModes();
  const games = [
    {
      id: "missing"
    },
    {
      id: "unknown",
      mode: "knockout"
    },
    {
      id: "known",
      mode: "time-trial"
    }
  ];

  assert.equal(
    gameModes.migrateGames(games),
    true
  );

  assert.deepEqual(
    games.map(game => game.mode),
    [
      "swiss",
      "swiss",
      "time-trial"
    ]
  );
});

test("dispatches Swiss round generation through the registry", () => {
  const expectedRound = {
    id: "round-1"
  };
  const expectedContext = {
    state: {
      rounds: []
    }
  };
  let receivedContext = null;

  const gameModes = loadGameModes({
    createSwissPairings(context) {
      receivedContext = context;
      return expectedRound;
    }
  });

  assert.equal(
    gameModes.createNextRound(
      "swiss",
      expectedContext
    ),
    expectedRound
  );
  assert.equal(
    receivedContext,
    expectedContext
  );
});

test("rejects round generation for modes without rounds", () => {
  const gameModes = loadGameModes();

  assert.throws(
    () =>
      gameModes.createNextRound(
        "time-trial"
      ),
    /does not support round generation/
  );
});

test("keeps time trial results hidden until every team finishes", () => {
  const gameModes = loadGameModes();
  const incomplete = gameModes.buildResult(
    gameModes.get("time-trial"),
    {
      teamIds: [
        "team-a",
        "team-b"
      ],
      submissions: [
        {
          teamId: "team-a",
          teamName: "Alpha",
          timeMilliseconds: 62000
        }
      ]
    }
  );

  assert.equal(incomplete.complete, false);
  assert.equal(
    incomplete.revealResults,
    false
  );

  const complete = gameModes.buildResult(
    gameModes.get("time-trial"),
    {
      teamIds: [
        "team-a",
        "team-b"
      ],
      submissions: [
        {
          teamId: "team-a",
          teamName: "Alpha",
          timeMilliseconds: 62000
        },
        {
          teamId: "team-b",
          teamName: "Bravo",
          timeMilliseconds: 59000
        }
      ]
    }
  );

  assert.equal(complete.complete, true);
  assert.equal(
    complete.revealResults,
    true
  );
  assert.deepEqual(
    complete.leaderboard.map(entry => [
      entry.teamId,
      entry.position,
      entry.championshipPoints
    ]),
    [
      [
        "team-b",
        1,
        2
      ],
      [
        "team-a",
        2,
        1
      ]
    ]
  );
});

test("ranks Grand Prix results by finishing position", () => {
  const gameModes = loadGameModes();
  const result = gameModes.buildResult(
    gameModes.get("grand-prix"),
    {
      teamIds: [
        "team-a",
        "team-b",
        "team-c"
      ],
      results: [
        {
          teamId: "team-a",
          teamName: "Alpha",
          finishPosition: 2
        },
        {
          teamId: "team-b",
          teamName: "Bravo",
          finishPosition: 1
        },
        {
          teamId: "team-c",
          teamName: "Charlie",
          finishPosition: 3
        }
      ]
    }
  );

  assert.equal(result.complete, true);
  assert.deepEqual(
    result.leaderboard.map(entry => [
      entry.teamId,
      entry.position,
      entry.championshipPoints
    ]),
    [
      [
        "team-b",
        1,
        3
      ],
      [
        "team-a",
        2,
        2
      ],
      [
        "team-c",
        3,
        1
      ]
    ]
  );
});
