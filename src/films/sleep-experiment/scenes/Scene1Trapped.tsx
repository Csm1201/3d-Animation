/**
 * Scene 1 (flash-forward, 5 s): Dr. Al Nighter is trapped inside his own sleep experiment.
 *
 *   0–150    he pounds on the chamber door (both fists, alternating); dust, flicker, door rattle
 *   150–200  he gives up and turns toward camera
 *   182–262  caption: "So… I'm stuck inside my own sleep experiment."
 *   228–262  Brenda whispers "welcome."
 *   262–300  freeze frame, colour drains, "72 HOURS EARLIER"
 *
 * Same side camera height and run-down lab look as SleepExperimentSide.
 */
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, Easing, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {MeshStandardMaterial, SphereGeometry, Vector3} from 'three';
import {HEIGHT, WIDTH} from '../../../core/constants';
import {fistReach, standPose} from '../../../core/poses';
import {seededArray} from '../../../core/random';
import {DEG, PX} from '../../../character3d/common';
import {Blob, Cam, CameraRig, ContactShadows, Daylight, Environment} from '../../../character3d/stage';
import {Look, SCIENTIST_STYLE, Style, Worker3D} from '../../../character3d/Worker3D';
import {ChamberDoor, SleepSet} from '../SleepSet';

export const SCENE1_FRAMES = 300;
const FREEZE = 262;
const BANG_END = 150;
const TURN_END = 198;

// ---------------------------------------------------------------- blocking
const AL_X = 10.5;
const BANG_PERIOD = 28; // frames per arm cycle; arms alternate, so a hit every 14 frames
const IMPACT_U = 0.7;
const HIT: [number, number] = [110, 8]; // arm angles at impact
const BANG_LEAN = 9;
const DOOR_X = AL_X + fistReach(BANG_LEAN, HIT[0], HIT[1]).x / PX + 0.05;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** One arm's swing in the banging loop: wind up, strike the door, recoil. */
const bangArm = (t: number, offset: number): [number, number] => {
  const u = (((t + offset) / BANG_PERIOD) % 1 + 1) % 1;
  if (u < 0.55) {
    const e = smooth(u / 0.55);
    return [lerp(112, 150, e), lerp(25, 62, e)];
  }
  if (u < IMPACT_U) {
    const e = ((u - 0.55) / (IMPACT_U - 0.55)) ** 2;
    return [lerp(150, HIT[0], e), lerp(62, HIT[1], e)];
  }
  const e = smooth((u - IMPACT_U) / (1 - IMPACT_U));
  return [lerp(HIT[0], 112, e), lerp(HIT[1], 25, e)];
};

/** Frames where a fist hits the door (near arm, then far arm 14 frames later, alternating). */
const IMPACTS = Array.from({length: 40}, (_, k) => k * (BANG_PERIOD / 2) + IMPACT_U * BANG_PERIOD - BANG_PERIOD / 2)
  .filter((f) => f >= 0 && f < BANG_END);
const lastImpact = (t: number) => {
  let last = -999;
  for (const f of IMPACTS) if (f <= t) last = f;
  return last;
};

const alAt = (t: number) => {
  const giveUp = smooth(clamp01((t - BANG_END) / 26)); // arms drop
  const turn = Easing.inOut(Easing.cubic)(clamp01((t - BANG_END - 8) / (TURN_END - BANG_END - 8)));
  const since = t - lastImpact(t);
  const jolt = since >= 0 && since < 30 ? Math.exp(-since / 5) : 0;
  const near = bangArm(t, 0);
  const far = bangArm(t, BANG_PERIOD / 2);
  const breathe = Math.sin(t * 0.09) * 3;
  const pose = standPose({
    nearFootX: 26,
    farFootX: -30,
    sink: 10 + jolt * 6 + giveUp * breathe,
    lean: lerp(BANG_LEAN + jolt * 2.5, 4, giveUp),
    headTilt: lerp(-6, 2, giveUp),
    near: [lerp(near[0], -4, giveUp), lerp(near[1], 14, giveUp)],
    far: [lerp(far[0], 5, giveUp), lerp(far[1], 16, giveUp)],
  });
  // Expression: yelling with every hit -> despair as he turns -> talking -> fear at "welcome."
  const talking = t >= LINE_START && t < LINE_START + LINE.length * WORD_GAP + 14;
  const talk = talking ? 0.15 + 0.45 * Math.abs(Math.sin((t - LINE_START) * 0.5)) : 0;
  const scared = smooth(clamp01((t - 232) / 10)); // Brenda's whisper lands
  const despair = smooth(clamp01((t - BANG_END) / 30));
  const look: Look = {
    tired: 1,
    droop: lerp(0, 8, giveUp) - turn * 8,
    eyesClosed: t >= 204 && t < 210, // one tired blink before he speaks
    yaw: -16 * turn + scared * 24, // glances toward Brenda
    noBlink: true,
    brows: lerp(-0.6, 1, despair),
    browLift: lerp(0.1, 0.5, despair) + scared * 0.35,
    pupils: lerp(0.72, 0.9, despair) - scared * 0.3,
    sweat: lerp(0.6, 1, despair),
    mouth: t < BANG_END ? 'open' : talking ? 'open' : 'frown',
    mouthOpen: t < BANG_END ? 0.55 + 0.45 * jolt : talk,
    roll: t >= BANG_END && !talking ? Math.sin(t * 0.6) * 2 * (1 - scared) : 0,
  };
  return {pose, look, yaw: -68 * turn, jolt};
};

