const PHDTeamPages = {
  navigationCreated: false,
  panelsCreated: false
};

function getTeamPageTabName(team) {
  return `team-${team.id}`;
}

function getTeamPagePanelId(team) {
  return `${getTeamPageTabName(team)}Tab`;
}

function getTeamPageMatches(teamId) {
  const rounds =
    Array.isArray(PHDTournament.state.rounds)
      ? PHDTournament.state.rounds
      : [];

  return rounds.flatMap(round =>
    (Array.isArray(round.matches)
      ? round.matches
      : []
    )
      .filter(
        match =>
          !match.bye &&
          (
            match.teamAId === teamId ||
            match.teamBId === teamId
          )
      )
      .map(match => ({
        ...match,
        roundId: round.id,
        roundNumber: round.number,
        roundCompleted:
          Boolean(round.completed)
      }))
  );
}

function getTeamPageByes(teamId) {
  const rounds =
    Array.isArray(PHDTournament.state.rounds)
      ? PHDTournament.state.rounds
      : [];

  return rounds.flatMap(round =>
    (Array.isArray(round.matches)
      ? round.matches
      : []
    )
      .filter(
        match =>
          match.bye &&
          match.teamAId === teamId
      )
      .map(match => ({
        ...match,
        roundId: round.id,
        roundNumber: round.number,
        roundCompleted:
          Boolean(round.completed)
      }))
  );
}

function getTeamPageStanding(teamId) {
  if (
    typeof getStandings !== "function"
  ) {
    return null;
  }

  const standings = getStandings();
  const matchStanding =
    typeof getGameStandings ===
      "function"
      ? getGameStandings("").find(
          standing =>
            standing.id === teamId
        )
      : null;

  const index =
    standings.findIndex(
      standing =>
        standing.id === teamId
    );

  if (index === -1) {
    return null;
  }

  return {
    ...standings[index],
    ...(matchStanding || {}),
    points: standings[index].points,
    gamesCompleted:
      standings[index].gamesCompleted,
    gamePoints:
      standings[index].gamePoints,
    position: index + 1
  };
}

function getTeamPageMatchResult(
  teamId,
  match
) {
  if (!match.completed) {
    return {
      label: "Scheduled",
      className: "open"
    };
  }

  const isTeamA =
    match.teamAId === teamId;

  const teamScore =
    isTeamA
      ? Number(match.scoreA)
      : Number(match.scoreB);

  const opponentScore =
    isTeamA
      ? Number(match.scoreB)
      : Number(match.scoreA);

  if (teamScore > opponentScore) {
    return {
      label: "Win",
      className: "completed team-result-win"
    };
  }

  if (teamScore < opponentScore) {
    return {
      label: "Loss",
      className: "completed team-result-loss"
    };
  }

  return {
    label: "Draw",
    className: "completed team-result-draw"
  };
}

function getTeamPageOpponent(
  teamId,
  match
) {
  const opponentId =
    match.teamAId === teamId
      ? match.teamBId
      : match.teamAId;

  if (
    !opponentId ||
    typeof getTeamById !== "function"
  ) {
    return null;
  }

  return getTeamById(opponentId);
}

function getTeamPageScore(
  teamId,
  match
) {
  if (!match.completed) {
    return "vs";
  }

  const isTeamA =
    match.teamAId === teamId;

  const teamScore =
    isTeamA
      ? match.scoreA
      : match.scoreB;

  const opponentScore =
    isTeamA
      ? match.scoreB
      : match.scoreA;

  return `${teamScore} – ${opponentScore}`;
}

