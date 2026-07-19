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
    Array.isArray(
      PHDTournament.state.teams
    )
      ? PHDTournament.state.teams
      : [];

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
            <th>Team</th>
            <th>Minutes</th>
            <th>Seconds</th>
            <th>Milliseconds</th>
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

              const minutes =
                totalMilliseconds == null
                  ? ""
                  : Math.floor(
                      totalMilliseconds /
                        60000
                    );

              const seconds =
                totalMilliseconds == null
                  ? ""
                  : Math.floor(
                      (
                        totalMilliseconds %
                        60000
                      ) / 1000
                    );

              const milliseconds =
                totalMilliseconds == null
                  ? ""
                  : totalMilliseconds %
                    1000;

              return `
                <tr
                  data-event-id="${event.id}"
                  data-team-id="${team.id}"
                >
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

                  <td>
                    <input
                      class="time-milliseconds"
                      type="number"
                      min="0"
                      max="999"
                      step="1"
                      value="${milliseconds}"
                      placeholder="000"
                      ${
                        event.completed
                          ? "disabled"
                          : ""
                      }
                    />
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
              Save Times
            </button>
          </div>
        `
    }
  `;
}

function renderEvents() {
  const status =
    getElement("eventStatus");

  const container =
    getElement("eventsContainer");

  if (!status || !container) {
    return;
  }

  renderEventGameOptions();

  const events =
    PHDTournament.state.events;

  if (events.length === 0) {
    status.textContent =
      "No non-Swiss events created yet.";

    container.innerHTML = `
      <div class="empty-state">
        Add a Time Trial or Grand Prix game,
        then select it above to create its event.
      </div>
    `;

    return;
  }

  const completedEvents =
    events.filter(
      event => event.completed
    ).length;

  status.textContent =
    `${completedEvents} of ` +
    `${events.length} events completed.`;

  container.innerHTML =
    events
      .map(event => {
        const game =
          getGameById(event.gameId);

        const gameName =
          game
            ? game.name
            : "Unknown game";

        const modeName =
          game
            ? getGameModeLabel(game)
            : event.mode || "Unknown";

        return `
          <article class="round-card">
            <div class="section-heading">
              <div>
                <p class="eyebrow">
                  ${escapeHtml(modeName)}
                </p>

                <h3>
                  ${escapeHtml(gameName)}
                </h3>

                <p class="muted">
                  ${
                    event.completed
                      ? "Event completed"
                      : "Event awaiting results"
                  }
                </p>
              </div>

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
return `
  <article class="round-card">
    <div class="section-heading">
      ...
    </div>

    ${
      event.mode === "time-trial"
        ? renderTimeTrialEntries(event)
        : `
          <div class="empty-state">
            Grand Prix result entry will be added next.
          </div>
        `
    }
  </article>
`;
        `;
      })
      .join("");
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

async function createEvent() {
  if (
    typeof requireAdminForAction ===
      "function" &&
    !requireAdminForAction()
  ) {
    return;
  }

  const select =
    getElement("eventGameSelect");

  if (!select) {
    return;
  }

  const gameId =
    select.value;

  if (!gameId) {
    alert(
      "Select a Time Trial or Grand Prix game first."
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

  select.value = "";

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

function initialiseEventControls() {
  const createButton =
    getElement("createEvent");

  if (!createButton) {
    return;
  }

  createButton.addEventListener(
    "click",
    createEvent
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseEventControls
);

PHDTournament.modules.push("events");