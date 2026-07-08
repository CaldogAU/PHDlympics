function getCompletedMatches() {
  return PHDTournament.state.rounds.flatMap(round =>
    round.matches.filter(match => !match.bye && match.completed)
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
  if (statCompletedMatches) statCompletedMatches.textContent = getCompletedMatches().length;
  if (statLeader) statLeader.textContent = getLeaderName();
  if (statHighestScore) statHighestScore.textContent = getHighestScore();
  if (statLargestMargin) statLargestMargin.textContent = getLargestMargin();
}

PHDTournament.modules.push("statistics");