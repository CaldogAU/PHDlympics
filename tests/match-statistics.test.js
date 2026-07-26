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
      }
    ]
  };
}

test("Grand Prix and completed 4-player groups count as four matches", () => {
  assert.equal(
    calculate(createState()),
    9
  );
});

test("team match totals use the same four-match weighting", () => {
  assert.equal(
    calculate(createState(), "a"),
    9
  );
  assert.equal(
    calculate(createState(), "c"),
    8
  );
});
