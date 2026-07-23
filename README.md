# PHDlympics

PHDlympics is a browser-based tournament platform for running a multi-game
competition with shared teams, results, standings, reports, and public displays.

The current application supports Swiss tournaments, Time Trials, and Grand Prix
events. Firebase provides authentication, real-time shared state, audit history,
and cloud restore points.

## Features

- Tournament setup
- Team management
- Team colours and logo URLs
- Tournament logo, banner and accent colour branding
- Swiss-style round generation
- Automatic byes
- Time Trial events
- Grand Prix events
- Score entry
- Live standings
- Dashboard statistics
- Match history
- Full tournament report
- JSON export/import
- CSV export for standings and matches
- Restore points
- Administrator audit history
- Firebase-backed real-time synchronization
- Signed-in administrator and view-only access modes
- Print-friendly tournament report
- Public display mode
- Light/dark theme toggle

## How to use

Open `index.html` in a modern browser.

No server is required.

Public viewers can read tournament data. The configured tournament administrator
must sign in before changing shared data.

## Recommended workflow

1. Add tournament details.
2. Add teams.
3. Add up to five games and select a GameMode for each.
4. Generate Swiss rounds or create a Time Trial/Grand Prix event.
5. Enter and complete results.
6. Review standings, reports, and the public display.
7. Create restore points and export JSON regularly.

## Data storage

The active tournament is synchronized through Cloud Firestore. Signed-in
administrator changes are visible to connected viewers in real time.

Use **Export JSON** to back up a tournament.
Use **Import JSON** to restore or move a tournament to another device.
Use **Create Restore Point** before making major changes.

## Display mode

Use **Display Mode** for a TV or projector-friendly public display.

Display Mode includes:

- Top standings
- Current round
- Large digital clock
- Scrolling recent-results ticker
- Fullscreen request button
- Escape key exit

## Security

Firestore rules enforce the configured administrator account for tournament
writes, backups, and audit-log creation. Other users receive public read-only
access to the active tournament.

Always export a JSON backup before resetting the shared tournament.

## Development

Run the regression tests with:

```text
npm test
```

The tests use Node.js' built-in test runner and require no package installation.
Pull requests and pushes to `main` run the same suite through GitHub Actions.

## Architecture

- [Architecture overview](docs/architecture.md)
- [GameMode SDK](docs/game-mode-sdk.md)
