/**
 * ONE shared walk cycle drives the whole body.
 *
 * Everything is a pure function of the frame number, so it is fully
 * deterministic and any frame can be rendered on its own.
 *
 * How foot sliding is avoided:
 *   1. The hip travels forward at a constant world speed.
 *   2. Each foot is placed in WORLD space. While a foot is on the ground it
 *      is pinned: first it rolls about the heel (heel strike), then it lies
 *      flat, then it rolls about the toe (heel off). The pivot never moves.
 *   3. During swing, the foot travels exactly one stride (STRIDE) to its
 *      next footprint. STRIDE = SPEED * CYCLE, so footprints and the body
 *      stay in lock-step.
 *   4. The knee is solved with two-bone IK from hip to ankle, so the leg
 *      always reaches the planted foot instead of the foot following the leg.
 */
import {FLOOR_Y} from './constants';

export const WALK = {
  CYCLE: 64, // frames per full gait cycle (two steps) ~1.07 s
  STRIDE: 520, // world px per cycle (one footprint to the next of the same foot)
  THIGH: 212,
  SHIN: 206,
  HIP_Y: 1070, // mean hip height (screen y)
  BOB: 4, // vertical hip bob amplitude (on top of the pendulum drop)
  MAX_REACH: 0.996, // never straighten a leg past this fraction of its length
  ALIGN: 0.26, // phase at which the hip is directly over the flat ankle (mid-stance)
  HEEL_STRIKE_END: 0.1, // heel-pivot roll finished, foot flat
  HEEL_OFF: 0.45, // heel starts to lift, foot pivots on toe
  TOE_OFF: 0.62, // toe leaves floor -> swing
  HEEL_STRIKE_ANGLE: -18, // deg, toe up at contact
  TOE_OFF_ANGLE: 38, // deg, heel up at push-off
  LIFT: 40, // extra swing clearance
  PHASE0: 0.18, // phase of the near leg at frame 0 (starts mid-stride)
  START_X: 0, // hip world x at frame 0
} as const;

export const SPEED = WALK.STRIDE / WALK.CYCLE; // world px / frame

// Shoe geometry, local to the ankle (x forward, y down). Sole is at y = 22.
export const ANKLE_H = 22;
export const HEEL = {x: -30, y: ANKLE_H};
export const TOE = {x: 58, y: ANKLE_H};

export type Vec = {x: number; y: number};
const v = (x: number, y: number): Vec => ({x, y});
const add = (a: Vec, b: Vec) => v(a.x + b.x, a.y + b.y);
const sub = (a: Vec, b: Vec) => v(a.x - b.x, a.y - b.y);
const scale = (a: Vec, k: number) => v(a.x * k, a.y * k);
const len = (a: Vec) => Math.hypot(a.x, a.y);
const DEG = Math.PI / 180;

/** Rotate a vector by deg degrees (SVG convention: +deg is clockwise on screen). */
export const rot = (p: Vec, deg: number): Vec => {
  const c = Math.cos(deg * DEG);
  const s = Math.sin(deg * DEG);
  return v(p.x * c - p.y * s, p.x * s + p.y * c);
};

/** Direction for a limb angle measured from straight down, + = forward. */
const limbDir = (deg: number): Vec => v(Math.sin(deg * DEG), Math.cos(deg * DEG));

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const hermite = (p0: number, m0: number, p1: number, m1: number, t: number) => {
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * p0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * p1 + (t3 - t2) * m1
  );
};

export const hipX = (frame: number) => WALK.START_X + SPEED * frame;

/** Continuous phase (cycles) of a leg. near leg offset 0, far leg offset 0.5. */
const legPhase = (frame: number, offset: number) => frame / WALK.CYCLE + WALK.PHASE0 + offset;

/** Flat-foot ankle x for footprint n: the hip is over it at phase ALIGN. */
const footprintX = (n: number, offset: number) => {
  const f = (n + WALK.ALIGN - WALK.PHASE0 - offset) * WALK.CYCLE;
  return hipX(f);
};

export type FootState = {ankle: Vec; angle: number; planted: boolean; pivot: Vec | null};

