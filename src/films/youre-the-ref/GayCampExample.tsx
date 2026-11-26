/**
 * Example for "What if a really gay guy spawned in the Taliban?" (script: docs/scripts/what-if-gay-guy-spawned-in-taliban-script.md)
 * Low-poly reel style. He's the hero; the Taliban are the joke. No religion, no weapons, no violence.
 *
 *   0.0  HOOK: Day 7 runway night in the cave: disco ball, the bearded leader struts the rug runway, the others clap
 *   1.5  DAY 1
 *   0.0  HOOK: the I'M GAAAY moment (arms up, glitter), the fighters recoil: BOMBOCLAAT
 *   3.85 he takes his shades off: "Oh. My. GOD. Okay... who did your styling, honey? Because we NEED to talk."
 *  10.75 two of them look at each other; one strokes his beard: "Bomboclaat..."
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BackSide, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, ShadowMaterial, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {canvasTex, to3} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, armsUp, runAlong} from './Episode2';
import {handLocal} from './Episode4';
import {FONT} from './Overlays';
import {HEIGHT, WIDTH} from '../../core/constants';

export const GC_FPS = 30;
const F = (s: number) => Math.round(s * GC_FPS);
export const GC_FRAMES = F(37.0);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const memo = new Map<string, unknown>();
const keep = <T,>(k: string, make: () => T): T => {
  if (!memo.has(k)) memo.set(k, make());
  return memo.get(k) as T;
};
const flat = (c: string, r = 0.85, m = 0) => keep(`fm${c}${r}${m}`, () => new MeshStandardMaterial({color: c, roughness: r, metalness: m, flatShading: true}));
const glowM = (c: string, k = 2) => keep(`gm${c}${k}`, () => new MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: k, flatShading: true}));
const boxG = (w: number, h: number, d: number) => keep(`b${w},${h},${d}`, () => new BoxGeometry(w, h, d));
const cylG = (r1: number, r2: number, h: number, n = 6) => keep(`c${r1},${r2},${h},${n}`, () => new CylinderGeometry(r1, r2, h, n));
const planeG = new PlaneGeometry(1, 1);

// ---------------------------------------------------------------- timeline (s)
const T_DAY1 = 1.5;
const T_CAMP = 1.9;
const T_SPAWN = 2.15;
const WALK0 = T_SPAWN + 0.35; // sashay start
const WALK1 = WALK0 + 2.3; // arrives in front of them
const T_DEEP = 5.4; // "Relax. I'm completely normal. Ask me anything." (forced deep voice, 3.6 s)
const T_FAV = 9.3; // fighter: "...Favourite colour?" (1.2 s)
const T_LILAC = 10.5; // "Lilaaac. Obviously, sweetie!" (camp voice, 3.1 s) // "Lilac." (0.84 s)
const T_SHADES = T_LILAC - 0.35;
const T_GAY = 14.2; // "Ugh, okay FINE! I'm GAAAAAY, honeyyy!" (camp voice, 4.3 s) // "Okay FINE! I'M GAAAAAY!" (2.77 s)
const T_ARMS = T_GAY + 1.9;
const T_BC = 18.6; // the fighters recoil: BOMBOCLAAT
const HOOK_AT = T_ARMS - 0.15;
// Day 3
const T_D3 = 20.4; // "Day 3" card
const T_TENT = 20.8; // night tent: secret skincare
const T_SKIN = 21.2; // "Ahh... seven-step skincare, darling. Glowing." (4.3 s)
const T_FLAP = 25.6; // the leader opens the flap
const T_CHASE = 27.4; // he bolts: "GET HIM!" / "NOT THE HAIR!"
const T_BIKE = 31.8; // motorbike getaway: "Mwah! Bye, boys!"
const T_END = 34.8; // the leader alone, smoothing his beard: "...Bomboclaat."  // the hook replays the camp from here

// ---------------------------------------------------------------- cast
const HIM = (shades: boolean, mask = false): Style => ({
  lowPoly: true,
  realistic: true,
  outfit: 'kit',
  skin: mask ? '#a8d98f' : '#e6b48e',
  hair: '#3a2a22',
  hairStyle: 'swept',
  kit: {shirt: '#8a7a62', shorts: '#5d5244', socks: '#3a3228', trim: '#8a7a62', longSleeves: true, trousers: true, robe: true},
  hat: {kind: 'turban', color: '#1a1a1c', band: '#1a1a1c'},
  shades,
  shadesColor: '#ff4fa8',
  boa: '#ff6ec7',
});
const fighter = (skin: string, robe: string): Style => ({lowPoly: true, realistic: true, outfit: 'kit', skin, hair: '#1b1412', hairStyle: 'short', beard: true, beardLong: true, kit: {shirt: robe, shorts: '#5d5244', socks: '#3a3228', trim: robe, longSleeves: true, trousers: true, robe: true}, hat: {kind: 'turban', color: '#1a1a1c', band: '#1a1a1c'}});
const MEN = [
  {st: fighter('#b98560', '#8a7a62'), x: -1.6, z: -1.2},
  {st: fighter('#9c6a48', '#6f6a58'), x: 1.4, z: -1.6},
  {st: fighter('#c4916b', '#7d6f5a'), x: -0.6, z: -2.8},
  {st: fighter('#a87650', '#857862'), x: 2.4, z: -0.2},
];
const LEADER: Style = {...fighter('#b07b55', '#5e5446'), shades: true};
const STARE: Look = {tired: 0, droop: -3, eyesClosed: false, brows: 0.6, browLift: 0.7, mouth: 'open', mouthOpen: 0.25, noBlink: true, pupils: 0.75};
const SMUG: Look = {tired: 0.1, droop: -2, eyesClosed: false, brows: -0.2, browLift: 0.35, mouth: 'smile', noBlink: true};
const JOY: Look = {tired: 0, droop: -6, eyesClosed: false, brows: 0.4, browLift: 0.7, mouth: 'open', mouthOpen: 0.7, noBlink: true};

// ---------------------------------------------------------------- props
const gunMetal = keep('gunMetal', () => new MeshStandardMaterial({color: '#2a2b2e', roughness: 0.45, metalness: 0.6, flatShading: true}));
const gunWood = keep('gunWood', () => new MeshStandardMaterial({color: '#7a4a28', roughness: 0.7, flatShading: true}));
/** A generic low-poly assault rifle, muzzle along +x, origin at the grip. */
const Rifle: React.FC = () => (
  <group position={[0.02, 0.06, 0]}>
    <mesh geometry={boxG(0.34, 0.07, 0.045)} material={gunMetal} position={[0.06, 0, 0]} castShadow />
    <mesh geometry={cylG(0.012, 0.012, 0.34, 6)} material={gunMetal} position={[0.38, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} />
    <mesh geometry={boxG(0.16, 0.05, 0.05)} material={gunWood} position={[0.27, -0.01, 0]} />
    <mesh geometry={boxG(0.05, 0.16, 0.035)} material={gunMetal} position={[0.1, -0.1, 0]} rotation={[0, 0, -0.35]} />
    <mesh geometry={boxG(0.22, 0.07, 0.035)} material={gunWood} position={[-0.2, -0.02, 0]} rotation={[0, 0, 0.08]} castShadow />
    <mesh geometry={boxG(0.035, 0.08, 0.03)} material={gunWood} position={[-0.02, -0.07, 0]} />
  </group>
);
const PRIDE = ['#e40303', '#ff8c00', '#ffed00', '#008026', '#004dff', '#750787'];
const prideTex = () =>
  keep('prideTex', () =>
    canvasTex(96, 64, (g) => {
      PRIDE.forEach((c, k) => {
        g.fillStyle = c;
        g.fillRect(0, (k * 64) / 6, 96, 64 / 6 + 1);
      });
    }),
  );
const flagGeo = keep('flagGeo', () => new PlaneGeometry(1.1, 0.7, 8, 1));
/** Pride flag held up between his hands, rippling. */
const Flag: React.FC<{a: Vector3; b: Vector3; t: number}> = ({a, b, t}) => {
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const geo = flagGeo.clone();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    pos.setZ(i, 0.06 * Math.sin(x * 6 + t * 9) * (x + 0.55));
  }
  pos.needsUpdate = true;
  return (
    <group position={[mid.x, mid.y + 0.36, mid.z]}>
      <mesh geometry={cylG(0.012, 0.012, 1.25, 6)} material={gunWood} position={[0, -0.36, 0]} rotation={[Math.PI / 2, 0, 0]} />
      <mesh geometry={geo} rotation={[0, Math.PI / 2, 0]}>
        <meshStandardMaterial map={prideTex()} side={2} roughness={0.8} flatShading />
      </mesh>
    </group>
  );
};


