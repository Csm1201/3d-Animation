/**
 * "You're the Ref" — Episode 3 ("kick-off goal"), rebuilt in 3D (40.8 s, 30 fps), same
 * timing, captions and audio as the original upload.
 *
 *   0.0  Hook: freeze-frame of the fat streaker blasting the penalty, beer in hand → top corner → GOAL?!
 *   2.0  Last episode: off the ref into the top corner
 *   3.6  Episode 2 answer card
 *   6.5  You gave it anyway (GOAL GIVEN)
 *   8.23 Because… funny (FUNNY INIT)
 *  10.2  0-1, blue kick off
 *  12.5  Their striker looks up
 *  13.9  Orange keeper scratching his backside
 *  16.8  He shoots straight from the kick-off
 *  18.8  GOAL! 1-1
 *  21.4  Full time
 *  23.6  Penalties
 *  24.9  First penalty
 *  26.2  STREAKER
 *  29.1  He grabs the ball
 *  30.6  Smashes it into the top corner, GOAL?!
 *  33.0  The whole stadium goes crazy
 *  35.3  Does it count? vote
 */
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CylinderGeometry, MeshBasicMaterial, MeshPhysicalMaterial, MeshStandardMaterial, PlaneGeometry, SphereGeometry, Vector3} from 'three';
import {HEIGHT, WIDTH} from '../../core/constants';
import {seededArray} from '../../core/random';
import {Pose} from '../../core/walkCycle';
import {BodySpec, idleSpec, keyedSpec, lerpSpec, runSpec} from '../../core/sportPoses';
import {DEG, to3} from '../../character3d/common';
import {Cam} from '../../character3d/stage';
import {Look, Style} from '../../character3d/Worker3D';
import {
  Actor,
  armsUp,
  CALM,
  CardBackdrop,
  DETERMINED,
  FOLD,
  JOY,
  KICK_BACK,
  KICK_FOLLOW,
  KICK_HIT,
  KICK_SETTLE,
  POINT,
  runAlong,
  Scene,
  shake,
  Shot11 as Ep2TopCorner,
  ST,
  THINK,
} from './Episode2';
import {EndingCfg, EndingOverlay} from './Ending';
import {AnswerCard, Badge, Captions, Cue, FONT, GoalSlam, Scoreboard, Tag} from './Overlays';
import {Ball, BALL_R, kitStyle, PathFn, yawFor} from './Players';

export const EP3_FPS = 30;
export const EP3_FRAMES = 1224; // 40.8 s
const F = (s: number) => Math.round(s * EP3_FPS);

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const clampO = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------------------------------------------------------------- cast
export const STREAKER: Style = {
  outfit: 'kit',
  skin: '#f6c7a8',
  hair: '#d9a35a',
  hairStyle: 'wild',
  kit: {shirt: '#f6c7a8', shorts: '#fbfbf7', socks: '#f6c7a8', trim: '#f6c7a8', bare: true, fat: true},
};
export const STEWARD: Style = {
  outfit: 'kit',
  skin: '#8d5a3c',
  hair: '#151110',
  hairStyle: 'buzz',
  kit: {shirt: '#d8ff2e', shorts: '#1d2030', socks: '#1d2030', trim: '#1d2030', longSleeves: true},
};
export const STEWARD2: Style = {...STEWARD, skin: '#f1c3a0', hair: '#5a3a2c', hairStyle: 'short'};
export const B9 = kitStyle('blue', 9, '#c98f6b', '#1f1714', 'short');
export const B10 = kitStyle('blue', 10, '#f1c3a0', '#3a2a22', 'short');
export const BLUES = [kitStyle('blue', 2, '#f1c3a0', '#c47a3a'), kitStyle('blue', 6, '#8d5a3c', '#1f1714', 'buzz'), kitStyle('blue', 8, '#e8b48f', '#3a2a22'), B10, B9];
export const ORANGES = [ST.seven, ST.nine, ST.ten, ST.eleven, kitStyle('orange', 4, '#c98f6b', '#151110', 'buzz')];
export const KEEPER = ST.pinkKeeper;

export const BEERY: Look = {tired: 0.15, droop: -6, eyesClosed: false, brows: 0.5, browLift: 0.7, mouth: 'grin', noBlink: true};
export const ROAR = (t: number): Look => ({tired: 0, droop: -10, eyesClosed: false, brows: 0.6, browLift: 0.8, mouth: 'open', mouthOpen: 0.75 + 0.2 * Math.sin(t * 14), noBlink: true, pupils: 0.85});

// ---------------------------------------------------------------- the pint (held in the far hand)
const glassGeo = new CylinderGeometry(0.048, 0.04, 0.16, 20, 1, true);
const beerGeo = new CylinderGeometry(0.044, 0.037, 0.13, 20);
const foamGeo = new CylinderGeometry(0.047, 0.045, 0.03, 20);
const dropGeo = new SphereGeometry(1, 8, 6);
const glassMat = new MeshPhysicalMaterial({color: '#ffffff', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.35, clearcoat: 1});
const beerMat = new MeshStandardMaterial({color: '#e8a21c', roughness: 0.25, emissive: '#5a3100', emissiveIntensity: 0.25});
const foamMat = new MeshStandardMaterial({color: '#fff8e6', roughness: 0.8});
const dropMat = new MeshStandardMaterial({color: '#f3b53a', roughness: 0.3, transparent: true, opacity: 0.85});

const handLocal = (pose: Pose, far: boolean) => {
  const z = far ? -0.27 : 0.27;
  const e = to3(pose[far ? 'farArm' : 'nearArm'].elbow, z);
  const w = to3(pose[far ? 'farArm' : 'nearArm'].wrist, z);
  const dir = w.clone().sub(e).normalize();
  return w.clone().addScaledVector(dir, 0.045);
};

const SPRAY = seededArray(808, 40, (r) => ({vx: (r() - 0.5) * 1.6, vy: 0.8 + r() * 2.2, vz: (r() - 0.5) * 1.6, s: 0.008 + r() * 0.012, d: r() * 0.5}));

/** A pint in the far hand; `spray` 0..1 flings beer out of it (looping droplets). */
export const Pint: React.FC<{pose: Pose; t: number; spray?: number; level?: number}> = ({pose, t, spray = 0, level = 1}) => {
  const h = handLocal(pose, true);
  const top = v3(h.x, h.y + 0.1, h.z);
  return (
    <group>
      <group position={[h.x, h.y + 0.03, h.z]}>
        <mesh geometry={beerGeo} material={beerMat} position={[0, -0.015 - (1 - level) * 0.05, 0]} scale={[1, Math.max(0.15, level), 1]} />
        <mesh geometry={foamGeo} material={foamMat} position={[0, 0.06 - (1 - level) * 0.1, 0]} />
        <mesh geometry={glassGeo} material={glassMat} />
      </group>
      {spray > 0
        ? SPRAY.map((d, i) => {
            const age = ((t + d.d) % 0.5) / 0.5;
            const tt = age * 0.5;
            return (
              <mesh
                key={i}
                geometry={dropGeo}
                material={dropMat}
                position={[top.x + d.vx * tt, top.y + d.vy * tt - 4.9 * tt * tt, top.z + d.vz * tt]}
                scale={d.s * spray * (1 - age * 0.5)}
              />
            );
          })
        : null}
    </group>
  );
};

