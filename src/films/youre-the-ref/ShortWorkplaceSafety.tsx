/**
 * You're the Ref Short: "Workplace Safety with Jimmy" (script: docs/scripts/ref-short-workplace-safety-script.md)
 *
 *   0.0  HOOK: a factory press lifts and out pops Jimmy, crushed into a cube, still in his kit: "peep"  (caption: HOW?)
 *   1.4  title card: WORKPLACE SAFETY with JIMMY
 *   3.0  LESSON 1 CONSTRUCTION: yellow card to the crane operator, "Dangerous play.", the beam drops: pancake + halo
 *   6.6  LESSON 2 KITCHEN: whistle duel with a pressure cooker, BOOM: soot silhouette, blink
 *  10.0  LESSON 3 OFFICE: red card to a jammed printer, it buries him in paper: one hand and a muffled "peep"
 *  13.4  LESSON 4 NIGHT SHIFT: the scuba dance in front of a gang with tommy guns. Flash, BANG (off-screen), halo
 *  17.9  LESSON 5 FACTORY: flags an offside box, rides the conveyor into the press: "Offside." CLANG: the cube (the hook)
 *  22.3  ENDING: gravestone "HE WAS RIGHT", Jimmy next to it; WORST JOB? 1-5, comment the number
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BoxGeometry, CanvasTexture, Color, CylinderGeometry, Material, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SphereGeometry, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {canvasTex, once} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, armsUp, POINT, runAlong} from './Episode2';
import {DEADPAN, handLocal, JIMMY} from './Episode4';
import {Captions, CommentButton, Cue, FONT} from './Overlays';
import {DOWN, haloGeo, haloMat, ShotBang, ShotDance, ShotDown, ShotGang, ShotLook, whistleGeo, whistleMat} from './ShortSafetyPreview';
import {HEIGHT, WIDTH} from '../../core/constants';

export const SAFETY_FPS = 30;
const F = (s: number) => Math.round(s * SAFETY_FPS);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const memo = new Map<string, unknown>();
const keep = <T,>(k: string, make: () => T): T => {
  if (!memo.has(k)) memo.set(k, make());
  return memo.get(k) as T;
};
const mix = (a: string, b: string, k: number) => '#' + new Color(a).lerp(new Color(b), clamp01(k)).getHexString();

// ---------------------------------------------------------------- timeline (s)
const T_TITLE = 1.4;
const T_L1 = 3.0;
const T_L2 = 6.6;
const T_L3 = 10.0;
const T_L4 = 13.4;
const T_L5 = 17.9;
const T_END = 22.3;
export const SAFETY_FRAMES = F(25.9);

const LESSONS = [
  {n: 1, name: 'CONSTRUCTION', at: T_L1, fail: 2.85},
  {n: 2, name: 'KITCHEN', at: T_L2, fail: 2.45},
  {n: 3, name: 'OFFICE', at: T_L3, fail: 2.55},
  {n: 4, name: 'NIGHT SHIFT', at: T_L4, fail: 3.95},
  {n: 5, name: 'FACTORY', at: T_L5, fail: 3.0},
];

// ---------------------------------------------------------------- shared bits
const Day: React.FC<{cam: Cam; centre: Vector3; bg: string; children: React.ReactNode; sky?: string; ground?: string}> = ({cam, centre, bg, children, sky = '#eaf2ff', ground = '#d9cbbb'}) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
    <color attach="background" args={[bg]} />
    <CameraRig cam={{...cam, far: 120}} />
    <Environment intensity={0.45} />
    <Daylight center={centre} extent={6} offset={[-3, 8, 6]} color="#fff4e6" intensity={2.3} sky={sky} ground={ground} fill={1.0} />
    {children}
  </ThreeCanvas>
);

const mat = (c: string, r = 0.8, metal = 0) => new MeshStandardMaterial({color: c, roughness: r, metalness: metal});
const box = (w: number, h: number, d: number) => new BoxGeometry(w, h, d);
const plane = new PlaneGeometry(1, 1);
const cardGeo = box(0.008, 0.11, 0.08);
const yellowCard = mat('#ffd21a', 0.35);
const redCard = mat('#e5262b', 0.35);
const smallWhistle = new CylinderGeometry(0.018, 0.018, 0.05, 12);

/** A card held up in the near hand. */
const Card: React.FC<{pose: Parameters<typeof handLocal>[0]; red?: boolean}> = ({pose, red}) => (
  <mesh geometry={cardGeo} material={red ? redCard : yellowCard} position={handLocal(pose, false).add(v3(0, 0.06, 0))} />
);
/** The whistle in the near hand (hand pulled to the mouth with nearHandZ). */
const HandWhistle: React.FC<{pose: Parameters<typeof handLocal>[0]}> = ({pose}) => (
  <mesh geometry={smallWhistle} material={whistleMat} position={handLocal(pose, false).add(v3(0.03, 0.01, 0))} rotation={[0, 0, Math.PI / 2]} />
);
/** Spec with the near hand raised to the mouth (blowing the whistle). */
const blowing = (s: BodySpec, k: number): BodySpec => ({...s, nearArm: [lerp(s.nearArm[0], 30, k), lerp(s.nearArm[1], 138, k)]});
const WHISTLE_Z = 0.03;

const Halo: React.FC<{at: Vector3; t: number}> = ({at, t}) => (
  <group position={[at.x, at.y + 0.03 * Math.sin(t * 6), at.z]} rotation={[0.35, t * 5, 0]}>
    <mesh geometry={haloGeo} material={haloMat} rotation={[Math.PI / 2, 0, 0]} />
    <pointLight intensity={0.6} distance={1.5} color="#ffd84a" />
  </group>
);

