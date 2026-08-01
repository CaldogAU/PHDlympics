function getEventGames() {
  return getGames().filter(game => {
    const mode = game.mode || "swiss";

    return (
      mode === "time-trial" ||
      mode === "grand-prix"
    );
  });
}

function getEventByGameId(gameId) {
  return (
    PHDTournament.state.events.find(
      event => event.gameId === gameId
    ) || null
  );
}

function getEventResultForTeam(
  event,
  teamId
) {
  if (
    !event ||
    !Array.isArray(event.results)
  ) {
    return null;
  }

  return (
    event.results.find(
      result =>
        result.teamId === teamId
    ) || null
  );
}

function getEventResultForParticipant(event, participantId) {
  if (!event || !Array.isArray(event.results)) return null;
  return event.results.find(result =>
    (result.participantId || result.teamId) === participantId
  ) || null;
}

function getGrandPrixParticipants(event, includeAll = false) {
  const game = event && typeof getGameById === "function"
    ? getGameById(event.gameId)
    : null;
  if (!game || !window.PHDGameCapacity) return [];

  const allTeams = window.PHDGameCapacity.getEligibleTeams(
    game,
    PHDTournament.state.teams || []
  );
  let participants = [];

  if (!game.capacity || game.capacity.configured === false) {
    participants = allTeams.map(team => ({
      participantId: team.id,
      teamId: team.id,
      playerIndex: 0,
      playerLabel: "Player A",
      displayName: team.name,
      lobbyId: "lobby-1",
      lobbyName: "Lobby 1",
      lobbySize: allTeams.length
    }));
  } else {
    const allocation = window.PHDGameCapacity.allocateLobbies({
      entries: window.PHDGameCapacity.getActiveEntries(
        game,
        PHDTournament.state.teams || []
      ),
      maxPlayersPerLobby: game.capacity.maxPlayersPerLobby
    });
    if (!allocation.valid) return [];

    participants = allocation.lobbies.flatMap(lobby =>
      lobby.entries.flatMap(entry => {
        const team = getTeamById(entry.officeId);
        return Array.from(
          { length: entry.competitorCount },
          (_, playerIndex) => {
            const playerLetter = String.fromCharCode(65 + playerIndex);
            return {
              participantId: `${entry.officeId}:player-${playerIndex + 1}`,
              teamId: entry.officeId,
              playerIndex,
              playerLabel: `Player ${playerLetter}`,
              displayName: `${team ? team.name : entry.officeName} - Player ${playerLetter}`,
              lobbyId: lobby.id,
              lobbyName: lobby.name,
              lobbySize: lobby.competitorTotal
            };
          }
        );
      })
    );
  }

  if (
    !includeAll &&
    !event.completed &&
    typeof isTeamScopedStaff === "function" &&
    isTeamScopedStaff()
  ) {
    const teamId = getAssignedStaffTeamId();
    return participants.filter(item => item.teamId === teamId);
  }
  return participants;
}

function getGrandPrixTeamRankings(event) {
  const participants = getGrandPrixParticipants(event, true);
  const byTeam = new Map();

  participants.forEach(participant => {
    if (!byTeam.has(participant.teamId)) {
      const team = getTeamById(participant.teamId);
      byTeam.set(participant.teamId, {
        teamId: participant.teamId,
        teamName: team ? team.name : "",
        score: 0,
        bestFinish: Number.MAX_SAFE_INTEGER
      });
    }
    const result = getEventResultForParticipant(
      event,
      participant.participantId
    );
    const position = Number(result && result.finishPosition);
    if (!Number.isInteger(position)) return;
    const ranking = byTeam.get(participant.teamId);
    ranking.score += participant.lobbySize - position + 1;
    ranking.bestFinish = Math.min(ranking.bestFinish, position);
  });

  return [...byTeam.values()]
    .sort((teamA, teamB) =>
      teamB.score - teamA.score ||
      teamA.bestFinish - teamB.bestFinish ||
      teamA.teamName.localeCompare(teamB.teamName)
    )
    .map((ranking, index) => ({ ...ranking, position: index + 1 }));
}

