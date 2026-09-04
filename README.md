# Twisted Rift — Prototype v0.6 Heroes + Shop

## Purpose
v0.6 keeps the approved large square battlefield and the v0.5 core loop, then moves into the next milestone: **the first 10 playable heroes and the original Twisted Rift item shop**.

This is still a mechanics prototype. The hero shapes, VFX, shop cards, terrain, and animations are placeholders so the kits and economy can be tested before 3D production.

## New in v0.6

### Hero selection
A hero-select screen now appears before the match. All 10 Version 1 heroes are selectable:

1. **RAMZX — The Dread Marshal** · EXP
2. **Nyra — Veil of Death** · Jungle
3. **Kaelor — The Iron Revenant** · EXP
4. **Veyra — Mistress of the Void** · Tactical Mage
5. **Grimm — The Black Bastion** · Tank/Roamer
6. **Sera — The Last Saint** · Tactical Support
7. **Kairo — The Rift Ranger** · Gold
8. **Raze — The Scarlet Outlaw** · Gold
9. **Volkrin — Beast of the Rift** · Jungle
10. **Zyrel — Storm Heretic** · Tactical Mage

The selected hero becomes the player character. Allied bots automatically fill the other four team slots so the team still has EXP, Gold, Jungle, Roamer, and Tactical/Support coverage.

### Individual hero kits
Each hero now has its own prototype attributes, attack range, movement speed, basic-attack timing, Skill 1, Skill 2, Skill 3, and Ultimate.

Examples:
- RAMZX retains Sever, Iron Order, Execution Step, and Deadline.
- Nyra has dashes, mist/slow control, silence assassination, and No Witness.
- Grimm has a pull, defensive stance, close-range control, and None Shall Pass.
- Sera can heal/shield allies and use Second Dawn for team sustain.
- Kairo is a true long-range Gold-lane marksman with Final Caliber.
- Veyra and Zyrel deal magic damage and have Tactical rotation/control tools.

These are prototype interpretations of the hero kits. Exact damage, cooldowns, passives, and VFX remain balanceable.

## Item Shop
Press **B** or the **SHOP** button to open the Quartermaster shop.

### Shop rules in this prototype
- 6 equipment slots.
- Items can be purchased anywhere for faster playtesting.
- Only one Boots item can be equipped.
- Bots automatically buy role-appropriate items when they can afford them.
- Hunt-item monster-damage bonuses are only fully useful to the Jungler role.
- Full component trees are not implemented yet; v0.6 purchases finished items directly.

### 24 original Twisted Rift items

**Weapons**
- Dreadcleaver
- Bloodfang Edge
- Riftpiercer
- Headsman's Oath

**Arcana**
- Voidglass Scepter
- Ashen Codex
- Witchfire Crown
- Grimoire of Ruin

**Armor**
- Dreadplate
- Runeguard Mantle
- Thornbound Plate
- Gravewarden Aegis

**Relics**
- Saint's Lantern
- Oathkeeper Bell
- Pilgrim's Sigil
- Crown of Mercy

**Hunt**
- Beastfang
- Bloodhunter Fang
- Shadeclaw
- Titan Hunter

**Boots**
- War Boots
- Rune Boots
- Arcane Steps
- Berserker Greaves

### Implemented item stat hooks
The prototype supports Attack, Magic Power, HP, Physical Defense, Magic Defense, Movement Speed, Cooldown Reduction, Attack Speed, Physical/Magic Penetration, Lifesteal, healing amplification, jungle damage, execute-style damage, burn damage, thorns, and emergency low-HP shielding.

## Systems carried forward
- 9600 × 9600 square battlefield.
- Blue base bottom-left; Red base top-right.
- Respawn/fountain behind each Core.
- Two perimeter lanes.
- 8 towers per team, 4 per lane.
- Four Core Guard towers protect the Core.
- Diagonal river, Pitlord center, 14 jungle camps, walls/choke points.
- Fog of war and draggable minimap.
- 4 minions per wave; first spawn 0.5 sec; every 20 sec after.
- 0:00–5:00 role economy.
- Roamer/Support 10 Gold/sec early economy.
- Jungler protected farming logic and fast Level 4 target.
- Pitlord first spawn at 3:30 and 90-second siege buff.
- 95% Backdoor Protection.
- Rift Fury 1× → 2× → 4× → 8× → 10×.
- Backdoor Repair only when a protected structure is attacked.
- Tower denial at <=10% HP; successful denial gives enemy **0 tower Gold**.
- Core shielding, Core attacks, death/respawn, Victory/Defeat and results.

## Controls
- **WASD** — Move
- **Space / J** — Basic Attack
- **1 / Q** — Skill 1
- **2** — Skill 2
- **3 / E** — Skill 3
- **4 / R** — Ultimate
- **B** — Open / close Item Shop
- **F** — Deny eligible allied tower
- **M** — Recenter camera
- **Drag minimap** — Scout map

### Debug/playtest controls
- **L** — Instantly reach Level 4
- **G** — Add 5,000 Gold
- **P** — Spawn Pitlord immediately

## What to test
1. Try several heroes and decide whether their attack range/speed feels appropriate.
2. Test every hero's four skills and note which ones feel weak, confusing, or too strong.
3. Test a Tank/Support, Jungler, Gold, EXP, and Tactical hero to make sure the early economy still behaves correctly.
4. Use `G` to rapidly test item combinations.
5. Check whether defensive items actually make heroes meaningfully harder to kill.
6. Check whether Attack/Magic builds noticeably increase damage.
7. Check whether Marksmen feel different from melee Fighters and Tanks.
8. Check whether Mage/Support kits feel useful despite there being no traditional mid lane.
9. Watch bot item builds and team composition.
10. Continue reporting anything that feels wrong before art production begins.

## GitHub Pages
Replace all files from the previous prototype with the files in this folder and commit them. The service-worker cache is now `twistedrift-v0.6.0`. If the old build remains cached, clear the site's data once and reopen it.
