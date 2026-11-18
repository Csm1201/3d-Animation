"""Synthesised SFX for You're the Ref episode 5 (writes public/ep5/*.wav)."""
import numpy as np, wave, os, sys
SR = 44100
OUT = sys.argv[1] if len(sys.argv) > 1 else 'public/ep5'
rng = np.random.default_rng(55)
def save(name, x):
    x = np.asarray(x, dtype=np.float64)
    x = x / max(1e-9, np.max(np.abs(x))) * 0.9
    st = np.stack([x, x], 1)
    with wave.open(os.path.join(OUT, name), 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((st * 32767).astype('<i2').tobytes())
def t(d): return np.arange(int(d * SR)) / SR
def lp(x, a):  # one-pole low-pass
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y

# record scratch: noise through a fast-wobbling resonant sweep
tt = t(0.45); n = rng.standard_normal(len(tt))
f = 900 + 700 * np.sin(2 * np.pi * 9 * tt) * np.exp(-tt * 3)
ph = np.cumsum(f) / SR
save('scratch.wav', (np.sin(2 * np.pi * ph) * 0.6 + lp(n, 0.25) * 0.5) * np.exp(-tt * 5) * (1 - np.exp(-tt * 200)))

# bass hit: pitch-dropping sine + click
tt = t(0.9)
ph = np.cumsum(55 + 90 * np.exp(-tt * 18)) / SR
save('bass-hit.wav', np.sin(2 * np.pi * ph) * np.exp(-tt * 3.5) + 0.3 * rng.standard_normal(len(tt)) * np.exp(-tt * 80))

# heartbeat thud (lub-dub)
tt = t(0.8)
def thud(at, a):
    u = np.clip(tt - at, 0, None); on = tt >= at
    return on * a * np.sin(2 * np.pi * (48 + 30 * np.exp(-u * 30)) * u) * np.exp(-u * 14)
save('heartbeat.wav', thud(0, 1) + thud(0.22, 0.7))

# sad trombone: four descending notes with slide + vibrato on the last
notes = [(311, 0.32), (294, 0.32), (277, 0.32), (262, 1.0)]
out = []
for i, (fr, d) in enumerate(notes):
    tt = t(d)
    vib = 1 + (0.03 * np.sin(2 * np.pi * 6 * tt) if i == 3 else 0)
    fq = fr * vib * (1 - (0.06 * tt if i == 3 else 0))
    ph = np.cumsum(fq) / SR
    s = sum(np.sin(2 * np.pi * k * ph) / k ** 1.2 for k in range(1, 8))
    env = np.minimum(1, tt * 25) * np.minimum(1, (d - tt) * 12)
    out.append(s * env)
save('trombone.wav', lp(np.concatenate(out), 0.35))

# VHS rewind: warbling high squeal + tape hiss
tt = t(1.4)
ph = np.cumsum(2200 + 900 * np.sin(2 * np.pi * 3.3 * tt) + 400 * np.sin(2 * np.pi * 17 * tt)) / SR
save('rewind.wav', 0.35 * np.sin(2 * np.pi * ph) + 0.5 * (rng.standard_normal(len(tt)) - lp(rng.standard_normal(len(tt)), 0.1)) * 0.5)

# stamp: low thump + paper slap
tt = t(0.5)
save('stamp.wav', np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 20) + 0.6 * lp(rng.standard_normal(len(tt)), 0.5) * np.exp(-tt * 45))

# net ripple: filtered noise swell with rustle
tt = t(0.9)
save('net.wav', lp(rng.standard_normal(len(tt)), 0.18) * (np.exp(-tt * 4) * (1 - np.exp(-tt * 60))) * (1 + 0.5 * np.sin(2 * np.pi * 23 * tt)))

# big boot: deep thump + leather crack
tt = t(0.6)
save('big-kick.wav', np.sin(2 * np.pi * (60 + 120 * np.exp(-tt * 25)) * tt) * np.exp(-tt * 9) + 0.8 * rng.standard_normal(len(tt)) * np.exp(-tt * 120))
print('ok')
