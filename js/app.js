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

  if (!Array.isArray(PHDTournament.state.events)) {
    PHDTournament.state.events = [];
  }
}

function renderTournamentForm() {
  const tournament = getTournament();

  setValue("tournamentName", tournament.name);
  setValue(
    "tournamentDescription",
    tournament.description
  );
  setValue(
    "tournamentLogoUrl",
    tournament.logoUrl || ""
  );
  setValue(
    "tournamentBannerUrl",
    tournament.bannerUrl || ""
  );
  setValue(
    "tournamentAccentColour",
    tournament.accentColour || "#6d5dfc"
  );

  setValue(
    "winPoints",
    tournament.settings.winPoints
  );
  setValue(
    "drawPoints",
    tournament.settings.drawPoints
  );
  setValue(
    "byePoints",
    tournament.settings.byePoints
  );
}

function renderBranding() {
  const tournament = getTournament();
  const accentColour =
    tournament.accentColour || "#6d5dfc";

  document.documentElement.style.setProperty(
    "--accent",
    accentColour
  );

  const headerLogo = getElement("headerLogo");

  if (headerLogo) {
    if (tournament.logoUrl) {
      headerLogo.innerHTML = `
        <img
          src="${escapeHtml(tournament.logoUrl)}"
          alt="${escapeHtml(tournament.name)} logo"
          onerror="this.parentElement.textContent='PHD'"
        />
      `;
    } else {
      headerLogo.textContent = "PHD";
    }
  }

  const banner = getElement("brandBanner");

  if (banner) {
    if (tournament.bannerUrl) {
      banner.classList.add("visible");

      banner.style.backgroundImage =
        `url("${tournament.bannerUrl}")`;
    } else {
      banner.classList.remove("visible");
      banner.style.backgroundImage = "";
    }
  }
}

function renderTournamentSummary() {
  const tournament = getTournament();

  setText(
    "pageTitle",
    tournament.name || "Tournament Manager"
  );

  setText(
    "summaryName",
    tournament.name || "Untitled Tournament"
  );

  setText(
    "summaryDescription",
    tournament.description ||
      "No description yet."
  );

  setText(
    "summaryScoring",
    `Win ${tournament.settings.winPoints}, ` +
      `Draw ${tournament.settings.drawPoints}, ` +
      `Bye ${tournament.settings.byePoints}`
  );

  setText(
    "summaryTeams",
    PHDTournament.state.teams.length
  );

  setText(
    "summaryGames",
    getGames().length
  );

  setText(
    "summaryRounds",
    PHDTournament.state.rounds.length
  );

  setText(
    "summaryBranding",
    tournament.logoUrl ||
      tournament.bannerUrl
      ? "Custom branding active"
      : "Default"
  );
}

function getGameTabName(game) {
  return `game-${game.id}`;
}

function getMatchesForGame(gameId) {
  return PHDTournament.state.rounds.flatMap(
    round =>
      round.matches
        .filter(
          match =>
            !match.bye &&
            match.gameId === gameId
        )
        .map(match => ({
          ...match,
          roundNumber: round.number
        }))
  );
}

function getStaticTabs() {
  return [
    "home",
    "admin",
    "games",
    "schedule",
    "events",
    "standings",
    "reports",
    "display"
  ];
}

