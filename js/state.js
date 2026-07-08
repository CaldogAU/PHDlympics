const PHDTournament = {
  modules: [],
  storageKey: "phdTournamentState",
  themeKey: "phdTournamentTheme",
  editingTeamId: null,
  defaultState: {
    appName: "PHDTournament",
    version: "1.0.0",
    tournament: {
      name: "PHDlympics",
      description: "",
      logoUrl: "",
      bannerUrl: "",
      accentColour: "#6d5dfc",
      settings: {
        winPoints: 3,
        drawPoints: 1,
        byePoints: 3
      }
    },
    teams: [],
    rounds: []
  },
  state: null
};

PHDTournament.state = structuredClone(PHDTournament.defaultState);

PHDTournament.modules.push("state");