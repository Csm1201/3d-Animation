/**
 * Footballers and the ball for "You're the Ref".
 *
 * A player's motion is a path p(t) on the pitch (metres, x along the pitch, z across).
 * The run-cycle phase is the distance travelled divided by the stride length the pose
 * actually produces, so planted feet move with the ground (no skating).
 */
import React, {useMemo} from 'react';
import {MeshStandardMaterial, SphereGeometry, Vector3} from 'three';
import {idlePose, runPose} from '../../core/sportPoses';
import {Pose} from '../../core/walkCycle';
import {canvasTex, DEG, once} from '../../character3d/common';
import {Blob} from '../../character3d/stage';
import {Kit, Look, Style, Worker3D} from '../../character3d/Worker3D';
import {seeded} from '../../core/random';

export type P2 = {x: number; z: number};
export type PathFn = (t: number) => P2;

// ---------------------------------------------------------------- kits
const ORANGE: Kit = {shirt: '#ff7a1a', shorts: '#17171c', socks: '#ff7a1a', numColor: '#17171c', trim: '#17171c'};
const BLUE: Kit = {shirt: '#2f6df0', shorts: '#f5f6fa', socks: '#2f6df0', numColor: '#ffffff', trim: '#ffffff'};
export const kitStyle = (team: 'orange' | 'blue' | 'keeper' | 'ref', number: number | undefined, skin: string, hair: string, hairStyle: Style['hairStyle'] = 'short'): Style => {
  const kit: Kit =
    team === 'orange'
      ? {...ORANGE, number}
      : team === 'blue'
        ? {...BLUE, number}
        : team === 'keeper'
          ? {shirt: '#ff5fa8', shorts: '#17171c', socks: '#ff5fa8', numColor: '#17171c', trim: '#17171c', gloves: '#b6ff3a', longSleeves: true, number}
          : {shirt: '#ffd21a', shorts: '#111114', socks: '#111114', trim: '#111114'};
  return {outfit: 'kit', skin, hair, hairStyle, kit};
};

// ---------------------------------------------------------------- motion helpers
/** Metres covered per run cycle (two steps) at a given effort, measured from runPose's stance feet. */
export const strideM = (effort: number) => (1375 + ((effort - 0.35) / 0.65) * (1661 - 1375)) / 500;

const FPS_SAMPLE = 120;
/** Arc length of a path from 0 to t (numerical, deterministic). */
export const distAlong = (path: PathFn, t: number) => {
  const n = Math.max(1, Math.ceil(Math.abs(t) * FPS_SAMPLE));
  let d = 0;
  let prev = path(0);
  for (let i = 1; i <= n; i++) {
    const q = path((t * i) / n);
    d += Math.hypot(q.x - prev.x, q.z - prev.z);
    prev = q;
  }
  return d;
};

export const velocity = (path: PathFn, t: number): P2 => {
  const h = 1 / 60;
  const a = path(t - h);
  const b = path(t + h);
  return {x: (b.x - a.x) / (2 * h), z: (b.z - a.z) / (2 * h)};
};

/** Yaw (radians) that turns the character (who faces +x) toward direction (dx, dz). */
export const yawFor = (dx: number, dz: number) => Math.atan2(-dz, dx);

export const DETERMINED: Look = {tired: 0, droop: -2, eyesClosed: false, brows: -0.55, browLift: -0.1, mouth: 'flat', noBlink: true};

// ---------------------------------------------------------------- one player
export type Mover = {
  path: PathFn;
  effort: number;
  /** Faces this point instead of the direction of travel (backpedalling defenders). */
  faceToward?: (t: number) => P2;
  /** Run-cycle offset so players don't step in sync. */
  offset?: number;
  idle?: boolean;
};

