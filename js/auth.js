const PHD_ADMIN_UID = "prUrxokN7YQbloBefGQHMTQEPjJ3";

const PHDAuth = {
  user: null,
  isAdmin: false,
  role: "viewer",
  teamId: "",
  ready: null,
  listeners: new Set(),
  accessObserver: null
};

const ADMIN_CONTROL_IDS = [
  "tournamentName",
  "tournamentDescription",
  "tournamentLogoUrl",
  "tournamentBannerUrl",
  "tournamentAccentColour",
  "saveTournament",
  "archiveTournament",
  "teamName",
  "teamShortName",
  "teamLogoUrl",
  "teamColour",
  "saveTeam",
  "clearTeamForm",
  "gameName",
  "gamePlatform",
  "gameFormat",
  "gameLogoUrl",
  "saveGame",
  "clearGameForm",
  "generateRound",
  "createRestorePoint",
  "restoreLastPoint",
  "importJson",
  "staffEmail",
  "staffPassword",
  "staffTeam",
  "createStaffAccount",
  "resetTournament"
];

const ADMIN_DYNAMIC_SELECTORS = [
  ".edit-team",
  ".delete-team",
  ".edit-game",
  ".delete-game",
  ".save-match",
  ".clear-match",
  ".toggle-round",
  ".generate-game-round",
  ".save-game-scoring",
  ".close-match-game",
  ".reopen-match-game",
  ".game-scoring-form input",
  ".create-game-event",
  ".save-time-trial-results",
  ".save-grand-prix-results",
  ".reopen-game-event",
  "[data-event-workspace] input",
  ".generate-four-player-round",
  ".save-four-player-group",
  ".reopen-four-player-group",
  ".close-four-player-tournament",
  ".reopen-four-player-tournament",
  "[data-four-player-game-id] select",
  ".toggle-staff-access",
  ".staff-team-assignment",
  ".match-game-select",
  ".match-card input",
  ".match-card select",
  ".match-card textarea"
];

function getAuthState() {
  return {
    user: PHDAuth.user,
    isAdmin: PHDAuth.isAdmin,
    role: PHDAuth.role,
    teamId: PHDAuth.teamId,
    can(capability) {
      return window.PHDAccessControl.can(PHDAuth.role, capability);
    }
  };
}

async function resolveFirebaseUserRole(
  firebase,
  user
) {
  PHDAuth.teamId = "";

  if (!user) {
    return "viewer";
  }

  if (user.uid === PHD_ADMIN_UID) {
    PHDAuth.teamId = "";
    return "administrator";
  }

  try {
    const staffReference =
      firebase.firestoreSdk.doc(
        firebase.db,
        "staff",
        user.uid
      );
    const staffSnapshot =
      await firebase.firestoreSdk
        .getDoc(staffReference);

    if (
      staffSnapshot.exists()
    ) {
      const staff =
        staffSnapshot.data();

      if (
        staff &&
        staff.active === true &&
        staff.role ===
          "tournament-director"
      ) {
        PHDAuth.teamId =
          typeof staff.teamId ===
            "string"
            ? staff.teamId
            : "";
        return "tournament-director";
      }
    }
  } catch (error) {
    console.error(
      "Staff access could not be checked.",
      error
    );
  }

  try {
    const token =
      await user.getIdTokenResult();

    return window.PHDAccessControl
      .normaliseRole(
        token.claims.tournamentRole
      );
  } catch (error) {
    return "viewer";
  }
}

function notifyAuthListeners() {
  const state = getAuthState();

  PHDAuth.listeners.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.error(
        "Authentication listener failed.",
        error
      );
    }
  });
}

function subscribeToAuth(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  PHDAuth.listeners.add(listener);

  listener(getAuthState());

  return () => {
    PHDAuth.listeners.delete(listener);
  };
}

