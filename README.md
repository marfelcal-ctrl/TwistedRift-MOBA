# Twisted Rift 3D — Alpha 0.7

Browser MOBA prototype with a two-lane battlefield, minion waves, jungle camps, Pitlord, item shop, and player-selected level upgrades.

## Battlefield and graphics

Alpha 0.7 replaces the visible placeholder terrain with a height-mapped polygon mesh, paved stone lanes, two bridges, instanced cliffs, ruins and a denser forest. It preserves the existing two-lane paths, bases, tower positions and jungle camps. Units follow the terrain and raised decks. Decoration remains non-colliding, consistent with the existing prototype.

Maximum is the default graphics preset. The Graphics selector saves the player's choice locally. All presets keep the detailed model geometry; the presets change rendering and effects budgets:

| Preset | Pixel-ratio cap | Shadow map | MSAA samples | Bloom | Particle cap | Local lights |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| Maximum | 2 | 4096 | 4 | On | 1000 | 8 |
| High | 1.5 | 2048 | 2 | On | 650 | 5 |
| Balanced | 1 | 1024 | 0 | Off | 280 | 2 |

Pixel ratio does not exceed the display's native ratio. Shadow size and sample count also respect GPU capabilities. The renderer adds metal reflections, procedural surface grain and roughness, a camera-following directional shadow, nearby crystal lighting, HDR bloom and filmic tone mapping. Water flows and ripples; trees sway; tower banners move; fountain and rift motes rise.

Combat adds broad Sever arcs, basic attack slashes, dash trails, persistent shield geometry, a target-following Deadline marker, an empowered-strike burst, and glowing minion/tower projectiles with trails and impacts. Temporary effects are cleaned up. A saturated visual budget does not discard projectile damage callbacks. Hero, jungle and minion models use idle, walk and attack poses; wheeled units turn their wheels and recoil. Special waves alternate siege and cannon appearances without changing their combat stats.

These models remain stylized, reference-inspired approximations. The new lighting and material detail do not make them realistic or exact replicas of the supplied images. Browser rendering, visual framing and device performance still require live verification.

## Level upgrades

- Start at level 1 with one unspent point and unlearned skills. Choose Sever, Iron Order, or Execution Step.
- Each gained level grants one additional point. Points can be saved. The existing maximum hero level remains 15, so players cannot maximize every choice in one match.
- Skills 1–3 each cap at rank 10.
- Ultimate ranks 1, 2 and 3 unlock at levels 4, 6 and 9. These are minimum levels, not one-time spending windows.
- Stats unlock at level 6 and may be purchased five times total.
- RAMZX's Stats +2 package adds 2 maximum HP, 2 physical defense and 2 magical defense per purchase. These are absolute values, not percentages. Growth is configured per hero in `HERO_STAT_GROWTH`; other heroes' values are deliberately unset pending balancing and playable-hero integration.
- Leveling no longer automatically adds HP or attack damage. Starting HP and stats remain; item purchases still give their advertised benefits.
- Incoming physical or magical damage is multiplied by `100 / (100 + corresponding defense)` before shield absorption. True damage ignores defense. Towers, Pitlord, Archivist and Scorchbeast use magical damage; existing melee attacks use physical damage.

### Initial skill-rank tuning

Rank 1 keeps the earlier skill effects. Sever and Execution Step gain 12.5% of base damage per additional rank. Iron Order gains 80 shield and 80 shield capacity per rank. Deadline gains 200 empowered damage and five percentage points of execute threshold per rank. These are initial tuning values, not previously user-specified damage numbers.

## Controls

WASD move; Space basic attack; 1/2/3/4 skills; U upgrades; V recall; B shop; G practice gold; P practice Pitlord; R recenter. On-screen controls support touch. Close the upgrade panel to save points for later.

The camera distance is 32 (previously 24). The playable hero model uses 62% of its earlier width/depth and 72% of its height. The knight opponent models now use matching proportions. Movement coordinates, attack ranges, and minion scale are unchanged.

## Art

`art/` contains the previously prepared second-pass reference-inspired model generators and visual adapter. They use articulated joint groups, vertex colors and procedural surface shading. They do not have skinned character rigs or painted texture maps. Other hero models exist as assets; only RAMZX is currently playable. The detailed art requires live performance testing, particularly on mobile hardware.

## Verification

Run `npm ci` followed by `npm test` (11 tests). Tests cover upgrade boundaries, damage mitigation, projectile callbacks under a saturated visual budget, effect cleanup, terrain/deck heights, shader-hook composition, and animated minion setup and cleanup.

The actual bootstrap's assembled script was also exercised with a DOM and a stub renderer: initial load, frame updates, a 16-minion wave, all four skill interactions, Deadline consumption, graphics selection, and finite scene/camera transforms passed. The earlier upgrade UI checks also passed. These checks do not validate GPU shader compilation, final appearance, mobile layout or frame rate.

## Publishing

Serve this directory through an HTTP server or GitHub Pages. `index.html` loads the Alpha 0.7 additions through the existing `alpha05_bootstrap.js`. This work does not itself merge or deploy the prepared changes.