function getVisibleEventTeams(event) {
  const game = event &&
    typeof getGameById === "function"
    ? getGameById(event.gameId)
    : null;
  const teams = game && window.PHDGameCapacity
    ? window.PHDGameCapacity
        .getEligibleTeams(
          game,
          PHDTournament.state.teams || []
        )
    : [...(PHDTournament.state.teams || [])];

  if (
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff() &&
    !event.completed
  ) {
    const assignedTeamId =
      getAssignedStaffTeamId();

    return teams.filter(
      team =>
        team.id === assignedTeamId
    );
  }

  if (!event.completed) {
    return teams;
  }

  if (
    event.mode === "grand-prix" &&
    Array.isArray(event.results) &&
    event.results.some(result => result.participantId)
  ) {
    const rankByTeamId = new Map(
      getGrandPrixTeamRankings(event).map(
        ranking => [ranking.teamId, ranking.position]
      )
    );
    return teams.sort((teamA, teamB) =>
      (rankByTeamId.get(teamA.id) || Number.MAX_SAFE_INTEGER) -
      (rankByTeamId.get(teamB.id) || Number.MAX_SAFE_INTEGER)
    );
  }

  return teams.sort((teamA, teamB) => {
    const resultA =
      getEventResultForTeam(
        event,
        teamA.id
      );
    const resultB =
      getEventResultForTeam(
        event,
        teamB.id
      );

    if (event.mode === "grand-prix") {
      return Number(
        resultA &&
          resultA.finishPosition
      ) -
        Number(
          resultB &&
            resultB.finishPosition
        );
    }

    return Math.floor(
      Number(
        resultA &&
          resultA.timeMilliseconds
      ) / 1000
    ) -
      Math.floor(
        Number(
          resultB &&
            resultB.timeMilliseconds
        ) / 1000
      );
  });
}

function getEventResultPosition(
  event,
  teamId
) {
  if (!event.completed) return null;

  const teams =
    getVisibleEventTeams(event);
  const index =
    teams.findIndex(
      team => team.id === teamId
    );

  return index === -1
    ? null
    : index + 1;
}

function canRevealDraftEventRankings() {
  return !(
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff()
  );
}

function renderEventGameOptions() {
  const select =
    getElement("eventGameSelect");

  if (!select) {
    return;
  }

  const selectedGameId =
    select.value;

  const games =
    getEventGames();

  select.innerHTML = [
    `
      <option value="">
        Select a Time Trial or Grand Prix game
      </option>
    `,
    ...games.map(game => {
      const existingEvent =
        getEventByGameId(game.id);

      return `
        <option
          value="${game.id}"
          ${
            game.id === selectedGameId
              ? "selected"
              : ""
          }
          ${
            existingEvent
              ? "disabled"
              : ""
          }
        >
          ${escapeHtml(game.name)}
          — ${escapeHtml(
            getGameModeLabel(game)
          )}
          ${
            existingEvent
              ? " (event already created)"
              : ""
          }
        </option>
      `;
    })
  ].join("");
}

