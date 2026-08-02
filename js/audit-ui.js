const PHDAuditUI = {
  unsubscribe: null,
  initialised: false,
  entries: [],
  error: null
};

function escapeAuditHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getAuditActionLabel(action) {
  const labels = {
    "tournament.created": "Tournament created",
    "tournament.updated": "Tournament updated",
    "tournament.reset": "Full reset",
    "tournament.progress-reset": "Tournament progress reset",
    "tournament.imported": "Tournament imported",
    "team.created": "Team added",
    "team.updated": "Team updated",
    "team.deleted": "Team deleted",
    "game.created": "Game added",
    "game.updated": "Game updated",
    "game.deleted": "Game deleted",
    "round.created": "Round generated",
    "round.completed": "Round completed",
    "round.reopened": "Round reopened",
    "round.deleted": "Round deleted",
    "match.completed": "Match result saved",
    "match.updated": "Match result updated",
    "match.cleared": "Match result cleared",
    "backup.created": "Restore point created",
    "backup.restored": "Restore point restored"
  };

  return labels[action] || action || "Tournament change";
}

function getAuditActionCategory(action) {
  const value = String(action || "");

  if (value.startsWith("team.")) {
    return "team";
  }

  if (value.startsWith("game.")) {
    return "game";
  }

  if (value.startsWith("round.")) {
    return "round";
  }

  if (value.startsWith("match.")) {
    return "match";
  }

  if (value.startsWith("backup.")) {
    return "backup";
  }

  return "tournament";
}

function getAuditPanel() {
  return document.getElementById(
    "auditLogPanel"
  );
}

function getAuditContainer() {
  return document.getElementById(
    "auditLogContainer"
  );
}

function getAuditStatus() {
  return document.getElementById(
    "auditLogStatus"
  );
}

function createAuditPanel() {
  if (getAuditPanel()) {
    return;
  }

  const reportsLayout =
    document.querySelector(
      "#reportsTab .app-layout"
    );

  if (!reportsLayout) {
    return;
  }

  const panel =
    document.createElement(
      "section"
    );

  panel.id = "auditLogPanel";
  panel.className =
    "card wide audit-log-panel";

  panel.hidden = true;

  panel.innerHTML = `
    <div class="section-heading">
      <div>
        <p class="eyebrow">
          Administrator
        </p>

        <h2>
          Audit Log
        </h2>

        <p class="muted">
          A private, read-only record of tournament changes.
        </p>
      </div>

      <button
        id="refreshAuditLog"
        class="secondary"
        type="button"
      >
        Refresh
      </button>
    </div>

    <p
      id="auditLogStatus"
      class="muted"
      aria-live="polite"
    >
      Sign in as an administrator to view the audit log.
    </p>

    <div
      id="auditLogContainer"
      class="audit-log-container"
    ></div>
  `;

  reportsLayout.appendChild(
    panel
  );

  const refreshButton =
    document.getElementById(
      "refreshAuditLog"
    );

  if (refreshButton) {
    refreshButton.addEventListener(
      "click",
      () => {
        restartAuditSubscription();
      }
    );
  }
}

function setAuditStatus(
  message,
  isError = false
) {
  const status =
    getAuditStatus();

  if (!status) {
    return;
  }

  status.textContent = message;
  status.classList.toggle(
    "error",
    Boolean(isError)
  );
}

function renderAuditEmptyState(
  message
) {
  const container =
    getAuditContainer();

  if (!container) {
    return;
  }

  container.innerHTML = `
    <div class="empty-state">
      ${escapeAuditHtml(message)}
    </div>
  `;
}

function renderAuditDetails(details) {
  if (
    !details ||
    typeof details !== "object" ||
    Object.keys(details).length === 0
  ) {
    return "";
  }

  return `
    <details class="audit-entry-details">
      <summary>
        View details
      </summary>

      <pre>${escapeAuditHtml(
        JSON.stringify(
          details,
          null,
          2
        )
      )}</pre>
    </details>
  `;
}

