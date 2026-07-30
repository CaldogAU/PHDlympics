(function initialiseFallGuysGrandPrix(global) {
  "use strict";

  const MODE_ID = "fall-guys-grand-prix";
  const tournamentState =
    typeof PHDTournament !==
      "undefined"
      ? PHDTournament
      : global.PHDTournament;
  const DEFAULT_TARGET_HEATS = 10;
  const DEFAULT_COUNTED_RESULTS = 3;
  const OUTCOMES = Object.freeze([
    { key: "first", label: "1st", points: 10 },
    { key: "second", label: "2nd", points: 8 },
    { key: "third", label: "3rd", points: 6 },
    { key: "fourth", label: "4th", points: 5 },
    { key: "qualified", label: "Qualified", points: 3 },
    { key: "participated", label: "Participated", points: 1 }
  ]);

  function toNonNegativeInteger(value) {
    const number = Number(value);
    return Number.isInteger(number) && number >= 0
      ? number
      : 0;
  }

  function ensureTournament(game) {
    if (
      !game.fallGuysGrandPrix ||
      typeof game.fallGuysGrandPrix !== "object"
    ) {
      game.fallGuysGrandPrix = {
        targetHeats: DEFAULT_TARGET_HEATS,
        countedResults: DEFAULT_COUNTED_RESULTS,
        heats: [],
        closed: false,
        closedAt: "",
        finalStandings: []
      };
    }

    const tournament = game.fallGuysGrandPrix;
    tournament.targetHeats = Math.max(
      1,
      toNonNegativeInteger(
        tournament.targetHeats
      ) || DEFAULT_TARGET_HEATS
    );
    tournament.countedResults = Math.max(
      1,
      toNonNegativeInteger(
        tournament.countedResults
      ) || DEFAULT_COUNTED_RESULTS
    );
    tournament.heats = Array.isArray(
      tournament.heats
    )
      ? tournament.heats
      : [];
    tournament.finalStandings = Array.isArray(
      tournament.finalStandings
    )
      ? tournament.finalStandings
      : [];
    tournament.closed = Boolean(
      tournament.closed
    );

    return tournament;
  }

  function normaliseResult(result = {}) {
    return {
      teamId: String(result.teamId || ""),
      ...Object.fromEntries(
        OUTCOMES.map(outcome => [
          outcome.key,
          toNonNegativeInteger(
            result[outcome.key]
          )
        ])
      )
    };
  }

  function getResultScores(result, countedResults) {
    const scores = [];
    const normalised = normaliseResult(result);

    OUTCOMES.forEach(outcome => {
      for (
        let index = 0;
        index < normalised[outcome.key];
        index += 1
      ) {
        scores.push(outcome.points);
      }
    });

    return scores
      .sort((scoreA, scoreB) => scoreB - scoreA)
      .slice(0, countedResults);
  }

  function calculateHeatScore(
    result,
    countedResults = DEFAULT_COUNTED_RESULTS
  ) {
    return getResultScores(
      result,
      Math.max(
        1,
        toNonNegativeInteger(
          countedResults
        ) || DEFAULT_COUNTED_RESULTS
      )
    ).reduce(
      (total, score) => total + score,
      0
    );
  }

  function getEntryCount(result) {
    const normalised = normaliseResult(result);
    return OUTCOMES.reduce(
      (total, outcome) =>
        total + normalised[outcome.key],
      0
    );
  }

  function validateHeatResults(results, teamIds) {
    const entries = Array.isArray(results)
      ? results.map(normaliseResult)
      : [];
    const resultTeams = new Set(
      entries
        .filter(result => getEntryCount(result) > 0)
        .map(result => result.teamId)
    );

    if (
      teamIds.length === 0 ||
      !teamIds.every(teamId =>
        resultTeams.has(teamId)
      )
    ) {
      return {
        valid: false,
        message:
          "Enter at least one result for every office before completing the heat."
      };
    }

    const placementValidation =
      validateUniquePlacements(
        entries
      );

    if (!placementValidation.valid) {
      return placementValidation;
    }

    return {
      valid: true,
      message: ""
    };
  }

  function validateUniquePlacements(
    results
  ) {
    const entries = Array.isArray(results)
      ? results.map(normaliseResult)
      : [];

    for (const key of [
      "first",
      "second",
      "third",
      "fourth"
    ]) {
      const total = entries.reduce(
        (sum, result) =>
          sum + result[key],
        0
      );

      if (total > 1) {
        const label = OUTCOMES.find(
          outcome => outcome.key === key
        ).label;
        return {
          valid: false,
          message: `Only one player can be recorded as ${label} in a heat.`
        };
      }
    }

    return {
      valid: true,
      message: ""
    };
  }

  function calculateStandings(
    teams = [],
    tournament = {}
  ) {
    const countedResults = Math.max(
      1,
      toNonNegativeInteger(
        tournament.countedResults
      ) || DEFAULT_COUNTED_RESULTS
    );
    const standings = new Map(
      teams.map(team => [
        team.id,
        {
          teamId: team.id,
          teamName: team.name,
          points: 0,
          heatsCompleted: 0,
          wins: 0,
          podiums: 0,
          qualifications: 0,
          participants: 0,
          rankValue: 0,
          custom: {}
        }
      ])
    );

    (tournament.heats || [])
      .filter(heat => heat.completed)
      .forEach(heat => {
        (heat.results || []).forEach(rawResult => {
          const result =
            normaliseResult(rawResult);
          const standing =
            standings.get(result.teamId);
          if (!standing) return;

          standing.points +=
            calculateHeatScore(
              result,
              countedResults
            );
          standing.heatsCompleted += 1;
          standing.wins += result.first;
          standing.podiums +=
            result.first +
            result.second +
            result.third;
          standing.qualifications +=
            result.first +
            result.second +
            result.third +
            result.fourth +
            result.qualified;
          standing.participants +=
            getEntryCount(result);
        });
      });

    return [...standings.values()]
      .map(standing => ({
        ...standing,
        rankValue: standing.points,
        custom: {
          heatsCompleted:
            standing.heatsCompleted,
          wins: standing.wins,
          podiums: standing.podiums,
          qualifications:
            standing.qualifications,
          participants:
            standing.participants
        }
      }))
      .sort(
        (standingA, standingB) =>
          standingB.points -
            standingA.points ||
          standingB.wins -
            standingA.wins ||
          standingB.podiums -
            standingA.podiums ||
          standingB.qualifications -
            standingA.qualifications ||
          standingA.teamName.localeCompare(
            standingB.teamName
          )
      )
      .map(
        (
          standing,
          index,
          allStandings
        ) => {
          const previous =
            allStandings[index - 1];
          const tied =
            previous &&
            previous.points ===
              standing.points &&
            previous.wins ===
              standing.wins &&
            previous.podiums ===
              standing.podiums &&
            previous.qualifications ===
              standing.qualifications;

          return {
            ...standing,
            position: tied
              ? previous.position
              : index + 1
          };
        }
      );
  }

  function getVisibleTeams(tournament) {
    const teams = [
      ...(tournamentState.state.teams ||
        [])
    ];

    if (
      typeof global.isTeamScopedStaff ===
        "function" &&
      global.isTeamScopedStaff() &&
      !tournament.closed
    ) {
      const teamId =
        global.getAssignedStaffTeamId();
      return teams.filter(
        team => team.id === teamId
      );
    }

    return teams;
  }

  function getHeatResult(heat, teamId) {
    return (
      (heat.results || []).find(
        result => result.teamId === teamId
      ) || {
        teamId
      }
    );
  }

  function renderStandings(game, tournament) {
    const standings = calculateStandings(
      tournamentState.state.teams,
      tournament
    );

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Office</th>
              <th>Heat Points</th>
              <th>Heats</th>
              <th>Wins</th>
              <th>Podiums</th>
              ${
                tournament.closed
                  ? "<th>Tournament Points</th>"
                  : ""
              }
            </tr>
          </thead>
          <tbody>
            ${standings
              .map(standing => {
                const finalResult =
                  tournament.finalStandings.find(
                    result =>
                      result.teamId ===
                      standing.teamId
                  );
                return `
                  <tr class="animated-ranking-row">
                    <td>${standing.position}</td>
                    <td><strong>${global.escapeHtml(
                      standing.teamName
                    )}</strong></td>
                    <td>${standing.points}</td>
                    <td>${standing.heatsCompleted}</td>
                    <td>${standing.wins}</td>
                    <td>${standing.podiums}</td>
                    ${
                      tournament.closed
                        ? `<td>${Number(
                            finalResult &&
                              finalResult.championshipPoints
                          ) || 0}</td>`
                        : ""
                    }
                  </tr>
                `;
              })
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderHeat(
    game,
    tournament,
    heat
  ) {
    const teams =
      getVisibleTeams(tournament);

    return `
      <article
        class="round-card ${
          heat.completed
            ? "completed"
            : ""
        }"
        data-fall-guys-heat-id="${heat.id}"
      >
        <div class="round-header">
          <div>
            <h3>Heat ${heat.number}</h3>
            <span class="status-pill ${
              heat.completed
                ? "completed"
                : "open"
            }">
              ${
                heat.completed
                  ? "Completed"
                  : "Open"
              }
            </span>
          </div>
          ${
            heat.completed &&
            !tournament.closed
              ? `
                <button
                  class="secondary reopen-fall-guys-heat"
                  type="button"
                  data-game-id="${game.id}"
                  data-heat-id="${heat.id}"
                >
                  Reopen Heat
                </button>
              `
              : ""
          }
        </div>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Office</th>
                ${OUTCOMES.map(
                  outcome =>
                    `<th>${outcome.label}<br><small>${outcome.points} pts</small></th>`
                ).join("")}
                <th>Counted Score</th>
              </tr>
            </thead>
            <tbody>
              ${teams
                .map(team => {
                  const result =
                    normaliseResult(
                      getHeatResult(
                        heat,
                        team.id
                      )
                    );
                  return `
                    <tr data-team-id="${team.id}">
                      <td><strong>${global.escapeHtml(
                        team.name
                      )}</strong></td>
                      ${OUTCOMES.map(
                        outcome => `
                          <td>
                            <input
                              class="fall-guys-result-count"
                              type="number"
                              min="0"
                              step="1"
                              data-outcome="${outcome.key}"
                              value="${result[outcome.key]}"
                              ${
                                heat.completed ||
                                tournament.closed
                                  ? "disabled"
                                  : ""
                              }
                            />
                          </td>
                        `
                      ).join("")}
                      <td
                        class="fall-guys-heat-score"
                      >
                        ${calculateHeatScore(
                          result,
                          tournament.countedResults
                        )}
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>

        ${
          heat.completed ||
          tournament.closed
            ? ""
            : `
              <div class="button-row">
                <button
                  class="save-fall-guys-heat"
                  type="button"
                  data-game-id="${game.id}"
                  data-heat-id="${heat.id}"
                >
                  Save Heat Results
                </button>
              </div>
            `
        }
      </article>
    `;
  }

  function renderManagement(game) {
    const tournament =
      ensureTournament(game);
    const allHeatsComplete =
      tournament.heats.length ===
        tournament.targetHeats &&
      tournament.heats.every(
        heat => heat.completed
      );
    const canAddHeat =
      !tournament.closed &&
      tournament.heats.length <
        tournament.targetHeats &&
      (
        tournament.heats.length === 0 ||
        tournament.heats.at(-1)
          .completed
      );

    return `
      <section
        class="card wide fall-guys-workspace"
        data-fall-guys-game-id="${game.id}"
        data-fall-guys-closed="${tournament.closed}"
      >
        <div class="section-heading">
          <div>
            <p class="eyebrow">
              Fall Guys Grand Prix
            </p>
            <h2>Non-Elimination Office Grand Prix</h2>
            <p class="muted">
              Every office returns for every heat. Only its best
              ${tournament.countedResults} player results count per heat.
            </p>
          </div>
          <span class="status-pill ${
            tournament.closed
              ? "completed"
              : "open"
          }">
            ${
              tournament.closed
                ? "Closed"
                : "Open"
            }
          </span>
        </div>

        <div class="game-scoring-form">
          <label>
            Planned heats
            <input
              class="fall-guys-target-heats"
              type="number"
              min="1"
              max="30"
              value="${tournament.targetHeats}"
              ${tournament.closed ? "disabled" : ""}
            />
          </label>
          <label>
            Best results counted per office
            <input
              class="fall-guys-counted-results"
              type="number"
              min="1"
              max="10"
              value="${tournament.countedResults}"
              ${tournament.closed ? "disabled" : ""}
            />
          </label>
          ${
            tournament.closed
              ? ""
              : `
                <button
                  class="secondary save-fall-guys-settings"
                  type="button"
                  data-game-id="${game.id}"
                >
                  Save Format
                </button>
              `
          }
        </div>

        <p class="muted">
          Heat scoring: 1st 10 · 2nd 8 · 3rd 6 · 4th 5 ·
          qualified 3 · participated 1. Enter every player once
          under their best result for that heat.
        </p>

        <div class="button-row">
          ${
            tournament.closed
              ? `
                <button
                  class="secondary reopen-fall-guys-tournament"
                  type="button"
                  data-game-id="${game.id}"
                >
                  Reopen Tournament
                </button>
              `
              : `
                <button
                  class="add-fall-guys-heat"
                  type="button"
                  data-game-id="${game.id}"
                  ${
                    !canAddHeat
                      ? "disabled"
                      : ""
                  }
                >
                  Add Heat
                </button>
                <button
                  class="secondary close-fall-guys-tournament"
                  type="button"
                  data-game-id="${game.id}"
                  ${allHeatsComplete ? "" : "disabled"}
                >
                  Close Tournament
                </button>
              `
          }
        </div>
      </section>

      <section class="card wide">
        <div class="section-heading">
          <div>
            <h2>Live Office Standings</h2>
            <p class="muted">
              Ranked by heat points, then wins, podiums and qualifications.
            </p>
          </div>
        </div>
        ${renderStandings(
          game,
          tournament
        )}
      </section>

      ${
        tournament.heats.length
          ? tournament.heats
              .map(heat =>
                renderHeat(
                  game,
                  tournament,
                  heat
                )
              )
              .join("")
          : `
            <section class="card wide">
              <div class="empty-state">
                Add the first heat to begin entering Fall Guys results.
              </div>
            </section>
          `
      }
    `;
  }

  async function persist(
    action,
    summary,
    details
  ) {
    global.render();
    await global.saveState();
    if (
      typeof global.recordAuditEntry ===
      "function"
    ) {
      await global.recordAuditEntry(
        action,
        summary,
        details
      );
    }
  }

  function getGame(gameId) {
    return global.getGameById(gameId);
  }

  async function saveSettings(gameId, workspace) {
    const game = getGame(gameId);
    if (!game) return;
    const tournament =
      ensureTournament(game);
    tournament.targetHeats = Math.max(
      tournament.heats.length || 1,
      Math.min(
        30,
        toNonNegativeInteger(
          workspace.querySelector(
            ".fall-guys-target-heats"
          ).value
        ) || DEFAULT_TARGET_HEATS
      )
    );
    tournament.countedResults = Math.min(
      10,
      Math.max(
        1,
        toNonNegativeInteger(
          workspace.querySelector(
            ".fall-guys-counted-results"
          ).value
        ) || DEFAULT_COUNTED_RESULTS
      )
    );
    await persist(
      "fall-guys.settings.updated",
      `Updated ${game.name} Fall Guys format.`,
      { gameId }
    );
  }

  async function addHeat(gameId) {
    const game = getGame(gameId);
    if (!game) return;
    const tournament =
      ensureTournament(game);
    if (
      tournament.closed ||
      tournament.heats.length >=
        tournament.targetHeats ||
      (
        tournament.heats.length > 0 &&
        !tournament.heats.at(-1)
          .completed
      )
    ) {
      return;
    }
    const now = new Date().toISOString();
    tournament.heats.push({
      id: global.crypto.randomUUID(),
      number:
        tournament.heats.length + 1,
      completed: false,
      results: [],
      createdAt: now,
      updatedAt: now
    });
    await persist(
      "fall-guys.heat.created",
      `Added ${game.name} Heat ${tournament.heats.length}.`,
      { gameId }
    );
  }

  function readHeatResults(
    heatElement
  ) {
    return [
      ...heatElement.querySelectorAll(
        "tbody tr[data-team-id]"
      )
    ].map(row => ({
      teamId: row.dataset.teamId,
      ...Object.fromEntries(
        OUTCOMES.map(outcome => [
          outcome.key,
          toNonNegativeInteger(
            row.querySelector(
              `[data-outcome="${outcome.key}"]`
            ).value
          )
        ])
      )
    }));
  }

  async function saveHeat(
    gameId,
    heatId,
    heatElement
  ) {
    const game = getGame(gameId);
    if (!game) return;
    const tournament =
      ensureTournament(game);
    const heat = tournament.heats.find(
      item => item.id === heatId
    );
    if (!heat) return;

    const previousResults =
      structuredClone(
        heat.results || []
      );
    const submitted =
      readHeatResults(heatElement);
    const scoped =
      typeof global.isTeamScopedStaff ===
        "function" &&
      global.isTeamScopedStaff();
    heat.results = scoped
      ? [
          ...(heat.results || []).filter(
            result =>
              result.teamId !==
              submitted[0].teamId
          ),
          submitted[0]
        ]
      : submitted;

    const teamIds = (
      tournamentState.state.teams ||
      []
    ).map(team => team.id);
    const validation =
      validateHeatResults(
        heat.results,
        teamIds
      );
    const ordinalValidation =
      validateUniquePlacements(
        heat.results
      );

    if (!ordinalValidation.valid) {
      heat.results =
        previousResults;
      global.alert(
        ordinalValidation.message
      );
      return;
    }

    heat.completed = validation.valid;
    heat.updatedAt =
      new Date().toISOString();
    await persist(
      "fall-guys.heat.results.saved",
      `Saved ${game.name} Heat ${heat.number} results.`,
      {
        gameId,
        heatId,
        completed: heat.completed
      }
    );
  }

  async function reopenHeat(
    gameId,
    heatId
  ) {
    const game = getGame(gameId);
    if (!game) return;
    const heat = ensureTournament(
      game
    ).heats.find(
      item => item.id === heatId
    );
    if (!heat) return;
    heat.completed = false;
    heat.updatedAt =
      new Date().toISOString();
    await persist(
      "fall-guys.heat.reopened",
      `Reopened ${game.name} Heat ${heat.number}.`,
      { gameId, heatId }
    );
  }

  async function closeTournament(gameId) {
    const game = getGame(gameId);
    if (!game) return;
    const tournament =
      ensureTournament(game);
    if (
      tournament.heats.length === 0 ||
      tournament.heats.length !==
        tournament.targetHeats ||
      tournament.heats.some(
        heat => !heat.completed
      )
    ) {
      global.alert(
        `Complete all ${tournament.targetHeats} planned heats before closing the tournament.`
      );
      return;
    }
    const standings =
      calculateStandings(
        tournamentState.state.teams,
        tournament
      );
    tournament.finalStandings =
      standings.map(
        (standing, index) => ({
          ...standing,
          championshipPoints:
            Math.max(
              1,
              standings.length -
                Number(
                  standing.position ||
                    index + 1
                ) +
                1
            )
        })
      );
    tournament.closed = true;
    tournament.closedAt =
      new Date().toISOString();
    await persist(
      "fall-guys.tournament.closed",
      `Closed ${game.name} Fall Guys Grand Prix.`,
      { gameId }
    );
  }

  async function reopenTournament(gameId) {
    const game = getGame(gameId);
    if (!game) return;
    const tournament =
      ensureTournament(game);
    tournament.closed = false;
    tournament.closedAt = "";
    tournament.finalStandings = [];
    await persist(
      "fall-guys.tournament.reopened",
      `Reopened ${game.name} Fall Guys Grand Prix.`,
      { gameId }
    );
  }

  function updatePreview(input) {
    const workspace = input.closest(
      "[data-fall-guys-game-id]"
    );
    const heat = input.closest(
      "[data-fall-guys-heat-id]"
    );
    const row = input.closest(
      "tr[data-team-id]"
    );
    if (!workspace || !heat || !row) {
      return;
    }
    const countedResults =
      toNonNegativeInteger(
        workspace.querySelector(
          ".fall-guys-counted-results"
        ).value
      ) || DEFAULT_COUNTED_RESULTS;
    const result = {
      teamId: row.dataset.teamId,
      ...Object.fromEntries(
        OUTCOMES.map(outcome => [
          outcome.key,
          toNonNegativeInteger(
            row.querySelector(
              `[data-outcome="${outcome.key}"]`
            ).value
          )
        ])
      )
    };
    row.querySelector(
      ".fall-guys-heat-score"
    ).textContent = String(
      calculateHeatScore(
        result,
        countedResults
      )
    );
  }

  function initialiseControls() {
    global.document.addEventListener(
      "input",
      event => {
        if (
          event.target.matches(
            ".fall-guys-result-count"
          )
        ) {
          updatePreview(event.target);
        }
      }
    );
    global.document.addEventListener(
      "click",
      event => {
        const button =
          event.target.closest(
            ".save-fall-guys-settings, .add-fall-guys-heat, .save-fall-guys-heat, .reopen-fall-guys-heat, .close-fall-guys-tournament, .reopen-fall-guys-tournament"
          );
        if (!button) return;
        if (
          typeof global.requireAdminForAction ===
            "function" &&
          !global.requireAdminForAction()
        ) {
          return;
        }

        const gameId =
          button.dataset.gameId;
        if (
          button.classList.contains(
            "save-fall-guys-settings"
          )
        ) {
          saveSettings(
            gameId,
            button.closest(
              "[data-fall-guys-game-id]"
            )
          );
        } else if (
          button.classList.contains(
            "add-fall-guys-heat"
          )
        ) {
          addHeat(gameId);
        } else if (
          button.classList.contains(
            "save-fall-guys-heat"
          )
        ) {
          saveHeat(
            gameId,
            button.dataset.heatId,
            button.closest(
              "[data-fall-guys-heat-id]"
            )
          );
        } else if (
          button.classList.contains(
            "reopen-fall-guys-heat"
          )
        ) {
          reopenHeat(
            gameId,
            button.dataset.heatId
          );
        } else if (
          button.classList.contains(
            "close-fall-guys-tournament"
          )
        ) {
          closeTournament(gameId);
        } else {
          reopenTournament(gameId);
        }
      }
    );
  }

  global.document.addEventListener(
    "DOMContentLoaded",
    initialiseControls
  );

  global.PHDFallGuysGrandPrix =
    Object.freeze({
      MODE_ID,
      OUTCOMES,
      ensureTournament,
      normaliseResult,
      calculateHeatScore,
      getEntryCount,
      validateHeatResults,
      validateUniquePlacements,
      calculateStandings,
      renderManagement
    });

  tournamentState.modules.push(
    MODE_ID
  );
})(window);
