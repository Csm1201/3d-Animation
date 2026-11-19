"""'Life as a GTA 6 NPC': the Blender (Cycles) version of animations/fantastic-3d.

build() creates the whole street once; update(frame) poses everything for one frame.
Story coordinates match the three.js version (x right, y up, z towards camera); B() converts
them to Blender's z-up space. Run through render.py, not directly.
"""
import math
import os

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
A = os.path.join(HERE, 'assets')
FPS, DUR = 30, 14.4
RES = (720, 1280)

T = dict(hookEnd=0.67, freezeEnd=1.0, rewindEnd=1.5, closeStart=4.5, fant=4.55, wideStart=6.25,
         hit=6.5, land=7.75, bump0=8.5, bumpGap=0.6, jay=12.0, slap=12.75, title=13.4)
BUMPS = [T['bump0'] + i * T['bumpGap'] for i in range(5)]
ROAD_HALF, LANE_X, NPC_START_X, NPC_STOP_X, LAND_Z = 5.0, -1.8, -5.1, -2.0, 14.0
PINK_V, CREST, CREST_T = 30.0, -95.0, 3.4


# ---------- helpers ----------
def clamp(v, a, b): return max(a, min(b, v))
def prog(t, a, b): return clamp((t - a) / (b - a), 0, 1)
def lerp(a, b, k): return a + (b - a) * k
def ease(x): return 2 * x * x if x < .5 else 1 - (-2 * x + 2) ** 2 / 2


def hsh(a, b):
    s = (a * 374761393 + b * 668265263) & 0xffffffff
    s = ((s ^ (s >> 13)) * 1274126177) & 0xffffffff
    return (s ^ (s >> 16)) / 4294967296


def hill(z): return 9 * math.exp(-((z + 95) / 22) ** 2)
def B(x, y, z): return Vector((x, -z, y))          # story coords -> Blender


def link(o, coll=None):
    (coll or bpy.context.scene.collection).objects.link(o)
    return o


def new_obj(name, me, mat=None, coll=None, smooth=False):
    o = bpy.data.objects.new(name, me)
    if mat is not None:
        mats = mat if isinstance(mat, (list, tuple)) else [mat]
        for m in mats:
            me.materials.append(m)
    if smooth:
        for p in me.polygons:
            p.use_smooth = True
    return link(o, coll)


def subsurf(o, lv=2):
    m = o.modifiers.new('sub', 'SUBSURF'); m.levels = lv; m.render_levels = lv
    return o


def box_mesh(name, sx, sy, sz):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return me


def box(name, size, loc, mat, coll=None, rot=(0, 0, 0)):
    o = new_obj(name, box_mesh(name, *size), mat, coll); o.location = loc; o.rotation_euler = rot
    return o


def cyl_mesh(name, r1, r2, h, n=24, cap=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, segments=n, radius1=r1, radius2=r2, depth=h)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def sphere_mesh(name, r, seg=24, rings=16):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=rings, radius=r)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


# ---------- materials ----------
def node_mat(name):
    m = bpy.data.materials.new(name)
    try:
        m.use_nodes = True
    except Exception:
        pass
    return m, m.node_tree.nodes, m.node_tree.links


def pbsdf(m):
    return next(n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')


def setin(node, name, value):
    if name in node.inputs:
        node.inputs[name].default_value = value


def mat(name, color, rough=.6, metal=0.0, coat=0.0, emit=None, emit_strength=0.0, alpha=1.0, transmission=0.0, sss=0.0):
    m, nodes, links = node_mat(name)
    p = pbsdf(m)
    setin(p, 'Base Color', (*color, 1)); setin(p, 'Roughness', rough); setin(p, 'Metallic', metal)
    setin(p, 'Coat Weight', coat); setin(p, 'Coat Roughness', .04)
    setin(p, 'Transmission Weight', transmission); setin(p, 'Subsurface Weight', sss)
    if sss:
        setin(p, 'Subsurface Radius', (.9, .35, .2)); setin(p, 'Subsurface Scale', .02)
    if emit is not None:
        setin(p, 'Emission Color', (*emit, 1)); setin(p, 'Emission Strength', emit_strength)
    if alpha < 1:
        setin(p, 'Alpha', alpha)
    return m


def hexc(h):
    """sRGB hex -> linear RGB tuple."""
    def ch(v):
        v /= 255
        return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4
    return (ch((h >> 16) & 255), ch((h >> 8) & 255), ch(h & 255))


IMAGES = {}


def image(path, color=True):
    if path not in IMAGES:
        img = bpy.data.images.load(path, check_existing=True)
        if not color:
            img.colorspace_settings.name = 'Non-Color'
        IMAGES[path] = img
    return IMAGES[path]


def tex_mat(name, tex, scale=1.0, tint=None, rough_mul=1.0, coords='OBJECT', normal=1.0):
    """PBR material from a Poly Haven texture set, box-projected so it tiles in world-ish units."""
    m, nodes, links = node_mat(name)
    p = pbsdf(m)
    tc = nodes.new('ShaderNodeTexCoord'); mp = nodes.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (scale, scale, scale)
    links.new(tc.outputs['Object' if coords == 'OBJECT' else 'Generated'], mp.inputs['Vector'])
    d = os.path.join(A, 'textures', tex)

    def imgnode(fn, color):
        n = nodes.new('ShaderNodeTexImage'); n.image = image(os.path.join(d, fn), color)
        n.projection = 'BOX'; n.projection_blend = .25
        links.new(mp.outputs['Vector'], n.inputs['Vector'])
        return n
    dif = imgnode('diff.jpg', True)
    if tint is not None:
        mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'; mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        links.new(dif.outputs['Color'], mix.inputs['A']); mix.inputs['B'].default_value = (*tint, 1)
        links.new(mix.outputs['Result'], p.inputs['Base Color'])
    else:
        links.new(dif.outputs['Color'], p.inputs['Base Color'])
    if os.path.exists(os.path.join(d, 'rough.jpg')):
        r = imgnode('rough.jpg', False)
        mm = nodes.new('ShaderNodeMath'); mm.operation = 'MULTIPLY'; mm.inputs[1].default_value = rough_mul
        links.new(r.outputs['Color'], mm.inputs[0]); links.new(mm.outputs[0], p.inputs['Roughness'])
    if os.path.exists(os.path.join(d, 'nor.jpg')):
        nimg = imgnode('nor.jpg', False); nm = nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = normal
        links.new(nimg.outputs['Color'], nm.inputs['Color']); links.new(nm.outputs['Normal'], p.inputs['Normal'])
    return m


def emissive(name, color, strength):
    m, nodes, links = node_mat(name)
    for n in list(nodes):
        if n.type == 'BSDF_PRINCIPLED':
            nodes.remove(n)
    e = nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
    links.new(e.outputs[0], out.inputs['Surface'])
    m['emit_node'] = e.name
    return m


def glow_mat(name, color, strength, alpha):
    """Additive-looking transparent emission (beams, glows)."""
    m, nodes, links = node_mat(name)
    for n in list(nodes):
        if n.type == 'BSDF_PRINCIPLED':
            nodes.remove(n)
    e = nodes.new('ShaderNodeEmission'); e.inputs['Color'].default_value = (*color, 1); e.inputs['Strength'].default_value = strength
    tr = nodes.new('ShaderNodeBsdfTransparent'); add = nodes.new('ShaderNodeAddShader')
    mixs = nodes.new('ShaderNodeMixShader'); mixs.inputs['Fac'].default_value = alpha
    links.new(tr.outputs[0], mixs.inputs[1]); links.new(e.outputs[0], mixs.inputs[2])
    links.new(tr.outputs[0], add.inputs[0]); links.new(e.outputs[0], add.inputs[1])
    out = next(n for n in nodes if n.type == 'OUTPUT_MATERIAL')
    links.new(add.outputs[0], out.inputs['Surface'])
    e.inputs['Strength'].default_value = strength * alpha
    m['emit_node'] = e.name
    return m


def set_emit(m, strength):
    m.node_tree.nodes[m['emit_node']].inputs['Strength'].default_value = strength


# ---------- scene setup ----------
S = {}   # handles to animated things


def setup_render():
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'
    sc.cycles.device = 'CPU'
    sc.cycles.samples = 16
    sc.cycles.use_adaptive_sampling = True
    sc.cycles.adaptive_threshold = .04
    sc.cycles.use_denoising = True
    for k, v in dict(max_bounces=5, diffuse_bounces=2, glossy_bounces=2, transmission_bounces=4, transparent_max_bounces=8,
                     volume_bounces=0, caustics_reflective=False, caustics_refractive=False, blur_glossy=1.0).items():
        try:
            setattr(sc.cycles, k, v)
        except Exception:
            pass
    sc.render.resolution_x, sc.render.resolution_y = RES
    sc.render.resolution_percentage = 100
    sc.render.use_persistent_data = True
    sc.render.image_settings.file_format = 'PNG'
    sc.render.fps = FPS
    try:
        sc.view_settings.view_transform = 'AgX'
        sc.view_settings.look = 'AgX - Punchy'
    except Exception:
        pass
    sc.view_settings.exposure = 0.0


def setup_world():
    sc = bpy.context.scene
    w = bpy.data.worlds.new('World'); sc.world = w
    try:
        w.use_nodes = True
    except Exception:
        pass
    nodes, links = w.node_tree.nodes, w.node_tree.links
    bg = next(n for n in nodes if n.type == 'BACKGROUND')
    env = nodes.new('ShaderNodeTexEnvironment')
    env.image = image(os.path.join(A, 'hdri', 'belfast_sunset_puresky.hdr'))
    tc = nodes.new('ShaderNodeTexCoord'); mp = nodes.new('ShaderNodeMapping')
    links.new(tc.outputs['Generated'], mp.inputs['Vector']); links.new(mp.outputs['Vector'], env.inputs['Vector'])
    links.new(env.outputs['Color'], bg.inputs['Color']); bg.inputs['Strength'].default_value = .55
    # rotate the HDRI so its sun sits behind the hill (story -z = Blender +y), and aim a sun lamp the same way
    import numpy as np
    img = env.image; wdt, hgt = img.size
    px = np.empty(wdt * hgt * 4, dtype=np.float32); img.pixels.foreach_get(px)
    lum = px.reshape(hgt, wdt, 4)[..., :3].sum(-1)
    yy, xx = np.unravel_index(int(lum.argmax()), lum.shape)
    u, v = (xx + .5) / wdt, (yy + .5) / hgt
    sun_az = (u - .5) * 2 * math.pi                      # azimuth of the HDRI sun in Blender's equirect mapping
    sun_el = (v - .5) * math.pi
    target_az = math.atan2(1.0, -0.35)                   # towards +y, slightly to the left
    # Blender's equirect lookup is u = 0.5 - atan2(y, x) / 2pi, so the HDRI sun sits at azimuth pi - 2pi*u = -sun_az.
    # The mapping rotates the lookup vector, so rotate by (sun azimuth - wanted azimuth).
    mp.inputs['Rotation'].default_value = (0, 0, -sun_az - target_az)
    el = max(sun_el, math.radians(6))
    d = Vector((math.cos(target_az) * math.cos(el), math.sin(target_az) * math.cos(el), math.sin(el)))
    sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 4.0; sun.color = (1.0, .72, .5); sun.angle = math.radians(1.2)
    so = link(bpy.data.objects.new('Sun', sun)); so.rotation_euler = d.to_track_quat('Z', 'Y').to_euler()
    S['world_mapping'] = mp


# ---------- ground, hill, road ----------
def build_ground():
    # hill terrain
    bm = bmesh.new()
    nx, ny, x0, x1, y0, y1 = 60, 200, -200, 200, -80, 320
    verts = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            x = lerp(x0, x1, i / nx); y = lerp(y0, y1, j / ny)
            row.append(bm.verts.new((x, y, hill(-y) - .04)))
        verts.append(row)
    for j in range(ny):
        for i in range(nx):
            bm.faces.new((verts[j][i], verts[j][i + 1], verts[j + 1][i + 1], verts[j + 1][i]))
    me = bpy.data.meshes.new('terrain'); bm.to_mesh(me); bm.free()
    grass, nodes, links = node_mat('grass')
    p = pbsdf(grass)
    noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = .4
    ramp = nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*hexc(0x3f5a2c), 1); ramp.color_ramp.elements[1].color = (*hexc(0x7a8a4a), 1)
    links.new(noise.outputs['Fac'], ramp.inputs['Fac']); links.new(ramp.outputs['Color'], p.inputs['Base Color'])
    setin(p, 'Roughness', .95)
    new_obj('terrain', me, grass, smooth=True)

    # road following the hill
    asphalt = tex_mat('asphalt', 'asphalt_02', scale=.18, tint=(.75, .72, .8), normal=.8)
    bm = bmesh.new(); prev = None
    for j in range(301):
        y = lerp(-70, 230, j / 300)
        row = [bm.verts.new((x, y, hill(-y) + .02)) for x in (-ROAD_HALF, 0, ROAD_HALF)]
        if prev:
            bm.faces.new((prev[0], prev[1], row[1], row[0])); bm.faces.new((prev[1], prev[2], row[2], row[1]))
        prev = row
    me = bpy.data.meshes.new('road'); bm.to_mesh(me); bm.free()
    new_obj('road', me, asphalt)

    def strip(name, x, w, m, y0=-70, y1=230, dash=None):
        bm = bmesh.new(); prev = None; n = int((y1 - y0) * 2)
        for j in range(n + 1):
            y = lerp(y0, y1, j / n)
            row = [bm.verts.new((x - w / 2, y, hill(-y) + .028)), bm.verts.new((x + w / 2, y, hill(-y) + .028))]
            on = True if dash is None else (y % dash[0]) < dash[1]
            if prev and on:
                bm.faces.new((prev[0], prev[1], row[1], row[0]))
            prev = row
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        new_obj(name, me, m)
    yellow = mat('paint_yellow', hexc(0xd9b43a), rough=.55); white = mat('paint_white', hexc(0xe6e3ea), rough=.5)
    strip('centre_a', -.12, .1, yellow); strip('centre_b', .12, .1, yellow)
    strip('edge_l', -ROAD_HALF + .35, .12, white); strip('edge_r', ROAD_HALF - .35, .12, white)
    strip('lane_l', -2.6, .1, white, dash=(9, 3)); strip('lane_r', 2.6, .1, white, dash=(9, 3))
    for k in range(10):     # crosswalk 12 m up the street (he's not using it)
        box(f'zebra{k}', (.5, 3.2, .01), (-4.4 + k * .98, 12, .03), white)

    paving = tex_mat('paving', 'large_grey_tiles', scale=.5, tint=(.92, .86, .8))
    curb_m = tex_mat('curb', 'concrete_floor_02', scale=.6)
    for side in (-1, 1):
        box(f'sidewalk{side}', (3.6, 130, .16), (side * (ROAD_HALF + 1.8), 0, .08), paving)
        box(f'curb{side}', (.2, 130, .19), (side * (ROAD_HALF + .02), 0, .095), curb_m)