function getTeamPageGameBreakdown(
  teamId,
  matches
) {
  const breakdown = new Map();

  matches.forEach(match => {
    const gameId =
      match.gameId || "unassigned";

    if (!breakdown.has(gameId)) {
      breakdown.set(gameId, {
        gameId,
        played: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        pointsFor: 0,
        pointsAgainst: 0
      });
    }

    const gameRecord =
      breakdown.get(gameId);

    if (!match.completed) {
      return;
    }

    const isTeamA =
      match.teamAId === teamId;

    const teamScore = Number(
      isTeamA
        ? match.scoreA
        : match.scoreB
    );

    const opponentScore = Number(
      isTeamA
        ? match.scoreB
        : match.scoreA
    );

    gameRecord.played += 1;
    gameRecord.pointsFor += teamScore;
    gameRecord.pointsAgainst +=
      opponentScore;

    if (teamScore > opponentScore) {
      gameRecord.wins += 1;
    } else if (
      teamScore < opponentScore
    ) {
      gameRecord.losses += 1;
    } else {
      gameRecord.draws += 1;
    }
  });

  return Array.from(
    breakdown.values()
  ).sort((recordA, recordB) => {
    const gameA =
      recordA.gameId === "unassigned" ||
      typeof getGameById !== "function"
        ? null
        : getGameById(recordA.gameId);

    const gameB =
      recordB.gameId === "unassigned" ||
      typeof getGameById !== "function"
        ? null
        : getGameById(recordB.gameId);

    const labelA =
      gameA ? gameA.name : "Unassigned";

    const labelB =
      gameB ? gameB.name : "Unassigned";

    return labelA.localeCompare(labelB);
  });
}

function renderTeamPageLogo(
  team,
  compact = false
) {
  if (team.logoUrl) {
    return `
      <img
        src="${escapeHtml(team.logoUrl)}"
        alt="${escapeHtml(team.name)} logo"
        onerror="this.remove()"
      />
    `;
  }

  const initials =
    team.shortName ||
    team.name
      .split(/\s+/)
      .map(part => part.slice(0, 1))
      .join("")
      .slice(0, 3)
      .toUpperCase();
  const shortName =
    String(initials || "TEAM");
  const fittedFontSize =
    Math.max(
      3.5,
      Math.min(
        14,
        40 /
          Math.max(
            1,
            shortName.length * 0.8
          )
      )
    );

  return `
    <span
      class="team-page-logo-text"
      ${
        compact
          ? `style="font-size:${fittedFontSize.toFixed(2)}px"`
          : ""
      }
    >
      ${escapeHtml(shortName)}
    </span>
  `;
}

function createTeamPageNavigation() {
  const gameButtons =
    document.getElementById(
      "gameTabButtons"
    );

  const navigation =
    gameButtons
      ? gameButtons.closest(".tab-nav")
      : document.querySelector(".tab-nav");

  if (!navigation) {
    return null;
  }

  let teamButtons =
    document.getElementById(
      "teamTabButtons"
    );

  if (teamButtons) {
    return teamButtons;
  }

  const divider =
    document.createElement("div");

  divider.className =
    "sidebar-divider team-pages-divider";

  const label =
    document.createElement("p");

  label.className =
    "sidebar-label team-pages-label";

  label.textContent = "Team Pages";

  teamButtons =
    document.createElement("span");

  teamButtons.id = "teamTabButtons";
  teamButtons.className =
    "team-tab-buttons";

  navigation.appendChild(divider);
  navigation.appendChild(label);
  navigation.appendChild(teamButtons);

  PHDTeamPages.navigationCreated = true;

  return teamButtons;
}

function createTeamPagePanelContainer() {
  let container =
    document.getElementById(
      "teamTabPanels"
    );

  if (container) {
    return container;
  }

  const main =
    document.querySelector(
      ".app-workspace main"
    );

  if (!main) {
    return null;
  }

  container =
    document.createElement("div");

  container.id = "teamTabPanels";

  const gamePanels =
    document.getElementById(
      "gameTabPanels"
    );

  if (
    gamePanels &&
    gamePanels.parentElement === main
  ) {
    gamePanels.insertAdjacentElement(
      "afterend",
      container
    );
  } else {
    main.appendChild(container);
  }

  PHDTeamPages.panelsCreated = true;

  return container;
}

