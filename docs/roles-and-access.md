# Roles and access

PHDlympics uses Firebase Authentication custom claims for staff roles. The
supported `tournamentRole` values are:

- `administrator`
- `tournament-director`
- `score-entry`
- `volunteer`
- `display-operator`
- `viewer`

The original administrator UID remains an administrator for backwards
compatibility. Additional roles must be assigned in a trusted Firebase Admin
environment; browser clients must never be allowed to grant their own claims.

After changing a claim, the affected user must sign out and sign in again so
Firebase issues a refreshed ID token. Firestore rules allow tournament
directors and score-entry operators to update active tournament data while
reserving destructive operations, backups, and audit administration for
administrators.

