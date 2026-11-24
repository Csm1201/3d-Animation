/**
 * Example for "What if a really gay guy spawned in the Taliban?" (script: docs/scripts/what-if-gay-guy-spawned-in-taliban-script.md)
 * Low-poly reel style. He's the hero; the Taliban are the joke. No religion, no weapons, no violence.
 *
 *   0.0  HOOK: Day 7 runway night in the cave: disco ball, the bearded leader struts the rug runway, the others clap
 *   1.5  DAY 1
 *   1.9  a dusty mountain camp; pop: he spawns (in their robe and black turban, plus shades); four bearded men freeze: "BOMBOCLAAT!"
 *   3.85 he takes his shades off: "Oh. My. GOD. Okay... who did your styling, honey? Because we NEED to talk."
 *  10.75 two of them look at each other; one strokes his beard: "Bomboclaat..."
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BackSide, BoxGeometry, CircleGeometry, ConeGeometry, CylinderGeometry, DodecahedronGeometry, IcosahedronGeometry, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, ShadowMaterial, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {canvasTex} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, runAlong} from './Episode2';
import {FONT} from './Overlays';
import {HEIGHT, WIDTH} from '../../core/constants';

export const GC_FPS = 30;
const F = (s: number) => Math.round(s * GC_FPS);
export const GC_FRAMES = F(12.4);
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
const T_SHADES = 3.85;
const T_LINE = 4.0;
const LINE_LEN = 6.65;
const T_LOOK = 10.75;

// ---------------------------------------------------------------- cast
const HIM = (shades: boolean): Style => ({
  lowPoly: true,
  realistic: true,
  outfit: 'kit',
  skin: '#e6b48e',
  hair: '#3a2a22',
  hairStyle: 'swept',
  kit: {shirt: '#8a7a62', shorts: '#5d5244', socks: '#3a3228', trim: '#8a7a62', longSleeves: true, trousers: true},
  hat: {kind: 'turban', color: '#1a1a1c', band: '#1a1a1c'},
  shades,
});
const fighter = (skin: string, robe: string): Style => ({lowPoly: true, realistic: true, outfit: 'kit', skin, hair: '#1b1412', hairStyle: 'short', beard: true, kit: {shirt: robe, shorts: '#5d5244', socks: '#3a3228', trim: robe, longSleeves: true, trousers: true}, hat: {kind: 'turban', color: '#1a1a1c', band: '#1a1a1c'}});
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
    <Daylight center={v3(0, 0, -1)} extent={10} offset={indoor ? [-3, 10, 6] : [-10, 16, 9]} color={indoor ? '#ffd6ee' : '#fff1d8'} intensity={indoor ? 0.9 : 2.8} sky={indoor ? '#8a6aa0' : '#d6e6f6'} ground={indoor ? '#3a2a24' : '#d8bf94'} fill={indoor ? 0.6 : 1.0} />
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

/** Day 1 in the camp. */
const ShotCamp: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GC_FPS + T_CAMP; // global time
  const spawn = clamp01((t - T_SPAWN) / 0.18);
  const shadesOff = t >= T_SHADES;
  const reach = t > T_SHADES - 0.25 && t < T_SHADES + 0.3 ? Math.sin(((t - (T_SHADES - 0.25)) / 0.55) * Math.PI) : 0;
  const talk = t > T_LINE && t < T_LINE + LINE_LEN;
  const sway = Math.sin(t * 2.2);
  const flick = talk ? Math.max(0, Math.sin((t - T_LINE) * 3.2)) : 0;
  const himSpec: BodySpec = {...idleSpec(frame, 0.3), lean: -2 + 3 * sway, headTilt: 4 + 6 * sway, nearArm: [lerp(14 + 50 * flick, 150, reach), lerp(18 + 90 * flick, 120, reach)], farArm: [-18, 100]};
  const look = (i: number): Look => {
    if (t < T_SPAWN) return {tired: 0.3, droop: 0, eyesClosed: false, brows: -0.3, mouth: 'flat', yaw: (rnd(i) - 0.5) * 40};
    if (t > T_LOOK && i < 2) return {...STARE, yaw: i === 0 ? 45 : -45};
    return STARE;
  };
  const stroke = t > T_LOOK + 0.3 ? Math.sin((t - T_LOOK - 0.3) * 9) : 0;
  const close = smooth(clamp01((t - T_LINE) / 1.2));
  const twoShot = t > T_LOOK;
  const cam: Cam = twoShot
    ? {position: v3(0.75, 1.95, 2.9), target: v3(0.0, 1.45, -1.4), fov: 44}
    : {position: v3(lerp(0.4, 0.9, close), lerp(1.5, 1.6, close), lerp(5.6, 3.4, close)), target: v3(lerp(0.2, 0.0, close), lerp(1.2, 1.5, close), lerp(-1.0, 0.2, close)), fov: 44};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'blur(2.5px)'}}>
        <Canvas3D cam={cam} sky="#a9cbe6" fog={[25, 110]}>
          <Camp t={t} />
        </Canvas3D>
      </AbsoluteFill>
      <Canvas3D cam={cam} sky="#a9cbe6" alpha>
        <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} scale={[40, 40, 1]} receiveShadow material={shadowCatch} />
        {spawn > 0 ? (
          <group scale={[lerp(0.2, 1, spawn), lerp(0.2, 1, spawn), lerp(0.2, 1, spawn)]} position={[0, 0, 1.2]}>
            <Actor style={HIM(!shadesOff)} x={0} z={0} yaw={-Math.PI / 2 + 0.25 * Math.sin(t * 0.9)} spec={himSpec} frame={frame} look={{...SMUG, mouth: talk ? 'open' : 'smile', mouthOpen: talk ? 0.15 + 0.2 * Math.abs(Math.sin(t * 13)) : 0, yaw: t < T_SHADES ? 25 * Math.sin((t - T_SPAWN) * 2) : 0}} />
          </group>
        ) : null}
        {spawn > 0 && spawn < 1
          ? Array.from({length: 10}, (_, i) => (
              <mesh key={i} geometry={keep('spark', () => new IcosahedronGeometry(0.06, 0))} material={glowM(['#ff5fa8', '#ffe25a', '#5fd0ff'][i % 3], 2)} position={[Math.cos(i) * spawn * 1.2, 1 + Math.sin(i * 2) * spawn, 1.2 + Math.sin(i) * spawn * 0.6]} />
            ))
          : null}
        {MEN.map((m, i) => (
          <Actor
            key={i}
            style={m.st}
            x={m.x}
            z={m.z}
            yaw={Math.atan2(-(1.2 - m.z), -m.x) + Math.PI / 2 - Math.PI / 2 + (t < T_SPAWN ? rnd(i) : 0)}
            spec={i === 1 && t > T_LOOK + 0.3 ? {...idleSpec(frame, 0.2), nearArm: [60 + 6 * stroke, 120]} : {...idleSpec(frame + i * 9, 0.2), lean: t > T_SPAWN ? -4 : 2}}
            frame={frame + i * 9}
            look={look(i)}
          />
        ))}
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
    <div style={{fontWeight: 700, fontSize: 30, letterSpacing: 1.5}}>TALIBAN MAKEOVERS</div>
    <div style={{fontWeight: 800, fontSize: 110, lineHeight: 1}}>{n}</div>
    <div style={{display: 'inline-block', marginTop: 10, background: '#ffd23a', color: '#1b1b1b', fontWeight: 800, fontSize: 30, padding: '6px 18px', borderRadius: 30}}>{day}</div>
  </div>
);

