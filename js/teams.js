function getTeamFormValues() {
  return {
    name: document
      .getElementById("teamName")
      .value.trim(),

    shortName: document
      .getElementById("teamShortName")
      .value.trim(),

    logoUrl: document
      .getElementById("teamLogoUrl")
      .value.trim(),

    colour:
      document.getElementById("teamColour").value ||
      "#6d5dfc"
  };
}

function clearTeamForm() {
  PHDTournament.editingTeamId = null;

  document.getElementById("teamName").value = "";
  document.getElementById("teamShortName").value = "";
  document.getElementById("teamLogoUrl").value = "";
  document.getElementById("teamColour").value = "#6d5dfc";
  document.getElementById("saveTeam").textContent = "Add Team";
}

function createTeam(values) {
  return {
    id: crypto.randomUUID(),
    name: values.name,
    shortName: values.shortName,
    logoUrl: values.logoUrl,
    colour: values.colour,
    createdAt: new Date().toISOString()
  };
}

function getTeamAuditDetails(team) {
  return {
    teamId: team.id,
    name: team.name,
    shortName: team.shortName || "",
    logoUrl: team.logoUrl || "",
    colour: team.colour || "#6d5dfc"
  };
}

function getTeamChanges(previousTeam, updatedTeam) {
  const changes = {};

  [
    "name",
    "shortName",
    "logoUrl",
    "colour"
  ].forEach(field => {
    const previousValue =
      previousTeam[field] || "";

    const updatedValue =
      updatedTeam[field] || "";

    if (previousValue !== updatedValue) {
      changes[field] = {
        from: previousValue,
        to: updatedValue
      };
    }
  });

  return changes;
}

async function saveTeamFromForm() {
  const values = getTeamFormValues();

  if (!values.name) {
    alert("Enter a team name.");
    return;
  }

  const duplicate =
    PHDTournament.state.teams.some(
      team =>
        team.name.toLowerCase() ===
          values.name.toLowerCase() &&
        team.id !==
          PHDTournament.editingTeamId
    );

  if (duplicate) {
    alert("That team already exists.");
    return;
  }

  const editingTeamId =
    PHDTournament.editingTeamId;

  let auditAction = "";
  let auditSummary = "";
  let auditDetails = {};

  if (editingTeamId) {
    const team = getTeamById(editingTeamId);

    if (!team) {
      return;
    }

    const previousTeam =
      structuredClone(team);

    team.name = values.name;
    team.shortName = values.shortName;
    team.logoUrl = values.logoUrl;
    team.colour = values.colour;

    auditAction = "team.updated";
    auditSummary =
      `Updated team "${team.name}".`;

    auditDetails = {
      team: getTeamAuditDetails(team),
      changes: getTeamChanges(
        previousTeam,
        team
      )
    };
  } else {
    const newTeam = createTeam(values);

    PHDTournament.state.teams.push(
      newTeam
    );

    auditAction = "team.created";
    auditSummary =
      `Added team "${newTeam.name}".`;

    auditDetails = {
      team: getTeamAuditDetails(newTeam)
    };
  }

  clearTeamForm();
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
      "Team changes could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The team changes could not be saved."
    );
  }
}

function editTeam(teamId) {
  const team = getTeamById(teamId);

  if (!team) {
    return;
  }

  PHDTournament.editingTeamId =
    team.id;

  document.getElementById(
    "teamName"
  ).value = team.name;

  document.getElementById(
    "teamShortName"
  ).value = team.shortName || "";

  document.getElementById(
    "teamLogoUrl"
  ).value = team.logoUrl || "";

  document.getElementById(
    "teamColour"
  ).value =
    team.colour || "#6d5dfc";

  document.getElementById(
    "saveTeam"
  ).textContent = "Save Team";
}

async function deleteTeam(teamId) {
  const team = getTeamById(teamId);

  if (!team) {
    return;
  }

  const usedInFourPlayerSwiss =
    PHDTournament.state.games.some(
      game =>
        game.fourPlayerSwiss &&
        Array.isArray(
          game.fourPlayerSwiss.rounds
        ) &&
        game.fourPlayerSwiss.rounds
          .some(round =>
            (round.groups || [])
              .some(group =>
                (
                  group.competitors ||
                  []
                ).some(
                  competitor =>
                    competitor.teamId ===
                    teamId
                )
              )
          )
    );

  if (usedInFourPlayerSwiss) {
    alert(
      "This competitor already has 4 Player Swiss tournament data and cannot be deleted."
    );
    return;
  }

  const confirmed = confirm(
    `Delete ${team.name}?`
  );

  if (!confirmed) {
    return;
  }

  const deletedTeam =
    structuredClone(team);

  PHDTournament.state.teams =
    PHDTournament.state.teams.filter(
      item => item.id !== teamId
    );

  if (
    PHDTournament.editingTeamId ===
    teamId
  ) {
    clearTeamForm();
  }

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "team.deleted",
        `Deleted team "${deletedTeam.name}".`,
        {
          team:
            getTeamAuditDetails(
              deletedTeam
            )
        }
      );
    }
  } catch (error) {
    console.error(
      "The team could not be deleted.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The team could not be deleted."
    );
  }
}

function renderTeams() {
  const list =
    document.getElementById(
      "teamList"
    );

  list.innerHTML = "";

  if (
    PHDTournament.state.teams.length ===
    0
  ) {
    list.innerHTML = `
      <li class="empty-state">
        No teams added yet. Add your first competitor above.
      </li>
    `;

    return;
  }

  PHDTournament.state.teams.forEach(
    team => {
      const item =
        document.createElement("li");

      item.className = "team-item";

      item.innerHTML = `
        <div
          class="team-logo"
          style="background:${escapeHtml(
            team.colour ||
              "#6d5dfc"
          )}"
        >
          ${renderTeamLogo(team)}
        </div>

        <div class="team-meta">
          <strong>
            ${escapeHtml(team.name)}
          </strong>

          <span>
            ${escapeHtml(
              team.shortName ||
                "No short name"
            )}
            ·
            ${escapeHtml(
              team.logoUrl ||
                "No logo URL"
            )}
          </span>
        </div>

        <div class="team-actions">
          <button
            class="small-button secondary edit-team"
            type="button"
            data-team-id="${team.id}"
          >
            Edit
          </button>

          <button
            class="small-button danger delete-team"
            type="button"
            data-team-id="${team.id}"
          >
            Delete
          </button>
        </div>
      `;

      list.appendChild(item);
    }
  );
}

PHDTournament.modules.push("teams");
