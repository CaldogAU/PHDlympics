function createSwissPairings(
  context = {}
) {
  const state =
    context.state ||
    PHDTournament.state;
  const gameId =
    context.gameId || "";
  const game = gameId
    ? getGameById(gameId)
    : null;
  const teams = game &&
    window.PHDGameCapacity
      ? window.PHDGameCapacity
          .getEligibleTeams(
            game,
            state.teams
          )
      : state.teams;
  const rounds = gameId
    ? getRoundsForGame(gameId)
    : state.rounds;

  if (teams.length < 2) {
    alert(
      "Add at least two teams before generating a round."
    );

    return null;
  }

  const allStandings =
    context.standings ||
    getStandings(gameId);
  const eligibleTeamIds = new Set(
    teams.map(team => team.id)
  );
  const standings = allStandings.filter(
    standing => eligibleTeamIds.has(standing.id)
  );
  let lobbyTeamIds = [];

  if (
    game &&
    game.capacity &&
    game.capacity.configured !== false &&
    window.PHDGameCapacity
      .modeUsesLobbyAllocation(game.mode)
  ) {
    const rankByTeamId = new Map(
      standings.map((standing, index) => [
        standing.id,
        index
      ])
    );
    const entries =
      window.PHDGameCapacity
        .getActiveEntries(game, state.teams)
        .map(entry => ({
          ...entry,
          rankIndex:
            rankByTeamId.has(entry.officeId)
              ? rankByTeamId.get(entry.officeId)
              : Number.MAX_SAFE_INTEGER
        }));
    const allocation =
      window.PHDGameCapacity
        .allocateLobbies({
          entries,
          maxPlayersPerLobby:
            game.capacity.maxPlayersPerLobby
        });

    if (!allocation.valid) {
      alert(allocation.error);
      return null;
    }

    lobbyTeamIds = allocation.lobbies.map(
      lobby => lobby.entries.map(
        entry => entry.officeId
      )
    );
  }

  return window.PHDSwissEngine
    .createRound({
      teams,
      standings,
      rounds,
      gameId,
      lobbyTeamIds,
      createId: () =>
        crypto.randomUUID(),
      now: () =>
        new Date().toISOString()
    });
}

function getRoundById(roundId) {
  return (
    PHDTournament.state.rounds.find(
      round => round.id === roundId
    ) || null
  );
}

function getRoundGameId(round) {
  if (!round) {
    return "";
  }

  if (round.gameId) {
    return round.gameId;
  }

  const assignedMatch =
    Array.isArray(round.matches)
      ? round.matches.find(
          match => match.gameId
        )
      : null;

  return assignedMatch
    ? assignedMatch.gameId
    : "";
}

function getRoundsForGame(gameId) {
  return PHDTournament.state.rounds
    .map(round => {
      const roundGameId =
        round.gameId || "";
      const matches =
        round.matches.filter(
          match =>
            match.gameId === gameId ||
            (
              match.bye &&
              roundGameId === gameId
            )
        );

      return {
        ...round,
        matches
      };
    })
    .filter(
      round =>
        round.matches.length > 0
    );
}

function getMatch(
  roundId,
  matchId
) {
  const round =
    getRoundById(roundId);

  if (!round) {
    return null;
  }

  return (
    round.matches.find(
      match => match.id === matchId
    ) || null
  );
}

function getRoundAuditDetails(round) {
  return {
    roundId: round.id,
    roundNumber: round.number,
    completed:
      Boolean(round.completed),
    createdAt:
      round.createdAt || "",
    matchCount:
      round.matches.length,
    byeCount:
      round.matches.filter(
        match => match.bye
      ).length,
    matches:
      round.matches.map(match => ({
        matchId: match.id,
        teamAId:
          match.teamAId,
        teamBId:
          match.teamBId || null,
        gameId:
          match.gameId || "",
        bye:
          Boolean(match.bye),
        completed:
          Boolean(match.completed),
        scoreA:
          match.scoreA,
        scoreB:
          match.scoreB,
        winnerId:
          match.winnerId || null
      }))
  };
}

