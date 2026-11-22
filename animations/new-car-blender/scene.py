"""Life as a GTA 6 NPC, Ep. 3: "The New Car". Blender/Cycles scene.

Reuses Ep. 1's street, materials and character rig from animations/fantastic-blender/scene.py (imported as `base`)
and adds a yellow supercar with a gift bow, the player (pink hoodie, only ever seen from behind) and a bench.
Story coordinates as in Ep. 1: x right, y up, z towards the camera's end of the street; B() converts to Blender.
"""
import math
import os
import sys

import bpy  # noqa: F401  (must come before bmesh)
import bmesh
from mathutils import Euler, Matrix, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location('ep1_scene', os.path.join(HERE, '..', 'fantastic-blender', 'scene.py'))
base = importlib.util.module_from_spec(_spec); sys.modules['ep1_scene'] = base; _spec.loader.exec_module(base)
from ep1_scene import (B, CONV, S, apply_person, box, clamp, cyl_mesh, ease, emissive, fk, glow_mat, hexc, hill, hsh,  # noqa: E402
                       lerp, link, loft, make_person, mat, new_obj, person_root, pose_of, prog, sphere_mesh)

FPS, DUR = 30, 15.0
base.FPS = FPS
# timeline (seconds). Hook first: frames 0..hookEnd show him streaming off the door handle like a flag, slowed down.
T = dict(hookEnd=2.0, rewindEnd=2.6, steal=5.4, launch=6.8, track=7.2, fling=10.6, land=11.4, close=11.75, bow=12.3, title=14.1)
LINES = dict(saving=(3.0, 'saving'), excuse=(7.0, 'excuse'), more=(12.5, 'more'))
TALK = [(3.0, 4.54), (5.11, 5.62), (7.0, 7.78), (8.24, 9.03), (9.45, 10.52), (12.5, 13.96)]   # spoken spans
HOOK_S = (8.35, 9.15)             # story span the hook plays in slow motion (already at full speed on frame 0)

Z0 = -42.0                        # where the car is parked (left kerb, nose towards the camera's end of the street)
PARK_X, LANE_X = -3.9, -1.4
V, TAU = 19.0, .5                 # top speed (m/s) and how fast it gets there
BENCH = (-6.75, 27.0)             # bench on the left pavement, facing the road
SEAT_H = .16 + .46
HANDLE = Vector((.985, -.25, .7))  # kerb-side door handle in car-local coords (car faces local +y)
ROOF = Vector((0, -.45, 1.12))     # where the bow sits


