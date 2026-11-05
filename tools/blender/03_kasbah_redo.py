# Step 3 (live): redo the kasbah with a gentler decimation (photogrammetry tears below ~30k faces).
import bpy
from mathutils import Vector, Matrix
old = bpy.data.objects.get('najran_kasbah')
loc = old.location.copy() if old else Vector((14, 0, 0))
if old: bpy.data.objects.remove(old, do_unlink=True)
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath='/tmp/claude-1000/models/kasbah/model.glb')
new = [o for o in bpy.data.objects if o not in before]
meshes = [o for o in new if o.type == 'MESH']
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in new:
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
with bpy.context.temp_override(active_object=meshes[0], selected_editable_objects=meshes, selected_objects=meshes, object=meshes[0]):
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if len(meshes) > 1: bpy.ops.object.join()
obj = meshes[0]; obj.name = obj.data.name = 'najran_kasbah'; obj['chapter'] = 'najran'
def bbox(o):
    pts = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
mn, mx = bbox(obj); k = 7.0 / (mx.z - mn.z)
obj.data.transform(Matrix.Scale(k, 4)); mn, mx = bbox(obj)
obj.data.transform(Matrix.Translation(-Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z))))
faces = len(obj.data.polygons)
mod = obj.modifiers.new('decimate', 'DECIMATE'); mod.ratio = 40000 / faces
with bpy.context.temp_override(active_object=obj, object=obj):
    bpy.ops.object.modifier_apply(modifier=mod.name)
obj.location = loc
print('kasbah', faces, '→', len(obj.data.polygons))
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        region = next(r for r in area.regions if r.type == 'WINDOW')
        with bpy.context.temp_override(window=bpy.context.window, area=area, region=region):
            bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj; bpy.ops.view3d.view_selected(); obj.select_set(False)
