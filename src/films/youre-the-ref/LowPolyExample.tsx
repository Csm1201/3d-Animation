/**
 * Style test: the low-poly "NPC reel" look (faceted flat-shaded people and props, bright sun, soft background blur,
 * italic serif captions with a yellow keyword, a counter top-left and a yellow time pill).
 *
 *   0.0  HOOK: an NPC in a floral shirt mid-air, upside down, coffee flying  ("WHAT THE HELL?!")
 *   1.4  9:14 AM: the same guy on a sunny sidewalk with his coffee: "Ahh... nice day for a coffee."
 *   4.3  Invincible slams down right behind him; the shockwave launches him (the hook)
 *   5.9  he lands face-down; the counter ticks 46 -> 47; Invincible stands in the crater, eyes red
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BoxGeometry, ConeGeometry, CylinderGeometry, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, ShadowMaterial, SphereGeometry, TorusGeometry, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {canvasTex} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, armsUp, runAlong} from './Episode2';
import {handLocal} from './Episode4';
import {FONT} from './Overlays';
import {HEIGHT, WIDTH} from '../../core/constants';

export const LP_FPS = 30;
const F = (s: number) => Math.round(s * LP_FPS);
export const LP_FRAMES = F(7.5);
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
const flat = (c: string, r = 0.85) => keep('fm' + c + r, () => new MeshStandardMaterial({color: c, roughness: r, flatShading: true}));

// ---------------------------------------------------------------- timeline (s)
const T_SETUP = 1.4;
const T_SLAM = 4.3;
const FLIGHT = 1.6; // seconds in the air
const T_LAND = T_SLAM + 0.05 + FLIGHT;
const HOOK_OFFSET = 0.3; // the hook shows the flight from this far in

// ---------------------------------------------------------------- cast (low-poly, realistic proportions)
const NPC: Style = {lowPoly: true, realistic: true, outfit: 'kit', skin: '#a8714f', hair: '#2b1d16', hairStyle: 'swept', kit: {shirt: '#1f8a8c', pattern: 'floral', shorts: '#c9a77a', socks: '#f0f0ea', trim: '#1f8a8c', trousers: true}};
const MARK: Style = {
  lowPoly: true,
  realistic: true,
  outfit: 'kit',
  skin: '#f0c09a',
  hair: '#1c1714',
  hairStyle: 'swept',
  kit: {shirt: '#f5c518', sleeve: '#1f4fb4', shorts: '#1f4fb4', socks: '#1f4fb4', trim: '#1f4fb4', gloves: '#1f4fb4', longSleeves: true, trousers: true},
  goggles: 'eyes',
  goggleFrame: '#1f4fb4',
  goggleGlow: '#ff2a1a',
};
const WALKERS: Style[] = [
  {lowPoly: true, realistic: true, outfit: 'kit', skin: '#f1c3a0', hair: '#c47a3a', hairStyle: 'short', kit: {shirt: '#c9b6e4', shorts: '#f2f2ee', socks: '#eee', trim: '#fff', trousers: true}, hat: {kind: 'cap', color: '#f29bb5', band: '#f29bb5'}},
  {lowPoly: true, realistic: true, outfit: 'kit', skin: '#6b4430', hair: '#141010', hairStyle: 'buzz', kit: {shirt: '#9be15d', shorts: '#2a2a2e', socks: '#eee', trim: '#9be15d'}},
];
const CALM: Look = {tired: 0.15, droop: 0, eyesClosed: false, brows: 0.1, mouth: 'smile', noBlink: false};
const SHOCK: Look = {tired: 0, droop: -6, eyesClosed: false, brows: 1, browLift: 1, mouth: 'open', mouthOpen: 0.9, noBlink: true, pupils: 0.6};
const COLD: Look = {tired: 0, droop: -2, eyesClosed: false, brows: -0.8, browLift: -0.3, mouth: 'flat', noBlink: true};
const COFFEE: BodySpec = {lean: 2, headTilt: 2, near: {thigh: 4, knee: 6}, far: {thigh: -4, knee: 6}, nearArm: [24, 62], farArm: [6, 14]};

// ---------------------------------------------------------------- low-poly set
const planeG = new PlaneGeometry(1, 1);
const boxG = (w: number, h: number, d: number) => keep(`b${w},${h},${d}`, () => new BoxGeometry(w, h, d));
const cylG = (r1: number, r2: number, h: number, n = 6) => keep(`c${r1},${r2},${h},${n}`, () => new CylinderGeometry(r1, r2, h, n));
const frondG = keep('frond', () => new ConeGeometry(0.28, 2.4, 4));
const ballLow = new SphereGeometry(1, 7, 5);
const windowsTex = (base: string) =>
  keep('w' + base, () => {
    const t = canvasTex(128, 256, (g) => {
      g.fillStyle = base;
      g.fillRect(0, 0, 128, 256);
      for (let r = 0; r < 10; r++)
        for (let c = 0; c < 4; c++) {
          g.fillStyle = '#5d7a92';
          g.fillRect(10 + c * 30, 12 + r * 25, 18, 15);
          g.fillStyle = '#f4efe6';
          g.fillRect(8 + c * 30, 27 + r * 25, 22, 3);
        }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
  });
const tileTex = () =>
  keep('tiles', () => {
    const t = canvasTex(128, 128, (g) => {
      g.fillStyle = '#e9e1d4';
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = '#cfc5b5';
      g.lineWidth = 2;
      for (let i = 0; i <= 4; i++) {
        g.beginPath();
        g.moveTo(i * 32, 0);
        g.lineTo(i * 32, 128);
        g.moveTo(0, i * 32);
        g.lineTo(128, i * 32);
        g.stroke();
      }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(30, 4);
    return t;
  });

const Palm: React.FC<{h?: number; lean?: number}> = ({h = 6.5, lean = 0.12}) => (
  <group rotation={[0, 0, lean]}>
    {[0, 1, 2, 3, 4].map((k) => (
      <mesh key={k} geometry={cylG(0.17 - k * 0.015, 0.2 - k * 0.015, h / 5 + 0.05, 6)} material={flat(k % 2 ? '#9a7b5a' : '#a8896a')} position={[k * k * 0.02, (k + 0.5) * (h / 5), 0]} castShadow />
    ))}
    <group position={[0.35, h, 0]}>
      {[0, 1, 2, 3, 4, 5, 6].map((k) => {
        const a = (k / 7) * Math.PI * 2;
        return (
          <mesh key={k} geometry={frondG} material={flat(k % 2 ? '#3f8a3a' : '#4fa244')} position={[Math.cos(a) * 1.0, -0.25, Math.sin(a) * 1.0]} rotation={[Math.sin(a) * 1.25, 0, -Math.cos(a) * 1.25]} scale={[1, 1, 0.25]} castShadow />
        );
      })}
    </group>
  </group>
);

const Convertible: React.FC<{color?: string}> = ({color = '#ff4f8b'}) => (
  <group>
    <mesh geometry={boxG(4.3, 0.7, 1.9)} material={flat(color, 0.35)} position={[0, 0.65, 0]} castShadow />
    <mesh geometry={boxG(1.4, 0.35, 1.7)} material={flat('#ffffff', 0.4)} position={[0.2, 1.15, 0]} />
    <mesh geometry={boxG(0.08, 0.4, 1.6)} material={flat('#9fd2e8', 0.1)} position={[-0.6, 1.2, 0]} rotation={[0, 0, -0.4]} />
    {[-1.35, 1.35].map((x) => [-0.95, 0.95].map((z) => <mesh key={`${x}${z}`} geometry={cylG(0.36, 0.36, 0.28, 8)} material={flat('#1d1d20')} position={[x, 0.36, z]} rotation={[Math.PI / 2, 0, 0]} />))}
  </group>
);

const Buildings: React.FC = () => (
  <group>
    {[
      {x: -9, w: 6, h: 9, c: '#f2d3ae'},
      {x: -3, w: 5, h: 12, c: '#e9c2c2'},
      {x: 2.5, w: 6, h: 8, c: '#cfe3d6'},
      {x: 8.5, w: 5, h: 11, c: '#f4e3b4'},
      {x: 14, w: 6, h: 9, c: '#d6d9ee'},
    ].map((b, i) => (
      <group key={i} position={[b.x, 0, -6]}>
        <mesh geometry={boxG(b.w, b.h, 4)} position={[0, b.h / 2, 0]} castShadow receiveShadow>
          <meshStandardMaterial map={windowsTex(b.c)} roughness={0.9} flatShading />
        </mesh>
        <mesh geometry={boxG(b.w * 0.8, 0.12, 1.2)} material={flat(['#e5462b', '#2f8fbf', '#f29bb5'][i % 3], 0.6)} position={[0, 2.8, 2.5]} rotation={[0.35, 0, 0]} castShadow />
      </group>
    ))}
  </group>
);

/** The sunny street, minus the characters (it sits in the blurred background layer). */
const StreetSet: React.FC = () => (
  <group>
    <mesh geometry={planeG} material={flat('#8d8f93', 0.95)} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 5]} scale={[80, 10, 1]} receiveShadow />
    <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, -1]} scale={[80, 8, 1]} receiveShadow>
      <meshStandardMaterial map={tileTex()} roughness={0.9} />
    </mesh>
    <mesh geometry={boxG(80, 0.14, 0.3)} material={flat('#d9d2c4')} position={[0, 0.07, 3.0]} receiveShadow />
    <Buildings />
    {[-8, -4.2, 5, 11].map((x, i) => (
      <group key={i} position={[x, 0, -3.4 + (i % 2) * 0.4]}>
        <Palm h={6 + (i % 2) * 1.2} lean={0.08 * (i % 2 ? -1 : 1)} />
      </group>
    ))}
    <group position={[6.5, 0, 5.2]}>
      <Convertible />
    </group>
    <group position={[-10, 0, 5.0]}>
      <Convertible color="#f4f4f0" />
    </group>
  </group>
);

