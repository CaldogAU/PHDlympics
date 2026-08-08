function getTournament() {
  return PHDTournament.state.tournament;
}

function updateThemeToggleLabel() {
  setText(
    "themeToggle",
    document.body.classList.contains("light")
      ? "Use Dark Theme"
      : "Use Light Theme"
  );
}

function ensureStateShape() {
  if (!Array.isArray(PHDTournament.state.teams)) {
    PHDTournament.state.teams = [];
  }

  if (!Array.isArray(PHDTournament.state.games)) {
    PHDTournament.state.games = [];
  }

  if (!Array.isArray(PHDTournament.state.rounds)) {
    PHDTournament.state.rounds = [];
  }

  if (!Array.isArray(PHDTournament.state.events)) {
    PHDTournament.state.events = [];
  }
}

function renderTournamentForm() {
  const tournament = getTournament();

  setValue("tournamentName", tournament.name);
  setValue(
    "tournamentDescription",
    tournament.description
  );
  setValue(
    "tournamentBannerUrl",
    tournament.bannerUrl || ""
  );
  setValue(
    "tournamentAccentColour",
    tournament.accentColour || "#6d5dfc"
  );

}

function renderBranding() {
  const tournament = getTournament();
  const accentColour =
    tournament.accentColour || "#6d5dfc";

  document.documentElement.style.setProperty(
    "--accent",
    accentColour
  );

  const headerLogo = getElement("headerLogo");

  if (headerLogo) {
    if (tournament.bannerUrl) {
      headerLogo.hidden = false;
      headerLogo.innerHTML = `
        <img
          src="${escapeHtml(tournament.bannerUrl)}"
          alt="${escapeHtml(
            tournament.name || "PHDlympics"
          )} banner"
        />
      `;
    } else {
      headerLogo.hidden = true;
      headerLogo.innerHTML = "";
    }
  }
}

function renderTournamentSummary() {
  const tournament = getTournament();

  setText(
    "summaryName",
    tournament.name || "Untitled Tournament"
  );

  setText(
    "summaryDescription",
    tournament.description ||
      "No description yet."
  );


  setText(
    "summaryTeams",
    PHDTournament.state.teams.length
  );

  setText(
    "summaryGames",
    getGames().length
  );

  setText(
    "summaryRounds",
    PHDTournament.state.rounds.length
  );

  setText(
    "summaryBranding",
    tournament.bannerUrl
      ? "Custom branding active"
      : "Default"
  );
}

function getGameTabName(game) {
  return `game-${game.id}`;
}

const GAME_MODE_OVERVIEWS = {
  swiss: {
    summary:
      "Teams face similarly ranked opponents over a series of rounds.",
    steps: [
      ["Generate round", "Pair teams by current ranking"],
      ["Play matches", "Each pair completes one match"],
      ["Enter scores", "Record every result in the round"],
      ["Re-rank", "Update the ladder and repeat"]
    ],
    exampleHeaders: ["Match", "Example result"],
    exampleRows: [
      ["Sydney vs Melbourne", "Sydney wins 3–1"],
      ["Brisbane vs Auckland", "Draw 2–2"]
    ],
    note:
      "After each round, teams with similar records are paired together. No team is eliminated; the final ladder awards tournament points."
  },
  "round-robin": {
    summary:
      "Every team plays every other team once.",
    steps: [
      ["Create schedule", "Generate every required pairing"],
      ["Play matches", "Complete the full schedule"],
      ["Enter scores", "Track wins, draws and losses"],
      ["Complete", "Use the final ladder for points"]
    ],
    exampleHeaders: ["Team", "Scheduled opponents"],
    exampleRows: [
      ["Sydney", "Melbourne, Brisbane, Auckland"],
      ["Melbourne", "Sydney, Brisbane, Auckland"]
    ],
    note:
      "Every team plays every other team once. The completed win-loss ladder determines the final tournament points."
  },
  "single-elimination": {
    summary:
      "Match winners advance through a knockout bracket.",
    steps: [
      ["Create bracket", "Generate opening matchups"],
      ["Play matches", "Each pair plays a decider"],
      ["Advance winners", "Winning teams move forward"],
      ["Play final", "Crown the tournament winner"]
    ],
    exampleHeaders: ["Stage", "Example"],
    exampleRows: [
      ["Semifinals", "Sydney and Brisbane advance"],
      ["Final", "Sydney vs Brisbane"]
    ],
    note:
      "Opening-round byes may be used when the entrant count does not fill a complete bracket."
  },
  "four-player-swiss": {
    summary:
      "Teams compete in ranked groups of four without elimination.",
    steps: [
      ["Create groups", "Split teams into groups of four"],
      ["Play round", "All four compete together"],
      ["Enter places", "Record 1st through 4th"],
      ["Re-rank", "Build the next ranked groups"]
    ],
    exampleHeaders: ["Placement", "Example team"],
    exampleRows: [
      ["1st", "Sydney"],
      ["2nd", "Melbourne"],
      ["3rd", "Brisbane"],
      ["4th", "Auckland"]
    ],
    note:
      "Every team plays in each round. New groups use the updated rankings, then closing the tournament converts the final order into points."
  },
  "time-trial": {
    summary:
      "Every team records a time; the fastest completed run ranks first.",
    steps: [
      ["Attempt", "Each team completes the challenge"],
      ["Record time", "Enter minutes and seconds"],
      ["Rank times", "Fastest valid time leads"],
      ["Complete", "Lock results and award points"]
    ],
    exampleHeaders: ["Rank", "Team", "Time", "Points"],
    exampleRows: [
      ["1st", "Sydney", "1:08", "4"],
      ["2nd", "Melbourne", "1:12", "3"],
      ["3rd", "Brisbane", "1:17", "2"],
      ["4th", "Auckland", "1:24", "1"]
    ],
    note:
      "The event completes after every team has a valid whole-second time."
  },
  "grand-prix": {
    summary:
      "All teams compete together and receive a final finishing position.",
    steps: [
      ["Compete", "All teams play in one event"],
      ["Record results", "Enter a unique place for each team"],
      ["Confirm ranking", "Order the table from 1st to last"],
      ["Complete", "Lock results and award points"]
    ],
    exampleHeaders: ["Finish", "Team", "Points"],
    exampleRows: [
      ["1st", "Sydney", "4"],
      ["2nd", "Melbourne", "3"],
      ["3rd", "Brisbane", "2"],
      ["4th", "Auckland", "1"]
    ],
    note:
      "Last place receives 1 point and each higher position receives one more. Points are added only when the game is completed."
  },
  "fall-guys-grand-prix": {
    summary:
      "Offices score across multiple heats, with their best player results counting.",
    steps: [
      ["Play heat", "Players from every office compete"],
      ["Record outcomes", "Enter places and qualifications"],
      ["Score offices", "Count the best player results"],
      ["Repeat and close", "Confirm the final office ranking"]
    ],
    exampleHeaders: ["Player outcome", "Heat points"],
    exampleRows: [
      ["1st", "10"],
      ["2nd", "8"],
      ["3rd", "6"],
      ["4th", "5"],
      ["Qualified", "3"],
      ["Participated", "1"]
    ],
    note:
      "Multiple players may enter, but only the configured number of best results count for each office."
  }
};