// ---------------------------------------------------------------- camp dressing (reference-style busy set)
const mud = ['#b8946a', '#c4a074', '#a88660', '#bf9a6c'];
/** A flat-roofed mud-brick house with a dark doorway, windows and a parapet. */
const House: React.FC<{x: number; z: number; w: number; h: number; d: number; ry?: number; c: number}> = ({x, z, w, h, d, ry = 0, c}) => (
  <group position={[x, 0, z]} rotation={[0, ry, 0]}>
    <mesh geometry={boxG(w, h, d)} material={flat(mud[c % 4], 0.95)} position={[0, h / 2, 0]} castShadow receiveShadow />
    <mesh geometry={boxG(w + 0.12, 0.16, d + 0.12)} material={flat(mud[(c + 1) % 4], 0.95)} position={[0, h + 0.08, 0]} castShadow />
    <mesh geometry={boxG(0.8, 1.5, 0.05)} material={flat('#3a2a1e')} position={[-w * 0.2, 0.75, d / 2 + 0.01]} />
    <mesh geometry={boxG(0.5, 0.45, 0.05)} material={flat('#2e231b')} position={[w * 0.22, h * 0.62, d / 2 + 0.01]} />
    {Array.from({length: Math.floor(w / 0.9)}, (_, k) => (
      <mesh key={k} geometry={cylG(0.05, 0.05, 0.5, 5)} material={flat('#6a4c30')} position={[-w / 2 + 0.45 + k * 0.9, h - 0.25, d / 2 + 0.15]} rotation={[Math.PI / 2, 0, 0]} />
    ))}
  </group>
);
const Palm: React.FC<{x: number; z: number; s?: number; t: number; i: number}> = ({x, z, s = 1, t, i}) => (
  <group position={[x, 0, z]} scale={s}>
    {[0, 1, 2, 3, 4].map((k) => (
      <mesh key={k} geometry={cylG(0.13 - k * 0.012, 0.15 - k * 0.012, 0.95, 7)} material={flat(k % 2 ? '#7a5c3c' : '#6b4e32')} position={[k * k * 0.03, 0.47 + k * 0.9, 0]} rotation={[0, 0, -k * 0.05]} castShadow />
    ))}
    <group position={[0.5, 4.5, 0]}>
      {Array.from({length: 8}, (_, k) => (
        <mesh key={k} geometry={keep('frond', () => new ConeGeometry(0.28, 2.2, 4))} material={flat(k % 2 ? '#4f7a32' : '#5f8a3a', 0.8)} rotation={[0, (k / 8) * Math.PI * 2, 1.25 + 0.06 * Math.sin(t * 1.6 + k + i)]} position={[0, 0, 0]} castShadow>
        </mesh>
      ))}
    </group>
  </group>
);
const Truck: React.FC<{x: number; z: number; ry: number}> = ({x, z, ry}) => (
  <group position={[x, 0, z]} rotation={[0, ry, 0]}>
    <mesh geometry={boxG(3.4, 0.6, 1.6)} material={flat('#d8d2c4', 0.5, 0.2)} position={[0, 0.75, 0]} castShadow receiveShadow />
    <mesh geometry={boxG(1.4, 0.75, 1.5)} material={flat('#d8d2c4', 0.5, 0.2)} position={[0.85, 1.4, 0]} castShadow />
    <mesh geometry={boxG(0.05, 0.55, 1.3)} material={flat('#25313a', 0.2, 0.5)} position={[1.56, 1.42, 0]} />
    <mesh geometry={boxG(1.9, 0.4, 1.5)} material={flat('#c9c2b2', 0.6)} position={[-0.75, 1.2, 0]} />
    {[[-1.1, 0.8], [-1.1, -0.8], [1.1, 0.8], [1.1, -0.8]].map(([a, b], k) => (
      <mesh key={k} geometry={cylG(0.38, 0.38, 0.28, 10)} material={flat('#1e1c1a')} position={[a, 0.38, b]} rotation={[Math.PI / 2, 0, 0]} castShadow />
    ))}
  </group>
);
const Bush: React.FC<{x: number; z: number; s: number; i: number}> = ({x, z, s, i}) => (
  <mesh geometry={keep('bush', () => new IcosahedronGeometry(0.5, 0))} material={flat(i % 2 ? '#7d8a4a' : '#6b7a40', 0.9)} position={[x, 0.18 * s, z]} scale={[s, s * 0.6, s]} rotation={[0, i, 0]} castShadow />
);
const Barrel: React.FC<{x: number; z: number; c: string}> = ({x, z, c}) => (
  <mesh geometry={cylG(0.28, 0.28, 0.85, 10)} material={flat(c, 0.6, 0.3)} position={[x, 0.42, z]} castShadow receiveShadow />
);
/** A striped cloth canopy on four poles. */
const canopyTex = keep('canopyTex', () => canvasTex(64, 64, (g) => {
  for (let k = 0; k < 8; k++) {
    g.fillStyle = k % 2 ? '#d9c9a8' : '#8a3a2a';
    g.fillRect(k * 8, 0, 8, 64);
  }
}));
const Canopy: React.FC<{x: number; z: number; t: number}> = ({x, z, t}) => (
  <group position={[x, 0, z]}>
    {[[-1.3, -1], [1.3, -1], [-1.3, 1], [1.3, 1]].map(([a, b], k) => (
      <mesh key={k} geometry={cylG(0.04, 0.04, 2.3, 5)} material={flat('#5a3e26')} position={[a, 1.15, b]} castShadow />
    ))}
    <mesh geometry={keep('canopyG', () => new PlaneGeometry(2.8, 2.2, 4, 4))} position={[0, 2.3 + 0.03 * Math.sin(t * 3), 0]} rotation={[-Math.PI / 2 + 0.06, 0, 0]} castShadow>
      <meshStandardMaterial map={canopyTex} side={2} roughness={0.9} flatShading />
    </mesh>
  </group>
);
const MOTES = Array.from({length: 46}, (_, i) => ({x: (rnd(i) - 0.5) * 14, y: 0.3 + rnd(i + 9) * 3.2, z: 2 - rnd(i + 4) * 10, s: 0.015 + rnd(i + 2) * 0.03, v: 0.2 + rnd(i + 6) * 0.4}));
/** Sunlit dust drifting through the air. */
const Dust: React.FC<{t: number; cx?: number}> = ({t, cx = 0}) => (
  <group>
    {MOTES.map((m, i) => (
      <mesh key={i} geometry={keep('mote', () => new IcosahedronGeometry(1, 0))} material={keep('moteM', () => new MeshBasicMaterial({color: '#fff2d0', transparent: true, opacity: 0.55}))} position={[cx + m.x + ((t * m.v) % 6) - 3, m.y + 0.15 * Math.sin(t * 0.8 + i), m.z]} scale={m.s} />
    ))}
  </group>
);

