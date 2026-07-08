let displayRefreshTimer = null;
let displayClockTimer = null;
let previousDisplayLeader = null;

function getCurrentRound() {
  return PHDTournament.state.rounds.at(-1) || null;
}

function formatDisplayTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function updateDisplayClock() {
  const clock = getElement("displayClock");
  if (!clock) return;

  clock.textContent = formatDisplayTime();
}

function getDisplayTickerText() {
  const activity = getRecentActivity(8);

  if (activity.length === 0) {
    return "No completed games yet.";
  }

  return activity
    .map(item => {
      if (item.type === "Bye") {
        return `Round ${item.round}: ${item.teamA} received a BYE`;
      }

      return `Round ${item.round}: ${item.game} — ${item.teamA} ${item.score} ${item.teamB}`;
    })
    .join(" · ");
}

function renderDisplayMode() {
  const container = getElement("displayMode");
  if (!container) return;

  const tournament = getTournament();
  const standings = getStandings().slice(0, 8);
  const currentRound = getCurrentRound();

  const currentLeader = standings[0] ? standings[0].id : null;
  const leaderChanged = previousDisplayLeader && currentLeader !== previousDisplayLeader;
  previousDisplayLeader = currentLeader;

  const standingsHtml = standings.length
    ? standings.map((team, index) => `
      <div class="display-row ${index === 0 ? "leader" : ""} ${leaderChanged && index === 0 ? "changed" : ""}">
        <span class="display-rank">${index + 1}</span>
        <strong>${escapeHtml(team.shortName || team.name)}</strong>
        <span>${team.points} pts</span>
      </div>
    `).join("")
    : `<p>No standings yet.</p>`;

  const matchesHtml = currentRound
    ? currentRound.matches.map(match => {
      const teamA = getTeamById(match.teamAId);
      const teamB = getTeamById(match.teamBId);
      const gameLabel = match.gameId ? getGameLabel(match.gameId) : "No game selected";

      if (match.bye) {
        return `
          <div class="display-match">
            <strong>${escapeHtml(teamA ? teamA.name : "Unknown")}</strong>
            <span>BYE</span>
            <span></span>
          </div>
        `;
      }

      return `
        <div class="display-match-with-game">
          <div class="display-game-name">${escapeHtml(gameLabel)}</div>

          <div class="display-match">
            <strong>${escapeHtml(teamA ? teamA.name : "Unknown")}</strong>
            <span>${match.completed ? `${match.scoreA} - ${match.scoreB}` : "vs"}</span>
            <strong>${escapeHtml(teamB ? teamB.name : "Unknown")}</strong>
          </div>
        </div>
      `;
    }).join("")
    : `<p>No current round.</p>`;

  container.innerHTML = `
    <section class="display-topbar">
      <div>
        <p class="eyebrow">Public Display</p>
        <h2>${escapeHtml(tournament.name || "Tournament")}</h2>
      </div>

      <div class="display-actions">
        <strong id="displayClock" class="display-clock">${formatDisplayTime()}</strong>
        <button id="displayFullscreen" type="button">Fullscreen</button>
        <button id="displayExit" type="button" class="danger">Exit</button>
      </div>
    </section>

    <section class="display-grid">
      <article class="display-panel">
        <h3>Top Standings</h3>
        <div class="display-list">${standingsHtml}</div>
      </article>

      <article class="display-panel">
        <h3>${currentRound ? `Round ${currentRound.number}` : "Current Round"}</h3>
        <div class="display-list">${matchesHtml}</div>
      </article>
    </section>

    <section class="display-ticker">
      <div>${escapeHtml(getDisplayTickerText())}</div>
    </section>
  `;

  bindDisplayModeInnerButtons();
}

function bindDisplayModeInnerButtons() {
  const exitButton = getElement("displayExit");
  const fullscreenButton = getElement("displayFullscreen");

  if (exitButton) {
    exitButton.addEventListener("click", exitDisplayMode);
  }

  if (fullscreenButton) {
    fullscreenButton.addEventListener("click", requestDisplayFullscreen);
  }
}

function requestDisplayFullscreen() {
  const element = document.documentElement;

  if (!document.fullscreenElement && element.requestFullscreen) {
    element.requestFullscreen();
  }
}

function startDisplayTimers() {
  stopDisplayTimers();

  displayRefreshTimer = setInterval(() => {
    if (document.body.classList.contains("display-active")) {
      renderDisplayMode();
    }
  }, 5000);

  displayClockTimer = setInterval(updateDisplayClock, 1000);
}

function stopDisplayTimers() {
  if (displayRefreshTimer) {
    clearInterval(displayRefreshTimer);
    displayRefreshTimer = null;
  }

  if (displayClockTimer) {
    clearInterval(displayClockTimer);
    displayClockTimer = null;
  }
}

function enterDisplayMode() {
  document.body.classList.add("display-active");
  renderDisplayMode();
  startDisplayTimers();
  setSaveStatus("Display mode");
}

function exitDisplayMode() {
  document.body.classList.remove("display-active");
  stopDisplayTimers();

  if (document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen();
  }

  setSaveStatus("Loaded");
}

function toggleDisplayMode() {
  if (document.body.classList.contains("display-active")) {
    exitDisplayMode();
  } else {
    enterDisplayMode();
  }
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape" && document.body.classList.contains("display-active")) {
    event.preventDefault();
    exitDisplayMode();
  }
});

PHDTournament.modules.push("display");