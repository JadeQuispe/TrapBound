# TrapBound Development Log — October 2026

> This is a retrospective development log based on the project's actual October 2026 development process. It documents the work and iteration period; it is **not** a reconstructed Git commit history and does not claim that these changes were committed to GitHub on these dates.

## Early October — Core game concept and structure

- Established TrapBound as a 2–8 player browser multiplayer maze game.
- Defined Amber and Violet teams and the basic match flow.
- Built out the core phases: lobby, build, trap, run/fight, and escape.
- Developed the maze-building system, including walls, traps, monsters, portals, and erase tools.
- Defined player health, team spawning, win conditions, and the overall dark-fantasy pixel/chibi direction.
- Started the character and weapon system with distinct heroes and visible equipped weapons.

## Mid October — Gameplay systems and multiplayer iteration

- Expanded combat feedback, including attacks, damage, knockback, health, defeat, and spectating.
- Added teammate indicators and team pings such as Exit, Trap, Monster, and Come Here.
- Improved maze rules, placement restrictions, build limits, and the Finish Early countdown.
- Developed Realm Challenge portals and themed areas such as Volcanic Ruins, Crystal Cavern, and Overgrown Temple.
- Added and refined monsters, traps, hidden information, line-of-sight behavior, and exploration mechanics.
- Continued revising character presentation, weapons, attacks, and team gameplay after repeated testing.

## Late October — Mobile, UI/UX, polish, and bug fixing

- Focused heavily on responsive mobile gameplay in both portrait and landscape orientations.
- Refined joystick, Attack, Ability, and Dodge controls for touch devices.
- Improved weapon alignment, attack reliability, projectile behavior, cooldown feedback, and combat animations.
- Reworked HUD sizing, camera behavior, overlays, and build-phase usability on smaller screens.
- Refined the tutorial flow and AI Warden presentation.
- Fixed visual and gameplay issues including black flicker, background tiling, character distortion, oversized popups, visible debug labels, crosshair/camera issues, and inconsistent monster presentation.
- Continued testing and iterating across many versions until reaching the preserved published build.

## Current status

TrapBound reached a stable published version after a month of active iteration in October 2026. The project is complete for now and preserved here as a portfolio project and source snapshot.

## AI-assisted development disclosure

TrapBound was created through iterative development with **ChatGPT as the primary coding tool**. Jade Quispe directed the game concept, mechanics, design, UI/UX, testing, bug reports, features, and revisions. ChatGPT generated and modified code in response to that direction and feedback.
