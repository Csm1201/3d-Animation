/**
 * You're the Ref, Episode 6: "Jimmy Gets a Ladder" (script: docs/scripts/ref-ep6-script.md)
 *
 *   0.0  HOOK: Jimmy on a wobbly stepladder, red card in LeBron's face, at eye level at last
 *   1.4  ◀◀ LAST TIME: "does LeBron mog?"
 *   3.9  tape measure: "Mogs."  ·  6.0 the red card reaches his belly button: "...It has to be seen."
 *   8.4  Jimmy fetches a stepladder  ·  10.0 climbs it: RED CARD  ·  12.0 LeBron walks off, gone for good
 *  14.0  3 HOURS LATER: PENS 67-67  ·  15.0 everyone keeps scoring, Jimmy falls apart
 *  17.4  next taker places the ball: "Fuck this."  ·  19.4 Jimmy shoves him and smashes it out of the stadium
 *  21.8  "Missed. Blue win."  ·  23.8 Jimmy walks out
 *  26.0  vote: A SEASON 2 vs B JIMMY IN GTA 6
 *
 * LeBron has no lines. The island invite is NOT shown in this episode (LeBron shares scenes with Jimmy).
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BoxGeometry, CylinderGeometry, MeshStandardMaterial, Quaternion, Vector3} from 'three';
import {BodySpec, buildPose, idleSpec, keyedSpec, lerpSpec} from '../../core/sportPoses';
import {Cam} from '../../character3d/stage';
import {Look} from '../../character3d/Worker3D';
import {ANGRY, Actor, armsUp, CALM, JOY, KICK_BACK, KICK_FOLLOW, KICK_HIT, POINT, runAlong, Scene, ST, THINK} from './Episode2';
import {BigTitle, BLUES, KEEPER, ORANGES, SPOT} from './Episode3';
import {BLUE_KEEPER, DEADPAN, handLocal, JIMMY, Tally} from './Episode4';
import {COOL, LEBRON, LEBRON_SCALE} from './Ep5Cast';
import {EndingCfg, EndingOverlay} from './Ending';
import {Badge, Captions, Cue, FONT, Scoreboard} from './Overlays';
import {Ball, BALL_R, yawFor} from './Players';
import {HEIGHT, WIDTH} from '../../core/constants';

export const EP6_FPS = 30;
export const EP6_FRAMES = 1026; // 34.2 s
const F = (s: number) => Math.round(s * EP6_FPS);

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const DEG = Math.PI / 180;
const clampO = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const inRange = (f: number, a: number, b: number) => f >= a && f < b;

const LeBron: React.FC<Omit<Parameters<typeof Actor>[0], 'style' | 'scale'>> = (p) => <Actor style={LEBRON} scale={LEBRON_SCALE} look={COOL} {...p} />;
const TAKER = ST.seven;
/** Jimmy getting more and more exhausted (0 fresh … 1 gone). */
const WORN = (k: number, talk = 0, t = 0): Look => ({tired: 0.35 + 0.65 * k, droop: 4 + 10 * k, eyesClosed: false, brows: 0.3 * k, browLift: 0.1, mouth: talk > 0 ? 'open' : 'flat', mouthOpen: talk > 0 ? 0.2 + 0.2 * Math.abs(Math.sin(t * 12)) : 0, noBlink: false});

// ---------------------------------------------------------------- props
const cardGeo = new BoxGeometry(0.008, 0.11, 0.08);
const redMat = new MeshStandardMaterial({color: '#e5262b', roughness: 0.35});
const alu = new MeshStandardMaterial({color: '#c9ced6', roughness: 0.35, metalness: 0.6});
const rubber = new MeshStandardMaterial({color: '#e86a1a', roughness: 0.8});
const stepMat = new MeshStandardMaterial({color: '#9aa1ab', roughness: 0.5, metalness: 0.5});
const tapeMat = new MeshStandardMaterial({color: '#f4d03a', roughness: 0.4, metalness: 0.2});
const caseMat = new MeshStandardMaterial({color: '#e5262b', roughness: 0.4});
const railGeo = new BoxGeometry(0.035, 1, 0.05);
const stepGeo = new BoxGeometry(0.16, 0.025, 0.46);
const footGeo = new CylinderGeometry(0.03, 0.035, 0.04, 10);
const tapeGeo = new BoxGeometry(0.03, 1, 0.004);
const caseGeo = new BoxGeometry(0.09, 0.09, 0.05);

export const LADDER_TOP = 0.66; // standing height of the top platform
/** A small A-frame stepladder, standing on its local origin; the climbing side faces local -x. */
export const StepLadder: React.FC = () => {
  const H = LADDER_TOP;
  const spread = 0.24;
  const lean = Math.atan2(spread, H);
  const len = Math.hypot(spread, H);
  return (
    <group>
      {[-1, 1].map((side) =>
        [-0.2, 0.2].map((z) => (
          <group key={`${side}${z}`}>
            <mesh geometry={railGeo} material={alu} position={[side * spread * 0.5, H / 2, z]} rotation={[0, 0, side * lean]} scale={[1, len, 1]} castShadow />
            <mesh geometry={footGeo} material={rubber} position={[side * spread, 0.02, z]} />
          </group>
        )),
      )}
      {[0.22, 0.44].map((y) => (
        <mesh key={y} geometry={stepGeo} material={stepMat} position={[-spread * (1 - y / H), y, 0]} castShadow />
      ))}
      <mesh geometry={stepGeo} material={stepMat} position={[0, H, 0]} scale={[1.6, 1.4, 1]} castShadow />
    </group>
  );
};