export const Streaker: React.FC<{x: number; z: number; y?: number; yaw: number; spec: BodySpec; frame: number; t: number; look?: Look; spray?: number; roll?: number; pitch?: number}> = ({x, z, y = 0, yaw, spec, frame, t, look = BEERY, spray = 0, roll = 0, pitch = 0}) => (
  <Actor style={STREAKER} x={x} z={z} y={y} yaw={yaw} spec={spec} frame={frame} look={look} roll={roll} pitch={pitch}>
    {(pose) => <Pint pose={pose} t={t} spray={spray} level={1 - 0.35 * Math.min(1, spray * 1.5)} />}
  </Actor>
);

/** Streaker sprint: far arm keeps the pint high, near arm windmills. */
export const streakerRun = (s: BodySpec, t: number): BodySpec => ({
  ...s,
  nearArm: [150 + 25 * Math.sin(t * 16), 20 + 20 * Math.sin(t * 16)],
  farArm: [135 + 8 * Math.sin(t * 9), 60],
});

// ---------------------------------------------------------------- penalty geometry (+x goal)
export const SPOT = {x: 41.5, z: 0};
const CORNER = v3(52.45, 2.2, -3.2);
export const GOAL_X = 52.5;

/** Pink keeper dives (dir +1 toward -z, -1 toward +z). */
export const keeperDive = (t: number, dir: number, start = 0) => {
  const d = clamp01((t - start) / 0.45);
  const fall = clamp01((t - start - 0.5) / 0.4);
  const roll = dir * (lerp(0, 70, smooth(d)) + lerp(0, 16, smooth(fall)));
  const y = Math.sin(Math.PI * Math.min(1, d * 0.9)) * 0.7 * (1 - fall);
  const z = 0.2 - dir * smooth(d) * 1.4;
  const dive: BodySpec = {lean: 4, near: {thigh: 10, knee: 25}, far: {thigh: -6, knee: 45}, nearArm: [170, 6], farArm: [165, 10]};
  return {spec: lerpSpec(idleSpec(t * 30, 0.4), dive, smooth(clamp01(d * 2))), roll, y, z};
};

// ---------------------------------------------------------------- shared overlays
export const Onomatopoeia: React.FC<{text: string; t: number; top?: number}> = ({text, t, top = 300}) => {
  const pop = smooth(clamp01(t / 0.12));
  const wob = 1 + 0.04 * Math.sin(t * 40);
  const cx = 540;
  const cy = 760;
  const lines = Array.from({length: 40}, (_, i) => {
    const a = (i * Math.PI * 2) / 40 + (Math.floor(t * 20) % 2) * 0.05;
    return {x1: cx + Math.cos(a) * 520, y1: cy + Math.sin(a) * 620, x2: cx + Math.cos(a) * 1500, y2: cy + Math.sin(a) * 1700, w: 4 + (i % 3) * 5};
  });
  return (
    <AbsoluteFill>
      <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
        {lines.map((l, i) => (
          <line key={i} {...l} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={l.w} strokeLinecap="round" />
        ))}
      </svg>
      <div style={{position: 'absolute', top, left: 0, right: 0, textAlign: 'center', transform: `rotate(-10deg) scale(${(0.4 + 0.6 * pop) * wob})`}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 180, color: '#ffd23a', WebkitTextStroke: '20px #0d0f14', paintOrder: 'stroke fill', textShadow: '0 14px 30px rgba(0,0,0,.55)', letterSpacing: 2}}>{text}</span>
      </div>
    </AbsoluteFill>
  );
};

export const BigTitle: React.FC<{text: string; frame: number; fps: number; top: number; color?: string; stroke?: string; size?: number; rot?: number; left?: number}> = ({text, frame, fps, top, color = '#ffffff', stroke = '#0d0f14', size = 130, rot = -4, left}) => {
  const s = spring({frame, fps, config: {damping: 8, stiffness: 240}});
  return (
    <div style={{position: 'absolute', top, left: left ?? 0, right: left === undefined ? 0 : undefined, textAlign: left === undefined ? 'center' : 'left'}}>
      <span
        style={{
          display: 'inline-block',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: size,
          color,
          WebkitTextStroke: `${Math.round(size * 0.11)}px ${stroke}`,
          paintOrder: 'stroke fill',
          textShadow: '0 14px 34px rgba(0,0,0,.55)',
          transform: `rotate(${rot}deg) scale(${2.2 - 1.2 * s})`,
          transformOrigin: left === undefined ? 'center' : 'left center',
          opacity: Math.min(1, s * 2),
          letterSpacing: 1,
        }}
      >
        {text}
      </span>
    </div>
  );
};

// ================================================================ SHOT 1a — hook freeze-frame (0–1.0 s)
const HOOK_FREEZE = 1.0;
const Shot1a: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const push = smooth(clamp01(t / HOOK_FREEZE));
  const sx = SPOT.x - 0.45;
  const cam: Cam = {position: v3(lerp(44.4, 43.9, push), lerp(0.6, 0.7, push), lerp(3.4, 3.0, push)), target: v3(sx + 0.1, 1.0, 0.05), fov: 46};
  const strike: BodySpec = {...KICK_HIT, farArm: [140, 55], nearArm: [-40, 30]};
  return (
    <AbsoluteFill style={{transform: `rotate(${lerp(-4, -1.5, push)}deg) scale(1.06)`, filter: 'contrast(1.12) saturate(1.15)'}}>
      <Scene cam={cam} frame={from} centre={v3(sx, 0, 0)} extent={8} excite={1.2}>
        <Streaker x={sx} z={0} yaw={0} spec={strike} frame={from} t={0.21} look={ROAR(0.3)} spray={1} />
        <Ball pos={v3(SPOT.x + 0.08, BALL_R + 0.05, 0.12)} spin={0} axisYaw={0} squash={0.3} />
        <Actor style={B9} x={37.8} z={-2.6} yaw={yawFor(1, 0.4)} spec={{...idleSpec(from, 0.2), nearArm: [165, 150], farArm: [160, 150]}} frame={from} look={{...JOY, mouth: 'open', brows: 0.9}} />
      </Scene>
      <Onomatopoeia text="WHACK!" t={t} top={290} />
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 1b — top corner (1.0–1.5 s)
const Shot1b: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const u = clamp01(t / 0.32);
  const start = v3(SPOT.x + 0.3, 0.3, 0.1);
  const ball = t < 0.32 ? start.clone().lerp(CORNER, u).add(v3(0, Math.sin(Math.PI * u) * 0.4, 0)) : CORNER.clone().lerp(v3(54.2, 1.9, -3.0), clamp01((t - 0.32) / 0.2));
  const k = keeperDive(t, -1, 0.02); // dives the wrong way
  const cam: Cam = {position: v3(46.2, 1.5, 7.8).add(shake(t, t > 0.32 ? 0.02 : 0, 4)), target: v3(52, 1.4, -1.4), fov: 48};
  return (
    <Scene cam={cam} frame={from + f} centre={v3(50, 0, -1)} extent={10} excite={1.6}>
      <Actor style={KEEPER} x={51.6} z={k.z} y={k.y} yaw={Math.PI} spec={k.spec} frame={from + f} roll={k.roll} />
      <Ball pos={ball} spin={t * 40} axisYaw={yawFor(1, -0.3)} />
    </Scene>
  );
};

