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

function getStandings() {
  const standings = new Map();

  PHDTournament.state.teams.forEach(team => {
    standings.set(team.id, createEmptyStanding(team));
  });

  PHDTournament.state.rounds.forEach(round => {
    round.matches.forEach(match => {
      const teamA = standings.get(match.teamAId);
      const teamB = standings.get(match.teamBId);

      if (match.bye && teamA) {
        teamA.byes += 1;
        teamA.points += PHDTournament.state.tournament.settings.byePoints;
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
        teamA.points += PHDTournament.state.tournament.settings.winPoints;
      } else if (scoreB > scoreA) {
        teamB.wins += 1;
        teamA.losses += 1;
        teamB.points += PHDTournament.state.tournament.settings.winPoints;
      } else {
        teamA.draws += 1;
        teamB.draws += 1;
        teamA.points += PHDTournament.state.tournament.settings.drawPoints;
        teamB.points += PHDTournament.state.tournament.settings.drawPoints;
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

function renderStandings() {
  const body = document.getElementById("standingsBody");
  const standings = getStandings();

  body.innerHTML = "";

  if (standings.length === 0) {
    body.innerHTML = `
      <tr>
        <td colspan="10">No teams yet. Add teams to populate the ladder.</td>
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
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.byes}</td>
      <td>${team.pointsFor}</td>
      <td>${team.pointsAgainst}</td>
      <td>${getScoreDifference(team)}</td>
    `;

    body.appendChild(row);
  });
}

PHDTournament.modules.push("ladder");