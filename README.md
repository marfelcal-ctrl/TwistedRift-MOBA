# Twisted Rift — Prototype v0.2

This build is a direct response to the first playtest. v0.1 was too small and too placeholder-like; v0.2 expands the battlefield and makes the combat systems visible and testable.

## Major changes from v0.1
- World expanded to **4200 × 2600** with a follow camera instead of showing the whole map at once.
- Added a **minimap**.
- Added visible **water/Rift zones** and bridge crossings. Shallow water slows heroes by 10%.
- Added **12 jungle camps** with small creeps, brutes, Crimson buffs and Azure buffs.
- Jungle monsters aggro, fight back, reset/heal when abandoned, and respawn after 50 seconds.
- Added **5v5 hero scaffolding** so the battlefield no longer feels empty.
- RAMZX skills now have visible cast effects and work without needing a hidden perfect target condition.
- Fixed the keyboard conflict where **W was both movement and Skill 2**. Skills now use **1 / 2 / 3 / 4** (Q/E/R are still optional aliases for some skills).
- Execution Step now actually dashes forward even if no enemy is selected.
- DEADLINE has a visible mark/dash/impact and can be tested instantly with the **TEST LV4** button or **L** key.
- Basic attacks, skill hits, damage numbers, shields, hit bursts and screen shake were added to improve combat feedback.
- Towers retain the current 95% Backdoor Protection, Rift Fury, Backdoor Repair, and 10% denial rules.
- Pitlord still spawns at 3:30; **P** or the PITLORD test button spawns it immediately.

## Controls
### Desktop
- **WASD** — move
- **Space / J** — basic attack
- **1 / Q** — Sever
- **2** — Iron Order
- **3 / E** — Execution Step
- **4 / R** — DEADLINE
- **F** — deny an eligible allied tower
- **L** — instantly reach Level 4 for testing
- **P** — spawn Pitlord immediately for testing

### Mobile
Use the on-screen joystick and skill buttons. For the best experience, rotate the phone to landscape.

## Notes
This is still a mechanics prototype, not the final 3D game. Bot strategy, role-specific 0:00–5:00 economy, item shop, final Core logic, exact lane XP/gold sharing, and polished targeting are still future builds.

## GitHub Pages
Upload every file in this folder to the root of the GitHub repository and redeploy Pages. If your browser still shows v0.1, clear the site cache or remove/reinstall the PWA because v0.1 used a service worker cache.
