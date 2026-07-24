const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function load() {
  const window = {};
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, "..", "js", "access-control.js"), "utf8"),
    { window }
  );
  return window.PHDAccessControl;
}

test("resolves administrator and assigned roles", () => {
  const access = load();
  assert.equal(access.resolveRole({ uid: "owner", administratorUid: "owner" }), "administrator");
  assert.equal(access.resolveRole({ uid: "staff", assignments: { staff: "score-entry" } }), "score-entry");
  assert.equal(access.resolveRole({ uid: "unknown" }), "viewer");
});

test("enforces capabilities by role", () => {
  const access = load();
  assert.equal(access.can("administrator", "games.manage"), true);
  assert.equal(access.can("score-entry", "results.manage"), true);
  assert.equal(access.can("score-entry", "games.manage"), false);
  assert.equal(access.can("display-operator", "display.manage"), true);
});
