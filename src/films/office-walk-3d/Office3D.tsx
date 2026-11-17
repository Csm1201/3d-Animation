/**
 * Pastel peach & mint toy office. Rendered on its own layer and blurred for a
 * shallow depth-of-field look. Props sit along the back wall; the worker walks
 * along z = 0 from x = 0 to ~5 m, and the 3/4 camera sees the wall behind him.
 */
import React from 'react';
import {
  CatmullRomCurve3,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  TubeGeometry,
  Vector3,
} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {FPS} from '../../core/constants';
import {seededArray} from '../../core/random';
import {
  boardTexture,
  clay,
  clockTexture,
  DEG,
  floorTexture,
  matte,
  PAL,
  plastic,
  screenTexture,
  skyTexture,
} from '../../character3d/common';

const WALL_Z = -2.7;

const rb = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));

const M = {
  wall: matte(PAL.peach, 0.95),
  wainscot: clay(PAL.mint, 0.7),
  rail: plastic(PAL.cream, 0.3),
  floor: new MeshStandardMaterial({map: floorTexture(), roughness: 0.55}),
  ceiling: matte('#fff3ea'),
  deskTop: plastic(PAL.cream, 0.25),
  deskLeg: plastic(PAL.peachDeep, 0.3),
  drawer: plastic(PAL.mint, 0.3),
  handle: plastic('#ffffff', 0.15),
  monitor: plastic('#4a4f66', 0.2),
  key: plastic('#fdfcfa', 0.3),
  mug: plastic(PAL.coral, 0.2),
  chair: plastic(PAL.mintDeep, 0.28),
  chairDark: plastic('#5b6178', 0.3),
  pot: plastic(PAL.peachDeep, 0.25),
  soil: clay('#7a5646'),
  leafA: clay('#7fd3a3', 0.6),
  leafB: clay('#5fbf8a', 0.6),
  frame: plastic(PAL.mint, 0.25),
  board: plastic('#ffffff', 0.18),
  boardFrame: plastic(PAL.lilac, 0.25),
  bars: [plastic(PAL.mintDeep), plastic(PAL.peachDeep), plastic(PAL.sky), plastic(PAL.coral), plastic(PAL.butter)],
  line: plastic(PAL.coral, 0.2),
  clockRim: plastic(PAL.mintDeep, 0.2),
  hand: plastic(PAL.ink, 0.2),
  red: plastic(PAL.coral, 0.2),
  cooler: plastic('#ffffff', 0.22),
  coolerAccent: plastic(PAL.mint, 0.25),
  tapBlue: plastic('#7db8f0', 0.2),
  water: new MeshStandardMaterial({color: '#8ed2f7', roughness: 0.05, transparent: true, opacity: 0.55}),
  bubble: new MeshStandardMaterial({color: '#ffffff', roughness: 0.1, transparent: true, opacity: 0.8}),
  sky: new MeshBasicMaterial({map: skyTexture(), toneMapped: false}),
  boardFace: new MeshBasicMaterial({map: boardTexture(), toneMapped: false}),
  clockFace: new MeshStandardMaterial({map: clockTexture(), roughness: 0.3}),
  screens: [0, 1, 2, 3].map((k) => new MeshBasicMaterial({map: screenTexture(k), toneMapped: false})),
};

