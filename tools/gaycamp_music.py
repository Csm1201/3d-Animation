"""Score for the camp Short (public/gaycamp/music.wav). Synthesized here, no samples, no credits.

Follows the cut: hook stinger, a sassy groove for the walk, a tense pulse under the questions,
dead silence after "Lilac", a pride-disco burst for the flag, a spa pad in the tent, an orchestral
hit on the flap, a driving action cue for the chase, a triumphant lift on the bike, a drone to end.
It ducks under the dialogue so every line stays clear.
"""
import wave

import numpy as np

SR = 44100
TOTAL = 37.0
rng = np.random.default_rng(7)
N = int(TOTAL * SR)


def T(d):
    return np.arange(int(d * SR)) / SR


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def band(x, lo, hi):
    f = np.fft.rfft(x)
    fr = np.fft.rfftfreq(len(x), 1 / SR)
    f[(fr < lo) | (fr > hi)] = 0
    return np.fft.irfft(f, len(x))


def saw(f, t, harm=10):
    return sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, harm + 1))


def adsr(n, a=0.005, d=0.1, s=0.6, r=0.05, hold=None):
    t = np.arange(n) / SR
    L = n / SR
    hold = L - r if hold is None else hold
    e = np.where(t < a, t / a, s + (1 - s) * np.exp(-(t - a) / max(d, 1e-4)))
    e *= np.clip((L - t) / r, 0, 1)
    return e


out = np.zeros(N)


def put(at, sig, g=1.0):
    i = int(at * SR)
    n = min(len(sig), N - i)
    if n > 0 and i >= 0:
        out[i:i + n] += sig[:n] * g


# ---------------------------------------------------------------- instruments
def kick(g=1.0):
    t = T(0.35)
    f = 45 + 110 * np.exp(-t * 30)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 9) * g


def snare(g=1.0):
    t = T(0.22)
    return (band(rng.standard_normal(len(t)), 1200, 8000) * 0.7 + np.sin(2 * np.pi * 185 * t) * 0.6) * np.exp(-t * 18) * g


def hat(g=1.0, open_=False):
    t = T(0.25 if open_ else 0.06)
    return band(rng.standard_normal(len(t)), 7000, 16000) * np.exp(-t * (12 if open_ else 60)) * 0.5 * g


def clap(g=1.0):
    t = T(0.2)
    n = band(rng.standard_normal(len(t)), 900, 6000)
    e = sum(np.exp(-np.clip(t - d, 0, None) * 60) * (t >= d) for d in (0, 0.012, 0.024)) + np.exp(-t * 14) * 0.6
    return n * e * 0.6 * g


def tom(midi, g=1.0):
    t = T(0.4)
    f = hz(midi) * (1 + 0.5 * np.exp(-t * 20))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7) * g


def bass(midi, dur, g=1.0):
    t = T(dur)
    f = hz(midi)
    return (saw(f, t, 6) * 0.5 + np.sin(2 * np.pi * f / 2 * t) * 0.6) * adsr(len(t), 0.004, 0.08, 0.5, 0.03) * g


def stab(chord, dur, g=1.0, harm=8):
    t = T(dur)
    s = sum(saw(hz(m) * (1 + dt), t, harm) for m in chord for dt in (-0.004, 0.004))
    return s / len(chord) * adsr(len(t), 0.003, 0.12, 0.25, 0.04) * g


def strings(chord, dur, g=1.0, trem=0.0):
    t = T(dur)
    s = sum(saw(hz(m) * (1 + dt), t, 7) for m in chord for dt in (-0.006, 0, 0.005))
    e = np.clip(t / 0.3, 0, 1) * np.clip((dur - t) / 0.3, 0, 1)
    if trem:
        e *= 0.6 + 0.4 * np.sin(2 * np.pi * trem * t)
    return s / (3 * len(chord)) * e * g


