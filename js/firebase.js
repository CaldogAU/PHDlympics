const PHDFirebase = {
  app: null,
  db: null,
  auth: null,
  ready: null,
  appSdk: null,
  firestoreSdk: null,
  authSdk: null,
  tournamentCollection: "tournaments",
  tournamentDocument: "current"
};

const firebaseConfig = {
  apiKey: "AIzaSyAvxstSfuRH8ShsFFQuOEcjUW_RUJFFEgw",
  authDomain: "phdlympics.firebaseapp.com",
  projectId: "phdlympics",
  storageBucket: "phdlympics.firebasestorage.app",
  messagingSenderId: "380516739503",
  appId: "1:380516739503:web:1765bc650361e3abfa675a",
  measurementId: "G-ZFDDYN9DDS"
};

PHDFirebase.ready = Promise.all([
  import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js"),
  import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js"),
  import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js")
])
  .then(([appSdk, firestoreSdk, authSdk]) => {
    PHDFirebase.appSdk = appSdk;
    PHDFirebase.firestoreSdk = firestoreSdk;
    PHDFirebase.authSdk = authSdk;

    PHDFirebase.app = appSdk.initializeApp(firebaseConfig);
    PHDFirebase.db = firestoreSdk.getFirestore(PHDFirebase.app);
    PHDFirebase.auth = authSdk.getAuth(PHDFirebase.app);

    console.info("Firebase connected to the PHDlympics project.");

    return PHDFirebase;
  })
  .catch(error => {
    console.error("Firebase could not be initialised.", error);
    throw error;
  });

window.PHDFirebase = PHDFirebase;
