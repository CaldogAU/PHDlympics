(function initialiseGameCapacity(global) {
  "use strict";

  const DEFAULT_NEW_GAME_CAPACITY = Object.freeze({
    maxPlayersPerConsole: 1,
    maxPlayersPerLobby: 8,
    configured: true
  });

  const LEGACY_CAPACITY = Object.freeze({
    maxPlayersPerConsole: 1,
    maxPlayersPerLobby: 1,
    configured: false
  });

  const LOBBY_MODE_IDS = Object.freeze([
    "swiss",
    "four-player-swiss",
    "grand-prix",
    "fall-guys-grand-prix"
  ]);

  function toPositiveWholeNumber(value) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0
      ? number
      : null;
  }

  function validateCapacity(capacity) {
    const maxPlayersPerConsole =
      toPositiveWholeNumber(
        capacity && capacity.maxPlayersPerConsole
      );
    const maxPlayersPerLobby =
      toPositiveWholeNumber(
        capacity && capacity.maxPlayersPerLobby
      );

    if (!maxPlayersPerConsole) {
      return {
        valid: false,
        error: "Maximum players per console must be a positive whole number."
      };
    }

    if (!maxPlayersPerLobby) {
      return {
        valid: false,
        error: "Maximum players per lobby must be a positive whole number."
      };
    }

    if (maxPlayersPerConsole > maxPlayersPerLobby) {
      return {
        valid: false,
        error: "Maximum players per console cannot exceed the lobby capacity."
      };
    }

    return {
      valid: true,
      value: {
        maxPlayersPerConsole,
        maxPlayersPerLobby,
        configured:
          capacity.configured !== false
      }
    };
  }

  function normaliseCapacity(capacity, options = {}) {
    const fallback = options.forNewGame
      ? DEFAULT_NEW_GAME_CAPACITY
      : LEGACY_CAPACITY;
    const validation =
      validateCapacity(capacity);

    return validation.valid
      ? validation.value
      : { ...fallback };
  }

  function normaliseCompetitorEntries(entries) {
    if (!entries || typeof entries !== "object" || Array.isArray(entries)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(entries)
        .map(([teamId, value]) => [
          String(teamId),
          Number.isInteger(Number(value)) && Number(value) >= 0
            ? Number(value)
            : 0
        ])
    );
  }

  function normaliseGame(game, options = {}) {
    if (!game || typeof game !== "object") {
      return false;
    }

    const previousCapacity =
      JSON.stringify(game.capacity || null);
    const previousEntries =
      JSON.stringify(game.competitorEntries || null);

    game.capacity = normaliseCapacity(
      game.capacity,
      options
    );
    game.competitorEntries =
      normaliseCompetitorEntries(
        game.competitorEntries
      );

    return previousCapacity !== JSON.stringify(game.capacity) ||
      previousEntries !== JSON.stringify(game.competitorEntries);
  }

  function getEntryValidation(game, teams = []) {
    const capacity = normaliseCapacity(
      game && game.capacity
    );
    const entries = normaliseCompetitorEntries(
      game && game.competitorEntries
    );
    const teamIds = new Set(
      teams.map(team => String(team.id))
    );
    const errors = [];

    Object.entries(entries).forEach(([teamId, count]) => {
      if (!teamIds.has(teamId)) return;
      if (count > capacity.maxPlayersPerConsole) {
        const team = teams.find(
          item => String(item.id) === teamId
        );
        errors.push(
          `${team ? team.name : teamId} has ${count} competitors, above the per-console limit of ${capacity.maxPlayersPerConsole}.`
        );
      }
    });

    return {
      valid: errors.length === 0,
      errors,
      capacity,
      entries
    };
  }

  function getActiveEntries(game, teams = []) {
    const entries = normaliseCompetitorEntries(
      game && game.competitorEntries
    );

    return teams
      .map(team => ({
        officeId: String(team.id),
        officeName: String(team.name || team.id),
        competitorCount:
          Number(entries[team.id]) || 0
      }))
      .filter(entry => entry.competitorCount > 0);
  }

  function getEligibleTeams(game, teams = []) {
    const capacity = normaliseCapacity(
      game && game.capacity
    );
    if (!capacity.configured) {
      return [...teams];
    }

    const enteredTeamIds = new Set(
      getActiveEntries(game, teams)
        .map(entry => entry.officeId)
    );

    return teams.filter(team =>
      enteredTeamIds.has(String(team.id))
    );
  }

  function compareObjective(candidate, best) {
    if (!best) return -1;
    for (let index = 0; index < candidate.length; index += 1) {
      if (candidate[index] < best[index]) return -1;
      if (candidate[index] > best[index]) return 1;
    }
    return 0;
  }

  function getLobbyObjective(lobbies) {
    const totals = lobbies.map(lobby => lobby.total);
    const counts = lobbies.map(lobby => lobby.entries.length);
    const total = totals.reduce((sum, value) => sum + value, 0);
    const average = total / lobbies.length;
    const countAverage = counts.reduce((sum, value) => sum + value, 0) /
      lobbies.length;
    const signature = lobbies
      .map(lobby => lobby.entries.map(entry => entry.officeId).sort().join(","))
      .sort()
      .join("|");
    const rankSpread = lobbies.reduce(
      (sum, lobby) => {
        const ranks = lobby.entries
          .map(entry => Number(entry.rankIndex))
          .filter(Number.isFinite);
        return sum + (
          ranks.length > 1
            ? Math.max(...ranks) - Math.min(...ranks)
            : 0
        );
      },
      0
    );

    return [
      Math.max(...totals) - Math.min(...totals),
      totals.reduce((sum, value) => sum + ((value - average) ** 2), 0),
      Math.max(...counts) - Math.min(...counts),
      counts.reduce((sum, value) => sum + ((value - countAverage) ** 2), 0),
      rankSpread,
      signature
    ];
  }

  function findBestAllocation(entries, lobbyCount, capacity) {
    const sortedEntries = [...entries].sort(
      (entryA, entryB) =>
        entryB.competitorCount - entryA.competitorCount ||
        (Number(entryA.rankIndex) || 0) - (Number(entryB.rankIndex) || 0) ||
        entryA.officeId.localeCompare(entryB.officeId)
    );
    const lobbies = Array.from(
      { length: lobbyCount },
      () => ({ total: 0, entries: [] })
    );
    let best = null;
    let bestObjective = null;
    let visited = 0;
    const VISIT_LIMIT = 250000;

    function search(entryIndex) {
      visited += 1;
      if (visited > VISIT_LIMIT) return;

      if (entryIndex === sortedEntries.length) {
        if (lobbies.some(lobby => lobby.entries.length === 0)) return;
        const objective = getLobbyObjective(lobbies);
        if (compareObjective(objective, bestObjective) < 0) {
          bestObjective = objective;
          best = structuredClone(lobbies);
        }
        return;
      }

      const entry = sortedEntries[entryIndex];
      const lobbyOrder = lobbies
        .map((lobby, index) => ({ lobby, index }))
        .filter(({ lobby }) => lobby.total + entry.competitorCount <= capacity)
        .sort((itemA, itemB) =>
          itemA.lobby.total - itemB.lobby.total ||
          itemA.lobby.entries.length - itemB.lobby.entries.length ||
          itemA.index - itemB.index
        );
      const seenStates = new Set();

      for (const { lobby } of lobbyOrder) {
        const stateKey = `${lobby.total}:${lobby.entries.length}`;
        if (seenStates.has(stateKey)) continue;
        seenStates.add(stateKey);
        lobby.entries.push(entry);
        lobby.total += entry.competitorCount;
        search(entryIndex + 1);
        lobby.total -= entry.competitorCount;
        lobby.entries.pop();
      }
    }

    search(0);
    return best;
  }

  function allocateLobbies({ entries = [], maxPlayersPerLobby } = {}) {
    const capacity = toPositiveWholeNumber(maxPlayersPerLobby);
    if (!capacity) {
      return {
        valid: false,
        error: "Maximum players per lobby must be a positive whole number.",
        lobbies: []
      };
    }

    const groups = entries
      .map(entry => ({
        officeId: String(entry.officeId || ""),
        officeName: String(entry.officeName || entry.officeId || "Office"),
        competitorCount: Number(entry.competitorCount),
        rankIndex: Number.isFinite(Number(entry.rankIndex))
          ? Number(entry.rankIndex)
          : null
      }))
      .filter(entry => Number.isInteger(entry.competitorCount) && entry.competitorCount > 0);

    const invalid = groups.find(
      entry => entry.competitorCount > capacity
    );
    if (invalid) {
      return {
        valid: false,
        error: `${invalid.officeName} enters ${invalid.competitorCount} competitors, which exceeds the lobby capacity of ${capacity}.`,
        lobbies: []
      };
    }

    const totalCompetitors = groups.reduce(
      (sum, entry) => sum + entry.competitorCount,
      0
    );
    if (groups.length === 0) {
      return {
        valid: true,
        empty: true,
        totalCompetitors: 0,
        lobbyCount: 0,
        lobbies: []
      };
    }

    const minimumLobbyCount = Math.max(
      1,
      Math.ceil(totalCompetitors / capacity)
    );
    let allocation = null;

    for (
      let lobbyCount = minimumLobbyCount;
      lobbyCount <= groups.length;
      lobbyCount += 1
    ) {
      allocation = findBestAllocation(groups, lobbyCount, capacity);
      if (allocation) break;
    }

    if (!allocation) {
      return {
        valid: false,
        error: "The office console groups cannot be allocated within the configured lobby capacity.",
        lobbies: []
      };
    }

    const ordered = allocation.sort((lobbyA, lobbyB) =>
      lobbyB.total - lobbyA.total ||
      lobbyA.entries[0].officeId.localeCompare(lobbyB.entries[0].officeId)
    );

    return {
      valid: true,
      empty: false,
      totalCompetitors,
      lobbyCount: ordered.length,
      lobbies: ordered.map((lobby, index) => ({
        id: `lobby-${index + 1}`,
        name: `Lobby ${index + 1}`,
        competitorTotal: lobby.total,
        officeCount: lobby.entries.length,
        entries: lobby.entries
      }))
    };
  }

  function modeUsesLobbyAllocation(modeId) {
    return LOBBY_MODE_IDS.includes(String(modeId || "swiss"));
  }

  global.PHDGameCapacity = Object.freeze({
    DEFAULT_NEW_GAME_CAPACITY,
    LEGACY_CAPACITY,
    LOBBY_MODE_IDS,
    toPositiveWholeNumber,
    validateCapacity,
    normaliseCapacity,
    normaliseCompetitorEntries,
    normaliseGame,
    getEntryValidation,
    getActiveEntries,
    getEligibleTeams,
    allocateLobbies,
    modeUsesLobbyAllocation
  });
})(typeof window === "undefined" ? globalThis : window);