def pluck(midi, dur=0.18, g=1.0):
    t = T(dur)
    f = hz(midi)
    return (np.sign(np.sin(2 * np.pi * f * t)) * 0.3 + np.sin(2 * np.pi * f * 2 * t) * 0.3) * np.exp(-t * 22) * g


def pad(chord, dur, g=1.0):
    t = T(dur)
    s = sum(np.sin(2 * np.pi * hz(m) * t + np.sin(2 * np.pi * 0.3 * t + m)) for m in chord)
    return s / len(chord) * np.clip(t / 1.0, 0, 1) * np.clip((dur - t) / 0.8, 0, 1) * g


def hit(chord=(38, 45, 50, 57), g=1.0):
    t = T(2.2)
    boom = np.sin(2 * np.pi * np.cumsum(40 + 60 * np.exp(-t * 12)) / SR) * np.exp(-t * 2.5)
    brass = sum(saw(hz(m), t, 12) for m in chord) / len(chord) * np.exp(-t * 2.2)
    crash = band(rng.standard_normal(len(t)), 3000, 14000) * np.exp(-t * 3) * 0.4
    return (boom * 1.2 + brass * 0.7 + crash) * g


def riser(dur, g=1.0):
    t = T(dur)
    f = 200 * 2 ** (3 * t / dur)
    tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4
    nz = band(rng.standard_normal(len(t)), 2000, 9000) * 0.5
    return (tone + nz) * (t / dur) ** 2 * g


def grid(start, end, bpm, step=0.25):
    b = 60 / bpm
    k = 0
    while start + k * b * step < end - 1e-6:
        yield k, start + k * b * step
        k += 1


# ---------------------------------------------------------------- the cue sheet
# 0.0-1.5 HOOK: pride-disco burst at full tilt, hard stop into the rewind
for k, at in grid(0, 1.5, 150):
    if k % 4 == 0:
        put(at, kick(1.1))
    if k % 8 == 4:
        put(at, clap(0.9))
    if k % 2 == 1:
        put(at, hat(0.6, open_=True))
    put(at, pluck([62, 66, 69, 74][k % 4] + 12, g=0.35))
put(0, stab([62, 66, 69, 74], 0.6, 0.8))
put(0.8, stab([64, 67, 71, 76], 0.6, 0.6))
put(1.32, riser(0.18, 0.5))

# 2.15-5.4 the sashay: a sassy, bouncy groove (118 bpm)
for k, at in grid(2.15, 5.3, 118):
    if k % 4 == 0:
        put(at, kick(0.7))
    if k % 8 == 4:
        put(at, clap(0.55))
    if k % 2 == 1:
        put(at, hat(0.35))
    bl = [45, 45, 57, 45, 48, 50, 52, 55][k % 8]
    if k % 2 == 0:
        put(at, bass(bl, 0.22, 0.5))

