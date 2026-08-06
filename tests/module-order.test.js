const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

test("loads tournament engines before their workflow adapters", () => {
  const html = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );
  const swissEngineIndex =
    html.indexOf(
      'src="js/swiss-engine.js"'
    );
  const capacityIndex =
    html.indexOf(
      'src="js/capacity.js"'
    );
  const gameModesIndex =
    html.indexOf(
      'src="js/game-modes.js"'
    );
  const storageIndex =
    html.indexOf(
      'src="js/storage.js"'
    );
  const fourPlayerSwissIndex =
    html.indexOf(
      'src="js/four-player-swiss.js"'
    );
  const fallGuysIndex =
    html.indexOf(
      'src="js/fall-guys-grand-prix.js"'
    );
  const roundsIndex =
    html.indexOf(
      'src="js/rounds.js"'
    );

  assert.notEqual(
    swissEngineIndex,
    -1
  );
  assert.notEqual(
    capacityIndex,
    -1
  );
  assert.notEqual(
    gameModesIndex,
    -1
  );
  assert.notEqual(
    fourPlayerSwissIndex,
    -1
  );
  assert.notEqual(
    roundsIndex,
    -1
  );
  assert.notEqual(
    fallGuysIndex,
    -1
  );
  assert.ok(
    capacityIndex < gameModesIndex
  );
  assert.ok(
    capacityIndex < storageIndex
  );
  assert.ok(
    swissEngineIndex <
      gameModesIndex
  );
  assert.ok(
    fourPlayerSwissIndex <
      gameModesIndex
  );
  assert.ok(
    fallGuysIndex <
      gameModesIndex
  );
  assert.ok(
    gameModesIndex < roundsIndex
  );
});

test("keeps mode management on game pages", () => {
  const root = path.join(
    __dirname,
    ".."
  );
  const html = fs.readFileSync(
    path.join(root, "index.html"),
    "utf8"
  );
  const app = fs.readFileSync(
    path.join(root, "js", "app.js"),
    "utf8"
  );
  const events = fs.readFileSync(
    path.join(
      root,
      "js",
      "events.js"
    ),
    "utf8"
  );

  assert.equal(
    html.includes(
      'id="scheduleTab"'
    ),
    false
  );
  assert.equal(
    html.includes(
      'id="eventsTab"'
    ),
    false
  );
  assert.match(
    app,
    /renderSwissGameManagement/
  );
  assert.match(
    app,
    /renderEventGameManagement/
  );
  assert.match(
    events,
    /saveTimeTrialResults/
  );
  assert.match(
    events,
    /saveGrandPrixResults/
  );
  assert.equal(
    html.includes('id="summaryScoring"'),
    false
  );
  assert.equal(
    html.includes('id="winPoints"'),
    false
  );
  const rounds = fs.readFileSync(
    path.join(root, "js", "rounds.js"),
    "utf8"
  );
  assert.match(
    rounds,
    /saveGameScoring/
  );
  assert.match(
    rounds,
    /data-score-field="winPoints"/
  );
});