function renderTimeTrialEntries(
  event
) {
  const participants = getGrandPrixParticipants(event);
  const allParticipants = getGrandPrixParticipants(event, true);
  const rankings = getGrandPrixTeamRankings(event);
  const officeCount = new Set(
    allParticipants.map(item => item.teamId)
  ).size;

  if (participants.length === 0) {
    return `
      <div class="empty-state">
        Add teams before entering Time Trial results.
      </div>
    `;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Team</th>
            <th>Minutes</th>
            <th>Seconds</th>
            <th>Tournament Points</th>
          </tr>
        </thead>

        <tbody>
          ${teams
            .map(team => {
              const result =
                getEventResultForTeam(
                  event,
                  team.id
                );

              const totalMilliseconds =
                result &&
                Number.isFinite(
                  Number(
                    result.timeMilliseconds
                  )
                )
                  ? Number(
                      result.timeMilliseconds
                    )
                  : null;

              const totalSeconds =
                totalMilliseconds == null
                  ? null
                  : Math.floor(
                      totalMilliseconds / 1000
                    );

              const minutes =
                totalSeconds == null
                  ? ""
                  : Math.floor(
                      totalSeconds / 60
                    );

              const seconds =
                totalSeconds == null
                  ? ""
                  : totalSeconds % 60;
              const position =
                getEventResultPosition(
                  event,
                  team.id
                );

              return `
                <tr
                  class="animated-ranking-row"
                  data-event-id="${event.id}"
                  data-team-id="${team.id}"
                >
                  <td class="rank-cell">
                    ${position || "—"}
                  </td>
                  <td>
                    <strong>
                      ${escapeHtml(
                        team.name
                      )}
                    </strong>
                  </td>

                  <td>
                    <input
                      class="time-minutes"
                      type="number"
                      min="0"
                      step="1"
                      value="${minutes}"
                      placeholder="0"
                      ${
                        event.completed
                          ? "disabled"
                          : ""
                      }
                    />
                  </td>
                  <td>
                    <input
                      class="time-seconds"
                      type="number"
                      min="0"
                      max="59"
                      step="1"
                      value="${seconds}"
                      placeholder="00"
                      ${
                        event.completed
                          ? "disabled"
                          : ""
                      }
                    />
                  </td>

                  <td class="event-tournament-points">
                    ${
                      position
                        ? participantCount -
                          position +
                          1
                        : "—"
                    }
                  </td>
                </tr>
              `;
            })
            .join("")}
        </tbody>
      </table>
    </div>

    ${
      event.completed
        ? ""
        : `
          <div class="button-row">
            <button
              class="save-time-trial-results"
              type="button"
              data-event-id="${event.id}"
            >
              ${
                typeof isTeamScopedStaff ===
                  "function" &&
                isTeamScopedStaff()
                  ? "Save My Time"
                  : "Save Times"
              }
            </button>
          </div>
        `
    }
  `;
}

function renderGrandPrixEntries(
  event
) {
  const teams =
    getVisibleEventTeams(event);
  const participantCount =
    getVisibleEventTeams({
      ...event,
      completed: true
    }).length;

  if (teams.length === 0) {
    return `
      <div class="empty-state">
        Add teams before entering Grand Prix results.
      </div>
    `;
  }

  return `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Competitor</th>
            <th>Lobby</th>
            <th>Finishing Position</th>
            <th>Lobby Points</th>
            <th>Tournament Points</th>
          </tr>
        </thead>
        <tbody>
          ${participants.map(participant => {
            const result = getEventResultForParticipant(
              event,
              participant.participantId
            );
            const ranking = rankings.find(
              item => item.teamId === participant.teamId
            );
            const finishPosition = Number(
              result && result.finishPosition
            );
            const position = (
              event.completed ||
              canRevealDraftEventRankings()
            ) && ranking &&
              Number.isInteger(finishPosition)
              ? ranking.position
              : null;

            return `
              <tr
                class="animated-ranking-row"
                data-event-id="${event.id}"
                data-team-id="${participant.teamId}"
                data-participant-id="${participant.participantId}"
                data-player-index="${participant.playerIndex}"
                data-player-label="${participant.playerLabel}"
                data-lobby-id="${participant.lobbyId}"
                data-lobby-size="${participant.lobbySize}"
              >
                <td class="rank-cell">
                  ${position || "—"}
                </td>
                <td>
                  <strong>
                    ${escapeHtml(participant.displayName)}
                  </strong>
                </td>
                <td>${escapeHtml(participant.lobbyName)}</td>
                <td>
                  <input
                    class="finish-position"
                    type="number"
                    min="1"
                    max="${participant.lobbySize}"
                    step="1"
                    value="${
                      result
                        ? result.finishPosition
                        : ""
                    }"
                    ${
                      event.completed
                        ? "disabled"
                        : ""
                    }
                  />
                </td>
                <td class="grand-prix-lobby-points">
                  ${Number.isInteger(finishPosition)
                    ? participant.lobbySize - finishPosition + 1
                    : "—"}
                </td>
                <td class="event-tournament-points">
                  ${position ? officeCount - position + 1 : "—"}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    ${
      event.completed
        ? ""
        : `
          <div class="button-row">
            <button
              class="save-grand-prix-results"
              type="button"
              data-event-id="${event.id}"
            >
              ${
                typeof isTeamScopedStaff ===
                  "function" &&
                isTeamScopedStaff()
                  ? "Save My Result"
                  : "Save Finishing Order"
              }
            </button>
          </div>
        `
    }
  `;
}

function renderEventGameManagement(
  game
) {
  const event =
    getEventByGameId(game.id);
  const modeName =
    getGameModeLabel(game);

  if (!event) {
    return `
      <section class="card wide">
        <div class="section-heading">
          <div>
            <p class="eyebrow">
              ${escapeHtml(modeName)}
            </p>
            <h2>Event Management</h2>
            <p class="muted">
              Create this event to begin entering results.
            </p>
          </div>
          <button
            class="create-game-event"
            type="button"
            data-game-id="${game.id}"
          >
            Create Event
          </button>
        </div>
      </section>
    `;
  }

  return `
    <section
      class="card wide"
      data-event-workspace="${event.id}"
      data-event-mode="${event.mode}"
      data-event-completed="${event.completed}"
    >
      <div class="section-heading">
        <div>
          <p class="eyebrow">
            ${escapeHtml(modeName)}
          </p>
          <h2>Event Management</h2>
          <p class="muted">
            ${
              event.completed
                ? "Results completed"
                : "Enter results for every team"
            }
          </p>
        </div>
        <div class="button-row">
          <span
            class="status-pill ${
              event.completed
                ? "completed"
                : "open"
            }"
          >
            ${
              event.completed
                ? "Completed"
                : "Open"
            }
          </span>
          ${
            event.completed
              ? `
                <button
                  class="secondary reopen-game-event"
                  type="button"
                  data-event-id="${event.id}"
                >
                  Reopen Results
                </button>
              `
              : ""
          }
        </div>
      </div>

      ${
        event.mode === "time-trial"
          ? renderTimeTrialEntries(event)
          : renderGrandPrixEntries(event)
      }
    </section>
  `;
}

function getEventAuditDetails(event) {
  return {
    eventId: event.id,
    gameId: event.gameId,
    mode: event.mode,
    completed: Boolean(event.completed),
    createdAt: event.createdAt || "",
    resultCount: Array.isArray(event.results)
      ? event.results.length
      : 0
  };
}

async function createEvent(gameId) {
  if (
    typeof requireAdminForAction ===
      "function" &&
    !requireAdminForAction()
  ) {
    return;
  }

  if (!gameId) {
    alert(
      "The game could not be identified."
    );

    return;
  }

  const game =
    getGameById(gameId);

  if (!game) {
    alert(
      "The selected game could not be found."
    );

    return;
  }

  const mode =
    game.mode || "swiss";

  if (
    mode !== "time-trial" &&
    mode !== "grand-prix"
  ) {
    alert(
      "Only Time Trial and Grand Prix games can create events."
    );

    return;
  }

  if (getEventByGameId(gameId)) {
    alert(
      "An event already exists for this game."
    );

    return;
  }

  const eligibleTeams =
    window.PHDGameCapacity
      ? window.PHDGameCapacity
          .getEligibleTeams(
            game,
            PHDTournament.state.teams || []
          )
      : [...(PHDTournament.state.teams || [])];

  if (eligibleTeams.length === 0) {
    alert(
      "Enter at least one participating office before creating this event."
    );

    return;
  }

  const event = {
    id: crypto.randomUUID(),
    gameId,
    mode,
    completed: false,
    createdAt:
      new Date().toISOString(),
    updatedAt:
      new Date().toISOString(),
    results: []
  };

  PHDTournament.state.events.push(
    event
  );

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "event.created",
        `Created ${getGameModeLabel(
          game
        )} event for ${game.name}.`,
        {
          event:
            getEventAuditDetails(
              event
            )
        }
      );
    }
  } catch (error) {
    PHDTournament.state.events =
      PHDTournament.state.events.filter(
        existingEvent =>
          existingEvent.id !== event.id
      );

    render();

    console.error(
      "The event could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The event could not be saved."
    );
  }
}

function getEventById(eventId) {
  return (
    PHDTournament.state.events.find(
      event => event.id === eventId
    ) || null
  );
}

async function persistEventResults(
  event,
  results,
  summary,
  completed = true
) {
  const previousEvent =
    structuredClone(event);

  event.results = results;
  event.completed =
    Boolean(completed);
  event.updatedAt =
    new Date().toISOString();
  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "event.results.completed",
        summary,
        {
          event:
            getEventAuditDetails(
              event
            )
        }
      );
    }
  } catch (error) {
    Object.assign(
      event,
      previousEvent
    );
    render();
    console.error(
      "Event results could not be saved.",
      error
    );
    alert(
      error && error.message
        ? error.message
        : "Event results could not be saved."
    );
  }
}