// ---------------------------------------------------------------- cube Jimmy (hook + factory payoff)
const cubeFace = (face: boolean) =>
  canvasTex(256, 256, (g) => {
    g.fillStyle = '#f0b892';
    g.fillRect(0, 0, 256, 104);
    g.fillStyle = '#2b211c';
    g.fillRect(0, 0, 256, 16);
    g.fillStyle = '#ffd21a';
    g.fillRect(0, 104, 256, 92);
    g.fillStyle = '#111114';
    g.fillRect(0, 196, 256, 60);
    if (!face) return;
    // squashed face: little eyes, cheeks, nose, the whistle in his mouth
    g.fillStyle = '#1a1210';
    for (const x of [86, 170]) {
      g.beginPath();
      g.ellipse(x, 52, 7, 10, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e88a8a';
    for (const x of [62, 194]) {
      g.beginPath();
      g.ellipse(x, 72, 14, 8, 0, 0, Math.PI * 2);
      g.fill();
    }
    g.fillStyle = '#e0a07c';
    g.beginPath();
    g.ellipse(128, 66, 10, 9, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#c9ced6';
    g.fillRect(112, 84, 34, 14);
    g.fillStyle = '#8a9099';
    g.fillRect(140, 84, 8, 14);
    g.fillStyle = '#111114';
    g.fillRect(150, 140, 34, 26); // ref badge
  });
const cubeMats = () =>
  keep('cubeJimmyMats', () => {
    const side = new MeshStandardMaterial({map: cubeFace(false), roughness: 0.75});
    const front = new MeshStandardMaterial({map: cubeFace(true), roughness: 0.75});
    const top = mat('#2b211c', 0.9);
    const bottom = mat('#111114', 0.9);
    return [side, side, top, bottom, front, side] as Material[];
  });
const cubeGeo = box(0.56, 0.56, 0.56);

/** The cube pops out of the lifting press, hops, wobbles, and peeps. t = 0 is the slam. */
const CubeJimmy: React.FC<{t: number; x: number; y0: number}> = ({t, x, y0}) => {
  const hop = t > 0.3 && t < 0.62 ? Math.sin(((t - 0.3) / 0.32) * Math.PI) * 0.35 : 0;
  const w = t > 0.62 ? Math.sin((t - 0.62) * 26) * 0.16 * Math.exp(-(t - 0.62) * 4) : 0;
  const peep = t > 0.95 && t < 1.1 ? 0.06 * Math.sin(((t - 0.95) / 0.15) * Math.PI) : 0;
  const sy = 1 - w + peep;
  const sx = 1 + w * 0.8 + peep * 0.5;
  return (
    <group position={[x, y0 + hop, 0]} scale={[sx, sy, sx]}>
      <mesh geometry={cubeGeo} material={cubeMats()} position={[0, 0.28, 0]} castShadow receiveShadow />
    </group>
  );
};

// ---------------------------------------------------------------- factory set (also the hook)
const concrete = mat('#9a978f', 0.95);
const wallGrey = mat('#6d7279', 0.9);
const pressYellow = mat('#f2c230', 0.5, 0.2);
const pressDark = mat('#34373d', 0.45, 0.6);
const beltMat = mat('#232428', 0.7);
const cardboard = mat('#c08a55', 0.85);
const tapeMat = mat('#e0c08a', 0.6);
const BELT_Y = 0.62;
const PRESS_X = 2.3;
const BELT_SPEED = 1.75;
const hazardTex = () =>
  once('hazard', () => {
    const t = canvasTex(256, 64, (g) => {
      g.fillStyle = '#f2c230';
      g.fillRect(0, 0, 256, 64);
      g.fillStyle = '#16161a';
      for (let i = -2; i < 10; i++) {
        g.beginPath();
        g.moveTo(i * 32, 64);
        g.lineTo(i * 32 + 16, 64);
        g.lineTo(i * 32 + 48, 0);
        g.lineTo(i * 32 + 32, 0);
        g.fill();
      }
    });
    t.wrapS = RepeatWrapping;
    t.repeat.set(8, 1);
    return t;
  });
const beltTex = () =>
  once('beltTex', () => {
    const t = canvasTex(64, 64, (g) => {
      g.fillStyle = '#232428';
      g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#34363b';
      g.fillRect(0, 0, 10, 64);
    });
    t.wrapS = RepeatWrapping;
    t.repeat.set(20, 1);
    return t;
  });

/** Press head height above the belt: 0 = slammed shut. */
const Factory: React.FC<{t: number; head: number; boxes?: boolean}> = ({t, head, boxes = true}) => {
  const bt = beltTex();
  (bt as CanvasTexture).offset.x = -t * BELT_SPEED * 0.4;
  return (
    <group>
      <mesh geometry={plane} material={concrete} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} receiveShadow />
      <mesh geometry={plane} material={wallGrey} position={[0, 4, -2.2]} scale={[30, 8, 1]} receiveShadow />
      <mesh geometry={plane} position={[0, 0.6, -2.19]} scale={[30, 0.35, 1]}>
        <meshStandardMaterial map={hazardTex()} roughness={0.8} />
      </mesh>
      {/* conveyor */}
      <mesh geometry={box(6.4, 0.12, 0.8)} position={[-0.4, BELT_Y - 0.06, 0]} castShadow receiveShadow>
        <meshStandardMaterial map={bt} roughness={0.7} />
      </mesh>
      {[-3.3, -1.6, 0.1, 1.8].map((x) => (
        <mesh key={x} geometry={box(0.08, BELT_Y - 0.12, 0.7)} material={pressDark} position={[x, (BELT_Y - 0.12) / 2, 0]} />
      ))}
      {/* the press */}
      {[-0.62, 0.62].map((dx) => (
        <mesh key={dx} geometry={box(0.22, 3.2, 0.22)} material={pressYellow} position={[PRESS_X + dx, 1.6, -0.62]} castShadow />
      ))}
      <mesh geometry={box(1.5, 0.3, 0.3)} material={pressYellow} position={[PRESS_X, 3.25, -0.62]} castShadow />
      <mesh geometry={box(0.5, 0.25, 0.75)} material={pressYellow} position={[PRESS_X, 3.25, -0.25]} castShadow />
      <mesh geometry={box(0.9, 0.42, 0.95)} material={pressDark} position={[PRESS_X, BELT_Y + 0.21 + head, 0]} castShadow />
      <mesh geometry={new CylinderGeometry(0.09, 0.09, 1, 14)} material={pressDark} position={[PRESS_X, BELT_Y + 0.42 + head + (3.1 - BELT_Y - 0.42 - head) / 2, 0]} scale={[1, 3.1 - BELT_Y - 0.42 - head, 1]} />
      {boxes
        ? [0, 1, 2, 3, 4, 5].map((i) => {
            // evenly spaced boxes; box 3 sits a little ahead of the line (offside)
            const x = -3.4 + i * 0.85 + (i === 3 ? 0.3 : 0) + t * BELT_SPEED;
            if (x > PRESS_X - 0.6) return null;
            return (
              <group key={i} position={[x, BELT_Y + 0.17, 0]}>
                <mesh geometry={box(0.36, 0.34, 0.36)} material={cardboard} castShadow />
                <mesh geometry={box(0.37, 0.06, 0.08)} material={tapeMat} position={[0, 0.15, 0]} />
              </group>
            );
          })
        : null}
    </group>
  );
};

/** The hook shot: the press lifts, cube Jimmy pops out. t = 0 is the slam (head already down). */
const ShotCube: React.FC<{t0?: number; boxesT?: number}> = ({t0 = 0, boxesT = 3.2}) => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_FPS + t0;
  const head = smooth(clamp01((t - 0.06) / 0.22)) * 1.6;
  const cam: Cam = {position: v3(PRESS_X - 0.1, 1.35, 3.3 - 0.25 * smooth(clamp01(t / 1.4))), target: v3(PRESS_X, 1.1, 0), fov: 44};
  const shake = t < 0.2 ? 0.03 * Math.sin(t * 90) * (1 - t / 0.2) : 0;
  return (
    <Day cam={{...cam, position: cam.position.clone().add(v3(shake, shake * 0.5, 0))}} centre={v3(PRESS_X, 0, 0)} bg="#5b6068">
      <Factory t={boxesT} head={head} boxes={false} />
      {head > 0.15 ? <CubeJimmy t={t} x={PRESS_X} y0={BELT_Y} /> : null}
    </Day>
  );
};

// ---------------------------------------------------------------- LESSON 1: construction
const sky = '#a9d4f5';
const dirt = mat('#b7a58a', 0.95);
const craneYellow = mat('#f4b91a', 0.5, 0.25);
const steelBeam = mat('#5c6470', 0.45, 0.6);
const cable = mat('#222', 0.6);
const glass = new MeshStandardMaterial({color: '#9fc7e6', roughness: 0.1, metalness: 0.2, transparent: true, opacity: 0.35});
const OPERATOR: Style = {outfit: 'kit', skin: '#c98f6b', hair: '#1f1714', hairStyle: 'short', kit: {shirt: '#ff7a1a', shorts: '#2f4f8a', socks: '#1b1b1d', trim: '#e9e9e9', trousers: true, longSleeves: true}, hat: {kind: 'hardhat', color: '#f5f5f0', band: '#f5f5f0'}};
const JIMMY_HAT: Style = {...JIMMY, hat: {kind: 'hardhat', color: '#ffd21a', band: '#ffd21a'}};
const CAB_X = 1.85;
const BEAM_X = 0.95;
const DROP_AT = 2.45;
const DROP_LEN = 0.22;
const BEAM_Y0 = 3.4;
const LAND_Z = -0.4;

const ConstructionSet: React.FC<{t: number; beamY: number; swing: number}> = ({t, beamY, swing}) => (
  <group>
    <mesh geometry={plane} material={dirt} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} receiveShadow />
    {/* crawler base + cab with an open front so the operator shows */}
    <mesh geometry={box(1.5, 0.45, 1.2)} material={mat('#3a3d42', 0.7)} position={[CAB_X + 0.25, 0.22, -0.4]} castShadow receiveShadow />
    <mesh geometry={box(1.1, 1.25, 0.06)} material={craneYellow} position={[CAB_X + 0.25, 1.07, -0.97]} castShadow />
    <mesh geometry={box(1.1, 0.06, 1.0)} material={craneYellow} position={[CAB_X + 0.25, 1.7, -0.5]} castShadow />
    <mesh geometry={box(0.06, 1.25, 1.0)} material={craneYellow} position={[CAB_X + 0.78, 1.07, -0.5]} />
    <mesh geometry={box(0.06, 1.25, 0.06)} material={craneYellow} position={[CAB_X - 0.28, 1.07, -0.02]} />
    <mesh geometry={plane} material={glass} position={[CAB_X + 0.25, 1.15, 0.0]} scale={[1.05, 1.1, 1]} />
    {/* tower and jib reaching back over Jimmy */}
    <mesh geometry={box(0.3, 5.0, 0.3)} material={craneYellow} position={[CAB_X + 0.6, 4.2, -0.6]} castShadow />
    <mesh geometry={box(3.2, 0.22, 0.22)} material={craneYellow} position={[CAB_X + 0.6 - 1.45, 6.6, -0.6]} castShadow />
    <group position={[BEAM_X, 6.5, -0.15]} rotation={[0, 0, swing]}>
      <mesh geometry={box(0.025, 6.5 - beamY, 0.025)} material={cable} position={[0, -(6.5 - beamY) / 2, 0]} visible={t < DROP_AT} />
    </group>
    <group position={[BEAM_X + Math.sin(swing) * (6.5 - beamY), beamY, lerp(-0.15, LAND_Z, clamp01((beamY - BEAM_Y0) / (0.12 - BEAM_Y0)))]} rotation={[0, 0.25 * (1 - clamp01((beamY - BEAM_Y0) / (0.12 - BEAM_Y0))), swing]}>
      <mesh geometry={box(2.2, 0.14, 0.2)} material={steelBeam} castShadow receiveShadow />
      <mesh geometry={box(2.2, 0.03, 0.34)} material={steelBeam} position={[0, 0.07, 0]} />
      <mesh geometry={box(2.2, 0.03, 0.34)} material={steelBeam} position={[0, -0.07, 0]} />
    </group>
  </group>
);

