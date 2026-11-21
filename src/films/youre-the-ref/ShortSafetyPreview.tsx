/**
 * Preview of the "Workplace Safety with Jimmy" Short, Lesson 4 (Night Shift). Script: docs/scripts/ref-short-workplace-safety-script.md
 *
 *   0.0  the mobsters already have their hands up; Jimmy looks at their hands, nods, pulls out his notebook: "I'll need all your names."
 *   2.1  the mobsters look at each other
 *   2.8  outside the alley: a flash on the brick wall, BANG, pigeons scatter (nothing else shown)
 *   3.4  Jimmy flat on his back in a small pool of blood, halo spinning, whistle rolling away
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {BoxGeometry, CylinderGeometry, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, RepeatWrapping, SphereGeometry, TorusGeometry, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {CameraRig, Daylight, Environment} from '../../character3d/stage';
import {Cam} from '../../character3d/stage';
import {canvasTex, once} from '../../character3d/common';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor} from './Episode2';
import {DEADPAN, handLocal, JIMMY} from './Episode4';
import {Captions, Cue} from './Overlays';
import {HEIGHT, WIDTH} from '../../core/constants';

export const SAFETY_PREVIEW_FPS = 30;
export const SAFETY_PREVIEW_FRAMES = 123; // 4.1 s
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
const MOBS = [
  {st: mobster('#e9b991', '#2b211c', '#7a1c1c'), x: 1.45, z: 0.55},
  {st: mobster('#c98f6b', '#1f1714', '#1c3a7a'), x: 1.7, z: -0.25},
  {st: mobster('#f1c3a0', '#6b4a32', '#7a1c1c'), x: 2.45, z: 0.25},
  {st: mobster('#a8714f', '#141010', '#3a3a3a'), x: 2.3, z: -1.0},
];
const HANDS_UP = (t: number, i: number, k = 1): BodySpec => {
  const s = idleSpec(Math.round(t * 30) + i * 17, 0.05);
  return {...s, nearArm: [lerp(s.nearArm[0], 162, k), lerp(s.nearArm[1], 38, k)], farArm: [lerp(s.farArm[0], 158, k), lerp(s.farArm[1], 42, k)]};
};
const WARY: Look = {tired: 0, droop: -2, eyesClosed: false, brows: 0.35, browLift: 0.3, mouth: 'flat', noBlink: true, pupils: 0.85};
const CROSS = (yaw: number): Look => ({tired: 0, droop: 0, eyesClosed: false, brows: -0.9, browLift: -0.2, mouth: 'frown', noBlink: true, yaw});

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
const haloMat = new MeshStandardMaterial({color: '#ffd84a', emissive: '#ffcf33', emissiveIntensity: 1.2, roughness: 0.3});
const whistleMat = new MeshStandardMaterial({color: '#cfd4da', roughness: 0.25, metalness: 0.8});
const groundGeo = new PlaneGeometry(40, 40);
const wallGeo = new PlaneGeometry(16, 8);
const barrelGeo = new CylinderGeometry(0.3, 0.3, 0.9, 20);
const poleGeo = new CylinderGeometry(0.05, 0.06, 4.2, 10);
const armGeo = new BoxGeometry(0.7, 0.05, 0.05);
const bulbGeo = new SphereGeometry(0.11, 16, 12);
const pigeonGeo = new SphereGeometry(0.12, 12, 8);
const wingGeo = new BoxGeometry(0.12, 0.01, 0.34);
const haloGeo = new TorusGeometry(0.16, 0.025, 12, 32);
const bookGeo = new BoxGeometry(0.025, 0.2, 0.14);
const pageGeo = new BoxGeometry(0.004, 0.18, 0.12);
const bookMat = new MeshStandardMaterial({color: '#c9a46a', roughness: 0.6});
const pageMat = new MeshStandardMaterial({color: '#f4f1e8', roughness: 0.8});
const bloodMat = new MeshStandardMaterial({color: '#6e0a0e', roughness: 0.15, metalness: 0.1});
const bloodGeo = new CylinderGeometry(1, 1, 0.004, 40);
const whistleGeo = new CylinderGeometry(0.03, 0.03, 0.08, 14);
const blockGeo = new BoxGeometry(6, 9, 6);

const Night: React.FC<{cam: Cam; centre: Vector3; flicker: number; children: React.ReactNode}> = ({cam, centre, flicker, children}) => (
  <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
    <color attach="background" args={['#070a16']} />
    <fog attach="fog" args={['#070a16', 9, 30]} />
    <CameraRig cam={{...cam, far: 120}} />
    <Environment intensity={0.12} />
    <Daylight center={centre} extent={6} offset={[-3, 9, 3]} color="#ffcf8a" intensity={1.9 * flicker} sky="#2b3766" ground="#141418" fill={0.55} />
    {children}
  </ThreeCanvas>
);

const Alley: React.FC<{flicker: number}> = ({flicker}) => (
  <group>
    <mesh geometry={groundGeo} material={asphalt} rotation={[-Math.PI / 2, 0, 0]} receiveShadow />
    <mesh geometry={wallGeo} position={[1, 4, -1.8]} receiveShadow>
      <meshStandardMaterial map={brickTex()} roughness={0.9} />
    </mesh>
    <mesh geometry={wallGeo} position={[-3.6, 4, 2]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
      <meshStandardMaterial map={brickTex()} roughness={0.9} />
    </mesh>
    <mesh geometry={barrelGeo} material={rust} position={[3.1, 0.45, 0.1]} castShadow receiveShadow />
    <group position={[-1.3, 0, -1.4]}>
      <mesh geometry={poleGeo} material={steel} position={[0, 2.1, 0]} castShadow />
      <mesh geometry={armGeo} material={steel} position={[0.33, 4.15, 0]} />
      <mesh geometry={bulbGeo} material={bulbMat} position={[0.62, 4.05, 0]} scale={[1, 0.6, 1]} visible={flicker > 0.5} />
    </group>
    <pointLight position={[-0.7, 3.9, -1.4]} intensity={9 * flicker} distance={12} decay={1.6} color="#ffc977" />
  </group>
);

// ---------------------------------------------------------------- shots
/** Jimmy looks at their raised hands, nods, pulls out his notebook: "I'll need all your names." */
const ShotHandball: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS;
  const nod = Math.sin(clamp01((t - 0.12) / 0.3) * Math.PI) * 12;
  const point = smooth(clamp01((t - 0.3) / 0.2)); // notebook up
  const talk = t >= LINE_AT && t < LINE_AT + LINE_LEN ? 1 : 0;
  const base = idleSpec(frame, 0.08);
  const jimmy: BodySpec = {
    ...base,
    headTilt: (base.headTilt ?? 0) + nod + 6 * point,
    nearArm: [lerp(base.nearArm[0], 46, point), lerp(base.nearArm[1], 70, point)],
    farArm: [lerp(base.farArm[0], 40, point), lerp(base.farArm[1], 70, point)],
  };
  const cam: Cam = {position: v3(lerp(-1.75, -1.6, t / 2.1), 1.6, lerp(1.25, 1.15, t / 2.1)), target: v3(1.6, 1.05, -0.3), fov: 54};
  return (
    <Night cam={cam} centre={v3(1.2, 0, 0)} flicker={t > 1.9 && t < 1.97 ? 0.35 : 1}>
      <Alley flicker={t > 1.9 && t < 1.97 ? 0.35 : 1} />
      <Actor style={JIMMY} x={0} z={0.25} yaw={-0.12} spec={jimmy} frame={frame} look={{...DEADPAN(talk, t), yaw: -8}}>
        {(pose) => {
          const h = handLocal(pose, false);
          return point > 0.3 ? (
            <group position={h} rotation={[0, 0, 0.35]}>
              <mesh geometry={bookGeo} material={bookMat} position={[0.02, 0.06, -0.04]} />
              <mesh geometry={pageGeo} material={pageMat} position={[0.031, 0.06, -0.04]} />
            </group>
          ) : null;
        }}
      </Actor>
      {MOBS.map((m, i) => (
        <Actor key={i} style={m.st} x={m.x} z={m.z} yaw={Math.PI + (m.z - 0.25) * 0.25} spec={HANDS_UP(t, i)} frame={frame + i * 9} look={WARY} />
      ))}
    </Night>
  );
};