# ---------- the car: a low, wide, original supercar ----------
def make_supercar(name, paint):
    root = bpy.data.objects.new(name, None); link(root)
    glass = mat('sc_glass', (.02, .03, .05), rough=.02, metal=.85)
    black = mat('sc_black', (.012, .012, .014), rough=.35)
    carbon = mat('sc_carbon', (.02, .02, .022), rough=.25, metal=.4, coat=1.0)
    body = [(-2.28, .86, .34, .62, .8, .7), (-1.95, .99, .26, .68, .88, .84), (-1.2, 1.0, .2, .68, .86, .86), (-.3, .97, .19, .62, .76, .82),
            (.6, .97, .19, .56, .66, .8), (1.5, .95, .2, .48, .55, .74), (2.0, .9, .22, .4, .45, .62), (2.32, .76, .26, .33, .36, .44)]
    cab = [(-1.55, .7, .78, .8, .86, .44), (-.95, .76, .74, .78, 1.08, .52), (-.1, .76, .7, .76, 1.12, .52), (.55, .74, .64, .7, .98, .46), (1.15, .68, .58, .62, .66, .38)]
    b = loft(f'{name}_body', body, paint); b.parent = root
    g = loft(f'{name}_glass', cab, glass); g.parent = root
    roof = loft(f'{name}_roof', [(y, hw * .6, zt - .05, zt - .04, zt + .014, thw * .72) for (y, hw, zb, zbelt, zt, thw) in cab[1:-1]], black); roof.parent = root
    def part(nm, size, loc, m, rot=(0, 0, 0)):
        o = box(f'{name}_{nm}', size, loc, m, rot=rot); o.parent = root; return o
    part('int', (1.4, 1.9, .4), (0, -.3, .62), mat('sc_int', (.02, .02, .02), .8))
    part('splitter', (1.86, .5, .035), (0, 2.12, .2), carbon)
    part('diffuser', (1.7, .4, .12), (0, -2.2, .26), carbon)
    for s in (-1, 1):
        part(f'skirt{s}', (.07, 2.5, .09), (s * .97, -.1, .2), carbon)
        part(f'intake{s}', (.05, .55, .2), (s * .99, -.95, .5), black, rot=(.25, 0, 0))            # side air intake behind the door
        part(f'vent{s}', (.3, .5, .02), (s * .45, 1.25, .59), black, rot=(-.1, 0, 0))               # bonnet vents
        part(f'handle{s}', (.03, .16, .035), (s * HANDLE.x, HANDLE.y, HANDLE.z), mat('sc_chrome', (.8, .8, .82), .15, 1.0))
        part(f'mir{s}', (.2, .09, .08), (s * .9, .5, .78), paint)
        part(f'wingst{s}', (.05, .16, .34), (s * .62, -2.0, .92), carbon)
        part(f'wingend{s}', (.03, .46, .2), (s * .97, -2.08, 1.1), carbon)
        ex = new_obj(f'{name}_exh{s}', cyl_mesh(f'{name}_exh{s}', .06, .06, .16, 16), mat('sc_exh', (.6, .6, .62), .2, 1.0), smooth=True); ex.parent = root
        ex.location = (s * .28, -2.33, .34); ex.rotation_euler = (math.pi / 2, 0, 0)
    part('wing', (1.94, .42, .045), (0, -2.08, 1.1), carbon, rot=(-.12, 0, 0))
    part('stripe', (.3, 1.5, .012), (0, 1.3, .6), black, rot=(-.105, 0, 0))                         # black bonnet stripe
    # wheels: wide low-profile tyres, gold rims
    tyre = mat('sc_tyre', (.015, .015, .016), .85); rim = mat('sc_rim', hexc(0xd9a520), .25, 1.0); hubm = mat('sc_hub', (.05, .05, .055), .35, .8)
    for sx in (-1, 1):
        for sy in (-1, 1):
            r = .36 if sy < 0 else .34
            wy = 1.42 if sy > 0 else -1.38; wx = sx * .86
            t = new_obj(f'{name}_tyre', cyl_mesh(f'{name}_tyre', r, r, .3, 32), tyre, smooth=True); t.parent = root
            t.location = (wx, wy, r); t.rotation_euler = (0, math.pi / 2, 0)
            bv = t.modifiers.new('bev', 'BEVEL'); bv.width = .05; bv.segments = 3
            ri = new_obj(f'{name}_rim', cyl_mesh(f'{name}_rim', r - .08, r - .08, .305, 28), hubm, smooth=True); ri.parent = root
            ri.location = (wx + sx * .005, wy, r); ri.rotation_euler = (0, math.pi / 2, 0)
            for k in range(7):
                sp = box(f'{name}_spoke', (.03, .04, (r - .09) * 2), (wx + sx * .16, wy, r), rim); sp.parent = root
                sp.rotation_euler = (k * math.pi / 7, 0, 0)
            cap = new_obj(f'{name}_cap', cyl_mesh(f'{name}_cap', .06, .06, .04, 16), rim, smooth=True); cap.parent = root
            cap.location = (wx + sx * .17, wy, r); cap.rotation_euler = (0, math.pi / 2, 0)
    head_m = emissive('sc_headlight', (1, .95, .85), 9.0); tail_m = emissive('sc_taillight', (1, .04, .04), 6.0)
    for s in (-1, 1):
        part(f'hl{s}', (.34, .3, .035), (s * .6, 2.06, .44), head_m, rot=(-.2, 0, s * .25))
    part('tailbar', (1.5, .04, .05), (0, -2.3, .62), tail_m)
    cu = bpy.data.curves.new(f'{name}_plate', 'FONT'); cu.body = 'NEW 001'; cu.size = .085; cu.align_x = 'CENTER'; cu.align_y = 'CENTER'
    part('plate_bg', (.5, .01, .13), (0, 2.345, .32), mat('sc_plate', (.85, .85, .82), .5))
    pt = new_obj(f'{name}_plate_t', cu, mat('sc_plate_text', hexc(0x1b2a6b), .5)); pt.parent = root
    pt.location = (0, 2.352, .32); pt.rotation_euler = (math.pi / 2, 0, math.pi)
    return root


