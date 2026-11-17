/**
 * 2D overlays for "You're the Ref": badge, scoreboard, word-pop captions, answer cards,
 * tags and title cards. All timing is in frames of the parent composition.
 */
import React from 'react';
import {interpolate, spring} from 'remotion';

export const FONT = '"Inter Display", Inter, system-ui, sans-serif';
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

// ---------------------------------------------------------------- badge + scoreboard
export const Badge: React.FC<{episode?: number}> = ({episode = 2}) => (
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
    <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 33, color: '#fff', letterSpacing: 0.5}}>YOU'RE THE REF</div>
    <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 21, color: '#f3b73b', letterSpacing: 1.5, marginTop: 2}}>EPISODE {episode}</div>
  </div>
);

/** Scoreboard; `goalAt` is the frame Orange's goal goes up (score flips to 0–1 with a pulse). */
export const Scoreboard: React.FC<{frame: number; fps: number; goalAt: number; base?: [number, number]; clock?: string; scorer?: 'blu' | 'ora'}> = ({frame, fps, goalAt, base = [0, 0], clock = '90+3', scorer = 'ora'}) => {
  const t = frame / fps;
  const live = 0.55 + 0.45 * Math.sin(t * 6);
  const scored = frame >= goalAt;
  const pulse = scored ? spring({frame: frame - goalAt, fps, config: {damping: 9, stiffness: 200}}) : 0;
  const glow = scored ? interpolate(frame - goalAt, [0, 30], [1, 0], clamp) : 0;
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
        boxShadow: `0 10px 30px rgba(0,0,0,.45), 0 0 ${40 * glow}px rgba(255,122,26,${glow})`,
        display: 'flex',
        alignItems: 'center',
        overflow: 'hidden',
        transform: `scale(${1 + 0.12 * Math.sin(Math.PI * Math.min(1, pulse)) * (1 - Math.min(1, (frame - goalAt) / 20))})`,
      }}
    >
      <div style={{width: 18, alignSelf: 'stretch', background: 'linear-gradient(180deg, #4d8bff, #2457d6)'}} />
      <div style={{flex: 1, textAlign: 'center'}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 38, color: '#fff', fontVariantNumeric: 'tabular-nums', letterSpacing: 0.5}}>
          BLU <span style={{color: scored && glow > 0 && scorer === 'blu' ? '#9cc0ff' : '#fff'}}>{base[0] + (scored && scorer === 'blu' ? 1 : 0)}</span>–<span style={{color: scored && glow > 0 && scorer === 'ora' ? '#ffb070' : '#fff'}}>{base[1] + (scored && scorer === 'ora' ? 1 : 0)}</span> ORA
        </div>
        <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 21, color: '#d7dbe6', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8}}>
          <span style={{width: 10, height: 10, borderRadius: 5, background: '#ff3b30', opacity: live}} />
          {clock}
        </div>
      </div>
      <div style={{width: 18, alignSelf: 'stretch', background: 'linear-gradient(180deg, #ff9a3d, #ff6a00)'}} />
    </div>
  );
};

// ---------------------------------------------------------------- captions
export type Cue = {from: number; to: number; text: string; hl?: Record<string, string>; top?: number};

const HL_DEFAULT = '#ffd23a';

