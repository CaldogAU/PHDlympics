const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadPlanner() {
  const context = { console };
  vm.createContext(context);
  vm.runInContext(
    fs.readFileSync(
      path.join(__dirname, "..", "js", "session-planner.js"),
      "utf8"
    ),
    context
  );
  return context.PHDSessionPlanner;
}

test("calculates the maximum whole rounds that fit the weekly allowance", () => {
  const planner = loadPlanner();
  assert.equal(
    planner.getPlannedRoundCount(
      { minutesPerRound: 30 },
      { timeAllowancePerWeek: 60 }
    ),
    2
  );
  assert.equal(
    planner.getPlannedRoundCount(
      { minutesPerRound: 25 },
      { timeAllowancePerWeek: 60 }
    ),
    2
  );
});

test("always permits one round when a round exceeds the allowance", () => {
  const planner = loadPlanner();
  assert.equal(
    planner.getPlannedRoundCount(
      { minutesPerRound: 90 },
      { timeAllowancePerWeek: 60 }
    ),
    1
  );
});

test("normalises legacy tournaments and games conservatively", () => {
  const planner = loadPlanner();
  const tournament = { description: "Legacy notes" };
  const game = {};
  planner.normaliseTournament(tournament);
  planner.normaliseGame(game, tournament);
  assert.equal(tournament.timeAllowancePerWeek, 60);
  assert.equal("description" in tournament, false);
  assert.equal(game.minutesPerRound, 60);
  assert.equal(game.plannedRounds, 1);
});