async function signInAdmin(email, password) {
  const firebase = await PHDFirebase.ready;

  const normalisedEmail =
    String(email || "").trim();

  const enteredPassword =
    String(password || "");

  if (!normalisedEmail || !enteredPassword) {
    throw new Error(
      "Enter both an email address and password."
    );
  }

  const credential =
    await firebase.authSdk.signInWithEmailAndPassword(
      firebase.auth,
      normalisedEmail,
      enteredPassword
    );

  const role =
    await resolveFirebaseUserRole(
      firebase,
      credential.user
    );

  if (role === "viewer") {
    await firebase.authSdk.signOut(firebase.auth);

    throw new Error(
      "This account does not have tournament staff access."
    );
  }

  return credential.user;
}

async function signOutAdmin() {
  const firebase = await PHDFirebase.ready;

  await firebase.authSdk.signOut(
    firebase.auth
  );
}

function getSignedInUser() {
  return PHDAuth.user;
}

function getAssignedStaffTeamId() {
  return PHDAuth.teamId || "";
}

function isTeamScopedStaff() {
  return (
    PHDAuth.role ===
    "tournament-director"
  );
}

function canManageTeamResult(teamId) {
  return isRootAdministrator() ||
    (
      isTeamScopedStaff() &&
      Boolean(PHDAuth.teamId) &&
      PHDAuth.teamId === teamId
    );
}

function isTournamentAdmin() {
  return canTournament(
    "tournament.manage"
  );
}

function isRootAdministrator() {
  return (
    PHDAuth.role ===
    "administrator"
  );
}

function canTournament(capability) {
  return window.PHDAccessControl.can(PHDAuth.role, capability);
}

function setElementAdminState(element, isAdmin) {
  if (!element) return;

  const tagName =
    element.tagName.toLowerCase();

  const canBeDisabled = [
    "button",
    "input",
    "select",
    "textarea",
    "fieldset"
  ].includes(tagName);

  if (canBeDisabled) {
    element.disabled = !isAdmin;
  }

  element.setAttribute(
    "aria-disabled",
    String(!isAdmin)
  );

  element.classList.toggle(
    "admin-control-locked",
    !isAdmin
  );

  if (!isAdmin) {
    element.setAttribute(
      "data-admin-locked",
      "true"
    );

    if (
      element.classList.contains("edit-team") ||
      element.classList.contains("delete-team") ||
      element.classList.contains("edit-game") ||
      element.classList.contains("delete-game") ||
      element.classList.contains("save-match") ||
      element.classList.contains("clear-match") ||
      element.classList.contains("toggle-round")
    ) {
      element.hidden = true;
    }
  } else {
    element.removeAttribute(
      "data-admin-locked"
    );

    if (
      element.classList.contains("edit-team") ||
      element.classList.contains("delete-team") ||
      element.classList.contains("edit-game") ||
      element.classList.contains("delete-game") ||
      element.classList.contains("save-match") ||
      element.classList.contains("clear-match") ||
      element.classList.contains("toggle-round")
    ) {
      element.hidden = false;
    }
  }
}

function getAdminControlledElements() {
  const elements = new Set();

  ADMIN_CONTROL_IDS.forEach(id => {
    const element =
      document.getElementById(id);

    if (element) {
      elements.add(element);
    }
  });

  ADMIN_DYNAMIC_SELECTORS.forEach(selector => {
    document
      .querySelectorAll(selector)
      .forEach(element => {
        elements.add(element);
      });
  });

  return Array.from(elements);
}

