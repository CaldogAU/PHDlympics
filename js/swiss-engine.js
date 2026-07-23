(function initialiseSwissEngine(global) {
  "use strict";

  function buildPairKey(
    teamAId,
    teamBId
  ) {
    return [
      teamAId,
      teamBId
    ]
      .sort()
      .join("::");
  }

  function getPlayedPairs(rounds) {
    const pairs = new Set();

    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (
          match.bye ||
          !match.teamBId
        ) {
          return;
        }

        pairs.add(
          buildPairKey(
            match.teamAId,
            match.teamBId
          )
        );
      });
    });

    return pairs;
  }

  function getByeCounts(
    teams,
    rounds
  ) {
    const counts = new Map();

    teams.forEach(team => {
      counts.set(team.id, 0);
    });

    rounds.forEach(round => {
      round.matches.forEach(match => {
        if (!match.bye) {
          return;
        }

        counts.set(
          match.teamAId,
          (
            counts.get(
              match.teamAId
            ) || 0
          ) + 1
        );
      });
    });

    return counts;
  }

  function getScoreDifference(team) {
    return (
      Number(team.pointsFor) || 0
    ) - (
      Number(team.pointsAgainst) || 0
    );
  }

  function chooseByeTeam(
    standings,
    byeCounts
  ) {
    const neverHadBye =
      standings.filter(
        team =>
          (
            byeCounts.get(
              team.id
            ) || 0
          ) === 0
      );

    const candidates =
      neverHadBye.length > 0
        ? neverHadBye
        : standings;

    return [...candidates].sort(
      (teamA, teamB) =>
        (
          Number(teamA.points) || 0
        ) -
          (
            Number(teamB.points) || 0
          ) ||
        getScoreDifference(teamA) -
          getScoreDifference(teamB) ||
        (
          Number(teamA.pointsFor) || 0
        ) -
          (
            Number(teamB.pointsFor) || 0
          ) ||
        String(teamA.name || "")
          .localeCompare(
            String(
              teamB.name || ""
            )
          )
    )[0];
  }

  function groupStandingsByPoints(
    standings
  ) {
    const groups = new Map();

    standings.forEach(team => {
      const points =
        Number(team.points) || 0;

      if (!groups.has(points)) {
        groups.set(points, []);
      }

      groups.get(points).push(team);
    });

    return [...groups.entries()]
      .sort(
        (
          [pointsA],
          [pointsB]
        ) =>
          pointsB - pointsA
      )
      .map(([, teams]) => teams);
  }

  function findBestOpponentIndex(
    teamA,
    candidates,
    playedPairs
  ) {
    const freshOpponentIndex =
      candidates.findIndex(
        teamB =>
          !playedPairs.has(
            buildPairKey(
              teamA.id,
              teamB.id
            )
          )
      );

    return freshOpponentIndex === -1
      ? 0
      : freshOpponentIndex;
  }

  function pairWithinGroup(
    group,
    carryOver,
    playedPairs
  ) {
    const matches = [];
    const teams = carryOver
      ? [
          carryOver,
          ...group
        ]
      : [...group];

    while (teams.length >= 2) {
      const teamA = teams.shift();
      const opponentIndex =
        findBestOpponentIndex(
          teamA,
          teams,
          playedPairs
        );
      const teamB = teams.splice(
        opponentIndex,
        1
      )[0];

      matches.push({
        teamA,
        teamB
      });
    }

    return {
      matches,
      carryOver: teams[0] || null
    };
  }

  function createMatch(
    teamAId,
    teamBId,
    roundNumber,
    createId
  ) {
    return {
      id: createId(),
      roundNumber,
      teamAId,
      teamBId,
      gameId: "",
      bye: false,
      completed: false,
      scoreA: null,
      scoreB: null,
      winnerId: null,
      updatedAt: null
    };
  }

  function createByeMatch(
    team,
    roundNumber,
    createId,
    now
  ) {
    return {
      ...createMatch(
        team.id,
        null,
        roundNumber,
        createId
      ),
      bye: true,
      completed: true,
      winnerId: team.id,
      updatedAt: now()
    };
  }

  function createRound(options) {
    const {
      teams,
      standings,
      rounds = [],
      roundNumber =
        rounds.length + 1,
      createId,
      now
    } = options || {};

    if (
      !Array.isArray(teams) ||
      teams.length < 2
    ) {
      throw new Error(
        "Swiss rounds require at least two teams."
      );
    }

    if (
      !Array.isArray(standings) ||
      standings.length !==
        teams.length
    ) {
      throw new Error(
        "Swiss standings must include every team."
      );
    }

    if (
      typeof createId !==
        "function" ||
      typeof now !== "function"
    ) {
      throw new Error(
        "Swiss round creation requires createId and now functions."
      );
    }

    const playedPairs =
      getPlayedPairs(rounds);
    const byeCounts =
      getByeCounts(
        teams,
        rounds
      );
    const matches = [];
    let workingStandings = [
      ...standings
    ];

    if (
      workingStandings.length %
        2 ===
      1
    ) {
      const byeTeam =
        chooseByeTeam(
          workingStandings,
          byeCounts
        );

      matches.push(
        createByeMatch(
          byeTeam,
          roundNumber,
          createId,
          now
        )
      );

      workingStandings =
        workingStandings.filter(
          team =>
            team.id !==
            byeTeam.id
        );
    }

    const pointGroups =
      groupStandingsByPoints(
        workingStandings
      );
    let carryOver = null;

    pointGroups.forEach(group => {
      const result =
        pairWithinGroup(
          group,
          carryOver,
          playedPairs
        );

      result.matches.forEach(pair => {
        matches.push(
          createMatch(
            pair.teamA.id,
            pair.teamB.id,
            roundNumber,
            createId
          )
        );
      });

      carryOver =
        result.carryOver;
    });

    if (carryOver) {
      throw new Error(
        `Swiss pairing could not place team "${carryOver.id}".`
      );
    }

    return {
      id: createId(),
      number: roundNumber,
      completed: false,
      createdAt: now(),
      matches
    };
  }

  global.PHDSwissEngine =
    Object.freeze({
      buildPairKey,
      getPlayedPairs,
      getByeCounts,
      chooseByeTeam,
      groupStandingsByPoints,
      createRound
    });
})(window);
