# Save a screenshot of the 3D viewport of the open Blender (what the user sees).
# ARGS: out=path, focus=<object name> (frame it from a 3/4 front view), frame=1 (frame all)
import bpy, math
from mathutils import Euler
out = ARGS.get('out', '/tmp/claude-1000/models/view.png')
for area in bpy.context.screen.areas:
    if area.type == 'VIEW_3D':
        region = next(r for r in area.regions if r.type == 'WINDOW')
        r3d = area.spaces.active.region_3d
        with bpy.context.temp_override(window=bpy.context.window, area=area, region=region):
            if ARGS.get('focus'):
                o = bpy.data.objects[ARGS['focus']]
                bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active = o
                r3d.view_rotation = Euler((math.radians(72), 0, math.radians(-28))).to_quaternion()
                bpy.ops.view3d.view_selected(); o.select_set(False)
            elif ARGS.get('frame'):
                bpy.ops.object.select_all(action='SELECT'); bpy.ops.view3d.view_selected(); bpy.ops.object.select_all(action='DESELECT')
            bpy.ops.screen.screenshot_area(filepath=out)
        print('saved', out); break
