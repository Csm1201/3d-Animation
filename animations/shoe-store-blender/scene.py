"""Life as a GTA 6 NPC, Ep. 2: "The Shoe Store". Blender/Cycles scene.

Reuses Ep. 1's street, materials and character rig from animations/fantastic-blender/scene.py (imported as `base`)
and adds a shopfront with a big neon high-heel sign and the club interior. Story coordinates as in Ep. 1:
x right, y up, z towards the camera's side of the street; B() converts to Blender.
All implied and Shorts-safe: no dancers, just the stage, pole, heels, cash and a bouncer.
"""
import math
import os
import re
import sys

import bpy  # noqa: F401  (must come before bmesh)
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location('ep1_scene', os.path.join(HERE, '..', 'fantastic-blender', 'scene.py'))
base = importlib.util.module_from_spec(_spec); sys.modules['ep1_scene'] = base; _spec.loader.exec_module(base)
from ep1_scene import (B, CONV, S, apply_person, box, clamp, cyl_mesh, ease, emissive, fk, glow_mat, hexc, hsh,  # noqa: E402
                   lerp, link, make_person, mat, new_obj, person_root, pose_of, prog, sphere_mesh)

FPS, DUR = 30, 15.5
base.FPS = FPS
# timeline (seconds). Hook first: frames 0..hookEnd show the kneeling-with-the-heel moment.
T = dict(hookEnd=2.3, rewindEnd=2.9, enter=6.6, kneel=8.0, bouncer=9.3, outside=11.8, land=12.75, close=13.35, title=14.5)
LINES = dict(size11=(.15, 'size11'), sandals=(3.3, 'sandals'), notshop=(6.95, 'notshop'), notforsale=(9.6, 'notforsale'), onestar=(13.55, 'onestar'))
TALK = [(.15, 2.0), (3.3, 6.42), (6.95, 8.51), (9.6, 11.78), (13.65, 14.45)]   # spoken spans (voice files trimmed of silence)
NPC_TALK = [TALK[0], TALK[1], TALK[2], TALK[4]]
BOUNCER_TALK = [TALK[3]]

IX = 300.0                        # the club interior is built far away from the street, at story x = IX
SHOP_X, DOOR_Z = -8.6, -4.5       # shopfront plane and door on the left side of Ep. 1's street
SHOP_Z = (-8.6, -.4)
SIGN_Y = 4.75


def sbox(name, size, loc, m, rot=(0, 0, 0)):
    """Box in story coords: size (w, h, d) and centre (x, y, z)."""
    return box(name, (size[0], size[2], size[1]), B(*loc), m, rot=rot)


def neon_text(name, text, size, loc, rot, m, extrude=.03):
    cu = bpy.data.curves.new(name, 'FONT'); cu.body = text; cu.size = size; cu.extrude = extrude
    cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    o = new_obj(name, cu, m); o.location = loc; o.rotation_euler = rot
    return o