// ---------------------------------------------------------------- sets
const rock = keep('rock', () => new DodecahedronGeometry(1, 0));
const tentG = keep('tent', () => new ConeGeometry(1.6, 2.2, 4));
const Camp: React.FC<{t: number}> = ({t}) => (
  <group>
    <mesh geometry={planeG} material={flat('#c8a878', 0.95)} rotation={[-Math.PI / 2, 0, 0]} scale={[80, 80, 1]} receiveShadow />
    {/* rocky mountains */}
    {Array.from({length: 9}, (_, i) => (
      <mesh key={i} geometry={rock} material={flat(i % 2 ? '#9a7f62' : '#8b7258', 0.95)} position={[-22 + i * 5.5, 2 + rnd(i) * 3, -18 - rnd(i + 3) * 8]} scale={[5 + rnd(i) * 3, 6 + rnd(i + 2) * 6, 4]} rotation={[rnd(i), rnd(i + 1) * 3, 0]} castShadow receiveShadow />
    ))}
    {[[-5.2, -5.5], [4.6, -6.2], [-1.5, -8]].map(([x, z], i) => (
      <mesh key={'t' + i} geometry={tentG} material={flat(['#7a6248', '#8c7252', '#6e5a44'][i], 0.9)} position={[x, 1.1, z]} rotation={[0, Math.PI / 4 + i * 0.2, 0]} castShadow receiveShadow />
    ))}
    {/* campfire */}
    <group position={[0.6, 0, -3.4]}>
      {[0, 1, 2].map((k) => (
        <mesh key={k} geometry={cylG(0.07, 0.07, 1.0, 6)} material={flat('#4a3222')} rotation={[Math.PI / 2, (k * Math.PI) / 3, 0]} position={[0, 0.08, 0]} />
      ))}
      {[0, 1, 2].map((k) => (
        <mesh key={'f' + k} geometry={keep('flame', () => new ConeGeometry(0.22, 0.7, 5))} material={glowM(k ? '#ff9a2a' : '#ffd25a', 2.5)} position={[(k - 1) * 0.12, 0.38 + 0.05 * Math.sin(t * 20 + k), 0]} scale={[1, 0.8 + 0.25 * Math.sin(t * 17 + k * 2), 1]} />
      ))}
      <pointLight position={[0, 0.8, 0]} intensity={4 + Math.sin(t * 23)} distance={6} color="#ffb060" />
    </group>
    {/* scattered rocks and crates */}
    {Array.from({length: 7}, (_, i) => (
      <mesh key={'r' + i} geometry={rock} material={flat('#a08868')} position={[-6 + i * 2.1, 0.2, 2 - rnd(i) * 6]} scale={0.25 + rnd(i + 5) * 0.35} castShadow />
    ))}
    <mesh geometry={boxG(0.8, 0.6, 0.6)} material={flat('#8a6a44')} position={[-3.2, 0.3, -2.4]} castShadow />
    {/* far haze ridge */}
    {Array.from({length: 7}, (_, i) => (
      <mesh key={'far' + i} geometry={rock} material={flat('#c9a98a', 1)} position={[-34 + i * 11, 4, -40 - rnd(i + 11) * 6]} scale={[10, 9 + rnd(i + 1) * 7, 5]} rotation={[0, rnd(i) * 3, 0]} />
    ))}
    {/* village */}
    <House x={-8.5} z={-9} w={4} h={2.6} d={3} ry={0.15} c={0} />
    <House x={-3.8} z={-12} w={3.2} h={3.1} d={3} ry={-0.05} c={1} />
    <House x={7.5} z={-10} w={4.4} h={2.5} d={3.2} ry={-0.2} c={2} />
    <House x={12.5} z={-6} w={3.2} h={2.8} d={3} ry={-0.5} c={3} />
    <House x={-14} z={-5} w={3.6} h={2.6} d={3} ry={0.5} c={1} />
    <mesh geometry={boxG(9, 1.2, 0.35)} material={flat('#b08c62', 0.95)} position={[1.5, 0.6, -13.5]} castShadow receiveShadow />
    <Palm x={-6.2} z={-7.2} s={1.05} t={t} i={0} />
    <Palm x={3.2} z={-11} s={1.2} t={t} i={1} />
    <Palm x={9.6} z={-7.6} s={0.95} t={t} i={2} />
    <Palm x={-11.5} z={-11} s={1.15} t={t} i={3} />
    <Truck x={-7.5} z={-2.8} ry={0.5} />
    <Canopy x={5.8} z={-4.2} t={t} />
    <Barrel x={4.6} z={-2.9} c="#3f5a6a" />
    <Barrel x={5.2} z={-2.6} c="#7a3a2a" />
    <Barrel x={-4.4} z={-1.2} c="#5a6a3a" />
    {Array.from({length: 12}, (_, i) => (
      <Bush key={'b' + i} x={-12 + i * 2.2 + rnd(i) * 1.2} z={-4 - rnd(i + 3) * 6} s={0.6 + rnd(i + 8) * 0.7} i={i} />
    ))}
    <Dust t={t} />
  </group>
);

const rugTex = (k: number) =>
  keep('rug' + k, () =>
    canvasTex(64, 128, (g) => {
      g.fillStyle = ['#9c2b2b', '#a8452a', '#7a2440'][k % 3];
      g.fillRect(0, 0, 64, 128);
      g.strokeStyle = '#e8c36a';
      g.lineWidth = 4;
      g.strokeRect(6, 6, 52, 116);
      g.fillStyle = '#e8c36a';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.moveTo(32, 20 + i * 28);
        g.lineTo(44, 32 + i * 28);
        g.lineTo(32, 44 + i * 28);
        g.lineTo(20, 32 + i * 28);
        g.fill();
      }
    }),
  );
const DOTS = Array.from({length: 40}, (_, i) => ({a: rnd(i) * Math.PI * 2, e: (rnd(i + 7) - 0.3) * 1.2, c: ['#ff5fa8', '#5fd0ff', '#ffe25a', '#b46bff', '#ffffff'][i % 5]}));
const Cave: React.FC<{t: number}> = ({t}) => (
  <group>
    <mesh geometry={keep('caveShell', () => new DodecahedronGeometry(9, 1))} material={keep('caveMat', () => new MeshStandardMaterial({color: '#5a4a3e', roughness: 0.95, flatShading: true, side: BackSide}))} position={[0, 3, -2]} scale={[1, 0.55, 1.2]} />
    <mesh geometry={planeG} material={flat('#6e5c4a', 0.95)} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} receiveShadow />
    {/* the rug runway */}
    {[0, 1, 2, 3, 4].map((k) => (
      <mesh key={k} geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 2 - k * 1.9]} scale={[1.3, 1.85, 1]} receiveShadow>
        <meshStandardMaterial map={rugTex(k)} roughness={0.9} />
      </mesh>
    ))}
    {/* disco ball + its moving light spots on the cave walls */}
    <group position={[0, 4.2, -2.5]} rotation={[0, t * 1.6, 0]}>
      <mesh geometry={keep('disco', () => new IcosahedronGeometry(0.55, 2))} material={keep('discoMat', () => new MeshStandardMaterial({color: '#e8eef6', metalness: 1, roughness: 0.12, flatShading: true}))} />
      <mesh geometry={cylG(0.01, 0.01, 2, 4)} material={flat('#888')} position={[0, 1.2, 0]} />
    </group>
    {DOTS.map((d, i) => {
      const a = d.a + t * 1.6;
      const r = 7.2;
      return <mesh key={i} geometry={keep('dot', () => new CircleGeometry(0.16, 8))} material={keep('dotm' + d.c, () => new MeshBasicMaterial({color: d.c}))} position={[Math.cos(a) * r, 3.2 + d.e * 2.6, -2.5 + Math.sin(a) * r * 1.1]} lookAt={undefined} rotation={[0, -a - Math.PI / 2, 0]} />;
    })}
    <pointLight position={[0, 4, -2.5]} intensity={10} distance={14} color="#ff7ac0" />
    <pointLight position={[Math.cos(t * 2) * 3, 3, -2.5 + Math.sin(t * 2) * 3]} intensity={8} distance={10} color="#6ad8ff" />
  </group>
);

