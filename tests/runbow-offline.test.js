const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const context = { window: {}, document: { addEventListener() {} }, PHDTournament: { modules: [], state: { games: [], teams: [], events: [] } } };
  for (const file of ["game-modes", "games", "events", "ladder"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "js", `${file}.js`), "utf8"), context);
  }
  return context;
}

test("Runbow sums players and rounds, ranks descending and awards reverse-position points", () => {
  const c = load();
  const mode = c.window.PHDGameModes.getRequired("runbow-offline");
  const result = c.window.PHDGameModes.buildResult(mode, {
    teamIds: ["a", "b", "c"],
    results: [
      { teamId: "a", medals: 14, deaths: 6 },
      { teamId: "a", medals: 4, deaths: 2 },
      { teamId: "b", medals: 8, deaths: 0 },
      { teamId: "c", medals: 0, deaths: 3 }
    ]
  });
  assert.equal(result.complete, true);
  assert.deepEqual(Array.from(result.leaderboard, x => [x.teamId, x.points, x.championshipPoints]),
    [["a", 10, 3], ["b", 8, 2], ["c", -3, 1]]);
});

test("Runbow validates whole counts, zero scores and all required players", () => {
  const mode = load().window.PHDGameModes.getRequired("runbow-offline");
  const valid = { participantId: "a:1", teamId: "a", medals: 0, deaths: 0 };
  assert.equal(mode.areResultsComplete({ participantIds: ["a:1", "a:2"], results: [valid] }), false);
  assert.equal(mode.areResultsComplete({ participantIds: ["a:1"], results: [valid] }), true);
  for (const medals of ["", null, undefined, -1, 1.5, Infinity]) {
    assert.equal(mode.areResultsComplete({ participantIds: ["a:1"], results: [{ ...valid, medals }] }), false);
  }
});

test("Runbow ties share occupied championship points", () => {
  const c = load();
  const result = c.window.PHDGameModes.buildResult(c.window.PHDGameModes.getRequired("runbow-offline"), {
    teamIds: ["a", "b", "c"],
    results: ["a", "b", "c"].map((teamId, index) => ({ teamId, medals: index < 2 ? 14 : 2, deaths: 6 }))
  });
  assert.deepEqual(Array.from(result.leaderboard, x => [x.position, x.championshipPoints]), [[1, 2.5], [1, 2.5], [3, 1]]);
});

test("Game Pages use the requested week order without mutating stored games", () => {
  const c = load();
  const names = ["Pico Park 2 - Week 4", "Runbow - Week 3", "Mario Kart 8 Deluxe - Week 1", "Pico Park 2 - Week 2", "Extra"];
  c.PHDTournament.state.games = names.map(name => ({ name }));
  assert.deepEqual(Array.from(c.getGames(), x => x.name), [names[2], names[3], names[1], names[0], names[4]]);
  assert.deepEqual(c.PHDTournament.state.games.map(x => x.name), names);
});

test("Runbow completion waits for every player in every planned round", () => {
  const c = load();
  const game = { id: "g", mode: "runbow-offline", capacity: { configured: false } };
  c.PHDTournament.state.games = [game];
  c.PHDTournament.state.teams = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  c.window.PHDGameCapacity = { getEligibleTeams: (_, teams) => teams };
  c.window.PHDSessionPlanner = { getPlannedRoundCount: () => 2 };
  c.PHDTournament.state.tournament = {};
  const results = [{ teamId: "a", participantId: "a", medals: 14, deaths: 6 }, { teamId: "b", participantId: "b", medals: 5, deaths: 1 }];
  c.PHDTournament.state.events = [{ gameId: "g", completed: true, results }];
  assert.equal(c.getCompletedGameLeaderboard(game), null);
  c.PHDTournament.state.events.push({ gameId: "g", completed: true, results: results.slice(0, 1) });
  assert.equal(c.getCompletedGameLeaderboard(game), null);
  c.PHDTournament.state.events[1].results = results;
  assert.deepEqual(Array.from(c.getCompletedGameLeaderboard(game), x => [x.teamId, x.points, x.championshipPoints]), [["a", 16, 2], ["b", 8, 1]]);
});

test("Runbow final ranking uses raw totals instead of accumulated round placements", () => {
  const c = load();
  const game = { id: "g", mode: "runbow-offline", capacity: { configured: false } };
  c.PHDTournament.state.games = [game];
  c.PHDTournament.state.teams = [{ id: "a", name: "A" }, { id: "b", name: "B" }];
  c.window.PHDGameCapacity = { getEligibleTeams: (_, teams) => teams };
  c.window.PHDSessionPlanner = { getPlannedRoundCount: () => 3 };
  c.PHDTournament.state.tournament = {};
  c.PHDTournament.state.events = [[100, 1], [0, 2], [0, 2]].map((scores, index) => ({
    gameId: "g", completed: true, roundNumber: index + 1,
    results: scores.map((score, i) => ({ teamId: i ? "b" : "a", participantId: i ? "b" : "a", medals: score + 6, deaths: 6 }))
  }));
  // B wins two rounds, but A has the higher final medals-minus-deaths total.
  assert.deepEqual(Array.from(c.getCompletedGameLeaderboard(game), x => [x.teamId, x.medals, x.deaths, x.points, x.championshipPoints]),
    [["a", 118, 18, 100, 2], ["b", 23, 18, 5, 1]]);
});

test("Runbow rounds show counts without separate rankings or tournament points", () => {
  const c = load();
  const game = { id: "g", mode: "runbow-offline", capacity: { configured: false } };
  c.PHDTournament.state.games = [game];
  c.PHDTournament.state.teams = [{ id: "a", name: "A" }];
  c.window.PHDGameCapacity = { getEligibleTeams: (_, teams) => teams };
  c.escapeHtml = value => String(value);
  const html = c.renderRunbowEntries({ gameId: "g", completed: true, results: [{ teamId: "a", participantId: "a", medals: 14, deaths: 6 }] });
  assert.ok(html.includes('value="14"'));
  assert.ok(html.includes('value="6"'));
  assert.ok(!html.includes('<th>Rank</th>'));
  assert.ok(!html.includes('<th>Championship points</th>'));
});
