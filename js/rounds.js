function getPlayedPairs() {
  const pairs = new Set();

  PHDTournament.state.rounds.forEach(round => {
    round.matches.forEach(match => {
      if (match.bye || !match.teamBId) return;

      const pair = [match.teamAId, match.teamBId].sort().join("::");
      pairs.add(pair);
    });
  });

  return pairs;
}

function teamsHavePlayed(teamAId, teamBId) {
  const pair = [teamAId, teamBId].sort().join("::");
  return getPlayedPairs().has(pair);
}

function chooseByeTeam(standings) {
  return [...standings].sort((a, b) => {
    return (
      a.byes - b.byes ||
      a.points - b.points ||
      getScoreDifference(a) - getScoreDifference(b) ||
      a.name.localeCompare(b.name)
    );
  })[0];
}

function createSwissPairings() {
  const teams = PHDTournament.state.teams;

  if (teams.length < 2) {
    alert("Add at least two teams before generating a round.");
    return null;
  }

  const roundNumber = PHDTournament.state.rounds.length + 1;
  const standings = getStandings();
  const available = [...standings];
  const matches = [];

  if (available.length % 2 === 1) {
    const byeTeam = chooseByeTeam(available);

    matches.push({
      id: crypto.randomUUID(),
      roundNumber,
      teamAId: byeTeam.id,
      teamBId: null,
      bye: true,
      completed: true,
      scoreA: null,
      scoreB: null,
      winnerId: byeTeam.id
    });

    available.splice(
      available.findIndex(team => team.id === byeTeam.id),
      1
    );
  }

  const unpaired = [...available];

  while (unpaired.length > 0) {
    const teamA = unpaired.shift();

    let opponentIndex = unpaired.findIndex(teamB =>
      !teamsHavePlayed(teamA.id, teamB.id)
    );

    if (opponentIndex === -1) {
      opponentIndex = 0;
    }

    const teamB = unpaired.splice(opponentIndex, 1)[0];

    matches.push({
      id: crypto.randomUUID(),
      roundNumber,
      teamAId: teamA.id,
      teamBId: teamB.id,
      bye: false,
      completed: false,
      scoreA: null,
      scoreB: null,
      winnerId: null
    });
  }

  return {
    id: crypto.randomUUID(),
    number: roundNumber,
    completed: false,
    createdAt: new Date().toISOString(),
    matches
  };
}

function generateRound() {
  const latestRound = PHDTournament.state.rounds.at(-1);

  if (latestRound && !latestRound.completed) {
    alert("Complete the current round before generating another one.");
    return;
  }

  const round = createSwissPairings();

  if (!round) return;

  PHDTournament.state.rounds.push(round);
  autosave();
  render();
}

function getRoundById(roundId) {
  return PHDTournament.state.rounds.find(round => round.id === roundId);
}

function getMatch(roundId, matchId) {
  const round = getRoundById(roundId);

  if (!round) return null;

  return round.matches.find(match => match.id === matchId);
}

function saveMatchScore(roundId, matchId, matchElement) {
  const match = getMatch(roundId, matchId);

  if (!match || match.bye) return;

  const scoreAInput = matchElement.querySelector(".score-a");
  const scoreBInput = matchElement.querySelector(".score-b");

  const scoreA = Number(scoreAInput.value);
  const scoreB = Number(scoreBInput.value);

  if (
    Number.isNaN(scoreA) ||
    Number.isNaN(scoreB) ||
    scoreA < 0 ||
    scoreB < 0
  ) {
    alert("Enter valid non-negative scores.");
    return;
  }

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.completed = true;

  if (scoreA > scoreB) {
    match.winnerId = match.teamAId;
  } else if (scoreB > scoreA) {
    match.winnerId = match.teamBId;
  } else {
    match.winnerId = null;
  }

  autosave();
  render();
}

