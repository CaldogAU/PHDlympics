function getGames() {
  return PHDTournament.state.games || [];
}

function getGameById(gameId) {
  return (
    getGames().find(
      game => game.id === gameId
    ) || null
  );
}

function getGameLabel(gameId) {
  const game = getGameById(gameId);

  if (!game) {
    return "No game selected";
  }

  return game.platform
    ? `${game.name} (${game.platform})`
    : game.name;
}

function clearGameForm() {
  PHDTournament.editingGameId = null;

  setValue("gameName", "");
  setValue("gamePlatform", "");
  setValue("gameFormat", "");
  setValue("gameLogoUrl", "");

  const saveButton =
    getElement("saveGame");

  if (saveButton) {
    saveButton.textContent = "Add Game";
  }
}

function createGame(values) {
  return {
    id: crypto.randomUUID(),
    name: values.name,
    platform: values.platform,
    format: values.format,
    logoUrl: values.logoUrl,
    createdAt: new Date().toISOString()
  };
}

function getGameAuditDetails(game) {
  return {
    gameId: game.id,
    name: game.name,
    platform: game.platform || "",
    format: game.format || "",
    logoUrl: game.logoUrl || "",
    createdAt: game.createdAt || ""
  };
}

function getGameChanges(
  previousGame,
  updatedGame
) {
  const changes = {};

  [
    "name",
    "platform",
    "format",
    "logoUrl"
  ].forEach(field => {
    const previousValue =
      previousGame[field] || "";

    const updatedValue =
      updatedGame[field] || "";

    if (
      previousValue !== updatedValue
    ) {
      changes[field] = {
        from: previousValue,
        to: updatedValue
      };
    }
  });

  return changes;
}

async function saveGameFromForm() {
  const values = {
    name:
      getValue("gameName").trim(),
    platform:
      getValue("gamePlatform").trim(),
    format:
      getValue("gameFormat").trim(),
    logoUrl:
      getValue("gameLogoUrl").trim()
  };

  if (isBlank(values.name)) {
    alert("Enter a game name.");
    return;
  }

  const games = getGames();

  const duplicate =
    games.some(
      game =>
        game.name.toLowerCase() ===
          values.name.toLowerCase() &&
        game.id !==
          PHDTournament.editingGameId
    );

  if (duplicate) {
    alert(
      "A game with that name already exists."
    );
    return;
  }

  if (
    !PHDTournament.editingGameId &&
    games.length >= 5
  ) {
    alert(
      "This tournament supports up to 5 games."
    );
    return;
  }

  const editingGameId =
    PHDTournament.editingGameId;

  let auditAction = "";
  let auditSummary = "";
  let auditDetails = {};

  if (editingGameId) {
    const game =
      getGameById(editingGameId);

    if (!game) {
      return;
    }

    const previousGame =
      structuredClone(game);

    game.name = values.name;
    game.platform = values.platform;
    game.format = values.format;
    game.logoUrl = values.logoUrl;

    auditAction = "game.updated";
    auditSummary =
      `Updated game "${game.name}".`;

    auditDetails = {
      game: getGameAuditDetails(game),
      changes: getGameChanges(
        previousGame,
        game
      )
    };
  } else {
    const newGame =
      createGame(values);

    games.push(newGame);

    auditAction = "game.created";
    auditSummary =
      `Added game "${newGame.name}".`;

    auditDetails = {
      game:
        getGameAuditDetails(newGame)
    };
  }

  clearGameForm();
  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        auditAction,
        auditSummary,
        auditDetails
      );
    }
  } catch (error) {
    console.error(
      "Game changes could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The game changes could not be saved."
    );
  }
}

function editGame(gameId) {
  const game =
    getGameById(gameId);

  if (!game) {
    return;
  }

  PHDTournament.editingGameId =
    game.id;

  setValue(
    "gameName",
    game.name || ""
  );

  setValue(
    "gamePlatform",
    game.platform || ""
  );

  setValue(
    "gameFormat",
    game.format || ""
  );

  setValue(
    "gameLogoUrl",
    game.logoUrl || ""
  );

  const saveButton =
    getElement("saveGame");

  if (saveButton) {
    saveButton.textContent =
      "Update Game";
  }
}

async function deleteGame(gameId) {
  const game =
    getGameById(gameId);

  if (!game) {
    return;
  }

  const isUsed =
    PHDTournament.state.rounds.some(
      round =>
        round.matches.some(
          match =>
            match.gameId === gameId
        )
    );

  if (isUsed) {
    alert(
      "This game is already used in one or more matches and cannot be deleted."
    );
    return;
  }

  const confirmed = confirm(
    `Delete ${game.name}?`
  );

  if (!confirmed) {
    return;
  }

  const deletedGame =
    structuredClone(game);

  PHDTournament.state.games =
    getGames().filter(
      item => item.id !== gameId
    );

  if (
    PHDTournament.editingGameId ===
    gameId
  ) {
    clearGameForm();
  }

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "game.deleted",
        `Deleted game "${deletedGame.name}".`,
        {
          game:
            getGameAuditDetails(
              deletedGame
            )
        }
      );
    }
  } catch (error) {
    console.error(
      "The game could not be deleted.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The game could not be deleted."
    );
  }
}

function renderGameLogo(game) {
  if (game.logoUrl) {
    return `
      <img
        src="${escapeHtml(
          game.logoUrl
        )}"
        alt="${escapeHtml(
          game.name
        )} logo"
        onerror="this.remove()"
      />
    `;
  }

  return escapeHtml(
    (game.name || "?")
      .slice(0, 3)
      .toUpperCase()
  );
}

function renderGames() {
  const list =
    getElement("gameList");

  const count =
    getElement("gameCount");

  if (!list) {
    return;
  }

  const games = getGames();

  if (count) {
    count.textContent =
      `${games.length} / 5 games added`;
  }

  if (games.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        Add up to 5 video games for this tournament.
      </div>
    `;

    return;
  }

  list.innerHTML = games
    .map(
      game => `
        <li class="game-item">
          <span class="game-logo">
            ${renderGameLogo(game)}
          </span>

          <div class="game-meta">
            <strong>
              ${escapeHtml(game.name)}
            </strong>

            <span>
              ${escapeHtml(
                game.platform ||
                  "No platform listed"
              )}
            </span>

            <span>
              ${escapeHtml(
                game.format ||
                  "No format listed"
              )}
            </span>
          </div>

          <div class="game-actions">
            <button
              class="small-button secondary edit-game"
              type="button"
              data-game-id="${game.id}"
            >
              Edit
            </button>

            <button
              class="small-button danger delete-game"
              type="button"
              data-game-id="${game.id}"
            >
              Delete
            </button>
          </div>
        </li>
      `
    )
    .join("");
}

function buildGameOptions(
  selectedGameId = ""
) {
  const games = getGames();

  if (games.length === 0) {
    return `
      <option value="">
        No games added
      </option>
    `;
  }

  return [
    `
      <option value="">
        Select game
      </option>
    `,
    ...games.map(
      game => `
        <option
          value="${game.id}"
          ${
            game.id === selectedGameId
              ? "selected"
              : ""
          }
        >
          ${escapeHtml(
            getGameLabel(game.id)
          )}
        </option>
      `
    )
  ].join("");
}

PHDTournament.modules.push("games");