export const Captions: React.FC<{cues: Cue[]; frame: number; fps: number}> = ({cues, frame, fps}) => {
  const cue = cues.find((c) => frame >= c.from && frame < c.to);
  if (!cue) return null;
  const words = cue.text.split(' ');
  const out = interpolate(frame, [cue.to - 4, cue.to], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top: cue.top ?? 1185,
        left: 50,
        right: 50,
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: '0 30px',
        opacity: out,
      }}
    >
      {words.map((w, i) => {
        const s = spring({frame: frame - cue.from - 2 * i, fps, config: {damping: 11, stiffness: 260}});
        const key = w.replace(/[^A-Z0-9+'-]/gi, '').toUpperCase();
        const color = cue.hl && key in cue.hl ? cue.hl[key] || HL_DEFAULT : '#ffffff';
        return (
          <span
            key={i}
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 88,
              lineHeight: 1.02,
              color,
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
  );
};

// ---------------------------------------------------------------- tags
export const Tag: React.FC<{text: string; frame: number; fps: number; from: number; style?: React.CSSProperties; bg?: string; pulse?: boolean}> = ({text, frame, fps, from, style, bg = '#e5262b', pulse}) => {
  const s = spring({frame: frame - from, fps, config: {damping: 12, stiffness: 220}});
  if (frame < from) return null;
  const p = pulse ? 0.85 + 0.15 * Math.abs(Math.sin(frame * 0.18)) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 34,
        color: '#fff',
        background: bg,
        padding: '10px 26px',
        borderRadius: 10,
        boxShadow: '0 8px 24px rgba(0,0,0,.4)',
        transform: `scale(${(0.6 + 0.4 * s) * p})`,
        opacity: s,
        ...style,
      }}
    >
      {text}
    </div>
  );
};

// ---------------------------------------------------------------- answer cards
export type Option = {
  letter: string;
  title: string;
  sub: string;
  /** stamp shown from frame */
  stamp?: {text: string; color: string; at: number};
  /** highlight (green border) from frame */
  win?: number;
  /** dimmed (lost) from frame */
  lose?: number;
};

const Stamp: React.FC<{text: string; color: string; frame: number; fps: number; at: number}> = ({text, color, frame, fps, at}) => {
  if (frame < at) return null;
  const s = spring({frame: frame - at, fps, config: {damping: 10, stiffness: 240}});
  return (
    <div
      style={{
        position: 'absolute',
        right: -18,
        top: -22,
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 34,
        letterSpacing: 1,
        color: '#fff',
        background: color,
        padding: '6px 16px',
        borderRadius: 8,
        transform: `rotate(-8deg) scale(${2.2 - 1.2 * s})`,
        opacity: Math.min(1, s * 2),
        boxShadow: '0 6px 18px rgba(0,0,0,.45)',
      }}
    >
      {text}
    </div>
  );
};

export const AnswerCard: React.FC<{
  title: string;
  options: Option[];
  frame: number;
  fps: number;
  from: number;
  to: number;
  law?: {text: string; at: number};
  pulseFrom?: number;
  top?: number;
}> = ({title, options, frame, fps, from, to, law, pulseFrom, top = 300}) => {
  const s = spring({frame: frame - from, fps, config: {damping: 13, stiffness: 160}});
  const out = interpolate(frame, [to - 8, to], [1, 0], clamp);
  return (
    <div
      style={{
        position: 'absolute',
        top,
        left: 120,
        right: 120,
        padding: '36px 30px 34px',
        borderRadius: 30,
        background: 'linear-gradient(180deg, rgba(24,27,38,.96), rgba(12,14,20,.96))',
        border: '4px solid #e8b545',
        boxShadow: '0 30px 80px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
        transform: `translateY(${(1 - s) * 120}px) scale(${0.9 + 0.1 * s})`,
        opacity: Math.min(s * 1.5, 1) * out,
      }}
    >
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 40, color: '#fff', textAlign: 'center', letterSpacing: 1, marginBottom: 28}}>{title}</div>
      {options.map((o, i) => {
        const os = spring({frame: frame - from - 8 - i * 6, fps, config: {damping: 12, stiffness: 200}});
        const won = o.win !== undefined && frame >= o.win ? spring({frame: frame - o.win, fps, config: {damping: 14, stiffness: 180}}) : 0;
        const lost = o.lose !== undefined && frame >= o.lose ? interpolate(frame - o.lose, [0, 10], [0, 1], clamp) : 0;
        const pulse = pulseFrom !== undefined && frame >= pulseFrom ? (Math.floor((frame - pulseFrom) / 22) % options.length === i ? 1 : 0) : 0;
        return (
          <div
            key={i}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 26,
              padding: '22px 24px',
              marginTop: i ? 22 : 0,
              borderRadius: 18,
              background: lost ? `rgba(${120 + 40 * lost},28,30,.9)` : won ? 'rgba(18,60,34,.95)' : 'rgba(38,42,56,.95)',
              border: `4px solid ${won ? '#2fd65f' : pulse ? '#e8b545' : 'rgba(255,255,255,.12)'}`,
              boxShadow: won ? `0 0 ${30 * won}px rgba(47,214,95,.55)` : 'none',
              transform: `translateX(${(1 - os) * -60}px) scale(${1 + 0.04 * won + 0.03 * pulse})`,
              opacity: os,
            }}
          >
            <div style={{width: 74, height: 74, borderRadius: 14, background: '#f3b73b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 44, color: '#2a1d05'}}>{o.letter}</div>
            <div>
              <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: lost ? '#f2b6b6' : '#fff', lineHeight: 1.05}}>{o.title}</div>
              <div style={{fontFamily: FONT, fontWeight: 600, fontSize: 30, color: lost ? '#d99' : '#b9bfd0'}}>{o.sub}</div>
            </div>
            {o.stamp ? <Stamp {...o.stamp} frame={frame} fps={fps} /> : null}
          </div>
        );
      })}
      {law && frame >= law.at ? (
        <div style={{display: 'flex', justifyContent: 'center', marginTop: 26}}>
          <div
            style={{
              fontFamily: FONT,
              fontWeight: 900,
              fontSize: 26,
              color: '#fff',
              background: '#e5262b',
              padding: '8px 22px',
              borderRadius: 8,
              transform: `scale(${spring({frame: frame - law.at, fps, config: {damping: 11, stiffness: 220}})})`,
            }}
          >
            {law.text}
          </div>
        </div>
      ) : null}
    </div>
  );
};

