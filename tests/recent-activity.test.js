const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadHistory(state) {
  const context = {
    PHDTournament: {
      state,
      modules: []
    },
    getTeamById(teamId) {
      return state.teams.find(team => team.id === teamId);
    },
    getGameById(gameId) {
      return state.games.find(game => game.id === gameId);
    },
    getGameLabel(gameId) {
      const game = state.games.find(item => item.id === gameId);
      return game ? game.name : "Unknown game";
    },
    getElement() {
      return null;
    },
    escapeHtml(value) {
      return String(value);
    }
  };

  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "js", "history.js"),
      "utf8"
    ),
    context
  );

  return context;
}

function createState() {
  return {
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" },
      { id: "c", name: "Charlie" },
      { id: "d", name: "Delta" }
    ],
    rounds: [],
    events: [
      {
        id: "gp-event",
        gameId: "gp",
        mode: "grand-prix",
        completed: true,
        updatedAt: "2026-07-27T10:00:00Z",
        results: [
          { teamId: "a", finishPosition: 2 },
          { teamId: "b", finishPosition: 1 }
        ]
      },
      {
        id: "tt-event",
        gameId: "tt",
        mode: "time-trial",
        completed: false,
        updatedAt: "2026-07-27T11:00:00Z",
        results: [
          {
            teamId: "c",
            timeMilliseconds: 62500
          }
        ]
      }
    ],
    games: [
      {
        id: "gp",
        name: "Mario Kart",
        mode: "grand-prix"
      },
      {
        id: "tt",
        name: "Track Mania",
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
                  updatedAt: "2026-07-27T12:00:00Z",
                  competitors: [
                    { teamId: "a", placement: 1 },
                    { teamId: "b", placement: 2 },
                    { teamId: "c", placement: 3 },
                    { teamId: "d", placement: 4 }
                  ]
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

test("recent activity includes every multiplayer mode", () => {
  const context = loadHistory(createState());
  const activity = vm.runInContext("getRecentActivity(8)", context);

  assert.deepEqual(
    Array.from(activity, item => item.type),
    ["4 Player Swiss", "Time Trial", "Grand Prix"]
  );
});

test("recent activity describes leaders and groups", () => {
  const context = loadHistory(createState());
  const messages = vm.runInContext(
    "getRecentActivity(8).map(getActivityTickerItemText)",
    context
  );

  assert.deepEqual(Array.from(messages), [
    "Four Player Round 1, Group 1: Alpha placed 1st",
    "Track Mania Time Trial: Charlie leads with 1:02.500",
    "Mario Kart Grand Prix: Bravo leads in 1st"
  ]);
});