function mergeEventResult(
  event,
  result
) {
  return [
    ...(event.results || []).filter(
      existing =>
        existing.teamId !==
        result.teamId
    ),
    result
  ];
}

function hasCompleteTimeTrialResults(
  results,
  event
) {
  const teamIds =
    getVisibleEventTeams({
      ...event,
      completed: true
    }).map(
      team => team.id
    );
  const resultMap = new Map(
    results.map(result => [
      result.teamId,
      Number(
        result.timeMilliseconds
      )
    ])
  );

  return teamIds.length > 0 &&
    teamIds.every(teamId =>
      Number.isFinite(
        resultMap.get(teamId)
      )
    );
}

function hasCompleteGrandPrixResults(
  results,
  event
) {
  const participants = getGrandPrixParticipants(event, true);
  if (!participants.length) {
    const teamIds = getVisibleEventTeams({
      ...event,
      completed: true
    }).map(team => team.id);
    const positions = teamIds.map(teamId => {
      const result = results.find(item => item.teamId === teamId);
      return Number(result && result.finishPosition);
    });
    return teamIds.length > 0 &&
      positions.every(position =>
        Number.isInteger(position) &&
        position >= 1 &&
        position <= teamIds.length
      ) &&
      new Set(positions).size === teamIds.length;
  }
  const positionsByLobby = new Map();

  for (const participant of participants) {
    const result = results.find(item =>
      (item.participantId || item.teamId) === participant.participantId
    );
    const position = Number(result && result.finishPosition);
    if (
      !Number.isInteger(position) ||
      position < 1 ||
      position > participant.lobbySize
    ) {
      return false;
    }
    if (!positionsByLobby.has(participant.lobbyId)) {
      positionsByLobby.set(participant.lobbyId, new Set());
    }
    const used = positionsByLobby.get(participant.lobbyId);
    if (used.has(position)) return false;
    used.add(position);
  }
  return true;
}

