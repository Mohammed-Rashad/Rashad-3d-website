# Step 4 (live): export each cleaned asset as its own GLB (origin at bottom centre, Y-up for three.js).
import bpy, os
out = ARGS.get('out', '/tmp/claude-1000/models/export')
os.makedirs(out, exist_ok=True)
for obj in [o for o in bpy.context.scene.objects if o.type == 'MESH' and 'chapter' in o.keys()]:
    loc = obj.location.copy(); obj.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    path = f"{out}/{obj['chapter']}__{obj.name}.glb"
    bpy.ops.export_scene.gltf(filepath=path, use_selection=True, export_format='GLB', export_yup=True, export_apply=True, use_active_scene=True, export_image_format='AUTO')
    obj.location = loc
    print('exported', path, os.path.getsize(path) // 1024, 'KB')
bpy.ops.object.select_all(action='DESELECT')
