const PHDTournament = {
  modules: [],
  storageKey: "phdTournamentState",
  themeKey: "phdTournamentTheme",
  editingTeamId: null,
  editingGameId: null,
  defaultState: {
    appName: "PHDlympics",
    version: "1.3.0",
    schemaVersion: 3,
    access: {
      assignments: {}
    },
    championship: {
      pointsByPosition: [10, 8, 6, 5, 4, 3, 2, 1]
    },
    archive: [],
    tournament: {
      name: "PHDlympics",
      description: "",
      logoUrl: "https://media.licdn.com/dms/image/v2/D4D0BAQEMKjVjgICdBQ/company-logo_200_200/company-logo_200_200/0/1708434484760/phd__logo?e=2147483647&v=beta&t=3V6CvaNB9bLOL84Ecc_OARY-vVa-WfTbPwu8_ExwIb8",
      bannerUrl: "assets/phdlympics-banner.jfif",
      accentColour: "#6d5dfc",
      settings: {
        winPoints: 3,
        drawPoints: 1,
        byePoints: 3
      }
    },
teams: [],
games: [],
rounds: [],
events: []
  },
  state: null
};

PHDTournament.state = structuredClone(PHDTournament.defaultState);

function createTournamentProgressResetState(sourceState) {
  const source = sourceState || PHDTournament.defaultState;
  const reset = structuredClone(source);

  reset.rounds = [];
  reset.events = [];
  reset.games = (reset.games || []).map(game => {
    const cleanGame = {
      ...game,
      completed: false,
      completedAt: ""
    };

    if (cleanGame.fourPlayerSwiss) {
      cleanGame.fourPlayerSwiss = {
        ...cleanGame.fourPlayerSwiss,
        closed: false,
        closedAt: "",
        entrantIds: [],
        rounds: [],
        finalStandings: []
      };
    }

    if (cleanGame.fallGuysGrandPrix) {
      cleanGame.fallGuysGrandPrix = {
        ...cleanGame.fallGuysGrandPrix,
        closed: false,
        closedAt: "",
        heats: [],
        finalStandings: []
      };
    }

    return cleanGame;
  });

  return reset;
}

PHDTournament.modules.push("state");
