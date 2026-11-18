/**
 * "You're the Ref" — Episode 5 ("LeBron mogs the shootout"), 3D, 33 s at 30 fps.
 * Carries straight on from Episode 4: the fan's save didn't count, so Orange retake their first penalty.
 * Voices: vidIQ (ElevenLabs) stock voices — narrator "Daniel", Jimmy "George", keeper "Liam",
 * Orange #7 "Chris"; the 6-7 chant is four voices layered. LeBron has no lines. SFX are synthesised.
 *
 *   0.0  HOOK: over LeBron's shoulder, the keeper flying into the top corner   "LEBRON KICKED THE KEEPER IN."
 *   1.4  Episode 4 answer: rewind to the fan's save, ✗, "B. RETAKE."
 *   4.4  Jimmy points to the spot  ·  6.7 #7: "I'm not taking it."  ·  9.0 Jimmy: "Somebody fucking take it."
 *  11.0  LeBron James walks out of the crowd  ·  13.2 MOGGED  ·  15.0 Jimmy hands him the ball
 *  16.8  He places it  ·  18.4 the kick: ball and keeper into the top corner (slow motion)
 *  21.6  6-7: LeBron, the whole stadium, then Jimmy  ·  24.0 "And Jimmy gives it."
 *  25.4  Keeper upside down in the net: "Can someone get me down?"  ·  27.0 Vote: does LeBron mog?
 */
import React from 'react';
import {AbsoluteFill, Audio, Img, interpolate, OffthreadVideo, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Vector3} from 'three';
import {BodySpec, idleSpec, keyedSpec, lerpSpec} from '../../core/sportPoses';
import {Cam} from '../../character3d/stage';
import {Look} from '../../character3d/Worker3D';
import {Actor, CALM, FOLD, KICK_BACK, KICK_FOLLOW, KICK_HIT, POINT, runAlong, Scene, ST, THINK} from './Episode2';
import {BigTitle, BLUES, SPOT} from './Episode3';
import {BLUE_KEEPER, DEADPAN, GAPE, handLocal, JIMMY, PocketCard, Tally} from './Episode4';
import {COOL, LEBRON, LEBRON_SCALE} from './Ep5Cast';
import {EndingCfg, EndingOverlay} from './Ending';
import {Badge, Captions, Cue, FONT, Scoreboard} from './Overlays';
import {Ball, BALL_R, yawFor} from './Players';
import {HEIGHT, WIDTH} from '../../core/constants';

export const EP5_FPS = 30;
export const EP5_FRAMES = 990; // 33 s
const F = (s: number) => Math.round(s * EP5_FPS);

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const DEG = Math.PI / 180;
const clampO = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

const SEVEN = ST.seven;
const NERVOUS = (talk: number, t: number, shake = 0): Look => ({
  tired: 0,
  droop: -2,
  eyesClosed: false,
  brows: 0.75,
  browLift: 0.6,
  mouth: talk > 0 ? 'open' : 'frown',
  mouthOpen: talk > 0 ? 0.25 + 0.25 * Math.abs(Math.sin(t * 12)) : 0,
  noBlink: true,
  sweat: 1,
  yaw: shake * 28 * Math.sin(t * 15),
});
const DAZED = (talk: number, t: number): Look => ({tired: 0.4, droop: 0, eyesClosed: false, brows: 0.6, browLift: 0.5, mouth: 'open', mouthOpen: talk > 0 ? 0.25 + 0.3 * Math.abs(Math.sin(t * 12)) : 0.15, noBlink: true});

/** Jimmy, with the island invite still in his top pocket. */
const Jimmy: React.FC<{x: number; z: number; yaw: number; spec: BodySpec; frame: number; look: Look; children?: Parameters<typeof Actor>[0]['children']}> = ({children, ...p}) => (
  <Actor style={JIMMY} {...p}>
    {(pose) => (
      <>
        <PocketCard pose={pose} sink={1} />
        {children ? children(pose) : null}
      </>
    )}
  </Actor>
);
const LeBron: React.FC<Omit<Parameters<typeof Actor>[0], 'style' | 'scale'>> = (p) => <Actor style={LEBRON} scale={LEBRON_SCALE} look={COOL} {...p} />;

/** "6 7" hands: forearms out, palms up, bobbing up and down in turn. */
const sixSeven = (base: BodySpec, t: number, k: number): BodySpec => ({
  ...base,
  nearArm: [lerp(base.nearArm[0], 62 + 24 * Math.sin(t * 15), k), lerp(base.nearArm[1], 80, k)],
  farArm: [lerp(base.farArm[0], 62 - 24 * Math.sin(t * 15), k), lerp(base.farArm[1], 80, k)],
});