// ---------------------------------------------------------------- shots
const Canvas3D: React.FC<{cam: Cam; sky: string; fog?: [number, number]; indoor?: boolean; children: React.ReactNode; alpha?: boolean}> = ({cam, sky, fog = [20, 90], indoor, children, alpha}) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={alpha ? {antialias: true, alpha: true, premultipliedAlpha: false} : {antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
    {alpha ? null : <color attach="background" args={[sky]} />}
    {alpha ? null : <fog attach="fog" args={[sky, fog[0], fog[1]]} />}
    <CameraRig cam={{...cam, far: 200}} />
    <Environment intensity={indoor ? 0.35 : 0.55} />
    <Daylight center={v3(0, 0, -1)} extent={10} offset={indoor ? [-3, 10, 6] : [-12, 10, 8]} color={indoor ? '#ffd6ee' : '#ffe2b8'} intensity={indoor ? 0.9 : 3.2} sky={indoor ? '#8a6aa0' : '#cfe0f2'} ground={indoor ? '#3a2a24' : '#d8bf94'} fill={indoor ? 0.6 : 1.0} />
    {indoor ? null : <directionalLight position={[9, 5, -12]} intensity={1.7} color="#ffb878" />}
    {children}
  </ThreeCanvas>
);
const shadowCatch = keep('shadowCatch', () => new ShadowMaterial({opacity: 0.28}));

/** Hook: runway night in the cave. */
const RUNWAY: BodySpec[] = [];
const ShotRunway: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GC_FPS;
  const walk = runAlong((tt) => ({x: 0.1 * Math.sin(tt * 4.2), z: lerp(-4.5, 0.6, tt / 1.5)}), t + 0.3, 0.32);
  const cam: Cam = {position: v3(0.6, 1.4, 4.6 - t * 0.3), target: v3(0, 1.4, -1.2), fov: 46};
  const clap = (i: number) => ({...idleSpec(frame + i * 9, 0.2), nearArm: [78 + 10 * Math.sin(t * 16 + i), 70] as [number, number], farArm: [74 - 10 * Math.sin(t * 16 + i), 74] as [number, number]});
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(2.5px)'}}>
        <Canvas3D cam={cam} sky="#1d1420" fog={[8, 30]} indoor>
          <Cave t={t} />
        </Canvas3D>
      </AbsoluteFill>
      <Canvas3D cam={cam} sky="#1d1420" indoor alpha>
        <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]} scale={[30, 30, 1]} receiveShadow material={shadowCatch} />
        <pointLight position={[0, 4, -2.5]} intensity={10} distance={14} color="#ff7ac0" />
        <Actor style={LEADER} x={walk.pos.x} z={walk.pos.z} yaw={-Math.PI / 2 + 0.1 * Math.sin(t * 4)} spec={{...walk.spec, lean: -4, headTilt: 6}} frame={frame} look={{...SMUG, mouth: 'grin'}} />
        {[
          [-1.8, -0.5],
          [1.9, -1.2],
          [-1.9, -2.6],
        ].map(([x, z], i) => (
          <Actor key={i} style={MEN[i].st} x={x} z={z} yaw={x < 0 ? 0.2 : Math.PI - 0.2} spec={clap(i)} frame={frame + i * 7} look={JOY} />
        ))}
      </Canvas3D>
    </AbsoluteFill>
  );
};

