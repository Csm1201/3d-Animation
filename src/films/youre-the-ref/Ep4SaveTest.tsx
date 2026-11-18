/**
 * "You're the Ref" episode 4, 3-second test: Jeffrey Epstein (toy caricature) has shoved Blue's
 * keeper out of the goal and saves Orange's first-round retake with a full-stretch, fingertip dive
 * that turns the ball round the post. Slow motion through the save.
 */
import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Euler, Matrix4, Vector3} from 'three';
import {BodySpec, buildPose, idleSpec, keyedSpec, lerpSpec} from '../../core/sportPoses';
import {to3} from '../../character3d/common';
import {ARM_Z} from '../../character3d/Paper3D';
import {Cam} from '../../character3d/stage';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, CALM, KICK_BACK, KICK_FOLLOW, KICK_HIT, runAlong, Scene, ST} from './Episode2';
import {Badge, FONT, Scoreboard} from './Overlays';
import {Ball, BALL_R, yawFor} from './Players';

export const EP4_SAVE_FRAMES = 90;

const DEG = Math.PI / 180;
const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

const SPOT = {x: 41.5, z: 0};
const LINE_X = 52.0; // where he stands, just off the goal line
const POST_Z = -3.66;

// toy caricature: thick grey hair brushed back, dark heavy brows, tan, navy crew-neck jumper, jeans
export const EPSTEIN: Style = {
  outfit: 'kit',
  skin: '#e0a47c',
  hair: '#b3aea6',
  brow: '#3a2d26',
  hairStyle: 'swept',
  kit: {shirt: '#26324d', shorts: '#3b4a66', socks: '#3b4a66', trim: '#26324d', longSleeves: true, trousers: true},
};
const SMUG: Look = {tired: 0, droop: -4, eyesClosed: false, brows: -0.15, browLift: 0.1, mouth: 'smile', noBlink: true};
const STRAIN: Look = {tired: 0, droop: -8, eyesClosed: false, brows: -0.9, browLift: -0.2, mouth: 'open', mouthOpen: 0.55, noBlink: true};

// ---------------------------------------------------------------- slow motion
// video time T -> simulation time: real speed for the run-up, 0.28x through the save, then easing back
const RATE_KEYS: [number, number][] = [
  [0, 1],
  [0.78, 1],
  [0.95, 0.28],
  [2.15, 0.28],
  [2.45, 0.9],
  [3, 0.9],
];
const rateAt = (T: number) => {
  for (let i = 1; i < RATE_KEYS.length; i++) {
    const [t1, r1] = RATE_KEYS[i];
    const [t0, r0] = RATE_KEYS[i - 1];
    if (T <= t1) return lerp(r0, r1, smooth(clamp01((T - t0) / (t1 - t0))));
  }
  return RATE_KEYS[RATE_KEYS.length - 1][1];
};
const simTime = (T: number) => {
  let s = 0;
  const n = Math.max(1, Math.round(T * 600));
  for (let i = 0; i < n; i++) s += rateAt(((i + 0.5) / n) * T) * (T / n);
  return s;
};

// ---------------------------------------------------------------- the dive
const KICK_T = 0.55; // sim time the ball is struck
const FLY = 0.36; // ball travel time to his fingertips (~29 m/s)
const CONTACT_T = KICK_T + FLY;

const SET: BodySpec = {lean: 16, headTilt: 8, near: {thigh: 30, knee: 56}, far: {thigh: 26, knee: 54}, nearArm: [40, 24], farArm: [36, 26]};
const PUSH: BodySpec = {lean: 6, headTilt: 2, near: {thigh: 12, knee: 18}, far: {thigh: 46, knee: 78}, nearArm: [128, 18], farArm: [104, 34]};
const FLY_SPEC: BodySpec = {lean: -2, headTilt: -10, near: {thigh: 6, knee: 10}, far: {thigh: -14, knee: 30}, nearArm: [178, 3], farArm: [162, 16]};
const LAND: BodySpec = {lean: 14, headTilt: -4, near: {thigh: 38, knee: 64}, far: {thigh: 22, knee: 46}, nearArm: [118, 40], farArm: [96, 52]};

