const PHDStaffManagement = {
  records: [],
  unsubscribe: null,
  loading: false
};

function getStaffManagementMessageElement() {
  return document.getElementById(
    "staffManagementMessage"
  );
}

function setStaffManagementMessage(
  message,
  isError = false
) {
  const element =
    getStaffManagementMessageElement();

  if (!element) return;

  element.textContent = message;
  element.classList.toggle(
    "error",
    Boolean(isError)
  );
}

function formatStaffCreatedAt(value) {
  if (!value) {
    return "Date unavailable";
  }

  const date =
    typeof value.toDate ===
      "function"
      ? value.toDate()
      : new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? "Date unavailable"
    : date.toLocaleString();
}

function renderStaffManagement() {
  const list =
    document.getElementById(
      "staffAccountList"
    );

  if (!list) return;

  if (PHDStaffManagement.loading) {
    list.innerHTML = `
      <li class="empty-state">
        Loading staff accounts…
      </li>
    `;
    return;
  }

  if (
    !PHDStaffManagement.records
      .length
  ) {
    list.innerHTML = `
      <li class="empty-state">
        No staff accounts have been created.
      </li>
    `;
    return;
  }

  const currentUser =
    typeof getSignedInUser ===
      "function"
      ? getSignedInUser()
      : null;

  list.innerHTML =
    PHDStaffManagement.records
      .map(staff => {
        const active =
          staff.active === true;
        const isCurrentUser =
          currentUser &&
          currentUser.uid ===
            staff.uid;

        return `
          <li class="staff-account-item">
            <div>
              <strong>
                ${escapeHtml(
                  staff.email ||
                    "Unknown email"
                )}
              </strong>
              <span>
                Tournament staff ·
                ${escapeHtml(
                  formatStaffCreatedAt(
                    staff.createdAt
                  )
                )}
              </span>
            </div>
            <div class="staff-account-actions">
              <span
                class="status-pill ${
                  active
                    ? "completed"
                    : "open"
                }"
              >
                ${
                  active
                    ? "Active"
                    : "Access Revoked"
                }
              </span>
              <button
                class="small-button ${
                  active
                    ? "danger"
                    : "secondary"
                } toggle-staff-access"
                type="button"
                data-staff-uid="${staff.uid}"
                data-next-active="${
                  active
                    ? "false"
                    : "true"
                }"
                ${
                  isCurrentUser
                    ? 'data-self-account="true" disabled'
                    : ""
                }
              >
                ${
                  active
                    ? "Revoke Access"
                    : "Restore Access"
                }
              </button>
            </div>
          </li>
        `;
      })
      .join("");

  if (
    typeof applyAdminAccessState ===
    "function"
  ) {
    applyAdminAccessState();
  }
}

function stopStaffAccountListener() {
  if (
    PHDStaffManagement.unsubscribe
  ) {
    PHDStaffManagement
      .unsubscribe();
    PHDStaffManagement.unsubscribe =
      null;
  }

  PHDStaffManagement.records = [];
  PHDStaffManagement.loading = false;
  renderStaffManagement();
}

async function startStaffAccountListener() {
  stopStaffAccountListener();

  if (
    typeof canTournament !==
      "function" ||
    !canTournament("staff.manage")
  ) {
    return;
  }

  PHDStaffManagement.loading = true;
  renderStaffManagement();

  try {
    const firebase =
      await PHDFirebase.ready;
    const collectionReference =
      firebase.firestoreSdk
        .collection(
          firebase.db,
          "staff"
        );

    PHDStaffManagement.unsubscribe =
      firebase.firestoreSdk
        .onSnapshot(
          collectionReference,
          snapshot => {
            PHDStaffManagement.records =
              snapshot.docs
                .map(documentSnapshot => ({
                  uid:
                    documentSnapshot.id,
                  ...documentSnapshot
                    .data()
                }))
                .sort((staffA, staffB) =>
                  String(
                    staffA.email || ""
                  ).localeCompare(
                    String(
                      staffB.email || ""
                    )
                  )
                );
            PHDStaffManagement.loading =
              false;
            renderStaffManagement();
          },
          error => {
            console.error(
              "Staff accounts could not be loaded.",
              error
            );
            PHDStaffManagement.loading =
              false;
            setStaffManagementMessage(
              "Staff accounts could not be loaded.",
              true
            );
            renderStaffManagement();
          }
        );
  } catch (error) {
    PHDStaffManagement.loading = false;
    setStaffManagementMessage(
      error && error.message
        ? error.message
        : "Staff accounts could not be loaded.",
      true
    );
    renderStaffManagement();
  }
}