// ---------------------------------------------------------------- the launch
/** Where the NPC is, t seconds after the shockwave hits him. */
const flight = (t: number) => {
  const p = clamp01(t / FLIGHT);
  return {x: lerp(0, -4.2, p), y: Math.sin(p * Math.PI) * 4.6 * (1 - p * 0.15), z: lerp(0, 1.6, p), spin: p * Math.PI * 2.3, p};
};
const FLAIL = (t: number): BodySpec => {
  const s = armsUp({lean: 0, headTilt: 10, near: {thigh: 40 + 30 * Math.sin(t * 14), knee: 60}, far: {thigh: -20 - 30 * Math.sin(t * 14), knee: 70}, nearArm: [0, 0], farArm: [0, 0]}, t, 1, 2.5);
  return {...s, nearArm: [120 + 40 * Math.sin(t * 16), 30], farArm: [140 - 40 * Math.sin(t * 15), 40]};
};
const FACEDOWN: BodySpec = {lean: 0, headTilt: -8, near: {thigh: 10, knee: 20, foot: 40}, far: {thigh: -12, knee: 30, foot: 40}, nearArm: [160, 20], farArm: [140, 30]};
/** Coffee beans and drips flying out of the cup. */
const Beans: React.FC<{t: number; at: Vector3}> = ({t, at}) =>
  t < 0 || t > 1.8 ? null : (
    <group>
      {Array.from({length: 22}, (_, i) => {
        const vx = (rnd(i) - 0.5) * 3;
        const vy = 2 + rnd(i + 3) * 3.5;
        const vz = (rnd(i + 7) - 0.5) * 2;
        const y = at.y + vy * t - 4.9 * t * t;
        if (y < 0.03) return null;
        return <mesh key={i} geometry={ballLow} material={flat(i % 4 ? '#7a4a28' : '#5b3218', 0.5)} position={[at.x + vx * t, y, at.z + vz * t]} scale={[0.06, 0.045, 0.045]} rotation={[i, t * 8, i * 2]} />;
      })}
    </group>
  );