const ShotConstruction: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_FPS;
  const drop = clamp01((t - DROP_AT) / DROP_LEN);
  const beamY = t < DROP_AT ? BEAM_Y0 : lerp(BEAM_Y0, 0.12, drop * drop);
  const swing = t < DROP_AT ? 0.05 * Math.sin(t * 2.2) : 0;
  const landed = t >= DROP_AT + DROP_LEN;
  // Jimmy: looks up and blows (0-0.6), jogs to the cab (0.65-1.15), yellow card + "Dangerous play." (1.15-2.45)
  const blowK = t < 0.5 ? Math.sin(clamp01((t - 0.05) / 0.45) * Math.PI) : 0;
  const run = runAlong((tt) => ({x: lerp(-0.35, BEAM_X - 0.05, smooth(clamp01((tt - 0.65) / 0.5))), z: 0.25}), t, 0.5);
  const moving = t > 0.65 && t < 1.15;
  const idle = idleSpec(frame, 0.1);
  let spec: BodySpec = moving ? run.spec : idle;
  let headTilt = t < 0.15 ? 0 : t < 0.6 ? 0 : t < 0.65 ? 14 : -4;
  spec = blowing({...spec, headTilt}, blowK);
  const cardK = smooth(clamp01((t - 1.15) / 0.15));
  if (t >= 1.15) spec = {...spec, nearArm: [lerp(spec.nearArm[0], 150, cardK), lerp(spec.nearArm[1], 5, cardK)]};
  const talk = t >= 1.2 && t < 2.45 ? 1 : 0;
  const opUp = smooth(clamp01((t - 2.15) / 0.15));
  const jx = run.pos.x;
  const wide = t >= DROP_AT + DROP_LEN + 0.05;
  const cam: Cam = wide
    ? {position: v3(BEAM_X - 0.1, 3.4, 1.35), target: v3(BEAM_X - 0.1, 0, -0.4), fov: 50}
    : {position: v3(0.75, 1.55, 5.4), target: v3(0.75, 2.05, 0), fov: 52};
  const shake = landed && t < DROP_AT + DROP_LEN + 0.25 ? 0.05 * Math.sin(t * 80) : 0;
  return (
    <Day cam={{...cam, position: cam.position.clone().add(v3(shake, shake, 0))}} centre={v3(0.8, 0, 0)} bg={sky} sky="#eaf6ff" ground="#d8c7a8">
      <ConstructionSet t={t} beamY={beamY} swing={swing} />
      <Actor style={OPERATOR} x={CAB_X + 0.2} z={-0.45} y={0.45} yaw={Math.PI} spec={armsUp({...idleSpec(frame + 40, 0.3), nearArm: [40, 60], farArm: [40, 60]}, t, opUp)} frame={frame} look={opUp > 0.5 ? {tired: 0, droop: -6, eyesClosed: false, brows: 0.8, browLift: 0.8, mouth: 'open', mouthOpen: 0.7, noBlink: true} : {tired: 0, droop: 0, eyesClosed: false, mouth: 'flat'}} />
      {!landed ? (
        <Actor style={{...JIMMY_HAT, nearHandZ: blowK > 0.3 ? WHISTLE_Z : undefined}} x={jx} z={0.25} yaw={moving ? run.yaw : 0} spec={spec} frame={frame} look={DEADPAN(talk, t)}>
          {(pose) => (blowK > 0.3 ? <HandWhistle pose={pose} /> : t >= 1.25 ? <Card pose={pose} /> : null)}
        </Actor>
      ) : (
        <>
          {/* flat as a pancake under the beam */}
          <group position={[BEAM_X - 0.1, 0, 0]} scale={[1.15, 0.28, 1.15]}>
            <Actor style={JIMMY_HAT} x={0} z={0.55} yaw={-Math.PI / 2} pitch={90} y={0.16} spec={{...DOWN, nearArm: [70, 6], farArm: [-60, 6]}} frame={frame} look={{tired: 0, droop: 0, eyesClosed: true, mouth: 'flat'}} shadow={false} />
          </group>
          <mesh geometry={cardGeo} material={yellowCard} position={[BEAM_X + 0.5, 0.01, 0.1]} rotation={[0, 0.6, Math.PI / 2]} />
          <Halo at={v3(BEAM_X - 0.1, 0.36, -1.15)} t={t} />
        </>
      )}
    </Day>
  );
};