def make_bow(name):
    """A big red gift bow: two loops, a knot and two tails. Origin at its base."""
    root = bpy.data.objects.new(name, None); link(root)
    red = mat('bow_red', hexc(0xe01828), rough=.35, coat=.6)
    for s in (-1, 1):
        lp = new_obj(f'{name}_loop{s}', sphere_mesh(f'{name}_loopm{s}', .16, 20, 14), red, smooth=True); lp.parent = root
        lp.location = (s * .18, 0, .15); lp.rotation_euler = (0, -s * .35, 0); lp.scale = (1.15, .6, .72)
        tl = box(f'{name}_tail{s}', (.26, .12, .012), (s * .17, 0, .03), red, rot=(0, s * .35, s * .2)); tl.parent = root
    kn = new_obj(f'{name}_knot', sphere_mesh(f'{name}_knot', .07, 14, 10), red); kn.parent = root; kn.location = (0, 0, .12); kn.scale = (1, 1.1, 1)
    return root


def build_car():
    paint = base.paint_mat('sc_paint', hexc(0xffc400))
    car = make_supercar('hero', paint); S['car'] = car
    red = bpy.data.materials.get('bow_red')
    S['bow'] = make_bow('bow')
    red = bpy.data.materials['bow_red']
    for nm, size, loc in (('ribx', (1.5, .1, .008), (0, ROOF.y, ROOF.z + .008)), ('riby', (.1, 1.3, .008), (0, ROOF.y, ROOF.z + .009))):   # ribbon across the roof
        o = box(f'hero_{nm}', size, loc, red); o.parent = car
    S['smoke'] = []
    for k in range(8):
        S['smoke'].append(new_obj(f'smoke{k}', sphere_mesh(f'smoke{k}', .5, 12, 8), glow_mat(f'smoke{k}', (.9, .88, .86), .5, .22)))


def build_bench():
    wood = mat('bench_wood', hexc(0x8a5a34), rough=.6); metal = mat('bench_metal', (.05, .05, .055), rough=.35, metal=.8)
    bx, bz = BENCH
    for k in range(4):                                     # seat slats
        base_o = box(f'bench_seat{k}', (.1, 1.9, .035), B(bx - .2 + k * .125, SEAT_H - .02, bz), wood)
    for k in range(3):                                     # back slats
        box(f'bench_back{k}', (.03, 1.9, .1), B(bx - .3, SEAT_H + .16 + k * .14, bz), wood, rot=(0, -.12, 0))
    for dz in (-.8, .8):
        box(f'bench_leg{dz}', (.5, .05, .44), B(bx - .02, .16 + .22, bz + dz), metal)
        box(f'bench_arm{dz}', (.5, .05, .04), B(bx - .02, SEAT_H + .2, bz + dz), metal)
        box(f'bench_post{dz}', (.04, .05, .7), B(bx - .3, SEAT_H + .12, bz + dz), metal)


