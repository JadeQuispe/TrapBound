# TRAPBOUND

Existing multiplayer browser game for 2–8 players. Two teams build a maze and raid the opposing dungeon. Six original heroes and eight weapons retain their gameplay perks. Legacy accessory values are ignored.

Build lasts at most 3:00. Finish Early gives the other team at most 30 seconds. Walls must keep the exit reachable; traps and monsters require a clear tile between hazards. Decor torches do not affect collision or the piece budget. Players raid separate mazes; Rival Realm portals temporarily connect opponents without pausing other raiders.

The hosted Worker uses D1 and revision-checked updates for cross-device rooms. Hosts do not need to keep the match ticking; any connected client advances server deadlines.

Validate and bundle:

    node scripts/build-worker.mjs
    node --test tests/*.test.mjs

## Running this complete source download

Use Node.js 24 or later. No account, API key, or cloud database is needed for local play.

    npm start

Open `http://localhost:4173` in two separate browser tabs. Create a room in one tab
and join it using the room code in the other. For two devices on the same network,
use the host computer's LAN address with port 4173 and allow the local firewall if needed.
Local room data is held in memory and resets when the server stops. The hosted game
uses the D1 schema under `drizzle/` for persistent shared rooms.

    npm test

The active client is `public/app-v18.js`, the active stylesheet is
`public/style-v51.css`, the authoritative rules are `worker/game.js`, and HTTP
multiplayer routes are in `worker/index.js`. `scripts/build-worker.mjs` embeds
the public assets into the deployable Worker. Other versioned public scripts and
the old root `server.js` are retained historical code, not the active game server.

The source ZIP includes the full `public/` source and art, Worker source, build and
local-preview scripts, tests, migrations, and package files. It excludes credentials,
live player/room data, dependencies, Git history, and old deployment TAR archives.

### Stability fix in v128

The browser route checker previously treated off-grid corner coordinates as
walkable. With a boxed-in route it could search forever and freeze the page.
The checker now stays within the board and has a hard cell-count bound.
`tests/bounded-search128.test.mjs` covers the exact freeze layout and repeated
rapid validation. Network batching from v127 and connected wall artwork are retained.

This pass uses the existing top-down renderer, connected masonry, a continuous floor, responsive character sprites, glowing portals and exit doors. Real Android/browser visual QA requires an available browser-control environment.
