const PHDTournament = {
  modules: [],
  storageKey: "phdTournamentState",
  themeKey: "phdTournamentTheme",
  editingTeamId: null,
  editingGameId: null,
  defaultState: {
    appName: "PHDTournament",
    version: "1.1.0",
    tournament: {
      name: "PHDlympics",
      description: "",
      logoUrl: "https://media.licdn.com/dms/image/v2/D4D0BAQEMKjVjgICdBQ/company-logo_200_200/company-logo_200_200/0/1708434484760/phd__logo?e=2147483647&v=beta&t=3V6CvaNB9bLOL84Ecc_OARY-vVa-WfTbPwu8_ExwIb8",
      bannerUrl: "https://thumbs.dreamstime.com/b/kangaroo-funny-big-animal-marsupial-mammal-endemic-to-australia-rest-red-sand-ecotourism-concept-147824790.jpg",
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

PHDTournament.modules.push("state");