function getMatchAuditDetails(
  round,
  match
) {
  const teamA =
    getTeamById(match.teamAId);

  const teamB =
    match.teamBId
      ? getTeamById(
          match.teamBId
        )
      : null;

  const game =
    match.gameId
      ? getGameById(
          match.gameId
        )
      : null;

  return {
    roundId: round.id,
    roundNumber:
      round.number,
    matchId: match.id,
    teamAId:
      match.teamAId,
    teamAName:
      teamA
        ? teamA.name
        : "Unknown",
    teamBId:
      match.teamBId || null,
    teamBName:
      teamB
        ? teamB.name
        : "",
    gameId:
      match.gameId || "",
    gameName:
      game ? game.name : "",
    scoreA:
      match.scoreA,
    scoreB:
      match.scoreB,
    completed:
      Boolean(match.completed),
    winnerId:
      match.winnerId || null
  };
}

async function generateRound(gameId) {
  const game =
    getGameById(gameId);

  const modeId =
    game && (game.mode || "swiss");
  const mode =
    game &&
    window.PHDGameModes.get(modeId);
  if (
    !game ||
    !mode ||
    mode.getResultEntryType() !==
      "match-score"
  ) {
    alert(
      "Select a round-based game before generating a round."
    );
    return;
  }

  const gameRounds =
    getRoundsForGame(gameId);
  const latestRound =
    gameRounds.at(-1);

  if (
    latestRound &&
    !latestRound.completed
  ) {
    alert(
      "Complete the current round before generating another one."
    );

    return;
  }

  const round =
    window.PHDGameModes
      .createNextRound(
        modeId,
        {
          state:
            PHDTournament.state,
          gameId,
          rounds: gameRounds
        }
      );

  if (!round) {
    return;
  }

  PHDTournament.state.rounds.push(
    round
  );

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "round.created",
        `Generated Round ${round.number}.`,
        {
          round:
            getRoundAuditDetails(
              round
            )
        }
      );
    }
  } catch (error) {
    console.error(
      "The round could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The round could not be saved."
    );
  }
}

async function saveMatchScore(
  roundId,
  matchId,
  matchElement
) {
  const round =
    getRoundById(roundId);

  const match =
    getMatch(
      roundId,
      matchId
    );

  if (
    !round ||
    !match ||
    match.bye
  ) {
    return;
  }

  const scoreAInput =
    matchElement.querySelector(
      ".score-a"
    );

  const scoreBInput =
    matchElement.querySelector(
      ".score-b"
    );

  const gameSelect =
    matchElement.querySelector(
      ".match-game-select"
    );

  const scoreA =
    Number(scoreAInput.value);

  const scoreB =
    Number(scoreBInput.value);

  if (
    Number.isNaN(scoreA) ||
    Number.isNaN(scoreB) ||
    scoreA < 0 ||
    scoreB < 0
  ) {
    alert(
      "Enter valid non-negative scores."
    );

    return;
  }

  const previousMatch =
    structuredClone(match);

  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.gameId =
    gameSelect
      ? gameSelect.value
      : match.gameId;

  match.completed = true;
  match.updatedAt =
    new Date().toISOString();

  if (scoreA > scoreB) {
    match.winnerId =
      match.teamAId;
  } else if (scoreB > scoreA) {
    match.winnerId =
      match.teamBId;
  } else {
    match.winnerId = null;
  }

  render();

  try {
    await saveState();

    const teamA =
      getTeamById(
        match.teamAId
      );

    const teamB =
      getTeamById(
        match.teamBId
      );

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        previousMatch.completed
          ? "match.updated"
          : "match.completed",
        `Saved Round ${round.number}: ${
          teamA
            ? teamA.name
            : "Unknown"
        } ${scoreA}–${scoreB} ${
          teamB
            ? teamB.name
            : "Unknown"
        }.`,
        {
          previous:
            getMatchAuditDetails(
              round,
              previousMatch
            ),
          current:
            getMatchAuditDetails(
              round,
              match
            )
        }
      );
    }
  } catch (error) {
    console.error(
      "The match result could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The match result could not be saved."
    );
  }
}

