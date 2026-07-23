const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadSwissEngine() {
  const source = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "swiss-engine.js"
    ),
    "utf8"
  );
  const window = {};

  vm.runInNewContext(source, {
    window
  });

  return window.PHDSwissEngine;
}

function createTeam(
  id,
  points = 0
) {
  return {
    id,
    name: `Team ${id}`,
    points,
    pointsFor: points * 10,
    pointsAgainst: 0
  };
}

function createRoundFactory() {
  let nextId = 1;

  return {
    createId() {
      const id = `id-${nextId}`;
      nextId += 1;
      return id;
    },
    now() {
      return "2026-07-23T00:00:00.000Z";
    }
  };
}

function createRound(
  engine,
  teams,
  rounds = []
) {
  return engine.createRound({
    teams,
    standings: teams,
    rounds,
    ...createRoundFactory()
  });
}

test("pairs every team exactly once in an even field", () => {
  const engine = loadSwissEngine();
  const teams = [
    createTeam("a", 6),
    createTeam("b", 6),
    createTeam("c", 3),
    createTeam("d", 3)
  ];
  const round = createRound(
    engine,
    teams
  );
  const pairedTeamIds =
    round.matches.flatMap(match => [
      match.teamAId,
      match.teamBId
    ]);

  assert.equal(
    round.matches.length,
    2
  );
  assert.equal(
    new Set(pairedTeamIds).size,
    4
  );
  assert.equal(
    round.matches.some(
      match => match.bye
    ),
    false
  );
});

test("avoids rematches when fresh opponents are available", () => {
  const engine = loadSwissEngine();
  const teams = [
    createTeam("a"),
    createTeam("b"),
    createTeam("c"),
    createTeam("d")
  ];
  const previousRound = {
    matches: [
      {
        teamAId: "a",
        teamBId: "b",
        bye: false
      },
      {
        teamAId: "c",
        teamBId: "d",
        bye: false
      }
    ]
  };
  const round = createRound(
    engine,
    teams,
    [
      previousRound
    ]
  );
  const previousPairs = new Set([
    engine.buildPairKey(
      "a",
      "b"
    ),
    engine.buildPairKey(
      "c",
      "d"
    )
  ]);

  round.matches.forEach(match => {
    assert.equal(
      previousPairs.has(
        engine.buildPairKey(
          match.teamAId,
          match.teamBId
        )
      ),
      false
    );
  });
});

test("rotates byes away from teams that already received one", () => {
  const engine = loadSwissEngine();
  const teams = [
    createTeam("a", 6),
    createTeam("b", 3),
    createTeam("c", 0)
  ];
  const previousRound = {
    matches: [
      {
        teamAId: "c",
        teamBId: null,
        bye: true
      },
      {
        teamAId: "a",
        teamBId: "b",
        bye: false
      }
    ]
  };
  const round = createRound(
    engine,
    teams,
    [
      previousRound
    ]
  );
  const byeMatch =
    round.matches.find(
      match => match.bye
    );

  assert.ok(byeMatch);
  assert.equal(
    byeMatch.teamAId,
    "b"
  );
  assert.equal(
    byeMatch.completed,
    true
  );
  assert.equal(
    byeMatch.winnerId,
    "b"
  );
});

test("requires complete standings and deterministic adapters", () => {
  const engine = loadSwissEngine();
  const teams = [
    createTeam("a"),
    createTeam("b")
  ];

  assert.throws(
    () =>
      engine.createRound({
        teams,
        standings: [
          teams[0]
        ],
        rounds: [],
        ...createRoundFactory()
      }),
    /standings must include every team/
  );

  assert.throws(
    () =>
      engine.createRound({
        teams,
        standings: teams,
        rounds: []
      }),
    /requires createId and now/
  );
});