// ---------------------------------------------------------------- the volunteers
type Vol = {name: string; x: number; z: number; yaw: number; style: Style; sway: number};
const VOLUNTEERS: Vol[] = [
  {name: 'Kev', x: 8.98, z: -0.45, yaw: -48, sway: 2.1, style: {outfit: 'subject', skin: '#8d5a3c', hair: '#1f1714', hairStyle: 'buzz', patch: 3}},
  {name: 'Gary', x: 9.46, z: -0.05, yaw: -45, sway: 0.4, style: {outfit: 'subject', skin: '#f1c3a0', hair: '#c47a3a', hairStyle: 'short', patch: 1}},
  {name: 'Brenda', x: 9.95, z: 0.5, yaw: -38, sway: 1.3, style: {outfit: 'subject', skin: '#c98f6b', hair: '#3a2a22', hairStyle: 'bun', patch: 2}},
];

const Volunteer: React.FC<{v: Vol; t: number}> = ({v, t}) => {
  const welcome = v.name === 'Brenda' ? smooth(clamp01((t - 222) / 20)) : 0;
  const zombie = v.name === 'Kev' ? smooth(clamp01(t / 260)) : 0; // Kev's arms drift up like a sleepwalker
  const pose = standPose({
    lean: 1 + Math.sin(t * 0.025 + v.sway) * 0.7,
    near: [-1 + zombie * 38, 6 + zombie * 14],
    far: [1 + zombie * 30, 6 + zombie * 12],
    sink: 4,
  });
  const base: Look = {tired: 0.8, droop: -3, eyesClosed: false, stare: true, noBlink: true, pupils: 0.5};
  const look: Look =
    v.name === 'Brenda'
      ? // slow creepy head tilt and a grin spreading as she whispers "welcome."
        {...base, droop: -3 + welcome * 5, yaw: -welcome * 22, roll: welcome * 17, brows: 0.3 * welcome, mouth: t >= 230 && t < 244 ? 'open' : welcome > 0.4 ? 'grin' : 'flat', mouthOpen: 0.25}
      : v.name === 'Gary'
        ? // one eye twitching in bursts, angry brows
          {...base, brows: -0.7, twitch: t % 46 < 5 || (t % 46 > 9 && t % 46 < 12) ? 1 : 0, mouth: 'flat'}
        : // Kev: slack-jawed, pinprick pupils, head lolling slightly
          {...base, pupils: 0.38, mouth: 'open', mouthOpen: 0.3 + 0.1 * Math.sin(t * 0.05), roll: -6 + Math.sin(t * 0.03) * 4, browLift: 0.3};
  return (
    <group position={[v.x, 0, v.z]} rotation={[0, v.yaw * DEG, 0]}>
      <Worker3D pose={pose} frame={t} look={look} carry="none" style={v.style} />
      <Blob x={0} z={0} h={0} sx={0.7} sz={0.45} strength={0.4} />
    </group>
  );
};

// ---------------------------------------------------------------- dust shaken loose by each hit
const DUST = seededArray(5150, IMPACTS.length * 7, (r) => ({x: -0.1 - r() * 0.7, z: (r() - 0.5) * 1.2, s: 0.006 + r() * 0.01, drift: (r() - 0.5) * 0.2, delay: r() * 6}));
const dustGeo = new SphereGeometry(1, 8, 6);
const dustMat = new MeshStandardMaterial({color: '#b9b4a6', roughness: 1});