async function clearMatchScore(
  roundId,
  matchId
) {
  const round =
    getRoundById(roundId);

  const match =
    getMatch(
      roundId,
      matchId
    );

  if (
    !round ||
    !match ||
    match.bye
  ) {
    return;
  }

  const previousMatch =
    structuredClone(match);

  match.scoreA = null;
  match.scoreB = null;
  match.completed = false;
  match.winnerId = null;
  match.updatedAt = null;

  round.completed = false;

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "match.cleared",
        `Cleared a result from Round ${round.number}.`,
        {
          previous:
            getMatchAuditDetails(
              round,
              previousMatch
            ),
          current:
            getMatchAuditDetails(
              round,
              match
            )
        }
      );
    }
  } catch (error) {
    console.error(
      "The match result could not be cleared.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The match result could not be cleared."
    );
  }
}

async function toggleRoundCompleted(
  roundId
) {
  const round =
    getRoundById(roundId);

  if (!round) {
    return;
  }

  const incompleteMatches =
    round.matches.filter(
      match =>
        !match.bye &&
        !match.completed
    );

  if (
    !round.completed &&
    incompleteMatches.length > 0
  ) {
    alert(
      "Complete every match in this round first."
    );

    return;
  }

  const previousCompleted =
    Boolean(round.completed);

  round.completed =
    !round.completed;

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        round.completed
          ? "round.completed"
          : "round.reopened",
        round.completed
          ? `Completed Round ${round.number}.`
          : `Reopened Round ${round.number}.`,
        {
          roundId: round.id,
          roundNumber:
            round.number,
          fromCompleted:
            previousCompleted,
          toCompleted:
            round.completed
        }
      );
    }
  } catch (error) {
    console.error(
      "The round status could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The round status could not be saved."
    );
  }
}

function renderMatchTeam(team) {
  if (!team) {
    return `
      <span
        class="team-logo"
        style="background:#6d5dfc"
      >
        ?
      </span>
      <strong>Unknown</strong>
    `;
  }

  return `
    <span
      class="team-logo"
      style="background:${escapeHtml(
        team.colour ||
          "#6d5dfc"
      )}"
    >
      ${renderTeamLogo(team)}
    </span>

    <strong>
      ${escapeHtml(team.name)}
    </strong>
  `;
}

function renderSwissGameManagement(
  game
) {
  const locked =
    Boolean(game.completed);
  const modeName =
    typeof getGameModeLabel ===
      "function"
      ? getGameModeLabel(game)
      : "Match Tournament";
  const scoring = {
    winPoints: 3,
    drawPoints: 1,
    byePoints: 3,
    ...(game.settings || {})
  };
  return `
    <section class="card wide">
      <div class="section-heading">
        <div>
          <p class="eyebrow">
            ${escapeHtml(modeName)}
          </p>
          <h2>Rounds</h2>
          <p
            id="roundStatus-${game.id}"
            class="muted"
          >
            No rounds generated yet.
          </p>
        </div>

        <div class="button-row">
          <span class="status-pill ${locked ? "completed" : "open"}">
            ${locked ? "Completed" : "Open"}
          </span>
          ${
            locked
              ? `<button class="secondary reopen-match-game" type="button"
                   data-game-id="${game.id}">Reopen Game</button>`
              : `<button class="generate-game-round" type="button"
                   data-game-id="${game.id}">Generate Next Round</button>
                 <button class="success close-match-game" type="button"
                   data-game-id="${game.id}">Complete Game</button>`
          }
        </div>
      </div>

      <div
        class="game-scoring-form grid three"
        data-game-id="${game.id}"
      >
        <label>
          Win Points
          <input
            data-score-field="winPoints"
            type="number"
            min="0"
            value="${scoring.winPoints}"
            ${locked ? "disabled" : ""}
          />
        </label>
        <label>
          Draw Points
          <input
            data-score-field="drawPoints"
            type="number"
            min="0"
            value="${scoring.drawPoints}"
            ${locked ? "disabled" : ""}
          />
        </label>
        <label>
          Bye Points
          <input
            data-score-field="byePoints"
            type="number"
            min="0"
            value="${scoring.byePoints}"
            ${locked ? "disabled" : ""}
          />
        </label>
        <button
          class="save-game-scoring"
          type="button"
          data-game-id="${game.id}"
          ${locked ? "disabled" : ""}
        >
          Save Scoring
        </button>
      </div>

      <div
        id="roundsContainer-${game.id}"
        class="rounds-container"
      ></div>
    </section>
  `;
}

