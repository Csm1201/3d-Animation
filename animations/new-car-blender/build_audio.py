"""Builds the soundtrack for Ep. 3 "The New Car": beach music, the supercar, wind while he's dragged,
sound effects and the voice lines. Reuses the synth helpers from Ep. 1 (animations/fantastic-3d/build_audio.py).

Usage: python3 build_audio.py <voice_dir> <out.wav>
voice_dir holds prick.mp3. Timings match T and LINES in scene.py.
"""
import importlib.util
import os
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('ep1_audio', os.path.join(HERE, '..', 'fantastic-3d', 'build_audio.py'))
ep1 = importlib.util.module_from_spec(spec); spec.loader.exec_module(ep1)

SR = ep1.SR
DUR = 15.0
N = int(SR * DUR)
ep1.N, ep1.DUR = N, DUR
ep1.mix = np.zeros(N)
mix = ep1.mix
at, add, tt, lowpass, highpass = ep1.at, ep1.add, ep1.tt, ep1.lowpass, ep1.highpass
rng = np.random.default_rng(23)

T = dict(hookEnd=2.0, rewindEnd=2.6, steal=5.4, launch=6.8, fling=10.6, land=11.4, close=11.75, bow=12.3, title=14.1)
LINES = [('prick', 5.55)]


def supercar(d, f0, f1, growl=1.0):
    """High-revving engine: saw + octave, a little rasp."""
    t = tt(d); f = np.linspace(f0, f1, len(t))
    ph = np.cumsum(f) / SR
    s = (2 * (ph % 1) - 1) + .6 * (2 * ((ph * 2.01) % 1) - 1) + .35 * np.sign(np.sin(2 * np.pi * ph * .5))
    return lowpass(s + .25 * growl * rng.standard_normal(len(t)), 2600)


def wind(d):
    n = rng.standard_normal(int(d * SR))
    t = tt(d)
    return highpass(lowpass(n, 1800), 250) * (.75 + .25 * np.sin(2 * np.pi * 7 * t))


def flap(d, rate=17 / (2 * np.pi)):
    """His shirt snapping in the wind."""
    t = tt(d)
    return highpass(lowpass(rng.standard_normal(len(t)), 3500), 900) * np.maximum(0, np.sin(2 * np.pi * rate * 2 * t)) ** 6


def screech(d, f=1450):
    t = tt(d)
    tone = np.sin(2 * np.pi * (f + 60 * np.sin(2 * np.pi * 9 * t)) * t) + .5 * np.sin(2 * np.pi * (f * 1.51) * t)
    return (tone * .5 + highpass(rng.standard_normal(len(t)), 2500) * .5) * np.sin(np.pi * np.linspace(0, 1, len(t))) ** .5


def step():
    t = tt(.07)
    return lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 55) * 1.6


def blip(f, d=.12):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 22)


def env(sig, a=.05, r=.1):
    n = len(sig); e = np.minimum(1, np.arange(n) / (a * SR)) * np.minimum(1, (n - np.arange(n)) / (r * SR))
    return sig * e


def main():
    voice_dir, out_path = sys.argv[1], sys.argv[2]
    # hook: the car at speed, slowed down (pitched lower), wind and flapping
    add(env(supercar(T['hookEnd'], 150, 165), .01, .1), 0, .3)
    add(env(wind(T['hookEnd']), .01, .1), 0, .5)
    add(env(flap(T['hookEnd'], 1.3), .01, .1), 0, .45)
    add(ep1.tape_rewind(), T['hookEnd'], .35)
    # at the kerb: beach music, a sparkle on the new car
    mix[:] += ep1.beach_music(T['rewindEnd'], T['launch'] - .1) * .32
    for k, f in enumerate([1568, 2093, 2637, 3136]):
        add(blip(f, .25), 2.75 + k * .07, .22)
    # the theft: sprinting feet, bonnet slide, door
    for k in range(5):
        add(step(), T['steal'] + .05 + k * .115, .5)
    add(ep1.whoosh(.4), T['steal'] + .58, .5)
    add(ep1.thud(110, .12), T['launch'] - .22, .6)
    # launch: tyres, engine up through the gears, wind and flapping while he hangs on
    add(screech(.75), T['launch'], .4)
    d = T['fling'] - T['launch'] + .9
    eng = np.concatenate([supercar(1.3, 120, 420), supercar(1.2, 290, 470), supercar(d - 2.5, 330, 500)])
    add(env(eng, .03, .9), T['launch'], .34)
    add(env(wind(T['fling'] - T['launch'] - .2), .5, .15), T['launch'] + .2, .5)
    add(env(flap(T['fling'] - T['launch'] - .4), .3, .1), T['launch'] + .4, .4)
    # the swerve, the flight, the bench
    add(screech(.6, 1250), T['fling'] - .3, .42)
    add(ep1.whoosh(.8), T['fling'], .5)
    add(ep1.thud(85, .28), T['land'], .8)
    add(lowpass(env(supercar(2.2, 460, 300), .02, 1.8), 900), T['fling'] + .7, .14)     # the car, leaving
    # the bow lands on his head
    add(blip(660, .1), T['bow'], .5); add(blip(990, .16), T['bow'] + .07, .45)
    add(ep1.whoosh(.4), T['title'] - .1, .3)
    for k, f in enumerate([523.3, 659.3, 784.0, 1046.5]):     # title sting, as Eps. 1-2
        add(ep1.pluck(f, 1.0), T['title'] + k * .03, .5)

    voice = np.zeros(N)
    for name, t in LINES:
        v = ep1.load_voice(os.path.join(voice_dir, f'{name}.mp3')); i = at(t); v = v[: N - i]
        voice[i:i + len(v)] += v
    active = (np.abs(voice) > .01).astype(float)
    win = int(.12 * SR)
    active = np.convolve(active, np.ones(win) / win, mode='same') > .02
    duck = lowpass(np.where(active, .32, 1.0), 12)
    voice_gain = 1.1 * np.abs(mix).max() / max(np.abs(voice).max(), 1e-9)
    mix[:] = mix * duck + voice * voice_gain

    peak = np.abs(mix).max()
    out = mix / peak * .89
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'wrote {out_path} ({DUR}s, peak normalised from {peak:.2f})')


if __name__ == '__main__':
    main()
