# Step 6 (live): a proper Holstentor, built in the open Blender with Poly Haven brick / slate / plaster.
# Front (city-facing, with the gate arch) faces -Y, which becomes +Z (towards the site's camera) after glTF Y-up export.
import bpy, bmesh, math
from mathutils import Vector

for o in [o for o in bpy.context.scene.objects if o.get('part_of') == 'holstentor' or o.name == 'holstentor']:
    bpy.data.objects.remove(o, do_unlink=True)

M = bpy.data.materials
def mat_dark():
    m = M.get('window_dark') or M.new('window_dark'); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.03, 0.025, 0.025, 1); b.inputs['Roughness'].default_value = 1.0; b.inputs['Specular IOR Level'].default_value = 0.0
    return m
for name in ('medieval_red_brick', 'roof_slates_02', 'white_plaster_02', 'dark_brick_wall'):  # glTF can't do displacement
    nt = M[name].node_tree; out = nt.nodes['Material Output']
    for l in list(out.inputs['Displacement'].links): nt.links.remove(l)
BRICK, SLATE, PLASTER, GLAZED, DARK = M['medieval_red_brick'], M['roof_slates_02'], M['white_plaster_02'], M['dark_brick_wall'], mat_dark()
OFF = Vector((-16, 0, 0))  # build away from the other assets

def box_uv(obj, tile):
    me = obj.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            p = l.vert.co
            u, v = [(p.y, p.z), (p.x, p.z), (p.x, p.y)][ax]
            l[uv].uv = (u / tile, v / tile)
    bm.to_mesh(me); bm.free()

parts = []
def add(prim, mat, tile=1.0, **kw):
    getattr(bpy.ops.mesh, prim)(**kw)
    o = bpy.context.active_object; o['part_of'] = 'holstentor'; o.location += OFF
    o.data.materials.append(mat); bpy.ops.object.shade_flat() if prim == 'primitive_cube_add' else bpy.ops.object.shade_smooth()
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    box_uv(o, tile); parts.append(o); return o

TOWER_X, R, H = 1.55, 1.08, 4.6
for sx in (-1, 1):
    x = sx * TOWER_X
    add('primitive_cylinder_add', BRICK, 1.1, vertices=40, radius=R, depth=H, location=(x, 0, H / 2))
    for z in (1.15, 2.25, 3.45):  # dark glazed brick courses
        add('primitive_cylinder_add', GLAZED, 0.6, vertices=40, radius=R + 0.02, depth=0.13, location=(x, 0, z))
    add('primitive_cylinder_add', PLASTER, 1.0, vertices=40, radius=R + 0.025, depth=0.24, location=(x, 0, 2.8))  # plaster frieze
    add('primitive_cylinder_add', BRICK, 1.1, vertices=40, radius=R + 0.07, depth=0.22, location=(x, 0, H - 0.05))  # cornice
    add('primitive_cone_add', SLATE, 0.9, vertices=40, radius1=R + 0.12, radius2=0.02, depth=2.3, location=(x, 0, H + 1.15))
    add('primitive_cylinder_add', DARK, 1, vertices=8, radius=0.03, depth=0.55, location=(x, 0, H + 2.5))
    add('primitive_uv_sphere_add', DARK, 1, segments=10, ring_count=6, radius=0.07, location=(x, 0, H + 2.35))
    for row, z in enumerate((1.65, 2.55, 3.25, 3.95)):  # small arched windows facing the front
        for a in ((-35, 0, 35) if row else (-20, 20)):
            t = math.radians(a - 90) if sx < 0 else math.radians(a - 90)
            px, py = x + math.cos(t) * (R + 0.005), math.sin(t) * (R + 0.005)
            w = add('primitive_cube_add', DARK, 1, size=1, location=(px, py, z), rotation=(0, 0, t + math.pi / 2))
            w.scale = (0.16, 0.05, 0.32); bpy.ops.object.transform_apply(scale=True)

