function createEmptyStanding(team) {
  return {
    id: team.id,
    name: team.name,
    shortName: team.shortName,
    logoUrl: team.logoUrl,
    colour: team.colour,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    byes: 0,
    pointsFor: 0,
    pointsAgainst: 0
  };
}

function getScoreDifference(standing) {
  return (standing.pointsFor || 0) - (standing.pointsAgainst || 0);
}

function getGameStandings(gameId = "") {
  const standings = new Map();

  PHDTournament.state.teams.forEach(team => {
    standings.set(team.id, createEmptyStanding(team));
  });

  PHDTournament.state.rounds.forEach(round => {
    round.matches.forEach(match => {
      if (gameId && match.gameId !== gameId) {
        return;
      }

      const teamA = standings.get(match.teamAId);
      const teamB = standings.get(match.teamBId);
      const matchGame =
        typeof getGameById === "function"
          ? getGameById(
              gameId || match.gameId
            )
          : null;
      const scoring = {
        ...PHDTournament.state.tournament.settings,
        ...((matchGame && matchGame.settings) || {})
      };

      if (match.bye && teamA) {
        teamA.byes += 1;
        teamA.points += scoring.byePoints;
        return;
      }

      if (!match.completed || !teamA || !teamB) return;

      const scoreA = Number(match.scoreA);
      const scoreB = Number(match.scoreB);

      teamA.pointsFor += scoreA;
      teamA.pointsAgainst += scoreB;
      teamB.pointsFor += scoreB;
      teamB.pointsAgainst += scoreA;

      if (scoreA > scoreB) {
        teamA.wins += 1;
        teamB.losses += 1;
        teamA.points += scoring.winPoints;
      } else if (scoreB > scoreA) {
        teamB.wins += 1;
        teamA.losses += 1;
        teamB.points += scoring.winPoints;
      } else {
        teamA.draws += 1;
        teamB.draws += 1;
        teamA.points += scoring.drawPoints;
        teamB.points += scoring.drawPoints;
      }
    });
  });

  return [...standings.values()].sort((a, b) => {
    return (
      b.points - a.points ||
      getScoreDifference(b) - getScoreDifference(a) ||
      b.pointsFor - a.pointsFor ||
      a.name.localeCompare(b.name)
    );
  });
}

function getCompletedGameLeaderboard(game) {
  if (!game || !window.PHDGameModes) {
    return null;
  }

  if (
    (game.mode || "swiss") ===
    "four-player-swiss"
  ) {
    const tournament =
      game.fourPlayerSwiss;

    return tournament &&
      tournament.closed &&
      Array.isArray(
        tournament.finalStandings
      )
      ? window.PHDGameModes
          .awardChampionshipPoints(
            tournament.finalStandings
          )
      : null;
  }

  if (
    (game.mode || "swiss") ===
    "fall-guys-grand-prix"
  ) {
    const tournament =
      game.fallGuysGrandPrix;

    return tournament &&
      tournament.closed &&
      Array.isArray(
        tournament.finalStandings
      ) &&
      tournament.finalStandings
        .length > 0
      ? tournament.finalStandings
      : null;
  }

  const mode =
    window.PHDGameModes
      .getForGame(game);
  const eligibleTeams =
    window.PHDGameCapacity
      ? window.PHDGameCapacity
          .getEligibleTeams(
            game,
            PHDTournament.state.teams
          )
      : PHDTournament.state.teams;
  const resultEntryType =
    mode.getResultEntryType();
  const context = {
    state: PHDTournament.state,
    teams: eligibleTeams,
    teamIds:
      eligibleTeams.map(
        team => team.id
      ),
    gameId: game.id,
    rounds:
      typeof getRoundsForGame === "function"
        ? getRoundsForGame(game.id)
        : [],
    pointsByPosition: []
  };

  if (
    resultEntryType ===
    "fall-guys-heats"
  ) {
    context.tournament =
      game.fallGuysGrandPrix || {};
  }

  if (
    resultEntryType ===
    "match-score"
  ) {
    if (!game.completed) {
      return null;
    }
  } else {
    const event =
      PHDTournament.state.events.find(
        item =>
          item.gameId === game.id
      );

    if (!event || !event.completed) {
      return null;
    }

    context.results =
      event.results || [];
    context.submissions =
      event.results || [];
  }

  const result =
    window.PHDGameModes.buildResult(
      mode,
      context
    );

  return result.complete
    ? result.leaderboard
    : null;
}

function getTournamentStandings() {
  const standings = new Map();

  PHDTournament.state.teams.forEach(
    team => {
      standings.set(team.id, {
        ...createEmptyStanding(team),
        gamesCompleted: 0,
        gamePoints: []
      });
    }
  );

  PHDTournament.state.games.forEach(
    game => {
      const leaderboard =
        getCompletedGameLeaderboard(
          game
        );

      if (!leaderboard) {
        return;
      }

      leaderboard.forEach(result => {
        const standing =
          standings.get(result.teamId);
        const points = Number(
          result.championshipPoints
        );

        if (
          !standing ||
          !Number.isFinite(points)
        ) {
          return;
        }

        standing.points += points;
        standing.gamesCompleted += 1;
        standing.gamePoints.push({
          gameId: game.id,
          gameName: game.name,
          position: result.position,
          points
        });
      });
    }
  );

  return [...standings.values()]
    .sort((a, b) =>
      b.points - a.points ||
      b.gamesCompleted -
        a.gamesCompleted ||
      a.name.localeCompare(b.name)
    );
}

function getStandings(gameId = "") {
  return gameId
    ? getGameStandings(gameId)
    : getTournamentStandings();
}

function renderStandings() {
  const standings = getStandings();
  const games =
    PHDTournament.state.games || [];

  [
    ["standingsBody", "standingsHeader"],
    ["homeStandingsBody", "homeStandingsHeader"]
  ].forEach(([bodyId, headerId]) => {
    const body =
      document.getElementById(bodyId);
    const header =
      document.getElementById(headerId);

    if (!body) return;

    if (header) {
      header.innerHTML = `
        <th>#</th>
        <th>Team</th>
        <th>Tournament Points</th>
        <th>Completed Games</th>
        ${games.map(game => `
          <th class="game-points-heading">
            ${escapeHtml(game.name)}
          </th>
        `).join("")}
      `;
    }

    body.innerHTML = "";

    if (standings.length === 0) {
      body.innerHTML = `
        <tr>
          <td colspan="${4 + games.length}">No teams yet. Add teams to populate the standings.</td>
        </tr>
      `;
      return;
    }

    standings.forEach((team, index) => {
      const row = document.createElement("tr");

      row.innerHTML = `
        <td class="rank-cell">${index + 1}</td>
        <td>
          <div class="team-cell">
            <span class="team-logo" style="background:${escapeHtml(team.colour || "#6d5dfc")}">
              ${renderTeamLogo(team)}
            </span>
            <strong>${escapeHtml(team.name)}</strong>
          </div>
        </td>
        <td>${team.points}</td>
        <td>${team.gamesCompleted}</td>
        ${games.map(game => {
          const gameResult =
            team.gamePoints.find(
              result =>
                result.gameId ===
                game.id
            );

          return `
            <td
              class="game-points-cell"
              title="${escapeHtml(game.name)}"
            >
              ${
                gameResult
                  ? gameResult.points
                  : "—"
              }
            </td>
          `;
        }).join("")}
      `;

      body.appendChild(row);
    });
  });
}

PHDTournament.modules.push("ladder");