const CUP_G = cylG(0.045, 0.035, 0.12, 7);

/** Everything with characters (the sharp foreground layer). shot: 'hook' looks up at him mid-air; 'street' is the waist-level shot. */
const Characters: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const ft = t - T_SLAM - 0.05; // flight time
  const airborne = ft >= 0 && ft < FLIGHT;
  const landed = ft >= FLIGHT;
  const fl = flight(ft);
  const markY = t < T_SLAM ? Math.max(0, (T_SLAM - t) * 40) : 0;
  const markIn = t > T_SLAM - 0.35;
  const sip = t > 2.6 && t < 3.3 ? Math.sin(((t - 2.6) / 0.7) * Math.PI) : 0;
  return (
    <group>
      {/* the NPC */}
      {!airborne && !landed ? (
        <Actor style={NPC} x={0} z={0} yaw={-0.55} spec={{...COFFEE, nearArm: [24 + 40 * sip, 62 + 70 * sip], headTilt: 2 - 10 * sip}} frame={frame} look={t > T_SLAM - 0.3 ? SHOCK : {...CALM, eyesClosed: sip > 0.5}}>
          {(pose) => <mesh geometry={CUP_G} material={flat('#f4efe6', 0.6)} position={handLocal(pose, false).add(v3(0.02, 0.07, 0))} />}
        </Actor>
      ) : airborne ? (
        <Actor style={NPC} x={fl.x} z={fl.z} y={fl.y + 0.2} yaw={-0.55} roll={(fl.spin * 180) / Math.PI} spec={FLAIL(ft)} frame={frame} look={SHOCK} shadow={false} />
      ) : (
        <Actor style={NPC} x={-4.2} z={1.6} y={0.18} yaw={-0.55 + Math.PI} pitch={-88} spec={FACEDOWN} frame={frame} look={{...SHOCK, eyesClosed: true}} shadow={false} />
      )}
      {airborne ? (
        <mesh geometry={CUP_G} material={flat('#f4efe6', 0.6)} position={[fl.x + 0.6 + ft * 0.8, fl.y + 1.4 - ft * ft * 1.5, fl.z]} rotation={[ft * 9, 0, ft * 7]} />
      ) : null}
      <Beans t={ft} at={v3(0.3, 1.3, 0)} />
      {/* Invincible slams down behind him */}
      {markIn ? (
        <Actor style={MARK} x={-1.3} z={-1.8} y={markY} yaw={lerp(0.2, -2.28, smooth(clamp01((t - T_SLAM - 0.5) / 0.5)))} spec={t < T_SLAM + 0.4 ? {lean: 28, headTilt: -8, near: {thigh: 70, knee: 110, foot: 0}, far: {thigh: -30, knee: 120, foot: 0}, nearArm: [-20, 20], farArm: [40, 30]} : {...idleSpec(frame, 0.2), lean: 4, headTilt: 10}} frame={frame} look={COLD} />
      ) : null}
      {/* passers-by on the far side of the sidewalk */}
      {WALKERS.map((st, i) => {
        const r = runAlong((tt) => ({x: (i ? 7 : -8) + (i ? -1 : 1) * tt * 1.0 + (tt > T_SLAM ? (i ? 1 : -1) * (tt - T_SLAM) * 4 : 0), z: -2.6 - i * 0.6}), t, t > T_SLAM ? 0.9 : 0.25);
        return <Actor key={i} style={st} x={r.pos.x} z={r.pos.z} yaw={r.yaw} spec={r.spec} frame={frame + i * 11} look={t > T_SLAM ? SHOCK : CALM} />;
      })}
    </group>
  );
};