function clearMatchScore(roundId, matchId) {
  const match = getMatch(roundId, matchId);

  if (!match || match.bye) return;

  match.scoreA = null;
  match.scoreB = null;
  match.completed = false;
  match.winnerId = null;

  const round = getRoundById(roundId);
  if (round) round.completed = false;

  autosave();
  render();
}

function toggleRoundCompleted(roundId) {
  const round = getRoundById(roundId);

  if (!round) return;

  const incompleteMatches = round.matches.filter(match =>
    !match.bye && !match.completed
  );

  if (!round.completed && incompleteMatches.length > 0) {
    alert("Complete every match in this round first.");
    return;
  }

  round.completed = !round.completed;
  autosave();
  render();
}

function renderMatchTeam(team) {
  return `
    <span class="team-logo" style="background:${escapeHtml(team.colour || "#6d5dfc")}">
      ${renderTeamLogo(team)}
    </span>
    <strong>${escapeHtml(team.name)}</strong>
  `;
}

function renderRounds() {
  const status = document.getElementById("roundStatus");
  const container = document.getElementById("roundsContainer");

  container.innerHTML = "";

  if (PHDTournament.state.rounds.length === 0) {
    status.textContent = "No rounds generated yet.";
    container.innerHTML = `
      <div class="empty-state">
        Add teams, then generate the first Swiss round.
      </div>
    `;
    return;
  }

  const completedRounds = PHDTournament.state.rounds.filter(round => round.completed).length;
  status.textContent = `${completedRounds} of ${PHDTournament.state.rounds.length} rounds completed.`;

  PHDTournament.state.rounds.forEach(round => {
    const card = document.createElement("article");
    card.className = `round-card ${round.completed ? "completed" : ""}`;

    const matchesHtml = round.matches.map(match => {
      const teamA = getTeamById(match.teamAId);
      const teamB = getTeamById(match.teamBId);

      if (match.bye) {
        return `
          <div class="match-card bye-card">
            <div class="match-team">
              ${renderMatchTeam(teamA)}
            </div>
            <span class="bye-pill">BYE</span>
            <div></div>
          </div>
        `;
      }

      return `
        <div class="match-card" data-round-id="${round.id}" data-match-id="${match.id}">
          <div class="match-team">
            ${renderMatchTeam(teamA)}
          </div>

          <div class="score-box">
            <input class="score-a" type="number" min="0" value="${match.scoreA ?? ""}" placeholder="0" />
            <span>–</span>
            <input class="score-b" type="number" min="0" value="${match.scoreB ?? ""}" placeholder="0" />
          </div>

          <div class="match-team">
            ${renderMatchTeam(teamB)}
          </div>

          <div class="match-actions">
            <button class="small-button success save-match" type="button" data-round-id="${round.id}" data-match-id="${match.id}">
              Save
            </button>
            <button class="small-button secondary clear-match" type="button" data-round-id="${round.id}" data-match-id="${match.id}">
              Clear
            </button>
            <span class="status-pill ${match.completed ? "completed" : "open"}">
              ${match.completed ? "Saved" : "Open"}
            </span>
          </div>
        </div>
      `;
    }).join("");

    card.innerHTML = `
      <div class="round-heading">
        <div>
          <h3>Round ${round.number}</h3>
          <span class="status-pill ${round.completed ? "completed" : "open"}">
            ${round.completed ? "Completed" : "In Progress"}
          </span>
        </div>

        <button class="small-button ${round.completed ? "warning" : "success"} toggle-round" type="button" data-round-id="${round.id}">
          ${round.completed ? "Reopen Round" : "Complete Round"}
        </button>
      </div>

      <div class="match-list">
        ${matchesHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

function deleteLatestRound() {
  if (PHDTournament.state.rounds.length === 0) {
    alert("There are no rounds to delete.");
    return;
  }

  const latestRound = PHDTournament.state.rounds.at(-1);

  const confirmed = confirm(
    `Delete Round ${latestRound.number}? This cannot be undone.`
  );

  if (!confirmed) return;

  PHDTournament.state.rounds.pop();
  autosave();
  render();
}

PHDTournament.modules.push("rounds");