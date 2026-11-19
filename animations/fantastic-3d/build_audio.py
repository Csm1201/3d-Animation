"""Builds the soundtrack for "Fantastic" (3D version): synthesized sound effects and music, plus the voice lines.

Usage: python3 build_audio.py <voice_dir> <out.wav>
voice_dir holds fantastic.mp3 and jaywalking.mp3.
Timings match the timeline T in index.html.
"""
import subprocess
import sys
import wave

import numpy as np

SR = 44100
DUR = 14.4
N = int(SR * DUR)
rng = np.random.default_rng(7)

T = dict(hook_end=0.67, freeze_end=1.0, rewind_end=1.5, fant=4.55, wide=6.25, hit=6.5, land=7.75,
         bump0=8.5, gap=0.6, jay=12.0, slap=12.75, title=13.4)
BUMPS = [T['bump0'] + i * T['gap'] for i in range(5)]

mix = np.zeros(N, dtype=np.float64)


def at(t):
    return int(round(t * SR))


def add(sig, t, gain=1.0):
    i = at(t)
    if i >= N:
        return
    sig = sig[: N - i]
    mix[i:i + len(sig)] += sig * gain


def tt(d):
    return np.arange(int(d * SR)) / SR


def lowpass(x, cutoff):
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def env_curve(points, length):
    """Piecewise-linear envelope over the whole clip from (time, level) points."""
    ts = np.arange(length) / SR
    xs, ys = zip(*points)
    return np.interp(ts, xs, ys)


def load_voice(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    # trim leading silence so the line starts exactly on its cue
    idx = np.where(np.abs(a) > 0.02 * np.abs(a).max())[0]
    return a[max(idx[0] - int(0.02 * SR), 0):]


# ---------- sound effects ----------
def sirens():
    t = np.arange(N) / SR
    s = np.zeros(N)
    for f0, dev, rate, ph in [(760, 260, 0.9, 0.0), (690, 220, 1.3, 1.7), (820, 180, 0.6, 3.1)]:
        phase = 2 * np.pi * f0 * t - (dev / rate) * np.cos(2 * np.pi * rate * t + ph)
        s += np.sin(phase) + 0.25 * np.sin(3 * phase)
    s /= 3
    loud = env_curve([(0, .22), (T['hook_end'], .22), (T['hook_end'] + .02, 0), (1.8, 0), (3.0, .03), (4.5, .07),
                      (T['wide'], .08), (T['hit'], .16), (11.0, .16), (DUR, .05)], N)
    far = lowpass(s, 900)
    blend = env_curve([(0, 1), (1.5, 1), (1.6, 0), (6.0, 0), (6.3, 1), (DUR, 1)], N)  # 1 = close (bright)
    return (s * blend + far * (1 - blend) * 1.6) * loud


def helicopter():
    t = np.arange(N) / SR
    chop = (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 13 * t))) ** 2
    body = lowpass(rng.standard_normal(N), 300) * 3
    lvl = env_curve([(0, .18), (T['hook_end'], .18), (T['hook_end'] + .02, 0), (3.0, 0), (3.5, .04), (6.0, .06),
                     (T['hit'], .14), (DUR, .1)], N)
    return body * chop * lvl


def engine(d, f_from, f_to):
    t = tt(d)
    f = np.linspace(f_from, f_to, len(t))
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    s = lowpass(saw + 0.4 * rng.standard_normal(len(t)), 1400)
    return s * np.sin(np.pi * np.linspace(0, 1, len(t))) ** 0.6


def whoosh(d=0.5):
    n = rng.standard_normal(int(d * SR))
    e = np.sin(np.pi * np.linspace(0, 1, len(n))) ** 2
    return highpass(lowpass(n, 2500), 400) * e


def bonk():
    t = tt(0.4)
    f = 220 * np.exp(-t * 9) + 55
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9)
    click = rng.standard_normal(len(t)) * np.exp(-t * 120) * 0.6
    return body + click


def thud(f=70, d=0.25):
    t = tt(d)
    body = np.sin(2 * np.pi * f * t) * np.exp(-t * 18)
    rattle = lowpass(rng.standard_normal(len(t)), 900) * np.exp(-t * 25) * 2
    return body + rattle


def splat():
    t = tt(0.3)
    return lowpass(rng.standard_normal(len(t)), 1200) * np.exp(-t * 14) * 2.5 + np.sin(2 * np.pi * 60 * t) * np.exp(-t * 12)


