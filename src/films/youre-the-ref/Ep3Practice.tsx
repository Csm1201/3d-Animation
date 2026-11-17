/**
 * "You're the Ref" episode 3 practice shot (3 s, 30 fps), original 26.2–29.2 s:
 * "A FAN RUNS ONTO THE PITCH IN JUST HIS PANTS." / "HE GRABS THE BALL…"
 * Penalty shoot-out: blue #9 waits at the spot, the pink keeper is on his line, and a
 * streaker in white pants sprints on from the touchline with a steward chasing him.
 */
import React from 'react';
import {AbsoluteFill, Audio, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Vector3} from 'three';
import {BodySpec, idleSpec, keyedSpec, runSpec} from '../../core/sportPoses';
import {Cam} from '../../character3d/stage';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, armsUp, CALM, JOY, runAlong, Scene, ST} from './Episode2';
import {Badge, Captions, Cue, FONT, Scoreboard} from './Overlays';
import {Ball, BALL_R, kitStyle, PathFn, yawFor} from './Players';

export const EP3P_FRAMES = 90;
const AUDIO_START = 26.2;

const smooth = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

const SPOT = {x: 41.5, z: 0};

const STREAKER: Style = {
  outfit: 'kit',
  skin: '#f6c7a8',
  hair: '#d9a35a',
  hairStyle: 'wild',
  kit: {shirt: '#f6c7a8', shorts: '#fbfbf7', socks: '#f6c7a8', trim: '#f6c7a8', bare: true},
};
const BLUE9 = kitStyle('blue', 9, '#c98f6b', '#1f1714', 'short');
const STEWARD: Style = {
  outfit: 'kit',
  skin: '#8d5a3c',
  hair: '#151110',
  hairStyle: 'buzz',
  kit: {shirt: '#d8ff2e', shorts: '#1d2030', socks: '#1d2030', trim: '#1d2030', longSleeves: true},
};

// streaker sprints from the near touchline to the ball on the spot
const streakerPath: PathFn = (t) => {
  const u = clamp01(t / 2.95);
  const e = 1 - (1 - u) * (1 - u) * 0.25; // slight slow-down as he reaches the ball
  return {x: lerp(37, SPOT.x - 0.55, u * e), z: lerp(11, SPOT.z + 0.35, u * e) + Math.sin(u * Math.PI) * 1.0};
};
const stewardPath: PathFn = (t) => {
  const tt = Math.max(0, t - 0.9);
  return {x: 34.5 + 2.6 * tt, z: 15 - 4.2 * tt};
};