// ================================================================ SHOT 1c — GOAL?! he celebrates (1.5–2.0 s)
const Shot1c: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const spec = armsUp({...idleSpec(f, 0.2), lean: -6, lift: Math.max(0, Math.sin(t * 9)) * 60}, t, 1, 1.5);
  const cam: Cam = {position: v3(SPOT.x + 3.4 - t * 0.6, 1.1, 1.2), target: v3(SPOT.x, 1.4, 0), fov: 46};
  return (
    <Scene cam={cam} frame={from + f} centre={v3(SPOT.x, 0, 0)} extent={8} excite={2}>
      <Streaker x={SPOT.x - 0.3} z={0} yaw={yawFor(1, 0.3)} spec={spec} frame={from + f} t={t} look={ROAR(t)} spray={1} />
    </Scene>
  );
};

// ================================================================ SHOT 4 — but you gave it anyway (6.5–8.23 s)
const Shot4: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const point = smooth(clamp01((t - 0.15) / 0.35));
  const spec: BodySpec = {...idleSpec(fr, 0.3), lean: 4, nearArm: [lerp(0, 92, point), lerp(14, 2, point)], farArm: [lerp(0, -12, point), 20]};
  const cam: Cam = {position: v3(37.0 - t * 0.3, 1.35, 3.6), target: v3(39.6, 1.35, 1.4), fov: 44};
  return (
    <Scene cam={cam} frame={fr} centre={v3(40, 0, 1)} extent={8} excite={1.2}>
      <Actor style={ST.ref} x={40} z={1.4} yaw={yawFor(-1, 0.25)} spec={spec} frame={fr} look={{...CALM, mouth: t > 0.2 && t < 0.9 ? 'open' : 'flat', mouthOpen: 0.25, brows: -0.2}} />
      <Streaker x={44.5} z={-1.5} yaw={yawFor(-0.3, 1)} spec={armsUp({...idleSpec(fr, 0.6), lift: Math.max(0, Math.sin(t * 8)) * 50}, t, 1, 1.2)} frame={fr} t={t} look={ROAR(t)} />
    </Scene>
  );
};

// ================================================================ SHOT 5 — because… funny (8.23–10.2 s)
const Shot5: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const shrug = Math.max(0, Math.sin(Math.PI * clamp01((t - 1.05) / 0.5)));
  const spec: BodySpec = {...FOLD, lean: -5, headTilt: -8, lift: 0, nearArm: [-30 + shrug * 40, 32 + shrug * 50], farArm: [-26 + shrug * 40, 36 + shrug * 50]};
  const cam: Cam = {position: v3(1.9 - t * 0.15, 0.55, 0.9), target: v3(0, 1.45, 0), fov: 50};
  return (
    <AbsoluteFill style={{transform: 'rotate(-6deg) scale(1.12)'}}>
      <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={6} excite={0.8}>
        <Actor style={ST.ref} x={0} z={0} yaw={yawFor(1, 0.4)} spec={spec} frame={fr} look={{tired: 0.3, droop: -4, eyesClosed: false, brows: -0.3, browLift: 0.4, mouth: 'smile', roll: -6 + shrug * 4, noBlink: true}} />
      </Scene>
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 6 — 0-1, blue kick off (10.2–12.5 s)
const FIELD = seededArray(303, 8, (r, i) => ({team: i < 4 ? 'o' : 'b', x: i < 4 ? 6 + r() * 16 : -6 - r() * 14, z: (r() - 0.5) * 36, sway: r() * 6}));

const Shot6: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const tap = 1.7;
  const ball = t < tap ? v3(0, BALL_R, 0) : v3(-Math.min(1.2, (t - tap) * 3), BALL_R, 0.9 * Math.min(1, (t - tap) * 2.5));
  const tenSpec = t < tap - 0.3 ? idleSpec(fr, 0.4) : keyedSpec([[tap - 0.3, idleSpec(fr, 0.4)], [tap - 0.1, KICK_BACK], [tap, KICK_HIT], [tap + 0.3, KICK_SETTLE]], t);
  const cam: Cam = {position: v3(-15 + t * 1.2, 9.5 - t * 0.6, 17), target: v3(2, 0, -1), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={22} excite={0.7}>
      <Actor style={B10} x={0.45} z={-0.35} yaw={yawFor(-1, 0.6)} spec={tenSpec} frame={fr} />
      <Actor style={B9} x={-1.4} z={0.9} yaw={yawFor(1, -0.2)} spec={idleSpec(fr, 1.2)} frame={fr} />
      {FIELD.map((p, i) => (
        <Actor key={i} style={p.team === 'o' ? ORANGES[i % 5] : BLUES[i % 4]} x={p.x} z={p.z} yaw={p.team === 'o' ? Math.PI : 0} spec={idleSpec(fr, p.sway)} frame={fr} />
      ))}
      <Actor style={ST.ref} x={-5} z={7.5} yaw={yawFor(0.5, -1)} spec={idleSpec(fr, 2)} frame={fr} look={CALM} />
      <Ball pos={ball} spin={t > tap ? (t - tap) * 20 : 0} axisYaw={yawFor(-1, 0.6)} />
    </Scene>
  );
};

// ================================================================ SHOT 7 — their striker looks up (12.5–13.9 s)
const Shot7: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const spec: BodySpec = {lean: 6, headTilt: -2, near: {thigh: 24, knee: 34, foot: 12}, far: {thigh: -4, knee: 10}, nearArm: [-20, 30], farArm: [25, 30]};
  const up = smooth(clamp01((t - 0.25) / 0.4));
  const cam: Cam = {position: v3(2.6 - t * 0.35, 1.05, 1.4 - t * 0.1), target: v3(-1.0, 1.25, 0.9), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(-1, 0, 1)} extent={6} excite={0.7}>
      <Actor style={B9} x={-1.2} z={0.9} yaw={yawFor(1, 0.05)} spec={spec} frame={fr} look={{...DETERMINED, droop: lerp(4, -12, up), brows: -0.7, mouth: up > 0.5 ? 'grin' : 'flat', pupils: 0.9}} />
      <Ball pos={v3(-0.78, BALL_R, 1.0)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 8 — keeper scratching his backside (13.9–16.8 s)
// hand round the back on his bum, scratching up and down
const scratchSpec = (t: number, fr: number): BodySpec => ({
  ...idleSpec(fr, 0.4),
  lean: 11,
  headTilt: 4,
  nearArm: [-24 + 4 * Math.sin(t * 26), 8 + 16 * Math.sin(t * 26 + 0.6)],
  farArm: [6, 16],
});
// turned three-quarters away so we see his face in profile and his hand on his bum
const SCRATCH_YAW = -0.6;
const SCRATCH_HZ = 0.12;
const Shot8: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const yawn = t > 1.6 && t < 2.3 ? Math.sin(Math.PI * (t - 1.6) / 0.7) : 0;
  const cam: Cam = {position: v3(47.6 + t * 0.25, 1.35, 2.3 - t * 0.15), target: v3(51.6, 1.05, 0.3), fov: 44};
  return (
    <AbsoluteFill>
      <Scene cam={cam} frame={fr} centre={v3(51, 0, 0)} extent={8} excite={0.6}>
        <Actor style={{...KEEPER, nearHandZ: SCRATCH_HZ}} x={51.6} z={0.3} yaw={SCRATCH_YAW} spec={scratchSpec(t, fr)} frame={fr} look={{tired: 0.65, droop: 4, eyesClosed: yawn > 0.6, brows: 0.1, mouth: yawn > 0.1 ? 'open' : 'flat', mouthOpen: 0.9 * yawn, roll: 6, noBlink: true}} />
      </Scene>
      <Scratch t={t} />
    </AbsoluteFill>
  );
};
const Scratch: React.FC<{t: number}> = ({t}) => {
  const k = Math.floor(t / 0.45);
  const local = t - k * 0.45;
  const s = smooth(clamp01(local / 0.08)) * (1 - clamp01((local - 0.3) / 0.15));
  const pos = [
    [700, 880],
    [760, 830],
    [690, 930],
    [740, 860],
  ][k % 4];
  return (
    <div style={{position: 'absolute', left: pos[0], top: pos[1], transform: `rotate(${k % 2 ? 8 : -6}deg) scale(${0.7 + 0.3 * s})`, opacity: s, fontFamily: FONT, fontWeight: 900, fontStyle: 'italic', fontSize: 52, color: '#fff', WebkitTextStroke: '8px #0d0f14', paintOrder: 'stroke fill'}}>
      *SCRATCH*
    </div>
  );
};

