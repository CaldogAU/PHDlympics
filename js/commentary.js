(function initialiseCommentary(global) {
  "use strict";

  const templates = {
    biggestWin: [
      ({ winner, margin }) => `${winner} delivered the biggest recent win, by ${margin}.`,
      ({ winner, margin }) => `${winner} set the pace with a commanding ${margin}-point victory.`,
      ({ winner, margin }) => `Statement made: ${winner} recorded the widest recent margin at ${margin}.`,
      ({ winner, margin }) => `${winner} turned on the style in a dominant win by ${margin}.`,
      ({ winner, margin }) => `A powerhouse performance from ${winner}, winning by ${margin}.`,
      ({ winner, margin }) => `${winner} owns the standout recent result after a ${margin}-point triumph.`,
      ({ winner, margin }) => `No one has won bigger lately than ${winner}, clear by ${margin}.`,
      ({ winner, margin }) => `${winner} produced a tournament highlight with a ${margin}-point win.`
    ],
    closeContest: [
      ({ winner, loser, margin }) => `${winner} edged ${loser} by just ${margin}.`,
      ({ winner, loser, margin }) => `Fine margins! ${winner} squeezed past ${loser} by ${margin}.`,
      ({ winner, loser }) => `${winner} held their nerve in a thriller against ${loser}.`,
      ({ winner, loser, margin }) => `${winner} survived a huge challenge from ${loser}, winning by ${margin}.`,
      ({ winner, loser }) => `That one went to the wire, with ${winner} narrowly beating ${loser}.`,
      ({ winner, loser, margin }) => `Nothing separated them until the finish: ${winner} by ${margin} over ${loser}.`,
      ({ winner, loser }) => `${loser} pushed all the way, but ${winner} found the winning edge.`,
      ({ winner, loser, margin }) => `A nail-biter belongs to ${winner}, ${margin} ahead of ${loser}.`
    ],
    draw: [
      ({ teamA, teamB, score }) => `${teamA} and ${teamB} could not be separated, finishing ${score}.`,
      ({ teamA, teamB }) => `Honours even between ${teamA} and ${teamB}.`,
      ({ teamA, teamB, score }) => `${teamA} and ${teamB} shared the spoils after a ${score} contest.`,
      ({ teamA, teamB }) => `Deadlock! ${teamA} and ${teamB} matched each other all the way.`,
      ({ teamA, teamB }) => `Neither side gave an inch as ${teamA} drew with ${teamB}.`,
      ({ teamA, teamB, score }) => `A perfectly balanced battle: ${teamA} ${score} ${teamB}.`
    ],
    shutout: [
      ({ winner, loser, score }) => `${winner} shut out ${loser} in a flawless ${score} result.`,
      ({ winner, loser }) => `A clean-sheet masterclass from ${winner} against ${loser}.`,
      ({ winner, loser }) => `${winner} gave ${loser} no opening in a complete defensive display.`,
      ({ winner, score }) => `${winner} combined attack and defence perfectly in a ${score} shutout.`,
      ({ winner, loser }) => `Nothing got past ${winner}, who blanked ${loser}.`,
      ({ winner }) => `${winner} completed a statement victory without conceding.`
    ],
    highScore: [
      ({ teamA, teamB, total }) => `${teamA} and ${teamB} lit up the scoreboard with ${total} combined points.`,
      ({ teamA, teamB }) => `An attacking showcase unfolded between ${teamA} and ${teamB}.`,
      ({ teamA, teamB, total }) => `Scoreboard operators were busy as ${teamA} and ${teamB} combined for ${total}.`,
      ({ teamA, teamB }) => `${teamA} versus ${teamB} delivered a feast of scoring.`,
      ({ teamA, teamB, total }) => `Points flowed in the ${teamA}-${teamB} contest: ${total} in total.`,
      ({ teamA, teamB }) => `End-to-end action defined the clash between ${teamA} and ${teamB}.`
    ],
    upset: [
      ({ winner, loser }) => `Upset alert: ${winner} toppled higher-ranked ${loser}.`,
      ({ winner, loser }) => `${winner} upset the form book with victory over ${loser}.`,
      ({ winner, loser }) => `The standings did not decide this one—${winner} defeated ${loser}.`,
      ({ winner, loser }) => `${winner} punched above their ladder position to beat ${loser}.`,
      ({ winner, loser }) => `A surprise result as ${winner} took down ${loser}.`,
      ({ winner, loser }) => `${winner} proved rankings are only numbers by overcoming ${loser}.`
    ],
    winningForm: [
      ({ team, wins }) => `${team} is in form with ${wins} recent wins.`,
      ({ team, wins }) => `${team} is building serious momentum after ${wins} recent victories.`,
      ({ team, wins }) => `Red-hot ${team} has collected ${wins} wins in the recent results.`,
      ({ team, wins }) => `${wins} recent wins have made ${team} the team to watch.`,
      ({ team, wins }) => `${team} keeps finding a way, now up to ${wins} recent victories.`,
      ({ team, wins }) => `Momentum belongs to ${team} following ${wins} recent wins.`,
      ({ team, wins }) => `${team} is on a roll, banking ${wins} wins in this run.`,
      ({ team, wins }) => `The wins keep coming for ${team}: ${wins} across the recent slate.`
    ],
    unbeaten: [
      ({ team, games }) => `${team} remains unbeaten across ${games} recent contests.`,
      ({ team, games }) => `Still standing: ${team} has avoided defeat in ${games} recent games.`,
      ({ team, games }) => `${team}'s unbeaten run has reached ${games} matches.`,
      ({ team, games }) => `Nobody has beaten ${team} in their last ${games} appearances.`,
      ({ team, games }) => `${games} games without defeat underline ${team}'s consistency.`,
      ({ team, games }) => `${team} continues to protect an impressive ${games}-game unbeaten run.`
    ],
    leader: [
      ({ leader, gap, pointsWord }) => `${leader} leads the championship by ${gap} ${pointsWord}.`,
      ({ leader, gap, pointsWord }) => `${leader} holds top spot with a ${gap}-${pointsWord} cushion.`,
      ({ leader, gap, pointsWord }) => `Championship leader ${leader} is ${gap} ${pointsWord} clear.`,
      ({ leader, gap, pointsWord }) => `${leader} has opened a ${gap}-${pointsWord} advantage at the summit.`,
      ({ leader, gap, pointsWord }) => `The target is ${leader}, currently leading by ${gap} ${pointsWord}.`,
      ({ leader, gap, pointsWord }) => `${leader} controls the championship race, ${gap} ${pointsWord} ahead.`,
      ({ leader, gap, pointsWord }) => `Top of the table: ${leader}, with daylight of ${gap} ${pointsWord}.`,
      ({ leader, gap, pointsWord }) => `${leader} sets the championship pace by ${gap} ${pointsWord}.`
    ],
    tiedLead: [
      ({ leader, challenger }) => `${leader} holds the championship lead on tie-breaks over ${challenger}.`,
      ({ leader, challenger }) => `Nothing in it at the top: ${leader} and ${challenger} are level on points.`,
      ({ leader, challenger }) => `${leader} edges ${challenger} on tie-breaks in a dead-even title race.`,
      ({ leader, challenger }) => `The championship could not be tighter, with ${leader} level with ${challenger}.`,
      ({ leader, challenger }) => `Tie-breaks put ${leader} ahead of ${challenger} at the summit.`,
      ({ leader, challenger }) => `${leader} and ${challenger} are locked together in the title chase.`
    ],
    closeChampionship: [
      ({ leader, challenger, gap, pointsWord }) => `${challenger} is keeping ${leader} honest—only ${gap} ${pointsWord} separate the top two.`,
      ({ leader, challenger, gap, pointsWord }) => `The title race is alive: ${leader} leads ${challenger} by just ${gap} ${pointsWord}.`,
      ({ leader, challenger }) => `${leader} has no room to relax with ${challenger} close behind.`,
      ({ leader, challenger, gap, pointsWord }) => `Just ${gap} ${pointsWord} between ${leader} and ${challenger} at the top.`,
      ({ leader, challenger }) => `${challenger} is applying real pressure to championship leader ${leader}.`,
      ({ leader, challenger, gap, pointsWord }) => `A tense championship battle sees ${leader} ${gap} ${pointsWord} ahead of ${challenger}.`
    ],
    perfectRecord: [
      ({ team, wins }) => `${team} remains perfect with ${wins} wins from ${wins}.`,
      ({ team, wins }) => `${team}'s flawless start continues: played ${wins}, won ${wins}.`,
      ({ team, wins }) => `No dropped results for ${team}, who is ${wins}-for-${wins}.`,
      ({ team, wins }) => `${team} has made every appearance count with ${wins} straight wins.`,
      ({ team, wins }) => `Perfection so far for ${team}: ${wins} matches, ${wins} victories.`,
      ({ team, wins }) => `${team} is yet to put a foot wrong after ${wins} wins.`
    ],
    milestone: [
      ({ team, wins }) => `${team} has reached ${wins} tournament wins.`,
      ({ team, wins }) => `Milestone achieved: victory number ${wins} for ${team}.`,
      ({ team, wins }) => `${team} celebrates a landmark ${wins}th win of the tournament.`,
      ({ team, wins }) => `The latest result takes ${team} to ${wins} victories.`,
      ({ team, wins }) => `${wins} wins and counting for ${team}.`
    ],
    timeTrialWinner: [
      ({ winner, game, time }) => `${winner} set the benchmark in ${game} with ${time}.`,
      ({ winner, game, time }) => `${winner} stopped the clock at ${time} to win ${game}.`,
      ({ winner, game }) => `Fastest of the field: ${winner} takes the ${game} Time Trial.`,
      ({ winner, game, time }) => `${winner} found the quickest line through ${game}, recording ${time}.`,
      ({ winner, game }) => `Precision and pace carried ${winner} to Time Trial victory in ${game}.`,
      ({ winner, game, time }) => `A rapid ${time} puts ${winner} on top in ${game}.`,
      ({ winner, game }) => `${winner} delivers when every millisecond matters, winning ${game}.`,
      ({ winner, game, time }) => `${winner} owns the clock in ${game} after a winning ${time}.`
    ],
    timeTrialClose: [
      ({ winner, runnerUp, gap }) => `Only ${gap} separated ${winner} and ${runnerUp} in a razor-close Time Trial.`,
      ({ winner, runnerUp, gap }) => `${winner} beat ${runnerUp} to the clock by just ${gap}.`,
      ({ winner, runnerUp }) => `Blink and you missed it—${winner} narrowly denied ${runnerUp}.`,
      ({ winner, runnerUp, gap }) => `Every millisecond counted as ${winner} edged ${runnerUp} by ${gap}.`,
      ({ winner, runnerUp }) => `${runnerUp} came agonisingly close, but ${winner} was fastest.`,
      ({ winner, runnerUp, gap }) => `A photo finish against the clock: ${winner} by ${gap} over ${runnerUp}.`
    ],
    timeTrialGap: [
      ({ winner, runnerUp, gap }) => `${winner} dominated the clock, finishing ${gap} ahead of ${runnerUp}.`,
      ({ winner, runnerUp, gap }) => `A huge Time Trial performance put ${winner} ${gap} clear of ${runnerUp}.`,
      ({ winner, runnerUp }) => `${winner} was in a class of their own against the clock, ahead of ${runnerUp}.`,
      ({ winner, runnerUp, gap }) => `${winner} found another gear, opening a ${gap} gap to ${runnerUp}.`,
      ({ winner, runnerUp }) => `The stopwatch confirms a commanding victory for ${winner} over ${runnerUp}.`
    ],
    grandPrixWinner: [
      ({ winner, game }) => `${winner} takes the chequered flag in ${game}.`,
      ({ winner, game }) => `${winner} races to Grand Prix glory in ${game}.`,
      ({ winner, game }) => `Top step secured: ${winner} wins the ${game} Grand Prix.`,
      ({ winner, game }) => `${winner} leads the field home to claim ${game}.`,
      ({ winner, game }) => `A winning drive puts ${winner} first in ${game}.`,
      ({ winner, game }) => `${winner} conquers the ${game} Grand Prix.`,
      ({ winner, game }) => `Victory lane belongs to ${winner} after a superb ${game} result.`,
      ({ winner, game }) => `${winner} finishes at the head of the pack in ${game}.`
    ],
    grandPrixPodium: [
      ({ first, second, third }) => `Podium order: ${first}, ${second}, then ${third}.`,
      ({ first, second, third }) => `${first} heads a podium completed by ${second} and ${third}.`,
      ({ first, second, third }) => `The top three are ${first}, ${second}, and ${third}.`,
      ({ first, second, third }) => `${first} stands tallest, with ${second} second and ${third} third.`,
      ({ first, second, third }) => `Podium places go to ${first}, ${second}, and ${third}.`,
      ({ first, second, third }) => `${first} leads home fellow podium finishers ${second} and ${third}.`
    ],
    bye: [
      ({ team }) => `${team} advances with a bye and banks the available points.`,
      ({ team }) => `A scheduled bye gives ${team} a chance to reset for the next contest.`,
      ({ team }) => `${team} receives the bye in the latest round.`,
      ({ team }) => `No opponent this round for ${team}, who receives a bye.`
    ]
  };

  function parseScore(score) {
    const match = String(score || "").match(
      /^\s*(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)\s*$/
    );
    return match
      ? [Number(match[1]), Number(match[2])]
      : null;
  }

  function stableHash(value) {
    return [...String(value)].reduce(
      (hash, character) =>
        ((hash << 5) - hash +
          character.charCodeAt(0)) |
        0,
      0
    );
  }

  function chooseTemplate(type, signature) {
    const choices = templates[type] || [];
    if (!choices.length) return null;
    return choices[
      Math.abs(stableHash(`${type}:${signature}`)) %
        choices.length
    ];
  }

  function formatDuration(milliseconds) {
    const value = Math.max(0, Number(milliseconds) || 0);
    const minutes = Math.floor(value / 60000);
    const seconds = Math.floor((value % 60000) / 1000);
    if (minutes) {
      return `${minutes}:${String(seconds).padStart(2, "0")}`;
    }
    return `${seconds}s`;
  }

  function normaliseName(value, fallback = "Unknown") {
    const name = String(value || "").trim();
    return name || fallback;
  }

  function generate({
    activity = [],
    standings = [],
    events = [],
    teams = [],
    games = [],
    limit = 6
  } = {}) {
    const candidates = [];
    const teamNames = new Map(
      teams.map(team => [
        team.id,
        normaliseName(team.name)
      ])
    );
    const gameNames = new Map(
      games.map(game => [
        game.id,
        normaliseName(game.name, "the event")
      ])
    );
    const ranks = new Map();
    standings.forEach((team, index) => {
      if (team.id) {
        ranks.set(team.id, index + 1);
      }
      if (team.name) {
        ranks.set(team.name, index + 1);
      }
    });

    function add(type, priority, data, signature) {
      const render = chooseTemplate(
        type,
        signature
      );
      if (!render) return;
      candidates.push({
        type,
        priority,
        signature: `${type}:${signature}`,
        text: render(data)
      });
    }

    const scored = activity
      .filter(item => item.type === "Match")
      .map((item, index) => ({
        ...item,
        index,
        values: parseScore(item.score)
      }))
      .filter(item => item.values)
      .map(item => {
        const [scoreA, scoreB] = item.values;
        const isDraw = scoreA === scoreB;
        return {
          ...item,
          scoreA,
          scoreB,
          isDraw,
          margin: Math.abs(scoreA - scoreB),
          total: scoreA + scoreB,
          winner: isDraw
            ? ""
            : scoreA > scoreB
              ? item.teamA
              : item.teamB,
          loser: isDraw
            ? ""
            : scoreA > scoreB
              ? item.teamB
              : item.teamA
        };
      });

    const decisive = scored.filter(
      match => !match.isDraw
    );
    const signatureForMatch = match =>
      `${match.round || ""}:${match.teamA}:${match.teamB}:${match.score}`;

    if (decisive.length) {
      const biggest = [...decisive].sort(
        (a, b) =>
          b.margin - a.margin ||
          a.index - b.index
      )[0];
      add(
        "biggestWin",
        100,
        biggest,
        signatureForMatch(biggest)
      );

      const closest = [...decisive].sort(
        (a, b) =>
          a.margin - b.margin ||
          a.index - b.index
      )[0];
      if (
        closest.margin <= 2 &&
        closest !== biggest
      ) {
        add(
          "closeContest",
          88,
          closest,
          signatureForMatch(closest)
        );
      }

      const shutout = decisive.find(
        match =>
          Math.min(
            match.scoreA,
            match.scoreB
          ) === 0 &&
          match.margin > 0
      );
      if (shutout) {
        add(
          "shutout",
          82,
          shutout,
          signatureForMatch(shutout)
        );
      }

      const highScore = [...scored].sort(
        (a, b) => b.total - a.total
      )[0];
      const averageTotal =
        scored.reduce(
          (sum, match) => sum + match.total,
          0
        ) / scored.length;
      if (
        scored.length >= 2 &&
        highScore.total >
          Math.max(averageTotal * 1.35, 10)
      ) {
        add(
          "highScore",
          70,
          highScore,
          signatureForMatch(highScore)
        );
      }

      const upset = decisive.find(match => {
        const winnerRank =
          ranks.get(match.winner);
        const loserRank =
          ranks.get(match.loser);
        return (
          winnerRank &&
          loserRank &&
          winnerRank > loserRank + 1
        );
      });
      if (upset) {
        add(
          "upset",
          93,
          upset,
          signatureForMatch(upset)
        );
      }
    }

    const latestDraw = scored.find(
      match => match.isDraw
    );
    if (latestDraw) {
      add(
        "draw",
        76,
        latestDraw,
        signatureForMatch(latestDraw)
      );
    }

    const latestBye = activity.find(
      item => item.type === "Bye"
    );
    if (latestBye) {
      add(
        "bye",
        35,
        { team: latestBye.teamA },
        `${latestBye.round}:${latestBye.teamA}`
      );
    }

    const form = new Map();
    scored.forEach(match => {
      [match.teamA, match.teamB].forEach(team => {
        const record = form.get(team) || {
          games: 0,
          wins: 0,
          losses: 0
        };
        record.games += 1;
        if (!match.isDraw) {
          if (match.winner === team) {
            record.wins += 1;
          } else {
            record.losses += 1;
          }
        }
        form.set(team, record);
      });
    });
    const hottest = [...form.entries()]
      .filter(([, record]) => record.wins >= 2)
      .sort(
        (a, b) =>
          b[1].wins - a[1].wins ||
          b[1].games - a[1].games
      )[0];
    if (hottest) {
      add(
        "winningForm",
        84,
        {
          team: hottest[0],
          wins: hottest[1].wins
        },
        `${hottest[0]}:${hottest[1].wins}`
      );
    }
    const unbeaten = [...form.entries()]
      .filter(
        ([, record]) =>
          record.games >= 3 &&
          record.losses === 0
      )
      .sort(
        (a, b) =>
          b[1].games - a[1].games
      )[0];
    if (unbeaten) {
      add(
        "unbeaten",
        80,
        {
          team: unbeaten[0],
          games: unbeaten[1].games
        },
        `${unbeaten[0]}:${unbeaten[1].games}`
      );
    }

    if (standings.length) {
      const leader = standings[0];
      const challenger = standings[1];
      const gap = challenger
        ? Number(leader.points) -
          Number(challenger.points)
        : Number(leader.points);
      const leaderData = {
        leader: normaliseName(leader.name),
        challenger: challenger
          ? normaliseName(challenger.name)
          : "the field",
        gap,
        pointsWord:
          gap === 1 ? "point" : "points"
      };
      if (challenger && gap === 0) {
        add(
          "tiedLead",
          95,
          leaderData,
          `${leaderData.leader}:${leaderData.challenger}:tied`
        );
      } else if (gap > 0) {
        add(
          "leader",
          90,
          leaderData,
          `${leaderData.leader}:${gap}`
        );
        if (challenger && gap <= 2) {
          add(
            "closeChampionship",
            89,
            leaderData,
            `${leaderData.leader}:${leaderData.challenger}:${gap}`
          );
        }
      }

      const perfect = standings.find(
        team =>
          Number(team.wins) >= 2 &&
          Number(team.losses) === 0 &&
          Number(team.draws) === 0
      );
      if (perfect) {
        add(
          "perfectRecord",
          86,
          {
            team: perfect.name,
            wins: Number(perfect.wins)
          },
          `${perfect.name}:${perfect.wins}`
        );
      }

      const milestone = standings.find(
        team =>
          Number(team.wins) >= 5 &&
          Number(team.wins) % 5 === 0
      );
      if (milestone) {
        add(
          "milestone",
          78,
          {
            team: milestone.name,
            wins: Number(milestone.wins)
          },
          `${milestone.name}:${milestone.wins}`
        );
      }
    }

    events
      .filter(
        event =>
          event &&
          event.completed &&
          Array.isArray(event.results) &&
          event.results.length
      )
      .sort((a, b) =>
        String(b.updatedAt || "").localeCompare(
          String(a.updatedAt || "")
        )
      )
      .slice(0, 3)
      .forEach(event => {
        const game =
          gameNames.get(event.gameId) ||
          "the event";
        if (event.mode === "time-trial") {
          const results = event.results
            .filter(result =>
              Number.isFinite(
                Number(result.timeMilliseconds)
              )
            )
            .map(result => ({
              ...result,
              timeMilliseconds:
                Math.floor(
                  Number(
                    result.timeMilliseconds
                  ) / 1000
                ) * 1000,
              team:
                teamNames.get(result.teamId) ||
                normaliseName(result.teamName)
            }))
            .sort(
              (a, b) =>
                a.timeMilliseconds -
                b.timeMilliseconds
            );
          if (!results.length) return;
          const winner = results[0];
          add(
            "timeTrialWinner",
            98,
            {
              winner: winner.team,
              game,
              time: formatDuration(
                winner.timeMilliseconds
              )
            },
            `${event.id}:${winner.teamId}:${winner.timeMilliseconds}`
          );
          if (results[1]) {
            const gap =
              results[1].timeMilliseconds -
              winner.timeMilliseconds;
            const data = {
              winner: winner.team,
              runnerUp: results[1].team,
              gap: formatDuration(gap)
            };
            const ratio =
              winner.timeMilliseconds > 0
                ? gap / winner.timeMilliseconds
                : 0;
            if (
              ratio <= 0.02 ||
              ratio >= 0.12
            ) {
              add(
                ratio <= 0.02
                  ? "timeTrialClose"
                  : "timeTrialGap",
                ratio >= 0.12 ? 91 : 87,
                data,
                `${event.id}:${gap}`
              );
            }
          }
        }

        if (event.mode === "grand-prix") {
          const results = event.results
            .filter(result =>
              Number.isInteger(
                Number(result.finishPosition)
              )
            )
            .map(result => ({
              ...result,
              finishPosition: Number(
                result.finishPosition
              ),
              team:
                teamNames.get(result.teamId) ||
                normaliseName(result.teamName)
            }))
            .sort(
              (a, b) =>
                a.finishPosition -
                b.finishPosition
            );
          if (!results.length) return;
          add(
            "grandPrixWinner",
            98,
            {
              winner: results[0].team,
              game
            },
            `${event.id}:${results[0].teamId}`
          );
          if (results.length >= 3) {
            add(
              "grandPrixPodium",
              85,
              {
                first: results[0].team,
                second: results[1].team,
                third: results[2].team
              },
              `${event.id}:${results
                .slice(0, 3)
                .map(result => result.teamId)
                .join(":")}`
            );
          }
        }
      });

    const seenTypes = new Set();
    const seenText = new Set();
    return candidates
      .sort(
        (a, b) =>
          b.priority - a.priority ||
          a.signature.localeCompare(b.signature)
      )
      .filter(candidate => {
        if (
          seenTypes.has(candidate.type) ||
          seenText.has(candidate.text)
        ) {
          return false;
        }
        seenTypes.add(candidate.type);
        seenText.add(candidate.text);
        return true;
      })
      .slice(0, Math.max(0, Number(limit) || 0))
      .map(candidate => candidate.text);
  }

  global.PHDCommentary = Object.freeze({
    generate,
    parseScore,
    formatDuration,
    templateCounts: Object.freeze(
      Object.fromEntries(
        Object.entries(templates).map(
          ([type, choices]) => [
            type,
            choices.length
          ]
        )
      )
    )
  });
})(typeof window === "undefined" ? globalThis : window);