test("allows staff into the Admin and Games management pages", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const auth = fs.readFileSync(path.join(root, "js", "auth.js"), "utf8");

  assert.match(
    html,
    /class="tab-button staff-access-tab"[^>]*data-tab="admin" hidden/
  );
  assert.match(
    html,
    /class="tab-button staff-access-tab"[^>]*data-tab="games" hidden/
  );
  assert.match(
    app,
    /\["admin", "games"\]\.includes\([\s\S]*?canTournament\(\s*"results\.manage"/
  );
  assert.match(
    auth,
    /\.staff-access-tab, #adminTab, #gamesTab/
  );
  assert.match(
    auth,
    /const canAccessAdmin =\s*canManageTournament \|\|\s*canEnterResults/
  );
});

test("allows staff to use team Edit and Delete controls", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const auth = fs.readFileSync(path.join(root, "js", "auth.js"), "utf8");

  assert.match(
    auth,
    /const teamManagementControl =[\s\S]*?"edit-team"[\s\S]*?"delete-team"/
  );
  assert.match(
    auth,
    /teamManagementControl[\s\S]*?\? canAccessAdmin/
  );
  assert.match(
    app,
    /function requireTeamManagementForAction\(\)[\s\S]*?"results\.manage"/
  );
  assert.match(
    app,
    /classList\.contains\(\s*"edit-team"[\s\S]*?requireTeamManagementForAction\(\)/
  );
  assert.match(
    app,
    /classList\.contains\(\s*"delete-team"[\s\S]*?requireTeamManagementForAction\(\)/
  );
});

test("scopes staff competitor counts to their assigned team", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const auth = fs.readFileSync(path.join(root, "js", "auth.js"), "utf8");

  assert.match(
    app,
    /function canEditGameEntry[\s\S]*?isTournamentAdmin\(\)[\s\S]*?canManageTeamResult\(teamId\)/
  );
  assert.doesNotMatch(
    auth,
    /const competitorEntryControl/
  );
  assert.match(
    app,
    /subscribeToAuth\(\(\) => \{[\s\S]*?render\(\);[\s\S]*?applyAdminAccessState\(\)/
  );
});

test("shows report data tools only to administrators", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const auth = fs.readFileSync(path.join(root, "js", "auth.js"), "utf8");

  assert.match(
    html,
    /id="reportDataTools"[\s\S]*?class="card wide admin-only-content"[\s\S]*?hidden/
  );
  assert.match(
    auth,
    /\.admin-only-tab, \.admin-only-content/
  );
});

test("hides the Reports page from signed-out viewers", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(
    path.join(root, "index.html"),
    "utf8"
  );
  const app = fs.readFileSync(
    path.join(root, "js", "app.js"),
    "utf8"
  );
  const auth = fs.readFileSync(
    path.join(root, "js", "auth.js"),
    "utf8"
  );

  assert.match(
    html,
    /class="tab-button signed-in-only-tab"[^>]*data-tab="reports" hidden/
  );
  assert.match(
    html,
    /id="reportsTab" class="tab-panel signed-in-only-content" hidden/
  );
  assert.match(
    auth,
    /const isSignedIn = Boolean\([\s\S]*?PHDAuth\.user[\s\S]*?\.signed-in-only-tab, \.signed-in-only-content[\s\S]*?element\.hidden = !isSignedIn/
  );
  assert.match(
    auth,
    /inaccessibleReportsPage[\s\S]*?!isSignedIn[\s\S]*?#reportsTab\.active[\s\S]*?switchTab\("home"\)/
  );
  assert.match(
    app,
    /tabName === "reports"[\s\S]*?!getSignedInUser\(\)[\s\S]*?return "home"/
  );
});

test("uses the tournament banner in the sidebar without a page-wide banner", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(
    path.join(root, "index.html"),
    "utf8"
  );
  const app = fs.readFileSync(
    path.join(root, "js", "app.js"),
    "utf8"
  );
  const styles = fs.readFileSync(
    path.join(root, "styles.css"),
    "utf8"
  );

  assert.match(
    html,
    /id="headerLogo" class="header-logo" hidden/
  );
  assert.doesNotMatch(
    html,
    /id="brandBanner"|phd-posters-looping\.gif|sidebar-brand-title|tournamentLogoUrl|Tournament Logo URL/
  );
  assert.match(
    app,
    /if \(tournament\.bannerUrl\)[\s\S]*?headerLogo\.hidden = false[\s\S]*?src="\$\{escapeHtml\(tournament\.bannerUrl\)\}"/
  );
  assert.doesNotMatch(
    app,
    /getElement\("brandBanner"\)|phd-posters-looping\.gif|tournamentLogoUrl/
  );
  assert.match(
    styles,
    /\.header-logo img \{[\s\S]*?width: 100%;[\s\S]*?object-fit: contain;/
  );
  assert.doesNotMatch(
    styles,
    /\.brand-banner/
  );
});

test("restricts destructive actions to Callum's administrator account", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const auth = fs.readFileSync(path.join(root, "js", "auth.js"), "utf8");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");

  assert.match(
    html,
    /class="card wide tournament-reset-card primary-admin-only"[\s\S]*?hidden[\s\S]*?Destructive actions/
  );
  assert.match(
    auth,
    /function canAccessDestructiveActions\(\)[\s\S]*?isRootAdministrator\(\)[\s\S]*?callum\.henderson@omc\.com/
  );
  assert.match(
    auth,
    /\.primary-admin-only[\s\S]*?!canUseDestructiveActions/
  );
  assert.match(
    app,
    /typeof canAccessDestructiveActions[\s\S]*?!canAccessDestructiveActions\(\)/
  );
});

test("adds collapsed-by-default controls to every Admin card", () => {
  const app = fs.readFileSync(
    path.join(__dirname, "..", "js", "app.js"),
    "utf8"
  );

  assert.match(
    app,
    /#adminTab > \.app-layout > \.card/
  );
  assert.match(
    app,
    /const initialisedAdminFeatures = new Set\(\)/
  );
  assert.match(
    app,
    /isAdminFeature[\s\S]*?collapsedGameFeatures\.add\(\s*featureKey/
  );
  assert.match(
    app,
    /:scope > \.feature-controls/
  );
});

test("loads staff management after Firebase authentication", () => {
  const html = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );
  const authIndex =
    html.indexOf(
      'src="js/auth.js"'
    );
  const staffIndex =
    html.indexOf(
      'src="js/staff-management.js"'
    );

  assert.notEqual(authIndex, -1);
  assert.notEqual(staffIndex, -1);
  assert.ok(authIndex < staffIndex);
});

test("does not expose the legacy game format field", () => {
  const html = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "index.html"
    ),
    "utf8"
  );
  const games = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "games.js"
    ),
    "utf8"
  );

  assert.doesNotMatch(
    html,
    /id="gameFormat"/
  );
  assert.doesNotMatch(
    games,
    /getValue\("gameFormat"\)/
  );
});

