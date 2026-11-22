"""Sound effects for the "Workplace Safety with Jimmy" Short (public/short-safety/). All synthesized here."""
import wave

import numpy as np

SR = 44100
OUT = 'public/short-safety/'
rng = np.random.default_rng(11)


def save(name, x, peak=0.9):
    x = np.asarray(x, dtype=np.float64)
    x = x / (np.max(np.abs(x)) + 1e-9) * peak
    w = wave.open(OUT + name, 'wb')
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes())
    w.close()


def T(d):
    return np.arange(int(d * SR)) / SR


def lp(x, a):
    y = np.zeros_like(x)
    s = 0.0
    for i, v in enumerate(x):
        s += a * (v - s)
        y[i] = s
    return y


def noise(n):
    return rng.standard_normal(n)


def place(total, events):
    """events: (start_s, signal)"""
    out = np.zeros(int(total * SR))
    for at, sig in events:
        i = int(at * SR)
        n = min(len(sig), len(out) - i)
        if n > 0:
            out[i:i + n] += sig[:n]
    return out


# metal beam CLANG: inharmonic partials, long ring
t = T(1.6)
clang = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, a, d in [(220, 1, 3), (347, 0.8, 4), (563, 0.6, 5), (911, 0.45, 6), (1490, 0.3, 8), (2300, 0.2, 10)])
clang += noise(t.size) * np.exp(-t * 40) * 1.5
save('clang.wav', clang)

# heavy press SLAM: low thump + metal crunch
t = T(1.2)
press = np.sin(2 * np.pi * (45 + 70 * np.exp(-t * 18)) * t) * np.exp(-t * 6) * 1.4
press += lp(noise(t.size), 0.15) * np.exp(-t * 12) * 2
press += sum(np.sin(2 * np.pi * f * t) * np.exp(-t * 7) * 0.3 for f in (180, 289, 471))
save('press.wav', press)

# cartoon boing
t = T(0.7)
f = 160 + 90 * np.sin(2 * np.pi * 9 * t) * np.exp(-t * 4)
boing = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4)
save('boing.wav', boing, 0.7)

# crane motor hum
t = T(3.0)
hum = sum(np.sin(2 * np.pi * f * t) for f in (60, 120, 181)) * (0.8 + 0.2 * np.sin(2 * np.pi * 3 * t))
hum += lp(noise(t.size), 0.05) * 0.8
hum *= np.clip(t / 0.2, 0, 1) * np.clip((3.0 - t) / 0.3, 0, 1)
save('crane-hum.wav', hum, 0.5)

# whistle duel: cooker (C, steamy rising tone) vs Jimmy's ref whistle (J, pea-whistle trill), faster and higher
# keep in sync with DUEL in ShortWorkplaceSafety.tsx
DUEL = [(0.00, 'C', 0.40), (0.45, 'J', 0.30), (0.80, 'C', 0.22), (1.05, 'J', 0.18), (1.26, 'C', 0.13), (1.41, 'J', 0.11), (1.54, 'C', 0.09), (1.64, 'J', 0.08), (1.73, 'C', 0.30)]
ev = []
for k, (at, who, dur) in enumerate(DUEL):
    tt = T(dur)
    env = np.clip(tt / 0.015, 0, 1) * np.clip((dur - tt) / 0.03, 0, 1)
    rise = 1 + 0.07 * k
    if who == 'C':
        fr = (1400 + 300 * tt / dur) * rise
        sig = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.7 + lp(noise(tt.size), 0.5) * 0.35
    else:
        fr = 2700 * rise * (1 + 0.03 * np.sign(np.sin(2 * np.pi * 34 * tt)))  # the pea makes it trill
        sig = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.8 + noise(tt.size) * 0.05
    ev.append((at, sig * env))
save('duel.wav', place(2.1, ev), 0.75)

# kitchen BOOM: big low explosion + debris
t = T(1.6)
boom = np.sin(2 * np.pi * (38 + 60 * np.exp(-t * 10)) * t) * np.exp(-t * 3) * 1.5
boom += lp(noise(t.size), 0.08) * np.exp(-t * 4) * 3
boom += noise(t.size) * np.exp(-t * 25) * 0.8
save('boom.wav', boom)

# blink: tiny high tick
t = T(0.08)
save('blink.wav', np.sin(2 * np.pi * 2400 * t) * np.exp(-t * 80), 0.4)

# printer error beeps (three)
bt = T(0.11)
beep = np.sign(np.sin(2 * np.pi * 1760 * bt)) * 0.3 * np.clip((0.11 - bt) / 0.01, 0, 1)
save('beep.wav', place(0.6, [(0, beep), (0.18, beep), (0.36, beep)]), 0.45)

# printer machine-gunning paper: rapid fwips over a motor whine, 1.2 s
fw = T(0.06)
fwip = (noise(fw.size) - lp(noise(fw.size), 0.05)) * np.exp(-fw * 60)
ev = [(i * 0.055, fwip * (0.7 + 0.3 * rng.random())) for i in range(22)]
t = T(1.3)
whine = np.sin(2 * np.pi * (300 + 200 * t) * t) * 0.15
save('fwip.wav', place(1.3, ev) + whine, 0.7)

# short "peep" from the whistle, and a muffled one (under paper)
t = T(0.16)
peep = np.sin(2 * np.pi * 2900 * t * (1 + 0.03 * np.sign(np.sin(2 * np.pi * 30 * t)))) * np.clip(t / 0.01, 0, 1) * np.clip((0.16 - t) / 0.03, 0, 1)
save('peep.wav', peep, 0.6)
save('peep-muffled.wav', lp(lp(peep, 0.08), 0.08), 0.35)

# conveyor rattle
t = T(3.0)
rat = place(3.0, [(i * 0.09, noise(600) * np.exp(-np.arange(600) / 120)) for i in range(33)]) * 0.5
rat += np.sin(2 * np.pi * 90 * t) * 0.2
save('conveyor.wav', rat, 0.45)

# cheesy corporate jingle: bright major arpeggio + bell, 1.6 s
notes = [523.25, 659.25, 783.99, 1046.5]
ev = []
for i, f0 in enumerate(notes):
    tt = T(0.5 if i < 3 else 0.9)
    tone = (np.sin(2 * np.pi * f0 * tt) + 0.4 * np.sin(4 * np.pi * f0 * tt) + 0.2 * np.sin(6 * np.pi * f0 * tt)) * np.exp(-tt * 4)
    ev.append((i * 0.14, tone))
tt = T(1.0)
chord = sum(np.sin(2 * np.pi * f * tt) for f in (261.63, 329.63, 392.0)) * np.exp(-tt * 2.5) * 0.5
ev.append((0.56, chord))
save('jingle.wav', place(1.7, ev), 0.6)