function renderGameTabs() {
  const buttonContainer =
    getElement("gameTabButtons");

  const panelContainer =
    getElement("gameTabPanels");

  if (!buttonContainer || !panelContainer) {
    return;
  }

  const games = getGames();

  buttonContainer.innerHTML = games.length
    ? games
        .map(
          game => `
            <button
              class="tab-button game-tab-button"
              type="button"
              data-tab="${getGameTabName(game)}"
            >
              ${escapeHtml(game.name)}
            </button>
          `
        )
        .join("")
    : `
        <span class="sidebar-empty">
          No games yet
        </span>
      `;

  panelContainer.innerHTML = games
    .map(game => {
      const matches =
        getMatchesForGame(game.id);

      const completedMatches =
        matches.filter(
          match => match.completed
        );

      const matchRows = matches.length
        ? matches
            .map(match => {
              const teamA =
                getTeamById(match.teamAId);

              const teamB =
                getTeamById(match.teamBId);

              return `
                <div class="game-tab-match">
                  <span>
                    Round ${match.roundNumber}
                  </span>

                  <strong>
                    ${escapeHtml(
                      teamA
                        ? teamA.name
                        : "Unknown"
                    )}
                  </strong>

                  <span>
                    ${
                      match.completed
                        ? `${match.scoreA} - ${match.scoreB}`
                        : "vs"
                    }
                  </span>

                  <strong>
                    ${escapeHtml(
                      teamB
                        ? teamB.name
                        : "Unknown"
                    )}
                  </strong>

                  <span
                    class="status-pill ${
                      match.completed
                        ? "completed"
                        : "open"
                    }"
                  >
                    ${
                      match.completed
                        ? "Completed"
                        : "Open"
                    }
                  </span>
                </div>
              `;
            })
            .join("")
        : `
            <div class="empty-state">
              No matches have been assigned
              to this game yet.
            </div>
          `;

      return `
        <section
          id="${getGameTabName(game)}Tab"
          class="tab-panel"
        >
          <div class="app-layout">
            <section class="card wide">
              <div class="game-tab-header">
                <div>
                  <p class="eyebrow">
                    Game Page
                  </p>

                  <h2>
                    ${escapeHtml(game.name)}
                  </h2>

                  <p class="muted">
                    ${escapeHtml(
                      game.platform ||
                        "No platform listed"
                    )}
                    ${
                      game.format
                        ? ` · ${escapeHtml(
                            game.format
                          )}`
                        : ""
                    }
                  </p>
                </div>

                ${
                  game.logoUrl
                    ? `
                      <span class="game-tab-logo">
                        <img
                          src="${escapeHtml(
                            game.logoUrl
                          )}"
                          alt="${escapeHtml(
                            game.name
                          )} logo"
                        />
                      </span>
                    `
                    : `
                      <span class="game-tab-logo">
                        ${escapeHtml(
                          game.name
                            .slice(0, 3)
                            .toUpperCase()
                        )}
                      </span>
                    `
                }
              </div>
            </section>

            <section class="card">
              <h3>Total Matches</h3>

              <strong class="big-number">
                ${matches.length}
              </strong>
            </section>

            <section class="card">
              <h3>Completed Matches</h3>

              <strong class="big-number">
                ${completedMatches.length}
              </strong>
            </section>

            <section class="card wide">
              <div class="section-heading">
                <div>
                  <h2>
                    ${escapeHtml(game.name)}
                    Matches
                  </h2>

                  <p class="muted">
                    Matches assigned to this
                    game from the rounds section.
                  </p>
                </div>
              </div>

              <div class="game-tab-match-list">
                ${matchRows}
              </div>
            </section>
          </div>
        </section>
      `;
    })
    .join("");
}

function render() {
  ensureStateShape();

  renderBranding();
  renderTournamentForm();
  renderTournamentSummary();
  renderStatistics();
  renderGames();
  renderGameTabs();
  renderTeams();

if (
  typeof renderTeamPages ===
  "function"
) {
  renderTeamPages();
}
renderRounds();
renderEvents();
renderStandings();
  renderMatchHistory();
  renderRecentActivityTicker();
  renderReportPreview();

  if (
    document.body.classList.contains(
      "display-active"
    )
  ) {
    renderDisplayMode();
  }

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }

  restoreValidActiveTab();
}

function requireAdminForAction() {
  if (
    typeof isTournamentAdmin ===
      "function" &&
    isTournamentAdmin()
  ) {
    return true;
  }

  const authStatus =
    getElement("authStatus");

  if (authStatus) {
    authStatus.textContent =
      "Administrator access is required to make that change.";

    authStatus.classList.add("error");
  }

  return false;
}

function getTournamentAuditDetails(
  tournament
) {
  return {
    name:
      tournament.name || "",
    description:
      tournament.description || "",
    logoUrl:
      tournament.logoUrl || "",
    bannerUrl:
      tournament.bannerUrl || "",
    accentColour:
      tournament.accentColour ||
      "#6d5dfc",
    settings: {
      winPoints:
        tournament.settings.winPoints,
      drawPoints:
        tournament.settings.drawPoints,
      byePoints:
        tournament.settings.byePoints
    }
  };
}