export const poseFor = (mv: Mover, t: number): {pose: Pose; pos: P2; yaw: number} => {
  const pos = mv.path(t);
  const v = velocity(mv.path, t);
  let yaw = Math.hypot(v.x, v.z) > 0.2 ? yawFor(v.x, v.z) : 0;
  let backwards = false;
  if (mv.faceToward) {
    const f = mv.faceToward(t);
    yaw = yawFor(f.x - pos.x, f.z - pos.z);
    // moving away from where he faces -> play the cycle backwards
    const fx = Math.cos(yaw);
    const fz = -Math.sin(yaw);
    backwards = v.x * fx + v.z * fz < 0;
  }
  if (mv.idle) return {pose: idlePose(t * 30, mv.offset ?? 0), pos, yaw};
  const d = distAlong(mv.path, t);
  const phase = (backwards ? -1 : 1) * (d / strideM(mv.effort)) + (mv.offset ?? 0);
  return {pose: runPose(((phase % 1) + 1) % 1, mv.effort), pos, yaw};
};

export const Footballer: React.FC<{mv: Mover; t: number; frame: number; style: Style; look?: Look; lean?: number}> = ({mv, t, frame, style, look = DETERMINED, lean = 0}) => {
  const {pose, pos, yaw} = poseFor(mv, t);
  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, yaw, 0]}>
      <group rotation={[lean * DEG, 0, 0]}>
        <Worker3D pose={pose} frame={frame} look={look} carry="none" style={style} />
      </group>
      <Blob x={0.05} z={0} h={0} sx={0.9} sz={0.5} strength={0.45} />
    </group>
  );
};

// ---------------------------------------------------------------- ball
export const BALL_R = 0.11;

const ballTexture = () =>
  once('ball', () =>
    canvasTex(512, 256, (g) => {
      g.fillStyle = '#f7f7f4';
      g.fillRect(0, 0, 512, 256);
      g.fillStyle = '#16161b';
      const r = seeded(11);
      // classic panel pattern: black pentagons spread over the sphere (equirect)
      const pts: [number, number][] = [
        [0.5, 0.5], [0, 0.5], [0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75], [0.5, 0.06], [0.5, 0.94], [0.125, 0.5], [0.375, 0.5], [0.625, 0.5], [0.875, 0.5],
      ];
      for (const [u, v] of pts) {
        const cx = u * 512;
        const cy = v * 256;
        const rad = 44 / Math.max(0.35, Math.sin(v * Math.PI));
        const rot = r() * Math.PI;
        g.beginPath();
        for (let k = 0; k < 5; k++) {
          const a = rot + (k * Math.PI * 2) / 5;
          g.lineTo(cx + Math.cos(a) * rad * 0.55, cy + Math.sin(a) * 44 * 0.55);
        }
        g.closePath();
        g.fill();
      }
      g.strokeStyle = 'rgba(30,30,40,0.35)';
      g.lineWidth = 2;
      for (let i = 0; i < 18; i++) {
        g.beginPath();
        g.moveTo(r() * 512, r() * 256);
        g.lineTo(r() * 512, r() * 256);
        g.stroke();
      }
    }),
  );

const ballGeo = new SphereGeometry(BALL_R, 32, 20);

export const Ball: React.FC<{pos: Vector3; spin: number; axisYaw: number; squash?: number}> = ({pos, spin, axisYaw, squash = 0}) => {
  const mat = useMemo(() => new MeshStandardMaterial({map: ballTexture(), roughness: 0.35}), []);
  // roll about the horizontal axis perpendicular to travel
  return (
    <group position={[pos.x, 0, pos.z]}>
      <group position={[0, pos.y, 0]} rotation={[0, axisYaw, 0]} scale={[1 - squash, 1 + squash * 0.5, 1 + squash * 0.5]}>
        <mesh geometry={ballGeo} material={mat} rotation={[0, 0, -spin]} castShadow />
      </group>
      <Blob x={0} z={0} h={pos.y - BALL_R} sx={0.32} sz={0.32} strength={0.6} />
    </group>
  );
};
