const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "commentary.js"), "utf8"),
    { window }
  );
  return window.PHDCommentary;
}

test("calls out the largest recent winning margin", () => {
  const notes = load().generate({
    activity: [
      { type: "Match", teamA: "Alpha", teamB: "Beta", score: "12 - 3" },
      { type: "Match", teamA: "Gamma", teamB: "Delta", score: "5 - 4" }
    ]
  });
  assert.match(notes[0], /Alpha/);
  assert.match(notes[0], /by 9/);
});

test("calls out the championship leader and recent form", () => {
  const notes = load().generate({
    activity: [
      { type: "Match", teamA: "Alpha", teamB: "Beta", score: "2 - 0" },
      { type: "Match", teamA: "Alpha", teamB: "Gamma", score: "3 - 1" }
    ],
    standings: [
      { name: "Alpha", points: 10 },
      { name: "Beta", points: 7 }
    ]
  });
  assert.equal(notes.some(note => /leads the championship by 3/.test(note)), true);
  assert.equal(notes.some(note => /2 recent wins/.test(note)), true);
});
