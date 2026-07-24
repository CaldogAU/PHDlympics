let cloudTournamentUnsubscribe = null;
let lastCloudState = structuredClone(
  PHDTournament.defaultState
);
let cloudStateHasLoaded = false;
let cloudDocumentExists = null;
let cloudWriteInProgress = false;
let initialCloudCreationPromise = null;

function mergeTournamentState(sourceState) {
  const source = sourceState || {};

  const mergedState = {
    ...structuredClone(
      PHDTournament.defaultState
    ),
    ...source,
    tournament: {
      ...PHDTournament.defaultState
        .tournament,
      ...(source.tournament || {}),
      settings: {
        ...PHDTournament.defaultState
          .tournament.settings,
        ...(
          (
            source.tournament &&
            source.tournament.settings
          ) || {}
        )
      }
    },
    teams: Array.isArray(source.teams)
      ? source.teams
      : [],
    games: Array.isArray(source.games)
      ? source.games
      : [],
    rounds: Array.isArray(source.rounds)
      ? source.rounds
      : [],
    events: Array.isArray(source.events)
      ? source.events
      : [],
    access: {
      assignments: {
        ...PHDTournament.defaultState.access.assignments,
        ...((source.access && source.access.assignments) || {})
      }
    },
    championship: {
      ...PHDTournament.defaultState.championship,
      ...(source.championship || {})
    },
    archive: Array.isArray(source.archive)
      ? source.archive
      : []
  };

  if (
    window.PHDGameModes &&
    typeof window.PHDGameModes
      .migrateGames === "function"
  ) {
    window.PHDGameModes.migrateGames(
      mergedState.games
    );
  }

  mergedState.schemaVersion =
    PHDTournament.defaultState
      .schemaVersion;

  return mergedState;
}

function getTournamentDocumentReference(
  firebase
) {
  return firebase.firestoreSdk.doc(
    firebase.db,
    firebase.tournamentCollection,
    firebase.tournamentDocument
  );
}

function getRestoreDocumentReference(
  firebase
) {
  return firebase.firestoreSdk.doc(
    firebase.db,
    "backups",
    "restore-current"
  );
}

function cloneStateForCloud() {
  return structuredClone(
    PHDTournament.state
  );
}

function requireTournamentAdmin() {
  if (
    typeof canTournament !==
      "function" ||
    !(
      canTournament("tournament.manage") ||
      canTournament("results.manage")
    )
  ) {
    throw new Error(
      "Tournament staff access is required to change tournament data."
    );
  }
}

function restoreLastCloudState() {
  PHDTournament.state =
    mergeTournamentState(
      lastCloudState
    );

  if (
    typeof render === "function"
  ) {
    render();
  }

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }
}

function getCloudUserDetails() {
  const user =
    typeof getSignedInUser ===
    "function"
      ? getSignedInUser()
      : null;

  if (!user) {
    return null;
  }

  return {
    uid: user.uid,
    email: user.email || ""
  };
}

function getStateSummary(state) {
  const source = state || {};

  return {
    tournamentName:
      source.tournament &&
      source.tournament.name
        ? source.tournament.name
        : "",
    teamCount:
      Array.isArray(source.teams)
        ? source.teams.length
        : 0,
    gameCount:
      Array.isArray(source.games)
        ? source.games.length
        : 0,
    roundCount:
      Array.isArray(source.rounds)
        ? source.rounds.length
        : 0,
    completedRoundCount:
      Array.isArray(source.rounds)
        ? source.rounds.filter(
            round => round.completed
          ).length
        : 0,
    completedMatchCount:
      Array.isArray(source.rounds)
        ? source.rounds.reduce(
            (total, round) =>
              total +
              round.matches.filter(
                match =>
                  !match.bye &&
                  match.completed
              ).length,
            0
          )
        : 0
  };
}

async function saveState() {
  requireTournamentAdmin();

  const firebase =
    await PHDFirebase.ready;

  const tournamentReference =
    getTournamentDocumentReference(
      firebase
    );

  cloudWriteInProgress = true;

  setSaveStatus(
    "Saving to cloud..."
  );

  try {
    const stateToSave =
      cloneStateForCloud();

    await firebase.firestoreSdk.setDoc(
      tournamentReference,
      {
        state: stateToSave,
        updatedAt:
          firebase.firestoreSdk
            .serverTimestamp(),
        updatedBy:
          getCloudUserDetails()
      },
      {
        merge: true
      }
    );

    lastCloudState =
      mergeTournamentState(
        stateToSave
      );

    cloudDocumentExists = true;

    setSaveStatus(
      "Saved to cloud"
    );

    return stateToSave;
  } catch (error) {
    console.error(
      "Tournament cloud save failed.",
      error
    );

    restoreLastCloudState();

    setSaveStatus(
      "Cloud save failed"
    );

    throw error;
  } finally {
    cloudWriteInProgress = false;
  }
}

