function createSwissPairings(
  context = {}
) {
  const state =
    context.state ||
    PHDTournament.state;
  const teams = state.teams;

  if (teams.length < 2) {
    alert(
      "Add at least two teams before generating a round."
    );

    return null;
  }

  return window.PHDSwissEngine
    .createRound({
      teams,
      standings:
        context.standings ||
        getStandings(),
      rounds: state.rounds,
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

async function generateRound() {
  const latestRound =
    PHDTournament.state.rounds.at(
      -1
    );

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
        window.PHDGameModes
          .DEFAULT_MODE_ID,
        {
          state:
            PHDTournament.state
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
      : "";

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

function renderRounds() {
  const status =
    document.getElementById(
      "roundStatus"
    );

  const container =
    document.getElementById(
      "roundsContainer"
    );

  if (!status || !container) {
    return;
  }

  container.innerHTML = "";

  if (
    PHDTournament.state.rounds
      .length === 0
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
    PHDTournament.state.rounds.filter(
      round => round.completed
    ).length;

  status.textContent =
    `${completedRounds} of ` +
    `${PHDTournament.state.rounds.length} ` +
    "rounds completed.";

  PHDTournament.state.rounds.forEach(
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
              >
                <div class="match-team">
                  ${renderMatchTeam(
                    teamA
                  )}
                </div>

                <div class="match-middle">
                  <label class="match-game-label">
                    Game

                    <select class="match-game-select">
                     ${buildGameOptions(
  match.gameId || "",
  "swiss"
)}
                    </select>
                  </label>

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
                  >
                    Save
                  </button>

                  <button
                    class="small-button secondary clear-match"
                    type="button"
                    data-round-id="${round.id}"
                    data-match-id="${match.id}"
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
