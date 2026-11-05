# Turn on Hyper3D Rodin in the add-on (main site + the add-on's public free-trial key).
import bpy
s = bpy.context.scene
s.blendermcp_use_hyper3d = True
s.blendermcp_hyper3d_mode = 'MAIN_SITE'
s.blendermcp_hyper3d_api_key = 'vibecoding'
print('rodin on')