function autosave() {
  setSaveStatus(
    "Saving to cloud..."
  );

  saveState().catch(error => {
    const message =
      error && error.message
        ? error.message
        : "Tournament data could not be saved.";

    alert(message);
  });
}

async function createInitialCloudTournament() {
  requireTournamentAdmin();

  if (
    initialCloudCreationPromise
  ) {
    return initialCloudCreationPromise;
  }

  initialCloudCreationPromise =
    PHDFirebase.ready
      .then(async firebase => {
        const tournamentReference =
          getTournamentDocumentReference(
            firebase
          );

        const existingSnapshot =
          await firebase.firestoreSdk
            .getDoc(
              tournamentReference
            );

        if (
          existingSnapshot.exists()
        ) {
          cloudDocumentExists = true;
          return;
        }

        const initialState =
          mergeTournamentState(
            PHDTournament.defaultState
          );

        await firebase.firestoreSdk
          .setDoc(
            tournamentReference,
            {
              state: initialState,
              createdAt:
                firebase.firestoreSdk
                  .serverTimestamp(),
              updatedAt:
                firebase.firestoreSdk
                  .serverTimestamp(),
              updatedBy:
                getCloudUserDetails()
            }
          );

        lastCloudState =
          structuredClone(
            initialState
          );

        cloudDocumentExists = true;

        setSaveStatus(
          "Cloud tournament created"
        );

        if (
          typeof recordAuditEntry ===
          "function"
        ) {
          await recordAuditEntry(
            "tournament.created",
            "Created the initial cloud tournament.",
            {
              summary:
                getStateSummary(
                  initialState
                )
            }
          );
        }
      })
      .catch(error => {
        console.error(
          "Could not create the initial cloud tournament.",
          error
        );

        setSaveStatus(
          "Cloud tournament creation failed"
        );

        throw error;
      })
      .finally(() => {
        initialCloudCreationPromise =
          null;
      });

  return initialCloudCreationPromise;
}

async function ensureCloudTournamentExists() {
  if (
    typeof isTournamentAdmin !==
      "function" ||
    !isTournamentAdmin()
  ) {
    return;
  }

  if (
    cloudDocumentExists === true
  ) {
    return;
  }

  await createInitialCloudTournament();
}

function applyCloudSnapshot(
  snapshot
) {
  cloudStateHasLoaded = true;
  cloudDocumentExists =
    snapshot.exists();

  if (!snapshot.exists()) {
    PHDTournament.state =
      mergeTournamentState(
        PHDTournament.defaultState
      );

    lastCloudState =
      structuredClone(
        PHDTournament.state
      );

    if (
      typeof render === "function"
    ) {
      render();
    }

    if (
      typeof applyAdminAccessState ===
      "function"
    ) {
      applyAdminAccessState();
    }

    setSaveStatus(
      "No cloud tournament yet"
    );

    ensureCloudTournamentExists()
      .catch(error => {
        console.error(
          "Initial cloud tournament creation failed.",
          error
        );
      });

    return;
  }

  const documentData =
    snapshot.data();

  const incomingState =
    documentData &&
    documentData.state
      ? documentData.state
      : documentData;

  const mergedState =
    mergeTournamentState(
      incomingState
    );

  lastCloudState =
    structuredClone(
      mergedState
    );

  PHDTournament.state =
    mergedState;

  if (
    typeof render === "function" &&
    !cloudWriteInProgress
  ) {
    render();
  }

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }

  setSaveStatus(
    "Cloud data loaded"
  );
}

async function startCloudTournamentListener() {
  const firebase =
    await PHDFirebase.ready;

  const tournamentReference =
    getTournamentDocumentReference(
      firebase
    );

  if (
    cloudTournamentUnsubscribe
  ) {
    cloudTournamentUnsubscribe();
    cloudTournamentUnsubscribe =
      null;
  }

  cloudTournamentUnsubscribe =
    firebase.firestoreSdk.onSnapshot(
      tournamentReference,
      {
        includeMetadataChanges: true
      },
      snapshot => {
        applyCloudSnapshot(
          snapshot
        );

        if (
          snapshot.metadata &&
          snapshot.metadata
            .hasPendingWrites
        ) {
          setSaveStatus(
            "Syncing cloud changes..."
          );
        } else if (
          snapshot.metadata &&
          snapshot.metadata.fromCache
        ) {
          setSaveStatus(
            "Showing cached cloud data"
          );
        }
      },
      error => {
        console.error(
          "Tournament live update listener failed.",
          error
        );

        setSaveStatus(
          "Cloud connection failed"
        );
      }
    );
}

