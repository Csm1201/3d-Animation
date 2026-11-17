/**
 * "I conducted my own Russian sleep experiment" - 5 s example.
 *
 * Same toy worker and shared walk cycle, seen from a high bird's-eye camera
 * inside a cut-away "sleep lab" diorama. He paces holding coffee, gets more
 * tired over 72 (fast-forwarded) hours, and at 2.7 s has a microsleep:
 * his head drops, eyes close, then he jolts awake.
 *
 * Layers: room (sharp) -> tilt-shift blur band (top & bottom) -> worker (sharp) -> text.
 */
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {Vector3} from 'three';
import {DURATION_IN_FRAMES, HEIGHT, SLIP_START_FRAME, WIDTH} from '../../core/constants';
import {PX} from '../../character3d/common';
import {Cam, CameraRig, ContactShadows, Daylight, Environment} from '../../character3d/stage';
import {Look, Worker3D} from '../../character3d/Worker3D';
import {getPose, hipX, WALK} from '../../core/walkCycle';
import {SleepSet} from './SleepSet';

const MICROSLEEP = SLIP_START_FRAME; // 2.7 s, same beat as the paper slip
const BG = '#e9e3f5';

/** High, bird's-eye camera that tracks the worker; he walks down the frame toward it. */
export const sleepCamera = (frame: number): Cam => {
  const pose = getPose(frame);
  const t = frame / (DURATION_IN_FRAMES - 1);
  const target = new Vector3(hipX(frame) / PX + 0.35, 0.7 + ((WALK.HIP_Y - pose.pelvis.y) / PX) * 0.15, 0.05);
  // slow push-in over the shot
  const k = 1 - 0.08 * Easing.inOut(Easing.cubic)(t);
  const position = target.clone().add(new Vector3(2.5 * k, 5.6 * k, 0.85 * k));
  return {position, target, fov: 36};
};

/**
 * Third-person chase camera (like a "what if you lived..." walking short): about 5.6 m
 * behind him at roughly head height, nearly level, offset to his left so he sits just
 * right of centre, looking straight down the corridor. Locked to the constant walk speed.
 */
export const chaseCamera = (frame: number): Cam => {
  const pose = getPose(frame);
  const hx = hipX(frame) / PX;
  const bob = ((WALK.HIP_Y - pose.pelvis.y) / PX) * 0.25;
  const z = -0.45;
  const position = new Vector3(hx - 6.3, 2.0 + bob, z);
  const target = new Vector3(hx + 20, 2.0 + bob - 20 * Math.tan(2.7 * (Math.PI / 180)), z);
  return {position, target, fov: 50};
};

/** Character state over time: tiredness ramps up; microsleep droop + jolt at 2.7 s. */
export const lookAt = (frame: number): Look => {
  const tired = interpolate(frame, [0, DURATION_IN_FRAMES - 1], [0.35, 1], {extrapolateRight: 'clamp'});
  const fall = interpolate(frame, [MICROSLEEP, MICROSLEEP + 30], [0, 34], {
    easing: Easing.in(Easing.quad),
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  // jolt: snap back with an overshoot after ~0.6 s asleep
  const joltT = frame - (MICROSLEEP + 36);
  const jolt = joltT < 0 ? 1 : Math.exp(-joltT / 7) * Math.cos(joltT * 0.45);
  const droop = joltT < 0 ? fall : 34 * jolt * (joltT < 4 ? 1 : 0.35);
  const eyesClosed = frame >= MICROSLEEP + 12 && frame < MICROSLEEP + 38;
  return {tired, droop, eyesClosed};
};

// ---------------------------------------------------------------- 2D overlay
const font = '"Inter Display", Inter, system-ui, sans-serif';

const Title: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame: frame + 12, fps, config: {damping: 12, stiffness: 140}});
  return (
    <div
      style={{
        position: 'absolute',
        top: 120,
        left: 60,
        right: 60,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: `scale(${0.6 + 0.4 * s}) rotate(${(1 - s) * -4}deg)`,
        opacity: s,
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: 34,
          padding: '28px 40px 32px',
          boxShadow: '0 18px 0 #c9c3ef, 0 24px 50px rgba(60,40,90,.25)',
          textAlign: 'center',
        }}
      >
        <div style={{fontFamily: font, fontWeight: 700, fontSize: 46, color: '#6b6589', letterSpacing: 0.5}}>I conducted my own</div>
        <div style={{fontFamily: font, fontWeight: 900, fontSize: 88, lineHeight: 0.98, color: '#3b3f52', marginTop: 8, letterSpacing: -1}}>
          RUSSIAN SLEEP
          <br />
          <span style={{color: '#ff7f6e'}}>EXPERIMENT</span>
        </div>
      </div>
    </div>
  );
};