/** Day 1 in the camp. from: global time this shot starts at (the hook replays the I'M GAY moment). */
const ShotCamp: React.FC<{from?: number}> = ({from = T_CAMP}) => {
  const frame = useCurrentFrame();
  const t = frame / GC_FPS + from; // global time
  const spawn = clamp01((t - T_SPAWN) / 0.18);
  const shadesOff = t >= T_SHADES;
  const reach = t > T_SHADES - 0.25 && t < T_SHADES + 0.3 ? Math.sin(((t - (T_SHADES - 0.25)) / 0.55) * Math.PI) : 0;
  const deep = t > T_DEEP && t < T_DEEP + 3.5;
  const talk = deep || (t > T_LILAC && t < T_LILAC + 2.9) || (t > T_GAY && t < T_GAY + 4.1);
  const sway = Math.sin(t * 2.2);
  const arms = smooth(clamp01((t - T_ARMS) / 0.18));
  // tough-guy stance while faking the deep voice (feet wide, arms folded), then everything goes
  const tough: BodySpec = {...idleSpec(frame, 0.3), lean: -7, headTilt: -6, near: {thigh: 15, knee: 6}, far: {thigh: -15, knee: 6}, nearArm: [16, 24], farArm: [14, 26]};
  const sassy: BodySpec = {...idleSpec(frame, 0.3), lean: -3 + 4 * sway, headTilt: 8 + 8 * sway, near: {thigh: 8 + 6 * sway, knee: 14}, far: {thigh: -10, knee: 4}, nearArm: [lerp(34 + 8 * sway, 150, reach), lerp(70, 120, reach)], farArm: [-18, 100]};
  const walking = t < WALK1 + 0.15;
  const W0 = {x: -2.6, z: 0.9};
  const wp = smooth(clamp01((t - WALK0) / (WALK1 - WALK0)));
  const walk = runAlong((tt) => ({x: lerp(W0.x, 0, smooth(clamp01((tt - WALK0) / (WALK1 - WALK0)))), z: lerp(W0.z, 0, smooth(clamp01((tt - WALK0) / (WALK1 - WALK0))))}), t, 0.28);
  const step = Math.sin((t - WALK0) * Math.PI * 2.6);
  const strut = t > WALK0 && t < WALK1;
  const sashay: BodySpec = strut
    ? {...walk.spec, lean: -5, headTilt: 10 + 4 * step, nearArm: [34 + 5 * step, 70], farArm: [-34 + 28 * step, 30 + 20 * Math.abs(step)]}
    : {...idleSpec(frame, 0.3), lean: -4, headTilt: 10, nearArm: [34, 70], farArm: [-20, 50]};
  const wx = lerp(W0.x, 0, wp);
  const wz = lerp(W0.z, 0, wp);
  // turn from walking direction to face front once he arrives
  const faceK = smooth(clamp01((t - WALK1 + 0.2) / 0.4));
  const walkYaw = (strut || t <= WALK0 ? walk.yaw : walk.yaw) + 0.35 * step * (strut ? 1 : 0);
  let himSpec: BodySpec = walking ? sashay : t < T_LILAC - 0.4 ? tough : sassy;
  if (arms > 0) himSpec = armsUp({...sassy, lean: -6, headTilt: 14}, t, arms, 0.25);
  const recoil = smooth(clamp01((t - T_BC) / 0.2));
  const asking = t > T_FAV - 0.2 && t < T_FAV + 1.0;
  const look = (i: number): Look => {
    if (t < T_SPAWN) return {tired: 0.3, droop: 0, eyesClosed: false, brows: -0.3, mouth: 'flat', yaw: (rnd(i) - 0.5) * 40};
    if (recoil > 0) return {...STARE, brows: 1, browLift: 1, mouth: 'open', mouthOpen: 0.8, pupils: 0.55};
    if (i === 0 && asking) return {tired: 0.4, droop: 2, eyesClosed: false, brows: -1, browLift: -0.4, mouth: 'open', mouthOpen: 0.15 + 0.2 * Math.abs(Math.sin(t * 12)), noBlink: true};
    return {...STARE, brows: -0.6, browLift: -0.2, mouth: walking ? 'open' : 'flat', mouthOpen: 0.25, pupils: undefined, yaw: walking ? (wx - MEN[i].x) * -9 : 0};
  };
  const close = smooth(clamp01((t - T_DEEP) / 1.2));
  const wide = smooth(clamp01((t - (T_ARMS - 0.3)) / 0.4));
  const fol = t < WALK1 ? 1 - wp : 0;
  const base: Cam = {position: v3(lerp(0.4, 0.9, close) + wx * 1.0 * fol, lerp(1.5, 1.6, close), lerp(5.6, 3.4, close) + 0.6 * fol), target: v3(lerp(0.2, 0.0, close) + wx * 1.05 * fol, lerp(1.2, 1.5, close), lerp(-1.0, 0.2, close) + 0.9 * fol), fov: 44};
  const cam: Cam = {position: base.position.clone().lerp(v3(0.6, 1.9, 6.0), wide), target: base.target.clone().lerp(v3(0.1, 2.15, -0.6), wide), fov: 44};
  const shake = t > T_ARMS && t < T_ARMS + 0.35 ? 0.04 * Math.sin(t * 80) : 0;
  const camS = {...cam, position: cam.position.clone().add(v3(shake, shake, 0))};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(2.5px)'}}>
        <Canvas3D cam={camS} sky="#a9cbe6" fog={[25, 110]}>
          <Camp t={t} />
        </Canvas3D>
      </AbsoluteFill>
      <Canvas3D cam={camS} sky="#a9cbe6" alpha>
        <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[40, 40, 1]} receiveShadow material={shadowCatch} />
        {spawn > 0 ? (
          <group scale={[lerp(0.2, 1, spawn), lerp(0.2, 1, spawn), lerp(0.2, 1, spawn)]} position={[0, 0, 1.2]}>
            <Actor
              style={HIM(!shadesOff)}
              x={wx}
              z={wz}
              y={strut ? 0.03 * Math.abs(step) : 0}
              roll={strut ? 7 * step : 0}
              yaw={walking ? lerp(t < WALK0 ? -Math.PI / 2 : walkYaw, -Math.PI / 2, faceK) : -Math.PI / 2 + 0.25 * Math.sin(t * 0.9)}
              spec={himSpec}
              frame={frame}
              look={
                deep
                  ? {tired: 0, droop: 2, eyesClosed: false, brows: -0.7, browLift: -0.3, mouth: 'open', mouthOpen: 0.1 + 0.15 * Math.abs(Math.sin(t * 11)), noBlink: true}
                  : arms > 0
                    ? {...JOY, mouthOpen: 0.5 + 0.35 * Math.abs(Math.sin(t * 9)), eyesClosed: t > T_ARMS + 0.2 && t < T_ARMS + 1.2}
                    : {...SMUG, mouth: talk ? 'open' : 'smile', mouthOpen: talk ? 0.15 + 0.2 * Math.abs(Math.sin(t * 13)) : 0, yaw: t < T_DEEP ? 25 * Math.sin((t - T_SPAWN) * 2) : 0}
              }
            >
              {(pose) => (arms > 0.6 ? <Flag a={handLocal(pose, false)} b={handLocal(pose, true)} t={t} /> : null)}
            </Actor>
          </group>
        ) : null}
        {spawn > 0 && spawn < 1
          ? Array.from({length: 10}, (_, i) => (
              <mesh key={i} geometry={keep('spark', () => new IcosahedronGeometry(0.06, 0))} material={glowM(['#ff5fa8', '#ffe25a', '#5fd0ff'][i % 3], 2)} position={[-2.6 + Math.cos(i) * spawn * 1.2, 1 + Math.sin(i * 2) * spawn, 2.1 + Math.sin(i) * spawn * 0.6]} />
            ))
          : null}
        {/* glitter burst when he comes out */}
        {arms > 0 && t < T_ARMS + 1.6
          ? Array.from({length: 26}, (_, i) => {
              const k = t - T_ARMS;
              return <mesh key={'g' + i} geometry={keep('spark', () => new IcosahedronGeometry(0.06, 0))} material={glowM(['#ff5fa8', '#ffe25a', '#5fd0ff', '#b46bff', '#7dff8a'][i % 5], 2)} position={[(rnd(i) - 0.5) * 3.2 * k, 1.9 + 1.2 * k * rnd(i + 3) - 2.6 * k * k, 1.2 + (rnd(i + 7) - 0.5) * 2 * k]} />;
            })
          : null}
        {MEN.map((m, i) => {
          const step = i === 0 ? smooth(clamp01((t - (T_FAV - 0.6)) / 0.5)) * 0.5 : 0;
          const r = recoil * (0.4 + 0.15 * i);
          return (
            <Actor
              key={i}
              style={m.st}
              x={m.x * (1 + r * 0.3) + step * 0.6}
              z={m.z - r + step * 0.9}
              yaw={Math.atan2(-(1.2 - m.z), -m.x) + (t < T_SPAWN ? rnd(i) : 0)}
              spec={{...idleSpec(frame + i * 9, 0.2), lean: recoil > 0 ? -18 * recoil : t > T_SPAWN ? 6 : 2, headTilt: recoil > 0 ? -10 * recoil : i === 0 && asking ? -8 : 0, near: recoil > 0 ? {thigh: 10, knee: 20} : {thigh: 4, knee: 6}, far: recoil > 0 ? {thigh: -24 * recoil, knee: 14} : {thigh: -4, knee: 6}, nearArm: [26, 58], farArm: [48, 34]}}
              frame={frame + i * 9}
              look={look(i)}
            >
              {(pose) => (
                // held across the body at the hip, muzzle pointing down at the ground
                <group position={handLocal(pose, false).add(v3(0, 0, -0.15))} rotation={[0, 0, -0.55]}>
                  <Rifle />
                </group>
              )}
            </Actor>
          );
        })}
      </Canvas3D>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- Day 3