/** Jimmy, optionally holding a red card up in his near hand. */
const JimmyA: React.FC<{x: number; y?: number; z: number; yaw: number; spec: BodySpec; frame: number; look: Look; card?: boolean; roll?: number}> = ({card = false, ...p}) => (
  <Actor style={JIMMY} {...p}>
    {(pose) => {
      if (!card) return null;
      const h = handLocal(pose, false);
      return <mesh geometry={cardGeo} material={redMat} position={[h.x + 0.02, h.y + 0.08, h.z]} rotation={[0, -0.75, 0]} scale={2.6} />;
    }}
  </Actor>
);

/** A thin strip between two world points (the tape measure's tape). */
const Strip: React.FC<{a: Vector3; b: Vector3}> = ({a, b}) => {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new Quaternion().setFromUnitVectors(v3(0, 1, 0), d.clone().normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return <mesh geometry={tapeGeo} material={tapeMat} position={mid} quaternion={q} scale={[1, len, 1]} />;
};

// world position of an actor's near hand (yaw about +y, no roll/pitch)
const handWorld = (spec: BodySpec, x: number, y: number, z: number, yaw: number) => {
  const h = handLocal(buildPose(spec), false);
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return v3(x + h.x * c + h.z * s, y + h.y, z - h.x * s + h.z * c);
};

const LB_X = 43.9;
const LAD_X = 45.05;
const J_X = 44.75; // Jimmy standing in front of LeBron

// ================================================================ SHOT 0 — HOOK (0–1.4): red card at eye level, from the top of a ladder
const ShotHook: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const push = smooth(clamp01(t / 1.4));
  const wobble = 7 * Math.sin(t * 7.5) * Math.exp(-t * 0.6) + 2;
  const jSpec: BodySpec = {...idleSpec(fr, 0.05), nearArm: [89, 6], farArm: [8, 20]};
  const lbSpec: BodySpec = {...idleSpec(fr, 0.05), headTilt: 14, nearArm: [-6, 14], farArm: [4, 14]};
  const cam: Cam = {position: v3(44.7, 1.05 + push * 0.35, 5.6 - push * 1.4), target: v3(44.55, 1.35 + push * 0.35, 0), fov: 40 - push * 4};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44.5, 0, 0)} extent={8} excite={1.6}>
      <LeBron x={LB_X} z={0} yaw={0} spec={lbSpec} frame={fr} look={{...COOL, brows: -0.25}} />
      <group position={[LAD_X, 0, 0]} rotation={[0, 0, wobble * DEG]}>
        <StepLadder />
        <JimmyA card x={0.02} y={LADDER_TOP} z={0} yaw={Math.PI} spec={jSpec} frame={fr} look={{...DEADPAN(0, t), brows: -0.5}} />
      </group>
    </Scene>
  );
};

// ================================================================ SHOT 1 — ◀◀ LAST TIME (1.4–3.9): Episode 5's question card, rewinding
const ShotLast: React.FC<{from: number}> = () => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const jit = t < 0.7 ? Math.sin(f * 2.3) * 14 : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <Img src={staticFile('ep6/last.jpg')} style={{width: WIDTH, height: HEIGHT, transform: `translateX(${jit}px) scale(${1 + 0.03 * smooth(clamp01(t / 2.5))})`, filter: 'saturate(0.6) brightness(0.8)'}} />
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 3px, transparent 3px 6px)', mixBlendMode: 'multiply'}} />
      {t < 0.7 ? <div style={{position: 'absolute', left: 0, right: 0, top: ((f * 97) % HEIGHT) - 60, height: 90, background: 'rgba(255,255,255,.18)', filter: 'blur(6px)'}} /> : null}
      <div style={{position: 'absolute', top: 210, left: 60, fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: 64, color: '#fff', textShadow: '3px 3px 0 #000', opacity: t < 0.7 ? 1 : Math.abs(Math.sin(t * 5)) > 0.3 ? 1 : 0}}>
        {t < 0.7 ? '◀◀ REWIND' : '❚❚ LAST TIME'}
      </div>
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 2 — the tape measure (3.9–6.0): "Mogs."
const ShotMeasure: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const up = smooth(clamp01((t - 0.15) / 1.0));
  const toe = smooth(clamp01((t - 0.7) / 0.4)) * (1 - smooth(clamp01((t - 1.7) / 0.3)));
  const jSpec: BodySpec = {...idleSpec(fr, 0.05), lean: lerp(30, 0, up), headTilt: lerp(20, -16, up), nearArm: [lerp(40, 172, up), lerp(30, 4, up)], farArm: [10, 20], lift: 12 * toe};
  const yaw = Math.PI;
  const hand = handWorld(jSpec, J_X, 0, 0.12, yaw);
  const base = v3(LB_X + 0.28, 0.05, 0.12);
  const talk = t > 1.4 && t < 1.75 ? 1 : 0;
  const cam: Cam = {position: v3(44.45, 1.25, 5.4), target: v3(44.35, 1.3, 0), fov: 40};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44.5, 0, 0)} extent={8} excite={0.8}>
      <LeBron x={LB_X} z={0} yaw={0} spec={{...idleSpec(fr, 0.05), headTilt: 18, nearArm: [-6, 14], farArm: [4, 14]}} frame={fr} />
      <JimmyA x={J_X} z={0.12} yaw={yaw} spec={jSpec} frame={fr} look={{...DEADPAN(talk, t), yaw: 0}} />
      <Strip a={base} b={hand} />
      <mesh geometry={caseGeo} material={caseMat} position={hand} />
    </Scene>
  );
};

