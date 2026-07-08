function saveState() {
  localStorage.setItem(
    PHDTournament.storageKey,
    JSON.stringify(PHDTournament.state)
  );

  setSaveStatus("Saved");
}

function autosave() {
  setSaveStatus("Saving...");
  saveState();
}

function loadState() {
  const saved = localStorage.getItem(PHDTournament.storageKey);

  if (!saved) return;

  try {
    const parsed = JSON.parse(saved);

    PHDTournament.state = {
      ...structuredClone(PHDTournament.defaultState),
      ...parsed,
      tournament: {
        ...PHDTournament.defaultState.tournament,
        ...(parsed.tournament || {}),
        settings: {
          ...PHDTournament.defaultState.tournament.settings,
          ...((parsed.tournament && parsed.tournament.settings) || {})
        }
      },
      teams: parsed.teams || [],
      rounds: parsed.rounds || []
    };
  } catch {
    PHDTournament.state = structuredClone(PHDTournament.defaultState);
  }
}

function resetState() {
  PHDTournament.state = structuredClone(PHDTournament.defaultState);
  localStorage.removeItem(PHDTournament.storageKey);
  setSaveStatus("Reset");
}
function saveThemePreference(theme) {
  localStorage.setItem(PHDTournament.themeKey, theme);
}

function loadThemePreference() {
  const savedTheme = localStorage.getItem(PHDTournament.themeKey);

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
  }
}

function getRestoreKey() {
  return `${PHDTournament.storageKey}:restore`;
}

function createRestorePoint() {
  const snapshot = {
    createdAt: new Date().toISOString(),
    state: structuredClone(PHDTournament.state)
  };

  localStorage.setItem(getRestoreKey(), JSON.stringify(snapshot));
  setSaveStatus("Restore point created");
  alert("Restore point created.");
}

function restoreLastPoint() {
  const saved = localStorage.getItem(getRestoreKey());

  if (!saved) {
    alert("No restore point found.");
    return;
  }

  const confirmed = confirm(
    "Restore the last saved restore point? This will replace the current tournament."
  );

  if (!confirmed) return;

  try {
    const snapshot = JSON.parse(saved);

    if (!snapshot.state) {
      alert("Restore point is invalid.");
      return;
    }

    PHDTournament.state = snapshot.state;
    saveState();
    render();
    setSaveStatus("Restored");
    alert("Restore point restored.");
  } catch {
    alert("Could not restore this restore point.");
  }
}

PHDTournament.modules.push("storage");