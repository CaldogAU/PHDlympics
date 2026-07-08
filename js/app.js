function getTournament() {
  return PHDTournament.state.tournament;
}

function ensureStateShape() {
  if (!Array.isArray(PHDTournament.state.teams)) {
    PHDTournament.state.teams = [];
  }

  if (!Array.isArray(PHDTournament.state.games)) {
    PHDTournament.state.games = [];
  }

  if (!Array.isArray(PHDTournament.state.rounds)) {
    PHDTournament.state.rounds = [];
  }
}

function renderTournamentForm() {
  const tournament = getTournament();

  setValue("tournamentName", tournament.name);
  setValue("tournamentDescription", tournament.description);
  setValue("tournamentLogoUrl", tournament.logoUrl || "");
  setValue("tournamentBannerUrl", tournament.bannerUrl || "");
  setValue("tournamentAccentColour", tournament.accentColour || "#6d5dfc");
  setValue("winPoints", tournament.settings.winPoints);
  setValue("drawPoints", tournament.settings.drawPoints);
  setValue("byePoints", tournament.settings.byePoints);
}

function renderBranding() {
  const tournament = getTournament();
  const accentColour = tournament.accentColour || "#6d5dfc";

  document.documentElement.style.setProperty("--accent", accentColour);

  const headerLogo = getElement("headerLogo");

  if (headerLogo) {
    if (tournament.logoUrl) {
      headerLogo.innerHTML = `
        <img src="${escapeHtml(tournament.logoUrl)}" alt="${escapeHtml(tournament.name)} logo" onerror="this.parentElement.textContent='PHD'" />
      `;
    } else {
      headerLogo.textContent = "PHD";
    }
  }

  const banner = getElement("brandBanner");

  if (banner) {
    if (tournament.bannerUrl) {
      banner.classList.add("visible");
      banner.style.backgroundImage = `url("${tournament.bannerUrl}")`;
    } else {
      banner.classList.remove("visible");
      banner.style.backgroundImage = "";
    }
  }
}

function renderTournamentSummary() {
  const tournament = getTournament();

  setText("pageTitle", tournament.name || "Tournament Manager");
  setText("summaryName", tournament.name || "Untitled Tournament");
  setText("summaryDescription", tournament.description || "No description yet.");

  setText(
    "summaryScoring",
    `Win ${tournament.settings.winPoints}, Draw ${tournament.settings.drawPoints}, Bye ${tournament.settings.byePoints}`
  );

  setText("summaryTeams", PHDTournament.state.teams.length);
  setText("summaryGames", getGames().length);
  setText("summaryRounds", PHDTournament.state.rounds.length);

  setText(
    "summaryBranding",
    tournament.logoUrl || tournament.bannerUrl ? "Custom branding active" : "Default"
  );
}

function render() {
  ensureStateShape();

  renderBranding();
  renderTournamentForm();
  renderTournamentSummary();
  renderStatistics();
  renderGames();
  renderTeams();
  renderRounds();
  renderStandings();
  renderMatchHistory();
  renderRecentActivityTicker();
  renderReportPreview();

  if (document.body.classList.contains("display-active")) {
    renderDisplayMode();
  }
}

function updateTournamentSettings() {
  const tournament = getTournament();
  const name = getValue("tournamentName").trim();

  tournament.name = isBlank(name) ? "Untitled Tournament" : name;
  tournament.description = getValue("tournamentDescription").trim();
  tournament.logoUrl = getValue("tournamentLogoUrl").trim();
  tournament.bannerUrl = getValue("tournamentBannerUrl").trim();
  tournament.accentColour = getValue("tournamentAccentColour") || "#6d5dfc";

  tournament.settings.winPoints = toPositiveNumber(getValue("winPoints"), 3);
  tournament.settings.drawPoints = toNumber(getValue("drawPoints"), 0);
  tournament.settings.byePoints = toNumber(getValue("byePoints"), 0);

  autosave();
  render();
}