def neon_poly(name, pts, m, r=.035):
    """Glowing tube through Blender-space points."""
    cu = bpy.data.curves.new(name, 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = r; cu.bevel_resolution = 3
    sp = cu.splines.new('POLY'); sp.points.add(len(pts) - 1)
    for p, q in zip(sp.points, pts):
        p.co = (*q, 1)
    return new_obj(name, cu, m)


HEEL_SHAPE = [  # side view of a platform stiletto, (forward, up) in metres, unit size
    [(0, .03), (.02, .09), (.1, .12), (.2, .14), (.32, .24), (.44, .38), (.5, .42)],      # top line: toe -> vamp -> back of heel
    [(0, .03), (.06, 0), (.16, 0), (.2, .03), (.3, .12), (.42, .2), (.5, .2)],              # sole: toe platform -> arch -> heel seat
    [(.47, .2), (.48, 0)], [(.5, .42), (.5, .2)],                                          # stiletto and heel back
]


def heel_icon(name, origin, fwd, up, scale, m):
    """Neon outline of a high heel drawn in the plane spanned by fwd/up (Blender vectors)."""
    for k, line in enumerate(HEEL_SHAPE):
        neon_poly(f'{name}{k}', [origin + fwd * (a * scale) + up * (b * scale) for a, b in line], m, r=.022 * scale / 2.2)


def make_heel(name, clear, sole):
    """A platform stiletto prop along local +x (toe) with z up, about 26 cm long: curved sole, toe platform,
    thin stiletto, clear straps. Unit scale; the scene scales it up a little so it reads on a phone."""
    import bmesh
    root = bpy.data.objects.new(name, None); link(root)
    # curved footbed lofted along the side profile: heel seat high at the back, arch, toe flat on the platform
    prof = [(-.13, .2), (-.09, .195), (-.05, .17), (-.01, .12), (.03, .075), (.07, .058), (.11, .056), (.14, .057)]
    bm = bmesh.new(); rows = []
    for x, z in prof:
        hw = .03 if x < -.06 else .038
        rows.append([bm.verts.new((x, sy * hw, z + dz)) for sy, dz in ((-1, -.012), (1, -.012), (1, .016), (-1, .016))])
    for r0, r1 in zip(rows, rows[1:]):
        for k in range(4):
            bm.faces.new((r0[k], r0[(k + 1) % 4], r1[(k + 1) % 4], r1[k]))
    bm.faces.new(rows[0][::-1]); bm.faces.new(rows[-1])
    me = bpy.data.meshes.new(f'{name}_bed'); bm.to_mesh(me); bm.free()
    bed = new_obj(f'{name}_bed', me, sole); bed.parent = root
    bv = bed.modifiers.new('bev', 'BEVEL'); bv.width = .004; bv.segments = 2
    parts = [box(f'{name}_plat', (.12, .08, .058), (.085, 0, .029), clear)]
    st = new_obj(f'{name}_stiletto', cyl_mesh(f'{name}_stil', .007, .016, .2, 14), sole, smooth=True); st.location = (-.115, 0, .1); parts.append(st)
    for k, (x, z, r) in enumerate(((.09, .06, .045), (-.02, .13, .042))):   # clear straps arching over the foot
        tor = new_obj(f'{name}_strap{k}', cyl_mesh(f'{name}_strapm{k}', r, r, .022, 24, cap=False), clear, smooth=True)
        tor.location = (x, 0, z); tor.rotation_euler = (math.pi / 2, 0, math.pi / 2); tor.scale = (1, .55, 1); parts.append(tor)
    for p in parts:
        p.parent = root
    return root


# ---------- simple arm IK: shoulder/elbow angles that put the right hand at a target (person-local story coords) ----------
_IK = {}


def arm_ik(target, base_pose=None, side='R'):
    key = (round(target[0], 3), round(target[1], 3), round(target[2], 3), side, tuple(sorted((base_pose or {}).items())))
    if key in _IK:
        return _IK[key]
    best = None; tv = Vector(target)
    for sh in [i * .1 for i in range(-5, 31)]:
        for el in [i * .1 for i in range(0, 23)]:
            for shz in [i * .1 for i in range(-8, 9)]:
                pose = dict(base_pose or {}); pose.update({'sh' + side: sh, 'el' + side: el, 'shz' + side: shz})
                d = (fk(pose)['hand' + side] - tv).length + .02 * el
                if best is None or d < best[0]:
                    best = (d, {'sh' + side: sh, 'el' + side: el, 'shz' + side: shz})
    _IK[key] = best[1]
    return best[1]


# ---------- street: shopfront ----------
def build_shopfront():
    # clear Ep. 1's storefront dressing (sign, awning, shop window, door) and props where the club goes
    dead = []
    for o in bpy.data.objects:
        loc = o.matrix_world.translation; sx, sz = loc.x, -loc.y
        in_front = SHOP_Z[0] - 2.5 < sz < SHOP_Z[1] + 2.5 and -9.8 < sx < -4.9
        if in_front and (re.match(r'b\d+_(shop|shopin|door|aw)$', o.name) or o.name.startswith('sign') or o.instance_type == 'COLLECTION'
                         or o.name.startswith('palm') or o.name.startswith('shrub')):
            dead.append(o)
    for o in dead:
        bpy.data.objects.remove(o, do_unlink=True)
    pink = emissive('club_neon_pink', hexc(0xff3fa0), 14.0)
    teal = emissive('club_neon_teal', hexc(0x3fe6d2), 10.0)
    black_glass = mat('club_glass', hexc(0x07060a), rough=.06, metal=.6)
    board = mat('club_board', hexc(0x0b0a10), rough=.5)
    gold = mat('club_gold', hexc(0xd9a93a), rough=.25, metal=1.0)
    velvet = mat('club_velvet', hexc(0x8a0f2a), rough=.7, sss=.1)
    z0, z1 = SHOP_Z; zc = (z0 + z1) / 2; L = z1 - z0
    sbox('club_front', (.12, 3.4, L), (SHOP_X + .05, 1.86, zc), black_glass)
    sbox('club_fascia', (.16, 1.6, L + .4), (SHOP_X + .09, SIGN_Y, zc), board)
    # door with a pink neon frame
    sbox('club_door', (.08, 2.4, 1.3), (SHOP_X + .14, 1.36, DOOR_Z), mat('club_doorm', hexc(0x16101c), .35, .3))
    for nm, sz_, lc in (('top', (.05, .05, 1.42), (SHOP_X + .19, 2.58, DOOR_Z)), ('l', (.05, 2.42, .05), (SHOP_X + .19, 1.37, DOOR_Z - .69)),
                        ('r', (.05, 2.42, .05), (SHOP_X + .19, 1.37, DOOR_Z + .69))):
        sbox(f'club_doorneon_{nm}', sz_, lc, pink)
    # the sign: no words, just one big neon stiletto across the fascia, facing the road (+x)
    HS = 3.3
    heel_icon('club_sign', B(SHOP_X + .2, SIGN_Y - .21 * HS, zc - 1.25 - .25 * HS), Vector((0, -1, 0)), Vector((0, 0, 1)), HS, pink)
    neon_text('club_open', 'OPEN 24/7', .32, B(SHOP_X + .19, 2.95, DOOR_Z + 1.9), (math.pi / 2, 0, math.pi / 2), teal, .02)
    # velvet rope and brass stanchions by the door
    posts = [(SHOP_X + 1.05, DOOR_Z + 1.0), (SHOP_X + 1.05, DOOR_Z + 2.4)]
    for k, (x, z) in enumerate(posts):
        o = new_obj(f'club_post{k}', cyl_mesh(f'club_post{k}', .03, .03, 1.0, 16), gold, smooth=True); o.location = B(x, .66, z)
        o = new_obj(f'club_base{k}', cyl_mesh(f'club_base{k}', .14, .14, .03, 20), gold, smooth=True); o.location = B(x, .175, z)
        o = new_obj(f'club_knob{k}', sphere_mesh(f'club_knob{k}', .05, 12, 8), gold); o.location = B(x, 1.18, z)
    pts = [B(posts[0][0], 1.08 - .22 * math.sin(math.pi * u), lerp(posts[0][1], posts[1][1], u)) for u in (k / 10 for k in range(11))]
    neon_poly('club_rope', pts, velvet, r=.025)
    # pink spill on the pavement from the sign
    lt = bpy.data.lights.new('club_spill', 'AREA'); lt.energy = 900; lt.color = hexc(0xff3fa0); lt.size = 3.0
    lo = link(bpy.data.objects.new('club_spill', lt)); lo.location = B(SHOP_X + 1.0, SIGN_Y - .9, zc); lo.rotation_euler = (0, math.radians(-120), 0)
    for k, (c, z) in enumerate(((0xff3fa0, z0 + 1.8), (0xff3fa0, z1 - 1.8))):
        pl = bpy.data.lights.new(f'club_glow{k}', 'POINT'); pl.energy = 250; pl.color = hexc(c); pl.shadow_soft_size = .02
        link(bpy.data.objects.new(f'club_glow{k}', pl)).location = B(SHOP_X + .9, 2.2, z)


# ---------- the club interior ----------
STAGE = dict(x=0.0, z=-3.6, w=4.6, d=3.0, h=.6)   # local to the interior origin (IX, 0, 0)
HEELS_Z = STAGE['z'] + STAGE['d'] / 2 - .22
HEEL_XS = [-1.75, -1.15, -.55, .05, .65, 1.25, 1.85]
GRAB = 2                                            # which heel he picks up
ROOM = dict(x0=-6.0, x1=6.0, z0=-6.0, z1=6.0, h=4.2)
CLUB_DOOR = (-6.0, 3.8)                             # on the left wall


def I(x, y, z): return B(IX + x, y, z)


def build_club():
    floor = mat('cl_floor', hexc(0x0a0810), rough=.3, metal=.2, coat=.4)
    wall = mat('cl_wall', hexc(0x3a1a52), rough=.8)
    ceil = mat('cl_ceil', hexc(0x050407), rough=.9)
    stage_m = mat('cl_stage', hexc(0x070609), rough=.05, metal=.3, coat=1.0)
    chrome = mat('cl_chrome', (.9, .9, .92), rough=.04, metal=1.0)
    pink = emissive('cl_pink', hexc(0xff3fa0), 12.0)
    purple = emissive('cl_purple', hexc(0x9b4dff), 9.0)
    teal = emissive('cl_teal', hexc(0x3fe6d2), 9.0)
    velvet = mat('cl_velvet', hexc(0x7a0c25), rough=.75, sss=.1)
    R = ROOM; W = R['x1'] - R['x0']; D = R['z1'] - R['z0']
    sbox('cl_floor', (W, .1, D), (IX, -.05, 0), floor)
    sbox('cl_ceil', (W, .1, D), (IX, R['h'] + .05, 0), ceil)
    sbox('cl_wall_back', (W, R['h'], .1), (IX, R['h'] / 2, R['z0']), wall)
    sbox('cl_wall_front', (W, R['h'], .1), (IX, R['h'] / 2, R['z1']), wall)
    sbox('cl_wall_r', (.1, R['h'], D), (IX + R['x1'], R['h'] / 2, 0), wall)
    # left wall with the door opening (door frame glows pink)
    dz = CLUB_DOOR[1]
    sbox('cl_wall_l1', (.1, R['h'], dz - .7 - R['z0']), (IX + R['x0'], R['h'] / 2, (R['z0'] + dz - .7) / 2), wall)
    sbox('cl_wall_l2', (.1, R['h'], R['z1'] - dz - .7), (IX + R['x0'], R['h'] / 2, (R['z1'] + dz + .7) / 2), wall)
    sbox('cl_wall_l3', (.1, R['h'] - 2.5, 1.4), (IX + R['x0'], (R['h'] + 2.5) / 2, dz), wall)
    sbox('cl_door_out', (.05, 2.5, 1.4), (IX + R['x0'] - .6, 1.25, dz), emissive('cl_daylight', hexc(0xffc89a), 3.0))   # sunset outside
    for nm, sz_, lc in (('t', (.05, .05, 1.45), (R['x0'] + .06, 2.52, dz)), ('a', (.05, 2.5, .05), (R['x0'] + .06, 1.25, dz - .72)), ('b', (.05, 2.5, .05), (R['x0'] + .06, 1.25, dz + .72))):
        sbox(f'cl_doorn_{nm}', sz_, (IX + lc[0], lc[1], lc[2]), pink)
    # neon strips along the walls at skirting and ceiling level
    for k, (sz_, lc, m) in enumerate((((W, .04, .04), (0, .12, R['z0'] + .07), purple), ((W, .04, .04), (0, R['h'] - .15, R['z0'] + .07), pink),
                                      ((.04, .04, D), (R['x1'] - .07, R['h'] - .15, 0), purple), ((.04, .04, D), (R['x1'] - .07, .12, 0), pink))):
        sbox(f'cl_strip{k}', sz_, (IX + lc[0], lc[1], lc[2]), m)
    # stage with a glowing front edge, steps and the pole
    st = STAGE
    sbox('cl_stage', (st['w'], st['h'], st['d']), (IX + st['x'], st['h'] / 2, st['z']), stage_m)
    sbox('cl_stage_edge', (st['w'], .04, .04), (IX + st['x'], st['h'] - .02, st['z'] + st['d'] / 2 + .01), pink)
    sbox('cl_stage_edge2', (st['w'], .03, .03), (IX + st['x'], .03, st['z'] + st['d'] / 2 + .01), purple)
    pole = new_obj('cl_pole', cyl_mesh('cl_pole', .028, .028, R['h'] - st['h'], 24), chrome, smooth=True)
    pole.location = I(st['x'], st['h'] + (R['h'] - st['h']) / 2, st['z'] - .2)
    for k, y in enumerate((st['h'] + .02, R['h'] - .02)):
        o = new_obj(f'cl_polecap{k}', cyl_mesh(f'cl_polecap{k}', .09, .09, .04, 24), chrome, smooth=True); o.location = I(st['x'], y, st['z'] - .2)
    # back wall: big neon stiletto and the club's name
    heel_icon('cl_heel', I(-1.8, 1.55, R['z0'] + .08), Vector((1, 0, 0)), Vector((0, 0, 1)), 3.4, pink)
    neon_text('cl_name', 'THE SHOE STORE', .42, I(1.9, 2.9, R['z0'] + .1), (math.pi / 2, 0, 0), teal)
    neon_text('cl_vip', 'VIP', .55, I(R['x1'] - .1, 2.6, -2.5), (math.pi / 2, 0, -math.pi / 2), purple)
    # mirror ball
    ball = new_obj('cl_ball', sphere_mesh('cl_ball', .3, 24, 14), mat('cl_mirror', (.95, .95, .98), .03, 1.0)); ball.location = I(0, 3.55, -1.0)
    for p in ball.data.polygons:
        p.use_smooth = False
    sbox('cl_ballrod', (.02, .6, .02), (IX, 3.9, -1.0), chrome)
    S['ball'] = ball
    # booths along the right wall, a bar on the left at the back
    for k, z in enumerate((-3.0, -.6, 1.8, 4.2)):
        sbox(f'cl_booth{k}', (1.1, .45, 1.9), (IX + R['x1'] - .7, .225, z), velvet)
        sbox(f'cl_boothb{k}', (.25, 1.0, 1.9), (IX + R['x1'] - .2, .5, z), velvet)
        sbox(f'cl_table{k}', (.6, .05, .6), (IX + R['x1'] - 1.7, .72, z), mat('cl_tablem', hexc(0x111015), .1, .6))
        o = new_obj(f'cl_tleg{k}', cyl_mesh(f'cl_tleg{k}', .04, .04, .7, 12), chrome); o.location = I(R['x1'] - 1.7, .35, z)
    sbox('cl_bar', (1.0, 1.1, 3.6), (IX + R['x0'] + 1.3, .55, -3.6), mat('cl_barm', hexc(0x140b1a), .3, .2))
    sbox('cl_bartop', (1.1, .05, 3.7), (IX + R['x0'] + 1.3, 1.12, -3.6), floor)
    sbox('cl_barglow', (.03, .03, 3.6), (IX + R['x0'] + 1.82, 1.08, -3.6), purple)
    bottle_cols = [0x3fe6d2, 0xff3fa0, 0xffc040, 0x9b4dff, 0x60ff90]
    for k in range(14):
        b = new_obj(f'cl_bottle{k}', cyl_mesh(f'cl_bottle{k}', .04, .03, .3, 10), emissive(f'cl_bot{k}', hexc(bottle_cols[k % 5]), 1.5))
        b.location = I(R['x0'] + .15, 1.75 + (k // 7) * .5, -5.1 + (k % 7) * .4)
    sbox('cl_shelf', (.3, .03, 3.2), (IX + R['x0'] + .15, 1.58, -3.9), chrome)
    sbox('cl_shelf2', (.3, .03, 3.2), (IX + R['x0'] + .15, 2.08, -3.9), chrome)
    # the "display": platform heels lined up along the stage edge
    clear = mat('cl_clear', hexc(0xff9ccf), rough=.02, transmission=1.0)
    sole = mat('cl_sole', hexc(0xff2f90), rough=.25, coat=1.0, emit=hexc(0xff2f90), emit_strength=.6)   # patent pink, a touch of glow so it reads in the dark
    S['heels'] = []
    for k, x in enumerate(HEEL_XS):
        h = make_heel(f'heel{k}', clear, sole); h.scale = (1.6,) * 3
        h.location = I(x, st['h'], HEELS_Z); h.rotation_euler = (0, 0, math.pi / 2 + (hsh(k, 3) - .5) * .5)
        S['heels'].append(h)
    # cash drifting down
    bill = mat('cl_bill', hexc(0x7fbf7a), rough=.85)
    S['bills'] = []
    for k in range(46):
        o = box(f'cl_bill{k}', (.155, .066, .002), (0, 0, 0), bill)
        S['bills'].append((o, hsh(k, 1), hsh(k, 2), hsh(k, 3)))
    for k in range(12):   # some already on the floor and stage
        o = box(f'cl_billf{k}', (.155, .066, .002), I(-2 + hsh(k, 7) * 4, (st['h'] + .002) if k < 6 else .002, (st['z'] + (hsh(k, 8) - .5) * 2) if k < 6 else (-1.6 + hsh(k, 8) * 2.5)), bill)
        o.rotation_euler = (0, 0, hsh(k, 9) * 6)
    # lights: coloured spots sweeping from the ceiling, plus low fill so the characters read
    S['spots'] = []
    for k, (c, x, z, e) in enumerate(((0xff3fa0, -2.2, 1.5, 4200), (0x9b4dff, 2.4, 1.0, 4200), (0x3fe6d2, 0, -1.2, 2600), (0xffffff, 0, 1.8, 2400))):
        sp = bpy.data.lights.new(f'cl_spot{k}', 'SPOT'); sp.energy = e; sp.color = hexc(c); sp.spot_size = math.radians(34); sp.spot_blend = .5; sp.shadow_soft_size = .15
        o = link(bpy.data.objects.new(f'cl_spot{k}', sp)); o.location = I(x, R['h'] - .2, z)
        S['spots'].append((o, k))
    for k, (c, lc, e) in enumerate(((0xff4fa8, (0, 1.4, -1.8), 160), (0x8a5cff, (-3, 2.2, 2), 320), (0xffd8c0, (1.5, 2.6, 2.5), 220), (0xff6fc0, (-4, 2.4, 3.6), 200))):
        pl = bpy.data.lights.new(f'cl_fill{k}', 'POINT'); pl.energy = e; pl.color = hexc(c); pl.shadow_soft_size = .02
        link(bpy.data.objects.new(f'cl_fill{k}', pl)).location = I(*lc)
    key = bpy.data.lights.new('cl_key', 'AREA'); key.energy = 220; key.size = 1.6; key.color = hexc(0xffd0e0)   # soft key on the two characters
    ko = link(bpy.data.objects.new('cl_key', key)); ko.location = I(KNEEL_AT[0] + .8, 2.4, KNEEL_AT[1] + 2.6)
    ko.rotation_euler = (I(KNEEL_AT[0] + .5, 1.1, KNEEL_AT[1]) - ko.location).to_track_quat('-Z', 'Y').to_euler()


# ---------- people and props ----------
def build_people():
    S['npc'] = make_person('npc', dict(skin=0xc98b5e, pants=0xd8c8a8, shorts=True, shirt=0x2fa8f0, dot=0xffe14d, kind='flowers', hair=0x2b1a12, shades=True, shoes=0xf0f0f0))
    S['bouncer'] = make_person('bouncer', dict(skin=0x6b4430, pants=0x0d0d10, shirt=0x0d0d10, hair=0x6b4430, shades=True, shoes=0x050505))
    ear = new_obj('bouncer_earpiece', cyl_mesh('bouncer_ep', .006, .006, .18, 8), mat('ep', (.05, .05, .05), .3)); S['earpiece'] = ear
    cup = bpy.data.objects.new('cup', None); link(cup)
    plastic = mat('cup_plastic', (.9, .95, 1.0), .05, transmission=1.0)
    for nm, me_, m, loc in (('cup_shell', cyl_mesh('cup_shell', .033, .045, .14, 20), plastic, (0, 0, 0)),
                            ('cup_coffee', cyl_mesh('cup_coffee', .03, .04, .1, 20), mat('coffee', hexc(0x6a3f22), .2), (0, 0, -.015)),
                            ('cup_lid', cyl_mesh('cup_lid', .05, .05, .02, 20), mat('lid', (.9, .9, .9), .3), (0, 0, .075)),
                            ('cup_straw', cyl_mesh('cup_straw', .005, .005, .14, 8), mat('straw', hexc(0x3fe6d2), .3), (.012, 0, .13))):
        o = new_obj(nm, me_, m); o.parent = cup; o.location = loc
    S['cup'] = cup


def build_camera():
    cam = bpy.data.cameras.new('cam'); cam.sensor_fit = 'VERTICAL'; cam.clip_start = .05; cam.clip_end = 1500
    co = link(bpy.data.objects.new('cam', cam)); bpy.context.scene.camera = co
    S['cam'] = co


def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    base.setup_render(); base.setup_world()
    base.build_ground(); base.build_buildings(); base.build_props(); base.build_palms()
    build_shopfront(); build_club(); build_people(); build_camera()
    for o in bpy.data.objects:
        if o.type == 'LIGHT' and (o.name.startswith(('club_', 'cl_'))):
            o.visible_camera = False
    # two parked cars across the street for life
    for k, (x, z, col) in enumerate(((3.9, -14, 0xe8e8ea), (3.9, 6, 0x2a3f6a))):
        c = base.make_car(f'parked{k}', 'sedan' if k else 'suv', base.paint_mat(f'parked{k}_p', hexc(col)), plate=f'NPC {311 + k * 222}')
        base.place_car(c, x, 0, z, 0)


# ---------- animation ----------
def story_time(t):
    if t < T['hookEnd']:                      # hook: the moment he holds up the heel, 9.4 s into the story
        return 9.45 + t * .05
    if t < T['rewindEnd']:
        return lerp(9.45 + T['hookEnd'] * .05, T['rewindEnd'], ease(prog(t, T['hookEnd'], T['rewindEnd'])))
    return t


def talking(t, spans):
    return any(a <= t < b for a, b in spans)


def mouth_of(t, spans):
    return (5 if int(t * 12) % 2 else 2) if talking(t, spans) else 1


def root_on_floor(pose, x, y, z, ry, foot='ankleR', floor_off=.07):
    """Root that keeps `foot` at floor height (handles kneeling/sitting by lowering the hips)."""
    P = fk(pose); drop = P[foot].y - floor_off
    return person_root(x, y - drop, z, ry)


KNEEL = dict(hipR=1.5, kneeR=1.45, hipL=-.05, kneeL=1.6, flatfeet=True)
# street path: along the left pavement towards the camera, stop under the sign, turn into the door
WALK = [(2.9, (-7.0, -7.4)), (4.55, (-7.0, -5.5)), (5.55, (-7.0, -5.45)), (6.6, (SHOP_X + .2, DOOR_Z))]
CLUB_PATH = [(6.6, (CLUB_DOOR[0] + .1, CLUB_DOOR[1])), (7.85, (-1.0, HEELS_Z + 1.05))]
KNEEL_AT = (HEEL_XS[GRAB] + .2, HEELS_Z + .6)
SIT = (-5.25, DOOR_Z + 1.1)
SIT_POSE = dict(hipL=1.75, hipR=1.6, kneeL=1.95, kneeR=1.8, hipzL=-.15, hipzR=.15, shL=.5, elL=.9, shzL=.35)
_ARMS = {}


def arms():
    """Arm angles for the key holds, solved once: reach the heel, offer it up to the bouncer, look at it on the kerb."""
    if not _ARMS:
        drop = fk(KNEEL)['kneeL'].y - .06
        _ARMS['reach'] = arm_ik((.25, STAGE['h'] + .12 + drop, .5), KNEEL)
        _ARMS['offer'] = arm_ik((.14, 1.22 + drop, .5), KNEEL)
        sit_root_y = .2 - fk(SIT_POSE)['hipR'].y + .1
        _ARMS['sitlook'] = arm_ik((.3, 1.4, .45), SIT_POSE)
        _ARMS['sitrest'] = dict(shR=.6, elR=.8, shzR=.3)
        _ARMS['crossed'] = {**arm_ik((-.12, 1.22, .2), {}, 'R'), **arm_ik((.12, 1.27, .23), {}, 'L')}
    return _ARMS


def blend(a, b, k):
    return {kk: lerp(a.get(kk, 0), b.get(kk, 0), k) for kk in set(a) | set(b)}


def path_at(path, s):
    if s <= path[0][0]:
        return Vector(path[0][1]), 0.0
    for (t0, p0), (t1, p1) in zip(path, path[1:]):
        if s < t1:
            k = prog(s, t0, t1); a, b = Vector(p0), Vector(p1)
            return a.lerp(b, k), math.atan2((b - a).x, (b - a).y)
    a, b = Vector(path[-2][1]), Vector(path[-1][1])
    return b, math.atan2((b - a).x, (b - a).y)


def heel_in_hand(P, M):
    return (M @ (P['handR'] + Vector((0, .03, .05))).to_4d()).to_3d()


def update(frame):
    t = frame / FPS
    s = story_time(t)
    npc, bouncer, cup = S['npc'], S['bouncer'], S['cup']
    grab = S['heels'][GRAB]
    rest_heel = I(HEEL_XS[GRAB], STAGE['h'], HEELS_Z)
    m_npc = mouth_of(t, NPC_TALK); m_b = mouth_of(t, BOUNCER_TALK)
    # ambient club motion (runs on story time so the rewind also rewinds it)
    S['ball'].rotation_euler = (0, 0, s * .8)
    for o, k in S['spots']:
        a = s * (.9 + k * .3) + k * 1.7
        tgt = I(math.sin(a) * 2.2, 0, -2.2 + math.cos(a * .8) * 1.8)
        o.rotation_euler = (tgt - o.location).to_track_quat('-Z', 'Y').to_euler()
    for o, a, b, c in S['bills']:
        x = -2.6 + a * 5.2 + math.sin(s * 2 + b * 6) * .25; z = -4.6 + b * 5.4
        on_stage = abs(x - STAGE['x']) < STAGE['w'] / 2 and abs(z - STAGE['z']) < STAGE['d'] / 2
        y = max(3.9 - (s * (.32 + .2 * c) + a * 3.4) % 3.4, (STAGE['h'] if on_stage else 0) + .01)
        o.location = I(x, y, z)
        o.rotation_euler = (math.sin(s * 3 + a * 9) * .9, math.cos(s * 2.5 + c * 9) * .9, s * (1 + b) + c * 6)
    # ---------- NPC ----------
    heel_loc, heel_rot = rest_heel, (0, 0, math.pi / 2 + (hsh(GRAB, 3) - .5) * .5)
    cup_loc = None
    if s < T['enter']:                                         # street: walk, stop, look up at the sign, go in
        p, yaw = path_at(WALK, s)
        moving = s < WALK[1][0] or s >= WALK[2][0]
        if moving:
            pose = pose_of('walk', s * 6.4, .8); ry = yaw
        else:
            pose = {}; ry = lerp(yaw, -math.pi / 2 - .5, ease(prog(s, 4.55, 4.9)))
        look = ease(prog(s, 4.6, 5.0)) * (1 - ease(prog(s, 5.4, 5.7)))
        sip = clamp((math.sin(s * 1.6) - .55) * 4, 0, 1) if moving else 0
        pose.update(shR=lerp(.35, .95, sip), elR=lerp(.5, 1.85, sip), shzR=lerp(.1, .35, sip))
        if not moving:                                      # delighted little point at the sign
            pose.update(shL=lerp(0, 2.3, look), elL=lerp(.15, .1, look), shzL=.2)
        root = person_root(p.x, .16, p.y, ry)
        P, M = apply_person(npc, root, pose, (lerp(0, -.5, look), 0, 0), m_npc)
        cup_loc = (CONV @ root @ (P['handR'] + Vector((0, .02, .04))).to_4d()).to_3d()
    elif s < T['kneel']:                                       # club: walk in, look around, put the coffee down
        p, yaw = path_at(CLUB_PATH, s)
        moving = s < CLUB_PATH[1][0]
        pose = pose_of('walk', s * 6.4, .8) if moving else {}
        ry = yaw if moving else lerp(yaw, math.pi, ease(prog(s, 7.85, 8.0)))
        root = person_root(IX + p.x, 0, p.y, ry)
        gaze = math.sin(s * 2.2) * .5 if s < 7.6 else 0
        P, M = apply_person(npc, root, pose, (-.25 if s < 7.6 else 0, gaze, 0), m_npc)
        cup_loc = (CONV @ root @ (P['handR'] + Vector((0, .02, .04))).to_4d()).to_3d()
    elif s < T['outside']:                                     # kneel at the stage, pick up a heel, hold it up to the bouncer
        k = ease(prog(s, 8.0, 8.4))
        pose = {kk: v * k for kk, v in KNEEL.items() if kk != 'flatfeet'}; pose['flatfeet'] = True
        reach = ease(prog(s, 8.35, 8.6)) * (1 - ease(prog(s, 8.6, 8.9)))
        lift = ease(prog(s, 8.85, 9.2))
        A = arms(); low = dict(shR=.3, elR=.4, shzR=.12)
        pose.update(blend(blend(low, A['reach'], reach), A['offer'], lift))
        ry = lerp(math.pi, math.pi / 2 + .35, ease(prog(s, 8.8, 9.3)))      # turn from the stage to the bouncer
        x0, z0 = path_at(CLUB_PATH, 99)[0]
        x, z = lerp(x0, KNEEL_AT[0], k), lerp(z0, KNEEL_AT[1], k)
        drop = (fk(pose)['kneeL'].y - .06) * k              # sink the hips as the knee goes down
        root = person_root(IX + x, -drop, z, ry)
        hr = (lerp(.3, -.35, lift), 0, 0)
        P, M = apply_person(npc, root, pose, hr, m_npc)
        if s >= 8.6:
            heel_loc = heel_in_hand(P, M)
            heel_rot = (0, lerp(0, -.35, lift), ry - math.pi / 2)
        cup_loc = I(KNEEL_AT[0] - .5, STAGE['h'], HEELS_Z - .1)
    else:                                                      # thrown out of the door, lands on the kerb, sits
        u = prog(s, T['outside'], T['land'])
        door = Vector((SHOP_X + .3, DOOR_Z)); seat = Vector(SIT)
        if u < 1:
            pp = door.lerp(seat, u); y = .9 + 1.3 * 4 * u * (1 - u) - .55 * u
            root = Matrix.Translation(Vector((pp.x, y, pp.y))) @ Euler((0, 0, -u * math.pi * 1.6), 'XYZ').to_matrix().to_4x4() @ Matrix.Rotation(math.pi / 2, 4, 'Y') @ Matrix.Translation(Vector((0, -.9, 0)))
            pose = pose_of('flail', s * 18)
            pose.update(shR=1.9, elR=.3)
            P, M = apply_person(npc, root, pose, (0, 0, 0), m_npc)
        else:
            bounce = math.sin(math.pi * prog(s, T['land'], T['land'] + .18)) * .08
            look = ease(prog(s, 13.4, 13.65))
            pose = dict(SIT_POSE); A = arms()
            pose.update(blend(A['sitrest'], A['sitlook'], look))
            P0 = fk(pose); seat_y = .2 + bounce
            root = person_root(seat.x, seat_y - P0['hipR'].y + .1, seat.y, math.pi / 2 + .25)
            P, M = apply_person(npc, root, pose, (lerp(-.05, .35, look), lerp(0, .75, look), 0), m_npc)
        heel_loc = heel_in_hand(P, M)
        heel_rot = (0, -.3, s * 14) if u < 1 else (0, .15, -1.26)
        cup_loc = I(KNEEL_AT[0] - .5, STAGE['h'], HEELS_Z - .1)
    held = heel_loc is not rest_heel
    sc = (1.45 if s >= T['land'] else 2.1) if held else 1.6      # the one in his hand is played big so it reads
    if held:   # grip it round the middle, not by the sole
        heel_loc = heel_loc - Euler(heel_rot).to_matrix() @ Vector((0, 0, .1 * sc))
    grab.location = heel_loc; grab.rotation_euler = heel_rot; grab.scale = (sc,) * 3
    cup.location = cup_loc; cup.rotation_euler = (0, 0, 0)
    # ---------- bouncer ----------
    crossed = dict(arms()['crossed'])
    if s < 8.85:                                               # by the bar, arms crossed, watching
        root = person_root(IX - 3.3, 0, -1.2, math.pi / 2 + .3, scale=(1.25,) * 3)
        P, M = apply_person(bouncer, root, dict(crossed), (0, 0, 0), m_b)
    elif s < T['outside']:                                     # steps in beside him
        k = ease(prog(s, 8.85, 9.35))
        pose = pose_of('walk', s * 5.5, .7 * (1 - k)) if k < 1 else {}
        pose.update(crossed)
        x, z = lerp(-3.3, KNEEL_AT[0] + 1.05, k), lerp(-1.2, KNEEL_AT[1] + .1, k)
        root = person_root(IX + x, 0, z, -math.pi / 2 - .35, scale=(1.25,) * 3)
        P, M = apply_person(bouncer, root, pose, (.3 * k, 0, 0), m_b)
    else:                                                      # in the doorway after the throw, then back inside
        k = ease(prog(s, T['outside'], T['outside'] + .25))
        pose = blend(dict(shL=1.6, elL=.2, shR=1.6, elR=.2), crossed, k)
        gone = s > 13.0
        root = person_root(SHOP_X + (.55 if not gone else -3), .16, DOOR_Z, math.pi / 2, scale=(1.25,) * 3)
        P, M = apply_person(bouncer, root, pose, (.2, 0, 0), m_b)
    S['earpiece'].matrix_world = M @ Matrix.Translation(P['headb'] + Vector((-.11, .02, .02))) @ Matrix.Rotation(.4, 4, 'X') @ CONV.inverted()
    set_camera(t, s)


# ---------- cameras ----------
SHOTS = dict(
    med=((KNEEL_AT[0] + .5, 1.2, KNEEL_AT[1] + 4.0), (KNEEL_AT[0] + .5, 1.08, KNEEL_AT[1]), 50),
    street=((-3.6, 1.6, 1.2), (-7.3, 2.45, -5.2), 58),
    wide=((2.8, 2.0, 4.3), (-2.4, 1.0, .2), 62),
    throw=((-.9, 1.35, 1.2), (-6.4, 1.7, -4.3), 54),
    close=((-3.25, 1.0, -4.35), (-5.15, .8, -3.55), 46),
)


def aim(pos, look, fov, interior=False):
    cam = S['cam']; p = (I if interior else B)(*pos); l = (I if interior else B)(*look)
    cam.location = p; cam.rotation_euler = (l - p).to_track_quat('-Z', 'Y').to_euler()
    cam.data.angle = math.radians(fov)


def set_camera(t, s):
    t = min(t, T['title'] - 1e-6)
    if t < T['rewindEnd'] or T['bouncer'] <= t < T['outside']:
        m = SHOTS['med']; drift = math.sin(t * .7) * .05
        return aim((m[0][0] + drift, m[0][1], m[0][2]), m[1], m[2], True)
    if t < T['enter']:
        m = SHOTS['street']; k = ease(prog(t, 2.9, 6.6))
        return aim((m[0][0] - .4 * k, m[0][1] + .2 * k, m[0][2] - 1.5 * k), m[1], m[2])
    if t < T['bouncer']:
        m = SHOTS['wide']; k = ease(prog(t, 6.6, 9.3)); pan = ease(prog(t, 6.8, 8.1))   # follow him from the door to the stage
        look = tuple(lerp(a, b, pan) for a, b in zip((-4.0, 1.15, 2.2), (-.9, .95, -1.6)))
        return aim((m[0][0] - .6 * k, m[0][1] - .3 * k, m[0][2] - 1.2 * k), look, m[2], True)
    if t < T['close']:
        return aim(*SHOTS['throw'])
    m = SHOTS['close']; k = ease(prog(t, T['close'], T['title']))
    return aim((m[0][0] + .1 * k, m[0][1], m[0][2] + .15 * k), m[1], m[2])