# 5.4-10.4 tense pulse under "Relax..." / "Favourite colour?"
for k, at in grid(5.4, 10.35, 100, 0.5):
    put(at, bass([38, 38, 38, 41][(k // 4) % 4] if k % 2 == 0 else 50, 0.18, 0.45))
    if k % 4 == 0:
        put(at, kick(0.45))
put(5.4, strings([50, 53, 57], 5.0, 0.25))
put(8.6, riser(1.75, 0.35))
# 10.4: the music cuts dead for the "Lilac" silence; a creeping tremolo builds back in
put(12.2, strings([50, 53, 56, 59], 2.0, 0.3, trem=9))

# 14.2-16.1 "I'm GAAAY": tension snaps, then the pride-disco drop with the flag at 16.1
put(15.6, riser(0.5, 0.5))
for k, at in grid(16.05, 18.55, 124):
    if k % 4 == 0:
        put(at, kick(1.0))
    if k % 8 == 4:
        put(at, clap(0.8))
    if k % 2 == 1:
        put(at, hat(0.55, open_=True))
    put(at, pluck([62, 66, 69, 74, 78, 74, 69, 66][k % 8], g=0.3))
    if k % 4 == 0:
        put(at, bass([38, 38, 43, 45][(k // 16) % 4], 0.4, 0.5))
put(16.05, stab([62, 66, 69, 74], 0.7, 0.7))
# 18.6 BOMBOCLAAT: record-stop silence (the voice carries it)

# 20.8-25.5 tent: soft spa pad
put(20.8, pad([60, 64, 67, 71], 4.8, 0.35))
for k, at in grid(21.0, 25.4, 70, 1):
    put(at, pluck([72, 76, 79, 83][k % 4], 0.5, 0.08))
# 25.6 the flap: orchestral hit
put(25.6, hit(g=0.9))

# 27.4-31.8 THE CHASE: driving action cue, 168 bpm in D minor
put(26.9, riser(0.5, 0.45))
bassline = [38, 38, 50, 38, 41, 38, 48, 38, 36, 36, 48, 36, 37, 37, 49, 37]
for k, at in grid(27.4, 31.75, 168):
    put(at, bass(bassline[k % 16], 0.1, 0.55))
    if k % 4 == 0:
        put(at, kick(1.0))
    if k % 8 == 4:
        put(at, snare(0.9))
    if k % 2 == 1:
        put(at, hat(0.45))
    if k % 16 in (14, 15):
        put(at, tom(45 - (k % 16 - 14) * 5, 0.7))
for bar, ch in enumerate([[50, 53, 57], [50, 53, 57], [48, 52, 55], [49, 52, 57]] * 2):
    at = 27.4 + bar * 4 * 60 / 168
    if at < 31.7:
        put(at, stab(ch, 0.25, 0.45))
        put(at + 0.535, stab(ch, 0.18, 0.35))
put(27.4, strings([62, 65, 69], 4.4, 0.25, trem=12))
put(31.2, riser(0.6, 0.5))

# 31.8-34.8 the getaway: triumphant major lift
for k, at in grid(31.8, 34.6, 168):
    if k % 4 == 0:
        put(at, kick(0.9))
    if k % 8 == 4:
        put(at, snare(0.7))
    if k % 2 == 1:
        put(at, hat(0.4))
    put(at, bass([38, 50, 45, 50][k % 4] + (5 if k >= 16 else 0), 0.1, 0.45))
put(31.8, hit((50, 54, 57, 62), 0.7))
put(31.8, strings([62, 66, 69, 74], 2.9, 0.35))
put(33.2, stab([67, 71, 74, 79], 0.5, 0.45))

# 34.8-37 ending: low drone under the leader, a final soft hit
t = T(2.2)
put(34.8, (np.sin(2 * np.pi * 36.7 * t) + 0.4 * np.sin(2 * np.pi * 55 * t)) * np.clip(t / 0.4, 0, 1) * np.clip((2.2 - t) / 0.5, 0, 1) * 0.35)
put(36.55, hit((38, 45, 50), 0.4))

# ---------------------------------------------------------------- duck under dialogue
LINES = [(0.0, 1.5), (5.4, 9.0), (9.3, 10.2), (10.5, 12.6), (14.2, 16.0), (18.6, 19.8), (21.2, 25.4), (26.1, 27.0),
         (27.45, 28.2), (28.1, 29.6), (30.6, 31.6), (32.1, 33.4), (35.0, 36.5)]
duck = np.ones(N)
tt = np.arange(N) / SR
for a, b in LINES:
    d = np.clip(np.minimum((tt - (a - 0.08)) / 0.08, ((b + 0.15) - tt) / 0.15), 0, 1)
    duck = np.minimum(duck, 1 - 0.55 * d)
out *= duck

out = np.tanh(out * 0.9) * 0.8
fade = np.clip((TOTAL - tt) / 0.3, 0, 1)
out *= fade
w = wave.open('public/gaycamp/music.wav', 'wb')
w.setnchannels(1)
w.setsampwidth(2)
w.setframerate(SR)
w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
w.close()
print('wrote public/gaycamp/music.wav', round(len(out) / SR, 2), 's peak', round(float(np.max(np.abs(out))), 2))