// ---------------------------------------------------------------- LESSON 2: kitchen
// whistle duel (keep in sync with DUEL in tools/safety_sfx.py), times from DUEL_AT
const DUEL: [number, 'C' | 'J', number][] = [
  [0.0, 'C', 0.4], [0.45, 'J', 0.3], [0.8, 'C', 0.22], [1.05, 'J', 0.18], [1.26, 'C', 0.13], [1.41, 'J', 0.11], [1.54, 'C', 0.09], [1.64, 'J', 0.08], [1.73, 'C', 0.3],
];
const DUEL_AT = 0.25;
const BOOM_AT = DUEL_AT + 2.03;
const tileTex = () =>
  once('tiles', () => {
    const t = canvasTex(256, 256, (g) => {
      g.fillStyle = '#cfd6da';
      g.fillRect(0, 0, 256, 256);
      g.fillStyle = '#f4f7f8';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) g.fillRect(c * 64 + 3, r * 64 + 3, 58, 58);
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(8, 6);
    return t;
  });
const checkTex = () =>
  once('checker', () => {
    const t = canvasTex(128, 128, (g) => {
      for (let r = 0; r < 2; r++)
        for (let c = 0; c < 2; c++) {
          g.fillStyle = (r + c) % 2 ? '#2a2c30' : '#e9e6df';
          g.fillRect(c * 64, r * 64, 64, 64);
        }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(12, 12);
    return t;
  });
const steelMat = mat('#b9c0c8', 0.3, 0.75);
const potMat = mat('#d7dde3', 0.22, 0.85);
const blackMat = mat('#1b1b1d', 0.6);
const steamMat = new MeshStandardMaterial({color: '#ffffff', roughness: 1, transparent: true, opacity: 0.8});
const smokeMats = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => new MeshStandardMaterial({color: '#8d8f94', roughness: 1, transparent: true, opacity: i / 10}));
const flashFull = new MeshBasicMaterial({color: '#fff6d0'});
const ball = new SphereGeometry(1, 16, 12);
const POT = v3(0.95, 0.9, -0.55);
const SOOT: Style = {...JIMMY, skin: '#1d1d20', hair: '#1d1d20', kit: {...JIMMY.kit!, shirt: '#1d1d20', shorts: '#161618', socks: '#161618', trim: '#161618'}};
const SMOKE = Array.from({length: 14}, (_, i) => ({a: i * 2.4, r: 0.25 + (i % 4) * 0.12, y: 0.4 + ((i * 7) % 10) * 0.12, s: 0.35 + (i % 3) * 0.12}));

const ShotKitchen: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_FPS;
  const dt = t - DUEL_AT;
  const cur = DUEL.filter(([at]) => dt >= at).pop();
  const active = cur && dt < cur[0] + cur[2] ? cur[1] : null;
  const k = cur ? DUEL.indexOf(cur) / DUEL.length : 0;
  const boomed = t >= BOOM_AT;
  const blowK = active === 'J' ? 1 : 0;
  const base = idleSpec(frame, 0.2);
  const spec = blowing({...base, lean: 4 + 4 * k, headTilt: 0}, blowK);
  const angry: Look = {tired: 0, droop: -2, eyesClosed: false, brows: -0.7 - 0.3 * k, browLift: -0.2, mouth: 'flat', noBlink: true, yaw: active === 'C' ? 10 : 0};
  const shake = active === 'C' ? 0.012 * (1 + 3 * k) * Math.sin(t * 70) : 0;
  const smokeK = clamp01((t - BOOM_AT) / 0.12) * (1 - clamp01((t - BOOM_AT - 0.25) / 0.45));
  const blink = t > BOOM_AT + 0.85 && t < BOOM_AT + 0.98;
  const cam: Cam = {position: v3(0.3, 1.45, 3.2), target: v3(0.35, 1.15, -0.2), fov: 44};
  const camShake = t >= BOOM_AT && t < BOOM_AT + 0.3 ? 0.05 * Math.sin(t * 90) : 0;
  return (
    <Day cam={{...cam, position: cam.position.clone().add(v3(camShake, camShake, 0))}} centre={v3(0.4, 0, -0.3)} bg="#cfd6da">
      <mesh geometry={plane} rotation={[-Math.PI / 2, 0, 0]} scale={[20, 20, 1]} receiveShadow>
        <meshStandardMaterial map={checkTex()} roughness={0.6} />
      </mesh>
      <mesh geometry={plane} position={[0, 3, -1.1]} scale={[16, 6, 1]} receiveShadow>
        <meshStandardMaterial map={tileTex()} roughness={0.4} />
      </mesh>
      <mesh geometry={box(2.6, 0.88, 0.75)} material={steelMat} position={[0.9, 0.44, -0.6]} castShadow receiveShadow />
      <mesh geometry={new CylinderGeometry(0.2, 0.2, 0.02, 24)} material={blackMat} position={[POT.x, 0.89, POT.z]} />
      {!boomed ? (
        <group position={[POT.x + shake, POT.y + 0.13, POT.z]}>
          <mesh geometry={new CylinderGeometry(0.21, 0.19, 0.26, 28)} material={potMat} castShadow />
          <mesh geometry={new CylinderGeometry(0.225, 0.225, 0.04, 28)} material={mat('#3b3e44', 0.4, 0.6)} position={[0, 0.15, 0]} />
          <mesh geometry={box(0.42, 0.03, 0.04)} material={blackMat} position={[0, 0.18, 0]} />
          <mesh geometry={new CylinderGeometry(0.025, 0.03, 0.06, 12)} material={blackMat} position={[0, 0.2 + (active === 'C' ? 0.015 * Math.sin(t * 120) : 0), 0]} />
          {/* steam from the valve while the cooker whistles */}
          {active === 'C'
            ? [0, 1, 2, 3].map((i) => {
                const p = ((t * 3 + i * 0.25) % 1) as number;
                return <mesh key={i} geometry={ball} material={steamMat} position={[0.04 * Math.sin(i * 2 + t * 9), 0.25 + p * 0.5, 0]} scale={0.04 + p * 0.07} />;
              })
            : null}
        </group>
      ) : null}
      <Actor
        style={boomed ? SOOT : {...JIMMY, skin: mix('#f0b892', '#e8553f', k * 1.3), nearHandZ: blowK ? WHISTLE_Z : undefined}}
        x={-0.15}
        z={0.0}
        yaw={0.2}
        spec={boomed ? {...idleSpec(0, 0), lean: -6, headTilt: -4, nearArm: [8, 10], farArm: [6, 12]} : spec}
        frame={frame}
        look={boomed ? {tired: 0, droop: 0, eyesClosed: blink, mouth: 'flat', pupils: 0.9, noBlink: true, stare: true} : angry}
      >
        {(pose) => (blowK && !boomed ? <HandWhistle pose={pose} /> : null)}
      </Actor>
      {/* the explosion: a white flash, then a smoke cloud that clears */}
      {t >= BOOM_AT && t < BOOM_AT + 0.08 ? <mesh geometry={ball} material={flashFull} position={[POT.x, POT.y + 0.2, POT.z]} scale={1.2} /> : null}
      {smokeK > 0.02
        ? SMOKE.map((s, i) => (
            <mesh
              key={i}
              geometry={ball}
              material={smokeMats[Math.round(smokeK * 10)]}
              position={[POT.x - 0.5 + Math.cos(s.a) * s.r * (1 + smokeK), s.y + 0.6 * clamp01((t - BOOM_AT) / 1.2), POT.z + 0.4 + Math.sin(s.a) * s.r]}
              scale={s.s * (0.6 + smokeK)}
            />
          ))
        : null}
    </Day>
  );
};

// ---------------------------------------------------------------- LESSON 3: office
const carpet = mat('#5d6a7d', 0.98);
const beige = mat('#e6dcc8', 0.9);
const partition = mat('#7d8ea3', 0.85);
const deskMat = mat('#b48a5e', 0.6);
const printerMat = mat('#e9eaec', 0.5);
const paperMat = new MeshStandardMaterial({color: '#fbfbf7', roughness: 0.9, side: 2});
const jamTex = (on: boolean) =>
  once('jam' + on, () =>
    canvasTex(256, 96, (g) => {
      g.fillStyle = on ? '#e5262b' : '#3a0b0d';
      g.fillRect(0, 0, 256, 96);
      g.fillStyle = on ? '#fff' : '#a33';
      g.font = 'bold 40px sans-serif';
      g.textAlign = 'center';
      g.fillText('PAPER JAM', 128, 62);
    }),
  );
const PRINTER = v3(1.05, 0.95, -0.45);
const FIRE_AT = 1.5;
const SHEETS = Array.from({length: 46}, (_, i) => ({at: FIRE_AT + i * 0.022, lx: -1.2 - (i % 5) * 0.06, ly: 0.2 + ((i * 7) % 9) * 0.19, lz: 0.2 + ((i * 5) % 7) * 0.05 - 0.15, spin: (i % 7) - 3}));
const MOUND_H = 2.15;

const ShotOffice: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_FPS;
  const walk = runAlong((tt) => ({x: lerp(-1.3, 0.0, smooth(clamp01((tt - 0.3) / 0.7))), z: 0.35}), t, 0.35);
  const moving = t > 0.3 && t < 1.0;
  const cardK = smooth(clamp01((t - 1.05) / 0.15));
  const base = moving ? walk.spec : idleSpec(frame, 0.3);
  const buried = t > FIRE_AT + 0.75;
  let spec: BodySpec = {...base, nearArm: [lerp(base.nearArm[0], 150, cardK), lerp(base.nearArm[1], 5, cardK)]};
  if (buried) spec = {...idleSpec(frame, 0.3), nearArm: [178, 2], farArm: [6, 10]};
  const mound = smooth(clamp01((t - FIRE_AT - 0.1) / 0.8));
  const screenOn = t < FIRE_AT ? Math.floor(t * 5) % 2 === 0 : true;
  const wide = t >= 2.35;
  const twitch = t > 2.85 && t < 3.05 ? 6 * Math.sin(t * 60) : 0;
  const cam: Cam = wide ? {position: v3(0.0, 1.9, 4.6), target: v3(0.1, 1.15, 0), fov: 46} : {position: v3(0.5, 1.5, 3.5), target: v3(0.5, 1.1, -0.1), fov: 46};
  const jx = moving || t <= 0.3 ? walk.pos.x : 0.0;
  return (
    <Day cam={cam} centre={v3(0.3, 0, 0)} bg="#e6dcc8">
      <mesh geometry={plane} material={carpet} rotation={[-Math.PI / 2, 0, 0]} scale={[20, 20, 1]} receiveShadow />
      <mesh geometry={plane} material={beige} position={[0, 3, -1.6]} scale={[16, 6, 1]} receiveShadow />
      {[-1.9, 2.1].map((x) => (
        <mesh key={x} geometry={box(0.06, 1.3, 2.2)} material={partition} position={[x, 0.65, -0.5]} castShadow />
      ))}
      <mesh geometry={box(4.0, 1.3, 0.06)} material={partition} position={[0.1, 0.65, -1.5]} />
      <mesh geometry={box(1.3, 0.06, 0.8)} material={deskMat} position={[PRINTER.x, 0.74, PRINTER.z]} castShadow receiveShadow />
      {[-0.6, 0.6].map((x) => (
        <mesh key={x} geometry={box(0.05, 0.72, 0.7)} material={deskMat} position={[PRINTER.x + x, 0.36, PRINTER.z]} />
      ))}
      <group position={[PRINTER.x + 0.05 + (t >= FIRE_AT && t < FIRE_AT + 1 ? 0.01 * Math.sin(t * 90) : 0), PRINTER.y, PRINTER.z]} rotation={[0, -0.3, 0]}>
        <mesh geometry={box(0.6, 0.36, 0.48)} material={printerMat} castShadow />
        <mesh geometry={box(0.04, 0.05, 0.36)} material={blackMat} position={[-0.3, 0.02, 0]} />
        <mesh geometry={plane} position={[0, 0.02, 0.241]} scale={[0.5, 0.19, 1]}>
          <meshBasicMaterial map={jamTex(screenOn)} />
        </mesh>
      </group>
      {/* paper fired at Jimmy */}
      {SHEETS.map((s, i) => {
        const p = clamp01((t - s.at) / 0.28);
        if (p <= 0 || (p >= 1 && mound > 0.6)) return null;
        const x = lerp(PRINTER.x - 0.35, jx + s.lx * 0.2 + 0.05, p);
        const y = lerp(PRINTER.y + 0.02, Math.min(s.ly, 0.15 + MOUND_H * mound), p) + Math.sin(p * Math.PI) * 0.25;
        return <mesh key={i} geometry={plane} material={paperMat} position={[x, y, 0.35 + s.lz]} rotation={[s.spin * p, s.spin * 0.7 * p, 0.3 * s.spin * p]} scale={[0.21, 0.297, 1]} />;
      })}
      <Actor style={JIMMY} x={jx} z={0.35} yaw={moving ? walk.yaw : 0.15} spec={spec} frame={frame} look={DEADPAN(0, t)}>
        {(pose) => (buried ? <mesh geometry={smallWhistle} material={whistleMat} position={handLocal(pose, false).add(v3(0, 0.05 + 0.01 * twitch, 0))} rotation={[0, 0, twitch * 0.05]} /> : t >= 1.1 ? <Card pose={pose} red /> : null)}
      </Actor>
      {/* the paper mountain */}
      {mound > 0 ? (
        <group position={[jx, 0, 0.35]}>
          <mesh geometry={ball} material={paperMat} scale={[0.95 * (0.4 + 0.6 * mound), MOUND_H * mound, 0.8 * (0.4 + 0.6 * mound)]} castShadow receiveShadow />
          {Array.from({length: 16}, (_, i) => (
            <mesh key={i} geometry={plane} material={paperMat} position={[Math.cos(i * 2.1) * 0.6 * mound, MOUND_H * mound * (0.3 + ((i * 3) % 7) / 10), 0.55 * mound + Math.sin(i * 2.1) * 0.25]} rotation={[i, i * 0.7, i * 0.3]} scale={[0.21, 0.297, 1]} />
          ))}
        </group>
      ) : null}
    </Day>
  );
};

