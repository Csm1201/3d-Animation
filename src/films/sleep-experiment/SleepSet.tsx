/**
 * "Sleep experiment" sets, along +x (the walk direction), walls at z = ±WALL_Z.
 *  - diorama:  short cut-away cell with low walls and no ceiling, for the bird's-eye camera.
 *  - corridor: a long, tall lab corridor with ceiling lights and a glowing window at the
 *              far end, for the low chase camera that looks down its length.
 */
import React from 'react';
import {
  CylinderGeometry,
  MeshBasicMaterial,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {seeded, seededArray} from '../../core/random';
import {canvasTex, clay, DEG, matte, once, PAL, plastic, skyTexture} from '../../character3d/common';

export const WALL_Z = 1.15;
const WALL_H = 1.25;
const X0 = -2.6; // back wall
const X1 = 9; // far end
const LEN = X1 - X0;

const rb = (w: number, h: number, d: number, r = 0.03) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2));

// ---------------------------------------------------------------- textures
const tileTex = () =>
  once('labTiles', () => {
    const t = canvasTex(256, 256, (g) => {
      g.fillStyle = '#cdebdd';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#bfe4d3';
      g.fillRect(0, 0, 128, 128);
      g.fillRect(128, 128, 128, 128);
      g.strokeStyle = '#a3d3bf';
      g.lineWidth = 5;
      g.strokeRect(0, 0, 256, 256);
      g.beginPath();
      g.moveTo(128, 0);
      g.lineTo(128, 256);
      g.moveTo(0, 128);
      g.lineTo(256, 128);
      g.stroke();
    });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(LEN / 1.0, (WALL_Z * 2) / 1.0);
    return t;
  });

const label = (key: string, w: number, h: number, bg: string, fg: string, lines: string[], sizes: number[]) =>
  once(key, () =>
    canvasTex(w, h, (g) => {
      g.fillStyle = bg;
      g.beginPath();
      g.roundRect(0, 0, w, h, h * 0.18);
      g.fill();
      g.fillStyle = fg;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const total = sizes.reduce((a, b) => a + b * 1.15, 0);
      let y = h / 2 - total / 2;
      lines.forEach((l, i) => {
        g.font = `900 ${sizes[i]}px "Inter Display", Inter, sans-serif`;
        y += sizes[i] * 0.575;
        g.fillText(l, w / 2, y);
        y += sizes[i] * 0.575;
      });
    }),
  );

const signTex = () => label('signLab', 512, 200, PAL.coral, '#ffffff', ['SLEEP LAB', 'DO NOT DOZE'], [84, 34]);
const coffeeTex = () => label('coffeeLbl', 256, 160, '#5a3524', PAL.butter, ['COFFEE', '∞ LITRES'], [58, 28]);
const screenTex = () => label('labScreen', 512, 320, '#2d3350', PAL.mint, ['AWAKE', 'STATUS: OK?'], [120, 44]);

// ---------------------------------------------------------------- materials & geometry
const M = {
  floor: new MeshStandardMaterial({map: tileTex(), roughness: 0.45}),
  wall: clay(PAL.lilac, 0.75),
  wallTop: plastic('#ffffff', 0.3),
  trim: plastic(PAL.mintDeep, 0.3),
  cot: plastic('#9aa3b8', 0.3),
  sheet: clay('#ffffff', 0.7),
  blanket: clay(PAL.sky, 0.75),
  pillow: clay('#fff8f0', 0.65),
  tank: plastic('#e9eef7', 0.18),
  tankBand: plastic(PAL.coral, 0.25),
  pipe: plastic('#b9c2d4', 0.25),
  dial: plastic('#ffffff', 0.1),
  needle: plastic(PAL.coral, 0.2),
  desk: plastic(PAL.cream, 0.25),
  leg: plastic(PAL.peachDeep, 0.3),
  monitor: plastic('#4a4f66', 0.2),
  mug: plastic('#ffffff', 0.15),
  mugAlt: plastic(PAL.peach, 0.18),
  coffee: plastic('#5a3524', 0.1),
  can: plastic(PAL.mintDeep, 0.15),
  canAlt: plastic(PAL.butter, 0.15),
  canRed: plastic(PAL.coral, 0.15),
  canTop: plastic('#dfe5ee', 0.1),
  glass: new MeshStandardMaterial({color: '#2b3150', roughness: 0.05, metalness: 0.2}),
  silhouette: matte('#454c70'),
  frame: plastic(PAL.mintDeep, 0.25),
  camBody: plastic('#f4f6fa', 0.2),
  lens: plastic('#22252f', 0.05),
  led: new MeshBasicMaterial({color: '#ff3b3b', toneMapped: false}),
  ledOff: plastic('#7a2a2a', 0.3),
  steam: new MeshStandardMaterial({color: '#ffffff', roughness: 1, transparent: true, opacity: 0.45}),
  clockRim: plastic(PAL.coral, 0.2),
  clockFace: plastic('#fffaf4', 0.3),
  hand: plastic(PAL.ink, 0.2),
  sign: new MeshBasicMaterial({map: signTex(), toneMapped: false}),
  coffeeLbl: new MeshBasicMaterial({map: coffeeTex(), toneMapped: false}),
  screen: new MeshBasicMaterial({map: screenTex(), toneMapped: false}),
};

