/**
 * One-off Short: "What if Invincible turned evil?" (script: docs/scripts/what-if-invincible-turned-evil-script.md, draft 6)
 * Real world, no other heroes: the police, then the army, and nothing works. Vehicles get wrecked; crews always get out.
 *
 *   0.0  HOOK: a fighter jet stopped dead on his palm, nose crumpling; the pilot ejects, chute pops  (WHAT IF INVINCIBLE TURNED EVIL?)
 *   1.5  1 HOUR EARLIER
 *   1.9  he slams into a downtown intersection, rips out a sign gantry, hurls it into an office lobby
 *   4.8  police ring him and fire; bullets flatten on his chest; he flicks an empty police car away
 *   7.0  a line of tanks fires; he walks out of the smoke, lifts the lead tank, bends the barrel, throws it into the next
 *  10.5  attack helicopters: through the rockets, rips one rotor off, slices the other's tail; both into the river, crews swim
 *  13.5  the jet again, from the side: the pilot's chute drifting past the burning skyline
 *  15.5  war room: every feed to static, the vault door pounded, torn off; "Who's in charge here?"
 *  19.0  he sits in the general's chair; WHO COULD STOP HIM? A or B
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BoxGeometry, CanvasTexture, ConeGeometry, CylinderGeometry, Material, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SphereGeometry, TorusGeometry, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {canvasTex} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, runAlong} from './Episode2';
import {Captions, CommentButton, Cue, FONT} from './Overlays';
import {HEIGHT, WIDTH} from '../../core/constants';

export const INV_FPS = 30;
const F = (s: number) => Math.round(s * INV_FPS);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const memo = new Map<string, unknown>();
const keep = <T,>(k: string, make: () => T): T => {
  if (!memo.has(k)) memo.set(k, make());
  return memo.get(k) as T;
};
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------------------------------------------------------------- timeline (s)
const T_EARLIER = 1.5;
const T_LAND = 1.9;
const T_POLICE = 4.8;
const T_TANKS = 7.0;
const T_HELI = 10.5;
const T_JET2 = 13.5;
const T_WAR = 15.5;
const T_END = 19.0;
export const INV_FRAMES = F(21.0);

// ---------------------------------------------------------------- cast
const MARK: Style = {
  outfit: 'kit',
  skin: '#f0c09a',
  hair: '#1c1714',
  hairStyle: 'swept',
  kit: {shirt: '#f5c518', sleeve: '#1f4fb4', shorts: '#1f4fb4', socks: '#1f4fb4', trim: '#1f4fb4', gloves: '#1f4fb4', longSleeves: true, trousers: true},
  goggles: 'eyes',
  goggleFrame: '#1f4fb4',
  goggleGlow: '#ff2a1a',
};
const COLD: Look = {tired: 0, droop: -2, eyesClosed: false, brows: -0.8, browLift: -0.3, mouth: 'flat', noBlink: true};
const uniform = (skin: string, hair: string, olive = '#4d5a3c'): Style => ({outfit: 'kit', skin, hair, hairStyle: 'short', kit: {shirt: olive, shorts: olive, socks: '#1b1b1d', trim: olive, longSleeves: true, trousers: true}});
const police = (skin: string, hair: string): Style => ({outfit: 'kit', skin, hair, hairStyle: 'short', kit: {shirt: '#1c2a4a', shorts: '#1c2a4a', socks: '#111', trim: '#c9b25a', longSleeves: true, trousers: true}, hat: {kind: 'cap', color: '#1c2a4a', band: '#1c2a4a'}});
const civvy = (i: number): Style => ({outfit: 'kit', skin: ['#f1c3a0', '#8d5a3c', '#e0ac85', '#4e3427'][i % 4], hair: ['#3a2a22', '#141010', '#c47a3a', '#1f1714'][i % 4], hairStyle: 'short', kit: {shirt: ['#d65b5b', '#5b8bd6', '#e6c35a', '#6bbf7a'][i % 4], shorts: '#3d4a66', socks: '#eee', trim: '#fff', trousers: true}});
const SCARED: Look = {tired: 0, droop: -6, eyesClosed: false, brows: 0.9, browLift: 0.8, mouth: 'open', mouthOpen: 0.5, noBlink: true, pupils: 0.7};

// poses
const HOVER = (t: number): BodySpec => ({lean: 4, headTilt: -2, near: {thigh: 14, knee: 22, foot: 10}, far: {thigh: -4, knee: 30, foot: 10}, nearArm: [12 + 3 * Math.sin(t * 2), 16], farArm: [10, 18]});
const PUNCH: BodySpec = {lean: 12, headTilt: -4, near: {thigh: 20, knee: 30, foot: 10}, far: {thigh: -14, knee: 24, foot: 10}, nearArm: [90, 2], farArm: [-30, 60]};
const LANDING: BodySpec = {lean: 30, headTilt: -10, near: {thigh: 70, knee: 110, foot: 0}, far: {thigh: -30, knee: 120, foot: 0}, nearArm: [-20, 20], farArm: [40, 30]};
const LIFT: BodySpec = {lean: -4, headTilt: -8, near: {thigh: 16, knee: 14}, far: {thigh: -12, knee: 14}, nearArm: [172, 8], farArm: [168, 10]};
const FLY: BodySpec = {lean: 0, headTilt: 20, near: {thigh: 0, knee: 6, foot: 20}, far: {thigh: -4, knee: 12, foot: 20}, nearArm: [176, 0], farArm: [20, 10]};
const SIT: BodySpec = {lean: -6, headTilt: 2, near: {thigh: 88, knee: 90, foot: 0}, far: {thigh: 84, knee: 86, foot: 0}, nearArm: [40, 60], farArm: [36, 64]};
const AIM: BodySpec = {lean: 8, headTilt: -2, near: {thigh: 70, knee: 110, foot: 0}, far: {thigh: -10, knee: 120, foot: 0}, nearArm: [88, 6], farArm: [86, 8]};

// ---------------------------------------------------------------- materials, shared geometry
const mat = (c: string, r = 0.8, m = 0) => keep('m' + c + r + m, () => new MeshStandardMaterial({color: c, roughness: r, metalness: m}));
const glow = (c: string, k = 2) => keep('g' + c + k, () => new MeshStandardMaterial({color: c, emissive: c, emissiveIntensity: k, roughness: 0.4}));
const fade = (c: string, o: number) => keep('f' + c + Math.round(o * 20), () => new MeshStandardMaterial({color: c, roughness: 1, transparent: true, opacity: Math.round(o * 20) / 20, depthWrite: false}));
const basic = (c: string, o = 1) => keep('b' + c + Math.round(o * 20), () => new MeshBasicMaterial({color: c, transparent: o < 1, opacity: Math.round(o * 20) / 20, depthWrite: o >= 1}));
const box = (w: number, h: number, d: number) => keep(`box${w},${h},${d}`, () => new BoxGeometry(w, h, d));
const cylG = (r1: number, r2: number, h: number, n = 16) => keep(`cyl${r1},${r2},${h},${n}`, () => new CylinderGeometry(r1, r2, h, n));
const ball = new SphereGeometry(1, 16, 12);
const plane = new PlaneGeometry(1, 1);
const ring = new TorusGeometry(1, 0.04, 8, 48);
const cone = new ConeGeometry(1, 1, 16);

const windowsTex = (seed: number, lit: boolean) =>
  keep('win' + seed + lit, () => {
    const t = canvasTex(128, 256, (g) => {
      g.fillStyle = ['#7d8794', '#8f8a80', '#6d7a86', '#a39a8c'][seed % 4];
      g.fillRect(0, 0, 128, 256);
      for (let r = 0; r < 16; r++)
        for (let c = 0; c < 6; c++) {
          const on = rnd(seed * 97 + r * 13 + c) > (lit ? 0.6 : 0.85);
          g.fillStyle = on ? (lit ? '#ffd58a' : '#cfe3f2') : '#2c3644';
          g.fillRect(6 + c * 20, 6 + r * 16, 14, 10);
        }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    return t;
  });
const roadTex = () =>
  keep('road', () => {
    const t = canvasTex(256, 256, (g) => {
      g.fillStyle = '#3a3c41';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#d9d3b8';
      for (let i = 0; i < 4; i++) g.fillRect(i * 64 + 4, 124, 36, 8);
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(10, 1);
    return t;
  });

// ---------------------------------------------------------------- world canvas
const World: React.FC<{cam: Cam; centre: Vector3; sky?: string; fog?: [number, number]; sun?: number; children: React.ReactNode; extent?: number}> = ({cam, centre, sky = '#b9c9d6', fog = [40, 180], sun = 2.2, children, extent = 14}) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
    <color attach="background" args={[sky]} />
    <fog attach="fog" args={[sky, fog[0], fog[1]]} />
    <CameraRig cam={{...cam, far: 400}} />
    <Environment intensity={0.35} />
    <Daylight center={centre} extent={extent} offset={[-18, 30, 14]} color="#fff1dd" intensity={sun} sky="#dfe8f2" ground="#8a8378" fill={0.9} />
    {children}
  </ThreeCanvas>
);

/** A block of buildings along a street: rows on both sides of z = 0, running along x. */
const Street: React.FC<{x0: number; x1: number; halfWidth?: number; lit?: boolean; river?: boolean}> = ({x0, x1, halfWidth = 6, lit = false, river = false}) => {
  const items: React.ReactNode[] = [];
  let i = 0;
  for (let x = x0; x < x1; x += 7) {
    for (const side of [-1, 1]) {
      const h = 12 + rnd(i * 7.3) * 26;
      const w = 6.2;
      const tex = windowsTex(i % 4, lit);
      items.push(
        <mesh key={`b${i}${side}`} geometry={box(w, h, 7)} position={[x + 3.5, h / 2, side * (halfWidth + 3.5 + 1.5)]} castShadow receiveShadow>
          <meshStandardMaterial map={tex} roughness={0.8} />
        </mesh>,
      );
      i++;
    }
  }
  return (
    <group>
      {river ? (
        <>
          <mesh geometry={plane} material={mat('#2f5b6e', 0.15, 0.3)} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, -0.4, 0]} scale={[x1 - x0 + 40, halfWidth * 2, 1]} receiveShadow />
          {[-1, 1].map((s) => (
            <mesh key={s} geometry={box(x1 - x0 + 40, 0.8, 1.2)} material={mat('#8d8a82', 0.9)} position={[(x0 + x1) / 2, -0.1, s * (halfWidth + 0.6)]} receiveShadow />
          ))}
        </>
      ) : (
        <mesh geometry={plane} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0, 0]} scale={[x1 - x0 + 40, halfWidth * 2, 1]} receiveShadow>
          <meshStandardMaterial map={roadTex()} roughness={0.95} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <mesh key={'sw' + s} geometry={plane} material={mat('#a7a39a', 0.95)} rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, 0.02, s * (halfWidth + 1.5)]} scale={[x1 - x0 + 40, 3, 1]} receiveShadow />
      ))}
      {items}
    </group>
  );
};

