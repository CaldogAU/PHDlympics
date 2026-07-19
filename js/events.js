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
            </div>
          </article>
        `;
      })
      .join("");
}

PHDTournament.modules.push("events");