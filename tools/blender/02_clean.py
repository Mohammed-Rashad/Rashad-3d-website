# Step 2 (live): flatten each imported model into ONE mesh with transforms applied, drop junk,
# scale to its site height, put its origin at the bottom centre, decimate, and line them up.
import bpy, os
from mathutils import Vector

scn = bpy.context.scene
s = scn
key_file = os.path.expanduser('~/.config/blender-mcp/sketchfab_key')
if os.path.exists(key_file):
    s.blendermcp_use_sketchfab = True; s.blendermcp_sketchfab_api_key = open(key_file).read().strip()
s.blendermcp_use_polyhaven = True

TARGET_FACES = {'lubeck_house': 9000, 'najran_kasbah': 14000, 'date_palm': 6000, 'dhow': 1554, 'dallah': 4000}

def descendants(o):
    out = []
    for c in o.children: out += [c] + descendants(c)
    return out

def bbox(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))), Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))

roots = [o for o in scn.objects if o.type == 'EMPTY' and 'target_height' in o.keys()]
x = 0.0
for root in sorted(roots, key=lambda r: r.name):
    name, height, chapter = root.name, root['target_height'], root['chapter']
    meshes = [o for o in descendants(root) if o.type == 'MESH']
    # unparent while keeping the world transform, then apply it into the mesh data
    for o in meshes:
        mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for o in [o for o in descendants(root) if o.type != 'MESH'] + [root]:
        bpy.data.objects.remove(o, do_unlink=True)
    # junk: the dallah's display base disc is a wide, very flat mesh
    if name == 'dallah':
        for o in list(meshes):
            mn, mx = bbox(o); sz = mx - mn
            if sz.z < 0.15 * max(sz.x, sz.y): meshes.remove(o); bpy.data.objects.remove(o, do_unlink=True)
    with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, selected_objects=meshes, object=meshes[0]):
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        if len(meshes) > 1: bpy.ops.object.join()
    obj = meshes[0]; obj.name = name; obj.data.name = name; obj['chapter'] = chapter
    # scale to site height, origin at bottom centre
    mn, mx = bbox(obj); k = height / max(1e-6, mx.z - mn.z)
    obj.scale = (k, k, k)
    with bpy.context.temp_override(active_object=obj, selected_editable_objects=[obj], object=obj):
        bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    mn, mx = bbox(obj); c = Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))
    obj.data.transform(__import__('mathutils').Matrix.Translation(-c)); obj.location = (0, 0, 0)
    # decimate to a web-friendly face count
    faces = len(obj.data.polygons); tgt = TARGET_FACES.get(name, faces)
    if faces > tgt * 1.1:
        mod = obj.modifiers.new('decimate', 'DECIMATE'); mod.ratio = tgt / faces; mod.use_collapse_triangulate = True
        with bpy.context.temp_override(active_object=obj, object=obj):
            bpy.ops.object.modifier_apply(modifier=mod.name)
    mn, mx = bbox(obj); w = mx.x - mn.x
    obj.location = (x + w / 2, 0, 0); x += w + 3
    print(f'{name}: {faces} → {len(obj.data.polygons)} faces, size {mx.x-mn.x:.1f} × {mx.y-mn.y:.1f} × {mx.z-mn.z:.1f} m')

for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        region = next(r for r in area.regions if r.type == 'WINDOW')
        with bpy.context.temp_override(window=bpy.context.window, area=area, region=region):
            bpy.ops.object.select_all(action='SELECT'); bpy.ops.view3d.view_selected(); bpy.ops.object.select_all(action='DESELECT')
print('clean done')
