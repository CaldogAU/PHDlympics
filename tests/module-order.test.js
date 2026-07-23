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
