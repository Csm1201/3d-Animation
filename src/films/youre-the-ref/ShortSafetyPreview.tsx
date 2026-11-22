/**
 * Preview of the "Workplace Safety with Jimmy" Short, Lesson 4 (Night Shift). Script: docs/scripts/ref-short-workplace-safety-script.md
 *
 *   0.0  low angle on the gang: four mobsters glaring, tommy guns held at the hip
 *   0.8  Jimmy, deadpan, does the scuba dance right in front of them (nose pinched, arm waving, knees bouncing lower and lower)
 *   2.6  the music cuts out; the mobsters look at each other
 *   3.2  outside the alley: a flash on the brick wall, BANG, pigeons scatter (nothing else shown)
 *   3.8  Jimmy flat on his back in a small pool of blood, halo spinning, whistle rolling away
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import {useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BoxGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SphereGeometry, TorusGeometry, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {CameraRig, Daylight, Environment} from '../../character3d/stage';
import {Cam} from '../../character3d/stage';
import {canvasTex, once} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor} from './Episode2';
import {DEADPAN, handLocal, JIMMY} from './Episode4';
import {yawFor} from './Players';
import {HEIGHT, WIDTH} from '../../core/constants';

export const SAFETY_PREVIEW_FPS = 30;
export const SAFETY_PREVIEW_FRAMES = 135; // 4.5 s
const F = (s: number) => Math.round(s * SAFETY_PREVIEW_FPS);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

// ---------------------------------------------------------------- cast
const mobster = (skin: string, hair: string, band: string): Style => ({
  outfit: 'kit',
  skin,
  hair,
  hairStyle: 'short',
  kit: {shirt: '#2a2c33', shorts: '#2a2c33', socks: '#15151a', trim: '#4a4c55', longSleeves: true, trousers: true},
  hat: {kind: 'fedora', color: '#18181d', band},
});
export const MOBS = [
  {st: mobster('#e9b991', '#2b211c', '#7a1c1c'), x: 1.3, z: 0.95},
  {st: mobster('#c98f6b', '#1f1714', '#1c3a7a'), x: 1.4, z: -0.85},
  {st: mobster('#f1c3a0', '#6b4a32', '#7a1c1c'), x: 2.05, z: 1.35},
  {st: mobster('#a8714f', '#141010', '#3a3a3a'), x: 2.15, z: -1.4},
];
/** Menacing stance: shoulders forward, a tommy gun held at the hip pointing down at the ground, a slow breath. */
export const MENACE = (t: number, i: number): BodySpec => {
  const s = idleSpec(Math.round(t * 30) + i * 17, 0.04);
  const legs = {near: {thigh: 12, knee: 8, foot: 0}, far: {thigh: -12, knee: 8, foot: 0}};
  return {...s, ...legs, lean: 8 + (i % 2) * 3, headTilt: -9, nearArm: [26 + 3 * Math.sin(t * 2 + i), 58], farArm: [48, 34]};
};
export const GLARE: Look = {tired: 0.2, droop: -5, eyesClosed: false, brows: -1, browLift: -0.45, mouth: 'flat', noBlink: true};

// ---------------------------------------------------------------- set
const brickTex = () =>
  once('alleyBrick', () => {
    const t = canvasTex(512, 512, (g) => {
      g.fillStyle = '#2a1d1a';
      g.fillRect(0, 0, 512, 512);
      const bw = 64, bh = 26;
      for (let r = 0; r < 512 / bh + 1; r++)
        for (let c = -1; c < 512 / bw + 1; c++) {
          const x = c * bw + (r % 2 ? bw / 2 : 0);
          const sh = 60 + ((r * 31 + c * 17) % 7) * 6;
          g.fillStyle = `rgb(${sh + 40},${sh - 18},${sh - 28})`;
          g.fillRect(x + 3, r * bh + 3, bw - 6, bh - 6);
        }
    });
    t.wrapS = t.wrapT = RepeatWrapping;
    t.repeat.set(4, 2);
    return t;
  });
