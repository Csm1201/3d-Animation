/**
 * You're the Ref Short: "Jimmy vs the Gang" (script: docs/scripts/ref-short-gang-script.md)
 *
 *   0.0  HOOK: Jimmy mid-scuba-dance right in front of four mobsters with tommy guns  (BAD IDEA?)
 *   1.3  ◀◀ 10 SECONDS EARLIER: Jimmy strolls into the alley, stops, blows his whistle
 *   3.4  low angle: the gang glares
 *   4.4  the scuba dance (from behind the gang, then low and close with the guns in the foreground)
 *   8.0  record scratch, the music dies, the mobsters look at each other
 *   9.0  the boss raises his gun at Jimmy (click-clack); Jimmy freezes mid-dance
 *   9.6  outside the alley: flash, BANG, pigeons (nothing else shown)
 *  10.2  Jimmy flat on his back in a small pool of blood, halo, whistle rolling away
 *  10.9  RATE THE DANCE 1-10 + comment; loops to the hook
 */
import React from 'react';
import {AbsoluteFill, Audio, Sequence, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Vector3} from 'three';
import {BodySpec, idleSpec} from '../../core/sportPoses';
import {Cam} from '../../character3d/stage';
import {Actor, runAlong} from './Episode2';
import {DEADPAN, handLocal, JIMMY} from './Episode4';
import {CommentButton, FONT} from './Overlays';
import {Alley, danceSpec, Gang, GLARE, Night, ShotBang, ShotDance, ShotDown, ShotGang, ShotLook, whistleGeo, whistleMat} from './ShortSafetyPreview';

export const GANG_FPS = 30;
const F = (s: number) => Math.round(s * GANG_FPS);
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

const T_REWIND = 1.3;
const T_ARRIVE = 1.3;
const T_GANG = 3.4;
const T_DANCE = 4.4;
const T_DANCE2 = 6.2;
const T_LOOK = 8.0;
const T_COCK = 9.0;
const T_BANG = 9.6;
const T_DOWN = 10.2;
const T_RATE = 10.9;
export const GANG_FRAMES = F(13.5);

/** Jimmy strolls into the alley (seen from behind him), stops in front of the gang and blows his whistle. */
const WALK0 = 0.4;
const WALK1 = 1.6;
const ShotArrive: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GANG_FPS;
  const walk = runAlong((tt) => ({x: lerp(-3.0, 0, smooth(clamp01((tt - WALK0) / (WALK1 - WALK0)))), z: 0.3}), t, 0.3);
  const moving = t > WALK0 && t < WALK1;
  const blow = t > 1.65 && t < 1.98 ? 1 : 0;
  const base: BodySpec = moving ? walk.spec : idleSpec(frame, 0.2);
  const spec: BodySpec = blow ? {...base, nearArm: [30, 138]} : base;
  const turn = smooth(clamp01((t - 1.7) / 0.25));
  const cam: Cam = {position: v3(lerp(-4.7, -4.4, t / 2.1), 1.55, 0.85), target: v3(1.2, 1.15, 0.25), fov: 46};
  return (
    <Night cam={cam} centre={v3(0, 0, 0)} flicker={t > 1.2 && t < 1.27 ? 0.35 : 1}>
      <Alley flicker={t > 1.2 && t < 1.27 ? 0.35 : 1} />
      <Actor style={{...JIMMY, nearHandZ: blow ? 0.03 : undefined}} x={walk.pos.x} z={0.3} yaw={moving ? walk.yaw : 0} spec={spec} frame={frame} look={DEADPAN(0, t)}>
        {(pose) => (blow ? <mesh geometry={whistleGeo} material={whistleMat} position={handLocal(pose, false).add(v3(0.03, 0.01, 0))} rotation={[0, 0, Math.PI / 2]} scale={0.6} /> : null)}
      </Actor>
      {/* they were talking among themselves; the whistle turns every head */}
      <Gang t={T_ARRIVE + t} frame={frame} look={(i) => ({...GLARE, brows: lerp(0, -1, turn), yaw: lerp([50, -60, 70, -40][i], 0, turn)})} />
    </Night>
  );
};

/** The boss brings his gun up to Jimmy (pointing away from camera). Jimmy freezes in his deepest crouch, nose still pinched. */
const ShotCock: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / GANG_FPS;
  const raise = smooth(clamp01((t - 0.05) / 0.2));
  const frozen = danceSpec(1.8, 0);
  const cam: Cam = {position: v3(lerp(2.55, 2.4, t / 0.6), 1.25, 0.2), target: v3(0.2, 0.9, 0.35), fov: 46};
  return (
    <Night cam={cam} centre={v3(1.0, 0, 0)} flicker={1}>
      <Alley flicker={1} />
      <Actor style={{...JIMMY, nearHandZ: 0.03}} x={0} z={0.3} yaw={0.5} spec={frozen.spec} frame={frame} look={{...DEADPAN(0, t), yaw: 6, pupils: 0.8, stare: true}} />
      <Gang t={T_COCK + t} frame={F(T_COCK) + frame} look={() => GLARE} raise={raise} />
    </Night>
  );
};

// ---------------------------------------------------------------- overlays
const HookCaption: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  if (frame >= F(T_REWIND)) return null;
  const s = spring({frame: frame - 2, fps, config: {damping: 9, stiffness: 260}});
  return (
    <div style={{position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 130, color: '#fff', WebkitTextStroke: '6px #111', textShadow: '0 10px 0 #111', transform: `scale(${frame < 2 ? 0 : s})`}}>
      BAD IDEA?
    </div>
  );
};