/** The mobsters lower their hands and look at each other. */
const ShotLook: React.FC<{from: number}> = ({from}) => {
  const frame = useCurrentFrame();
  const t = frame / SAFETY_PREVIEW_FPS;
  const down = smooth(clamp01((t - 0.15) / 0.4));
  const cam: Cam = {position: v3(-0.4, 1.55, 1.5), target: v3(2.0, 1.4, -0.2), fov: 44};
  const yaws = [-38, 34, -30, 40];
  return (
    <Night cam={cam} centre={v3(2, 0, 0)} flicker={1}>
      <Alley flicker={1} />
      {MOBS.map((m, i) => (
        <Actor
          key={i}
          style={m.st}
          x={m.x}
          z={m.z}
          yaw={Math.PI + (m.z - 0.25) * 0.25}
          spec={HANDS_UP(t, i, 1 - down)}
          frame={from + frame + i * 9}
          look={CROSS(yaws[i] * smooth(clamp01((t - 0.05) / 0.2)))}
        />
      ))}
    </Night>
  );
};

/** Outside the alley: a flash on the wall, BANG, pigeons scatter. Nothing else is shown. */
const PIGEONS = [0, 1, 2, 3, 4, 5, 6].map((i) => ({x: -2.6 + i * 0.85 + (i % 2) * 0.25, vx: (i - 3) * 0.9, vy: 3.2 + (i % 3) * 0.7, ph: i * 1.3}));
const ShotBang: React.FC = () => {
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
const DOWN: BodySpec = {lean: 0, headTilt: 4, near: {thigh: 4, knee: 4, foot: 0}, far: {thigh: -6, knee: 6, foot: 0}, nearArm: [28, 10], farArm: [22, 14]};
const HEAD_Z = -1.05;
const ShotDown: React.FC = () => {
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

const LINE_AT = 0.38;
const LINE_LEN = 1.5;
const CUES: Cue[] = [{from: F(LINE_AT), to: F(2.1), text: "I'LL NEED ALL YOUR NAMES.", hl: {'NAMES.': '#ffd23a'}}];

export const ShortSafetyPreview: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <AbsoluteFill style={{backgroundColor: '#070a16'}}>
      <Sequence from={0} durationInFrames={F(2.1)}>
        <ShotHandball />
      </Sequence>
      <Sequence from={F(2.1)} durationInFrames={F(2.8) - F(2.1)}>
        <ShotLook from={F(2.1)} />
      </Sequence>
      <Sequence from={F(2.8)} durationInFrames={F(3.4) - F(2.8)}>
        <ShotBang />
      </Sequence>
      <Sequence from={F(3.4)}>
        <ShotDown />
      </Sequence>
      <Captions cues={CUES} frame={frame} fps={fps} />
      <Sequence from={0}>
        <Audio src={staticFile('ep5/whistle.wav')} volume={0.25} endAt={6} />
      </Sequence>
      <Sequence from={F(LINE_AT)}>
        <Audio src={staticFile('short-safety/j-names.mp3')} volume={1.3} />
      </Sequence>
      <Sequence from={F(2.83)}>
        <Audio src={staticFile('short-safety/bang.wav')} volume={0.9} />
      </Sequence>
      <Sequence from={F(2.88)}>
        <Audio src={staticFile('short-safety/pigeons.wav')} volume={0.55} />
      </Sequence>
      <Sequence from={F(3.5)}>
        <Audio src={staticFile('ep4/twinkle.wav')} volume={0.5} />
      </Sequence>
    </AbsoluteFill>
  );
};