// ================================================================ the kick (shared by the hook and shot 10)
// simulation time s: LeBron's run-up, strike at KT, the ball reaches the keeper's chest at KI, he's carried
// back into the top corner by KC and stays there in the net
const KT = 0.62;
const KI = 0.8;
const KC = 1.25;
const CATCH = v3(51.85, 1.05, 0.0);
const CORNER = v3(52.75, 2.0, -2.95);
const RUN_FROM = SPOT.x - 3.4;
const STRIKE_X = SPOT.x - 0.58;
const KP_A = 0.24; // ball in front of the keeper's chest (local)
const KP_H = 1.05;

const ballAt = (s: number): Vector3 => {
  if (s < KT) return v3(SPOT.x, BALL_R, SPOT.z);
  if (s < KI) return v3(SPOT.x, BALL_R, SPOT.z).lerp(CATCH, (s - KT) / (KI - KT));
  if (s < KC) {
    const u = smooth((s - KI) / (KC - KI));
    return CATCH.clone().lerp(CORNER, u).add(v3(0, 0.35 * Math.sin(Math.PI * u), 0));
  }
  const w = s - KC;
  return CORNER.clone().add(v3(0.08 * Math.exp(-w * 4) * Math.sin(w * 18), -0.05 * Math.exp(-w * 3) * Math.sin(w * 14), 0));
};
const keeperPitch = (s: number) => (s < KI ? 0 : s < KC ? 82 * smooth((s - KI) / (KC - KI)) : 82 + 5 * Math.exp(-(s - KC) * 3) * Math.sin((s - KC) * 14));
/** Keeper placement so the ball sits against his chest at pitch p (yaw = π, backward pitch is positive). */
const keeperFeet = (b: Vector3, p: number) => {
  const r = p * DEG;
  return {x: b.x + (KP_A * Math.cos(r) - KP_H * Math.sin(r)), y: b.y - (KP_A * Math.sin(r) + KP_H * Math.cos(r)), z: b.z};
};
const K_SET: BodySpec = {lean: 16, headTilt: 8, near: {thigh: 30, knee: 56}, far: {thigh: 26, knee: 54}, nearArm: [40, 24], farArm: [36, 26]};
const K_HUG: BodySpec = {lean: 22, headTilt: 18, near: {thigh: 70, knee: 80}, far: {thigh: 55, knee: 90}, nearArm: [70, 110], farArm: [64, 116]};

const KickWorld: React.FC<{s: number; fr: number; showLeBron?: boolean}> = ({s, fr, showLeBron = true}) => {
  const run = runAlong((tt) => ({x: lerp(RUN_FROM, STRIKE_X, smooth(clamp01((tt - 0.05) / (KT - 0.12)))), z: 0.52}), Math.min(s, KT - 0.08), 0.75, 0.1);
  const lbSpec = keyedSpec([[0.05, idleSpec(fr, 0.1)], [0.2, run.spec], [KT - 0.14, KICK_BACK], [KT, KICK_HIT], [KT + 0.3, KICK_FOLLOW], [KT + 0.9, {...KICK_FOLLOW, lift: 0}]], s);
  const lbX = s < KT - 0.08 ? run.pos.x : STRIKE_X;
  const b = ballAt(s);
  const p = keeperPitch(s);
  const k = keeperFeet(b, p);
  const hop = s < KT ? Math.abs(Math.sin(s * 8)) * 14 : 0;
  const kSpec = s < KI - 0.06 ? {...K_SET, lift: hop, nearArm: [100, 20] as [number, number], farArm: [96, 22] as [number, number]} : lerpSpec(K_SET, K_HUG, smooth(clamp01((s - KI + 0.06) / 0.12)));
  const shock: Look = s < KI ? {...CALM, brows: -0.4} : {tired: 0, droop: -10, eyesClosed: false, brows: 0.9, browLift: 0.9, mouth: 'open', mouthOpen: 0.8, noBlink: true};
  return (
    <>
      {showLeBron ? <LeBron x={lbX} z={0.52} yaw={0} spec={lbSpec} frame={fr} /> : null}
      <Actor style={BLUE_KEEPER} x={k.x} y={k.y} z={k.z} yaw={Math.PI} pitch={p} spec={kSpec} frame={fr} look={shock} shadow={s < KI + 0.1} />
      <Ball pos={b} spin={s > KT && s < KI ? s * 40 : 0} axisYaw={yawFor(1, 0)} />
    </>
  );
};

