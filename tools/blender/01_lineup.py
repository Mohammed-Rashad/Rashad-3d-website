# Step 1 (live): a clean "Site assets" scene with every downloaded model lined up, so you can see them.
import bpy, os
from mathutils import Vector

M = '/tmp/claude-1000/models'
ITEMS = [  # name, file, target height in metres (site scale), chapter
    ('lubeck_house', 'dutch1', 9.0, 'lubeck'),
    ('najran_kasbah', 'kasbah', 7.0, 'najran'),
    ('date_palm', 'datepalm', 6.0, 'najran'),
    ('dhow', 'dhow', 5.0, 'cairo'),
    ('dallah', 'dallah', 0.45, 'taiz'),
]

scn = bpy.data.scenes.get('Site assets') or bpy.data.scenes.new('Site assets')
bpy.context.window.scene = scn
for o in list(scn.objects): bpy.data.objects.remove(o, do_unlink=True)

def bounds(objs):
    pts = [o.matrix_world @ Vector(c) for o in objs for c in o.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

x = 0.0
for name, src, height, chapter in ITEMS:
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'{M}/{src}/model.glb')
    new = [o for o in bpy.data.objects if o not in before]
    root = bpy.data.objects.new(name, None); scn.collection.objects.link(root)
    for o in new:
        if o.parent is None: o.parent = root
    root['chapter'] = chapter; root['target_height'] = height
    bpy.context.view_layer.update()
    meshes = [o for o in new if o.type == 'MESH']
    mn, mx = bounds(meshes)
    s = height / max(1e-6, (mx.z - mn.z))
    root.scale = (s, s, s); bpy.context.view_layer.update()
    mn, mx = bounds(meshes)
    w = mx.x - mn.x
    root.location = Vector((x - mn.x, -(mn.y + mx.y) / 2, -mn.z)) + root.location
    x += w + 3
    print(f'{name}: {len(meshes)} meshes, {sum(len(o.data.polygons) for o in meshes)} faces')

# frame everything in the viewport so it's visible
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        region = next(r for r in area.regions if r.type == 'WINDOW')
        with bpy.context.temp_override(area=area, region=region):
            bpy.ops.object.select_all(action='SELECT'); bpy.ops.view3d.view_selected(); bpy.ops.object.select_all(action='DESELECT')
        area.spaces[0].shading.type = 'MATERIAL'
print('lineup ready')
