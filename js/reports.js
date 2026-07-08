function buildTournamentReportHtml() {
  const tournament = getTournament();
  const standings = getStandings();
  const history = getMatchHistory();

  const standingsRows = standings.map((team, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(team.name)}</td>
      <td>${team.points}</td>
      <td>${team.wins}</td>
      <td>${team.draws}</td>
      <td>${team.losses}</td>
      <td>${team.byes}</td>
      <td>${team.pointsFor}</td>
      <td>${team.pointsAgainst}</td>
      <td>${getScoreDifference(team)}</td>
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

      <h3>Standings</h3>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th><th>Team</th><th>Pts</th><th>W</th><th>D</th><th>L</th>
              <th>Bye</th><th>PF</th><th>PA</th><th>Diff</th>
            </tr>
          </thead>
          <tbody>${standingsRows || `<tr><td colspan="10">No standings yet.</td></tr>`}</tbody>
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