function updateViewOnlyNotice(isAdmin) {
  const existingNotice =
    document.getElementById(
      "viewOnlyNotice"
    );

  if (isAdmin) {
    if (existingNotice) {
      existingNotice.remove();
    }

    return;
  }

  if (existingNotice) return;

  const main = document.querySelector(
    ".app-workspace main"
  );

  if (!main) return;

  const notice =
    document.createElement("div");

  notice.id = "viewOnlyNotice";
  notice.setAttribute("role", "status");
  notice.style.margin =
    "18px 24px 0";
  notice.style.padding =
    "14px 16px";
  notice.style.border =
    "1px solid var(--border)";
  notice.style.borderRadius =
    "14px";
  notice.style.background =
    "rgba(109, 93, 252, 0.08)";
  notice.style.color =
    "var(--text)";
  notice.style.fontWeight =
    "700";

  notice.textContent =
    "View-only mode: sign in as a tournament administrator to make changes.";

  main.parentElement.insertBefore(
    notice,
    main
  );
}

function applyAdminAccessState() {
  const canManageTournament =
    canTournament("tournament.manage");
  const canEnterResults =
    canTournament("results.manage");
  const canEdit =
    canManageTournament ||
    canEnterResults;

  document.body.classList.toggle(
    "admin-mode",
    canEdit
  );

  document.body.classList.toggle(
    "view-only-mode",
    !canEdit
  );

  document.body.dataset.accessMode =
    PHDAuth.role;

  document
    .querySelectorAll(
      '.admin-only-tab, #adminTab, #gamesTab'
    )
    .forEach(element => {
      element.hidden =
        !canManageTournament;
      element.setAttribute(
        "aria-hidden",
        String(
          !canManageTournament
        )
      );
    });

  if (
    !canManageTournament &&
    typeof switchTab === "function"
  ) {
    const activeAdminPanel =
      document.querySelector(
        "#adminTab.active, #gamesTab.active"
      );
    if (activeAdminPanel) {
      switchTab("home");
    }
  }

  getAdminControlledElements().forEach(element => {
    const resetControl =
      element.id ===
        "resetTournament" ||
      Boolean(
        element.closest(
          "#resetTournament"
        )
      );
    const staffControl =
      element.id === "staffEmail" ||
      element.id ===
        "staffPassword" ||
      element.id ===
        "staffTeam" ||
      element.id ===
        "createStaffAccount" ||
      Boolean(
        element.closest(
          ".toggle-staff-access, .staff-team-assignment"
        )
      );
    const resultControl = Boolean(
      element.closest(
        ".save-match, .clear-match, .toggle-round, .generate-game-round, .create-game-event, .save-time-trial-results, .save-grand-prix-results, .reopen-game-event, [data-event-workspace], .match-card, .generate-four-player-round, .save-four-player-group, .reopen-four-player-group, .close-four-player-tournament, .reopen-four-player-tournament, [data-four-player-game-id]"
      )
    );
    const lifecycleControl =
      Boolean(
        element.closest(
          ".generate-game-round, .create-game-event, .reopen-game-event, .toggle-round, .generate-four-player-round, .reopen-four-player-group, .close-four-player-tournament, .reopen-four-player-tournament, .close-match-game, .reopen-match-game"
        )
      );
    const teamElement =
      element.closest(
        "[data-team-id]"
      );
    const teamResultAllowed =
      !isTeamScopedStaff() ||
      (
        teamElement
          ? canManageTeamResult(
              teamElement.dataset.teamId
            )
          : element.closest(
              ".match-card"
            )
            ? [
                element.closest(
                  ".match-card"
                ).dataset.teamAId,
                element.closest(
                  ".match-card"
                ).dataset.teamBId
              ].includes(
                getAssignedStaffTeamId()
              )
            : true
      );
    const completedEvent =
      Boolean(
        element.closest(
          '[data-event-completed="true"]'
        )
      );
    const completedResultLocked =
      completedEvent &&
      !element.closest(
        ".reopen-game-event"
      );
    setElementAdminState(
      element,
      resetControl
        ? canTournament(
            "tournament.reset"
          )
        : staffControl
          ? canTournament(
              "staff.manage"
            ) &&
            element.dataset
              .selfAccount !== "true"
          : resultControl
            ? canEnterResults &&
              teamResultAllowed &&
              !completedResultLocked &&
              !(
                isTeamScopedStaff() &&
                lifecycleControl
              )
            : canManageTournament
    );
  });

  updateViewOnlyNotice(canEdit);
}

