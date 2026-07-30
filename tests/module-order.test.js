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
  const fourPlayerSwissIndex =
    html.indexOf(
      'src="js/four-player-swiss.js"'
    );
  const fallGuysIndex =
    html.indexOf(
      'src="js/fall-guys-grand-prix.js"'
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
    fourPlayerSwissIndex,
    -1
  );
  assert.notEqual(
    roundsIndex,
    -1
  );
  assert.notEqual(
    fallGuysIndex,
    -1
  );
  assert.ok(
    swissEngineIndex <
      gameModesIndex
  );
  assert.ok(
    fourPlayerSwissIndex <
      gameModesIndex
  );
  assert.ok(
    fallGuysIndex <
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

test("marks Admin and Games navigation as administrator-only", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const auth = fs.readFileSync(path.join(root, "js", "auth.js"), "utf8");

  assert.match(html, /data-tab="admin" hidden/);
  assert.match(html, /data-tab="games" hidden/);
  assert.match(app, /\["admin", "games"\]/);
  assert.match(auth, /\.admin-only-tab, #adminTab, #gamesTab/);
});

test("loads staff management after Firebase authentication", () => {
  const html = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );
  const authIndex =
    html.indexOf(
      'src="js/auth.js"'
    );
  const staffIndex =
    html.indexOf(
      'src="js/staff-management.js"'
    );

  assert.notEqual(authIndex, -1);
  assert.notEqual(staffIndex, -1);
  assert.ok(authIndex < staffIndex);
});

test("does not expose the legacy game format field", () => {
  const html = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );
  const games = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "games.js"
    ),
    "utf8"
  );

  assert.doesNotMatch(
    html,
    /id="gameFormat"/
  );
  assert.doesNotMatch(
    games,
    /getValue\("gameFormat"\)/
  );
});

test("shows a top-level workflow for every game mode", () => {
  const app = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "app.js"
    ),
    "utf8"
  );

  [
    "swiss",
    "round-robin",
    "single-elimination",
    "four-player-swiss",
    "time-trial",
    "grand-prix",
    "fall-guys-grand-prix"
  ].forEach(mode => {
    assert.match(
      app,
      new RegExp(
        `"${mode}"|${mode}:`
      )
    );
  });
  assert.match(
    app,
    /class="game-mode-flow"/
  );
  assert.match(
    app,
    /renderGameModeOverview\(\s*game,\s*mode/
  );
  assert.match(
    app,
    /class="game-mode-example"/
  );
  assert.match(
    app,
    /overview\.exampleRows/
  );
  assert.match(
    app,
    /class="game-mode-note"/
  );
});
