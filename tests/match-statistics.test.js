const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function calculate(state, teamId = "") {
  const context = {
    PHDTournament: {
      state,
      modules: []
    }
  };

  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "statistics.js"
      ),
      "utf8"
    ),
    context
  );

  context.teamId = teamId;

  return vm.runInNewContext(
    "getCompletedMatchCount(teamId)",
    context
  );
}

function createState() {
  return {
    rounds: [
      {
        matches: [
          {
            teamAId: "a",
            teamBId: "b",
            completed: true
          },
          {
            teamAId: "c",
            teamBId: "d",
            completed: false
          }
        ]
      }
    ],
    events: [
      {
        mode: "grand-prix",
        completed: true,
        results: [
          { teamId: "a" },
          { teamId: "b" },
          { teamId: "c" },
          { teamId: "d" }
        ]
      },
      {
        mode: "time-trial",
        completed: true,
        results: [
          { teamId: "a" }
        ]
      }
    ],
    games: [
      {
        mode: "four-player-swiss",
        fourPlayerSwiss: {
          rounds: [
            {
              groups: [
                {
                  completed: true,
                  competitors: [
                    { teamId: "a" },
                    { teamId: "b" },
                    { teamId: "c" },
                    { teamId: "d" }
                  ]
                },
                {
                  completed: false,
                  competitors: []
                }
              ]
            }
          ]
        }
      },
      {
        mode: "fall-guys-grand-prix",
        fallGuysGrandPrix: {
          heats: [
            {
              completed: true,
              results: [
                { teamId: "a" },
                { teamId: "b" },
                { teamId: "c" },
                { teamId: "d" }
              ]
            }
          ]
        }
      }
    ]
  };
}

test("multiplayer modes contribute to matches played", () => {
  assert.equal(
    calculate(createState()),
    11
  );
});

test("team match totals use the same four-match weighting", () => {
  assert.equal(
    calculate(createState(), "a"),
    11
  );
  assert.equal(
    calculate(createState(), "c"),
    9
  );
});

test("event modes count each completed team round once regardless of player count", () => {
  const state = { rounds: [], games: [], events: [
    ...["time-trial", "runbow-offline", "pico-park-attempts"].map(mode => ({
      mode, completed: true, results: [{ teamId: "a" }, { teamId: "a" }, { teamId: "b" }]
    })),
    { mode: "runbow-offline", completed: false, results: [{ teamId: "a" }] }
  ] };
  assert.equal(calculate(state), 3);
  assert.equal(calculate(state, "a"), 3);
  assert.equal(calculate(state, "missing"), 0);
});
