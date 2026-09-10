# Twisted Rift 3D — Alpha 0.8.1

Browser MOBA prototype with a medieval lobby, runestone acceptance preview, ten-card versus screen, two-lane battlefield, jungle, Pitlord, item shop, and player-selected level upgrades.

## Alpha 0.8.1: vision, terrain and camera fixes

The previous mist was atmospheric fog only. This update adds actual team vision, an initial jungle spawn at **0:24 of match time**, solid terrain and a closer diagonal camera.

- Living allied heroes, minions, towers and cores share vision. Enemy minions, the Sentinel, jungle monsters and Pitlord hide outside that vision, including their health bars, minimap dots, target selection and attached Deadline marker. Camera scouting never grants sight. Destroyed/dead allies stop granting sight immediately.
- Eight visible tall-grass pockets conceal occupants from observers outside that pocket. Attacking or being struck nearby reveals a combatant for two seconds while an allied observer remains in range. Aimed Sever can hit concealed enemies; basic attacks and Deadline cannot acquire unseen targets.
- The known map remains dimly visible under fog. Hollow camp/arena markers are fixed landmarks, not live monster status. Pitlord's live status is withheld when there is no vision. Hidden attacks, impacts, ambient particles and lingering effects do not disclose positions; hiding graphics never cancels damage.
- All 14 jungle camps start dormant and spawn together at 24 seconds. Lobby, ready check and loading time do not count. The old duplicate Stoneback has been removed. The existing **45-second respawn after defeat** remains; 24 seconds is the opening spawn, following the clarified requirement. Pitlord keeps its 3:30 first spawn, 180-second respawn and 90-second siege buff.
- Cliff and ruin footprints, tree trunks, bridge rails and Pitlord arena pillars have collision. Lane-side stone barriers separate the roads from the jungle, with defined entrances for rotations. Heroes, enemy AI, minions, jungle monsters and Pitlord use body clearance. Swept movement prevents dashes tunneling through walls. AI paths route around barriers; bridge decks remain walkable at their actual height. Camp positions that touched a rail move slightly to a clear spawn point.
- Camera yaw is 18°, pitch is 54°, and orthographic half-height is 11.8. The view is about 14% closer in scale than Alpha 0.8. Movement, aiming and dragging use the inverse camera projection, including the tilted ground plane. Hero/minion model proportions and progression rules are retained.

Vision radii in world units: hero 12, minion 7, tower 9.5, core 11. Terrain collision is ground-plane body collision; weapon tips, capes and other animated extremities are not separate physics shapes. Walls affect travel; sight uses team radii and grass concealment. The shared 128 × 128 fog texture and minimap mask refresh at 10 Hz, while combat visibility is checked synchronously. Fog materials are isolated from lobby/gallery materials. Navigation grids and AI routes are cached, and repeated walls/grass are instanced.

## Medieval lobby and entry flow

The main screen places a real animated 3D hero on an ember-lit stone platform, surrounded by iron/leather panels, a shield crest, level badge, gold, and blood gems. The navigation opens working panels:

- **Armory** shows the six existing items and buys them with battle gold when the hero is at the fountain. Purchase eligibility, equipment slots and item effects use the actual shop rules.
- **Heroes** inspects all ten existing 3D hero models. RAMZX remains the playable hero; other cards are explicitly marked as gallery previews.
- **Quests** tracks three current-battle goals: defeat the Sentinel, reach level 6, and slay the Pitlord. There are no invented reward claims.
- **Forge** selects an optional first skill, graphics quality and automatic resolution. The opening skill spends the real first upgrade point only after entering battle; it never casts the skill.

**Enter the Abyss** opens a runestone ready check with a 20-second countdown, ten shield slots and an **Enter Battle** oath button. The nine non-player crests illuminate as a labelled preview. Cancel and timeout return to the lobby without spending points or advancing the match.

After acceptance, the versus screen displays five ally and five enemy cards in gothic frames with parchment nameplates and red progress bars. Hero portraits are rendered locally from the same 3D models into 256 × 384 images, one preparation job at a time. Progress follows those jobs; a failed portrait gets a labelled fallback and does not block practice. Returning through the lobby button pauses the current match; **Return to Battle** resumes it without repeating the ready check or spending another skill point.

**This is a local solo-practice build.** Acceptance and the five-versus-five lineup are explicitly labelled previews. They do not connect other players or add ten playable combatants to the existing battlefield. Blood gems display zero and have no purchase or earning system. The interface scales to the viewport; it does not force 8K rendering, which would work against the requested FPS improvements.

## Dark fantasy battle HUD