function renderTeamPageNavigation(teams) {
  const buttonContainer =
    createTeamPageNavigation();

  if (!buttonContainer) {
    return;
  }

  if (!teams.length) {
    buttonContainer.innerHTML = `
      <span class="sidebar-empty">
        No teams yet
      </span>
    `;

    return;
  }

  buttonContainer.innerHTML =
    teams
      .map(
        team => `
          <button
            class="tab-button team-tab-button"
            type="button"
            data-tab="${getTeamPageTabName(
              team
            )}"
          >
            ${escapeHtml(
              team.shortName ||
              team.name
            )}
          </button>
        `
      )
      .join("");
}

function renderTeamPageMatchRows(
  team,
  matches
) {
  if (!matches.length) {
    return `
      <div class="empty-state">
        No matches have been scheduled
        for this team yet.
      </div>
    `;
  }

  return matches
    .sort(
      (matchA, matchB) =>
        matchB.roundNumber -
        matchA.roundNumber
    )
    .map(match => {
      const opponent =
        getTeamPageOpponent(
          team.id,
          match
        );

      const game =
        match.gameId &&
        typeof getGameById ===
          "function"
          ? getGameById(
              match.gameId
            )
          : null;

      const result =
        getTeamPageMatchResult(
          team.id,
          match
        );

      return `
        <article class="team-page-match">
          <div class="team-page-match-round">
            <span>
              Round ${match.roundNumber}
            </span>

            <small>
              ${escapeHtml(
                game
                  ? game.name
                  : "Game not assigned"
              )}
            </small>
          </div>

          <div class="team-page-opponent">
            <span
              class="team-logo team-page-opponent-logo"
              style="background:${
                opponent &&
                opponent.colour
                  ? escapeHtml(
                      opponent.colour
                    )
                  : "#6d5dfc"
              }"
            >
              ${
                opponent
                  ? renderTeamPageLogo(
                      opponent,
                      true
                    )
                  : "?"
              }
            </span>

            <div>
              <span class="muted">
                Opponent
              </span>

              <strong>
                ${escapeHtml(
                  opponent
                    ? opponent.name
                    : "Unknown team"
                )}
              </strong>
            </div>
          </div>

          <strong class="team-page-score">
            ${escapeHtml(
              getTeamPageScore(
                team.id,
                match
              )
            )}
          </strong>

          <span
            class="status-pill ${result.className}"
          >
            ${result.label}
          </span>
        </article>
      `;
    })
    .join("");
}

function renderTeamPageGameRows(
  breakdown
) {
  if (!breakdown.length) {
    return `
      <div class="empty-state">
        No game statistics are available yet.
      </div>
    `;
  }

  return breakdown
    .map(record => {
      const game =
        record.gameId === "unassigned" ||
        typeof getGameById !== "function"
          ? null
          : getGameById(
              record.gameId
            );

      const difference =
        record.pointsFor -
        record.pointsAgainst;

      return `
        <div class="team-page-game-row">
          <div>
            <strong>
              ${escapeHtml(
                game
                  ? game.name
                  : "Unassigned game"
              )}
            </strong>

            <span class="muted">
              ${escapeHtml(
                game && game.platform
                  ? game.platform
                  : "No platform listed"
              )}
            </span>
          </div>

          <span>
            ${record.played} played
          </span>

          <span>
            ${record.wins}W
            ·
            ${record.draws}D
            ·
            ${record.losses}L
          </span>

          <span>
            ${record.pointsFor}
            –
            ${record.pointsAgainst}
          </span>

          <strong>
            ${difference > 0 ? "+" : ""}
            ${difference}
          </strong>
        </div>
      `;
    })
    .join("");
}

