function buildTournamentReportHtml() {
  const tournament = getTournament();
  const standings = getStandings();
  const history = getMatchHistory();

  const standingsRows = standings.map((team, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(team.name)}</td>
      <td>${team.points}</td>
      <td>${team.gamesCompleted}</td>
    </tr>
  `).join("");

  const historyRows = history.map(item => `
    <tr>
      <td>Round ${item.round}</td>
      <td>${escapeHtml(item.teamA)}</td>
      <td>${item.teamB ? escapeHtml(item.teamB) : "BYE"}</td>
      <td>${escapeHtml(item.score)}</td>
      <td>${escapeHtml(item.status)}</td>
    </tr>
  `).join("");

  return `
    <section class="report-preview">
      <h2>${escapeHtml(tournament.name)}</h2>
      <p>${escapeHtml(tournament.description || "Tournament report")}</p>

      <h3>Country Championship</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Country</th><th>Tournament Points</th><th>Completed Games</th>
            </tr>
          </thead>
          <tbody>${standingsRows || `<tr><td colspan="4">No standings yet.</td></tr>`}</tbody>
        </table>
      </div>

      <h3>Match History</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Round</th><th>Team A</th><th>Team B</th><th>Score</th><th>Status</th>
            </tr>
          </thead>
          <tbody>${historyRows || `<tr><td colspan="5">No matches yet.</td></tr>`}</tbody>
        </table>
      </div>
    </section>
  `;
}

function renderReportPreview() {
  const container = getElement("reportPreview");

  if (!container) return;

  container.innerHTML = buildTournamentReportHtml();
}

function printFullReport() {
  renderReportPreview();
  window.print();
}

PHDTournament.modules.push("reports");