const Crater: React.FC<{t: number}> = ({t}) => {
  const k = t - T_SLAM;
  if (k < 0) return null;
  return (
    <group position={[-1.3, 0.08, -1.8]}>
      <mesh geometry={cylG(1.4, 1.1, 0.04, 9)} material={flat('#6e6a63')} scale={[clamp01(k / 0.08), 1, clamp01(k / 0.08)]} />
      {Array.from({length: 9}, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const p = clamp01(k / 0.6);
        return <mesh key={i} geometry={boxG(0.35, 0.12, 0.3)} material={flat('#d9cfbf')} position={[Math.cos(a) * (1.2 + p * 1.5), 0.08 + Math.sin(p * Math.PI) * (0.6 + (i % 3) * 0.4), Math.sin(a) * (1.2 + p * 1.5)]} rotation={[i, p * 5, i]} />;
      })}
      {k < 0.5 ? <mesh geometry={keep('ring', () => new TorusGeometry(1, 0.05, 6, 24))} material={keep('ringMat', () => new MeshStandardMaterial({color: '#ffffff', transparent: true, opacity: 0.6, flatShading: true}))} rotation={[Math.PI / 2, 0, 0]} scale={[1 + k * 12, 1 + k * 12, 1]} /> : null}
    </group>
  );
};

