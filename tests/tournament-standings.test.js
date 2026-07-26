const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadStandings(state) {
  const context = {
    PHDTournament: {
      state,
      modules: []
    },
    window: {},
    document: {},
    getGameById(gameId) {
      return state.games.find(
        game => game.id === gameId
      );
    },
    getRoundsForGame(gameId) {
      return state.rounds.filter(
        round =>
          round.gameId === gameId
      );
    }
  };

  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "game-modes.js"
      ),
      "utf8"
    ),
    {
      window: context.window
    }
  );

  context.window.PHDGameModes =
    context.window.PHDGameModes;

  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "ladder.js"
      ),
      "utf8"
    ),
    context
  );

  context.window.getStandings =
    vm.runInNewContext(
      "getStandings",
      context
    );
  context.window.getScoreDifference =
    vm.runInNewContext(
      "getScoreDifference",
      context
    );

  return vm.runInNewContext(
    "getStandings()",
    context
  );
}

function createState() {
  const teams = [
    { id: "a", name: "Alpha" },
    { id: "b", name: "Bravo" },
    { id: "c", name: "Charlie" },
    { id: "d", name: "Delta" }
  ];

  return {
    tournament: {
      settings: {
        winPoints: 3,
        drawPoints: 1,
        byePoints: 3
      }
    },
    teams,
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
        id: "swiss",
        name: "Swiss",
        mode: "swiss",
        completed: false,
        settings: {
          winPoints: 3,
          drawPoints: 1,
          byePoints: 3
        }
      },
      {
        id: "four",
        name: "4 Player Swiss",
        mode: "four-player-swiss",
        fourPlayerSwiss: {
          closed: true,
          finalStandings: [
            { teamId: "a", position: 1 },
            { teamId: "b", position: 2 },
            { teamId: "c", position: 3 },
            { teamId: "d", position: 4 }
          ]
        }
      }
    ],
    rounds: [
      {
        id: "round",
        gameId: "swiss",
        completed: true,
        matches: [
          {
            gameId: "swiss",
            teamAId: "a",
            teamBId: "b",
            scoreA: 2,
            scoreB: 0,
            completed: true
          },
          {
            gameId: "swiss",
            teamAId: "c",
            teamBId: "d",
            scoreA: 1,
            scoreB: 0,
            completed: true
          }
        ]
      }
    ],
    events: [
      {
        gameId: "gp",
        mode: "grand-prix",
        completed: true,
        results: [
          { teamId: "a", finishPosition: 1 },
          { teamId: "b", finishPosition: 2 },
          { teamId: "c", finishPosition: 3 },
          { teamId: "d", finishPosition: 4 }
        ]
      },
      {
        gameId: "tt",
        mode: "time-trial",
        completed: true,
        results: [
          { teamId: "a", timeMilliseconds: 4000 },
          { teamId: "b", timeMilliseconds: 3000 },
          { teamId: "c", timeMilliseconds: 2000 },
          { teamId: "d", timeMilliseconds: 1000 }
        ]
      }
    ]
  };
}

test("aggregates reverse-position points from every completed event", () => {
  const standings =
    loadStandings(createState());

  assert.deepEqual(
    Array.from(
      standings,
      team => [
        team.id,
        team.points,
        team.gamesCompleted
      ]
    ),
    [
      ["a", 9, 3],
      ["b", 8, 3],
      ["c", 7, 3],
      ["d", 6, 3]
    ]
  );

  assert.deepEqual(
    Array.from(
      standings[0].gamePoints,
      result => [
        result.gameName,
        result.points
      ]
    ),
    [
      ["Grand Prix", 4],
      ["Time Trial", 1],
      ["4 Player Swiss", 4]
    ]
  );
});

test("excludes match games until the game itself is completed", () => {
  const state = createState();
  const before =
    loadStandings(state);

  state.games.find(
    game => game.id === "swiss"
  ).completed = true;

  const after =
    loadStandings(state);

  assert.equal(
    before.find(team => team.id === "a")
      .gamesCompleted,
    3
  );
  assert.equal(
    before.find(team => team.id === "a")
      .gamePoints.some(
        result =>
          result.gameId === "swiss"
      ),
    false
  );
  assert.equal(
    after.find(team => team.id === "a")
      .gamesCompleted,
    4
  );
  assert.equal(
    after.find(team => team.id === "a")
      .gamePoints.find(
        result =>
          result.gameId === "swiss"
      ).points,
    4
  );
  assert.equal(
    after.reduce(
      (total, team) =>
        total + team.points,
      0
    ),
    40
  );
});
