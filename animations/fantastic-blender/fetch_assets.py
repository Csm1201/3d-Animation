"""Downloads the CC0 assets from Poly Haven (https://polyhaven.com, CC0 licence) used by scene.py.

Usage: python3 fetch_assets.py   (files go to ./assets, which git ignores)
"""
import json
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'assets')

MODELS = ['fire_hydrant', 'metal_trash_can', 'street_lamp_01', 'water_manhole_cover', 'modular_street_seating',
          'island_tree_01', 'island_tree_02', 'shrub_01', 'shrub_02', 'utility_box_01', 'potted_plant_01']
TEXTURES = ['asphalt_02', 'large_grey_tiles', 'beige_wall_001', 'painted_plaster_wall', 'white_plaster_02', 'palm_tree_bark',
            'concrete_floor_02']
HDRI = 'belfast_sunset_puresky'
MAPS = {'Diffuse': 'diff', 'nor_gl': 'nor', 'Rough': 'rough'}


def get(url, path):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return
    os.makedirs(os.path.dirname(path), exist_ok=True)
    req = urllib.request.Request(url, headers={'User-Agent': 'asset-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=120) as r, open(path, 'wb') as f:
        f.write(r.read())
    print('  ', os.path.relpath(path, HERE))


def files(asset_id):
    req = urllib.request.Request(f'https://api.polyhaven.com/files/{asset_id}', headers={'User-Agent': 'asset-fetch/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.load(r)


def main():
    for m in MODELS:
        print('model', m)
        g = files(m)['gltf']
        res = '1k' if '1k' in g else sorted(g)[0]
        entry = g[res]['gltf']
        get(entry['url'], os.path.join(OUT, 'models', m, os.path.basename(entry['url'])))
        for rel, inc in entry.get('include', {}).items():
            get(inc['url'], os.path.join(OUT, 'models', m, rel))
    for t in TEXTURES:
        print('texture', t)
        f = files(t)
        for key, short in MAPS.items():
            if key in f:
                get(f[key]['1k']['jpg']['url'], os.path.join(OUT, 'textures', t, f'{short}.jpg'))
    print('hdri', HDRI)
    get(files(HDRI)['hdri']['2k']['hdr']['url'], os.path.join(OUT, 'hdri', f'{HDRI}.hdr'))


if __name__ == '__main__':
    main()