// ================================================================ SHOT 3 — belly button (6.0–8.4): "...It has to be seen."
const ShotBelly: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const raise = smooth(clamp01((t - 0.1) / 0.35));
  const jSpec: BodySpec = {...idleSpec(fr, 0.05), headTilt: -22, nearArm: [lerp(10, 92, raise), lerp(30, 4, raise)], farArm: [8, 20]};
  const talk = t > 1.0 && t < 2.3 ? 1 : 0;
  const cam: Cam = {position: v3(44.3, 0.95, 4.2), target: v3(44.35, 1.45, 0), fov: 42};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44.5, 0, 0)} extent={8} excite={0.3}>
      <LeBron x={LB_X} z={0} yaw={0} spec={{...idleSpec(fr, 0.03), headTilt: 30, nearArm: [-6, 14], farArm: [4, 14]}} frame={fr} />
      <JimmyA card x={J_X - 0.15} z={0.05} yaw={Math.PI} spec={jSpec} frame={fr} look={{...DEADPAN(talk, t), brows: -0.3}} />
    </Scene>
  );
};

// ================================================================ SHOT 4 — "one sec" (8.4–10.0): walks off, comes back with a ladder
const ShotFetch: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const cam: Cam = {position: v3(44.45, 1.25, 5.4), target: v3(44.35, 1.3, 0), fov: 40};
  let jimmy: React.ReactNode;
  if (t < 0.4) {
    const k = smooth(clamp01(t / 0.2));
    jimmy = <JimmyA x={J_X} z={0.12} yaw={Math.PI} spec={{...idleSpec(fr, 0.05), nearArm: [lerp(10, 150, k), lerp(30, 40, k)], farArm: [8, 20]}} frame={fr} look={DEADPAN(0, t)} />;
  } else if (t < 0.95) {
    const r = runAlong((tt) => ({x: lerp(J_X, J_X + 3.0, clamp01((tt - 0.4) / 0.55)), z: 0.12}), t, 0.35);
    jimmy = <JimmyA x={r.pos.x} z={0.12} yaw={0} spec={r.spec} frame={fr} look={DEADPAN(0, t)} />;
  } else {
    const r = runAlong((tt) => ({x: lerp(J_X + 2.6, LAD_X - 0.05, smooth(clamp01((tt - 0.95) / 0.6))), z: 0.12}), t, 0.35);
    const spec = {...r.spec, nearArm: [8, 70] as [number, number]};
    jimmy = (
      <>
        <JimmyA x={r.pos.x} z={0.12} yaw={Math.PI} spec={spec} frame={fr} look={DEADPAN(0, t)} />
        <group position={[r.pos.x - 0.1, 0.92, 0.42]} rotation={[0, 0, Math.PI / 2]} scale={0.95}>
          <StepLadder />
        </group>
      </>
    );
  }
  return (
    <Scene cam={cam} frame={fr} centre={v3(44.5, 0, 0)} extent={8} excite={0.5}>
      <LeBron x={LB_X} z={0} yaw={0} spec={{...idleSpec(fr, 0.05), headTilt: 8, nearArm: [-6, 14], farArm: [4, 14]}} frame={fr} />
      {jimmy}
    </Scene>
  );
};

// ================================================================ SHOT 5 — up the ladder (10.0–12.0): RED CARD
const ShotClimb: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const c = clamp01((t - 0.05) / 0.6);
  const step = Math.min(3, Math.floor(c * 3 + 0.0001));
  const within = smooth(c * 3 - step);
  const y = (step < 3 ? lerp(step, step + 1, within) : 3) * (LADDER_TOP / 3);
  const lx = lerp(-0.32, 0.02, smooth(c));
  const legUp = step < 3 ? Math.sin(Math.PI * within) : 0;
  const raise = smooth(clamp01((t - 0.8) / 0.2));
  const settle = t > 0.7 ? 4 * Math.sin((t - 0.7) * 8) * Math.exp(-(t - 0.7) * 1.5) : 0;
  const jSpec: BodySpec = {...idleSpec(fr, 0.05), near: {thigh: 10 + 60 * legUp * (step % 2 === 0 ? 1 : 0), knee: 10 + 80 * legUp * (step % 2 === 0 ? 1 : 0)}, far: {thigh: 10 + 60 * legUp * (step % 2), knee: 10 + 80 * legUp * (step % 2)}, nearArm: [lerp(30, 89, raise), lerp(30, 6, raise)], farArm: [8, 20]};
  const cam: Cam = {position: v3(44.6, 1.2, 5.0), target: v3(44.5, 1.5, 0), fov: 40};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44.5, 0, 0)} extent={8} excite={t > 1.0 ? 1.8 : 0.6}>
      <LeBron x={LB_X} z={0} yaw={0} spec={{...idleSpec(fr, 0.05), headTilt: 10, nearArm: [-6, 14], farArm: [4, 14]}} frame={fr} look={{...COOL, brows: t > 1.0 ? -0.35 : -0.1}} />
      <group position={[LAD_X, 0, 0]} rotation={[0, 0, settle * DEG]}>
        <StepLadder />
        <JimmyA card={t > 0.75} x={lx} y={y} z={0} yaw={Math.PI} spec={jSpec} frame={fr} look={{...DEADPAN(0, t), brows: -0.5}} />
      </group>
    </Scene>
  );
};

