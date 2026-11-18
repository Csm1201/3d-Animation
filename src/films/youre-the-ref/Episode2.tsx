/**
 * "You're the Ref" — Episode 2, rebuilt shot for shot in the 3D style (38.8 s, 30 fps).
 * Same timing, captions and audio as the original upload; every shot is a 3D scene in the
 * night stadium, with 2D HUD / captions / cards layered on top.
 *
 *   0.0  Hook POV: the ball flies at you (flash)          "THE BALL HIT YOU…"
 *   1.5  Last episode: keeper's throw sails in             "IF YOU SAID GOAL…"
 *   3.5  Episode 1 answer card                             3 captions
 *  11.1  GOAL?! sting
 *  11.4  You're the referee (YOU label)
 *  12.6  Fourth official: +3                              "SAME FINAL. STILL NIL-NIL…"
 *  15.9  Orange break, three on two / cuts inside
 *  19.5  Shoots from 30 yards
 *  21.7  POV: heading straight for you (dolly zoom)
 *  23.87 It hits you (flash)
 *  24.8  Top corner, GOAL?!, score 0–1
 *  27.1  Orange celebrate
 *  28.7  Blue furious
 *  31.0  Slow-mo replay, VAR CHECK
 *  33.1  What's your call? card, COMMENT A OR B
 */
import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {MeshBasicMaterial, MeshStandardMaterial, SpriteMaterial, Vector3} from 'three';
import {HEIGHT, WIDTH} from '../../core/constants';
import {BodySpec, buildPose, idleSpec, keyedSpec, lerpSpec, runSpec} from '../../core/sportPoses';
import {canvasTex, DEG, once, to3} from '../../character3d/common';
import {Blob, Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {Look, Style, Worker3D} from '../../character3d/Worker3D';
import {AnswerCard, Badge, Captions, Cue, FONT, GoalSlam, Scoreboard, Tag} from './Overlays';
import {END_COMMENT, END_NEXT, EndingOverlay} from './Ending';
import {Ball, BALL_R, distAlong, kitStyle, P2, PathFn, strideM, velocity, yawFor} from './Players';
import {Stadium} from './Stadium';

export const EP2_FPS = 30;
export const EP2_FRAMES = 1164; // 38.8 s
const F = (s: number) => Math.round(s * EP2_FPS);

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

// ---------------------------------------------------------------- cast
const SKINS = {
  nine: {skin: '#c98f6b', hair: '#1f1714', hs: 'buzz' as const},
  ten: {skin: '#8d5a3c', hair: '#151110', hs: 'short' as const},
  seven: {skin: '#f1c3a0', hair: '#5a3a2c', hs: 'short' as const},
};
export const ST = {
  nine: kitStyle('orange', 9, SKINS.nine.skin, SKINS.nine.hair, SKINS.nine.hs),
  ten: kitStyle('orange', 10, SKINS.ten.skin, SKINS.ten.hair, SKINS.ten.hs),
  seven: kitStyle('orange', 7, SKINS.seven.skin, SKINS.seven.hair, SKINS.seven.hs),
  eleven: kitStyle('orange', 11, '#e8b48f', '#2b211c', 'short'),
  two: kitStyle('blue', 2, '#f1c3a0', '#c47a3a', 'short'),
  six: kitStyle('blue', 6, '#8d5a3c', '#1f1714', 'buzz'),
  eight: kitStyle('blue', 8, '#e8b48f', '#3a2a22', 'short'),
  ref: kitStyle('ref', undefined, '#f0b892', '#2b211c', 'buzz'),
  official: kitStyle('ref', undefined, '#c98f6b', '#1f1714', 'short'),
  pinkKeeper: kitStyle('keeper', 1, '#e8b48f', '#3a2a22', 'short'),
  greenKeeper: {
    outfit: 'kit',
    skin: '#f1c3a0',
    hair: '#6b4a32',
    hairStyle: 'short',
    kit: {shirt: '#2fd36b', shorts: '#17171c', socks: '#2fd36b', numColor: '#17171c', trim: '#17171c', gloves: '#ffe14a', longSleeves: true, number: 1},
  } as Style,
};

export const DETERMINED: Look = {tired: 0, droop: -2, eyesClosed: false, brows: -0.55, browLift: -0.1, mouth: 'flat', noBlink: true};
export const JOY: Look = {tired: 0, droop: -6, eyesClosed: false, brows: 0.3, browLift: 0.6, mouth: 'open', mouthOpen: 0.75, noBlink: true};
export const ANGRY = (t: number): Look => ({tired: 0, droop: -4, eyesClosed: false, brows: -1, browLift: -0.3, mouth: 'open', mouthOpen: 0.45 + 0.35 * Math.abs(Math.sin(t * 9)), noBlink: true, pupils: 0.8});
export const CALM: Look = {tired: 0, droop: 0, eyesClosed: false, brows: 0, mouth: 'flat'};

// ---------------------------------------------------------------- actor
type ActorProps = {
  style: Style;
  x: number;
  z: number;
  yaw: number;
  spec: BodySpec;
  frame: number;
  look?: Look;
  /** sideways tilt (deg) about the facing axis — dives */
  roll?: number;
  /** forward/back tilt (deg) of the whole body */
  pitch?: number;
  y?: number;
  shadow?: boolean;
  /** uniform size multiplier (1 = everyone else) */
  scale?: number;
  children?: (pose: ReturnType<typeof buildPose>) => React.ReactNode;
};

export const Actor: React.FC<ActorProps> = ({style, x, z, yaw, spec, frame, look = DETERMINED, roll = 0, pitch = 0, y = 0, shadow = true, scale = 1, children}) => {
  const pose = buildPose(spec);
  return (
    <group position={[x, 0, z]} rotation={[0, yaw, 0]} scale={scale}>
      <group position={[0, y, 0]} rotation={[roll * DEG, 0, pitch * DEG]}>
        <Worker3D pose={pose} frame={frame} look={look} carry="none" style={style} />
        {children ? children(pose) : null}
      </group>
      {shadow ? <Blob x={0.05} z={0} h={y} sx={0.9} sz={0.5} strength={0.45} /> : null}
    </group>
  );
};

/** Running along a path: spec for this moment, plus position and heading. */
export const runAlong = (path: PathFn, t: number, effort: number, offset = 0, face?: P2) => {
  const pos = path(t);
  const v = velocity(path, t);
  let yaw = Math.hypot(v.x, v.z) > 0.2 ? yawFor(v.x, v.z) : 0;
  let dirSign = 1;
  if (face) {
    yaw = yawFor(face.x - pos.x, face.z - pos.z);
    if (v.x * Math.cos(yaw) - v.z * Math.sin(yaw) < 0) dirSign = -1;
  }
  const d = distAlong(path, t);
  const ph = dirSign * (d / strideM(effort)) + offset;
  return {spec: runSpec(((ph % 1) + 1) % 1, effort), pos, yaw};
};

export const armsUp = (s: BodySpec, t: number, k = 1, wave = 1): BodySpec => ({
  ...s,
  nearArm: [lerp(s.nearArm[0], 160 + 12 * Math.sin(t * 9) * wave, k), lerp(s.nearArm[1], 12, k)],
  farArm: [lerp(s.farArm[0], 160 + 12 * Math.sin(t * 9 + 1.7) * wave, k), lerp(s.farArm[1], 12, k)],
});

// kick keyframes (near leg kicks)
export const KICK_BACK: BodySpec = {lean: 2, headTilt: 8, near: {thigh: -38, knee: 100, foot: 30}, far: {thigh: 14, knee: 22, foot: 0}, nearArm: [-45, 30], farArm: [65, 25]};
export const KICK_HIT: BodySpec = {lean: -2, headTilt: 10, near: {thigh: 28, knee: 38, foot: 25}, far: {thigh: 4, knee: 18, foot: 0}, nearArm: [-35, 25], farArm: [72, 25]};
export const KICK_FOLLOW: BodySpec = {lean: -12, headTilt: -4, near: {thigh: 78, knee: 14, foot: 20}, far: {thigh: -8, knee: 14, foot: 0}, nearArm: [-55, 20], farArm: [85, 30], lift: 20};
export const KICK_SETTLE: BodySpec = {lean: 4, headTilt: -2, near: {thigh: 20, knee: 20, foot: 0}, far: {thigh: -10, knee: 12, foot: 0}, nearArm: [-10, 30], farArm: [20, 30]};

// ---------------------------------------------------------------- scene wrapper
const NIGHT = {sky: '#7d8fc4', ground: '#20402a'};

export const Scene: React.FC<{
  cam: Cam;
  frame: number;
  centre: Vector3;
  excite?: number;
  /** crowd doing the 6-7 hands (0..1) */
  sixSeven?: number;
  extent?: number;
  layer?: 'all' | 'stadium' | 'actors';
  children?: React.ReactNode;
}> = ({cam, frame, centre, excite = 0.4, sixSeven = 0, extent = 16, layer = 'all', children}) => (
  <ThreeCanvas
    width={WIDTH}
    height={HEIGHT}
    frameloop="demand"
    dpr={1}
    shadows="variance"
    gl={layer === 'actors' ? {antialias: true, alpha: true, premultipliedAlpha: false} : {antialias: true}}
    camera={{fov: cam.fov, position: [0, 2, 5]}}
  >
    <CameraRig cam={{...cam, far: 400}} />
    {layer !== 'actors' ? <fog attach="fog" args={['#141c38', 45, 150]} /> : null}
    <Environment intensity={0.28} />
    <Daylight center={centre} extent={extent} offset={[-16, 34, 20]} color="#eef2ff" intensity={2.5} sky={NIGHT.sky} ground={NIGHT.ground} fill={0.75} />
    <directionalLight position={[60, 30, -40]} intensity={0.55} color="#ffe6c4" />
    {layer !== 'actors' ? <Stadium frame={frame} excite={excite} sixSeven={sixSeven} /> : null}
    {layer !== 'stadium' ? children : null}
  </ThreeCanvas>
);

export const shake = (t: number, amt: number, seed = 0) => v3(Math.sin(t * 41 + seed) * amt, Math.cos(t * 37 + seed * 2) * amt, Math.sin(t * 29 + seed * 3) * amt);

// ================================================================ SHOT 1 — hook POV (0–1.5 s)
const REF_SPOT = {x: 39.2, z: 1.0};
const STRIKE_SPOT = {x: 28.3, z: 2.0};

// The hook opens on a frozen snapshot of the ball smashing into the ref's face, then plays on
// at the original flash (0.77 s): head snaps back, ball rebounds, he staggers, stars spin.
export const HOOK_HIT = 0.77;
const HIT_SPEC: BodySpec = {lean: -7, headTilt: -10, near: {thigh: 6, knee: 10}, far: {thigh: -6, knee: 12}, nearArm: [28, 40], farArm: [18, 50]};
const STAGGER_SPEC: BodySpec = {lean: -20, headTilt: -16, near: {thigh: -16, knee: 22}, far: {thigh: 14, knee: 20}, nearArm: [75, 50], farArm: [-35, 70]};
const WOOZY_SPEC: BodySpec = {lean: -6, headTilt: 6, near: {thigh: 8, knee: 18}, far: {thigh: -8, knee: 22}, nearArm: [10, 30], farArm: [-8, 40]};

const starTexture = () =>
  once('dizzyStar', () =>
    canvasTex(128, 128, (g) => {
      g.clearRect(0, 0, 128, 128);
      g.fillStyle = '#ffe14a';
      g.strokeStyle = '#2a1d05';
      g.lineWidth = 6;
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 === 0 ? 56 : 24;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        g.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
      }
      g.closePath();
      g.stroke();
      g.fill();
    }),
  );