# ---------- people and props ----------
def build_people():
    S['npc'] = make_person('npc', dict(skin=0xc98b5e, pants=0xd8c8a8, shorts=True, shirt=0x2fa8f0, dot=0xffe14d, kind='flowers', hair=0x2b1a12, shades=True, shoes=0xf0f0f0))
    pl = make_person('player', dict(skin=0x8d5a3b, pants=0x18181c, shirt=0xff2f90, longSleeves=True, hair=0x111111, shoes=0xf2f2f2))
    hood_m = bpy.data.materials['player_shirt']
    hood = new_obj('player_hood', sphere_mesh('player_hood', .15, 24, 16), hood_m, smooth=True); hood.parent = pl['head']; hood.location = (0, .02, .02); hood.scale = (.95, 1.05, 1.12)
    face = new_obj('player_face', sphere_mesh('player_face', .11, 16, 12), mat('player_void', (.004, .004, .005), .9)); face.parent = pl['head']; face.location = (0, -.07, 0); face.scale = (.8, .7, 1)
    S['player'] = pl
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
    # the tracking shot rides along the left pavement: clear the lamp posts, bin and hydrant it would drive through
    for o in list(bpy.data.objects):
        if o.instance_type == 'COLLECTION' and o.location.x < 0 and -45 < -o.location.y < 32 and o.name.startswith(('street_lamp', 'fire_hydrant', 'metal_trash')):
            bpy.data.objects.remove(o, do_unlink=True)
    build_car(); build_bench(); build_people(); build_camera()
    # parked cars on the far side of the street for life
    for k, (z, kind, col) in enumerate(((-47, 'sedan', 0xe8e8ea), (-33, 'suv', 0x2a3f6a), (-14, 'sedan', 0x8a1c1c), (5, 'suv', 0x2d2d30), (21, 'sedan', 0x4f6d7a), (34, 'sedan', 0xe6e1d3))):
        c = base.make_car(f'parked{k}', kind, base.paint_mat(f'parked{k}_p', hexc(col)), plate=f'NPC {311 + k * 111}')
        c.location = B(3.9, 0, z)
    # soft fill from the camera's end of the street: the sun is behind the hill, so faces towards us sit in shade
    fill = bpy.data.lights.new('fill', 'SUN'); fill.energy = 1.6; fill.color = (1.0, .82, .74); fill.angle = math.radians(25)
    bl = bpy.data.lights.new('bench_light', 'AREA'); bl.energy = 260; bl.size = 1.5; bl.color = (1.0, .85, .7)   # warm glow on the bench
    blo = link(bpy.data.objects.new('bench_light', bl)); blo.location = B(BENCH[0] + 2.4, 2.6, BENCH[1] + 2.2); blo.visible_camera = False
    blo.rotation_euler = (B(BENCH[0], 1.0, BENCH[1]) - blo.location).to_track_quat('-Z', 'Y').to_euler()
    fo = link(bpy.data.objects.new('fill', fill)); fo.rotation_euler = (B(.45, .5, 1.0)).to_track_quat('Z', 'Y').to_euler()


# ---------- animation ----------
def story_time(t):
    if t < T['hookEnd']:                      # hook: dragged down the street, slowed down
        return lerp(*HOOK_S, t / T['hookEnd'])
    if t < T['rewindEnd']:                    # rewind: the car reverses back to the kerb
        return lerp(HOOK_S[1], T['launch'] - .2, ease(prog(t, T['hookEnd'], T['rewindEnd'])))
    return t


def talking(t, spans):
    return any(a <= t < b for a, b in spans)


def mouth_of(t, spans):
    return (5 if int(t * 12) % 2 else 2) if talking(t, spans) else 1


def blend(a, b, k):
    return {kk: lerp(a.get(kk, 0), b.get(kk, 0), k) for kk in set(a) | set(b)}


_IK = {}