// slow motion for the kick shot: video time -> simulation time
const RATE_KEYS: [number, number][] = [[0, 1], [0.38, 1], [0.55, 0.25], [1.9, 0.25], [2.2, 1], [3.2, 1]];
const rateAt = (T: number) => {
  for (let i = 1; i < RATE_KEYS.length; i++) {
    const [t1, r1] = RATE_KEYS[i];
    const [t0, r0] = RATE_KEYS[i - 1];
    if (T <= t1) return lerp(r0, r1, smooth(clamp01((T - t0) / (t1 - t0))));
  }
  return 1;
};
const KICK_S0 = 0.12;
const simTime = (T: number) => {
  let s = KICK_S0;
  const n = Math.max(1, Math.round(T * 300));
  for (let i = 0; i < n; i++) s += rateAt(((i + 0.5) / n) * T) * (T / n);
  return s;
};

// ================================================================ SHOT 0 — HOOK (0–1.4): the keeper buried in the top corner
const ShotHook: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const push = smooth(clamp01(t / 1.4));
  // behind LeBron's shoulder in his follow-through, keeper flying into the top corner in slow motion
  const cam: Cam = {position: v3(STRIKE_X - 3.7 + push * 0.7, 1.9, 2.2 - push * 0.25), target: v3(44.5, 1.5, -0.4), fov: 46 - push * 3};
  return (
    <Scene cam={cam} frame={fr} centre={v3(47, 0, -1)} extent={12} excite={2}>
      <KickWorld s={lerp(0.98, KC + 0.12, push)} fr={fr} showLeBron={false} />
      <LeBron x={STRIKE_X} z={0.52} yaw={0} spec={{...KICK_FOLLOW, lift: 0}} frame={fr} />
    </Scene>
  );
};