const G = {
  floor: new PlaneGeometry(30, 12),
  wall: new PlaneGeometry(30, 3.4),
  wainscot: rb(30, 1.0, 0.06, 0.02),
  rail: rb(30, 0.06, 0.1, 0.025),
  deskTop: rb(1.5, 0.07, 0.75, 0.03),
  leg: new CylinderGeometry(0.03, 0.03, 0.72, 16),
  drawer: rb(0.42, 0.62, 0.62, 0.04),
  drawerFront: rb(0.36, 0.17, 0.02, 0.008),
  handle: rb(0.12, 0.02, 0.02, 0.008),
  monitor: rb(0.62, 0.38, 0.04, 0.025),
  screen: new PlaneGeometry(0.56, 0.32),
  stand: new CylinderGeometry(0.02, 0.025, 0.18, 12),
  standBase: rb(0.2, 0.02, 0.14, 0.008),
  keyboard: rb(0.42, 0.025, 0.14, 0.01),
  mug: new CylinderGeometry(0.045, 0.042, 0.1, 24),
  seat: rb(0.48, 0.08, 0.46, 0.04),
  back: rb(0.46, 0.5, 0.07, 0.06),
  post: new CylinderGeometry(0.025, 0.025, 0.36, 12),
  spoke: rb(0.3, 0.035, 0.05, 0.015),
  caster: new SphereGeometry(0.03, 12, 10),
  pot: new CylinderGeometry(0.22, 0.16, 0.42, 36),
  potRim: new CylinderGeometry(0.235, 0.235, 0.06, 36),
  soil: new CylinderGeometry(0.205, 0.205, 0.02, 36),
  leaf: new SphereGeometry(1, 20, 12),
  windowOuter: rb(1.5, 1.6, 0.08, 0.04),
  windowGlass: new PlaneGeometry(1.36, 1.46),
  mullionV: rb(0.06, 1.46, 0.06, 0.02),
  mullionH: rb(1.36, 0.06, 0.06, 0.02),
  sill: rb(1.7, 0.06, 0.2, 0.025),
  board: rb(1.7, 1.06, 0.05, 0.04),
  boardFace: new PlaneGeometry(1.6, 0.96),
  bar: rb(0.13, 1, 0.08, 0.02),
  tray: rb(1.3, 0.03, 0.08, 0.012),
  marker: rb(0.15, 0.03, 0.03, 0.012),
  clockBody: new CylinderGeometry(0.27, 0.27, 0.06, 48),
  clockFace: new CylinderGeometry(0.24, 0.24, 0.002, 48),
  hourHand: rb(0.03, 0.13, 0.012, 0.006),
  minHand: rb(0.022, 0.19, 0.012, 0.006),
  secHand: rb(0.008, 0.21, 0.01, 0.003),
  pin: new CylinderGeometry(0.022, 0.022, 0.03, 20),
  coolerBody: rb(0.38, 0.95, 0.38, 0.06),
  coolerPanel: rb(0.28, 0.24, 0.02, 0.02),
  tap: new CylinderGeometry(0.02, 0.02, 0.06, 12),
  tray2: rb(0.26, 0.03, 0.1, 0.012),
  bottle: new CylinderGeometry(0.16, 0.16, 0.42, 36),
  bottleTop: new SphereGeometry(0.16, 36, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  neck: new CylinderGeometry(0.05, 0.05, 0.08, 20),
  bubble: new SphereGeometry(1, 12, 8),
  baseboard: rb(30, 0.12, 0.04, 0.015),
};

const Room: React.FC<{camX: number}> = ({camX}) => (
  <group position={[camX, 0, 0]}>
    <mesh geometry={G.floor} material={M.floor} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 2.5]} receiveShadow />
    <mesh geometry={G.wall} material={M.wall} position={[0, 1.7, WALL_Z]} receiveShadow />
    <mesh geometry={G.wainscot} material={M.wainscot} position={[0, 0.5, WALL_Z + 0.03]} receiveShadow />
    <mesh geometry={G.rail} material={M.rail} position={[0, 1.02, WALL_Z + 0.05]} receiveShadow />
    <mesh geometry={G.baseboard} material={M.rail} position={[0, 0.06, WALL_Z + 0.07]} />
    <mesh geometry={G.floor} material={M.ceiling} rotation={[Math.PI / 2, 0, 0]} position={[0, 3.4, 2.5]} />
  </group>
);

// The room shell is infinite along x; snap it to the camera in whole floor-tile steps so the
// tile pattern stays fixed to the world (2 m texture period: 30 m / 15 repeats).
const snap = (x: number) => Math.round(x / 2) * 2;