const GAME_MODE_DETAILS = {
  swiss: [
    ["Confirm entrants", "Enter each office's competitor count on the game page. Offices with competitors become eligible for this game."],
    ["Generate the opening round", "Select Generate Round. The first round creates one-versus-one pairings and assigns a bye when the field has an odd number of offices."],
    ["Play every match", "Each paired office plays its scheduled opponent. A bye is recorded automatically and does not require a score."],
    ["Enter the scores", "Record both offices' scores for every match. The round must be complete before another round can be generated."],
    ["Update the Swiss ladder", "The ladder ranks offices by match points, then score difference and points scored. Nobody is eliminated."],
    ["Generate the next round", "The next round pairs offices with similar records while avoiding repeat opponents where possible and rotating byes."],
    ["Finish the game", "Repeat for the planned number of rounds, then mark the game complete so its final ranking can contribute to the overall tournament standings."],
    ["Allocate tournament points", "Last place receives 1 overall tournament point and every higher position receives one additional point." ]
  ],
  "round-robin": [
    ["Confirm entrants", "Enter each office's competitor count. Every eligible office is included in the schedule."],
    ["Create the schedule", "Generate the round-robin schedule. The website creates every required pairing so each office plays every other office once."],
    ["Handle odd fields", "If there is an odd number of offices, one office receives a bye in each applicable round."],
    ["Play the matches", "Offices play the scheduled one-versus-one matches across the generated rounds."],
    ["Enter every score", "Record both offices' scores. Completed results update wins, draws, losses, points scored and score difference."],
    ["Complete the schedule", "Continue until every generated pairing has a result. The final ladder represents the Round Robin finishing order."],
    ["Complete the game", "Lock the finished game once the schedule has been played and checked."],
    ["Allocate tournament points", "The final ladder is converted into overall tournament points, with last receiving 1 and each higher position receiving one more." ]
  ],
  "single-elimination": [
    ["Confirm entrants", "Enter the participating offices on the game page before creating the bracket."],
    ["Create the opening bracket", "Generate the first knockout round. The bracket is padded as needed, so some offices may receive an opening-round bye."],
    ["Play each knockout match", "Each pairing plays a deciding match. A winner is required because a drawn result cannot advance an office."],
    ["Enter and confirm scores", "Record the score for each match. The winning office is identified from the completed result."],
    ["Advance the winners", "Once the round is complete, generate the next round using only the winning offices."],
    ["Repeat until the final", "Continue through each knockout stage. Offices that lose do not play another round in this game."],
    ["Play the championship match", "The final winner becomes the game champion and the other finalist becomes runner-up."],
    ["Complete the game", "Lock the bracket after the final so the resulting order can be reflected in the tournament records and standings."],
    ["Allocate tournament points", "The completed knockout results produce the game ranking used by the overall tournament standings." ]
  ],
  "four-player-swiss": [
    ["Enter competitor counts", "Set the number of players for each office. Multiple players from one office are labelled Player A, Player B and so on."],
    ["Build complete lobbies", "The total number of competitors must be a multiple of four. The website keeps office console groups together while creating four-player lobbies."],
    ["Generate Round 1", "The opening round creates groups of four players. No player or office is eliminated."],
    ["Play each group", "All four players compete together and finish in 1st, 2nd, 3rd and 4th place."],
    ["Enter placements", "Assign every player a unique placement within their lobby. Round points are 4 for 1st, 3 for 2nd, 2 for 3rd and 1 for 4th."],
    ["Re-rank the field", "Completed groups update the Swiss ladder. Ties use firsts, seconds, thirds and opponent strength."],
    ["Generate the next round", "The next set of four-player lobbies is built from the updated rankings. Complete the current round before generating another."],
    ["Close the tournament", "After all desired rounds are complete, close the game. Final place becomes overall tournament points: last receives 1 and each higher place receives one more." ]
  ],
  "time-trial": [
    ["Confirm entrants", "Enter a competitor count for every office taking part in the Time Trial."],
    ["Run the challenge", "Each office completes the same course, lap or challenge under the agreed tournament conditions."],
    ["Record the result", "Enter each office's best valid time using minutes and seconds only."],
    ["Save provisional times", "The table automatically reorders as valid times are entered, with the fastest office at the top."],
    ["Complete every office", "The event cannot be finalised until every participating office has a valid recorded time."],
    ["Review the ranking", "Lower times rank ahead of higher times. Check the complete fastest-to-slowest order before locking it."],
    ["Complete the event", "Mark the Time Trial complete to lock the results and reveal the final ranking."],
    ["Allocate tournament points", "Last place receives 1 overall tournament point and every faster position receives one additional point." ]
  ],
  "grand-prix": [
    ["Enter competitor counts", "Set how many players each office is entering. Multiple players are labelled by office as Player A, Player B and so on."],
    ["Review the lobby plan", "The website uses the configured console and lobby capacities to split entrants into suitable lobbies when required."],
    ["Play the race or event", "Every listed player competes in their allocated lobby and receives a finishing position."],
    ["Enter player positions", "Record each player's finishing position. Separate lobbies may each have their own 1st, 2nd, 3rd and later places."],
    ["Calculate office results", "Each player earns lobby points from their finishing position. Those points are added for their office, with its best individual finish used as the first tie-break."],
    ["Review the animated ranking", "As positions are entered, the table reorders to show the current finishing order from first to last."],
    ["Complete the event", "When every required result is present, complete the Grand Prix to lock its final ranking."],
    ["Allocate tournament points", "Last place receives 1 overall tournament point and every higher-ranked office receives one additional point." ]
  ],
  "fall-guys-grand-prix": [
    ["Enter competitor counts", "Set how many players each office is entering and confirm that the configured lobby can hold the participating field."],
    ["Configure the series", "Choose the number of planned heats and how many of each office's best player results will count per heat."],
    ["Add a heat", "Create Heat 1, then put all participating players into the Fall Guys lobby. Nobody is eliminated from the overall series."],
    ["Play the heat", "Run the agreed Fall Guys show and record each player's outcome for their office."],
    ["Enter outcomes", "Award 10 points for 1st, 8 for 2nd, 6 for 3rd, 5 for 4th, 3 for Qualified and 1 for Participated. Only one player can occupy each of 1st through 4th in a heat."],
    ["Calculate office heat scores", "The website keeps only the configured number of best results for each office. For example, if three count, results worth 10, 6, 3 and 1 produce a 19-point heat score."],
    ["Complete the heat", "Every participating office needs at least one recorded outcome. Save the valid results to update the live office standings."],
    ["Repeat all planned heats", "Add the next heat only after the current one is complete. Every office returns for every heat."],
    ["Rank the offices", "Completed heats are totalled. Ties are separated by wins, podiums and qualifications."],
    ["Close and allocate points", "After every planned heat is complete, close the series. Last place receives 1 overall tournament point and every higher place receives one more." ]
  ]
};