// ================================================================ SHOT 1 — Episode 4 answer (1.4–4.4): rewind to the fan's save, ✗
const REW = 0.85;
const ShotFlash: React.FC<{from: number}> = () => {
  const f = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = f / fps;
  const stampS = spring({frame: f - F(REW + 0.1), fps, config: {damping: 10, stiffness: 260}});
  const labelS = spring({frame: f - F(REW + 0.75), fps, config: {damping: 12, stiffness: 200}});
  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {t < REW ? <OffthreadVideo src={staticFile('ep5/flash-rev.mp4')} muted style={{width: WIDTH, height: HEIGHT}} /> : <Img src={staticFile('ep5/flash-freeze.jpg')} style={{width: WIDTH, height: HEIGHT, filter: 'saturate(0.55) brightness(0.8)'}} />}
      {/* VHS: scanlines, a tracking band, tint */}
      <AbsoluteFill style={{background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 3px, transparent 3px 6px)', mixBlendMode: 'multiply'}} />
      {t < REW ? <div style={{position: 'absolute', left: 0, right: 0, top: ((f * 97) % HEIGHT) - 60, height: 90, background: 'rgba(255,255,255,.18)', filter: 'blur(6px)'}} /> : null}
      <div style={{position: 'absolute', top: 210, left: 60, fontFamily: '"Courier New", monospace', fontWeight: 900, fontSize: 64, color: '#fff', textShadow: '3px 3px 0 #000', opacity: t < REW ? 1 : Math.abs(Math.sin(t * 5)) > 0.3 ? 1 : 0}}>
        {t < REW ? '◀◀ REWIND' : '❚❚ EPISODE 4'}
      </div>
      {t >= REW + 0.1 ? (
        <div style={{position: 'absolute', top: 470, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 520, lineHeight: 1, color: '#ff2b2b', textShadow: '0 0 40px rgba(0,0,0,.6), 10px 10px 0 #000', transform: `scale(${2.2 - 1.2 * stampS}) rotate(-8deg)`, opacity: Math.min(1, stampS * 3)}}>✕</div>
      ) : null}
      {t >= REW + 0.75 ? (
        <div style={{position: 'absolute', top: 320, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', transform: `scale(${0.5 + 0.5 * labelS})`, opacity: Math.min(1, labelS * 2)}}>
          <div style={{background: '#ffd21a', color: '#0d0f14', fontFamily: FONT, fontWeight: 900, fontSize: 40, padding: '8px 22px'}}>EPISODE 4 ANSWER</div>
          <div style={{background: '#0d0f14', color: '#fff', fontFamily: FONT, fontWeight: 900, fontSize: 70, whiteSpace: 'nowrap', padding: '6px 30px'}}>
            <span style={{color: '#45e070'}}>B.</span> SAVE DOESN'T COUNT
          </div>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// ================================================================ SHOT 2 — Jimmy points to the spot: retake (4.4–6.7)
const ShotRetake: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const spec = keyedSpec([[0, idleSpec(fr, 0.1)], [0.4, POINT], [2.3, POINT]], t);
  const walk = runAlong((tt) => ({x: lerp(50.6, 52.0, smooth(clamp01(tt / 1.6))), z: lerp(2.4, 0.1, smooth(clamp01(tt / 1.6)))}), Math.min(t, 1.6), 0.3, 0.2);
  const cam: Cam = {position: v3(48.4, 1.75, 1.75), target: v3(43.5, 1.15, 0.5), fov: 42};
  return (
    <Scene cam={cam} frame={fr} centre={v3(46, 0, 0)} extent={10} excite={1.2}>
      <Jimmy x={46.6} z={0.7} yaw={yawFor(-1, -0.14)} spec={spec} frame={fr} look={DEADPAN(0, t)} />
      <Actor style={SEVEN} x={SPOT.x - 0.5} z={0.4} yaw={yawFor(1, 0.1)} spec={idleSpec(fr, 0.3)} frame={fr} look={GAPE} />
      <Actor style={BLUE_KEEPER} x={walk.pos.x} z={walk.pos.z} yaw={t < 1.6 ? walk.yaw : Math.PI} spec={t < 1.6 ? walk.spec : idleSpec(fr, 0.3)} frame={fr} look={{...CALM, brows: -0.7, mouth: 'frown'}} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 3 — #7: "I'm... I'm not taking it." (6.7–9.0)
const ShotSeven: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const talk = t > 0.15 && t < 2.15 ? 1 : 0;
  const back = smooth(clamp01((t - 1.2) / 1.0));
  const walk = runAlong((tt) => ({x: SPOT.x - 0.5 - 1.0 * smooth(clamp01((tt - 1.2) / 1.0)), z: 0.4 + 0.3 * smooth(clamp01((tt - 1.2) / 1.0))}), t, 0.25, 0.3, {x: 46.6, z: 0.9});
  const spec = back > 0.02 && back < 0.98 ? {...walk.spec, nearArm: [70, 40] as [number, number], farArm: [64, 44] as [number, number]} : {...idleSpec(fr, 0.2), nearArm: [60, 40] as [number, number], farArm: [56, 44] as [number, number]};
  const cam: Cam = {position: v3(SPOT.x + 2.1, 1.55, 1.9), target: v3(SPOT.x - 0.6, 1.42, 0.45), fov: 36};
  return (
    <Scene cam={cam} frame={fr} centre={v3(SPOT.x, 0, 0)} extent={8} excite={1.0}>
      <Actor style={SEVEN} x={walk.pos.x} z={walk.pos.z} yaw={yawFor(46.6 - walk.pos.x, 0.9 - walk.pos.z)} spec={spec} frame={fr} look={NERVOUS(talk, t, t > 0.3 && t < 1.1 ? 1 : 0)} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 4 — Jimmy: "Somebody fucking take it." (9.0–11.0)
const JIMMY_CU: Cam = {position: v3(47.6, 1.62, 2.4), target: v3(47.0, 1.58, 0.6), fov: 32};
const ShotTakeIt: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const talk = t > 0.1 && t < 1.95 ? 1 : 0;
  return (
    <Scene cam={JIMMY_CU} frame={fr} centre={v3(47, 0, 0)} extent={8} excite={1.0}>
      <Jimmy x={47.0} z={0.6} yaw={yawFor(1, 0.25)} spec={idleSpec(fr, 0.1)} frame={fr} look={{...DEADPAN(talk, t), yaw: -18, brows: -0.6}} />
    </Scene>
  );
};

// ================================================================ SHOT 5 — LeBron walks out of the crowd (11.0–13.2)
const ShotArrive: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const walk = runAlong((tt) => ({x: 41.9, z: lerp(9.5, 3.6, clamp01(tt / 2.2))}), t, 0.3, 0.1);
  const cam: Cam = {position: v3(43.2, 0.55, -1.6), target: v3(41.9, 2.1, 7.0), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(42, 0, 4)} extent={10} excite={0.05}>
      <LeBron x={walk.pos.x} z={walk.pos.z} yaw={walk.yaw} spec={{...walk.spec, nearArm: [walk.spec.nearArm[0] * 0.6, walk.spec.nearArm[1]], farArm: [walk.spec.farArm[0] * 0.6, walk.spec.farArm[1]]}} frame={fr} />
      {BLUES.slice(0, 2).map((st, i) => (
        <Actor key={i} style={st} x={i ? 39.6 : 44.2} z={i ? 2.6 : 1.6} yaw={yawFor(41.9 - (i ? 39.6 : 44.2), 5 - (i ? 2.6 : 1.6))} spec={idleSpec(fr + i * 9, 0.2)} frame={fr} look={GAPE} />
      ))}
    </Scene>
  );
};

// ================================================================ SHOT 6 — the mog (13.2–15.0)
const ShotMog: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const up = smooth(clamp01((t - 0.15) / 0.4));
  const leave = runAlong((tt) => ({x: SPOT.x - 0.1 - 2.5 * Math.max(0, tt - 1.0) ** 1.4, z: 0.55 + 3.0 * Math.max(0, tt - 1.0) ** 1.4}), t, 0.3, 0.2);
  const going = t > 1.0;
  const cam: Cam = {position: v3(SPOT.x + 4.0, 1.7, 0.15), target: v3(SPOT.x - 0.2, 1.72, 0.05), fov: 44};
  return (
    <Scene cam={cam} frame={fr} centre={v3(SPOT.x, 0, 0)} extent={8} excite={0.1}>
      <LeBron x={SPOT.x - 0.2} z={-0.45} yaw={yawFor(1, 0.25)} spec={idleSpec(fr, 0.1)} frame={fr} look={{...COOL, droop: 10 * up, yaw: -22 * up}} />
      <Actor style={SEVEN} x={going ? leave.pos.x : SPOT.x - 0.1} z={going ? leave.pos.z : 0.55} yaw={going ? leave.yaw : yawFor(1, -0.4)} spec={going ? leave.spec : idleSpec(fr, 0.2)} frame={fr} look={{...NERVOUS(0, t), droop: -26 * up, yaw: 30 * up, sweat: 0.6}} />
    </Scene>
  );
};

// ================================================================ SHOT 7 — Jimmy hands him the ball (15.0–16.8)
const ShotHandover: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const reach = smooth(clamp01((t - 0.15) / 0.35));
  const give = smooth(clamp01((t - 0.75) / 0.4));
  const handed = t > 1.15;
  const lbSpec: BodySpec = {...idleSpec(fr, 0.1), nearArm: [lerp(-2, 72, reach), lerp(12, 14, reach)]};
  const jSpec: BodySpec = {...idleSpec(fr, 0.1), farArm: [lerp(52, 74, give), lerp(60, 20, give)]};
  const cam: Cam = {position: v3(SPOT.x + 0.35, 1.7, 4.4), target: v3(SPOT.x + 0.35, 1.68, 0), fov: 46};
  return (
    <Scene cam={cam} frame={fr} centre={v3(SPOT.x, 0, 0)} extent={8} excite={0.1}>
      <LeBron x={SPOT.x - 0.45} z={0} yaw={0} spec={lbSpec} frame={fr}>
        {(pose) => {
          if (!handed) return null;
          const h = handLocal(pose, false);
          return (
            <group position={[h.x + 0.05, h.y + 0.08, h.z]} scale={1 / LEBRON_SCALE}>
              <Ball pos={v3(0, 0, 0)} spin={0} axisYaw={0} />
            </group>
          );
        }}
      </LeBron>
      <Jimmy x={SPOT.x + 1.15} z={0} yaw={Math.PI} spec={jSpec} frame={fr} look={{...DEADPAN(0, t), droop: -4}}>
        {(pose) => {
          if (handed) return null;
          const h = handLocal(pose, true);
          return <Ball pos={v3(h.x + 0.06, h.y + 0.1, h.z)} spin={0} axisYaw={0} />;
        }}
      </Jimmy>
    </Scene>
  );
};

// ================================================================ SHOT 8 — he places it, the keeper squares up (16.8–18.4)
const ShotSet: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const bend = 1 - smooth(clamp01((t - 0.45) / 0.4));
  const lbSpec: BodySpec = lerpSpec(idleSpec(fr, 0.1), {lean: 58, headTilt: 20, near: {thigh: 30, knee: 50}, far: {thigh: 10, knee: 40}, nearArm: [40, 20], farArm: [30, 30]}, bend);
  const hop = Math.abs(Math.sin(t * 7)) * 16;
  const cam: Cam = {position: v3(53.3, 1.4, 0.4), target: v3(SPOT.x, 1.25, -0.2), fov: 42};
  return (
    <Scene cam={cam} frame={fr} centre={v3(47, 0, 0)} extent={12} excite={1.3}>
      <LeBron x={SPOT.x - 0.6} z={0.1} yaw={0} spec={lbSpec} frame={fr} />
      <Actor style={BLUE_KEEPER} x={52.0} z={0.0} yaw={Math.PI} spec={{...K_SET, lift: hop, nearArm: [100, 20], farArm: [96, 22]}} frame={fr} look={{...CALM, brows: -0.6}} />
      <Ball pos={v3(SPOT.x, BALL_R, SPOT.z)} spin={0} axisYaw={0} />
    </Scene>
  );
};

// ================================================================ SHOT 9 — THE KICK (18.4–21.6), slow motion through the strike and the flight
const ShotKick: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const T = f / EP5_FPS;
  const fr = from + f;
  const s = simTime(T);
  const follow = smooth(clamp01((s - KT) / (KC - KT)));
  const hit = s > KC ? Math.exp(-(s - KC) * 7) * 0.12 : 0;
  const shk = v3(Math.sin(T * 61) * hit, Math.sin(T * 47) * hit, 0);
  const cam: Cam = {
    position: v3(lerp(SPOT.x - 6.2, 47.6, follow), lerp(2.0, 1.75, follow), lerp(2.3, 2.4, follow)).add(shk),
    target: v3(lerp(SPOT.x + 3.5, 52.4, follow), lerp(1.2, 1.6, follow), lerp(-0.4, -2.3, follow)),
    fov: 44,
  };
  return (
    <Scene cam={cam} frame={fr} centre={v3(47, 0, 0)} extent={12} excite={s > KC ? 2.2 : 1.2}>
      <KickWorld s={s} fr={fr} />
    </Scene>
  );
};

// ================================================================ SHOT 10 — 6-7 (21.6–24.0): LeBron, the stadium, then Jimmy
const ShotSixSeven: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const k = smooth(clamp01((t - 0.2) / 0.3));
  const crowd = smooth(clamp01((t - 0.45) / 0.4));
  if (t < 1.35) {
    const turn = smooth(clamp01(t / 0.35));
    const cam: Cam = {position: v3(SPOT.x + 3.6, 1.0, 2.6), target: v3(SPOT.x + 0.2, 2.0, 0.2), fov: 48};
    return (
      <Scene cam={cam} frame={fr} centre={v3(SPOT.x, 0, 0)} extent={10} excite={1.4} sixSeven={crowd}>
        <LeBron x={SPOT.x - 0.2} z={0.3} yaw={lerp(0, yawFor(1, 0.6), turn)} spec={sixSeven(idleSpec(fr, 0.1), t, k)} frame={fr} look={{...COOL, mouth: 'smile'}} />
      </Scene>
    );
  }
  const jk = smooth(clamp01((t - 1.5) / 0.25));
  return (
    <Scene cam={{position: v3(48.6, 1.6, 3.4), target: v3(47.0, 1.45, 0.6), fov: 40}} frame={fr} centre={v3(47, 0, 0)} extent={8} excite={1.4} sixSeven={1}>
      <Jimmy x={47.0} z={0.6} yaw={yawFor(1.6, 2.8)} spec={sixSeven(idleSpec(fr, 0.1), t, jk)} frame={fr} look={{...DEADPAN(0, t), yaw: -18}} />
    </Scene>
  );
};