const G = {
  floor: new PlaneGeometry(LEN, WALL_Z * 2),
  sideWall: rb(LEN + 0.24, WALL_H, 0.12, 0.04),
  endWall: rb(0.12, WALL_H, WALL_Z * 2 + 0.24, 0.04),
  wallCap: rb(LEN + 0.28, 0.05, 0.16, 0.02),
  endCap: rb(0.16, 0.05, WALL_Z * 2 + 0.28, 0.02),
  skirting: rb(LEN, 0.08, 0.02, 0.01),
  cotFrame: rb(1.95, 0.08, 0.66, 0.03),
  cotLeg: new CylinderGeometry(0.025, 0.025, 0.3, 12),
  mattress: rb(1.9, 0.12, 0.62, 0.05),
  blanket: rb(0.9, 0.05, 0.64, 0.025),
  pillow: rb(0.4, 0.1, 0.5, 0.05),
  tank: new CylinderGeometry(0.28, 0.28, 1.0, 40),
  tankCap: new SphereGeometry(0.28, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2),
  band: new CylinderGeometry(0.285, 0.285, 0.08, 40, 1, true),
  pipe: new TorusGeometry(0.35, 0.03, 12, 32, Math.PI / 2),
  dial: new CylinderGeometry(0.09, 0.09, 0.03, 32),
  needle: rb(0.012, 0.08, 0.008, 0.004),
  label: new PlaneGeometry(0.42, 0.26),
  deskTop: rb(1.3, 0.06, 0.56, 0.03),
  deskLeg: new CylinderGeometry(0.025, 0.025, 0.72, 12),
  monitor: rb(0.5, 0.32, 0.04, 0.02),
  screen: new PlaneGeometry(0.45, 0.28),
  mug: new CylinderGeometry(0.045, 0.042, 0.1, 24),
  coffee: new CylinderGeometry(0.04, 0.04, 0.004, 24),
  can: new CylinderGeometry(0.033, 0.033, 0.12, 20),
  canTop: new CylinderGeometry(0.031, 0.031, 0.006, 20),
  window: rb(1.3, 0.62, 0.05, 0.04),
  glass: new PlaneGeometry(1.18, 0.5),
  head: new SphereGeometry(0.11, 24, 16),
  shoulders: new SphereGeometry(0.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
  camBody: rb(0.22, 0.12, 0.12, 0.03),
  lens: new CylinderGeometry(0.035, 0.04, 0.05, 20),
  led: new SphereGeometry(0.014, 12, 8),
  arm: new CylinderGeometry(0.015, 0.015, 0.16, 10),
  puff: new SphereGeometry(1, 16, 12),
  clock: new CylinderGeometry(0.2, 0.2, 0.05, 40),
  clockFace: new CylinderGeometry(0.175, 0.175, 0.002, 40),
  hourHand: rb(0.025, 0.1, 0.01, 0.005),
  minHand: rb(0.018, 0.15, 0.01, 0.005),
  sign: new PlaneGeometry(0.9, 0.35),
};

const Room: React.FC = () => {
  const cx = (X0 + X1) / 2;
  return (
    <group>
      <mesh geometry={G.floor} material={M.floor} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, 0]} receiveShadow />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={G.sideWall} material={M.wall} position={[cx, WALL_H / 2, s * (WALL_Z + 0.06)]} castShadow receiveShadow />
          <mesh geometry={G.wallCap} material={M.wallTop} position={[cx, WALL_H + 0.02, s * (WALL_Z + 0.06)]} />
          <mesh geometry={G.skirting} material={M.trim} position={[cx, 0.04, s * (WALL_Z - 0.005)]} />
        </group>
      ))}
      <mesh geometry={G.endWall} material={M.wall} position={[X0 - 0.06, WALL_H / 2, 0]} castShadow receiveShadow />
      <mesh geometry={G.endCap} material={M.wallTop} position={[X0 - 0.06, WALL_H + 0.02, 0]} />
      <mesh geometry={G.sign} material={M.sign} position={[X0 + 0.005, 0.85, 0]} rotation={[0, Math.PI / 2, 0]} />
    </group>
  );
};

/** The untouched bed: the whole point is he never uses it. */
const Cot: React.FC<{x: number}> = ({x}) => (
  <group position={[x, 0, -WALL_Z + 0.36]}>
    <mesh geometry={G.cotFrame} material={M.cot} position={[0, 0.3, 0]} castShadow receiveShadow />
    {[-0.9, 0.9].map((lx) => [-0.28, 0.28].map((lz) => <mesh key={`${lx}${lz}`} geometry={G.cotLeg} material={M.cot} position={[lx, 0.15, lz]} />))}
    <mesh geometry={G.mattress} material={M.sheet} position={[0, 0.4, 0]} castShadow receiveShadow />
    <mesh geometry={G.blanket} material={M.blanket} position={[0.42, 0.48, 0]} castShadow />
    <mesh geometry={G.pillow} material={M.pillow} position={[-0.7, 0.5, 0]} castShadow />
  </group>
);

