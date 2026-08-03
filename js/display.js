let displayRefreshTimer = null;
let displayClockTimer = null;
let previousDisplayLeader = null;

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

function getDisplayActivityText() {
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

function getDisplayTickerText() {
  const activity = getRecentActivity(8);
  const commentary = window.PHDCommentary
    ? window.PHDCommentary.generate({
        activity,
        standings: getStandings(),
        events:
          PHDTournament.state.events ||
          [],
        teams:
          PHDTournament.state.teams ||
          [],
        games:
          PHDTournament.state.games ||
          [],
        limit: 6
      })
    : [];
  const activityText =
    getDisplayActivityText();

  if (!commentary.length) {
    return activityText;
  }

  return `${commentary.join(" · ")} · ${activityText}`;
}

function renderDisplayMode() {
  const container = getElement("displayMode");
  if (!container) return;
  const previousTicker =
    container.querySelector(
      ".display-ticker"
    );
  const tickerText =
    getDisplayTickerText();

  const tournament = getTournament();
  const standings = getStandings();
  const standingsColumns = Math.max(
    1,
    Math.ceil(Math.sqrt(standings.length / 2))
  );
  const standingsRows = Math.max(
    1,
    Math.ceil(standings.length / standingsColumns)
  );
  const standingsFontSize = Math.max(
    0.8,
    Math.min(3.9, 35 / standingsRows)
  );
  const standingsGap = Math.max(
    1,
    Math.min(14, Math.floor(70 / standingsRows))
  );

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

  const displayHtml = `
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

    <section class="display-ticker">
      <div>${escapeHtml(tickerText)}</div>
    </section>

    <section class="display-grid">
      <article
        class="display-panel display-standings-panel"
        style="--standings-columns: ${standingsColumns}; --standings-rows: ${standingsRows}; --standings-font-size: ${standingsFontSize}vh; --standings-gap: ${standingsGap}px;"
      >
        <h3>Top Standings</h3>
        <div class="display-list">${standingsHtml}</div>
      </article>
    </section>
  `;

  if (!previousTicker) {
    container.innerHTML =
      displayHtml;
  } else {
    const nextDisplay =
      document.createElement("div");
    nextDisplay.innerHTML =
      displayHtml;

    const currentTopbar =
      container.querySelector(
        ".display-topbar"
      );
    const currentGrid =
      container.querySelector(
        ".display-grid"
      );
    const nextTopbar =
      nextDisplay.querySelector(
        ".display-topbar"
      );
    const nextGrid =
      nextDisplay.querySelector(
        ".display-grid"
      );

    if (currentTopbar && nextTopbar) {
      currentTopbar.replaceWith(
        nextTopbar
      );
    }
    if (currentGrid && nextGrid) {
      currentGrid.replaceWith(
        nextGrid
      );
    }

    const tickerTrack =
      previousTicker.querySelector(
        "div"
      );
    if (
      tickerTrack &&
      tickerTrack.textContent !==
        tickerText
    ) {
      tickerTrack.textContent =
        tickerText;
      tickerTrack.style.animation =
        "none";
      requestAnimationFrame(() => {
        tickerTrack.style.animation =
          "";
      });
    }
  }

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