// ================================================================ SHOT 11 — "And Jimmy gives it." (24.0–25.4)
const ShotGiven: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const spec = keyedSpec([[0, idleSpec(fr, 0.1)], [0.35, POINT], [1.4, POINT]], t);
  const cam: Cam = {position: v3(43.4, 1.5, 3.3), target: v3(46.4, 1.45, 0.6), fov: 40};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44, 0, 0)} extent={10} excite={1.6}>
      <Jimmy x={46.4} z={0.6} yaw={yawFor(-1, -0.2)} spec={spec} frame={fr} look={DEADPAN(0, t)} />
      {BLUES.slice(0, 3).map((st, i) => (
        <Actor key={i} style={st} x={49.2 + i * 0.9} z={-1.6 + i * 1.3} yaw={yawFor(-1, 0.3)} spec={{...idleSpec(fr + i * 7, 0.2), nearArm: [160, 150], farArm: [158, 150]}} frame={fr} look={GAPE} />
      ))}
    </Scene>
  );
};

// ================================================================ SHOT 12 — keeper upside down in the net (25.4–27.0)
const ShotHang: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const talk = t > 0.15 && t < 1.3 ? 1 : 0;
  const swing = 6 * Math.sin(t * 2.6);
  const cam: Cam = {position: v3(49.4, 1.25, -1.0), target: v3(52.8, 1.35, -2.9), fov: 40};
  return (
    <Scene cam={cam} frame={fr} centre={v3(51, 0, -2)} extent={8} excite={1.2}>
      <Actor style={BLUE_KEEPER} x={52.95} z={-2.95} y={2.3} yaw={Math.PI} pitch={180} roll={swing} spec={{...K_HUG, near: {thigh: 10, knee: 20}, far: {thigh: -6, knee: 30}}} frame={fr} look={DAZED(talk, t)} shadow={false}>
        {(pose) => {
          const h = handLocal(pose, false);
          return <Ball pos={v3(h.x + 0.12, h.y, 0)} spin={0} axisYaw={0} />;
        }}
      </Actor>
    </Scene>
  );
};

