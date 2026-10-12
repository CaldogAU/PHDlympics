const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const teams = [{ id: "a", name: "A" }, { id: "b", name: "B" }, { id: "c", name: "C" }];
  const game = { id: "pico", mode: "pico-park-attempts", capacity: { configured: false } };
  const c = {
    window: { PHDGameCapacity: { getEligibleTeams: (_, teams) => teams }, PHDSessionPlanner: { getPlannedRoundCount: () => 2 } },
    document: { addEventListener() {} }, structuredClone, console: { error() {} },
    render() {}, saveState: async () => {}, canTournament: () => true, confirm: () => true, alert() {},
    PHDTournament: { modules: [], state: { games: [game], teams, events: [], rounds: [], tournament: {} } }
  };
  vm.createContext(c);
  for (const file of ["game-modes", "games", "events", "ladder"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "js", `${file}.js`), "utf8"), c);
  }
  c.game = game;
  return c;
}

test("Pico ranks the fewest attempts first and awards last place one point", () => {
  const c = load();
  const result = c.window.PHDGameModes.buildResult(c.window.PHDGameModes.getRequired("pico-park-attempts"), {
    teams: c.PHDTournament.state.teams, teamIds: ["a", "b", "c"],
    results: [{ teamId: "c", attempts: 8 }, { teamId: "a", attempts: 2 }, { teamId: "b", attempts: 5 }]
  });
  assert.equal(result.complete, true);
  assert.deepEqual(Array.from(result.leaderboard, x => [x.teamId, x.attempts, x.championshipPoints]), [["a", 2, 3], ["b", 5, 2], ["c", 8, 1]]);
});

test("Pico rejects missing, zero, negative and fractional counts and shares tied points", () => {
  const c = load(), mode = c.window.PHDGameModes.getRequired("pico-park-attempts");
  for (const attempts of ["", null, undefined, 0, -1, 1.5, Infinity]) {
    assert.equal(mode.areResultsComplete({ teamIds: ["a"], results: [{ teamId: "a", attempts }] }), false);
  }
  const result = c.window.PHDGameModes.buildResult(mode, {
    teamIds: ["a", "b", "c"], results: ["a", "b", "c"].map((teamId, i) => ({ teamId, attempts: i === 0 ? 1 : 2 }))
  });
  assert.deepEqual(Array.from(result.leaderboard, x => [x.position, x.championshipPoints]), [[1, 3], [2, 1.5], [2, 1.5]]);
});

test("Pico combines worlds and requires every team's result in every world", () => {
  const c = load();
  const results = [{ teamId: "a", attempts: 2 }, { teamId: "b", attempts: 3 }, { teamId: "c", attempts: 4 }];
  c.PHDTournament.state.events = [{ gameId: "pico", completed: true, worldName: "World 1", results }];
  assert.equal(c.getCompletedGameLeaderboard(c.game), null);
  c.PHDTournament.state.events.push({ gameId: "pico", completed: true, worldName: "World 2", results: results.slice(0, 2) });
  assert.equal(c.getCompletedGameLeaderboard(c.game), null);
  c.PHDTournament.state.events[1].results = [{ teamId: "a", attempts: 5 }, { teamId: "b", attempts: 1 }, { teamId: "c", attempts: 1 }];
  assert.deepEqual(Array.from(c.getCompletedGameLeaderboard(c.game), x => [x.teamId, x.attempts, x.championshipPoints]), [["b", 4, 3], ["c", 5, 2], ["a", 7, 1]]);
});

test("clearing Runbow is scoped, recoverable, and retains entrants and mode", async () => {
  const c = load(), state = c.PHDTournament.state;
  const runbow = { id: "runbow", name: "Runbow - Week 3", mode: "time-trial", completed: true, competitorEntries: { a: 2 } };
  state.games.push(runbow);
  state.events = [{ id: "r", gameId: "runbow", results: [{ teamId: "a", timeMilliseconds: 8000 }] }, { id: "p", gameId: "pico", results: [] }];
  state.rounds = [{ id: "shared", matches: [{ gameId: "runbow", completed: true }, { gameId: "pico", completed: true }] }];
  const before = JSON.stringify(state);
  await c.clearGameResults("runbow");
  assert.equal(runbow.completed, false);
  assert.equal(runbow.mode, "time-trial");
  assert.deepEqual(runbow.competitorEntries, { a: 2 });
  assert.deepEqual(Array.from(state.events, event => event.id), ["p"]);
  assert.equal(state.rounds[0].matches.length, 1);
  assert.equal(state.rounds[0].matches[0].gameId, "pico");
  assert.ok(runbow.clearedProgress);
  await c.restoreGameResults("runbow");
  assert.equal(state.events.length, 2);
  assert.equal(state.rounds[0].matches.length, 2);
  assert.equal(runbow.completed, true);
  assert.equal(runbow.clearedProgress, undefined);
  assert.equal(JSON.parse(before).games[1].mode, runbow.mode);
});

test("clear failure and unauthorised clear leave all results intact", async () => {
  const c = load();
  c.PHDTournament.state.events = [{ gameId: "pico", results: [{ teamId: "a", attempts: 2 }] }];
  const before = JSON.stringify(c.PHDTournament.state);
  c.canTournament = () => false;
  await c.clearGameResults("pico");
  assert.equal(JSON.stringify(c.PHDTournament.state), before);
  c.canTournament = () => true;
  c.saveState = async () => { throw new Error("offline"); };
  await c.clearGameResults("pico");
  assert.equal(JSON.stringify(c.PHDTournament.state), before);
});

test("failed event save rolls back world names and result completion", async () => {
  const c = load();
  const event = { id: "e", gameId: "pico", completed: false, results: [] };
  const before = JSON.stringify(event);
  c.saveState = async () => { throw new Error("offline"); };
  await c.persistEventResults(event, [{ teamId: "a", attempts: 2 }], "save", true, { worldName: "Dark World" });
  assert.equal(JSON.stringify(event), before);
});
