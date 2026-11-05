# Shared helpers for building site assets live in Blender. Use from a script with:
#   exec(open('/home/morashad17/dev/rashad3dwebsite2/tools/blender/lib.py').read())
import bpy, bmesh, math, os
from mathutils import Vector, Matrix

M = bpy.data.materials

def flat_mat(name, color, rough=0.9, emit=None, strength=0.0):
    m = M.get(name) or M.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*color, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Specular IOR Level'].default_value = 0.2
    if emit:
        b.inputs['Emission Color'].default_value = (*emit, 1); b.inputs['Emission Strength'].default_value = strength
    return m

def tex_mat(name):
    """A Poly Haven material, with displacement unlinked (glTF can't export it)."""
    m = M[name]; out = m.node_tree.nodes['Material Output']
    for l in list(out.inputs['Displacement'].links): m.node_tree.links.remove(l)
    return m

def box_uv(obj, tile):
    me = obj.data; bm = bmesh.new(); bm.from_mesh(me); uv = bm.loops.layers.uv.verify()
    for f in bm.faces:
        n = f.normal; ax = max(range(3), key=lambda i: abs(n[i]))
        for l in f.loops:
            p = obj.matrix_world @ l.vert.co
            u, v = [(p.y, p.z), (p.x, p.z), (p.x, p.y)][ax]
            l[uv].uv = (u / tile, v / tile)
    bm.to_mesh(me); bm.free()

class Builder:
    """Adds primitives, applies transforms, box-UVs them, and joins them into one object at the end."""
    def __init__(self, tag, origin=(0, 0, 0)):
        self.tag, self.origin, self.parts = tag, Vector(origin), []
        for o in [o for o in bpy.context.scene.objects if o.get('part_of') == tag or o.name == tag]:
            bpy.data.objects.remove(o, do_unlink=True)
    def _done(self, o, mat, tile):
        o['part_of'] = self.tag; o.data.materials.clear(); o.data.materials.append(mat)
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        box_uv(o, tile); self.parts.append(o); return o
    def box(self, mat, size, loc, tile=1.0, rot=(0, 0, 0)):
        bpy.ops.mesh.primitive_cube_add(size=1, location=self.origin + Vector(loc), rotation=rot)
        o = bpy.context.active_object; o.scale = size; return self._done(o, mat, tile)
    def cyl(self, mat, r, depth, loc, tile=1.0, verts=24, rot=(0, 0, 0), r2=None):
        if r2 is None: bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=self.origin + Vector(loc), rotation=rot)
        else: bpy.ops.mesh.primitive_cone_add(vertices=verts, radius1=r, radius2=r2, depth=depth, location=self.origin + Vector(loc), rotation=rot)
        return self._done(bpy.context.active_object, mat, tile)
    def dome(self, mat, r, loc, tile=1.0, segs=32, rings=10):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=rings * 2, radius=r, location=self.origin + Vector(loc))
        o = bpy.context.active_object; bm = bmesh.new(); bm.from_mesh(o.data)
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context='VERTS'); bm.to_mesh(o.data); bm.free()
        bpy.ops.object.shade_smooth(); return self._done(o, mat, tile)
    def half_disc(self, mat, r, loc, normal_axis='y', tile=1.0, segs=12):
        """A semicircle (the qamariya arch window) standing upright, facing ±y or ±x."""
        bm = bmesh.new(); c = bm.verts.new((0, 0, 0)); ring = []
        for i in range(segs + 1):
            a = math.pi * i / segs; ring.append(bm.verts.new((math.cos(a) * r, 0, math.sin(a) * r)))
        for i in range(segs): bm.faces.new((c, ring[i + 1], ring[i]))
        me = bpy.data.meshes.new('hd'); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new('hd', me); bpy.context.scene.collection.objects.link(o)
        o.location = self.origin + Vector(loc)
        if normal_axis in ('x', '-x'): o.rotation_euler = (0, 0, math.pi / 2)
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        return self._done(o, mat, tile)
    def finish(self, chapter):
        bpy.ops.object.select_all(action='DESELECT')
        for o in self.parts: o.select_set(True)
        bpy.context.view_layer.objects.active = self.parts[0]
        bpy.ops.object.join()
        h = bpy.context.active_object; h.name = h.data.name = self.tag; h['chapter'] = chapter
        bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
        vs = [v.co for v in h.data.vertices]
        mn = Vector([min(v[i] for v in vs) for i in range(3)]); mx = Vector([max(v[i] for v in vs) for i in range(3)])
        h.data.transform(Matrix.Translation(-Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)))); h.location = self.origin
        bm = bmesh.new(); bm.from_mesh(h.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.to_mesh(h.data); bm.free()
        bpy.ops.object.select_all(action='DESELECT')
        print(f'{self.tag}: {len(h.data.polygons)} faces, {mx.x-mn.x:.1f} x {mx.y-mn.y:.1f} x {mx.z-mn.z:.1f} m, materials {[m.name for m in h.data.materials]}')
        return h

def export(obj, out='/tmp/claude-1000/models/export'):
    os.makedirs(out, exist_ok=True)
    loc = obj.location.copy(); obj.location = (0, 0, 0)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active = obj
    p = f"{out}/{obj['chapter']}__{obj.name}.glb"
    bpy.ops.export_scene.gltf(filepath=p, use_selection=True, export_format='GLB', export_yup=True, export_apply=True, use_active_scene=True)
    obj.location = loc; obj.select_set(False); print('exported', p)
    return p

def frame(obj=None):
    for area in bpy.context.screen.areas:
        if area.type == 'VIEW_3D':
            region = next(r for r in area.regions if r.type == 'WINDOW')
            r3d = area.spaces.active.region_3d
            with bpy.context.temp_override(window=bpy.context.window, area=area, region=region):
                bpy.ops.object.select_all(action='DESELECT')
                if obj: obj.select_set(True); bpy.context.view_layer.objects.active = obj
                r3d.view_rotation = __import__('mathutils').Euler((math.radians(72), 0, math.radians(-28))).to_quaternion()
                bpy.ops.view3d.view_selected(); bpy.ops.object.select_all(action='DESELECT')