// ================================================================ SHOT 6 — LeBron walks (12.0–14.0)
const ShotExit: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const turn = smooth(clamp01(t / 0.4));
  const away = yawFor(-1, -0.7);
  const r = runAlong((tt) => ({x: LB_X - 3.4 * smooth(clamp01((tt - 0.3) / 1.8)), z: -2.4 * smooth(clamp01((tt - 0.3) / 1.8))}), t, 0.3);
  const walking = t > 0.3;
  const cam: Cam = {position: v3(LAD_X + 0.9, 2.15, 1.3), target: v3(42.2, 1.3, -1.4), fov: 44};
  return (
    <Scene cam={cam} frame={fr} centre={v3(43.5, 0, -1)} extent={10} excite={0.5}>
      <LeBron x={walking ? r.pos.x : LB_X} z={walking ? r.pos.z : 0} yaw={lerp(0, away, turn)} spec={walking ? r.spec : idleSpec(fr, 0.05)} frame={fr} />
      <group position={[LAD_X, 0, 0]}>
        <StepLadder />
        <JimmyA x={0.02} y={LADDER_TOP} z={0} yaw={Math.PI} spec={{...idleSpec(fr, 0.05), nearArm: [20, 30], farArm: [8, 20]}} frame={fr} look={{...DEADPAN(0, t), yaw: 10}} />
      </group>
    </Scene>
  );
};

// ================================================================ SHOT 7 — 3 HOURS LATER (14.0–15.0): PENS 67-67
const ShotBoard: React.FC<{from: number}> = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: f, fps, config: {damping: 12, stiffness: 200}});
  const stamp = spring({frame: f - 6, fps, config: {damping: 8, stiffness: 260}});
  const flick = f % 9 < 1 ? 0.85 : 1;
  return (
    <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #1a2246 0%, #070a16 70%)', alignItems: 'center', justifyContent: 'center'}}>
      <div style={{transform: `scale(${0.7 + 0.3 * s})`, opacity: flick, background: '#05060a', border: '10px solid #2a2f3e', borderRadius: 30, padding: '40px 60px', boxShadow: '0 0 80px rgba(255,180,40,.25)', textAlign: 'center'}}>
        <div style={{fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: 54, color: '#ffb02a', letterSpacing: 8}}>PENS</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 30, fontFamily: '"Courier New", monospace', fontWeight: 900, color: '#ffcf4a', textShadow: '0 0 24px rgba(255,190,40,.8)'}}>
          <span style={{fontSize: 60, color: '#5a95ff'}}>BLU</span>
          <span style={{fontSize: 200}}>67-67</span>
          <span style={{fontSize: 60, color: '#ff8a2a'}}>ORA</span>
        </div>
      </div>
      <div style={{position: 'absolute', top: 1260, transform: `rotate(-5deg) scale(${2 - stamp})`, opacity: Math.min(1, stamp * 2), fontFamily: FONT, fontWeight: 900, fontSize: 84, color: '#fff', background: '#e5262b', border: '6px solid #fff', padding: '12px 36px', borderRadius: 16}}>3 HOURS LATER</div>
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 8 — montage (15.0–17.4): goal, tired Jimmy, goal, wrecked Jimmy
const GoalCut: React.FC<{fr: number; t: number; team: 'orange' | 'blue'; side: 1 | -1}> = ({fr, t, team, side}) => {
  const u = clamp01((t - 0.12) / 0.3);
  const target = v3(52.75, 1.0, side * 2.1);
  const start = v3(SPOT.x, BALL_R, SPOT.z);
  const ball = t < 0.12 ? start : start.clone().lerp(target, u).add(v3(0, 0.4 * Math.sin(Math.PI * u), 0));
  const dive = smooth(clamp01((t - 0.08) / 0.35));
  const kStyle = team === 'orange' ? BLUE_KEEPER : KEEPER;
  const taker = team === 'orange' ? ORANGES[1] : BLUES[3];
  const kSpec = keyedSpec([[0, KICK_BACK], [0.12, KICK_HIT], [0.4, KICK_FOLLOW]], t);
  const cam: Cam = {position: v3(37.0, 2.4, 1.8), target: v3(51.5, 1.0, 0), fov: 30};
  return (
    <Scene cam={cam} frame={fr} centre={v3(48, 0, 0)} extent={12} excite={1.0}>
      <Actor style={taker} x={SPOT.x - 0.55} z={0.5} yaw={0} spec={kSpec} frame={fr} />
      <Actor style={kStyle} x={51.9} z={-side * 1.1 * dive} y={0.45 * Math.sin(Math.PI * Math.min(1, dive))} yaw={Math.PI} roll={-side * 70 * dive} spec={{...idleSpec(fr, 0.2), nearArm: [170, 6], farArm: [165, 10]}} frame={fr} />
      <Ball pos={ball} spin={t * 30} axisYaw={0} />
    </Scene>
  );
};
const TiredCut: React.FC<{fr: number; t: number; k: number}> = ({fr, t, k}) => {
  const cam: Cam = {position: v3(44.5, 1.5, 2.65), target: v3(46.0, 1.42, 1.9), fov: 38};
  const sway = k * 6 * Math.sin(t * 5);
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 2)} extent={8} excite={0.4}>
      <JimmyA x={46.0} z={1.9} yaw={yawFor(-1.4, 0.7)} roll={sway} spec={{...idleSpec(fr, 0.2), lean: 6 + 10 * k, headTilt: 8 + 14 * k, nearArm: [-4, 20], farArm: [4, 20]}} frame={fr} look={WORN(k)} />
    </Scene>
  );
};
const ShotMontage: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  if (t < 0.6) return <GoalCut fr={fr} t={t} team="orange" side={1} />;
  if (t < 1.2) return <TiredCut fr={fr} t={t - 0.6} k={0.5} />;
  if (t < 1.8) return <GoalCut fr={fr} t={t - 1.2} team="blue" side={-1} />;
  return <TiredCut fr={fr} t={t - 1.8} k={1} />;
};

