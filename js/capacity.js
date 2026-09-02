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

  function normaliseConsoleEntries(
    consoleEntries,
    competitorEntries = {},
    capacity = LEGACY_CAPACITY
  ) {
    const legacyEntries = normaliseCompetitorEntries(
      competitorEntries
    );
    const source = consoleEntries &&
      typeof consoleEntries === "object" &&
      !Array.isArray(consoleEntries)
      ? consoleEntries
      : {};
    const teamIds = new Set([
      ...Object.keys(legacyEntries),
      ...Object.keys(source)
    ]);

    return Object.fromEntries(
      [...teamIds].map(teamId => {
        const saved = Array.isArray(source[teamId])
          ? source[teamId]
          : [legacyEntries[teamId] || 0];
        const counts = saved
          .slice(0, 9)
          .map(value =>
            Number.isInteger(Number(value)) &&
            Number(value) >= 0
              ? Number(value)
              : 0
          );

        return [
          String(teamId),
          counts.length ? counts : [0]
        ];
      })
    );
  }

  function getCompetitorTotals(consoleEntries) {
    return Object.fromEntries(
      Object.entries(consoleEntries).map(
        ([teamId, counts]) => [
          teamId,
          counts.reduce(
            (total, count) => total + Number(count || 0),
            0
          )
        ]
      )
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
    const previousConsoleEntries =
      JSON.stringify(game.consoleEntries || null);

    game.capacity = normaliseCapacity(
      game.capacity,
      options
    );
    game.consoleEntries = normaliseConsoleEntries(
      game.consoleEntries,
      game.competitorEntries,
      game.capacity
    );
    game.competitorEntries = getCompetitorTotals(
      game.consoleEntries
    );

    return previousCapacity !== JSON.stringify(game.capacity) ||
      previousEntries !== JSON.stringify(game.competitorEntries) ||
      previousConsoleEntries !== JSON.stringify(game.consoleEntries);
  }

  function getEntryValidation(game, teams = []) {
    const capacity = normaliseCapacity(
      game && game.capacity
    );
    const consoleEntries = normaliseConsoleEntries(
      game && game.consoleEntries,
      game && game.competitorEntries,
      capacity
    );
    const teamIds = new Set(
      teams.map(team => String(team.id))
    );
    const errors = [];

    Object.entries(consoleEntries).forEach(([teamId, counts]) => {
      if (!teamIds.has(teamId)) return;
      if (counts.length < 1 || counts.length > 9) {
        errors.push(`${teamId} must use between 1 and 9 consoles.`);
      }
      counts.forEach((count, consoleIndex) => {
        if (count <= capacity.maxPlayersPerConsole) return;
        const team = teams.find(
          item => String(item.id) === teamId
        );
        errors.push(
          `${team ? team.name : teamId} Console ${String.fromCharCode(65 + consoleIndex)} has ${count} competitors, above the per-console limit of ${capacity.maxPlayersPerConsole}.`
        );
      });
    });

    return {
      valid: errors.length === 0,
      errors,
      capacity,
      entries: getCompetitorTotals(consoleEntries),
      consoleEntries
    };
  }

  function getActiveEntries(game, teams = []) {
    const capacity = normaliseCapacity(
      game && game.capacity
    );
    const consoleEntries = normaliseConsoleEntries(
      game && game.consoleEntries,
      game && game.competitorEntries,
      capacity
    );

    return teams.flatMap(team => {
      let playerStartIndex = 0;
      return (consoleEntries[team.id] || [0])
        .map((competitorCount, consoleIndex) => {
          const country = typeof getOfficeById === "function"
            ? getOfficeById(team.officeId)
            : null;
          const entry = {
            officeId: String(team.id),
            officeName: String(team.name || team.id),
            ...(country ? { countryName: String(country.name || "") } : {}),
            entryId: `${team.id}:console-${consoleIndex + 1}`,
            consoleIndex,
            consoleLabel: `Console ${String.fromCharCode(65 + consoleIndex)}`,
            playerStartIndex,
            competitorCount: Number(competitorCount) || 0
          };
          playerStartIndex += entry.competitorCount;
          return entry;
        })
        .filter(entry => entry.competitorCount > 0);
    });
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
      .map(lobby => lobby.entries.map(entry => entry.entryId).sort().join(","))
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
    const priorityCountries = new Set(["singapore", "malaysia", "thailand"]);
    const priorityCounts = lobbies.map(lobby =>
      lobby.entries.reduce(
        (count, entry) => count + (
          priorityCountries.has(String(entry.countryName || "").trim().toLowerCase())
            ? entry.competitorCount
            : 0
        ),
        0
      )
    );
    const missingPriorityLobbies = priorityCounts.filter(count => count === 0).length;
    const priorityAverage = priorityCounts.reduce((sum, value) => sum + value, 0) /
      lobbies.length;

    return [
      missingPriorityLobbies,
      priorityCounts.reduce(
        (sum, value) => sum + ((value - priorityAverage) ** 2),
        0
      ),
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
        entryA.entryId.localeCompare(entryB.entryId)
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
        countryName: String(entry.countryName || ""),
        entryId: String(entry.entryId || entry.officeId || ""),
        consoleIndex: Number(entry.consoleIndex) || 0,
        consoleLabel: String(entry.consoleLabel || "Console A"),
        playerStartIndex: Number(entry.playerStartIndex) || 0,
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
    normaliseConsoleEntries,
    getCompetitorTotals,
    normaliseGame,
    getEntryValidation,
    getActiveEntries,
    getEligibleTeams,
    allocateLobbies,
    modeUsesLobbyAllocation
  });
})(typeof window === "undefined" ? globalThis : window);
