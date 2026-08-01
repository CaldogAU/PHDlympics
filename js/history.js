function formatHistoryPlacement(placement) {
  const value = Number(placement);
  const remainder100 = value % 100;
  const remainder10 = value % 10;
  const suffix =
    remainder100 >= 11 && remainder100 <= 13
      ? "th"
      : remainder10 === 1
        ? "st"
        : remainder10 === 2
          ? "nd"
          : remainder10 === 3
            ? "rd"
            : "th";

  return `${value}${suffix}`;
}

function formatHistoryTime(milliseconds) {
  const total = Number(milliseconds);

  if (!Number.isFinite(total)) {
    return "no time";
  }

  const minutes = Math.floor(total / 60000);
  const seconds = Math.floor((total % 60000) / 1000);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getHistoryTeamName(teamId) {
  const team = getTeamById(teamId);
  return team ? team.name : "Unknown";
}

function getEventHistorySummary(
  rankedResults,
  isGrandPrix
) {
  return rankedResults
    .map((result, index) => {
      const teamName =
        getHistoryTeamName(
          result.teamId
        );

      if (isGrandPrix) {
        return `${formatHistoryPlacement(
          result.finishPosition
        )} ${teamName}${
          result.playerLabel
            ? ` - ${result.playerLabel}`
            : ""
        }`;
      }

      return `${formatHistoryPlacement(
        index + 1
      )} ${teamName} ${formatHistoryTime(
        result.timeMilliseconds
      )}`;
    })
    .join(", ");
}

function getGroupHistorySummary(group) {
  return [...(group.competitors || [])]
    .sort(
      (competitorA, competitorB) =>
        Number(
          competitorA.placement
        ) -
        Number(
          competitorB.placement
        )
    )
    .map(
      competitor =>
        `${formatHistoryPlacement(
          competitor.placement
        )} ${getHistoryTeamName(
          competitor.teamId
        )}${
          competitor.playerLabel
            ? ` - ${competitor.playerLabel}`
            : ""
        }`
    )
    .join(", ");
}

function getMatchHistory() {
  const history = [];

  (PHDTournament.state.rounds || []).forEach(round => {
    (round.matches || []).forEach(match => {
      const teamA = getTeamById(match.teamAId);
      const teamB = getTeamById(match.teamBId);
      const game = match.gameId
        ? getGameById(match.gameId)
        : null;

      if (match.bye) {
        history.push({
          round: round.number,
          type: "Bye",
          game: "",
          teamA: teamA ? teamA.name : "Unknown",
          teamB: "",
          score: "BYE",
          status: "Completed",
          updatedAt: match.updatedAt || round.createdAt || ""
        });
        return;
      }

      history.push({
        round: round.number,
        type: "Match",
        game: game ? getGameLabel(game.id) : "No game selected",
        teamA: teamA ? teamA.name : "Unknown",
        teamB: teamB ? teamB.name : "Unknown",
        score: match.completed
          ? `${match.scoreA} - ${match.scoreB}`
          : "Not played",
        status: match.completed ? "Completed" : "Open",
        updatedAt: match.updatedAt || round.createdAt || ""
      });
    });
  });

  (PHDTournament.state.events || []).forEach(event => {
    const results = Array.isArray(event.results) ? event.results : [];
    if (results.length === 0) return;

    const game = getGameById(event.gameId);
    const isGrandPrix = event.mode === "grand-prix";
    const rankedResults = [...results].sort((resultA, resultB) =>
      isGrandPrix
        ? Number(resultA.finishPosition) - Number(resultB.finishPosition)
        : Math.floor(
            Number(resultA.timeMilliseconds) /
              1000
          ) -
          Math.floor(
            Number(resultB.timeMilliseconds) /
              1000
          )
    );
    const leader = rankedResults[0];
    const leaderTeam = leader ? getTeamById(leader.teamId) : null;
    const leaderName = leaderTeam ? leaderTeam.name : "Unknown";
    const detail =
      getEventHistorySummary(
        rankedResults,
        isGrandPrix
      );

    history.push({
      round: "",
      type: isGrandPrix ? "Grand Prix" : "Time Trial",
      game: game ? getGameLabel(game.id) : "Unknown game",
      teamA: leaderName,
      teamB: "Multiple",
      score: detail,
      detail,
      status: event.completed ? "Completed" : "In Progress",
      hasResult: true,
      updatedAt: event.updatedAt || event.createdAt || ""
    });
  });

  (PHDTournament.state.games || []).forEach(game => {
    if (
      game.mode ===
        "fall-guys-grand-prix" &&
      game.fallGuysGrandPrix &&
      Array.isArray(
        game.fallGuysGrandPrix.heats
      )
    ) {
      const tournament =
        game.fallGuysGrandPrix;

      tournament.heats
        .filter(
          heat => heat.completed
        )
        .forEach(heat => {
          const rankedResults = [
            ...(heat.results || [])
          ]
            .map(result => ({
              ...result,
              score:
                window
                  .PHDFallGuysGrandPrix
                  .calculateHeatScore(
                    result,
                    tournament
                      .countedResults
                  )
            }))
            .sort(
              (resultA, resultB) =>
                resultB.score -
                  resultA.score ||
                getHistoryTeamName(
                  resultA.teamId
                ).localeCompare(
                  getHistoryTeamName(
                    resultB.teamId
                  )
                )
            );
          const detail =
            rankedResults
              .map(
                (result, index) =>
                  `${formatHistoryPlacement(
                    index + 1
                  )} ${getHistoryTeamName(
                    result.teamId
                  )} ${result.score} pts`
              )
              .join(", ");
          const leader =
            rankedResults[0];

          history.push({
            round: heat.number,
            type:
              "Fall Guys Grand Prix",
            game: getGameLabel(
              game.id
            ),
            teamA: leader
              ? getHistoryTeamName(
                  leader.teamId
                )
              : "Multiple",
            teamB: "Multiple",
            score: detail,
            detail,
            status: "Completed",
            hasResult: true,
            updatedAt:
              heat.updatedAt ||
              heat.createdAt ||
              ""
          });
        });

      return;
    }

    if (
      game.mode !== "four-player-swiss" ||
      !game.fourPlayerSwiss ||
      !Array.isArray(game.fourPlayerSwiss.rounds)
    ) {
      return;
    }

    game.fourPlayerSwiss.rounds.forEach(round => {
      (round.groups || []).forEach(group => {
        if (!group.completed) return;

        const winner = (group.competitors || []).find(
          competitor => Number(competitor.placement) === 1
        );
        const winnerTeam = winner ? getTeamById(winner.teamId) : null;
        const winnerName = winnerTeam ? winnerTeam.name : "Unknown";
        const detail =
          getGroupHistorySummary(group) ||
          "Placements completed";

        history.push({
          round: round.number,
          type: "4 Player Swiss",
          game: getGameLabel(game.id),
          teamA: winnerName,
          teamB: "Multiple",
          score: detail,
          detail,
          groupNumber: group.number,
          status: "Completed",
          hasResult: true,
          updatedAt:
            group.updatedAt ||
            round.updatedAt ||
            round.createdAt ||
            ""
        });
      });
    });
  });

  return history;
}

function getRecentActivity(limit = 10) {
  return getMatchHistory()
    .filter(item => item.status === "Completed" || item.hasResult)
    .sort((itemA, itemB) =>
      String(itemB.updatedAt).localeCompare(String(itemA.updatedAt))
    )
    .slice(0, limit);
}

function getActivityTickerItemText(item) {
  if (item.type === "Bye") {
    return `Round ${item.round}: ${item.teamA} received a BYE`;
  }

  if (item.type === "Grand Prix") {
    return `${item.game} Grand Prix: ${item.detail}`;
  }

  if (item.type === "Time Trial") {
    return `${item.game} Time Trial: ${item.detail}`;
  }

  if (item.type === "4 Player Swiss") {
    return `${item.game} Round ${item.round}, Group ${item.groupNumber}: ${item.detail}`;
  }

  if (
    item.type ===
    "Fall Guys Grand Prix"
  ) {
    return `${item.game} Heat ${item.round}: ${item.detail}`;
  }

  return `Round ${item.round}: ${item.game} — ${item.teamA} ${item.score} ${item.teamB}`;
}

function renderRecentActivityTicker() {
  const ticker = getElement("activityTickerText");
  if (!ticker) return;

  const activity = getRecentActivity(8);
  if (activity.length === 0) {
    ticker.textContent = "No recent activity yet.";
    return;
  }

  ticker.innerHTML = activity
    .map(item => escapeHtml(getActivityTickerItemText(item)))
    .join(" · ");
}

function renderMatchHistory() {
  const container = getElement("historyContainer");
  if (!container) return;

  const history = getMatchHistory();
  if (history.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No match history yet. Generate a round to begin.
      </div>
    `;
    return;
  }

  container.innerHTML = history
    .map(
      item => `
      <div class="history-item">
        <div>
          <strong>${
            item.round ? `Round ${item.round}` : escapeHtml(item.type)
          }</strong>
          <span class="status-pill ${
            item.status === "Completed" ? "completed" : "open"
          }">
            ${escapeHtml(item.status)}
          </span>
        </div>

        <div class="history-match">
          <span>${escapeHtml(item.teamA)}</span>
          ${
            item.type === "Match" && item.teamB
              ? `<span class="muted">vs</span><span>${escapeHtml(
                  item.teamB
                )}</span>`
              : ""
          }
        </div>

        <div class="history-detail">
          <span>${escapeHtml(item.game || item.type)}</span>
          <strong>${escapeHtml(item.score)}</strong>
        </div>
      </div>
    `
    )
    .join("");
}

PHDTournament.modules.push("history");
