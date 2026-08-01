(function initialiseFourPlayerSwiss(global) {
  "use strict";

  const ROUND_POINTS = Object.freeze([4, 3, 2, 1]);

  function getTournament(game) {
    const source =
      game && game.fourPlayerSwiss &&
      typeof game.fourPlayerSwiss === "object"
        ? game.fourPlayerSwiss
        : {};
    return {
      closed: Boolean(source.closed),
      closedAt: source.closedAt || "",
      entrantIds:
        Array.isArray(source.entrantIds)
          ? source.entrantIds
          : [],
      rounds: Array.isArray(source.rounds) ? source.rounds : [],
      finalStandings: Array.isArray(source.finalStandings)
        ? source.finalStandings
        : []
    };
  }

  function validateTeams(teams) {
    if (!Array.isArray(teams) || teams.length < 4) {
      throw new Error("4 Player Swiss Rounds requires at least four competitors.");
    }
    if (teams.length % 4 !== 0) {
      throw new Error(
        "4 Player Swiss Rounds requires the competitor count to be a multiple of four."
      );
    }
    const ids = teams.map(team => team && team.id);
    if (ids.some(id => !id) || new Set(ids).size !== ids.length) {
      throw new Error("Every competitor must have a unique identifier.");
    }
  }

  function validatePlacementGroup(group) {
    const competitors =
      group && Array.isArray(group.competitors)
        ? group.competitors
        : [];
    const placements = competitors.map(item => Number(item.placement));
    return competitors.length === 4 &&
      placements.every(value =>
        Number.isInteger(value) && value >= 1 && value <= 4
      ) &&
      new Set(placements).size === 4;
  }

  function createStanding(team) {
    return {
      id: team.id,
      teamId: team.id,
      name: team.name || "",
      teamName: team.name || "",
      points: 0,
      firsts: 0,
      seconds: 0,
      thirds: 0,
      fourths: 0,
      played: 0,
      opponentScore: 0,
      opponents: []
    };
  }

  function compareStandings(a, b) {
    return (
      b.points - a.points ||
      b.firsts - a.firsts ||
      b.seconds - a.seconds ||
      b.thirds - a.thirds ||
      b.opponentScore - a.opponentScore ||
      a.name.localeCompare(b.name)
    );
  }

  function calculateStandings(teams, rounds = []) {
    const standings = new Map(
      (teams || []).map(team => [team.id, createStanding(team)])
    );

    (rounds || []).forEach(round => {
      (round.groups || [])
        .filter(group => group.completed && validatePlacementGroup(group))
        .forEach(group => {
          const groupIds = group.competitors.map(item => item.teamId);
          group.competitors.forEach(competitor => {
            const standing = standings.get(competitor.teamId);
            const placement = Number(competitor.placement);
            if (!standing) return;
            standing.played += 1;
            standing.points += ROUND_POINTS[placement - 1];
            standing.opponents.push(
              ...groupIds.filter(teamId => teamId !== competitor.teamId)
            );
            if (placement === 1) standing.firsts += 1;
            if (placement === 2) standing.seconds += 1;
            if (placement === 3) standing.thirds += 1;
            if (placement === 4) standing.fourths += 1;
          });
        });
    });

    standings.forEach(standing => {
      standing.opponentScore = standing.opponents.reduce(
        (total, opponentId) =>
          total + (standings.get(opponentId) || { points: 0 }).points,
        0
      );
    });

    return [...standings.values()]
      .sort(compareStandings)
      .map((standing, index) => ({
        ...standing,
        position: index + 1,
        rankValue: standing.points,
        custom: {
          firsts: standing.firsts,
          seconds: standing.seconds,
          thirds: standing.thirds,
          fourths: standing.fourths,
          opponentScore: standing.opponentScore
        }
      }));
  }

  function createRound({
    teams,
    rounds = [],
    gameId = "",
    createId,
    now
  } = {}) {
    validateTeams(teams);
    if (typeof createId !== "function" || typeof now !== "function") {
      throw new Error(
        "4 Player Swiss round generation requires ID and time providers."
      );
    }
    const latestRound = rounds.at(-1);
    if (latestRound && !latestRound.completed) {
      throw new Error(
        "Complete the current 4 Player Swiss round before generating another."
      );
    }

    const orderedTeams = rounds.length
      ? calculateStandings(teams, rounds).map(standing =>
          teams.find(team => team.id === standing.teamId)
        )
      : [...teams].sort((a, b) =>
          String(a.name || "").localeCompare(String(b.name || ""))
        );
    const groups = [];

    for (let index = 0; index < orderedTeams.length; index += 4) {
      groups.push({
        id: createId(),
        number: groups.length + 1,
        completed: false,
        updatedAt: null,
        competitors: orderedTeams.slice(index, index + 4).map(team => ({
          teamId: team.id,
          placement: null
        }))
      });
    }

    return {
      id: createId(),
      number: rounds.length + 1,
      gameId,
      completed: false,
      createdAt: now(),
      groups
    };
  }

  global.PHDFourPlayerSwiss = Object.freeze({
    ROUND_POINTS,
    getTournament,
    validateTeams,
    validatePlacementGroup,
    calculateStandings,
    createRound
  });
})(window);

