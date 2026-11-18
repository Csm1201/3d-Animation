/**
 * "You're the Ref" — Episode 4 ("Jimmy does what he wants"), 3D, 43.6 s at 30 fps.
 * Carries straight on from Episode 3's penalty shootout. Voices: vidIQ (ElevenLabs) stock voices —
 * narrator "Daniel", Jimmy "George", VAR "Brian" (radio-filtered), keeper "Liam". SFX are synthesised.
 *
 *   0.0  Streaker celebrating -> Jimmy: "The fuck are you doing?"
 *   2.4  Chase  ·  4.2 rugby tackle (WHACK)  ·  5.4 drop kick out of the stadium
 *   7.8  Goal given anyway: "Jimmy does what the fuck he wants."
 *  12.6  Orange's first penalty saved -> "He moved. Retake."  ·  15.9 VAR: "he was on his line"
 *  18.2  "Fuck your call. I'm taking this over."  ·  21.1 red card to the VAR camera
 *  22.7  Blue swarm him: "Retake."  ·  24.3 Orange retake their first penalty
 *  26.8  Jeffrey Epstein runs on from the crowd  ·  28.6 shoves the keeper ("Oi!")
 *  29.8  Slow-motion fingertip save  ·  32.8 the invitation  ·  35.2 save stands
 *  37.6  Vote: does the save count?
 */
import React from 'react';
import {AbsoluteFill, Audio, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BoxGeometry, MeshStandardMaterial, SphereGeometry, Vector3} from 'three';
import {HEIGHT, WIDTH} from '../../core/constants';
import {Pose} from '../../core/walkCycle';
import {BodySpec, idleSpec, keyedSpec, lerpSpec} from '../../core/sportPoses';
import {to3} from '../../character3d/common';
import {Cam} from '../../character3d/stage';
import {Look} from '../../character3d/Worker3D';
import {Actor, armsUp, CALM, FOLD, KICK_BACK, KICK_FOLLOW, KICK_HIT, POINT, runAlong, Scene, shake, ST, THINK} from './Episode2';
import {BEERY, BigTitle, BLUES, keeperDive, Onomatopoeia, ORANGES, ROAR, SPOT, Streaker, streakerRun} from './Episode3';
import {EndingCfg, EndingOverlay} from './Ending';
import {Ep4SaveTest, EPSTEIN} from './Ep4SaveTest';
import {Badge, Captions, Cue, FONT, Scoreboard, Tag} from './Overlays';
import {Ball, BALL_R, yawFor} from './Players';

export const EP4_FPS = 30;
export const EP4_FRAMES = 1308; // 43.6 s
const F = (s: number) => Math.round(s * EP4_FPS);

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const clampO = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const JIMMY = ST.ref;
const BLUE_KEEPER = ST.greenKeeper;

// Jimmy is deadpan: flat brows, small mouth that moves only when he talks
const DEADPAN = (talk: number, t: number): Look => ({
  tired: 0.25,
  droop: 2,
  eyesClosed: false,
  brows: -0.35,
  browLift: -0.2,
  mouth: talk > 0 ? 'open' : 'flat',
  mouthOpen: talk > 0 ? 0.18 + 0.22 * Math.abs(Math.sin(t * 13)) : 0,
  noBlink: true,
});
const GAPE: Look = {tired: 0, droop: -6, eyesClosed: false, brows: 0.8, browLift: 0.8, mouth: 'open', mouthOpen: 0.7, noBlink: true};
const SMUG: Look = {tired: 0, droop: -4, eyesClosed: false, brows: -0.15, browLift: 0.1, mouth: 'smile', noBlink: true};

const handLocal = (pose: Pose, far: boolean) => {
  const z = far ? -0.27 : 0.27;
  const e = to3(pose[far ? 'farArm' : 'nearArm'].elbow, z);
  const w = to3(pose[far ? 'farArm' : 'nearArm'].wrist, z);
  return w.clone().addScaledVector(w.clone().sub(e).normalize(), 0.05);
};

const cardGeo = new BoxGeometry(0.008, 0.11, 0.08);
const redMat = new MeshStandardMaterial({color: '#e5262b', roughness: 0.35});
const goldMat = new MeshStandardMaterial({color: '#e8c25a', roughness: 0.25, metalness: 0.5});
const inviteGeo = new BoxGeometry(0.008, 0.12, 0.17);
const pocketFrontGeo = new BoxGeometry(0.006, 0.1, 0.13);
const pocketMat = new MeshStandardMaterial({color: '#26272c', roughness: 0.6});
const budGeo = new SphereGeometry(0.018, 10, 8);
const budMat = new MeshStandardMaterial({color: '#2a2c32', roughness: 0.4});

// ================================================================ SHOT 1a — the streaker celebrating (0–0.7)
const Shot1a: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const spec = armsUp({...idleSpec(fr, 0.2), lean: -6, lift: Math.max(0, Math.sin(t * 9)) * 50}, t, 1, 1.5);
  const cam: Cam = {position: v3(46.8 - t * 0.4, 1.2, 1.4), target: v3(43.6, 1.35, 0.4), fov: 44};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44, 0, 0)} extent={8} excite={1.8}>
      <Streaker x={43.6} z={0.4} yaw={yawFor(1, 0.3)} spec={spec} frame={fr} t={t} look={ROAR(t)} spray={1} />
    </Scene>
  );
};

// ================================================================ SHOT 1b — Jimmy staring: "The fuck are you doing?" (0.7–2.4)
const Shot1b: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const talk = t > 0.08 && t < 1.7 ? 1 : 0;
  const cam: Cam = {position: v3(46.0 - 1.9, 1.62, -1.2 + 0.9), target: v3(46.0, 1.6, -1.2), fov: 30 - t * 2};
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, -1)} extent={6} excite={1.6}>
      <Actor style={JIMMY} x={46.0} z={-1.2} yaw={yawFor(-1, 0.45)} spec={{...idleSpec(fr, 0.1), nearArm: [-2, 12], farArm: [4, 12]}} frame={fr} look={DEADPAN(talk, t)} />
      <Streaker x={43.2} z={0.6} yaw={yawFor(1, 0.4)} spec={armsUp(idleSpec(fr, 0.2), t, 1, 1.5)} frame={fr} t={t} look={ROAR(t)} spray={0.7} />
    </Scene>
  );
};