# ---------- buildings ----------
def build_buildings():
    coll = bpy.data.collections.new('buildings'); bpy.context.scene.collection.children.link(coll)
    walls = [tex_mat(f'wall{i}', t, scale=.35, tint=hexc(c), normal=.6) for i, (t, c) in enumerate([
        ('beige_wall_001', 0xffd6c8), ('painted_plaster_wall', 0xbfe8e0), ('white_plaster_02', 0xffe2b8),
        ('beige_wall_001', 0xd8ccf2), ('white_plaster_02', 0xfff2c0), ('painted_plaster_wall', 0xc0dcf4),
        ('white_plaster_02', 0xf6eee6), ('beige_wall_001', 0xffc8a8)])]
    trim = mat('trim', hexc(0xf2ece6), rough=.6)
    glass_dark = mat('win_glass', hexc(0x1c2436), rough=.04, metal=.9)
    glass_lit = mat('win_lit', hexc(0xffd9a0), rough=.3, emit=hexc(0xffd29a), emit_strength=2.2)
    frame_m = mat('win_frame', hexc(0xe8e2dc), rough=.5)
    shop_glass = mat('shop_glass', hexc(0x223044), rough=.03, metal=.7)
    shop_in = emissive('shop_inside', hexc(0xffd9a8), 1.2)
    door_m = mat('door', hexc(0x3a2a22), rough=.5)
    rail_m = mat('rail', hexc(0x222228), rough=.35, metal=.8)
    ac_m = mat('ac', hexc(0x9a9aa4), rough=.45, metal=.5)
    aw_cols = [(0xe84a6f, 0xffffff), (0x2c8f7a, 0xffffff), (0xf2a33a, 0xffffff), (0x3a5fcf, 0xffffff)]
    awnings = []
    for i, (a, b) in enumerate(aw_cols):
        m, nodes, links = node_mat(f'awning{i}')
        p = pbsdf(m); tc = nodes.new('ShaderNodeTexCoord'); wave = nodes.new('ShaderNodeTexWave')
        wave.wave_type = 'BANDS'; wave.bands_direction = 'Y'; wave.inputs['Scale'].default_value = 3.0; wave.wave_profile = 'SAW'
        links.new(tc.outputs['Object'], wave.inputs['Vector'])
        step = nodes.new('ShaderNodeMath'); step.operation = 'GREATER_THAN'; step.inputs[1].default_value = .5
        links.new(wave.outputs['Fac'], step.inputs[0])
        mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
        mix.inputs['A'].default_value = (*hexc(a), 1); mix.inputs['B'].default_value = (*hexc(b), 1)
        links.new(step.outputs[0], mix.inputs['Factor']); links.new(mix.outputs['Result'], p.inputs['Base Color'])
        setin(p, 'Roughness', .85); setin(p, 'Sheen Weight', .3)
        awnings.append(m)
    signs = ['MOTEL', 'TACOS', 'PAWN', '24H', 'SURF', 'LIQUOR', 'NAILS', 'DINER', 'PIZZA', 'GYM']
    neon_mats = [emissive('neon_pink', hexc(0xff4fa3), 6.0), emissive('neon_teal', hexc(0x3fe6d2), 6.0)]
    S['neon'] = neon_mats
    i = 0
    for side in (-1, 1):
        z = -55.0
        while z < 45:
            d = 8 + hsh(i, 4) * 6; w = 8 + hsh(i, 5) * 5; h = 9 + hsh(i, 6) * 20
            x0 = side * (ROAD_HALF + 3.6)                 # street-facing facade plane
            cy = -(z + d / 2)                              # Blender y of the building centre
            wall = walls[i % len(walls)]
            box(f'b{i}', (w, d, h), (x0 + side * w / 2, cy, h / 2), wall, coll)
            box(f'b{i}_band', (w + .3, d + .3, .3), (x0 + side * w / 2, cy, 4.3), trim, coll)
            box(f'b{i}_cornice', (w + .5, d + .5, .5), (x0 + side * w / 2, cy, h + .2), trim, coll)
            # windows: frame, recessed glass, sill
            bm_g, bm_l, bm_f = bmesh.new(), bmesh.new(), bmesh.new()
            cols = max(2, int(d / 2.6)); rows = max(1, int((h - 5.2) / 3.2))
            for r in range(rows):
                for c in range(cols):
                    wy = cy - d / 2 + (c + .5) * d / cols; wz = 5.6 + r * 3.2 + 1.0
                    lit = hsh(i * 31 + c, r * 7) > .58
                    tgt = bm_l if lit else bm_g
                    gx = x0 - side * .02
                    for bmx, xoff, sw, sh in ((tgt, gx, 1.15, 1.55), (bm_f, x0 - side * .06, 1.35, .1)):
                        pass
                    # glass pane
                    v = [tgt.verts.new((gx, wy + dy, wz + dz)) for dy, dz in ((-.58, -.78), (.58, -.78), (.58, .78), (-.58, .78))]
                    tgt.faces.new(v if side > 0 else v[::-1])
                    # frame bars (top/bottom/left/right/mullion) and sill
                    fx = x0 - side * .07
                    for (cy2, cz2, sy2, sz2) in ((wy, wz + .82, 1.32, .1), (wy, wz - .82, 1.32, .1), (wy - .62, wz, .1, 1.7), (wy + .62, wz, .1, 1.7), (wy, wz, .06, 1.6), (wy, wz - .92, 1.45, .08)):
                        bmesh.ops.create_cube(bm_f, size=1, matrix=Matrix.LocRotScale(Vector((fx if sy2 != 1.45 else x0 - side * .14, cy2, cz2)), None, Vector((.12 if sy2 != 1.45 else .26, sy2, sz2))))
            for bm_, nm, m in ((bm_g, 'glass', glass_dark), (bm_l, 'lit', glass_lit), (bm_f, 'frames', frame_m)):
                me = bpy.data.meshes.new(f'b{i}_{nm}'); bm_.to_mesh(me); bm_.free()
                new_obj(f'b{i}_{nm}', me, m, coll)
            # storefront: glass, glowing interior, door, awning, neon sign
            box(f'b{i}_shop', (.08, d - 1.8, 2.7), (x0 - side * .03, cy, 1.75), shop_glass, coll)
            box(f'b{i}_shopin', (.05, d - 2.0, 2.5), (x0 + side * .25, cy, 1.75), shop_in, coll)
            box(f'b{i}_door', (.1, 1.1, 2.4), (x0 - side * .05, -(z + .9), 1.2), door_m, coll)
            aw = box(f'b{i}_aw', (1.7, d - .6, .07), (x0 - side * .85, cy, 3.55), awnings[i % len(awnings)], coll, rot=(0, -side * .3, 0))
            aw.modifiers.new('bev', 'BEVEL').width = .02
            # neon sign as real 3D text
            cu = bpy.data.curves.new(f'sign{i}', 'FONT'); cu.body = signs[i % len(signs)]; cu.size = .8; cu.extrude = .03
            cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
            so = new_obj(f'sign{i}', cu, neon_mats[int(hsh(i, 7) * 2)], coll)
            so.location = (x0 - side * .12, cy, 4.95); so.rotation_euler = (math.pi / 2, 0, -side * math.pi / 2)
            # balconies
            if hsh(i, 8) > .45:
                for k, by in enumerate(range(0, rows)):
                    zz = 5.6 + by * 3.2 - .05
                    box(f'b{i}_bal{k}', (1.1, d * .5, .14), (x0 - side * .55, cy, zz), trim, coll)
                    box(f'b{i}_rail{k}', (.04, d * .5, .9), (x0 - side * 1.08, cy, zz + .5), rail_m, coll)
            for k in range(2):
                box(f'b{i}_ac{k}', (1.2, 1.0, .8), (x0 + side * (w * .3 + k * 2), cy + 1.5 - k * 2.5, h + .85), ac_m, coll)
            z += d + .3; i += 1


