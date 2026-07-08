function getCurrentRound() {
  return PHDTournament.state.rounds.at(-1) || null;
}

function renderDisplayMode() {
  const container = getElement("displayMode");

  if (!container) return;

  const tournament = getTournament();
  const standings = getStandings().slice(0, 5);
  const currentRound = getCurrentRound();

  const standingsHtml = standings.length
    ? standings.map((team, index) => `
        <div class="display-row">
          <span>${index + 1}</span>
          <strong>${escapeHtml(team.shortName || team.name)}</strong>
          <span>${team.points} pts</span>
        </div>
      `).join("")
    : `<p class="muted">No standings yet.</p>`;

  const matchesHtml = currentRound
    ? currentRound.matches.map(match => {
        const teamA = getTeamById(match.teamAId);
        const teamB = getTeamById(match.teamBId);

        if (match.bye) {
          return `
            <div class="display-match">
              <strong>${escapeHtml(teamA ? teamA.name : "Unknown")}</strong>
              <span>BYE</span>
            </div>
          `;
        }

        return `
          <div class="display-match">
            <strong>${escapeHtml(teamA ? teamA.name : "Unknown")}</strong>
            <span>${match.completed ? `${match.scoreA} - ${match.scoreB}` : "vs"}</span>
            <strong>${escapeHtml(teamB ? teamB.name : "Unknown")}</strong>
          </div>
        `;
      }).join("")
    : `<p class="muted">No current round.</p>`;

  container.innerHTML = `
    <section class="display-hero">
      <p class="eyebrow">Public Display</p>
      <h2>${escapeHtml(tournament.name)}</h2>
      <p>${escapeHtml(tournament.description || "Live tournament dashboard")}</p>
    </section>

    <section>
      <h3>Top Standings</h3>
      <div class="display-list">${standingsHtml}</div>
    </section>

    <section>
      <h3>${currentRound ? `Round ${currentRound.number}` : "Current Round"}</h3>
      <div class="display-list">${matchesHtml}</div>
    </section>
  `;
}

function toggleDisplayMode(forceOff = false) {
  if (forceOff) {
    document.body.classList.remove("display-active");
  } else {
    document.body.classList.toggle("display-active");
  }

  const isActive = document.body.classList.contains("display-active");

  if (isActive) {
    renderDisplayMode();
    setSaveStatus("Display mode");
  } else {
    setSaveStatus("Loaded");
  }
}

document.addEventListener("keydown", event => {
  if (
    event.key === "Escape" &&
    document.body.classList.contains("display-active")
  ) {
    toggleDisplayMode(true);
  }
});

PHDTournament.modules.push("display");