const TENT_SKY = '#120d14';
const tentShell = keep('tentShell', () => new ConeGeometry(3.4, 4.2, 6, 1, true));
const tentMat = keep('tentMat', () => new MeshStandardMaterial({color: '#6e5238', roughness: 0.95, flatShading: true, side: BackSide}));
const Candle: React.FC<{p: [number, number, number]; t: number; k: number}> = ({p, t, k}) => (
  <group position={p}>
    <mesh geometry={cylG(0.05, 0.05, 0.18, 7)} material={flat('#f4ead6')} position={[0, 0.09, 0]} />
    <mesh geometry={keep('flameS', () => new ConeGeometry(0.03, 0.09, 5))} material={glowM('#ffc85a', 3)} position={[0, 0.23, 0]} scale={[1, 0.85 + 0.2 * Math.sin(t * 19 + k), 1]} />
  </group>
);
/** Head-relative position for props on his face (head is 0.74 scale on realistic characters). */
const faceAt = (pose: Parameters<typeof handLocal>[0], up: number, fwd: number, side: number) => {
  const n = to3(pose.neck, 0);
  return v3(n.x + (0.02 + 0.15 * fwd) * 0.74, n.y + (0.2 + 0.15 * up) * 0.74, side * 0.15 * 0.74);
};
const SITTING: BodySpec = {lean: -2, headTilt: -6, near: {thigh: 84, knee: 86, foot: 0}, far: {thigh: 80, knee: 84, foot: 0}, nearArm: [36, 40], farArm: [30, 44]};
/** Night, inside a tent: face mask, cucumbers, candles. The leader opens the flap. */
const ShotTent: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GC_FPS + T_TENT;
  const open = smooth(clamp01((t - T_FLAP) / 0.35));
  const caught = t > T_FLAP + 0.3;
  const talk = t > T_SKIN && t < T_SKIN + 4.1;
  const hum = Math.sin(t * 3);
  const two = smooth(clamp01((t - T_FLAP - 0.1) / 0.6));
  const cam: Cam = {position: v3(lerp(0.1, 0.6, two), lerp(1.2, 1.35, two), lerp(3.0, 3.6, two)), target: v3(lerp(0.0, 0.55, two), lerp(1.25, 1.3, two), 0), fov: 46};
  return (
    <Canvas3D cam={cam} sky={TENT_SKY} fog={[6, 20]} indoor>
      <mesh geometry={tentShell} material={tentMat} position={[0, 2.1, 0]} />
      <mesh geometry={planeG} material={flat('#4a3626', 0.95)} rotation={[-Math.PI / 2, 0, 0]} scale={[10, 10, 1]} receiveShadow />
      <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.1]} scale={[1.4, 1.9, 1]} receiveShadow>
        <meshStandardMaterial map={rugTex(2)} roughness={0.9} />
      </mesh>
      <mesh geometry={boxG(0.55, 0.38, 0.55)} material={flat('#ff6ec7', 0.8)} position={[0, 0.19, 0]} castShadow />
      {[[-0.9, 0, 0.7], [0.85, 0, 0.6], [-0.6, 0, -0.9], [0.7, 0, -0.8]].map((p, k) => (
        <Candle key={k} p={p as [number, number, number]} t={t} k={k} />
      ))}
      <pointLight position={[0, 0.8, 0.8]} intensity={5 + 0.4 * Math.sin(t * 17)} distance={6} color="#ffb060" />
      {/* the flap: a slit of moonlight that opens, the leader with a lantern */}
      <mesh geometry={planeG} material={keep('moon', () => new MeshBasicMaterial({color: '#3a4a72'}))} position={[1.9, 1.0, -0.6]} rotation={[0, -Math.PI / 2 + 0.4, 0]} scale={[0.15 + 1.1 * open, 2.0, 1]} />
      {open > 0.05 ? (
        <Actor style={LEADER} x={lerp(2.4, 1.25, open)} z={-0.2} yaw={Math.PI + 0.25} spec={{...idleSpec(frame, 0.2), lean: caught ? -6 : 0, nearArm: [70, 40], farArm: [26, 58]}} frame={frame} look={caught ? {...STARE, brows: 1, browLift: 1, mouth: 'open', mouthOpen: 0.55, pupils: 0.55} : STARE}>
          {(pose) => (
            <group position={handLocal(pose, false)}>
              <mesh geometry={keep('lantern', () => new IcosahedronGeometry(0.08, 0))} material={glowM('#ffd27a', 2.5)} position={[0, -0.1, 0]} />
              <pointLight position={[0, -0.1, 0]} intensity={4} distance={4} color="#ffcf7a" />
            </group>
          )}
        </Actor>
      ) : null}
      <Actor
        style={HIM(false, true)}
        x={0.02}
        z={0.0}
        yaw={-Math.PI / 2}
        spec={{...SITTING, headTilt: -6 + 4 * hum * (caught ? 0 : 1), nearArm: caught ? [90, 30] : [36, 40], farArm: caught ? [86, 34] : [30, 44]}}
        frame={frame}
        look={{tired: 0, droop: 0, eyesClosed: !caught, brows: caught ? 1 : 0.2, browLift: caught ? 1 : 0.2, mouth: caught ? 'open' : talk ? 'open' : 'smile', mouthOpen: caught ? 0.6 : talk ? 0.12 + 0.15 * Math.abs(Math.sin(t * 12)) : 0, noBlink: true, yaw: caught ? -40 : 0}}
      >
        {(pose) =>
          caught ? null : (
            <group>
              {[-1, 1].map((sd) => (
                <mesh key={sd} geometry={cylG(0.03, 0.03, 0.012, 9)} material={flat('#7fbf5a', 0.6)} position={faceAt(pose, 0.15, 1.02, sd * 0.3)} rotation={[0, 0, Math.PI / 2]} />
              ))}
            </group>
          )
        }
      </Actor>
    </Canvas3D>
  );
};

/** The chase across the camp. */
const CRATE = {x: 0.6, z: 1.5};
const chasePath = (tt: number) => ({x: -4.5 + tt * 2.6, z: 1.6 - 0.25 * tt});
const ShotChase: React.FC = () => {
  const frame = useCurrentFrame();
  const tc = frame / GC_FPS; // seconds into the chase
  const t = tc + T_CHASE;
  const me = runAlong(chasePath, tc + 0.4, 0.95);
  const hop = Math.max(0, Math.sin(clamp01((me.pos.x - (CRATE.x - 0.8)) / 1.6) * Math.PI));
  const cam: Cam = {position: v3(me.pos.x - 0.5, 2.6, 8.6), target: v3(me.pos.x - 0.6, 0.9, 0.6), fov: 50};
  const TRIP = 3.1;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(2.5px)'}}>
        <Canvas3D cam={cam} sky="#a9cbe6" fog={[25, 110]}>
          <Camp t={t} />
        </Canvas3D>
      </AbsoluteFill>
      <Canvas3D cam={cam} sky="#a9cbe6" alpha>
        <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[60, 40, 1]} receiveShadow material={shadowCatch} />
        <mesh geometry={boxG(0.7, 0.55, 0.6)} material={flat('#8a6a44')} position={[CRATE.x, 0.28, CRATE.z]} castShadow />
        <Actor style={HIM(true, true)} x={me.pos.x} z={me.pos.z} y={hop * 0.75} yaw={me.yaw} spec={hop > 0.1 ? {...me.spec, near: {thigh: 70, knee: 90}, far: {thigh: -30, knee: 70}} : me.spec} frame={frame} look={{...STARE, mouth: 'open', mouthOpen: tc > 0.6 && tc < 2.2 ? 0.7 : 0.35}} />
        {MEN.map((m, i) => {
          const lag = 0.9 + i * 0.38;
          const tripped = i === 1 && tc > TRIP;
          const r = runAlong((tt) => {
            const p = chasePath(tt - lag);
            return {x: p.x, z: p.z + (i % 2 ? 0.7 : -0.6)};
          }, tripped ? TRIP + 0.4 : tc + 0.4, 0.9);
          const fall = tripped ? smooth(clamp01((tc - TRIP) / 0.3)) : 0;
          // the one behind him runs into him and goes down too
          const bump = i === 3 && tc > TRIP + 0.25 ? smooth(clamp01((tc - TRIP - 0.25) / 0.3)) : 0;
          const stopped = i === 3 && tc > TRIP + 0.25;
          const rr = stopped ? runAlong((tt) => {
            const p = chasePath(tt - lag);
            return {x: p.x, z: p.z + 0.7};
          }, TRIP + 0.65, 0.9) : r;
          return (
            <Actor
              key={i}
              style={m.st}
              x={rr.pos.x + fall * 0.6}
              z={rr.pos.z}
              y={fall * 0.12}
              yaw={rr.yaw}
              pitch={-85 * fall + 80 * bump}
              spec={fall > 0 || bump > 0 ? {...idleSpec(frame, 0.1), nearArm: [150, 20], farArm: [140, 20]} : {...rr.spec, nearArm: [26, 58], farArm: [48, 34]}}
              frame={frame + i * 7}
              look={{...STARE, brows: -1, browLift: -0.4, mouth: 'open', mouthOpen: 0.6, pupils: undefined}}
            >
              {(pose) =>
                fall > 0 || bump > 0 ? null : (
                  <group position={handLocal(pose, false).add(v3(0, 0, -0.15))} rotation={[0, 0, -1.25]}>
                    <Rifle />
                  </group>
                )
              }
            </Actor>
          );
        })}
        {tc > TRIP && tc < TRIP + 1.2
          ? Array.from({length: 8}, (_, i) => {
              const k = tc - TRIP;
              const base = chasePath(TRIP + 0.4 - 0.9 - 0.38);
              return <mesh key={i} geometry={rock} material={flat('#c8a878')} position={[base.x + 0.6 + (rnd(i) - 0.5) * 2 * k, 0.1 + Math.sin(Math.min(1, k) * Math.PI) * 0.5 * rnd(i + 2), base.z + (rnd(i + 5) - 0.5) * k]} scale={0.06 + 0.05 * rnd(i)} />;
            })
          : null}
      </Canvas3D>
    </AbsoluteFill>
  );
};