const GAME_MODE_DIAGRAMS = {
  swiss: [
    ["Round 1", [["Opening pairings", ["Sydney vs Melbourne", "Brisbane vs Auckland"]]]],
    ["After Round 1", [
      ["1-0 teams", ["Winner M1", "Winner M2"], "advance"],
      ["0-1 teams", ["Other team M1", "Other team M2"], "warning"]
    ]],
    ["Round 2", [["Ranked pairings", ["1-0 vs 1-0", "0-1 vs 0-1"]]]],
    ["Final ladder", [
      ["Tournament points", ["1st - 4 pts", "2nd - 3 pts"], "advance"],
      ["Remaining teams", ["3rd - 2 pts", "4th - 1 pt"]]
    ]]
  ],
  "round-robin": [
    ["Teams", [["Every team enters", ["Sydney", "Melbourne", "Brisbane", "Auckland"]]]],
    ["Create schedule", [["All pairings", ["Each team plays every other team once"]]]],
    ["Build ladder", [["Match records", ["1st: 3-0", "2nd: 2-1", "3rd: 1-2", "4th: 0-3"]]]],
    ["Complete", [["Tournament points", ["1st 4 pts", "2nd 3 pts", "3rd 2 pts", "4th 1 pt"], "advance"]]]
  ],
  "single-elimination": [
    ["Semifinals", [
      ["Match 1", ["Sydney 3 - 1 Melbourne"]],
      ["Match 2", ["Brisbane 2 - 0 Auckland"]]
    ]],
    ["Advance", [
      ["Winners", ["Winner M1", "Winner M2"], "advance"],
      ["Eliminated", ["Other team M1", "Other team M2"], "eliminated"]
    ]],
    ["Grand final", [["Championship match", ["Winner M1 vs Winner M2"]]]],
    ["Champion", [
      ["Winner", ["Final winner"], "advance"],
      ["Runner-up", ["Final runner-up"]]
    ]]
  ],
  "four-player-swiss": [
    ["Round 1 groups", [
      ["Group A", ["Sydney", "Melbourne", "Brisbane", "Auckland"]],
      ["Group B", ["Perth", "Adelaide", "Canberra", "Hobart"]]
    ]],
    ["Enter placements", [
      ["Group A result", ["1st", "2nd", "3rd", "4th"]],
      ["Group B result", ["1st", "2nd", "3rd", "4th"]]
    ]],
    ["Re-rank", [
      ["Top-ranked group", ["A1", "B1", "A2", "B2"], "advance"],
      ["Next-ranked group", ["A3", "B3", "A4", "B4"]]
    ]],
    ["Overall Tournament Points Allocated", [["Final points", ["1st - 8 pts", "2nd - 7 pts", "...", "8th - 1 pt"], "advance"]]]
  ],
  "time-trial": [
    ["Attempts", [["Complete the course", ["Sydney", "Melbourne", "Brisbane", "Auckland"]]]],
    ["Record times", [["Minutes : seconds", ["Run A 1:08", "Run B 1:12", "Run C 1:17", "Run D 1:24"]]]],
    ["Live ranking", [["Fastest to slowest", ["1 Run A", "2 Run B", "3 Run C", "4 Run D"], "advance"]]],
    ["Overall Tournament Points Allocated", [["Tournament points", ["1st 4 pts", "2nd 3 pts", "3rd 2 pts", "4th 1 pt"], "advance"]]]
  ],
  "grand-prix": [
    ["Starting field", [["All teams compete", ["Sydney", "Melbourne", "Brisbane", "Auckland"]]]],
    ["Finish order", [["Enter placements", ["1st place", "2nd place", "3rd place", "4th place"]]]],
    ["Points scale", [["Reverse position", ["1st = 4 pts", "2nd = 3 pts", "3rd = 2 pts", "4th = 1 pt"]]]],
    ["Overall Tournament Points Allocated", [["Overall standings update", ["Winner +4", "Runner-up +3", "3rd +2", "4th +1"], "advance"]]]
  ],
  "fall-guys-grand-prix": [
    ["Play heat", [["Office players", ["Sydney - Players A & B", "Melbourne - Players A & B", "Brisbane - Players A & B", "Auckland - Players A & B"]]]],
    ["Player outcomes", [["Example result", ["Player A - 1st", "Player B - 3rd", "Player C - qualified", "Player D - played"]]]],
    ["Heat points", [
      ["Scoring", ["1st 10 pts", "3rd 6 pts", "Qualified 3 pts", "Played 1 pt"]],
      ["Best results count", ["Office 1 - 13 pts", "Office 2 - 7 pts"], "advance"]
    ]],
    ["Overall Tournament Points Allocated", [["Final rank sets overall points", ["Last office = 1 pt", "Each place higher = +1 pt", "1st = number of offices pts", "Added to overall standings"], "advance"]]]
  ]
};

function getCurrentTeamExampleNames() {
  const currentNames = (
    PHDTournament.state.teams || []
  )
    .map(team =>
      String(team.name || "").trim()
    )
    .filter(Boolean);

  return Array.from(
    { length: 8 },
    (_, index) =>
      currentNames[index] ||
      `Team ${index + 1}`
  );
}

function personaliseGameModeDiagram(diagram) {
  const placeholders = [
    "Sydney",
    "Melbourne",
    "Brisbane",
    "Auckland",
    "Perth",
    "Adelaide",
    "Canberra",
    "Hobart"
  ];
  const teamNames =
    getCurrentTeamExampleNames();
  const teamPlaceholderPattern =
    new RegExp(
      placeholders.join("|"),
      "g"
    );

  const replaceTeamNames = value =>
    value.replace(
      teamPlaceholderPattern,
      placeholder =>
        teamNames[
          placeholders.indexOf(placeholder)
        ]
    );

  return diagram.map(
    ([stage, groups]) => [
      stage,
      groups.map(
        ([title, lines, tone]) => [
          title,
          lines.map(replaceTeamNames),
          tone
        ]
      )
    ]
  );
}

function renderGameModeOverview(
  game,
  mode
) {
  const overview =
    GAME_MODE_OVERVIEWS[mode] ||
    GAME_MODE_OVERVIEWS.swiss;
  const diagram =
    personaliseGameModeDiagram(
      GAME_MODE_DIAGRAMS[mode] ||
      GAME_MODE_DIAGRAMS.swiss
    );
  const detailedSteps =
    GAME_MODE_DETAILS[mode] ||
    GAME_MODE_DETAILS.swiss;
  const modeName =
    window.PHDGameModes &&
    typeof window.PHDGameModes
      .getForGame === "function"
      ? window.PHDGameModes
          .getForGame(game)
          .displayName
      : "Game mode";

  return `
    <section class="card wide game-mode-overview">
      <div class="section-heading">
        <div>
          <p class="eyebrow">How it works</p>
          <h2>
            ${escapeHtml(modeName)} at a glance
          </h2>
          <p class="muted">
            ${escapeHtml(overview.summary)}
          </p>
        </div>
      </div>

      <div class="game-mode-infographic">
        <div
          class="game-mode-diagram"
          role="img"
          aria-label="${escapeHtml(
            `${modeName} example flow from start to final result`
          )}"
        >
          ${diagram
            .map(
              ([stage, groups], index) => `
                <section class="game-mode-stage">
                  <div class="game-mode-stage-heading">
                    <span>${index + 1}</span>
                    <strong>${escapeHtml(stage)}</strong>
                  </div>
                  <div class="game-mode-stage-groups">
                    ${groups
                      .map(
                        ([title, lines, tone]) => `
                          <div class="game-mode-node${
                            tone
                              ? ` is-${escapeHtml(tone)}`
                              : ""
                          }">
                            <strong>
                              ${escapeHtml(title)}
                            </strong>
                            ${lines
                              .map(
                                line => `
                                  <span>
                                    ${escapeHtml(line)}
                                  </span>
                                `
                              )
                              .join("")}
                          </div>
                        `
                      )
                      .join("")}
                  </div>
                </section>
              `
            )
            .join("")}
        </div>

        <p class="game-mode-note">
          ${escapeHtml(overview.note)}
        </p>
      </div>

      <div class="game-mode-detailed" hidden>
        <ol class="game-mode-detailed-steps">
          ${detailedSteps
            .map(
              ([title, explanation]) => `
                <li>
                  <strong>${escapeHtml(title)}</strong>
                  <p>${escapeHtml(explanation)}</p>
                </li>
              `
            )
            .join("")}
        </ol>
      </div>
    </section>
  `;
}

const collapsedGameFeatures = new Set();
const detailedGameModeFeatures = new Set();
const initialisedAdminFeatures = new Set();