const Shot1: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const after = Math.max(0, t - HOOK_HIT);
  const frozen = t < HOOK_HIT;
  const spec = frozen
    ? HIT_SPEC
    : keyedSpec(
        [
          [0, HIT_SPEC],
          [0.22, STAGGER_SPEC],
          [0.73, WOOZY_SPEC],
        ],
        after,
      );
  const step = smooth(clamp01(after / 0.4)) * 0.45; // stumbles back a step
  const refX = REF_SPOT.x + step;
  // head position in world (ref faces -x, so local +x maps to world -x)
  const pose = buildPose(spec);
  const neck = to3(pose.neck);
  const head = v3(refX - (neck.x + 0.02), neck.y + 0.15, REF_SPOT.z);
  const impact = v3(head.x - 0.13 - BALL_R * 0.8, head.y - 0.01, head.z + 0.02);
  let ball = impact;
  let squash = 0.32;
  if (!frozen) {
    const dt = after;
    ball = v3(impact.x - 3.2 * dt, Math.max(BALL_R, impact.y + 3.6 * dt - 4.9 * dt * dt), impact.z + 1.4 * dt);
    squash = 0.32 * Math.exp(-dt * 30);
  }
  // camera: tight on the face during the freeze (slow push), then snaps back with the hit
  const push = smooth(clamp01(t / HOOK_HIT));
  const pull = smooth(clamp01(after / 0.35));
  const jolt = frozen ? 0 : Math.exp(-after * 6) * 0.07;
  const dist = frozen ? lerp(1.55, 1.25, push) : lerp(1.25, 2.4, pull);
  const camDir = v3(-0.5, 0.06, 0.86).normalize();
  const cam: Cam = {
    position: head.clone().add(camDir.multiplyScalar(dist)).add(v3(0, frozen ? 0 : -0.25 * pull, 0)).add(shake(t, jolt, 2)),
    target: v3(head.x + 0.05, head.y - (frozen ? 0.02 : 0.35 * pull), head.z),
    fov: 40,
  };
  const starMat = useMemo(() => new SpriteMaterial({map: starTexture(), transparent: true, depthWrite: false, toneMapped: false}), []);
  const stars = after > 0.12 ? smooth(clamp01((after - 0.12) / 0.15)) : 0;
  const look: Look = frozen
    ? {tired: 0, droop: -10, eyesClosed: true, brows: 1, browLift: 0.6, mouth: 'open', mouthOpen: 0.85, roll: 6, noBlink: true}
    : after < 0.35
      ? {tired: 0, droop: -14, eyesClosed: true, brows: 1, mouth: 'open', mouthOpen: 0.7, roll: 10, noBlink: true}
      : {tired: 0.6, droop: 2, eyesClosed: false, brows: 0.7, pupils: 0.45, mouth: 'open', mouthOpen: 0.25, roll: 8 * Math.sin(after * 9), noBlink: true};
  return (
    <AbsoluteFill style={frozen ? {transform: `rotate(${lerp(-4, -1.5, push)}deg) scale(1.06)`, filter: 'contrast(1.12) saturate(1.15)'} : undefined}>
      <Scene cam={cam} frame={frozen ? from : fr} centre={v3(REF_SPOT.x, 0, REF_SPOT.z)} extent={6} excite={frozen ? 0.6 : 1.3}>
        <Actor style={ST.ref} x={refX} z={REF_SPOT.z} yaw={Math.PI} spec={spec} frame={fr} look={look} />
        <Actor style={ST.nine} x={STRIKE_SPOT.x} z={STRIKE_SPOT.z} yaw={0} spec={KICK_FOLLOW} frame={fr} />
        <Actor style={ST.six} x={33.2} z={-2.4} yaw={yawFor(1, 0.3)} spec={idleSpec(fr, 1)} frame={fr} />
        <Ball pos={ball} spin={frozen ? 0.4 : 0.4 + after * 30} axisYaw={0} squash={squash} />
        {stars > 0
          ? [0, 1, 2, 3, 4].map((i) => {
              const a = after * 7 + (i * Math.PI * 2) / 5;
              return <sprite key={i} material={starMat} position={[head.x + Math.cos(a) * 0.24, head.y + 0.2 + Math.sin(a * 2) * 0.03, head.z + Math.sin(a) * 0.24]} scale={[0.1 * stars, 0.1 * stars, 1]} />;
            })
          : null}
      </Scene>
      {frozen ? <HookBurst t={t} /> : null}
    </AbsoluteFill>
  );
};