function renderAuditEntries(entries) {
  const container =
    getAuditContainer();

  if (!container) {
    return;
  }

  if (!entries.length) {
    renderAuditEmptyState(
      "No audit entries have been recorded yet."
    );

    return;
  }

  container.innerHTML = entries
    .map(entry => {
      const category =
        getAuditActionCategory(
          entry.action
        );

      const timestamp =
        typeof formatAuditTimestamp ===
        "function"
          ? formatAuditTimestamp(
              entry.createdAt
            )
          : "Pending";

      return `
        <article
          class="audit-entry audit-entry-${escapeAuditHtml(
            category
          )}"
        >
          <div class="audit-entry-marker">
            <span>
              ${escapeAuditHtml(
                category
                  .slice(0, 1)
                  .toUpperCase()
              )}
            </span>
          </div>

          <div class="audit-entry-content">
            <div class="audit-entry-heading">
              <div>
                <strong>
                  ${escapeAuditHtml(
                    getAuditActionLabel(
                      entry.action
                    )
                  )}
                </strong>

                <p>
                  ${escapeAuditHtml(
                    entry.summary
                  )}
                </p>
              </div>

              <time>
                ${escapeAuditHtml(
                  timestamp
                )}
              </time>
            </div>

            <div class="audit-entry-meta">
              <span>
                ${escapeAuditHtml(
                  entry.adminEmail ||
                    "Administrator"
                )}
              </span>

              <span>
                ${escapeAuditHtml(
                  entry.action
                )}
              </span>
            </div>

            ${renderAuditDetails(
              entry.details
            )}
          </div>
        </article>
      `;
    })
    .join("");
}

function stopAuditSubscription() {
  if (
    typeof PHDAuditUI.unsubscribe ===
    "function"
  ) {
    PHDAuditUI.unsubscribe();
  }

  PHDAuditUI.unsubscribe = null;
}

async function startAuditSubscription() {
  stopAuditSubscription();

  if (
    typeof isTournamentAdmin !==
      "function" ||
    !isTournamentAdmin()
  ) {
    PHDAuditUI.entries = [];
    PHDAuditUI.error = null;

    renderAuditEmptyState(
      "Administrator sign-in is required."
    );

    setAuditStatus(
      "Sign in as an administrator to view the audit log."
    );

    return;
  }

  if (
    typeof subscribeToRecentAuditEntries !==
    "function"
  ) {
    renderAuditEmptyState(
      "The audit service is unavailable."
    );

    setAuditStatus(
      "The audit service could not be loaded.",
      true
    );

    return;
  }

  setAuditStatus(
    "Loading audit entries..."
  );

  renderAuditEmptyState(
    "Loading audit entries..."
  );

  try {
    PHDAuditUI.unsubscribe =
      await subscribeToRecentAuditEntries(
        (entries, error) => {
          if (error) {
            PHDAuditUI.entries = [];
            PHDAuditUI.error = error;

            renderAuditEmptyState(
              "Audit entries could not be loaded."
            );

            setAuditStatus(
              "Audit log connection failed.",
              true
            );

            return;
          }

          PHDAuditUI.entries =
            entries;

          PHDAuditUI.error = null;

          renderAuditEntries(
            entries
          );

          setAuditStatus(
            entries.length === 1
              ? "1 audit entry loaded."
              : `${entries.length} audit entries loaded.`
          );
        },
        50
      );
  } catch (error) {
    console.error(
      "Could not start the audit log.",
      error
    );

    PHDAuditUI.error = error;

    renderAuditEmptyState(
      "Audit entries could not be loaded."
    );

    setAuditStatus(
      error && error.message
        ? error.message
        : "Audit log connection failed.",
      true
    );
  }
}

function restartAuditSubscription() {
  startAuditSubscription().catch(
    error => {
      console.error(
        "Audit log refresh failed.",
        error
      );
    }
  );
}

function applyAuditAccessState(
  authState
) {
  createAuditPanel();

  const panel =
    getAuditPanel();

  if (!panel) {
    return;
  }

  const isAdmin =
    Boolean(
      authState &&
      authState.isAdmin
    );

  panel.hidden = !isAdmin;

  if (!isAdmin) {
    stopAuditSubscription();

    PHDAuditUI.entries = [];
    PHDAuditUI.error = null;

    return;
  }

  restartAuditSubscription();
}

function initialiseAuditInterface() {
  if (PHDAuditUI.initialised) {
    return;
  }

  PHDAuditUI.initialised = true;

  createAuditPanel();

  if (
    typeof subscribeToAuth ===
    "function"
  ) {
    subscribeToAuth(
      applyAuditAccessState
    );
  } else {
    applyAuditAccessState({
      user: null,
      isAdmin: false
    });
  }
}

if (
  document.readyState === "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    initialiseAuditInterface
  );
} else {
  initialiseAuditInterface();
}

window.PHDAuditUI =
  PHDAuditUI;

window.restartAuditSubscription =
  restartAuditSubscription;
