/**
 * Episode ending (33.1–38.8 s): "WHAT'S YOUR CALL?" as a versus vote screen.
 *
 *   0.0–1.5  A vs B panels slam in from the sides, VS badge, ref thinking (hand to head)
 *   1.5–3.3  "COMMENT A OR B": live vote meter swings, comments pop into a feed,
 *            COMMENT button gets tapped, ref points at the viewer
 *   3.3–5.7  "THE ANSWER'S IN THE NEXT EPISODE": panels lock, meter hides the result,
 *            EPISODE 3 stamp slams in, ref folds his arms and smirks
 */
import React from 'react';
import {AbsoluteFill, interpolate, spring} from 'remotion';
import {FONT} from './Overlays';

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
export const END_COMMENT = 1.5; // seconds into the ending
export const END_NEXT = 3.3;

export type EndingCfg = {
  a: {title: string; sub: string};
  b: {title: string; sub: string};
  commentAt: number;
  nextAt: number;
  nextLabel: string;
  nextEp: number;
  comments: {user: string; text: string; pick: 'A' | 'B' | '?'; likes: number}[];
};

// ---------------------------------------------------------------- versus panels
const Panel: React.FC<{side: 'A' | 'B'; frame: number; fps: number; locked: number; lead: number; cfg: EndingCfg}> = ({side, frame, fps, locked, lead, cfg}) => {
  const a = side === 'A';
  const s = spring({frame: frame - (a ? 0 : 4), fps, config: {damping: 13, stiffness: 190}});
  const x = (1 - s) * (a ? -620 : 620);
  const tap = Math.max(0, Math.sin(frame * 0.35 + (a ? 0 : Math.PI))) * (1 - locked);
  return (
    <div
      style={{
        position: 'absolute',
        top: 250,
        [a ? 'left' : 'right']: 34,
        width: 486,
        height: 360,
        transform: `translateX(${x}px) skewY(${a ? -4 : 4}deg) scale(${1 + 0.035 * tap + 0.04 * lead})`,
        borderRadius: 26,
        background: a ? 'linear-gradient(160deg,#ff9a3d 0%,#ff6a00 55%,#c94a00 100%)' : 'linear-gradient(160deg,#5a95ff 0%,#2f6df0 55%,#1d47b0 100%)',
        border: '6px solid #fff',
        boxShadow: `0 24px 60px rgba(0,0,0,.5), 0 0 ${50 * lead}px ${a ? 'rgba(255,140,40,.8)' : 'rgba(80,140,255,.8)'}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        filter: locked ? `saturate(${1 - 0.5 * locked}) brightness(${1 - 0.25 * locked})` : undefined,
        overflow: 'hidden',
      }}
    >
      <div style={{position: 'absolute', inset: 0, background: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 22px, transparent 22px 44px)', transform: `translateX(${(frame * 3) % 44}px)`}} />
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 150, lineHeight: 0.9, color: '#fff', WebkitTextStroke: '10px rgba(0,0,0,.25)', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,.18)'}}>{side}</div>
      <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 62, color: '#fff', marginTop: 6, letterSpacing: 1, textShadow: '0 4px 10px rgba(0,0,0,.3)'}}>{a ? cfg.a.title : cfg.b.title}</div>
      <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 32, color: 'rgba(255,255,255,.88)'}}>{a ? cfg.a.sub : cfg.b.sub}</div>
    </div>
  );
};

const VsBadge: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = spring({frame: frame - 9, fps, config: {damping: 7, stiffness: 260}});
  const jit = frame < 24 ? Math.sin(frame * 2.7) * (24 - frame) * 0.5 : Math.sin(frame * 0.4) * 1.5;
  return (
    <div
      style={{
        position: 'absolute',
        top: 335,
        left: 540 - 95,
        width: 190,
        height: 190,
        borderRadius: '50%',
        background: 'radial-gradient(circle at 35% 30%, #fff36b, #ffc21a 60%, #d68f00)',
        border: '8px solid #0d0f14',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `translate(${jit}px, ${-jit * 0.5}px) rotate(${-8 + jit}deg) scale(${s})`,
        boxShadow: '0 16px 40px rgba(0,0,0,.55), 0 0 50px rgba(255,210,58,.6)',
        fontFamily: FONT,
        fontWeight: 900,
        fontSize: 92,
        color: '#0d0f14',
        letterSpacing: -2,
      }}
    >
      VS
    </div>
  );
};

// ---------------------------------------------------------------- live vote meter
const voteA = (frame: number, fps: number, commentAt: number) => {
  const t = frame / fps - commentAt;
  if (t < 0) return 50;
  // swings as "comments" come in, settling near a dead heat
  return 50 + 14 * Math.sin(t * 3.1) * Math.exp(-t * 0.25) + 6 * Math.sin(t * 7.3 + 1) * Math.exp(-t * 0.4);
};

const VoteMeter: React.FC<{frame: number; fps: number; hidden: number; cfg: EndingCfg}> = ({frame, fps, hidden, cfg}) => {
  const show = spring({frame: frame - Math.round(cfg.commentAt * fps), fps, config: {damping: 14, stiffness: 180}});
  if (frame < cfg.commentAt * fps) return null;
  const a = voteA(frame, fps, cfg.commentAt);
  const live = Math.floor(frame / 9) % 2 === 0;
  return (
    <div style={{position: 'absolute', top: 668, left: 60, right: 60, transform: `scaleX(${show})`, opacity: show}}>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontFamily: FONT, fontWeight: 900, fontSize: 34, color: '#fff', textShadow: '0 3px 8px rgba(0,0,0,.6)'}}>
        <span style={{color: '#ffb070'}}>A {hidden ? '??' : Math.round(a)}%</span>
        <span style={{display: 'flex', alignItems: 'center', gap: 10, fontSize: 26, letterSpacing: 2}}>
          <span style={{width: 14, height: 14, borderRadius: 7, background: '#ff3b30', opacity: live ? 1 : 0.3}} />
          {hidden ? `RESULT IN EP. ${cfg.nextEp}` : 'LIVE VOTE'}
        </span>
        <span style={{color: '#9cc0ff'}}>{hidden ? '??' : Math.round(100 - a)}% B</span>
      </div>
      <div style={{position: 'relative', height: 42, borderRadius: 21, overflow: 'hidden', border: '4px solid #fff', background: '#2f6df0', boxShadow: '0 10px 26px rgba(0,0,0,.45)'}}>
        <div style={{position: 'absolute', left: 0, top: 0, bottom: 0, width: `${a}%`, background: 'linear-gradient(90deg,#ff6a00,#ff9a3d)'}} />
        <div style={{position: 'absolute', left: `calc(${a}% - 4px)`, top: -6, bottom: -6, width: 8, background: '#fff', boxShadow: '0 0 14px #fff'}} />
        {hidden ? <div style={{position: 'absolute', inset: 0, backdropFilter: 'blur(8px)', background: 'rgba(10,12,20,.55)', opacity: hidden}} /> : null}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- comment feed
export const EP2_ENDING: EndingCfg = {
  a: {title: 'GOAL', sub: 'it stands'},
  b: {title: 'NO GOAL', sub: 'dropped ball'},
  commentAt: END_COMMENT,
  nextAt: END_NEXT,
  nextLabel: 'ANSWER IN EPISODE 3',
  nextEp: 3,
  comments: [
  {user: 'orange_army', text: "A. The ref is part of the pitch, it counts", pick: 'A', likes: 214},
  {user: 'blu_til_i_die', text: "B!! You can't score off the referee", pick: 'B', likes: 389},
  {user: 'sunday_league_ref', text: 'A all day. Ball hits ref, play on', pick: 'A', likes: 157},
  {user: 'laws_of_the_game', text: 'B, dropped ball. Law 9, look it up', pick: 'B', likes: 502},
  {user: 'touchline_tom', text: 'that ref needs an ice pack', pick: '?', likes: 811},
],
};

const GAP = 9; // frames between new comments

const CommentFeed: React.FC<{frame: number; fps: number; out: number; cfg: EndingCfg}> = ({frame, fps, out, cfg}) => {
  const COMMENTS = cfg.comments;
  const start = Math.round(cfg.commentAt * fps) + 4;
  if (frame < start) return null;
  const n = Math.min(COMMENTS.length, Math.floor((frame - start) / GAP) + 1);
  const ROW = 116;
  return (
    <div style={{position: 'absolute', top: 1385, left: 60, right: 60, height: ROW * 3 + 30, overflow: 'hidden', opacity: 1 - out, WebkitMaskImage: 'linear-gradient(180deg, transparent 0, #000 22%, #000 100%)'}}>
      {COMMENTS.slice(0, n).map((c, i) => {
        const born = start + i * GAP;
        const s = spring({frame: frame - born, fps, config: {damping: 13, stiffness: 220}});
        // newest at the bottom, older ones slide up
        const slot = n - 1 - i;
        const yTarget = ROW * 2 - slot * ROW;
        const prev = Math.max(0, n - 2 - i);
        const slide = spring({frame: frame - (start + (n - 1) * GAP), fps, config: {damping: 15, stiffness: 200}});
        const y = i === n - 1 ? yTarget + (1 - s) * 60 : lerp(ROW * 2 - prev * ROW, yTarget, slide);
        const likes = c.likes + Math.floor(Math.max(0, frame - born) * (2 + i));
        const tagCol = c.pick === 'A' ? '#ff7a1a' : c.pick === 'B' ? '#2f6df0' : '#6b7080';
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: y,
              left: 0,
              right: 0,
              height: ROW - 14,
              display: 'flex',
              alignItems: 'center',
              gap: 18,
              padding: '0 22px',
              borderRadius: 22,
              background: 'rgba(14,16,24,.88)',
              border: '2px solid rgba(255,255,255,.12)',
              boxShadow: '0 10px 24px rgba(0,0,0,.35)',
              opacity: Math.min(1, s * 1.5),
              transform: `scale(${0.9 + 0.1 * s})`,
            }}
          >
            <div style={{width: 64, height: 64, borderRadius: 32, background: tagCol, flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, fontWeight: 900, fontSize: 34, color: '#fff'}}>{c.pick}</div>
            <div style={{flex: 1, minWidth: 0}}>
              <div style={{fontFamily: FONT, fontWeight: 700, fontSize: 24, color: '#9aa0b0'}}>@{c.user}</div>
              <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 32, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{c.text}</div>
            </div>
            <div style={{fontFamily: FONT, fontWeight: 800, fontSize: 26, color: '#ff5a7a', flex: 'none', textAlign: 'center'}}>
              ♥<div style={{color: '#cfd3de', fontSize: 22}}>{likes}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------------------------------------------------------------- COMMENT button with taps
const CommentTap: React.FC<{frame: number; fps: number; out: number; cfg: EndingCfg}> = ({frame, fps, out, cfg}) => {
  const from = Math.round(cfg.commentAt * fps);
  if (frame < from) return null;
  const s = spring({frame: frame - from, fps, config: {damping: 9, stiffness: 240}});
  const k = (frame - from) % 18;
  const press = k < 3 ? 0.9 : 1;
  const ring = k / 18;
  return (
    <div style={{position: 'absolute', top: 1060, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: 1 - out}}>
      <div style={{position: 'relative', transform: `scale(${s * press})`}}>
        <div style={{position: 'absolute', left: '50%', top: '50%', width: 380, height: 380, marginLeft: -190, marginTop: -190, borderRadius: '50%', border: '6px solid rgba(255,154,61,.9)', transform: `scale(${0.3 + ring * 0.9})`, opacity: 1 - ring}} />
        <div style={{fontFamily: FONT, fontWeight: 900, fontSize: 52, color: '#fff', background: 'linear-gradient(180deg,#ff9a3d,#ff6a00)', padding: '12px 40px', borderRadius: 18, border: '4px solid #fff', boxShadow: '0 12px 30px rgba(255,106,0,.5)', letterSpacing: 1}}>
          TAP TO COMMENT
        </div>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- next-episode stamp
const NextStamp: React.FC<{frame: number; fps: number; cfg: EndingCfg}> = ({frame, fps, cfg}) => {
  const at = Math.round(cfg.nextAt * fps);
  if (frame < at) return null;
  const s = spring({frame: frame - at, fps, config: {damping: 8, stiffness: 230}});
  const q = 1 + 0.08 * Math.sin((frame - at) * 0.3);
  return (
    <div style={{position: 'absolute', top: 1380, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22}}>
      <div
        style={{
          transform: `rotate(-6deg) scale(${2.2 - 1.2 * s})`,
          opacity: Math.min(1, s * 2),
          fontFamily: FONT,
          fontWeight: 900,
          fontSize: 64,
          color: '#fff',
          background: '#e5262b',
          border: '6px solid #fff',
          padding: '14px 40px',
          borderRadius: 18,
          boxShadow: '0 18px 44px rgba(0,0,0,.5)',
          letterSpacing: 1,
          display: 'flex',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {cfg.nextLabel}
        <span style={{display: 'inline-block', transform: `scale(${q})`, color: '#ffd23a'}}>?</span>
      </div>
      <div style={{opacity: interpolate(frame - at, [10, 18], [0, 1], clamp), fontFamily: FONT, fontWeight: 800, fontSize: 34, color: '#fff', background: 'rgba(14,16,24,.85)', padding: '10px 28px', borderRadius: 40, border: '2px solid rgba(255,255,255,.2)'}}>
        Follow so you don't miss it
      </div>
    </div>
  );
};

/** All 2D layers of the ending; `frame` is local to the ending. */
export const EndingOverlay: React.FC<{frame: number; fps: number; cfg?: EndingCfg}> = ({frame, fps, cfg = EP2_ENDING}) => {
  const lock = interpolate(frame, [cfg.nextAt * fps, cfg.nextAt * fps + 8], [0, 1], clamp);
  const a = voteA(frame, fps, cfg.commentAt);
  const leadA = frame >= cfg.commentAt * fps && !lock ? clamp01((a - 52) / 10) : 0;
  const leadB = frame >= cfg.commentAt * fps && !lock ? clamp01((48 - a) / 10) : 0;
  const shock = interpolate(frame, [0, 3, 10], [0.5, 0.35, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,7,14,.7) 0%, rgba(5,7,14,.15) 40%, rgba(5,7,14,.15) 62%, rgba(5,7,14,.75) 100%)'}} />
      <Panel side="A" frame={frame} fps={fps} locked={lock} lead={leadA} cfg={cfg} />
      <Panel side="B" frame={frame} fps={fps} locked={lock} lead={leadB} cfg={cfg} />
      <VsBadge frame={frame} fps={fps} />
      <VoteMeter frame={frame} fps={fps} hidden={lock} cfg={cfg} />
      <CommentTap frame={frame} fps={fps} out={lock} cfg={cfg} />
      <CommentFeed frame={frame} fps={fps} out={lock} cfg={cfg} />
      <NextStamp frame={frame} fps={fps} cfg={cfg} />
      <AbsoluteFill style={{background: '#fff', opacity: shock}} />
    </AbsoluteFill>
  );
};

const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