def arm_ik(target, base_pose=None, side='R'):
    key = (round(target[0], 2), round(target[1], 2), round(target[2], 2), side, tuple(sorted((base_pose or {}).items())))
    if key in _IK:
        return _IK[key]
    best = None; tv = Vector(target)
    for sh in [i * .1 for i in range(-5, 33)]:
        for el in [i * .1 for i in range(0, 23)]:
            for shz in [i * .1 for i in range(-8, 9)]:
                pose = dict(base_pose or {}); pose.update({'sh' + side: sh, 'el' + side: el, 'shz' + side: shz})
                d = (fk(pose)['hand' + side] - tv).length + .02 * el
                if best is None or d < best[0]:
                    best = (d, {'sh' + side: sh, 'el' + side: el, 'shz' + side: shz})
    _IK[key] = best[1]
    return best[1]


def car_xz(s):
    d = s - T['launch']
    if d <= 0:
        return PARK_X, Z0
    z = Z0 + V * (d - TAU * (1 - math.exp(-d / TAU)))
    x = lerp(PARK_X, LANE_X, ease(prog(d, .05, 1.1)))
    sw = ease(prog(s, T['fling'] - .3, T['fling'] + .3))                   # the swerve that whips him off
    x += 2.4 * sw - .8 * ease(prog(s, T['fling'] + .3, T['fling'] + .9))
    return x, z


def car_state(s):
    """(matrix in Blender space, x, z) for the car at story time s."""
    x, z = car_xz(s); x2, z2 = car_xz(s + .02)
    dx, dz = x2 - x, z2 - z
    turn = math.atan2(dx, dz) if dz > 1e-6 else 0.0             # steering angle off straight ahead
    yaw = math.pi + turn
    d = s - T['launch']
    pitch = .07 * math.exp(-d * 2.5) * prog(d, 0, .12) if d > 0 else 0     # squats on its rear wheels off the line
    roll = turn * 1.0 if d > 0 else 0
    m = Matrix.Translation(B(x, hill(z) + .02, z)) @ Euler((pitch, roll, yaw), 'XYZ').to_matrix().to_4x4()
    return m, x, z


def to_story(v):
    return (CONV.inverted() @ v.to_4d()).to_3d()


STAND = (-5.42, Z0 + .18)                                  # where he stands, at the kerb-side door
FLAG = dict(shL=3.05, elL=.1, shzL=.1)                     # left arm straight up over his head, hanging on
SIT_POSE = dict(hipL=1.6, hipR=1.75, kneeL=1.65, kneeR=1.35, hipzL=-.1, hipzR=-.32)    # legs crossed
_C = {}
FLAG_UP = .7


def consts():
    if not _C:
        m0, _, _ = car_state(0)
        h = to_story(m0 @ HANDLE)
        root = person_root(STAND[0], .16, STAND[1], math.pi / 2)
        loc = root.inverted() @ h.to_4d()
        _C['hold'] = arm_ik((loc.x, loc.y, loc.z), {}, 'L')                 # standing, left hand on the handle
        _C['pat'] = arm_ik((loc.x - .1, 1.2, loc.z + .2), {}, 'L')          # hand on the roof
        _C['cup_rest'] = dict(shR=.35, elR=1.3, shzR=.1)
        _C['cup_out'] = dict(shR=1.5, elR=.5, shzR=.9)                       # prone: coffee held out to the side, level
        _C['cup_sip'] = dict(shR=2.5, elR=2.1, shzR=.25)                     # prone: straw to his mouth
        _C['sit_arms'] = dict(shR=.6, elR=.8, shzR=.3, shL=.5, elL=.9, shzL=.35)
    return _C


def flag_root(s, pose):
    """Root that hangs him off the door handle by his left hand, streaming out behind the car."""
    m, x, z = car_state(s)
    h = to_story(m @ HANDLE)
    wave = math.sin(s * 15) * .09
    rot = Matrix.Rotation(.08 * math.sin(s * 9) + .22, 4, 'Y') @ Matrix.Rotation(math.pi / 2 + FLAG_UP + wave, 4, 'X') @ Matrix.Rotation(math.pi, 4, 'Y')   # trailing up and back, like a flag
    hand = fk(pose)['handL']
    return Matrix.Translation(h - (rot @ hand.to_4d()).to_3d()) @ rot, h