const Dust: React.FC<{t: number}> = ({t}) => (
  <group>
    {IMPACTS.map((f, k) =>
      DUST.slice(k * 7, k * 7 + 7).map((d, i) => {
        const age = (t - f - d.delay) / 60;
        if (age < 0 || age > 1.4) return null;
        const y = 2.62 - 1.6 * age * age - 0.3 * age;
        return <mesh key={`${k}-${i}`} geometry={dustGeo} material={dustMat} position={[DOOR_X + d.x + d.drift * age, y, d.z]} scale={d.s} />;
      }),
    )}
  </group>
);

// ---------------------------------------------------------------- camera
const cameraAt = (t: number, jolt: number): Cam => {
  const push = Easing.inOut(Easing.quad)(clamp01(t / FREEZE));
  const shake = jolt * 0.012;
  return {
    position: new Vector3(10.78 + Math.sin(t * 3.1) * shake, 1.9 + Math.cos(t * 2.7) * shake, lerp(5.15, 4.55, push)),
    target: new Vector3(10.24, 0.98, 0),
    fov: 48,
  };
};

// ---------------------------------------------------------------- 2D overlay
const font = '"Inter Display", Inter, system-ui, sans-serif';
const LINE = ['So…', "I'm", 'stuck', 'inside', 'my', 'own', 'sleep', 'experiment.'];
const LINE_START = 182;
const WORD_GAP = 7;