const Desk: React.FC<{x: number; z: number; variant: number; frame: number}> = ({x, z, variant, frame}) => {
  const cursor = Math.floor(frame / 30) % 2 === 0;
  return (
    <group position={[x, 0, z]}>
      <mesh geometry={G.deskTop} material={M.deskTop} position={[0, 0.74, 0]} castShadow receiveShadow />
      {[-0.68, 0.68].map((lx) =>
        [-0.3, 0.3].map((lz) => <mesh key={`${lx}${lz}`} geometry={G.leg} material={M.deskLeg} position={[lx, 0.36, lz]} castShadow />),
      )}
      <group position={[0.45, 0.33, 0]}>
        <mesh geometry={G.drawer} material={M.drawer} castShadow receiveShadow />
        {[0.2, 0, -0.2].map((dy) => (
          <group key={dy} position={[0, dy, 0.315]}>
            <mesh geometry={G.drawerFront} material={M.drawer} />
            <mesh geometry={G.handle} material={M.handle} position={[0, 0.03, 0.015]} />
          </group>
        ))}
      </group>
      {[
        [-0.36, variant],
        [0.33, variant + 1],
      ].map(([mx, k]) => (
        <group key={mx} position={[mx, 0.78, -0.12]} rotation={[0, (mx < 0 ? 8 : -8) * DEG, 0]}>
          <mesh geometry={G.standBase} material={M.monitor} position={[0, 0.0, 0]} castShadow />
          <mesh geometry={G.stand} material={M.monitor} position={[0, 0.09, -0.01]} />
          <mesh geometry={G.monitor} material={M.monitor} position={[0, 0.36, 0]} castShadow />
          <mesh geometry={G.screen} material={M.screens[k % 4]} position={[0, 0.36, 0.021]} />
          {k % 2 === 0 && cursor ? (
            <mesh geometry={G.marker} material={M.handle} position={[-0.12, 0.23, 0.024]} scale={[0.1, 0.5, 0.1]} />
          ) : null}
        </group>
      ))}
      <mesh geometry={G.keyboard} material={M.key} position={[0, 0.79, 0.16]} castShadow />
      <mesh geometry={G.mug} material={M.mug} position={[variant ? -0.6 : 0.62, 0.825, 0.12]} castShadow />
      {/* chair tucked in, facing the desk */}
      <group position={[-0.1, 0, 0.62]} rotation={[0, (variant ? 12 : -10) * DEG, 0]}>
        <mesh geometry={G.seat} material={M.chair} position={[0, 0.48, 0]} castShadow />
        <mesh geometry={G.back} material={M.chair} position={[0, 0.82, 0.22]} rotation={[-8 * DEG, 0, 0]} castShadow />
        <mesh geometry={G.post} material={M.chairDark} position={[0, 0.27, 0]} />
        {[0, 72, 144, 216, 288].map((a) => (
          <group key={a} rotation={[0, a * DEG, 0]}>
            <mesh geometry={G.spoke} material={M.chairDark} position={[0.15, 0.07, 0]} />
            <mesh geometry={G.caster} material={M.chairDark} position={[0.28, 0.03, 0]} />
          </group>
        ))}
      </group>
    </group>
  );
};

const LEAVES = seededArray(5150, 18, (r, i) => ({
  yaw: (i / 18) * 360 + r() * 15,
  tilt: 18 + r() * 42,
  len: 0.32 + r() * 0.22,
  w: 0.07 + r() * 0.03,
  ph: r() * Math.PI * 2,
  b: r() > 0.5,
}));

const Plant: React.FC<{x: number; z: number; frame: number; scale?: number}> = ({x, z, frame, scale = 1}) => (
  <group position={[x, 0, z]} scale={scale}>
    <mesh geometry={G.pot} material={M.pot} position={[0, 0.21, 0]} castShadow receiveShadow />
    <mesh geometry={G.potRim} material={M.pot} position={[0, 0.42, 0]} castShadow />
    <mesh geometry={G.soil} material={M.soil} position={[0, 0.44, 0]} />
    {LEAVES.map((l, i) => {
      const sway = 2.5 * Math.sin(frame * 0.05 + l.ph);
      return (
        <group key={i} position={[0, 0.44, 0]} rotation={[0, l.yaw * DEG, (l.tilt + sway) * DEG]}>
          <mesh geometry={G.leaf} material={l.b ? M.leafA : M.leafB} position={[0, l.len, 0]} scale={[l.w, l.len, 0.018]} castShadow />
        </group>
      );
    })}
  </group>
);

const Window: React.FC<{x: number}> = ({x}) => (
  <group position={[x, 1.75, WALL_Z + 0.05]}>
    <mesh geometry={G.windowOuter} material={M.frame} castShadow />
    <mesh geometry={G.windowGlass} material={M.sky} position={[0, 0, 0.041]} />
    <mesh geometry={G.mullionV} material={M.frame} position={[0, 0, 0.07]} />
    <mesh geometry={G.mullionH} material={M.frame} position={[0, 0.1, 0.07]} />
    <mesh geometry={G.sill} material={M.rail} position={[0, -0.82, 0.08]} castShadow />
  </group>
);