async function saveGameScoring(gameId, form) {
  const game = getGameById(gameId);
  if (!game || !form) return;

  const read = field => {
    const input = form.querySelector(
      `[data-score-field="${field}"]`
    );
    const value = Number(input && input.value);
    return Number.isFinite(value) && value >= 0
      ? value
      : null;
  };
  const settings = {
    winPoints: read("winPoints"),
    drawPoints: read("drawPoints"),
    byePoints: read("byePoints")
  };
  if (Object.values(settings).some(value => value === null)) {
    alert("Scoring values must be zero or greater.");
    return;
  }

  game.settings = settings;
  await saveState();
  render();
}

async function closeMatchGame(gameId) {
  const game = getGameById(gameId);
  const rounds = getRoundsForGame(gameId);

  if (!game) return;

  if (
    rounds.length === 0 ||
    rounds.some(
      round => !round.completed
    )
  ) {
    alert(
      "Complete every generated round before completing this game."
    );
    return;
  }

  if (
    !confirm(
      "Complete this game and add its final tournament points to the overall standings?"
    )
  ) {
    return;
  }

  game.completed = true;
  game.completedAt =
    new Date().toISOString();
  await saveState();
  render();

  if (
    typeof recordAuditEntry ===
    "function"
  ) {
    await recordAuditEntry(
      "game.results.completed",
      `Completed ${game.name} and assigned tournament points.`,
      { gameId }
    );
  }
}

async function reopenMatchGame(gameId) {
  const game = getGameById(gameId);

  if (!game) return;

  if (
    !confirm(
      "Reopen this game? Its tournament points will be removed until it is completed again."
    )
  ) {
    return;
  }

  game.completed = false;
  game.completedAt = "";
  await saveState();
  render();
}