// ================================================================ SHOT 2 — the chase (2.4–4.2)
const sPath = (t: number) => ({x: 43.6 + 0.9 * t, z: 0.6 + 3.5 * t});
const jPath = (t: number) => ({x: 45.2 + 0.4 * t - 1.0 * smooth(clamp01(t / 0.6)), z: -1.0 + 4.1 * Math.max(0, t - 0.15)});
const Shot2: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const s = runAlong(sPath, t, 0.75, 0.1);
  const j = runAlong(jPath, t, 0.55, 0.4);
  const mid = v3((s.pos.x + j.pos.x) / 2, 0, (s.pos.z + j.pos.z) / 2);
  const cam: Cam = {position: v3(mid.x + 6.5, 1.5, mid.z + 1.2), target: v3(mid.x, 1.05, mid.z + 0.3), fov: 44};
  return (
    <Scene cam={cam} frame={fr} centre={mid} extent={9} excite={1.8}>
      <Streaker x={s.pos.x} z={s.pos.z} yaw={s.yaw} spec={streakerRun(s.spec, t)} frame={fr} t={t} look={{...ROAR(t), brows: 1, browLift: 1}} spray={1} />
      <Actor style={JIMMY} x={j.pos.x} z={j.pos.z} yaw={j.yaw} spec={j.spec} frame={fr} look={DEADPAN(0, t)} />
    </Scene>
  );
};

// ================================================================ SHOT 3 — rugby tackle (4.2–5.4), freeze on impact
// Side-on: both run along +z; Jimmy launches shoulder-first into the streaker's waist and they go down together.
const TK_HIT = 0.42;
const TK_DIVE: BodySpec = {lean: 4, headTilt: -14, near: {thigh: -12, knee: 14}, far: {thigh: -30, knee: 38}, nearArm: [168, 26], farArm: [158, 40]};
const TK_WRAP: BodySpec = {lean: 8, headTilt: -8, near: {thigh: -6, knee: 22}, far: {thigh: -18, knee: 40}, nearArm: [128, 70], farArm: [120, 78]};
const TK_DOWN: BodySpec = {lean: 6, headTilt: 12, near: {thigh: -8, knee: 18}, far: {thigh: -22, knee: 30}, nearArm: [172, 12], farArm: [160, 26]};
const Shot3: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const T = f / EP4_FPS;
  // hold the impact for a beat (freeze frame)
  const t = T < TK_HIT ? T : T < TK_HIT + 0.3 ? TK_HIT : T - 0.3;
  const fr = from + f;
  const s0 = sPath(1.8);
  const sx = s0.x;
  const run = Math.min(t, TK_HIT);
  const szH = s0.z + 2.8 * TK_HIT;
  const sz = s0.z + 2.8 * run;
  const h = smooth(clamp01((t - TK_HIT) / 0.5));
  const launch = smooth(clamp01((t - 0.18) / (TK_HIT - 0.18)));
  const FACE = yawFor(0, 1);
  // streaker: running away, then driven forward onto his front
  const sRun = streakerRun(runAlong((tt) => ({x: sx, z: s0.z + 2.8 * tt}), run, 0.75, 0.1).spec, t);
  const sSpec = lerpSpec(sRun, TK_DOWN, h);
  // Jimmy: chases, launches (pivot at the feet), shoulder into the waist, rides him down
  const jStart = s0.z - 1.3;
  const jRun = runAlong((tt) => ({x: sx, z: jStart + ((szH - 1.45 - jStart) * tt) / TK_HIT}), run, 0.8, 0.2);
  const jSpec = lerpSpec(lerpSpec(jRun.spec, TK_DIVE, launch), TK_WRAP, h);
  const jz = jRun.pos.z + 1.15 * h;
  const jy = 0.42 * launch * (1 - h) + 0.14 * h;
  const cz = sz - 0.3 + 0.9 * h;
  const cam: Cam = {position: v3(sx + 5.6 + 0.9 * h, 1.1 - 0.15 * h, cz).add(shake(T, T > TK_HIT && T < 0.8 ? 0.05 : 0, 3)), target: v3(sx, 0.7 - 0.25 * h, cz), fov: 42};
  return (
    <Scene cam={cam} frame={fr} centre={v3(sx, 0, sz)} extent={7} excite={2.2}>
      <Streaker x={sx + 0.02} z={sz + 0.3 * h} y={0.22 * h} yaw={FACE} spec={sSpec} frame={fr} t={t} look={{...ROAR(t), brows: 1, eyesClosed: h > 0.1}} spray={h > 0 ? 1 : 0.6} pitch={-86 * h} />
      <Actor style={JIMMY} x={sx - 0.02} z={jz} y={jy} yaw={FACE} pitch={-(72 * launch + 8 * h)} spec={jSpec} frame={fr} look={{...DEADPAN(0, t), brows: -0.8}} />
    </Scene>
  );
};

// ================================================================ SHOT 4 — drop kick out of the stadium (5.4–7.8)
const Shot4: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const base = v3(46.5, 0, 7.2);
  const kickT = 0.55;
  const jSpec = keyedSpec(
    [
      [0, idleSpec(fr, 0.2)],
      [kickT - 0.2, KICK_BACK],
      [kickT, KICK_HIT],
      [kickT + 0.3, KICK_FOLLOW],
      [kickT + 0.9, {...idleSpec(fr, 0.2), nearArm: [20, 30], farArm: [24, 30]}],
    ],
    t,
  );
  // streaker hunched in front of him, then launched up and away over the end stand, spinning
  const fly = Math.max(0, t - kickT);
  const sp = v3(base.x + 0.9 + 15 * fly, Math.max(0, 0.15 + 26 * fly - 4.9 * fly * fly), base.z - 1.8 * fly);
  const sSpec: BodySpec = {lean: 40, headTilt: 20, near: {thigh: 70, knee: 90}, far: {thigh: 65, knee: 95}, nearArm: [80, 90], farArm: [75, 95]};
  const look = Math.min(1, fly / 1.2);
  const cam: Cam = {
    position: v3(base.x - 4.2 + look * 1.0, 1.3 + look * 0.6, base.z + 1.6),
    target: v3(lerp(base.x + 1, sp.x, look), lerp(1.0, sp.y, look), lerp(base.z, sp.z, look)),
    fov: 48,
    far: 400,
  };
  return (
    <Scene cam={cam} frame={fr} centre={base} extent={8} excite={2.4}>
      <Actor style={JIMMY} x={base.x} z={base.z} yaw={0} spec={jSpec} frame={fr} look={DEADPAN(0, t)} />
      {sp.y < 90 ? <Streaker x={sp.x} z={sp.z} y={sp.y} yaw={0} spec={sSpec} frame={fr} t={t} look={{...ROAR(t), brows: 1}} spray={fly > 0 ? 1 : 0} roll={fly * 540} /> : null}
    </Scene>
  );
};

