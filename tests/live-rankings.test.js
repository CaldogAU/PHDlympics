const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function read(file) {
  return fs.readFileSync(
    path.join(__dirname, "..", file),
    "utf8"
  );
}

function loadEventHelpers({
  scoped = false,
  assignedTeamId = ""
} = {}) {
  const state = {
    teams: [
      { id: "a", name: "Alpha" },
      { id: "b", name: "Bravo" }
    ],
    games: [],
    events: []
  };
  const context = {
    PHDTournament: {
      state,
      modules: []
    },
    document: {
      addEventListener() {}
    },
    isTeamScopedStaff() {
      return scoped;
    },
    getAssignedStaffTeamId() {
      return assignedTeamId;
    }
  };

  vm.runInNewContext(
    read("js/events.js"),
    context
  );

  return {
    state,
    visible(event) {
      context.event = event;
      return vm.runInNewContext(
        "getVisibleEventTeams(event)",
        context
      );
    },
    timeTrialComplete(results) {
      context.results = results;
      return vm.runInNewContext(
        "hasCompleteTimeTrialResults(results)",
        context
      );
    },
    grandPrixComplete(results) {
      context.results = results;
      return vm.runInNewContext(
        "hasCompleteGrandPrixResults(results)",
        context
      );
    }
  };
}

test("Grand Prix and Time Trial render ranks and tournament points", () => {
  const events = read("js/events.js");

  assert.match(
    events,
    /getEventResultPosition/
  );
  assert.match(
    events,
    /event-tournament-points/
  );
  assert.match(
    events,
    /participantCount\s*-\s*position\s*\+\s*1/
  );
});

test("event rows animate into provisional ranking order", () => {
  const events = read("js/events.js");
  const styles = read("styles.css");

  assert.match(
    events,
    /function animateEventRanking/
  );
  assert.match(
    events,
    /row\.animate/
  );
  assert.match(
    styles,
    /rankingRowReveal/
  );
});

test("team-scoped staff receive partial result controls", () => {
  const auth = read("js/auth.js");
  const events = read("js/events.js");
  const swiss = read(
    "js/four-player-swiss.js"
  );

  assert.match(
    auth,
    /function canManageTeamResult/
  );
  assert.match(
    events,
    /getAssignedStaffTeamId/
  );
  assert.match(
    events,
    /mergeEventResult/
  );
  assert.match(
    swiss,
    /scopedTeamId/
  );
});

test("unfinished events expose only the assigned staff team", () => {
  const helpers = loadEventHelpers({
    scoped: true,
    assignedTeamId: "b"
  });

  assert.deepEqual(
    Array.from(
      helpers.visible({
        mode: "grand-prix",
        completed: false,
        results: []
      }),
      team => team.id
    ),
    ["b"]
  );
  assert.deepEqual(
    Array.from(
      helpers.visible({
        mode: "grand-prix",
        completed: true,
        results: [
          {
            teamId: "a",
            finishPosition: 1
          },
          {
            teamId: "b",
            finishPosition: 2
          }
        ]
      }),
      team => team.id
    ),
    ["a", "b"]
  );
});

test("partial event results finalize only when every team is ranked", () => {
  const helpers = loadEventHelpers();

  assert.equal(
    helpers.timeTrialComplete([
      {
        teamId: "a",
        timeMilliseconds: 1000
      }
    ]),
    false
  );
  assert.equal(
    helpers.timeTrialComplete([
      {
        teamId: "a",
        timeMilliseconds: 1000
      },
      {
        teamId: "b",
        timeMilliseconds: 1200
      }
    ]),
    true
  );
  assert.equal(
    helpers.grandPrixComplete([
      {
        teamId: "a",
        finishPosition: 1
      },
      {
        teamId: "b",
        finishPosition: 1
      }
    ]),
    false
  );
  assert.equal(
    helpers.grandPrixComplete([
      {
        teamId: "a",
        finishPosition: 1
      },
      {
        teamId: "b",
        finishPosition: 2
      }
    ]),
    true
  );
});

test("4 Player Swiss recalculates overall tournament points", () => {
  const swiss = read(
    "js/four-player-swiss.js"
  );

  assert.match(
    swiss,
    /awardChampionshipPoints\(\s*tournament\.finalStandings/
  );
});