// ================================================================ SHOT 9 — the next one (17.4–19.4): "Fuck this."
const ShotPlace: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const bend = t < 0.7 ? Math.sin(Math.PI * clamp01(t / 0.7)) : 0;
  const back = smooth(clamp01((t - 0.7) / 0.6));
  const tSpec = lerpSpec(idleSpec(fr, 0.1), {...idleSpec(fr, 0.1), lean: 45, headTilt: 20, near: {thigh: 40, knee: 60}, far: {thigh: 30, knee: 50}, nearArm: [60, 10], farArm: [50, 10]}, bend);
  const talk = t > 1.25 && t < 1.6 ? 1 : 0;
  const push = smooth(clamp01((t - 0.8) / 1.2));
  const cam: Cam = {position: v3(42.7 - push * 0.5, 1.35, -0.3 + push * 0.4), target: v3(40.6, 1.45, 1.4), fov: 40 - push * 8};
  return (
    <Scene cam={cam} frame={fr} centre={v3(41, 0, 0)} extent={10} excite={0.3}>
      <Actor style={TAKER} x={lerp(SPOT.x - 0.35, SPOT.x - 1.6, back)} z={0.0} yaw={0} spec={back > 0 && back < 1 ? runAlong((tt) => ({x: -tt, z: 0}), t, 0.3).spec : tSpec} frame={fr} look={CALM} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
      <JimmyA x={40.6} z={1.55} yaw={yawFor(0.9, -1.4)} spec={{...idleSpec(fr, 0.1), lean: 14, headTilt: 18, nearArm: [-4, 20], farArm: [4, 20]}} frame={fr} look={{...WORN(1, talk, t), brows: -0.6, browLift: -0.2}} />
    </Scene>
  );
};