function renderRounds(gameId) {
  const status =
    document.getElementById(
      `roundStatus-${gameId}`
    );

  const container =
    document.getElementById(
      `roundsContainer-${gameId}`
    );

  if (!status || !container) {
    return;
  }

  container.innerHTML = "";
  const rounds =
    getRoundsForGame(gameId);
  const game = getGameById(gameId);
  const gameLocked =
    Boolean(game && game.completed);

  if (
    rounds.length === 0
  ) {
    status.textContent =
      "No rounds generated yet.";

    container.innerHTML = `
      <div class="empty-state">
        Add teams, then generate the first Swiss round.
      </div>
    `;

    return;
  }

  const completedRounds =
    rounds.filter(
      round => round.completed
    ).length;

  status.textContent =
    `${completedRounds} of ` +
    `${rounds.length} ` +
    "rounds completed.";

  rounds.forEach(
    round => {
      const card =
        document.createElement(
          "article"
        );

      card.className =
        `round-card ${
          round.completed
            ? "completed"
            : ""
        }`;

      const matchesHtml =
        round.matches
          .map(match => {
            if (
              typeof isTeamScopedStaff ===
                "function" &&
              isTeamScopedStaff() &&
              !gameLocked &&
              match.teamAId !==
                getAssignedStaffTeamId() &&
              match.teamBId !==
                getAssignedStaffTeamId()
            ) {
              return "";
            }

            const teamA =
              getTeamById(
                match.teamAId
              );

            const teamB =
              match.teamBId
                ? getTeamById(
                    match.teamBId
                  )
                : null;

            if (match.bye) {
              return `
                <div class="match-card bye-card">
                  <div class="match-team">
                    ${renderMatchTeam(
                      teamA
                    )}
                  </div>

                  <span class="bye-pill">
                    BYE
                  </span>

                  <div></div>
                </div>
              `;
            }

            return `
              <div
                class="match-card"
                data-round-id="${round.id}"
                data-match-id="${match.id}"
                data-team-a-id="${match.teamAId}"
                data-team-b-id="${match.teamBId || ""}"
              >
                <div class="match-team">
                  ${renderMatchTeam(
                    teamA
                  )}
                </div>

                <div class="match-middle">
                  <span class="match-game-label">
                    ${
                      match.lobbyId
                        ? `${escapeHtml(
                            match.lobbyId
                              .replace("lobby-", "Lobby ")
                          )} - `
                        : ""
                    }
                    ${escapeHtml(
                      getGameLabel(
                        gameId
                      )
                    )}
                  </span>

                  <div class="score-box">
                    <input
                      class="score-a"
                      type="number"
                      min="0"
                      value="${
                        match.scoreA ??
                        ""
                      }"
                      placeholder="0"
                      ${gameLocked ? "disabled" : ""}
                    />

                    <span>–</span>

                    <input
                      class="score-b"
                      type="number"
                      min="0"
                      value="${
                        match.scoreB ??
                        ""
                      }"
                      placeholder="0"
                      ${gameLocked ? "disabled" : ""}
                    />
                  </div>
                </div>

                <div class="match-team">
                  ${renderMatchTeam(
                    teamB
                  )}
                </div>

                <div class="match-actions">
                  <button
                    class="small-button success save-match"
                    type="button"
                    data-round-id="${round.id}"
                    data-match-id="${match.id}"
                    ${gameLocked ? "disabled" : ""}
                  >
                    Save
                  </button>

                  <button
                    class="small-button secondary clear-match"
                    type="button"
                    data-round-id="${round.id}"
                    data-match-id="${match.id}"
                    ${gameLocked ? "disabled" : ""}
                  >
                    Clear
                  </button>

                  <span
                    class="status-pill ${
                      match.completed
                        ? "completed"
                        : "open"
                    }"
                  >
                    ${
                      match.completed
                        ? "Saved"
                        : "Open"
                    }
                  </span>
                </div>
              </div>
            `;
          })
          .join("");

      card.innerHTML = `
        <div class="round-heading">
          <div>
            <h3>
              Round ${round.number}
            </h3>

            <span
              class="status-pill ${
                round.completed
                  ? "completed"
                  : "open"
              }"
            >
              ${
                round.completed
                  ? "Completed"
                  : "In Progress"
              }
            </span>
          </div>

          <button
            class="small-button ${
              round.completed
                ? "warning"
                : "success"
            } toggle-round"
            type="button"
            data-round-id="${round.id}"
            ${gameLocked ? "disabled" : ""}
          >
            ${
              round.completed
                ? "Reopen Round"
                : "Complete Round"
            }
          </button>
        </div>

        <div class="match-list">
          ${matchesHtml}
        </div>
      `;

      container.appendChild(card);
    }
  );
}

async function deleteLatestRound() {
  if (
    PHDTournament.state.rounds
      .length === 0
  ) {
    alert(
      "There are no rounds to delete."
    );

    return;
  }

  const latestRound =
    PHDTournament.state.rounds.at(
      -1
    );

  const confirmed = confirm(
    `Delete Round ${latestRound.number}? This cannot be undone.`
  );

  if (!confirmed) {
    return;
  }

  const deletedRound =
    structuredClone(
      latestRound
    );

  PHDTournament.state.rounds.pop();

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "round.deleted",
        `Deleted Round ${deletedRound.number}.`,
        {
          round:
            getRoundAuditDetails(
              deletedRound
            )
        }
      );
    }
  } catch (error) {
    console.error(
      "The round could not be deleted.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The round could not be deleted."
    );
  }
}

PHDTournament.modules.push(
  "rounds"
);