function enhanceCollapsibleGameFeatures() {
  document
    .querySelectorAll(
      '.tab-panel[id^="game-"] > .app-layout > .card, #adminTab > .app-layout > .card'
    )
    .forEach((card, index) => {
      if (
        card.querySelector(
          ":scope > .feature-controls"
        )
      ) {
        return;
      }

      if (
        card.querySelector(
          ":scope > .game-tab-header"
        )
      ) {
        return;
      }

      const tab = card.closest(
        ".tab-panel"
      );
      const heading = card.querySelector(
        "h2, h3, h4"
      );
      const featureKey = `${
        tab ? tab.id : "game"
      }:${index}:${
        heading
          ? heading.textContent.trim()
          : "feature"
      }`;
      const isAdminFeature =
        Boolean(
          card.closest("#adminTab")
        );

      if (
        isAdminFeature &&
        !initialisedAdminFeatures.has(
          featureKey
        )
      ) {
        initialisedAdminFeatures.add(
          featureKey
        );
        collapsedGameFeatures.add(
          featureKey
        );
      }
      const collapsed =
        collapsedGameFeatures.has(
          featureKey
        );
      const detailed =
        detailedGameModeFeatures.has(
          featureKey
        );
      const controls =
        document.createElement("div");
      const button =
        document.createElement(
          "button"
        );

      card.classList.add(
        "collapsible-game-feature"
      );
      card.classList.toggle(
        "is-collapsed",
        collapsed
      );
      card.dataset.featureKey =
        featureKey;
      controls.className =
        "feature-controls";

      if (
        card.classList.contains(
          "game-mode-overview"
        )
      ) {
        const detailButton =
          document.createElement(
            "button"
          );
        const infographic =
          card.querySelector(
            ".game-mode-infographic"
          );
        const detailedView =
          card.querySelector(
            ".game-mode-detailed"
          );

        detailButton.type = "button";
        detailButton.className =
          "game-mode-detail-button secondary";
        detailButton.dataset.gameModeDetail =
          "true";
        detailButton.setAttribute(
          "aria-pressed",
          String(detailed)
        );
        detailButton.setAttribute(
          "aria-label",
          detailed
            ? `Show infographic version of ${heading ? heading.textContent.trim() : "game mode instructions"}`
            : `Show detailed version of ${heading ? heading.textContent.trim() : "game mode instructions"}`
        );
        detailButton.textContent = detailed
          ? "Show infographic version"
          : "Show me detailed version";
        if (infographic) {
          infographic.hidden = detailed;
        }
        if (detailedView) {
          detailedView.hidden = !detailed;
        }
        controls.appendChild(
          detailButton
        );
      }

      button.type = "button";
      button.className =
        "feature-collapse-button secondary";
      button.dataset.featureCollapse =
        "true";
      button.setAttribute(
        "aria-expanded",
        String(!collapsed)
      );
      button.setAttribute(
        "aria-label",
        `${collapsed ? "Expand" : "Collapse"} ${
          heading
            ? heading.textContent.trim()
            : "section"
        }`
      );
      button.textContent = collapsed
        ? "Expand"
        : "Collapse";
      controls.appendChild(button);
      card.appendChild(controls);
    });
}

function getMatchesForGame(gameId) {
  return PHDTournament.state.rounds.flatMap(
    round =>
      round.matches
        .filter(
          match =>
            !match.bye &&
            match.gameId === gameId
        )
        .map(match => ({
          ...match,
          roundNumber: round.number
        }))
  );
}

function getStaticTabs() {
  return [
    "home",
    "admin",
    "games",
    "standings",
    "reports",
    "display"
  ];
}

function gameHasGeneratedData(game) {
  if (!game) return false;

  return PHDTournament.state.rounds.some(
    round =>
      round.gameId === game.id ||
      (round.matches || []).some(
        match => match.gameId === game.id
      )
  ) ||
    PHDTournament.state.events.some(
      event => event.gameId === game.id
    ) ||
    Boolean(
      game.fourPlayerSwiss &&
      (game.fourPlayerSwiss.rounds || []).length
    ) ||
    Boolean(
      game.fallGuysGrandPrix &&
      (game.fallGuysGrandPrix.heats || []).length
    );
}

function canEditGameEntry(teamId, locked) {
  if (locked) return false;
  if (
    typeof isTournamentAdmin === "function" &&
    isTournamentAdmin()
  ) {
    return true;
  }

  return typeof canManageTeamResult === "function" &&
    canManageTeamResult(teamId);
}

function getGameLobbyAllocation(game) {
  const validation =
    window.PHDGameCapacity
      .getEntryValidation(
        game,
        PHDTournament.state.teams
      );

  if (!validation.valid) {
    return {
      valid: false,
      error: validation.errors.join(" "),
      lobbies: []
    };
  }

  return window.PHDGameCapacity
    .allocateLobbies({
      entries:
        window.PHDGameCapacity
          .getActiveEntries(
            game,
            PHDTournament.state.teams
          ),
      maxPlayersPerLobby:
        game.mode === "four-player-swiss"
          ? Math.min(
              4,
              validation.capacity
                .maxPlayersPerLobby
            )
          : validation.capacity
              .maxPlayersPerLobby
    });
}

