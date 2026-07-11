function getSafeFileName(value) {
  return (
    String(value || "tournament")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") ||
    "tournament"
  );
}

function exportTournamentJson() {
  const exportData = {
    app: "PHDlympics",
    exportedAt:
      new Date().toISOString(),
    version:
      PHDTournament.state.version ||
      "0.8.0",
    data:
      PHDTournament.state
  };

  const blob = new Blob(
    [
      JSON.stringify(
        exportData,
        null,
        2
      )
    ],
    {
      type: "application/json"
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  const tournamentName =
    PHDTournament.state
      .tournament.name;

  link.href = url;
  link.download =
    `${getSafeFileName(
      tournamentName
    )}-backup.json`;

  link.click();

  URL.revokeObjectURL(url);

  setSaveStatus("Exported");
}

function normaliseImportedState(
  imported
) {
  const incoming =
    imported.data || imported;

  if (
    !incoming ||
    !Array.isArray(
      incoming.teams
    ) ||
    !Array.isArray(
      incoming.rounds
    )
  ) {
    throw new Error(
      "Invalid tournament file."
    );
  }

  return {
    ...structuredClone(
      PHDTournament.defaultState
    ),
    ...incoming,
    tournament: {
      ...PHDTournament.defaultState
        .tournament,
      ...(incoming.tournament || {}),
      settings: {
        ...PHDTournament.defaultState
          .tournament.settings,
        ...(
          (
            incoming.tournament &&
            incoming.tournament.settings
          ) || {}
        )
      }
    },
    teams:
      Array.isArray(incoming.teams)
        ? incoming.teams
        : [],
    games:
      Array.isArray(incoming.games)
        ? incoming.games
        : [],
    rounds:
      Array.isArray(incoming.rounds)
        ? incoming.rounds
        : []
  };
}

function getImportStateSummary(
  state
) {
  return {
    tournamentName:
      state.tournament &&
      state.tournament.name
        ? state.tournament.name
        : "",
    teamCount:
      Array.isArray(state.teams)
        ? state.teams.length
        : 0,
    gameCount:
      Array.isArray(state.games)
        ? state.games.length
        : 0,
    roundCount:
      Array.isArray(state.rounds)
        ? state.rounds.length
        : 0,
    completedRoundCount:
      Array.isArray(state.rounds)
        ? state.rounds.filter(
            round =>
              round.completed
          ).length
        : 0,
    completedMatchCount:
      Array.isArray(state.rounds)
        ? state.rounds.reduce(
            (total, round) =>
              total +
              (
                Array.isArray(
                  round.matches
                )
                  ? round.matches.filter(
                      match =>
                        !match.bye &&
                        match.completed
                    ).length
                  : 0
              ),
            0
          )
        : 0
  };
}

async function processTournamentImport(
  parsed,
  file
) {
  const importedState =
    normaliseImportedState(
      parsed
    );

  const confirmed = confirm(
    "Import this tournament? This will replace the current tournament for every viewer."
  );

  if (!confirmed) {
    return false;
  }

  const previousState =
    structuredClone(
      PHDTournament.state
    );

  PHDTournament.state =
    importedState;

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "tournament.imported",
        `Imported tournament data from "${file.name}".`,
        {
          filename:
            file.name,
          fileSize:
            file.size,
          fileType:
            file.type || "",
          previousSummary:
            getImportStateSummary(
              previousState
            ),
          importedSummary:
            getImportStateSummary(
              importedState
            ),
          exportedAt:
            parsed &&
            parsed.exportedAt
              ? parsed.exportedAt
              : "",
          importedVersion:
            parsed &&
            parsed.version
              ? parsed.version
              : importedState.version ||
                ""
        }
      );
    }

    setSaveStatus(
      "Imported to cloud"
    );

    alert(
      "Tournament imported successfully."
    );

    return true;
  } catch (error) {
    console.error(
      "Tournament import could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The tournament import could not be saved."
    );

    return false;
  }
}

function importTournamentJson(
  event
) {
  const input =
    event.target;

  const file =
    input.files &&
    input.files[0];

  if (!file) {
    return;
  }

  const reader =
    new FileReader();

  reader.onload = async () => {
    try {
      const parsed =
        JSON.parse(
          reader.result
        );

      await processTournamentImport(
        parsed,
        file
      );
    } catch (error) {
      console.error(
        "Tournament JSON import failed.",
        error
      );

      alert(
        error && error.message ===
          "Invalid tournament file."
          ? error.message
          : "Could not import this JSON file."
      );
    } finally {
      input.value = "";
    }
  };

  reader.onerror = () => {
    console.error(
      "The selected tournament file could not be read.",
      reader.error
    );

    alert(
      "Could not read this JSON file."
    );

    input.value = "";
  };

  reader.readAsText(file);
}

function printTournamentReport() {
  setSaveStatus(
    "Printing..."
  );

  window.print();

  setSaveStatus("Ready");
}

function escapeCsvValue(value) {
  const stringValue =
    String(value ?? "");

  if (
    stringValue.includes(",") ||
    stringValue.includes('"') ||
    stringValue.includes("\n")
  ) {
    return `"${stringValue.replaceAll(
      '"',
      '""'
    )}"`;
  }

  return stringValue;
}

function downloadTextFile(
  filename,
  content,
  mimeType = "text/plain"
) {
  const blob = new Blob(
    [content],
    {
      type: mimeType
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = filename;

  link.click();

  URL.revokeObjectURL(url);
}

function exportStandingsCsv() {
  const standings =
    getStandings();

  const rows = [
    [
      "Rank",
      "Team",
      "Points",
      "Wins",
      "Draws",
      "Losses",
      "Byes",
      "Points For",
      "Points Against",
      "Difference"
    ],
    ...standings.map(
      (team, index) => [
        index + 1,
        team.name,
        team.points,
        team.wins,
        team.draws,
        team.losses,
        team.byes,
        team.pointsFor,
        team.pointsAgainst,
        getScoreDifference(
          team
        )
      ]
    )
  ];

  const csv = rows
    .map(row =>
      row
        .map(
          escapeCsvValue
        )
        .join(",")
    )
    .join("\n");

  const filename =
    `${getSafeFileName(
      getTournament().name
    )}-standings.csv`;

  downloadTextFile(
    filename,
    csv,
    "text/csv"
  );

  setSaveStatus(
    "Standings CSV exported"
  );
}

function exportMatchesCsv() {
  const history =
    getMatchHistory();

  const rows = [
    [
      "Round",
      "Type",
      "Team A",
      "Team B",
      "Score",
      "Status"
    ],
    ...history.map(
      item => [
        item.round,
        item.type,
        item.teamA,
        item.teamB,
        item.score,
        item.status
      ]
    )
  ];

  const csv = rows
    .map(row =>
      row
        .map(
          escapeCsvValue
        )
        .join(",")
    )
    .join("\n");

  const filename =
    `${getSafeFileName(
      getTournament().name
    )}-matches.csv`;

  downloadTextFile(
    filename,
    csv,
    "text/csv"
  );

  setSaveStatus(
    "Matches CSV exported"
  );
}

PHDTournament.modules.push(
  "export"
);