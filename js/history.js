function getMatchHistory() {
  const history = [];

  PHDTournament.state.rounds.forEach(round => {
    round.matches.forEach(match => {
      const teamA = getTeamById(match.teamAId);
      const teamB = getTeamById(match.teamBId);
      const game = match.gameId ? getGameById(match.gameId) : null;

      if (match.bye) {
        history.push({
          round: round.number,
          type: "Bye",
          game: "",
          teamA: teamA ? teamA.name : "Unknown",
          teamB: "",
          score: "BYE",
          status: "Completed",
          updatedAt: match.updatedAt || round.createdAt || ""
        });

        return;
      }

      history.push({
        round: round.number,
        type: "Match",
        game: game ? getGameLabel(game.id) : "No game selected",
        teamA: teamA ? teamA.name : "Unknown",
        teamB: teamB ? teamB.name : "Unknown",
        score: match.completed ? `${match.scoreA} - ${match.scoreB}` : "Not played",
        status: match.completed ? "Completed" : "Open",
        updatedAt: match.updatedAt || round.createdAt || ""
      });
    });
  });

  return history;
}

function getRecentActivity(limit = 10) {
  return getMatchHistory()
    .filter(item => item.status === "Completed")
    .sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))
    .slice(0, limit);
}

function renderRecentActivityTicker() {
  const ticker = getElement("activityTickerText");

  if (!ticker) return;

  const activity = getRecentActivity(8);

  if (activity.length === 0) {
    ticker.textContent = "No recent activity yet.";
    return;
  }

  ticker.innerHTML = activity
    .map(item => {
      if (item.type === "Bye") {
        return `Round ${item.round}: ${escapeHtml(item.teamA)} received a BYE`;
      }

      return `Round ${item.round}: ${escapeHtml(item.game)} — ${escapeHtml(item.teamA)} ${escapeHtml(item.score)} ${escapeHtml(item.teamB)}`;
    })
    .join(" · ");
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

        <div class="history-detail">
          <span>${escapeHtml(item.game || item.type)}</span>
          <strong>${escapeHtml(item.score)}</strong>
        </div>
      </div>
    `)
    .join("");
}

PHDTournament.modules.push("history");