function isProtectedElement(element) {
  if (!(element instanceof Element)) {
    return false;
  }

  if (
    element.closest(
      "#adminLoginForm, #adminSignOut"
    )
  ) {
    return false;
  }

  if (
    ADMIN_CONTROL_IDS.some(id =>
      Boolean(element.closest(`#${id}`))
    )
  ) {
    return true;
  }

  return ADMIN_DYNAMIC_SELECTORS.some(
    selector =>
      Boolean(element.closest(selector))
  );
}

function showAdminRequiredMessage() {
  const authStatus =
    document.getElementById(
      "authStatus"
    );

  if (authStatus) {
    authStatus.textContent =
      "Administrator access is required to make that change.";

    authStatus.classList.add("error");
  }

  const headerStatus =
    document.getElementById(
      "headerAuthStatus"
    );

  if (headerStatus) {
    headerStatus.textContent =
      "View-only mode";
  }
}

function blockUnauthorisedInteraction(event) {
  if (
    canTournament(
      "tournament.manage"
    ) ||
    canTournament(
      "results.manage"
    )
  ) {
    return;
  }

  if (!isProtectedElement(event.target)) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();

  showAdminRequiredMessage();
}

function startAdminControlObserver() {
  if (PHDAuth.accessObserver) {
    PHDAuth.accessObserver.disconnect();
  }

  PHDAuth.accessObserver =
    new MutationObserver(() => {
      applyAdminAccessState();
    });

  PHDAuth.accessObserver.observe(
    document.body,
    {
      childList: true,
      subtree: true
    }
  );
}

function initialiseAccessControl() {
  document.addEventListener(
    "click",
    blockUnauthorisedInteraction,
    true
  );

  document.addEventListener(
    "change",
    blockUnauthorisedInteraction,
    true
  );

  document.addEventListener(
    "input",
    blockUnauthorisedInteraction,
    true
  );

  document.addEventListener(
    "submit",
    blockUnauthorisedInteraction,
    true
  );

  startAdminControlObserver();
  applyAdminAccessState();

  subscribeToAuth(() => {
    applyAdminAccessState();
  });
}

PHDAuth.ready =
  PHDFirebase.ready.then(firebase =>
    new Promise(resolve => {
      firebase.authSdk.onAuthStateChanged(
        firebase.auth,
        user => {
          PHDAuth.user = user;
          const finish = role => {
            PHDAuth.role = window.PHDAccessControl.normaliseRole(role);
            PHDAuth.isAdmin = PHDAuth.role === "administrator";
            notifyAuthListeners();
            resolve(getAuthState());
          };
          if (!user) {
            PHDAuth.teamId = "";
            finish("viewer");
          } else {
            resolveFirebaseUserRole(
              firebase,
              user
            )
              .then(finish)
              .catch(() =>
                finish("viewer")
              );
          }
        },
        error => {
          console.error(
            "Firebase Authentication failed.",
            error
          );

          PHDAuth.user = null;
          PHDAuth.isAdmin = false;
          PHDAuth.role = "viewer";
          PHDAuth.teamId = "";

          notifyAuthListeners();

          resolve(getAuthState());
        }
      );
    })
  );

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseAccessControl
  );
} else {
  initialiseAccessControl();
}

window.PHDAuth = PHDAuth;
window.signInAdmin = signInAdmin;
window.signOutAdmin = signOutAdmin;
window.getSignedInUser =
  getSignedInUser;
window.isTournamentAdmin =
  isTournamentAdmin;
window.isRootAdministrator =
  isRootAdministrator;
window.canTournament =
  canTournament;
window.subscribeToAuth =
  subscribeToAuth;
window.applyAdminAccessState =
  applyAdminAccessState;