/** Comic impact burst + speed lines over the freeze frame. */
const HookBurst: React.FC<{t: number}> = ({t}) => {
  const pop = smooth(clamp01(t / 0.12));
  const wob = 1 + 0.04 * Math.sin(t * 40);
  const cx = 540;
  const cy = 690;
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
      <div style={{position: 'absolute', top: 300, left: 0, right: 0, textAlign: 'center', transform: `rotate(-10deg) scale(${(0.4 + 0.6 * pop) * wob})`}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 190, color: '#ffd23a', WebkitTextStroke: '20px #0d0f14', paintOrder: 'stroke fill', textShadow: '0 14px 30px rgba(0,0,0,.55)', letterSpacing: 2}}>BONK!</span>
      </div>
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 2 — last episode (1.5–3.5 s)
const Shot2: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const cam: Cam = {position: v3(-37.5 - t * 0.6, 2.3, 9 - t * 0.4), target: v3(-51, 1.3, -0.2), fov: 50};
  // the long throw drops out of the sky into the net
  const land = 1.25;
  const u = clamp01(t / land);
  const ball =
    t < land
      ? v3(lerp(-28, -53.2, u), lerp(10, 1.9, u) + 3.2 * Math.sin(Math.PI * u) * (1 - u), lerp(4, -1.1, u))
      : v3(-53.6, Math.max(BALL_R, 1.9 - 4.9 * (t - land) ** 2 * 3), -1.1);
  const jump = smooth(clamp01((t - 0.75) / 0.3)) * (1 - smooth(clamp01((t - 1.25) / 0.35)));
  const keeper = armsUp(lerpSpec(idleSpec(f, 0.5), {...idleSpec(f, 0.5), near: {thigh: 10, knee: 30}, far: {thigh: -6, knee: 30}, lift: 120 * jump}, jump), t, smooth(clamp01((t - 0.6) / 0.25)), 0.2);
  return (
    <Scene cam={cam} frame={from + f} centre={v3(-48, 0, 0)} excite={0.3}>
      <Actor style={ST.pinkKeeper} x={-50.6} z={0.3} yaw={0} spec={keeper} frame={from + f} look={{...DETERMINED, droop: -14, mouth: 'open', mouthOpen: 0.4, brows: 0.6}} />
      <Ball pos={ball} spin={t * 18} axisYaw={yawFor(-1, -0.2)} />
    </Scene>
  );
};

// ================================================================ card background (shots 3 + 15)
export const CardBackdrop: React.FC<{from: number; seed: number}> = ({from, seed}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const a = seed + t * 0.035;
  const cam: Cam = {position: v3(Math.sin(a) * 18, 3.2, Math.cos(a) * 10), target: v3(Math.sin(a) * 18 + 30, 3.5, -40), fov: 55};
  return (
    <AbsoluteFill style={{filter: 'blur(5px) brightness(0.62) saturate(1.1)', transform: 'scale(1.04)'}}>
      <Scene cam={cam} frame={from + f} centre={v3(0, 0, 0)} excite={0.35} layer="stadium" />
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 5 — you're the referee (11.4–12.6 s)
const youTexture = () =>
  once('youLabel', () =>
    canvasTex(256, 128, (g) => {
      g.clearRect(0, 0, 256, 128);
      g.fillStyle = '#0d0f14';
      g.beginPath();
      g.roundRect(18, 10, 220, 76, 22);
      g.fill();
      g.beginPath();
      g.moveTo(108, 84);
      g.lineTo(148, 84);
      g.lineTo(128, 112);
      g.fill();
      g.fillStyle = '#ffd23a';
      g.font = '900 54px Inter, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('YOU', 128, 50);
    }),
  );

const Shot5: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const push = smooth(clamp01(t / 1.2));
  const cam: Cam = {position: v3(5.4 - push * 0.9, 1.35, 1.6 - push * 0.3), target: v3(0, 1.2, 0), fov: 44};
  const raise = smooth(clamp01((t - 0.05) / 0.35));
  const spec = armsUp(idleSpec(f, 0.2), t, raise, 0.15);
  const label = useMemo(() => new SpriteMaterial({map: youTexture(), transparent: true, depthTest: false, toneMapped: false}), []);
  const pop = smooth(clamp01((t - 0.15) / 0.2));
  return (
    <Scene cam={cam} frame={from + f} centre={v3(0, 0, 0)} excite={0.4} extent={8}>
      <Actor style={ST.ref} x={0} z={0} yaw={0} spec={spec} frame={from + f} look={{...CALM, mouth: 'smile', brows: 0.2, browLift: 0.4}} />
      <sprite material={label} position={[0.05, 2.62 + Math.sin(t * 6) * 0.03, 0]} scale={[0.72 * pop, 0.36 * pop, 1]} renderOrder={10} />
    </Scene>
  );
};

// ================================================================ SHOT 6 — stoppage time (12.6–15.9 s)
const boardTexture = () =>
  once('board+3', () =>
    canvasTex(512, 300, (g) => {
      g.fillStyle = '#0a0b0e';
      g.fillRect(0, 0, 512, 300);
      g.strokeStyle = '#2a2d36';
      g.lineWidth = 14;
      g.strokeRect(7, 7, 498, 286);
      // LED dots
      g.fillStyle = 'rgba(80,255,120,0.07)';
      for (let y = 20; y < 290; y += 12) for (let x = 20; x < 500; x += 12) g.fillRect(x, y, 6, 6);
      g.fillStyle = '#4dff7a';
      g.shadowColor = '#4dff7a';
      g.shadowBlur = 24;
      g.font = '900 210px Inter, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('+3', 256, 160);
    }),
  );

const Shot6: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const cam: Cam = {position: v3(0.9 - t * 0.12, 1.05, -29.6 - t * 0.25), target: v3(0, 2.3, -36), fov: 48};
  const lift = smooth(clamp01((t - 0.05) / 0.4));
  const spec: BodySpec = {...idleSpec(f, 0.9), nearArm: [lerp(0, 158, lift), lerp(14, 22, lift)], farArm: [lerp(0, 158, lift), lerp(14, 22, lift)]};
  const boardOn = t > 0.35 ? (t < 0.5 && Math.floor(t * 40) % 2 === 0 ? 0.3 : 1) : 0;
  const mat = useMemo(() => new MeshBasicMaterial({map: boardTexture(), toneMapped: false}), []);
  const back = useMemo(() => new MeshStandardMaterial({color: '#20232c', roughness: 0.5}), []);
  mat.color.setScalar(0.25 + 0.75 * boardOn);
  const actors = (
    <Actor style={ST.official} x={0} z={-35.4} yaw={yawFor(0.12, 1)} spec={spec} frame={from + f} look={{...CALM, mouth: 'flat'}}>
      {(pose) => {
        const w = to3(pose.nearArm.wrist);
        return (
          <group position={[w.x + 0.03, w.y + 0.3, 0]}>
            <mesh material={back}>
              <boxGeometry args={[0.07, 0.56, 0.92]} />
            </mesh>
            <mesh material={mat} position={[0.04, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.88, 0.52]} />
            </mesh>
          </group>
        );
      }}
    </Actor>
  );
  return (
    <>
      <AbsoluteFill style={{filter: 'blur(9px) brightness(0.85)', transform: 'scale(1.05)'}}>
        <Scene cam={cam} frame={from + f} centre={v3(0, 0, -35)} excite={0.7} layer="stadium" />
      </AbsoluteFill>
      <Bokeh t={t} />
      <AbsoluteFill>
        <Scene cam={cam} frame={from + f} centre={v3(0, 0, -35)} extent={6} layer="actors">
          {actors}
        </Scene>
      </AbsoluteFill>
    </>
  );
};