function loadState() {
  /*
   * Tournament data is stored in
   * Firestore. Only interface preferences
   * such as theme and active page remain
   * in localStorage.
   */
  localStorage.removeItem(
    PHDTournament.storageKey
  );

  localStorage.removeItem(
    `${PHDTournament.storageKey}:restore`
  );

  PHDTournament.state =
    mergeTournamentState(
      PHDTournament.defaultState
    );

  lastCloudState =
    structuredClone(
      PHDTournament.state
    );

  setSaveStatus(
    "Connecting to cloud..."
  );

  startCloudTournamentListener()
    .catch(error => {
      console.error(
        "Could not start cloud tournament storage.",
        error
      );

      setSaveStatus(
        "Cloud unavailable"
      );
    });

  if (
    typeof subscribeToAuth ===
    "function"
  ) {
    subscribeToAuth(authState => {
      if (
        !authState ||
        !authState.isAdmin
      ) {
        return;
      }

      ensureCloudTournamentExists()
        .catch(error => {
          console.error(
            "Could not ensure the cloud tournament exists.",
            error
          );
        });
    });
  }
}

function resetState() {
  requireTournamentAdmin();

  PHDTournament.state =
    mergeTournamentState(
      PHDTournament.defaultState
    );

  autosave();

  setSaveStatus(
    "Resetting cloud tournament"
  );
}

function saveThemePreference(
  theme
) {
  localStorage.setItem(
    PHDTournament.themeKey,
    theme
  );
}

function loadThemePreference() {
  const savedTheme =
    localStorage.getItem(
      PHDTournament.themeKey
    );

  if (
    savedTheme === "dark"
  ) {
    document.body.classList.add(
      "dark"
    );
  }
}

async function createRestorePoint() {
  try {
    requireTournamentAdmin();

    const firebase =
      await PHDFirebase.ready;

    const restoreReference =
      getRestoreDocumentReference(
        firebase
      );

    const backupState =
      cloneStateForCloud();

    const user =
      getCloudUserDetails();

    setSaveStatus(
      "Creating cloud restore point..."
    );

    await firebase.firestoreSdk.setDoc(
      restoreReference,
      {
        state: backupState,
        createdAt:
          firebase.firestoreSdk
            .serverTimestamp(),
        createdBy: user,
        summary:
          getStateSummary(
            backupState
          ),
        backupType:
          "manual-restore-point",
        tournamentDocument:
          PHDFirebase
            .tournamentDocument
      }
    );

    setSaveStatus(
      "Cloud restore point created"
    );

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "backup.created",
        "Created a cloud restore point.",
        {
          backupDocument:
            "restore-current",
          summary:
            getStateSummary(
              backupState
            )
        }
      );
    }

    alert(
      "Cloud restore point created."
    );
  } catch (error) {
    console.error(
      "Could not create the cloud restore point.",
      error
    );

    setSaveStatus(
      "Restore point failed"
    );

    alert(
      error && error.message
        ? error.message
        : "Could not create the cloud restore point."
    );
  }
}

async function restoreLastPoint() {
  try {
    requireTournamentAdmin();

    const confirmed = confirm(
      "Restore the last cloud restore point? This will replace the current tournament for every viewer."
    );

    if (!confirmed) {
      return;
    }

    const firebase =
      await PHDFirebase.ready;

    const restoreReference =
      getRestoreDocumentReference(
        firebase
      );

    const snapshot =
      await firebase.firestoreSdk
        .getDoc(
          restoreReference
        );

    if (!snapshot.exists()) {
      alert(
        "No cloud restore point was found."
      );

      return;
    }

    const restoreData =
      snapshot.data();

    if (
      !restoreData ||
      !restoreData.state
    ) {
      alert(
        "The cloud restore point is invalid."
      );

      return;
    }

    const previousState =
      cloneStateForCloud();

    const restoredState =
      mergeTournamentState(
        restoreData.state
      );

    PHDTournament.state =
      restoredState;

    await saveState();

    if (
      typeof render === "function"
    ) {
      render();
    }

    if (
      typeof applyAdminAccessState ===
      "function"
    ) {
      applyAdminAccessState();
    }

    setSaveStatus(
      "Cloud restore point restored"
    );

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "backup.restored",
        "Restored the tournament from the cloud restore point.",
        {
          backupDocument:
            "restore-current",
          previousSummary:
            getStateSummary(
              previousState
            ),
          restoredSummary:
            getStateSummary(
              restoredState
            )
        }
      );
    }

    alert(
      "Cloud restore point restored."
    );
  } catch (error) {
    console.error(
      "Could not restore the cloud restore point.",
      error
    );

    setSaveStatus(
      "Restore failed"
    );

    alert(
      error && error.message
        ? error.message
        : "Could not restore the cloud restore point."
    );
  }
}

function isCloudStateLoaded() {
  return cloudStateHasLoaded;
}

function doesCloudTournamentExist() {
  return (
    cloudDocumentExists === true
  );
}

window.isCloudStateLoaded =
  isCloudStateLoaded;

window.doesCloudTournamentExist =
  doesCloudTournamentExist;

PHDTournament.modules.push(
  "storage"
);