/** Black smoke columns and fires rising from the city (the later shots). */
const SmokeColumns: React.FC<{t: number; spots: [number, number][]; base?: number}> = ({t, spots, base = 0}) => (
  <group>
    {spots.map(([x, z], i) => (
      <group key={i} position={[x, base, z]}>
        {[0, 1, 2, 3, 4, 5].map((k) => {
          const p = (t * 0.12 + k / 6 + rnd(i) * 0.3) % 1;
          return <mesh key={k} geometry={ball} material={fade('#2a2a2e', 0.75 * (1 - p))} position={[Math.sin(p * 3 + i) * 1.5 * p, p * 30, Math.cos(p * 2 + i) * p]} scale={2 + p * 7} />;
        })}
        <mesh geometry={ball} material={glow('#ff7a2a', 3)} scale={[1.6 + 0.3 * Math.sin(t * 17 + i), 1.1 + 0.3 * Math.sin(t * 13 + i), 1.6]} />
      </group>
    ))}
  </group>
);

const Explosion: React.FC<{at: Vector3; t: number; size?: number}> = ({at, t, size = 1}) => {
  if (t < 0 || t > 1.6) return null;
  const k = clamp01(t / 0.25);
  const s = size * (0.4 + 1.6 * Math.sqrt(k));
  return (
    <group position={at}>
      {t < 0.45 ? <mesh geometry={ball} material={glow('#ffd26a', 4)} scale={s * (1 - t)} /> : null}
      {t < 0.7 ? <mesh geometry={ball} material={glow('#ff6a1a', 2.5)} scale={s * 1.2 * (1 - t * 0.6)} /> : null}
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <mesh key={i} geometry={ball} material={fade('#3a3a3e', 0.85 * (1 - clamp01((t - 0.2) / 1.4)))} position={[Math.cos(i * 0.9) * s * 0.9, s * 0.5 + i * 0.25 * s + t * size * 1.2, Math.sin(i * 1.3) * s * 0.6]} scale={s * (0.7 + 0.25 * (i % 3)) * (0.6 + t)} />
      ))}
    </group>
  );
};

const Shockwave: React.FC<{at: Vector3; t: number; r?: number; face?: boolean}> = ({at, t, r = 6, face = false}) =>
  t < 0 || t > 0.6 ? null : (
    <mesh geometry={ring} material={basic('#ffffff', 0.7 * (1 - t / 0.6))} position={at} rotation={face ? [0, 0, 0] : [Math.PI / 2, 0, 0]} scale={[r * (t / 0.6) + 0.5, r * (t / 0.6) + 0.5, 1 + 8 * (1 - t / 0.6)]} />
  );