def flag_pose(s, t):
    c = consts()
    ph = s * 17
    pose = dict(FLAG)
    pose.update(hipL=math.sin(ph) * .32 - .1, hipR=-math.sin(ph) * .32 - .1, kneeL=.25 + .2 * math.sin(ph + 1), kneeR=.25 - .2 * math.sin(ph + 1), hipzL=-.12, hipzR=.12)
    sip = ease(prog(t, .45, .95)) * (1 - ease(prog(t, 1.5, 1.9))) if t < T['hookEnd'] else 0     # the calm sip in the hook
    pose.update(blend(c['cup_out'], c['cup_sip'], sip))
    return pose, sip


def update(frame):
    t = frame / FPS
    s = story_time(t)
    c = consts()
    npc, player, cup, car, bow = S['npc'], S['player'], S['cup'], S['car'], S['bow']
    m_npc = mouth_of(t, TALK)
    # ---------- car ----------
    cm, cx, cz = car_state(s)
    car.matrix_world = cm
    d = s - T['launch']
    for k, o in enumerate(S['smoke']):                                         # tyre smoke off the line
        a = prog(d, .02 + k * .04, .9 + k * .05)
        if False:
            o.location = B(PARK_X + (-.86 if k % 2 else .86) + (hsh(k, 1) - .5) * .5, .3 + a * (.6 + hsh(k, 2)), Z0 - 1.6 - a * (1 + hsh(k, 3) * 2))
            o.scale = (.4 + a * 1.6,) * 3
        else:
            o.location = B(0, -50, 0); o.scale = (.01,) * 3
    # ---------- NPC ----------
    bx, bz = BENCH
    sit = dict(SIT_POSE); sit.update(c['sit_arms'])
    P0 = fk(sit)
    hip = Vector((0, P0['hipR'].y, P0['hipR'].z))

    def sit_root(yb=0, tilt=0):
        r = person_root(bx, SEAT_H + yb - P0['hipR'].y + .1, bz, math.pi / 2)
        return r @ Matrix.Translation(hip) @ Matrix.Rotation(tilt, 4, 'X') @ Matrix.Translation(-hip)

    head = (0, 0, 0)
    if s < T['launch']:                                        # at the kerb with his new car
        pat = ease(prog(s, 2.9, 3.3)) * (1 - ease(prog(s, 5.1, 5.5)))
        reach = ease(prog(s, 5.25, 5.7))
        rub = math.sin(s * 9) * .12 * pat
        arm = blend({}, c['pat'], pat); arm = blend(arm, c['hold'], reach)
        pose = dict(arm); pose['shzL'] = pose.get('shzL', 0) + rub
        pose.update(c['cup_rest'])
        root = person_root(STAND[0], .16, STAND[1], math.pi / 2)
        look_p = ease(prog(s, 5.75, 6.05)) * (1 - ease(prog(s, 6.45, 6.7)))      # watches the player slide past
        head = (-.12 * pat + .1, -.9 * look_p + .5 * ease(prog(s, 4.9, 5.2)) * (1 - ease(prog(s, 5.6, 5.9))), 0)
        P, M = apply_person(npc, root, pose, head, m_npc)
    elif s < T['fling']:                                       # hanging on, streaming out behind like a flag
        fp, sip = flag_pose(s, t)
        w = ease(prog(d, 0, .4))
        stand_pose = dict(c['hold']); stand_pose.update(c['cup_rest'])
        pose = blend(stand_pose, fp, w)
        fr, h = flag_root(s, pose)
        r0 = Matrix.Rotation(math.pi / 2, 4, 'Y')
        q = r0.to_quaternion().slerp(fr.to_quaternion(), w)
        rot = q.to_matrix().to_4x4()
        root = Matrix.Translation(h - (rot @ fk(pose)['handL'].to_4d()).to_3d()) @ rot
        head = (lerp(0, .15, w) + .15 * sip, 0, 0)
        P, M = apply_person(npc, root, pose, head, m_npc)
    else:                                                      # whipped off by the swerve, lands sitting on the bench
        u = prog(s, T['fling'], T['land'])
        fp, _ = flag_pose(T['fling'], 99)
        r_rel, _ = flag_root(T['fling'], fp)
        p0 = r_rel.to_translation(); tgt = sit_root(0, -.5)
        if u < 1:
            fly_loc = p0.lerp(tgt.to_translation(), u) + Vector((0, 2.6 * 4 * u * (1 - u), 0))
            spin = Matrix.Rotation(-2 * math.pi * ease(min(u / .8, 1)), 4, 'X')
            fly_q = (r_rel.to_quaternion().to_matrix().to_4x4() @ spin).to_quaternion()
            w = ease(prog(u, .6, 1))
            rot = fly_q.slerp(tgt.to_quaternion(), w).to_matrix().to_4x4()
            # spin about his middle, not his feet
            mid = Vector((0, .95, 0))
            root = Matrix.Translation(fly_loc.lerp(tgt.to_translation(), w) * 1 + (1 - w) * ((r_rel.to_quaternion().to_matrix().to_4x4() @ mid.to_4d()).to_3d() - (rot @ mid.to_4d()).to_3d())) @ rot
            pose = blend(dict(pose_of('flail', s * 18), **c['cup_out']), {**sit, 'shL': 2.4, 'elL': .5, 'shzL': .5, 'shR': 2.2, 'elR': .5, 'shzR': .5}, w)
            P, M = apply_person(npc, root, pose, (0, 0, 0), m_npc)
        else:
            dl = s - T['land']
            bounce = .09 * abs(math.sin(math.pi * prog(dl, 0, .22))) + .03 * abs(math.sin(math.pi * prog(dl, .22, .36)))
            tilt = lerp(-.5, .1, ease(prog(dl, 0, .25))) if dl < .25 else lerp(.1, 0, ease(prog(dl, .25, .45)))
            flop = ease(prog(dl, .05, .4))
            pose = blend({**sit, 'shL': 2.4, 'elL': .5, 'shzL': .5, 'shR': 2.2, 'elR': .5, 'shzR': .5}, sit, flop)
            cam = ease(prog(s, T['close'] + .1, T['close'] + .4))
            watch = ease(prog(dl, .1, .3)) * (1 - cam)                                  # watches his car leave
            head = (.04, -1.0 * watch, 0)
            P, M = apply_person(npc, sit_root(bounce, tilt), pose, head, m_npc)
            root = sit_root(bounce, tilt)
    cup.location = (CONV @ root @ (P['handR'] + Vector((0, .02, .04))).to_4d()).to_3d()   # he never lets go of his coffee
    cup.rotation_euler = (0, 0, 0)                                                        # ...and it stays perfectly level
    # ---------- the bow ----------
    rel = T['fling'] - .12
    if s < rel:
        bow.matrix_world = cm @ Matrix.Translation(ROOF)
    else:
        mr, _, _ = car_state(rel)
        a = to_story(mr @ ROOF)
        top = Vector((bx, SEAT_H - P0['hipR'].y + .1 + fk(sit)['headb'].y + .2, bz))
        u = prog(s, rel, T['bow'])
        k = 1 - (1 - u) ** 2
        pos = a.lerp(top, k) + Vector((math.sin(u * 9) * .5 * (1 - u), 5.5 * 4 * u * (1 - u) * (1 - .45 * u), 0))
        if u >= 1:
            pos = top
        sp = (1 - u) * 5
        bow.matrix_world = Matrix.Translation(B(pos.x, pos.y, pos.z)) @ Euler((math.sin(sp * 2) * .6 * (1 - u), sp * .8, .585 + sp), 'XYZ').to_matrix().to_4x4()
    # ---------- the player: runs in from behind the camera, slides over the bonnet, gets in ----------
    ps = s
    if T['steal'] <= ps < T['launch'] - .12:
        a, b_, c_, e_ = T['steal'], T['steal'] + .6, T['steal'] + 1.0, T['steal'] + 1.2
        if ps < b_:                                            # sprint
            k = prog(ps, a, b_); x = lerp(-6.2, -5.1, k); z = lerp(Z0 + 9.5, Z0 + 2.9, k)
            proot = person_root(x, .16 - .16 * prog(k, .85, 1), z, math.atan2(-5.1 + 6.2, -6.6)); ppose = pose_of('walk', ps * 16, 1.7); ppose['bend'] = .25
        elif ps < c_:                                          # bonnet slide, feet first
            k = prog(ps, b_, c_); x = lerp(-5.1, -2.7, k); z = lerp(Z0 + 2.3, Z0 + 1.5, k)
            y = .02 + .6 * math.sin(math.pi * min(1, k * 1.15)) ** .5 - .93 * 0
            ppose = dict(hipL=1.35, hipR=1.5, kneeL=.3, kneeR=.15, shL=-.6, elL=.3, shR=.9, elR=.4, shzR=.6)
            proot = person_root(x, y - .5, z, math.pi / 2 + .3, rot=None)
        elif ps < e_:                                          # round to the driver's door
            k = prog(ps, c_, e_); x = -2.75; z = lerp(Z0 + 1.5, Z0 - .2, k)
            proot = person_root(x, 0, z, math.pi); ppose = pose_of('walk', ps * 16, 1.5)
        else:                                                  # in
            k = prog(ps, e_, T['launch'] - .12); x = lerp(-2.75, -3.6, k)
            proot = person_root(x, -.55 * k, Z0 - .25, -math.pi / 2); ppose = dict(hipL=1.2 * k, hipR=1.2 * k, kneeL=1.3 * k, kneeR=1.3 * k, bend=.4 * k)
        apply_person(player, proot, ppose, (0, 0, 0), 1)
    else:
        apply_person(player, person_root(0, -60, 0), {}, (0, 0, 0), 1)
    set_camera(t, s)


