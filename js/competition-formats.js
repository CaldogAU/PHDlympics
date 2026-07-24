(function initialiseCompetitionFormats(global) {
  "use strict";

  function createMatch(teamAId, teamBId, createId) {
    return {
      id: createId(),
      teamAId,
      teamBId,
      gameId: "",
      bye: !teamBId,
      completed: !teamBId,
      scoreA: !teamBId ? 1 : null,
      scoreB: !teamBId ? 0 : null,
      winnerId: !teamBId ? teamAId : null
    };
  }

  function roundRobinSchedule(teamIds, createId = crypto.randomUUID) {
    const entrants = [...teamIds];
    if (entrants.length < 2) return [];
    if (entrants.length % 2) entrants.push(null);
    const rounds = [];
    const fixed = entrants[0];
    let rotating = entrants.slice(1);

    for (let roundIndex = 0; roundIndex < entrants.length - 1; roundIndex += 1) {
      const lineup = [fixed, ...rotating];
      const matches = [];
      for (let index = 0; index < lineup.length / 2; index += 1) {
        const first = lineup[index];
        const second = lineup[lineup.length - 1 - index];
        const teamAId = roundIndex % 2 && index === 0 ? second : first;
        const teamBId = roundIndex % 2 && index === 0 ? first : second;
        const realTeam = teamAId || teamBId;
        if (realTeam) matches.push(createMatch(realTeam, teamAId && teamBId ? teamBId : null, createId));
      }
      rounds.push({ number: roundIndex + 1, matches });
      rotating = [rotating.at(-1), ...rotating.slice(0, -1)];
    }
    return rounds;
  }

  function singleEliminationFirstRound(teamIds, createId = crypto.randomUUID) {
    if (teamIds.length < 2) return [];
    const bracketSize = 2 ** Math.ceil(Math.log2(teamIds.length));
    const seeded = [...teamIds, ...Array(bracketSize - teamIds.length).fill(null)];
    const matches = [];
    for (let index = 0; index < bracketSize / 2; index += 1) {
      const teamAId = seeded[index];
      const teamBId = seeded[bracketSize - 1 - index];
      const realTeam = teamAId || teamBId;
      if (realTeam) matches.push(createMatch(realTeam, teamAId && teamBId ? teamBId : null, createId));
    }
    return [{ number: 1, matches }];
  }

  global.PHDCompetitionFormats = Object.freeze({
    roundRobinSchedule,
    singleEliminationFirstRound
  });
})(typeof window === "undefined" ? globalThis : window);