/** VHS-style rewind: dark scanlined wash, ◀◀ and the time stamp. */
const Rewind: React.FC<{frame: number}> = ({frame}) => {
  const local = frame - F(T_REWIND);
  if (local < 0 || local >= F(0.45)) return null;
  const jitter = (local % 3) - 1;
  return (
    <AbsoluteFill style={{background: 'rgba(10,12,24,.55)', alignItems: 'center', justifyContent: 'center', fontFamily: FONT}}>
      <AbsoluteFill style={{backgroundImage: 'repeating-linear-gradient(0deg, rgba(255,255,255,.08) 0 3px, transparent 3px 9px)', transform: `translateY(${jitter * 6}px)`}} />
      <div style={{display: 'flex', alignItems: 'center', gap: 22, transform: `translateX(${jitter * 8}px)`}}>
        {[0, 1].map((i) => (
          <div key={i} style={{width: 0, height: 0, borderTop: '42px solid transparent', borderBottom: '42px solid transparent', borderRight: '62px solid #fff', marginRight: -18}} />
        ))}
        <div style={{marginLeft: 30, fontWeight: 900, fontSize: 70, color: '#fff', letterSpacing: 2}}>10 SECONDS EARLIER</div>
      </div>
    </AbsoluteFill>
  );
};

const RateCard: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const local = frame - F(T_RATE);
  if (local < 0) return null;
  const s = spring({frame: local, fps, config: {damping: 9, stiffness: 240}});
  const n = spring({frame: local - 6, fps, config: {damping: 8, stiffness: 260}});
  return (
    <div style={{position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center', fontFamily: FONT}}>
      <div style={{fontWeight: 900, fontSize: 92, color: '#fff', WebkitTextStroke: '5px #111', textShadow: '0 9px 0 #111', transform: `scale(${s})`}}>RATE THE DANCE</div>
      <div style={{display: 'inline-block', marginTop: 18, fontWeight: 900, fontSize: 96, color: '#111', background: '#ffd23a', borderRadius: 20, padding: '4px 40px', boxShadow: '0 10px 0 #111', transform: `scale(${local < 6 ? 0 : n}) rotate(-3deg)`}}>1-10</div>
    </div>
  );
};

// ---------------------------------------------------------------- sound
type S = {at: number; src: string; vol?: number; dur?: number};
const SOUNDS: S[] = [
  {at: 0.0, src: 'short-safety/scuba-beat.wav', vol: 0.85, dur: T_REWIND},
  {at: T_REWIND, src: 'ep5/rewind.wav', vol: 0.6, dur: 0.45},
  {at: T_ARRIVE + WALK0, src: 'ep6/steps.wav', vol: 0.5, dur: WALK1 - WALK0},
  {at: T_ARRIVE + 1.67, src: 'short-safety/peep.wav', vol: 0.9},
  {at: T_GANG, src: 'short-safety/drone.wav', vol: 0.75},
  {at: T_DANCE, src: 'short-safety/scuba-beat.wav', vol: 0.85, dur: 1.8},
  {at: T_DANCE2, src: 'short-safety/scuba-beat.wav', vol: 0.85, dur: 1.8},
  {at: T_LOOK, src: 'ep5/scratch.wav', vol: 0.55},
  {at: T_COCK + 0.08, src: 'short-safety/cock.wav', vol: 0.9},
  {at: T_BANG + 0.1, src: 'short-safety/bang.wav', vol: 0.95},
  {at: T_BANG + 0.15, src: 'short-safety/pigeons.wav', vol: 0.55},
  {at: T_DOWN + 0.1, src: 'ep4/twinkle.wav', vol: 0.5},
  {at: T_RATE, src: 'ep6/ding.wav', vol: 0.45},
];

export const ShortGang: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seq = (from: number, to: number, el: React.ReactNode) => (
    <Sequence from={F(from)} durationInFrames={F(to) - F(from)}>
      {el}
    </Sequence>
  );
  return (
    <AbsoluteFill style={{backgroundColor: '#070a16'}}>
      {seq(0, T_REWIND, <ShotDance from={0} t0={0.9} view="side" len={T_REWIND} />)}
      {seq(T_ARRIVE, T_GANG, <ShotArrive />)}
      {seq(T_GANG, T_DANCE, <ShotGang />)}
      {seq(T_DANCE, T_DANCE2, <ShotDance from={F(T_DANCE)} view="behind" len={1.8} />)}
      {seq(T_DANCE2, T_LOOK, <ShotDance from={F(T_DANCE2)} t0={1.8} view="side" len={1.8} />)}
      {seq(T_LOOK, T_COCK, <ShotLook from={F(T_LOOK)} />)}
      {seq(T_COCK, T_BANG, <ShotCock />)}
      {seq(T_BANG, T_DOWN, <ShotBang />)}
      {seq(T_DOWN, GANG_FRAMES / GANG_FPS, <ShotDown />)}
      <HookCaption frame={frame} fps={fps} />
      <Rewind frame={frame} />
      <RateCard frame={frame} fps={fps} />
      <CommentButton frame={frame} fps={fps} from={F(T_RATE + 0.4)} to={GANG_FRAMES} />
      {SOUNDS.map((s, i) => (
        <Sequence key={i} from={F(s.at)} durationInFrames={s.dur ? F(s.dur) : undefined}>
          <Audio src={staticFile(s.src)} volume={s.vol ?? 1} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
