const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const context = { structuredClone };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "tournament-lifecycle.js"), "utf8"),
    context
  );
  return context.PHDTournamentLifecycle;
}

test("validates championship point schedules", () => {
  const lifecycle = load();
  assert.deepEqual(Array.from(lifecycle.validatePointsByPosition(["10", 8, 6])), [10, 8, 6]);
  assert.throws(() => lifecycle.validatePointsByPosition([10, -1]), /non-negative/);
});

test("creates immutable archive snapshots", () => {
  const lifecycle = load();
  const state = {
    tournament: { name: "Finals" },
    teams: [{ id: "a" }],
    games: [],
    rounds: [],
    events: [],
    championship: { pointsByPosition: [10] }
  };
  const snapshot = lifecycle.createArchiveSnapshot(state, {
    createId: () => "archive-1",
    now: () => "2026-07-25T00:00:00.000Z"
  });
  state.tournament.name = "Changed";
  assert.equal(snapshot.tournament.name, "Finals");
  assert.equal(snapshot.id, "archive-1");
});