export const GayCampExample: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GC_FPS;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Sequence from={0} durationInFrames={F(T_DAY1)}>
        <ShotRunway />
      </Sequence>
      <Sequence from={F(T_CAMP)}>
        <ShotCamp />
      </Sequence>
      {t >= T_DAY1 && t < T_CAMP ? (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center', fontFamily: SERIF, fontStyle: 'italic', color: '#fff', fontSize: 90}}>Day 1</AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.25) 100%)'}} />
      {t < T_DAY1 ? (
        <>
          <Counter n={4} day="DAY 7" />
          <Caption parts={[['What if a really ', false], ['gay', true], [' guy spawned in the Taliban?', false]]} />
        </>
      ) : t >= T_CAMP ? (
        <>
          <Counter n={0} day="DAY 1" />
          <Caption parts={t < T_LOOK ? [['Day 1. ', false], ['Blend in.', true]] : [['He did ', false], ['not', true], [' blend in.', false]]} />
        </>
      ) : null}
      {/* sound */}
      <Sequence from={0} durationInFrames={F(T_DAY1)}>
        <Audio src={staticFile('gaycamp/disco.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={0} durationInFrames={F(T_DAY1)}>
        <Audio src={staticFile('gaycamp/cheer.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={F(T_DAY1 - 0.15)}>
        <Audio src={staticFile('gaycamp/scratch.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={F(T_DAY1)}>
        <Audio src={staticFile('gaycamp/wind.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={F(T_SPAWN)}>
        <Audio src={staticFile('gaycamp/pop.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={F(T_LINE)}>
        <Audio src={staticFile('gaycamp/him-styling2.mp3')} volume={1.25} />
      </Sequence>
      <Sequence from={F(T_SPAWN + 0.2)}>
        <Audio src={staticFile('gaycamp/bc1.mp3')} volume={1.15} />
      </Sequence>
      <Sequence from={F(T_SPAWN + 0.75)}>
        <Audio src={staticFile('gaycamp/bc2.mp3')} volume={1.0} />
      </Sequence>
      <Sequence from={F(T_LOOK + 0.1)}>
        <Audio src={staticFile('gaycamp/ooh.wav')} volume={0.4} />
      </Sequence>
      <Sequence from={F(T_LOOK + 0.25)}>
        <Audio src={staticFile('gaycamp/bc-quiet.mp3')} volume={1.1} />
      </Sequence>
    </AbsoluteFill>
  );
};