// ================================================================ SHOTS 9 + 10 — from the kick-off, GOAL! (16.8–21.4 s)
const KICKOFF_T = 17.15; // global seconds the ball is struck
const LAND_T = 19.3;
const LOB_START = v3(-0.5, BALL_R, 0.9);
const LOB_END = v3(GOAL_X + 0.2, 1.9, -0.4);
const lobAt = (T: number): Vector3 => {
  const dt = T - KICKOFF_T;
  const dur = LAND_T - KICKOFF_T;
  if (dt <= 0) return LOB_START.clone();
  if (dt <= dur) {
    const u = dt / dur;
    const vy = (LOB_END.y - LOB_START.y + 4.9 * dur * dur) / dur;
    return v3(lerp(LOB_START.x, LOB_END.x, u), LOB_START.y + vy * dt - 4.9 * dt * dt, lerp(LOB_START.z, LOB_END.z, u));
  }
  const a = dt - dur;
  return v3(Math.min(54.1, LOB_END.x + a * 6), Math.max(BALL_R, LOB_END.y - 4.9 * a * a * 2), LOB_END.z);
};

const Shot9: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const T = 16.8 + t;
  const k = KICKOFF_T - 16.8;
  const spec = keyedSpec([[0, idleSpec(fr, 1)], [k - 0.25, KICK_BACK], [k, KICK_HIT], [k + 0.25, KICK_FOLLOW], [2.0, KICK_SETTLE]], t);
  const ball = lobAt(T);
  const follow = smooth(clamp01((t - k) / 1.2));
  const cam: Cam = {position: v3(-7.5 + follow * 3, 2.0 + follow * 1.5, 3.4), target: v3(lerp(3, ball.x - 6, follow), lerp(1.2, ball.y * 0.8, follow), lerp(0.5, 0, follow)), fov: lerp(46, 56, follow)};
  return (
    <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={14} excite={0.8 + follow}>
      <Actor style={B9} x={-1.2} z={0.9} yaw={yawFor(1, -0.02)} spec={spec} frame={fr} />
      {FIELD.slice(0, 4).map((p, i) => (
        <Actor key={i} style={ORANGES[i % 5]} x={p.x} z={p.z} yaw={yawFor(lerp(-1, 1, follow), 0.1)} spec={idleSpec(fr, p.sway)} frame={fr} look={{...CALM, droop: -10 * follow, browLift: follow}} />
      ))}
      <Actor style={B10} x={0.6} z={-0.6} yaw={yawFor(1, 0)} spec={idleSpec(fr, 0.4)} frame={fr} />
      <Ball pos={ball} spin={t * 25} axisYaw={0} />
    </Scene>
  );
};

const Shot10: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const T = 18.8 + t;
  const ball = lobAt(T);
  // keeper: still scratching, spots it, scrambles backwards and flops into the net
  const panic = smooth(clamp01((t - 0.05) / 0.25));
  const back = smooth(clamp01((t - 0.15) / 0.5));
  const flop = smooth(clamp01((t - 0.55) / 0.4));
  const reach: BodySpec = {lean: -14, headTilt: -14, near: {thigh: -14, knee: 20}, far: {thigh: 12, knee: 24}, nearArm: [170, 8], farArm: [160, 14]};
  const spec = lerpSpec(scratchSpec(t, fr), reach, panic);
  const cam: Cam = {position: v3(44.5 + t * 0.4, 1.05, 6.2), target: v3(52.2, 1.6, -0.6), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(50, 0, 0)} extent={10} excite={T > LAND_T ? 1.8 : 1}>
      <Actor style={KEEPER} x={51.6 + back * 0.8} z={0.3} yaw={Math.PI} spec={spec} frame={fr} pitch={flop * 55} y={flop * 0.1} look={{tired: 0, droop: -14, eyesClosed: false, brows: 0.9, browLift: 0.9, mouth: 'open', mouthOpen: 0.8, pupils: 0.5, noBlink: true}} />
      <Actor style={B9} x={42} z={3.5} yaw={0} spec={runSpec((t * 1.6) % 1, 0.7)} frame={fr} />
      <Ball pos={ball} spin={t * 25} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOTS 11 + 12 — full time line-up, penalties (21.4–24.9 s)
const LINE = [...BLUES.map((s, i) => ({s, x: -6.2 + i * 1.15})), ...ORANGES.map((s, i) => ({s, x: 1.6 + i * 1.15}))];
const LineUp: React.FC<{fr: number; t: number}> = ({fr, t}) => (
  <>
    {LINE.map((p, i) => (
      <Actor key={i} style={p.s} x={p.x} z={0} yaw={yawFor(0, 1)} spec={{...idleSpec(fr, i * 0.7), nearArm: [-2 + Math.sin(t * 2 + i) * 3, 14], farArm: [4, 14]}} frame={fr} look={{...CALM, droop: 2, brows: i < 5 ? 0.4 : -0.3}} />
    ))}
  </>
);

const ShotFullTime: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const blow = smooth(clamp01((t - 0.2) / 0.3));
  const spec: BodySpec = {...idleSpec(fr, 0.3), lean: -3, headTilt: -6, nearArm: [lerp(0, 172, blow), lerp(14, 4, blow)], farArm: [lerp(0, 120, blow), lerp(14, 150, blow)]};
  const cam: Cam = {position: v3(1.6, 1.5, 9.5 - t * 0.5), target: v3(0.2, 1.4, 0), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(0, 0, 2)} extent={10} excite={1}>
      <LineUp fr={fr} t={t} />
      <Actor style={ST.ref} x={0.6} z={4.6} yaw={yawFor(0.2, 1)} spec={spec} frame={fr} look={{...CALM, mouth: 'open', mouthOpen: 0.2, brows: 0.2, eyesClosed: t > 0.45 && t < 1.4}} />
    </Scene>
  );
};

