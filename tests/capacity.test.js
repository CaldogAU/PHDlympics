const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

function loadCapacity() {
  const context = {
    structuredClone
  };
  vm.runInNewContext(
    fs.readFileSync(
      path.join(__dirname, "..", "js", "capacity.js"),
      "utf8"
    ),
    context
  );
  return context.PHDGameCapacity;
}

function onePlayerEntries(count) {
  return Array.from({ length: count }, (_, index) => ({
    officeId: `office-${String(index + 1).padStart(2, "0")}`,
    officeName: `Office ${index + 1}`,
    competitorCount: 1
  }));
}

test("normalises legacy games with an explicit conservative fallback", () => {
  const capacity = loadCapacity();
  const game = { id: "legacy" };
  capacity.normaliseGame(game);
  assert.deepEqual(
    JSON.parse(JSON.stringify(game.capacity)),
    {
      maxPlayersPerConsole: 1,
      maxPlayersPerLobby: 1,
      configured: false
    }
  );
  assert.deepEqual(
    JSON.parse(JSON.stringify(game.competitorEntries)),
    {}
  );
});

test("validates positive whole-number capacity and entry limits", () => {
  const capacity = loadCapacity();
  assert.equal(
    capacity.validateCapacity({
      maxPlayersPerConsole: 0,
      maxPlayersPerLobby: 12
    }).valid,
    false
  );
  assert.equal(
    capacity.validateCapacity({
      maxPlayersPerConsole: 2,
      maxPlayersPerLobby: 12
    }).valid,
    true
  );
  const validation = capacity.getEntryValidation(
    {
      capacity: {
        maxPlayersPerConsole: 2,
        maxPlayersPerLobby: 12
      },
      competitorEntries: { alpha: 3 }
    },
    [{ id: "alpha", name: "Alpha" }]
  );
  assert.equal(validation.valid, false);
  assert.match(validation.errors[0], /above the per-console limit/);
});

test("balances fourteen one-player entries into seven and seven", () => {
  const result = loadCapacity().allocateLobbies({
    entries: onePlayerEntries(14),
    maxPlayersPerLobby: 12
  });
  assert.equal(result.valid, true);
  assert.deepEqual(
    Array.from(result.lobbies, lobby => lobby.competitorTotal),
    [7, 7]
  );
});

test("balances twenty-five one-player entries into nine, eight and eight", () => {
  const result = loadCapacity().allocateLobbies({
    entries: onePlayerEntries(25),
    maxPlayersPerLobby: 12
  });
  assert.equal(result.valid, true);
  assert.deepEqual(
    Array.from(result.lobbies, lobby => lobby.competitorTotal),
    [9, 8, 8]
  );
});

test("keeps seven two-player console groups intact", () => {
  const entries = "ABCDEFG".split("").map(letter => ({
    officeId: letter,
    officeName: letter,
    competitorCount: 2
  }));
  const result = loadCapacity().allocateLobbies({
    entries,
    maxPlayersPerLobby: 12
  });
  assert.deepEqual(
    Array.from(result.lobbies, lobby => lobby.competitorTotal),
    [8, 6]
  );
  assert.equal(
    result.lobbies.flatMap(lobby => lobby.entries).length,
    7
  );
});

test("finds an exact seven-seven split for mixed one and two-player groups", () => {
  const counts = [2, 2, 2, 2, 1, 1, 1, 1, 1, 1];
  const result = loadCapacity().allocateLobbies({
    entries: counts.map((competitorCount, index) => ({
      officeId: `office-${index}`,
      competitorCount
    })),
    maxPlayersPerLobby: 12
  });
  assert.deepEqual(
    Array.from(result.lobbies, lobby => lobby.competitorTotal),
    [7, 7]
  );
});

test("rejects an indivisible group larger than the lobby", () => {
  const result = loadCapacity().allocateLobbies({
    entries: [{
      officeId: "alpha",
      officeName: "Alpha",
      competitorCount: 4
    }],
    maxPlayersPerLobby: 3
  });
  assert.equal(result.valid, false);
  assert.match(result.error, /exceeds the lobby capacity/);
});

test("returns a clear empty allocation when every office enters zero", () => {
  const result = loadCapacity().allocateLobbies({
    entries: [{ officeId: "alpha", competitorCount: 0 }],
    maxPlayersPerLobby: 12
  });
  assert.equal(result.valid, true);
  assert.equal(result.empty, true);
  assert.equal(result.lobbyCount, 0);
  assert.deepEqual(Array.from(result.lobbies), []);
});

test("allocation is deterministic and favours adjacent Swiss ranks", () => {
  const capacity = loadCapacity();
  const entries = onePlayerEntries(8).map((entry, rankIndex) => ({
    ...entry,
    rankIndex
  }));
  const first = capacity.allocateLobbies({
    entries,
    maxPlayersPerLobby: 4
  });
  const second = capacity.allocateLobbies({
    entries,
    maxPlayersPerLobby: 4
  });
  assert.deepEqual(
    JSON.parse(JSON.stringify(first)),
    JSON.parse(JSON.stringify(second))
  );
  const rankSets = first.lobbies.map(lobby =>
    lobby.entries.map(entry => entry.rankIndex).sort((a, b) => a - b)
  );
  assert.deepEqual(rankSets, [[0, 1, 2, 3], [4, 5, 6, 7]]);
});

test("reports lobby compatibility without forcing it onto every mode", () => {
  const capacity = loadCapacity();
  assert.equal(capacity.modeUsesLobbyAllocation("swiss"), true);
  assert.equal(capacity.modeUsesLobbyAllocation("grand-prix"), true);
  assert.equal(capacity.modeUsesLobbyAllocation("time-trial"), false);
  assert.equal(capacity.modeUsesLobbyAllocation("round-robin"), false);
  assert.equal(capacity.modeUsesLobbyAllocation("single-elimination"), false);
});
