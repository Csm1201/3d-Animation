/**
 * Standing poses on the same skeleton as the walk cycle (same Pose shape, same leg IK),
 * for scenes where a character stands still, bangs on a door, or turns to camera.
 * Coordinates are the walk's side plane in px, with the pelvis at x = 0.
 */
import {FLOOR_Y} from './constants';
import {ANKLE_H, ArmPose, LegPose, Pose, rot, solveLeg, Vec, WALK} from './walkCycle';

const UPPER_ARM = 150;
const FOREARM = 138;
const TORSO = 285;
const DEG = Math.PI / 180;

const limbDir = (deg: number): Vec => ({x: Math.sin(deg * DEG), y: Math.cos(deg * DEG)});
const add = (a: Vec, b: Vec): Vec => ({x: a.x + b.x, y: a.y + b.y});
const scale = (a: Vec, k: number): Vec => ({x: a.x * k, y: a.y * k});

const arm = (shoulder: Vec, upperDeg: number, flexDeg: number): ArmPose => {
  const elbow = add(shoulder, scale(limbDir(upperDeg), UPPER_ARM));
  const foreDeg = upperDeg + flexDeg;
  const wrist = add(elbow, scale(limbDir(foreDeg), FOREARM));
  return {shoulder, elbow, wrist, upperDeg, foreDeg};
};

export type StandParams = {
  /** Ankle x of each foot relative to the pelvis (px). */
  nearFootX?: number;
  farFootX?: number;
  /** How far the hips sink below a comfortable stand (px): knees bend. */
  sink?: number;
  /** Forward lean of the torso (deg). */
  lean?: number;
  headTilt?: number;
  /** Arm angles: upper arm from straight down (+ forward), elbow flex (deg). */
  near?: [number, number];
  far?: [number, number];
};

export const standPose = (p: StandParams = {}): Pose => {
  const {nearFootX = 18, farFootX = -22, sink = 0, lean = 2, headTilt = 0, near = [-3, 10], far = [3, 12]} = p;
  const pelvis = {x: 0, y: FLOOR_Y - ANKLE_H - (WALK.THIGH + WALK.SHIN) * 0.975 + sink};
  const nearHip = {x: 3, y: pelvis.y};
  const farHip = {x: -3, y: pelvis.y};
  const foot = (x: number) => ({ankle: {x, y: FLOOR_Y - ANKLE_H}, angle: 0, planted: true, pivot: {x: x + 58, y: FLOOR_Y}});
  const nf = foot(nearFootX);
  const ff = foot(farFootX);
  const nl = solveLeg(nearHip, nf.ankle);
  const fl = solveLeg(farHip, ff.ankle);
  const shoulder = add(pelvis, rot({x: 2, y: -TORSO}, lean));
  const nearLeg: LegPose = {hip: nearHip, knee: nl.knee, foot: nf, reach: nl.reach};
  const farLeg: LegPose = {hip: farHip, knee: fl.knee, foot: ff, reach: fl.reach};
  return {
    phase: 0.1,
    pelvis,
    lean,
    neck: add(pelvis, rot({x: 8, y: -TORSO - 6}, lean)),
    headTilt,
    nearLeg,
    farLeg,
    nearArm: arm(shoulder, near[0], near[1]),
    farArm: arm(shoulder, far[0], far[1]),
    paperWobble: 0,
  };
};

/** Where a fist lands for given arm angles, relative to the pelvis (px). Used to place the door. */
export const fistReach = (lean: number, upperDeg: number, flexDeg: number) => {
  const shoulder = rot({x: 2, y: -TORSO}, lean);
  const a = arm({x: shoulder.x, y: shoulder.y}, upperDeg, flexDeg);
  return add(a.wrist, scale(limbDir(a.foreDeg), 22));
};