const Shot12: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const cam: Cam = {position: v3(-8 + t * 3.2, 1.25, 4.2), target: v3(-3 + t * 3.4, 1.15, 0), fov: 50};
  return (
    <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={10} excite={1.2}>
      <LineUp fr={fr} t={t} />
    </Scene>
  );
};

// ================================================================ SHOT 13 — first penalty (24.9–26.2 s)
const Shot13: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const nine = runAlong((tt) => ({x: 40.9 - 1.3 * smooth(clamp01(tt / 1.1)), z: 0.4}), t, 0.35, 0, {x: GOAL_X, z: 0});
  const cam: Cam = {position: v3(36.0 + t * 0.4, 1.75, 1.0), target: v3(51, 0.95, -0.1), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 0)} extent={12} excite={0.9}>
      <Actor style={B9} x={nine.pos.x} z={nine.pos.z} yaw={nine.yaw} spec={nine.spec} frame={fr} />
      <Actor style={KEEPER} x={52.1} z={0.2} yaw={Math.PI} spec={runSpec((t * 1.8) % 1, 0.25)} frame={fr} />
      <Actor style={ST.ref} x={44} z={3.8} yaw={yawFor(-1, -0.4)} spec={idleSpec(fr, 0.5)} frame={fr} look={CALM} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 14 — STREAKER (26.2–29.1 s)
const streakerPath: PathFn = (t) => {
  const u = clamp01(t / 2.95);
  const e = 1 - (1 - u) * (1 - u) * 0.25;
  return {x: lerp(37, SPOT.x - 0.55, u * e), z: lerp(11, SPOT.z + 0.35, u * e) + Math.sin(u * Math.PI) * 1.0};
};
const stewardPath: PathFn = (t) => {
  const tt = Math.max(0, t - 0.9);
  return {x: 34.5 + 2.6 * tt, z: 15 - 4.2 * tt};
};

const Shot14: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const st = runAlong(streakerPath, t, 0.75, 0.1);
  const grabSpec: BodySpec = {lean: 34, headTilt: 10, near: {thigh: 30, knee: 70}, far: {thigh: -20, knee: 40}, nearArm: [70, 10], farArm: [110, 70]};
  const runSpecN = streakerRun(st.spec, t);
  const sSpec = t > 2.55 ? keyedSpec([[2.55, runSpecN], [2.9, grabSpec]], t) : runSpecN;
  const sw = t > 0.9 ? runAlong(stewardPath, t, 0.9, 0.4) : null;
  const sp = streakerPath(t);
  const refTurn = smooth(clamp01((t - 0.3) / 0.6));
  const refYaw = lerp(yawFor(-1, -0.4), yawFor(sp.x - 44, sp.z - 3.8), refTurn);
  const refSpec: BodySpec = {...idleSpec(fr, 0.5), nearArm: [lerp(0, 75, refTurn), lerp(14, 20, refTurn)], farArm: [lerp(0, 60, refTurn), 20]};
  const nine = smooth(clamp01((t - 1.0) / 0.4));
  const nineSpec: BodySpec = {...idleSpec(fr, 0.2), lean: lerp(2, -6, nine), nearArm: [lerp(-4, 165, nine), lerp(14, 150, nine)], farArm: [lerp(5, 160, nine), lerp(14, 150, nine)]};
  const nineYaw = lerp(0, yawFor(sp.x - 39.4, sp.z - 0.9), smooth(clamp01((t - 0.6) / 0.6)));
  const keeperSpec = runSpec((t * 1.8) % 1, 0.25 * (1 - smooth(clamp01((t - 1) / 0.4))));
  const follow = smooth(clamp01(t / 2.9));
  const cam: Cam = {
    position: v3(lerp(30.5, 32, follow), lerp(2.6, 2.9, follow), lerp(13.5, 11.5, follow)),
    target: v3(lerp(sp.x, SPOT.x, lerp(0.25, 0.5, follow)), 0.9, lerp(sp.z, SPOT.z, lerp(0.25, 0.5, follow))),
    fov: 58,
  };
  return (
    <Scene cam={cam} frame={fr} centre={v3(sp.x + 2, 0, sp.z * 0.6)} extent={18} excite={1.4}>
      <Streaker x={sp.x} z={sp.z} yaw={st.yaw} spec={sSpec} frame={fr} t={t} look={ROAR(t)} spray={t < 2.5 ? 0.6 : 0} />
      {sw ? <Actor style={STEWARD} x={sw.pos.x} z={sw.pos.z} yaw={sw.yaw} spec={sw.spec} frame={fr} look={{...CALM, brows: -0.8, mouth: 'open', mouthOpen: 0.4}} /> : null}
      <Actor style={ST.ref} x={44} z={3.8} yaw={refYaw} spec={refSpec} frame={fr} look={{...CALM, brows: -0.6, browLift: 0.5, mouth: 'open', mouthOpen: 0.35}} />
      <Actor style={B9} x={39.4} z={0.9} yaw={nineYaw} spec={nineSpec} frame={fr} look={{...JOY, mouth: 'open', mouthOpen: 0.5, brows: 0.8}} />
      <Actor style={KEEPER} x={52.1} z={0.2} yaw={Math.PI} spec={keeperSpec} frame={fr} look={{...CALM, browLift: 0.6}} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 15 — he grabs the ball (29.1–30.6 s)
const Shot15: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const grab: BodySpec = {lean: 34, headTilt: 10, near: {thigh: 30, knee: 70}, far: {thigh: -20, knee: 40}, nearArm: [70, 10], farArm: [110, 70]};
  const hold: BodySpec = {...idleSpec(fr, 0.3), lean: -4, nearArm: [158, 18], farArm: [120, 70]};
  const place: BodySpec = {lean: 30, headTilt: 8, near: {thigh: 26, knee: 60}, far: {thigh: -16, knee: 36}, nearArm: [60, 8], farArm: [115, 70]};
  const spec = keyedSpec([[0, grab], [0.45, hold], [0.95, hold], [1.25, place], [1.5, {...hold, nearArm: [10, 20]}]], t);
  const sx = SPOT.x - 0.5;
  let ball = v3(SPOT.x, BALL_R, SPOT.z);
  let held = false;
  if (t > 0.08 && t < 1.25) held = true;
  else if (t >= 1.25) ball = v3(SPOT.x, BALL_R, SPOT.z);
  const protest = smooth(clamp01((t - 0.3) / 0.3));
  const cam: Cam = {position: v3(43.6 - t * 0.3, 1.35, 2.7), target: v3(sx + 0.3, 1.05, 0.2), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(sx, 0, 0)} extent={8} excite={1.5}>
      <Actor style={STREAKER} x={sx} z={0.1} yaw={yawFor(1, 0.15)} spec={spec} frame={fr} look={BEERY}>
        {(pose) => (
          <>
            <Pint pose={pose} t={t} />
            {held ? <Ball pos={(() => {
              const h = handLocal(pose, false);
              return v3(h.x + 0.05, h.y + 0.1, h.z);
            })()} spin={0} axisYaw={0} /> : null}
          </>
        )}
      </Actor>
      {!held ? <Ball pos={ball} spin={0} axisYaw={0} /> : null}
      <Actor style={B9} x={38.6} z={-1.6} yaw={yawFor(1, 0.5)} spec={{...idleSpec(fr, 0.2), lean: 6, nearArm: [lerp(0, 70, protest), lerp(14, 30, protest)], farArm: [lerp(0, 60, protest), 40]}} frame={fr} look={{...CALM, brows: -1, mouth: 'open', mouthOpen: 0.5 + 0.3 * Math.sin(t * 10)}} />
    </Scene>
  );
};

