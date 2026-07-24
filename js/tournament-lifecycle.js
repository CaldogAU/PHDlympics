(function initialiseTournamentLifecycle(global) {
  "use strict";

  function validatePointsByPosition(values) {
    if (!Array.isArray(values) || values.length === 0) {
      throw new Error("At least one championship points value is required.");
    }
    const points = values.map(Number);
    if (points.some(value => !Number.isFinite(value) || value < 0)) {
      throw new Error("Championship points must be non-negative numbers.");
    }
    return points;
  }

  function createArchiveSnapshot(state, { createId, now } = {}) {
    const archivedAt = (now || (() => new Date().toISOString()))();
    return {
      id: (createId || (() => crypto.randomUUID()))(),
      archivedAt,
      tournament: structuredClone(state.tournament),
      teams: structuredClone(state.teams || []),
      games: structuredClone(state.games || []),
      rounds: structuredClone(state.rounds || []),
      events: structuredClone(state.events || []),
      championship: structuredClone(state.championship || {})
    };
  }

  global.PHDTournamentLifecycle = Object.freeze({
    validatePointsByPosition,
    createArchiveSnapshot
  });
})(typeof window === "undefined" ? globalThis : window);
