/**
 * You're the Ref, Episode 6: "Jimmy Gets a Ladder" (script: docs/scripts/ref-ep6-script.md)
 *
 *   0.0  HOOK: Jimmy on a wobbly stepladder, red card in LeBron's face, at eye level at last
 *
 * LeBron has no lines. The island invite is NOT shown in this episode (LeBron is in every scene).
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {BoxGeometry, CylinderGeometry, MeshStandardMaterial, Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam} from '../../character3d/stage';
import {Look} from '../../character3d/Worker3D';
import {Actor, Scene} from './Episode2';
import {DEADPAN, handLocal, JIMMY, Tally} from './Episode4';
import {COOL, LEBRON, LEBRON_SCALE} from './Ep5Cast';
import {Badge, Scoreboard} from './Overlays';

export const EP6_FPS = 30;
export const EP6_FRAMES = 990; // 33 s
const F = (s: number) => Math.round(s * EP6_FPS);

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const DEG = Math.PI / 180;

const LeBron: React.FC<Omit<Parameters<typeof Actor>[0], 'style' | 'scale'>> = (p) => <Actor style={LEBRON} scale={LEBRON_SCALE} look={COOL} {...p} />;

// ---------------------------------------------------------------- props
const cardGeo = new BoxGeometry(0.008, 0.11, 0.08);
const redMat = new MeshStandardMaterial({color: '#e5262b', roughness: 0.35});
const alu = new MeshStandardMaterial({color: '#c9ced6', roughness: 0.35, metalness: 0.6});
const rubber = new MeshStandardMaterial({color: '#e86a1a', roughness: 0.8});
const stepMat = new MeshStandardMaterial({color: '#9aa1ab', roughness: 0.5, metalness: 0.5});
const railGeo = new BoxGeometry(0.035, 1, 0.05);
const stepGeo = new BoxGeometry(0.16, 0.025, 0.46);
const footGeo = new CylinderGeometry(0.03, 0.035, 0.04, 10);

export const LADDER_TOP = 0.66; // standing height of the top platform
/** A small A-frame stepladder, standing on its local origin; the climbing side faces local -x. */
export const StepLadder: React.FC = () => {
  const H = LADDER_TOP;
  const spread = 0.24; // half the distance between front and back feet
  const lean = Math.atan2(spread, H);
  const len = Math.hypot(spread, H);
  return (
    <group>
      {[-1, 1].map((side) =>
        [-0.2, 0.2].map((z) => (
          <group key={`${side}${z}`}>
            <mesh geometry={railGeo} material={alu} position={[side * spread * 0.5, H / 2, z]} rotation={[0, 0, side * lean]} scale={[1, len, 1]} castShadow />
            <mesh geometry={footGeo} material={rubber} position={[side * spread, 0.02, z]} />
          </group>
        )),
      )}
      {[0.22, 0.44].map((y) => (
        <mesh key={y} geometry={stepGeo} material={stepMat} position={[-spread * (1 - y / H), y, 0]} castShadow />
      ))}
      <mesh geometry={stepGeo} material={stepMat} position={[0, H, 0]} scale={[1.6, 1.4, 1]} castShadow />
    </group>
  );
};

/** Jimmy holding a red card up in his near hand. */
const JimmyCard: React.FC<{x: number; y?: number; z: number; yaw: number; spec: BodySpec; frame: number; look: Look}> = (p) => (
  <Actor style={JIMMY} {...p}>
    {(pose) => {
      const h = handLocal(pose, false);
      return <mesh geometry={cardGeo} material={redMat} position={[h.x + 0.02, h.y + 0.08, h.z]} rotation={[0, -0.75, 0]} scale={2.6} />;
    }}
  </Actor>
);

// ================================================================ SHOT 0 — HOOK (0–1.4): red card at eye level, from the top of a ladder
const LB_X = 43.9;
const LAD_X = 45.05;
const ShotHook: React.FC<{from: number}> = ({from}) => {
  const f = useCurrentFrame();
  const t = f / EP6_FPS;
  const fr = from + f;
  const push = smooth(clamp01(t / 1.4));
  // the ladder rocks toward LeBron and back, Jimmy rides it without blinking
  const wobble = 7 * Math.sin(t * 7.5) * Math.exp(-t * 0.6) + 2;
  const jSpec: BodySpec = {...idleSpec(fr, 0.05), nearArm: [89, 6], farArm: [8, 20]};
  const lbSpec: BodySpec = {...idleSpec(fr, 0.05), headTilt: 14, nearArm: [-6, 14], farArm: [4, 14]};
  const cam: Cam = {position: v3(44.7, 1.05 + push * 0.35, 5.6 - push * 1.4), target: v3(44.55, 1.35 + push * 0.35, 0), fov: 40 - push * 4};
  return (
    <Scene cam={cam} frame={fr} centre={v3(44.5, 0, 0)} extent={8} excite={1.6}>
      <LeBron x={LB_X} z={0} yaw={0} spec={lbSpec} frame={fr} look={{...COOL, brows: -0.25}} />
      <group position={[LAD_X, 0, 0]} rotation={[0, 0, wobble * DEG]}>
        <StepLadder />
        <JimmyCard x={0.02} y={LADDER_TOP} z={0} yaw={Math.PI} spec={jSpec} frame={fr} look={{...DEADPAN(0, t), brows: -0.5}} />
      </group>
    </Scene>
  );
};

// ================================================================ timeline
type Sfx = {at: number; src: string; vol?: number};
const SOUND: Sfx[] = [
  {at: 0.0, src: 'ep5/whistle.wav', vol: 0.9},
  {at: 0.05, src: 'ep5/crowd-gasp.wav', vol: 0.9},
  {at: 1.3, src: 'ep5/scratch.wav', vol: 0.8},
];

type ShotDef = {from: number; to: number; C: React.FC<{from: number}>};
const SHOTS: ShotDef[] = [{from: 0, to: F(1.4), C: ShotHook}];

export const Episode6: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const blue: ('g' | 'x' | null)[] = ['g'];
  const orange: ('g' | 'x' | null)[] = ['g'];
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ep5/crowd-bed.wav')} volume={0.5} />
      {SOUND.map((s, i) => (
        <Sequence key={`a${i}`} from={F(s.at)} layout="none">
          <Audio src={staticFile(s.src)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
      {SHOTS.map((s, i) => (
        <Sequence key={i} from={s.from} durationInFrames={s.to - s.from} layout="none">
          <AbsoluteFill>
            <s.C from={s.from} />
          </AbsoluteFill>
        </Sequence>
      ))}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />
      <Badge episode={6} />
      <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={[1, 1]} clock="PENS" />
      <Tally blue={blue} orange={orange} />
    </AbsoluteFill>
  );
};