function ensureFourPlayerSwissState(game) {
  if (!game.fourPlayerSwiss || typeof game.fourPlayerSwiss !== "object") {
    game.fourPlayerSwiss = {
      closed: false,
      closedAt: "",
      entrantIds: [],
      rounds: [],
      finalStandings: []
    };
  }
  if (!Array.isArray(game.fourPlayerSwiss.rounds)) {
    game.fourPlayerSwiss.rounds = [];
  }
  if (!Array.isArray(game.fourPlayerSwiss.entrantIds)) {
    game.fourPlayerSwiss.entrantIds = [];
  }
  if (!Array.isArray(game.fourPlayerSwiss.finalStandings)) {
    game.fourPlayerSwiss.finalStandings = [];
  }
  return game.fourPlayerSwiss;
}

function getFourPlayerSwissTeams(game) {
  const tournament =
    ensureFourPlayerSwissState(game);

  if (!tournament.entrantIds.length) {
    return window.PHDGameCapacity
      ? window.PHDGameCapacity
          .getEligibleTeams(
            game,
            PHDTournament.state.teams
          )
      : PHDTournament.state.teams;
  }

  return tournament.entrantIds
    .map(teamId =>
      getTeamById(teamId)
    )
    .filter(Boolean);
}

function getFourPlayerSwissGroup(game, roundId, groupId) {
  const tournament = ensureFourPlayerSwissState(game);
  const round = tournament.rounds.find(item => item.id === roundId);
  const group = round && round.groups.find(item => item.id === groupId);
  return { tournament, round: round || null, group: group || null };
}