// ================================================================ SHOT 13 — vote (27.0–33.0)
const EP5_ENDING: EndingCfg = {
  a: {title: 'MOGS', sub: 'kicked a grown man into the top corner'},
  b: {title: "DOESN'T MOG", sub: "Jimmy's still the main character"},
  commentAt: 3.0,
  nextAt: 4.5,
  nextLabel: 'ANSWER IN EPISODE 6',
  nextEp: 6,
  comments: [
    {user: 'pint_and_a_pie', text: 'Jimmy doing the 6 7 with a straight face 💀', pick: '?', likes: 1388},
    {user: 'blu_til_i_die', text: 'The keeper is still in the net', pick: '?', likes: 942},
    {user: 'orange_army', text: 'A. He kicked a grown man into the top corner', pick: 'A', likes: 701},
    {user: 'sunday_league_ref', text: 'B. Nobody mogs Jimmy', pick: 'B', likes: 455},
    {user: 'laws_of_the_game', text: 'Jimmy still has the invite in his pocket', pick: '?', likes: 610},
  ],
};
const ShotVote5: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP5_FPS;
  const fr = from + f;
  const C = EP5_ENDING;
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
        <Jimmy x={0} z={0} yaw={yawFor(1, 0.12)} spec={spec} frame={fr} look={{...DEADPAN(0, t), mouth: t > C.nextAt ? 'smile' : 'flat'}} />
        <LeBron x={-1.3} z={-1.0} yaw={yawFor(1, 0.3)} spec={{...FOLD, ...{near: {thigh: 5, knee: 6}, far: {thigh: -5, knee: 6}}}} frame={fr} />
      </Scene>
      <EndingOverlay frame={f} fps={EP5_FPS} cfg={EP5_ENDING} />
    </>
  );
};