# ---------- Poly Haven props ----------
TEMPLATES = {}


def load_gltf(name):
    if name in TEMPLATES:
        return TEMPLATES[name]
    d = os.path.join(A, 'models', name)
    path = next(os.path.join(d, f) for f in os.listdir(d) if f.endswith('.gltf'))
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    objs = [o for o in bpy.data.objects if o not in before]
    coll = bpy.data.collections.new(f'tpl_{name}')
    for o in objs:
        for c in o.users_collection:
            c.objects.unlink(o)
        coll.objects.link(o)
    TEMPLATES[name] = coll
    return coll


def place(name, loc, rot_z=0.0, scale=1.0):
    coll = load_gltf(name)
    inst = bpy.data.objects.new(f'{name}_inst', None)
    inst.instance_type = 'COLLECTION'; inst.instance_collection = coll
    inst.location = loc; inst.rotation_euler = (0, 0, rot_z); inst.scale = (scale,) * 3
    return link(inst)


def build_props():
    for side in (-1, 1):
        for z in range(-48, 42, 13):
            zz = z + (6 if side > 0 else 0)
            place('street_lamp_01', B(side * (ROAD_HALF + .55), .16, zz), rot_z=(0 if side < 0 else math.pi), scale=1.0)
            lamp = bpy.data.lights.new('lamp', 'POINT'); lamp.energy = 60; lamp.color = (1, .8, .55); lamp.shadow_soft_size = .3
            lo = link(bpy.data.objects.new('lamp', lamp)); lo.location = B(side * (ROAD_HALF - .6), 5.6, zz)
    for x, z in ((-5.6, 7), (5.6, -9), (5.6, 19)):
        place('fire_hydrant', B(x, .16, z), rot_z=hsh(int(z), 2) * 6)
    for x, z in ((-5.6, -6), (5.7, 4), (-5.6, 22), (5.7, -22)):
        place('metal_trash_can', B(x, .16, z), rot_z=hsh(int(z), 3) * 6)
    for x, z in ((-7.9, 10), (7.9, -4), (7.9, 26)):
        place('modular_street_seating', B(x, .16, z), rot_z=math.pi / 2)
    for x, z in ((7.6, 9), (-7.8, -14)):
        place('utility_box_01', B(x, .16, z), rot_z=math.pi / 2)
    for x, z in ((1.4, 6), (-2.6, -26), (2.2, 24)):
        place('water_manhole_cover', B(x, .02, z))
    # trees and shrubs on the hill and in planters
    for k in range(14):
        x = -60 + k * 9 + (hsh(k, 1) - .5) * 5
        if abs(x) < 7:
            continue
        z = -95 + (hsh(k, 3) - .5) * 14
        place('island_tree_01' if k % 2 else 'island_tree_02', B(x, hill(z) - .1, z), rot_z=hsh(k, 4) * 6, scale=.8 + hsh(k, 5) * .5)
    for k in range(10):
        x = (-1 if k % 2 else 1) * (8.2 + hsh(k, 9) * .3); z = -40 + k * 8.5
        place('shrub_01' if k % 3 else 'shrub_02', B(x, .16, z), rot_z=hsh(k, 6) * 6, scale=.7)


# ---------- palm trees ----------
def build_palm(name, x, z, h, lean, seed):
    bark = S.setdefault('bark', tex_mat('palm_bark', 'palm_tree_bark', scale=1.5, coords='OBJECT'))
    leaf = S.get('leaf')
    if leaf is None:
        leaf, nodes, links = node_mat('palm_leaf')
        p = pbsdf(leaf)
        noise = nodes.new('ShaderNodeTexNoise'); noise.inputs['Scale'].default_value = 3
        ramp = nodes.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].color = (*hexc(0x2d5a22), 1); ramp.color_ramp.elements[1].color = (*hexc(0x6f8a32), 1)
        links.new(noise.outputs['Fac'], ramp.inputs['Fac']); links.new(ramp.outputs['Color'], p.inputs['Base Color'])
        setin(p, 'Roughness', .55); setin(p, 'Subsurface Weight', .25); setin(p, 'Subsurface Radius', (.2, .5, .1)); setin(p, 'Subsurface Scale', .05)
        S['leaf'] = leaf
        S['dead_leaf'] = mat('palm_dead', hexc(0x8a6a3a), rough=.8)
    base = B(x, hill(z) + (.16 if abs(x) < 9 else 0), z)
    # trunk: rings along a bent curve, tapering, slightly bulged at the base
    bm = bmesh.new(); rings = []
    n, segs = 24, 12
    for j in range(n + 1):
        t = j / n
        cx = lean * t * t; cz = h * t
        r = .23 * (1 - .35 * t) + .1 * math.exp(-t * 12)
        ring = [bm.verts.new((cx + r * math.cos(a), r * math.sin(a), cz)) for a in (k * 2 * math.pi / segs for k in range(segs))]
        rings.append(ring)
    for j in range(n):
        for k in range(segs):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % segs], rings[j + 1][(k + 1) % segs], rings[j + 1][k]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    trunk = new_obj(name, me, bark, smooth=True); trunk.location = base
    top = base + Vector((lean, 0, h))
    # fronds: a curved rachis with ~36 drooping leaflets per side
    bm = bmesh.new(); bm_dead = bmesh.new()
    nf = 13
    for f in range(nf + 3):
        dead = f >= nf
        az = (f / nf) * 2 * math.pi + hsh(seed, f) * .4
        tilt = (.25 + hsh(seed, f + 20) * .5) if not dead else 1.25
        L = 3.4 + hsh(seed, f + 40) * .8
        tgt = bm_dead if dead else bm
        pts = []
        for s in range(19):
            u = s / 18
            dist = L * u; droop = -(u ** 2) * (1.6 + tilt) + math.sin(tilt) * .3 * u
            pts.append(Vector((math.cos(az) * dist * math.cos(tilt * .3), math.sin(az) * dist * math.cos(tilt * .3), droop + .1)))
        side_dir = Vector((-math.sin(az), math.cos(az), 0))
        for s in range(1, 18):
            p0, p1 = pts[s], pts[s + 1]
            fwd = (p1 - p0).normalized()
            ll = .55 * math.sin(math.pi * (s / 18) ** .8) + .12
            for sd in (-1, 1):
                for k in range(2):      # two leaflets per segment per side
                    q = p0.lerp(p1, k * .5)
                    tip = q + side_dir * sd * ll + fwd * ll * .45 + Vector((0, 0, -ll * .55))
                    wv = fwd * .045
                    v = [tgt.verts.new(q - wv), tgt.verts.new(q + wv), tgt.verts.new(tip)]
                    tgt.faces.new(v if sd > 0 else v[::-1])
        # rachis
        for s in range(18):
            a, b = pts[s], pts[s + 1]
            v = [tgt.verts.new(a + Vector((0, 0, -.03))), tgt.verts.new(b + Vector((0, 0, -.03))), tgt.verts.new(b + Vector((0, 0, .03))), tgt.verts.new(a + Vector((0, 0, .03)))]
            tgt.faces.new(v)
    for bm_, m, nm in ((bm, S['leaf'], 'fronds'), (bm_dead, S['dead_leaf'], 'dead')):
        me = bpy.data.meshes.new(f'{name}_{nm}'); bm_.to_mesh(me); bm_.free()
        o = new_obj(f'{name}_{nm}', me, m, smooth=True); o.location = top
    nuts = new_obj(f'{name}_nuts', sphere_mesh(f'{name}_nuts', .32, 12, 8), mat('nuts', hexc(0x5a3e22), .6))
    nuts.location = top + Vector((0, 0, -.2)); nuts.scale = (1, 1, .8)


def build_palms():
    for k, z in enumerate((-34, -20, -1, 20, 34)):
        build_palm(f'palmL{k}', -7.6, z + 3, 8.5 + hsh(z, 1) * 2.5, .9, k)
        build_palm(f'palmR{k}', 7.6, z - 3, 8 + hsh(z, 2) * 2.5, -.9, k + 10)
    for k in range(8):
        x = -45 + k * 12 + (hsh(k, 11) - .5) * 4
        if abs(x) < 7:
            continue
        z = -95 + (hsh(k, 3) - .5) * 10
        build_palm(f'palmH{k}', x, z, 6 + hsh(k, 4) * 4, .6, k + 30)


# ---------- people ----------
SKINS = [0xc98b5e, 0x8d5a3b, 0xf1c9a5, 0xa86f4c, 0xe0ac85, 0x6b4430]
HAIRS = [0x2b1a12, 0x111111, 0x6b4a2b, 0xb07b3a, 0x8a8a8a, 0x3a2416]
# skeleton joints (index, parent) in rest pose, story coords relative to the feet
JOINTS = ['pelvis', 'spine', 'chest', 'neck', 'headb', 'hipL', 'kneeL', 'ankleL', 'toeL', 'hipR', 'kneeR', 'ankleR', 'toeR',
          'shL', 'elL', 'wrL', 'handL', 'shR', 'elR', 'wrR', 'handR']
J = {n: i for i, n in enumerate(JOINTS)}