/** Toy version of the gas tank: an endless coffee supply that puffs steam. */
const CoffeeTank: React.FC<{x: number; frame: number}> = ({x, frame}) => (
  <group position={[x, 0, WALL_Z - 0.32]}>
    <mesh geometry={G.tank} material={M.tank} position={[0, 0.5, 0]} castShadow receiveShadow />
    <mesh geometry={G.tankCap} material={M.tank} position={[0, 1.0, 0]} castShadow />
    {[0.25, 0.75].map((y) => (
      <mesh key={y} geometry={G.band} material={M.tankBand} position={[0, y, 0]} />
    ))}
    <mesh geometry={G.label} material={M.coffeeLbl} position={[0, 0.5, -0.282]} rotation={[0, Math.PI, 0]} />
    <group position={[0, 0.82, -0.27]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh geometry={G.dial} material={M.dial} />
    </group>
    <mesh geometry={G.needle} material={M.needle} position={[0, 0.83, -0.29]} rotation={[0, 0, (-40 + 80 * ((frame * 0.013) % 1)) * DEG]} />
    <mesh geometry={G.pipe} material={M.pipe} position={[0.0, 1.05, -0.35]} rotation={[0, Math.PI / 2, 0]} />
    {/* steam puffs rise from the cap, looping deterministically */}
    {[0, 1, 2, 3].map((i) => {
      const t = ((frame + i * 22) % 88) / 88;
      const r = 0.05 + t * 0.12;
      return (
        <mesh
          key={i}
          geometry={G.puff}
          material={M.steam}
          position={[Math.sin(i * 2.1 + t * 3) * 0.06, 1.25 + t * 0.7, Math.cos(i * 1.7) * 0.05]}
          scale={r}
        />
      );
    })}
  </group>
);

const MUGS = seededArray(310, 9, (r, i) => ({
  dx: (r() - 0.5) * 0.9,
  dz: (r() - 0.5) * 0.3,
  tip: r() > 0.75,
  rot: r() * 360,
  alt: i % 3 === 0,
}));

const Desk: React.FC<{x: number}> = ({x}) => (
  <group position={[x, 0, WALL_Z - 0.33]}>
    <mesh geometry={G.deskTop} material={M.desk} position={[0, 0.74, 0]} castShadow receiveShadow />
    {[-0.6, 0.6].map((lx) => [-0.22, 0.22].map((lz) => <mesh key={`${lx}${lz}`} geometry={G.deskLeg} material={M.leg} position={[lx, 0.36, lz]} />))}
    <group position={[0.25, 0.77, 0.12]} rotation={[0, Math.PI + 0.25, 0]}>
      <mesh geometry={G.monitor} material={M.monitor} position={[0, 0.2, 0]} castShadow />
      <mesh geometry={G.screen} material={M.screen} position={[0, 0.2, 0.021]} />
    </group>
    {MUGS.map((m, i) => (
      <group key={i} position={[m.dx, m.tip ? 0.81 : 0.82, m.dz]} rotation={m.tip ? [0, m.rot * DEG, Math.PI / 2] : [0, m.rot * DEG, 0]}>
        <mesh geometry={G.mug} material={m.alt ? M.mugAlt : M.mug} castShadow />
        {!m.tip ? <mesh geometry={G.coffee} material={M.coffee} position={[0, 0.045, 0]} /> : null}
      </group>
    ))}
  </group>
);

const FLOOR_JUNK = seededArray(911, 16, (r, i) => ({
  x: 0.4 + r() * 7.6,
  z: (r() > 0.5 ? 1 : -1) * (0.5 + r() * 0.45),
  rot: r() * 360,
  lying: r() > 0.4,
  can: i % 2 === 0,
}));

const FloorJunk: React.FC = () => (
  <group>
    {FLOOR_JUNK.map((j, i) => (
      <group key={i} position={[j.x, j.lying ? 0.034 : 0.06, j.z]} rotation={j.lying ? [Math.PI / 2, 0, j.rot * DEG] : [0, j.rot * DEG, 0]}>
        {j.can ? (
          <>
            <mesh geometry={G.can} material={[M.can, M.canAlt, M.canRed][i % 3]} castShadow />
            <mesh geometry={G.canTop} material={M.canTop} position={[0, 0.06, 0]} />
          </>
        ) : (
          <mesh geometry={G.mug} material={i % 4 === 1 ? M.mugAlt : M.mug} castShadow />
        )}
      </group>
    ))}
  </group>
);

/** One-way observation window with two tiny scientists watching. */
const ObservationWindow: React.FC<{x: number; frame: number; y?: number}> = ({x, frame, y = 0.78}) => {
  const lean = Math.sin(frame * 0.03) * 0.02;
  return (
    <group position={[x, y, -WALL_Z + 0.01]}>
      <mesh geometry={G.window} material={M.frame} castShadow />
      <mesh geometry={G.glass} material={M.glass} position={[0, 0, 0.027]} />
      {[-0.25, 0.22].map((hx, i) => (
        <group key={hx} position={[hx + (i ? lean : -lean), -0.2, 0.02]}>
          <mesh geometry={G.shoulders} material={M.silhouette} scale={[1, 0.6, 0.1]} />
          <mesh geometry={G.head} material={M.silhouette} position={[0, 0.2, 0]} scale={[1, 1, 0.12]} />
        </group>
      ))}
    </group>
  );
};

const SecurityCam: React.FC<{x: number; frame: number; top?: number}> = ({x, frame, top = WALL_H}) => {
  const on = Math.floor(frame / 30) % 2 === 0;
  const pan = Math.sin(frame * 0.02) * 25;
  return (
    <group position={[x, top - 0.08, WALL_Z - 0.05]}>
      <mesh geometry={G.arm} material={M.camBody} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]} />
      <group position={[0, 0, -0.16]} rotation={[0.35, (180 + pan) * DEG, 0]}>
        <mesh geometry={G.camBody} material={M.camBody} castShadow />
        <mesh geometry={G.lens} material={M.lens} position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={G.led} material={on ? M.led : M.ledOff} position={[0.06, 0.065, 0.03]} />
      </group>
    </group>
  );
};

