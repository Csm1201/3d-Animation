/**
 * "You're the Ref" practice shot (3 s, 30 fps): ORANGE BREAK, THREE ON TWO… / THE STRIKER CUTS INSIDE…
 * Rebuild of 15.9–18.9 s of episode 2 with 3D kit characters, a full night stadium,
 * a bouncing crowd and the original audio for that slice.
 */
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Vector3} from 'three';
import {HEIGHT, WIDTH} from '../../core/constants';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {Ball, BALL_R, distAlong, Footballer, kitStyle, Mover, P2, PathFn, poseFor, velocity, yawFor} from './Players';
import {Stadium} from './Stadium';

export const PRACTICE_FPS = 30;
export const PRACTICE_FRAMES = 90;
const AUDIO_START = 15.9; // seconds into the original episode
const CUT_CAPTION = 2.0; // "THE STRIKER CUTS INSIDE…" lands here

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- blocking (metres, seconds)
// Orange attack the goal at +x. The striker carries it down the right channel, then cuts inside.
const striker: PathFn = (t) => {
  const cut = smooth(clamp01((t - 1.75) / 0.95));
  return {x: 15 + 6.6 * t, z: 8.2 - 6.2 * cut};
};
const STRIKER: Mover = {path: striker, effort: 0.85};
const TEN: Mover = {path: (t) => ({x: 13 + 7.6 * t, z: 3.6 - 1.7 * t}), effort: 0.9, offset: 0.37};
const SEVEN: Mover = {path: (t) => ({x: 10.5 + 7.6 * t, z: -2.6 + 0.3 * t}), effort: 0.95, offset: 0.71};
const strikerAt = (t: number) => striker(t);
const DEF2: Mover = {path: (t) => ({x: 35 + 1.9 * t, z: 6.4 - 1.1 * smooth(clamp01((t - 1.9) / 1))}), effort: 0.35, faceToward: strikerAt, offset: 0.2};
const DEF6: Mover = {path: (t) => ({x: 33 + 2.1 * t, z: -2.8 + 1.2 * t}), effort: 0.35, faceToward: (t) => TEN.path(t), offset: 0.55};
const REF: Mover = {path: (t) => ({x: 6 + 6.0 * t, z: 1.5 + 0.4 * t}), effort: 0.6, offset: 0.12};
const KEEPER: Mover = {path: (t) => ({x: 50.6 - 0.25 * t, z: striker(t).z * 0.18}), effort: 0.35, idle: true, faceToward: strikerAt, offset: 0.4};

// ---------------------------------------------------------------- the ball, dribbled ahead of the striker
const TOUCH_OFFSET = 0.15;
const ballAt = (t: number): {pos: Vector3; dir: P2} => {
  const p = striker(t);
  const v = velocity(striker, t);
  const sp = Math.hypot(v.x, v.z) || 1;
  const dir = {x: v.x / sp, z: v.z / sp};
  const {pose} = poseFor(STRIKER, t);
  const u = ((((pose.phase - TOUCH_OFFSET) % 1) + 1) % 1);
  const gap = 0.55 + 1.0 * Math.sin(Math.PI * u);
  // a little to the near-foot side of his line
  const side = {x: -dir.z, z: dir.x};
  return {pos: new Vector3(p.x + dir.x * gap + side.x * 0.12, BALL_R, p.z + dir.z * gap + side.z * 0.12), dir};
};
const ballPath: PathFn = (t) => {
  const b = ballAt(t).pos;
  return {x: b.x, z: b.z};
};

// ---------------------------------------------------------------- camera: low, behind and outside the striker
const cameraAt = (t: number): Cam => {
  const p = striker(t);
  const ease = smooth(clamp01(t / 3));
  // slow push-in as the move develops
  const pos = new Vector3(p.x - 12.5 + ease * 2, 6.2 - ease * 0.8, p.z + 3 - ease * 1.2);
  const target = new Vector3(p.x + 0.5, 0.2, p.z - 3.6 + ease * 1.5);
  return {position: pos, target, fov: 58, far: 400};
};

// ---------------------------------------------------------------- 2D overlay
const font = '"Inter Display", Inter, system-ui, sans-serif';

const Badge: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      top: 50,
      left: 40,
      width: 330,
      padding: '14px 0 12px',
      background: 'linear-gradient(180deg, #11131a, #050608)',
      border: '4px solid #ffffff',
      borderRadius: 16,
      textAlign: 'center',
      boxShadow: '0 10px 30px rgba(0,0,0,.45)',
    }}
  >
    <div style={{fontFamily: font, fontWeight: 900, fontSize: 33, color: '#fff', letterSpacing: 0.5}}>YOU'RE THE REF</div>
    <div style={{fontFamily: font, fontWeight: 800, fontSize: 21, color: '#f3b73b', letterSpacing: 1.5, marginTop: 2}}>EPISODE 2</div>
  </div>
);