const Whiteboard: React.FC<{x: number}> = ({x}) => {
  const bars = [0.18, 0.27, 0.24, 0.36, 0.45, 0.55];
  const pts = bars.map((h, i) => new Vector3(-0.56 + i * 0.2, -0.36 + h + 0.12, 0.09));
  const tube = new TubeGeometry(new CatmullRomCurve3(pts), 64, 0.014, 10, false);
  return (
    <group position={[x, 1.75, WALL_Z + 0.04]}>
      <mesh geometry={G.board} material={M.boardFrame} castShadow />
      <mesh geometry={G.boardFace} material={M.boardFace} position={[0, 0, 0.026]} />
      {bars.map((h, i) => (
        <mesh key={i} geometry={G.bar} material={M.bars[i % 5]} position={[-0.56 + i * 0.2, -0.36 + h / 2, 0.06]} scale={[1, h, 1]} castShadow />
      ))}
      <mesh geometry={tube} material={M.line} castShadow />
      <mesh geometry={G.tray} material={M.boardFrame} position={[0, -0.56, 0.06]} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} geometry={G.marker} material={M.bars[i]} position={[-0.3 + i * 0.25, -0.53, 0.07]} />
      ))}
    </group>
  );
};

const Clock: React.FC<{x: number; frame: number}> = ({x, frame}) => {
  const t = 10 * 3600 + 8 * 60 + 20 + frame / FPS;
  const fr = (frame % FPS) / FPS;
  const tick = fr < 0.15 ? Math.sin((fr / 0.15) * Math.PI) * 0.15 + fr / 0.15 : 1;
  const sec = (20 + Math.floor(frame / FPS) - 1 + tick) * 6;
  const min = ((t / 60) % 60) * 6;
  const hr = ((t / 3600) % 12) * 30;
  const hand = (deg: number, geo: RoundedBoxGeometry, len: number, mat: typeof M.hand, dz: number) => (
    <group rotation={[0, 0, -deg * DEG]} position={[0, 0, dz]}>
      <mesh geometry={geo} material={mat} position={[0, len / 2 - 0.02, 0]} castShadow />
    </group>
  );
  return (
    <group position={[x, 2.55, WALL_Z + 0.06]}>
      <mesh geometry={G.clockBody} material={M.clockRim} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={G.clockFace} material={M.clockFace} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.031]} />
      {hand(hr, G.hourHand, 0.13, M.hand, 0.04)}
      {hand(min, G.minHand, 0.19, M.hand, 0.05)}
      {hand(sec, G.secHand, 0.21, M.red, 0.06)}
      <mesh geometry={G.pin} material={M.red} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.065]} />
    </group>
  );
};

const BUBBLES = seededArray(4242, 6, (r) => ({x: (r() - 0.5) * 0.18, z: (r() - 0.5) * 0.1, r: 0.012 + r() * 0.012, sp: 0.004 + r() * 0.004, off: r()}));

const WaterCooler: React.FC<{x: number; z: number; frame: number}> = ({x, z, frame}) => (
  <group position={[x, 0, z]}>
    <mesh geometry={G.coolerBody} material={M.cooler} position={[0, 0.475, 0]} castShadow receiveShadow />
    <mesh geometry={G.coolerPanel} material={M.coolerAccent} position={[0, 0.72, 0.19]} />
    <mesh geometry={G.tap} material={M.tapBlue} position={[-0.07, 0.72, 0.22]} rotation={[Math.PI / 2, 0, 0]} />
    <mesh geometry={G.tap} material={M.red} position={[0.07, 0.72, 0.22]} rotation={[Math.PI / 2, 0, 0]} />
    <mesh geometry={G.tray2} material={M.coolerAccent} position={[0, 0.52, 0.2]} />
    <mesh geometry={G.neck} material={M.water} position={[0, 0.99, 0]} />
    <mesh geometry={G.bottle} material={M.water} position={[0, 1.24, 0]} castShadow />
    <mesh geometry={G.bottleTop} material={M.water} position={[0, 1.45, 0]} />
    {BUBBLES.map((b, i) => {
      const y = 1.05 + (((frame * b.sp + b.off) % 0.5) + 0.5) % 0.5;
      return <mesh key={i} geometry={G.bubble} material={M.bubble} position={[b.x, y, b.z]} scale={b.r} />;
    })}
  </group>
);

export const Office3D: React.FC<{frame: number; camX: number}> = ({frame, camX}) => (
  <group>
    <Room camX={snap(camX)} />
    <Window x={-1.3} />
    <Whiteboard x={1.15} />
    <Clock x={2.75} frame={frame} />
    <Window x={4.3} />
    <Desk x={-2.2} z={-1.75} variant={0} frame={frame} />
    <Plant x={-0.55} z={-1.55} frame={frame} />
    <Desk x={1.05} z={-1.8} variant={2} frame={frame} />
    <WaterCooler x={2.55} z={-1.9} frame={frame} />
    <Desk x={3.95} z={-1.75} variant={1} frame={frame} />
    <Plant x={5.35} z={-1.6} frame={frame} scale={1.15} />
  </group>
);