// ================================================================ SHOT 5 — goal given anyway (7.8–12.6)
const Shot5: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const dust = t < 1.2 ? Math.sin(t * 22) * 18 : 0;
  const spec = keyedSpec(
    [
      [0, {...idleSpec(fr, 0.2), nearArm: [55 + dust, 70], farArm: [55 - dust, 70]}],
      [1.2, {...idleSpec(fr, 0.2), nearArm: [55, 70], farArm: [55, 70]}],
      [1.7, POINT],
      [4.8, POINT],
    ],
    t,
  );
  const turn = smooth(clamp01((t - 1.2) / 0.5));
  const cam: Cam = {position: v3(43.4, 1.5, 3.4 - t * 0.12), target: v3(46.4, 1.45, 0.6), fov: 40};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44, 0, 0)} extent={10} excite={1.4}>
      <Actor style={JIMMY} x={46.4} z={0.6} yaw={lerp(yawFor(-1, 0.6), yawFor(-1, -0.2), turn)} spec={spec} frame={fr} look={DEADPAN(0, t)} />
      {ORANGES.slice(0, 3).map((st, i) => (
        <Actor key={i} style={st} x={49.2 + i * 0.9} z={-1.6 + i * 1.3} yaw={yawFor(-1, 0.3)} spec={{...idleSpec(fr + i * 7, 0.2), nearArm: [160, 150], farArm: [158, 150]}} frame={fr} look={GAPE} />
      ))}
    </Scene>
  );
};

// ================================================================ SHOT 6a — Orange's first penalty, saved (12.6–13.7)
const Shot6a: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const kickT = 0.35;
  const run = runAlong((tt) => ({x: SPOT.x - 1.6 + 1.2 * smooth(clamp01(tt / 0.35)), z: 0.4}), Math.min(t, 0.3), 0.6, 0.2);
  const spec = keyedSpec([[0.15, run.spec], [kickT - 0.12, KICK_BACK], [kickT, KICK_HIT], [kickT + 0.25, KICK_FOLLOW]], t);
  const k = keeperDive(t, -1, kickT - 0.02); // dives to his left (+z), gets there
  const fly = 0.3;
  const save = v3(52.2, 0.7, 1.4);
  const ball =
    t < kickT
      ? v3(SPOT.x, BALL_R, SPOT.z)
      : t < kickT + fly
        ? v3(SPOT.x, BALL_R, SPOT.z).lerp(save, (t - kickT) / fly)
        : save.clone().add(v3(-4 * (t - kickT - fly), 0, 3 * (t - kickT - fly))).setY(Math.max(BALL_R, 0.7 - 3 * (t - kickT - fly)));
  const cam: Cam = {position: v3(36.0, 2.6, -2.2), target: v3(50.5, 0.9, 0.6), fov: 32};
  return (
    <Scene cam={cam} frame={fr} centre={v3(47, 0, 0)} extent={12} excite={1.6}>
      <Actor style={ST.seven} x={SPOT.x - 1.6 + 1.2 * smooth(clamp01(Math.min(t, 0.35) / 0.35)) - 0.45} z={0.4} yaw={0} spec={spec} frame={fr} look={CALM} />
      <Actor style={BLUE_KEEPER} x={51.9} z={k.z} y={k.y} yaw={Math.PI} spec={k.spec} frame={fr} roll={k.roll} />
      <Ball pos={ball} spin={t * 30} axisYaw={yawFor(1, 0.3)} />
    </Scene>
  );
};

// ================================================================ SHOT 6b — Jimmy: "He moved. Retake." (13.7–15.9)
const Shot6b: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const talk = t > 0.05 && t < 2.1 ? 1 : 0;
  const spec = keyedSpec([[0, {...idleSpec(fr, 0.1), nearArm: [150, 120]}], [0.3, POINT], [2.2, POINT]], t);
  const cam: Cam = {position: v3(47.6, 1.62, 2.4), target: v3(47.0, 1.58, 0.6), fov: 32};
  return (
    <Scene cam={cam} frame={fr} centre={v3(47, 0, 0)} extent={8} excite={1.5}>
      <Actor style={JIMMY} x={47.0} z={0.6} yaw={yawFor(1, 0.25)} spec={spec} frame={fr} look={{...DEADPAN(talk, t), yaw: -18}} />
    </Scene>
  );
};