// ---------------------------------------------------------------- LESSON 5: factory
const ShotFactory: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_FPS;
  const HOP = 0.75;
  const RIDE = 1.15;
  const SLAM = 2.7;
  const hop = smooth(clamp01((t - HOP) / 0.35));
  const startX = -3.4 + 1.5 * 0.85 + RIDE * BELT_SPEED; // the gap between boxes 1 and 2
  const x = t < RIDE ? startX : Math.min(PRESS_X, startX + (t - RIDE) * BELT_SPEED);
  const z = lerp(0.85, 0.05, hop);
  const y = t < HOP ? 0 : t < RIDE ? Math.sin(hop * Math.PI) * 0.35 + BELT_Y * hop : BELT_Y;
  const flagK = smooth(clamp01((t - 0.35) / 0.15));
  const base = idleSpec(frame, 0.4);
  const raise: BodySpec = {...base, nearArm: [lerp(base.nearArm[0], 172, flagK), lerp(base.nearArm[1], 4, flagK)]};
  const spec = t < HOP ? raise : t < RIDE ? {...raise, near: {thigh: 30, knee: 50}, far: {thigh: -10, knee: 30}} : {...POINT, nearArm: [94, 4] as [number, number]};
  const talk = t >= 1.45 && t < 2.25 ? 1 : 0;
  const head = t < SLAM - 0.12 ? 1.6 : smooth(clamp01((SLAM - t) / 0.12)) * 1.6;
  const crushed = t >= SLAM;
  const cam: Cam = {position: v3(lerp(0.1, 1.5, smooth(clamp01((t - 1.0) / 1.6))), 2.0, 4.6), target: v3(lerp(0.0, 1.7, smooth(clamp01((t - 1.0) / 1.6))), 0.95, 0), fov: 46};
  const shake = crushed && t < SLAM + 0.25 ? 0.05 * Math.sin(t * 90) : 0;
  return (
    <Day cam={{...cam, position: cam.position.clone().add(v3(shake, shake, 0))}} centre={v3(0.5, 0, 0)} bg="#5b6068">
      <Factory t={t} head={head} />
      {!crushed ? (
        <Actor style={JIMMY} x={x} z={z} y={y} yaw={t < RIDE ? -0.2 : 0} spec={spec} frame={frame} look={DEADPAN(talk, t)} />
      ) : null}
    </Day>
  );
};