def pattern_mat(name, base, dot, kind):
    m, nodes, links = node_mat(name)
    p = pbsdf(m); setin(p, 'Roughness', .8); setin(p, 'Sheen Weight', .4)
    if kind is None:
        setin(p, 'Base Color', (*hexc(base), 1))
        return m
    tc = nodes.new('ShaderNodeTexCoord')
    mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    mix.inputs['A'].default_value = (*hexc(base), 1); mix.inputs['B'].default_value = (*hexc(dot), 1)
    if kind == 'flowers':
        vor = nodes.new('ShaderNodeTexVoronoi'); vor.inputs['Scale'].default_value = 22
        links.new(tc.outputs['Object'], vor.inputs['Vector'])
        lt = nodes.new('ShaderNodeMath'); lt.operation = 'LESS_THAN'; lt.inputs[1].default_value = .22
        links.new(vor.outputs['Distance'], lt.inputs[0]); links.new(lt.outputs[0], mix.inputs['Factor'])
    else:
        wave = nodes.new('ShaderNodeTexWave'); wave.bands_direction = 'Z'; wave.inputs['Scale'].default_value = 9; wave.wave_profile = 'SAW'
        links.new(tc.outputs['Object'], wave.inputs['Vector'])
        gt = nodes.new('ShaderNodeMath'); gt.operation = 'GREATER_THAN'; gt.inputs[1].default_value = .55
        links.new(wave.outputs['Fac'], gt.inputs[0]); links.new(gt.outputs[0], mix.inputs['Factor'])
    links.new(mix.outputs['Result'], p.inputs['Base Color'])
    return m


def tube_mesh(name, r0, r1, seg=16, rings=6):
    """Unit-length rounded tube along +Z (0..1) with radius r0 at the bottom and r1 at the top.
    Scaled along Z each frame to span two joints."""
    bm = bmesh.new(); prev = None; layers = []
    for j in range(rings + 1):
        u = j / rings; r = lerp(r0, r1, u)
        layers.append([bm.verts.new((r * math.cos(a), r * math.sin(a), u)) for a in (k * 2 * math.pi / seg for k in range(seg))])
    for j in range(rings):
        for k in range(seg):
            bm.faces.new((layers[j][k], layers[j][(k + 1) % seg], layers[j + 1][(k + 1) % seg], layers[j + 1][k]))
    bot = bm.verts.new((0, 0, -r0 * .02)); top = bm.verts.new((0, 0, 1 + r1 * .02))
    for k in range(seg):
        bm.faces.new((layers[0][(k + 1) % seg], layers[0][k], bot)); bm.faces.new((layers[-1][k], layers[-1][(k + 1) % seg], top))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def torso_mesh(name, sections):
    """Smooth trunk from elliptical sections (z, half_width, half_depth), z up, front towards -y."""
    bm = bmesh.new(); seg = 20; layers = []
    for (z, hw, hd) in sections:
        layers.append([bm.verts.new((hw * math.cos(a), hd * math.sin(a) * (1.08 if math.sin(a) < 0 else 1), z)) for a in (k * 2 * math.pi / seg for k in range(seg))])
    for j in range(len(layers) - 1):
        for k in range(seg):
            bm.faces.new((layers[j][k], layers[j][(k + 1) % seg], layers[j + 1][(k + 1) % seg], layers[j + 1][k]))
    bm.faces.new(layers[0][::-1]); bm.faces.new(layers[-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = True
    return me


def make_person(name, o):
    skin = mat(f'{name}_skin', hexc(o['skin']), rough=.5, sss=.15)
    shirt = pattern_mat(f'{name}_shirt', o.get('shirt', 0xffffff), o.get('dot', 0xffffff), o.get('kind'))
    pants = mat(f'{name}_pants', hexc(o['pants']), rough=.85)
    shoe = mat(f'{name}_shoe', hexc(o.get('shoes', 0x222222)), rough=.45)
    hair_m = mat(f'{name}_hair', hexc(o['hair']), rough=.6)
    parts = {'segs': []}

    def seg(a, b, r0, r1, m):
        ob = new_obj(f'{name}_{a}{b}', tube_mesh(f'{name}_{a}{b}', r0, r1), m); subsurf(ob, 1)
        parts['segs'].append((ob, a, b))
    # torso (shirt) and hips (pants), oriented by the pelvis/chest frame
    parts['torso'] = new_obj(f'{name}_torso', torso_mesh(f'{name}_torso', [(-.04, .16, .1), (.06, .155, .1), (.18, .15, .095), (.3, .175, .105), (.42, .205, .11), (.5, .2, .1), (.55, .13, .075), (.57, .06, .05)]), shirt)
    subsurf(parts['torso'], 1)
    parts['hips'] = new_obj(f'{name}_hips', torso_mesh(f'{name}_hips', [(-.16, .15, .1), (-.08, .17, .108), (0, .168, .105), (.06, .162, .1)]), pants)
    subsurf(parts['hips'], 1)
    for s_ in 'LR':
        seg('hip' + s_, 'knee' + s_, .082, .064, pants)
        seg('knee' + s_, 'ankle' + s_, .06, .043, skin if o.get('shorts') else pants)
        seg('sh' + s_, 'el' + s_, .05, .043, shirt if o.get('longSleeves') else skin)
        seg('el' + s_, 'wr' + s_, .041, .032, skin)
        sl = new_obj(f'{name}_sleeve{s_}', tube_mesh(f'{name}_sleeve{s_}', .072, .062), shirt); subsurf(sl, 1)
        parts['segs'].append((sl, 'sh' + s_, 'sleeve' + s_))
        hand = new_obj(f'{name}_hand{s_}', sphere_mesh(f'{name}_hand{s_}', .05, 12, 8), skin); hand.scale = (.75, .5, 1.1)
        parts['hand' + s_] = hand
        sh = new_obj(f'{name}_shoe{s_}', box_mesh(f'{name}_shoe{s_}', .11, .27, .08), shoe); subsurf(sh, 2)
        parts['shoe' + s_] = sh
    seg('neckb', 'headb', .052, .048, skin)
    # head: smooth skull + jaw, nose, ears, eyes, brows, mouth, hair, optional shades/cap
    head = bpy.data.objects.new(f'{name}_head', None); link(head); parts['head'] = head
    def hp(nm, me_, m, loc, scale=(1, 1, 1), rot=(0, 0, 0)):
        ob = new_obj(f'{name}_{nm}', me_, m); ob.parent = head; ob.location = loc; ob.scale = scale; ob.rotation_euler = rot
        return ob
    hp('skull', sphere_mesh(f'{name}_skull', .118, 28, 20), skin, (0, .005, .015), (.86, .98, 1.08))
    hp('jaw', sphere_mesh(f'{name}_jaw', .085, 20, 14), skin, (0, -.018, -.05), (.92, 1.0, .85))
    hp('nose', cyl_mesh(f'{name}_nose', .021, .007, .05, 10), skin, (0, -.112, -.005), rot=(math.pi / 2 - .35, 0, 0))
    for s_ in (-1, 1):
        hp(f'ear{s_}', sphere_mesh(f'{name}_ear{s_}', .027, 10, 8), skin, (s_ * .1, .01, -.005), (.4, .75, 1.1))
    if o.get('shades'):
        lens = mat(f'{name}_lens', (.01, .01, .015), rough=.05, metal=.9)
        for s_ in (-1, 1):
            hp(f'lens{s_}', box_mesh(f'{name}_lens{s_}', .058, .012, .034), lens, (s_ * .037, -.104, .018))
        hp('bridge', box_mesh(f'{name}_bridge', .11, .01, .008), lens, (0, -.104, .03))
        for s_ in (-1, 1):
            hp(f'arm{s_}', box_mesh(f'{name}_arm{s_}', .006, .1, .008), lens, (s_ * .096, -.058, .026))
    else:
        white = mat(f'{name}_eyew', (.85, .85, .85), rough=.2); pupil = mat(f'{name}_pupil', (.01, .01, .01), rough=.1)
        for s_ in (-1, 1):
            hp(f'eye{s_}', sphere_mesh(f'{name}_eye{s_}', .015, 10, 8), white, (s_ * .036, -.096, .016))
            hp(f'pup{s_}', sphere_mesh(f'{name}_pup{s_}', .008, 8, 6), pupil, (s_ * .036, -.109, .016))
    for s_ in (-1, 1):
        hp(f'brow{s_}', box_mesh(f'{name}_brow{s_}', .04, .01, .009), hair_m, (s_ * .036, -.104, .043), rot=(0, s_ * .1, 0))
    mouth = hp('mouth', box_mesh(f'{name}_mouth', .042, .01, .008), mat(f'{name}_mouth', hexc(0x6a2a24), .5), (0, -.098, -.058))
    parts['mouth'] = mouth
    hair = hp('hair', sphere_mesh(f'{name}_hair', .124, 28, 18), hair_m, (0, .01, .02), (.9, 1.0, 1.08 if o.get('longHair') else 1.03))
    hbm = bmesh.new(); hbm.from_mesh(hair.data)
    bmesh.ops.delete(hbm, geom=[v for v in hbm.verts if v.co.z < -.012 - .6 * v.co.y], context='VERTS')   # hairline: high at the front, low at the back
    hbm.to_mesh(hair.data); hbm.free()
    if o.get('longHair'):
        hp('tail', cyl_mesh(f'{name}_tail', .055, .03, .24, 12), hair_m, (0, .1, -.12), rot=(.35, 0, 0))
    if o.get('cap'):
        capm = mat(f'{name}_cap', hexc(o['cap']), .6)
        c = hp('cap', sphere_mesh(f'{name}_capd', .128, 20, 10), capm, (0, .008, .045), (.92, 1.02, .8))
        cb = bmesh.new(); cb.from_mesh(c.data); bmesh.ops.delete(cb, geom=[v for v in cb.verts if v.co.z < -.005], context='VERTS'); cb.to_mesh(c.data); cb.free()
        hp('brim', box_mesh(f'{name}_brim', .19, .11, .012), capm, (0, -.135, .04))
        if o.get('badge'):
            hp('capbadge', box_mesh(f'{name}_cb', .036, .01, .036), mat(f'{name}_gold', hexc(0xffd23f), .3, .9), (0, -.118, .09))
    if o.get('badge'):
        parts['badge'] = new_obj(f'{name}_badge', box_mesh(f'{name}_badge', .055, .015, .065), mat(f'{name}_gold2', hexc(0xffd23f), .3, .9))
        parts['belt'] = new_obj(f'{name}_belt', torso_mesh(f'{name}_belt', [(-.025, .172, .108), (.025, .172, .108)]), mat(f'{name}_beltm', (.02, .02, .02), .35))
    if o.get('phone'):
        parts['phone'] = new_obj(f'{name}_phone', box_mesh(f'{name}_phone', .075, .012, .15), mat(f'{name}_phonem', (.02, .02, .025), .2, .5))
    return parts


def all_objects(parts):
    out = [parts['torso'], parts['hips'], parts['head'], *parts['head'].children, parts['handL'], parts['handR'], parts['shoeL'], parts['shoeR']]
    out += [o for o, a, b in parts['segs']]
    for k in ('badge', 'belt', 'phone'):
        if k in parts:
            out.append(parts[k])
    return out


# rest-pose bone offsets (story coords, y up) used by the FK below
REST = dict(pelvis=(0, .96, 0), spine=(0, 1.12, 0), chest=(0, 1.36, 0), neck=(0, 1.55, 0), neckb=(0, 1.5, 0), headb=(0, 1.66, 0))


def fk(pose):
    """Joint positions (story coords, relative to the feet, person facing +z) for a pose dict of angles."""
    def R(ax, ay=0.0, az=0.0): return Euler((ax, ay, az), 'XYZ').to_matrix()
    by = pose.get('bob', 0.0)
    P = {k: Vector(v) + Vector((0, by, 0)) for k, v in REST.items()}
    for side, s in (('L', -1), ('R', 1)):
        hip = Vector((s * .1, .93 + by, 0))
        rh = R(-pose.get('hip' + side, 0), 0, pose.get('hipz' + side, 0))
        knee = hip + rh @ Vector((0, -.45, 0))
        rk = rh @ R(pose.get('knee' + side, 0))
        ankle = knee + rk @ Vector((0, -.44, 0))
        toe = ankle + rk @ Vector((0, -.04, .17))
        P['hip' + side], P['knee' + side], P['ankle' + side], P['toe' + side] = hip, knee, ankle, toe
        sh = Vector((s * .2, 1.46 + by, 0))
        rs = R(-pose.get('sh' + side, 0), 0, s * pose.get('shz' + side, .08))
        el = sh + rs @ Vector((0, -.29, 0))
        re = rs @ R(-pose.get('el' + side, .15))
        wr = el + re @ Vector((0, -.25, 0))
        hand = wr + re @ Vector((0, -.08, 0))
        P['sh' + side], P['el' + side], P['wr' + side], P['hand' + side] = sh, el, wr, hand
        P['sleeve' + side] = sh + rs @ Vector((0, -.13, 0))
    return P


def pose_of(kind, ph=0.0, k=1.0):
    p = {}
    if kind == 'walk':
        s = math.sin(ph) * .42 * k
        p.update(hipL=s, hipR=-s, kneeL=max(0, -math.sin(ph - .6)) * .9 * k, kneeR=max(0, math.sin(ph - .6)) * .9 * k,
                 shL=-s * .75, shR=s * .75, elL=.3, elR=.3, bob=abs(math.cos(ph)) * .025)
    elif kind == 'flail':
        p.update(hipL=math.sin(ph) * .9, hipR=-math.sin(ph) * .9, kneeL=.8, kneeR=.5, shzL=2.5 + math.sin(ph * 1.3) * .4, shzR=2.5 + math.cos(ph * 1.3) * .4, elL=.6, elR=.6)
    elif kind == 'lying':
        p.update(shzL=.55, shzR=.55, hipzL=-.12, hipzR=.12)
    elif kind == 'film':
        p.update(shR=1.25, elR=.7, shL=.9, elL=1.2, shzL=-.35)
    return p


CONV = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))   # story -> Blender


