/**
 * Athletic poses on the shared skeleton (same Pose shape as the walk cycle), built with
 * forward kinematics from joint angles. The body is then lowered so the lowest foot rests
 * on the floor, so stance feet never float or sink.
 *
 * Angles: thigh / upper arm measured from straight down, + = forward. Knee flex bends the
 * shin backward; elbow flex bends the forearm forward.
 */
import {FLOOR_Y} from './constants';
import {ANKLE_H, ArmPose, FootState, LegPose, Pose, rot, Vec, WALK} from './walkCycle';

const UPPER_ARM = 150;
const FOREARM = 138;
const TORSO = 285;
const DEG = Math.PI / 180;
const TAU = Math.PI * 2;

const dir = (deg: number): Vec => ({x: Math.sin(deg * DEG), y: Math.cos(deg * DEG)});
const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y});
const scale = (a: Vec, k: number): Vec => ({x: a.x * k, y: a.y * k});
const pos = (v: number) => Math.max(0, v);

export type LegSpec = {thigh: number; knee: number; foot?: number};
export type BodySpec = {
  lean: number;
  headTilt?: number;
  near: LegSpec;
  far: LegSpec;
  nearArm: [number, number];
  farArm: [number, number];
  /** Extra height off the ground (px) — jumps and the flight phase of a run. */
  lift?: number;
  phase?: number;
};

const legFK = (hip: Vec, s: LegSpec) => {
  const knee = add(hip, scale(dir(s.thigh), WALK.THIGH));
  const ankle = add(knee, scale(dir(s.thigh - s.knee), WALK.SHIN));
  return {knee, ankle};
};

const arm = (shoulder: Vec, upper: number, flex: number): ArmPose => {
  const elbow = add(shoulder, scale(dir(upper), UPPER_ARM));
  const foreDeg = upper + flex;
  const wrist = add(elbow, scale(dir(foreDeg), FOREARM));
  return {shoulder, elbow, wrist, upperDeg: upper, foreDeg};
};

export const buildPose = (b: BodySpec): Pose => {
  // solve with the pelvis at y = 0, then drop the body so the lowest foot touches the floor
  const n = legFK({x: 3, y: 0}, b.near);
  const f = legFK({x: -3, y: 0}, b.far);
  const lowest = Math.max(n.ankle.y, f.ankle.y);
  const py = FLOOR_Y - ANKLE_H - lowest - (b.lift ?? 0);
  const shift = (v: Vec): Vec => ({x: v.x, y: v.y + py});
  const pelvis = {x: 0, y: py};
  const foot = (ankle: Vec, angle: number): FootState => {
    const planted = ankle.y >= lowest - 0.5 && (b.lift ?? 0) < 1;
    return {ankle: shift(ankle), angle, planted, pivot: null};
  };
  const nearLeg: LegPose = {hip: {x: 3, y: py}, knee: shift(n.knee), foot: foot(n.ankle, b.near.foot ?? 0), reach: 0.9};
  const farLeg: LegPose = {hip: {x: -3, y: py}, knee: shift(f.knee), foot: foot(f.ankle, b.far.foot ?? 0), reach: 0.9};
  const shoulder = add(pelvis, rot({x: 2, y: -TORSO}, b.lean));
  return {
    phase: b.phase ?? 0.1,
    pelvis,
    lean: b.lean,
    neck: add(pelvis, rot({x: 8, y: -TORSO - 6}, b.lean)),
    headTilt: b.headTilt ?? 0,
    nearLeg,
    farLeg,
    nearArm: arm(shoulder, b.nearArm[0], b.nearArm[1]),
    farArm: arm(shoulder, b.farArm[0], b.farArm[1]),
    paperWobble: 0,
  };
};

/**
 * Running stride. p = cycle phase (0..1, one full stride = two steps); effort 0..1 scales
 * how hard he's sprinting (stride length, knee lift, arm pump, lean).
 */
export const runSpec = (p: number, effort = 1): BodySpec => {
  const a = TAU * p;
  const leg = (ph: number): LegSpec => {
    const sn = Math.sin(a + ph);
    return {
      thigh: 4 + (28 + 10 * effort) * sn,
      // knee tucks hard in mid-swing (heel toward the backside), stays long in stance
      knee: 14 + (70 + 40 * effort) * Math.pow(pos(Math.sin(a + ph + 0.9)), 1.6),
      foot: 8 + 26 * pos(Math.cos(a + ph)) - 6 * pos(sn),
    };
  };
  const swing = Math.sin(a);
  const spec: BodySpec = {
    lean: 8 + 7 * effort,
    headTilt: -6 - 3 * effort,
    near: leg(0),
    far: leg(Math.PI),
    nearArm: [-(30 + 14 * effort) * swing, 92],
    farArm: [(30 + 14 * effort) * swing, 92],
    phase: p,
  };
  // Smooth hip path with a small bounce (flight phase); only lift further if a foot would sink.
  const grounded = buildPose(spec).pelvis.y;
  const desired = FLOOR_Y - ANKLE_H - 418 * 0.985 + 12 * Math.cos(2 * a + 0.4) * (0.5 + 0.5 * effort);
  return {...spec, lift: Math.max(0, grounded - desired)};
};

export const runPose = (p: number, effort = 1): Pose => buildPose(runSpec(p, effort));

const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixLeg = (a: LegSpec, b: LegSpec, t: number): LegSpec => ({thigh: mix(a.thigh, b.thigh, t), knee: mix(a.knee, b.knee, t), foot: mix(a.foot ?? 0, b.foot ?? 0, t)});
/** Blend two body specs (t = 0 -> a, 1 -> b). */
export const lerpSpec = (a: BodySpec, b: BodySpec, t: number): BodySpec => ({
  lean: mix(a.lean, b.lean, t),
  headTilt: mix(a.headTilt ?? 0, b.headTilt ?? 0, t),
  near: mixLeg(a.near, b.near, t),
  far: mixLeg(a.far, b.far, t),
  nearArm: [mix(a.nearArm[0], b.nearArm[0], t), mix(a.nearArm[1], b.nearArm[1], t)],
  farArm: [mix(a.farArm[0], b.farArm[0], t), mix(a.farArm[1], b.farArm[1], t)],
  lift: mix(a.lift ?? 0, b.lift ?? 0, t),
  phase: t < 0.5 ? a.phase : b.phase,
});

/** Play a list of keyframed specs: keys = [[time, spec], ...] (times ascending), smoothstep between. */
export const keyedSpec = (keys: [number, BodySpec][], t: number): BodySpec => {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    if (t <= keys[i][0]) {
      const u = (t - keys[i - 1][0]) / (keys[i][0] - keys[i - 1][0]);
      return lerpSpec(keys[i - 1][1], keys[i][1], u * u * (3 - 2 * u));
    }
  }
  return keys[keys.length - 1][1];
};

/** Light jog / backpedal-friendly stride. */
export const jogPose = (p: number) => runPose(p, 0.35);

/** Relaxed standing pose with gentle breathing. */
export const idleSpec = (t: number, sway = 0): BodySpec => ({
    lean: 2 + Math.sin(t * 0.08 + sway) * 0.8,
    near: {thigh: 4, knee: 6},
    far: {thigh: -4, knee: 6},
    nearArm: [-4 + Math.sin(t * 0.08 + sway) * 2, 14],
    farArm: [5, 14],
  });
export const idlePose = (t: number, sway = 0) => buildPose(idleSpec(t, sway));