/** Big yellow "GOAL?!" slam. */
export const GoalSlam: React.FC<{frame: number; fps: number; from: number; to: number; top?: number; text?: string}> = ({frame, fps, from, to, top = 470, text = 'GOAL?!'}) => {
  if (frame < from || frame >= to) return null;
  const s = spring({frame: frame - from, fps, config: {damping: 8, stiffness: 260}});
  const out = interpolate(frame, [to - 6, to], [1, 0], clamp);
  const shake = frame - from < 10 ? Math.sin((frame - from) * 2.3) * (10 - (frame - from)) * 1.2 : 0;
  return (
    <div style={{position: 'absolute', top, left: 0, right: 0, textAlign: 'center', opacity: out}}>
      <span
        style={{
          display: 'inline-block',
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 200,
          color: '#ffd23a',
          WebkitTextStroke: '18px #0d0f14',
          paintOrder: 'stroke fill',
          textShadow: '0 16px 40px rgba(0,0,0,.6)',
          transform: `translateX(${shake}px) rotate(-5deg) scale(${2.4 - 1.4 * s})`,
          opacity: Math.min(1, s * 2),
        }}
      >
        {text}
      </span>
    </div>
  );
};

/** "COMMENT ▶" button that bobs. */
export const CommentButton: React.FC<{frame: number; fps: number; from: number; to: number}> = ({frame, fps, from, to}) => {
  if (frame < from || frame >= to) return null;
  const s = spring({frame: frame - from, fps, config: {damping: 10, stiffness: 220}});
  const bob = Math.sin((frame - from) * 0.25) * 6;
  const tap = (frame - from) % 36 < 4 ? 0.92 : 1;
  return (
    <div style={{position: 'absolute', top: 1035, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `translateY(${bob}px)`}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 14, transform: `scale(${s * tap})`}}>
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 46, color: '#fff', background: 'linear-gradient(180deg,#ff9a3d,#ff6a00)', padding: '10px 30px', borderRadius: 14, boxShadow: '0 10px 26px rgba(255,106,0,.45)'}}>COMMENT</div>
        <div style={{width: 0, height: 0, borderTop: '26px solid transparent', borderBottom: '26px solid transparent', borderLeft: '38px solid #ff7a1a'}} />
      </div>
    </div>
  );
};