def frame_matrix(origin, up, right):
    """World matrix whose local Z is `up`, local X is `right` (orthogonalised), local -Y faces forward."""
    z = up.normalized(); x = (right - z * right.dot(z)).normalized(); y = z.cross(x)
    m = Matrix((x, y, z)).transposed().to_4x4(); m.translation = origin
    return m


def apply_person(parts, root_m, pose, head_rot=(0, 0, 0), mouth=1.0):
    """Places every body part for one frame. root_m maps person-local story coords to story world coords."""
    P = fk(pose)
    M = CONV @ root_m
    W = {k: (M @ v.to_4d()).to_3d() for k, v in P.items()}
    for ob, a, b in parts['segs']:
        A, Bv = W[a], W[b]; d = Bv - A
        m = d.to_track_quat('Z', 'Y').to_matrix().to_4x4(); m.translation = A
        ob.matrix_world = m @ Matrix.Diagonal(Vector((1, 1, max(d.length, 1e-4), 1)))
    right = W['hipR'] - W['hipL']; sc = root_m.to_scale()
    up = W['chest'] - W['pelvis']
    tm = frame_matrix(W['pelvis'], up, right) @ Matrix.Diagonal(Vector((sc.x, sc.z, sc.y, 1)))
    parts['torso'].matrix_world = tm @ Matrix.Translation(Vector((0, 0, .02 + pose.get('bob', 0))))
    parts['hips'].matrix_world = tm
    sh_right = W['shR'] - W['shL']
    for s_ in 'LR':
        fwd = W['hand' + s_] - W['wr' + s_]
        hm = fwd.to_track_quat('-Z', 'Y').to_matrix().to_4x4(); hm.translation = (W['wr' + s_] + W['hand' + s_]) / 2
        parts['hand' + s_].matrix_world = hm @ Matrix.Diagonal(Vector((.75 * sc.x, .5 * sc.x, 1.1 * sc.x, 1)))
        toe = W['toe' + s_] - W['ankle' + s_]
        sm = frame_matrix((W['ankle' + s_] + W['toe' + s_]) / 2 + (M @ Vector((0, 0, 0, 0))).to_3d(), W['knee' + s_] - W['ankle' + s_], right)
        # point the shoe along the foot
        fm = toe.to_track_quat('-Y', 'Z').to_matrix().to_4x4(); fm.translation = W['ankle' + s_] + toe * .45
        parts['shoe' + s_].matrix_world = fm @ Matrix.Diagonal(Vector((sc.x, sc.x, sc.y, 1)))
    hm = M @ Matrix.Translation(P['headb'] + Vector((0, .1, 0))) @ Euler(head_rot, 'XYZ').to_matrix().to_4x4() @ CONV.inverted()
    parts['head'].matrix_world = hm
    parts['mouth'].scale = (1, 1, mouth)
    bob = Vector((0, pose.get('bob', 0), 0))
    if 'badge' in parts:
        parts['badge'].matrix_world = M @ Matrix.Translation(Vector((.09, 1.38, .115)) + bob) @ CONV.inverted()
        parts['belt'].matrix_world = tm @ Matrix.Translation(Vector((0, 0, .05)))
    if 'phone' in parts:
        parts['phone'].matrix_world = M @ Matrix.Translation(P['handR'] + Vector((0, .02, .03))) @ CONV.inverted()
    return P, M


def person_root(x, y, z, rot_y=0.0, rot=None, scale=(1, 1, 1)):
    r = Euler(rot, 'XYZ').to_matrix().to_4x4() if rot else Matrix.Rotation(rot_y, 4, 'Y')
    return Matrix.Translation(Vector((x, y, z))) @ r @ Matrix.Diagonal(Vector((*scale, 1)))


# ---------- vehicles ----------
def paint_mat(name, color, livery=None):
    """Car paint with clear coat. livery: 'police' (black/white doors, white roof) or 'stripe' (white racing stripes)."""
    m, nodes, links = node_mat(name)
    p = pbsdf(m); setin(p, 'Metallic', .55); setin(p, 'Roughness', .32); setin(p, 'Coat Weight', 1.0); setin(p, 'Coat Roughness', .03)
    if livery is None:
        setin(p, 'Base Color', (*color, 1))
        return m
    tc = nodes.new('ShaderNodeTexCoord'); sep = nodes.new('ShaderNodeSeparateXYZ'); links.new(tc.outputs['Object'], sep.inputs[0])
    mix = nodes.new('ShaderNodeMix'); mix.data_type = 'RGBA'
    if livery == 'police':
        mix.inputs['A'].default_value = (*hexc(0x111114), 1); mix.inputs['B'].default_value = (*hexc(0xf2f2f2), 1)
        ab = nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; links.new(sep.outputs['Y'], ab.inputs[0])
        door = nodes.new('ShaderNodeMath'); door.operation = 'LESS_THAN'; door.inputs[1].default_value = 1.0; links.new(ab.outputs[0], door.inputs[0])
        roof = nodes.new('ShaderNodeMath'); roof.operation = 'GREATER_THAN'; roof.inputs[1].default_value = 1.02; links.new(sep.outputs['Z'], roof.inputs[0])
        mx = nodes.new('ShaderNodeMath'); mx.operation = 'MAXIMUM'; links.new(door.outputs[0], mx.inputs[0]); links.new(roof.outputs[0], mx.inputs[1])
        links.new(mx.outputs[0], mix.inputs['Factor'])
    else:
        mix.inputs['A'].default_value = (*color, 1); mix.inputs['B'].default_value = (*hexc(0xf6f6f6), 1)
        ab = nodes.new('ShaderNodeMath'); ab.operation = 'ABSOLUTE'; links.new(sep.outputs['X'], ab.inputs[0])
        a = nodes.new('ShaderNodeMath'); a.operation = 'LESS_THAN'; a.inputs[1].default_value = .1; links.new(ab.outputs[0], a.inputs[0])
        b = nodes.new('ShaderNodeMath'); b.operation = 'GREATER_THAN'; b.inputs[1].default_value = .14; links.new(ab.outputs[0], b.inputs[0])
        c = nodes.new('ShaderNodeMath'); c.operation = 'LESS_THAN'; c.inputs[1].default_value = .26; links.new(ab.outputs[0], c.inputs[0])
        bc = nodes.new('ShaderNodeMath'); bc.operation = 'MULTIPLY'; links.new(b.outputs[0], bc.inputs[0]); links.new(c.outputs[0], bc.inputs[1])
        st = nodes.new('ShaderNodeMath'); st.operation = 'MAXIMUM'; links.new(a.outputs[0], st.inputs[0]); links.new(bc.outputs[0], st.inputs[1])
        links.new(st.outputs[0], mix.inputs['Factor'])
    links.new(mix.outputs['Result'], p.inputs['Base Color'])
    return m


def loft(name, stations, mat_, smooth=True):
    """Car body from cross sections. stations: list of (y, half_width, bottom_z, belt_z, top_z, top_half_width)."""
    bm = bmesh.new(); rings = []
    for (y, hw, zb, zbelt, zt, thw) in stations:
        pts = [(-hw * .92, zb), (-hw, zb + (zbelt - zb) * .45), (-hw * .97, zbelt), (-thw, zt), (0, zt + .015), (thw, zt), (hw * .97, zbelt), (hw, zb + (zbelt - zb) * .45), (hw * .92, zb), (0, zb - .02)]
        rings.append([bm.verts.new((x, y, z)) for x, z in pts])
    n = len(rings[0])
    for j in range(len(rings) - 1):
        for k in range(n):
            bm.faces.new((rings[j][k], rings[j][(k + 1) % n], rings[j + 1][(k + 1) % n], rings[j + 1][k]))
    bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = new_obj(name, me, mat_, smooth=smooth)
    subsurf(o, 2)
    return o


