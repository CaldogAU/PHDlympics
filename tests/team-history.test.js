const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function getHistory() {
  const state = {
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
      { id: "c", name: "Charlie" },
      { id: "d", name: "Delta" }
    ],
    rounds: [
      {
        id: "round-1",
        number: 1,
        completed: true,
        matches: [
          {
            id: "match-1",
            gameId: "head",
            teamAId: "a",
            teamBId: "b",
            scoreA: 2,
            scoreB: 1,
            completed: true
          }
        ]
      }
    ],
    events: [
      {
        id: "grand-prix",
        gameId: "gp",
        mode: "grand-prix",
        completed: true,
        updatedAt:
          "2026-07-26T10:00:00Z",
        results: [
          {
            teamId: "a",
            finishPosition: 2
          }
        ]
      },
      {
        id: "time-trial",
        gameId: "tt",
        mode: "time-trial",
        completed: true,
        updatedAt:
          "2026-07-26T11:00:00Z",
        results: [
          {
            teamId: "a",
            timeMilliseconds:
              62500
          }
        ]
      }
    ],
    games: [
      {
        id: "head",
        name: "Head to Head",
        mode: "swiss"
      },
      {
        id: "gp",
        name: "Grand Prix",
        mode: "grand-prix"
      },
      {
        id: "tt",
        name: "Time Trial",
        mode: "time-trial"
      },
      {
        id: "four",
        name: "Four Player",
        mode: "four-player-swiss",
        fourPlayerSwiss: {
          rounds: [
            {
              id: "four-round",
              number: 1,
              groups: [
                {
                  id: "group-1",
                  number: 1,
                  completed: true,
                  updatedAt:
                    "2026-07-26T12:00:00Z",
                  competitors: [
                    {
                      teamId: "a",
                      placement: 3
                    },
                    {
                      teamId: "b",
                      placement: 1
                    },
                    {
                      teamId: "c",
                      placement: 2
                    },
                    {
                      teamId: "d",
                      placement: 4
                    }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  };
  const context = {
    PHDTournament: { state },
    window: {},
    getTeamById(teamId) {
      return state.teams.find(
        team => team.id === teamId
      );
    },
    getGameById(gameId) {
      return state.games.find(
        game => game.id === gameId
      );
    }
  };

  vm.runInNewContext(
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

  return vm.runInNewContext(
    'getTeamPageHistoryEntries("a")',
    context
  );
}

test("team history includes every supported result mode", () => {
  const history = getHistory();

  assert.deepEqual(
    Array.from(
      history,
      entry => entry.gameId
    ).sort(),
    ["four", "gp", "head", "tt"]
  );
});

test("multiplayer history uses Multiple and preserves result values", () => {
  const history = getHistory();
  const multiplayer =
    history.filter(
      entry => entry.multiplayer
    );

  assert.equal(
    multiplayer.length,
    3
  );
  assert.deepEqual(
    Array.from(
      multiplayer,
      entry => entry.displayScore
    ).sort(),
    ["1:02", "2nd", "3rd"]
  );
});

test("team match history renders every multiplayer result as Multiple", () => {
  const state = {
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
      { id: "c", name: "Charlie" },
      { id: "d", name: "Delta" }
    ],
    rounds: [],
    events: [
      {
        id: "grand-prix",
        gameId: "gp",
        mode: "grand-prix",
        completed: true,
        results: [
          {
            teamId: "a",
            finishPosition: 2
          }
        ]
      },
      {
        id: "time-trial",
        gameId: "tt",
        mode: "time-trial",
        completed: true,
        results: [
          {
            teamId: "a",
            timeMilliseconds: 62500
          }
        ]
      }
    ],
    games: [
      {
        id: "gp",
        name: "Grand Prix",
        mode: "grand-prix"
      },
      {
        id: "tt",
        name: "Time Trial",
        mode: "time-trial"
      },
      {
        id: "four",
        name: "Four Player",
        mode: "four-player-swiss",
        fourPlayerSwiss: {
          rounds: [
            {
              id: "round-one",
              number: 1,
              groups: [
                {
                  id: "group-one",
                  number: 1,
                  completed: true,
                  competitors: [
                    {
                      teamId: "a",
                      placement: 3
                    }
                  ]
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
    window: {},
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

  const html = vm.runInContext(
    'renderTeamPageMatchRows(PHDTournament.state.teams[0], getTeamPageHistoryEntries("a"))',
    context
  );

  assert.equal(
    (html.match(/Multiple/g) || [])
      .length,
    3
  );
  assert.match(html, /1:02/);
  assert.match(html, /2nd/);
  assert.match(html, /3rd/);
});
