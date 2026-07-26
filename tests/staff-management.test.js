const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

function read(relativePath) {
  return fs.readFileSync(
    path.join(
      __dirname,
      "..",
      relativePath
    ),
    "utf8"
  );
}

test("provides staff management on the Admin page", () => {
  const html = read("index.html");
  const staff =
    read(
      "js/staff-management.js"
    );

  assert.match(
    html,
    /id="staffManagementForm"/
  );
  assert.match(
    html,
    /id="staffEmail"/
  );
  assert.match(
    html,
    /id="staffPassword"/
  );
  assert.match(
    html,
    /id="staffTeam"/
  );
  assert.match(
    staff,
    /createUserWithEmailAndPassword/
  );
  assert.match(
    staff,
    /staff-account-\$\{Date\.now\(\)\}/
  );
});

test("does not persist staff passwords", () => {
  const staff =
    read(
      "js/staff-management.js"
    );
  const firestoreWrite =
    staff.match(
      /setDoc\(staffReference,\s*\{([\s\S]*?)\}\);/
    );

  assert.ok(firestoreWrite);
  assert.doesNotMatch(
    firestoreWrite[1],
    /password/i
  );
});

test("resolves managed staff from Firestore", () => {
  const auth = read("js/auth.js");

  assert.match(
    auth,
    /"staff",\s*user\.uid/
  );
  assert.match(
    auth,
    /staff\.active === true/
  );
  assert.match(
    auth,
    /staff\.teamId/
  );
  assert.match(
    auth,
    /"tournament-director"/
  );
});

test("limits tournament reset to its dedicated capability", () => {
  const app = read("js/app.js");
  const storage =
    read("js/storage.js");

  assert.match(
    app,
    /canTournament\(\s*"tournament\.reset"/
  );
  assert.match(
    storage,
    /canTournament\(\s*"tournament\.reset"/
  );
});

test("protects managed staff records in Firestore rules", () => {
  const rules =
    read("firestore.rules");

  assert.match(
    rules,
    /match \/staff\/\{staffId\}/
  );
  assert.match(
    rules,
    /function isManagedStaff\(\)/
  );
  assert.match(
    rules,
    /request\.resource\.data\.role == "tournament-director"/
  );
  assert.match(
    rules,
    /request\.resource\.data\.teamId is string/
  );
  assert.match(
    rules,
    /allow create, update: if isRootAdministrator\(\)/
  );
  assert.match(
    rules,
    /allow delete: if false/
  );
});
