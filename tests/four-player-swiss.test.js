const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadEngine() {
  const window = {};
  const context = {
    window,
    PHDTournament: {
      modules: {
        push() {}
      }
    },
    document: {
      addEventListener() {}
    }
  };

  vm.runInNewContext(
    fs.readFileSync(
      path.join(
        __dirname,
        "..",
        "js",
        "four-player-swiss.js"
      ),
      "utf8"
    ),
    context
  );

  return window.PHDFourPlayerSwiss;
}

function createTeams(count = 8) {
  return Array.from(
    { length: count },
    (_, index) => ({
      id: `team-${index + 1}`,
      name: `Team ${index + 1}`
    })
  );
}

function createIds() {
  let value = 0;
  return () => `id-${++value}`;
}

function completeRound(
  round,
  placementsByGroup
) {
  round.groups.forEach(
    (group, groupIndex) => {
      group.competitors.forEach(
        (
          competitor,
          competitorIndex
        ) => {
          competitor.placement =
            placementsByGroup[
              groupIndex
            ][competitorIndex];
        }
      );
      group.completed = true;
    }
  );
  round.completed = true;
  return round;
}

test("creates exact groups of four", () => {
  const engine = loadEngine();
  const round = engine.createRound({
    teams: createTeams(8),
    createId: createIds(),
    now: () =>
      "2026-07-25T00:00:00Z",
    gameId: "game"
  });

  assert.equal(round.number, 1);
  assert.equal(
    round.groups.length,
    2
  );
  assert.deepEqual(
    Array.from(
      round.groups,
      group =>
        group.competitors.length
    ),
    [4, 4]
  );
  assert.equal(
    round.groups.flatMap(
      group => group.competitors
    ).length,
    8
  );
});

test("rejects entrant totals that cannot form groups of four", () => {
  const engine = loadEngine();

  assert.throws(
    () =>
      engine.createRound({
        teams: createTeams(6),
        createId: createIds(),
        now: () => ""
      }),
    /multiple of four/
  );
});

test("scores placements and ranks by Swiss points", () => {
  const engine = loadEngine();
  const teams = createTeams(4);
  const round = engine.createRound({
    teams,
    createId: createIds(),
    now: () => ""
  });

  completeRound(
    round,
    [[2, 1, 4, 3]]
  );

  const standings =
    engine.calculateStandings(
      teams,
      [round]
    );

  assert.deepEqual(
    Array.from(
      standings,
      standing => [
        standing.teamId,
        standing.points,
        standing.position
      ]
    ),
    [
      ["team-2", 4, 1],
      ["team-1", 3, 2],
      ["team-4", 2, 3],
      ["team-3", 1, 4]
    ]
  );
});

test("uses updated Swiss ranking to form the next round", () => {
  const engine = loadEngine();
  const teams = createTeams(8);
  const first =
    engine.createRound({
      teams,
      createId: createIds(),
      now: () => ""
    });

  completeRound(first, [
    [1, 2, 3, 4],
    [1, 2, 3, 4]
  ]);

  const standings =
    engine.calculateStandings(
      teams,
      [first]
    );

  const second =
    engine.createRound({
      teams,
      rounds: [first],
      createId: createIds(),
      now: () => ""
    });

  assert.deepEqual(
    Array.from(
      second.groups[0]
        .competitors,
      competitor =>
        competitor.teamId
    ),
    Array.from(
      standings.slice(0, 4),
      standing =>
        standing.teamId
    )
  );
});

test("requires the current round to be completed", () => {
  const engine = loadEngine();
  const teams = createTeams(4);
  const first =
    engine.createRound({
      teams,
      createId: createIds(),
      now: () => ""
    });

  assert.throws(
    () =>
      engine.createRound({
        teams,
        rounds: [first],
        createId: createIds(),
        now: () => ""
      }),
    /Complete the current/
  );
});

test("creates player-level placements while keeping office console groups together", () => {
  const engine = loadEngine();
  const teams = createTeams(3);
  const round = engine.createRound({
    teams,
    lobbyEntries: [[
      {
        officeId: "team-1",
        competitorCount: 2
      },
      {
        officeId: "team-2",
        competitorCount: 1
      },
      {
        officeId: "team-3",
        competitorCount: 1
      }
    ]],
    createId: createIds(),
    now: () => ""
  });

  assert.deepEqual(
    round.groups[0].competitors.map(item => [
      item.teamId,
      item.playerLabel
    ]),
    [
      ["team-1", "Player A"],
      ["team-1", "Player B"],
      ["team-2", "Player A"],
      ["team-3", "Player A"]
    ]
  );

  completeRound(round, [[1, 4, 2, 3]]);
  const standings = engine.calculateStandings(teams, [round]);
  assert.equal(
    standings.find(item => item.teamId === "team-1").points,
    5
  );
});

test("rejects player-level Swiss lobbies that are not exactly four players", () => {
  const engine = loadEngine();
  assert.throws(
    () => engine.createRound({
      teams: createTeams(2),
      lobbyEntries: [[
        { officeId: "team-1", competitorCount: 2 },
        { officeId: "team-2", competitorCount: 1 }
      ]],
      createId: createIds(),
      now: () => ""
    }),
    /exactly four players/
  );
});
