(function initialiseAccessControl(global) {
  "use strict";

  const ROLE_CAPABILITIES = Object.freeze({
    administrator: ["*"],
    "tournament-director": [
      "tournament.manage",
      "teams.manage",
      "games.manage",
      "results.manage",
      "reports.view",
      "display.manage"
    ],
    "score-entry": ["results.manage", "reports.view"],
    volunteer: ["results.view", "reports.view"],
    "display-operator": ["results.view", "reports.view", "display.manage"],
    viewer: ["results.view", "reports.view"]
  });

  function normaliseRole(role) {
    const value = String(role || "viewer").trim().toLowerCase();
    return ROLE_CAPABILITIES[value] ? value : "viewer";
  }

  function can(role, capability) {
    const capabilities = ROLE_CAPABILITIES[normaliseRole(role)];
    return capabilities.includes("*") || capabilities.includes(capability);
  }

  function resolveRole({ uid, administratorUid, assignments = {} } = {}) {
    if (uid && uid === administratorUid) return "administrator";
    return normaliseRole(uid && assignments[uid]);
  }

  global.PHDAccessControl = Object.freeze({
    roles: Object.keys(ROLE_CAPABILITIES),
    capabilities: ROLE_CAPABILITIES,
    normaliseRole,
    resolveRole,
    can
  });
})(typeof window === "undefined" ? globalThis : window);