// ================================================================ SHOT 7 — VAR check: on his line (15.9–18.2)
const Shot7: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const fr = from + f;
  const cam: Cam = {position: v3(52.5, 0.32, 2.6), target: v3(52.45, 0.1, 0.25), fov: 26};
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{filter: 'saturate(0.75) contrast(1.1)'}}>
        <Scene cam={cam} frame={fr} centre={v3(52, 0, 0)} extent={5} excite={0.8}>
          <Actor style={BLUE_KEEPER} x={52.42} z={0.25} yaw={Math.PI} spec={{...idleSpec(0, 0), lean: 14, near: {thigh: 26, knee: 50}, far: {thigh: 22, knee: 48}, nearArm: [40, 24], farArm: [36, 26]}} frame={0} look={CALM} />
        </Scene>
      </AbsoluteFill>
      <VarChrome frame={f} />
    </AbsoluteFill>
  );
};
const VarChrome: React.FC<{frame: number}> = ({frame}) => {
  const tick = interpolate(frame, [18, 26], [0, 1], clampO);
  return (
    <AbsoluteFill>
      <div style={{position: 'absolute', inset: 26, border: '6px solid #6fe3ff', borderRadius: 18, boxShadow: '0 0 40px rgba(111,227,255,.5) inset'}} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.12) 0 2px, transparent 2px 5px)'}} />
      <div style={{position: 'absolute', top: 210, left: 60, background: '#0d0f14', color: '#6fe3ff', fontFamily: FONT, fontWeight: 900, fontSize: 54, padding: '10px 26px', letterSpacing: 4}}>VAR CHECK</div>
      <div style={{position: 'absolute', top: 300, left: 60, color: '#ffffff', fontFamily: FONT, fontWeight: 800, fontSize: 36, background: 'rgba(13,15,20,.7)', padding: '6px 20px'}}>KEEPER ENCROACHMENT</div>
      {/* goal line marker */}
      <div style={{position: 'absolute', top: 980, left: 0, right: 0, height: 6, background: '#ff3b6b', opacity: 0.85, transform: 'rotate(-4deg)'}} />
      <div style={{position: 'absolute', top: 870, right: 70, background: '#20b94f', color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 48, padding: '10px 24px', borderRadius: 10, transform: `scale(${0.6 + 0.4 * tick})`, opacity: tick}}>ON THE LINE ✓</div>
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 8 — "Fuck your call. I'm taking this over." (18.2–21.1)
const Shot8: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const talk = t > 0.1 && t < 2.8 ? 1 : 0;
  const spec = keyedSpec(
    [
      [0, {...idleSpec(fr, 0.1), nearArm: [150, 150]}],
      [0.6, {...idleSpec(fr, 0.1), nearArm: [150, 150]}],
      [1.1, {...idleSpec(fr, 0.1), nearArm: [70, 30]}],
      [2.9, {...idleSpec(fr, 0.1), nearArm: [10, 20]}],
    ],
    t,
  );
  const dropT = 1.2;
  const cam: Cam = {position: v3(46.0 - 1.7, 1.62, 1.0 + 0.7), target: v3(46.0, 1.55, 1.0), fov: 30};
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 1)} extent={6} excite={1.4}>
      <Actor style={JIMMY} x={46.0} z={1.0} yaw={yawFor(-1, 0.4)} spec={spec} frame={fr} look={{...DEADPAN(talk, t), brows: -0.55}}>
        {(pose) => {
          const h = handLocal(pose, false);
          const fall = Math.max(0, t - dropT);
          return <mesh geometry={budGeo} material={budMat} position={t < dropT ? [h.x, h.y, h.z] : [h.x + 0.1 * fall, Math.max(0.02, h.y - 4.9 * fall * fall), h.z]} />;
        }}
      </Actor>
    </Scene>
  );
};