// ---------------------------------------------------------------- vehicles
const jetGrey = '#7d858f';
/** Fighter jet, nose at local -x. crush 0..1 squashes the nose back. */
const Jet: React.FC<{crush?: number; canopy?: boolean}> = ({crush = 0, canopy = true}) => (
  <group>
    <mesh geometry={cylG(0.55, 0.7, 5.5, 18)} material={mat(jetGrey, 0.5, 0.4)} position={[0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
    <group position={[-2.15 + crush * 1.2, 0, 0]} scale={[1 - crush * 0.7, 1 + crush * 0.25, 1 + crush * 0.25]}>
      <mesh geometry={cone} material={mat(jetGrey, 0.5, 0.4)} position={[-0.9, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.55, 1.8, 0.55]} castShadow />
      {crush > 0.1 ? <mesh geometry={box(0.6, 0.9, 1.1)} material={mat('#4d5258', 0.7, 0.5)} position={[-0.2, 0, 0]} rotation={[0.4, 0.3, 0.2]} /> : null}
    </group>
    {canopy ? <mesh geometry={ball} material={mat('#3d4c5c', 0.05, 0.6)} position={[-0.9, 0.55, 0]} scale={[1.3, 0.45, 0.42]} /> : null}
    <mesh geometry={box(2.6, 0.08, 6.0)} material={mat(jetGrey, 0.5, 0.4)} position={[1.2, -0.05, 0]} rotation={[0, 0.35, 0]} castShadow />
    <mesh geometry={box(1.2, 0.06, 2.6)} material={mat(jetGrey, 0.5, 0.4)} position={[3.1, 0, 0]} castShadow />
    {[-0.5, 0.5].map((z) => (
      <mesh key={z} geometry={box(1.1, 1.3, 0.06)} material={mat(jetGrey, 0.5, 0.4)} position={[3.1, 0.75, z]} rotation={[z * 0.4, 0, 0.3]} castShadow />
    ))}
    <mesh geometry={cylG(0.42, 0.42, 0.2, 18)} material={glow('#ffb36a', crush > 0 ? 0.5 : 3)} position={[3.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
  </group>
);

/** Ejection seat with the pilot, then the parachute. t = seconds since ejection. */
const Ejection: React.FC<{t: number; from: Vector3}> = ({t, from}) => {
  const k = 0.6;
  if (t < 0) return null;
  const up = t < 0.4 ? Math.sin((t / 0.4) * Math.PI * 0.5) * 6 : 6 - (t - 0.4) * 1.2;
  const chute = smooth(clamp01((t - 0.4) / 0.25));
  const drift = Math.max(0, t - 0.4);
  return (
    <group position={[from.x + drift * 0.8, from.y + up * k, from.z + drift * 0.4]} scale={k}>
      <mesh geometry={box(0.55, 0.9, 0.55)} material={mat('#2b2e33', 0.6)} castShadow />
      <mesh geometry={ball} material={mat('#5a6b4a', 0.7)} position={[0.05, 0.35, 0]} scale={[0.22, 0.32, 0.22]} />
      <mesh geometry={ball} material={mat('#e9e9ea', 0.4)} position={[0.05, 0.75, 0]} scale={0.2} />
      {t < 0.45 ? <mesh geometry={cone} material={glow('#ffb04a', 3)} position={[0, -0.9, 0]} rotation={[Math.PI, 0, 0]} scale={[0.25, 1.1, 0.25]} /> : null}
      {chute > 0 ? (
        <group position={[0, 1 + 3.2 * chute, 0]} scale={[chute, chute, chute]}>
          <mesh geometry={keep('dome', () => new SphereGeometry(2.4, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2.4))} material={keep('chuteMat', () => new MeshStandardMaterial({color: '#f0f0ec', roughness: 0.8, side: 2}))} castShadow />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <mesh key={k} geometry={box(0.02, 3.2, 0.02)} material={mat('#999', 0.8)} position={[Math.cos(k) * 1, -1.4, Math.sin(k) * 1]} rotation={[Math.sin(k) * 0.3, 0, -Math.cos(k) * 0.3]} />
          ))}
        </group>
      ) : null}
    </group>
  );
};

const PoliceCar: React.FC<{lights: number}> = ({lights}) => (
  <group>
    <mesh geometry={box(4.4, 0.75, 1.9)} material={mat('#f2f2f0', 0.45, 0.2)} position={[0, 0.65, 0]} castShadow />
    <mesh geometry={box(2.2, 0.62, 1.7)} material={mat('#1c2a4a', 0.4, 0.2)} position={[-0.1, 1.32, 0]} castShadow />
    <mesh geometry={box(4.42, 0.2, 1.92)} material={mat('#1c2a4a', 0.5)} position={[0, 0.55, 0]} />
    <mesh geometry={box(0.3, 0.16, 1.2)} material={glow(lights > 0 ? '#ff2a2a' : '#4a0a0a', 3)} position={[-0.1, 1.72, -0.32]} />
    <mesh geometry={box(0.3, 0.16, 1.2)} material={glow(lights > 0 ? '#3a0a0a' : '#2a5bff', 3)} position={[-0.1, 1.72, 0.32]} />
    {[-1.4, 1.4].map((x) =>
      [-0.95, 0.95].map((z) => <mesh key={`${x}${z}`} geometry={cylG(0.36, 0.36, 0.3, 16)} material={mat('#18181a', 0.7)} position={[x, 0.36, z]} rotation={[Math.PI / 2, 0, 0]} />),
    )}
  </group>
);

const tankMat = '#5d6448';
/** Tank facing -x. bend 0..1 kinks the barrel upward. */
const Tank: React.FC<{bend?: number; flash?: boolean; hatch?: boolean}> = ({bend = 0, flash = false, hatch = false}) => (
  <group>
    <mesh geometry={box(6.2, 1.1, 3.2)} material={mat(tankMat, 0.75, 0.2)} position={[0, 0.95, 0]} castShadow receiveShadow />
    {[-1.45, 1.45].map((z) => (
      <mesh key={z} geometry={box(6.6, 0.9, 0.7)} material={mat('#2a2b2c', 0.85)} position={[0, 0.45, z]} castShadow />
    ))}
    <mesh geometry={box(3.0, 0.9, 2.4)} material={mat(tankMat, 0.75, 0.2)} position={[0.3, 1.95, 0]} castShadow />
    <mesh geometry={cylG(0.42, 0.42, 0.12, 16)} material={mat('#4a5040', 0.7)} position={[1.0, 2.45 + (hatch ? 0.25 : 0), 0.4]} rotation={hatch ? [0.9, 0, 0] : [0, 0, 0]} />
    <group position={[-1.2, 2.0, 0]}>
      <mesh geometry={cylG(0.15, 0.17, 2.4, 12)} material={mat('#4a5040', 0.6, 0.3)} position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
      <group position={[-2.4, 0, 0]} rotation={[0, 0, -bend * 1.6]}>
        <mesh geometry={cylG(0.15, 0.15, 2.4, 12)} material={mat('#4a5040', 0.6, 0.3)} position={[-1.2, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
        {flash ? <mesh geometry={ball} material={glow('#ffd26a', 5)} position={[-2.7, 0, 0]} scale={[1.2, 0.7, 0.7]} /> : null}
      </group>
    </group>
  </group>
);

/** Attack helicopter facing -x. rotorOff: rotor gone; tailOff: tail boom gone. */
const Heli: React.FC<{t: number; rotorOff?: boolean; tailOff?: boolean}> = ({t, rotorOff, tailOff}) => (
  <group>
    <mesh geometry={ball} material={mat('#3e4636', 0.6, 0.2)} scale={[2.0, 0.9, 0.85]} castShadow />
    <mesh geometry={ball} material={mat('#26303a', 0.1, 0.5)} position={[-1.4, 0.25, 0]} scale={[0.7, 0.5, 0.6]} />
    {!tailOff ? (
      <group>
        <mesh geometry={cylG(0.18, 0.3, 3.6, 10)} material={mat('#3e4636', 0.6, 0.2)} position={[3.4, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
        <mesh geometry={box(0.9, 1.1, 0.08)} material={mat('#3e4636', 0.6)} position={[5.1, 0.6, 0]} />
      </group>
    ) : null}
    {[-0.7, 0.7].map((z) => (
      <mesh key={z} geometry={box(2.6, 0.08, 0.1)} material={mat('#222', 0.7)} position={[0, -1.0, z]} />
    ))}
    {[-1, 1].map((z) => (
      <mesh key={'p' + z} geometry={box(0.6, 0.25, 0.25)} material={mat('#2d2f2a', 0.7)} position={[-0.2, -0.35, z * 1.1]} />
    ))}
    {!rotorOff ? (
      <group position={[0, 1.0, 0]} rotation={[0, t * 40, 0]}>
        <mesh geometry={cylG(0.12, 0.12, 0.4, 8)} material={mat('#222', 0.6)} position={[0, -0.15, 0]} />
        <mesh geometry={box(9, 0.05, 0.35)} material={mat('#1d1d1f', 0.7)} />
        <mesh geometry={box(0.35, 0.05, 9)} material={mat('#1d1d1f', 0.7)} />
      </group>
    ) : null}
  </group>
);

const GantrySign: React.FC = () => (
  <group>
    {[-3.4, 3.4].map((z) => (
      <mesh key={z} geometry={box(0.3, 6, 0.3)} material={mat('#8d9299', 0.5, 0.5)} position={[0, 3, z]} castShadow />
    ))}
    <mesh geometry={box(0.3, 0.3, 7.1)} material={mat('#8d9299', 0.5, 0.5)} position={[0, 6, 0]} castShadow />
    <mesh geometry={box(0.12, 1.4, 3.2)} material={mat('#1f6b3a', 0.6)} position={[0.1, 5.2, -1.2]} castShadow />
    <mesh geometry={box(0.12, 1.4, 2.6)} material={mat('#1f6b3a', 0.6)} position={[0.1, 5.2, 1.6]} castShadow />
  </group>
);

const ParkedCar: React.FC<{color: string; flash: boolean}> = ({color, flash}) => (
  <group>
    <mesh geometry={box(4.0, 0.75, 1.8)} material={mat(color, 0.4, 0.3)} position={[0, 0.62, 0]} castShadow />
    <mesh geometry={box(2.0, 0.6, 1.6)} material={mat('#2c3644', 0.15, 0.4)} position={[0.1, 1.28, 0]} castShadow />
    {[-1.95, 1.95].map((x) => (
      <mesh key={x} geometry={box(0.1, 0.2, 1.5)} material={glow(flash ? '#ffae2a' : '#3a2a10', flash ? 3 : 0.2)} position={[x, 0.75, 0]} />
    ))}
  </group>
);

// ---------------------------------------------------------------- the jet catch (hook + payoff)
const SKY_Y = 34;
const JET_HIT = 0.12;
const EJECT_AT = 0.5;
const ShotJet: React.FC<{view: 'hook' | 'side'}> = ({view}) => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const crush = smooth(clamp01((t - JET_HIT) / 0.28));
  // the crumpling nose stays pinned to his fist; the jet sits angled away into depth so the whole plane shows
  const FIST = v3(0.62, SKY_Y + 1.32, 0.15);
  const JET_YAW = 0.75;
  const JS = 0.55; // toy-scale jet
  const tip = (-3.95 + 2.46 * crush) * JS;
  const along = -tip + (t < JET_HIT ? (JET_HIT - t) * 80 : 0);
  const canopyAlong = along - 0.9 * JS;
  const canopy = v3(FIST.x + canopyAlong * Math.cos(JET_YAW), FIST.y + 0.55 * JS, FIST.z - canopyAlong * Math.sin(JET_YAW));
  const push = t > JET_HIT ? 0.25 * Math.sin(clamp01((t - JET_HIT) / 0.3) * Math.PI) : 0;
  const fall = Math.max(0, t - 1.2);
  const cam: Cam =
    view === 'hook'
      ? {position: v3(1.0 + 0.2 * t, SKY_Y + 1.6, 10.5 - 0.6 * t), target: v3(1.4, SKY_Y + 1.0, 0), fov: 44}
      : {position: v3(-2.5, SKY_Y + 2, 16), target: v3(2.0, SKY_Y + 0.5 + t * 1.5, 0), fov: 52};
  const shake = t > JET_HIT && t < JET_HIT + 0.3 ? 0.08 * Math.sin(t * 90) * (1 - (t - JET_HIT) / 0.3) : 0;
  return (
    <World cam={{...cam, position: cam.position.clone().add(v3(shake, shake, 0))}} centre={v3(0, SKY_Y, 0)} sky={view === 'hook' ? '#aebfcc' : '#b9a79a'} fog={[60, 260]}>
      <group position={[-30, -6, -26]}>
        <Street x0={0} x1={70} halfWidth={8} />
      </group>
      {view === 'side' ? <SmokeColumns t={t + 5} spots={[[-10, -30], [14, -40], [30, -25], [-26, -45]]} base={-6} /> : null}
      <Actor style={MARK} x={-push} z={0} y={SKY_Y} yaw={0} spec={{...PUNCH, nearArm: [88, 0]}} frame={frame} look={COLD} />
      <group position={[FIST.x + fall * 2, FIST.y - fall * fall * 6, FIST.z]} rotation={[fall * 0.3, JET_YAW, fall * 0.4]}>
        <group position={[along, 0, 0]} scale={JS}>
          <Jet crush={crush} canopy={t < EJECT_AT} />
        </group>
      </group>
      <Ejection t={t - EJECT_AT} from={canopy} />
      <Shockwave at={FIST.clone().add(v3(0.2, 0, 0.2))} t={t - JET_HIT} r={3} face />
    </World>
  );
};

// ---------------------------------------------------------------- 1. landing in the intersection
const ShotLanding: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const LAND = 0.3;
  const y = t < LAND ? (1 - t / LAND) * (1 - t / LAND) * 16 : 0;
  const crater = clamp01((t - LAND) / 0.08);
  const GANTRY_X = 3.2;
  const walk = runAlong((tt) => ({x: lerp(0, GANTRY_X - 0.9, smooth(clamp01((tt - 0.95) / 0.55))), z: lerp(0, 0.2, smooth(clamp01((tt - 0.95) / 0.55)))}), t, 0.25);
  const lift = smooth(clamp01((t - 1.6) / 0.35));
  const thrown = clamp01((t - 2.1) / 0.4);
  let spec: BodySpec = t < LAND + 0.45 ? LANDING : t < 0.95 ? idleSpec(frame, 0.1) : t < 1.5 ? walk.spec : {...LIFT, nearArm: [lerp(40, 172, lift), 8], farArm: [lerp(40, 168, lift), 10]};
  if (t > 2.1) spec = {...PUNCH, nearArm: [lerp(172, 60, smooth(clamp01((t - 2.1) / 0.2))), 4], farArm: [lerp(168, 50, smooth(clamp01((t - 2.1) / 0.2))), 8], lean: 18};
  const mx = t < 0.95 ? 0 : walk.pos.x;
  const gPos =
    t < 2.1
      ? v3(GANTRY_X, lift * 2.0, 0)
      : v3(lerp(GANTRY_X, GANTRY_X - 1, thrown), 2.0 + Math.sin(thrown * Math.PI) * 4, lerp(0, -12.5, thrown));
  const gRot = t < 2.1 ? [0, 0, lift * 0.1] : [thrown * 2.5, thrown * 0.6, 0.1];
  const shake = t > LAND && t < LAND + 0.4 ? 0.12 * Math.sin(t * 95) * (1 - (t - LAND) / 0.4) : 0;
  const cam: Cam = {position: v3(-4.2, 1.7, 5.6), target: v3(1.4, 2.0, -1.0), fov: 54};
  const flash = Math.floor(t * 4) % 2 === 0 && t > LAND;
  return (
    <World cam={{...cam, position: cam.position.clone().add(v3(shake, shake, 0))}} centre={v3(0, 0, 0)}>
      <Street x0={-40} x1={40} />
      <mesh geometry={box(14, 7, 0.2)} material={keep('lobbyGlass', () => new MeshStandardMaterial({color: '#9fc4d8', roughness: 0.05, metalness: 0.3, transparent: true, opacity: t > 2.5 ? 0 : 0.55}))} position={[2, 3.5, -12.95]} />
      {/* crater */}
      {crater > 0 ? <mesh geometry={cylG(2.6, 2.2, 0.05, 28)} material={mat('#1d1e21', 0.95)} position={[0, 0.03, 0]} scale={[crater, 1, crater]} /> : null}
      {crater > 0
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => {
            const a = (i / 10) * Math.PI * 2;
            const p = clamp01((t - LAND) / 0.7);
            return <mesh key={i} geometry={box(0.5, 0.25, 0.4)} material={mat('#4a4c50', 0.9)} position={[Math.cos(a) * (2 + p * 2.5), 0.12 + Math.sin(p * Math.PI) * (1 + (i % 3)), Math.sin(a) * (2 + p * 2.5)]} rotation={[i, p * 4, i * 0.5]} />;
          })
        : null}
      <Shockwave at={v3(0, 0.2, 0)} t={t - LAND} r={8} />
      {[
        [-9.0, 3.4, '#b8323a', 0.1],
        [6.5, 3.0, '#e0e0e0', 0.0],
        [-3.0, -3.4, '#2e4a7a', 3.1],
        [8.0, -3.3, '#d9a530', 3.1],
      ].map(([x, z, c, r], i) => (
        <group key={i} position={[x as number, 0, z as number]} rotation={[0, r as number, 0]}>
          <ParkedCar color={c as string} flash={flash} />
        </group>
      ))}
      {t <= 2.7 ? (
        <group position={gPos} rotation={gRot as [number, number, number]}>
          <GantrySign />
        </group>
      ) : null}
      {t > 2.5
        ? [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((i) => {
            const p = clamp01((t - 2.5) / 0.6);
            return <mesh key={i} geometry={plane} material={keep('shard', () => new MeshStandardMaterial({color: '#cfe6f2', roughness: 0.05, metalness: 0.4, side: 2}))} position={[2 + (rnd(i) - 0.5) * 9, 3.5 + (rnd(i + 9) - 0.5) * 5 - p * p * 3, -12.8 + p * 2.5 * rnd(i + 3)]} rotation={[i, i * 2, p * 6]} scale={0.5 + rnd(i) * 0.6} />;
          })
        : null}
      {t > LAND + 0.1
        ? [0, 1, 2, 3].map((i) => {
            const dir = [v3(-1, 0, 0.6), v3(1, 0, 0.8), v3(-0.6, 0, -1), v3(1, 0, -0.5)][i].normalize();
            const r = runAlong((tt) => ({x: -7 + i * 5 + dir.x * Math.max(0, tt - LAND - 0.1) * 5, z: (i % 2 ? 4.5 : -4.5) + dir.z * Math.max(0, tt - LAND - 0.1) * 5}), t, 0.9);
            return <Actor key={i} style={civvy(i)} x={r.pos.x} z={r.pos.z} yaw={r.yaw} spec={r.spec} frame={frame} look={SCARED} />;
          })
        : null}
      <Actor style={MARK} x={mx} z={t < 0.95 ? 0 : walk.pos.z} y={y} yaw={t < 0.95 ? 0.3 : t < 1.5 ? walk.yaw : t < 2.1 ? 0 : -1.1} spec={t < LAND ? {...LANDING, nearArm: [160, 10], farArm: [150, 20]} : spec} frame={frame} look={COLD} />
    </World>
  );
};

// ---------------------------------------------------------------- 2. the police
const COPS = [
  {car: v3(-4.5, 0, 3.2), yaw: 0.7, cop: v3(-3.5, 0, 4.6)},
  {car: v3(4.8, 0, 3.0), yaw: -0.6, cop: v3(3.6, 0, 4.4)},
  {car: v3(0.6, 0, 5.6), yaw: 0.05, cop: v3(-0.9, 0, 6.9)},
];
const ShotPolice: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const FLICK = 1.3;
  const fire = t > 0.08 && t < 1.25;
  const flick = clamp01((t - FLICK - 0.1) / 0.8);
  const cam: Cam = {position: v3(7.5, 2.8, 8.0), target: v3(-0.3, 1.0, 0.8), fov: 48};
  return (
    <World cam={cam} centre={v3(0, 0, 2)}>
      <Street x0={-40} x1={40} />
      <mesh geometry={cylG(2.6, 2.2, 0.05, 28)} material={mat('#1d1e21', 0.95)} position={[0, 0.03, 0]} />
      {COPS.map((c, i) => {
        const tumble = i === 2 ? flick : 0;
        const pos = i === 2 && tumble > 0 ? v3(c.car.x + tumble * 16, Math.sin(tumble * Math.PI) * 3, c.car.z + tumble * 3) : c.car;
        return (
          <group key={i}>
            <group position={pos} rotation={[tumble * 5, c.yaw + tumble * 2, tumble * 3]}>
              <PoliceCar lights={Math.floor(t * 6 + i) % 2} />
            </group>
            {(() => {
              const run = t > FLICK + 0.2;
              const r = runAlong((tt) => ({x: c.cop.x + (c.cop.x < 0 ? -1 : 1) * Math.max(0, tt - FLICK - 0.2) * 5, z: c.cop.z + Math.max(0, tt - FLICK - 0.2) * 3}), t, 0.9);
              return <Actor style={police(['#e0ac85', '#8d5a3c', '#f1c3a0'][i], '#2b211c')} x={run ? r.pos.x : c.cop.x} z={run ? r.pos.z : c.cop.z} yaw={run ? r.yaw : Math.atan2(c.cop.z, -c.cop.x)} spec={run ? r.spec : AIM} frame={frame} look={run ? SCARED : COLD} />;
            })()}
            {fire && Math.floor(t * 14 + i * 3) % 3 === 0 ? <mesh geometry={ball} material={glow('#ffd26a', 5)} position={[c.cop.x + (0 - c.cop.x) * 0.15, 1.25, c.cop.z + (0 - c.cop.z) * 0.15]} scale={0.18} /> : null}
          </group>
        );
      })}
      {/* sparks on his chest, flattened rounds dropping */}
      {fire
        ? [0, 1, 2].map((k) => {
            const i = Math.floor(t * 14) * 3 + k;
            return <mesh key={k} geometry={ball} material={glow('#ffe9a0', 4)} position={[0.15, 1.05 + rnd(i) * 0.45, (rnd(i + 5) - 0.5) * 0.35]} scale={0.05} />;
          })
        : null}
      {Array.from({length: 14}, (_, i) => {
        const at = 0.12 + i * 0.08;
        const p = t - at;
        if (p < 0) return null;
        const yb = Math.max(0.03, 1.2 + rnd(i) * 0.3 - 4.9 * p * p);
        return <mesh key={i} geometry={cylG(0.03, 0.03, 0.02, 8)} material={mat('#c9a24a', 0.3, 0.8)} position={[0.25 + rnd(i + 2) * 0.4, yb, (rnd(i + 7) - 0.5) * 0.8]} rotation={[i, i * 2, 0]} />;
      })}
      <Actor
        style={MARK}
        x={0}
        z={0}
        yaw={-Math.PI / 2 + 0.25}
        spec={t < FLICK ? {...idleSpec(frame, 0.1), lean: 2, headTilt: 6} : {...PUNCH, lean: 8, nearArm: [lerp(20, 95, smooth(clamp01((t - FLICK) / 0.12))), 4]}}
        frame={frame}
        look={{...COLD, yaw: t < FLICK ? -20 : 0}}
      />
    </World>
  );
};

// ---------------------------------------------------------------- 3. the tanks
const TANKS = [v3(10, 0, -1.6), v3(14.5, 0, 2.0), v3(18.5, 0, -1.0)];
const ShotTanks: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const VOLLEY = 0.4;
  const WALK0 = 1.4;
  const WALK1 = 2.15;
  const LIFT_AT = 2.2;
  const THROW_AT = 2.85;
  const HIT_AT = 3.25;
  const walk = runAlong((tt) => ({x: lerp(0, TANKS[0].x - 4.0, smooth(clamp01((tt - WALK0) / (WALK1 - WALK0)))), z: lerp(0, TANKS[0].z * 0.6, smooth(clamp01((tt - WALK0) / (WALK1 - WALK0))))}), t, 0.3);
  const mx = walk.pos.x;
  const lift = smooth(clamp01((t - LIFT_AT) / 0.35));
  const bend = smooth(clamp01((t - LIFT_AT - 0.35) / 0.25));
  const thr = clamp01((t - THROW_AT) / (HIT_AT - THROW_AT));
  const smoke = clamp01((t - VOLLEY) / 0.1) * (1 - clamp01((t - 1.1) / 0.8));
  let spec: BodySpec = t < WALK0 ? idleSpec(frame, 0.2) : t < WALK1 ? walk.spec : {...LIFT, nearArm: [lerp(70, 172, lift), 8], farArm: [lerp(70, 168, lift), 10]};
  if (t >= THROW_AT) spec = {...PUNCH, lean: 20, nearArm: [lerp(172, 70, smooth(clamp01((t - THROW_AT) / 0.2))), 4], farArm: [lerp(168, 60, smooth(clamp01((t - THROW_AT) / 0.2))), 8]};
  const lead =
    t < LIFT_AT
      ? {p: TANKS[0], r: [0, 0, 0]}
      : t < THROW_AT
        ? {p: v3(lerp(TANKS[0].x, mx + 1.2, lift), lift * 3.4, lerp(TANKS[0].z, walk.pos.z, lift)), r: [0, 0, lift * 0.15]}
        : {p: v3(lerp(mx + 1.2, TANKS[1].x - 0.5, thr), 3.4 + Math.sin(thr * Math.PI) * 2 - thr * 2.2, lerp(walk.pos.z, TANKS[1].z, thr)), r: [thr * 1.2, 0, 0.15 + thr * 1.4]};
  const camX = lerp(-9, mx - 9, smooth(clamp01((t - WALK0) / 1.0)));
  const cam: Cam = {position: v3(camX, 2.6, 3.6), target: v3(camX + 14, 2.4, -0.3), fov: 50};
  const shake = t > VOLLEY && t < VOLLEY + 0.4 ? 0.12 * Math.sin(t * 90) : t > HIT_AT && t < HIT_AT + 0.3 ? 0.1 * Math.sin(t * 90) : 0;
  return (
    <World cam={{...cam, position: cam.position.clone().add(v3(shake, shake, 0))}} centre={v3(8, 0, 0)} extent={18}>
      <Street x0={-30} x1={60} />
      {TANKS.map((p, i) =>
        i === 0 ? null : (
          <group key={i} position={p} rotation={[0, 0, i === 1 && t > HIT_AT ? 0.25 : 0]}>
            <Tank flash={t > VOLLEY + i * 0.04 && t < VOLLEY + i * 0.04 + 0.08} />
          </group>
        ),
      )}
      <group position={lead.p} rotation={lead.r as [number, number, number]}>
        <Tank bend={bend} flash={t > VOLLEY && t < VOLLEY + 0.08} hatch={t > 1.9} />
      </group>
      {/* the crew bails out of the lead tank before he gets there */}
      {t > 1.95
        ? [0, 1].map((k) => {
            const r = runAlong((tt) => ({x: TANKS[0].x + 1 + k * 0.8 + Math.max(0, tt - 2.05) * 3, z: TANKS[0].z + 2.2 + Math.max(0, tt - 2.05) * 5}), t, 0.9);
            return t < 2.05 ? null : <Actor key={k} style={uniform(['#e0ac85', '#6b4430'][k], '#2b211c')} x={r.pos.x} z={r.pos.z} yaw={r.yaw} spec={r.spec} frame={frame} look={SCARED} />;
          })
        : null}
      {/* the wall of fire and smoke where he was standing */}
      {smoke > 0.02
        ? Array.from({length: 14}, (_, i) => (
            <mesh key={i} geometry={ball} material={i < 4 && t < VOLLEY + 0.35 ? glow('#ff8a2a', 3) : fade('#5a5a5e', 0.9 * smoke)} position={[0.5 + (rnd(i) - 0.5) * 3, 0.5 + rnd(i + 3) * 3, (rnd(i + 6) - 0.5) * 3.5]} scale={0.7 + rnd(i + 9) * 0.9 + (t - VOLLEY) * 0.5} />
          ))
        : null}
      <Explosion at={v3(TANKS[1].x, 2.0, TANKS[1].z)} t={t - HIT_AT} size={1.6} />
      <Actor style={MARK} x={mx} z={walk.pos.z} yaw={t < WALK1 && t > WALK0 ? walk.yaw : 0} spec={spec} frame={frame} look={COLD} />
    </World>
  );
};

// ---------------------------------------------------------------- 4. the helicopters
const HELI_Y = 7;
const ShotHeli: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const ROCKETS = 0.3;
  const BOOM = 0.75;
  const RIP = 1.35;
  const SWING = 1.8;
  const SPLASH = 2.55;
  const approach = smooth(clamp01(t / 0.6));
  const hA0 = v3(lerp(16, 10.5, approach), HELI_Y + 0.6, -2.2);
  const hB0 = v3(lerp(19, 13.5, approach), HELI_Y + 1.4, 2.4);
  const fly = smooth(clamp01((t - 0.9) / 0.4));
  const mPos = t < 0.9 ? v3(3, HELI_Y, 0) : t < SWING ? v3(lerp(3, hA0.x - 1.3, fly), HELI_Y + 1.5 * fly, lerp(0, -2.2, fly)) : v3(lerp(hA0.x - 1.3, hB0.x - 3.2, smooth(clamp01((t - SWING) / 0.25))), HELI_Y + 1.6, lerp(-2.2, 2.0, smooth(clamp01((t - SWING) / 0.25))));
  const fallA = clamp01((t - RIP - 0.1) / (SPLASH - RIP));
  const fallB = clamp01((t - SWING - 0.1) / (SPLASH - SWING));
  const hA = t < RIP ? hA0 : v3(hA0.x + fallA * 1.5, lerp(hA0.y, -0.3, fallA * fallA), hA0.z);
  const hB = t < SWING ? hB0 : v3(hB0.x - fallB * 1, lerp(hB0.y, -0.3, fallB * fallB), hB0.z);
  const spec: BodySpec = t < 0.9 ? HOVER(t) : t < RIP ? FLY : t < SWING ? {...HOVER(t), nearArm: [150, 10]} : {...PUNCH, nearArm: [lerp(150, 40, smooth(clamp01((t - SWING) / 0.2))), 4]};
  const cam: Cam = {position: v3(7.0, HELI_Y + 0.6, 12), target: v3(8.0, HELI_Y - 0.2, 0), fov: 54};
  return (
    <World cam={cam} centre={v3(8, 0, 0)} extent={20} sky="#a9b8c4">
      <Street x0={-30} x1={60} halfWidth={7} river />
      {t < SPLASH + 0.1 ? (
        <group position={hA} rotation={[0, t > RIP ? fallA * 9 : 0, t > RIP ? fallA * 0.4 : 0.08]}>
          <Heli t={t} rotorOff={t >= RIP} />
        </group>
      ) : null}
      {t < SPLASH + 0.1 ? (
        <group position={hB} rotation={[0, t > SWING ? -fallB * 10 : 0, 0.08]}>
          <Heli t={t + 0.3} tailOff={t >= SWING + 0.05} />
        </group>
      ) : null}
      {/* rockets from both helicopters at him */}
      {[0, 1, 2, 3].map((k) => {
        const from = k < 2 ? hA0 : hB0;
        const p = clamp01((t - ROCKETS - k * 0.06) / 0.4);
        if (p <= 0 || p >= 1) return null;
        const pos = from.clone().lerp(v3(3, HELI_Y + 0.8, 0), p);
        return (
          <group key={k}>
            <mesh geometry={cylG(0.08, 0.08, 0.7, 8)} material={mat('#ddd', 0.4)} position={pos} rotation={[0, 0, Math.PI / 2]} />
            <mesh geometry={ball} material={fade('#ffffff', 0.6)} position={pos.clone().add(v3(1.2, 0, 0))} scale={[1.3, 0.12, 0.12]} />
          </group>
        );
      })}
      <Explosion at={v3(3, HELI_Y + 0.8, 0)} t={t - BOOM} size={1.1} />
      {/* the ripped-off rotor in his hand, then swung */}
      {t >= RIP && t < SWING + 0.4 ? (
        <group position={mPos.clone().add(v3(0.3, 1.6, 0))} rotation={[0, t * 6, 0]}>
          <mesh geometry={box(9, 0.05, 0.35)} material={mat('#1d1d1f', 0.7)} />
        </group>
      ) : null}
      {t >= SWING && t < SPLASH ? (
        <group position={[hB0.x + 4 + fallB * 2, hB0.y - fallB * fallB * 8, hB0.z]} rotation={[fallB * 5, 0, fallB * 3]}>
          <mesh geometry={cylG(0.18, 0.3, 3.6, 10)} material={mat('#3e4636', 0.6, 0.2)} rotation={[0, 0, Math.PI / 2]} />
        </group>
      ) : null}
      {[hA0.x + 1.5, hB0.x - 1].map((x, i) => {
        const p = t - SPLASH - i * 0.05;
        if (p < 0 || p > 1.2) return null;
        return (
          <group key={i} position={[x, -0.3, i ? 2.4 : -2.2]}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
              <mesh key={k} geometry={ball} material={fade('#e9f3f7', 0.9 * (1 - p / 1.2))} position={[Math.cos(k) * p * 2, Math.sin((p / 1.2) * Math.PI) * (2 + (k % 3)), Math.sin(k) * p * 2]} scale={0.5 + p * 0.6} />
            ))}
          </group>
        );
      })}
      {/* crews swimming clear */}
      {t > SPLASH + 0.25
        ? [0, 1, 2, 3].map((k) => (
            <group key={k} position={[[hA0.x + 1, hA0.x + 2.4, hB0.x - 1.8, hB0.x - 0.4][k] + (t - SPLASH) * (k % 2 ? 0.8 : -0.8), -0.3 + 0.04 * Math.sin(t * 6 + k), [-1.0, -3.0, 3.6, 1.2][k]]}>
              <mesh geometry={ball} material={mat('#e0ac85', 0.6)} scale={0.17} position={[0, 0.12, 0]} />
              <mesh geometry={ball} material={mat('#4d5a3c', 0.6)} scale={[0.2, 0.1, 0.2]} position={[0, 0.25, 0]} />
            </group>
          ))
        : null}
      <Actor style={MARK} x={mPos.x} z={mPos.z} y={mPos.y} yaw={0} pitch={t >= 0.9 && t < RIP ? -75 : 0} spec={spec} frame={frame} look={COLD} />
    </World>
  );
};

