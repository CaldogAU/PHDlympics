const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("loads tournament engines before their workflow adapters", () => {
  const html = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );
  const swissEngineIndex =
    html.indexOf(
      'src="js/swiss-engine.js"'
    );
  const gameModesIndex =
    html.indexOf(
      'src="js/game-modes.js"'
    );
  const roundsIndex =
    html.indexOf(
      'src="js/rounds.js"'
    );

  assert.notEqual(
    swissEngineIndex,
    -1
  );
  assert.notEqual(
    gameModesIndex,
    -1
  );
  assert.notEqual(
    roundsIndex,
    -1
  );
  assert.ok(
    swissEngineIndex <
      gameModesIndex
  );
  assert.ok(
    gameModesIndex < roundsIndex
  );
});

test("keeps mode management on game pages", () => {
  const root = path.join(
    __dirname,
    ".."
  );
  const html = fs.readFileSync(
    path.join(root, "index.html"),
    "utf8"
  );
  const app = fs.readFileSync(
    path.join(root, "js", "app.js"),
    "utf8"
  );
  const events = fs.readFileSync(
    path.join(
      root,
      "js",
      "events.js"
    ),
    "utf8"
  );

  assert.equal(
    html.includes(
      'id="scheduleTab"'
    ),
    false
  );
  assert.equal(
    html.includes(
      'id="eventsTab"'
    ),
    false
  );
  assert.match(
    app,
    /renderSwissGameManagement/
  );
  assert.match(
    app,
    /renderEventGameManagement/
  );
  assert.match(
    events,
    /saveTimeTrialResults/
  );
  assert.match(
    events,
    /saveGrandPrixResults/
  );
  assert.equal(
    html.includes('id="summaryScoring"'),
    false
  );
  assert.equal(
    html.includes('id="winPoints"'),
    false
  );
  const rounds = fs.readFileSync(
    path.join(root, "js", "rounds.js"),
    "utf8"
  );
  assert.match(
    rounds,
    /saveGameScoring/
  );
  assert.match(
    rounds,
    /data-score-field="winPoints"/
  );
});
