function getTournament() {
  return PHDTournament.state.tournament;
}

function renderTournamentForm() {
  const tournament = getTournament();

  document.getElementById("tournamentName").value = tournament.name;
  document.getElementById("tournamentDescription").value = tournament.description;
  document.getElementById("winPoints").value = tournament.settings.winPoints;
  document.getElementById("drawPoints").value = tournament.settings.drawPoints;
  document.getElementById("byePoints").value = tournament.settings.byePoints;
}

function renderTournamentSummary() {
  const tournament = getTournament();

  document.getElementById("pageTitle").textContent =
    tournament.name || "Tournament Manager";

  document.getElementById("summaryName").textContent =
    tournament.name || "Untitled Tournament";

  document.getElementById("summaryDescription").textContent =
    tournament.description || "No description yet.";

  document.getElementById("summaryScoring").textContent =
    `Win ${tournament.settings.winPoints}, Draw ${tournament.settings.drawPoints}, Bye ${tournament.settings.byePoints}`;

  document.getElementById("summaryTeams").textContent =
    PHDTournament.state.teams.length;

  document.getElementById("summaryRounds").textContent =
    PHDTournament.state.rounds.length;
}

function render() {
  renderTournamentForm();
  renderTournamentSummary();
  renderStatistics();
  renderTeams();
  renderRounds();
  renderStandings();
}

function updateTournamentSettings() {
  const tournament = getTournament();

  tournament.name =
    document.getElementById("tournamentName").value.trim() || "Untitled Tournament";

  tournament.description =
    document.getElementById("tournamentDescription").value.trim();

  tournament.settings.winPoints =
    Number(document.getElementById("winPoints").value) || 3;

  tournament.settings.drawPoints =
    Number(document.getElementById("drawPoints").value) || 0;

  tournament.settings.byePoints =
    Number(document.getElementById("byePoints").value) || 0;

  autosave();
  render();
}

function bindTournamentEvents() {
  document.getElementById("saveTournament")
    .addEventListener("click", updateTournamentSettings);

  [
    "tournamentName",
    "tournamentDescription",
    "winPoints",
    "drawPoints",
    "byePoints"
  ].forEach(id => {
    document.getElementById(id).addEventListener("change", updateTournamentSettings);
  });
}

function bindTeamEvents() {
  document.getElementById("saveTeam")
    .addEventListener("click", saveTeamFromForm);

  document.getElementById("clearTeamForm")
    .addEventListener("click", clearTeamForm);

  document.getElementById("teamName")
    .addEventListener("keydown", event => {
      if (event.key === "Enter") saveTeamFromForm();
    });

  document.getElementById("teamList")
    .addEventListener("click", event => {
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

function bindRoundEvents() {
  document.getElementById("generateRound")
    .addEventListener("click", generateRound);

  document.addEventListener("keydown", event => {
    if (event.ctrlKey && event.key.toLowerCase() === "backspace") {
      deleteLatestRound();
    }
  });

  document.getElementById("roundsContainer")
    .addEventListener("click", event => {
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

document.getElementById("themeToggle")
  .addEventListener("click", () => {
    document.body.classList.toggle("dark");

    const theme = document.body.classList.contains("dark") ? "dark" : "light";
    saveThemePreference(theme);
  });

  document.getElementById("resetTournament")
    .addEventListener("click", () => {
      const confirmed = confirm("Reset this tournament? This cannot be undone.");
      if (!confirmed) return;

      resetState();
      clearTeamForm();
      render();
    });
  document.getElementById("exportJson")
    .addEventListener("click", exportTournamentJson);
  document.getElementById("importJson")
    .addEventListener("change", importTournamentJson);
  document.getElementById("printReport")
  .addEventListener("click", printTournamentReport);
}

function initApp() {
  loadThemePreference();
  loadState();
  bindTournamentEvents();
  bindTeamEvents();
  bindRoundEvents();
  bindAppEvents();
  render();
  setSaveStatus("Loaded");
}

initApp();

PHDTournament.modules.push("app");