# ---------- cameras ----------
def aim(pos, look, fov):
    cam = S['cam']; p = B(*pos); l = B(*look)
    cam.location = p; cam.rotation_euler = (l - p).to_track_quat('-Z', 'Y').to_euler()
    cam.data.angle = math.radians(fov)


def track_cam(s, t):
    """Rides ahead of the car on the kerb side, looking back at him streaming off the door."""
    _, x, z = car_state(s)
    sh = math.sin(t * 41) * .012 + math.sin(t * 67) * .008      # road buzz
    return aim((max(x - 3.4, -8.1), 1.45 + sh, z + 4.4), (x - .75, 1.25 + sh * .5, z - .9), 52)


def set_camera(t, s):
    t = min(t, T['title'] - 1e-6)
    bx, bz = BENCH
    if t < T['rewindEnd']:
        return track_cam(s, t)
    if t < T['track']:                                         # at the kerb: beauty shot, then wider for the theft
        k = ease(prog(t, T['rewindEnd'], T['steal'])); wdn = ease(prog(t, T['steal'] - .2, T['steal'] + .5))
        pos = (lerp(-7.5, -7.3, k) - .3 * wdn, lerp(1.25, 1.35, k) + .25 * wdn, Z0 + lerp(9.2, 8.4, k) + 1.4 * wdn)
        return aim(pos, (-4.3, .85, Z0 + .2), 45)
    if t < T['fling'] + .05:
        return track_cam(s, t)
    if t < T['close']:                                         # by the bench: the swerve, the flight, the landing
        dl = s - T['land']; jolt = 0 if dl < 0 else .08 * math.exp(-dl * 9) * math.sin(dl * 55)
        return aim((-2.8, 1.3, bz + 6.2), (-6.4, 1.45 + jolt, bz - 1.0), 58)
    k = ease(prog(t, T['close'], T['title']))
    return aim((bx + 1.75 - .1 * k, 1.2, bz + 2.7), (bx + .05, SEAT_H + .6, bz), 40)