// ---------------------------------------------------------------- 5. the war room
const feedTex = (k: number) =>
  keep('feed' + k, () =>
    canvasTex(256, 160, (g) => {
      const grd = g.createLinearGradient(0, 0, 0, 160);
      grd.addColorStop(0, k === 9 ? '#f2b27a' : '#5b4a46');
      grd.addColorStop(1, k === 9 ? '#c98c66' : '#2a2224');
      g.fillStyle = grd;
      g.fillRect(0, 0, 256, 160);
      g.fillStyle = '#1b1a1f';
      for (let i = 0; i < 14; i++) {
        const h = 40 + rnd(i * 3 + k) * 80;
        g.fillRect(i * 19, 160 - h, 16, h);
      }
      g.fillStyle = 'rgba(40,36,40,0.8)';
      for (let i = 0; i < 4; i++) {
        g.beginPath();
        g.ellipse(40 + i * 60 + rnd(i + k) * 20, 40 + rnd(i * 2) * 30, 30, 20, 0, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ff7a2a';
      for (let i = 0; i < 4; i++) g.fillRect(30 + i * 60 + rnd(i + k * 2) * 20, 120 - rnd(i) * 30, 10, 8);
      g.fillStyle = '#e5262b';
      g.font = 'bold 18px sans-serif';
      g.fillText(k === 9 ? '' : '● LIVE', 10, 24);
    }),
  );
const staticTex = (n: number) =>
  keep('static' + n, () =>
    canvasTex(128, 80, (g) => {
      for (let y = 0; y < 80; y += 2)
        for (let x = 0; x < 128; x += 2) {
          const v = Math.floor(rnd(x * 31 + y * 17 + n * 1013) * 255);
          g.fillStyle = `rgb(${v},${v},${v})`;
          g.fillRect(x, y, 2, 2);
        }
    }),
  );
const SCREENS = [-3.6, -1.2, 1.2, 3.6].flatMap((x, i) => [{x, y: 2.9, k: i}, {x, y: 1.55, k: i + 4}]);
const GENERALS = [
  {x: -1.5, z: 0.8, st: uniform('#e9b991', '#cfcfcf')},
  {x: 1.4, z: 0.9, st: uniform('#8d5a3c', '#2b211c')},
  {x: -0.6, z: 2.0, st: uniform('#f1c3a0', '#8a8a8a')},
  {x: 0.9, z: 2.1, st: uniform('#c98f6b', '#1f1714')},
];
const DOOR_Z = -4.4;
const WarRoom: React.FC<{t: number; frame: number; cutoff: number; children?: React.ReactNode; doorOff: number}> = ({t, frame, cutoff, children, doorOff}) => (
  <group>
    <mesh geometry={plane} material={mat('#1d2024', 0.9)} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} receiveShadow />
    <mesh geometry={plane} material={mat('#2a2e33', 0.85)} position={[0, 3, DOOR_Z - 0.3]} scale={[16, 6, 1]} receiveShadow />
    <mesh geometry={box(5.2, 0.12, 2.4)} material={mat('#3a3f46', 0.4, 0.3)} position={[0, 0.85, 1.3]} castShadow receiveShadow />
    <mesh geometry={box(5.0, 0.02, 2.2)} material={glow('#2a4a6a', 0.8)} position={[0, 0.92, 1.3]} />
    {[-2.3, 2.3].map((x) => (
      <mesh key={x} geometry={box(0.15, 0.8, 2.0)} material={mat('#30343a', 0.6)} position={[x, 0.4, 1.3]} />
    ))}
    {/* the wall of screens around the vault door */}
    {SCREENS.map((s, i) => (
      <mesh key={i} geometry={plane} position={[s.x * 1.05, s.y + 0.4, DOOR_Z - 0.25]} scale={[2.1, 1.25, 1]}>
        <meshBasicMaterial map={(i < cutoff ? staticTex(frame % 4) : feedTex(s.k)) as CanvasTexture} />
      </mesh>
    ))}
    <pointLight position={[0, 3.5, -2]} intensity={14} distance={12} color="#9fc4ff" />
    <pointLight position={[0, 2.5, 3]} intensity={8} distance={10} color="#ffd9a8" />
    {/* the vault door */}
    {doorOff < 1 ? (
      <group position={[lerp(0, -3.2, doorOff), 1.6 - doorOff * 1.2, DOOR_Z + doorOff * 3]} rotation={[doorOff * 1.3, doorOff * 2.2, doorOff * 0.6]}>
        <mesh geometry={cylG(1.35, 1.35, 0.35, 32)} material={mat('#8d949c', 0.35, 0.8)} rotation={[Math.PI / 2, 0, 0]} castShadow />
        <mesh geometry={cylG(0.5, 0.5, 0.2, 24)} material={mat('#6d747c', 0.35, 0.8)} position={[0, 0, 0.25]} rotation={[Math.PI / 2, 0, 0]} />
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} geometry={box(1.4, 0.1, 0.1)} material={mat('#5d646c', 0.4, 0.8)} position={[0, 0, 0.36]} rotation={[0, 0, (k * Math.PI) / 4]} />
        ))}
      </group>
    ) : null}
    <mesh geometry={cylG(1.5, 1.5, 0.1, 32)} material={mat(doorOff > 0 ? '#050507' : '#4a5058', 0.6, 0.5)} position={[0, 1.6, DOOR_Z - 0.12]} rotation={[Math.PI / 2, 0, 0]} />
    {children}
  </group>
);
const ShotWar: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const cutoff = [0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92, 1.04].filter((x) => t >= x).length;
  const thud = (a: number) => (t > a && t < a + 0.25 ? Math.sin(((t - a) / 0.25) * Math.PI) : 0);
  const bulge = thud(1.4) * 0.6 + thud(1.9) * 1;
  const TEAR = 2.35;
  const doorOff = clamp01((t - TEAR) / 0.45);
  const enter = smooth(clamp01((t - TEAR - 0.15) / 0.7));
  const back = smooth(clamp01((t - TEAR - 0.1) / 0.8));
  const shake = bulge * 0.05 * Math.sin(t * 90);
  const cam: Cam = {position: v3(0.6, 1.75, 5.6 - 0.4 * clamp01(t / 3.5)), target: v3(0, 1.45, DOOR_Z + 1), fov: 50};
  return (
    <World cam={{...cam, position: cam.position.clone().add(v3(shake, shake, 0))}} centre={v3(0, 0, 0)} sky="#0b0d12" fog={[12, 40]} sun={0.4} extent={8}>
      <WarRoom t={t} frame={frame} cutoff={cutoff} doorOff={doorOff}>
        <group position={[0, 1.6, DOOR_Z + 0.2 - bulge * 0.15]}>
          {bulge > 0.1 ? <mesh geometry={ball} material={fade('#a39a8c', 0.5 * bulge)} scale={1.4 + bulge} position={[0, -0.8, 0.6]} /> : null}
        </group>
        {GENERALS.map((g, i) => (
          <Actor
            key={i}
            style={g.st}
            x={g.x * (1 + back * 0.25)}
            z={g.z + back * 1.2}
            yaw={Math.atan2(-(DOOR_Z - g.z), -g.x) - Math.PI / 2 + Math.PI}
            spec={back > 0 ? {...idleSpec(frame + i * 7, 0.1), lean: -8, nearArm: [30, 30], farArm: [28, 32]} : idleSpec(frame + i * 7, 0.1)}
            frame={frame + i * 9}
            look={t > TEAR ? SCARED : {tired: 0.3, droop: 0, eyesClosed: false, brows: 0.5, mouth: 'flat', yaw: (rnd(i) - 0.5) * 30}}
          />
        ))}
        {t > TEAR + 0.1 ? <Actor style={MARK} x={0} z={lerp(DOOR_Z - 0.6, DOOR_Z + 1.6, enter)} y={0.35 + 0.05 * Math.sin(t * 3)} yaw={-Math.PI / 2} spec={HOVER(t)} frame={frame} look={COLD} /> : null}
      </WarRoom>
    </World>
  );
};

