function getCompletedMatches() {
  return PHDTournament.state.rounds.flatMap(round =>
    round.matches.filter(match => !match.bye && match.completed)
  );
}

function getCompletedGrandPrixMatchCount(
  teamId = ""
) {
  return (
    PHDTournament.state.events || []
  )
    .filter(event =>
      event.completed &&
      event.mode === "grand-prix" &&
      (
        !teamId ||
        (
          event.results || []
        ).some(
          result =>
            result.teamId === teamId
        )
      )
    )
    .length * 4;
}

function getCompletedFourPlayerSwissMatchCount(
  teamId = ""
) {
  return (
    PHDTournament.state.games || []
  ).reduce((total, game) => {
    if (
      (game.mode || "") !==
      "four-player-swiss"
    ) {
      return total;
    }

    const rounds =
      game.fourPlayerSwiss &&
      Array.isArray(
        game.fourPlayerSwiss.rounds
      )
        ? game.fourPlayerSwiss.rounds
        : [];

    const completedGroups =
      rounds.reduce(
        (groupTotal, round) =>
          groupTotal +
          (
            round.groups || []
          ).filter(group =>
            group.completed &&
            (
              !teamId ||
              (
                group.competitors ||
                []
              ).some(
                competitor =>
                  competitor.teamId ===
                  teamId
              )
            )
          ).length,
        0
      );

    return total +
      completedGroups * 4;
  }, 0);
}

function getCompletedMatchCount(
  teamId = ""
) {
  const headToHeadCount =
    getCompletedMatches()
      .filter(match =>
        !teamId ||
        match.teamAId === teamId ||
        match.teamBId === teamId
      )
      .length;

  return headToHeadCount +
    getCompletedGrandPrixMatchCount(
      teamId
    ) +
    getCompletedFourPlayerSwissMatchCount(
      teamId
    );
}

function getHighestScore() {
  const completedMatches = getCompletedMatches();

  if (completedMatches.length === 0) return 0;

  return Math.max(
    ...completedMatches.flatMap(match => [
      Number(match.scoreA) || 0,
      Number(match.scoreB) || 0
    ])
  );
}

function getLargestMargin() {
  const completedMatches = getCompletedMatches();

  if (completedMatches.length === 0) return 0;

  return Math.max(
    ...completedMatches.map(match =>
      Math.abs((Number(match.scoreA) || 0) - (Number(match.scoreB) || 0))
    )
  );
}

function getLeaderName() {
  const standings = getStandings();

  if (standings.length === 0) return "—";

  return standings[0].shortName || standings[0].name;
}

function renderStatistics() {
  const statTeams = getElement("statTeams");
  const statGames = getElement("statGames");
  const statRounds = getElement("statRounds");
  const statCompletedMatches = getElement("statCompletedMatches");
  const statLeader = getElement("statLeader");
  const statHighestScore = getElement("statHighestScore");
  const statLargestMargin = getElement("statLargestMargin");

  if (statTeams) statTeams.textContent = PHDTournament.state.teams.length;
  if (statGames) statGames.textContent = getGames().length;
  if (statRounds) statRounds.textContent = PHDTournament.state.rounds.length;
  if (statCompletedMatches) statCompletedMatches.textContent = getCompletedMatchCount();
  if (statLeader) statLeader.textContent = getLeaderName();
  if (statHighestScore) statHighestScore.textContent = getHighestScore();
  if (statLargestMargin) statLargestMargin.textContent = getLargestMargin();
}

PHDTournament.modules.push("statistics");