const Counter: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const hours = Math.floor(
    interpolate(frame, [8, DURATION_IN_FRAMES - 10], [0, 72], {easing: Easing.inOut(Easing.quad), extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
  );
  const day = Math.min(3, Math.floor(hours / 24) + 1);
  const pop = spring({frame: frame - 10, fps, config: {damping: 14}});
  const red = hours >= 40;
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 150,
        left: 60,
        display: 'flex',
        alignItems: 'center',
        gap: 22,
        background: '#ffffff',
        borderRadius: 28,
        padding: '18px 30px',
        boxShadow: '0 12px 0 #c9c3ef, 0 18px 40px rgba(60,40,90,.22)',
        transform: `translateY(${(1 - pop) * 60}px)`,
        opacity: pop,
      }}
    >
      <div style={{fontFamily: font, fontWeight: 900, fontSize: 92, color: red ? '#ff6b5b' : '#3b3f52', fontVariantNumeric: 'tabular-nums', minWidth: 120}}>
        {String(hours).padStart(2, '0')}
      </div>
      <div style={{display: 'flex', flexDirection: 'column'}}>
        <div style={{fontFamily: font, fontWeight: 800, fontSize: 34, color: '#3b3f52', letterSpacing: 2}}>HOURS AWAKE</div>
        <div style={{fontFamily: font, fontWeight: 700, fontSize: 30, color: '#6fcaa3'}}>DAY {day}</div>
      </div>
    </div>
  );
};