function renderTeamPagePanel(team) {
  const matches =
    getTeamPageMatches(team.id);

  const byes =
    getTeamPageByes(team.id);

  const completedMatches =
    matches.filter(
      match => match.completed
    );
  const matchesPlayed =
    typeof getCompletedMatchCount ===
      "function"
      ? getCompletedMatchCount(
          team.id
        )
      : completedMatches.length;

  const standing =
    getTeamPageStanding(team.id);

  const breakdown =
    getTeamPageGameBreakdown(
      team.id,
      matches
    );

  const wins =
    standing
      ? standing.wins || 0
      : 0;

  const draws =
    standing
      ? standing.draws || 0
      : 0;

  const losses =
    standing
      ? standing.losses || 0
      : 0;

  const pointsFor =
    standing
      ? standing.pointsFor || 0
      : 0;

  const pointsAgainst =
    standing
      ? standing.pointsAgainst || 0
      : 0;

  const difference =
    pointsFor - pointsAgainst;

  return `
    <section
      id="${getTeamPagePanelId(team)}"
      class="tab-panel team-page-panel"
    >
      <div class="app-layout">
        <section
          class="card wide team-page-hero"
          style="--team-colour:${
            escapeHtml(
              team.colour || "#6d5dfc"
            )
          }"
        >
          <div class="team-page-header">
            <span
              class="team-page-logo"
              style="background:${
                escapeHtml(
                  team.colour ||
                  "#6d5dfc"
                )
              }"
            >
              ${renderTeamPageLogo(team)}
            </span>

            <div>
              <p class="eyebrow">
                Team Page
              </p>

              <h2>
                ${escapeHtml(team.name)}
              </h2>

              <p class="muted">
                ${escapeHtml(
                  team.shortName
                    ? `Competing as ${team.shortName}`
                    : "Tournament competitor"
                )}
              </p>
            </div>

            <div class="team-page-position">
              <span>
                Ladder Position
              </span>

              <strong>
                ${
                  standing
                    ? `#${standing.position}`
                    : "—"
                }
              </strong>
            </div>
          </div>
        </section>

        <section class="card">
          <h3>Tournament Points</h3>

          <strong class="big-number">
            ${
              standing
                ? standing.points || 0
                : 0
            }
          </strong>
        </section>

        <section class="card">
          <h3>Record</h3>

          <strong class="big-number team-page-record">
            ${wins}-${draws}-${losses}
          </strong>

          <p class="muted">
            Wins · Draws · Losses
          </p>
        </section>

        <section class="card">
          <h3>Matches Played</h3>

          <strong class="big-number">
            ${matchesPlayed}
          </strong>

          <p class="muted">
            ${matches.length -
              completedMatches.length}
            scheduled
          </p>
        </section>

        <section class="card">
          <h3>Score Difference</h3>

          <strong class="big-number">
            ${difference > 0 ? "+" : ""}
            ${difference}
          </strong>

          <p class="muted">
            ${pointsFor} for ·
            ${pointsAgainst} against
          </p>
        </section>

        <section class="card">
          <h3>Byes</h3>

          <strong class="big-number">
            ${byes.length}
          </strong>
        </section>

        <section class="card wide">
          <div class="section-heading">
            <div>
              <h2>Match History</h2>

              <p class="muted">
                Completed and upcoming matches
                for ${escapeHtml(team.name)}.
              </p>
            </div>
          </div>

          <div class="team-page-match-list">
            ${renderTeamPageMatchRows(
              team,
              matches
            )}
          </div>
        </section>

        <section class="card wide">
          <div class="section-heading">
            <div>
              <h2>Performance by Game</h2>

              <p class="muted">
                Results and scoring split across
                each assigned game.
              </p>
            </div>
          </div>

          <div class="team-page-game-list">
            ${renderTeamPageGameRows(
              breakdown
            )}
          </div>
        </section>
      </div>
    </section>
  `;
}

function renderTeamPages() {
  const teams =
    Array.isArray(
      PHDTournament.state.teams
    )
      ? PHDTournament.state.teams
      : [];

  renderTeamPageNavigation(teams);

  const panelContainer =
    createTeamPagePanelContainer();

  if (!panelContainer) {
    return;
  }

  panelContainer.innerHTML =
    teams
      .map(renderTeamPagePanel)
      .join("");
}

window.PHDTeamPages =
  PHDTeamPages;

window.renderTeamPages =
  renderTeamPages;

window.getTeamPageTabName =
  getTeamPageTabName;
