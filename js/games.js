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
setValue("gameMode", "swiss");
setValue("gameMaxPlayersPerConsole", "1");
setValue("gameMaxPlayersPerLobby", "8");
setValue("gameLogoUrl", "");

  const saveButton =
    getElement("saveGame");

  if (saveButton) {
    saveButton.textContent = "Add Game";
  }
}

function createGame(values) {
  const legacyScoring =
    PHDTournament.state.tournament.settings;
  return {
  id: crypto.randomUUID(),
  name: values.name,
  platform: values.platform,
  mode: values.mode,
  logoUrl: values.logoUrl,
  capacity: {
    maxPlayersPerConsole:
      values.maxPlayersPerConsole,
    maxPlayersPerLobby:
      values.maxPlayersPerLobby,
    configured: true
  },
  competitorEntries: {},
  settings: {
    winPoints: legacyScoring.winPoints,
    drawPoints: legacyScoring.drawPoints,
    byePoints: legacyScoring.byePoints
  },
  createdAt: new Date().toISOString()
};
}

function getGameAuditDetails(game) {
  return {
    gameId: game.id,
    name: game.name,
    platform: game.platform || "",
    mode: game.mode || "swiss",
    format: game.format || "",
    logoUrl: game.logoUrl || "",
    capacity:
      structuredClone(
        game.capacity || {}
      ),
    competitorEntries:
      structuredClone(
        game.competitorEntries || {}
      ),
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
  "mode",
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

  if (
    JSON.stringify(previousGame.capacity || {}) !==
    JSON.stringify(updatedGame.capacity || {})
  ) {
    changes.capacity = {
      from: previousGame.capacity || {},
      to: updatedGame.capacity || {}
    };
  }

  return changes;
}

async function saveGameFromForm() {
  const values = {
  name:
    getValue("gameName").trim(),

  platform:
    getValue("gamePlatform").trim(),

  mode:
    getValue("gameMode") || "swiss",

  logoUrl:
    getValue("gameLogoUrl").trim(),

  maxPlayersPerConsole:
    Number(
      getValue("gameMaxPlayersPerConsole")
    ),

  maxPlayersPerLobby:
    Number(
      getValue("gameMaxPlayersPerLobby")
    )
};

  const capacityValidation =
    window.PHDGameCapacity
      .validateCapacity({
        maxPlayersPerConsole:
          values.maxPlayersPerConsole,
        maxPlayersPerLobby:
          values.maxPlayersPerLobby,
        configured: true
      });

  if (!capacityValidation.valid) {
    alert(capacityValidation.error);
    return;
  }

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

    const existingEntryValidation =
      window.PHDGameCapacity
        .getEntryValidation(
          {
            ...game,
            capacity:
              capacityValidation.value
          },
          PHDTournament.state.teams
        );

    if (!existingEntryValidation.valid) {
      alert(
        existingEntryValidation.errors.join("\n")
      );
      return;
    }

    const capacityChanged =
      JSON.stringify(game.capacity || {}) !==
      JSON.stringify(capacityValidation.value);
    const hasGeneratedData =
      PHDTournament.state.rounds.some(
        round =>
          round.gameId === game.id ||
          (round.matches || []).some(
            match => match.gameId === game.id
          )
      ) ||
      PHDTournament.state.events.some(
        event => event.gameId === game.id
      ) ||
      Boolean(
        game.fourPlayerSwiss &&
        (game.fourPlayerSwiss.rounds || []).length
      ) ||
      Boolean(
        game.fallGuysGrandPrix &&
        (game.fallGuysGrandPrix.heats || []).length
      );

    if (capacityChanged && hasGeneratedData) {
      alert(
        "Capacity cannot be changed after rounds or results have been generated. Reopen or clear the game data first."
      );
      return;
    }

game.name = values.name;
game.platform = values.platform;
game.mode = values.mode;
game.logoUrl = values.logoUrl;
game.capacity =
  capacityValidation.value;

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
  "gameMode",
  game.mode || "swiss"
);

  const capacity =
    window.PHDGameCapacity
      .normaliseCapacity(
        game.capacity
      );

  setValue(
    "gameMaxPlayersPerConsole",
    capacity.maxPlayersPerConsole
  );

  setValue(
    "gameMaxPlayersPerLobby",
    capacity.maxPlayersPerLobby
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

  const hasEvent =
    Array.isArray(
      PHDTournament.state.events
    ) &&
    PHDTournament.state.events.some(
      event =>
        event.gameId === gameId
    );

  const hasFourPlayerSwissData =
    game.fourPlayerSwiss &&
    Array.isArray(
      game.fourPlayerSwiss.rounds
    ) &&
    game.fourPlayerSwiss.rounds
      .length > 0;

  const hasFallGuysData =
    game.fallGuysGrandPrix &&
    Array.isArray(
      game.fallGuysGrandPrix.heats
    ) &&
    game.fallGuysGrandPrix.heats
      .length > 0;

  if (
    isUsed ||
    hasEvent ||
    hasFourPlayerSwissData ||
    hasFallGuysData
  ) {
    alert(
      "This game already has tournament data and cannot be deleted."
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

function getGameModeLabel(game) {
  if (
    window.PHDGameModes &&
    typeof window.PHDGameModes.getForGame ===
      "function"
  ) {
    const mode =
      window.PHDGameModes.getForGame(game);

    if (mode && mode.name) {
      return mode.name;
    }
  }

  return "Swiss";
}

function renderGameModeOptions() {
  const select =
    getElement("gameMode");

  if (
    !select ||
    !window.PHDGameModes
  ) {
    return;
  }

  const selectedModeId =
    select.value ||
    window.PHDGameModes
      .DEFAULT_MODE_ID;
  const modes =
    window.PHDGameModes.list();

  select.innerHTML = modes
    .map(
      mode => `
        <option value="${escapeHtml(
          mode.id
        )}">
          ${escapeHtml(
            mode.displayName
          )}
        </option>
      `
    )
    .join("");

  select.value =
    window.PHDGameModes.has(
      selectedModeId
    )
      ? selectedModeId
      : window.PHDGameModes
          .DEFAULT_MODE_ID;
}

function renderGames() {
  renderGameModeOptions();

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
      `${games.length} ${
        games.length === 1
          ? "game"
          : "games"
      } added`;
  }

  if (games.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        Add video games for this tournament.
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
  Mode: ${escapeHtml(
    getGameModeLabel(game)
  )}
</span>

<span>
  Capacity: ${escapeHtml(
    String(
      (game.capacity || {})
        .maxPlayersPerConsole || 1
    )
  )} per console / ${escapeHtml(
    String(
      (game.capacity || {})
        .maxPlayersPerLobby || 1
    )
  )} per lobby
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
  selectedGameId = "",
  requiredModeId = ""
) {
  const games = getGames().filter(
    game =>
      !requiredModeId ||
      (game.mode || "swiss") ===
        requiredModeId
  );

  if (games.length === 0) {
    return `
      <option value="">
        ${
          requiredModeId === "swiss"
            ? "No Swiss games added"
            : "No games added"
        }
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
