# ⚽ World Cup 2026 Pick'em

A free, no-login web app to run a World Cup 2026 prediction pool with friends.
Predict all **72 group-stage matches** and the **8 wild cards**, submit your
entry, and watch the **live leaderboard** — results are pulled and scored
**automatically**. No one ever types in a score.

**Live app:** https://besquin.github.io/mundial2026/

<p align="center">
  <img src="mundial2026-qr.png" alt="QR code to the live app" width="240">
  <br><em>Scan to open the app</em>
</p>

---

## How to play
1. Open the app link (or scan the QR above).
2. Enter your display name.
3. Enter a **predicted score** for **every** group match (required; use 🎲 *Fill
   match blanks* if you're in a hurry). Your group table updates live.
4. Your group **1st & 2nd** and the **8 wild cards** (best 3rd-placed teams)
   are filled in **automatically** from your scores.
5. Fill the **knockout bracket** by entering a **score** for every tie (higher
   score advances; ⚡ *Auto-fill* favours higher seeds), up to the champion —
   including the **3rd-place playoff**. If a tie is level, pick the **penalty
   shootout** winner.
6. Hit **Submit**. The first person to submit **creates the pool** and gets an
   **invite link** (with its own QR code) — share it so everyone lands on the
   **same live leaderboard**.

## Scoring
| What | Points |
|---|---|
| Correct group **winner** (1st) | **+2** each |
| Correct group **runner-up** (2nd) | **+1** each |
| Correct **wild card** (3rd-placed qualifier) | **+2** each |
| Correct group **match result** | **+1** each |
| **Exact scoreline** — on **every** match, group *and* knockout | **+2** bonus |
| Team reaches **Round of 16 / QF / SF / Final** | **+2 / +4 / +8 / +12** each |
| Correct **Champion** | **+20** |
| Correct **🥉 3rd-place** winner | **+8** |
| **Exact knockout tie** (both teams meet + you pick the winner) | **+3** bonus |
| **Maximum** | **576** |

Score entry is **mandatory** for all 72 group matches and all 32 knockout ties
(Round of 32 → Final, plus the 3rd-place playoff).

**Penalty rule:** In knockout matches, if scores are level after 90 minutes and
extra time, the winner is determined by a penalty shootout. For scoring in this
pool, a penalty win counts as an extra **+1 goal** for the winning team.

Knockouts are scored two ways at once: points for each of your teams that actually
reaches a round (progression), **plus** a bonus whenever a tie you predicted really
happens and you called the winner. Ties on the leaderboard break by total correct
picks, then earliest submission. All weights are editable in `CONFIG.scoring`.

## Entry & prizes
- **Entry buy-in: $1,000 MXN per player.**
- Pot split: **🥇 60% · 🥈 30% · 🥉 10%.**

## How it works (all free, no accounts)
- **Hosting:** GitHub Pages (static site).
- **Live results:** read directly from a public sports feed in the browser —
  no API key, no server.
- **Shared leaderboard:** a free **Firebase Realtime Database** (config in
  `CONFIG.firebase`). Everyone who opens a link shares one live board.
- **Multiple pools:** add `?g=<name>` to the URL for a separate, isolated
  leaderboard — e.g. the friends pool `…/?g=ribos`, `…/?g=family`, or
  `…/?g=friends2`. No setup; just share the link. The default (`ribos`)
  reuses the original `entries/main` node; other pools live under
  `entries/<name>` in the same database.
- **Lock:** entries lock at the time set in `CONFIG.lockISO`. After that,
  everything is read-only and auto-scored.

## Publishing (one-time, ~10 seconds)
GitHub Pages must be switched on once by the repo owner:

1. Go to **Settings → Pages**.
2. **Build and deployment → Source:** *Deploy from a branch.*
3. **Branch:** `claude/charming-goodall-mjos84`, **folder:** `/ (root)` → **Save.**
4. Wait ~1 minute → live at https://besquin.github.io/mundial2026/

## Configuration
All settings live in the `CONFIG` block near the top of the `<script>` in
[`index.html`](index.html):

- `lockISO` — when entries lock (currently `2026-06-11T10:00:00-07:00`, 2h before kickoff).
- `sportsdb` — the live-results feed (`leagueId`, `season`). If results don't
  appear once matches start, adjust the league id here.
- `firebase` — optional. Paste a Firebase Realtime Database config to use
  Firebase instead of the no-signup store (more robust for large pools).
- `resultsEndpoint` — set to `/api/results` only if you deploy on Vercel and
  want the bundled serverless feed in [`api/results.js`](api/results.js).

## Group draw
Groups A–L follow the official FIFA 2026 final draw. Not affiliated with FIFA.