const MicrosleepTag: React.FC<{frame: number; fps: number; top?: number}> = ({frame, fps, top = 820}) => {
  const t = frame - (MICROSLEEP + 10);
  if (t < 0) return null;
  const s = spring({frame: t, fps, config: {damping: 10, stiffness: 160}});
  const out = interpolate(frame, [MICROSLEEP + 80, MICROSLEEP + 95], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const asleep = frame < MICROSLEEP + 38;
  return (
    <div
      style={{
        position: 'absolute',
        top,
        right: 70,
        transform: `scale(${s}) rotate(4deg)`,
        opacity: out,
        background: asleep ? '#c9c3ef' : '#ff7f6e',
        color: asleep ? '#3b3f52' : '#ffffff',
        fontFamily: font,
        fontWeight: 900,
        fontSize: 48,
        borderRadius: 24,
        padding: '14px 26px',
        boxShadow: '0 10px 30px rgba(60,40,90,.25)',
      }}
    >
      {asleep ? 'MICROSLEEP… z z z' : 'JOLTED AWAKE!'}
    </div>
  );
};

/**
 * Side tracking camera at the same head height as the chase cam, standing where the near wall
 * would be and slightly ahead of him, so we see his face as he walks.
 */
export const sideCamera = (frame: number): Cam => {
  const pose = getPose(frame);
  const hx = hipX(frame) / PX;
  const bob = ((WALK.HIP_Y - pose.pelvis.y) / PX) * 0.25;
  const position = new Vector3(hx + 2.3, 1.95 + bob, 4.1);
  const target = new Vector3(hx - 0.45, 0.95 + bob, -0.15);
  return {position, target, fov: 44};
};

// ---------------------------------------------------------------- composition
type Mode = 'birdseye' | 'chase' | 'side';

const LOOKS = {
  birdseye: {bg: BG, fog: null, env: 0.5, key: 2.1, fill: 1.15, blur: 10, vignette: 0.28,
    light: {offset: [1.6, 7, 2.8] as [number, number, number], color: '#f3f1ff', sky: '#f4f1ff', ground: '#d9efe6'}},
  chase: {bg: '#efe2ea', fog: [12, 52] as [number, number], env: 0.5, key: 2.1, fill: 1.15, blur: 6, vignette: 0.28,
    light: {offset: [6, 3.2, -1.2] as [number, number, number], color: '#ffe7d2', sky: '#f6eefc', ground: '#e3d6cf'}},
  // old run-down lab: dim sickly fluorescent light, dark haze, heavy vignette
  side: {bg: '#151a1a', fog: [4, 19] as [number, number], env: 0.22, key: 1.35, fill: 0.55, blur: 4, vignette: 0.6,
    light: {offset: [0.6, 6, 1.2] as [number, number, number], color: '#d6e8cf', sky: '#5e6b66', ground: '#1c201e'}},
};
const FLICKER: Record<Mode, number[]> = {
  birdseye: [41, 42, 120, 233, 234, 236],
  chase: [41, 42, 120, 233, 234, 236],
  side: [18, 19, 41, 42, 96, 120, 121, 180, 233, 234, 236, 271],
};

const SleepScene: React.FC<{mode: Mode}> = ({mode}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const pose = getPose(frame);
  const cam = mode === 'chase' ? chaseCamera(frame) : mode === 'side' ? sideCamera(frame) : sleepCamera(frame);
  const look = lookAt(frame);
  const L = LOOKS[mode];
  const centre = new Vector3(hipX(frame) / PX + (mode === 'birdseye' ? 0.35 : 0), 0, 0);
  // fluorescent flicker on a few fixed frames
  const flicker = FLICKER[mode].includes(frame) ? 0.55 : 1;
  const light = L.light;
  // birdseye: tilt-shift bands. chase: far end goes soft. side: the whole room behind him is soft.
  const mask =
    mode === 'chase'
      ? 'linear-gradient(to bottom, #000 0%, #000 30%, transparent 58%)'
      : mode === 'side'
        ? 'linear-gradient(#000, #000)'
        : 'linear-gradient(to bottom, #000 0%, transparent 34%, transparent 64%, #000 100%)';
  return (
    <AbsoluteFill style={{backgroundColor: L.bg}}>
      {/* Layer 1: the lab */}
      <AbsoluteFill>
        <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 5, 5]}}>
          <CameraRig cam={cam} />
          <color attach="background" args={[L.bg]} />
          {L.fog ? <fog attach="fog" args={[L.bg, L.fog[0], L.fog[1]]} /> : null}
          <Environment intensity={L.env} />
          <Daylight center={centre} extent={mode === 'birdseye' ? 4.5 : 9} intensity={L.key * flicker} fill={L.fill * flicker} {...light} />
          <SleepSet frame={frame} variant={mode === 'chase' ? 'corridor' : mode === 'side' ? 'rundown' : 'diorama'} />
        </ThreeCanvas>
      </AbsoluteFill>

      <AbsoluteFill
        style={{
          backdropFilter: `blur(${L.blur}px)`,
          WebkitBackdropFilter: `blur(${L.blur}px)`,
          WebkitMaskImage: mask,
          maskImage: mask,
        }}
      />

      {/* Layer 2: worker, always sharp */}
      <AbsoluteFill>
        <ThreeCanvas
          width={WIDTH}
          height={HEIGHT}
          frameloop="demand"
          dpr={1}
          shadows="variance"
          gl={{antialias: true, alpha: true, premultipliedAlpha: false}}
          camera={{fov: cam.fov, position: [0, 5, 5]}}
        >
          <CameraRig cam={cam} />
          <Environment intensity={L.env + 0.08} />
          <Daylight center={centre} extent={mode === 'birdseye' ? 1.8 : 3.5} intensity={L.key * flicker} fill={L.fill * flicker} {...light} />
          <Worker3D pose={pose} frame={frame} look={look} carry="mug" />
          <ContactShadows pose={pose} opacity={0.32} />
        </ThreeCanvas>
      </AbsoluteFill>

      {/* flicker dims the whole frame slightly, plus a soft vignette */}
      <AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(10,12,14,${L.vignette}) 100%)`}} />
      <AbsoluteFill style={{background: '#1b1530', opacity: (1 - flicker) * 0.5}} />

      {/* Layer 3: text */}
      <Title frame={frame} fps={fps} />
      <MicrosleepTag frame={frame} fps={fps} top={mode === 'side' ? 470 : 820} />
      <Counter frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

/** Bird's-eye view over a cut-away diorama. */
export const SleepExperiment: React.FC = () => <SleepScene mode="birdseye" />;
/** Third-person chase view down a long corridor. */
export const SleepExperimentChase: React.FC = () => <SleepScene mode="chase" />;
/** Side view at head height in an old, run-down lab, so we see his face. */
export const SleepExperimentSide: React.FC = () => <SleepScene mode="side" />;
