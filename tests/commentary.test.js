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
  assert.match(notes[0], /9/);
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
  assert.equal(
    notes.some(note =>
      /Alpha/.test(note) &&
      /3/.test(note) &&
      /(lead|top|summit|championship|ahead|advantage|cushion)/i.test(note)
    ),
    true
  );
  assert.equal(
    notes.some(note =>
      /Alpha/.test(note) &&
      /2/.test(note) &&
      /(win|victor|form|momentum|roll)/i.test(note)
    ),
    true
  );
});

test("keeps generated wording stable for unchanged tournament data", () => {
  const commentary = load();
  const context = {
    activity: [
      { type: "Match", round: 1, teamA: "Alpha", teamB: "Beta", score: "7 - 6" },
      { type: "Match", round: 1, teamA: "Gamma", teamB: "Delta", score: "3 - 3" }
    ],
    standings: [
      { name: "Alpha", points: 4 },
      { name: "Gamma", points: 4 }
    ]
  };

  assert.deepEqual(
    commentary.generate(context),
    commentary.generate(context)
  );
});

test("detects draws, shutouts, and close contests", () => {
  const notes = load().generate({
    activity: [
      { type: "Match", round: 3, teamA: "Alpha", teamB: "Beta", score: "8 - 0" },
      { type: "Match", round: 3, teamA: "Gamma", teamB: "Delta", score: "5 - 4" },
      { type: "Match", round: 3, teamA: "Echo", teamB: "Foxtrot", score: "2 - 2" }
    ],
    limit: 10
  });

  assert.equal(notes.some(note => /(shut|clean|blank|conced)/i.test(note)), true);
  assert.equal(notes.some(note => /(edge|thriller|wire|nail|narrow|margin)/i.test(note)), true);
  assert.equal(notes.some(note => /(draw|even|deadlock|separated|spoils|balanced)/i.test(note)), true);
});

test("covers time trial winners and close timing gaps", () => {
  const notes = load().generate({
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" }
    ],
    games: [
      { id: "speed", name: "Speed Run" }
    ],
    events: [{
      id: "event-1",
      gameId: "speed",
      mode: "time-trial",
      completed: true,
      updatedAt: "2026-07-25T10:00:00Z",
      results: [
        { teamId: "a", timeMilliseconds: 60000 },
        { teamId: "b", timeMilliseconds: 60500 }
      ]
    }],
    limit: 10
  });

  assert.equal(notes.some(note => /Alpha/.test(note) && /Speed Run/.test(note)), true);
  assert.equal(
    notes.some(note =>
      /Alpha/.test(note) &&
      /Beta/.test(note) &&
      /(millisecond|clock|close|fast|finish|denied|separated|0\.500s)/i.test(note)
    ),
    true
  );
});

test("covers grand prix winners and podiums", () => {
  const notes = load().generate({
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Beta" },
      { id: "c", name: "Gamma" }
    ],
    games: [
      { id: "race", name: "Kart Final" }
    ],
    events: [{
      id: "event-2",
      gameId: "race",
      mode: "grand-prix",
      completed: true,
      updatedAt: "2026-07-25T11:00:00Z",
      results: [
        { teamId: "b", finishPosition: 2 },
        { teamId: "c", finishPosition: 3 },
        { teamId: "a", finishPosition: 1 }
      ]
    }],
    limit: 10
  });

  assert.equal(notes.some(note => /Alpha/.test(note) && /Kart Final/.test(note)), true);
  assert.equal(
    notes.some(note =>
      /Alpha/.test(note) &&
      /Beta/.test(note) &&
      /Gamma/.test(note)
    ),
    true
  );
});

test("provides broad sentence variation without an external service", () => {
  const commentary = load();
  const counts = Object.values(commentary.templateCounts);
  assert.equal(Object.keys(commentary.templateCounts).length >= 15, true);
  assert.equal(counts.reduce((sum, count) => sum + count, 0) >= 100, true);
});