// ================================================================ SHOT 10 — Jimmy takes it (19.4–21.8): shove, rocket, out of the stadium
const KT = 0.95;
const ShotRocket: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const path = (tt: number) => ({x: lerp(39.5, SPOT.x - 0.58, smooth(clamp01(tt / KT))), z: lerp(1.6, 0.52, smooth(clamp01(tt / KT)))});
  const r = runAlong(path, Math.min(t, KT - 0.1), 0.95);
  const jSpec = t < KT - 0.18 ? {...r.spec, nearArm: (t > 0.25 && t < 0.5 ? [95, 5] : r.spec.nearArm) as [number, number]} : keyedSpec([[KT - 0.18, KICK_BACK], [KT, KICK_HIT], [KT + 0.3, KICK_FOLLOW], [KT + 1.0, {...KICK_FOLLOW, lift: 0}]], t);
  const jPos = t < KT - 0.1 ? r.pos : path(KT);
  // the taker, shoved flying sideways at 0.35
  const sh = smooth(clamp01((t - 0.35) / 0.5));
  const takerX = SPOT.x - 1.6 + 0.3 * sh;
  const takerZ = 0.0 - 1.8 * sh;
  // the ball: rockets up and over the stand behind the goal
  const u = clamp01((t - KT) / 1.35);
  const ball = t < KT ? v3(SPOT.x, BALL_R, SPOT.z) : v3(lerp(SPOT.x, 92, u), BALL_R + 30 * (1 - (1 - u) * (1 - u)) * 0.9, lerp(0, -3, u));
  const follow = smooth(clamp01((t - KT - 0.15) / 0.5));
  const camTarget = v3(40.8, 1.0, 0.6).lerp(v3(58, 9, -1), follow);
  const cam: Cam = {position: v3(lerp(39.6, 36.5, follow), lerp(1.4, 1.3, follow), lerp(5.2, 2.6, follow)), target: camTarget, fov: lerp(44, 50, follow)};
  const ballAt = (tt: number) => { const uu = clamp01((tt - KT) / 1.35); return v3(lerp(SPOT.x, 92, uu), BALL_R + 30 * (1 - (1 - uu) * (1 - uu)) * 0.9, lerp(0, -3, uu)); };
  return (
    <Scene cam={cam} frame={fr} centre={v3(44, 0, 0)} extent={14} excite={t > KT ? 1.8 : 0.6}>
      <JimmyA x={jPos.x} z={jPos.z} yaw={t < KT - 0.1 ? r.yaw : 0} spec={jSpec} frame={fr} look={{...WORN(0.8), brows: -0.9, browLift: -0.3, mouth: 'frown'}} />
      <Actor style={TAKER} x={takerX} z={takerZ} y={0.35 * Math.sin(Math.PI * sh)} yaw={0} roll={80 * sh} spec={lerpSpec(idleSpec(fr, 0.1), {...idleSpec(fr, 0.1), nearArm: [150, 30], farArm: [140, 30]}, sh)} frame={fr} look={{...CALM, brows: 0.8, browLift: 0.8, mouth: 'open', mouthOpen: 0.6}} />
      <Ball pos={ball} spin={t > KT ? t * 40 : 0} axisYaw={0} />
      {t > KT + 0.08
        ? [0, 0.03, 0.06, 0.09, 0.12, 0.15].map((d, i) => (
            <mesh key={i} position={ballAt(t - d)} scale={(0.55 - i * 0.07) * (0.4 + 1.6 * clamp01((t - KT) / 1.0))}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color="#fff6d0" transparent opacity={0.9 - i * 0.14} />
            </mesh>
          ))
        : null}
    </Scene>
  );
};

// ================================================================ SHOT 11 — "Missed. Blue win." (21.8–23.8)
const ShotWin: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const jSpec = keyedSpec([[0, {...THINK, nearArm: [150, 150]}], [0.35, {...THINK, nearArm: [150, 150]}], [0.55, POINT], [2, POINT]], t);
  const talk = t > 0.2 && t < 2.0 ? 1 : 0;
  const cam: Cam = {position: v3(38.6, 1.55, 2.6), target: v3(41.2, 1.45, 0.6), fov: 40};
  const party = t > 0.9 ? 1 : 0;
  return (
    <Scene cam={cam} frame={fr} centre={v3(42, 0, 0)} extent={12} excite={1.6}>
      <JimmyA x={40.4} z={1.4} yaw={yawFor(-1.5, 0.95)} spec={jSpec} frame={fr} look={{...WORN(0.8, talk, t), yaw: 0}} />
      {[0, 1, 2].map((i) => (
        <Actor key={`b${i}`} style={BLUES[i]} x={43.2 + i * 0.9} z={-1.2 + i * 0.8} yaw={yawFor(-1, 0.4)} spec={armsUp({...idleSpec(fr + i * 7, 0.2), lift: party * Math.max(0, Math.sin((t + i * 0.3) * 9)) * 30}, t + i, party)} frame={fr} look={party ? JOY : CALM} />
      ))}
      {[0, 1].map((i) => (
        <Actor key={`o${i}`} style={ORANGES[i + 1]} x={42.0 + i * 0.8} z={-2.4 - i * 0.6} yaw={yawFor(-1, 0.8)} spec={{...idleSpec(fr + i * 5, 0.2), nearArm: [160, 150], farArm: [158, 152]}} frame={fr} look={ANGRY(t + i)} />
      ))}
    </Scene>
  );
};

// ================================================================ SHOT 12 — Jimmy walks out (23.8–26.0)
const ShotLeave: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const r = runAlong((tt) => ({x: 41.0 - 2.2 * tt / 2.2, z: 1.0 + 0.4 * tt / 2.2}), t, 0.3);
  const cam: Cam = {position: v3(r.pos.x - 2.6, 1.6, r.pos.z + 0.9), target: v3(r.pos.x, 1.45, r.pos.z), fov: 42};
  return (
    <Scene cam={cam} frame={fr} centre={v3(41, 0, 0)} extent={12} excite={1.6}>
      <JimmyA x={r.pos.x} z={r.pos.z} yaw={r.yaw} spec={{...r.spec, nearArm: [-4, 20], farArm: [4, 20]}} frame={fr} look={WORN(0.9)} />
      {[0, 1, 2].map((i) => (
        <Actor key={`o${i}`} style={ORANGES[i]} x={42.6 + i * 0.7} z={-0.6 + (i % 2) * 1.3} yaw={yawFor(-1, -0.3 + i * 0.3)} spec={{...idleSpec(fr + i * 5, 0.2), nearArm: [120 + 30 * Math.sin(t * 8 + i), 40], farArm: [110, 50]}} frame={fr} look={ANGRY(t + i)} />
      ))}
      {[0, 1].map((i) => (
        <Actor key={`b${i}`} style={BLUES[i + 2]} x={43.0 + i * 0.9} z={1.6 + i * 0.5} yaw={yawFor(-1, -0.4)} spec={armsUp({...idleSpec(fr + i * 7, 0.2), lift: Math.max(0, Math.sin((t + i * 0.3) * 9)) * 30}, t + i)} frame={fr} look={JOY} />
      ))}
    </Scene>
  );
};

