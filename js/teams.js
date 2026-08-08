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
      "#6d5dfc",

    officeId: document
      .getElementById("teamOffice")
      .value
  };
}

function clearTeamForm() {
  PHDTournament.editingTeamId = null;

  document.getElementById("teamName").value = "";
  document.getElementById("teamShortName").value = "";
  document.getElementById("teamLogoUrl").value = "";
  document.getElementById("teamColour").value = "#6d5dfc";
  document.getElementById("teamOffice").value = "";
  document.getElementById("saveTeam").textContent = "Add Team";
}

function createTeam(values) {
  return {
    id: crypto.randomUUID(),
    name: values.name,
    shortName: values.shortName,
    logoUrl: values.logoUrl,
    colour: values.colour,
    officeId: values.officeId,
    createdAt: new Date().toISOString()
  };
}

function getTeamAuditDetails(team) {
  return {
    teamId: team.id,
    name: team.name,
    shortName: team.shortName || "",
    logoUrl: team.logoUrl || "",
    colour: team.colour || "#6d5dfc",
    officeId: team.officeId || ""
  };
}

function getTeamChanges(previousTeam, updatedTeam) {
  const changes = {};

  [
    "name",
    "shortName",
    "logoUrl",
    "colour",
    "officeId"
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

  if (!getOfficeById(values.officeId)) {
    alert("Select a country for this team.");
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
    team.officeId = values.officeId;

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
    "teamOffice"
  ).value = team.officeId || "";

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
            &middot;
            ${escapeHtml(
              (getOfficeForTeam(team) || {}).name ||
                "No country"
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

function getOfficeFormValues() {
  return {
    name: document.getElementById("officeName").value.trim(),
    shortName: document.getElementById("officeShortName").value.trim()
  };
}

function clearOfficeForm() {
  PHDTournament.editingOfficeId = null;
  document.getElementById("officeName").value = "";
  document.getElementById("officeShortName").value = "";
  document.getElementById("saveOffice").textContent = "Add Country";
}

async function saveOfficeFromForm() {
  const values = getOfficeFormValues();
  if (!values.name) {
    alert("Enter a country name.");
    return;
  }

  const duplicate = (PHDTournament.state.offices || []).some(
    office => office.name.toLowerCase() === values.name.toLowerCase() &&
      office.id !== PHDTournament.editingOfficeId
  );
  if (duplicate) {
    alert("That country already exists.");
    return;
  }

  let office;
  let action;
  if (PHDTournament.editingOfficeId) {
    office = getOfficeById(PHDTournament.editingOfficeId);
    if (!office) return;
    office.name = values.name;
    office.shortName = values.shortName;
    action = "office.updated";
  } else {
    office = {
      id: crypto.randomUUID(),
      name: values.name,
      shortName: values.shortName,
      createdAt: new Date().toISOString()
    };
    PHDTournament.state.offices.push(office);
    action = "office.created";
  }

  clearOfficeForm();
  render();
  await saveState();
  if (typeof recordAuditEntry === "function") {
    await recordAuditEntry(action, `${action === "office.created" ? "Added" : "Updated"} country "${office.name}".`, { office });
  }
}

function editOffice(officeId) {
  const office = getOfficeById(officeId);
  if (!office) return;
  PHDTournament.editingOfficeId = office.id;
  document.getElementById("officeName").value = office.name;
  document.getElementById("officeShortName").value = office.shortName || "";
  document.getElementById("saveOffice").textContent = "Save Country";
}

async function deleteOffice(officeId) {
  const office = getOfficeById(officeId);
  if (!office) return;
  if (getTeamsForOffice(officeId).length) {
    alert("Reassign or delete this country's teams before deleting the country.");
    return;
  }
  if (!confirm(`Delete ${office.name}?`)) return;
  PHDTournament.state.offices = PHDTournament.state.offices
    .filter(item => item.id !== officeId);
  clearOfficeForm();
  render();
  await saveState();
  if (typeof recordAuditEntry === "function") {
    await recordAuditEntry("office.deleted", `Deleted country "${office.name}".`, { office });
  }
}

function renderOffices() {
  const offices = PHDTournament.state.offices || [];
  const select = document.getElementById("teamOffice");
  const list = document.getElementById("officeList");

  if (select) {
    const selected = select.value;
    select.innerHTML = `<option value="">Select country</option>${offices.map(office => `
      <option value="${escapeHtml(office.id)}">${escapeHtml(office.name)}</option>
    `).join("")}`;
    select.value = offices.some(office => office.id === selected) ? selected : "";
  }

  if (!list) return;
  list.innerHTML = offices.length ? offices.map(office => `
    <li class="team-item country-item">
      <div class="country-meta">
        <strong>${escapeHtml(office.name)}</strong>
        <span>${escapeHtml(office.shortName || "No short name")}</span>
        <span>${getTeamsForOffice(office.id).length} team(s)</span>
      </div>
      <div class="team-actions">
        <button class="small-button secondary edit-office" type="button" data-office-id="${escapeHtml(office.id)}">Edit</button>
        <button class="small-button danger delete-office" type="button" data-office-id="${escapeHtml(office.id)}">Delete</button>
      </div>
    </li>
  `).join("") : `<li class="empty-state">No countries yet. Add a country before creating a team.</li>`;
}

PHDTournament.modules.push("teams");
