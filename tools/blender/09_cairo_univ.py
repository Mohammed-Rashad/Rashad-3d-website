# Step 9 (live): Cairo University's main building (sandstone, colonnaded portico, ribbed dome on a drum)
# and its clock tower. Front faces -Y.
exec(open('/home/morashad17/dev/rashad3dwebsite2/tools/blender/lib.py').read())
bpy.data.objects['holstentor'].location = (-60, 0, 0)

SAND, LIGHT, PLASTER = tex_mat('sandstone_blocks_05'), tex_mat('white_sandstone_bricks'), tex_mat('white_plaster_02')
DARK = flat_mat('window_dark', (0.03, 0.025, 0.025), 1.0)
DOMEM = flat_mat('dome_stone', (0.72, 0.66, 0.55), 0.7)
CLOCK = flat_mat('clock_face', (0.95, 0.93, 0.86), 0.5, emit=(1.0, 0.95, 0.8), strength=1.2)

b = Builder('cairo_university', (-20, 14, 0))
W, D, H = 12.0, 3.0, 3.4
for sx in (-1, 1):  # two long wings
    b.box(SAND, (W / 2 - 1.6, D, H), (sx * (W / 4 + 0.8), 0, H / 2), 1.4)
    b.box(LIGHT, (W / 2 - 1.5, D + 0.12, 0.25), (sx * (W / 4 + 0.8), 0, H + 0.12), 1)  # cornice
    b.box(LIGHT, (W / 2 - 1.5, D + 0.08, 0.14), (sx * (W / 4 + 0.8), 0, 1.7), 1)      # string course
    for row, z in enumerate((0.9, 2.5)):
        for k in range(6):
            x = sx * (1.9 + k * 0.72)
            b.box(LIGHT, (0.46, 0.05, 0.92), (x, -D / 2 - 0.02, z), 0.6)
            b.box(DARK, (0.32, 0.06, 0.78), (x, -D / 2 - 0.035, z - 0.02), 1)
            b.half_disc(LIGHT, 0.2, (x, -D / 2 - 0.04, z + 0.4), 'y')
# central block, portico with columns and a pediment
b.box(SAND, (3.4, D + 0.6, H + 0.6), (0, -0.3, (H + 0.6) / 2), 1.4)
b.box(LIGHT, (3.6, 0.9, 0.35), (0, -D / 2 - 0.9, H + 0.2), 1)                       # entablature
b.box(LIGHT, (3.8, 1.6, 0.18), (0, -D / 2 - 0.55, 0.09), 1)                         # steps
b.box(LIGHT, (3.6, 1.3, 0.12), (0, -D / 2 - 0.5, 0.24), 1)
for k in range(6):
    x = -1.5 + k * 0.6
    b.cyl(LIGHT, 0.13, H - 0.1, (x, -D / 2 - 1.05, (H - 0.1) / 2 + 0.3), 0.6, verts=14)
    b.box(LIGHT, (0.34, 0.34, 0.14), (x, -D / 2 - 1.05, H + 0.0), 0.5)               # capitals
# triangular pediment
import bmesh as _bm
bm = _bm.new(); v = [bm.verts.new(p) for p in ((-1.85, -0.45, 0), (1.85, -0.45, 0), (0, -0.45, 0.85), (-1.85, 0.45, 0), (1.85, 0.45, 0), (0, 0.45, 0.85))]
for f in ((0, 1, 2), (5, 4, 3), (0, 3, 4, 1), (1, 4, 5, 2), (2, 5, 3, 0)): bm.faces.new([v[i] for i in f])
me = bpy.data.meshes.new('ped'); bm.to_mesh(me); bm.free(); ped = bpy.data.objects.new('ped', me); bpy.context.scene.collection.objects.link(ped)
ped.location = b.origin + Vector((0, -D / 2 - 0.9, H + 0.37)); bpy.context.view_layer.objects.active = ped; ped.select_set(True); b._done(ped, LIGHT, 1)
for k in (-1, 0, 1):  # three tall arched doors behind the columns
    b.box(DARK, (0.55, 0.05, 1.7), (k * 0.95, -D / 2 - 0.62, 1.15), 1)
    b.half_disc(DARK, 0.275, (k * 0.95, -D / 2 - 0.62, 2.0), 'y')
# drum + ribbed dome + lantern
TOP = H + 0.6
b.cyl(SAND, 1.9, 0.9, (0, 0.2, TOP + 0.45), 1.2, verts=40)
b.cyl(LIGHT, 2.0, 0.16, (0, 0.2, TOP + 0.95), 1, verts=40)
for k in range(16):
    a = k / 16 * math.tau
    b.box(DARK, (0.18, 0.05, 0.42), (math.cos(a) * 1.91, 0.2 + math.sin(a) * 1.91, TOP + 0.45), 1, rot=(0, 0, a + math.pi / 2))
b.dome(DOMEM, 1.95, (0, 0.2, TOP + 1.03), 1.2, segs=40, rings=10)
b.cyl(LIGHT, 0.32, 0.5, (0, 0.2, TOP + 3.2), 0.5, verts=16)
b.dome(DOMEM, 0.34, (0, 0.2, TOP + 3.45), 0.5, segs=16, rings=6)
b.cyl(DARK, 0.03, 0.5, (0, 0.2, TOP + 3.95), 1, verts=6)
uni = b.finish('cairo')

# the clock tower, a separate model
t = Builder('cairo_clock_tower', (-6, 14, 0)); TW = 1.4
t.box(SAND, (TW, TW, 6.2), (0, 0, 3.1), 1.4)
for z in (2.0, 4.0):
    t.box(LIGHT, (TW + 0.1, TW + 0.1, 0.14), (0, 0, z), 1)
for sx, sy, ax in ((0, -1, 'y'), (0, 1, 'y'), (-1, 0, 'x'), (1, 0, 'x')):
    for z in (1.0, 3.0):
        if ax == 'y':
            t.box(DARK, (0.3, 0.05, 0.7), (0, sy * (TW / 2 + 0.01), z), 1); t.half_disc(DARK, 0.15, (0, sy * (TW / 2 + 0.02), z + 0.35), 'y')
        else:
            t.box(DARK, (0.05, 0.3, 0.7), (sx * (TW / 2 + 0.01), 0, z), 1); t.half_disc(DARK, 0.15, (sx * (TW / 2 + 0.02), 0, z + 0.35), 'x')
    rot = (math.pi / 2, 0, 0) if ax == 'y' else (math.pi / 2, 0, math.pi / 2)
    t.cyl(CLOCK, 0.42, 0.04, (sx * (TW / 2 + 0.02), sy * (TW / 2 + 0.02), 5.2), 1, verts=28, rot=rot)
    t.cyl(DARK, 0.46, 0.03, (sx * (TW / 2 + 0.01), sy * (TW / 2 + 0.01), 5.2), 1, verts=28, rot=rot)
    hands = ((0.03, 0.3, 0.02), (0.22, 0.03, 0.02)) if ax == 'y' else ((0.02, 0.03, 0.3), (0.02, 0.22, 0.03))
t.box(LIGHT, (TW + 0.25, TW + 0.25, 0.2), (0, 0, 6.3), 1)
for sx in (-1, 1):
    for sy in (-1, 1):
        t.box(LIGHT, (0.18, 0.18, 0.9), (sx * 0.55, sy * 0.55, 6.85), 0.5)
t.dome(DOMEM, 0.72, (0, 0, 7.3), 0.8, segs=24, rings=8)
t.cyl(DARK, 0.025, 0.6, (0, 0, 8.3), 1, verts=6)
tower = t.finish('cairo')
frame(uni)