// ================================================================ SHOT 13 — the vote (26.0–33.6): A SEASON 2 vs B JIMMY IN GTA 6
const EP6_ENDING: EndingCfg = {
  a: {title: 'SEASON 2', sub: 'back to the stadium'},
  b: {title: 'JIMMY IN GTA 6', sub: 'Jimmy refs the police chase'},
  commentAt: 3.2,
  nextAt: 5.6,
  nextLabel: 'YOU DECIDE',
  nextEp: 7,
  comments: [
    {user: 'pint_and_a_pie', text: "67-67 💀", pick: '?', likes: 1904},
    {user: 'orange_army', text: 'B. Jimmy giving out red cards in GTA 6 😭', pick: 'B', likes: 1210},
    {user: 'blu_til_i_die', text: 'A. we need to know who won 😭', pick: 'A', likes: 988},
    {user: 'sunday_league_ref', text: "'fuck this' and he just TOOK THE PEN", pick: '?', likes: 1450},
    {user: 'laws_of_the_game', text: 'B. Jimmy vs the cops would go so hard', pick: 'B', likes: 640},
  ],
};
const ShotVote: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const cam: Cam = {position: v3(0, 1.6, 3.9), target: v3(0, 1.85, 0), fov: 38};
  const look = t > 0.6 ? {...WORN(0.6), yaw: -10} : WORN(0.6);
  return (
    <AbsoluteFill>
      {/* outside the stadium: a dark street, one streetlight */}
      <AbsoluteFill style={{background: 'linear-gradient(180deg, #05070f 0%, #0d1428 55%, #1b1d24 62%, #2a2c33 100%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse 34% 60% at 50% 30%, rgba(255,214,140,.30), transparent 70%)'}} />
      <div style={{position: 'absolute', left: 300, top: 90, width: 14, height: 1100, background: '#20232b'}} />
      <div style={{position: 'absolute', left: 300, top: 90, width: 260, height: 14, background: '#20232b'}} />
      <div style={{position: 'absolute', left: 520, top: 100, width: 70, height: 34, borderRadius: '0 0 30px 30px', background: '#ffe2a0', boxShadow: '0 0 60px 20px rgba(255,214,140,.6)'}} />
      <AbsoluteFill>
        <Scene cam={cam} frame={fr} centre={v3(0, 0, 0)} extent={6} layer="actors">
          <JimmyA x={0.2} z={0} yaw={yawFor(0.35, 1)} spec={{...idleSpec(fr, 0.15), nearArm: [-4, 20], farArm: [4, 20]}} frame={fr} look={look} />
        </Scene>
      </AbsoluteFill>
      <EndingOverlay frame={f} fps={EP6_FPS} cfg={EP6_ENDING} />
    </AbsoluteFill>
  );
};

// ================================================================ captions, sound, timeline
const C = {orange: '#ff8a2a', blue: '#5a95ff', red: '#ff4d4d', green: '#45e070', yellow: '#ffd23a', gold: '#fdb927'};
const CUES: Cue[] = [
  {from: F(1.5), to: F(3.9), text: 'LAST TIME… DOES LEBRON MOG?', hl: {LEBRON: C.gold, 'MOG?': C.gold}},
  {from: F(5.3), to: F(6.0), text: 'MOGS.', hl: {'MOGS.': C.gold}},
  {from: F(7.0), to: F(8.4), text: '…IT HAS TO BE SEEN.'},
  {from: F(18.6), to: F(19.4), text: 'FUCK THIS.', hl: {FUCK: C.red}},
  {from: F(22.0), to: F(23.8), text: 'MISSED. BLUE WIN.', hl: {'BLUE': C.blue, 'WIN.': C.blue}},
  {from: F(26.1), to: F(29.4), text: "SO, REF… WHAT'S NEXT?", hl: {"NEXT?": C.yellow}},
  {from: F(29.4), to: EP6_FRAMES, text: 'A OR B IN THE COMMENTS.', hl: {A: C.yellow, B: C.yellow}},
];

