"""Builds the soundtrack for Ep. 2 "The Shoe Store": club music (full inside, muffled outside), street beach music,
sound effects and the voice lines. Reuses the synth helpers from Ep. 1 (animations/fantastic-3d/build_audio.py).

Usage: python3 build_audio.py <voice_dir> <out.wav>
voice_dir holds heels.mp3, notshop.mp3 and onestar.mp3.
Timings match T and LINES in scene.py.
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
DUR = 13.0
N = int(SR * DUR)
ep1.N, ep1.DUR = N, DUR
ep1.mix = np.zeros(N)
mix = ep1.mix
at, add, tt, lowpass, highpass = ep1.at, ep1.add, ep1.tt, ep1.lowpass, ep1.highpass
rng = np.random.default_rng(11)

T = dict(hookEnd=2.3, rewindEnd=2.9, enter=6.6, grab=8.7, outside=9.2, land=10.15, slam=10.45, title=12.0)
# the hook replays the throw in slow motion: story time outside+.28 .. land+.55 over 0 .. hookEnd
HOOK_LAND = (T['land'] - (T['outside'] + .28)) / ((T['land'] + .55) - (T['outside'] + .28)) * T['hookEnd']
LINES = [('heels', 3.0), ('notshop', 6.95), ('onestar', 11.0)]


def kick():
    t = tt(.28); f = 45 + 110 * np.exp(-t * 28)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)


def hat():
    t = tt(.05)
    return highpass(rng.standard_normal(len(t)), 6000) * np.exp(-t * 90) * .5


def bass_note(freq, d):
    t = tt(d)
    saw = 2 * ((t * freq) % 1) - 1
    return saw * np.exp(-t * 3) * np.minimum(1, t * 200)


def club_track():
    """124 bpm four-on-the-floor loop for the whole clip; the caller muffles it outside."""
    beat = 60 / 124; out = np.zeros(N)
    roots = [55.0, 55.0, 65.4, 49.0]          # A1 A1 C2 G1, one per bar
    k_, h_ = kick(), hat()
    b = 0; t = 0.0
    while t < DUR:
        i = at(t)
        def put(sig, j, g):
            s = sig[: max(0, N - j)]; out[j:j + len(s)] += s * g
        put(k_, i, 1.0)
        put(h_, at(t + beat / 2), .35)
        bn = bass_note(roots[(b // 4) % 4], beat * .45)
        put(lowpass(bn, 300), at(t + beat / 2), .5)
        b += 1; t += beat
    return out


def door_bang():
    t = tt(.35)
    return np.sin(2 * np.pi * 80 * t) * np.exp(-t * 16) + lowpass(rng.standard_normal(len(t)), 1500) * np.exp(-t * 30) * 1.5


def main():
    voice_dir, out_path = sys.argv[1], sys.argv[2]
    # club: full inside (6.6-9.2), muffled on the street, louder while the door is open (hook and the throw)
    club = club_track()
    muffled = lowpass(lowpass(club, 220), 220)
    ts = np.arange(N) / SR
    inside = ((ts >= T['enter']) & (ts < T['outside'])).astype(float)
    inside = lowpass(inside, 30)
    street_level = np.interp(ts, [0, T['hookEnd'], T['rewindEnd'], 5.6, T['enter'], T['outside'], T['slam'], T['slam'] + .1, DUR], [.55, .45, .25, .25, .45, .55, .55, .18, .18])
    mix[:] += club * .55 * inside + muffled * 1.4 * (1 - inside) * street_level
    mix[:] += ep1.beach_music(T['rewindEnd'], T['enter']) * .3
    add(ep1.tape_rewind(), T['hookEnd'], .35)
    add(ep1.whoosh(.4), T['enter'] - .15, .25)                 # door swings open
    add(ep1.whoosh(.5), 0, .4); add(ep1.thud(80, .3), HOOK_LAND, .8)     # hook: mid-air, slowed-down landing
    add(ep1.whoosh(.3), T['grab'] - .05, .3)                   # bouncer grabs him
    add(door_bang(), T['outside'], .7)                         # door bursts open
    add(ep1.whoosh(.7), T['outside'] + .05, .45)
    add(ep1.thud(80, .3), T['land'], .8)
    add(door_bang(), T['slam'], .45)                           # bouncer slams it shut
    add(ep1.whoosh(.4), T['title'] - .1, .3)
    for k, f in enumerate([523.3, 659.3, 784.0, 1046.5]):     # title sting, as Ep. 1
        add(ep1.pluck(f, 1.0), T['title'] + k * .03, .5)

    voice = np.zeros(N)
    for name, t in LINES:
        v = ep1.load_voice(os.path.join(voice_dir, f'{name}.mp3')); i = at(t); v = v[: N - i]
        voice[i:i + len(v)] += v
    active = (np.abs(voice) > .01).astype(float)
    win = int(.12 * SR)
    active = np.convolve(active, np.ones(win) / win, mode='same') > .02
    duck = lowpass(np.where(active, .3, 1.0), 12)
    voice_gain = .9 * np.abs(mix).max() / max(np.abs(voice).max(), 1e-9)
    mix[:] = mix * duck + voice * voice_gain

    peak = np.abs(mix).max()
    out = mix / peak * .89
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    print(f'wrote {out_path} ({DUR}s, peak normalised from {peak:.2f})')


if __name__ == '__main__':
    main()
