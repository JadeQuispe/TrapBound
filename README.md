# TRAPBOUND

A dark-fantasy, pixel/chibi multiplayer dungeon party game for **2–8 players**. Amber and Violet teams build dungeons for one another, then navigate traps, monsters, combat, and Realm challenges.

[Play the published game](https://rune-royale-party.jadequispe2007.chatgpt.site)

## Creator and development process

**Created and directed by Jade Quispe.** TrapBound was created through iterative development with **ChatGPT as the primary coding tool**. Jade directed the game concept, mechanics, design, UI/UX, testing, bug reports, features, and revisions. ChatGPT generated and modified the code in response to that direction and feedback.

This is an AI-assisted development project. The source is provided transparently as the preserved implementation, rather than represented as entirely hand-written code.

## Development history — October 2026

Jade actively developed and iterated on TrapBound throughout **October 2026**, directing repeated changes to gameplay, character and weapon presentation, responsive layouts, multiplayer flows, tutorials, combat feedback, and bug fixes. This development-period statement is documented at the creator's request; it is not a claim that this export contains an October-dated Git commit history or a reconstructed daily changelog.

This ZIP is a source snapshot of published **v162**, exported on **November 2, 2026**. No Git commits were fabricated, backdated, or rewritten for this export. Git metadata is intentionally excluded. Any first commit made after importing this snapshot into GitHub should use its actual creation date.

## Preserved release

- Published version: **162**
- Original source commit: `6273fe4c91de3a8fdd56f7860f599a01be542ab3`
- Application code, game rules, styles, and bundled art/audio are unchanged from that release.
- The root README and export documentation are additions for this GitHub-ready copy. The prior README is retained at `docs/PUBLISHED-README-v162.md` for provenance; it contains older descriptive notes.

`PRESERVATION.json` lists original source file hashes. `SHA256SUMS.txt` verifies the contents of this export.

## Run locally

Use **Node.js 24 or later** and npm.

```sh
npm ci
npm start
```

Open **http://localhost:4173** in two separate browser tabs. Create a party in one and join with its room code in the other. At least two connected players are required to start a match.

For devices on the same network, open the host computer's LAN address on port 4173 and allow the port through its firewall if necessary. The local preview uses an in-memory database; rooms reset when it stops. Local play does not require a cloud account, API key, or production database.

```sh
npm test
npm run build
```

`npm start` rebuilds first. `npm run dev` starts the preview using the existing build, so run `npm run build` after source changes before using it.

## Controls

- Desktop: **WASD** to move, **Space** to attack, **E** for Ability, **Q** to Dodge.
- Touch: joystick/movement controls, tap attack, Ability, and Dodge.

## Repository structure

| Path | Purpose |
| --- | --- |
| `public/index.html` | Entry page and active versioned asset URLs |
| `public/app-v18.js` | Active browser client |
| `public/style-v51.css` | Active stylesheet |
| `public/assets/` | Bundled character, weapon, environment, tutorial, and audio assets |
| `worker/game.js` | Authoritative game rules and state transitions |
| `worker/index.js` | Worker HTTP/multiplayer routes |
| `scripts/build-worker.mjs` | Embeds client and assets into `dist/server/index.js` |
| `scripts/local-preview.mjs` | Local HTTP server with in-memory D1-compatible storage |
| `tests/` | Automated tests and local QA fixtures |
| `drizzle/` | Production D1 database schema/migration |
| `.openai/hosting.json` | Original Sites deployment metadata (not a secret) |
| `docs/` | Retained development notes and export guidance |

Versioned filenames are intentional: the active release is determined by `index.html` and the build script. Retained historical assets and scripts are included to preserve the source tree used by the project. Do not rename or remove them without checking references.

## Hosting and preservation limits

The published game runs as a Cloudflare-compatible Worker with a D1 binding named **DB**. A static-only GitHub Pages upload will not provide the multiplayer backend. The included local server supports running the full game locally; deploying independently requires configuring a Worker runtime and database, applying the SQL migration, and binding DB. The original Sites project identity is preserved for reference, not as access to that account or deployment.

Production player/room data, secrets, credentials, Git metadata, installed dependencies, generated deployment archives, unrelated upload staging folders, and inactive legacy root server code are excluded. Required application assets under `public/` are included. This export does not modify or redeploy the live Site.

The stylesheet retains its original Google Fonts import (DM Sans and Space Grotesk). Those fonts require network access; fallback fonts apply offline. No font files have been added or substituted.

## License and asset credits

No new open-source license is granted by this export. Before distributing under a particular license, the project owner should choose appropriate terms for the code and verify the rights and credits for included artwork, audio, fonts, and other assets. This README does not assert that every asset was hand-created by Jade or independently verify third-party asset provenance.

## Import into GitHub

Extract the ZIP and upload the contents of the `TrapBound/` directory to a new repository, or initialize Git there:

```sh
git init
git add .
git commit -m "Preserve TrapBound published v162 source"
```

Use the real commit date. Add your own GitHub remote and push normally; no GitHub repository or release is created automatically by this ZIP.