// ---------------------------------------------------------------- 6. the ending: his chair
const ShotEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / INV_FPS;
  const cam: Cam = {position: v3(0.15, 1.5, 4.6 - 0.5 * smooth(clamp01(t / 2))), target: v3(0, 2.15, -1.6), fov: 50};
  return (
    <World cam={cam} centre={v3(0, 0, 0)} sky="#0b0d12" fog={[12, 40]} sun={0.4} extent={8}>
      <mesh geometry={plane} material={mat('#1d2024', 0.9)} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} receiveShadow />
      <mesh geometry={plane} position={[0, 2.3, -3.2]} scale={[6.4, 3.6, 1]}>
        <meshBasicMaterial map={feedTex(9) as CanvasTexture} />
      </mesh>
      <pointLight position={[0, 2.5, -1.5]} intensity={10} distance={8} color="#ffb98a" />
      <pointLight position={[1.5, 2.5, 2.5]} intensity={6} distance={9} color="#9fb4d8" />
      <mesh geometry={box(5.2, 0.12, 2.4)} material={mat('#3a3f46', 0.4, 0.3)} position={[0, 0.85, 0.6]} castShadow receiveShadow />
      {/* the head general's chair, his jacket hung on the back */}
      <mesh geometry={box(0.7, 0.1, 0.7)} material={mat('#2a1f1a', 0.6)} position={[0, 0.48, -0.9]} />
      <mesh geometry={box(0.7, 1.1, 0.1)} material={mat('#2a1f1a', 0.6)} position={[0, 1.05, -1.3]} castShadow />
      <mesh geometry={box(0.76, 0.75, 0.06)} material={mat('#4d5a3c', 0.8)} position={[0, 1.15, -1.36]} />
      <Actor style={MARK} x={0.05} z={-1.0} yaw={-Math.PI / 2} spec={SIT} frame={frame} look={COLD} />
      <SmokeColumns t={t} spots={[]} />
    </World>
  );
};