function bindTournamentEvents() {
  bindClick("saveTournament", updateTournamentSettings);

  [
    "tournamentName",
    "tournamentDescription",
    "tournamentLogoUrl",
    "tournamentBannerUrl",
    "tournamentAccentColour",
    "winPoints",
    "drawPoints",
    "byePoints"
  ].forEach(id => {
    bindChange(id, updateTournamentSettings);
  });

  [
    "tournamentLogoUrl",
    "tournamentBannerUrl",
    "tournamentAccentColour"
  ].forEach(id => {
    const element = getElement(id);

    if (!element) return;

    element.addEventListener("input", updateTournamentSettings);
  });
}

function bindGameEvents() {
  bindClick("saveGame", saveGameFromForm);
  bindClick("clearGameForm", clearGameForm);

  const gameNameInput = getElement("gameName");

  if (gameNameInput) {
    gameNameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") saveGameFromForm();
    });
  }

  const gameList = getElement("gameList");

  if (gameList) {
    gameList.addEventListener("click", event => {
      const gameId = event.target.dataset.gameId;

      if (!gameId) return;

      if (event.target.classList.contains("edit-game")) {
        editGame(gameId);
        return;
      }

      if (event.target.classList.contains("delete-game")) {
        deleteGame(gameId);
      }
    });
  }
}

function bindTeamEvents() {
  bindClick("saveTeam", saveTeamFromForm);
  bindClick("clearTeamForm", clearTeamForm);

  const teamNameInput = getElement("teamName");

  if (teamNameInput) {
    teamNameInput.addEventListener("keydown", event => {
      if (event.key === "Enter") saveTeamFromForm();
    });
  }

  const teamList = getElement("teamList");

  if (teamList) {
    teamList.addEventListener("click", event => {
      const teamId = event.target.dataset.teamId;

      if (!teamId) return;

      if (event.target.classList.contains("edit-team")) {
        editTeam(teamId);
        return;
      }

      if (event.target.classList.contains("delete-team")) {
        deleteTeam(teamId);
      }
    });
  }
}

function bindRoundEvents() {
  bindClick("generateRound", generateRound);

  document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.key.toLowerCase() === "backspace") {
      deleteLatestRound();
    }
  });

  const roundsContainer = getElement("roundsContainer");

  if (roundsContainer) {
    roundsContainer.addEventListener("click", event => {
      const roundId = event.target.dataset.roundId;
      const matchId = event.target.dataset.matchId;

      if (event.target.classList.contains("save-match")) {
        const matchElement = event.target.closest(".match-card");
        saveMatchScore(roundId, matchId, matchElement);
        return;
      }

      if (event.target.classList.contains("clear-match")) {
        clearMatchScore(roundId, matchId);
        return;
      }

      if (event.target.classList.contains("toggle-round")) {
        toggleRoundCompleted(roundId);
      }
    });
  }
}

function bindDataToolEvents() {
  bindClick("exportJson", exportTournamentJson);
  bindClick("createRestorePoint", createRestorePoint);
  bindClick("restoreLastPoint", restoreLastPoint);
  bindClick("exportStandingsCsv", exportStandingsCsv);
  bindClick("exportMatchesCsv", exportMatchesCsv);

  const importInput = getElement("importJson");

  if (importInput) {
    importInput.addEventListener("change", importTournamentJson);
  }

  bindClick("printReport", printTournamentReport);
  bindClick("printFullReport", printFullReport);
}

function bindAppEvents() {
  bindClick("displayModeToggle", toggleDisplayMode);

  bindClick("themeToggle", () => {
    document.body.classList.toggle("dark");

    const theme = document.body.classList.contains("dark") ? "dark" : "light";
    saveThemePreference(theme);
  });

  bindClick("resetTournament", () => {
    const confirmed = confirm("Reset this tournament? This cannot be undone.");
    if (!confirmed) return;

    resetState();
    clearGameForm();
    clearTeamForm();
    render();
  });
}

function initApp() {
  loadThemePreference();
  loadState();
  ensureStateShape();

  bindTournamentEvents();
  bindGameEvents();
  bindTeamEvents();
  bindRoundEvents();
  bindDataToolEvents();
  bindAppEvents();

  render();
  setSaveStatus("Loaded");
}

initApp();

PHDTournament.modules.push("app");