const camFor = (t: number): Cam => {
  if (t < T_SETUP) {
    // hook: low, looking up at him spinning through the air
    const ft = t + HOOK_OFFSET;
    const fl = flight(ft);
    return {position: v3(fl.x + 2.8, 0.9, fl.z + 4.2), target: v3(fl.x, fl.y + 0.9, fl.z), fov: 46};
  }
  // waist-level, slightly low, like a phone at chest height; follows him once he's launched
  const ft = t - T_SLAM - 0.05;
  const fl = flight(Math.max(0, ft));
  const follow = smooth(clamp01((t - T_SLAM) / 0.6));
  const drift = Math.sin(t * 0.8) * 0.06;
  const air = {position: v3(lerp(1.8, fl.x + 2.4, follow) + drift, lerp(1.3, 1.6, follow), lerp(3.8, 5.6, follow)), target: v3(lerp(-0.4, fl.x, follow), lerp(1.15, fl.y + 0.8, follow * (ft < FLIGHT ? 1 : 0.4)), lerp(-0.6, fl.z, follow))};
  // after he lands: ease out to a two-shot (him face-down in front, Invincible standing in the crater behind)
  const two = smooth(clamp01((t - T_LAND - 0.1) / 0.6));
  return {position: air.position.clone().lerp(v3(-6.6, 2.0, 4.4), two), target: air.target.clone().lerp(v3(-2.0, 0.7, -1.0), two), fov: 44};
};