/** Foot while touching the ground, p in [0, TOE_OFF]. Pivot is fixed in world. */
const stanceFoot = (n: number, offset: number, p: number): FootState => {
  const fx = footprintX(n, offset);
  const flatAnkle = v(fx, FLOOR_Y - ANKLE_H);
  if (p < WALK.HEEL_STRIKE_END) {
    // Roll down about the heel.
    const angle = WALK.HEEL_STRIKE_ANGLE * (1 - smooth(p / WALK.HEEL_STRIKE_END));
    const heelW = add(flatAnkle, HEEL);
    return {ankle: sub(heelW, rot(HEEL, angle)), angle, planted: true, pivot: heelW};
  }
  if (p < WALK.HEEL_OFF) {
    return {ankle: flatAnkle, angle: 0, planted: true, pivot: add(flatAnkle, TOE)};
  }
  // Heel lifts, foot rolls about the toe.
  const t = clamp01((p - WALK.HEEL_OFF) / (WALK.TOE_OFF - WALK.HEEL_OFF));
  const angle = WALK.TOE_OFF_ANGLE * t * t;
  const toeW = add(flatAnkle, TOE);
  return {ankle: sub(toeW, rot(TOE, angle)), angle, planted: true, pivot: toeW};
};

export const footState = (frame: number, offset: number): FootState => {
  const u = legPhase(frame, offset);
  const n = Math.floor(u);
  const p = u - n;
  if (p < WALK.TOE_OFF) return stanceFoot(n, offset, p);

  // Swing: Hermite curve from toe-off (matching its velocity) to the next heel strike.
  const s = (p - WALK.TOE_OFF) / (1 - WALK.TOE_OFF);
  const eps = 1e-4;
  const a = stanceFoot(n, offset, WALK.TOE_OFF);
  const aPrev = stanceFoot(n, offset, WALK.TOE_OFF - eps);
  const b = stanceFoot(n + 1, offset, 0);
  const k = (1 - WALK.TOE_OFF) / eps; // d/ds = d/dp * (1 - TOE_OFF)
  const m0 = scale(sub(a.ankle, aPrev.ankle), k);
  const mA = (a.angle - aPrev.angle) * k;

  const x = hermite(a.ankle.x, m0.x, b.ankle.x, 0, s);
  const yBase = hermite(a.ankle.y, m0.y * 0.5, b.ankle.y, 0, s);
  const lift = WALK.LIFT * Math.sin(Math.PI * Math.pow(s, 0.8));
  const angle = hermite(a.angle, mA * 0.35, b.angle, 0, s);
  return {ankle: v(x, yBase - lift), angle, planted: false, pivot: null};
};

/** Two-bone IK. Knee bends forward (+x). */
export const solveLeg = (hip: Vec, ankle: Vec) => {
  const {THIGH: a, SHIN: b} = WALK;
  const d0 = sub(ankle, hip);
  const dist = len(d0);
  const d = Math.min(Math.max(dist, Math.abs(a - b) + 1), a + b - 0.01);
  const base = Math.atan2(d0.y, d0.x);
  const alpha = Math.acos((a * a + d * d - b * b) / (2 * a * d));
  const kAng = base - alpha;
  const knee = add(hip, v(Math.cos(kAng) * a, Math.sin(kAng) * a));
  return {knee, reach: dist / (a + b)};
};

export type ArmPose = {shoulder: Vec; elbow: Vec; wrist: Vec; upperDeg: number; foreDeg: number};
export type LegPose = {hip: Vec; knee: Vec; foot: FootState; reach: number};

export type Pose = {
  phase: number; // near-leg phase 0..1
  pelvis: Vec;
  lean: number;
  neck: Vec;
  headTilt: number;
  nearLeg: LegPose;
  farLeg: LegPose;
  nearArm: ArmPose;
  farArm: ArmPose;
  paperWobble: number;
};

const UPPER_ARM = 150;
const FOREARM = 138;
const TORSO = 285;