// ---------------------------------------------------------------- ENDING: the gravestone
const grass = mat('#5f9a45', 0.95);
const stoneMat = () =>
  keep('stoneMat', () => {
    const tex = canvasTex(256, 320, (g) => {
      g.fillStyle = '#9ea3a8';
      g.fillRect(0, 0, 256, 320);
      g.fillStyle = '#2f3338';
      g.textAlign = 'center';
      g.font = 'bold 58px serif';
      g.fillText('R.I.P.', 128, 110);
      g.font = 'bold 46px serif';
      g.fillText('HE WAS', 128, 200);
      g.fillText('RIGHT', 128, 254);
    });
    return new MeshStandardMaterial({map: tex, roughness: 0.9});
  });
const ShotEnd: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_FPS;
  const pan = smooth(clamp01((t - 0.1) / 1.0));
  const cam: Cam = {position: v3(lerp(0.0, 0.4, pan), lerp(0.7, 1.0, pan), lerp(1.4, 3.9, pan)), target: v3(lerp(0.0, 0.4, pan), lerp(0.55, 1.3, pan), 0), fov: 44};
  return (
    <Day cam={cam} centre={v3(0.3, 0, 0)} bg="#f2c7a3" sky="#ffe2c4" ground="#6f9a55">
      <mesh geometry={plane} material={grass} rotation={[-Math.PI / 2, 0, 0]} scale={[30, 30, 1]} receiveShadow />
      <group position={[0, 0, 0]}>
        <mesh geometry={box(0.5, 0.62, 0.12)} material={[mat('#9ea3a8', 0.9), mat('#9ea3a8', 0.9), mat('#9ea3a8', 0.9), mat('#9ea3a8', 0.9), stoneMat(), mat('#9ea3a8', 0.9)]} position={[0, 0.31, 0]} castShadow />
        <mesh geometry={new CylinderGeometry(0.25, 0.25, 0.12, 24, 1, false, 0, Math.PI)} material={mat('#9ea3a8', 0.9)} position={[0, 0.62, 0]} rotation={[Math.PI / 2, Math.PI / 2, 0]} castShadow />
        <mesh geometry={whistleGeo} material={whistleMat} position={[0.02, 0.89, 0]} rotation={[0, 0.4, Math.PI / 2]} castShadow />
      </group>
      <Actor style={JIMMY} x={0.75} z={0.15} yaw={-Math.PI / 2 + 0.25} spec={idleSpec(frame, 0.5)} frame={frame} look={DEADPAN(0, t)} />
    </Day>
  );
};