// ---------------------------------------------------------------- overlays
const HookCaption: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame >= F(T_EARLIER)) return null;
  const s = spring({frame: frame - 2, fps, config: {damping: 10, stiffness: 240}});
  return (
    <div style={{position: 'absolute', top: 130, left: 40, right: 40, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 80, lineHeight: 1.05, color: '#fff', WebkitTextStroke: '5px #111', textShadow: '0 9px 0 #111', transform: `scale(${frame < 2 ? 0 : s})`}}>
      WHAT IF <span style={{color: '#f5c518'}}>INVINCIBLE</span> TURNED <span style={{color: '#ff3a2a'}}>EVIL?</span>
    </div>
  );
};
const Earlier: React.FC<{frame: number}> = ({frame}) => {
  if (frame < F(T_EARLIER) || frame >= F(T_LAND)) return null;
  return (
    <AbsoluteFill style={{background: '#000', alignItems: 'center', justifyContent: 'center', fontFamily: FONT}}>
      <div style={{color: '#fff', fontWeight: 800, fontSize: 64, letterSpacing: 8}}>1 HOUR EARLIER</div>
    </AbsoluteFill>
  );
};
const EndPanels: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const local = frame - F(T_END);
  if (local < 0) return null;
  const head = spring({frame: local - 4, fps, config: {damping: 12, stiffness: 200}});
  const panel = (i: number) => spring({frame: local - 12 - i * 6, fps, config: {damping: 11, stiffness: 220}});
  const P: React.FC<{i: number; letter: string; text: string; bg: string}> = ({i, letter, text, bg}) => (
    <div style={{width: 440, height: 300, borderRadius: 24, background: bg, border: '6px solid #fff', boxShadow: '0 14px 34px rgba(0,0,0,.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: `scale(${local < 12 + i * 6 ? 0 : panel(i)}) rotate(${i ? 3 : -3}deg)`}}>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 120, color: '#fff', lineHeight: 1}}>{letter}</div>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', textAlign: 'center', padding: '0 20px'}}>{text}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{alignItems: 'center'}}>
      <div style={{marginTop: 150, fontFamily: FONT, fontWeight: 900, fontSize: 76, color: '#fff', WebkitTextStroke: '5px #111', textShadow: '0 9px 0 #111', transform: `scale(${local < 4 ? 0 : head})`}}>WHO COULD STOP HIM?</div>
      <div style={{marginTop: 40, display: 'flex', gap: 40}}>
        <P i={0} letter="A" text="EVERY ARMY ON EARTH" bg="linear-gradient(160deg,#4d5a3c,#2b3322)" />
        <P i={1} letter="B" text="NOTHING CAN STOP HIM" bg="linear-gradient(160deg,#b3261e,#5c0f0b)" />
      </div>
    </AbsoluteFill>
  );
};

const LINE_AT = T_WAR + 2.6;
const CUES: Cue[] = [{from: F(LINE_AT), to: F(LINE_AT + 1.45), text: "WHO'S IN CHARGE HERE?", hl: {'CHARGE': '#ff3a2a'}, top: 1180}];

// ---------------------------------------------------------------- sound
type S = {at: number; src: string; vol?: number; dur?: number};
const SOUNDS: S[] = [
  // hook: the jet
  {at: 0.0, src: 'invincible/jet.wav', vol: 0.9, dur: JET_HIT + 0.02},
  {at: JET_HIT, src: 'invincible/crunch.wav', vol: 1},
  {at: JET_HIT, src: 'invincible/boom.wav', vol: 0.6},
  {at: EJECT_AT, src: 'invincible/eject.wav', vol: 0.8, dur: T_EARLIER - EJECT_AT},
  // 1 hour earlier
  {at: T_EARLIER, src: 'invincible/drone.wav', vol: 0.6},
  {at: T_LAND + 0.3, src: 'invincible/boom.wav', vol: 1},
  {at: T_LAND + 0.4, src: 'invincible/alarms.wav', vol: 0.55, dur: 2.4},
  {at: T_LAND + 1.6, src: 'invincible/groan.wav', vol: 0.6, dur: 0.6},
  {at: T_LAND + 2.5, src: 'invincible/glass.wav', vol: 0.8},
  {at: T_LAND + 2.5, src: 'invincible/boom.wav', vol: 0.5},
  // police
  {at: T_POLICE, src: 'invincible/drone.wav', vol: 0.5},
  {at: T_POLICE + 0.08, src: 'invincible/gunfire.wav', vol: 0.75, dur: 1.2},
  {at: T_POLICE + 0.1, src: 'invincible/tinks.wav', vol: 0.8},
  {at: T_POLICE + 1.4, src: 'invincible/crunch.wav', vol: 0.6},
  {at: T_POLICE + 1.45, src: 'invincible/tumble.wav', vol: 0.8},
  // tanks
  {at: T_TANKS + 0.4, src: 'invincible/volley.wav', vol: 1},
  {at: T_TANKS + 2.2, src: 'invincible/groan.wav', vol: 0.8},
  {at: T_TANKS + 2.55, src: 'invincible/crunch.wav', vol: 0.7},
  {at: T_TANKS + 3.25, src: 'invincible/explosion.wav', vol: 1},
  // helicopters
  {at: T_HELI, src: 'invincible/rotor.wav', vol: 0.7, dur: 2.5},
  {at: T_HELI + 0.3, src: 'invincible/rocket.wav', vol: 0.7},
  {at: T_HELI + 0.75, src: 'invincible/explosion.wav', vol: 0.9},
  {at: T_HELI + 1.35, src: 'invincible/tear.wav', vol: 0.8},
  {at: T_HELI + 1.8, src: 'invincible/tear.wav', vol: 0.8},
  {at: T_HELI + 2.55, src: 'invincible/splash.wav', vol: 0.9},
  // the jet again
  {at: T_JET2, src: 'invincible/jet.wav', vol: 0.9, dur: JET_HIT + 0.02},
  {at: T_JET2 + JET_HIT, src: 'invincible/crunch.wav', vol: 1},
  {at: T_JET2 + JET_HIT, src: 'invincible/boom.wav', vol: 0.6},
  {at: T_JET2 + EJECT_AT, src: 'invincible/eject.wav', vol: 0.8},
  // war room
  {at: T_WAR, src: 'invincible/hum.wav', vol: 0.6},
  {at: T_WAR + 0.2, src: 'invincible/static.wav', vol: 0.5, dur: 1.1},
  {at: T_WAR + 1.4, src: 'invincible/thud.wav', vol: 0.8},
  {at: T_WAR + 1.9, src: 'invincible/thud.wav', vol: 1},
  {at: T_WAR + 2.35, src: 'invincible/doortear.wav', vol: 0.9},
  {at: LINE_AT, src: 'invincible/m-in-charge.mp3', vol: 1.3},
  // ending
  {at: T_END + 0.4, src: 'invincible/hit.wav', vol: 0.9},
];

export const ShortInvincible: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seq = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={F(from)} durationInFrames={F(to) - F(from)}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {seq(0, T_EARLIER, <ShotJet view="hook" />)}
      {seq(T_LAND, T_POLICE, <ShotLanding />)}
      {seq(T_POLICE, T_TANKS, <ShotPolice />)}
      {seq(T_TANKS, T_HELI, <ShotTanks />)}
      {seq(T_HELI, T_JET2, <ShotHeli />)}
      {seq(T_JET2, T_WAR, <ShotJet view="side" />)}
      {seq(T_WAR, T_END, <ShotWar />)}
      {seq(T_END, INV_FRAMES / INV_FPS, <ShotEnd />)}
      <Earlier frame={frame} />
      <HookCaption frame={frame} fps={fps} />
      <Captions cues={CUES} frame={frame} fps={fps} />
      <EndPanels frame={frame} fps={fps} />
      <div style={{position: 'absolute', top: -330, left: 0, right: 0, bottom: 0}}>
        <CommentButton frame={frame} fps={fps} from={F(T_END + 0.8)} to={INV_FRAMES} />
      </div>
      {SOUNDS.map((s, i) => (
        <Sequence key={i} from={F(s.at)} durationInFrames={s.dur ? F(s.dur) : undefined}>
          <Audio src={staticFile(s.src)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
