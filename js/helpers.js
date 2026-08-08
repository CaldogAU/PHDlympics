function setSaveStatus(message) {
  document.getElementById("saveStatus").textContent = message;
}

function getInitials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(word => word[0].toUpperCase())
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getTeamById(teamId) {
  return PHDTournament.state.teams.find(team => team.id === teamId);
}

function getOfficeById(officeId) {
  return (PHDTournament.state.offices || [])
    .find(office => office.id === officeId);
}

function getOfficeForTeam(teamOrId) {
  const team = typeof teamOrId === "string"
    ? getTeamById(teamOrId)
    : teamOrId;
  return team ? getOfficeById(team.officeId) : null;
}

function getTeamsForOffice(officeId) {
  return (PHDTournament.state.teams || [])
    .filter(team => team.officeId === officeId);
}

function renderTeamLogo(team) {
  if (!team) return "";

  if (team.logoUrl) {
    return `<img src="${escapeHtml(team.logoUrl)}" alt="${escapeHtml(team.name)} logo" onerror="this.remove()" />`;
  }

  return escapeHtml(getInitials(team.shortName || team.name));
}

PHDTournament.modules.push("helpers");
