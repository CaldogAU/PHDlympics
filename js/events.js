function getPicoAttemptsContext(event) {
  const game = getGameById(event.gameId);
  const teams = window.PHDGameCapacity.getEligibleTeams(game, PHDTournament.state.teams || []);
  return { teams, teamIds: teams.map(team => team.id), results: event.results || [] };
}

function renderPicoAttemptsEntries(event) {
  const context = getPicoAttemptsContext(event);
  const staffScoped = typeof isTeamScopedStaff === "function" && isTeamScopedStaff();
  const teams = !event.completed && staffScoped
    ? context.teams.filter(team => team.id === getAssignedStaffTeamId()) : context.teams;
  const rankings = event.completed ? window.PHDGameModes.buildResult(
    window.PHDGameModes.getRequired("pico-park-attempts"), context
  ).leaderboard : [];
  const ordered = event.completed ? [...teams].sort((a, b) =>
    rankings.findIndex(team => team.teamId === a.id) - rankings.findIndex(team => team.teamId === b.id)
  ) : teams;
  return `<p class="muted">Record attempts after the team completes this world. Fewer attempts ranks higher. Leave unfinished teams blank. Final tournament points use the total attempts across all worlds.</p>
    <label>Game world <input type="text" class="pico-world-name" maxlength="100" value="${escapeHtml(event.worldName || `World ${event.roundNumber || 1}`)}" ${event.completed || staffScoped ? "disabled" : ""}></label>
    <div class="table-wrap"><table><thead><tr><th>Team</th><th>Attempts to complete</th><th>World rank</th></tr></thead><tbody>${ordered.map(team => {
      const result = getEventResultForTeam(event, team.id);
      const ranking = rankings.find(entry => entry.teamId === team.id);
      return `<tr data-team-id="${escapeHtml(team.id)}"><td>${escapeHtml(team.name)}</td><td><input type="number" min="1" step="1" class="pico-attempts" aria-label="${escapeHtml(team.name)} attempts to complete" value="${result ? Number(result.attempts) : ""}" ${event.completed ? "disabled" : ""}></td><td>${ranking ? ranking.position : "—"}</td></tr>`;
    }).join("")}</tbody></table></div>
    ${event.completed ? "" : `<button type="button" class="save-pico-attempts-results" data-event-id="${escapeHtml(event.id)}">Save Attempts</button>`}`;
}