def record_scratch():
    t = tt(0.32)
    f = np.interp(t, [0, .12, .32], [300, 1600, 150])
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    noise = highpass(rng.standard_normal(len(t)), 1500) * 0.5
    return (tone * 0.6 + noise) * np.exp(-t * 4)


def tape_rewind():
    t = tt(0.5)
    f = 1800 + 900 * t / 0.5 + 120 * np.sin(2 * np.pi * 23 * t)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR)
    hiss = highpass(rng.standard_normal(len(t)), 3000) * 0.4
    return (tone * 0.35 + hiss) * np.minimum(1, t * 20)


def slap():
    t = tt(0.12)
    return highpass(rng.standard_normal(len(t)), 1800) * np.exp(-t * 60) * 1.4


def pluck(freq, d=0.6):
    """Karplus-Strong plucked string (ukulele-ish)."""
    n = int(d * SR)
    period = int(SR / freq)
    buf = rng.uniform(-1, 1, period)
    out = np.empty(n)
    for i in range(n):
        out[i] = buf[i % period]
        buf[i % period] = 0.996 * 0.5 * (buf[i % period] + buf[(i + 1) % period])
    return out


def beach_music(start, end):
    notes = {'C4': 261.6, 'E4': 329.6, 'G4': 392.0, 'A4': 440.0, 'F4': 349.2, 'B4': 493.9, 'D5': 587.3, 'C5': 523.3}
    pattern = ['C4', 'G4', 'E4', 'G4', 'A4', 'E4', 'C5', 'E4', 'F4', 'C5', 'A4', 'C5', 'G4', 'D5', 'B4', 'D5']
    step = 0.3
    out = np.zeros(N)
    i = 0
    t = start
    while t < end:
        s = pluck(notes[pattern[i % len(pattern)]])
        a = at(t)
        s = s[: max(0, min(len(s), at(end) - a))]  # hard cut at the end
        out[a:a + len(s)] += s
        t += step
        i += 1
    return out


def main():
    voice_dir, out_path = sys.argv[1], sys.argv[2]

    mix[:] += sirens()
    mix[:] += helicopter()
    mix[:] += beach_music(T['rewind_end'], T['fant']) * 0.35

    add(whoosh(0.6), 0.0, 0.25)
    add(engine(0.67, 140, 120), 0.0, 0.12)
    add(record_scratch(), T['hook_end'], 0.5)
    add(tape_rewind(), T['freeze_end'], 0.35)
    add(engine(1.5, 90, 150), 3.0, 0.07)                 # distant engine over the hill
    add(engine(0.5, 120, 190), T['wide'], 0.35)          # the car closing in
    add(bonk(), T['hit'], 0.9)
    add(whoosh(0.7), T['hit'] + 0.05, 0.4)
    add(splat(), T['land'], 0.7)
    for b in BUMPS:
        add(thud(), b, 0.6)
    add(slap(), T['slap'], 0.6)
    add(whoosh(0.4), T['title'] - 0.1, 0.3)
    for k, f in enumerate([523.3, 659.3, 784.0, 1046.5]):   # title sting: a bright C chord
        add(pluck(f, 1.0), T['title'] + k * 0.03, 0.5)

    # voices on their own track, so the background can duck under them
    voice = np.zeros(N)

    def add_voice(path, t):
        v = load_voice(path)
        i = at(t)
        v = v[: N - i]
        voice[i:i + len(v)] += v

    add_voice(f'{voice_dir}/fantastic.mp3', T['fant'])
    add_voice(f'{voice_dir}/jaywalking.mp3', T['jay'])

    active = (np.abs(voice) > 0.01).astype(float)
    win = int(0.12 * SR)
    active = np.convolve(active, np.ones(win) / win, mode='same') > 0.02
    duck = lowpass(np.where(active, 0.3, 1.0), 12)   # about -10 dB under dialogue, smoothed
    voice_gain = 0.9 * np.abs(mix).max() / max(np.abs(voice).max(), 1e-9)
    mix[:] = mix * duck + voice * voice_gain

    peak = np.abs(mix).max()
    out = mix / peak * 0.89
    pcm = (np.clip(out, -1, 1) * 32767).astype(np.int16)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'wrote {out_path} ({DUR}s, peak normalised from {peak:.2f})')


if __name__ == '__main__':
    main()