const arm = (shoulder: Vec, upperDeg: number, flexDeg: number): ArmPose => {
  const elbow = add(shoulder, scale(limbDir(upperDeg), UPPER_ARM));
  const foreDeg = upperDeg + flexDeg;
  const wrist = add(elbow, scale(limbDir(foreDeg), FOREARM));
  return {shoulder, elbow, wrist, upperDeg, foreDeg};
};

/** The single walk cycle: hips, knees, feet, shoulders, elbows, head. */
export const getPose = (frame: number): Pose => {
  const u = legPhase(frame, 0);
  const p = u - Math.floor(u); // near leg phase
  const TAU = Math.PI * 2;
  const c1 = Math.cos(TAU * p); // +1 when near leg is forward (heel strike)

  // Pelvis: constant forward speed, bob twice per cycle, highest at mid-stance.
  // Pelvis height = inverted pendulum: aim high (nearly straight stance knee), but the
  // hip drops wherever a leg could not otherwise reach its planted foot (double support).
  const nearFoot = footState(frame, 0);
  const farFoot = footState(frame, 0.5);
  const hx = hipX(frame);
  const nearDx = 5 * c1;
  const target = WALK.HIP_Y - WALK.BOB * Math.cos(2 * TAU * (p - WALK.ALIGN));
  const reachY = (ankle: Vec, dx: number) => {
    const r = WALK.MAX_REACH * (WALK.THIGH + WALK.SHIN);
    const h = ankle.x - (hx + dx);
    return ankle.y - Math.sqrt(Math.max(0, r * r - h * h));
  };
  const smoothMax = (a: number, b: number, k = 4) => (a + b + Math.sqrt((a - b) ** 2 + k * k)) / 2;
  const hy = smoothMax(smoothMax(target, reachY(nearFoot.ankle, nearDx)), reachY(farFoot.ankle, -nearDx));
  const pelvis = v(hx, hy);

  // Hips rotate: the hip of the forward leg is slightly forward.
  const nearHip = add(pelvis, v(nearDx, 0));
  const farHip = add(pelvis, v(-nearDx, 0));
  const nl = solveLeg(nearHip, nearFoot.ankle);
  const fl = solveLeg(farHip, farFoot.ankle);

  // Torso leans forward a little and pitches twice per cycle (push-off).
  const lean = 4 + 1.1 * Math.sin(2 * TAU * (p - 0.05));
  const shoulderMid = add(pelvis, rot(v(2, -TORSO), lean));

  // Shoulders counter-rotate against the hips.
  const nearShoulder = add(shoulderMid, v(-4 * c1, 0));
  const farShoulder = add(shoulderMid, v(4 * c1, 0));

  // Far (free) arm swings opposite to the far leg = in phase with the near leg.
  const swing = Math.cos(TAU * p - 0.25);
  const farArm = arm(farShoulder, 4 + 26 * swing, 14 + 22 * (0.5 + 0.5 * Math.cos(TAU * p - 0.5)));

  // Near arm carries the papers: elbow ~95 deg, forearm level, tiny swing.
  const nearArm = arm(nearShoulder, -9 + 2.5 * -swing + lean * 0.5, 95 - 2 * Math.sin(2 * TAU * p));

  const neck = add(pelvis, rot(v(8, -TORSO - 6), lean));
  const headTilt = -lean * 0.6 + 1.2 * Math.sin(2 * TAU * (p - 0.15));
  const paperWobble = 1.4 * Math.sin(2 * TAU * (p - 0.18));

  return {
    phase: p,
    pelvis,
    lean,
    neck,
    headTilt,
    nearLeg: {hip: nearHip, knee: nl.knee, foot: nearFoot, reach: nl.reach},
    farLeg: {hip: farHip, knee: fl.knee, foot: farFoot, reach: fl.reach},
    nearArm,
    farArm,
    paperWobble,
  };
};

/** Smooth tracking camera: locks onto the constant hip speed, softly follows bob. */
export const getCamera = (frame: number) => {
  const pose = getPose(frame);
  return {
    x: hipX(frame) + 40, // keep the worker slightly left of centre, room to walk into
    y: (pose.pelvis.y - WALK.HIP_Y) * 0.25,
  };
};
