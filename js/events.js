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
            <th>Team</th>
            <th>Finishing Position</th>
            <th>Tournament Points</th>
          </tr>
        </thead>
        <tbody>
          ${teams.map(team => {
            const result =
              getEventResultForTeam(
                event,
                team.id
              );
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
                    ${escapeHtml(team.name)}
                  </strong>
                </td>
                <td>
                  <input
                    class="finish-position"
                    type="number"
                    min="1"
                    max="${participantCount}"
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
                <td class="event-tournament-points">
                  ${
                      position
                        ? participantCount -
                          position +
                          1
                        : canRevealDraftEventRankings() &&
                            result &&
                          Number.isInteger(
                            Number(
                              result.finishPosition
                            )
                          )
                        ? participantCount -
                          Number(
                            result.finishPosition
                          ) +
                          1
                        : "—"
                  }
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
  const teamIds =
    getVisibleEventTeams({
      ...event,
      completed: true
    }).map(
      team => team.id
    );
  const positions = teamIds.map(
    teamId => {
      const result = results.find(
        item =>
          item.teamId === teamId
      );
      return Number(
        result &&
          result.finishPosition
      );
    }
  );

  return teamIds.length > 0 &&
    positions.every(position =>
      Number.isInteger(position) &&
      position >= 1 &&
      position <= teamIds.length
    ) &&
    new Set(positions).size ===
      teamIds.length;
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
    teamId: row.dataset.teamId,
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
      ? mergeEventResult(
          event,
          results[0]
        )
      : results;
  const positions = nextResults.map(
    result => result.finishPosition
  );
  const participantCount =
    getVisibleEventTeams({
      ...event,
      completed: true
    }).length;
  const validPositions =
    (
      isScopedStaff ||
      positions.every(
      position =>
        Number.isInteger(position) &&
        position >= 1 &&
        position <= participantCount
      )
    ) &&
    (
      isScopedStaff ||
      new Set(positions).size ===
        rows.length
    );

  if (!validPositions) {
    alert(
      "Assign every team a unique finishing position."
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
  const before = new Map(
    rows.map(row => [
      row.dataset.teamId,
      row.getBoundingClientRect()
    ])
  );
  const sorted = [...rows].sort(
    (rowA, rowB) =>
      getDraftRowRankValue(
        rowA,
        mode
      ) -
        getDraftRowRankValue(
          rowB,
          mode
        ) ||
      rowA.dataset.teamId.localeCompare(
        rowB.dataset.teamId
      )
  );

  sorted.forEach(row =>
    body.appendChild(row)
  );

  const participantCount =
    PHDTournament.state.teams.length;

  sorted.forEach((row, index) => {
    const value =
      getDraftRowRankValue(
        row,
        mode
      );
    const provisionalPosition =
      Number.isFinite(value)
        ? mode === "grand-prix"
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

    const previous =
      before.get(row.dataset.teamId);
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
