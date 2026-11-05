# Step 8 (live): Yemeni tower houses. Stone lower storeys, brown brick (Sana'a) or stone (Taiz) above,
# white gypsum bands, window frames, qamariya half-moon windows, crenellated parapet. Front faces -Y.
exec(open('/home/morashad17/dev/rashad3dwebsite2/tools/blender/lib.py').read())

STONE, BRICK, GYPSUM = tex_mat('rustic_stone_wall'), tex_mat('brown_brick_02'), tex_mat('white_plaster_02')
DARK = flat_mat('window_dark', (0.03, 0.025, 0.025), 1.0)
WOOD = flat_mat('door_wood', (0.22, 0.12, 0.06), 0.8)
GLASS = flat_mat('qamariya_glass', (0.9, 0.55, 0.25), 0.4, emit=(1.0, 0.62, 0.3), strength=2.5)
GLASS_DAY = flat_mat('qamariya_glass_day', (0.55, 0.3, 0.35), 0.4, emit=(0.9, 0.5, 0.35), strength=0.6)

def house(tag, chapter, floors, stone_floors, w, d, upper, glow, x0):
    b = Builder(tag, (x0, 0, 0)); fh = 1.05; H = floors * fh
    b.box(STONE, (w, d, stone_floors * fh), (0, 0, stone_floors * fh / 2), 1.6)
    if floors > stone_floors:
        b.box(upper, (w * 0.98, d * 0.98, (floors - stone_floors) * fh), (0, 0, stone_floors * fh + (floors - stone_floors) * fh / 2), 1.2)
    for f in range(1, floors):  # gypsum bands between storeys
        b.box(GYPSUM, (w + 0.05, d + 0.05, 0.09), (0, 0, f * fh), 0.8)
    # decorative white frieze under the roof: a band with a row of little dentils
    b.box(GYPSUM, (w + 0.08, d + 0.08, 0.22), (0, 0, H - 0.11), 0.8)
    for side in ('front', 'back', 'left', 'right'):
        n = 7
        for i in range(n):
            t = (i + 0.5) / n - 0.5
            if side in ('front', 'back'):
                y = (-1 if side == 'front' else 1) * (d / 2 + 0.06); b.box(GYPSUM, (0.1, 0.04, 0.1), (t * w, y, H - 0.33), 0.5)
            else:
                x = (-1 if side == 'left' else 1) * (w / 2 + 0.06); b.box(GYPSUM, (0.04, 0.1, 0.1), (x, t * d, H - 0.33), 0.5)
    # parapet with stepped corner merlons
    b.box(GYPSUM, (w + 0.1, d + 0.1, 0.06), (0, 0, H + 0.02), 0.8)
    for sx in (-1, 1):
        for sy in (-1, 1):
            b.box(GYPSUM, (0.28, 0.28, 0.42), (sx * (w / 2 - 0.1), sy * (d / 2 - 0.1), H + 0.24), 0.5)
            b.box(GYPSUM, (0.16, 0.16, 0.2), (sx * (w / 2 - 0.1), sy * (d / 2 - 0.1), H + 0.54), 0.5)
    for k in range(3):
        b.box(upper, (0.2, 0.2, 0.26), ((k - 1) * w * 0.28, -d / 2 + 0.08, H + 0.16), 0.5)
    # windows: white frame, dark pane, qamariya half-moon above; front/back 2 per floor, sides 1
    glass = GLASS if glow else GLASS_DAY
    for f in range(1, floors):
        z = f * fh + 0.42
        for side, cols in (('front', 2), ('back', 2), ('left', 1), ('right', 1)):
            for c in range(cols):
                t = 0 if cols == 1 else (c - 0.5) * 0.48
                if side in ('front', 'back'):
                    s = -1 if side == 'front' else 1; x, y = t * w, s * (d / 2)
                    b.box(GYPSUM, (0.42, 0.04, 0.58), (x, y + s * 0.02, z), 0.5)
                    b.box(DARK, (0.28, 0.05, 0.44), (x, y + s * 0.035, z - 0.02), 1)
                    b.box(GYPSUM, (0.48, 0.04, 0.05), (x, y + s * 0.03, z + 0.33), 0.5)
                    b.half_disc(glass, 0.17, (x, y + s * 0.055, z + 0.36), 'y')
                else:
                    s = -1 if side == 'left' else 1; x, y = s * (w / 2), t * d
                    b.box(GYPSUM, (0.04, 0.42, 0.58), (x + s * 0.02, y, z), 0.5)
                    b.box(DARK, (0.05, 0.28, 0.44), (x + s * 0.035, y, z - 0.02), 1)
                    b.box(GYPSUM, (0.04, 0.48, 0.05), (x + s * 0.03, y, z + 0.33), 0.5)
                    b.half_disc(glass, 0.17, (x + s * 0.055, y, z + 0.36), 'x')
    # carved wooden door with a white frame
    b.box(GYPSUM, (0.7, 0.05, 1.0), (0, -d / 2 - 0.02, 0.5), 0.5)
    b.box(WOOD, (0.52, 0.06, 0.84), (0, -d / 2 - 0.035, 0.42), 0.6)
    return b.finish(chapter)

hs = [
    house('taiz_house_a', 'taiz', 5, 3, 2.0, 2.0, STONE, False, -40),
    house('taiz_house_b', 'taiz', 7, 4, 2.2, 2.1, STONE, False, -36),
    house('sanaa_house_a', 'sanaa', 6, 2, 2.3, 2.1, BRICK, True, -31),
    house('sanaa_house_b', 'sanaa', 8, 2, 2.4, 2.2, BRICK, True, -26),
]
frame(hs[2])