/** Motorbike getaway into the sunset. */
const Bike: React.FC = () => (
  <group>
    {[-0.55, 0.55].map((x) => (
      <mesh key={x} geometry={cylG(0.3, 0.3, 0.12, 10)} material={flat('#1d1d20')} position={[x, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
    ))}
    <mesh geometry={boxG(0.95, 0.22, 0.22)} material={flat('#8a2a2a', 0.5)} position={[0, 0.58, 0]} castShadow />
    <mesh geometry={boxG(0.45, 0.12, 0.26)} material={flat('#2a2a2a')} position={[-0.15, 0.74, 0]} />
    <mesh geometry={cylG(0.02, 0.02, 0.55, 6)} material={flat('#888', 0.4, 0.6)} position={[0.5, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} />
  </group>
);
const RIDE: BodySpec = {lean: 14, headTilt: -4, near: {thigh: 70, knee: 80, foot: 0}, far: {thigh: 66, knee: 78, foot: 0}, nearArm: [80, 10], farArm: [76, 12]};
const ShotBike: React.FC = () => {
  const frame = useCurrentFrame();
  const tb = frame / GC_FPS;
  const t = tb + T_BIKE;
  const go = Math.max(0, tb - 1.2);
  const bx = 1.6 + go * go * 3.2;
  const bz = -1.6 - go * go * 0.8;
  const kiss = tb > 0.35 && tb < 1.15 ? Math.sin(((tb - 0.35) / 0.8) * Math.PI) : 0;
  const cam: Cam = {position: v3(0.6 + Math.min(go, 1.5) * 1.2, 1.6, 3.6), target: v3(2.0 + Math.min(go, 1.5) * 2.0, 1.0, -1.6), fov: 46};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(2.5px)'}}>
        <Canvas3D cam={cam} sky="#f0a874" fog={[18, 90]}>
          <Camp t={t} />
        </Canvas3D>
      </AbsoluteFill>
      <Canvas3D cam={cam} sky="#f0a874" alpha>
        <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[60, 40, 1]} receiveShadow material={shadowCatch} />
        <group position={[bx, 0, bz]} rotation={[0, 0.12, 0]}>
          <Bike />
        </group>
        <Actor style={HIM(true, true)} x={bx - 0.15} z={bz} y={0.32} yaw={kiss > 0 ? lerp(0.12, -Math.PI / 2 + 0.3, Math.min(1, kiss * 2)) : 0.12} spec={kiss > 0 ? {...RIDE, lean: 0, nearArm: [lerp(80, 140, kiss), lerp(10, 150 - 120 * Math.max(0, kiss - 0.6) / 0.4, kiss)]} : RIDE} frame={frame} look={{...JOY, mouth: kiss > 0 ? 'open' : 'smile', mouthOpen: 0.2}} />
        {go > 0
          ? Array.from({length: 10}, (_, i) => {
              const k = (go * 3 + i * 0.1) % 1;
              return <mesh key={i} geometry={rock} material={keep('dust' + Math.round(k * 10), () => new MeshStandardMaterial({color: '#d8bf94', transparent: true, opacity: 0.6 * (1 - Math.round(k * 10) / 10), flatShading: true}))} position={[bx - 0.6 - k * 1.5 + (rnd(i) - 0.5) * 0.4, 0.15 + k * 0.4, bz + 0.5 + k * 1.2]} scale={0.15 + k * 0.4} />;
            })
          : null}
      </Canvas3D>
    </AbsoluteFill>
  );
};

/** The leader, alone in the dust, quietly smoothing his beard. */
const ShotLeader: React.FC = () => {
  const frame = useCurrentFrame();
  const te = frame / GC_FPS;
  const t = te + T_END;
  const stroke = Math.sin(te * 5);
  const cam: Cam = {position: v3(0.9, 1.55, 1.9 - te * 0.08), target: v3(0, 1.45, 0), fov: 40};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(3px)'}}>
        <Canvas3D cam={cam} sky="#f0a874" fog={[18, 90]}>
          <Camp t={t} />
        </Canvas3D>
      </AbsoluteFill>
      <Canvas3D cam={cam} sky="#f0a874" alpha>
        <Actor style={{...LEADER, shades: false}} x={0} z={0} yaw={-Math.PI / 2 + 1.1} spec={{...idleSpec(frame, 0.2), headTilt: -6, nearArm: [33 + 4 * stroke, 130], farArm: [26, 58]}} frame={frame} look={{tired: 0.2, droop: 0, eyesClosed: false, brows: 0.4, browLift: 0.3, mouth: te > 0.4 && te < 1.6 ? 'open' : 'flat', mouthOpen: 0.12, noBlink: true, yaw: 25}}>
          {(pose) => (
            <group position={handLocal(pose, true).add(v3(0, 0, 0.15))} rotation={[0, 0, -0.55]}>
              <Rifle />
            </group>
          )}
        </Actor>
      </Canvas3D>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- overlays
const SERIF = 'Georgia, "DejaVu Serif", "Times New Roman", serif';
const SHADOW = '0 2px 8px rgba(0,0,0,.5)';
const Caption: React.FC<{parts: [string, boolean][]}> = ({parts}) => (
  <div style={{position: 'absolute', top: 400, left: 30, right: 30, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 58, color: '#fff', textShadow: SHADOW, lineHeight: 1.15}}>
    {parts.map(([s, hl], i) => (
      <span key={i} style={hl ? {color: '#ffd23a', fontWeight: 700} : undefined}>
        {s}
      </span>
    ))}
  </div>
);
const Counter: React.FC<{n: number; day: string}> = ({n, day}) => (
  <div style={{position: 'absolute', top: 150, left: 40, fontFamily: FONT, color: '#fff', textShadow: SHADOW}}>
    <div style={{fontWeight: 700, fontSize: 30, letterSpacing: 1.5}}>TIMES NEARLY CAUGHT</div>
    <div style={{fontWeight: 800, fontSize: 110, lineHeight: 1}}>{n}</div>
    <div style={{display: 'inline-block', marginTop: 10, background: '#ffd23a', color: '#1b1b1b', fontWeight: 800, fontSize: 30, padding: '6px 18px', borderRadius: 30}}>{day}</div>
  </div>
);


/** Cinematic grade over the 3D: warm low end, cool sky, soft bloom, vignette and fine grain. */
const Grade: React.FC<{frame: number}> = ({frame}) => (
  <>
    <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(70,140,190,0.22) 0%, rgba(0,0,0,0) 40%, rgba(255,150,60,0.20) 100%)', mixBlendMode: 'soft-light'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 30% 25%, rgba(255,226,170,0.20) 0%, rgba(255,226,170,0) 55%)', mixBlendMode: 'screen'}} />
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 48%, rgba(0,0,0,0) 55%, rgba(10,4,0,0.42) 100%)'}} />
    <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay'}}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 24} />
      </filter>
      <rect width="100%" height="100%" filter="url(#grain)" />
    </svg>
  </>
);

