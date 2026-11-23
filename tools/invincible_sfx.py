"""Sound effects for the "What if Invincible turned evil?" Short (public/invincible/). All synthesized here."""
import wave

import numpy as np

SR = 44100
OUT = 'public/invincible/'
rng = np.random.default_rng(23)


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


def hp(x, a):
    return x - lp(x, a)


def noise(n):
    return rng.standard_normal(n)


def place(total, events):
    out = np.zeros(int(total * SR))
    for at, sig in events:
        i = int(at * SR)
        n = min(len(sig), len(out) - i)
        if n > 0:
            out[i:i + n] += sig[:n]
    return out


def env(t, a, d):
    return np.clip(t / a, 0, 1) * np.exp(-t * d)


# sub-bass drone, 3.5 s
t = T(3.5)
drone = sum(np.sin(2 * np.pi * f * t) * w for f, w in [(36, 1), (54.2, 0.5), (72.5, 0.3)]) * (0.85 + 0.15 * np.sin(2 * np.pi * 0.7 * t))
drone *= np.clip(t / 0.3, 0, 1) * np.clip((3.5 - t) / 0.4, 0, 1)
save('drone.wav', drone, 0.55)

# big impact BOOM (landing, punches): sub thump + noise burst + debris tail
t = T(2.0)
boom = np.sin(2 * np.pi * (30 + 80 * np.exp(-t * 9)) * t) * np.exp(-t * 2.5) * 1.6
boom += lp(noise(t.size), 0.06) * np.exp(-t * 3) * 3
boom += hp(noise(t.size), 0.3) * np.exp(-t * 14) * 0.9
save('boom.wav', boom)

# explosion (rockets, tank volley element): rumble with crackle
t = T(2.2)
expl = lp(noise(t.size), 0.04) * np.exp(-t * 2) * 3 + np.sin(2 * np.pi * (40 + 40 * np.exp(-t * 6)) * t) * np.exp(-t * 3)
crk = place(2.2, [(rng.uniform(0.05, 1.2), hp(noise(900), 0.4) * np.exp(-np.arange(900) / 150) * rng.uniform(0.3, 0.8)) for _ in range(40)])
save('explosion.wav', expl + crk)

# tank volley: four cannon shots layered within 0.15 s, then the explosion wall
cannon = lambda: (np.sin(2 * np.pi * (55 + 90 * np.exp(-T(1.2) * 14)) * T(1.2)) * np.exp(-T(1.2) * 4) * 1.4 + lp(noise(T(1.2).size), 0.12) * np.exp(-T(1.2) * 7) * 2.5)
save('volley.wav', place(3.0, [(0.0, cannon()), (0.04, cannon()), (0.09, cannon()), (0.14, cannon()), (0.3, expl * 0.9)]))

# metal crunch (jet nose, tank barrel bend, car): grinding inharmonic squeal + crunch noise
t = T(1.1)
fr = 300 + 500 * np.abs(np.sin(2 * np.pi * 3.1 * t))
squeal = np.sin(2 * np.pi * np.cumsum(fr) / SR) * 0.4 + np.sin(2 * np.pi * np.cumsum(fr * 1.53) / SR) * 0.25
crunch = lp(noise(t.size), 0.25) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 17 * t))) * 1.2
save('crunch.wav', (squeal + crunch) * env(t, 0.01, 2.2))

# long steel groan (lifting a tank)
t = T(1.6)
g = sum(np.sin(2 * np.pi * np.cumsum(f0 * (1 + 0.04 * np.sin(2 * np.pi * 1.3 * t + k))) / SR) * w for k, (f0, w) in enumerate([(70, 1), (113, 0.6), (181, 0.4)]))
save('groan.wav', g * np.clip(t / 0.15, 0, 1) * np.clip((1.6 - t) / 0.3, 0, 1), 0.7)

# jet flyby roar (rising then cut), 1.2 s
t = T(1.2)
roar = lp(noise(t.size), 0.15) * (0.3 + 0.7 * t / 1.2) * 2 + hp(noise(t.size), 0.6) * (t / 1.2) * 0.6
roar += np.sin(2 * np.pi * np.cumsum(900 + 600 * t) / SR) * 0.15 * t
save('jet.wav', roar, 0.7)

# ejection seat bang + whoosh
t = T(0.9)
ej = lp(noise(t.size), 0.3) * np.exp(-t * 30) * 2 + lp(noise(t.size), 0.08) * env(t, 0.05, 4) * 0.8
save('eject.wav', ej, 0.7)