const asphalt = new MeshStandardMaterial({color: '#23252b', roughness: 0.95});
const steel = new MeshStandardMaterial({color: '#4a4f57', roughness: 0.6, metalness: 0.5});
const rust = new MeshStandardMaterial({color: '#6b3b22', roughness: 0.85, metalness: 0.2});
const bulbMat = new MeshBasicMaterial({color: '#ffe3a1'});
const flashMat = new MeshBasicMaterial({color: '#fff3c4', transparent: true});
const pigeonMat = new MeshStandardMaterial({color: '#6c7380', roughness: 0.8});
export const haloMat = new MeshStandardMaterial({color: '#ffd84a', emissive: '#ffcf33', emissiveIntensity: 1.2, roughness: 0.3});
export const whistleMat = new MeshStandardMaterial({color: '#cfd4da', roughness: 0.25, metalness: 0.8});
const groundGeo = new PlaneGeometry(40, 40);
const wallGeo = new PlaneGeometry(16, 8);
const barrelGeo = new CylinderGeometry(0.3, 0.3, 0.9, 20);
const poleGeo = new CylinderGeometry(0.05, 0.06, 4.2, 10);
const armGeo = new BoxGeometry(0.7, 0.05, 0.05);
const bulbGeo = new SphereGeometry(0.11, 16, 12);
const pigeonGeo = new SphereGeometry(0.12, 12, 8);
const wingGeo = new BoxGeometry(0.12, 0.01, 0.34);
export const haloGeo = new TorusGeometry(0.16, 0.025, 12, 32);
const gunMetal = new MeshStandardMaterial({color: '#2b2d31', roughness: 0.4, metalness: 0.7});
const gunWood = new MeshStandardMaterial({color: '#7a4a28', roughness: 0.6});
const recvGeo = new BoxGeometry(0.3, 0.07, 0.05);
const barrelG = new CylinderGeometry(0.012, 0.012, 0.22, 10);
const jacketGeo = new CylinderGeometry(0.024, 0.024, 0.14, 14);
const drumGeo = new CylinderGeometry(0.075, 0.075, 0.045, 24);
const stockGeo = new BoxGeometry(0.22, 0.06, 0.035);
const gripGeo = new BoxGeometry(0.035, 0.09, 0.03);
/** A 1920s-style drum-fed tommy gun, muzzle along +x, origin at the pistol grip (where the hand goes). */
export const TommyGun: React.FC = () => (
  <group position={[0.03, 0.07, 0]}>
    <mesh geometry={recvGeo} material={gunMetal} position={[0.05, 0, 0]} castShadow />
    <mesh geometry={barrelG} material={gunMetal} position={[0.31, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
    <mesh geometry={jacketGeo} material={gunMetal} position={[0.24, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
    <mesh geometry={drumGeo} material={gunMetal} position={[0.08, -0.08, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow />
    <mesh geometry={stockGeo} material={gunWood} position={[-0.2, -0.02, 0]} castShadow />
    <mesh geometry={gripGeo} material={gunWood} position={[-0.03, -0.07, 0]} />
    <mesh geometry={gripGeo} material={gunWood} position={[0.2, -0.06, 0]} />
  </group>
);
export const bloodMat = new MeshStandardMaterial({color: '#6e0a0e', roughness: 0.15, metalness: 0.1});
export const bloodGeo = new CylinderGeometry(1, 1, 0.004, 40);
export const whistleGeo = new CylinderGeometry(0.03, 0.03, 0.08, 14);
const blockGeo = new BoxGeometry(6, 9, 6);

export const Night: React.FC<{cam: Cam; centre: Vector3; flicker: number; children: React.ReactNode}> = ({cam, centre, flicker, children}) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
    <color attach="background" args={['#070a16']} />
    <fog attach="fog" args={['#070a16', 9, 30]} />
    <CameraRig cam={{...cam, far: 120}} />
    <Environment intensity={0.12} />
    <Daylight center={centre} extent={6} offset={[-3, 9, 3]} color="#ffcf8a" intensity={1.9 * flicker} sky="#2b3766" ground="#141418" fill={0.55} />
    {children}
  </ThreeCanvas>
);

export const Alley: React.FC<{flicker: number}> = ({flicker}) => (
  <group>
    <mesh geometry={groundGeo} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
    <mesh geometry={wallGeo} position={[1, 4, -1.8]} receiveShadow>
      <meshStandardMaterial map={brickTex()} roughness={0.9} />
    </mesh>
    <mesh geometry={wallGeo} position={[-3.6, 4, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
      <meshStandardMaterial map={brickTex()} roughness={0.9} />
    </mesh>
    <mesh geometry={barrelGeo} material={rust} position={[2.6, 0.45, -1.55]} castShadow receiveShadow />
    <group position={[-1.3, 0, -1.4]}>
      <mesh geometry={poleGeo} material={steel} position={[0, 2.1, 0]} castShadow />
      <mesh geometry={armGeo} material={steel} position={[0.33, 4.15, 0]} />
      <mesh geometry={bulbGeo} material={bulbMat} position={[0.62, 4.05, 0]} scale={[1, 0.6, 1]} visible={flicker > 0.5} />
    </group>
    <pointLight position={[-0.7, 3.9, -1.4]} intensity={9 * flicker} distance={12} decay={1.6} color="#ffc977" />
  </group>
);

// ---------------------------------------------------------------- shots
export const Gang: React.FC<{t: number; frame: number; look: (i: number) => Look; raise?: number}> = ({t, frame, look, raise = 0}) => (
  <>
    {MOBS.map((m, i) => (
      <Actor key={i} style={m.st} x={m.x} z={m.z} yaw={yawFor(0 - m.x, 0.3 - m.z)} spec={i === 0 && raise > 0 ? {...MENACE(t, i), nearArm: [lerp(26, 62, raise), lerp(58, 40, raise)], farArm: [lerp(48, 80, raise), lerp(34, 20, raise)]} : MENACE(t, i)} frame={frame + i * 9} look={look(i)}>
        {(pose) => (
          // held at the hip, muzzle angled down at the ground in front of them
          <group position={handLocal(pose, false).add(v3(0, 0, -0.15))} rotation={[0, 0, i === 0 ? lerp(-0.5, -0.02, raise) : -0.5]}>
            <TommyGun />
          </group>
        )}
      </Actor>
    ))}
  </>
);

/** Low angle on the gang, from Jimmy's side: they glare down at him. */
export const ShotGang: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS;
  const push = smooth(clamp01(t / 0.8));
  const cam: Cam = {position: v3(lerp(-3.0, -2.55, push), 0.7, 0.2), target: v3(1.6, 1.35, 0.1), fov: 52};
  return (
    <Night cam={cam} centre={v3(1.8, 0, 0)} flicker={t > 0.5 && t < 0.56 ? 0.35 : 1}>
      <Alley flicker={t > 0.5 && t < 0.56 ? 0.35 : 1} />
      <Gang t={t} frame={frame} look={() => GLARE} />
    </Night>
  );
};

/** Jimmy does the scuba dance: nose pinched, far arm out and waving, knees bouncing lower and lower. */
const BEAT = 0.4; // 150 bpm
export const danceSpec = (t: number, frame: number): {spec: BodySpec; sway: number; into: number} => {
  const into = smooth(clamp01(t / 0.18));
  const bounce = Math.abs(Math.sin((Math.PI * t) / BEAT));
  const sink = smooth(clamp01(t / 1.6)); // goes "deeper" as the song goes on
  const wave = Math.sin((2 * Math.PI * t) / BEAT);
  const base = idleSpec(frame, 0.05);
  const knee = (30 + 22 * sink) * bounce + 12 + 18 * sink;
  return {
    into,
    sway: 0.12 * wave * into,
    spec: {
      lean: lerp(0, 14 + 6 * sink, into),
      headTilt: lerp(0, -6, into),
      near: {thigh: lerp(base.near.thigh, knee * 0.55, into), knee: lerp(base.near.knee, knee, into), foot: 0},
      far: {thigh: lerp(base.far.thigh, knee * 0.55 - 6, into), knee: lerp(base.far.knee, knee, into), foot: 0},
      // near hand pinches his nose; far arm straight out, rippling up and down like a fin
      nearArm: [lerp(base.nearArm[0], 30, into), lerp(base.nearArm[1], 138, into)],
      farArm: [lerp(base.farArm[0], 86 + 9 * wave, into), lerp(base.farArm[1], 8 + 22 * Math.max(0, -wave), into)],
    },
  };
};
export const DancingJimmy: React.FC<{t: number; frame: number}> = ({t, frame}) => {
  const d = danceSpec(t, frame);
  return <Actor style={{...JIMMY, nearHandZ: d.into > 0.5 ? 0.03 : undefined}} x={0} z={0.3} yaw={0.5 + d.sway} spec={d.spec} frame={frame} look={{...DEADPAN(0, t), yaw: 6, mouth: 'flat'}} />;
};
/** view 'behind': from behind the gang, Jimmy dancing straight at them. 'side': low and close on Jimmy, guns in the foreground. */
export const ShotDance: React.FC<{from: number; t0?: number; view?: 'behind' | 'side'; len?: number}> = ({from, t0 = 0, view = 'behind', len = 1.8}) => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS + t0;
  const k = (t - t0) / len;
  const cam: Cam =
    view === 'behind'
      ? {position: v3(lerp(3.7, 3.35, k), 1.3, 0.3), target: v3(0, 0.95, 0.3), fov: 44}
      : {position: v3(lerp(2.2, 1.95, k), 0.9, 0.12), target: v3(0.0, 0.85, 0.3), fov: 48};
  return (
    <Night cam={cam} centre={v3(1.0, 0, 0)} flicker={1}>
      <Alley flicker={1} />
      <DancingJimmy t={t} frame={frame + Math.round(t0 * SAFETY_PREVIEW_FPS)} />
      <Gang t={(from + frame) / SAFETY_PREVIEW_FPS} frame={from + frame} look={() => GLARE} />
    </Night>
  );
};

/** The music cuts out; the mobsters look at each other. */
export const ShotLook: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS;
  const cam: Cam = {position: v3(-0.9, 1.5, 0.2), target: v3(1.75, 1.45, 1.1), fov: 40};
  const yaws = [-38, 34, -30, 40];
  return (
    <Night cam={cam} centre={v3(2, 0, 0)} flicker={1}>
      <Alley flicker={1} />
      <Gang t={(from + frame) / SAFETY_PREVIEW_FPS} frame={from + frame} look={(i) => ({...GLARE, yaw: yaws[i] * smooth(clamp01((t - 0.05) / 0.2))})} />
    </Night>
  );
};

/** Outside the alley: a flash on the wall, BANG, pigeons scatter. Nothing else is shown. */
const PIGEONS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({x: -2.6 + i * 0.85 + (i % 2) * 0.25, vx: (i - 3) * 0.9, vy: 3.2 + (i % 3) * 0.7, ph: i * 1.3}));
export const ShotBang: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS;
  const flash = t >= 0.1 && t < 0.2 ? 1 : t >= 0.2 && t < 0.27 ? 0.35 : 0;
  const fly = Math.max(0, t - 0.14);
  const cam: Cam = {position: v3(0, 2.6, 15.5), target: v3(0, 4.6, -2), fov: 50};
  return (
    <Night cam={cam} centre={v3(0, 0, 0)} flicker={0.5}>
      <mesh geometry={groundGeo} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
      {/* two buildings, the alley is the dark gap between them */}
      {[-4.1, 4.1].map((x) => (
        <mesh key={x} geometry={blockGeo} position={[x, 4.5, -3]} receiveShadow castShadow>
          <meshStandardMaterial map={brickTex()} roughness={0.9} />
        </mesh>
      ))}
      <mesh geometry={wallGeo} position={[0, 4, -5.9]}>
        <meshStandardMaterial map={brickTex()} roughness={0.9} />
      </mesh>
      {/* the flash: a burst of light deep in the alley */}
      <pointLight position={[0, 1.2, -4.5]} intensity={160 * flash} distance={14} decay={1.4} color="#fff0c0" />
      <mesh geometry={bulbGeo} material={flashMat} position={[0.1, 1.2, -4.6]} scale={4} visible={flash > 0.5} />
      {PIGEONS.map((p, i) => {
        const y = 9.15 + p.vy * fly;
        const flap = Math.sin(frame * 1.9 + p.ph);
        return (
          <group key={i} position={[p.x + p.vx * fly, y, -0.2]} rotation={[0, 0, p.vx * 0.2]} scale={2.2}>
            <mesh geometry={pigeonGeo} material={pigeonMat} scale={[1.3, 0.8, 0.8]} />
            {fly > 0 ? (
              <>
                <mesh geometry={wingGeo} material={pigeonMat} position={[0, 0.03, 0.15]} rotation={[flap * 0.9, 0, 0]} />
                <mesh geometry={wingGeo} material={pigeonMat} position={[0, 0.03, -0.15]} rotation={[-flap * 0.9, 0, 0]} />
              </>
            ) : null}
          </group>
        );
      })}
    </Night>
  );
};

/** Jimmy flat on his back, a halo spinning above him, his whistle rolling away. */
export const DOWN: BodySpec = {lean: 0, headTilt: 4, near: {thigh: 4, knee: 4, foot: 0}, far: {thigh: -6, knee: 6, foot: 0}, nearArm: [28, 10], farArm: [22, 14]};
const HEAD_Z = -1.05;
export const ShotDown: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS;
  const roll = Math.min(t, 0.5) * 1.1 + 0.08 * t;
  const cam: Cam = {position: v3(1.35, 1.35, 1.45), target: v3(0, 0.12, -0.45), fov: 50};
  return (
    <Night cam={cam} centre={v3(0, 0, 0)} flicker={t > 0.32 && t < 0.38 ? 0.35 : 1}>
      <Alley flicker={1} />
      {/* a dark pool under his upper body, slowly spreading */}
      <mesh geometry={bloodGeo} material={bloodMat} position={[0.05, 0.004, -0.55]} scale={[0.28 + 0.06 * smooth(clamp01(t / 0.7)), 1, 0.36 + 0.08 * smooth(clamp01(t / 0.7))]} receiveShadow />
      <mesh geometry={bloodGeo} material={bloodMat} position={[0.3, 0.005, -0.3]} scale={[0.12 + 0.04 * smooth(clamp01(t / 0.7)), 1, 0.1 + 0.03 * smooth(clamp01(t / 0.7))]} />
      <Actor style={JIMMY} x={0} z={0.45} yaw={-Math.PI / 2} pitch={90} y={0.16} spec={DOWN} frame={frame} look={{tired: 0, droop: 0, eyesClosed: true, mouth: 'open', mouthOpen: 0.2}} shadow={false} />
      <group position={[0, 0.5 + 0.03 * Math.sin(t * 6), HEAD_Z - 0.08]} rotation={[0.35, t * 5, 0]}>
        <mesh geometry={haloGeo} material={haloMat} rotation={[Math.PI / 2, 0, 0]} />
        <pointLight intensity={0.6} distance={1.5} color="#ffd84a" />
      </group>
      <mesh geometry={whistleGeo} material={whistleMat} position={[0.45 + roll * 0.8, 0.03, -0.2 + roll * 0.3]} rotation={[Math.PI / 2, 0, -roll * 6]} castShadow />
    </Night>
  );
};


export const ShortSafetyPreview: React.FC = () => {
  return (
    <AbsoluteFill style={{backgroundColor: '#070a16'}}>
      <Sequence from={0} durationInFrames={F(0.8)}>
        <ShotGang />
      </Sequence>
      <Sequence from={F(0.8)} durationInFrames={F(2.6) - F(0.8)}>
        <ShotDance from={F(0.8)} />
      </Sequence>
      <Sequence from={F(2.6)} durationInFrames={F(3.2) - F(2.6)}>
        <ShotLook from={F(2.6)} />
      </Sequence>
      <Sequence from={F(3.2)} durationInFrames={F(3.8) - F(3.2)}>
        <ShotBang />
      </Sequence>
      <Sequence from={F(3.8)}>
        <ShotDown />
      </Sequence>
      <Sequence from={0}>
        <Audio src={staticFile('short-safety/drone.wav')} volume={0.7} />
      </Sequence>
      <Sequence from={F(0.8)} durationInFrames={F(2.6) - F(0.8)}>
        <Audio src={staticFile('short-safety/scuba-beat.wav')} volume={0.8} />
      </Sequence>
      <Sequence from={F(2.6)}>
        <Audio src={staticFile('ep5/scratch.wav')} volume={0.5} />
      </Sequence>
      <Sequence from={F(3.23)}>
        <Audio src={staticFile('short-safety/bang.wav')} volume={0.9} />
      </Sequence>
      <Sequence from={F(3.28)}>
        <Audio src={staticFile('short-safety/pigeons.wav')} volume={0.55} />
      </Sequence>
      <Sequence from={F(3.9)}>
        <Audio src={staticFile('ep4/twinkle.wav')} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
};