// ================================================================ captions, sound, timeline
const C = {orange: '#ff8a2a', blue: '#5a95ff', red: '#ff4d4d', green: '#45e070', yellow: '#ffd23a', purple: '#b98cff', gold: '#fdb927'};
const CUES: Cue[] = [
  {from: F(1.5), to: F(3.05), text: 'LAST TIME? B.', hl: {'B.': C.green}},
  {from: F(3.5), to: F(5.9), text: "A FAN CAN'T SAVE A PENALTY.", hl: {"CAN'T": C.red}},
  {from: F(6.0), to: F(6.7), text: 'RETAKE.', hl: {'RETAKE.': C.red}},
  {from: F(6.85), to: F(9.0), text: "I'M… I'M NOT TAKING IT.", hl: {NOT: C.orange}},
  {from: F(9.1), to: F(11.0), text: 'SOMEBODY FUCKING TAKE IT.', hl: {FUCKING: C.red}},
  {from: F(24.1), to: F(25.4), text: 'AND JIMMY GIVES IT.', hl: {'IT.': C.green}},
  {from: F(25.55), to: F(27.0), text: 'CAN SOMEONE GET ME DOWN?', hl: {'DOWN?': C.yellow}},
  {from: F(27.2), to: F(29.6), text: 'SO, REF… DOES LEBRON MOG?', hl: {LEBRON: C.gold, 'MOG?': C.gold}},
  {from: F(29.6), to: EP5_FRAMES, text: 'A OR B IN THE COMMENTS.', hl: {A: C.yellow, B: C.yellow}},
];

type Sfx = {at: number; src: string; vol?: number};
const SOUND: Sfx[] = [
  {at: 0.0, src: 'bass-hit.wav', vol: 0.9},
  {at: 0.0, src: 'crowd-roar.wav', vol: 0.6},
  {at: 1.3, src: 'scratch.wav', vol: 0.8},
  {at: 1.4, src: 'rewind.wav', vol: 0.45},
  {at: 1.5, src: 'nar-answer.mp3'},
  {at: 2.35, src: 'stamp.wav', vol: 0.9},
  {at: 5.95, src: 'whistle.wav', vol: 0.5},
  {at: 6.85, src: 'seven-not.mp3'},
  {at: 9.1, src: 'jimmy-take.mp3'},
  {at: 11.05, src: 'crowd-gasp.wav', vol: 0.9},
  {at: 11.6, src: 'heartbeat.wav', vol: 0.9},
  {at: 12.4, src: 'heartbeat.wav', vol: 0.9},
  {at: 13.95, src: 'trombone.wav', vol: 0.55},
  {at: 18.4 + 0.5, src: 'big-kick.wav'},
  {at: 18.4 + 0.5, src: 'whoosh.wav', vol: 0.7},
  {at: 18.4 + 1.25, src: 'big-kick.wav', vol: 0.6},
  {at: 18.4 + 1.25, src: 'crowd-ooh.wav', vol: 0.7},
  {at: 18.4 + 2.25, src: 'net.wav'},
  {at: 18.4 + 2.3, src: 'crowd-roar.wav'},
  {at: 21.75, src: 'lebron-67.wav'},
  {at: 24.1, src: 'nar-gives.mp3'},
  {at: 24.0, src: 'whistle.wav', vol: 0.5},
  {at: 25.55, src: 'keeper-down.mp3'},
  {at: 27.2, src: 'nar-vote.mp3'},
];

