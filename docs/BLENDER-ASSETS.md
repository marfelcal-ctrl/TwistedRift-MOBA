# Blender assets — Alpha 0.9

This update continues `main` at `f161c8e` (Alpha 0.8.2). It connects the separately
saved `TwistedRift-Alpha09-Blender.zip` to the current browser game. That archive
contains `TwistedRift-Asset-Library.blend`, `TwistedRift-Battlefield.blend`, and
Blender studio renders. It is supplied separately from the web deployment.

## Integrated assets

| Category | Count | Use |
| --- | ---: | --- |
| Heroes | 10 | RAMZX, Sentinel/Kaelor, and the existing hero gallery |
| Minions | 8 | Both teams' melee, ranged, siege, and cannon appearances |
| Creatures | 5 | Four jungle creature types and Pitlord |
| Structures | 8 | Towers, defense towers, cores, and fountains for both teams |
| Terrain | 7 | Textured ground, cliffs, ruins, pines, lanes, bridges, and rift pit |
| Effects | 7 | Slashes, rings, shields, beams, shards, runes, and projectiles |

The game uses the asset library's component exports. The separate battlefield
scene remains an editable overview; game code places the components and owns
the collision, vision, brush, and combat rules. Editing the scene alone does
not change those rules.

The 45 model exports, their manifest and shared textures total **9.69 MB**.
The ten **600 × 800 WebP** portraits total **1.28 MB**. The web deployment also
includes Three.js locally, so its renderer no longer depends on a CDN request.
Model downloads run three at a time. Texture objects are shared across assets
when their source, sampler, color space, and UV transform match. Geometry and
materials are shared between repeated minion instances; animation poses remain
independent. Quality presets and automatic resolution are retained.

These are stylized first-pass models with articulated object animations. They
are not finished realistic character sculpts or skinned skeletal rigs. Idle,
Walk and Attack clips come from Blender NLA tracks. Effects use exported mesh
shapes while the game controls movement, lifetime, visibility, and damage.

## Portrait mapping

Names were read from the supplied artwork, rather than inferred from upload order.

| Image suffix | Hero | Runtime file |
| --- | --- | --- |
| (1) | RAMZX | assets/portraits/ramzx.webp |
| (2) | NYRA | assets/portraits/nyra.webp |
| (3) | KAELOR | assets/portraits/kaelor.webp |
| (4) | VEYRA | assets/portraits/veyra.webp |
| (5) | GRIMM | assets/portraits/grimm.webp |
| (6) | SERA | assets/portraits/sera.webp |
| (7) | KAIRO | assets/portraits/kairo.webp |
| (8) | RAZE | assets/portraits/raze.webp |
| (9) | VOLKRIN | assets/portraits/volkrin.webp |
| (10) | ZYREL | assets/portraits/zyrel.webp |

The loading screen preserves the full portrait and its frame. Progress advances
after image decoding; failure gets a labelled fallback. A canceled entry cannot
overwrite cards in a later entry. The hero gallery also uses these portraits.
The ten-card lineup remains a **5v5 preview for the existing solo practice
build**. It does not add online matchmaking or ten playable characters.

## Re-export edited models with free tools

The authoring file was verified with Blender **4.5.3 LTS**. Open it in Material
Preview to see the packed PBR textures. Keep each root's `riftAsset` custom
property and its child hierarchy. The export script removes the library grid
placement, restores Y-up game coordinates, and exports animation tracks.

From this repository, with Blender on your PATH:

```sh
blender --background --disable-autoexec --python art/export-blender.py -- /path/TwistedRift-Asset-Library.blend /path/exported-models
npm ci
node art/pack-models.mjs /path/exported-models
npm test
```

The official `bpy==4.5.3` Python package with Python 3.11 can run the same script
when a standalone Blender executable is unavailable. The packer uses glTF
Transform and meshoptimizer. It compresses geometry and deduplicates textures;
it does not simplify away the authored model detail. Runtime files are in
`assets/models`. Upload the entire repository's web content, including `art`
and `assets`, through the existing GitHub Pages process.

Blender supplies modeling, UV mapping, materials, and animation. Other free
tools that can help future art passes:

- [Krita](https://krita.org/en/): paint texture maps and effect artwork.
- [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html): free
  humanoid rigging and animations with an Adobe ID. The current articulated
  assets need suitable connected meshes before automatic rigging; large
  appendages and non-humanoid monsters may need manual rigs.
- [Poly Haven](https://polyhaven.com/license): CC0 textures, HDRIs and models.
  No Poly Haven or Mixamo assets are bundled in this update.

## Verification and remaining visual work

**46 tests pass**, including loading all 45 compressed exports through the
actual GLTFLoader, checking texture references and UVs, independent animated
clones, and running the actual game harness with the exported models attached.
Existing progression, camera, collision, terrain occlusion, bush concealment,
minion pacing and effect-damage tests pass. Portrait decoding and canceled-job
handling are covered separately.

The cloud browser blocks the local preview with `ERR_BLOCKED_BY_CLIENT`.
GPU rendering, responsive appearance, touch behavior on a device, and phone FPS
have **not** been verified. The CPU harness does not decode textures or execute
GPU shaders. The PNGs in the Blender archive are studio renders, not game
screenshots. Check the loading screen in phone landscape and portrait, play a
wave, use the four abilities, and walk around walls and into grass before
merging the draft update.

Further realism needs dedicated sculpting, retopology, painted character
textures, skeletal rigs, and animation polish. Improving one hero to that
standard first will establish an art and performance target for the remaining
roster.