The HUD uses a round parchment minimap with the entire square battlefield inscribed inside it, iron-framed time/KDA/gold, a stone-and-iron joystick, sword-slash attack glyph, three normal skills plus Ultimate, red cooldown fills, and gold upgrade **+** buttons. Minimap dragging inverts the same projection used to draw the map. The KDA display tracks actual hero kills/deaths; assists remain zero in this practice ruleset. Decorative textures are procedural CSS grain and the existing model materials.

## Mobile MOBA pacing

Alpha 0.8 responds to slow marching, wave buildup, an overly large battlefield, camera orientation, and disruptive upgrade dialogs. Twisted Rift keeps its two lanes, RAMZX, four skills, stat choices, jungle, Pitlord and siege buff. These are custom tuning values intended to give a tighter mobile MOBA feel; the full ML/HoK rules and their internal map dimensions have not been reproduced.

| Setting | Alpha 0.7 | Alpha 0.8 |
| --- | --- | --- |
| Battlefield width/depth | 120 × 120 world units | 84 × 84; 30% shorter distances |
| First wave | 0.5 seconds | 10 seconds |
| Wave interval | 20 seconds | 30 seconds |
| Units per lane/team | 2 melee + ranged + special every wave | 2 melee + ranged; one siege unit every third wave |
| Minion movement | 2.45 normal / 2.2 special | 3.2 for all minions, spaced formations |
| Uncontested path to lane midpoint | About 41–45 seconds | About 22 seconds; first contact measured at 21.1 seconds after spawn |
| Starting hero movement | 8.8 | 7.2, with item bonuses unchanged |
| Camera | Perspective, 45° yaw | Orthographic, 58° pitch, aligned with movement and minimap |
| Level-up choice | Popup panel | Gold **+** above eligible skills; **U** for optional details |

The camera shows a consistent battlefield area rather than enlarging nearby units with perspective. Blue is bottom-left and red is top-right. Keyboard, joystick, drag aiming and camera panning use the same axes. Alpha 0.8.1 uses camera half-height 11.8 in landscape; portrait preserves at least 23.6 units of horizontal coverage. Hero/minion model proportions remain as in Alpha 0.7.

Movement, combat, waves, cooldowns, recall and respawns now share a fixed 60 Hz simulation clock. A 20 FPS display therefore does not slow movement while waves continue on a separate wall clock. Hidden tabs and stalls longer than half a second pause match time instead of queuing a burst of waves on return. Frames are capped at six simulation steps to avoid an unbounded catch-up loop.

## Battlefield and graphics

The compact map includes height-mapped polygon terrain, stone lanes, bridges, cliffs, ruins and forest. Bases, towers, jungle camps, fountains, recall/spawn points, map limits, VFX and minimap coordinates use the same scale. Units follow terrain and raised decks. Solid terrain now has collision generated from the rendered placement transforms; the bridge deck and other walking surfaces use the height sampler.

Maximum remains the default graphics preset. **Auto resolution** is enabled by default and can be switched off. It reduces rendered resolution after sustained slow frames, to a floor of 60% of the preset/native pixel ratio, and recovers slowly when performance improves. The Graphics selector and Auto resolution choice are saved locally. All presets keep the detailed model geometry; the presets change rendering and effects budgets:

| Preset | Pixel-ratio cap | Shadow map | MSAA samples | Bloom | Particle cap | Local lights |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| Maximum | 2 | 4096 | 4 | On | 1000 | 8 |
| High | 1.5 | 2048 | 2 | On | 650 | 5 |
| Balanced | 1 | 1024 | 0 | Off | 280 | 2 |

The table lists each preset before the optional automatic resolution adjustment. Pixel ratio does not exceed the display's native ratio. Shadow size and sample count also respect GPU capabilities. The renderer adds metal reflections, procedural surface grain and roughness, a camera-following directional shadow, nearby crystal lighting, HDR bloom and filmic tone mapping. Water flows and ripples; trees sway; tower banners move; fountain and rift motes rise.

Combat adds broad Sever arcs, basic attack slashes, dash trails, persistent shield geometry, a target-following Deadline marker, an empowered-strike burst, and glowing minion/tower projectiles with trails and impacts. Temporary effects are cleaned up. A saturated visual budget does not discard projectile damage callbacks. Hero, jungle and minion models use idle, walk and attack poses; wheeled units turn their wheels and recoil. Every third wave adds a special unit; these alternate siege and cannon appearances without changing their combat stats.

These models remain stylized, reference-inspired approximations. The new lighting and material detail do not make them realistic or exact replicas of the supplied images. Final appearance, responsive layout and device frame rate still require live verification.

### Less repeated work

