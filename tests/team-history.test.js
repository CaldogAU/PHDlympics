const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

test("team page championship stats resolve country IDs and preserve team match stats", () => {
  const c = {
    window: { addEventListener() {} },
    PHDTournament: { modules: [], state: { teams: [{ id: "team-a", officeId: "country-a" }, { id: "team-b", officeId: "country-a" }] } },
    document: { addEventListener() {} },
    getStandings: () => [{ id: "country-b", points: 20 }, { id: "country-a", points: 12, gamesCompleted: 2, gamePoints: [{ gameId: "g", points: 12 }] }],
    getGameStandings: () => [{ id: "team-a", wins: 3, points: 99 }, { id: "team-b", wins: 1 }]
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", "team-pages.js"), "utf8"), c);
  const standing = c.getTeamPageStanding("team-a");
  assert.equal(standing.points, 12);
  assert.equal(standing.position, 2);
  assert.equal(standing.gamesCompleted, 2);
  assert.equal(standing.wins, 3);
  assert.equal(c.getTeamPageStanding("team-b").points, 12);
});

test("event game breakdown includes recorded rounds and final placement without premature points", () => {
  const c = {
    window: { addEventListener() {} },
    PHDTournament: { modules: [], state: { games: [{ id: "g" }], events: [
      { gameId: "g", completed: true, results: [{ teamId: "a" }, { teamId: "a" }] },
      { gameId: "g", completed: false, results: [{ teamId: "a" }] }
    ] } },
    document: { addEventListener() {} },
    getCompletedGameLeaderboard: () => null
  };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", "team-pages.js"), "utf8"), c);
  let record = c.getTeamPageEventBreakdown("a")[0];
  assert.equal(record.played, 1);
  assert.equal(record.recorded, 2);
  assert.equal(record.tournamentPoints, null);
  c.getCompletedGameLeaderboard = () => [{ teamId: "a", position: 2, championshipPoints: 3 }];
  record = c.getTeamPageEventBreakdown("a")[0];
  assert.equal(record.position, 2);
  assert.equal(record.tournamentPoints, 3);
});

test("team page logos use the enlarged scalable image frame", () => {
  const styles = fs.readFileSync(
    path.join(__dirname, "..", "styles.css"),
    "utf8"
  );

  assert.match(
    styles,
    /\.team-page-logo\s*\{[\s\S]*?width:\s*360px;[\s\S]*?height:\s*360px;/
  );
  assert.match(
    styles,
    /\.team-page-logo img\s*\{[\s\S]*?width:\s*100%;[\s\S]*?height:\s*100%;[\s\S]*?object-fit:\s*contain;/
  );
});

test("team page logos remove their background only when an image exists", () => {
  const root = path.join(__dirname, "..");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const teamPages = fs.readFileSync(
    path.join(root, "js", "team-pages.js"),
    "utf8"
  );

  assert.match(
    styles,
    /\.team-page-logo\s*\{[\s\S]*?background:\s*var\(--team-colour, #6d5dfc\);[\s\S]*?border-radius:\s*36px;/
  );
  assert.match(
    styles,
    /\.team-page-logo\.has-image\s*\{[\s\S]*?background:\s*transparent;/
  );
  assert.match(
    teamPages,
    /class="team-page-logo\$\{[\s\S]*?team\.logoUrl[\s\S]*?" has-image"/
  );
});

test("team page navigation orders countries with Australia first and uses flag images", () => {
  const root = path.join(__dirname, "..");
  const teamPages = fs.readFileSync(
    path.join(root, "js", "team-pages.js"),
    "utf8"
  );
  const styles = fs.readFileSync(
    path.join(root, "styles.css"),
    "utf8"
  );

  assert.match(teamPages, /function getTeamPageCountryGroups/);
  assert.match(teamPages, /australiaA[\s\S]*?return australiaA \? -1 : 1/);
  assert.doesNotMatch(teamPages, /class="team-country-heading"/);
  assert.match(teamPages, /class="team-tab-country-flag"/);
  assert.match(teamPages, /class="team-page-country-flag"/);
  assert.match(teamPages, /https:\/\/flagcdn\.com\/w\$\{width\}/);
  assert.match(styles, /\.team-tab-button\s*\{[\s\S]*?justify-content:\s*space-between/);
  assert.match(styles, /\.team-tab-country-flag\s*\{[\s\S]*?width:\s*28px/);
  assert.match(styles, /\.team-page-country-flag\s*\{[\s\S]*?position:\s*absolute;[\s\S]*?opacity:\s*0\.12/);
});

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