// voice lines (start, length): the crowd bed dips under them
const VOICE: [number, number][] = [[1.5, 5.07], [6.85, 2.06], [9.1, 1.93], [24.1, 1.23], [25.55, 1.36], [27.2, 4.7]];
const bedVolume = (s: number) => {
  let duck = 0;
  for (const [a, d] of VOICE) duck = Math.max(duck, clamp01((s - a + 0.15) / 0.15) * clamp01((a + d + 0.2 - s) / 0.2));
  const hush = s > 11.0 && s < 18.4 ? 0.45 : 0; // the stadium goes quiet when LeBron walks on
  return (0.55 - 0.27 * duck) * (1 - hush) * (s > 1.4 && s < 4.4 ? 0.3 : 1);
};

type ShotDef = {from: number; to: number; C: React.FC<{from: number}>};
const SHOTS: ShotDef[] = [
  {from: 0, to: F(1.4), C: ShotHook},
  {from: F(1.4), to: F(4.4), C: ShotFlash},
  {from: F(4.4), to: F(6.7), C: ShotRetake},
  {from: F(6.7), to: F(9.0), C: ShotSeven},
  {from: F(9.0), to: F(11.0), C: ShotTakeIt},
  {from: F(11.0), to: F(13.2), C: ShotArrive},
  {from: F(13.2), to: F(15.0), C: ShotMog},
  {from: F(15.0), to: F(16.8), C: ShotHandover},
  {from: F(16.8), to: F(18.4), C: ShotSet},
  {from: F(18.4), to: F(21.6), C: ShotKick},
  {from: F(21.6), to: F(24.0), C: ShotSixSeven},
  {from: F(24.0), to: F(25.4), C: ShotGiven},
  {from: F(25.4), to: F(27.0), C: ShotHang},
  {from: F(27.0), to: EP5_FRAMES, C: ShotVote5},
];
const inRange = (f: number, a: number, b: number) => f >= a && f < b;

export const Episode5: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = frame / fps;
  const flash = inRange(frame, F(1.4), F(4.4));
  const showScore = frame < F(27.0) && !flash;
  const blue: ('g' | 'x' | null)[] = ['g'];
  const orange: ('g' | 'x' | null)[] = [T >= 24.2 ? 'g' : null];
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ep5/crowd-bed.wav')} volume={(fr) => bedVolume(fr / EP5_FPS)} />
      {SOUND.map((s, i) => (
        <Sequence key={`a${i}`} from={F(s.at)} layout="none">
          <Audio src={staticFile(`ep5/${s.src}`)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <AbsoluteFill>
            <s.C from={s.from} />
          </AbsoluteFill>
        </Sequence>
      ))}

      {flash ? null : (
        <>
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
          <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
          <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />
        </>
      )}

      {/* titles */}
      {inRange(frame, F(11.3), F(13.2)) ? (
        <div style={{position: 'absolute', left: 48, top: 1250, transform: `translateX(${(1 - interpolate(frame, [F(11.3), F(11.55)], [0, 1], clampO)) * -80}px)`}}>
          <div style={{background: '#552583', color: '#fdb927', fontFamily: FONT, fontWeight: 900, fontSize: 34, padding: '8px 18px', display: 'inline-block'}}>FROM THE CROWD</div>
          <div style={{background: '#0d0f14', color: '#ffffff', fontFamily: FONT, fontWeight: 900, fontSize: 64, padding: '8px 18px'}}>LEBRON JAMES?!</div>
        </div>
      ) : null}
      {inRange(frame, F(13.95), F(15.0)) ? <BigTitle text="MOGGED." frame={frame - F(13.95)} fps={fps} top={300} size={130} rot={-6} color="#fdb927" stroke="#552583" /> : null}

      {flash ? null : <Badge episode={5} />}
      {showScore ? <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={[1, 1]} clock="PENS" /> : null}
      {showScore ? <Tally blue={blue} orange={orange} /> : null}
      <Captions cues={CUES} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