function renderGameCapacityManagement(game) {
  const capacity =
    window.PHDGameCapacity
      .normaliseCapacity(game.capacity);
  const entries =
    window.PHDGameCapacity
      .normaliseCompetitorEntries(
        game.competitorEntries
      );
  const locked =
    gameHasGeneratedData(game) ||
    Boolean(game.completed);
  const allocation =
    getGameLobbyAllocation(game);
  const usesLobbies =
    window.PHDGameCapacity
      .modeUsesLobbyAllocation(
        game.mode
      );
  const lobbyHtml = !allocation.valid
    ? `<div class="capacity-warning">${escapeHtml(allocation.error)}</div>`
    : allocation.empty
      ? `<div class="empty-state">No competitors entered. Lobby allocation is pending.</div>`
      : usesLobbies
        ? `<div class="lobby-preview-grid">
            ${allocation.lobbies.map(lobby => `
              <article class="lobby-preview-card">
                <strong>${escapeHtml(lobby.name)} - ${lobby.competitorTotal} competitors</strong>
                <span>${lobby.entries.map(entry =>
                  `${escapeHtml(entry.officeName)} (${entry.competitorCount})`
                ).join(", ")}</span>
              </article>
            `).join("")}
          </div>`
        : `<div class="empty-state">
            ${escapeHtml(getGameModeLabel(game))} records office entries but does not use shared simultaneous lobbies.
          </div>`;

  return `
    <section class="card wide game-capacity-management" data-capacity-game-id="${game.id}">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Participation & Capacity</p>
          <h2>Console Entries and Lobbies</h2>
          <p class="muted">
            ${capacity.maxPlayersPerConsole} per console / ${capacity.maxPlayersPerLobby} per lobby
          </p>
        </div>
        <div>
          <strong class="big-number">${allocation.totalCompetitors || 0}</strong>
          <span class="muted">entered competitors</span>
        </div>
      </div>

      ${!capacity.configured ? `
        <div class="capacity-warning">
          This legacy game uses conservative fallback capacity. An administrator should confirm its capacity on the Games page before generating results.
        </div>
      ` : ""}

      ${locked ? `
        <div class="capacity-warning">
          Entries are locked because rounds or results already exist. Clear the generated game data before changing participation.
        </div>
      ` : ""}

      <div class="table-wrap">
        <table class="game-entry-table">
          <thead>
            <tr><th>Team</th><th>Competitors</th></tr>
          </thead>
          <tbody>
            ${PHDTournament.state.teams.map(team => {
              const value = Number(entries[team.id]) || 0;
              const editable = canEditGameEntry(team.id, locked);
              return `
                <tr data-team-id="${team.id}">
                  <td><strong>${escapeHtml(team.name)}</strong></td>
                  <td>
                    ${editable ? `
                      <select data-competitor-team-id="${team.id}">
                        ${Array.from(
                          { length: capacity.maxPlayersPerConsole + 1 },
                          (_, count) => `<option value="${count}" ${count === value ? "selected" : ""}>${count}</option>`
                        ).join("")}
                      </select>
                    ` : `<span>${value}</span>`}
                  </td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      </div>

      ${!locked && PHDTournament.state.teams.some(team => canEditGameEntry(team.id, false)) ? `
        <button class="save-game-entries" type="button" data-game-id="${game.id}">
          Save Competitor Entries
        </button>
      ` : ""}

      <div class="game-capacity-grid">
        <div><strong>${allocation.lobbyCount || 0}</strong><span class="muted"> required lobbies</span></div>
      </div>
      ${lobbyHtml}
    </section>
  `;
}

async function saveGameCompetitorEntries(gameId, section) {
  const game = getGameById(gameId);
  if (!game || !section || gameHasGeneratedData(game)) {
    alert("Competitor entries cannot be changed after rounds or results have been generated.");
    return;
  }

  const previous = structuredClone(
    game.competitorEntries || {}
  );
  const next = {
    ...previous
  };

  section.querySelectorAll("[data-competitor-team-id]").forEach(select => {
    const teamId = select.dataset.competitorTeamId;
    if (!canEditGameEntry(teamId, false)) return;
    next[teamId] = Number(select.value);
  });

  game.competitorEntries = next;
  const validation =
    window.PHDGameCapacity
      .getEntryValidation(
        game,
        PHDTournament.state.teams
      );
  if (!validation.valid) {
    game.competitorEntries = previous;
    alert(validation.errors.join("\n"));
    return;
  }

  await saveState();

  if (typeof recordAuditEntry === "function") {
    await recordAuditEntry(
      "game.competitor-entries.updated",
      `Updated competitor entries for ${game.name}.`,
      {
        gameId,
        previous,
        current: structuredClone(next),
        allocation: getGameLobbyAllocation(game)
      }
    );
  }

  render();
}

function renderGameTabs() {
  const buttonContainer =
    getElement("gameTabButtons");

  const panelContainer =
    getElement("gameTabPanels");

  if (!buttonContainer || !panelContainer) {
    return;
  }

  const games = getGames();

  buttonContainer.innerHTML = games.length
    ? games
        .map(
          game => `
            <button
              class="tab-button game-tab-button"
              type="button"
              data-tab="${getGameTabName(game)}"
            >
              ${escapeHtml(game.name)}
            </button>
          `
        )
        .join("")
    : `
        <span class="sidebar-empty">
          No games yet
        </span>
      `;

  panelContainer.innerHTML = games
    .map(game => {
      const mode =
        game.mode || "swiss";
      const matches =
        getMatchesForGame(game.id);
      const visibleMatches =
        typeof isTeamScopedStaff ===
          "function" &&
        isTeamScopedStaff() &&
        !game.completed
          ? matches.filter(
              match =>
                match.teamAId ===
                  getAssignedStaffTeamId() ||
                match.teamBId ===
                  getAssignedStaffTeamId()
            )
          : matches;

      const completedMatches =
        visibleMatches.filter(
          match => match.completed
        );

      const matchRows =
        visibleMatches.length
        ? visibleMatches
            .map(match => {
              const teamA =
                getTeamById(match.teamAId);

              const teamB =
                getTeamById(match.teamBId);

              return `
                <div class="game-tab-match">
                  <span>
                    Round ${match.roundNumber}
                  </span>

                  <strong>
                    ${escapeHtml(
                      teamA
                        ? teamA.name
                        : "Unknown"
                    )}
                  </strong>

                  <span>
                    ${
                      match.completed
                        ? `${match.scoreA} - ${match.scoreB}`
                        : "vs"
                    }
                  </span>

                  <strong>
                    ${escapeHtml(
                      teamB
                        ? teamB.name
                        : "Unknown"
                    )}
                  </strong>

                  <span
                    class="status-pill ${
                      match.completed
                        ? "completed"
                        : "open"
                    }"
                  >
                    ${
                      match.completed
                        ? "Completed"
                        : "Open"
                    }
                  </span>
                </div>
              `;
            })
            .join("")
        : `
            <div class="empty-state">
              No matches have been assigned
              to this game yet.
            </div>
          `;

      let resultEntryType = "";
      let managementHtml = "";

      try {
        const gameModeDefinition =
          window.PHDGameModes.get(mode);
        resultEntryType =
          gameModeDefinition
            .getResultEntryType();

        managementHtml =
          resultEntryType ===
          "group-placements"
            ? renderFourPlayerSwissManagement(
                game
              )
            : resultEntryType ===
                "fall-guys-heats"
              ? window
                  .PHDFallGuysGrandPrix
                  .renderManagement(
                    game
                  )
              : resultEntryType ===
                  "match-score"
                ? renderSwissGameManagement(
                    game
                  )
                : renderEventGameManagement(
                    game
                  );
      } catch (error) {
        console.error(
          `Game page "${game.name}" could not be rendered.`,
          error
        );
        managementHtml = `
          <section class="card wide">
            <div class="empty-state">
              This game's management panel could not be loaded.
              Refresh the page or contact the tournament administrator.
            </div>
          </section>
        `;
      }

      const isMatchMode =
        resultEntryType ===
        "match-score";

      return `
        <section
          id="${getGameTabName(game)}Tab"
          class="tab-panel"
        >
          <div class="app-layout">
            <section class="card wide">
              <div class="game-tab-header">
                <div>
                  <p class="eyebrow">
                    Game Page
                  </p>

                  <h2>
                    ${escapeHtml(game.name)}
                  </h2>

                  <p class="muted">
                    ${escapeHtml(
                      game.platform ||
                        "No platform listed"
                    )}
                  </p>
                </div>

                ${
                  game.logoUrl
                    ? `
                      <span class="game-tab-logo">
                        <img
                          src="${escapeHtml(
                            game.logoUrl
                          )}"
                          alt="${escapeHtml(
                            game.name
                          )} logo"
                        />
                      </span>
                    `
                    : `
                      <span class="game-tab-logo">
                        ${escapeHtml(
                          game.name
                            .slice(0, 3)
                            .toUpperCase()
                        )}
                      </span>
                    `
                }
              </div>
            </section>

            ${renderGameModeOverview(
              game,
              mode
            )}

            ${renderGameCapacityManagement(game)}

            ${managementHtml}

            ${
              isMatchMode
                ? `
                  <section class="card">
                    <h3>Total Matches</h3>
                    <strong class="big-number">
                      ${visibleMatches.length}
                    </strong>
                  </section>

                  <section class="card">
                    <h3>Completed Matches</h3>
                    <strong class="big-number">
                      ${completedMatches.length}
                    </strong>
                  </section>

                  <section class="card wide">
                    <div class="section-heading">
                      <div>
                        <h2>
                          ${escapeHtml(game.name)}
                          Match Summary
                        </h2>
                        <p class="muted">
                          Results from this game's tournament rounds.
                        </p>
                      </div>
                    </div>
                    <div class="game-tab-match-list">
                      ${matchRows}
                    </div>
                  </section>
                `
                : ""
            }

          </div>
        </section>
      `;
    })
    .join("");
}

function renderChampionshipAndArchive() {
  const list = getElement("archiveList");
  if (list) {
    const archives = PHDTournament.state.archive || [];
    list.innerHTML = archives.length
      ? archives.map(item => `
          <li>
            <strong>${escapeHtml(item.tournament.name || "Tournament")}</strong>
            <span>${escapeHtml(new Date(item.archivedAt).toLocaleString())}</span>
          </li>
        `).join("")
      : '<li class="empty-state">No archived tournaments yet.</li>';
  }
}

async function archiveCurrentTournament() {
  if (!confirm("Archive the current tournament results?")) return;
  PHDTournament.state.archive.push(
    window.PHDTournamentLifecycle.createArchiveSnapshot(
      PHDTournament.state
    )
  );
  await saveState();
  render();
}

function render() {
  ensureStateShape();

  renderBranding();
  renderTournamentForm();
  renderTournamentSummary();
  renderChampionshipAndArchive();
  renderStatistics();
  renderGames();
  renderGameTabs();
  renderTeams();
  if (
    typeof renderStaffManagement ===
      "function"
  ) {
    renderStaffManagement();
  }

if (
  typeof renderTeamPages ===
  "function"
) {
  renderTeamPages();
}
getGames()
  .filter(
    game =>
      window.PHDGameModes
        .getForGame(game)
        .getResultEntryType() ===
      "match-score"
  )
  .forEach(game => {
    renderRounds(game.id);
  });
renderStandings();
  renderMatchHistory();
  renderRecentActivityTicker();
  renderReportPreview();

  if (
    document.body.classList.contains(
      "display-active"
    )
  ) {
    renderDisplayMode();
  }

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }

  enhanceCollapsibleGameFeatures();

  restoreValidActiveTab();
}

function requireAdminForAction() {
  if (
    typeof isTournamentAdmin ===
      "function" &&
    isTournamentAdmin()
  ) {
    return true;
  }

  const authStatus =
    getElement("authStatus");

  if (authStatus) {
    authStatus.textContent =
      "Administrator access is required to make that change.";

    authStatus.classList.add("error");
  }

  return false;
}

function requireTeamManagementForAction() {
  if (
    typeof canTournament ===
      "function" &&
    (
      canTournament(
        "tournament.manage"
      ) ||
      canTournament(
        "results.manage"
      )
    )
  ) {
    return true;
  }

  const authStatus =
    getElement("authStatus");

  if (authStatus) {
    authStatus.textContent =
      "Staff access is required to manage teams.";
    authStatus.classList.add("error");
  }

  return false;
}

function getTournamentAuditDetails(
  tournament
) {
  return {
    name:
      tournament.name || "",
    description:
      tournament.description || "",
    logoUrl:
      tournament.logoUrl || "",
    bannerUrl:
      tournament.bannerUrl || "",
    accentColour:
      tournament.accentColour ||
      "#6d5dfc",
    settings: {}
  };
}

function getTournamentChanges(
  previousTournament,
  updatedTournament
) {
  const changes = {};

  [
    "name",
    "description",
    "logoUrl",
    "bannerUrl",
    "accentColour"
  ].forEach(field => {
    const previousValue =
      previousTournament[field] || "";

    const updatedValue =
      updatedTournament[field] || "";

    if (
      previousValue !== updatedValue
    ) {
      changes[field] = {
        from: previousValue,
        to: updatedValue
      };
    }
  });

  return changes;
}

function previewTournamentBranding() {
  if (!requireAdminForAction()) {
    return;
  }

  const tournament = getTournament();

  tournament.bannerUrl =
    getValue(
      "tournamentBannerUrl"
    ).trim();

  tournament.accentColour =
    getValue(
      "tournamentAccentColour"
    ) || "#6d5dfc";

  renderBranding();
}

async function updateTournamentSettings() {
  if (!requireAdminForAction()) {
    return;
  }

  const tournament = getTournament();

  const previousTournament =
    structuredClone(tournament);

  const name =
    getValue(
      "tournamentName"
    ).trim();

  tournament.name = isBlank(name)
    ? "Untitled Tournament"
    : name;

  tournament.description =
    getValue(
      "tournamentDescription"
    ).trim();

  tournament.bannerUrl =
    getValue(
      "tournamentBannerUrl"
    ).trim();

  tournament.accentColour =
    getValue(
      "tournamentAccentColour"
    ) || "#6d5dfc";

  const changes =
    getTournamentChanges(
      previousTournament,
      tournament
    );

  if (
    Object.keys(changes).length === 0
  ) {
    render();
    setSaveStatus(
      "No tournament changes"
    );
    return;
  }

  render();

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "tournament.updated",
        `Updated tournament settings for "${tournament.name}".`,
        {
          previous:
            getTournamentAuditDetails(
              previousTournament
            ),
          current:
            getTournamentAuditDetails(
              tournament
            ),
          changes
        }
      );
    }
  } catch (error) {
    console.error(
      "Tournament settings could not be saved.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "Tournament settings could not be saved."
    );
  }
}

function switchTab(tabName) {
  const validTabName =
    getValidTabName(tabName);

  const tabButtons =
    document.querySelectorAll(
      ".tab-button"
    );

  const tabPanels =
    document.querySelectorAll(
      ".tab-panel"
    );

  tabButtons.forEach(button => {
    const isActive =
      button.dataset.tab ===
      validTabName;

    button.classList.toggle(
      "active",
      isActive
    );

    button.setAttribute(
      "aria-selected",
      String(isActive)
    );
  });

  tabPanels.forEach(panel => {
    const expectedId =
      `${validTabName}Tab`;

    panel.classList.toggle(
      "active",
      panel.id === expectedId
    );
  });

  setMobileNavigationOpen(false);

  localStorage.setItem(
    "phdTournamentActiveTab",
    validTabName
  );
}

function setMobileNavigationOpen(open) {
  const sidebar = document.querySelector(
    ".app-sidebar"
  );
  const toggle = document.getElementById(
    "mobileNavigationToggle"
  );

  if (!sidebar || !toggle) return;

  sidebar.classList.toggle("nav-open", open);
  toggle.setAttribute(
    "aria-expanded",
    String(open)
  );
  toggle.setAttribute(
    "aria-label",
    open
      ? "Collapse navigation"
      : "Expand navigation"
  );
}

function getValidTabName(tabName) {
  if (
    tabName === "reports" &&
    (
      typeof getSignedInUser !==
        "function" ||
      !getSignedInUser()
    )
  ) {
    return "home";
  }

  if (
    ["admin", "games"].includes(
      tabName
    ) &&
    (
      typeof canTournament !==
        "function" ||
      !(
        canTournament(
          "tournament.manage"
        ) ||
        canTournament(
          "results.manage"
        )
      )
    )
  ) {
    return "home";
  }

  if (
    getStaticTabs().includes(tabName)
  ) {
    return tabName;
  }

  const matchingGame =
    getGames().find(
      game =>
        getGameTabName(game) ===
        tabName
    );

  if (matchingGame) {
    return tabName;
  }

  const teams =
    Array.isArray(
      PHDTournament.state.teams
    )
      ? PHDTournament.state.teams
      : [];

  const matchingTeam =
    teams.find(team => {
      const teamTabName =
        typeof getTeamPageTabName ===
        "function"
          ? getTeamPageTabName(team)
          : `team-${team.id}`;

      return teamTabName === tabName;
    });

  return matchingTeam
    ? tabName
    : "home";
}

function getSavedActiveTab() {
  return (
    localStorage.getItem(
      "phdTournamentActiveTab"
    ) || "home"
  );
}

function loadActiveTab() {
  switchTab(
    getValidTabName(
      getSavedActiveTab()
    )
  );
}

function restoreValidActiveTab() {
  const currentActiveButton =
    document.querySelector(
      ".tab-button.active"
    );

  const currentTab =
    currentActiveButton &&
    currentActiveButton.dataset.tab
      ? currentActiveButton.dataset.tab
      : getSavedActiveTab();

  switchTab(
    getValidTabName(currentTab)
  );
}

function bindTabEvents() {
  const tabNav =
    document.querySelector(
      ".tab-nav"
    );

  if (!tabNav) return;

  tabNav.addEventListener(
    "click",
    event => {
      const button =
        event.target.closest(
          ".tab-button"
        );

      if (!button) return;

      switchTab(
        button.dataset.tab
      );
    }
  );
}

function bindMobileNavigation() {
  bindClick(
    "mobileNavigationToggle",
    () => {
      const sidebar =
        document.querySelector(
          ".app-sidebar"
        );

      setMobileNavigationOpen(
        !sidebar.classList.contains(
          "nav-open"
        )
      );
    }
  );
}

let dashboardCarouselIndex = 0;
let dashboardCarouselTimer = null;

function setDashboardCarouselIndex(index) {
  const track = document.getElementById(
    "dashboardStatsTrack"
  );
  const status = document.getElementById(
    "dashboardCarouselStatus"
  );

  if (!track) return;

  const cards = [
    ...track.querySelectorAll(
      "[data-stat-card]"
    )
  ];

  if (!cards.length) return;

  dashboardCarouselIndex =
    (index + cards.length) % cards.length;
  track.style.setProperty(
    "--carousel-index",
    dashboardCarouselIndex
  );

  cards.forEach((card, cardIndex) => {
    const active =
      cardIndex === dashboardCarouselIndex;
    card.classList.toggle("is-active", active);
    card.setAttribute(
      "aria-hidden",
      String(!active)
    );
  });

  if (status) {
    status.textContent =
      `Statistic ${dashboardCarouselIndex + 1} of ${cards.length}`;
  }
}

function stopDashboardCarousel() {
  if (!dashboardCarouselTimer) return;

  clearInterval(dashboardCarouselTimer);
  dashboardCarouselTimer = null;
}

function startDashboardCarousel() {
  stopDashboardCarousel();

  if (
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  ) {
    return;
  }

  dashboardCarouselTimer = setInterval(
    () => setDashboardCarouselIndex(
      dashboardCarouselIndex + 1
    ),
    4500
  );
}

function bindDashboardCarousel() {
  const carousel = document.getElementById(
    "dashboardCarousel"
  );

  if (!carousel) return;

  bindClick(
    "dashboardCarouselPrevious",
    () => {
      setDashboardCarouselIndex(
        dashboardCarouselIndex - 1
      );
      startDashboardCarousel();
    }
  );
  bindClick(
    "dashboardCarouselNext",
    () => {
      setDashboardCarouselIndex(
        dashboardCarouselIndex + 1
      );
      startDashboardCarousel();
    }
  );

  carousel.addEventListener(
    "mouseenter",
    stopDashboardCarousel
  );
  carousel.addEventListener(
    "mouseleave",
    startDashboardCarousel
  );
  carousel.addEventListener(
    "focusin",
    stopDashboardCarousel
  );
  carousel.addEventListener(
    "focusout",
    event => {
      if (!carousel.contains(event.relatedTarget)) {
        startDashboardCarousel();
      }
    }
  );

  setDashboardCarouselIndex(0);
  startDashboardCarousel();
}

function bindTournamentEvents() {
  bindClick(
    "saveTournament",
    updateTournamentSettings
  );

  [
    "tournamentName",
    "tournamentDescription",
    "tournamentBannerUrl",
    "tournamentAccentColour"
  ].forEach(id => {
    bindChange(
      id,
      updateTournamentSettings
    );
  });

  [
    "tournamentBannerUrl",
    "tournamentAccentColour"
  ].forEach(id => {
    const element =
      getElement(id);

    if (!element) return;

    element.addEventListener(
      "input",
      previewTournamentBranding
    );
  });
}

function bindGameEvents() {
  bindClick("saveGame", () => {
    if (!requireAdminForAction()) {
      return;
    }

    saveGameFromForm();
    renderGameTabs();
    loadActiveTab();

    if (
      typeof applyAdminAccessState ===
      "function"
    ) {
      applyAdminAccessState();
    }
  });

  bindClick(
    "clearGameForm",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      clearGameForm();
    }
  );

  const gameNameInput =
    getElement("gameName");

  if (gameNameInput) {
    gameNameInput.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Enter" ||
          !requireAdminForAction()
        ) {
          return;
        }

        saveGameFromForm();
        renderGameTabs();
        loadActiveTab();
      }
    );
  }

  const gameList =
    getElement("gameList");

  if (gameList) {
    gameList.addEventListener(
      "click",
      event => {
        const gameId =
          event.target.dataset.gameId;

        if (!gameId) return;

        if (
          event.target.classList.contains(
            "edit-game"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          editGame(gameId);
          switchTab("games");
          return;
        }

        if (
          event.target.classList.contains(
            "delete-game"
          )
        ) {
          if (
            !requireAdminForAction()
          ) {
            return;
          }

          deleteGame(gameId);
          renderGameTabs();
          loadActiveTab();
        }
      }
    );
  }

  document.addEventListener(
    "click",
    event => {
      const button = event.target.closest(
        ".save-game-entries"
      );
      if (!button) return;

      saveGameCompetitorEntries(
        button.dataset.gameId,
        button.closest(
          ".game-capacity-management"
        )
      );
    }
  );

  document.addEventListener(
    "click",
    event => {
      const button = event.target.closest(
        "[data-feature-collapse]"
      );
      if (!button) return;

      const card = button.closest(
        ".collapsible-game-feature"
      );
      if (!card) return;

      const collapsed =
        !card.classList.contains(
          "is-collapsed"
        );
      card.classList.toggle(
        "is-collapsed",
        collapsed
      );
      if (collapsed) {
        collapsedGameFeatures.add(
          card.dataset.featureKey
        );
      } else {
        collapsedGameFeatures.delete(
          card.dataset.featureKey
        );
      }
      button.textContent = collapsed
        ? "Expand"
        : "Collapse";
      button.setAttribute(
        "aria-expanded",
        String(!collapsed)
      );
      const heading = card.querySelector(
        "h2, h3, h4"
      );
      button.setAttribute(
        "aria-label",
        `${collapsed ? "Expand" : "Collapse"} ${
          heading
            ? heading.textContent.trim()
            : "section"
        }`
      );
    }
  );

  document.addEventListener(
    "click",
    event => {
      const button = event.target.closest(
        "[data-game-mode-detail]"
      );
      if (!button) return;

      const card = button.closest(
        ".game-mode-overview"
      );
      if (!card) return;

      const detailed =
        button.getAttribute(
          "aria-pressed"
        ) !== "true";
      const infographic =
        card.querySelector(
          ".game-mode-infographic"
        );
      const detailedView =
        card.querySelector(
          ".game-mode-detailed"
        );

      if (infographic) {
        infographic.hidden = detailed;
      }
      if (detailedView) {
        detailedView.hidden = !detailed;
      }
      button.setAttribute(
        "aria-pressed",
        String(detailed)
      );
      button.textContent = detailed
        ? "Show infographic version"
        : "Show me detailed version";
      const heading = card.querySelector(
        "h2, h3, h4"
      );
      button.setAttribute(
        "aria-label",
        detailed
          ? `Show infographic version of ${heading ? heading.textContent.trim() : "game mode instructions"}`
          : `Show detailed version of ${heading ? heading.textContent.trim() : "game mode instructions"}`
      );

      if (detailed) {
        detailedGameModeFeatures.add(
          card.dataset.featureKey
        );
      } else {
        detailedGameModeFeatures.delete(
          card.dataset.featureKey
        );
      }

      if (
        card.classList.contains(
          "is-collapsed"
        )
      ) {
        card.classList.remove(
          "is-collapsed"
        );
        collapsedGameFeatures.delete(
          card.dataset.featureKey
        );
        const collapseButton =
          card.querySelector(
            "[data-feature-collapse]"
          );
        if (collapseButton) {
          collapseButton.textContent =
            "Collapse";
          collapseButton.setAttribute(
            "aria-expanded",
            "true"
          );
          collapseButton.setAttribute(
            "aria-label",
            `Collapse ${heading ? heading.textContent.trim() : "section"}`
          );
        }
      }
    }
  );
}

function bindTeamEvents() {
  bindClick("saveTeam", () => {
    if (!requireTeamManagementForAction()) {
      return;
    }

    saveTeamFromForm();
  });

  bindClick(
    "clearTeamForm",
    () => {
      if (!requireTeamManagementForAction()) {
        return;
      }

      clearTeamForm();
    }
  );

  const teamNameInput =
    getElement("teamName");

  if (teamNameInput) {
    teamNameInput.addEventListener(
      "keydown",
      event => {
        if (
          event.key !== "Enter" ||
          !requireTeamManagementForAction()
        ) {
          return;
        }

        saveTeamFromForm();
      }
    );
  }

  const teamList =
    getElement("teamList");

  if (teamList) {
    teamList.addEventListener(
      "click",
      event => {
        const teamId =
          event.target.dataset.teamId;

        if (!teamId) return;

        if (
          event.target.classList.contains(
            "edit-team"
          )
        ) {
          if (
            !requireTeamManagementForAction()
          ) {
            return;
          }

          editTeam(teamId);
          switchTab("admin");
          return;
        }

        if (
          event.target.classList.contains(
            "delete-team"
          )
        ) {
          if (
            !requireTeamManagementForAction()
          ) {
            return;
          }

          deleteTeam(teamId);
        }
      }
    );
  }
}

function bindRoundEvents() {
  document.addEventListener(
    "click",
    event => {
      const target = event.target;

      if (
        !target.classList.contains(
          "generate-game-round"
        ) &&
        !target.classList.contains(
          "save-match"
        ) &&
        !target.classList.contains(
          "clear-match"
        ) &&
        !target.classList.contains(
          "toggle-round"
        ) &&
        !target.classList.contains(
          "save-game-scoring"
        ) &&
        !target.classList.contains(
          "close-match-game"
        ) &&
        !target.classList.contains(
          "reopen-match-game"
        )
      ) {
        return;
      }

      if (!requireAdminForAction()) {
        return;
      }

      if (
        target.classList.contains(
          "close-match-game"
        )
      ) {
        closeMatchGame(
          target.dataset.gameId
        );
        return;
      }

      if (
        target.classList.contains(
          "reopen-match-game"
        )
      ) {
        reopenMatchGame(
          target.dataset.gameId
        );
        return;
      }

      if (
        target.classList.contains(
          "save-game-scoring"
        )
      ) {
        saveGameScoring(
          target.dataset.gameId,
          target.closest(
            ".game-scoring-form"
          )
        );
        return;
      }

      if (
        target.classList.contains(
          "generate-game-round"
        )
      ) {
        generateRound(
          target.dataset.gameId
        );
        return;
      }

      const roundId =
        target.dataset.roundId;
      const matchId =
        target.dataset.matchId;

      if (
        target.classList.contains(
          "save-match"
        )
      ) {
        saveMatchScore(
          roundId,
          matchId,
          target.closest(
            ".match-card"
          )
        );
      } else if (
        target.classList.contains(
          "clear-match"
        )
      ) {
        clearMatchScore(
          roundId,
          matchId
        );
      } else {
        toggleRoundCompleted(
          roundId
        );
      }
    }
  );
}

function bindDataToolEvents() {
  bindClick(
    "exportJson",
    exportTournamentJson
  );

  bindClick(
    "createRestorePoint",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      createRestorePoint();
    }
  );

  bindClick(
    "restoreLastPoint",
    () => {
      if (!requireAdminForAction()) {
        return;
      }

      restoreLastPoint();
    }
  );

  bindClick(
    "exportStandingsCsv",
    exportStandingsCsv
  );

  bindClick(
    "exportMatchesCsv",
    exportMatchesCsv
  );

  const importInput =
    getElement("importJson");

  if (importInput) {
    importInput.addEventListener(
      "change",
      event => {
        if (
          !requireAdminForAction()
        ) {
          event.target.value = "";
          return;
        }

        importTournamentJson(event);
      }
    );
  }

  bindClick(
    "printReport",
    printTournamentReport
  );

  bindClick(
    "printFullReport",
    printFullReport
  );
}

async function fullResetTournamentWithAudit() {
  if (
    typeof canAccessDestructiveActions !==
      "function" ||
    !canAccessDestructiveActions()
  ) {
    alert(
      "Only the primary administrator can reset the tournament."
    );
    return;
  }

  const confirmed = confirm(
    "FULL RESET: Remove all teams, games, scores, results and tournament settings for every viewer? This cannot be undone unless a cloud restore point exists."
  );

  if (!confirmed) {
    return;
  }

  const previousState =
    structuredClone(
      PHDTournament.state
    );

  PHDTournament.state =
    mergeTournamentState(
      PHDTournament.defaultState
    );

  clearGameForm();
  clearTeamForm();
  render();
  switchTab("home");

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
      "function"
    ) {
      await recordAuditEntry(
        "tournament.reset",
        "Performed a full reset of the tournament and its configuration.",
        {
          resetType: "full",
          previousSummary: {
            tournament:
              getTournamentAuditDetails(
                previousState.tournament
              ),
            teamCount:
              Array.isArray(
                previousState.teams
              )
                ? previousState.teams.length
                : 0,
            gameCount:
              Array.isArray(
                previousState.games
              )
                ? previousState.games.length
                : 0,
            roundCount:
              Array.isArray(
                previousState.rounds
              )
                ? previousState.rounds.length
                : 0
          },
          currentSummary: {
            tournament:
              getTournamentAuditDetails(
                PHDTournament.state.tournament
              ),
            teamCount:
              PHDTournament.state.teams.length,
            gameCount:
              PHDTournament.state.games.length,
            roundCount:
              PHDTournament.state.rounds.length
          }
        }
      );
    }
  } catch (error) {
    PHDTournament.state =
      previousState;
    render();
    console.error(
      "The tournament could not be reset.",
      error
    );

    alert(
      error && error.message
        ? error.message
        : "The tournament could not be reset."
    );
  }
}

async function resetTournamentProgressWithAudit() {
  if (
    typeof canAccessDestructiveActions !==
      "function" ||
    !canAccessDestructiveActions()
  ) {
    alert(
      "Only the primary administrator can reset tournament progress."
    );
    return;
  }

  const confirmed = confirm(
    "TOURNAMENT RESET: Keep all teams and video games, but clear every score, round, event and game result for the current tournament?"
  );
  if (!confirmed) return;

  const previousState = structuredClone(
    PHDTournament.state
  );
  PHDTournament.state =
    mergeTournamentState(
      createTournamentProgressResetState(
        PHDTournament.state
      )
    );

  clearGameForm();
  clearTeamForm();
  render();
  switchTab("home");

  try {
    await saveState();

    if (
      typeof recordAuditEntry ===
        "function"
    ) {
      await recordAuditEntry(
        "tournament.progress-reset",
        "Reset tournament progress while retaining teams and video games.",
        {
          resetType: "progress-only",
          preservedTeamCount:
            PHDTournament.state.teams.length,
          preservedGameCount:
            PHDTournament.state.games.length,
          clearedRoundCount:
            previousState.rounds.length,
          clearedEventCount:
            previousState.events.length
        }
      );
    }
  } catch (error) {
    PHDTournament.state =
      previousState;
    render();
    console.error(
      "Tournament progress could not be reset.",
      error
    );
    alert(
      error && error.message
        ? error.message
        : "Tournament progress could not be reset."
    );
  }
}

function bindAppEvents() {
  bindClick("archiveTournament", archiveCurrentTournament);
  bindClick(
    "displayModeToggle",
    toggleDisplayMode
  );

  bindClick(
    "displayModeTogglePage",
    toggleDisplayMode
  );

  bindClick(
    "themeToggle",
    () => {
      const lightMode =
        document.body.classList.toggle(
          "light"
        );
      document.body.classList.remove("dark");

      const theme = lightMode
        ? "light"
        : "dark";

      saveThemePreference(theme);
      updateThemeToggleLabel();
    }
  );

  bindClick(
    "fullResetTournament",
    fullResetTournamentWithAudit
  );
  bindClick(
    "resetTournamentProgress",
    resetTournamentProgressWithAudit
  );
}

function subscribeToCloudAndAuthUi() {
  if (
    typeof subscribeToAuth ===
    "function"
  ) {
    subscribeToAuth(() => {
      // Staff roles and assigned teams are resolved asynchronously. Rebuild
      // the page so team-scoped controls are created once that data arrives.
      render();

      if (
        typeof applyAdminAccessState ===
        "function"
      ) {
        applyAdminAccessState();
      }
    });
  }
}

function initialiseAppInterface() {
  ensureStateShape();

  bindTabEvents();
  bindMobileNavigation();
  bindDashboardCarousel();
  bindTournamentEvents();
  bindGameEvents();
  bindTeamEvents();
  bindRoundEvents();
  bindDataToolEvents();
  bindAppEvents();

  subscribeToCloudAndAuthUi();

  render();
  loadActiveTab();

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }
}

function initApp() {
  loadThemePreference();
  updateThemeToggleLabel();

  setSaveStatus(
    "Connecting to cloud..."
  );

  loadState();

  initialiseAppInterface();
}

initApp();

PHDTournament.modules.push("app");