GLASS = None


def make_car(name, kind, paint, plate='NPC 4812'):
    global GLASS
    if GLASS is None:
        GLASS = mat('car_glass', (.02, .03, .05), rough=.02, metal=.85)
    root = bpy.data.objects.new(name, None); link(root)
    L = {'sport': 4.5, 'sedan': 4.7, 'suv': 4.8}[kind]
    if kind == 'sport':
        body = [(-2.25, .86, .32, .62, .78, .7), (-1.9, .92, .3, .66, .86, .8), (-1.2, .94, .28, .7, .9, .84), (0, .95, .28, .72, .9, .86), (1.2, .94, .28, .7, .86, .82), (1.9, .9, .3, .62, .72, .7), (2.28, .82, .34, .5, .58, .55)]
        cab = [(-1.35, .74, .8, .8, .85, .5), (-.6, .76, .8, .82, 1.22, .55), (.3, .76, .8, .82, 1.24, .56), (1.1, .74, .8, .8, .88, .5)]
        lightz = .58
    elif kind == 'sedan':
        body = [(-2.35, .86, .34, .82, .95, .76), (-2.0, .92, .3, .9, 1.0, .84), (-1.2, .94, .28, .94, 1.0, .86), (0, .95, .28, .95, 1.0, .88), (1.2, .94, .28, .93, .98, .86), (2.0, .9, .3, .84, .9, .8), (2.38, .84, .36, .7, .78, .7)]
        cab = [(-1.6, .8, .95, .95, 1.0, .6), (-1.0, .82, .95, .96, 1.44, .66), (.45, .82, .95, .96, 1.46, .66), (1.25, .8, .95, .95, 1.0, .6)]
        lightz = .76
    else:
        body = [(-2.4, .9, .4, 1.0, 1.1, .82), (-2.0, .95, .36, 1.05, 1.12, .88), (0, .97, .34, 1.08, 1.12, .9), (2.0, .94, .36, 1.0, 1.06, .86), (2.42, .88, .42, .86, .94, .76)]
        cab = [(-2.2, .84, 1.08, 1.08, 1.12, .7), (-2.05, .86, 1.08, 1.1, 1.76, .74), (.9, .86, 1.08, 1.1, 1.78, .74), (1.6, .84, 1.08, 1.08, 1.12, .7)]
        lightz = .9
    b = loft(f'{name}_body', [(y, hw, zb, zbelt, zt, thw) for (y, hw, zb, zbelt, zt, thw) in body], paint); b.parent = root
    g = loft(f'{name}_glass', cab, GLASS); g.parent = root
    roof = loft(f'{name}_roof', [(y, hw * .985, max(zb, zt - .06), max(zbelt, zt - .05), zt + .012, thw * 1.01) for (y, hw, zb, zbelt, zt, thw) in cab[1:-1]], paint); roof.parent = root
    interior = box(f'{name}_int', (1.5, (cab[-1][0] - cab[0][0]) * .8, .5), (0, (cab[-1][0] + cab[0][0]) / 2, cab[0][2] + .2), mat('car_int', (.02, .02, .02), .8)); interior.parent = root
    # pillars
    for s in (-1, 1):
        mid = (cab[1][0] + cab[2][0]) / 2
        p_ = box(f'{name}_pil{s}', (.04, .1, cab[1][4] - cab[1][2]), (s * cab[1][1] * .93, mid, (cab[1][4] + cab[1][2]) / 2), paint); p_.parent = root
    # wheels: tyre, rim with spokes, brake caliper
    tyre = S.setdefault('tyre_m', mat('tyre', (.015, .015, .016), .85))
    rim = S.setdefault('rim_m', mat('rim', (.75, .75, .78), .2, 1.0))
    calp = S.setdefault('cal_m', mat('caliper', hexc(0xc0262e), .4))
    for sx in (-1, 1):
        for sy in (-1, 1):
            wy = sy * (L / 2 - .82); wx = sx * .84
            t = new_obj(f'{name}_tyre', cyl_mesh(f'{name}_tyre', .34, .34, .24, 32), tyre, smooth=True); t.parent = root
            t.location = (wx, wy, .34); t.rotation_euler = (0, math.pi / 2, 0)
            bv = t.modifiers.new('bev', 'BEVEL'); bv.width = .06; bv.segments = 3
            r = new_obj(f'{name}_rim', cyl_mesh(f'{name}_rim', .22, .22, .245, 28), rim, smooth=True); r.parent = root
            r.location = (wx + sx * .005, wy, .34); r.rotation_euler = (0, math.pi / 2, 0)
            hub = new_obj(f'{name}_hub', cyl_mesh(f'{name}_hub', .16, .16, .25, 24), mat('hubdark', (.08, .08, .09), .35, .8), smooth=True); hub.parent = root
            hub.location = (wx + sx * .01, wy, .34); hub.rotation_euler = (0, math.pi / 2, 0)
            for k in range(5):
                sp = box(f'{name}_spoke', (.03, .045, .36), (wx + sx * .13, wy, .34), rim); sp.parent = root
                sp.rotation_euler = (k * 2 * math.pi / 5, 0, 0)
            c = box(f'{name}_cal', (.05, .12, .1), (wx + sx * .1, wy - .08, .45), calp); c.parent = root
    # lights, grille, mirrors, plates
    head_m = S.setdefault('headl', emissive('headlight', (1, .95, .85), 8.0))
    tail_m = S.setdefault('taill', emissive('taillight', (1, .05, .05), 5.0))
    trim_m = S.setdefault('trim', mat('car_trim', (.02, .02, .025), .4))
    fy = body[-1][0] + .02; ry = body[0][0] - .02
    for s in (-1, 1):
        h = box(f'{name}_hl', (.36, .05, .1), (s * body[-1][1] * .62, fy, lightz), head_m); h.parent = root
        tl = box(f'{name}_tl', (.34, .05, .09), (s * body[0][1] * .62, ry, lightz + .04), tail_m); tl.parent = root
        mir = box(f'{name}_mir', (.16, .08, .09), (s * (cab[-1][1] + .1), cab[-1][0] - .2, cab[-1][2] + .07), paint); mir.parent = root
    gr = box(f'{name}_grille', (body[-1][1] * .9, .04, .14), (0, fy + .005, lightz - .1), trim_m); gr.parent = root
    for s, yy in ((1, fy + .02), (-1, ry - .02)):
        bp = box(f'{name}_bump', (body[-1][1] * 1.8, .1, .15), (0, yy, .36), trim_m); bp.parent = root
        cu = bpy.data.curves.new(f'{name}_plate', 'FONT'); cu.body = plate; cu.size = .085; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
        pl = box(f'{name}_plate_bg', (.5, .01, .13), (0, yy + s * .055, .5), S.setdefault('plate_m', mat('plate', (.85, .85, .82), .5))); pl.parent = root
        pt = new_obj(f'{name}_plate_t', cu, S.setdefault('plate_t', mat('plate_text', hexc(0x1b2a6b), .5))); pt.parent = root
        pt.location = (0, yy + s * .062, .5); pt.rotation_euler = (math.pi / 2, 0, 0 if s < 0 else math.pi)
    return root


def build_vehicles():
    pink = make_car('pink', 'sport', paint_mat('pink_paint', hexc(0xff2f90), 'stripe'), plate='5 STAR')
    sp = bpy.data.objects.new('pink_spoiler', None)
    wing = box('pink_wing', (1.7, .38, .05), (0, -2.15, 1.0), paint_mat('wing', hexc(0x151518))); wing.parent = pink
    for x in (-.6, .6):
        st = box('pink_wingst', (.05, .1, .25), (x, -2.12, .86), paint_mat('wing2', hexc(0x151518))); st.parent = pink
    glow = new_obj('pink_glow', box_mesh('pink_glow', 2.0, 4.2, .01), glow_mat('underglow', hexc(0xff4fd8), 6, .6)); glow.parent = pink; glow.location = (0, 0, .05)
    ul = bpy.data.lights.new('underglow', 'POINT'); ul.energy = 120; ul.color = hexc(0xff4fd8); ul.shadow_soft_size = 1.0
    ulo = link(bpy.data.objects.new('underglow', ul)); ulo.parent = pink; ulo.location = (0, 0, .2)
    # the five gold stars
    star_m = mat('star', hexc(0xffd23f), .25, .6, emit=hexc(0xffb020), emit_strength=3.0)
    stars = bpy.data.objects.new('stars', None); link(stars); stars.parent = pink; stars.location = (0, 0, 2.5)
    for k in range(5):
        bm = bmesh.new(); pts = []
        for i in range(10):
            a = math.pi / 2 + i * math.pi / 5; r = .13 if i % 2 else .3
            pts.append(bm.verts.new((math.cos(a) * r, 0, math.sin(a) * r)))
        f = bm.faces.new(pts); bmesh.ops.solidify(bm, geom=[f], thickness=.07)
        me = bpy.data.meshes.new('star'); bm.to_mesh(me); bm.free()
        so = new_obj(f'star{k}', me, star_m); so.parent = stars; so.location = ((k - 2) * .7, 0, 0)
        bv = so.modifiers.new('bev', 'BEVEL'); bv.width = .015; bv.segments = 2
    S['pink'] = pink; S['stars'] = stars
    # police cars
    S['cops'] = []
    police_paint = paint_mat('police_paint', None, 'police')
    for i in range(5):
        c = make_car(f'cop{i}', 'sedan', police_paint, plate='PD 0911')
        red = emissive(f'cop{i}_red', (1, .03, .05), 0); blue = emissive(f'cop{i}_blue', (.08, .25, 1), 0)
        box(f'cop{i}_barbase', (1.3, .32, .06), (0, 0, 1.5), S['trim']).parent = c
        r = box(f'cop{i}_r', (.6, .28, .13), (-.32, 0, 1.58), red); r.parent = c
        b = box(f'cop{i}_b', (.6, .28, .13), (.32, 0, 1.58), blue); b.parent = c
        rl = bpy.data.lights.new(f'cop{i}_rl', 'POINT'); rl.color = (1, .05, .08); rl.shadow_soft_size = .2
        bl = bpy.data.lights.new(f'cop{i}_bl', 'POINT'); bl.color = (.15, .3, 1); bl.shadow_soft_size = .2
        rlo = link(bpy.data.objects.new(f'cop{i}_rl', rl)); rlo.parent = c; rlo.location = (-.4, 0, 1.9)
        blo = link(bpy.data.objects.new(f'cop{i}_bl', bl)); blo.parent = c; blo.location = (.4, 0, 1.9)
        box(f'cop{i}_push', (1.3, .1, .3), (0, 2.45, .5), S['trim']).parent = c
        for s in (-1, 1):
            cu = bpy.data.curves.new(f'cop{i}_pol{s}', 'FONT'); cu.body = 'POLICE'; cu.size = .26; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'; cu.extrude = .003
            t = new_obj(f'cop{i}_pol{s}', cu, S.setdefault('police_txt', mat('police_txt', (.01, .01, .012), .4))); t.parent = c
            t.location = (s * .955, 0, .72); t.rotation_euler = (math.pi / 2, 0, s * math.pi / 2)
        S['cops'].append(dict(obj=c, red=red, blue=blue, rl=rl, bl=bl))
    # parked cars
    colors = [0xd8d8dc, 0x1f3a5f, 0x8a1c1c, 0x2d2d30, 0xe6e1d3, 0x4f6d7a, 0xc9a227, 0x2f5a3a]
    k = 0
    for side in (-1, 1):
        z = -46.0
        while z < 40:
            skip = (side < 0 and -6 < z < 6) or (side < 0 and 10 < z < 22) or hsh(k, 77) < .25
            if not skip:
                kind = 'suv' if hsh(k, 78) > .65 else 'sedan'
                c = make_car(f'parked{k}', kind, paint_mat(f'parked{k}_p', hexc(colors[k % len(colors)])), plate=f'{chr(65 + k % 26)}{(k * 37) % 900 + 100}')
                c.location = B(side * (ROAD_HALF - 1.1), 0, z); c.rotation_euler = (0, 0, math.pi if side < 0 else 0)
            z += 6.2; k += 1