async function saveTimeTrialResults(
  eventId
) {
  const event =
    getEventById(eventId);
  const workspace =
    document.querySelector(
      `[data-event-workspace="${eventId}"]`
    );

  if (!event || !workspace) {
    return;
  }

  const rows = [
    ...workspace.querySelectorAll(
      "tr[data-team-id]"
    )
  ];
  const results = [];

  for (const row of rows) {
    const minutes = Number(
      row.querySelector(
        ".time-minutes"
      ).value
    );
    const seconds = Number(
      row.querySelector(
        ".time-seconds"
      ).value
    );
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      !Number.isInteger(seconds) ||
      seconds < 0 ||
      seconds > 59
    ) {
      alert(
        "Enter a valid time for every team."
      );
      return;
    }

    results.push({
      teamId: row.dataset.teamId,
      timeMilliseconds:
        minutes * 60000 +
        seconds * 1000
    });
  }

  const isScopedStaff =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff();
  const nextResults =
    isScopedStaff
      ? mergeEventResult(
          event,
          results[0]
        )
      : results;
  const complete =
    hasCompleteTimeTrialResults(
      nextResults,
      event
    );

  await persistEventResults(
    event,
    nextResults,
    complete
      ? "Completed Time Trial results."
      : "Saved a Time Trial result.",
    complete
  );
}