// ---------------------------------------------------------------- overlays
const LessonBanner: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const t = frame / fps;
  const l = [...LESSONS].reverse().find((x) => t >= x.at);
  const next = l ? (LESSONS[LESSONS.indexOf(l) + 1]?.at ?? T_END) : 0;
  if (!l || t >= next) return null;
  const local = frame - F(l.at);
  const s = spring({frame: local, fps, config: {damping: 12, stiffness: 200}});
  const failF = local - F(l.fail);
  const stamp = failF >= 0 ? Math.max(1, 2.4 - failF * 0.35) : 0;
  return (
    <div style={{position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateY(${(1 - s) * -160}px)`}}>
      <div style={{position: 'relative', background: '#fffdf4', borderRadius: 18, padding: '14px 34px 16px', boxShadow: '0 10px 30px rgba(0,0,0,.35)', border: '5px solid #1d2b4f', textAlign: 'center', fontFamily: FONT}}>
        <div style={{fontWeight: 900, fontSize: 30, letterSpacing: 4, color: '#e5262b'}}>LESSON {l.n}</div>
        <div style={{fontWeight: 900, fontSize: 64, color: '#1d2b4f', lineHeight: 1}}>{l.name}</div>
        {stamp > 0 ? (
          <div style={{position: 'absolute', right: -46, top: -34, width: 120, height: 120, transform: `scale(${stamp}) rotate(-8deg)`, opacity: Math.min(1, failF / 2 + 0.4)}}>
            {[45, -45].map((r) => (
              <div key={r} style={{position: 'absolute', left: 6, top: 48, width: 108, height: 24, borderRadius: 8, background: '#e5262b', transform: `rotate(${r}deg)`, boxShadow: '0 4px 10px rgba(0,0,0,.4)'}} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
};

const HookCaption: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame >= F(T_TITLE)) return null;
  const s = spring({frame: frame - 3, fps, config: {damping: 9, stiffness: 260}});
  return (
    <div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 150, color: '#fff', WebkitTextStroke: '6px #111', textShadow: '0 10px 0 #111', transform: `scale(${frame < 3 ? 0 : s})`}}>
      HOW?
    </div>
  );
};

/** Retro safety-video title: a clipboard with a checklist and Jimmy's grinning headshot. */
const TitleCard: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame, fps, config: {damping: 11, stiffness: 180}});
  const check = (i: number) => clamp01((frame - 10 - i * 5) / 4);
  return (
    <AbsoluteFill style={{background: 'linear-gradient(180deg,#1f6f8b 0%,#134a63 100%)', alignItems: 'center', fontFamily: FONT}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.04) 0 2px, transparent 2px 6px)'}} />
      <div style={{marginTop: 210, fontWeight: 900, fontSize: 104, color: '#ffd21a', textShadow: '0 8px 0 #0b2a38', letterSpacing: 2, transform: `scale(${s})`, textAlign: 'center', lineHeight: 0.95}}>
        WORKPLACE
        <br />
        SAFETY
      </div>
      <div style={{fontWeight: 800, fontSize: 64, color: '#fff', fontStyle: 'italic', marginTop: 8, transform: `scale(${s})`}}>with JIMMY</div>
      <div style={{position: 'relative', marginTop: 50, width: 640, height: 820, background: '#a8743f', borderRadius: 28, boxShadow: '0 20px 40px rgba(0,0,0,.45)', transform: `translateY(${(1 - s) * 500}px) rotate(-3deg)`}}>
        <div style={{position: 'absolute', left: 40, right: 40, top: 70, bottom: 40, background: '#fbfaf4', borderRadius: 8}} />
        <div style={{position: 'absolute', left: 220, top: -24, width: 200, height: 80, background: 'linear-gradient(180deg,#d9dde2,#8d939b)', borderRadius: 14}} />
        <div style={{position: 'absolute', left: 170, top: 110, width: 300, height: 300, borderRadius: 150, overflow: 'hidden', border: '8px solid #1d2b4f', background: '#bfe3ff'}}>
          <JimmyPortrait />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{position: 'absolute', left: 90, top: 470 + i * 95, display: 'flex', alignItems: 'center', gap: 26}}>
            <div style={{width: 58, height: 58, border: '6px solid #1d2b4f', borderRadius: 8, position: 'relative'}}>
              <div style={{position: 'absolute', left: 8, top: -6, width: 22, height: 44, borderRight: '10px solid #22a34a', borderBottom: '10px solid #22a34a', transform: `rotate(40deg) scale(${check(i)})`}} />
            </div>
            <div style={{width: 340, height: 16, borderRadius: 8, background: '#c8ccd3'}} />
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
const JimmyPortrait: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <ThreeCanvas width={300} height={300} frameloop="demand" dpr={1} gl={{antialias: true, alpha: true}} camera={{fov: 22, position: [0, 2, 5]}}>
      <CameraRig cam={{position: v3(2.2, 1.62, 0.25), target: v3(0, 1.52, 0.02), fov: 22}} />
      <Environment intensity={0.6} />
      <ambientLight intensity={1.4} />
      <directionalLight position={[3, 4, 3]} intensity={2.2} />
      <Actor style={JIMMY} x={0} z={0} yaw={0} spec={idleSpec(frame, 0)} frame={frame} look={{tired: 0, droop: -4, eyesClosed: false, brows: 0.2, browLift: 0.5, mouth: 'grin', noBlink: true}} shadow={false} />
    </ThreeCanvas>
  );
};

const JOBS = ['CONSTRUCTION', 'KITCHEN', 'OFFICE', 'NIGHT SHIFT', 'FACTORY'];
const EndOverlay: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const head = spring({frame: frame - 6, fps, config: {damping: 10, stiffness: 220}});
  return (
    <AbsoluteFill style={{fontFamily: FONT, alignItems: 'center'}}>
      <div style={{marginTop: 170, fontWeight: 900, fontSize: 120, color: '#fff', WebkitTextStroke: '5px #1d2b4f', textShadow: '0 9px 0 #1d2b4f', transform: `scale(${frame < 6 ? 0 : head})`}}>WORST JOB?</div>
      <div style={{marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center'}}>
        {JOBS.map((j, i) => {
          const s = spring({frame: frame - 20 - i * 5, fps, config: {damping: 9, stiffness: 260}});
          return (
            <div key={j} style={{display: 'flex', alignItems: 'center', gap: 18, transform: `scale(${frame < 20 + i * 5 ? 0 : s}) rotate(${i % 2 ? 2 : -2}deg)`, background: '#fffdf4', border: '5px solid #1d2b4f', borderRadius: 16, padding: '6px 26px 6px 8px', boxShadow: '0 8px 18px rgba(0,0,0,.3)'}}>
              <div style={{width: 64, height: 64, borderRadius: 12, background: '#e5262b', color: '#fff', fontWeight: 900, fontSize: 46, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>{i + 1}</div>
              <div style={{fontWeight: 900, fontSize: 44, color: '#1d2b4f', width: 330}}>{j}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const CUES: Cue[] = [
  {from: F(T_L1 + 1.2), to: F(T_L1 + 2.45), text: 'DANGEROUS PLAY.', hl: {'PLAY.': '#ffd23a'}, top: 1150},
  {from: F(T_L5 + 1.45), to: F(T_L5 + 2.35), text: 'OFFSIDE.', hl: {'OFFSIDE.': '#ffd23a'}, top: 1150},
];

// ---------------------------------------------------------------- sound
type S = {at: number; src: string; vol?: number; dur?: number};
const SOUNDS: S[] = [
  // hook
  {at: 0.0, src: 'short-safety/press.wav', vol: 0.9},
  {at: 0.95, src: 'short-safety/peep.wav', vol: 0.8},
  {at: 1.3, src: 'ep5/scratch.wav', vol: 0.5},
  // title
  {at: T_TITLE, src: 'short-safety/jingle.wav', vol: 0.7},
  {at: T_TITLE + 0.12, src: 'short-safety/nar-title.mp3', vol: 1.1},
  // 1 construction
  {at: T_L1, src: 'short-safety/crane-hum.wav', vol: 0.5, dur: 2.5},
  {at: T_L1 + 0.2, src: 'short-safety/peep.wav', vol: 0.8},
  {at: T_L1 + 1.2, src: 'short-safety/j-dangerous.mp3', vol: 1.25},
  {at: T_L1 + DROP_AT + DROP_LEN, src: 'short-safety/clang.wav', vol: 0.9},
  {at: T_L1 + DROP_AT + DROP_LEN + 0.12, src: 'short-safety/boing.wav', vol: 0.7},
  {at: T_L1 + 2.85, src: 'ep5/stamp.wav', vol: 0.7},
  {at: T_L1 + 3.0, src: 'ep4/twinkle.wav', vol: 0.5},
  // 2 kitchen
  {at: T_L2 + DUEL_AT, src: 'short-safety/duel.wav', vol: 0.75},
  {at: T_L2 + BOOM_AT, src: 'short-safety/boom.wav', vol: 1},
  {at: T_L2 + 2.45, src: 'ep5/stamp.wav', vol: 0.7},
  {at: T_L2 + BOOM_AT + 0.85, src: 'short-safety/blink.wav', vol: 0.9},
  // 3 office
  {at: T_L3 + 0.0, src: 'short-safety/beep.wav', vol: 0.7},
  {at: T_L3 + 1.05, src: 'short-safety/peep.wav', vol: 0.8},
  {at: T_L3 + FIRE_AT, src: 'short-safety/fwip.wav', vol: 0.8},
  {at: T_L3 + 2.55, src: 'ep5/stamp.wav', vol: 0.7},
  {at: T_L3 + 2.9, src: 'short-safety/peep-muffled.wav', vol: 1},
  // 4 night shift (timings as in the preview)
  {at: T_L4, src: 'short-safety/drone.wav', vol: 0.7},
  {at: T_L4 + 0.8, src: 'short-safety/scuba-beat.wav', vol: 0.8, dur: 1.8},
  {at: T_L4 + 2.6, src: 'ep5/scratch.wav', vol: 0.5},
  {at: T_L4 + 3.23, src: 'short-safety/bang.wav', vol: 0.9},
  {at: T_L4 + 3.28, src: 'short-safety/pigeons.wav', vol: 0.55},
  {at: T_L4 + 3.9, src: 'ep4/twinkle.wav', vol: 0.5},
  {at: T_L4 + 3.95, src: 'ep5/stamp.wav', vol: 0.7},
  // 5 factory
  {at: T_L5, src: 'short-safety/conveyor.wav', vol: 0.6, dur: 2.7},
  {at: T_L5 + 0.35, src: 'short-safety/peep.wav', vol: 0.8},
  {at: T_L5 + 1.45, src: 'short-safety/j-offside.mp3', vol: 1.25},
  {at: T_L5 + 2.7, src: 'short-safety/press.wav', vol: 0.9},
  {at: T_L5 + 3.0, src: 'ep5/stamp.wav', vol: 0.7},
  {at: T_L5 + 2.8 + 0.85, src: 'short-safety/peep.wav', vol: 0.8},
  // ending
  {at: T_END + 0.15, src: 'short-safety/nar-end.mp3', vol: 1.15},
];

// ---------------------------------------------------------------- composition
export const ShortWorkplaceSafety: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seq = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={F(from)} durationInFrames={F(to) - F(from)}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{backgroundColor: '#111'}}>
      {seq(0, T_TITLE, <ShotCube />)}
      {seq(T_TITLE, T_L1, <TitleCard frame={frame - F(T_TITLE)} fps={fps} />)}
      {seq(T_L1, T_L2, <ShotConstruction />)}
      {seq(T_L2, T_L3, <ShotKitchen />)}
      {seq(T_L3, T_L4, <ShotOffice />)}
      {seq(T_L4, T_L4 + 0.8, <ShotGang />)}
      {seq(T_L4 + 0.8, T_L4 + 2.6, <ShotDance from={F(0.8)} />)}
      {seq(T_L4 + 2.6, T_L4 + 3.2, <ShotLook from={F(2.6)} />)}
      {seq(T_L4 + 3.2, T_L4 + 3.8, <ShotBang />)}
      {seq(T_L4 + 3.8, T_L5, <ShotDown />)}
      {seq(T_L5, T_L5 + 2.8, <ShotFactory />)}
      {seq(T_L5 + 2.8, T_END, <ShotCube t0={0.1} />)}
      {seq(T_END, SAFETY_FRAMES / SAFETY_FPS, <ShotEnd />)}
      <HookCaption frame={frame} fps={fps} />
      <LessonBanner frame={frame} fps={fps} />
      <Captions cues={CUES} frame={frame} fps={fps} />
      {frame >= F(T_END) ? <EndOverlay frame={frame - F(T_END)} fps={fps} /> : null}
      <CommentButton frame={frame} fps={fps} from={F(T_END + 1.6)} to={SAFETY_FRAMES} />
      {SOUNDS.map((s, i) => (
        <Sequence key={i} from={F(s.at)} durationInFrames={s.dur ? F(s.dur) : undefined}>
          <Audio src={staticFile(s.src)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