const Scoreboard: React.FC<{t: number}> = ({t}) => {
  const live = 0.55 + 0.45 * Math.sin(t * 6);
  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        right: 40,
        width: 390,
        height: 88,
        borderRadius: 14,
        background: 'linear-gradient(180deg, #151822, #07080c)',
        boxShadow: '0 10px 30px rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{width: 18, alignSelf: 'stretch', background: 'linear-gradient(180deg, #4d8bff, #2457d6)'}} />
      <div style={{flex: 1, textAlign: 'center'}}>
        <div style={{fontFamily: font, fontWeight: 900, fontSize: 38, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5}}>BLU 0–0 ORA</div>
        <div style={{fontFamily: font, fontWeight: 700, fontSize: 21, color: '#d7dbe6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8}}>
          <span style={{width: 10, height: 10, borderRadius: 5, background: '#ff3b30', opacity: live}} />
          90+3
        </div>
      </div>
      <div style={{width: 18, alignSelf: 'stretch', background: 'linear-gradient(180deg, #ff9a3d, #ff6a00)'}} />
    </div>
  );
};

const Caption: React.FC<{lines: string[]; start: number; frame: number; fps: number; end?: number}> = ({lines, start, frame, fps, end}) => {
  if (frame < start || (end !== undefined && frame >= end)) return null;
  const words = lines.map((l) => l.split(' '));
  let k = 0;
  return (
    <div style={{position: 'absolute', top: 1185, left: 40, right: 40, textAlign: 'center'}}>
      {words.map((ws, li) => (
        <div key={li} style={{display: 'flex', justifyContent: 'center', gap: 22}}>
          {ws.map((w, wi) => {
            const s = spring({frame: frame - start - 2 * k++, fps, config: {damping: 11, stiffness: 260}});
            return (
              <span
                key={wi}
                style={{
                  fontFamily: font,
                  fontWeight: 900,
                  fontSize: 92,
                  lineHeight: 1.0,
                  color: w.startsWith('INSIDE') ? '#ffd23a' : '#ffffff',
                  WebkitTextStroke: '14px #0d0f14',
                  paintOrder: 'stroke fill',
                  textShadow: '0 10px 26px rgba(0,0,0,.55)',
                  display: 'inline-block',
                  transform: `scale(${0.55 + 0.45 * s}) translateY(${(1 - s) * 22}px)`,
                  opacity: Math.min(1, s * 1.4),
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- composition
const ORANGE_SKINS = [
  {skin: '#c98f6b', hair: '#1f1714', hs: 'buzz' as const},
  {skin: '#f1c3a0', hair: '#5a3a2c', hs: 'short' as const},
  {skin: '#8d5a3c', hair: '#151110', hs: 'short' as const},
];

export const PracticeBreak: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const cam = cameraAt(t);
  const s = striker(t);
  const centre = new Vector3(s.x + 4, 0, s.z - 1);
  const ball = ballAt(t);
  const roll = distAlong(ballPath, t) / BALL_R;
  const excite = 0.35 + 0.6 * smooth(clamp01((t - 1.6) / 1.2));
  // the cut: a little lean into the turn
  const cutLean = Math.sin(Math.PI * clamp01((t - 1.75) / 0.95)) * 9;
  const flash = interpolate(frame, [Math.round(CUT_CAPTION * fps), Math.round(CUT_CAPTION * fps) + 4], [0.18, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const flashOn = frame >= Math.round(CUT_CAPTION * fps) ? flash : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ref-ep2-audio.m4a')} trimBefore={Math.round(AUDIO_START * fps)} />
      <AbsoluteFill>
        <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
          <CameraRig cam={cam} />
          <fog attach="fog" args={['#141c38', 45, 150]} />
          <Environment intensity={0.28} />
          <Daylight center={centre} extent={16} offset={[-16, 34, 20]} color="#eef2ff" intensity={2.5} sky="#7d8fc4" ground="#20402a" fill={0.75} />
          <directionalLight position={[60, 30, -40]} intensity={0.55} color="#ffe6c4" />
          <Stadium frame={frame} excite={excite} />
          <Footballer mv={SEVEN} t={t} frame={frame} style={kitStyle('orange', 7, ORANGE_SKINS[1].skin, ORANGE_SKINS[1].hair, ORANGE_SKINS[1].hs)} />
          <Footballer mv={TEN} t={t} frame={frame} style={kitStyle('orange', 10, ORANGE_SKINS[2].skin, ORANGE_SKINS[2].hair, ORANGE_SKINS[2].hs)} />
          <Footballer mv={STRIKER} t={t} frame={frame} style={kitStyle('orange', 9, ORANGE_SKINS[0].skin, ORANGE_SKINS[0].hair, ORANGE_SKINS[0].hs)} lean={-cutLean} />
          <Footballer mv={DEF2} t={t} frame={frame} style={kitStyle('blue', 2, '#f1c3a0', '#c47a3a', 'short')} />
          <Footballer mv={DEF6} t={t} frame={frame} style={kitStyle('blue', 6, '#8d5a3c', '#1f1714', 'buzz')} />
          <Footballer mv={KEEPER} t={t} frame={frame} style={kitStyle('keeper', 1, '#e8b48f', '#3a2a22', 'short')} />
          <Footballer mv={REF} t={t} frame={frame} style={kitStyle('ref', undefined, '#f0b892', '#2b211c', 'buzz')} />
          <Ball pos={ball.pos} spin={roll} axisYaw={yawFor(ball.dir.x, ball.dir.z)} />
        </ThreeCanvas>
      </AbsoluteFill>
      {/* floodlit haze and vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />
      <AbsoluteFill style={{background: '#fff', opacity: flashOn}} />
      <Badge />
      <Scoreboard t={t} />
      <Caption lines={['ORANGE BREAK,', 'THREE ON TWO…']} start={0} end={Math.round(CUT_CAPTION * fps)} frame={frame} fps={fps} />
      <Caption lines={['THE STRIKER', 'CUTS INSIDE…']} start={Math.round(CUT_CAPTION * fps)} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