async function saveGrandPrixResults(
  eventId
) {
  const event =
    getEventById(eventId);
  const workspace =
    document.querySelector(
      `[data-event-workspace="${eventId}"]`
    );

  if (!event || !workspace) {
    return;
  }

  const rows = [
    ...workspace.querySelectorAll(
      "tr[data-team-id]"
    )
  ];
  const results = rows.map(row => ({
    participantId: row.dataset.participantId || row.dataset.teamId,
    teamId: row.dataset.teamId,
    playerIndex: Number(row.dataset.playerIndex || 0),
    playerLabel: row.dataset.playerLabel || "Player A",
    lobbyId: row.dataset.lobbyId || "lobby-1",
    lobbySize: Number(row.dataset.lobbySize || 1),
    finishPosition: Number(
      row.querySelector(
        ".finish-position"
      ).value
    )
  }));
  const isScopedStaff =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff();
  const nextResults =
    isScopedStaff
      ? [
          ...(event.results || []).filter(
            existing =>
              existing.teamId !== getAssignedStaffTeamId()
          ),
          ...results
        ]
      : results;
  const participantById = new Map(
    getGrandPrixParticipants(event, true).map(item => [
      item.participantId,
      item
    ])
  );
  const usedPositions = new Set();
  const validPositions = nextResults.every(result => {
    const participantId = result.participantId || result.teamId;
    const participant = participantById.get(participantId);
    const key = participant
      ? `${participant.lobbyId}:${result.finishPosition}`
      : "invalid";
    if (
      !participant ||
      !Number.isInteger(result.finishPosition) ||
      result.finishPosition < 1 ||
      result.finishPosition > participant.lobbySize ||
      usedPositions.has(key)
    ) {
      return false;
    }
    usedPositions.add(key);
    return true;
  });

  if (!validPositions) {
    alert(
      "Assign every player a valid finishing position that is unique within their lobby."
    );
    return;
  }

  await persistEventResults(
    event,
    nextResults,
    hasCompleteGrandPrixResults(
      nextResults,
      event
    )
      ? "Completed Grand Prix results."
      : "Saved a Grand Prix result.",
    hasCompleteGrandPrixResults(
      nextResults,
      event
    )
  );
}

async function reopenEvent(eventId) {
  const event =
    getEventById(eventId);

  if (!event) {
    return;
  }

  event.completed = false;
  event.updatedAt =
    new Date().toISOString();
  render();

  try {
    await saveState();
  } catch (error) {
    event.completed = true;
    render();
    alert(
      error && error.message
        ? error.message
        : "The event could not be reopened."
    );
  }
}

