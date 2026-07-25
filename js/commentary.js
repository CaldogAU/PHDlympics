(function initialiseCommentary(global) {
  "use strict";

  function parseScore(score) {
    const match = String(score || "").match(/^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/);
    return match ? [Number(match[1]), Number(match[2])] : null;
  }

  function generate({ activity = [], standings = [] } = {}) {
    const notes = [];
    const scored = activity
      .filter(item => item.type === "Match")
      .map(item => ({ ...item, values: parseScore(item.score) }))
      .filter(item => item.values);

    if (scored.length) {
      const biggest = scored
        .map(item => ({ ...item, margin: Math.abs(item.values[0] - item.values[1]) }))
        .sort((a, b) => b.margin - a.margin)[0];
      if (biggest.margin > 0) {
        const winner = biggest.values[0] > biggest.values[1]
          ? biggest.teamA
          : biggest.teamB;
        notes.push(`${winner} delivered the biggest recent win, by ${biggest.margin}.`);
      }
    }

    if (standings.length) {
      const leader = standings[0];
      const gap = standings[1]
        ? Number(leader.points) - Number(standings[1].points)
        : Number(leader.points);
      notes.push(gap > 0
        ? `${leader.name} leads the championship by ${gap} point${gap === 1 ? "" : "s"}.`
        : `${leader.name} holds the championship lead on tie-breaks.`);
    }

    const wins = new Map();
    scored.forEach(item => {
      if (item.values[0] === item.values[1]) return;
      const winner = item.values[0] > item.values[1] ? item.teamA : item.teamB;
      wins.set(winner, (wins.get(winner) || 0) + 1);
    });
    const hotTeam = [...wins.entries()].sort((a, b) => b[1] - a[1])[0];
    if (hotTeam && hotTeam[1] >= 2) {
      notes.push(`${hotTeam[0]} is in form with ${hotTeam[1]} recent wins.`);
    }

    return notes.slice(0, 3);
  }

  global.PHDCommentary = Object.freeze({ generate, parseScore });
})(typeof window === "undefined" ? globalThis : window);
