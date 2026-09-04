# Twisted Rift — Prototype v0.1

This is a dependency-free browser prototype of the current Twisted Rift design. It is intentionally a **gameplay sandbox**, not the final art/game build.

## Included now
- Responsive landscape game canvas
- RAMZX playable prototype
- One enemy hero bot (Nyra placeholder)
- Two diagonal lanes
- 4 minions per lane/team per wave
- First wave at 0.5 seconds, then every 20 seconds
- 4 towers per lane per team (8/team)
- Draft tower HP/damage/range scaling
- 95% backdoor damage reduction
- Rift Fury tower shots (1x → 2x → 4x → 8x → 10x cap)
- Backdoor Repair only after a protected tower is actually damaged
- Tower denial at <=10% HP during a legitimate minion-supported siege
- First Pitlord spawn at 3:30
- Pitlord siege buff placeholder (90 seconds)
- Offline/PWA cache via service worker
- Touch joystick + combat buttons
- Desktop keyboard controls

## Controls
- WASD: move
- J or Space: basic attack
- Q: Sever
- W: Iron Order
- E: Execution Step
- R: DEADLINE (requires Level 4)
- F: deny nearby allied tower if eligible
- P: immediately spawn Pitlord for testing

## Run it
Because service workers require HTTP/HTTPS, open this through a small web server or GitHub Pages rather than double-clicking `index.html`.

### Browser-only workflow
1. Create a GitHub repository, e.g. `twistedrift-moba`.
2. Upload all files in this folder to the repo root.
3. In GitHub: **Settings → Pages → Deploy from branch → main / root**.
4. Open the Pages URL on Android in landscape mode.
5. Use your browser's **Add to Home screen / Install app** option. After the first successful load, the prototype is cached for offline use.

## Important provisional rules
- Core vulnerability is not finalized yet; current prototype treats tower destruction as the main siege sandbox.
- Exact tower ranges are prototype scale values and will be retuned after the final map dimensions are locked.
- Jungle camps, full 5v5 AI, shop/items, full hero roster, and final art/audio are the next phases.

## Next build target (v0.2)
- Finalized Core logic
- Jungle camps + Crimson/Azure buffs
- Role selector and 0:00–5:00 economy rules
- Gold/EXP/Tactical lane logic
- 5v5 bot team scaffolding
- Minimap and target selectors