function renderFourPlayerSwissStandings(standings, closed) {
  if (!standings.length) {
    return '<div class="empty-state">Generate and complete a round to populate the Swiss rankings.</div>';
  }
  return `
    <div class="table-wrap">
      <table class="four-player-standings">
        <thead><tr>
          <th>Rank</th><th>Competitor</th><th>Swiss Points</th>
          <th>1st</th><th>2nd</th><th>3rd</th><th>4th</th>
          <th>Opponent Score</th>
          ${closed ? "<th>Tournament Points</th>" : ""}
        </tr></thead>
        <tbody>
          ${standings.map(standing => `
            <tr class="animated-ranking-row" data-team-id="${standing.teamId}">
              <td class="rank-cell">${standing.position}</td>
              <td><strong>${escapeHtml(standing.teamName || standing.name)}</strong></td>
              <td>${standing.points}</td>
              <td>${standing.firsts}</td><td>${standing.seconds}</td>
              <td>${standing.thirds}</td><td>${standing.fourths}</td>
              <td>${standing.opponentScore}</td>
              ${closed ? `<td><strong>${standing.championshipPoints}</strong></td>` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function placementSuffix(placement) {
  if (placement === 1) return "st";
  if (placement === 2) return "nd";
  if (placement === 3) return "rd";
  return "th";
}

function renderFourPlayerSwissGroup(round, group, tournamentClosed) {
  const locked = group.completed || tournamentClosed;
  const scopedTeamId =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff() &&
    !tournamentClosed
      ? getAssignedStaffTeamId()
      : "";
  const visibleCompetitors =
    scopedTeamId
      ? group.competitors.filter(
          competitor =>
            competitor.teamId ===
            scopedTeamId
        )
      : group.competitors;

  if (
    scopedTeamId &&
    visibleCompetitors.length === 0
  ) {
    return "";
  }

  return `
    <article class="four-player-group ${group.completed ? "completed" : ""}"
      data-four-player-group data-round-id="${round.id}" data-group-id="${group.id}">
      <div class="section-heading">
        <div>
          <h4>Group ${group.number}</h4>
          <span class="status-pill ${group.completed ? "completed" : "open"}">
            ${group.completed ? "Placements Saved" : "Awaiting Placements"}
          </span>
        </div>
        ${group.completed && !tournamentClosed ? `
          <button class="small-button secondary reopen-four-player-group"
            type="button" data-round-id="${round.id}" data-group-id="${group.id}">
            Edit Placements
          </button>` : ""}
      </div>
      <div class="four-player-competitors">
        ${visibleCompetitors.map(competitor => {
          const team = getTeamById(competitor.teamId);
          return `
            <label class="four-player-competitor">
              <span class="team-cell">${renderMatchTeam(team)}</span>
              <span>Placement
                <select class="four-player-placement"
                  data-team-id="${competitor.teamId}" ${locked ? "disabled" : ""}>
                  <option value="">Select</option>
                  ${[1, 2, 3, 4].map(placement => `
                    <option value="${placement}"
                      ${Number(competitor.placement) === placement ? "selected" : ""}>
                      ${placement}${placementSuffix(placement)}
                    </option>`).join("")}
                </select>
              </span>
            </label>`;
        }).join("")}
      </div>
      ${!locked ? `
        <button class="save-four-player-group" type="button"
          data-round-id="${round.id}" data-group-id="${group.id}">
          Save Group Placements
        </button>` : ""}
    </article>
  `;
}

function renderFourPlayerSwissManagement(game) {
  const tournament = window.PHDFourPlayerSwiss.getTournament(game);
  const entrantTeams =
    getFourPlayerSwissTeams(game);
  const calculated = window.PHDFourPlayerSwiss.calculateStandings(
    entrantTeams,
    tournament.rounds
  );
  const standings = tournament.closed && tournament.finalStandings.length
    ? window.PHDGameModes.awardChampionshipPoints(
        tournament.finalStandings
      )
    : calculated;
  const scopedTeamId =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff() &&
    !tournament.closed
      ? getAssignedStaffTeamId()
      : "";
  const visibleStandings =
    scopedTeamId
      ? standings.filter(
          standing =>
            standing.teamId ===
            scopedTeamId
        )
      : standings;
  const latestRound = tournament.rounds.at(-1);
  const canGenerate =
    !tournament.closed && (!latestRound || latestRound.completed);
  const canClose =
    !tournament.closed &&
    tournament.rounds.length > 0 &&
    tournament.rounds.every(round => round.completed);
  const validTeamCount =
    entrantTeams.length >= 4 &&
    entrantTeams.length % 4 === 0;

  return `
    <section class="card wide four-player-swiss-workspace"
      data-four-player-game-id="${game.id}">
      <div class="section-heading">
        <div>
          <p class="eyebrow">4 Player Swiss Rounds</p>
          <h2>Tournament Management</h2>
          <p class="muted">
            Round points: 1st = 4, 2nd = 3, 3rd = 2, 4th = 1.
            Placement record and opponent score break ties.
          </p>
        </div>
        <div class="button-row">
          <span class="status-pill ${tournament.closed ? "completed" : "open"}">
            ${tournament.closed ? "Tournament Closed" : "Tournament Open"}
          </span>
          ${tournament.closed ? `
            <button class="secondary reopen-four-player-tournament"
              type="button" data-game-id="${game.id}">Reopen Tournament</button>
          ` : `
            <button class="generate-four-player-round" type="button"
              data-game-id="${game.id}"
              ${canGenerate && validTeamCount ? "" : "disabled"}>
              Generate Next Round
            </button>
            <button class="danger close-four-player-tournament" type="button"
              data-game-id="${game.id}" ${canClose ? "" : "disabled"}>
              Close Tournament
            </button>
          `}
        </div>
      </div>
      ${validTeamCount ? "" : `
        <div class="empty-state">
          Add at least four competitors and use a total divisible by four
          before generating a round.
        </div>`}
      <section class="four-player-ranking">
        <h3>${tournament.closed ? "Final Ranking" : "Current Swiss Ranking"}</h3>
        ${renderFourPlayerSwissStandings(visibleStandings, tournament.closed)}
      </section>
      <section class="four-player-rounds">
        <h3>Rounds</h3>
        ${tournament.rounds.length ? tournament.rounds.map(round => `
          <article class="round-card ${round.completed ? "completed" : ""}">
            <div class="round-heading">
              <h3>Round ${round.number}</h3>
              <span class="status-pill ${round.completed ? "completed" : "open"}">
                ${round.completed ? "Completed" : "In Progress"}
              </span>
            </div>
            <div class="four-player-group-list">
              ${round.groups.map(group =>
                renderFourPlayerSwissGroup(round, group, tournament.closed)
              ).join("")}
            </div>
          </article>`).join("") :
          '<div class="empty-state">Generate the first round to create groups of four.</div>'}
      </section>
    </section>
  `;
}

async function generateFourPlayerSwissRound(gameId) {
  const game = getGameById(gameId);
  if (!game) return;
  const tournament = ensureFourPlayerSwissState(game);
  if (tournament.closed) {
    alert("Reopen the tournament before generating another round.");
    return;
  }
  try {
    const entrantTeams =
      getFourPlayerSwissTeams(game);
    const incompatibleEntry =
      window.PHDGameCapacity &&
      window.PHDGameCapacity
        .getActiveEntries(
          game,
          PHDTournament.state.teams
        )
        .find(entry =>
          entry.competitorCount !== 1
        );
    if (incompatibleEntry) {
      throw new Error(
        "4 Player Swiss currently requires exactly one competitor per participating team."
      );
    }
    if (
      game.capacity &&
      Number(game.capacity.maxPlayersPerLobby) < 4
    ) {
      throw new Error(
        "4 Player Swiss requires a lobby capacity of at least four competitors."
      );
    }
    const round = window.PHDFourPlayerSwiss.createRound({
      teams: entrantTeams,
      rounds: tournament.rounds,
      gameId,
      createId: () => crypto.randomUUID(),
      now: () => new Date().toISOString()
    });
    if (!tournament.entrantIds.length) {
      tournament.entrantIds =
        entrantTeams.map(
          team => team.id
        );
    }
    tournament.rounds.push(round);
    await saveState();
    render();
    if (typeof recordAuditEntry === "function") {
      await recordAuditEntry(
        "four-player-swiss.round.created",
        `Generated ${game.name} Round ${round.number} with ${round.groups.length} groups.`,
        { gameId, roundId: round.id, roundNumber: round.number, groupCount: round.groups.length }
      );
    }
  } catch (error) {
    alert(error && error.message ? error.message : "The round could not be generated.");
  }
}

async function saveFourPlayerSwissGroup(gameId, roundId, groupId, groupElement) {
  const game = getGameById(gameId);
  if (!game || !groupElement) return;
  const result = getFourPlayerSwissGroup(game, roundId, groupId);
  if (!result.round || !result.group || result.tournament.closed) return;

  const placements = [...groupElement.querySelectorAll(".four-player-placement")]
    .map(select => ({ teamId: select.dataset.teamId, placement: Number(select.value) }));
  const scopedStaff =
    typeof isTeamScopedStaff ===
      "function" &&
    isTeamScopedStaff();

  if (scopedStaff) {
    const assignedTeamId =
      getAssignedStaffTeamId();
    const submitted =
      placements.find(
        item =>
          item.teamId ===
          assignedTeamId
      );

    if (
      !submitted ||
      !Number.isInteger(
        submitted.placement
      ) ||
      submitted.placement < 1 ||
      submitted.placement > 4
    ) {
      alert("Select your team placement.");
      return;
    }

    result.group.competitors =
      result.group.competitors.map(
        competitor =>
          competitor.teamId ===
            assignedTeamId
            ? {
                ...competitor,
                placement:
                  submitted.placement
              }
            : competitor
      );
    const savedPlacements =
      result.group.competitors.map(
        competitor =>
          Number(
            competitor.placement
          )
      );
    result.group.completed =
      savedPlacements.every(
        placement =>
          Number.isInteger(
            placement
          ) &&
          placement >= 1 &&
          placement <= 4
      ) &&
      new Set(savedPlacements).size === 4;
    result.group.updatedAt =
      new Date().toISOString();
    result.round.completed =
      result.round.groups.every(
        group => group.completed
      );
    await saveState();
    render();
    return;
  }

  if (
    placements.length !== 4 ||
    placements.some(item =>
      !Number.isInteger(item.placement) || item.placement < 1 || item.placement > 4
    ) ||
    new Set(placements.map(item => item.placement)).size !== 4
  ) {
    alert("Assign each placement from 1st to 4th exactly once.");
    return;
  }

  result.group.competitors = result.group.competitors.map(competitor => ({
    ...competitor,
    placement: placements.find(item => item.teamId === competitor.teamId).placement
  }));
  result.group.completed = true;
  result.group.updatedAt = new Date().toISOString();
  result.round.completed = result.round.groups.every(group => group.completed);
  await saveState();
  render();
  if (typeof recordAuditEntry === "function") {
    await recordAuditEntry(
      "four-player-swiss.group.completed",
      `Saved ${game.name} Round ${result.round.number}, Group ${result.group.number} placements.`,
      { gameId, roundId, groupId, placements }
    );
  }
}

async function reopenFourPlayerSwissGroup(gameId, roundId, groupId) {
  const game = getGameById(gameId);
  if (!game) return;
  const result = getFourPlayerSwissGroup(game, roundId, groupId);
  if (!result.round || !result.group || result.tournament.closed) return;
  result.group.completed = false;
  result.round.completed = false;
  await saveState();
  render();
}

async function closeFourPlayerSwissTournament(gameId) {
  const game = getGameById(gameId);
  if (!game) return;
  const tournament = ensureFourPlayerSwissState(game);
  if (
    tournament.rounds.length === 0 ||
    tournament.rounds.some(round => !round.completed)
  ) {
    alert("Complete every generated round before closing the tournament.");
    return;
  }
  if (!confirm("Close this tournament and assign final tournament points?")) return;

  const rankings = window.PHDFourPlayerSwiss.calculateStandings(
    getFourPlayerSwissTeams(game),
    tournament.rounds
  );
  tournament.finalStandings = window.PHDGameModes.awardChampionshipPoints(
    rankings,
    PHDTournament.state.championship.pointsByPosition || []
  );
  tournament.closed = true;
  tournament.closedAt = new Date().toISOString();
  await saveState();
  render();
  if (typeof recordAuditEntry === "function") {
    await recordAuditEntry(
      "four-player-swiss.tournament.closed",
      `Closed ${game.name} and assigned final tournament points.`,
      { gameId, finalStandings: tournament.finalStandings }
    );
  }
}

async function reopenFourPlayerSwissTournament(gameId) {
  const game = getGameById(gameId);
  if (!game) return;
  if (!confirm(
    "Reopen this tournament? Final tournament points will be cleared until it is closed again."
  )) return;
  const tournament = ensureFourPlayerSwissState(game);
  tournament.closed = false;
  tournament.closedAt = "";
  tournament.finalStandings = [];
  await saveState();
  render();
}

function initialiseFourPlayerSwissControls() {
  document.addEventListener("click", event => {
    const target = event.target;
    const actions = [
      "generate-four-player-round",
      "save-four-player-group",
      "reopen-four-player-group",
      "close-four-player-tournament",
      "reopen-four-player-tournament"
    ];
    if (!actions.some(className => target.classList.contains(className))) return;
    if (typeof requireAdminForAction === "function" && !requireAdminForAction()) return;

    const workspace = target.closest("[data-four-player-game-id]");
    const gameId =
      target.dataset.gameId ||
      (workspace && workspace.dataset.fourPlayerGameId);
    if (target.classList.contains("generate-four-player-round")) {
      generateFourPlayerSwissRound(gameId);
    } else if (target.classList.contains("save-four-player-group")) {
      saveFourPlayerSwissGroup(
        gameId,
        target.dataset.roundId,
        target.dataset.groupId,
        target.closest("[data-four-player-group]")
      );
    } else if (target.classList.contains("reopen-four-player-group")) {
      reopenFourPlayerSwissGroup(gameId, target.dataset.roundId, target.dataset.groupId);
    } else if (target.classList.contains("close-four-player-tournament")) {
      closeFourPlayerSwissTournament(gameId);
    } else {
      reopenFourPlayerSwissTournament(gameId);
    }
  });
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseFourPlayerSwissControls
);

PHDTournament.modules.push("four-player-swiss");
