"""Renders single test stills: python still.py out_dir t1 t2 ... (times in seconds)."""
import os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy, scene
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
scene.build()
for ts in sys.argv[2:]:
    t = time.time(); scene.update(round(float(ts) * scene.FPS))
    bpy.context.scene.render.filepath = os.path.join(out, f'still_{float(ts):.2f}.png')
    bpy.ops.render.render(write_still=True); print('still', ts, f'{time.time() - t:.1f}s', flush=True)