# central block between the towers
CW, CD, CH = 2.3, 2.0, 4.3
add('primitive_cube_add', BRICK, 1.1, size=1, location=(0, 0, CH / 2)).scale = (CW, CD, CH)
bpy.ops.object.transform_apply(scale=True); box_uv(bpy.context.active_object, 1.1)
# stepped gable: 5 steps on top
for i in range(5):
    w = CW - i * 0.42
    o = add('primitive_cube_add', BRICK, 1.1, size=1, location=(0, 0, CH + 0.22 + i * 0.44)); o.scale = (w, CD, 0.44); bpy.ops.object.transform_apply(scale=True); box_uv(o, 1.1)
    if i < 4:  # blind lancet windows on each step
        for k in range(max(1, 4 - i)):
            px = (k - (max(1, 4 - i) - 1) / 2) * 0.36
            d = add('primitive_cube_add', DARK, 1, size=1, location=(px, -CD / 2 - 0.005, CH + 0.22 + i * 0.44)); d.scale = (0.12, 0.02, 0.3); bpy.ops.object.transform_apply(scale=True)
# white plaster band with the inscription strip, glazed courses
o = add('primitive_cube_add', PLASTER, 1.0, size=1, location=(0, -CD / 2 - 0.01, 2.55)); o.scale = (CW + 0.02, 0.04, 0.26); bpy.ops.object.transform_apply(scale=True); box_uv(o, 1.0)
for z in (1.15, 3.45):
    o = add('primitive_cube_add', GLAZED, 0.6, size=1, location=(0, -CD / 2 - 0.008, z)); o.scale = (CW + 0.02, 0.03, 0.13); bpy.ops.object.transform_apply(scale=True); box_uv(o, 0.6)
# the gate: a dark round-arched passage + a brick archivolt
o = add('primitive_cube_add', DARK, 1, size=1, location=(0, -CD / 2 - 0.006, 0.6)); o.scale = (1.1, 0.03, 1.2); bpy.ops.object.transform_apply(scale=True)
add('primitive_cylinder_add', DARK, 1, vertices=24, radius=0.55, depth=0.03, location=(0, -CD / 2 - 0.006, 1.2), rotation=(math.pi / 2, 0, 0))
arch = add('primitive_torus_add', BRICK, 0.4, major_radius=0.66, minor_radius=0.07, major_segments=32, minor_segments=6, location=(0, -CD / 2 - 0.02, 1.2), rotation=(math.pi / 2, 0, 0))
# keep only the upper half of the archivolt
bm = bmesh.new(); bm.from_mesh(arch.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if (arch.matrix_world @ v.co).z < 1.2 - 0.01], context='VERTS'); bm.to_mesh(arch.data); bm.free()
for sx in (-1, 1):
    p = add('primitive_cube_add', BRICK, 0.4, size=1, location=(sx * 0.66, -CD / 2 - 0.02, 0.6)); p.scale = (0.14, 0.14, 1.2); bpy.ops.object.transform_apply(scale=True); box_uv(p, 0.4)
for row, z in enumerate((2.05, 3.0, 3.85)):  # windows in the centre block
    for k in (-0.6, 0, 0.6):
        d = add('primitive_cube_add', DARK, 1, size=1, location=(k, -CD / 2 - 0.006, z)); d.scale = (0.2, 0.03, 0.38); bpy.ops.object.transform_apply(scale=True)

# join everything into one object, origin at the base centre
bpy.ops.object.select_all(action='DESELECT')
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
h = bpy.context.active_object; h.name = h.data.name = 'holstentor'; h['chapter'] = 'lubeck'
from mathutils import Matrix
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
vs = [v.co for v in h.data.vertices]
mn = Vector([min(v[i] for v in vs) for i in range(3)]); mx = Vector([max(v[i] for v in vs) for i in range(3)])
h.data.transform(Matrix.Translation(-Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)))); h.location = OFF
print('holstentor faces', len(h.data.polygons), 'materials', [m.name for m in h.data.materials])
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        region = next(r for r in area.regions if r.type == 'WINDOW')
        with bpy.context.temp_override(window=bpy.context.window, area=area, region=region):
            bpy.ops.view3d.view_selected()
bpy.ops.object.select_all(action='DESELECT')
