# Step 7 (live): darken/tint the slate roof texture to the Holstentor's grey-green, move the gate clear of the other assets.
import bpy, numpy as np
m = bpy.data.materials['roof_slates_02']
img = m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].links[0].from_node.image
if not img.get('tinted'):
    px = np.empty(len(img.pixels), dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
    lum = px[:, :3].mean(axis=1, keepdims=True)
    px[:, :3] = (0.55 * lum + 0.45 * px[:, :3]) * np.array([0.42, 0.52, 0.5], dtype=np.float32)
    img.pixels.foreach_set(px.ravel()); img.update(); img['tinted'] = True
    img.pack()
bpy.data.objects['holstentor'].location = (-30, 0, 0)
print('roof tinted')