# ---------- helicopter ----------
def build_heli():
    root = bpy.data.objects.new('heli', None); link(root)
    dark = mat('heli_dark', hexc(0x1d2433), .4, .6)
    body = new_obj('heli_body', sphere_mesh('heli_body', 1.0, 24, 16), dark); body.parent = root; body.scale = (.95, 1.9, .95)
    belly = new_obj('heli_white', sphere_mesh('heli_white', 1.0, 24, 16), mat('heli_white', (.85, .85, .85), .4)); belly.parent = root; belly.scale = (.97, 1.6, .5); belly.location = (0, 0, -.25)
    canopy = new_obj('heli_canopy', sphere_mesh('heli_canopy', .8, 20, 14), GLASS or mat('car_glass', (.02, .03, .05), .02, .85)); canopy.parent = root; canopy.location = (0, 1.25, .1); canopy.scale = (1, .9, .8)
    tail = new_obj('heli_tail', cyl_mesh('heli_tail', .25, .1, 3.8, 12), dark); tail.parent = root; tail.location = (0, -3.4, .3); tail.rotation_euler = (math.pi / 2, 0, 0)
    fin = box('heli_fin', (.08, .5, .9), (0, -5.2, .7), dark); fin.parent = root
    for x in (-.7, .7):
        sk = new_obj('heli_skid', cyl_mesh('heli_skid', .05, .05, 2.8, 8), dark); sk.parent = root; sk.location = (x, 0, -1.2); sk.rotation_euler = (math.pi / 2, 0, 0)
    rotor = box('heli_rotor', (7.6, .22, .04), (0, 0, 1.15), dark); rotor.parent = root
    disc = new_obj('heli_blur', cyl_mesh('heli_blur', 3.8, 3.8, .01, 48), glow_mat('rotor_blur', (.05, .06, .08), .0, .12)); disc.parent = root; disc.location = (0, 0, 1.16)
    S['heli'] = root; S['rotor'] = rotor
    spot = bpy.data.lights.new('search', 'SPOT'); spot.energy = 25000; spot.spot_size = math.radians(16); spot.spot_blend = .4; spot.color = (1, .96, .85); spot.shadow_soft_size = .2
    so = link(bpy.data.objects.new('search', spot)); S['spot'] = so
    beam = new_obj('beam', cyl_mesh('beam', 1.6, .12, 1.0, 32, cap=False), glow_mat('beam', (1, .97, .85), .35, .06)); S['beam'] = beam


# ---------- NPC, cop, crowd ----------
def build_people():
    S['npc'] = make_person('npc', dict(skin=0xc98b5e, pants=0xd8c8a8, shorts=True, shirt=0x2fa8f0, dot=0xffe14d, kind='flowers', hair=0x2b1a12, shades=True, shoes=0xf0f0f0))
    S['cop'] = make_person('cop', dict(skin=0x8d5a3b, pants=0x151b33, shirt=0x2a3b70, hair=0x1a1a1a, cap=0x151b33, badge=True, longSleeves=True, shoes=0x0a0a0a))
    # coffee cup
    cup = bpy.data.objects.new('cup', None); link(cup)
    plastic = mat('cup_plastic', (.9, .95, 1.0), .05, transmission=1.0)
    for nm, me_, m, loc in (('cup_shell', cyl_mesh('cup_shell', .033, .045, .14, 20), plastic, (0, 0, 0)),
                            ('cup_coffee', cyl_mesh('cup_coffee', .03, .04, .1, 20), mat('coffee', hexc(0x6a3f22), .2), (0, 0, -.015)),
                            ('cup_lid', cyl_mesh('cup_lid', .05, .05, .02, 20), mat('lid', (.9, .9, .9), .3), (0, 0, .075)),
                            ('cup_straw', cyl_mesh('cup_straw', .005, .005, .14, 8), mat('straw', hexc(0x3fe6d2), .3), (.012, 0, .13))):
        o = new_obj(nm, me_, m); o.parent = cup; o.location = loc
    S['cup'] = cup
    # ticket
    tk = box('ticket', (.42, .26, .004), (0, 0, 0), mat('ticket_paper', (.95, .93, .85), .8)); S['ticket'] = tk
    for txt, z, col, size in (('CITATION', .05, hexc(0xc21f2a), .06), ('JAYWALKING', -.04, (.05, .05, .05), .05)):
        cu = bpy.data.curves.new('tk', 'FONT'); cu.body = txt; cu.size = size; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
        t = new_obj('ticket_txt', cu, mat(f'tk_{txt}', col, .5)); t.parent = tk; t.location = (0, z, .003)
    # crowd
    shirts = [(0xe8e2d8, None, None), (0xc0392b, None, None), (0x2c3e50, None, None), (0xf2c14e, None, None), (0x6a4c93, None, None),
              (0xf0f0f0, 0xdd3333, 'stripes'), (0x7fb3d5, None, None), (0x1abc9c, None, None), (0xff9f80, 0xffffff, 'stripes'), (0x3d6b4f, 0xffd23f, 'flowers')]
    pants = [0x2c3e66, 0x3a3a3a, 0xc9b38a, 0x1f1f1f, 0x5a6b7a, 0x7a5a3a]
    S['crowd'] = []
    for i in range(22):
        sh, dot, kind = shirts[i % len(shirts)]
        filming = i < 4
        parts = make_person(f'ped{i}', dict(skin=SKINS[i % 6], hair=HAIRS[(i * 3) % 6], pants=pants[(i * 5) % 6], shorts=hsh(i, 90) > .6, shirt=sh, dot=dot or sh, kind=kind,
                                            longHair=hsh(i, 91) > .6, cap=0xb03030 if hsh(i, 92) > .8 else None, phone=filming, longSleeves=hsh(i, 94) > .7, shoes=[0x222222, 0xf2f2f2, 0x7a4a2a][i % 3]))
        sc = .93 + hsh(i, 95) * .14
        if filming:
            x, z, ry = [(6.2, 9.5, -2.3), (-7.6, 18, 2.0), (6.6, 17, -2.0), (-7.2, -3.5, 1.9)][i]
            S['crowd'].append(dict(parts=parts, film=True, x=x, z=z, ry=ry, sc=sc))
        else:
            side = 1 if i % 2 else -1
            S['crowd'].append(dict(parts=parts, film=False, x=side * (6.3 + hsh(i, 96) * 1.4) + (-.4 if side < 0 else 0), z0=-40 + hsh(i, 97) * 80,
                                   dir=1 if hsh(i, 98) > .5 else -1, v=.9 + hsh(i, 99) * .6, ph=hsh(i, 100) * 6, sc=sc))


def build_dust():
    S['dust'] = []
    for k in range(10):
        o = new_obj(f'dust{k}', sphere_mesh(f'dust{k}', .4, 12, 8), glow_mat(f'dust{k}', (.85, .8, .75), .4, .0))
        S['dust'].append(o)


def build_camera():
    cam = bpy.data.cameras.new('cam'); cam.sensor_fit = 'VERTICAL'; cam.clip_start = .05; cam.clip_end = 1500
    co = link(bpy.data.objects.new('cam', cam)); bpy.context.scene.camera = co
    S['cam'] = co


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    setup_render(); setup_world()
    build_ground(); build_buildings(); build_props(); build_palms()
    build_vehicles(); build_heli(); build_people(); build_dust(); build_camera()


# ---------- per-frame animation (ported from the three.js version) ----------
def story_time(t):
    if t < T['hookEnd']:
        return 7.05 + t * .6
    if t < T['freezeEnd']:
        return 7.05 + T['hookEnd'] * .6
    if t < T['rewindEnd']:
        top = 7.05 + T['hookEnd'] * .6
        return lerp(top, 1.5, ease(prog(t, T['freezeEnd'], T['rewindEnd'])))
    return min(t, T['title'])


def car_on_road(z, airborne=22, jump=2.6):
    y = hill(z); pitch = math.atan2(hill(z - .5) - hill(z + .5), 1)
    if CREST < z < CREST + airborne:
        k = (z - CREST) / airborne; y += jump * math.sin(math.pi * k); pitch = lerp(-.12, .18, k)
    return y, pitch


def cop_crest(i): return 3.75 + i * .3
def cop_v(i): return (LAND_Z - CREST) / (BUMPS[i] - cop_crest(i))


def cop_z(i, s):
    v = cop_v(i); z = CREST + (s - cop_crest(i)) * v
    if i == 4 and s > BUMPS[4]:
        a = v * v / 12; d = min(s - BUMPS[4], v / a)
        return LAND_Z + v * d - .5 * a * d * d
    return z


STOP_T = BUMPS[4] + 12 / cop_v(4)


def npc_launch(s):
    u = prog(s, T['hit'], T['land'])
    return u, lerp(NPC_STOP_X, LANE_X + .3, u), 15 * 4 * u * (1 - u), lerp(0, LAND_Z, u)


def npc_flat(s):
    f = 1.0
    for b in BUMPS:
        if s > b + .06:
            f *= .8
    return max(f, .38)


def place_car(obj, x, y, z, pitch):
    """Cars are modelled facing Blender +y (story -z). The chase drives towards story +z, so turn them round."""
    obj.location = B(x, y, z); obj.rotation_euler = (-pitch, 0, math.pi)