- Dead minions leave both the combat collection and animation mixers. A spatial grid limits target searches to nearby living enemies; tower paths are cached.
- Static pieces are merged across decorative groups while keeping animation joints. The tower drops from 25 to 17 mesh submissions with its 11,688 triangles preserved. RAMZX, minion and Pitlord triangle counts are also preserved.
- Forest and cliff instances are grouped into regions for camera culling. Static terrain matrices are frozen, and replaced placeholder objects are detached from the scene.
- Shadows refresh at 20 Hz; unit animations still update every displayed frame. Nearby light selection runs four times per second; HUD/minimap refresh about ten times per second.
- Offscreen particles/effects are skipped. Projectile damage still completes exactly once. Particle matrices are submitted once per displayed frame, separately from fixed simulation ticks.
- Postprocessing provides MSAA; the canvas no longer requests an additional antialiasing layer.

## Level upgrades

- Start at level 1 with one unspent point and unlearned skills. Tap **+** above Sever, Iron Order, or Execution Step. This spends one point without casting the skill. The upgrade panel stays closed unless opened with **U**.
- Each gained level grants one additional point. Points can be saved. The existing maximum hero level remains 15, so players cannot maximize every choice in one match.
- Skills 1–3 each cap at rank 10.
- Ultimate ranks 1, 2 and 3 unlock at levels 4, 6 and 9. These are minimum levels, not one-time spending windows.
- Stats unlock at level 6 and may be purchased five times total. **+ STATS** appears by the skill controls when points are available; the details panel remains another way to spend them.
- RAMZX's Stats +2 package adds 2 maximum HP, 2 physical defense and 2 magical defense per purchase. These are absolute values, not percentages. Growth is configured per hero in `HERO_STAT_GROWTH`; other heroes' values are deliberately unset pending balancing and playable-hero integration.
- Leveling no longer automatically adds HP or attack damage. Starting HP and stats remain; item purchases still give their advertised benefits.
- Incoming physical or magical damage is multiplied by `100 / (100 + corresponding defense)` before shield absorption. True damage ignores defense. Towers, Pitlord, Archivist and Scorchbeast use magical damage; existing melee attacks use physical damage.

### Initial skill-rank tuning

Rank 1 keeps the earlier skill effects. Sever and Execution Step gain 12.5% of base damage per additional rank. Iron Order gains 80 shield and 80 shield capacity per rank. Deadline gains 200 empowered damage and five percentage points of execute threshold per rank. These are initial tuning values, not previously user-specified damage numbers.

## Controls

WASD move; Space basic attack; 1/2/3/4 skills; U upgrades; V recall; B shop; G practice gold; P practice Pitlord; R recenter. On-screen controls support touch. Gold **+** buttons appear only for eligible upgrades; points can be saved. The panel no longer opens automatically on level-up. Skill buttons also support native keyboard activation.

## Art

`art/` contains the previously prepared second-pass reference-inspired model generators and visual adapter. They use articulated joint groups, vertex colors and procedural surface shading. They do not have skinned character rigs or painted texture maps. Other hero models exist as assets; only RAMZX is currently playable. The detailed art requires live performance testing, particularly on mobile hardware.

## Verification

Run `npm ci` followed by `npm test` (37 tests; Node 20.19+). Coverage includes progression boundaries, damage mitigation, shared clock behavior at 20/30/60/120 FPS, pause/resume, path corners, targeting, camera projection, automatic resolution behavior, model geometry/joint preservation, and VFX callbacks/cleanup.

The actual bootstrap is exercised with a DOM and a stub renderer. Checks include skill **+** touch events without casting, native keyboard activation, ultimate/stat gates, saved points, graphics controls, map coordinates, matching movement at 20 and 60 FPS, first-wave timing, lobby pause/resume, hero gallery, Armory purchases, Forge choices, countdown cancel/expiry, all ten portrait preparation jobs, portrait fallback, round minimap coordinates, and a ten-minute match. In that match, 20 waves spawned 264 minions; 12 remained alive, 12 were retained, and the peak was 24. The duplicate legacy Stoneback has now been removed, leaving 17 persistent hero/enemy/jungle/boss actors.

Additional regression checks cover team sight and concealment, camera scouting without information leaks, the exact 0:24 jungle spawn, hidden-target rejection, concealed VFX, fog shader composition, dash collision, AI detours, all camp routes, clear lane formations, bridge rails and deck traversal. These are simulation/CPU and DOM checks, not measured GPU FPS. The available cloud browser reports WebGL disabled and blocks the local HTML preview route, so GPU shader execution, final camera appearance and responsive touch layout have not been verified there. The new lobby/versus GPU portrait pass is also unverified on a real GPU. Review the visual flow and device FPS before merging. Existing models remain procedural stylized approximations, not photorealistic replicas.

## Publishing

Serve this directory through an HTTP server or GitHub Pages. `index.html` loads the Alpha 0.8.1 additions through the existing `alpha05_bootstrap.js`, including `alpha08_injection.js`, `lobby.mjs`, `match-flow.mjs`, and `dark-ui.css`. This work does not itself merge or deploy the prepared changes.
