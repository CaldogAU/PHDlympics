(function initialiseSessionPlanner(global) {
  "use strict";

  const DEFAULT_WEEKLY_ALLOWANCE_MINUTES = 60;
  const DEFAULT_ROUND_DURATION_MINUTES = 60;

  function positiveWholeNumber(value, fallback) {
    const number = Number(value);
    return Number.isInteger(number) && number > 0
      ? number
      : fallback;
  }

  function getWeeklyAllowance(tournament) {
    return positiveWholeNumber(
      tournament && tournament.timeAllowancePerWeek,
      DEFAULT_WEEKLY_ALLOWANCE_MINUTES
    );
  }

  function getRoundDuration(game) {
    return positiveWholeNumber(
      game && game.minutesPerRound,
      DEFAULT_ROUND_DURATION_MINUTES
    );
  }

  function getPlannedRoundCount(game, tournament) {
    return Math.max(
      1,
      Math.floor(
        getWeeklyAllowance(tournament) /
        getRoundDuration(game)
      )
    );
  }

  function normaliseTournament(tournament) {
    if (!tournament || typeof tournament !== "object") return tournament;
    tournament.timeAllowancePerWeek = getWeeklyAllowance(tournament);
    delete tournament.description;
    return tournament;
  }

  function normaliseGame(game, tournament = null) {
    if (!game || typeof game !== "object") return game;
    game.minutesPerRound = getRoundDuration(game);
    game.plannedRounds = getPlannedRoundCount(
      game,
      tournament || (global.PHDTournament && global.PHDTournament.state
        ? global.PHDTournament.state.tournament
        : null)
    );
    return game;
  }

  global.PHDSessionPlanner = Object.freeze({
    DEFAULT_WEEKLY_ALLOWANCE_MINUTES,
    DEFAULT_ROUND_DURATION_MINUTES,
    getWeeklyAllowance,
    getRoundDuration,
    getPlannedRoundCount,
    normaliseTournament,
    normaliseGame
  });
})(typeof window === "undefined" ? globalThis : window);