/** Keeper state at sim time t: body spec plus position, lift and roll (positive roll dives toward world -z). */
const dive = (t: number, frame: number) => {
  const u = t - KICK_T;
  // split-step hop just before the strike
  const hop = u > -0.2 && u < -0.04 ? Math.sin(Math.PI * ((u + 0.2) / 0.16)) * 26 : 0;
  const push = smooth(clamp01(u / 0.14));
  const flight = clamp01((u - 0.1) / 0.52);
  const land = clamp01((u - 0.62) / 0.34);
  const spec =
    u < 0
      ? {...lerpSpec(idleSpec(frame, 0.2), SET, 0.95), lift: hop}
      : keyedSpec(
          [
            [0, SET],
            [0.14, PUSH],
            [0.3, FLY_SPEC],
            [0.6, FLY_SPEC],
            [0.86, LAND],
          ],
          u,
        );
  // lateral travel (world z), height of the pivot (his feet) and roll
  const z = 0.1 - lerp(0, 0.35, push) - 1.05 * (1 - (1 - flight) * (1 - flight)) - 0.25 * smooth(land);
  const y = Math.sin(Math.PI * Math.min(1, flight * 0.92)) * 0.95 * (1 - smooth(land)) + (land > 0 ? 0.14 * smooth(land) + Math.abs(Math.sin(land * Math.PI * 2)) * 0.06 * (1 - land) : 0);
  const roll = lerp(0, 22, push) + lerp(0, 40, smooth(flight)) + lerp(0, 30, smooth(land));
  return {spec, x: LINE_X, z, y, roll};
};

/** World position of his near (leading) hand, from the same transforms the Actor applies. */
const handWorld = (d: ReturnType<typeof dive>) => {
  const pose = buildPose(d.spec);
  const w = to3(pose.nearArm.wrist, ARM_Z);
  const e = to3(pose.nearArm.elbow, ARM_Z);
  const hand = w.clone().addScaledVector(w.clone().sub(e).normalize(), 0.06);
  const m = new Matrix4()
    .makeTranslation(d.x, 0, d.z)
    .multiply(new Matrix4().makeRotationY(Math.PI))
    .multiply(new Matrix4().makeTranslation(0, d.y, 0))
    .multiply(new Matrix4().makeRotationFromEuler(new Euler(d.roll * DEG, 0, 0)));
  return hand.applyMatrix4(m);
};

// ---------------------------------------------------------------- the ball
const ballAt = (t: number, contact: Vector3) => {
  const start = v3(SPOT.x, BALL_R, SPOT.z);
  if (t < KICK_T) return {pos: start, spin: 0};
  // ball meets the fingertips: its centre one radius in front of the hand, toward the shooter
  const hit = contact.clone().add(v3(-BALL_R * 0.9, BALL_R * 0.3, BALL_R * 0.5));
  if (t < CONTACT_T) {
    const s = (t - KICK_T) / FLY;
    const p = start.clone().lerp(hit, s);
    p.y += Math.sin(Math.PI * s) * 0.25; // slight rise and dip
    return {pos: p, spin: (t - KICK_T) * 60};
  }
  // fingertips push it up and wide: round the post and out behind the goal
  const dt = t - CONTACT_T;
  const vel = v3(7.5, 3.2, -11);
  const p = hit.clone().addScaledVector(vel, dt);
  p.y = Math.max(BALL_R, hit.y + vel.y * dt - 4.9 * dt * dt);
  return {pos: p, spin: (CONTACT_T - KICK_T) * 60 + dt * 25};
};

