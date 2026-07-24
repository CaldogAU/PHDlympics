const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "competition-formats.js"), "utf8"),
    { window, crypto: { randomUUID: () => "id" } }
  );
  return window.PHDCompetitionFormats;
}

test("round robin schedules every pairing once", () => {
  let id = 0;
  const rounds = load().roundRobinSchedule(["a", "b", "c", "d"], () => `${++id}`);
  assert.equal(rounds.length, 3);
  const pairs = rounds.flatMap(round => round.matches.map(match =>
    [match.teamAId, match.teamBId].sort().join("-")
  ));
  assert.equal(new Set(pairs).size, 6);
});

test("round robin supplies a bye for odd entrants", () => {
  let id = 0;
  const rounds = load().roundRobinSchedule(["a", "b", "c"], () => `${++id}`);
  assert.equal(rounds.length, 3);
  assert.equal(rounds.flatMap(round => round.matches).filter(match => match.bye).length, 3);
});

test("single elimination pads to a power-of-two bracket", () => {
  let id = 0;
  const [round] = load().singleEliminationFirstRound(["a", "b", "c"], () => `${++id}`);
  assert.equal(round.matches.length, 2);
  assert.equal(round.matches.filter(match => match.bye).length, 1);
});