export const Ep3Practice: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  // streaker: flat-out sprint, arms windmilling over his head
  const st = runAlong(streakerPath, t, 1, 0.1);
  const streakerSpec = armsUp(st.spec, t * 1.3, 0.85 * (1 - smooth(clamp01((t - 2.55) / 0.3))), 2.2);
  const grab = smooth(clamp01((t - 2.6) / 0.35));
  const grabSpec: BodySpec = {lean: 38, headTilt: 10, near: {thigh: 30, knee: 70}, far: {thigh: -20, knee: 40}, nearArm: [70, 10], farArm: [55, 15]};
  const streakerFinal = t > 2.55 ? keyedSpec([[2.55, streakerSpec], [2.95, grabSpec]], t) : streakerSpec;
  const streakerLook: Look = {tired: 0, droop: -8, eyesClosed: false, brows: 0.6, browLift: 0.8, mouth: 'open', mouthOpen: 0.7 + 0.2 * Math.sin(t * 14), noBlink: true, pupils: 0.85};

  // steward gives chase from behind
  const sw = t > 0.9 ? runAlong(stewardPath, t, 0.9, 0.4) : null;

  // ref turns toward the streaker and blows up, arms out
  const refTurn = smooth(clamp01((t - 0.3) / 0.6));
  const refYaw = lerp(yawFor(-1, -0.4), yawFor(streakerPath(t).x - 44, streakerPath(t).z - 3.8), refTurn);
  const refSpec: BodySpec = {...idleSpec(frame, 0.5), nearArm: [lerp(0, 75, refTurn), lerp(14, 20, refTurn)], farArm: [lerp(0, 60, refTurn), 20]};
  // #9 hands on head in disbelief
  const nine = smooth(clamp01((t - 1.0) / 0.4));
  const nineSpec: BodySpec = {...idleSpec(frame, 0.2), lean: lerp(2, -6, nine), nearArm: [lerp(-4, 165, nine), lerp(14, 150, nine)], farArm: [lerp(5, 160, nine), lerp(14, 150, nine)]};
  const nineYaw = lerp(0, yawFor(streakerPath(t).x - 39.4, streakerPath(t).z - 0.9), smooth(clamp01((t - 0.6) / 0.6)));
  // keeper bounces on his line, then stops and stares
  const keeperSpec = runSpec((t * 1.8) % 1, 0.25 * (1 - smooth(clamp01((t - 1) / 0.4))));

  // ball sits on the spot until he scoops it
  const ball = t < 2.9 ? v3(SPOT.x, BALL_R, SPOT.z) : v3(SPOT.x - 0.2, BALL_R + 0.6 * smooth(clamp01((t - 2.9) / 0.1)), SPOT.z + 0.2);

  // camera: low wide from the near side, panning with the streaker toward the spot
  const sp = streakerPath(t);
  const follow = smooth(clamp01(t / 3));
  const cam: Cam = {
    position: v3(lerp(30.5, 32, follow), lerp(2.6, 2.9, follow), lerp(13.5, 11.5, follow)),
    target: v3(lerp(sp.x, SPOT.x, lerp(0.25, 0.5, follow)), 0.9, lerp(sp.z, SPOT.z, lerp(0.25, 0.5, follow))),
    fov: 58,
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#0a0d1a'}}>
      <Audio src={staticFile('ref-ep3-audio.m4a')} trimBefore={Math.round(AUDIO_START * fps)} />
      <Scene cam={cam} frame={frame} centre={v3(sp.x + 2, 0, sp.z * 0.6)} extent={18} excite={1.4}>
        <Actor style={STREAKER} x={sp.x} z={sp.z} yaw={st.yaw} spec={streakerFinal} frame={frame} look={streakerLook} />
        {sw ? <Actor style={STEWARD} x={sw.pos.x} z={sw.pos.z} yaw={sw.yaw} spec={sw.spec} frame={frame} look={{...CALM, brows: -0.8, mouth: 'open', mouthOpen: 0.4}} /> : null}
        <Actor style={ST.ref} x={44} z={3.8} yaw={refYaw} spec={refSpec} frame={frame} look={{...CALM, brows: -0.6, browLift: 0.5, mouth: 'open', mouthOpen: 0.35}} />
        <Actor style={BLUE9} x={39.4} z={0.9} yaw={nineYaw} spec={nineSpec} frame={frame} look={{...JOY, mouth: 'open', mouthOpen: 0.5, brows: 0.8}} />
        <Actor style={ST.pinkKeeper} x={52.1} z={0.2} yaw={Math.PI} spec={keeperSpec} frame={frame} look={{...CALM, browLift: 0.6}} />
        <Ball pos={ball} spin={0} axisYaw={0} />
      </Scene>

      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 38%, rgba(190,205,255,.10), transparent 55%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 52%, rgba(4,6,14,.55) 100%)'}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(4,6,14,.55) 0%, transparent 14%, transparent 58%, rgba(4,6,14,.35) 100%)'}} />

      <StreakerTitle frame={frame} fps={fps} />
      <Badge episode={3} />
      <Scoreboard frame={frame} fps={fps} goalAt={1e9} base={[1, 1]} clock="PENS" />
      <Captions cues={CUES} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const CUES: Cue[] = [
  {from: 0, to: 87, text: 'A FAN RUNS ONTO THE PITCH IN JUST HIS PANTS.', hl: {PANTS: '#ffd23a'}},
  {from: 87, to: 90, text: 'HE GRABS THE BALL…', hl: {BALL: '#ffd23a'}},
];

const StreakerTitle: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame: frame - 2, fps, config: {damping: 8, stiffness: 240}});
  const wob = Math.sin(frame * 0.5) * 2;
  const siren = Math.floor(frame / 6) % 2 === 0;
  const out = interpolate(frame, [80, 87], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', top: 330, left: 0, right: 0, textAlign: 'center', opacity: out}}>
      <span
        style={{
          display: 'inline-block',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 150,
          color: siren ? '#ff3b3b' : '#ff6a3d',
          WebkitTextStroke: '16px #ffffff',
          paintOrder: 'stroke fill',
          textShadow: `0 14px 34px rgba(0,0,0,.55), 0 0 ${siren ? 60 : 20}px rgba(255,60,60,.65)`,
          transform: `rotate(${-6 + wob}deg) scale(${2.2 - 1.2 * s})`,
          opacity: Math.min(1, s * 2),
          letterSpacing: 2,
        }}
      >
        STREAKER!
      </span>
    </div>
  );
};
