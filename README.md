# Twisted Rift — Prototype v0.5 Core Loop

## Purpose
v0.5 keeps the **approved v0.4 map** and adds the first full-match gameplay loop. The goal is to test whether the roles, early economy, jungle, Pitlord, structures, bots, respawn, and win condition work together before hero/item polish.

## Map kept from v0.4
- 9600 × 9600 square battlefield.
- Blue base bottom-left; Red base top-right.
- Respawn/fountain behind each Core.
- Two perimeter lanes: Lane 1 wraps left/top; Lane 2 wraps bottom/right.
- 8 towers per team: T1 + T2 + G1 + G2 on each lane.
- Four Core Guard towers protect each Core.
- Diagonal river with Pitlord at center.
- 14 jungle camps and blocking jungle walls/choke points.
- Fog of war and draggable minimap remain enabled.

## v0.5 role system
The prototype now runs the planned five-player compositions:
- **EXP** — Lane 1 farming/level focus. RAMZX is the player-controlled EXP hero.
- **GOLD** — Lane 2 farming/gold focus.
- **JUNGLE** — jungle-only farming during the protected opening phase.
- **ROAMER/TANK** — follows the Jungler early and uses the Roamer economy.
- **TACTICAL** — flexible Mage lane helper, or **SUPPORT** using the same Roamer economy.

### 0:00–5:00 role economy
- Jungler cannot farm/damage lane minions for normal farming purposes.
- Non-Junglers cannot damage standard jungle creeps during the protected opening phase.
- EXP / Gold / Tactical lane farmers receive their lane XP.
- When two eligible farming heroes share a lane, base minion gold is shared and the last-hitting farmer receives **+10 bonus Gold**.
- Tank/Support receive **10 Gold per second** plus roaming XP.
- Tank/Support receive companion XP near allied jungle clears or lane waves, but no normal early lane/jungle farm gold.
- Kill/assist participation gives combat XP to participating heroes. Early Roamer/Support assists pay more Gold.
- At **5:00**, the game announces Open Economy and all heroes can farm normally.

## Lane wave math
- 4 minions per wave.
- First spawn at 0.5 seconds; respawn every 20 seconds.
- **Lane 1 / EXP:** 200 XP + 170 base Gold per complete wave.
- **Lane 2 / Gold:** 175 XP + 210 base Gold per complete wave.
- Level 4 requirement remains 1800 XP in this prototype.

## Jungle
- 8 yellow standard camps.
- 2 purple major camps.
- 2 Azure utility/mana buff camps.
- 2 Crimson offensive buff camps.
- Prototype camp XP has been raised so a normal four-camp Jungler opening can reach Level 4 before the planned 2:50 benchmark; exact clear timing still needs playtesting.
- Crimson: temporary attack boost.
- Azure: faster cooldown recovery.
- Camps respawn after 50 seconds.

## Pitlord
- First spawn: **3:30**.
- Respawns: **3 minutes after death**.
- Team receives Gold + XP when Pitlord dies.
- Killer receives an additional reward.
- 90-second siege buff:
  - new minions gain +15% HP and +15% damage;
  - heroes gain +10% structure damage;
  - heroes gain +5% out-of-combat movement speed.

## Structures / Core
- Tower order per lane: T1 → T2 → G1 → G2.
- 95% Backdoor Protection remains active without attacking minions.
- Rift Fury tower shots escalate 1× → 2× → 4× → 8× → 10× while backdoor protection is active.
- Backdoor Repair activates only when the protected structure is actually attacked.
- Tower denial remains available at <=10% HP during a legitimate push. A denied tower gives the enemy **0 tower Gold**.
- Core has 22,000 HP and is shielded until all four Core Guards are destroyed.
- Core now attacks nearby enemies and has its own anti-backdoor Rift Ward.
- Destroy the enemy Core to end the match.

## Bots / combat loop
- 5v5 teams now have role-based movement behavior.
- Junglers seek camps and can rotate to Pitlord.
- Tank/Roamer follows the Jungler during early role economy.
- Support can assist the Gold lane while earning Roamer economy.
- Tactical Mage can switch between the two lanes.
- Bots retreat toward fountain when critically low.
- Bots avoid diving protected towers without an allied minion wave.
- Bots use basic attacks and prototype RAMZX-like combat actions as temporary placeholders until the individual hero kits are implemented.

## Kills / respawn / results
- Kill Gold, assist Gold, participation XP, First Blood, Shutdown, multi-kill and streak callouts are active in prototype form.
- Respawn time scales upward with hero level and match time, capped at 50 seconds.
- Heroes respawn at the fountain behind the Core.
- Match end displays K/D/A, Gold, Hero Damage, Tower Damage, Damage Taken, Pitlord Participation, and team score.

## Desktop controls
- WASD — Move
- Space / J — Basic attack
- 1 / Q — Sever
- 2 — Iron Order
- 3 / E — Execution Step
- 4 / R — DEADLINE
- F — Deny eligible allied tower
- P — Spawn Pitlord immediately (debug)
- L — Level 4 immediately (debug)
- M — Recenter camera
- Drag minimap — Scout

## What to playtest
Please focus on:
1. Whether EXP reaches Level 4 around ~2:50 with normal lane farming.
2. Whether Jungler reaches Level 4 before 2:50 without being dramatically too early.
3. Whether Tank/Support reach Level 4 around ~3:15.
4. Gold lane Level 4 timing around the first Pitlord spawn.
5. Whether 3:30 Pitlord creates useful lane-vs-objective decisions.
6. Tower/Core durability and whether the match can naturally finish.
7. Bot retreat, tower-diving, lane and jungle behavior.
8. Whether 0:00–5:00 role restrictions feel strategic rather than annoying.

## GitHub Pages
Replace the old prototype files with all files in this folder and commit. The service worker cache is versioned for v0.5. If the browser still shows an older build, clear the site data once and reload.