def update(frame):
    t = frame / FPS
    s = story_time(t)
    # crowd
    for c in S['crowd']:
        if c['film']:
            apply_person(c['parts'], person_root(c['x'], .16, c['z'], c['ry'], scale=(c['sc'],) * 3), pose_of('film'))
            continue
        span = 90; z = ((c['z0'] + c['dir'] * c['v'] * s + 45) % span + span) % span - 45
        apply_person(c['parts'], person_root(c['x'], .16, z, 0 if c['dir'] > 0 else math.pi, scale=(c['sc'],) * 3), pose_of('walk', s * c['v'] * 6.2 + c['ph']))
    # NPC + coffee
    npc, cup = S['npc'], S['cup']
    walking = s < T['closeStart']
    talking = T['fant'] <= t < T['fant'] + 1.63
    mouth = (5 if int(t * 12) % 2 else 2) if talking else 1
    if s < T['hit']:
        x = NPC_START_X + (s - 1.5) * ((NPC_STOP_X - NPC_START_X) / 3) if walking else NPC_STOP_X
        y = .16 if x < -ROAD_HALF else 0
        if walking:
            pose = pose_of('walk', s * 6.5, .8); ry = math.pi / 2; hr = (0, 0, 0)
        else:
            pose = pose_of('stand'); turn = ease(prog(s, 4.8, 5.15)); ry = lerp(math.pi / 2, .55, turn); hr = (0, lerp(0, .15, turn), 0)
        sip = clamp((math.sin(s * 1.6) - .55) * 4, 0, 1) if walking else 1 - prog(s, 5.0, 5.35)
        pose.update(shR=lerp(.35, .95, sip), elR=lerp(.5, 1.85, sip), shzR=lerp(.1, .35, sip))
        P, M = apply_person(npc, person_root(x, y, 0, ry), pose, hr, mouth)
        hand = (CONV @ person_root(x, y, 0, ry) @ (P['handR'] + Vector((0, .02, .04))).to_4d()).to_3d()
        cup.location = hand; cup.rotation_euler = (0, 0, 0)
    elif s < T['land']:
        u, lx, ly, lz = npc_launch(s)
        apply_person(npc, Matrix.Translation(Vector((lx, ly, lz))) @ Euler((u * math.pi * 3.2, u * 2, u * 1.4), 'XYZ').to_matrix().to_4x4() @ Matrix.Translation(Vector((0, -.9, 0))), pose_of('flail', s * 20))
        cup.location = B(lerp(NPC_STOP_X, 2.5, u), 13 * 4 * u * (1 - u) + 1.2 * (1 - u), lerp(0, 17, u)); cup.rotation_euler = (u * 14, u * 9, 0)
    else:
        f = npc_flat(s)
        lift = math.sin(math.pi * prog(s, 7.9, 8.3)) * .45 if s < BUMPS[0] - .2 else 0
        squash = lerp(.6, 1, prog(s, T['land'], T['land'] + .12)) if s < T['land'] + .12 else 1
        root = Matrix.Translation(Vector((LANE_X + .2, .17 * f, LAND_Z + .9))) @ Matrix.Diagonal(Vector((1.08, f * squash, 1, 1))) @ Matrix.Rotation(-math.pi / 2, 4, 'X')
        apply_person(npc, root, pose_of('lying'), (lift, 0, 0))
        cup.location = B(.6, .07, LAND_Z + 2.4); cup.rotation_euler = (0, 0, 0)
    # pink car
    pink = S['pink']
    pz = CREST + (s - CREST_T) * PINK_V if s < T['hit'] else CREST + (T['hit'] - CREST_T) * PINK_V + (s - T['hit']) * 22
    py, pp = car_on_road(pz)
    pink.hide_render = s <= 2.6
    for ch in pink.children_recursive:
        ch.hide_render = pink.hide_render
    place_car(pink, LANE_X, py, pz, pp)
    S['stars'].location = (0, 0, 2.5 + math.sin(s * 3) * .08)
    for k, st in enumerate(S['stars'].children):
        st.rotation_euler = (0, 0, s * 2 + k * .4)
    # cops
    flash = int(s * 8) % 2
    for i, c in enumerate(S['cops']):
        z = cop_z(i, s); vis = s > cop_crest(i) - .6 and z < 60
        y, pitch = car_on_road(z, 18, 1.8)
        bump = 0.0
        if s >= T['land']:
            for wz in (z + 1.53, z - 1.53):
                if LAND_Z - 1.1 < wz < LAND_Z + 1.0:
                    bump = max(bump, math.sin(math.pi * (wz - LAND_Z + 1.1) / 2.1) * .3)
        place_car(c['obj'], LANE_X, y + bump, z, pitch + bump * .25)
        for ch in [c['obj'], *c['obj'].children_recursive]:
            ch.hide_render = not vis
        on = (flash + i) % 2
        set_emit(c['red'], 25 if on else .5); set_emit(c['blue'], .5 if on else 25)
        c['rl'].energy = 400 if on else 0; c['bl'].energy = 0 if on else 400
    # helicopter, searchlight, beam
    hz = lerp(-30, 10, prog(s, 3, 9)); hx = 9 + math.sin(s * .7) * 1.5
    heli = S['heli']; heli.location = B(hx, 24 + math.sin(s * 1.9) * .4, hz); heli.rotation_euler = (-.12, math.sin(s) * .05, math.pi - .5)
    S['rotor'].rotation_euler = (0, 0, s * 38)
    if s < T['hit']:
        tgt = B(NPC_START_X + (min(s, T['closeStart']) - 1.5) * ((NPC_STOP_X - NPC_START_X) / 3) if s < T['closeStart'] else NPC_STOP_X, 0, 0)
    elif s < T['land']:
        u, lx, ly, lz = npc_launch(s); tgt = B(lx, ly, lz)
    else:
        tgt = B(LANE_X, 0, LAND_Z + .2)
    src = heli.location + Vector((0, 0, -1))
    sp = S['spot']; sp.location = src; sp.rotation_euler = (tgt - src).to_track_quat('-Z', 'Y').to_euler()
    beam = S['beam']; d = tgt - src
    beam.location = (src + tgt) / 2; beam.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler(); beam.scale = (1, 1, d.length)
    beam.hide_render = s <= 3
    # cop on foot
    cop = S['cop']; vis = s >= STOP_T
    for o in all_objects(cop):
        o.hide_render = not vis
    if vis:
        wk = prog(s, STOP_T, STOP_T + .6)
        x = lerp(LANE_X + 1.4, LANE_X + .85, wk); z = lerp(LAND_Z + 5.5, LAND_Z + .1, wk)
        ry = math.pi if wk < 1 else -math.pi / 2 + .25
        pose = pose_of('walk' if wk < 1 else 'stand', s * 7)
        if wk >= 1:
            sk = prog(s, T['slap'] - .25, T['slap'])
            pose.update(shR=lerp(.2, 1.3, math.sin(math.pi * sk * .5)), elR=lerp(.3, .2, sk))
        jm = 5 if (T['jay'] <= t < T['jay'] + .85 and int(t * 12) % 2) else 1
        apply_person(cop, person_root(x, 0, z, ry), pose, (.35 if wk >= 1 else 0, 0, 0), jm)
    tk = S['ticket']; tk.hide_render = s < T['slap']
    for ch in tk.children:
        ch.hide_render = tk.hide_render
    tk.location = B(LANE_X + .2, .2 * npc_flat(s) + .04, LAND_Z - .3); tk.rotation_euler = (0, 0, math.pi + .25)
    # landing dust
    k2 = prog(s, T['land'], T['land'] + .8)
    for k, o in enumerate(S['dust']):
        o.hide_render = not (s >= T['land'] and k2 < 1)
        a = k * math.pi / 5
        o.location = B(LANE_X + math.cos(a) * (.5 + k2 * 1.8), .25 + k2 * .5, LAND_Z + math.sin(a) * (.5 + k2 * 1.8))
        o.scale = (.35 + k2 * .9,) * 3
        mt = o.data.materials[0]; mt.node_tree.nodes[mt['emit_node']].inputs['Strength'].default_value = .4 * (1 - k2)
        mt.node_tree.nodes['Mix Shader'].inputs['Fac'].default_value = .35 * (1 - k2)
    # neon flicker
    for k, m in enumerate(S['neon']):
        set_emit(m, 6.0 if hsh(int(s * 8), k) > .04 else 2.0)
    set_camera(t, s)


SHOTS = dict(wide=((-.6, 1.75, 17), (-2.6, 2.4, -60), 52), close=((-1.05, 1.72, 1.85), (-2.0, 1.66, 0), 38),
             hit=((2.6, 1.6, 24), (-2, 1.6, 0), 52), land=((4.2, 1.6, 21), (-1.8, .4, 14), 52),
             low=((2.6, .55, 20.5), (-1.8, .4, 13.2), 60), cop=((3.2, 1.5, 17.0), (-1.2, .5, 13.9), 50))
HOOK_POS = (1.4, 1.35, 27)


def aim(pos, look, fov):
    cam = S['cam']; p = B(*pos); l = B(*look)
    cam.location = p; cam.rotation_euler = (l - p).to_track_quat('-Z', 'Y').to_euler()
    cam.data.angle = math.radians(fov)


def vlerp(a, b, k): return tuple(lerp(a[i], b[i], k) for i in range(3))


def set_camera(t, s):
    t = min(t, T['title'] - 1e-6)
    if t < T['freezeEnd']:
        u, lx, ly, lz = npc_launch(s); return aim(HOOK_POS, (lx, ly * .75, lz), 54)
    if t < T['rewindEnd']:
        k = ease(prog(t, T['freezeEnd'], T['rewindEnd'])); u, lx, ly, lz = npc_launch(max(s, T['hit']))
        w = SHOTS['wide']; return aim(vlerp(HOOK_POS, w[0], k), vlerp((lx, ly * .75, lz), w[1], k), lerp(54, w[2], k))
    if t < T['closeStart']:
        return aim(*SHOTS['wide'])
    if t < T['wideStart']:
        c = SHOTS['close']; k = prog(t, T['closeStart'], T['wideStart'])
        return aim(vlerp(c[0], (-1.35, 1.7, 1.2), k * .5), c[1], c[2])
    if t < T['land']:
        h = SHOTS['hit']; k = ease(prog(t, T['hit'], T['hit'] + .3)) * (1 - ease(prog(t, T['land'] - .4, T['land'])))
        look = h[1]
        if s >= T['hit']:
            u, lx, ly, lz = npc_launch(s); look = vlerp(h[1], (lx, max(1.6, ly * .8), lz), k)
        return aim(h[0], look, h[2])
    if t < 8.4:
        return aim(*SHOTS['land'])
    if t < STOP_T:
        return aim(*SHOTS['low'])
    c = SHOTS['cop']; k = prog(t, STOP_T, T['title'])
    return aim(vlerp(c[0], (2.2, 1.25, 16.0), k * .6), c[1], c[2])