// ================================================================ SHOT 9 — red card to the VAR camera, static (21.1–22.7)
const Shot9: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const spec = keyedSpec([[0, idleSpec(fr, 0.1)], [0.35, {...idleSpec(fr, 0.1), nearArm: [100, 4]}], [1.6, {...idleSpec(fr, 0.1), nearArm: [100, 4]}]], t);
  const cam: Cam = {position: v3(44.6, 1.6, 0.5).add(shake(t, t > 0.55 ? 0.03 : 0, 9)), target: v3(46.2, 1.5, 0.5), fov: 40};
  const staticOn = t > 0.7;
  return (
    <AbsoluteFill>
      <Scene cam={cam} frame={fr} centre={v3(46, 0, 0.5)} extent={6} excite={1.5}>
        <Actor style={JIMMY} x={46.2} z={0.5} yaw={Math.PI} spec={spec} frame={fr} look={DEADPAN(0, t)}>
          {(pose) => {
            const h = handLocal(pose, false);
            return <mesh geometry={cardGeo} material={redMat} position={[h.x + 0.02, h.y + 0.06, h.z]} scale={2.4} />;
          }}
        </Actor>
      </Scene>
      {staticOn ? (
        <AbsoluteFill>
          <svg width={WIDTH} height={HEIGHT} style={{position: 'absolute', inset: 0}}>
            <filter id={`n${f}`}>
              <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={f} />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter={`url(#n${f})`} opacity={0.92} />
          </svg>
          <div style={{position: 'absolute', top: 760, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 64, color: '#fff', textShadow: '0 4px 20px #000'}}>NO SIGNAL</div>
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 10 — Blue swarm him: "Retake." (22.7–24.3)
const SWARM = [
  {from: {x: 41.5, z: -3.5}, to: {x: 44.9, z: -0.9}},
  {from: {x: 41.0, z: 3.2}, to: {x: 44.8, z: 1.3}},
  {from: {x: 48.5, z: -4.0}, to: {x: 46.4, z: -1.3}},
  {from: {x: 48.8, z: 3.6}, to: {x: 46.6, z: 1.2}},
];
const Shot10: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const T = f / EP4_FPS;
  const fr = from + f;
  const freezeAt = 0.75; // he raises one finger and they all stop dead
  const t = Math.min(T, freezeAt);
  const fing = smooth(clamp01((T - 0.55) / 0.2));
  const talk = T > 0.7 && T < 1.6 ? 1 : 0;
  const cam: Cam = {position: v3(42.6, 3.2, 4.4), target: v3(45.7, 1.1, 0.1), fov: 44};
  return (
    <Scene cam={cam} frame={fr} centre={v3(45.7, 0, 0)} extent={8} excite={1.8}>
      <Actor style={JIMMY} x={45.7} z={0.1} yaw={yawFor(-1, 0.7)} spec={{...idleSpec(fr, 0.1), nearArm: [lerp(-2, 165, fing), lerp(12, 4, fing)]}} frame={fr} look={DEADPAN(talk, T)} />
      {SWARM.map((s, i) => {
        const r = runAlong((tt) => ({x: lerp(s.from.x, s.to.x, smooth(clamp01(tt / 0.75))), z: lerp(s.from.z, s.to.z, smooth(clamp01(tt / 0.75)))}), t, 0.8, i * 0.25);
        const yell: Look = {tired: 0, droop: -4, eyesClosed: false, brows: -1, browLift: -0.2, mouth: 'open', mouthOpen: T < freezeAt ? 0.5 + 0.3 * Math.abs(Math.sin(T * 12 + i)) : 0.6, noBlink: true};
        return <Actor key={i} style={BLUES[i]} x={r.pos.x} z={r.pos.z} yaw={yawFor(45.7 - r.pos.x, 0.1 - r.pos.z)} spec={{...r.spec, nearArm: [120, 40], farArm: [110, 50]}} frame={fr} look={yell} />;
      })}
    </Scene>
  );
};

// ================================================================ SHOT 11 — Orange retake their first penalty (24.3–26.8)
const Shot11: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const walk = runAlong((tt) => ({x: SPOT.x - 0.6 - 1.8 * smooth(clamp01((tt - 0.6) / 1.0)), z: 0.45}), t, 0.3, 0.1, {x: 60, z: 0.45});
  const hop = Math.abs(Math.sin(t * 5)) * 18;
  const cam: Cam = {position: v3(55.4, 2.0, -2.4), target: v3(44, 0.9, 0.6), fov: 38};
  return (
    <Scene cam={cam} frame={fr} centre={v3(48, 0, 0)} extent={10} excite={1.4}>
      <Actor style={ST.ten} x={walk.pos.x} z={0.45} yaw={0} spec={t < 0.6 ? {...idleSpec(fr, 0.1), lean: 30, nearArm: [40, 30], farArm: [36, 30]} : walk.spec} frame={fr} look={{...CALM, brows: -0.5}} />
      <Actor style={BLUE_KEEPER} x={52.0} z={0.1} yaw={Math.PI} spec={{...idleSpec(fr, 0.3), lift: hop, nearArm: [40, 20], farArm: [36, 22]}} frame={fr} look={CALM} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 12 — Epstein vaults out of the crowd (26.8–28.6)
const ePath = (t: number) => {
  const u = smooth(clamp01((t - 0.25) / 1.5));
  return {x: lerp(57.6, 52.4, u), z: lerp(-6.5, -0.4, u)};
};
const Shot12: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const r = runAlong(ePath, t, 0.85, 0.3);
  const vault = t < 0.45 ? Math.sin(Math.PI * clamp01(t / 0.45)) * 1.1 : 0;
  const cam: Cam = {position: v3(46.4, 1.5, -7.6), target: v3(lerp(56, 52.6, smooth(clamp01(t / 1.6))), 1.15, lerp(-5.5, -1.6, smooth(clamp01(t / 1.6)))), fov: 40};
  return (
    <Scene cam={cam} frame={fr} centre={v3(53, 0, -3)} extent={10} excite={2.0}>
      <Actor style={EPSTEIN} x={r.pos.x} z={r.pos.z} y={vault} yaw={r.yaw} spec={t < 0.45 ? {...r.spec, near: {thigh: 70, knee: 90}, far: {thigh: 40, knee: 60}} : r.spec} frame={fr} look={SMUG} />
      <Actor style={BLUE_KEEPER} x={52.0} z={0.1} yaw={Math.PI} spec={{...idleSpec(fr, 0.3), nearArm: [40, 20], farArm: [36, 22]}} frame={fr} look={CALM} />
    </Scene>
  );
};

// ================================================================ SHOT 13 — the shove: "Oi!" (28.6–29.8)
const Shot13: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const push = smooth(clamp01((t - 0.2) / 0.25));
  const fall = smooth(clamp01((t - 0.3) / 0.6));
  const eSpec = lerpSpec(idleSpec(fr, 0.1), {lean: 18, headTilt: 0, near: {thigh: 20, knee: 20}, far: {thigh: -10, knee: 15}, nearArm: [85, 5], farArm: [85, 5]}, push);
  const kSpec = lerpSpec(idleSpec(fr, 0.2), {lean: -20, headTilt: -8, near: {thigh: 80, knee: 40}, far: {thigh: 75, knee: 60}, nearArm: [-30, 40], farArm: [-25, 45]}, fall);
  const cam: Cam = {position: v3(46.6, 1.5, 3.4), target: v3(52.2, 1.0, 0.6), fov: 38};
  return (
    <Scene cam={cam} frame={fr} centre={v3(52, 0, 0.5)} extent={7} excite={2.0}>
      <Actor style={EPSTEIN} x={lerp(52.5, 52.0, push)} z={lerp(-0.6, 0.1, push)} yaw={yawFor(0.1, 1)} spec={eSpec} frame={fr} look={SMUG} />
      <Actor style={BLUE_KEEPER} x={lerp(52.0, 52.6, fall)} z={lerp(0.3, 2.9, fall)} y={Math.sin(Math.PI * fall) * 0.25} yaw={Math.PI} roll={-fall * 40 * (1 - fall)} spec={kSpec} frame={fr} look={{...CALM, brows: 0.8, browLift: 0.7, mouth: 'open', mouthOpen: 0.6}} />
    </Scene>
  );
};

// ================================================================ SHOT 15 — the invitation (32.8–35.2)
const Shot15: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const walkIn = runAlong((tt) => ({x: lerp(49.5, 47.3, smooth(clamp01(tt / 0.7))), z: lerp(-1.6, 0.4, smooth(clamp01(tt / 0.7)))}), Math.min(t, 0.7), 0.4, 0.2);
  const runOff = runAlong((tt) => ({x: 47.3 + 6 * Math.max(0, tt - 1.7) * Math.max(0, tt - 1.7), z: 0.4 - 5 * Math.max(0, tt - 1.7) * Math.max(0, tt - 1.7)}), t, 0.9, 0.3);
  const hand = smooth(clamp01((t - 0.7) / 0.3)) * (1 - smooth(clamp01((t - 1.35) / 0.2)));
  const eSpec = t < 0.7 ? walkIn.spec : t < 1.7 ? {...idleSpec(fr, 0.1), nearArm: [lerp(-2, 80, hand), lerp(12, 8, hand)] as [number, number]} : runOff.spec;
  const ePos = t < 1.7 ? walkIn.pos : runOff.pos;
  const eYaw = t < 1.7 ? yawFor(46.2 - ePos.x, 0.4 - ePos.z) : runOff.yaw;
  const take = smooth(clamp01((t - 1.0) / 0.3));
  const wink = t > 1.4 && t < 1.62;
  const cam: Cam = {position: v3(45.6, 1.55, 3.3), target: v3(46.9, 1.4, 0.2), fov: 38};
  return (
    <Scene cam={cam} frame={fr} centre={v3(47, 0, 0)} extent={8} excite={1.6}>
      <Actor style={EPSTEIN} x={ePos.x} z={ePos.z} yaw={eYaw} spec={eSpec} frame={fr} look={{...SMUG, eyesClosed: wink}}>
        {(pose) => {
          if (t > 1.15) return null;
          const h = handLocal(pose, false);
          return <mesh geometry={inviteGeo} material={goldMat} position={[h.x + 0.02, h.y, h.z]} />;
        }}
      </Actor>
      <Actor style={JIMMY} x={46.2} z={0.4} yaw={yawFor(1, 0)} spec={{...idleSpec(fr, 0.1), nearArm: [lerp(-2, 75, take), lerp(12, 30, take)]}} frame={fr} look={DEADPAN(0, t)}>
        {(pose) => {
          if (t < 1.15) return null;
          const h = handLocal(pose, false);
          return <mesh geometry={inviteGeo} material={goldMat} position={[h.x + 0.02, h.y, h.z]} />;
        }}
      </Actor>
    </Scene>
  );
};
const InviteCard: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame, fps, config: {damping: 12, stiffness: 160}});
  return (
    <div style={{position: 'absolute', top: 420, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${0.4 + 0.6 * s}) rotate(${-6 + 3 * (1 - s)}deg)`, opacity: Math.min(1, s * 2)}}>
      <div style={{width: 760, padding: '46px 40px', background: 'linear-gradient(160deg, #fffaf0, #f3e3bd)', border: '10px double #c79a2e', borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,.55)', textAlign: 'center', fontFamily: 'Georgia, "Times New Roman", serif', color: '#3a2a12'}}>
        <div style={{fontSize: 46, letterSpacing: 8, fontStyle: 'italic'}}>You're invited</div>
        <div style={{fontSize: 120, lineHeight: 1.1, margin: '14px 0 6px'}}>🌴</div>
        <div style={{fontSize: 92, fontWeight: 700, letterSpacing: 6}}>THE ISLAND</div>
      </div>
    </div>
  );
};

// ================================================================ SHOT 16 — save stands (35.2–37.6): the invite goes in the top pocket
/** Chest pocket (far side of the ref shirt) in actor-local space. */
const pocketLocal = (pose: Pose) => {
  const l = -pose.lean * DEG2;
  const px = 0.13, py = 0.45;
  return to3(pose.pelvis, 0).add(new Vector3(px * Math.cos(l) - py * Math.sin(l), px * Math.sin(l) + py * Math.cos(l), -0.08));
};
/** The invite standing in the pocket; `sink` 0 = resting on the pocket lip, 1 = pushed in (top still showing). */
const PocketCard: React.FC<{pose: Pose; sink: number}> = ({pose, sink}) => {
  const p = pocketLocal(pose);
  const r: [number, number, number] = [0, 0, -pose.lean * DEG2];
  return (
    <>
      <mesh geometry={inviteGeo} material={goldMat} position={[p.x + 0.014, p.y + 0.1 - 0.075 * sink, p.z]} rotation={[Math.PI / 2, 0, r[2]]} />
      {/* pocket front drawn over the card so it reads as tucked in */}
      <mesh geometry={pocketFrontGeo} material={pocketMat} position={[p.x + 0.024, p.y, p.z]} rotation={r} />
    </>
  );
};
const DEG2 = Math.PI / 180;
const Shot16: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const HOLD: [number, number] = [75, 30];
  const POCKET: [number, number] = [28, 128];
  const spec = keyedSpec(
    [
      [0, {...idleSpec(fr, 0.1), farArm: HOLD}],
      [0.45, {...idleSpec(fr, 0.1), farArm: HOLD}],
      [0.85, {...idleSpec(fr, 0.1), farArm: POCKET}], // card to the top pocket
      [1.2, {...idleSpec(fr, 0.1), farArm: POCKET}], // pat it in
      [1.5, {...idleSpec(fr, 0.1)}],
      [1.8, POINT],
      [2.4, POINT],
    ],
    t,
  );
  const into = smooth(clamp01((t - 0.72) / 0.16)); // hand → pocket lip
  const sink = smooth(clamp01((t - 0.92) / 0.25));
  const zoom = smooth(clamp01((t - 0.3) / 0.5)) * (1 - smooth(clamp01((t - 1.35) / 0.45)));
  const cam: Cam = {position: v3(lerp(43.4, 44.6, zoom), lerp(1.6, 1.5, zoom), lerp(2.6, 1.9, zoom)), target: v3(46.2, lerp(1.35, 1.25, zoom), 0.4), fov: lerp(38, 30, zoom)};
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 0)} extent={7} excite={1.5}>
      <Actor style={JIMMY} x={46.2} z={0.4} yaw={lerp(yawFor(-1, 0.6), yawFor(0.35, 1), smooth(clamp01((t - 1.4) / 0.4)))} spec={spec} frame={fr} look={DEADPAN(0, t)}>
        {(pose) => {
          if (into >= 1) return <PocketCard pose={pose} sink={sink} />;
          const h = handLocal(pose, true);
          const p = pocketLocal(pose);
          const pos = new Vector3(h.x + 0.02, h.y, h.z).lerp(new Vector3(p.x + 0.014, p.y + 0.1, p.z), into);
          return <mesh geometry={inviteGeo} material={goldMat} position={pos.toArray()} rotation={[(Math.PI / 2) * into, 0, -pose.lean * DEG2 * into]} />;
        }}
      </Actor>
    </Scene>
  );
};

// ================================================================ SHOT 17 — vote (37.6–43.6)
const EP4_ENDING: EndingCfg = {
  a: {title: 'YES', sub: "ref's decision is final"},
  b: {title: 'NO', sub: "fans can't play: retake"},
  commentAt: 3.3,
  nextAt: 4.9,
  nextLabel: 'ANSWER IN EPISODE 5',
  nextEp: 5,
  comments: [
    {user: 'pint_and_a_pie', text: 'Jimmy sending off VAR is the best thing I have seen all season', pick: '?', likes: 1204},
    {user: 'laws_of_the_game', text: 'B. Outside agent, retake the pen', pick: 'B', likes: 512},
    {user: 'orange_army', text: 'Did not have him on the team sheet', pick: '?', likes: 877},
    {user: 'sunday_league_ref', text: "A. Ref's decision is final, always has been", pick: 'A', likes: 233},
    {user: 'blu_til_i_die', text: 'Jimmy pocketing the invite 💀', pick: '?', likes: 958},
  ],
};
const ShotVote4: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP4_FPS;
  const fr = from + f;
  const C = EP4_ENDING;
  const spec = keyedSpec(
    [
      [0, {...idleSpec(fr, 0.3), nearArm: [-4, 14], farArm: [5, 14]}],
      [0.4, THINK],
      [C.commentAt - 0.1, {...THINK, nearArm: [154, 150]}],
      [C.commentAt + 0.2, POINT],
      [C.nextAt - 0.1, {...POINT, nearArm: [92, 2]}],
      [C.nextAt + 0.3, {...FOLD, nearArm: [-30, 32], farArm: [-26, 36]}],
      [6, {...FOLD, nearArm: [-30, 32], farArm: [-26, 36]}],
    ],
    t,
  );
  const push = smooth(clamp01(t / 6));
  const cam: Cam = {position: v3(3.0 - push * 0.5, 1.55, 0.8 - push * 0.4), target: v3(0, 1.68, 0.05), fov: 42};
  return (
    <>
      <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={12} excite={1.1}>
        <Actor style={JIMMY} x={0} z={0} yaw={yawFor(1, 0.12)} spec={spec} frame={fr} look={{...DEADPAN(0, t), mouth: t > C.nextAt ? 'smile' : 'flat'}}>
          {(pose) => <PocketCard pose={pose} sink={1} />}
        </Actor>
      </Scene>
      <EndingOverlay frame={f} fps={EP4_FPS} cfg={EP4_ENDING} />
    </>
  );
};

// ================================================================ shootout tally under the scoreboard
const Tally: React.FC<{blue: ('g' | 'x' | null)[]; orange: ('g' | 'x' | null)[]}> = ({blue, orange}) => {
  const row = (label: string, color: string, marks: ('g' | 'x' | null)[]) => (
    <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
      <div style={{width: 64, fontFamily: FONT, fontWeight: 900, fontSize: 22, color}}>{label}</div>
      {Array.from({length: 5}, (_, i) => {
        const m = marks[i] ?? null;
        return (
          <div key={i} style={{width: 24, height: 24, borderRadius: 12, border: '3px solid rgba(255,255,255,.75)', background: m === 'g' ? '#20b94f' : m === 'x' ? '#e5262b' : 'transparent', color: '#fff', fontSize: 16, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT}}>
            {m === 'x' ? '✕' : ''}
          </div>
        );
      })}
    </div>
  );
  return (
    <div style={{position: 'absolute', top: 132, right: 40, background: 'rgba(13,15,20,.82)', borderRadius: 12, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6}}>
      {row('BLU', '#5a95ff', blue)}
      {row('ORA', '#ff8a2a', orange)}
    </div>
  );
};

// ================================================================ captions, sound, timeline
const C = {orange: '#ff8a2a', blue: '#5a95ff', red: '#ff4d4d', green: '#45e070', yellow: '#ffd23a', cyan: '#6fe3ff'};
const CUES: Cue[] = [
  {from: F(0.75), to: F(2.4), text: 'THE FUCK ARE YOU DOING?', hl: {'DOING?': C.yellow}},
  {from: F(7.9), to: F(10.5), text: 'AND JIMMY GIVES THE GOAL ANYWAY.', hl: {GOAL: C.green, 'ANYWAY.': C.green}},
  {from: F(10.5), to: F(12.6), text: 'JIMMY DOES WHAT THE FUCK HE WANTS.', hl: {'WANTS.': C.yellow}},
  {from: F(13.75), to: F(15.9), text: 'HE MOVED. RETAKE.', hl: {'RETAKE.': C.red}},
  {from: F(16.0), to: F(18.2), text: 'VAR: JIMMY… HE WAS ON HIS LINE.', hl: {'VAR:': C.cyan, LINE: C.green, 'LINE.': C.green}},
  {from: F(18.3), to: F(21.1), text: "FUCK YOUR CALL. I'M TAKING THIS OVER.", hl: {FUCK: C.red, 'OVER.': C.yellow}},
  {from: F(23.35), to: F(24.3), text: 'RETAKE.', hl: {'RETAKE.': C.red}},
  {from: F(24.35), to: F(26.8), text: 'ORANGE RETAKE THEIR FIRST PENALTY…', hl: {ORANGE: C.orange}},
  {from: F(34.7), to: F(36.45), text: "JIMMY'S GOT SUMMER PLANS.", hl: {SUMMER: C.yellow, 'PLANS.': C.yellow}},
  {from: F(36.45), to: F(37.6), text: 'SAVE STANDS.', hl: {'STANDS.': C.green}},
  {from: F(37.8), to: F(40.6), text: 'SO, REF… DOES THE SAVE COUNT?', hl: {SAVE: C.yellow, 'COUNT?': C.yellow}},
  {from: F(40.6), to: EP4_FRAMES, text: 'A OR B IN THE COMMENTS.', hl: {A: C.yellow, B: C.yellow}},
];

type Sfx = {at: number; src: string; vol?: number};
const SOUND: Sfx[] = [
  {at: 0.75, src: 'jimmy-fuck-doing.mp3'},
  {at: 2.3, src: 'whoosh.wav', vol: 0.5},
  {at: 4.62, src: 'whack.wav'},
  {at: 4.66, src: 'crowd-ooh.wav', vol: 0.8},
  {at: 5.95, src: 'kick.wav'},
  {at: 5.98, src: 'whoosh.wav', vol: 0.8},
  {at: 6.1, src: 'crowd-roar.wav', vol: 0.8},
  {at: 7.35, src: 'twinkle.wav', vol: 0.7},
  {at: 7.9, src: 'nar-gives-goal.mp3'},
  {at: 9.05, src: 'whistle.wav', vol: 0.6},
  {at: 12.95, src: 'kick.wav'},
  {at: 13.25, src: 'crowd-ooh.wav', vol: 0.6},
  {at: 13.65, src: 'whistle.wav', vol: 0.7},
  {at: 13.75, src: 'jimmy-he-moved.mp3'},
  {at: 15.9, src: 'radio-blip.wav'},
  {at: 16.0, src: 'var-radio.wav'},
  {at: 18.3, src: 'jimmy-fuck-your-call.mp3'},
  {at: 21.8, src: 'static.wav', vol: 0.8},
  {at: 23.35, src: 'jimmy-retake.mp3'},
  {at: 23.25, src: 'whistle.wav', vol: 0.5},
  {at: 24.35, src: 'nar-orange-retake.mp3'},
  {at: 26.85, src: 'crowd-gasp.wav', vol: 0.9},
  {at: 28.95, src: 'keeper-oi.mp3'},
  {at: 28.85, src: 'whack.wav', vol: 0.5},
  {at: 30.9, src: 'crowd-roar.wav', vol: 0.9},
  {at: 34.25, src: 'twinkle.wav', vol: 0.5},
  {at: 34.7, src: 'nar-summer.mp3'},
  {at: 36.7, src: 'whistle.wav', vol: 0.4},
  {at: 37.8, src: 'nar-vote.mp3'},
];

type ShotDef = {from: number; to: number; C: React.FC<{from: number}>};
const SHOTS: ShotDef[] = [
  {from: 0, to: F(0.7), C: Shot1a},
  {from: F(0.7), to: F(2.4), C: Shot1b},
  {from: F(2.4), to: F(4.2), C: Shot2},
  {from: F(4.2), to: F(5.4), C: Shot3},
  {from: F(5.4), to: F(7.8), C: Shot4},
  {from: F(7.8), to: F(12.6), C: Shot5},
  {from: F(12.6), to: F(13.7), C: Shot6a},
  {from: F(13.7), to: F(15.9), C: Shot6b},
  {from: F(15.9), to: F(18.2), C: Shot7},
  {from: F(18.2), to: F(21.1), C: Shot8},
  {from: F(21.1), to: F(22.7), C: Shot9},
  {from: F(22.7), to: F(24.3), C: Shot10},
  {from: F(24.3), to: F(26.8), C: Shot11},
  {from: F(26.8), to: F(28.6), C: Shot12},
  {from: F(28.6), to: F(29.8), C: Shot13},
  {from: F(29.8), to: F(32.8), C: () => <Ep4SaveTest inEpisode />},
  {from: F(32.8), to: F(35.2), C: Shot15},
  {from: F(35.2), to: F(37.6), C: Shot16},
  {from: F(37.6), to: EP4_FRAMES, C: ShotVote4},
];
const inRange = (f: number, a: number, b: number) => f >= a && f < b;

export const Episode4: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = frame / fps;
  const showScore = frame < F(37.6) && !inRange(frame, F(15.9), F(18.2));
  const blue: ('g' | 'x' | null)[] = [T >= 9.05 ? 'g' : null];
  const orange: ('g' | 'x' | null)[] = [T >= 31.0 ? 'x' : null];
  const twinkle = inRange(frame, F(7.3), F(7.8)) ? Math.abs(Math.sin((T - 7.3) * 18)) : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ep4/crowd-bed.wav')} volume={0.55} />
      {SOUND.map((s, i) => (
        <Sequence key={`a${i}`} from={F(s.at)} layout="none">
          <Audio src={staticFile(`ep4/${s.src}`)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <AbsoluteFill>
            <s.C from={s.from} />
          </AbsoluteFill>
        </Sequence>
      ))}

      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />

      {/* titles */}
      {inRange(frame, F(4.62), F(5.4)) ? <Onomatopoeia text="WHACK!" t={T - 4.62} top={330} /> : null}
      {inRange(frame, F(6.2), F(7.8)) ? <BigTitle text="OUT OF THE STADIUM" frame={frame - F(6.2)} fps={fps} top={300} size={70} rot={-5} color="#ffd23a" /> : null}
      {twinkle > 0 ? <div style={{position: 'absolute', top: 360, left: 640, fontSize: 90, opacity: twinkle, transform: `scale(${0.6 + twinkle * 0.6}) rotate(${T * 200}deg)`}}>✨</div> : null}
      {inRange(frame, F(8.9), F(12.6)) ? <Tag text="GOAL GIVEN 🤷‍♂️" frame={frame} fps={fps} from={F(9.0)} bg="#20b94f" style={{top: 330, left: 0, right: 0, margin: '0 auto', width: 'fit-content', fontSize: 64, padding: '12px 40px', rotate: '-6deg'}} /> : null}
      {inRange(frame, F(13.65), F(15.9)) ? <Tag text="RETAKE!" frame={frame} fps={fps} from={F(13.65)} style={{top: 330, left: 0, right: 0, margin: '0 auto', width: 'fit-content', fontSize: 70, padding: '12px 44px', rotate: '-5deg'}} /> : null}
      {inRange(frame, F(21.9), F(22.7)) ? <BigTitle text="VAR: SENT OFF" frame={frame - F(21.9)} fps={fps} top={330} size={100} rot={-5} color="#ff4d4d" /> : null}
      {inRange(frame, F(27.0), F(29.8)) ? (
        <div style={{position: 'absolute', left: 48, top: 1250, transform: `translateX(${(1 - interpolate(frame, [F(27.0), F(27.25)], [0, 1], clampO)) * -80}px)`}}>
          <div style={{background: '#ffd21a', color: '#0d0f14', fontFamily: FONT, fontWeight: 900, fontSize: 34, padding: '8px 18px', display: 'inline-block'}}>PITCH INVADER</div>
          <div style={{background: '#0d0f14', color: '#ffffff', fontFamily: FONT, fontWeight: 900, fontSize: 56, padding: '8px 18px'}}>JEFFREY EPSTEIN?!</div>
        </div>
      ) : null}
      {inRange(frame, F(33.7), F(35.2)) ? <InviteCard frame={frame - F(33.7)} fps={fps} /> : null}

      <Badge episode={4} />
      {showScore ? <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={[1, 1]} clock="PENS" /> : null}
      {showScore ? <Tally blue={blue} orange={orange} /> : null}
      <Captions cues={CUES} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
