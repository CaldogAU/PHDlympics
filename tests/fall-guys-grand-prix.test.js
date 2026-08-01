const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadEngine() {
  const PHDTournament = {
    modules: [],
    state: {
      teams: []
    }
  };
  const window = {
    document: {
      addEventListener() {}
    }
  };
  const context = {
    window,
    PHDTournament
  };

  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "fall-guys-grand-prix.js"
      ),
      "utf8"
    ),
    context
  );

  return window
    .PHDFallGuysGrandPrix;
}

test("counts only the best configured player results per office", () => {
  const engine = loadEngine();
  const result = {
    teamId: "alpha",
    first: 1,
    second: 1,
    third: 1,
    fourth: 1,
    qualified: 2,
    participated: 2
  };

  assert.equal(
    engine.calculateHeatScore(
      result,
      3
    ),
    24
  );
  assert.equal(
    engine.calculateHeatScore(
      result,
      5
    ),
    32
  );
});

test("rejects duplicate podium placements across offices", () => {
  const engine = loadEngine();
  const validation =
    engine.validateHeatResults(
      [
        {
          teamId: "alpha",
          first: 1
        },
        {
          teamId: "bravo",
          first: 1
        }
      ],
      ["alpha", "bravo"]
    );

  assert.equal(
    validation.valid,
    false
  );
  assert.match(
    validation.message,
    /Only one player/
  );
});

test("ranks offices across completed heats without eliminating anyone", () => {
  const engine = loadEngine();
  const teams = [
    { id: "alpha", name: "Alpha" },
    { id: "bravo", name: "Bravo" },
    { id: "charlie", name: "Charlie" }
  ];
  const tournament = {
    countedResults: 3,
    heats: [
      {
        completed: true,
        results: [
          {
            teamId: "alpha",
            first: 1,
            qualified: 2
          },
          {
            teamId: "bravo",
            second: 1,
            qualified: 2
          },
          {
            teamId: "charlie",
            third: 1,
            participated: 2
          }
        ]
      },
      {
        completed: true,
        results: [
          {
            teamId: "alpha",
            second: 1,
            participated: 2
          },
          {
            teamId: "bravo",
            first: 1,
            qualified: 2
          },
          {
            teamId: "charlie",
            third: 1,
            qualified: 2
          }
        ]
      }
    ]
  };

  const standings =
    engine.calculateStandings(
      teams,
      tournament
    );

  assert.deepEqual(
    Array.from(
      standings,
      standing =>
        standing.teamId
    ),
    ["bravo", "alpha", "charlie"]
  );
  assert.deepEqual(
    Array.from(
      standings,
      standing =>
        standing.heatsCompleted
    ),
    [2, 2, 2]
  );
});

test("keeps every office pending until the first heat is completed", () => {
  const engine = loadEngine();
  const standings =
    engine.calculateStandings(
      [
        { id: "china", name: "China" },
        { id: "sydney", name: "Sydney" },
        { id: "london", name: "London" }
      ],
      {
        heats: [
          {
            completed: false,
            results: []
          }
        ]
      }
    );

  assert.deepEqual(
    Array.from(
      standings,
      standing => standing.position
    ),
    [null, null, null]
  );
});

test("gives tied offices a defined shared rank after a completed heat", () => {
  const engine = loadEngine();
  const standings =
    engine.calculateStandings(
      [
        { id: "alpha", name: "Alpha" },
        { id: "bravo", name: "Bravo" },
        { id: "charlie", name: "Charlie" }
      ],
      {
        countedResults: 3,
        heats: [
          {
            completed: true,
            results: [
              {
                teamId: "alpha",
                participated: 1
              },
              {
                teamId: "bravo",
                participated: 1
              },
              {
                teamId: "charlie"
              }
            ]
          }
        ]
      }
    );

  assert.deepEqual(
    Array.from(
      standings,
      standing => standing.position
    ),
    [1, 1, 3]
  );
});

test("adds completed heats to individual team history", () => {
  const engine = loadEngine();
  const state = {
    teams: [
      { id: "alpha", name: "Alpha" },
      { id: "bravo", name: "Bravo" }
    ],
    rounds: [],
    events: [],
    games: [
      {
        id: "fall-guys",
        name: "Fall Guys",
        mode: "fall-guys-grand-prix",
        fallGuysGrandPrix: {
          countedResults: 3,
          closed: false,
          heats: [
            {
              id: "heat-one",
              number: 1,
              completed: true,
              results: [
                {
                  teamId: "alpha",
                  first: 1,
                  qualified: 2
                },
                {
                  teamId: "bravo",
                  second: 1,
                  participated: 2
                }
              ]
            }
          ]
        }
      }
    ]
  };
  const context = {
    PHDTournament: {
      state,
      modules: []
    },
    window: {
      PHDFallGuysGrandPrix:
        engine
    },
    getTeamById(teamId) {
      return state.teams.find(
        team => team.id === teamId
      );
    },
    getGameById(gameId) {
      return state.games.find(
        game => game.id === gameId
      );
    },
    escapeHtml(value) {
      return String(value);
    }
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "team-pages.js"
      ),
      "utf8"
    ),
    context
  );

  const history = vm.runInContext(
    'getTeamPageHistoryEntries("alpha")',
    context
  );

  assert.equal(history.length, 1);
  assert.equal(
    history[0].roundLabel,
    "Heat 1"
  );
  assert.equal(
    history[0].displayScore,
    "16 pts"
  );
  assert.equal(
    history[0].multiplayer,
    true
  );
});
