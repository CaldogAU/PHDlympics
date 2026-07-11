const PHD_ADMIN_UID = "prUrxokN7YQbloBefGQHMTQEPjJ3";

const PHDAuth = {
  user: null,
  isAdmin: false,
  ready: null,
  listeners: new Set()
};

function notifyAuthListeners() {
  PHDAuth.listeners.forEach(listener => {
    try {
      listener({
        user: PHDAuth.user,
        isAdmin: PHDAuth.isAdmin
      });
    } catch (error) {
      console.error("Authentication listener failed.", error);
    }
  });
}

function subscribeToAuth(listener) {
  if (typeof listener !== "function") {
    return () => {};
  }

  PHDAuth.listeners.add(listener);

  listener({
    user: PHDAuth.user,
    isAdmin: PHDAuth.isAdmin
  });

  return () => {
    PHDAuth.listeners.delete(listener);
  };
}

async function signInAdmin(email, password) {
  const firebase = await PHDFirebase.ready;

  const normalisedEmail = String(email || "").trim();
  const enteredPassword = String(password || "");

  if (!normalisedEmail || !enteredPassword) {
    throw new Error("Enter both an email address and password.");
  }

  const credential = await firebase.authSdk.signInWithEmailAndPassword(
    firebase.auth,
    normalisedEmail,
    enteredPassword
  );

  if (credential.user.uid !== PHD_ADMIN_UID) {
    await firebase.authSdk.signOut(firebase.auth);
    throw new Error("This account does not have tournament administrator access.");
  }

  return credential.user;
}

async function signOutAdmin() {
  const firebase = await PHDFirebase.ready;
  await firebase.authSdk.signOut(firebase.auth);
}

function getSignedInUser() {
  return PHDAuth.user;
}

function isTournamentAdmin() {
  return PHDAuth.isAdmin;
}

PHDAuth.ready = PHDFirebase.ready.then(firebase =>
  new Promise(resolve => {
    firebase.authSdk.onAuthStateChanged(
      firebase.auth,
      user => {
        PHDAuth.user = user;
        PHDAuth.isAdmin = Boolean(user && user.uid === PHD_ADMIN_UID);

        notifyAuthListeners();

        resolve({
          user: PHDAuth.user,
          isAdmin: PHDAuth.isAdmin
        });
      },
      error => {
        console.error("Firebase Authentication failed.", error);

        PHDAuth.user = null;
        PHDAuth.isAdmin = false;

        notifyAuthListeners();
        resolve({
          user: null,
          isAdmin: false
        });
      }
    );
  })
);

window.PHDAuth = PHDAuth;
window.signInAdmin = signInAdmin;
window.signOutAdmin = signOutAdmin;
window.getSignedInUser = getSignedInUser;
window.isTournamentAdmin = isTournamentAdmin;
window.subscribeToAuth = subscribeToAuth;