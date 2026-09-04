# Twisted Rift — Prototype v0.4

## Purpose
v0.4 is the **approved-map rebuild**. The goal is to validate battlefield architecture before adding polished art.

## Locked map rules implemented
- Large **9600 x 9600 square** battlefield.
- Blue base bottom-left; Red base top-right.
- Blue/Red respawn fountains are **behind the Core**.
- Two perimeter lanes: Lane 1 wraps left/top; Lane 2 wraps bottom/right.
- **8 towers per team**: T1 + T2 + G1 + G2 on each lane. The four G towers sit around the Core.
- Core is shielded until all four Core Guard towers are destroyed.
- Broad upper-left → lower-right river with Pitlord at center.
- 14 jungle nodes: 8 yellow standard, 2 purple major, 2 blue utility, 2 red offensive.
- Jungle walls/choke points are now visible and block player movement.
- 4 minions per wave; first spawn at 0.5s, then every 20s.
- Pitlord first spawn at 3:30.

## Vision / minimap
- Enemy heroes and minions are hidden unless an allied hero, minion, tower, or Core has vision of them.
- Enemy/allied towers stay visible on the minimap with small HP indicators.
- Drag the minimap to scout another part of the map. Release and the camera returns to RAMZX after a short delay. Double-click the minimap or press **M** to recenter immediately.

## Existing prototype combat kept
- RAMZX basic attack + Sever / Iron Order / Execution Step / DEADLINE.
- 95% backdoor protection.
- Rift Fury escalating tower damage.
- Backdoor repair only when a protected tower is being attacked.
- Tower denial at <=10% HP; successful denial gives the enemy 0 tower gold.

## Desktop test controls
- WASD: Move
- Space or J: Basic attack
- 1/Q: Sever
- 2: Iron Order
- 3/E: Execution Step
- 4/R: DEADLINE
- F: Deny eligible allied tower
- P: Spawn Pitlord immediately (debug)
- L: Level 4 immediately (debug)
- M: Recenter camera
- Drag minimap: Scout

## GitHub Pages
Upload all files in this folder to the repository root and deploy the `main` branch from `/ (root)`. If an older version remains cached, clear site data or unregister the previous service worker.