type Sfx = {at: number; src: string; vol?: number};
const SOUND: Sfx[] = [
  {at: 0.0, src: 'ep5/whistle.wav', vol: 0.9},
  {at: 0.05, src: 'ep5/crowd-gasp.wav', vol: 0.9},
  {at: 1.3, src: 'ep5/scratch.wav', vol: 0.8},
  {at: 1.4, src: 'ep5/rewind.wav', vol: 0.7},
  {at: 1.5, src: 'ep6/nar-last.mp3'},
  {at: 4.05, src: 'ep6/zip.wav', vol: 0.6},
  {at: 5.3, src: 'ep6/j-mogs.mp3'},
  {at: 6.5, src: 'ep6/cricket.wav', vol: 0.45},
  {at: 7.0, src: 'ep6/j-seen.mp3'},
  {at: 8.8, src: 'ep6/steps.wav', vol: 0.5},
  {at: 9.4, src: 'ep6/steps.wav', vol: 0.5},
  {at: 11.0, src: 'ep5/whistle.wav', vol: 0.9},
  {at: 11.05, src: 'ep5/crowd-ooh.wav', vol: 0.9},
  {at: 12.4, src: 'ep6/steps.wav', vol: 0.4},
  {at: 14.0, src: 'ep5/stamp.wav', vol: 0.8},
  {at: 15.2, src: 'ep5/big-kick.wav', vol: 0.5},
  {at: 15.5, src: 'ep5/net.wav', vol: 0.7},
  {at: 15.5, src: 'ep6/ding.wav', vol: 0.5},
  {at: 16.4, src: 'ep5/big-kick.wav', vol: 0.5},
  {at: 16.7, src: 'ep5/net.wav', vol: 0.7},
  {at: 16.7, src: 'ep6/ding.wav', vol: 0.5},
  {at: 18.65, src: 'ep6/j-fuck.mp3'},
  {at: 19.75, src: 'ep5/crowd-gasp.wav', vol: 0.8},
  {at: 20.35, src: 'ep5/big-kick.wav'},
  {at: 20.35, src: 'ep5/whoosh.wav', vol: 0.8},
  {at: 21.25, src: 'ep6/twinkle.wav', vol: 0.6},
  {at: 21.9, src: 'ep5/whistle.wav', vol: 0.9},
  {at: 22.05, src: 'ep6/j-missed.mp3'},
  {at: 22.7, src: 'ep5/crowd-roar.wav', vol: 0.8},
  {at: 26.0, src: 'ep5/bass-hit.wav', vol: 0.8},
  {at: 26.15, src: 'ep6/nar-vote.mp3'},
];
// the crowd bed: dips for the quiet beats, gone outside the stadium
const bedVolume = (T: number) => {
  if (T >= 26.0) return 0.08;
  if (T >= 5.8 && T < 8.4) return 0.12;
  if (T >= 17.4 && T < 19.5) return 0.08;
  if (T >= 14.0 && T < 17.4) return 0.3;
  return 0.5;
};

type ShotDef = {from: number; to: number; C: React.FC<{from: number}>};
const SHOTS: ShotDef[] = [
  {from: 0, to: F(1.4), C: ShotHook},
  {from: F(1.4), to: F(3.9), C: ShotLast},
  {from: F(3.9), to: F(6.0), C: ShotMeasure},
  {from: F(6.0), to: F(8.4), C: ShotBelly},
  {from: F(8.4), to: F(10.0), C: ShotFetch},
  {from: F(10.0), to: F(12.0), C: ShotClimb},
  {from: F(12.0), to: F(14.0), C: ShotExit},
  {from: F(14.0), to: F(15.0), C: ShotBoard},
  {from: F(15.0), to: F(17.4), C: ShotMontage},
  {from: F(17.4), to: F(19.4), C: ShotPlace},
  {from: F(19.4), to: F(21.8), C: ShotRocket},
  {from: F(21.8), to: F(23.8), C: ShotWin},
  {from: F(23.8), to: F(26.0), C: ShotLeave},
  {from: F(26.0), to: EP6_FRAMES, C: ShotVote},
];

export const Episode6: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = frame / fps;
  const flash = inRange(frame, F(1.4), F(3.9));
  const board = inRange(frame, F(14.0), F(15.0));
  const vote = frame >= F(26.0);
  const early = frame < F(14.0);
  // the shootout score from 3 hours later: 67-67, then 68-67, 68-68
  const late: [number, number] = T >= 16.7 ? [68, 68] : T >= 15.5 ? [67, 68] : [67, 67];
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ep5/crowd-bed.wav')} volume={(fr) => bedVolume(fr / EP6_FPS)} />
      {SOUND.map((s, i) => (
        <Sequence key={`a${i}`} from={F(s.at)} layout="none">
          <Audio src={staticFile(s.src)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <AbsoluteFill>
            <s.C from={s.from} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {flash || board || vote ? null : (
        <>
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />
        </>
      )}

      {/* titles */}
      {inRange(frame, F(11.0), F(12.0)) ? <BigTitle text="RED CARD" frame={frame - F(11.0)} fps={fps} top={300} size={140} rot={-6} color="#ffffff" stroke="#e5262b" /> : null}
      {inRange(frame, F(20.9), F(21.8)) ? <BigTitle text="OUT OF THE STADIUM" frame={frame - F(20.9)} fps={fps} top={320} size={72} rot={-4} color="#ffd23a" /> : null}
      {inRange(frame, F(21.0), F(21.8)) ? (
        <div style={{position: 'absolute', left: 700, top: 200, fontSize: 90, color: '#fff', transform: `scale(${interpolate(frame, [F(21.15), F(21.3), F(21.6)], [0, 1.4, 0.6], clampO)}) rotate(${frame * 9}deg)`, textShadow: '0 0 30px #fff'}}>✦</div>
      ) : null}

      {flash || vote || board ? null : <Badge episode={6} />}
      {early && !flash ? <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={[1, 1]} clock="PENS" /> : null}
      {early && !flash ? <Tally blue={['g']} orange={['g']} /> : null}
      {!early && !board && !vote ? <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={late} clock="PENS" /> : null}
      <Captions cues={CUES} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
