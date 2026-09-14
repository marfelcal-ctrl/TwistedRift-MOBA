"""Export the recovered Alpha 0.9 asset library with Blender 4.5 LTS.

blender --background --disable-autoexec --python art/export-blender.py -- \
  /path/TwistedRift-Asset-Library.blend /path/exported-models

Also works with the official bpy Python package.
"""
import bpy
import json
import sys
from pathlib import Path

args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
if len(args) != 2:
    raise SystemExit('Pass asset-library.blend and the export directory.')
source, destination = Path(args[0]).resolve(), Path(args[1]).resolve()
destination.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source), use_scripts=False)
bpy.ops.preferences.addon_enable(module='io_scene_gltf2')
scene = bpy.context.scene
scene.frame_set(0)
assets = sorted((o for o in scene.objects if o.get('riftAsset')), key=lambda o:o['riftAsset'])
manifest = []
for root in assets:
    key = root['riftAsset']
    members = [root, *root.children_recursive]
    bpy.ops.object.select_all(action='DESELECT')
    location = root.location.copy()
    # Remove only the asset-browser grid placement, preserving shape and scale.
    root.location = (0, 0, 0)
    for obj in members:
        obj.hide_set(False)
        obj.hide_viewport = False
        obj.select_set(True)
        if obj.animation_data:
            obj.animation_data.action = None
            for track in obj.animation_data.nla_tracks:
                track.mute = False
    bpy.context.view_layer.objects.active = root
    bpy.context.view_layer.update()
    try:
        bpy.ops.export_scene.gltf(
            filepath=str(destination / (key+'.gltf')),
            export_format='GLTF_SEPARATE', use_selection=True,
            export_texture_dir='textures', export_image_format='WEBP',
            export_yup=True, export_extras=True,
            export_animations=True, export_animation_mode='NLA_TRACKS',
            export_merge_animation='NLA_TRACK', export_force_sampling=True,
            export_frame_range=False, export_cameras=False, export_lights=False,
        )
        manifest.append({'id':key, 'category':root.get('category',''),
                         'title':root.get('title',key.replace('_',' ').upper()),
                         'file':key+'.gltf'})
        print('EXPORTED',key,flush=True)
    finally:
        root.location=location

(destination/'manifest.json').write_text(json.dumps({
    'version':'alpha09','blender':bpy.app.version_string,'assets':manifest
},indent=2)+'\n')
print('EXPORTED_ASSETS',len(manifest),flush=True)