// ================================================================ SHOT 16 — smashes it into the top corner (30.6–33.0 s)
const Shot16: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const kickT = 0.6;
  const run = runAlong((tt) => ({x: 39.6 + 1.6 * smooth(clamp01(tt / 0.6)), z: 0.35}), Math.min(t, 0.4), 0.6, 0.2);
  const spec = keyedSpec([[0.3, run.spec], [kickT - 0.15, {...KICK_BACK, farArm: [130, 60]}], [kickT, {...KICK_HIT, farArm: [135, 60]}], [kickT + 0.25, {...KICK_FOLLOW, farArm: [140, 60]}], [1.0, armsUp(idleSpec(fr, 0.2), t, 1, 1.5)]], t);
  const sx = 39.6 + 1.6 * smooth(clamp01(Math.min(t, 0.6) / 0.6)) - 0.45;
  const fly = 0.33;
  let ball: Vector3;
  if (t < kickT) ball = v3(SPOT.x, BALL_R, SPOT.z);
  else if (t < kickT + fly) {
    const u = (t - kickT) / fly;
    ball = v3(lerp(SPOT.x, CORNER.x, u), lerp(BALL_R, CORNER.y, u) + Math.sin(Math.PI * u) * 0.3, lerp(SPOT.z, CORNER.z, u));
  } else ball = CORNER.clone().lerp(v3(54.2, 1.9, -3.0), clamp01((t - kickT - fly) / 0.2)).setY(Math.max(BALL_R, 1.95 - 4.9 * Math.max(0, t - kickT - fly - 0.2) ** 2));
  const k = keeperDive(t, -1, kickT - 0.05); // the wrong way
  const netShake = t > kickT + fly && t < kickT + fly + 0.4 ? Math.sin((t - kickT - fly) * 60) * 0.02 : 0;
  const cam: Cam = {position: v3(36.4 + t * 0.3, 1.8 + netShake, 1.2), target: v3(51.5, 1.2, -0.5), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 0)} extent={12} excite={t > kickT + fly ? 2 : 1.2}>
      <Streaker x={sx} z={0.35} yaw={0} spec={spec} frame={fr} t={t} look={t > kickT + 0.3 ? ROAR(t) : BEERY} spray={t > kickT - 0.1 && t < kickT + 0.3 ? 1 : t > 1 ? 0.8 : 0} />
      <Actor style={KEEPER} x={51.9} z={k.z} y={k.y} yaw={Math.PI} spec={k.spec} frame={fr} roll={k.roll} />
      <Actor style={B9} x={39.0} z={-2.4} yaw={yawFor(1, 0.5)} spec={{...idleSpec(fr, 0.2), nearArm: [165, 150], farArm: [160, 150]}} frame={fr} look={{...JOY, brows: 0.9, mouth: 'open', mouthOpen: 0.6}} />
      <Ball pos={ball} spin={t * 30} axisYaw={yawFor(1, -0.3)} />
    </Scene>
  );
};

// ================================================================ SHOT 17 — the whole stadium goes crazy (33.0–35.3 s)
const CONFETTI = seededArray(1717, 90, (r) => ({x: 40 + r() * 14, z: -8 + r() * 16, y0: 4 + r() * 6, c: r() < 0.5 ? '#ff7a1a' : r() < 0.7 ? '#2f6df0' : '#ffffff', spin: r() * 6, sp: 0.6 + r() * 0.8}));
const confettiGeo = new PlaneGeometry(0.09, 0.06);
const Shot17: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const path: PathFn = (tt) => ({x: 45 - 2.6 * tt, z: -1 + 2.8 * tt});
  const st = runAlong(path, t, 0.55, 0.1);
  const spec = armsUp(st.spec, t * 1.4, 1, 1.6);
  const sp = path(t);
  const sw1 = runAlong((tt) => ({x: 50 - 3.4 * tt, z: -6 + 3.8 * tt}), t, 0.9, 0.3);
  const sw2 = runAlong((tt) => ({x: 49 - 2.9 * tt, z: 4.5 + 1.8 * tt}), t, 0.9, 0.7);
  const cam: Cam = {position: v3(sp.x - 4.2, 1.3, sp.z + 3.2), target: v3(sp.x + 0.4, 1.35, sp.z - 0.2), fov: 48};
  const mats = useMemo(() => ({o: new MeshBasicMaterial({color: '#ff7a1a', side: 2}), b: new MeshBasicMaterial({color: '#2f6df0', side: 2}), w: new MeshBasicMaterial({color: '#ffffff', side: 2})}), []);
  return (
    <AbsoluteFill>
      <Scene cam={cam} frame={fr} centre={v3(sp.x, 0, sp.z)} extent={10} excite={2.4}>
        <Streaker x={sp.x} z={sp.z} yaw={st.yaw} spec={spec} frame={fr} t={t} look={ROAR(t)} spray={1} />
        <Actor style={STEWARD} x={sw1.pos.x} z={sw1.pos.z} yaw={sw1.yaw} spec={sw1.spec} frame={fr} look={{...CALM, brows: -0.8, mouth: 'open', mouthOpen: 0.4}} />
        <Actor style={STEWARD2} x={sw2.pos.x} z={sw2.pos.z} yaw={sw2.yaw} spec={sw2.spec} frame={fr} look={{...CALM, brows: -0.8, mouth: 'open', mouthOpen: 0.4}} />
        <Actor style={B9} x={sp.x + 3.6} z={sp.z - 3.2} yaw={yawFor(-1, 0.6)} spec={{...idleSpec(fr, 0.2), nearArm: [165, 150], farArm: [160, 150]}} frame={fr} look={{...CALM, brows: 1, mouth: 'open', mouthOpen: 0.6}} />
        {CONFETTI.map((c, i) => {
          const y = c.y0 - ((t * c.sp + i * 0.37) % 1) * 6;
          return <mesh key={i} geometry={confettiGeo} material={c.c === '#ff7a1a' ? mats.o : c.c === '#2f6df0' ? mats.b : mats.w} position={[sp.x - 4 + (c.x - 40) * 0.6, y, sp.z - 3 + c.z * 0.4]} rotation={[t * c.spin, t * c.spin * 0.7, 0]} />;
        })}
      </Scene>
      <PhoneFlashes t={t} />
    </AbsoluteFill>
  );
};

