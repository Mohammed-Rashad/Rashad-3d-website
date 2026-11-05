# Export the procedurally built buildings (houses, Cairo University, clock tower).
exec(open('/home/morashad17/dev/rashad3dwebsite2/tools/blender/lib.py').read())
for n in ('taiz_house_a', 'taiz_house_b', 'sanaa_house_a', 'sanaa_house_b', 'cairo_university', 'cairo_clock_tower'):
    export(bpy.data.objects[n])
