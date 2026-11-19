"""Renders 'Life as a GTA 6 NPC' with Cycles, frame by frame, resuming where it left off.

Usage: <blender-venv>/bin/python render.py [first_frame] [last_frame] [--save-blend]
Frames go to ./renders/f_0000.png ... Frames that repeat (the freeze and the title card) are copied, not rendered.
"""
import os
import shutil
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import scene  # noqa: E402

OUT = os.path.join(scene.HERE, 'renders')
TOTAL = round(scene.DUR * scene.FPS)
FREEZE = range(round(scene.T['hookEnd'] * scene.FPS) + 1, round(scene.T['freezeEnd'] * scene.FPS))   # same picture
TITLE = range(round(scene.T['title'] * scene.FPS), TOTAL)                                          # same picture


def source_frame(f):
    if f in FREEZE:
        return FREEZE[0]
    if f in TITLE:
        return TITLE[0]
    return f


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    first = int(args[0]) if args else 0
    last = int(args[1]) if len(args) > 1 else TOTAL - 1
    os.makedirs(OUT, exist_ok=True)
    t0 = time.time(); scene.build(); print(f'scene built in {time.time() - t0:.1f}s', flush=True)
    if '--save-blend' in sys.argv:
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(scene.HERE, 'renders', 'scene.blend'))
    sc = bpy.context.scene
    for f in range(first, last + 1):
        path = os.path.join(OUT, f'f_{f:04d}.png')
        if os.path.exists(path):
            continue
        src = source_frame(f)
        src_path = os.path.join(OUT, f'f_{src:04d}.png')
        if src != f and os.path.exists(src_path):
            shutil.copyfile(src_path, path); continue
        t = time.time()
        scene.update(src)
        sc.render.filepath = os.path.join(OUT, f'tmp_{src:04d}.png')
        bpy.ops.render.render(write_still=True)
        os.replace(sc.render.filepath, os.path.join(OUT, f'f_{src:04d}.png'))
        if src != f:
            shutil.copyfile(os.path.join(OUT, f'f_{src:04d}.png'), path)
        print(f'frame {f} ({time.time() - t:.1f}s)', flush=True)


if __name__ == '__main__':
    main()