const Canvas3D: React.FC<{cam: Cam; children: React.ReactNode; alpha?: boolean}> = ({cam, children, alpha}) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={alpha ? {antialias: true, alpha: true, premultipliedAlpha: false} : {antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
    {alpha ? null : <color attach="background" args={['#9cc9ec']} />}
    {alpha ? null : <fog attach="fog" args={['#bcd9ee', 18, 70]} />}
    <CameraRig cam={{...cam, far: 200}} />
    <Environment intensity={0.5} />
    <Daylight center={v3(0, 0, 0)} extent={10} offset={[-8, 16, 10]} color="#fff6e8" intensity={2.6} sky="#cfe6ff" ground="#e9dcc8" fill={1.05} />
    {children}
  </ThreeCanvas>
);

// ---------------------------------------------------------------- overlays (the reel's text style)
const SERIF = 'Georgia, "DejaVu Serif", "Times New Roman", serif';
const SHADOW = '0 2px 8px rgba(0,0,0,.45)';
const Caption: React.FC<{parts: [string, boolean][]}> = ({parts}) => (
  <div style={{position: 'absolute', top: 400, left: 30, right: 30, textAlign: 'center', fontFamily: SERIF, fontStyle: 'italic', fontSize: 60, color: '#fff', textShadow: SHADOW, lineHeight: 1.15}}>
    {parts.map(([s, hl], i) => (
      <span key={i} style={hl ? {color: '#ffd23a', fontWeight: 700} : undefined}>
        {s}
      </span>
    ))}
  </div>
);
const Counter: React.FC<{n: number; bump: number}> = ({n, bump}) => (
  <div style={{position: 'absolute', top: 150, left: 40, fontFamily: FONT, color: '#fff', textShadow: SHADOW}}>
    <div style={{fontWeight: 700, fontSize: 30, letterSpacing: 1.5}}>PEOPLE LAUNCHED TODAY</div>
    <div style={{fontWeight: 800, fontSize: 110, lineHeight: 1, transform: `scale(${1 + 0.25 * bump})`, transformOrigin: 'left center'}}>{n}</div>
    <div style={{display: 'inline-block', marginTop: 10, background: '#ffd23a', color: '#1b1b1b', fontWeight: 800, fontSize: 30, padding: '6px 18px', borderRadius: 30}}>IT'S 9:14 AM</div>
  </div>
);

export const LowPolyExample: React.FC = () => {
  const frame = useCurrentFrame();
  const sceneT = frame / LP_FPS < T_SETUP ? frame / LP_FPS + T_SLAM + 0.05 + HOOK_OFFSET : frame / LP_FPS;
  const t = frame / LP_FPS;
  const cam = t < T_SETUP ? camFor(t) : camFor(t);
  const sceneFrame = Math.round(sceneT * LP_FPS);
  const landed = t >= T_LAND;
  const bump = landed ? Math.max(0, 1 - (t - T_LAND) / 0.25) : 0;
  const shake = t >= T_SLAM && t < T_SLAM + 0.3 ? 0.06 * Math.sin(t * 90) * (1 - (t - T_SLAM) / 0.3) : 0;
  const camS = {...cam, position: cam.position.clone().add(v3(shake, shake, 0))};
  return (
    <AbsoluteFill style={{backgroundColor: '#9cc9ec'}}>
      {/* background: the street, softly out of focus */}
      <AbsoluteFill style={{filter: 'blur(3px)'}}>
        <Canvas3D cam={camS}>
          <StreetSet />
          <Crater t={sceneT} />
        </Canvas3D>
      </AbsoluteFill>
      {/* foreground: the people, sharp, with their shadows caught on an invisible floor */}
      <Canvas3D cam={camS} alpha>
        <mesh geometry={planeG} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.07, 0]} scale={[60, 30, 1]} receiveShadow material={keep('shadowCatch', () => new ShadowMaterial({opacity: 0.28}))} />
        <Characters t={sceneT} frame={sceneFrame} />
      </Canvas3D>
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.22) 100%)'}} />
      <Counter n={landed || t < T_SETUP ? 47 : 46} bump={bump} />
      {t < T_SETUP ? (
        <Caption parts={[['What if ', false], ['Invincible', true], [' turned evil?', false]]} />
      ) : t < T_SLAM ? (
        <Caption parts={[["You're just an ", false], ['NPC', true], [' getting coffee...', false]]} />
      ) : (
        <Caption parts={[['...then he lands ', false], ['right behind you', true], ['.', false]]} />
      )}
      {/* sound */}
      <Audio src={staticFile('lowpoly/street.wav')} volume={0.5} />
      <Sequence from={0}>
        <Audio src={staticFile('lowpoly/npc-yell.mp3')} volume={1.2} />
      </Sequence>
      <Sequence from={F(T_SETUP + 0.25)}>
        <Audio src={staticFile('lowpoly/npc-coffee.mp3')} volume={1.15} />
      </Sequence>
      <Sequence from={F(T_SLAM - 0.85)}>
        <Audio src={staticFile('lowpoly/fall.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={F(T_SLAM)}>
        <Audio src={staticFile('lowpoly/boom.wav')} volume={0.9} />
      </Sequence>
      <Sequence from={F(T_SLAM + 0.05)}>
        <Audio src={staticFile('lowpoly/npc-yell.mp3')} volume={1.25} />
      </Sequence>
      <Sequence from={F(T_SLAM + 0.15)}>
        <Audio src={staticFile('lowpoly/splash.wav')} volume={0.6} />
      </Sequence>
      <Sequence from={F(T_LAND)}>
        <Audio src={staticFile('lowpoly/thud.wav')} volume={0.9} />
      </Sequence>
    </AbsoluteFill>
  );
};