const FLASHES = seededArray(4141, 26, (r) => ({x: r() * 1080, y: 380 + r() * 520, p: r() * 2, s: 6 + r() * 10}));
const PhoneFlashes: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen'}}>
    {FLASHES.map((f, i) => {
      const k = ((t * 1.7 + f.p) % 1);
      const o = k < 0.08 ? 1 - k / 0.08 : 0;
      return <div key={i} style={{position: 'absolute', left: f.x, top: f.y, width: f.s * 4, height: f.s * 4, marginLeft: -f.s * 2, marginTop: -f.s * 2, borderRadius: '50%', background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,.6) 30%, rgba(255,255,255,0) 70%)', opacity: o}} />;
    })}
  </AbsoluteFill>
);

// ================================================================ SHOT 18 — does it count? vote (35.3–40.8 s)
const EP3_ENDING: EndingCfg = {
  a: {title: 'GOAL', sub: 'it counts'},
  b: {title: 'NO GOAL', sub: "fans can't score"},
  commentAt: 2.9,
  nextAt: 4.75,
  nextLabel: 'ANSWER IN EPISODE 4',
  nextEp: 4,
  comments: [
    {user: 'pint_and_a_pie', text: 'A. Best penalty I have ever seen', pick: 'A', likes: 642},
    {user: 'laws_of_the_game', text: 'B. Outside agent. Retake the pen', pick: 'B', likes: 518},
    {user: 'orange_army', text: 'Sign him up. Immediately.', pick: '?', likes: 903},
    {user: 'blu_til_i_die', text: "B obviously, he's in his pants", pick: 'B', likes: 377},
    {user: 'sunday_league_ref', text: "A. Ref gave it, ref's call", pick: 'A', likes: 211},
  ],
};

const ShotVote3: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP3_FPS;
  const fr = from + f;
  const C = EP3_ENDING;
  const spec = keyedSpec(
    [
      [0, {...idleSpec(fr, 0.3), nearArm: [-4, 14], farArm: [5, 14]}],
      [0.4, THINK],
      [C.commentAt - 0.1, {...THINK, nearArm: [154, 150]}],
      [C.commentAt + 0.2, POINT],
      [C.nextAt - 0.1, {...POINT, nearArm: [92, 2]}],
      [C.nextAt + 0.3, {...FOLD, nearArm: [-30, 32], farArm: [-26, 36]}],
      [5.5, {...FOLD, nearArm: [-30, 32], farArm: [-26, 36]}],
    ],
    t,
  );
  const look: Look =
    t < C.commentAt
      ? {tired: 0, droop: -4, eyesClosed: false, yaw: 12, brows: 0.5, browLift: 0.4, mouth: 'flat', noBlink: true, pupils: 0.9}
      : t < C.nextAt
        ? {tired: 0, droop: 0, eyesClosed: false, brows: -0.2, browLift: 0.5, mouth: 'open', mouthOpen: 0.25 + 0.25 * Math.abs(Math.sin(t * 8)), noBlink: true}
        : {tired: 0, droop: 2, eyesClosed: false, brows: -0.4, browLift: 0.1, mouth: 'smile', roll: 5, noBlink: true};
  const push = smooth(clamp01(t / 5.5));
  const punch = t > C.commentAt ? Math.exp(-(t - C.commentAt) * 6) * 0.25 : 0;
  const cam: Cam = {position: v3(3.0 - push * 0.5 - punch, 1.55, 0.8 - push * 0.4), target: v3(0, 1.68, 0.05), fov: 42};
  // in the background the streaker is marched off between two stewards, still waving his pint
  const walk = (tt: number) => ({x: -7 - 0.9 * tt, z: -3.5 + 1.6 * tt});
  const s = runAlong(walk, t, 0.35, 0.1);
  const w1 = runAlong((tt) => ({x: walk(tt).x, z: walk(tt).z - 0.8}), t, 0.35, 0.6);
  const w2 = runAlong((tt) => ({x: walk(tt).x, z: walk(tt).z + 0.8}), t, 0.35, 0.35);
  return (
    <>
      <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={12} excite={1.1}>
        <Actor style={ST.ref} x={0} z={0} yaw={yawFor(1, 0.12)} spec={spec} frame={fr} look={look} />
        <Streaker x={s.pos.x} z={s.pos.z} yaw={s.yaw} spec={{...s.spec, farArm: [150 + 10 * Math.sin(t * 6), 50]}} frame={fr} t={t} look={BEERY} />
        <Actor style={STEWARD} x={w1.pos.x} z={w1.pos.z} yaw={w1.yaw} spec={w1.spec} frame={fr} look={CALM} />
        <Actor style={STEWARD2} x={w2.pos.x} z={w2.pos.z} yaw={w2.yaw} spec={w2.spec} frame={fr} look={CALM} />
      </Scene>
      <EndingOverlay frame={f} fps={EP3_FPS} cfg={EP3_ENDING} />
    </>
  );
};

// ================================================================ captions + timeline
const C = {orange: '#ff8a2a', blue: '#5a95ff', red: '#ff4d4d', green: '#45e070', yellow: '#ffd23a'};
const CUES: Cue[] = [
  {from: 0, to: F(2.0), text: 'A FAN TOOK THE PENALTY?!', hl: {FAN: C.yellow}},
  {from: F(2.0), to: F(3.65), text: 'IF YOU SAID NO GOAL…', hl: {NO: C.green, 'GOAL…': C.green}},
  {from: F(3.65), to: F(6.5), text: 'YOU WERE RIGHT. IT SHOULD HAVE BEEN A DROPPED BALL.', hl: {RIGHT: C.green, DROPPED: C.green, BALL: C.green}},
  {from: F(6.5), to: F(8.23), text: 'BUT YOU GAVE IT ANYWAY.', hl: {GAVE: C.red}},
  {from: F(8.23), to: F(10.2), text: 'BECAUSE… FUNNY.', hl: {FUNNY: C.yellow}},
  {from: F(10.2), to: F(12.5), text: '0-1. BLUE KICK OFF.', hl: {BLUE: C.blue}},
  {from: F(12.5), to: F(13.9), text: 'THEIR STRIKER LOOKS UP…', hl: {'UP…': C.yellow}},
  {from: F(13.9), to: F(16.8), text: 'AND THE ORANGE KEEPER IS SCRATCHING HIS BACKSIDE.', hl: {ORANGE: C.orange, SCRATCHING: C.yellow, BACKSIDE: C.yellow}},
  {from: F(16.8), to: F(18.8), text: 'HE SHOOTS STRAIGHT FROM THE KICK-OFF…', hl: {'KICK-OFF…': C.yellow}},
  {from: F(18.8), to: F(21.4), text: "IT'S IN! AND THAT ONE COUNTS.", hl: {COUNTS: C.green}},
  {from: F(21.4), to: F(23.6), text: '1-1. FULL TIME.', hl: {FULL: C.yellow, TIME: C.yellow}},
  {from: F(23.6), to: F(24.9), text: "IT'S GOING TO PENALTIES.", hl: {PENALTIES: C.yellow}},
  {from: F(24.9), to: F(26.2), text: 'FIRST PENALTY…'},
  {from: F(26.2), to: F(29.1), text: 'A FAN RUNS ONTO THE PITCH IN JUST HIS PANTS.', hl: {PANTS: C.yellow}},
  {from: F(29.1), to: F(30.6), text: 'HE GRABS THE BALL…', hl: {'BALL…': C.yellow}},
  {from: F(30.6), to: F(33.0), text: 'AND SMASHES IT INTO THE TOP CORNER.', hl: {TOP: C.yellow, CORNER: C.yellow}},
  {from: F(33.0), to: F(35.3), text: 'THE WHOLE STADIUM GOES CRAZY.', hl: {CRAZY: C.yellow}},
  {from: F(35.6), to: F(38.2), text: 'SO, REF… DOES IT COUNT?', hl: {COUNT: C.yellow}},
  {from: F(38.2), to: EP3_FRAMES, text: 'DROP A OR B IN THE COMMENTS.', hl: {A: C.yellow, B: C.yellow}},
];