function getDraftRowRankValue(
  row,
  mode
) {
  if (mode === "grand-prix") {
    const input =
      row.querySelector(
        ".finish-position"
      );
    const value =
      Number(input && input.value);

    return Number.isInteger(value) &&
      value > 0
      ? value
      : Number.POSITIVE_INFINITY;
  }

  const minuteInput =
    row.querySelector(
      ".time-minutes"
    );
  const secondInput =
    row.querySelector(
      ".time-seconds"
    );
  if (
    !minuteInput ||
    !secondInput ||
    minuteInput.value === "" ||
    secondInput.value === ""
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return Number(minuteInput.value) *
      60000 +
    Number(secondInput.value) * 1000;
}

function animateEventRanking(
  workspace
) {
  if (
    !workspace ||
    !canRevealDraftEventRankings() ||
    workspace.dataset
      .eventCompleted === "true"
  ) {
    return;
  }

  const body =
    workspace.querySelector("tbody");
  const mode =
    workspace.dataset.eventMode;

  if (!body) return;

  const rows = [
    ...body.querySelectorAll(
      "tr[data-team-id]"
    )
  ];
  const playerGrandPrix =
    mode === "grand-prix" &&
    rows.some(row =>
      row.dataset.participantId
    );
  const rowKey = row =>
    row.dataset.participantId ||
    row.dataset.teamId;
  const before = new Map(
    rows.map(row => [
      rowKey(row),
      row.getBoundingClientRect()
    ])
  );
  const sorted = [...rows].sort(
    (rowA, rowB) => {
      if (playerGrandPrix) {
        const lobbyDifference =
          String(rowA.dataset.lobbyId)
            .localeCompare(
              String(rowB.dataset.lobbyId),
              undefined,
              { numeric: true }
            );
        if (lobbyDifference) {
          return lobbyDifference;
        }
      }
      return getDraftRowRankValue(rowA, mode) -
          getDraftRowRankValue(rowB, mode) ||
        rowKey(rowA).localeCompare(rowKey(rowB));
    }
  );

  sorted.forEach(row =>
    body.appendChild(row)
  );

  const participantCount = new Set(
    rows.map(row => row.dataset.teamId)
  ).size;
  const officeRanks = new Map();
  if (playerGrandPrix) {
    const officeScores = new Map();
    rows.forEach(row => {
      const finishPosition = getDraftRowRankValue(row, mode);
      if (!Number.isFinite(finishPosition)) return;
      const current = officeScores.get(row.dataset.teamId) || {
        score: 0,
        bestFinish: Number.MAX_SAFE_INTEGER
      };
      current.score +=
        Number(row.dataset.lobbySize) -
        finishPosition +
        1;
      current.bestFinish = Math.min(
        current.bestFinish,
        finishPosition
      );
      officeScores.set(row.dataset.teamId, current);
    });
    [...officeScores.entries()]
      .sort((entryA, entryB) =>
        entryB[1].score - entryA[1].score ||
        entryA[1].bestFinish - entryB[1].bestFinish ||
        entryA[0].localeCompare(entryB[0])
      )
      .forEach(([teamId], index) =>
        officeRanks.set(teamId, index + 1)
      );
  }

  sorted.forEach((row, index) => {
    const value =
      getDraftRowRankValue(
        row,
        mode
      );
    const provisionalPosition =
      Number.isFinite(value)
        ? playerGrandPrix
          ? officeRanks.get(
              row.dataset.teamId
            ) || null
          : mode === "grand-prix"
          ? value
          : index + 1
        : null;
    const rankCell =
      row.querySelector(
        ".rank-cell"
      );
    const pointsCell =
      row.querySelector(
        ".event-tournament-points"
      );
    const lobbyPointsCell =
      row.querySelector(
        ".grand-prix-lobby-points"
      );

    if (rankCell) {
      rankCell.textContent =
        provisionalPosition || "—";
    }
    if (pointsCell) {
      pointsCell.textContent =
        provisionalPosition
          ? Math.max(
              1,
              participantCount -
                provisionalPosition +
                1
            )
          : "—";
    }
    if (lobbyPointsCell) {
      lobbyPointsCell.textContent =
        Number.isFinite(value)
          ? Number(row.dataset.lobbySize) -
            value +
            1
          : "—";
    }

    const previous =
      before.get(rowKey(row));
    const current =
      row.getBoundingClientRect();
    const deltaY =
      previous
        ? previous.top - current.top
        : 0;

    if (deltaY) {
      row.animate(
        [
          {
            transform:
              `translateY(${deltaY}px)`
          },
          { transform: "translateY(0)" }
        ],
        {
          duration: 420,
          easing:
            "cubic-bezier(.2,.8,.2,1)"
        }
      );
    }
  });
}

function initialiseEventControls() {
  document.addEventListener(
    "input",
    event => {
      if (
        !event.target.matches(
          ".finish-position, .time-minutes, .time-seconds"
        )
      ) {
        return;
      }

      animateEventRanking(
        event.target.closest(
          "[data-event-workspace]"
        )
      );
    }
  );

  document.addEventListener(
    "click",
    event => {
      const target = event.target;
      const isEventAction =
        target.classList.contains(
          "create-game-event"
        ) ||
        target.classList.contains(
          "save-time-trial-results"
        ) ||
        target.classList.contains(
          "save-grand-prix-results"
        ) ||
        target.classList.contains(
          "reopen-game-event"
        );

      if (!isEventAction) {
        return;
      }

      if (
        typeof requireAdminForAction ===
          "function" &&
        !requireAdminForAction()
      ) {
        return;
      }

      if (
        target.classList.contains(
          "create-game-event"
        )
      ) {
        createEvent(
          target.dataset.gameId
        );
      } else if (
        target.classList.contains(
          "save-time-trial-results"
        )
      ) {
        saveTimeTrialResults(
          target.dataset.eventId
        );
      } else if (
        target.classList.contains(
          "save-grand-prix-results"
        )
      ) {
        saveGrandPrixResults(
          target.dataset.eventId
        );
      } else if (
        target.classList.contains(
          "reopen-game-event"
        )
      ) {
        reopenEvent(
          target.dataset.eventId
        );
      }
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseEventControls
);

PHDTournament.modules.push("events");