function getTournamentChanges(
  previousTournament,
  updatedTournament
) {
  const changes = {};

  [
    "name",
    "description",
    "logoUrl",
    "bannerUrl",
    "accentColour"
  ].forEach(field => {
    const previousValue =
      previousTournament[field] || "";

    const updatedValue =
      updatedTournament[field] || "";

    if (
      previousValue !== updatedValue
    ) {
      changes[field] = {
        from: previousValue,
        to: updatedValue
      };
    }
  });

  [
    "winPoints",
    "drawPoints",
    "byePoints"
  ].forEach(field => {
    const previousValue =
      previousTournament.settings[field];

    const updatedValue =
      updatedTournament.settings[field];

    if (
      previousValue !== updatedValue
    ) {
      changes[`settings.${field}`] = {
        from: previousValue,
        to: updatedValue
      };
    }
  });

  return changes;
}

function previewTournamentBranding() {
  if (!requireAdminForAction()) {
    return;
  }

  const tournament = getTournament();

  tournament.logoUrl =
    getValue(
      "tournamentLogoUrl"
    ).trim();

  tournament.bannerUrl =
    getValue(
      "tournamentBannerUrl"
    ).trim();

  tournament.accentColour =
    getValue(
      "tournamentAccentColour"
    ) || "#6d5dfc";

  renderBranding();
}

async function updateTournamentSettings() {
  if (!requireAdminForAction()) {
    return;
  }

  const tournament = getTournament();

  const previousTournament =
    structuredClone(tournament);

  const name =
    getValue(
      "tournamentName"
    ).trim();

  tournament.name = isBlank(name)
    ? "Untitled Tournament"
    : name;

  tournament.description =
    getValue(
      "tournamentDescription"
    ).trim();

  tournament.logoUrl =
    getValue(
      "tournamentLogoUrl"
    ).trim();

  tournament.bannerUrl =
    getValue(
      "tournamentBannerUrl"
    ).trim();

  tournament.accentColour =
    getValue(
      "tournamentAccentColour"
    ) || "#6d5dfc";

  tournament.settings.winPoints =
    toPositiveNumber(
      getValue("winPoints"),
      3
    );

  tournament.settings.drawPoints =
    toNumber(
      getValue("drawPoints"),
      0
    );

  tournament.settings.byePoints =
    toNumber(
      getValue("byePoints"),
      0
    );

  const changes =
    getTournamentChanges(
      previousTournament,
      tournament
    );

  if (
    Object.keys(changes).length === 0
  ) {
    render();
    setSaveStatus(
      "No tournament changes"
    );
    return;
  }

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "tournament.updated",
        `Updated tournament settings for "${tournament.name}".`,
        {
          previous:
            getTournamentAuditDetails(
              previousTournament
            ),
          current:
            getTournamentAuditDetails(
              tournament
            ),
          changes
        }
      );
    }
  } catch (error) {
    console.error(
      "Tournament settings could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "Tournament settings could not be saved."
    );
  }
}

function switchTab(tabName) {
  const validTabName =
    getValidTabName(tabName);

  const tabButtons =
    document.querySelectorAll(
      ".tab-button"
    );

  const tabPanels =
    document.querySelectorAll(
      ".tab-panel"
    );

  tabButtons.forEach(button => {
    const isActive =
      button.dataset.tab ===
      validTabName;

    button.classList.toggle(
      "active",
      isActive
    );

    button.setAttribute(
      "aria-selected",
      String(isActive)
    );
  });

  tabPanels.forEach(panel => {
    const expectedId =
      `${validTabName}Tab`;

    panel.classList.toggle(
      "active",
      panel.id === expectedId
    );
  });

  const sidebar =
    document.querySelector(
      ".app-sidebar"
    );

  if (sidebar) {
    sidebar.classList.remove(
      "nav-open"
    );
  }

  localStorage.setItem(
    "phdTournamentActiveTab",
    validTabName
  );
}

function getValidTabName(tabName) {
  if (
    getStaticTabs().includes(tabName)
  ) {
    return tabName;
  }

  const matchingGame =
    getGames().find(
      game =>
        getGameTabName(game) ===
        tabName
    );

  if (matchingGame) {
    return tabName;
  }

  const teams =
    Array.isArray(
      PHDTournament.state.teams
    )
      ? PHDTournament.state.teams
      : [];

  const matchingTeam =
    teams.find(team => {
      const teamTabName =
        typeof getTeamPageTabName ===
        "function"
          ? getTeamPageTabName(team)
          : `team-${team.id}`;

      return teamTabName === tabName;
    });

  return matchingTeam
    ? tabName
    : "home";
}