test("allows an unlimited number of configured games", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8"
  );
  const games = fs.readFileSync(
    path.join(__dirname, "..", "js", "games.js"),
    "utf8"
  );

  assert.doesNotMatch(
    games,
    /games\.length\s*>=\s*5|supports up to 5 games|\/ 5 games added/
  );
  assert.doesNotMatch(
    html,
    /\/ 5 games added/
  );
  assert.match(
    games,
    /games\.length === 1\s*\? "game"\s*:\s*"games"/
  );
});

test("shows a top-level workflow for every game mode", () => {
  const app = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "js",
      "app.js"
    ),
    "utf8"
  );

  [
    "swiss",
    "round-robin",
    "single-elimination",
    "four-player-swiss",
    "time-trial",
    "grand-prix",
    "fall-guys-grand-prix"
  ].forEach(mode => {
    assert.match(
      app,
      new RegExp(
        `"${mode}"|${mode}:`
      )
    );
  });
  assert.match(
    app,
    /const GAME_MODE_DIAGRAMS/
  );
  assert.match(
    app,
    /renderGameModeOverview\(\s*game,\s*mode/
  );
  assert.match(
    app,
    /class="game-mode-diagram"/
  );
  assert.match(
    app,
    /class="game-mode-stage"/
  );
  assert.match(
    app,
    /class="game-mode-node/
  );
  assert.match(
    app,
    /function getCurrentTeamExampleNames/
  );
  assert.match(
    app,
    /PHDTournament\.state\.teams/
  );
  assert.ok(
    app.indexOf("${renderGameModeOverview(") <
      app.indexOf("${renderGameCapacityManagement(game)}")
  );
  assert.match(
    app,
    /function enhanceCollapsibleGameFeatures/
  );
  assert.match(
    app,
    /data-feature-collapse/
  );
  assert.match(
    app,
    /personaliseGameModeDiagram/
  );
  assert.match(
    app,
    /class="game-mode-note"/
  );
  assert.match(
    app,
    /const GAME_MODE_DETAILS = \{/
  );
  assert.match(
    app,
    /class="game-mode-detailed" hidden/
  );
  assert.match(
    app,
    /dataset\.gameModeDetail/
  );
});