# glass shatter: many tiny high pings + noise
t = T(1.4)
gl = hp(noise(t.size), 0.5) * np.exp(-t * 5) * 0.6
gl += place(1.4, [(rng.uniform(0, 0.9), np.sin(2 * np.pi * rng.uniform(2500, 6000) * T(0.12)) * np.exp(-T(0.12) * 40) * rng.uniform(0.2, 0.6)) for _ in range(60)])
save('glass.wav', gl, 0.6)

# car alarms (two overlapping, different patterns), 2.8 s
t = T(2.8)
a1 = np.sign(np.sin(2 * np.pi * (700 + 400 * (np.sin(2 * np.pi * 2.2 * t) > 0)) * t)) * 0.25
a2 = np.sin(2 * np.pi * (900 + 500 * np.abs(np.sin(2 * np.pi * 1.1 * t))) * t) * 0.25 * (np.sin(2 * np.pi * 4 * t) > 0)
save('alarms.wav', lp(a1 + a2, 0.3) * np.clip(t / 0.05, 0, 1), 0.4)

# gunfire burst (pistols, 1.4 s) + ricochet tinks
shot = lambda: lp(noise(int(0.12 * SR)), 0.35) * np.exp(-T(0.12) * 45) * 1.5 + np.sin(2 * np.pi * 120 * T(0.12)) * np.exp(-T(0.12) * 30)
times = np.sort(rng.uniform(0, 1.3, 18))
save('gunfire.wav', place(1.5, [(x, shot() * rng.uniform(0.5, 1)) for x in times]), 0.7)
tink = lambda f: np.sin(2 * np.pi * f * T(0.15)) * np.exp(-T(0.15) * 35)
save('tinks.wav', place(1.6, [(x + 0.05, tink(rng.uniform(3500, 5200)) * 0.5) for x in times] + [(1.2 + rng.uniform(0, 0.3), tink(rng.uniform(2500, 3500)) * 0.3) for _ in range(6)]), 0.5)

# car tumble: a series of crashes
save('tumble.wav', place(1.6, [(i * 0.28, (lp(noise(int(0.25 * SR)), 0.2) * np.exp(-T(0.25) * 12)) * (1 - i * 0.15)) for i in range(5)]), 0.7)

# helicopter rotor thump (2 s), rocket whoosh, metal tear, splash
t = T(2.0)
rotor = lp(noise(t.size), 0.05) * (0.4 + 0.6 * np.abs(np.sin(2 * np.pi * 9 * t)) ** 4) * 2
save('rotor.wav', rotor * np.clip(t / 0.2, 0, 1), 0.6)
t = T(0.8)
whoosh = hp(noise(t.size), 0.2) * np.sin(np.pi * t / 0.8) ** 2
save('rocket.wav', whoosh, 0.6)
t = T(0.7)
tear = (np.sin(2 * np.pi * np.cumsum(1200 - 900 * t / 0.7) / SR) * 0.5 + hp(noise(t.size), 0.3) * 0.6) * env(t, 0.01, 3)
save('tear.wav', tear, 0.7)
t = T(1.4)
splash = lp(noise(t.size), 0.2) * env(t, 0.01, 3) * 1.5 + lp(noise(t.size), 0.03) * env(t, 0.02, 2)
save('splash.wav', splash, 0.8)

# static hiss (screens cutting out), door thud, steel tear, hum
t = T(1.6)
save('static.wav', hp(noise(t.size), 0.5) * (0.6 + 0.4 * (rng.random(t.size) > 0.97)), 0.35)
t = T(0.9)
save('thud.wav', np.sin(2 * np.pi * (40 + 50 * np.exp(-t * 12)) * t) * np.exp(-t * 6) * 1.5 + lp(noise(t.size), 0.1) * np.exp(-t * 10), 0.9)
t = T(1.0)
dtear = (np.sin(2 * np.pi * np.cumsum(500 - 300 * t) / SR) * 0.6 + lp(noise(t.size), 0.3)) * env(t, 0.02, 2.5)
save('doortear.wav', dtear, 0.8)
t = T(3.0)
save('hum.wav', (np.sin(2 * np.pi * 60 * t) + 0.5 * np.sin(2 * np.pi * 120 * t)) * np.clip(t / 0.3, 0, 1), 0.25)

# final low hit
t = T(2.0)
save('hit.wav', np.sin(2 * np.pi * (34 + 30 * np.exp(-t * 6)) * t) * np.exp(-t * 1.6) + lp(noise(t.size), 0.05) * np.exp(-t * 5) * 0.8, 0.9)