const Captions: React.FC<{t: number; fps: number}> = ({t, fps}) => {
  if (t < LINE_START) return null;
  return (
    <div style={{position: 'absolute', top: 250, left: 70, right: 70, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '4px 30px'}}>
      {LINE.map((w, i) => {
        const s = spring({frame: t - (LINE_START + i * WORD_GAP + (i > 0 ? 10 : 0)), fps, config: {damping: 12, stiffness: 220}});
        return (
          <span
            key={i}
            style={{
              fontFamily: font,
              fontWeight: 900,
              fontSize: 78,
              lineHeight: 1.05,
              color: w === 'stuck' ? '#ffd27a' : '#ffffff',
              WebkitTextStroke: '12px #121514',
              paintOrder: 'stroke fill',
              textShadow: '0 8px 24px rgba(0,0,0,.6)',
              transform: `scale(${0.6 + 0.4 * s}) translateY(${(1 - s) * 18}px)`,
              opacity: s,
              display: 'inline-block',
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

const Whisper: React.FC<{t: number}> = ({t}) => {
  const o = interpolate(t, [230, 240, 258, 262], [0, 1, 1, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (o <= 0) return null;
  return (
    <div
      style={{
        position: 'absolute',
        top: 560,
        left: 300,
        fontFamily: font,
        fontStyle: 'italic',
        fontWeight: 600,
        fontSize: 54,
        letterSpacing: 6,
        color: '#d8cff7',
        textShadow: '0 0 18px rgba(170,150,255,.55), 0 4px 10px rgba(0,0,0,.7)',
        opacity: o,
        transform: `translateY(${(1 - o) * 10}px)`,
      }}
    >
      welcome.
    </div>
  );
};

const Hud: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      bottom: 150,
      left: 60,
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      background: 'rgba(16,19,18,.78)',
      border: '2px solid rgba(255,255,255,.14)',
      borderRadius: 26,
      padding: '16px 28px',
    }}
  >
    <div style={{fontFamily: font, fontWeight: 900, fontSize: 86, color: '#ff6b5b', fontVariantNumeric: 'tabular-nums'}}>72</div>
    <div style={{display: 'flex', flexDirection: 'column'}}>
      <div style={{fontFamily: font, fontWeight: 800, fontSize: 32, color: '#eef1ee', letterSpacing: 2}}>HOURS AWAKE</div>
      <div style={{fontFamily: font, fontWeight: 700, fontSize: 28, color: '#8fd3b0'}}>DAY 3</div>
    </div>
  </div>
);

const Earlier: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame < FREEZE) return null;
  const flash = interpolate(frame, [FREEZE, FREEZE + 6], [0.85, 0], {extrapolateRight: 'clamp'});
  const s = spring({frame: frame - FREEZE - 3, fps, config: {damping: 11, stiffness: 180}});
  return (
    <>
      <AbsoluteFill style={{background: '#ffffff', opacity: flash}} />
      <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
        <div style={{transform: `scale(${1.6 - 0.6 * s}) rotate(${(1 - s) * -6}deg)`, opacity: s, textAlign: 'center'}}>
          <div
            style={{
              fontFamily: font,
              fontWeight: 900,
              fontSize: 120,
              lineHeight: 0.95,
              color: '#ffffff',
              WebkitTextStroke: '14px #121514',
              paintOrder: 'stroke fill',
              letterSpacing: -1,
            }}
          >
            72 HOURS
            <br />
            EARLIER
          </div>
          <div style={{height: 14, background: '#ff6b5b', borderRadius: 7, margin: '18px auto 0', width: `${70 * s}%`}} />
        </div>
      </AbsoluteFill>
    </>
  );
};

// ---------------------------------------------------------------- composition
const LOOK = {bg: '#151a1a', key: 1.35, fill: 0.55, light: {offset: [0.6, 6, 1.2] as [number, number, number], color: '#d6e8cf', sky: '#5e6b66', ground: '#1c201e'}};

export const Scene1Trapped: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = Math.min(frame, FREEZE); // everything holds on the freeze frame
  const al = alAt(t);
  const cam = cameraAt(t, al.jolt);
  const centre = new Vector3(10.0, 0, 0);
  const since = t - lastImpact(t);
  const flicker = since >= 1 && since <= 2 ? 0.6 : [40, 41, 96].includes(t) ? 0.7 : 1;
  const doorShake = since >= 0 && since < 20 ? 0.014 * Math.exp(-since / 4) * Math.sin(since * 2.2) : 0;
  const frozen = frame >= FREEZE;
  return (
    <AbsoluteFill style={{backgroundColor: LOOK.bg}}>
      <AbsoluteFill
        style={{
          filter: frozen ? 'grayscale(1) contrast(1.15) brightness(0.8)' : undefined,
          transform: frozen ? 'scale(1.04)' : undefined,
        }}
      >
        {/* Layer 1: the run-down lab and the door, slightly soft */}
        <AbsoluteFill>
          <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: cam.fov, position: [0, 2, 5]}}>
            <CameraRig cam={cam} />
            <color attach="background" args={[LOOK.bg]} />
            <fog attach="fog" args={[LOOK.bg, 4, 19]} />
            <Environment intensity={0.22} />
            <Daylight center={centre} extent={9} intensity={LOOK.key * flicker} fill={LOOK.fill * flicker} {...LOOK.light} />
            <SleepSet frame={t} variant="rundown" />
            <ChamberDoor doorX={DOOR_X} shake={doorShake} />
            <Dust t={t} />
          </ThreeCanvas>
        </AbsoluteFill>
        <AbsoluteFill style={{backdropFilter: 'blur(2px)', WebkitBackdropFilter: 'blur(2px)'}} />

        {/* Layer 2: the characters, sharp */}
        <AbsoluteFill>
          <ThreeCanvas
            width={WIDTH}
            height={HEIGHT}
            frameloop="demand"
            dpr={1}
            shadows="variance"
            gl={{antialias: true, alpha: true, premultipliedAlpha: false}}
            camera={{fov: cam.fov, position: [0, 2, 5]}}
          >
            <CameraRig cam={cam} />
            <Environment intensity={0.3} />
            <Daylight center={centre} extent={3} intensity={LOOK.key * flicker} fill={LOOK.fill * flicker} {...LOOK.light} />
            {VOLUNTEERS.map((v) => (
              <Volunteer key={v.name} v={v} t={t} />
            ))}
            <group position={[AL_X, 0, 0]} rotation={[0, al.yaw * DEG, 0]}>
              <Worker3D pose={al.pose} frame={t} look={al.look} carry="none" style={SCIENTIST_STYLE} />
              <ContactShadows pose={al.pose} opacity={0.35} />
            </group>
          </ThreeCanvas>
        </AbsoluteFill>

        <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 55%, transparent 45%, rgba(10,12,14,.62) 100%)'}} />
        <AbsoluteFill style={{background: '#0b0d0d', opacity: (1 - flicker) * 0.6}} />
        <Hud />
        <Captions t={t} fps={fps} />
        <Whisper t={t} />
      </AbsoluteFill>
      <Earlier frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};