function getSavedActiveTab() {
  return (
    localStorage.getItem(
      "phdTournamentActiveTab"
    ) || "home"
  );
}

function loadActiveTab() {
  switchTab(
    getValidTabName(
      getSavedActiveTab()
    )
  );
}

function restoreValidActiveTab() {
  const currentActiveButton =
    document.querySelector(
      ".tab-button.active"
    );

  const currentTab =
    currentActiveButton &&
    currentActiveButton.dataset.tab
      ? currentActiveButton.dataset.tab
      : getSavedActiveTab();

  switchTab(
    getValidTabName(currentTab)
  );
}

function bindTabEvents() {
  const tabNav =
    document.querySelector(
      ".tab-nav"
    );

  if (!tabNav) return;

  tabNav.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          ".tab-button"
        );

      if (!button) return;

      switchTab(
        button.dataset.tab
      );
    }
  );
}

function bindTournamentEvents() {
  bindClick(
    "saveTournament",
    updateTournamentSettings
  );

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
    bindChange(
      id,
      updateTournamentSettings
    );
  });

  [
    "tournamentLogoUrl",
    "tournamentBannerUrl",
    "tournamentAccentColour"
  ].forEach(id => {
    const element =
      getElement(id);

    if (!element) return;

    element.addEventListener(
      "input",
      previewTournamentBranding
    );
  });
}

