# Twisted Rift — Prototype v0.3

This build corrects the battlefield architecture after the v0.2 playtest. The goal is a much larger **square MOBA battlefield** with clear bases, lane ownership, jungle/water space, and proper respawn points.

## Major changes from v0.2
- World expanded from 4200×2600 to **6400×6400**.
- Map is now a **square battlefield**, not a leaf-shaped loop.
- Bases remain diagonal: allied base bottom-left, enemy base top-right.
- Lane 1 wraps around the left/top edges; Lane 2 wraps around the bottom/right edges.
- Towers no longer alternate friendly/enemy along the lane. Each side owns its own half of each lane.
- Each team has **8 towers total: 4 per lane**.
  - T1 = Outer Tower
  - T2 = Inner Tower
  - G1 + G2 = two Core Guard towers for that lane
  - Across both lanes, the Core is surrounded/defended by **4 Core Guard towers**.
- Tower progression is enforced: **T1 → T2 → G1 → G2**. Deeper towers are fortified until the earlier tower on that lane falls.
- Core becomes vulnerable only after all four Core Guard towers are destroyed.
- Added dedicated **RESPAWN pads behind each Core**. Heroes now start and respawn there.
- Added a much more visible diagonal river/water system with three bridges.
- Jungle camps were repositioned into proper team-side jungle areas around the central river.
- Minimap is now square and shows the expanded battlefield, towers, camps, heroes, Core, and respawn points.

## Existing systems kept
- RAMZX skills and combat prototype
- 4-minion waves starting at 0.5 seconds, every 20 seconds
- 95% Backdoor Protection
- Rift Fury escalating tower damage
- Backdoor Repair when a protected tower is attacked
- 10% Tower Denial with 0 enemy tower gold on a successful deny
- Jungle monsters, Crimson/Azure buffs
- Pitlord at 3:30
- 5v5 hero scaffolding

## Controls
### Desktop
- WASD — move
- Space / J — basic attack
- 1 / Q — Sever
- 2 — Iron Order
- 3 / E — Execution Step
- 4 / R — DEADLINE
- F — deny an eligible allied tower
- L — instantly reach Level 4 for testing
- P — spawn Pitlord immediately for testing

### Mobile
Use the on-screen joystick and skill buttons in landscape orientation.

## GitHub Pages update
Replace the old prototype files with all files from this folder and commit. If a previous cached version still appears, clear site data or remove/reinstall the PWA.