export const GayCampExample: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GC_FPS;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <AbsoluteFill style={{filter: 'contrast(1.12) saturate(1.2)'}}>
      <Sequence from={0} durationInFrames={F(T_DAY1)}>
        <ShotCamp from={HOOK_AT} />
      </Sequence>
      <Sequence from={F(T_CAMP)} durationInFrames={F(T_D3) - F(T_CAMP)}>
        <ShotCamp />
      </Sequence>
      <Sequence from={F(T_TENT)} durationInFrames={F(T_CHASE) - F(T_TENT)}>
        <ShotTent />
      </Sequence>
      <Sequence from={F(T_CHASE)} durationInFrames={F(T_BIKE) - F(T_CHASE)}>
        <ShotChase />
      </Sequence>
      <Sequence from={F(T_BIKE)} durationInFrames={F(T_END) - F(T_BIKE)}>
        <ShotBike />
      </Sequence>
      <Sequence from={F(T_END)}>
        <ShotLeader />
      </Sequence>
      </AbsoluteFill>
      {(t >= T_DAY1 && t < T_CAMP) || (t >= T_D3 && t < T_TENT) ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontStyle: 'italic', color: '#fff', fontSize: 90}}>{t < T_CAMP ? 'Day 1' : 'Day 3'}</AbsoluteFill>
      ) : null}
      <Grade frame={frame} />
      {t < T_DAY1 ? (
        <>
          <Counter n={1} day="DAY 1" />
          <Caption parts={[['What if a really ', false], ['gay', true], [' guy spawned in the Taliban?', false]]} />
        </>
      ) : t >= T_CAMP && t < T_D3 ? (
        <>
          <Counter n={t >= T_BC ? 1 : 0} day="DAY 1" />
          <Caption parts={t < T_ARMS ? [['Day 1. ', false], ['Act straight.', true]] : [['Lasted ', false], ['14 seconds.', true]]} />
        </>
      ) : t >= T_TENT ? (
        <>
          <Counter n={t >= T_FLAP + 0.3 ? 2 : 1} day="DAY 3" />
          <Caption parts={t < T_CHASE ? [['Day 3. ', false], ['Stay hidden.', true]] : t < T_END ? [['Day 3. ', false], ['Run.', true]] : [["Who's ", false], ['next?', true]]} />
        </>
      ) : null}
      <Audio src={staticFile('gaycamp/music.wav')} volume={0.6} />
      {/* sound: hook */}
      <Sequence from={0} durationInFrames={F(T_DAY1)}>
        <Audio src={staticFile('gaycamp/gay-camp.mp3')} startFrom={F(HOOK_AT - T_GAY)} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_DAY1 - 0.15)}>
        <Audio src={staticFile('gaycamp/scratch.wav')} volume={0.5} />
      </Sequence>
      {/* Day 1 */}
      <Sequence from={F(T_DAY1)}>
        <Audio src={staticFile('gaycamp/wind.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={F(T_DAY1 + 6)}>
        <Audio src={staticFile('gaycamp/wind.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={F(T_SPAWN)}>
        <Audio src={staticFile('gaycamp/pop.wav')} volume={0.8} />
      </Sequence>
      {Array.from({length: 6}, (_, k) => (
        <Sequence key={'h' + k} from={F(WALK0 + 0.12 + k * (1 / 2.6))}>
          <Audio src={staticFile('gaycamp/heel.wav')} volume={0.7} />
        </Sequence>
      ))}
      <Sequence from={F(WALK0)}>
        <Audio src={staticFile('gaycamp/strut.wav')} volume={0.55} />
      </Sequence>
      <Sequence from={F(T_DEEP)}>
        <Audio src={staticFile('gaycamp/normal-deep.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_FAV)}>
        <Audio src={staticFile('gaycamp/fav-colour.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_LILAC)}>
        <Audio src={staticFile('gaycamp/lilac-camp.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_GAY)}>
        <Audio src={staticFile('gaycamp/gay-camp.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_ARMS)}>
        <Audio src={staticFile('ep4/twinkle.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={F(T_BC)}>
        <Audio src={staticFile('gaycamp/bc1.mp3')} volume={1.15} />
      </Sequence>
      {/* Day 3 */}
      <Sequence from={F(T_TENT)} durationInFrames={F(T_FLAP) - F(T_TENT)}>
        <Audio src={staticFile('gaycamp/spa.wav')} volume={0.5} loop />
      </Sequence>
      <Sequence from={F(T_SKIN)}>
        <Audio src={staticFile('gaycamp/skin-camp.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_FLAP)}>
        <Audio src={staticFile('gaycamp/flap.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={F(T_FLAP + 0.5)}>
        <Audio src={staticFile('gaycamp/bc2.mp3')} volume={1.15} />
      </Sequence>
      <Sequence from={F(T_CHASE)} durationInFrames={F(T_BIKE) - F(T_CHASE)}>
        <Audio src={staticFile('gaycamp/run.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={F(T_CHASE + 0.05)}>
        <Audio src={staticFile('gaycamp/get-him.mp3')} volume={1.2} />
      </Sequence>
      <Sequence from={F(T_CHASE + 0.7)}>
        <Audio src={staticFile('gaycamp/hair-camp.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_CHASE + 3.1)}>
        <Audio src={staticFile('gaycamp/crash.wav')} volume={0.9} />
      </Sequence>
      <Sequence from={F(T_CHASE + 3.2)}>
        <Audio src={staticFile('gaycamp/bc1.mp3')} volume={1.1} />
      </Sequence>
      <Sequence from={F(T_BIKE)}>
        <Audio src={staticFile('gaycamp/bike.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={F(T_BIKE + 0.35)}>
        <Audio src={staticFile('gaycamp/bye-camp.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(T_BIKE + 0.75)}>
        <Audio src={staticFile('gaycamp/kiss.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={F(T_END)}>
        <Audio src={staticFile('gaycamp/wind.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={F(T_END + 0.4)}>
        <Audio src={staticFile('gaycamp/leader-bc.mp3')} volume={1.2} />
      </Sequence>
      <Sequence from={F(T_BC + 0.45)}>
        <Audio src={staticFile('gaycamp/bc2.mp3')} volume={1.05} />
      </Sequence>
    </AbsoluteFill>
  );
};
