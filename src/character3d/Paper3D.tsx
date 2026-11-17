/**
 * Paper stack on the forearm + the sheet that slips off at 2.7 s, in 3D.
 *
 * The slip is computed in the walk's side plane (px) exactly like the 2D version:
 * slide back along the stack, tip over the back edge, then free flight starting
 * from the exact position/velocity at release (air drag, slow fall, flutter).
 * In 3D the sheet also really rolls about its long axis and drifts toward camera.
 */
import React, {useMemo} from 'react';
import {BoxGeometry, Euler, Material, MeshStandardMaterial} from 'three';
import {SLIP_START_FRAME} from '../core/constants';
import {seededArray} from '../core/random';
import {getPose, Pose, rot, Vec} from '../core/walkCycle';
import {DEG, m, paperTexture, to3} from './common';

export const ARM_Z = 0.27; // near (left) arm plane, towards the camera
const SHEETS = 14;
const T = 2.8; // sheet thickness, px (toy-thick so it reads)
const LEN = 150; // A4 length along the forearm, px (~0.30 m)
const WIDTH_M = 0.21; // A4 width, across the arm (z)
const BACK_X = -14; // stack back edge, forearm-local px
const ARM_TOP = -23; // top of the forearm, local px (y down)
const SLIP_FRAMES = 22;
export const RELEASE_FRAME = SLIP_START_FRAME + SLIP_FRAMES;
const WOBBLE_PIVOT = {x: 138, y: ARM_TOP};

const JIT = seededArray(20240527, SHEETS, (r) => ({dx: (r() - 0.5) * 8, yaw: (r() - 0.5) * 5, dz: (r() - 0.5) * 0.012}));
const TOP = JIT[SHEETS - 1];
const topY = ARM_TOP - SHEETS * T;
const pivot = {x: BACK_X, y: topY + T};

export const forearmRot = (pose: Pose) => {
  const a = pose.nearArm.foreDeg * DEG;
  return (Math.atan2(Math.cos(a), Math.sin(a)) * 180) / Math.PI; // SVG-style rotation of forearm axis
};

const slip = (frame: number) => {
  const t = Math.min(1, Math.max(0, (frame - SLIP_START_FRAME) / SLIP_FRAMES));
  const slide = -112 * t * t;
  const tip = Math.min(44, Math.max(0, -slide - 34) * 0.6); // degrees the back end droops
  return {slide, tip};
};

/** Side-plane (px) centre and angle of the slipping sheet while touching the stack. */
const attached = (frame: number) => {
  const pose = getPose(frame);
  const {slide, tip} = slip(frame);
  const cLocal = {x: BACK_X + TOP.dx + slide + LEN / 2, y: topY + T / 2};
  const r = rot({x: cLocal.x - pivot.x, y: cLocal.y - pivot.y}, -tip);
  const local = {x: pivot.x + r.x, y: pivot.y + r.y};
  const w = rot({x: local.x - WOBBLE_PIVOT.x, y: local.y - WOBBLE_PIVOT.y}, pose.paperWobble);
  const s = rot({x: w.x + WOBBLE_PIVOT.x, y: w.y + WOBBLE_PIVOT.y}, forearmRot(pose));
  const e = pose.nearArm.elbow;
  return {c: {x: e.x + s.x, y: e.y + s.y} as Vec, angle: forearmRot(pose) + pose.paperWobble - tip};
};

export const flight = (frame: number) => {
  const a = attached(RELEASE_FRAME);
  const b = attached(RELEASE_FRAME - 1);
  const vx0 = a.c.x - b.c.x;
  const vy0 = a.c.y - b.c.y - 2.2; // a puff of air lifts it
  const tau = frame - RELEASE_FRAME;
  const kx = 24;
  const ky = 18;
  const vFall = 1.6;
  const w = 0.11;
  const ramp = 1 - Math.exp(-tau / 16);
  const x = a.c.x + vx0 * kx * (1 - Math.exp(-tau / kx)) - 30 * Math.sin(w * tau) * ramp;
  const y = a.c.y + vFall * tau + (vy0 - vFall) * ky * (1 - Math.exp(-tau / ky)) - 12 * Math.sin(w * tau) ** 2 * ramp;
  const pitch = a.angle * Math.exp(-tau / 14) - 24 * Math.cos(w * tau) * ramp;
  const roll = 0.9 * (1 - Math.exp(-tau / 20)) + 0.55 * Math.sin(0.085 * tau) * ramp;
  const yaw = TOP.yaw * DEG + 0.5 * Math.sin(0.05 * tau) * ramp;
  const z = ARM_Z + 0.35 * (1 - Math.exp(-tau / 40));
  return {c: {x, y}, z, pitch, roll, yaw};
};

// ---------------------------------------------------------------- rendering
const usePaperMats = () =>
  useMemo(() => {
    const edge = new MeshStandardMaterial({color: '#f4efe8', roughness: 0.7});
    const face = new MeshStandardMaterial({color: '#ffffff', roughness: 0.55, map: paperTexture()});
    // BoxGeometry groups: +x, -x, +y, -y, +z, -z
    return {stack: [edge, edge, face, edge, edge, edge] as Material[], loose: [edge, edge, face, face, edge, edge] as Material[]};
  }, []);

const sheetGeo = new BoxGeometry(m(LEN), m(T) * 0.9, WIDTH_M);

export const PaperStack3D: React.FC<{pose: Pose; frame: number}> = ({pose, frame}) => {
  const mats = usePaperMats();
  const e = to3(pose.nearArm.elbow, ARM_Z);
  const slipping = frame >= SLIP_START_FRAME;
  const count = slipping ? SHEETS - 1 : SHEETS;
  const {slide, tip} = slip(frame);
  const P = {x: m(WOBBLE_PIVOT.x), y: -m(WOBBLE_PIVOT.y)};
  const sheetPos = (j: (typeof JIT)[number], i: number) =>
    [m(BACK_X + j.dx + LEN / 2), -m(ARM_TOP - (i + 0.5) * T), j.dz] as const;
  return (
    <group position={e} rotation={[0, 0, -forearmRot(pose) * DEG]}>
      <group position={[P.x, P.y, 0]} rotation={[0, 0, -pose.paperWobble * DEG]}>
        <group position={[-P.x, -P.y, 0]}>
          {JIT.slice(0, count).map((j, i) => (
            <mesh key={i} geometry={sheetGeo} material={mats.stack} position={sheetPos(j, i)} rotation={[0, j.yaw * DEG, 0]} castShadow receiveShadow />
          ))}
          {slipping && frame < RELEASE_FRAME ? (
            <group position={[m(pivot.x), -m(pivot.y), 0]} rotation={[0, 0, tip * DEG]}>
              <mesh
                geometry={sheetGeo}
                material={mats.stack}
                position={[m(BACK_X + TOP.dx + slide + LEN / 2 - pivot.x), -m(topY + T / 2 - pivot.y), TOP.dz]}
                rotation={[0, TOP.yaw * DEG, 0]}
                castShadow
              />
            </group>
          ) : null}
        </group>
      </group>
    </group>
  );
};

export const FallingSheet3D: React.FC<{frame: number}> = ({frame}) => {
  const mats = usePaperMats();
  if (frame < RELEASE_FRAME) return null;
  const f = flight(frame);
  const p = to3(f.c, f.z);
  return (
    <mesh
      geometry={sheetGeo}
      material={mats.loose}
      position={p}
      rotation={new Euler(f.roll, f.yaw, -f.pitch * DEG, 'ZYX')}
      castShadow
    />
  );
};