const BOKEH = [
  {x: 90, y: 560, r: 150, c: '47,109,240'},
  {x: 330, y: 660, r: 120, c: '255,122,26'},
  {x: 560, y: 520, r: 170, c: '47,109,240'},
  {x: 760, y: 470, r: 140, c: '255,122,26'},
  {x: 990, y: 600, r: 160, c: '47,109,240'},
  {x: 640, y: 760, r: 90, c: '255,210,150'},
];
const Bokeh: React.FC<{t: number}> = ({t}) => (
  <AbsoluteFill style={{mixBlendMode: 'screen'}}>
    {BOKEH.map((b, i) => {
      const r = b.r * (1 + 0.06 * Math.sin(t * 2 + i));
      return (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: b.x - r + Math.sin(t * 0.6 + i) * 12,
            top: b.y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(${b.c},.75) 0%, rgba(${b.c},.35) 55%, rgba(${b.c},0) 72%)`,
          }}
        />
      );
    })}
  </AbsoluteFill>
);

// ================================================================ SHOT 7 — orange break (15.9–19.5 s)
const DX = -16; // practice blocking shifted back so the shot is from ~30 yards
const strikerBreak: PathFn = (t) => {
  const cut = smooth(clamp01((t - 1.75) / 0.95));
  return {x: 15 + DX + 6.6 * t, z: 8.2 - 6.2 * cut};
};
const TOUCH_OFFSET = 0.15;

const Shot7: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const s = runAlong(strikerBreak, t, 0.85);
  const ten = runAlong((tt) => ({x: 13 + DX + 7.6 * tt, z: 3.6 - 1.7 * tt}), t, 0.9, 0.37);
  const seven = runAlong((tt) => ({x: 10.5 + DX + 7.6 * tt, z: -2.6 + 0.3 * tt}), t, 0.95, 0.71);
  const def2 = runAlong((tt) => ({x: 35 + DX + 1.9 * tt, z: 6.4 - 1.1 * smooth(clamp01((tt - 1.9) / 1))}), t, 0.35, 0.2, strikerBreak(t));
  const def6 = runAlong((tt) => ({x: 33 + DX + 2.1 * tt, z: -2.8 + 1.2 * tt}), t, 0.35, 0.55, ten.pos);
  const ref = runAlong((tt) => ({x: 33.5 + 1.6 * tt, z: 0.4 + 0.15 * tt}), t, 0.35, 0.12, strikerBreak(t));
  // dribble
  const p = s.pos;
  const v = velocity(strikerBreak, t);
  const sp = Math.hypot(v.x, v.z) || 1;
  const dir = {x: v.x / sp, z: v.z / sp};
  const u = ((((s.spec.phase ?? 0) - TOUCH_OFFSET) % 1) + 1) % 1;
  const gap = 0.55 + 1.0 * Math.sin(Math.PI * u);
  const ball = v3(p.x + dir.x * gap - dir.z * 0.12, BALL_R, p.z + dir.z * gap + dir.x * 0.12);
  const ease = smooth(clamp01(t / 3.6));
  const cam: Cam = {position: v3(p.x - 12.5 + ease * 2.2, 6.2 - ease * 0.9, p.z + 3 - ease * 1.2), target: v3(p.x + 0.5 + ease * 1.5, 0.2, p.z - 3.6 + ease * 1.5), fov: 58};
  const lean = Math.sin(Math.PI * clamp01((t - 1.75) / 0.95)) * 9;
  return (
    <Scene cam={cam} frame={fr} centre={v3(p.x + 4, 0, p.z - 1)} excite={0.35 + 0.6 * smooth(clamp01((t - 1.6) / 1.4))}>
      <Actor style={ST.seven} x={seven.pos.x} z={seven.pos.z} yaw={seven.yaw} spec={seven.spec} frame={fr} />
      <Actor style={ST.ten} x={ten.pos.x} z={ten.pos.z} yaw={ten.yaw} spec={ten.spec} frame={fr} />
      <Actor style={ST.nine} x={p.x} z={p.z} yaw={s.yaw} spec={s.spec} frame={fr} roll={-lean} />
      <Actor style={ST.two} x={def2.pos.x} z={def2.pos.z} yaw={def2.yaw} spec={def2.spec} frame={fr} />
      <Actor style={ST.six} x={def6.pos.x} z={def6.pos.z} yaw={def6.yaw} spec={def6.spec} frame={fr} />
      <Actor style={ST.ref} x={ref.pos.x} z={ref.pos.z} yaw={ref.yaw} spec={ref.spec} frame={fr} look={CALM} />
      <Actor style={ST.greenKeeper} x={50.6} z={strikerBreak(t).z * 0.18} yaw={Math.PI} spec={idleSpec(fr, 0.4)} frame={fr} />
      <Ball pos={ball} spin={distAlong(strikerBreak, t) / BALL_R} axisYaw={yawFor(dir.x, dir.z)} />
    </Scene>
  );
};

// ================================================================ SHOT 8 — shoots from 30 yards (19.5–21.7 s)
const KICK_T = 1.5;
const BALL_AT_KICK = v3(STRIKE_SPOT.x + 0.45, BALL_R, STRIKE_SPOT.z + 0.12);
const REF_CHEST = v3(REF_SPOT.x - 0.12, 1.5, REF_SPOT.z);
const FLIGHT = 0.8;
const BALL_V = v3((REF_CHEST.x - BALL_AT_KICK.x) / FLIGHT, (REF_CHEST.y - BALL_R + 4.9 * FLIGHT * FLIGHT) / FLIGHT, (REF_CHEST.z - BALL_AT_KICK.z) / FLIGHT);
const shotBall = (dt: number) => v3(BALL_AT_KICK.x + BALL_V.x * dt, BALL_R + BALL_V.y * dt - 4.9 * dt * dt, BALL_AT_KICK.z + BALL_V.z * dt);

const strikerApproach: PathFn = (t) => {
  const tau = Math.min(Math.max(t, 0), 1.45);
  const x0 = strikerBreak(3.6).x;
  const k = (STRIKE_SPOT.x - x0 - 5.5 * 1.45) / (1.45 * 1.45);
  return {x: x0 + 5.5 * tau + k * tau * tau, z: lerp(strikerBreak(3.6).z, STRIKE_SPOT.z, smooth(clamp01(tau / 1.45)))};
};

const Shot8: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const run = runAlong(strikerApproach, Math.min(t, 1.2), 0.75);
  const spec = keyedSpec(
    [
      [1.05, run.spec],
      [1.32, KICK_BACK],
      [KICK_T, KICK_HIT],
      [1.72, KICK_FOLLOW],
      [2.2, KICK_SETTLE],
    ],
    t,
  );
  const sp = strikerApproach(t);
  const ball =
    t < KICK_T
      ? v3(lerp(sp.x + 1.0, BALL_AT_KICK.x, smooth(clamp01(t / KICK_T))), BALL_R, lerp(sp.z + 0.1, BALL_AT_KICK.z, smooth(clamp01(t / KICK_T))))
      : shotBall(t - KICK_T);
  const panT = smooth(clamp01((t - 1.35) / 0.8));
  const kickShake = t > KICK_T ? Math.exp(-(t - KICK_T) * 8) * 0.04 : 0;
  const cam: Cam = {position: v3(sp.x - 3.5 + panT * 2.5, 1.45, 8.6 - panT * 0.6).add(shake(t, kickShake, 3)), target: v3(lerp(sp.x + 0.8, 34, panT), lerp(0.95, 1.3, panT), lerp(sp.z, 0.8, panT)), fov: 46};
  const def2 = {x: 31.5 - smooth(clamp01((t - 1.2) / 0.6)) * 0.8, z: 4.2};
  const lunge = smooth(clamp01((t - 1.25) / 0.35));
  const def2Spec = lerpSpec(idleSpec(fr, 0.2), {lean: 12, near: {thigh: 40, knee: 40, foot: 10}, far: {thigh: -30, knee: 20}, nearArm: [30, 20], farArm: [-20, 20]}, lunge);
  const ten = runAlong((tt) => ({x: strikerBreak(3.6).x + 0.8 + 7.2 * tt, z: -2.4 - 0.3 * tt}), t, 0.85, 0.3);
  return (
    <Scene cam={cam} frame={fr} centre={v3(sp.x + 3, 0, sp.z)} excite={0.95}>
      <Actor style={ST.nine} x={sp.x} z={sp.z} yaw={0} spec={spec} frame={fr} look={{...DETERMINED, mouth: t > KICK_T - 0.1 && t < KICK_T + 0.4 ? 'open' : 'flat', mouthOpen: 0.4}} />
      <Actor style={ST.two} x={def2.x} z={def2.z} yaw={yawFor(sp.x - def2.x, sp.z - def2.z)} spec={def2Spec} frame={fr} />
      <Actor style={ST.ten} x={ten.pos.x} z={ten.pos.z} yaw={ten.yaw} spec={ten.spec} frame={fr} />
      <Actor style={ST.six} x={33.5} z={-1.6} yaw={yawFor(-1, 0.2)} spec={idleSpec(fr, 1.1)} frame={fr} />
      <Actor style={ST.ref} x={REF_SPOT.x} z={REF_SPOT.z} yaw={Math.PI} spec={idleSpec(fr, 0.6)} frame={fr} look={CALM} />
      <Actor style={ST.greenKeeper} x={51} z={0.4} yaw={Math.PI} spec={idleSpec(fr, 0.4)} frame={fr} />
      <Ball pos={ball} spin={t < KICK_T ? t * 12 : 18 + (t - KICK_T) * 60} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 9 — heading straight for you (21.7–23.87 s)
const Shot9: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const dur = 2.17;
  const k = clamp01(t / dur);
  // dolly zoom: the camera drifts back while the lens widens, so the world stretches behind the ball
  const back = smooth(k) * 1.4;
  const head = v3(REF_SPOT.x + back, 1.62, REF_SPOT.z + back * 0.05).add(shake(t, 0.004 + k * 0.01, 5));
  const target = v3(28.5, 1.15, 2.0);
  const fov = lerp(32, 58, smooth(k));
  const dirToStriker = target.clone().sub(head).normalize();
  const dist = lerp(7.5, 0.55, Math.pow(k, 1.7));
  const ball = v3(REF_SPOT.x, 1.62, REF_SPOT.z).add(dirToStriker.clone().multiplyScalar(dist)).add(v3(0, Math.sin(k * Math.PI) * 0.12 - 0.05, 0));
  const turn = smooth(clamp01(t / 1.4));
  return (
    <Scene cam={{position: head, target, fov}} frame={fr} centre={v3(32, 0, 1)} excite={1}>
      <Actor style={ST.nine} x={STRIKE_SPOT.x} z={STRIKE_SPOT.z} yaw={0} spec={lerpSpec(KICK_FOLLOW, KICK_SETTLE, smooth(clamp01(t / 0.8)))} frame={fr} look={{...DETERMINED, browLift: 0.4, mouth: 'open', mouthOpen: 0.3}} />
      <Actor style={ST.two} x={30.7} z={4.2} yaw={lerp(yawFor(-1, -1), yawFor(1, -0.3), turn)} spec={idleSpec(fr, 0.2)} frame={fr} />
      <Actor style={ST.six} x={33.5} z={-1.6} yaw={lerp(yawFor(-1, 0.2), yawFor(1, 0.4), turn)} spec={idleSpec(fr, 1.1)} frame={fr} />
      <Actor style={ST.ten} x={31 + t * 3} z={-3} yaw={0} spec={runSpec((t * 1.5) % 1, 0.6)} frame={fr} />
      <Ball pos={ball} spin={t * 30} axisYaw={yawFor(1, -0.1)} />
    </Scene>
  );
};

// ================================================================ SHOT 10 — it hits you (23.87–24.8 s)
const CORNER = v3(HALF_GOAL_X(), 2.25, -3.3);
function HALF_GOAL_X() {
  return 52.45;
}
const deflect = (dt: number) => {
  // from the ref's chest to the top corner in 1.35 s, slight dip
  const u = clamp01(dt / 1.35);
  const p = REF_CHEST.clone().lerp(CORNER, u);
  p.y += Math.sin(Math.PI * u) * 1.1;
  return p;
};

const Shot10: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const jolt = Math.exp(-t * 3.5) * 0.09;
  const pos = v3(REF_SPOT.x + 0.3, 1.7 - jolt * 2, REF_SPOT.z + 0.2).add(shake(t, jolt, 9));
  const cam: Cam = {position: pos, target: v3(52, 1.7, -1.6), fov: 50};
  const watch = smooth(clamp01((t - 0.3) / 0.5));
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 0)} excite={1}>
      <Actor style={ST.greenKeeper} x={51.4} z={-0.2 - watch * 0.6} yaw={Math.PI} spec={lerpSpec(idleSpec(fr, 0.4), {...idleSpec(fr, 0.4), near: {thigh: 12, knee: 40}, far: {thigh: -12, knee: 40}, nearArm: [60, 20], farArm: [60, 20]}, watch)} frame={fr} />
      <Actor style={ST.eight} x={47} z={4} yaw={Math.PI} spec={idleSpec(fr, 0.8)} frame={fr} />
      <Ball pos={deflect(t + 0.05)} spin={t * 50} axisYaw={yawFor(1, -0.3)} />
    </Scene>
  );
};

// ================================================================ SHOT 11 — top corner (24.8–27.1 s)
export const Shot11: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const t0 = 0.98; // time into the deflection when this shot starts
  const inAt = 1.35 - t0; // reaches the corner
  let ball: Vector3;
  if (t < inAt) ball = deflect(t + t0);
  else if (t < inAt + 0.25) ball = CORNER.clone().lerp(v3(54.2, 1.95, -3.0), (t - inAt) / 0.25);
  else ball = v3(54.2, Math.max(BALL_R, 1.95 - 4.9 * (t - inAt - 0.25) ** 2), -3.0);
  // keeper dives to his right (toward -z), full stretch, and lands
  const d = clamp01((t - 0.02) / 0.5);
  const fall = clamp01((t - 0.55) / 0.45);
  const roll = lerp(0, 72, smooth(d)) + lerp(0, 16, smooth(fall));
  const lift = Math.sin(Math.PI * Math.min(1, d * 0.9)) * 0.75 * (1 - fall);
  const dive: BodySpec = {lean: 4, near: {thigh: 10, knee: 25}, far: {thigh: -6, knee: 45}, nearArm: [170, 6], farArm: [165, 10]};
  const keeperSpec = lerpSpec(idleSpec(fr, 0.4), dive, smooth(clamp01(d * 2)));
  const pushIn = smooth(clamp01(t / 2.3));
  const goalShake = t > inAt && t < inAt + 0.4 ? Math.sin((t - inAt) * 60) * 0.025 * (1 - (t - inAt) / 0.4) : 0;
  const cam: Cam = {position: v3(45.6 + pushIn * 0.8, 1.45, 9.6 - pushIn * 1.2).add(v3(0, goalShake, goalShake)), target: v3(52, 1.4, -1.6), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(50, 0, -1)} extent={10} excite={t > inAt ? 1.6 : 1}>
      <Actor style={ST.greenKeeper} x={51.5} z={-0.3 - smooth(d) * 1.4} y={lift} yaw={Math.PI} spec={keeperSpec} frame={fr} roll={roll} shadow />
      <Actor style={ST.ref} x={41.5} z={2.5} yaw={yawFor(1, -0.4)} spec={idleSpec(fr, 0.3)} frame={fr} look={{...CALM, browLift: 0.6, mouth: 'open', mouthOpen: 0.3}} />
      <Ball pos={ball} spin={t * 40} axisYaw={yawFor(1, -0.2)} />
    </Scene>
  );
};

// ================================================================ SHOT 12 — orange celebrating (27.1–28.7 s)
const Shot12: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const cam: Cam = {position: v3(38.5 - t * 0.4, 1.7, 15.5), target: v3(45.5, 1.0, 4.5), fov: 48};
  const runners = [
    {st: ST.nine, p: (tt: number) => ({x: 47.5 - 3.6 * tt, z: 3.5 + 3.4 * tt}), off: 0.1, jump: true},
    {st: ST.ten, p: (tt: number) => ({x: 49.5 - 3.3 * tt, z: 1.6 + 3.2 * tt}), off: 0.55},
    {st: ST.seven, p: (tt: number) => ({x: 50.5 - 3.2 * tt, z: 4.8 + 3.0 * tt}), off: 0.8},
    {st: ST.eleven, p: (tt: number) => ({x: 48.8 - 3.0 * tt, z: -0.8 + 3.3 * tt}), off: 0.3},
  ];
  return (
    <Scene cam={cam} frame={fr} centre={v3(45, 0, 6)} excite={1.6}>
      {runners.map((r, i) => {
        const a = runAlong(r.p, t, 0.6, r.off);
        const jump = r.jump ? Math.max(0, Math.sin(Math.PI * clamp01((t - 0.9) / 0.5))) : 0;
        const spec = armsUp({...a.spec, lift: (a.spec.lift ?? 0) + jump * 160}, t + i, 1, 1);
        return <Actor key={i} style={r.st} x={a.pos.x} z={a.pos.z} yaw={a.yaw} spec={spec} y={0} frame={fr} look={JOY} />;
      })}
      <Actor style={ST.ref} x={41.3} z={9.5} yaw={yawFor(1, -0.6)} spec={idleSpec(fr, 0.3)} frame={fr} look={CALM} />
      <Actor style={ST.greenKeeper} x={52.6} z={-2.6} yaw={yawFor(-1, 0.6)} spec={{...idleSpec(fr, 0.4), lean: 18, nearArm: [-20, 40], farArm: [-10, 40]}} frame={fr} look={{...CALM, droop: 14, brows: 0.8, mouth: 'frown'}} />
    </Scene>
  );
};

// ================================================================ SHOT 13 — blue furious (28.7–31.0 s)
const Shot13: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const back = smooth(clamp01(t / 2.3)) * 0.6;
  const cam: Cam = {position: v3(REF_SPOT.x - back, 1.6, REF_SPOT.z), target: v3(46.5, 1.25, 0.3), fov: 50};
  const face = {x: REF_SPOT.x, z: REF_SPOT.z};
  const protest = (path: PathFn, off: number, sway: number) => {
    const a = runAlong(path, t, 0.35, off);
    const yaw = yawFor(face.x - a.pos.x, face.z - a.pos.z);
    const spec: BodySpec = {
      ...a.spec,
      lean: 2,
      nearArm: [150 + 25 * Math.sin(t * 7 + sway), 30 + 20 * Math.sin(t * 7 + sway)],
      farArm: [140 + 25 * Math.sin(t * 7 + sway + 2), 40],
    };
    return {pos: a.pos, yaw, spec};
  };
  const six = protest((tt) => ({x: 45.2 - 0.9 * tt, z: -0.7 + 0.1 * tt}), 0.2, 0);
  const two = protest((tt) => ({x: 46.2 - 0.8 * tt, z: 1.5 - 0.1 * tt}), 0.7, 1.4);
  const eight = protest((tt) => ({x: 49.5 - 0.6 * tt, z: -3.2 + 0.2 * tt}), 0.4, 2.2);
  return (
    <Scene cam={cam} frame={fr} centre={v3(45, 0, 0)} excite={1.4}>
      <Actor style={ST.eight} x={eight.pos.x} z={eight.pos.z} yaw={eight.yaw} spec={eight.spec} frame={fr} look={ANGRY(t + 0.3)} />
      <Actor style={ST.six} x={six.pos.x} z={six.pos.z} yaw={six.yaw} spec={six.spec} frame={fr} look={ANGRY(t)} />
      <Actor style={ST.two} x={two.pos.x} z={two.pos.z} yaw={two.yaw} spec={two.spec} frame={fr} look={ANGRY(t + 0.15)} />
    </Scene>
  );
};

// ================================================================ SHOT 14 — slow-mo replay (31.0–33.1 s)
const Shot14: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const impact = 1.05;
  const inV = v3(2.6, 0.12, -0.15); // slow-motion speed (m/s)
  let ball: Vector3;
  if (t < impact) ball = REF_CHEST.clone().sub(inV.clone().multiplyScalar(impact - t)).add(v3(-0.13, 0, 0.05));
  else {
    const dt = t - impact;
    ball = REF_CHEST.clone().add(v3(-0.13 + 0.9 * dt, 0.75 * dt - 0.15 * dt * dt, -0.3 * dt + 0.05));
  }
  const recoil = smooth(clamp01((t - impact) / 0.35));
  const hitSpec: BodySpec = {lean: -16, headTilt: -10, near: {thigh: -6, knee: 14}, far: {thigh: 8, knee: 18}, nearArm: [-30, 50], farArm: [40, 60]};
  const spec = lerpSpec(idleSpec(fr * 0.25, 0.6), hitSpec, recoil);
  const pan = smooth(clamp01(t / 2.1));
  const cam: Cam = {position: v3(37.4 + pan * 0.6, 1.2, 5.4 - pan * 0.4), target: v3(38.9 + pan * 0.2, 1.25, 1.0), fov: 40};
  return (
    <Scene cam={cam} frame={from + Math.round(f * 0.25)} centre={v3(39, 0, 1)} extent={8} excite={0.8}>
      <Actor
        style={ST.ref}
        x={REF_SPOT.x}
        z={REF_SPOT.z}
        yaw={Math.PI}
        spec={spec}
        frame={fr}
        look={t > impact ? {tired: 0, droop: -8, eyesClosed: true, brows: 0.8, mouth: 'open', mouthOpen: 0.5} : {...CALM, browLift: 0.5, pupils: 0.6}}
      />
      <Ball pos={ball} spin={t * 6} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 15 — the vote (33.1–38.8 s)
export const THINK: BodySpec = {lean: 3, headTilt: 4, near: {thigh: 4, knee: 6}, far: {thigh: -4, knee: 6}, nearArm: [150, 145], farArm: [38, 105]};
export const POINT: BodySpec = {lean: 6, headTilt: -2, near: {thigh: 8, knee: 8}, far: {thigh: -6, knee: 8}, nearArm: [88, 4], farArm: [4, 16]};
export const FOLD: BodySpec = {lean: -2, headTilt: -3, near: {thigh: 5, knee: 6}, far: {thigh: -5, knee: 6}, nearArm: [26, 74], farArm: [22, 78]};

const ShotVote: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP2_FPS;
  const fr = from + f;
  const base = idleSpec(fr, 0.3);
  const spec = keyedSpec(
    [
      [0, {...base, nearArm: [-4, 14], farArm: [5, 14]}],
      [0.35, THINK],
      [END_COMMENT - 0.1, {...THINK, nearArm: [154, 150]}],
      [END_COMMENT + 0.2, POINT],
      [END_NEXT - 0.1, {...POINT, nearArm: [92, 2]}],
      [END_NEXT + 0.3, FOLD],
      [5.7, FOLD],
    ],
    t,
  );
  const look: Look =
    t < END_COMMENT
      ? {tired: 0, droop: -4, eyesClosed: false, yaw: 12, brows: 0.5, browLift: 0.4, mouth: 'flat', noBlink: true, pupils: 0.9}
      : t < END_NEXT
        ? {tired: 0, droop: 0, eyesClosed: false, brows: -0.2, browLift: 0.5, mouth: 'open', mouthOpen: 0.25 + 0.25 * Math.abs(Math.sin(t * 8)), noBlink: true}
        : {tired: 0, droop: 2, eyesClosed: false, brows: -0.4, browLift: 0.1, mouth: 'smile', roll: 5, noBlink: true};
  const push = smooth(clamp01(t / 5.7));
  const punch = t > END_COMMENT ? Math.exp(-(t - END_COMMENT) * 6) * 0.25 : 0;
  const cam: Cam = {position: v3(3.0 - push * 0.5 - punch, 1.55, 0.8 - push * 0.4), target: v3(0, 1.68, 0.05), fov: 42};
  return (
    <>
      <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={6} excite={0.9}>
        <Actor style={ST.ref} x={0} z={0} yaw={yawFor(1, 0.12)} spec={spec} frame={fr} look={look} />
      </Scene>
      <EndingOverlay frame={f} fps={EP2_FPS} />
    </>
  );
};

// ================================================================ captions + timeline
const C = {orange: '#ff8a2a', blue: '#5a95ff', red: '#ff4d4d', green: '#45e070', yellow: '#ffd23a'};
const CUES: Cue[] = [
  {from: 0, to: F(1.9), text: 'THE BALL HIT YOU…', hl: {'YOU…': C.yellow}},
  {from: F(1.9), to: F(3.5), text: 'IF YOU SAID GOAL…', hl: {'GOAL…': C.yellow}},
  {from: F(3.5), to: F(4.9), text: 'YOU GOT IT WRONG.', hl: {WRONG: C.red}},
  {from: F(4.9), to: F(8.5), text: 'THE CORRECT CALL WAS NO GOAL. GOAL KICK.', hl: {NO: C.green, GOAL: C.green, KICK: C.green}},
  {from: F(8.5), to: F(11.1), text: "A KEEPER CAN'T SCORE BY THROWING IT IN.", hl: {"CAN'T": C.red}},
  {from: F(11.4), to: F(12.6), text: "YOU'RE THE REFEREE.", hl: {REFEREE: C.yellow}},
  {from: F(12.6), to: F(15.9), text: 'SAME FINAL. STILL NIL-NIL. STOPPAGE TIME.', hl: {'NIL-NIL': C.yellow}, top: 1165},
  {from: F(15.9), to: F(17.9), text: 'ORANGE BREAK, THREE ON TWO…', hl: {ORANGE: C.orange}},
  {from: F(17.9), to: F(19.5), text: 'THE STRIKER CUTS INSIDE…', hl: {'INSIDE…': C.yellow}},
  {from: F(19.5), to: F(21.7), text: 'AND SHOOTS FROM 30 YARDS.', hl: {'30': C.yellow, YARDS: C.yellow}},
  {from: F(21.7), to: F(23.87), text: "IT'S HEADING STRAIGHT FOR YOU.", hl: {YOU: C.red}},
  {from: F(23.87), to: F(24.8), text: 'IT HITS YOU…', hl: {'YOU…': C.red}},
  {from: F(24.8), to: F(27.1), text: 'AND FLIES INTO THE TOP CORNER.', hl: {TOP: C.yellow, CORNER: C.yellow}},
  {from: F(27.1), to: F(28.7), text: 'ORANGE ARE CELEBRATING.', hl: {ORANGE: C.orange}},
  {from: F(28.7), to: F(31.0), text: 'BLUE ARE FURIOUS.', hl: {BLUE: C.blue, FURIOUS: C.red}},
  {from: F(33.1), to: F(34.6), text: "WHAT'S YOUR CALL?", hl: {CALL: C.yellow}},
  {from: F(34.6), to: F(36.4), text: 'COMMENT A OR B.', hl: {A: C.yellow, B: C.yellow}},
  {from: F(36.4), to: EP2_FRAMES, text: "THE ANSWER'S IN THE NEXT EPISODE.", hl: {NEXT: C.yellow}},
];

type ShotDef = {from: number; to: number; C: React.FC<{from: number}>; filter?: string};
const SHOTS: ShotDef[] = [
  {from: 0, to: F(1.5), C: Shot1},
  {from: F(1.5), to: F(3.5), C: Shot2, filter: 'saturate(0.8) sepia(0.12) contrast(1.05)'},
  {from: F(3.5), to: F(11.4), C: ({from}) => <CardBackdrop from={from} seed={0.2} />},
  {from: F(11.4), to: F(12.6), C: Shot5},
  {from: F(12.6), to: F(15.9), C: Shot6},
  {from: F(15.9), to: F(19.5), C: Shot7},
  {from: F(19.5), to: F(21.7), C: Shot8},
  {from: F(21.7), to: F(23.87), C: Shot9},
  {from: F(23.87), to: F(24.8), C: Shot10},
  {from: F(24.8), to: F(27.1), C: Shot11},
  {from: F(27.1), to: F(28.7), C: Shot12},
  {from: F(28.7), to: F(31.0), C: Shot13},
  {from: F(31.0), to: F(33.1), C: Shot14, filter: 'saturate(0.75) contrast(1.08)'},
  {from: F(33.1), to: EP2_FRAMES, C: ShotVote},
];

const inRange = (f: number, a: number, b: number) => f >= a && f < b;
const clampO = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

export const Episode2: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const replay = inRange(frame, F(31.0), F(33.1));
  const showScore = inRange(frame, 0, F(1.5)) || inRange(frame, F(11.4), F(31.0));
  // flashes: ball hits you (hook + shot 10)
  const flash1 = interpolate(frame, [F(0.77), F(0.8), F(1.07)], [0, 1, 0], clampO);
  const flash2 = frame >= F(23.87) ? interpolate(frame, [F(23.87), F(23.9), F(24.3), F(24.8)], [1, 0.75, 0.35, 0], clampO) : 0;
  // heartbeat red tint while the ball comes at you
  const hb = inRange(frame, F(21.7), F(23.3)) ? (0.5 + 0.5 * Math.pow(Math.abs(Math.sin(((frame - F(21.7)) / fps) * Math.PI * 1.9)), 6)) * interpolate(frame, [F(21.7), F(22.9), F(23.3)], [1, 1, 0], clampO) : 0;
  const goalWhite = interpolate(frame, [F(25.45), F(25.5), F(25.8)], [0, 0.5, 0], clampO);
  const cardFade = interpolate(frame, [F(11.1), F(11.4)], [1, 0], clampO);
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ref-ep2-audio.m4a')} />
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <AbsoluteFill style={{filter: s.filter}}>
            <s.C from={s.from} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* grade: floodlit haze, vignette, top/bottom shade */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />
      {hb > 0 ? <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 50%, rgba(120,0,10,${0.12 * hb}) 30%, rgba(90,0,8,${0.55 * hb}) 100%)`}} /> : null}
      <AbsoluteFill style={{background: '#fff', opacity: Math.max(flash1, flash2 * 0.9, goalWhite)}} />

      {/* stoppage-time title + band */}
      {inRange(frame, F(12.6), F(15.9)) ? <StoppageTitle frame={frame - F(12.6)} fps={fps} /> : null}

      {/* replay letterbox */}
      {replay ? <Replay frame={frame - F(31.0)} fps={fps} /> : null}

      {/* cards */}
      {inRange(frame, F(3.5), F(11.4)) ? (
        <div style={{opacity: cardFade}}>
          <AnswerCard
            title="EPISODE 1: THE ANSWER"
            frame={frame}
            fps={fps}
            from={F(3.5)}
            to={F(11.4)}
            options={[
              {letter: 'A', title: 'GOAL', sub: 'it counts', stamp: {text: 'WRONG', color: '#e5262b', at: F(3.85)}, lose: F(3.85)},
              {letter: 'B', title: 'GOAL KICK', sub: 'no goal', stamp: {text: 'CORRECT', color: '#20b94f', at: F(5.6)}, win: F(5.45)},
            ]}
            law={{text: 'LAW 10: DETERMINING THE OUTCOME', at: F(8.6)}}
          />
        </div>
      ) : null}

      <GoalSlam frame={frame} fps={fps} from={F(11.1)} to={F(11.45)} top={720} />
      <GoalSlam frame={frame} fps={fps} from={F(25.45)} to={F(27.9)} top={430} />

      {/* HUD */}
      {!replay ? <Badge /> : null}
      {showScore ? <Scoreboard frame={frame} fps={fps} goalAt={F(25.6)} /> : null}
      {inRange(frame, F(1.5), F(3.5)) ? <Tag text="LAST EPISODE" frame={frame} fps={fps} from={F(1.5)} style={{top: 172, left: 40}} /> : null}

      <Captions cues={CUES} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const StoppageTitle: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = interpolate(frame, [0, 8], [0, 1], clampO);
  const band = interpolate(frame, [2, 12], [0, 1], clampO);
  return (
    <>
      <div style={{position: 'absolute', top: 1125, left: -60, right: -60, height: 175, transform: `rotate(-4deg) scaleX(${band})`, transformOrigin: 'left center', display: 'flex'}}>
        <div style={{flex: 1, background: 'linear-gradient(90deg,#ff7a1a,#ff9a3d)'}} />
        <div style={{flex: 1, background: 'linear-gradient(90deg,#2f6df0,#4d8bff)'}} />
      </div>
      <div style={{position: 'absolute', top: 360, left: 0, right: 0, textAlign: 'center', transform: `rotate(-3deg) scale(${0.7 + 0.3 * s})`, opacity: s}}>
        <span style={{fontFamily: FONT, fontWeight: 900, fontSize: 118, color: '#fff', WebkitTextStroke: '14px #0d0f14', paintOrder: 'stroke fill', textShadow: '0 12px 30px rgba(0,0,0,.6)'}}>STOPPAGE TIME</span>
      </div>
    </>
  );
};

const Replay: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const bars = interpolate(frame, [0, 6], [0, 1], clampO);
  const rec = Math.floor(frame / 12) % 2 === 0;
  return (
    <>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: 250 * bars, background: '#000'}} />
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 250 * bars, background: '#000'}} />
      <div style={{position: 'absolute', top: 285, left: 50, display: 'flex', alignItems: 'center', gap: 14, fontFamily: FONT, fontWeight: 900, fontSize: 38, color: '#fff', letterSpacing: 1.5, textShadow: '0 4px 12px rgba(0,0,0,.6)'}}>
        <span style={{width: 18, height: 18, borderRadius: 9, background: '#ff3b30', opacity: rec ? 1 : 0.25}} />
        SLOW-MO REPLAY
      </div>
      <div style={{position: 'absolute', top: 280, right: 50, fontFamily: FONT, fontWeight: 800, fontSize: 30, color: 'rgba(255,255,255,.85)'}}>0.25×</div>
      <Tag text="VAR CHECK: GOAL?" frame={frame} fps={fps} from={6} pulse style={{top: 1440, left: 0, right: 0, margin: '0 auto', width: 'fit-content', fontSize: 52, padding: '14px 36px'}} />
    </>
  );
};
