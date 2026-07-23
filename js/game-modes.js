(function initialiseGameModes(global) {
  "use strict";

  const DEFAULT_MODE_ID = "swiss";
  const SDK_VERSION = "1.0.0";
  const modes = new Map();

  function normaliseModeId(modeId) {
    return String(modeId || DEFAULT_MODE_ID)
      .trim()
      .toLowerCase();
  }

  function register(mode) {
    if (!mode || typeof mode !== "object") {
      throw new TypeError(
        "A game mode definition is required."
      );
    }

    const id = normaliseModeId(mode.id);
    const displayName = String(
      mode.displayName ||
        mode.name ||
        ""
    ).trim();

    if (!id || !displayName) {
      throw new Error(
        "Game modes require an id and displayName."
      );
    }

    if (
      !/^[a-z0-9]+(?:-[a-z0-9]+)*$/
        .test(id)
    ) {
      throw new Error(
        `Game mode id "${id}" must use lowercase letters, numbers, and single hyphens.`
      );
    }

    if (modes.has(id)) {
      throw new Error(
        `Game mode "${id}" is already registered.`
      );
    }

    const version = String(
      mode.version || "1.0.0"
    ).trim();

    const compatibilityVersion =
      String(
        mode.compatibilityVersion ||
          SDK_VERSION
      ).trim();

    if (
      !version ||
      !compatibilityVersion
    ) {
      throw new Error(
        `Game mode "${id}" requires version and compatibilityVersion metadata.`
      );
    }

    if (
      compatibilityVersion !==
      SDK_VERSION
    ) {
      throw new Error(
        `Game mode "${id}" targets SDK ${compatibilityVersion}; this platform supports SDK ${SDK_VERSION}.`
      );
    }

    const requiredMethods = [
      "getResultEntryType",
      "calculateRankings",
      "calculateChampionshipPoints",
      "areResultsComplete",
      "shouldRevealResults"
    ];

    requiredMethods.forEach(methodName => {
      if (
        typeof mode[methodName] !==
        "function"
      ) {
        throw new Error(
          `Game mode "${id}" must implement ${methodName}().`
        );
      }
    });

    modes.set(id, {
      ...mode,
      id,
      name: displayName,
      displayName,
      description: String(
        mode.description || ""
      ),
      icon: String(
        mode.icon || ""
      ),
      version,
      compatibilityVersion
    });

    return modes.get(id);
  }

  function get(modeId) {
    return (
      modes.get(
        normaliseModeId(modeId)
      ) ||
      modes.get(DEFAULT_MODE_ID)
    );
  }

  function getForGame(game) {
    return get(
      game && game.mode
    );
  }

  function list() {
    return [
      ...modes.values()
    ];
  }

  function has(modeId) {
    return modes.has(
      normaliseModeId(modeId)
    );
  }

  function getRequired(modeId) {
    const id =
      normaliseModeId(modeId);
    const mode = modes.get(id);

    if (!mode) {
      throw new Error(
        `Game mode "${id}" is not registered.`
      );
    }

    return mode;
  }

  function createNextRound(
    modeId,
    context = {}
  ) {
    const mode =
      getRequired(modeId);

    if (
      !mode ||
      typeof mode.createNextRound !==
        "function"
    ) {
      throw new Error(
        `Game mode "${mode ? mode.id : modeId}" does not support round generation.`
      );
    }

    return mode.createNextRound(
      context
    );
  }

  function migrateGames(games) {
    if (!Array.isArray(games)) {
      return false;
    }

    let changed = false;

    games.forEach(game => {
      if (
        !game ||
        typeof game !== "object"
      ) {
        return;
      }

      const requestedMode =
        normaliseModeId(
          game.mode
        );

      const resolvedMode =
        modes.has(requestedMode)
          ? requestedMode
          : DEFAULT_MODE_ID;

      if (
        game.mode !==
        resolvedMode
      ) {
        game.mode =
          resolvedMode;

        changed = true;
      }
    });

    return changed;
  }

  function rankingsMatch(
    rankingA,
    rankingB,
    fields
  ) {
    return fields.every(field => {
      const valueA =
        rankingA &&
        rankingA[field] != null
          ? rankingA[field]
          : null;

      const valueB =
        rankingB &&
        rankingB[field] != null
          ? rankingB[field]
          : null;

      return valueA === valueB;
    });
  }

  function assignPositions(
    rankings,
    tieFields
  ) {
    const fields =
      Array.isArray(tieFields) &&
      tieFields.length > 0
        ? tieFields
        : ["rankValue"];

    return rankings.map(
      (
        entry,
        index,
        allEntries
      ) => {
        const tiedWithPrevious =
          index > 0 &&
          rankingsMatch(
            entry,
            allEntries[
              index - 1
            ],
            fields
          );

        return {
          ...entry,
          position:
            tiedWithPrevious
              ? allEntries[
                  index - 1
                ].position
              : index + 1
        };
      }
    );
  }

  function awardChampionshipPoints(
    rankings
  ) {
    const participantCount =
      rankings.length;

    return rankings.map(
      entry => ({
        ...entry,

        championshipPoints:
          Math.max(
            1,
            participantCount -
              entry.position +
              1
          )
      })
    );
  }

  function buildResult(
    mode,
    context
  ) {
    const rankings =
      mode.calculateRankings(
        context
      ) || [];

    const positionedRankings =
      assignPositions(
        rankings,
        mode.tieFields
      );

    const complete =
      Boolean(
        mode.areResultsComplete(
          context
        )
      );

    const revealResults =
      Boolean(
        mode.shouldRevealResults({
          ...context,
          complete
        })
      );

    return {
      modeId: mode.id,

      complete,

      revealResults,

      leaderboard:
        complete
          ? mode
              .calculateChampionshipPoints(
                positionedRankings,
                context
              )
          : positionedRankings,

      resultEntryType:
        mode.getResultEntryType(
          context
        )
    };
  }

  register({
    id: "swiss",

    name: "Swiss",

    icon: "trophy",

    version: "1.0.0",

    compatibilityVersion:
      SDK_VERSION,

    description:
      "Round-based Swiss pairings with score entry.",

    tieFields: [
      "points",
      "scoreDifference",
      "pointsFor"
    ],

    getResultEntryType() {
      return "match-score";
    },

    createNextRound(context) {
      if (
        typeof global
          .createSwissPairings !==
        "function"
      ) {
        throw new Error(
          "The Swiss pairing engine is not available."
        );
      }

      return global
        .createSwissPairings(
          context
        );
    },

    calculateRankings() {
      if (
        typeof global
          .getStandings !==
        "function"
      ) {
        return [];
      }

      return global
        .getStandings()
        .map(team => ({
          teamId: team.id,

          teamName:
            team.name,

          points:
            team.points,

          wins:
            team.wins,

          draws:
            team.draws,

          losses:
            team.losses,

          byes:
            team.byes,

          pointsFor:
            team.pointsFor,

          pointsAgainst:
            team.pointsAgainst,

          scoreDifference:
            typeof global
              .getScoreDifference ===
            "function"
              ? global
                  .getScoreDifference(
                    team
                  )
              : (
                  team.pointsFor ||
                  0
                ) -
                (
                  team.pointsAgainst ||
                  0
                ),

          rankValue:
            team.points,

          custom: {}
        }));
    },

    calculateChampionshipPoints(
      rankings
    ) {
      return awardChampionshipPoints(
        rankings
      );
    },

    areResultsComplete(
      context
    ) {
      const rounds =
        context &&
        Array.isArray(
          context.rounds
        )
          ? context.rounds
          : [];

      return (
        rounds.length > 0 &&
        rounds.every(
          round =>
            round.completed
        )
      );
    },

    shouldRevealResults() {
      return true;
    }
  });

  register({
    id: "time-trial",

    name: "Time Trial",

    icon: "timer",

    version: "1.0.0",

    compatibilityVersion:
      SDK_VERSION,

    description:
      "Each team submits a completion time; fastest wins.",

    tieFields: [
      "timeMilliseconds"
    ],

    getResultEntryType() {
      return "completion-time";
    },

    calculateRankings(
      context
    ) {
      const submissions =
        context &&
        Array.isArray(
          context.submissions
        )
          ? context.submissions
          : [];

      return submissions
        .filter(result =>
          Number.isFinite(
            Number(
              result.timeMilliseconds
            )
          )
        )
        .map(result => ({
          teamId:
            result.teamId,

          teamName:
            result.teamName ||
            "",

          timeMilliseconds:
            Number(
              result.timeMilliseconds
            ),

          rankValue:
            Number(
              result.timeMilliseconds
            ),

          custom: {
            timeMilliseconds:
              Number(
                result.timeMilliseconds
              )
          }
        }))
        .sort(
          (
            rankingA,
            rankingB
          ) =>
            rankingA
              .timeMilliseconds -
              rankingB
                .timeMilliseconds ||
            rankingA
              .teamName
              .localeCompare(
                rankingB
                  .teamName
              )
        );
    },

    calculateChampionshipPoints(
      rankings
    ) {
      return awardChampionshipPoints(
        rankings
      );
    },

    areResultsComplete(
      context
    ) {
      const teamIds =
        context &&
        Array.isArray(
          context.teamIds
        )
          ? context.teamIds
          : [];

      const submissions =
        context &&
        Array.isArray(
          context.submissions
        )
          ? context.submissions
          : [];

      const submittedTeamIds =
        new Set(
          submissions
            .filter(result =>
              Number.isFinite(
                Number(
                  result
                    .timeMilliseconds
                )
              )
            )
            .map(
              result =>
                result.teamId
            )
        );

      return (
        teamIds.length > 0 &&
        teamIds.every(
          teamId =>
            submittedTeamIds.has(
              teamId
            )
        )
      );
    },

    shouldRevealResults(
      context
    ) {
      return Boolean(
        context &&
        context.complete
      );
    }
  });

  register({
    id: "grand-prix",

    name: "Grand Prix",

    icon: "flag",

    version: "1.0.0",

    compatibilityVersion:
      SDK_VERSION,

    description:
      "Administrator enters the final finishing order.",

    tieFields: [
      "finishPosition"
    ],

    getResultEntryType() {
      return "finishing-order";
    },

    calculateRankings(
      context
    ) {
      const results =
        context &&
        Array.isArray(
          context.results
        )
          ? context.results
          : [];

      return results
        .filter(result =>
          Number.isInteger(
            Number(
              result.finishPosition
            )
          )
        )
        .map(result => ({
          teamId:
            result.teamId,

          teamName:
            result.teamName ||
            "",

          finishPosition:
            Number(
              result.finishPosition
            ),

          rankValue:
            Number(
              result.finishPosition
            ),

          custom: {
            finishPosition:
              Number(
                result.finishPosition
              )
          }
        }))
        .sort(
          (
            rankingA,
            rankingB
          ) =>
            rankingA
              .finishPosition -
              rankingB
                .finishPosition ||
            rankingA
              .teamName
              .localeCompare(
                rankingB
                  .teamName
              )
        );
    },

    calculateChampionshipPoints(
      rankings
    ) {
      return awardChampionshipPoints(
        rankings
      );
    },

    areResultsComplete(
      context
    ) {
      const teamIds =
        context &&
        Array.isArray(
          context.teamIds
        )
          ? context.teamIds
          : [];

      const results =
        context &&
        Array.isArray(
          context.results
        )
          ? context.results
          : [];

      const rankedTeamIds =
        new Set(
          results
            .filter(result =>
              Number.isInteger(
                Number(
                  result
                    .finishPosition
                )
              )
            )
            .map(
              result =>
                result.teamId
            )
        );

      return (
        teamIds.length > 0 &&
        teamIds.every(
          teamId =>
            rankedTeamIds.has(
              teamId
            )
        )
      );
    },

    shouldRevealResults(
      context
    ) {
      return Boolean(
        context &&
        context.complete
      );
    }
  });

  global.PHDGameModes =
    Object.freeze({
      DEFAULT_MODE_ID,

      SDK_VERSION,

      register,

      get,

      has,

      getRequired,

      getForGame,

      list,

      createNextRound,

      migrateGames,

      assignPositions,

      awardChampionshipPoints,

      buildResult
    });
})(window);