function bindGameEvents() {
  bindClick("saveGame", () => {
    if (!requireAdminForAction()) {
      return;
    }

    saveGameFromForm();
    renderGameTabs();
    loadActiveTab();

    if (
      typeof applyAdminAccessState ===
      "function"
    ) {
      applyAdminAccessState();
    }
  });

  bindClick(
    "clearGameForm",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      clearGameForm();
    }
  );

  const gameNameInput =
    getElement("gameName");

  if (gameNameInput) {
    gameNameInput.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Enter" ||
          !requireAdminForAction()
        ) {
          return;
        }

        saveGameFromForm();
        renderGameTabs();
        loadActiveTab();
      }
    );
  }

  const gameList =
    getElement("gameList");

  if (gameList) {
    gameList.addEventListener(
      "click",
      event => {
        const gameId =
          event.target.dataset.gameId;

        if (!gameId) return;

        if (
          event.target.classList.contains(
            "edit-game"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          editGame(gameId);
          switchTab("games");
          return;
        }

        if (
          event.target.classList.contains(
            "delete-game"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          deleteGame(gameId);
          renderGameTabs();
          loadActiveTab();
        }
      }
    );
  }
}

function bindTeamEvents() {
  bindClick("saveTeam", () => {
    if (!requireAdminForAction()) {
      return;
    }

    saveTeamFromForm();
  });

  bindClick(
    "clearTeamForm",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      clearTeamForm();
    }
  );

  const teamNameInput =
    getElement("teamName");

  if (teamNameInput) {
    teamNameInput.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Enter" ||
          !requireAdminForAction()
        ) {
          return;
        }

        saveTeamFromForm();
      }
    );
  }

  const teamList =
    getElement("teamList");

  if (teamList) {
    teamList.addEventListener(
      "click",
      event => {
        const teamId =
          event.target.dataset.teamId;

        if (!teamId) return;

        if (
          event.target.classList.contains(
            "edit-team"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          editTeam(teamId);
          switchTab("admin");
          return;
        }

        if (
          event.target.classList.contains(
            "delete-team"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          deleteTeam(teamId);
        }
      }
    );
  }
}

function bindRoundEvents() {
  bindClick(
    "generateRound",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      generateRound();
    }
  );

  document.addEventListener(
    "keydown",
    event => {
      if (
        event.ctrlKey &&
        event.key.toLowerCase() ===
          "backspace"
      ) {
        if (
          !requireAdminForAction()
        ) {
          return;
        }

        event.preventDefault();
        deleteLatestRound();
      }
    }
  );

  const roundsContainer =
    getElement("roundsContainer");

  if (roundsContainer) {
    roundsContainer.addEventListener(
      "click",
      event => {
        const roundId =
          event.target.dataset.roundId;

        const matchId =
          event.target.dataset.matchId;

        if (
          event.target.classList.contains(
            "save-match"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          const matchElement =
            event.target.closest(
              ".match-card"
            );

          saveMatchScore(
            roundId,
            matchId,
            matchElement
          );

          return;
        }

        if (
          event.target.classList.contains(
            "clear-match"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          clearMatchScore(
            roundId,
            matchId
          );

          return;
        }

        if (
          event.target.classList.contains(
            "toggle-round"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          toggleRoundCompleted(
            roundId
          );
        }
      }
    );
  }
}

function bindDataToolEvents() {
  bindClick(
    "exportJson",
    exportTournamentJson
  );

  bindClick(
    "createRestorePoint",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      createRestorePoint();
    }
  );

  bindClick(
    "restoreLastPoint",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      restoreLastPoint();
    }
  );

  bindClick(
    "exportStandingsCsv",
    exportStandingsCsv
  );

  bindClick(
    "exportMatchesCsv",
    exportMatchesCsv
  );

  const importInput =
    getElement("importJson");

  if (importInput) {
    importInput.addEventListener(
      "change",
      event => {
        if (
          !requireAdminForAction()
        ) {
          event.target.value = "";
          return;
        }

        importTournamentJson(event);
      }
    );
  }

  bindClick(
    "printReport",
    printTournamentReport
  );

  bindClick(
    "printFullReport",
    printFullReport
  );
}

async function resetTournamentWithAudit() {
  if (!requireAdminForAction()) {
    return;
  }

  const confirmed = confirm(
    "Reset this tournament for every viewer? This cannot be undone unless a cloud restore point exists."
  );

  if (!confirmed) {
    return;
  }

  const previousState =
    structuredClone(
      PHDTournament.state
    );

  PHDTournament.state =
    mergeTournamentState(
      PHDTournament.defaultState
    );

  clearGameForm();
  clearTeamForm();
  render();
  switchTab("home");

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "tournament.reset",
        "Reset the tournament to its default state.",
        {
          previousSummary: {
            tournament:
              getTournamentAuditDetails(
                previousState.tournament
              ),
            teamCount:
              Array.isArray(
                previousState.teams
              )
                ? previousState.teams.length
                : 0,
            gameCount:
              Array.isArray(
                previousState.games
              )
                ? previousState.games.length
                : 0,
            roundCount:
              Array.isArray(
                previousState.rounds
              )
                ? previousState.rounds.length
                : 0
          },
          currentSummary: {
            tournament:
              getTournamentAuditDetails(
                PHDTournament.state.tournament
              ),
            teamCount:
              PHDTournament.state.teams.length,
            gameCount:
              PHDTournament.state.games.length,
            roundCount:
              PHDTournament.state.rounds.length
          }
        }
      );
    }
  } catch (error) {
    console.error(
      "The tournament could not be reset.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The tournament could not be reset."
    );
  }
}

function bindAppEvents() {
  bindClick(
    "displayModeToggle",
    toggleDisplayMode
  );

  bindClick(
    "displayModeTogglePage",
    toggleDisplayMode
  );

  bindClick(
    "themeToggle",
    () => {
      document.body.classList.toggle(
        "dark"
      );

      const theme =
        document.body.classList.contains(
          "dark"
        )
          ? "dark"
          : "light";

      saveThemePreference(theme);
    }
  );

  bindClick(
    "resetTournament",
    resetTournamentWithAudit
  );
}

function subscribeToCloudAndAuthUi() {
  if (
    typeof subscribeToAuth ===
    "function"
  ) {
    subscribeToAuth(() => {
      if (
        typeof applyAdminAccessState ===
        "function"
      ) {
        applyAdminAccessState();
      }
    });
  }
}

function initialiseAppInterface() {
  ensureStateShape();

  bindTabEvents();
  bindTournamentEvents();
  bindGameEvents();
  bindTeamEvents();
  bindRoundEvents();
  bindDataToolEvents();
  bindAppEvents();

  subscribeToCloudAndAuthUi();

  render();
  loadActiveTab();

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }
}

function initApp() {
  loadThemePreference();

  setSaveStatus(
    "Connecting to cloud..."
  );

  loadState();

  initialiseAppInterface();
}

initApp();

PHDTournament.modules.push("app");