test("offers detailed instructions for every game mode beside the top-right collapse control", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(
    path.join(root, "js", "app.js"),
    "utf8"
  );
  const styles = fs.readFileSync(
    path.join(root, "styles.css"),
    "utf8"
  );
  const detailBlock = app.match(
    /const GAME_MODE_DETAILS = \{([\s\S]*?)\r?\n\};\r?\n\r?\nconst GAME_MODE_DIAGRAMS/
  );

  assert.ok(detailBlock);
  [
    "swiss",
    "round-robin",
    "single-elimination",
    "four-player-swiss",
    "time-trial",
    "grand-prix",
    "fall-guys-grand-prix"
  ].forEach(mode => {
    assert.match(
      detailBlock[1],
      new RegExp(`"${mode}"|${mode}:`)
    );
  });
  assert.match(
    app,
    /Show me detailed version/
  );
  assert.match(
    app,
    /Show infographic version/
  );
  assert.match(
    styles,
    /\.collapsible-game-feature > \.feature-controls \{[\s\S]*?position: absolute;[\s\S]*?top: 18px;[\s\S]*?right: 18px;/
  );
});

test("labels tournament-point outcomes clearly in multiplayer diagrams", () => {
  const app = fs.readFileSync(
    path.join(__dirname, "..", "js", "app.js"),
    "utf8"
  );

  assert.equal(
    (
      app.match(
        /"Overall Tournament Points Allocated"/g
      ) || []
    ).length,
    4
  );
  assert.doesNotMatch(
    app,
    /\["Close tournament", \[\["Final points"/
  );
  assert.match(
    app,
    /\["Live ranking"[\s\S]*?\["Overall Tournament Points Allocated", \[\["Tournament points"/
  );
  assert.match(
    app,
    /\["Points scale"[\s\S]*?\["Overall Tournament Points Allocated", \[\["Overall standings update"/
  );
  assert.match(
    app,
    /\["Heat points"[\s\S]*?\["Overall Tournament Points Allocated", \[\["Final rank sets overall points"[\s\S]*?"Last office = 1 pt"[\s\S]*?"1st = number of offices pts"[\s\S]*?"Added to overall standings"/
  );
});

test("uses a reduced-motion-safe ambient background animation", () => {
  const styles = fs.readFileSync(
    path.join(
      __dirname,
      "..",
      "styles.css"
    ),
    "utf8"
  );

  assert.match(
    styles,
    /@keyframes ambientBackgroundBreath/
  );
  assert.match(
    styles,
    /body::before[\s\S]*ambientBackgroundBreath/
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*body::before[\s\S]*animation: none/
  );
  assert.match(
    styles,
    /@keyframes ambientPageBase/
  );
  assert.match(
    styles,
    /opacity: 1;[\s\S]*scale\(1\.12\)[\s\S]*saturate\(1\.28\)/
  );
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*body \{[\s\S]*animation: none/
  );
});

test("display mode shows every team below the faster ticker", () => {
  const root = path.join(__dirname, "..");
  const display = fs.readFileSync(
    path.join(root, "js", "display.js"),
    "utf8"
  );
  const styles = fs.readFileSync(
    path.join(root, "styles.css"),
    "utf8"
  );
  const tickerIndex = display.indexOf(
    '<section class="display-ticker">'
  );
  const standingsIndex = display.indexOf(
    '<section class="display-grid">'
  );

  assert.match(display, /const standings = getStandings\(\);/);
  assert.doesNotMatch(display, /getStandings\(\)\.slice\(0, 8\)/);
  assert.equal(display.includes("Current Round"), false);
  assert.ok(tickerIndex >= 0 && tickerIndex < standingsIndex);
  assert.match(display, /--standings-columns:/);
  assert.match(display, /--standings-font-size:/);
  assert.match(styles, /animation: tickerScroll 52s linear infinite/);
  assert.match(styles, /animation: tickerScroll 56s linear infinite/);
  assert.match(styles, /grid-template-columns:\s*repeat\(var\(--standings-columns\)/);
});

test("sidebar banner has a motion-safe white liquid border", () => {
  const styles = fs.readFileSync(
    path.join(__dirname, "..", "styles.css"),
    "utf8"
  );

  assert.match(
    styles,
    /\.header-logo::before,[\s\S]*?\.header-logo::after[\s\S]*?background:\s*#ffffff;[\s\S]*?animation:\s*liquidBannerBorder/
  );
  assert.match(styles, /@keyframes liquidBannerBorder/);
  assert.match(
    styles,
    /@media \(prefers-reduced-motion: reduce\)[\s\S]*?\.header-logo::before,[\s\S]*?\.header-logo::after[\s\S]*?animation:\s*none;/
  );
});

test("theme toggle keeps dark as default and switches to a complete light theme", () => {
  const root = path.join(__dirname, "..");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const storage = fs.readFileSync(path.join(root, "js", "storage.js"), "utf8");
  const state = fs.readFileSync(path.join(root, "js", "state.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");
  const auth = fs.readFileSync(path.join(root, "auth.css"), "utf8");

  assert.match(app, /classList\.toggle\(\s*"light"/);
  assert.match(app, /"Use Dark Theme"[\s\S]*?"Use Light Theme"/);
  assert.match(storage, /savedTheme === "light"/);
  assert.match(state, /themeKey:\s*"phdTournamentThemeV2"/);
  assert.doesNotMatch(state, /themeKey:\s*"phdTournamentTheme",/);
  assert.match(styles, /body\.light\s*\{[\s\S]*?--bg:\s*#eef4fb;[\s\S]*?--card:\s*#ffffff;/);
  assert.match(styles, /body\.light \.app-sidebar/);
  assert.match(styles, /body\.light \.app-header/);
  assert.match(styles, /body\.light \.card/);
  assert.match(auth, /body\.light \.auth-panel/);
});

test("top tournament banner uses the compact half-height treatment", () => {
  const styles = fs.readFileSync(
    path.join(__dirname, "..", "styles.css"),
    "utf8"
  );

  assert.match(
    styles,
    /\.app-header\s*\{[\s\S]*?padding:\s*10px 16px;[\s\S]*?border-radius:\s*16px;/
  );
  assert.match(styles, /\.app-header \.header-actions button\s*\{[\s\S]*?padding:\s*8px 11px;/);
});

test("mobile navigation collapses to a labelled rail and closes after routing", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const app = fs.readFileSync(path.join(root, "js", "app.js"), "utf8");
  const styles = fs.readFileSync(path.join(root, "styles.css"), "utf8");

  assert.match(html, /id="mobileNavigationToggle"[\s\S]*?aria-expanded="false"/);
  assert.match(html, /class="mobile-navigation-label"[^>]*>Navigation<\/span>/);
  assert.match(html, /class="mobile-navigation-arrows"[\s\S]*?<span>→<\/span>[\s\S]*?<span>→<\/span>/);
  assert.match(app, /function setMobileNavigationOpen\(open\)/);
  assert.match(app, /function switchTab\(tabName\)[\s\S]*?setMobileNavigationOpen\(false\)/);
  assert.match(app, /bindMobileNavigation\(\)/);
  assert.match(styles, /@media \(max-width: 600px\)[\s\S]*?\.app-sidebar\s*\{[\s\S]*?width:\s*46px;/);
  assert.match(
    styles,
    /\.app-sidebar\.nav-open\s*\{[\s\S]*?width:\s*50vw;[\s\S]*?height:\s*50dvh;/
  );
  assert.match(styles, /\.mobile-navigation-label[\s\S]*?writing-mode:\s*vertical-rl/);
});

test("home page shows overall standings below recent activity", () => {
  const root = path.join(__dirname, "..");
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  const ladder = fs.readFileSync(
    path.join(root, "js", "ladder.js"),
    "utf8"
  );
  const activityIndex = html.indexOf('id="activityTickerText"');
  const standingsIndex = html.indexOf('id="homeStandingsHeader"');

  assert.ok(activityIndex >= 0);
  assert.ok(standingsIndex > activityIndex);
  assert.match(html, /id="homeStandingsBody"/);
  assert.match(
    ladder,
    /\["homeStandingsBody", "homeStandingsHeader"\]/
  );
});

test("dedicated standings page is now match history only", () => {
  const html = fs.readFileSync(
    path.join(__dirname, "..", "index.html"),
    "utf8"
  );
  const pageStart = html.indexOf('id="standingsTab"');
  const pageEnd = html.indexOf('id="reportsTab"');
  const page = html.slice(pageStart, pageEnd);

  assert.match(html, /data-tab="standings">Match History<\/button>/);
  assert.match(page, /<h2>Match History<\/h2>/);
  assert.doesNotMatch(page, /Overall Tournament Standings/);
  assert.doesNotMatch(page, /id="standings(?:Header|Body)"/);
});