export const Ep4SaveTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const T = frame / fps;
  const t = simTime(T);

  const d = dive(t, frame);
  const contact = handWorld(dive(CONTACT_T, Math.round(CONTACT_T * fps)));
  const ball = ballAt(t, contact);

  // Orange #10: short run-up, strike, follow-through
  const run = runAlong((tt) => ({x: SPOT.x - 2.2 + 1.7 * smooth(clamp01(tt / 0.5)), z: 0.45}), Math.min(t, 0.4), 0.6, 0.2);
  const takerSpec = keyedSpec(
    [
      [0.3, run.spec],
      [KICK_T - 0.15, KICK_BACK],
      [KICK_T, KICK_HIT],
      [KICK_T + 0.25, KICK_FOLLOW],
      [KICK_T + 0.7, {...idleSpec(frame, 0.2), nearArm: [150, 140], farArm: [150, 140]}],
    ],
    t,
  );
  const takerX = SPOT.x - 2.2 + 1.7 * smooth(clamp01(Math.min(t, 0.5) / 0.5)) - 0.45;

  // Blue's keeper, shoved out of his goal, sits on the grass by the far post
  const blueKeeperSpec: BodySpec = {lean: -20, headTilt: -8, near: {thigh: 80, knee: 40}, far: {thigh: 75, knee: 60}, nearArm: [-30, 40], farArm: [-25, 45]};

  // shot A: close on him at the line, smirking, while #10 places the ball (off screen)
  // shot B (cut at 0.75 s): low angle in front of the goal, on his diving side, so we see his face as he flies
  const CUT = 0.6;
  const shotA = T < CUT;
  const k = smooth(clamp01((T - CUT) / 2.2));
  const cam: Cam = shotA
    ? {position: v3(48.9 + T * 0.35, 1.55, 1.2), target: v3(LINE_X, 1.45, d.z * 0.6), fov: 34}
    : {
        position: v3(lerp(46.2, 46.8, k), lerp(1.15, 1.3, k), lerp(-5.6, -5.2, k)),
        target: v3(LINE_X - 0.2, lerp(1.45, 0.9, k), lerp(-1.6, -2.2, k)),
        fov: lerp(44, 40, k),
      };

  const slow = T > 0.9 && T < 2.4;
  const saved = spring({frame: frame - Math.round(1.1 * fps), fps, config: {damping: 9, stiffness: 220}});
  const tagIn = interpolate(frame, [3, 9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const tagOut = interpolate(frame, [15, 18], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Scene cam={cam} frame={frame} centre={v3(48, 0, -1)} extent={14} excite={t > CONTACT_T ? 2.2 : 1.1}>
        <Actor style={EPSTEIN} x={d.x} z={d.z} y={d.y} yaw={Math.PI} roll={d.roll} spec={d.spec} frame={frame} look={t > KICK_T - 0.05 ? STRAIN : SMUG} />
        <Actor style={ST.ten} x={takerX} z={0.45} yaw={0} spec={takerSpec} frame={frame} look={{...CALM, brows: -0.5}} />
        <Actor style={ST.greenKeeper} x={52.6} z={2.9} yaw={yawFor(-0.6, -1)} spec={blueKeeperSpec} frame={frame} look={{...CALM, brows: 0.8, browLift: 0.7, mouth: 'open', mouthOpen: 0.5}} />
        <Ball pos={ball.pos} spin={ball.spin} axisYaw={yawFor(1, -0.4)} />
      </Scene>

      {/* slow-motion grade */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 50%, rgba(4,6,14,.6) 100%)', opacity: slow ? 1 : 0.5}} />
      {slow ? (
        <div style={{position: 'absolute', top: 210, right: 56, fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#ffffff', letterSpacing: 4, opacity: 0.85}}>
          ● SLOW-MO
        </div>
      ) : null}

      {/* who is that in goal */}
      <div style={{position: 'absolute', left: 48, top: 1260, opacity: tagIn * tagOut, transform: `translateX(${(1 - tagIn) * -60}px)`}}>
        <div style={{background: '#ffd21a', color: '#0d0f14', fontFamily: FONT, fontWeight: 900, fontSize: 34, padding: '8px 18px', display: 'inline-block'}}>IN GOAL</div>
        <div style={{background: '#0d0f14', color: '#ffffff', fontFamily: FONT, fontWeight: 900, fontSize: 52, padding: '8px 18px'}}>JEFFREY EPSTEIN?!</div>
      </div>

      {frame >= Math.round(1.1 * fps) ? (
        <div style={{position: 'absolute', top: 420, left: 0, right: 0, textAlign: 'center'}}>
          <span
            style={{
              display: 'inline-block',
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 150,
              color: '#ffd21a',
              WebkitTextStroke: '16px #0d0f14',
              paintOrder: 'stroke fill',
              transform: `rotate(-5deg) scale(${2 - saved})`,
              opacity: Math.min(1, saved * 2),
            }}
          >
            SAVED?!
          </span>
        </div>
      ) : null}

      <Badge episode={4} />
      <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={[1, 1]} clock="PENS" />
    </AbsoluteFill>
  );
};
