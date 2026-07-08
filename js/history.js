function getMatchHistory() {
  const history = [];

  PHDTournament.state.rounds.forEach(round => {
    round.matches.forEach(match => {
      const teamA = getTeamById(match.teamAId);
      const teamB = getTeamById(match.teamBId);

      if (match.bye) {
        history.push({
          round: round.number,
          type: "Bye",
          teamA: teamA ? teamA.name : "Unknown",
          teamB: "",
          score: "BYE",
          status: "Completed"
        });

        return;
      }

      history.push({
        round: round.number,
        type: "Match",
        teamA: teamA ? teamA.name : "Unknown",
        teamB: teamB ? teamB.name : "Unknown",
        score: match.completed ? `${match.scoreA} - ${match.scoreB}` : "Not played",
        status: match.completed ? "Completed" : "Open"
      });
    });
  });

  return history;
}

function renderMatchHistory() {
  const container = getElement("historyContainer");

  if (!container) return;

  const history = getMatchHistory();

  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No match history yet. Generate a round to begin.
      </div>
    `;
    return;
  }

  container.innerHTML = history
    .map(item => `
      <div class="history-item">
        <div>
          <strong>Round ${item.round}</strong>
          <span class="status-pill ${item.status === "Completed" ? "completed" : "open"}">
            ${escapeHtml(item.status)}
          </span>
        </div>

        <div class="history-match">
          <span>${escapeHtml(item.teamA)}</span>
          ${item.teamB ? `<span class="muted">vs</span><span>${escapeHtml(item.teamB)}</span>` : ""}
        </div>

        <strong>${escapeHtml(item.score)}</strong>
      </div>
    `)
    .join("");
}

PHDTournament.modules.push("history");