/** Wall clock on fast-forward: the minute hand spins to show hours flying by. */
const FastClock: React.FC<{x: number; frame: number; y?: number}> = ({x, frame, y = 1.0}) => {
  const hours = (frame / 299) * 72;
  return (
    <group position={[x, y, -WALL_Z + 0.03]}>
      <mesh geometry={G.clock} material={M.clockRim} rotation={[Math.PI / 2, 0, 0]} castShadow />
      <mesh geometry={G.clockFace} material={M.clockFace} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.026]} />
      <group rotation={[0, 0, -hours * 30 * DEG]} position={[0, 0, 0.032]}>
        <mesh geometry={G.hourHand} material={M.hand} position={[0, 0.045, 0]} />
      </group>
      <group rotation={[0, 0, -hours * 360 * DEG]} position={[0, 0, 0.04]}>
        <mesh geometry={G.minHand} material={M.hand} position={[0, 0.07, 0]} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- corridor variant
const C_X0 = -9;
const C_X1 = 30;
const C_H = 2.7;
const C_LEN = C_X1 - C_X0;
const MODULES = [0, 8, 16];

const exitTex = () => label('exitSign', 256, 110, '#2fa86f', '#ffffff', ['EXIT'], [72]);

let corridorKit: ReturnType<typeof makeCorridorKit> | null = null;
function makeCorridorKit() {
  const floorTex = tileTex().clone();
  floorTex.repeat.set(C_LEN, WALL_Z * 2);
  floorTex.needsUpdate = true;
  return {
    floorMat: new MeshStandardMaterial({map: floorTex, roughness: 0.4}),
    floor: new PlaneGeometry(C_LEN, WALL_Z * 2),
    ceiling: new PlaneGeometry(C_LEN, WALL_Z * 2 + 0.3),
    ceilingMat: matte('#f2eefb', 0.95),
    wall: rb(C_LEN, C_H, 0.12, 0.03),
    skirting: rb(C_LEN, 0.08, 0.02, 0.01),
    rail: rb(C_LEN, 0.05, 0.05, 0.02),
    panel: rb(1.1, 0.03, 0.42, 0.012),
    panelMat: new MeshBasicMaterial({color: '#fffdf4', toneMapped: false}),
    endWall: rb(0.12, C_H, WALL_Z * 2 + 0.24, 0.03),
    endWindow: new PlaneGeometry(1.7, 2.0),
    endFrame: rb(0.08, 2.16, 1.86, 0.03),
    skyMat: new MeshBasicMaterial({map: skyTexture(), toneMapped: false}),
    exit: new PlaneGeometry(0.6, 0.26),
    exitMat: new MeshBasicMaterial({map: exitTex(), toneMapped: false}),
  };
}

const CORRIDOR_JUNK = seededArray(4711, 36, (r, i) => ({
  x: -3 + r() * 27,
  z: (r() > 0.5 ? 1 : -1) * (0.45 + r() * 0.5),
  rot: r() * 360,
  lying: r() > 0.4,
  can: i % 2 === 0,
}));