type ShotDef = {from: number; to: number; C: React.FC<{from: number}>; filter?: string};
const SHOTS: ShotDef[] = [
  {from: 0, to: F(1.0), C: Shot1a},
  {from: F(1.0), to: F(1.5), C: Shot1b},
  {from: F(1.5), to: F(2.0), C: Shot1c},
  {from: F(2.0), to: F(3.6), C: Ep2TopCorner, filter: 'saturate(0.8) sepia(0.12) contrast(1.05)'},
  {from: F(3.6), to: F(6.5), C: ({from}) => <CardBackdrop from={from} seed={1.1} />},
  {from: F(6.5), to: F(8.23), C: Shot4},
  {from: F(8.23), to: F(10.2), C: Shot5},
  {from: F(10.2), to: F(12.5), C: Shot6},
  {from: F(12.5), to: F(13.9), C: Shot7},
  {from: F(13.9), to: F(16.8), C: Shot8},
  {from: F(16.8), to: F(18.8), C: Shot9},
  {from: F(18.8), to: F(21.4), C: Shot10},
  {from: F(21.4), to: F(23.6), C: ShotFullTime},
  {from: F(23.6), to: F(24.9), C: Shot12},
  {from: F(24.9), to: F(26.2), C: Shot13},
  {from: F(26.2), to: F(29.1), C: Shot14},
  {from: F(29.1), to: F(30.6), C: Shot15},
  {from: F(30.6), to: F(33.0), C: Shot16},
  {from: F(33.0), to: F(35.3), C: Shot17},
  {from: F(35.3), to: EP3_FRAMES, C: ShotVote3},
];
const inRange = (f: number, a: number, b: number) => f >= a && f < b;

export const Episode3: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = frame / fps;
  const flash = interpolate(frame, [F(1.5), F(1.53), F(1.8)], [0, 1, 0], clampO) * (frame >= F(1.5) ? 1 : 0);
  const goal1 = frame >= F(19.3) ? interpolate(frame, [F(19.3), F(19.35), F(19.6)], [0, 0.5, 0], clampO) : 0;
  const goal2 = frame >= F(31.2) ? interpolate(frame, [F(31.2), F(31.25), F(31.5)], [0, 0.5, 0], clampO) : 0;
  const cardFade = interpolate(frame, [F(6.3), F(6.5)], [1, 0], clampO);
  // scoreboard state
  const showScore = !(inRange(frame, F(2.0), F(6.5)) || frame >= F(35.3));
  let base: [number, number] = [1, 1];
  let clock = 'PENS';
  let goalAt = 1e9;
  if (inRange(frame, F(6.5), F(21.4))) {
    base = [0, 1];
    clock = T < 12.5 ? '90+4' : '90+5';
    goalAt = F(19.35);
  } else if (inRange(frame, F(21.4), F(23.6))) clock = 'FT';
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ref-ep3-audio.m4a')} />
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <AbsoluteFill style={{filter: s.filter}}>
            <s.C from={s.from} />
          </AbsoluteFill>
        </Sequence>
      ))}

      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />
      <AbsoluteFill style={{background: '#fff', opacity: Math.max(flash, goal1, goal2)}} />

      {/* titles */}
      <GoalSlam frame={frame} fps={fps} from={F(1.55)} to={F(2.0)} top={420} />
      {inRange(frame, F(6.5), F(8.23)) ? <Tag text="GOAL GIVEN" frame={frame} fps={fps} from={F(6.75)} style={{top: 330, left: 0, right: 0, margin: '0 auto', width: 'fit-content', fontSize: 64, padding: '12px 40px', rotate: '-6deg'}} /> : null}
      {inRange(frame, F(8.23), F(10.2)) ? <BigTitle text="FUNNY INIT" frame={frame - F(8.4)} fps={fps} top={330} color="#ffd23a" size={140} rot={-5} /> : null}
      <GoalSlam frame={frame} fps={fps} from={F(19.35)} to={F(21.2)} top={430} text="GOAL!" />
      {inRange(frame, F(23.6), F(24.9)) ? <BigTitle text="PENALTIES" frame={frame - F(23.65)} fps={fps} top={350} size={140} rot={-4} /> : null}
      {inRange(frame, F(26.2), F(29.0)) ? <StreakerTitle frame={frame - F(26.2)} fps={fps} /> : null}
      <GoalSlam frame={frame} fps={fps} from={F(31.25)} to={F(33.0)} top={430} />

      {/* card */}
      {inRange(frame, F(3.6), F(6.5)) ? (
        <div style={{opacity: cardFade}}>
          <AnswerCard
            title="EPISODE 2: THE ANSWER"
            frame={frame}
            fps={fps}
            from={F(3.6)}
            to={F(6.6)}
            options={[
              {letter: 'A', title: 'GOAL', sub: 'it stands', stamp: {text: 'WRONG', color: '#e5262b', at: F(3.95)}, lose: F(3.95)},
              {letter: 'B', title: 'NO GOAL', sub: 'dropped ball', stamp: {text: 'CORRECT', color: '#20b94f', at: F(4.45)}, win: F(4.3)},
            ]}
          />
        </div>
      ) : null}

      <Badge episode={3} />
      {showScore ? <Scoreboard frame={frame} fps={fps} goalAt={goalAt} base={base} clock={clock} scorer="blu" /> : null}
      {inRange(frame, F(2.0), F(3.6)) ? <Tag text="LAST EPISODE" frame={frame} fps={fps} from={F(2.0)} style={{top: 172, left: 40}} /> : null}

      <Captions cues={CUES} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/** Smaller, off-centre STREAKER! that flashes like a siren (top-left, tilted). */
const StreakerTitle: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame: frame - 2, fps, config: {damping: 8, stiffness: 240}});
  const wob = Math.sin(frame * 0.5) * 1.5;
  const siren = Math.floor(frame / 6) % 2 === 0;
  return (
    <div style={{position: 'absolute', top: 205, left: 60}}>
      <span
        style={{
          display: 'inline-block',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 92,
          color: siren ? '#ff3b3b' : '#ff6a3d',
          WebkitTextStroke: '11px #ffffff',
          paintOrder: 'stroke fill',
          textShadow: `0 10px 24px rgba(0,0,0,.5), 0 0 ${siren ? 40 : 14}px rgba(255,60,60,.6)`,
          transform: `rotate(${-7 + wob}deg) scale(${2 - s})`,
          transformOrigin: 'left center',
          opacity: Math.min(1, s * 2),
          letterSpacing: 1,
        }}
      >
        STREAKER!
      </span>
    </div>
  );
};