function renderPicoAttemptsAggregate(game) {
  const rankings = getCompletedGameLeaderboard(game);
  return `<section class="card wide"><h2>Combined World Ranking</h2>
    ${rankings ? `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Total attempts</th><th>Tournament points</th></tr></thead><tbody>${rankings.map(team => `<tr><td>${team.position}</td><td>${escapeHtml(team.teamName)}</td><td>${team.attempts}</td><td>${team.championshipPoints}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Every team must complete every world before final rankings and tournament points are revealed.</p>`}
  </section>`;
}

async function savePicoAttemptsResults(eventId) {
  if (typeof requireAdminForAction === "function" && !requireAdminForAction()) return;
  const event = getEventById(eventId);
  const workspace = document.querySelector(`[data-event-workspace="${eventId}"]`);
  if (!event || !workspace || event.completed || event.mode !== "pico-park-attempts") return;
  const context = getPicoAttemptsContext(event);
  const staffScoped = typeof isTeamScopedStaff === "function" && isTeamScopedStaff();
  const allowed = new Set(context.teamIds.filter(id => !staffScoped || id === getAssignedStaffTeamId()));
  const worldName = staffScoped ? event.worldName || `World ${event.roundNumber || 1}`
    : workspace.querySelector(".pico-world-name").value.trim();
  if (!worldName || worldName.length > 100) { alert("Enter a game world name of up to 100 characters."); return; }
  const next = [...(event.results || [])];
  for (const row of workspace.querySelectorAll("tr[data-team-id]")) {
    const teamId = row.dataset.teamId;
    if (!allowed.has(teamId)) continue;
    const input = row.querySelector(".pico-attempts").value.trim();
    const index = next.findIndex(result => result.teamId === teamId);
    if (input === "") { if (index >= 0) next.splice(index, 1); continue; }
    if (!Number.isSafeInteger(Number(input)) || Number(input) < 1) {
      alert("Attempts must be a positive whole number. Leave unfinished teams blank."); return;
    }
    const result = { teamId, attempts: Number(input) };
    if (index < 0) next.push(result); else next[index] = result;
  }
  const mode = window.PHDGameModes.getRequired("pico-park-attempts");
  await persistEventResults(event, next, `Saved attempts for ${worldName}.`,
    mode.areResultsComplete({ ...context, results: next }), { worldName });
}

function getRunbowParticipants(event, includeAll = false) {
  const game = getGameById(event.gameId);
  if (!game) return [];
  const teams = window.PHDGameCapacity.getEligibleTeams(game, PHDTournament.state.teams || []);
  let players = !game.capacity || game.capacity.configured === false
    ? teams.map(team => ({ participantId: team.id, teamId: team.id, displayName: team.name }))
    : window.PHDGameCapacity.getActiveEntries(game, teams).flatMap(entry =>
      Array.from({ length: entry.competitorCount }, (_, index) => ({
        participantId: `${entry.officeId}:player-${entry.playerStartIndex + index + 1}`,
        teamId: entry.officeId,
        displayName: `${entry.officeName} - Player ${String.fromCharCode(65 + entry.playerStartIndex + index)}`
      }))
    );
  if (!includeAll && !event.completed && typeof isTeamScopedStaff === "function" && isTeamScopedStaff()) {
    players = players.filter(player => player.teamId === getAssignedStaffTeamId());
  }
  return players;
}

function renderRunbowEntries(event) {
  const players = getRunbowParticipants(event);
  return `
    <p class="muted">Record medals and deaths for this round. Final team score = total medals across all players and rounds minus total deaths. Teams are ranked once on that final score; tournament points are awarded only in the final ranking.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Player</th><th>Medals</th><th>Deaths</th><th>Score</th></tr></thead>
      <tbody>${players.map(player => {
        const result = getEventResultForParticipant(event, player.participantId);
        return `<tr data-team-id="${escapeHtml(player.teamId)}" data-participant-id="${escapeHtml(player.participantId)}">
          <td>${escapeHtml(player.displayName)}</td>
          <td><input type="number" min="0" step="1" class="runbow-medals" aria-label="${escapeHtml(player.displayName)} medals" value="${result ? Number(result.medals) : ""}" ${event.completed ? "disabled" : ""}></td>
          <td><input type="number" min="0" step="1" class="runbow-deaths" aria-label="${escapeHtml(player.displayName)} deaths" value="${result ? Number(result.deaths) : ""}" ${event.completed ? "disabled" : ""}></td>
          <td>${result ? Number(result.medals) - Number(result.deaths) : "—"}</td></tr>`;
      }).join("")}</tbody></table></div>
    ${event.completed ? "" : `<button type="button" class="save-runbow-results" data-event-id="${escapeHtml(event.id)}">Save Results</button>`}
  `;
}

function renderRunbowAggregateStandings(game) {
  const rankings = getCompletedGameLeaderboard(game);
  return `<section class="card wide"><h2>Final Runbow Ranking</h2>
    <p class="muted">Final score = total medals minus total deaths across all players and rounds. Tournament points are awarded once from this final ranking; last place receives 1 point, with one more per higher place. Ties share the points for their occupied places.</p>
    ${rankings ? `<div class="table-wrap"><table><thead><tr><th>Rank</th><th>Team</th><th>Total medals</th><th>Total deaths</th><th>Final score</th><th>Tournament points</th></tr></thead><tbody>${rankings.map(team => `<tr><td>${team.position}</td><td>${escapeHtml(team.teamName)}</td><td>${team.medals}</td><td>${team.deaths}</td><td>${team.points}</td><td>${team.championshipPoints}</td></tr>`).join("")}</tbody></table></div>` : `<p class="muted">Complete every player's results in every planned round to reveal the final team ranking and championship points.</p>`}
  </section>`;
}

async function saveRunbowResults(eventId) {
  if (typeof requireAdminForAction === "function" && !requireAdminForAction()) return;
  const event = getEventById(eventId);
  const workspace = document.querySelector(`[data-event-workspace="${eventId}"]`);
  if (!event || !workspace || event.completed || event.mode !== "runbow-offline") return;
  const allowed = new Set(getRunbowParticipants(event).map(player => player.participantId));
  const next = [...(event.results || [])];
  for (const row of workspace.querySelectorAll("tr[data-participant-id]")) {
    const participantId = row.dataset.participantId;
    if (!allowed.has(participantId)) continue;
    const medals = row.querySelector(".runbow-medals").value.trim();
    const deaths = row.querySelector(".runbow-deaths").value.trim();
    if (medals === "" && deaths === "") continue;
    if ([medals, deaths].some(value => value === "" || !Number.isSafeInteger(Number(value)) || Number(value) < 0)) {
      alert("Enter non-negative whole numbers for both medals and deaths for each player.");
      return;
    }
    const index = next.findIndex(result => result.participantId === participantId);
    const result = { participantId, teamId: row.dataset.teamId, medals: Number(medals), deaths: Number(deaths) };
    if (index < 0) next.push(result); else next[index] = result;
  }
  const complete = window.PHDGameModes.getRequired("runbow-offline").areResultsComplete({
    participantIds: getRunbowParticipants(event, true).map(player => player.participantId), results: next
  });
  await persistEventResults(event, next, complete ? "Completed Runbow offline results." : "Saved Runbow offline results.", complete);
}

function getEventGames() {
  return getGames().filter(game => {
    const mode = game.mode || "swiss";

    return (
      mode === "time-trial" ||
      mode === "grand-prix" ||
      mode === "runbow-offline" ||
      mode === "pico-park-attempts"
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

function getEventsByGameId(gameId) {
  return PHDTournament.state.events
    .filter(event => event.gameId === gameId)
    .sort((eventA, eventB) =>
      Number(eventA.roundNumber || 1) -
      Number(eventB.roundNumber || 1)
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

function getEventResultForParticipant(event, participantId) {
  if (!event || !Array.isArray(event.results)) return null;
  return event.results.find(result =>
    (result.participantId || result.teamId) === participantId
  ) || null;
}

function getGrandPrixParticipants(event, includeAll = false) {
  const game = event && typeof getGameById === "function"
    ? getGameById(event.gameId)
    : null;
  if (!game || !window.PHDGameCapacity) return [];

  const allTeams = window.PHDGameCapacity.getEligibleTeams(
    game,
    PHDTournament.state.teams || []
  );
  let participants = [];

  if (!game.capacity || game.capacity.configured === false) {
    participants = allTeams.map(team => {
      const country = typeof getOfficeById === "function"
        ? getOfficeById(team.officeId)
        : null;
      return {
      participantId: team.id,
      teamId: team.id,
      playerIndex: 0,
      playerLabel: "Player A",
      displayName: team.name,
      lobbyId: "lobby-1",
      lobbyName: "Lobby 1",
      lobbySize: allTeams.length,
      countryName: country ? country.name : ""
    };
    });
    const preferredHost = participants.find(item =>
      ["singapore", "malaysia", "thailand"].includes(
        String(item.countryName || "").trim().toLowerCase()
      )
    );
    const hostId = (preferredHost || participants[0] || {}).participantId;
    participants = participants.map(item => ({
      ...item,
      isHost: item.participantId === hostId
    }));
  } else {
    const allocation = window.PHDGameCapacity.allocateLobbies({
      entries: window.PHDGameCapacity.getActiveEntries(
        game,
        PHDTournament.state.teams || []
      ),
      maxPlayersPerLobby: game.capacity.maxPlayersPerLobby
    });
    if (!allocation.valid) return [];

    participants = allocation.lobbies.flatMap(lobby => {
      const lobbyParticipants = lobby.entries.flatMap(entry => {
        const team = getTeamById(entry.officeId);
        const country = team && typeof getOfficeById === "function"
          ? getOfficeById(team.officeId)
          : null;
        return Array.from(
          { length: entry.competitorCount },
          (_, playerIndex) => {
            const teamPlayerIndex =
              entry.playerStartIndex + playerIndex;
            const playerLetter = String.fromCharCode(65 + teamPlayerIndex);
            return {
              participantId: `${entry.officeId}:player-${teamPlayerIndex + 1}`,
              teamId: entry.officeId,
              playerIndex: teamPlayerIndex,
              playerLabel: `Player ${playerLetter}`,
              displayName: `${team ? team.name : entry.officeName} - Player ${playerLetter}`,
              countryName: country ? country.name : entry.countryName || "",
              lobbyId: lobby.id,
              lobbyName: lobby.name,
              lobbySize: lobby.competitorTotal
            };
          }
        );
      });
      const preferredHost = lobbyParticipants.find(item =>
        ["singapore", "malaysia", "thailand"].includes(
          String(item.countryName || "").trim().toLowerCase()
        )
      );
      const hostId = (preferredHost || lobbyParticipants[0] || {}).participantId;
      return lobbyParticipants.map(item => ({
        ...item,
        isHost: item.participantId === hostId
      }));
    });
  }

  if (
    !includeAll &&
    !event.completed &&
    typeof isTeamScopedStaff === "function" &&
    isTeamScopedStaff()
  ) {
    const teamId = getAssignedStaffTeamId();
    return participants.filter(item => item.teamId === teamId);
  }
  return participants;
}

function getGrandPrixTeamRankings(event) {
  const participants = getGrandPrixParticipants(event, true);
  const byTeam = new Map();

  participants.forEach(participant => {
    if (!byTeam.has(participant.teamId)) {
      const team = getTeamById(participant.teamId);
      byTeam.set(participant.teamId, {
        teamId: participant.teamId,
        teamName: team ? team.name : "",
        score: 0,
        bestFinish: Number.MAX_SAFE_INTEGER
      });
    }
    const result = getEventResultForParticipant(
      event,
      participant.participantId
    );
    const position = Number(result && result.finishPosition);
    if (!Number.isInteger(position)) return;
    const ranking = byTeam.get(participant.teamId);
    ranking.score += participant.lobbySize - position + 1;
    ranking.bestFinish = Math.min(ranking.bestFinish, position);
  });

  return [...byTeam.values()]
    .sort((teamA, teamB) =>
      teamB.score - teamA.score ||
      teamA.bestFinish - teamB.bestFinish ||
      teamA.teamName.localeCompare(teamB.teamName)
    )
    .map((ranking, index) => ({ ...ranking, position: index + 1 }));
}

function getVisibleEventTeams(event) {
  const game = event &&
    typeof getGameById === "function"
    ? getGameById(event.gameId)
    : null;
  const teams = game && window.PHDGameCapacity
    ? window.PHDGameCapacity
        .getEligibleTeams(
          game,
          PHDTournament.state.teams || []
        )
    : [...(PHDTournament.state.teams || [])];

  if (
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff() &&
    !event.completed
  ) {
    const assignedTeamId =
      getAssignedStaffTeamId();

    return teams.filter(
      team =>
        team.id === assignedTeamId
    );
  }

  if (!event.completed) {
    return teams;
  }

  if (
    event.mode === "grand-prix" &&
    Array.isArray(event.results) &&
    event.results.some(result => result.participantId)
  ) {
    const rankByTeamId = new Map(
      getGrandPrixTeamRankings(event).map(
        ranking => [ranking.teamId, ranking.position]
      )
    );
    return teams.sort((teamA, teamB) =>
      (rankByTeamId.get(teamA.id) || Number.MAX_SAFE_INTEGER) -
      (rankByTeamId.get(teamB.id) || Number.MAX_SAFE_INTEGER)
    );
  }

  return teams.sort((teamA, teamB) => {
    const resultA =
      getEventResultForTeam(
        event,
        teamA.id
      );
    const resultB =
      getEventResultForTeam(
        event,
        teamB.id
      );

    if (event.mode === "grand-prix") {
      return Number(
        resultA &&
          resultA.finishPosition
      ) -
        Number(
          resultB &&
            resultB.finishPosition
        );
    }

    return Math.floor(
      Number(
        resultA &&
          resultA.timeMilliseconds
      ) / 1000
    ) -
      Math.floor(
        Number(
          resultB &&
            resultB.timeMilliseconds
        ) / 1000
      );
  });
}

function getEventResultPosition(
  event,
  teamId
) {
  if (!event.completed) return null;

  const teams =
    getVisibleEventTeams(event);
  const index =
    teams.findIndex(
      team => team.id === teamId
    );

  return index === -1
    ? null
    : index + 1;
}

function getTimeTrialRoundStandings(event) {
  const teams = getVisibleEventTeams({ ...event, completed: true });
  const participantCount = teams.length;
  const rankings = teams
    .map(team => {
      const result = getEventResultForTeam(event, team.id);
      const timeMilliseconds = result && Number.isFinite(Number(result.timeMilliseconds))
        ? Number(result.timeMilliseconds)
        : null;
      return {
        teamId: team.id,
        teamName: team.name,
        timeMilliseconds
      };
    })
    .filter(entry => entry.timeMilliseconds !== null)
    .sort((entryA, entryB) =>
      entryA.timeMilliseconds - entryB.timeMilliseconds ||
      entryA.teamName.localeCompare(entryB.teamName)
    )
    .map((entry, index, allEntries) => ({
      ...entry,
      position: allEntries.findIndex(candidate =>
        candidate.timeMilliseconds === entry.timeMilliseconds
      ) + 1
    }));

  const pointsByPosition = new Map();
  rankings.forEach((entry, index) => {
    if (!pointsByPosition.has(entry.position)) {
      pointsByPosition.set(entry.position, []);
    }
    pointsByPosition.get(entry.position).push(
      Math.max(1, participantCount - index)
    );
  });

  return rankings.map(entry => ({
    ...entry,
    roundPoints: pointsByPosition.get(entry.position).reduce(
      (sum, points) => sum + points,
      0
    ) / pointsByPosition.get(entry.position).length
  }));
}

function formatTimeTrialPoints(points) {
  return Number.isInteger(points) ? String(points) : Number(points).toFixed(1);
}

function getTimeTrialAggregateStandings(game, events) {
  const teams = window.PHDGameCapacity
    ? window.PHDGameCapacity.getEligibleTeams(game, PHDTournament.state.teams || [])
    : [...(PHDTournament.state.teams || [])];
  const roundStandings = events.map(event =>
    new Map(getTimeTrialRoundStandings(event).map(entry => [entry.teamId, entry]))
  );
  const anyCompleted = events.some(event => event.completed);
  const allComplete = events.length > 0 && events.every(event => event.completed);
  const rankings = teams.map(team => {
    const coursePoints = roundStandings.map((standings, index) =>
      events[index].completed && standings.has(team.id)
        ? standings.get(team.id).roundPoints
        : null
    );
    return {
      teamId: team.id,
      teamName: team.name,
      coursePoints,
      totalRoundPoints: coursePoints.reduce(
        (sum, points) => sum + (Number.isFinite(points) ? points : 0),
        0
      )
    };
  }).sort((entryA, entryB) =>
    entryB.totalRoundPoints - entryA.totalRoundPoints ||
    entryA.teamName.localeCompare(entryB.teamName)
  ).map((entry, index, allEntries) => ({
    ...entry,
    position: allEntries.findIndex(candidate =>
      candidate.totalRoundPoints === entry.totalRoundPoints
    ) + 1
  }));

  return {
    anyCompleted,
    allComplete,
    rankings: allComplete && window.PHDGameModes
      ? window.PHDGameModes.awardSharedPositionPoints(rankings)
      : rankings
  };
}

function renderTimeTrialAggregateStandings(game, events) {
  const aggregate = getTimeTrialAggregateStandings(game, events);
  if (
    typeof isTeamScopedStaff === "function" &&
    isTeamScopedStaff() &&
    !aggregate.allComplete
  ) {
    return `<section class="card wide"><div class="empty-state">
      The combined course ranking will be revealed after every course is completed.
    </div></section>`;
  }

  return `
    <section class="card wide time-trial-aggregate">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Time Trial (Multiple Course)</p>
          <h2>Combined Course Ranking</h2>
          <p class="muted">Course points are added together. Equal times share the average points for their occupied places.</p>
        </div>
        <span class="status-pill ${aggregate.allComplete ? "completed" : "open"}">
          ${aggregate.allComplete ? "Final Ranking" : "Pending Courses"}
        </span>
      </div>
      <div class="table-wrap"><table>
        <thead><tr>
          <th>Rank</th><th>Team</th>
          ${events.map(event => `<th>Course ${Number(event.roundNumber || 1)}</th>`).join("")}
          <th>Total Course Points</th><th>Overall Tournament Points</th>
        </tr></thead>
        <tbody>${aggregate.rankings.map(entry => `
          <tr class="animated-ranking-row">
            <td>${aggregate.anyCompleted ? entry.position : "—"}</td>
            <td><strong>${escapeHtml(entry.teamName)}</strong></td>
            ${entry.coursePoints.map(points => `<td>${Number.isFinite(points) ? formatTimeTrialPoints(points) : "—"}</td>`).join("")}
            <td><strong>${aggregate.anyCompleted ? formatTimeTrialPoints(entry.totalRoundPoints) : "—"}</strong></td>
            <td><strong>${aggregate.allComplete ? formatTimeTrialPoints(entry.championshipPoints) : "—"}</strong></td>
          </tr>`).join("")}</tbody>
      </table></div>
    </section>`;
}

function canRevealDraftEventRankings() {
  return !(
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff()
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
      const existingEvents =
        getEventsByGameId(game.id);
      const plannedRounds = window.PHDSessionPlanner
        ? window.PHDSessionPlanner.getPlannedRoundCount(
            game,
            PHDTournament.state.tournament
          )
        : 1;
      const existingEvent =
        existingEvents.length >= plannedRounds;

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
              ? " (all rounds already created)"
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
    getVisibleEventTeams(event);
  const roundStandings = getTimeTrialRoundStandings(event);

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
            <th>Rank</th>
            <th>Team</th>
            <th>Minutes</th>
            <th>Seconds</th>
            <th>Course Points</th>
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

              const totalSeconds =
                totalMilliseconds == null
                  ? null
                  : Math.floor(
                      totalMilliseconds / 1000
                    );

              const minutes =
                totalSeconds == null
                  ? ""
                  : Math.floor(
                      totalSeconds / 60
                    );

              const seconds =
                totalSeconds == null
                  ? ""
                  : totalSeconds % 60;
              const standing = roundStandings.find(entry => entry.teamId === team.id);
              const position = standing ? standing.position : null;

              return `
                <tr
                  class="animated-ranking-row"
                  data-event-id="${event.id}"
                  data-team-id="${team.id}"
                >
                  <td class="rank-cell">
                    ${position || "—"}
                  </td>
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

                  <td class="event-tournament-points">
                    ${
                      standing
                        ? formatTimeTrialPoints(standing.roundPoints)
                        : "—"
                    }
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
              ${
                typeof isTeamScopedStaff ===
                  "function" &&
                isTeamScopedStaff()
                  ? "Save My Time"
                  : "Save Times"
              }
            </button>
          </div>
        `
    }
  `;
}

function renderGrandPrixEntries(
  event
) {
  const participants = getGrandPrixParticipants(event);
  const allParticipants = getGrandPrixParticipants(event, true);
  const rankings = getGrandPrixTeamRankings(event);
  const officeCount = new Set(
    allParticipants.map(item => item.teamId)
  ).size;

  if (participants.length === 0) {
    return `
      <div class="empty-state">
        Add teams before entering Grand Prix results.
      </div>
    `;
  }

  return `
    <div class="grand-prix-lobby-tools">
      ${[...new Map(allParticipants.map(participant => [
        participant.lobbyId,
        participant
      ])).values()].map(participant => {
        const host = allParticipants.find(item =>
          item.lobbyId === participant.lobbyId && item.isHost
        );
        const code = event.lobbyCodes && event.lobbyCodes[participant.lobbyId]
          ? event.lobbyCodes[participant.lobbyId]
          : "";
        return `
          <section class="grand-prix-lobby-tool" data-lobby-id="${participant.lobbyId}">
            <div>
              <strong>${escapeHtml(participant.lobbyName)}</strong>
              <span class="lobby-host-label">HOST: ${escapeHtml(host ? host.displayName : "To be assigned")}</span>
            </div>
            <label>
              Lobby code
              <input class="grand-prix-lobby-code" type="text" maxlength="24"
                value="${escapeHtml(code)}" placeholder="Enter lobby code"
                ${event.completed ? "disabled" : ""} />
            </label>
            ${event.completed ? "" : `
              <button class="save-grand-prix-lobby-code small-button" type="button"
                data-event-id="${event.id}" data-lobby-id="${participant.lobbyId}">
                Save Code
              </button>`}
          </section>`;
      }).join("")}
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Competitor</th>
            <th>Lobby</th>
            <th>Finishing Position</th>
            <th>Lobby Points</th>
            <th>Tournament Points</th>
          </tr>
        </thead>
        <tbody>
          ${participants.map(participant => {
            const result = getEventResultForParticipant(
              event,
              participant.participantId
            );
            const ranking = rankings.find(
              item => item.teamId === participant.teamId
            );
            const finishPosition = Number(
              result && result.finishPosition
            );
            const position = (
              event.completed ||
              canRevealDraftEventRankings()
            ) && ranking &&
              Number.isInteger(finishPosition)
              ? ranking.position
              : null;
            const lobbyNumber = Number(
              String(participant.lobbyId || "")
                .match(/\d+$/)?.[0]
            ) || 1;
            const useAlternateLobbyShade =
              lobbyNumber % 2 === 0;

            return `
              <tr
                class="animated-ranking-row${
                  useAlternateLobbyShade
                    ? " event-lobby-alternate"
                    : ""
                }"
                data-event-id="${event.id}"
                data-team-id="${participant.teamId}"
                data-participant-id="${participant.participantId}"
                data-player-index="${participant.playerIndex}"
                data-player-label="${participant.playerLabel}"
                data-lobby-id="${participant.lobbyId}"
                data-lobby-size="${participant.lobbySize}"
              >
                <td class="rank-cell">
                  ${position || "—"}
                </td>
                <td>
                  <strong>
                    ${escapeHtml(participant.displayName)}
                  </strong>
                  ${participant.isHost ? '<span class="lobby-host-badge">HOST</span>' : ""}
                </td>
                <td>${escapeHtml(participant.lobbyName)}</td>
                <td>
                  <input
                    class="finish-position"
                    type="number"
                    min="1"
                    max="${participant.lobbySize}"
                    step="1"
                    value="${
                      result
                        ? result.finishPosition
                        : ""
                    }"
                    ${
                      event.completed
                        ? "disabled"
                        : ""
                    }
                  />
                </td>
                <td class="grand-prix-lobby-points">
                  ${Number.isInteger(finishPosition)
                    ? participant.lobbySize - finishPosition + 1
                    : "—"}
                </td>
                <td class="event-tournament-points">
                  ${position ? officeCount - position + 1 : "—"}
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>

    ${
      event.completed
        ? ""
        : `
          <div class="button-row">
            <button
              class="save-grand-prix-results"
              type="button"
              data-event-id="${event.id}"
            >
              ${
                typeof isTeamScopedStaff ===
                  "function" &&
                isTeamScopedStaff()
                  ? "Save My Result"
                  : "Save Finishing Order"
              }
            </button>
          </div>
        `
    }
  `;
}

async function saveGrandPrixLobbyCode(eventId, lobbyId) {
  const event = getEventById(eventId);
  const workspace = document.querySelector(`[data-event-workspace="${eventId}"]`);
  const tool = workspace && workspace.querySelector(
    `.grand-prix-lobby-tool[data-lobby-id="${lobbyId}"]`
  );
  const input = tool && tool.querySelector(".grand-prix-lobby-code");
  if (!event || !input || event.completed) return;

  const previousCodes = structuredClone(event.lobbyCodes || {});
  event.lobbyCodes = {
    ...previousCodes,
    [lobbyId]: input.value.trim()
  };
  event.updatedAt = new Date().toISOString();
  render();
  try {
    await saveState();
  } catch (error) {
    event.lobbyCodes = previousCodes;
    render();
    console.error("Lobby code could not be saved.", error);
    alert(error && error.message ? error.message : "Lobby code could not be saved.");
  }
}

function renderEventWorkspace(game, event) {
  const modeName =
    getGameModeLabel(game);

  return `
    <section
      class="card wide"
      data-event-workspace="${event.id}"
      data-event-mode="${event.mode}"
      data-event-completed="${event.completed}"
    >
      <div class="section-heading">
        <div>
          <p class="eyebrow">
            ${escapeHtml(modeName)}
          </p>
          <h2>${event.mode === "pico-park-attempts" ? "World" : event.mode === "time-trial" ? "Course" : "Round"} ${Number(event.roundNumber || 1)}</h2>
          <p class="muted">
            ${
              event.completed
                ? "Results completed"
                : "Enter results for every team"
            }
          </p>
        </div>
        <div class="button-row">
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
          ${
            event.completed
              ? `
                <button
                  class="secondary reopen-game-event"
                  type="button"
                  data-event-id="${event.id}"
                >
                  Reopen Results
                </button>
              `
              : ""
          }
        </div>
      </div>

      ${
        event.mode === "time-trial"
          ? renderTimeTrialEntries(event)
          : event.mode === "runbow-offline"
            ? renderRunbowEntries(event)
            : event.mode === "pico-park-attempts" ? renderPicoAttemptsEntries(event) : renderGrandPrixEntries(event)
      }
    </section>
  `;
}

function renderEventGameManagement(game) {
  const events = getEventsByGameId(game.id);
  const plannedRounds = window.PHDSessionPlanner
    ? window.PHDSessionPlanner.getPlannedRoundCount(
        game,
        PHDTournament.state.tournament
      )
    : 1;
  const allCreated = events.length >= plannedRounds;

  return `
    <section class="card wide">
      <div class="section-heading">
        <div>
          <p class="eyebrow">${escapeHtml(getGameModeLabel(game))}</p>
          <h2>Weekly Round Plan</h2>
          <p class="muted">
            ${plannedRounds} round${plannedRounds === 1 ? "" : "s"}
            × ${window.PHDSessionPlanner.getRoundDuration(game)} minutes
            = ${plannedRounds * window.PHDSessionPlanner.getRoundDuration(game)} of
            ${window.PHDSessionPlanner.getWeeklyAllowance(PHDTournament.state.tournament)} available minutes.
          </p>
        </div>
        ${events.length ? "" : `
          <button class="create-game-event" type="button"
            data-game-id="${game.id}" ${allCreated ? "disabled" : ""}>
            Create ${plannedRounds} Round${plannedRounds === 1 ? "" : "s"}
          </button>
        `}
      </div>
    </section>
    ${events.length
      ? events.map(event => renderEventWorkspace(game, event)).join("")
      : `<section class="card wide"><div class="empty-state">
          Create the weekly rounds to begin entering results.
        </div></section>`}
    ${events.length && game.mode === "runbow-offline" ? renderRunbowAggregateStandings(game) : ""}
    ${events.length && game.mode === "pico-park-attempts" ? renderPicoAttemptsAggregate(game) : ""}
    ${events.length && (game.mode || "swiss") === "time-trial"
      ? renderTimeTrialAggregateStandings(game, events)
      : ""}
  `;
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

async function createEvent(gameId) {
  if (
    typeof requireAdminForAction ===
      "function" &&
    !requireAdminForAction()
  ) {
    return;
  }

  if (!gameId) {
    alert(
      "The game could not be identified."
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
    mode !== "grand-prix" &&
    mode !== "runbow-offline" &&
    mode !== "pico-park-attempts"
  ) {
    alert(
      "Only Time Trial, Grand Prix, Runbow offline and Pico Park Attempts games can create events."
    );

    return;
  }

  const existingEvents = getEventsByGameId(gameId);
  const plannedRounds = window.PHDSessionPlanner
    ? window.PHDSessionPlanner.getPlannedRoundCount(
        game,
        PHDTournament.state.tournament
      )
    : 1;

  if (existingEvents.length >= plannedRounds) {
    alert(
      "All weekly rounds have already been created for this game."
    );

    return;
  }

  const eligibleTeams =
    window.PHDGameCapacity
      ? window.PHDGameCapacity
          .getEligibleTeams(
            game,
            PHDTournament.state.teams || []
          )
      : [...(PHDTournament.state.teams || [])];

  if (eligibleTeams.length === 0) {
    alert(
      "Enter at least one participating office before creating this event."
    );

    return;
  }

  const now = new Date().toISOString();
  const createdEvents = Array.from(
    { length: plannedRounds - existingEvents.length },
    (_, index) => ({
      id: crypto.randomUUID(),
      gameId,
      mode,
      roundNumber: existingEvents.length + index + 1,
      completed: false,
      createdAt: now,
      updatedAt: now,
      results: []
    })
  );

  PHDTournament.state.events.push(...createdEvents);

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "event.created",
        `Created ${createdEvents.length} ${getGameModeLabel(
          game
        )} round${createdEvents.length === 1 ? "" : "s"} for ${game.name}.`,
        {
          events: createdEvents.map(getEventAuditDetails)
        }
      );
    }
  } catch (error) {
    PHDTournament.state.events =
      PHDTournament.state.events.filter(
        existingEvent =>
          !createdEvents.some(event => event.id === existingEvent.id)
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

function getEventById(eventId) {
  return (
    PHDTournament.state.events.find(
      event => event.id === eventId
    ) || null
  );
}

async function persistEventResults(
  event,
  results,
  summary,
  completed = true,
  metadata = {}
) {
  const previousEvent =
    structuredClone(event);

  Object.assign(event, metadata);
  event.results = results;
  event.completed =
    Boolean(completed);
  event.updatedAt =
    new Date().toISOString();
  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "event.results.completed",
        summary,
        {
          event:
            getEventAuditDetails(
              event
            )
        }
      );
    }
  } catch (error) {
    Object.keys(event).forEach(key => { if (!(key in previousEvent)) delete event[key]; });
    Object.assign(
      event,
      previousEvent
    );
    render();
    console.error(
      "Event results could not be saved.",
      error
    );
    alert(
      error && error.message
        ? error.message
        : "Event results could not be saved."
    );
  }
}

function mergeEventResult(
  event,
  result
) {
  return [
    ...(event.results || []).filter(
      existing =>
        existing.teamId !==
        result.teamId
    ),
    result
  ];
}

function hasCompleteTimeTrialResults(
  results,
  event
) {
  const teamIds =
    getVisibleEventTeams({
      ...event,
      completed: true
    }).map(
      team => team.id
    );
  const resultMap = new Map(
    results.map(result => [
      result.teamId,
      Number(
        result.timeMilliseconds
      )
    ])
  );

  return teamIds.length > 0 &&
    teamIds.every(teamId =>
      Number.isFinite(
        resultMap.get(teamId)
      )
    );
}

function hasCompleteGrandPrixResults(
  results,
  event
) {
  const participants = getGrandPrixParticipants(event, true);
  if (!participants.length) {
    const teamIds = getVisibleEventTeams({
      ...event,
      completed: true
    }).map(team => team.id);
    const positions = teamIds.map(teamId => {
      const result = results.find(item => item.teamId === teamId);
      return Number(result && result.finishPosition);
    });
    return teamIds.length > 0 &&
      positions.every(position =>
        Number.isInteger(position) &&
        position >= 1 &&
        position <= teamIds.length
      ) &&
      new Set(positions).size === teamIds.length;
  }
  const positionsByLobby = new Map();

  for (const participant of participants) {
    const result = results.find(item =>
      (item.participantId || item.teamId) === participant.participantId
    );
    const position = Number(result && result.finishPosition);
    if (
      !Number.isInteger(position) ||
      position < 1 ||
      position > participant.lobbySize
    ) {
      return false;
    }
    if (!positionsByLobby.has(participant.lobbyId)) {
      positionsByLobby.set(participant.lobbyId, new Set());
    }
    const used = positionsByLobby.get(participant.lobbyId);
    if (used.has(position)) return false;
    used.add(position);
  }
  return true;
}

async function saveTimeTrialResults(
  eventId
) {
  const event =
    getEventById(eventId);
  const workspace =
    document.querySelector(
      `[data-event-workspace="${eventId}"]`
    );

  if (!event || !workspace) {
    return;
  }

  const rows = [
    ...workspace.querySelectorAll(
      "tr[data-team-id]"
    )
  ];
  const results = [];

  for (const row of rows) {
    const minutes = Number(
      row.querySelector(
        ".time-minutes"
      ).value
    );
    const seconds = Number(
      row.querySelector(
        ".time-seconds"
      ).value
    );
    if (
      !Number.isInteger(minutes) ||
      minutes < 0 ||
      !Number.isInteger(seconds) ||
      seconds < 0 ||
      seconds > 59
    ) {
      alert(
        "Enter a valid time for every team."
      );
      return;
    }

    results.push({
      teamId: row.dataset.teamId,
      timeMilliseconds:
        minutes * 60000 +
        seconds * 1000
    });
  }

  const isScopedStaff =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff();
  const nextResults =
    isScopedStaff
      ? mergeEventResult(
          event,
          results[0]
        )
      : results;
  const complete =
    hasCompleteTimeTrialResults(
      nextResults,
      event
    );

  await persistEventResults(
    event,
    nextResults,
    complete
      ? "Completed Time Trial results."
      : "Saved a Time Trial result.",
    complete
  );
}

async function saveGrandPrixResults(
  eventId
) {
  const event =
    getEventById(eventId);
  const workspace =
    document.querySelector(
      `[data-event-workspace="${eventId}"]`
    );

  if (!event || !workspace) {
    return;
  }

  const rows = [
    ...workspace.querySelectorAll(
      "tr[data-team-id]"
    )
  ];
  const results = rows.map(row => ({
    participantId: row.dataset.participantId || row.dataset.teamId,
    teamId: row.dataset.teamId,
    playerIndex: Number(row.dataset.playerIndex || 0),
    playerLabel: row.dataset.playerLabel || "Player A",
    lobbyId: row.dataset.lobbyId || "lobby-1",
    lobbySize: Number(row.dataset.lobbySize || 1),
    finishPosition: Number(
      row.querySelector(
        ".finish-position"
      ).value
    )
  }));
  const isScopedStaff =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff();
  const nextResults =
    isScopedStaff
      ? [
          ...(event.results || []).filter(
            existing =>
              existing.teamId !== getAssignedStaffTeamId()
          ),
          ...results
        ]
      : results;
  const participantById = new Map(
    getGrandPrixParticipants(event, true).map(item => [
      item.participantId,
      item
    ])
  );
  const usedPositions = new Set();
  const validPositions = nextResults.every(result => {
    const participantId = result.participantId || result.teamId;
    const participant = participantById.get(participantId);
    const key = participant
      ? `${participant.lobbyId}:${result.finishPosition}`
      : "invalid";
    if (
      !participant ||
      !Number.isInteger(result.finishPosition) ||
      result.finishPosition < 1 ||
      result.finishPosition > participant.lobbySize ||
      usedPositions.has(key)
    ) {
      return false;
    }
    usedPositions.add(key);
    return true;
  });

  if (!validPositions) {
    alert(
      "Assign every player a valid finishing position that is unique within their lobby."
    );
    return;
  }

  await persistEventResults(
    event,
    nextResults,
    hasCompleteGrandPrixResults(
      nextResults,
      event
    )
      ? "Completed Grand Prix results."
      : "Saved a Grand Prix result.",
    hasCompleteGrandPrixResults(
      nextResults,
      event
    )
  );
}

async function reopenEvent(eventId) {
  const event =
    getEventById(eventId);

  if (!event) {
    return;
  }

  event.completed = false;
  event.updatedAt =
    new Date().toISOString();
  render();

  try {
    await saveState();
  } catch (error) {
    event.completed = true;
    render();
    alert(
      error && error.message
        ? error.message
        : "The event could not be reopened."
    );
  }
}

function getDraftRowRankValue(
  row,
  mode
) {
  if (mode === "grand-prix") {
    const input =
      row.querySelector(
        ".finish-position"
      );
    const value =
      Number(input && input.value);

    return Number.isInteger(value) &&
      value > 0
      ? value
      : Number.POSITIVE_INFINITY;
  }

  const minuteInput =
    row.querySelector(
      ".time-minutes"
    );
  const secondInput =
    row.querySelector(
      ".time-seconds"
    );
  if (
    !minuteInput ||
    !secondInput ||
    minuteInput.value === "" ||
    secondInput.value === ""
  ) {
    return Number.POSITIVE_INFINITY;
  }

  return Number(minuteInput.value) *
      60000 +
    Number(secondInput.value) * 1000;
}

function animateEventRanking(
  workspace
) {
  if (
    !workspace ||
    !canRevealDraftEventRankings() ||
    workspace.dataset
      .eventCompleted === "true"
  ) {
    return;
  }

  const body =
    workspace.querySelector("tbody");
  const mode =
    workspace.dataset.eventMode;

  if (!body) return;

  const rows = [
    ...body.querySelectorAll(
      "tr[data-team-id]"
    )
  ];
  const playerGrandPrix =
    mode === "grand-prix" &&
    rows.some(row =>
      row.dataset.participantId
    );
  const rowKey = row =>
    row.dataset.participantId ||
    row.dataset.teamId;
  const before = new Map(
    rows.map(row => [
      rowKey(row),
      row.getBoundingClientRect()
    ])
  );
  const sorted = [...rows].sort(
    (rowA, rowB) => {
      if (playerGrandPrix) {
        const lobbyDifference =
          String(rowA.dataset.lobbyId)
            .localeCompare(
              String(rowB.dataset.lobbyId),
              undefined,
              { numeric: true }
            );
        if (lobbyDifference) {
          return lobbyDifference;
        }
      }
      return getDraftRowRankValue(rowA, mode) -
          getDraftRowRankValue(rowB, mode) ||
        rowKey(rowA).localeCompare(rowKey(rowB));
    }
  );

  sorted.forEach(row =>
    body.appendChild(row)
  );

  const participantCount = new Set(
    rows.map(row => row.dataset.teamId)
  ).size;
  const officeRanks = new Map();
  if (playerGrandPrix) {
    const officeScores = new Map();
    rows.forEach(row => {
      const finishPosition = getDraftRowRankValue(row, mode);
      if (!Number.isFinite(finishPosition)) return;
      const current = officeScores.get(row.dataset.teamId) || {
        score: 0,
        bestFinish: Number.MAX_SAFE_INTEGER
      };
      current.score +=
        Number(row.dataset.lobbySize) -
        finishPosition +
        1;
      current.bestFinish = Math.min(
        current.bestFinish,
        finishPosition
      );
      officeScores.set(row.dataset.teamId, current);
    });
    [...officeScores.entries()]
      .sort((entryA, entryB) =>
        entryB[1].score - entryA[1].score ||
        entryA[1].bestFinish - entryB[1].bestFinish ||
        entryA[0].localeCompare(entryB[0])
      )
      .forEach(([teamId], index) =>
        officeRanks.set(teamId, index + 1)
      );
  }

  sorted.forEach((row, index) => {
    const value =
      getDraftRowRankValue(
        row,
        mode
      );
    const provisionalPosition =
      Number.isFinite(value)
        ? playerGrandPrix
          ? officeRanks.get(
              row.dataset.teamId
            ) || null
          : mode === "grand-prix"
          ? value
          : index + 1
        : null;
    const rankCell =
      row.querySelector(
        ".rank-cell"
      );
    const pointsCell =
      row.querySelector(
        ".event-tournament-points"
      );
    const lobbyPointsCell =
      row.querySelector(
        ".grand-prix-lobby-points"
      );

    if (rankCell) {
      rankCell.textContent =
        provisionalPosition || "—";
    }
    if (pointsCell) {
      pointsCell.textContent =
        provisionalPosition
          ? Math.max(
              1,
              participantCount -
                provisionalPosition +
                1
            )
          : "—";
    }
    if (lobbyPointsCell) {
      lobbyPointsCell.textContent =
        Number.isFinite(value)
          ? Number(row.dataset.lobbySize) -
            value +
            1
          : "—";
    }

    const previous =
      before.get(rowKey(row));
    const current =
      row.getBoundingClientRect();
    const deltaY =
      previous
        ? previous.top - current.top
        : 0;

    if (deltaY) {
      row.animate(
        [
          {
            transform:
              `translateY(${deltaY}px)`
          },
          { transform: "translateY(0)" }
        ],
        {
          duration: 420,
          easing:
            "cubic-bezier(.2,.8,.2,1)"
        }
      );
    }
  });
}

function initialiseEventControls() {
  document.addEventListener(
    "change",
    event => {
      if (
        !event.target.matches(
          ".finish-position, .time-minutes, .time-seconds"
        )
      ) {
        return;
      }

      animateEventRanking(
        event.target.closest(
          "[data-event-workspace]"
        )
      );
    }
  );

  document.addEventListener(
    "click",
    event => {
      const target = event.target;
      const isEventAction =
        target.classList.contains(
          "create-game-event"
        ) ||
        target.classList.contains(
          "save-time-trial-results"
        ) ||
        target.classList.contains(
          "save-grand-prix-results"
        ) ||
        target.classList.contains("save-runbow-results") ||
        target.classList.contains("save-pico-attempts-results") ||
        target.classList.contains(
          "save-grand-prix-lobby-code"
        ) ||
        target.classList.contains(
          "reopen-game-event"
        );

      if (!isEventAction) {
        return;
      }

      if (
        typeof requireAdminForAction ===
          "function" &&
        !requireAdminForAction()
      ) {
        return;
      }

      if (
        target.classList.contains(
          "create-game-event"
        )
      ) {
        createEvent(
          target.dataset.gameId
        );
      } else if (target.classList.contains("save-pico-attempts-results")) {
        savePicoAttemptsResults(target.dataset.eventId);
      } else if (target.classList.contains("save-runbow-results")) {
        saveRunbowResults(target.dataset.eventId);
      } else if (
        target.classList.contains("save-grand-prix-lobby-code")
      ) {
        saveGrandPrixLobbyCode(
          target.dataset.eventId,
          target.dataset.lobbyId
        );
      } else if (
        target.classList.contains(
          "save-time-trial-results"
        )
      ) {
        saveTimeTrialResults(
          target.dataset.eventId
        );
      } else if (
        target.classList.contains(
          "save-grand-prix-results"
        )
      ) {
        saveGrandPrixResults(
          target.dataset.eventId
        );
      } else if (
        target.classList.contains(
          "reopen-game-event"
        )
      ) {
        reopenEvent(
          target.dataset.eventId
        );
      }
    }
  );
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseEventControls
);

PHDTournament.modules.push("events");