const Corridor: React.FC<{frame: number}> = ({frame}) => {
  const K = (corridorKit ??= makeCorridorKit());
  const cx = (C_X0 + C_X1) / 2;
  return (
    <group>
      <mesh geometry={K.floor} material={K.floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, 0]} receiveShadow />
      <mesh geometry={K.ceiling} material={K.ceilingMat} rotation={[Math.PI / 2, 0, 0]} position={[cx, C_H, 0]} />
      {[-1, 1].map((sd) => (
        <group key={sd}>
          <mesh geometry={K.wall} material={M.wall} position={[cx, C_H / 2, sd * (WALL_Z + 0.06)]} receiveShadow />
          <mesh geometry={K.skirting} material={M.trim} position={[cx, 0.04, sd * (WALL_Z - 0.005)]} />
          <mesh geometry={K.rail} material={M.wallTop} position={[cx, 1.05, sd * (WALL_Z - 0.02)]} />
        </group>
      ))}
      {Array.from({length: Math.floor(C_LEN / 2.4)}, (_, i) => (
        <mesh key={i} geometry={K.panel} material={K.panelMat} position={[C_X0 + 1.2 + i * 2.4, C_H - 0.02, 0]} />
      ))}
      {/* far end: a bright window (the way out) with an EXIT sign */}
      <mesh geometry={K.endWall} material={M.wall} position={[C_X1 + 0.06, C_H / 2, 0]} />
      <mesh geometry={K.endFrame} material={M.frame} position={[C_X1 - 0.01, 1.2, 0]} />
      <mesh geometry={K.endWindow} material={K.skyMat} position={[C_X1 - 0.06, 1.2, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <mesh geometry={K.exit} material={K.exitMat} position={[C_X1 - 0.07, 2.45, 0]} rotation={[0, -Math.PI / 2, 0]} />
      <mesh geometry={K.endWall} material={M.wall} position={[C_X0 - 0.06, C_H / 2, 0]} />
      <mesh geometry={G.sign} material={M.sign} position={[C_X0 + 0.005, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} />
      {MODULES.map((o) => (
        <group key={o}>
          <Cot x={1.2 + o} />
          <CoffeeTank x={-0.9 + o} frame={frame} />
          <ObservationWindow x={3.6 + o} frame={frame} />
          <Desk x={2.9 + o} />
          <SecurityCam x={5.6 + o} frame={frame} top={C_H - 0.1} />
        </group>
      ))}
      <FastClock x={6.6} frame={frame} y={1.8} />
      {CORRIDOR_JUNK.map((j, i) => (
        <group key={i} position={[j.x, j.lying ? 0.034 : 0.06, j.z]} rotation={j.lying ? [Math.PI / 2, 0, j.rot * DEG] : [0, j.rot * DEG, 0]}>
          {j.can ? (
            <>
              <mesh geometry={G.can} material={[M.can, M.canAlt, M.canRed][i % 3]} castShadow />
              <mesh geometry={G.canTop} material={M.canTop} position={[0, 0.06, 0]} />
            </>
          ) : (
            <mesh geometry={G.mug} material={i % 4 === 1 ? M.mugAlt : M.mug} castShadow />
          )}
        </group>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- chamber door
const doorSignTex = () => label('doorSign', 512, 200, '#b8352f', '#ffffff', ['SUBJECTS', 'MUST NOT LEAVE'], [64, 50]);
const pullTex = () => label('pullPlate', 256, 110, '#d8d2c2', '#2f3533', ['PULL'], [70]);
const chamberTex = () => label('chamberStencil', 512, 150, 'rgba(0,0,0,0)', '#c9c3a8', ['CHAMBER 1'], [96]);

let doorKit: ReturnType<typeof makeDoorKit> | null = null;
function makeDoorKit() {
  return {
    wall: rb(0.16, C_H, 2.85, 0.02),
    wallMat: new MeshStandardMaterial({map: grimeWallTex(), roughness: 0.9}),
    frame: rb(0.1, 2.2, 1.12, 0.03),
    frameMat: plastic('#3b4440', 0.5),
    door: rb(0.07, 2.04, 0.96, 0.04),
    doorMat: plastic('#5f6e68', 0.42),
    rivet: new SphereGeometry(0.012, 10, 8),
    rivetMat: plastic('#8e9a93', 0.3),
    porthole: new CylinderGeometry(0.15, 0.15, 0.03, 36),
    portRim: new TorusGeometry(0.15, 0.022, 12, 36),
    glass: new MeshStandardMaterial({color: '#0e1414', roughness: 0.05, metalness: 0.3}),
    handle: new CylinderGeometry(0.018, 0.018, 0.34, 14),
    handleFoot: new CylinderGeometry(0.014, 0.014, 0.07, 10),
    handleMat: plastic('#c2bba9', 0.25),
    sign: new PlaneGeometry(0.5, 0.2),
    signMat: new MeshBasicMaterial({map: doorSignTex(), toneMapped: false}),
    pull: new PlaneGeometry(0.11, 0.048),
    pullMat: new MeshStandardMaterial({map: pullTex(), roughness: 0.6}),
    stencil: new PlaneGeometry(0.8, 0.23),
    stencilMat: new MeshStandardMaterial({map: chamberTex(), transparent: true, roughness: 0.9}),
  };
}

/**
 * Heavy old chamber door across the corridor; its front face is the plane x = doorX
 * (facing -x, toward the room). `shake` nudges it on each impact.
 */
export const ChamberDoor: React.FC<{doorX: number; shake?: number}> = ({doorX, shake = 0}) => {
  const K = (doorKit ??= makeDoorKit());
  const R = [0, -Math.PI / 2, 0] as [number, number, number]; // planes face -x
  return (
    <group>
      {/* the wall the door sits in, running from the far wall out past the cut-away edge */}
      <mesh geometry={K.wall} material={K.wallMat} position={[doorX + 0.12, C_H / 2, 0.2]} receiveShadow />
      <mesh geometry={K.stencil} material={K.stencilMat} position={[doorX + 0.035, 2.42, 0]} rotation={R} />
      <group position={[doorX + shake, 0, 0]}>
        <mesh geometry={K.frame} material={K.frameMat} position={[0.04, 1.1, 0]} castShadow />
        <mesh geometry={K.door} material={K.doorMat} position={[0.035, 1.04, 0]} castShadow receiveShadow />
        {[-0.43, 0.43].map((z) =>
          [0.12, 0.6, 1.1, 1.6, 1.95].map((y) => <mesh key={`${z}${y}`} geometry={K.rivet} material={K.rivetMat} position={[-0.002, y, z]} />),
        )}
        <group position={[-0.002, 1.62, 0]} rotation={[0, 0, Math.PI / 2]}>
          <mesh geometry={K.porthole} material={K.glass} />
        </group>
        <mesh geometry={K.portRim} material={K.rivetMat} position={[-0.004, 1.62, 0]} rotation={R} />
        <mesh geometry={K.sign} material={K.signMat} position={[-0.004, 1.2, 0]} rotation={R} />
        {/* pull handle on the right-hand side, and the small plate nobody reads */}
        <mesh geometry={K.handle} material={K.handleMat} position={[-0.075, 1.0, 0.36]} castShadow />
        {[0.86, 1.14].map((y) => (
          <mesh key={y} geometry={K.handleFoot} material={K.handleMat} position={[-0.04, y, 0.36]} rotation={[0, 0, Math.PI / 2]} />
        ))}
        <mesh geometry={K.pull} material={K.pullMat} position={[-0.004, 0.78, 0.36]} rotation={R} />
      </group>
    </group>
  );
};

// ---------------------------------------------------------------- run-down variant
// The same long corridor, but old, grimy and badly lit. The near wall (+z) is cut away
// like a film set so a side camera can see in, and every prop sits on the far wall (-z).
const grimeWallTex = () =>
  once('grimeWall', () => {
    const t = canvasTex(1024, 512, (g) => {
      const r = seeded(6060);
      g.fillStyle = '#76857d';
      g.fillRect(0, 0, 1024, 512);
      g.fillStyle = '#46524c'; // dark lower half
      g.fillRect(0, 300, 1024, 212);
      g.fillStyle = '#2f3833';
      g.fillRect(0, 296, 1024, 8);
      for (let i = 0; i < 28; i++) {
        // water streaks running down from the top
        const x = r() * 1024;
        const w = 4 + r() * 14;
        const h = 60 + r() * 300;
        const gr = g.createLinearGradient(0, 0, 0, h);
        gr.addColorStop(0, 'rgba(40,46,36,0.55)');
        gr.addColorStop(1, 'rgba(40,46,36,0)');
        g.fillStyle = gr;
        g.fillRect(x, 0, w, h);
      }
      for (let i = 0; i < 9; i++) {
        // peeling paint: small jagged flakes, slightly paler than the wall, with a dark lip
        const x = r() * 1000;
        const y = 40 + r() * 230;
        const n = 7 + Math.floor(r() * 5);
        const rad = 8 + r() * 22;
        g.beginPath();
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const rr = rad * (0.45 + r() * 0.8);
          g.lineTo(x + Math.cos(a) * rr * 1.4, y + Math.sin(a) * rr);
        }
        g.closePath();
        g.fillStyle = '#8d998f';
        g.fill();
        g.strokeStyle = 'rgba(30,34,30,0.55)';
        g.lineWidth = 1.5;
        g.stroke();
      }
      for (let i = 0; i < 40; i++) {
        // grime blotches
        const x = r() * 1024;
        const y = r() * 512;
        const rad = 10 + r() * 60;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(25,28,22,0.35)');
        gr.addColorStop(1, 'rgba(25,28,22,0)');
        g.fillStyle = gr;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    });
    t.wrapS = RepeatWrapping;
    return t;
  });

const grimeFloorTex = () =>
  once('grimeFloor', () => {
    const t = canvasTex(1024, 256, (g) => {
      const r = seeded(7070);
      const T = 64;
      for (let ix = 0; ix < 16; ix++)
        for (let iy = 0; iy < 4; iy++) {
          const v = r();
          g.fillStyle = v < 0.06 ? '#2c302b' : v < 0.5 ? '#8a9086' : '#7f857b';
          g.fillRect(ix * T, iy * T, T, T);
        }
      g.strokeStyle = '#4b4f47';
      g.lineWidth = 3;
      for (let ix = 0; ix <= 16; ix++) {
        g.beginPath();
        g.moveTo(ix * T, 0);
        g.lineTo(ix * T, 256);
        g.stroke();
      }
      for (let iy = 0; iy <= 4; iy++) {
        g.beginPath();
        g.moveTo(0, iy * T);
        g.lineTo(1024, iy * T);
        g.stroke();
      }
      g.strokeStyle = 'rgba(30,30,28,0.8)';
      g.lineWidth = 1.5;
      for (let i = 0; i < 18; i++) {
        // cracks
        let x = r() * 1024;
        let y = r() * 256;
        g.beginPath();
        g.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += (r() - 0.3) * 30;
          y += (r() - 0.5) * 24;
          g.lineTo(x, y);
        }
        g.stroke();
      }
      for (let i = 0; i < 30; i++) {
        const x = r() * 1024;
        const y = r() * 256;
        const rad = 8 + r() * 40;
        const gr = g.createRadialGradient(x, y, 0, x, y, rad);
        gr.addColorStop(0, 'rgba(50,40,25,0.45)');
        gr.addColorStop(1, 'rgba(50,40,25,0)');
        g.fillStyle = gr;
        g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      }
    });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    return t;
  });

let rundownKit: ReturnType<typeof makeRundownKit> | null = null;
function makeRundownKit() {
  const floorTex = grimeFloorTex().clone();
  floorTex.repeat.set(C_LEN / 4, 1);
  floorTex.needsUpdate = true;
  const wallTex = grimeWallTex().clone();
  wallTex.repeat.set(C_LEN / 5.5, 1);
  wallTex.needsUpdate = true;
  return {
    floorMat: new MeshStandardMaterial({map: floorTex, roughness: 0.55}),
    wallMat: new MeshStandardMaterial({map: wallTex, roughness: 0.9}),
    ceilingMat: matte('#2f3533', 0.95),
    pipeMat: plastic('#7a5641', 0.55),
    pipeDark: plastic('#4d4a44', 0.5),
    puddleMat: new MeshPhysicalMaterial({color: '#1d2321', roughness: 0.04, metalness: 0.1, clearcoat: 1, transparent: true, opacity: 0.8}),
    lampOn: new MeshBasicMaterial({color: '#e6f3dc', toneMapped: false}),
    lampDim: new MeshBasicMaterial({color: '#8e9c88', toneMapped: false}),
    lampDead: plastic('#3c423f', 0.6),
    paperMat: matte('#cfc8b4', 0.9),
    floor: new PlaneGeometry(C_LEN, WALL_Z * 2),
    ceiling: new PlaneGeometry(C_LEN, WALL_Z * 2 + 0.3),
    wall: new PlaneGeometry(C_LEN, C_H),
    pipe: new CylinderGeometry(0.06, 0.06, C_LEN, 16),
    pipeThin: new CylinderGeometry(0.035, 0.035, C_LEN, 12),
    bracket: rb(0.06, 0.12, 0.22, 0.01),
    panel: rb(1.1, 0.03, 0.42, 0.012),
    cable: new CylinderGeometry(0.006, 0.006, 0.5, 6),
    puddle: new SphereGeometry(1, 24, 8),
    paper: new PlaneGeometry(0.21, 0.29),
  };
}

const PUDDLES = seededArray(8181, 7, (r) => ({x: -6 + r() * 26, z: -0.2 + (r() - 0.5) * 1.4, sx: 0.4 + r() * 0.7, sz: 0.25 + r() * 0.4}));
const PAPERS = seededArray(8282, 22, (r) => ({x: -7 + r() * 28, z: -1 + r() * 1.9, rot: r() * 360}));

/** Lamp states along the ceiling: mostly dead, some dim, one flickering, one dangling. */
const lampState = (i: number, frame: number) => {
  if (i === 5) return Math.floor(frame / 7) % 5 === 0 || frame % 23 < 3 ? 'off' : 'on'; // the flickering one
  if (i === 3 || i === 9) return 'on';
  if (i % 4 === 1) return 'dim';
  return 'dead';
};

const RundownLab: React.FC<{frame: number}> = ({frame}) => {
  const K = (rundownKit ??= makeRundownKit());
  const cx = (C_X0 + C_X1) / 2;
  const far = (x: number, node: React.ReactNode, key: string) => (
    // props written for the +z wall, turned 180 degrees about their own x to face us from the far wall
    <group key={key} position={[x, 0, 0]} rotation={[0, Math.PI, 0]}>
      {node}
    </group>
  );
  return (
    <group>
      <mesh geometry={K.floor} material={K.floorMat} rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, 0]} receiveShadow />
      <mesh geometry={K.ceiling} material={K.ceilingMat} rotation={[Math.PI / 2, 0, 0]} position={[cx, C_H, 0]} />
      {/* far wall only: the near wall is cut away for the camera */}
      <mesh geometry={K.wall} material={K.wallMat} position={[cx, C_H / 2, -WALL_Z]} receiveShadow />
      <mesh geometry={K.wall} material={K.wallMat} position={[C_X0, C_H / 2, 0]} rotation={[0, Math.PI / 2, 0]} scale={[(WALL_Z * 2) / C_LEN, 1, 1]} />
      {/* rusty pipes under the ceiling */}
      <mesh geometry={K.pipe} material={K.pipeMat} position={[cx, C_H - 0.18, -WALL_Z + 0.12]} rotation={[0, 0, Math.PI / 2]} castShadow />
      <mesh geometry={K.pipeThin} material={K.pipeDark} position={[cx, C_H - 0.32, -WALL_Z + 0.1]} rotation={[0, 0, Math.PI / 2]} />
      {Array.from({length: 13}, (_, i) => (
        <mesh key={i} geometry={K.bracket} material={K.pipeDark} position={[C_X0 + 1.5 + i * 3, C_H - 0.22, -WALL_Z + 0.1]} />
      ))}
      {/* ceiling lamps */}
      {Array.from({length: Math.floor(C_LEN / 2.4)}, (_, i) => {
        const x = C_X0 + 1.2 + i * 2.4;
        const st = lampState(i, frame);
        const mat = st === 'on' ? K.lampOn : st === 'dim' ? K.lampDim : K.lampDead;
        if (i === 7) {
          // dangling from one cable, swinging slowly
          const swing = Math.sin(frame * 0.045) * 6;
          return (
            <group key={i} position={[x, C_H, 0]} rotation={[swing * DEG, 0, 0]}>
              <mesh geometry={K.cable} material={K.pipeDark} position={[0.5, -0.25, 0]} />
              <mesh geometry={K.panel} material={K.lampDim} position={[0.1, -0.42, 0]} rotation={[0, 0, 32 * DEG]} />
            </group>
          );
        }
        return <mesh key={i} geometry={K.panel} material={mat} position={[x, C_H - 0.02, 0]} />;
      })}
      {PUDDLES.map((p, i) => (
        <mesh key={i} geometry={K.puddle} material={K.puddleMat} position={[p.x, 0.002, p.z]} scale={[p.sx, 0.002, p.sz]} />
      ))}
      {PAPERS.filter((p) => p.z < -0.15).map((p, i) => (
        <mesh key={i} geometry={K.paper} material={K.paperMat} position={[p.x, 0.004, p.z]} rotation={[-Math.PI / 2, 0, p.rot * DEG]} />
      ))}
      <mesh geometry={G.sign} material={M.sign} position={[C_X0 + 0.01, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} />
      {MODULES.map((o) => (
        <group key={o}>
          <Cot x={1.6 + o} />
          {far(-1.2 + o, <CoffeeTank x={0} frame={frame} />, 't')}
          {far(4.6 + o, <Desk x={0} />, 'd')}
          <ObservationWindow x={4.6 + o} frame={frame} y={1.55} />
          {far(6.7 + o, <SecurityCam x={0} frame={frame} top={C_H - 0.1} />, 'c')}
        </group>
      ))}
      <FastClock x={2.9} frame={frame} y={1.85} />
      {CORRIDOR_JUNK.map((j, i) => j.z > 0 ? null : (
        <group key={i} position={[j.x, j.lying ? 0.034 : 0.06, j.z]} rotation={j.lying ? [Math.PI / 2, 0, j.rot * DEG] : [0, j.rot * DEG, 0]}>
          {j.can ? (
            <>
              <mesh geometry={G.can} material={[M.can, M.canAlt, M.canRed][i % 3]} castShadow />
              <mesh geometry={G.canTop} material={M.canTop} position={[0, 0.06, 0]} />
            </>
          ) : (
            <mesh geometry={G.mug} material={i % 4 === 1 ? M.mugAlt : M.mug} castShadow />
          )}
        </group>
      ))}
    </group>
  );
};

export const SleepSet: React.FC<{frame: number; variant?: 'diorama' | 'corridor' | 'rundown'}> = ({frame, variant = 'diorama'}) =>
  variant === 'rundown' ? (
    <RundownLab frame={frame} />
  ) : variant === 'corridor' ? (
    <Corridor frame={frame} />
  ) : (
    <group>
      <Room />
      <FastClock x={-1.2} frame={frame} />
      <Cot x={1.2} />
      <CoffeeTank x={-0.9} frame={frame} />
      <ObservationWindow x={3.6} frame={frame} />
      <Desk x={2.9} />
      <SecurityCam x={5.6} frame={frame} />
      <FloorJunk />
    </group>
  );
