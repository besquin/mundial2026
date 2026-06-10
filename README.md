# ⚽ World Cup 2026 Pick'em

A free, no-login web app to run a World Cup 2026 prediction pool with friends.
Predict all **72 group-stage matches** and the **8 wild cards**, submit your
entry, and watch the **live leaderboard** — results are pulled and scored
**automatically**. No one ever types in a score.

**Live app:** https://besquin.github.io/ribosmundial2026/

<p align="center">
  <img src="ribosmundial2026-qr.png" alt="QR code to the live app" width="240">
  <br><em>Scan to open the app</em>
</p>

---

## How to play
1. Open the app link (or scan the QR above).
2. Enter your display name.
3. Pick a **winner or draw** for every group-stage match (use 🎲 *Fill blanks
   randomly* if you're in a hurry).
4. Choose the **8 wild cards** — the third-placed teams you think will grab the
   last 8 spots in the Round of 32.
5. Hit **Submit**. The first person to submit **creates the pool** and gets an
   **invite link** (with its own QR code) — share it so everyone lands on the
   **same live leaderboard**.

## Scoring
| What | Points |
|---|---|
| Correct group **winner** (1st) | **+2** each |
| Correct group **runner-up** (2nd) | **+1** each |
| Correct **wild card** (3rd-placed qualifier) | **+2** each |
| Correct group **match result** | **+1** each |
| **Exact scoreline** of a match (e.g. you said 2–1, it finished 2–1) | **+2** bonus |
| Team reaches **Round of 16 / QF / SF / Final** | **+2 / +4 / +8 / +12** each |
| Correct **Champion** | **+20** |
| **Exact knockout tie** (both teams meet + you pick the winner) | **+3** bonus |
| **Maximum** | **501** |

Knockouts are scored two ways at once: points for each of your teams that actually
reaches a round (progression), **plus** a bonus whenever a tie you predicted really
happens and you called the winner. Ties on the leaderboard break by total correct
picks, then earliest submission. All weights are editable in `CONFIG.scoring`.

## How it works (all free, no accounts)
- **Hosting:** GitHub Pages (static site).
- **Live results:** read directly from a public sports feed in the browser —
  no API key, no server.
- **Shared leaderboard:** a no-signup JSON store keyed by a pool id in the URL
  (`#pool=…`). If the store is ever unreachable, the app falls back to
  **share-by-code** (Copy pick code / Import pick code) so it never breaks.
- **Lock:** entries lock automatically **1 hour before the opening match**
  (Mexico v South Africa). After that, everything is read-only and auto-scored.

## Publishing (one-time, ~10 seconds)
GitHub Pages must be switched on once by the repo owner:

1. Go to **Settings → Pages**.
2. **Build and deployment → Source:** *Deploy from a branch.*
3. **Branch:** `claude/charming-goodall-mjos84`, **folder:** `/ (root)` → **Save.**
4. Wait ~1 minute → live at https://besquin.github.io/ribosmundial2026/

## Configuration
All settings live in the `CONFIG` block near the top of the `<script>` in
[`index.html`](index.html):

- `lockISO` — when entries lock (default: `2026-06-11T19:00:00-06:00`).
- `sportsdb` — the live-results feed (`leagueId`, `season`). If results don't
  appear once matches start, adjust the league id here.
- `firebase` — optional. Paste a Firebase Realtime Database config to use
  Firebase instead of the no-signup store (more robust for large pools).
- `resultsEndpoint` — set to `/api/results` only if you deploy on Vercel and
  want the bundled serverless feed in [`api/results.js`](api/results.js).

## Group draw
Groups A–L follow the official FIFA 2026 final draw. Not affiliated with FIFA.