async function createStaffAccount(
  email,
  password
) {
  if (
    !canTournament("staff.manage")
  ) {
    throw new Error(
      "Staff management access is required."
    );
  }

  const normalisedEmail =
    String(email || "")
      .trim()
      .toLowerCase();
  const enteredPassword =
    String(password || "");

  if (!normalisedEmail) {
    throw new Error(
      "Enter a staff email address."
    );
  }

  if (enteredPassword.length < 6) {
    throw new Error(
      "The staff password must contain at least six characters."
    );
  }

  const firebase =
    await PHDFirebase.ready;
  const secondaryApp =
    firebase.appSdk.initializeApp(
      firebase.config,
      `staff-account-${Date.now()}-${Math.random()}`
    );
  const secondaryAuth =
    firebase.authSdk.getAuth(
      secondaryApp
    );
  let credential = null;

  try {
    credential =
      await firebase.authSdk
        .createUserWithEmailAndPassword(
          secondaryAuth,
          normalisedEmail,
          enteredPassword
        );

    const staffReference =
      firebase.firestoreSdk.doc(
        firebase.db,
        "staff",
        credential.user.uid
      );
    const currentUser =
      getSignedInUser();

    await firebase.firestoreSdk
      .setDoc(staffReference, {
        uid: credential.user.uid,
        email: normalisedEmail,
        role:
          "tournament-director",
        active: true,
        createdAt:
          firebase.firestoreSdk
            .serverTimestamp(),
        createdByUid:
          currentUser
            ? currentUser.uid
            : "",
        createdByEmail:
          currentUser &&
          currentUser.email
            ? currentUser.email
            : ""
      });

    return {
      uid: credential.user.uid,
      email: normalisedEmail
    };
  } catch (error) {
    if (
      credential &&
      credential.user
    ) {
      try {
        await firebase.authSdk
          .deleteUser(
            credential.user
          );
      } catch (
        cleanupError
      ) {
        console.error(
          "The incomplete staff login could not be removed.",
          cleanupError
        );
      }
    }

    if (
      error &&
      error.code ===
        "auth/email-already-in-use"
    ) {
      throw new Error(
        "A Firebase login already exists for that email address."
      );
    }

    throw error;
  } finally {
    try {
      await firebase.authSdk
        .signOut(secondaryAuth);
    } catch (error) {
      // The secondary session may already be empty.
    }

    await firebase.appSdk
      .deleteApp(secondaryApp);
  }
}

async function setStaffAccountActive(
  staffUid,
  active
) {
  if (
    !canTournament("staff.manage")
  ) {
    throw new Error(
      "Staff management access is required."
    );
  }

  const currentUser =
    getSignedInUser();

  if (
    currentUser &&
    currentUser.uid === staffUid
  ) {
    throw new Error(
      "You cannot revoke your own staff access."
    );
  }

  const firebase =
    await PHDFirebase.ready;
  const existing =
    PHDStaffManagement.records
      .find(
        staff =>
          staff.uid === staffUid
      );

  if (!existing) {
    throw new Error(
      "The staff account could not be found."
    );
  }

  const staffReference =
    firebase.firestoreSdk.doc(
      firebase.db,
      "staff",
      staffUid
    );

  await firebase.firestoreSdk
    .setDoc(
      staffReference,
      {
        uid: staffUid,
        email: existing.email,
        role:
          "tournament-director",
        active:
          Boolean(active),
        updatedAt:
          firebase.firestoreSdk
            .serverTimestamp(),
        updatedByUid:
          currentUser
            ? currentUser.uid
            : ""
      },
      {
        merge: true
      }
    );
}

function initialiseStaffManagement() {
  const form =
    document.getElementById(
      "staffManagementForm"
    );

  if (form) {
    form.addEventListener(
      "submit",
      async event => {
        event.preventDefault();

        const emailInput =
          document.getElementById(
            "staffEmail"
          );
        const passwordInput =
          document.getElementById(
            "staffPassword"
          );
        const submitButton =
          document.getElementById(
            "createStaffAccount"
          );

        if (submitButton) {
          submitButton.disabled = true;
          submitButton.textContent =
            "Creating Account…";
        }

        setStaffManagementMessage(
          "Creating Firebase staff login…"
        );

        try {
          const account =
            await createStaffAccount(
              emailInput
                ? emailInput.value
                : "",
              passwordInput
                ? passwordInput.value
                : ""
            );

          if (emailInput) {
            emailInput.value = "";
          }
          if (passwordInput) {
            passwordInput.value = "";
          }

          setStaffManagementMessage(
            `${account.email} can now sign in as tournament staff.`
          );
        } catch (error) {
          console.error(
            "Staff account creation failed.",
            error
          );
          setStaffManagementMessage(
            error && error.message
              ? error.message
              : "The staff account could not be created.",
            true
          );
        } finally {
          if (submitButton) {
            submitButton.disabled =
              false;
            submitButton.textContent =
              "Create Staff Account";
          }
          if (
            typeof applyAdminAccessState ===
              "function"
          ) {
            applyAdminAccessState();
          }
        }
      }
    );
  }

  document.addEventListener(
    "click",
    async event => {
      const target = event.target;

      if (
        !target.classList.contains(
          "toggle-staff-access"
        )
      ) {
        return;
      }

      const active =
        target.dataset.nextActive ===
        "true";
      target.disabled = true;

      try {
        await setStaffAccountActive(
          target.dataset.staffUid,
          active
        );
        setStaffManagementMessage(
          active
            ? "Staff access restored."
            : "Staff access revoked."
        );
      } catch (error) {
        setStaffManagementMessage(
          error && error.message
            ? error.message
            : "Staff access could not be updated.",
          true
        );
        target.disabled = false;
      }
    }
  );

  if (
    typeof subscribeToAuth ===
      "function"
  ) {
    subscribeToAuth(() => {
      startStaffAccountListener();
    });
  }
}

document.addEventListener(
  "DOMContentLoaded",
  initialiseStaffManagement
);

PHDTournament.modules.push(
  "staff-management"
);
