/**
 * The paper stack on the forearm and the single sheet that slips off at 2.7 s.
 *
 * The slipping sheet is computed analytically from the frame number:
 *   1. SLIP_START .. RELEASE: it slides backwards along the top of the stack
 *      (in forearm-local space, so it rides the arm), and tips over the back edge.
 *   2. RELEASE ..: free flight in world space, starting from the exact position and
 *      velocity it had at release, with air drag (it stops moving forward while the
 *      worker walks on), slow fall and a falling-leaf flutter.
 */
import React from 'react';
import {FLOOR_Y, SLIP_START_FRAME} from '../../core/constants';
import {seededArray} from '../../core/random';
import {getPose, Pose, rot, Vec} from '../../core/walkCycle';

const SHEETS = 14;
const SHEET_T = 4.4; // thickness of one sheet seen edge-on
const SHEET_LEN = 196;
const SHEET_DEPTH = 110; // width of the sheet into the screen (shows when it tumbles)
const BACK_X = -32; // stack back edge in forearm-local x
const ARM_TOP = -20; // top surface of the forearm in local y
const SLIP_FRAMES = 22;
export const RELEASE_FRAME = SLIP_START_FRAME + SLIP_FRAMES;

// Deterministic per-sheet jitter: same every render.
const JITTER = seededArray(20240527, SHEETS, (rnd) => ({dx: (rnd() - 0.5) * 12, rot: (rnd() - 0.5) * 1.6}));

/** Forearm axis: direction and SVG rotation. Shared with the arm drawing. */
export const forearmFrame = (pose: Pose) => {
  const a = (pose.nearArm.foreDeg * Math.PI) / 180;
  const dir = {x: Math.sin(a), y: Math.cos(a)};
  return {dir, rotDeg: (Math.atan2(dir.y, dir.x) * 180) / Math.PI};
};

/** Stack lags behind the arm a little (secondary motion), pivoting on the hand. */
const WOBBLE_PIVOT = {x: 138, y: ARM_TOP};
const stackToWorld = (pose: Pose, p: Vec): Vec => {
  const {rotDeg} = forearmFrame(pose);
  const w = rot({x: p.x - WOBBLE_PIVOT.x, y: p.y - WOBBLE_PIVOT.y}, pose.paperWobble);
  const local = {x: w.x + WOBBLE_PIVOT.x, y: w.y + WOBBLE_PIVOT.y};
  const r = rot(local, rotDeg);
  return {x: pose.nearArm.elbow.x + r.x, y: pose.nearArm.elbow.y + r.y};
};

/** Slipping top sheet, forearm-local: back-slide offset and tip angle. */
const slipLocal = (frame: number) => {
  const t = Math.min(1, Math.max(0, (frame - SLIP_START_FRAME) / SLIP_FRAMES));
  const slide = -128 * t * t; // accelerating backwards slide
  const tip = -Math.min(42, Math.max(0, -slide - 40) * 0.5); // back end droops over the edge
  return {slide, tip};
};

const TOP = JITTER[SHEETS - 1];
const topY = ARM_TOP - SHEETS * SHEET_T; // top surface of the top sheet (local)
const pivotLocal = {x: BACK_X, y: topY + SHEET_T};

/** World centre + screen angle of the slipping sheet while still touching the stack. */
const attachedSheet = (frame: number) => {
  const pose = getPose(frame);
  const {slide, tip} = slipLocal(frame);
  const cLocal = {x: TOP.dx + slide + SHEET_LEN / 2 + BACK_X, y: topY + SHEET_T / 2};
  const rel = rot({x: cLocal.x - pivotLocal.x, y: cLocal.y - pivotLocal.y}, tip);
  const c = stackToWorld(pose, {x: pivotLocal.x + rel.x, y: pivotLocal.y + rel.y});
  return {c, angle: forearmFrame(pose).rotDeg + pose.paperWobble + TOP.rot + tip};
};

/** Free flight after release. Closed-form, frame-addressable. */
export const flyingSheet = (frame: number) => {
  const s0 = attachedSheet(RELEASE_FRAME);
  const s1 = attachedSheet(RELEASE_FRAME - 1);
  const vx0 = s0.c.x - s1.c.x;
  const vy0 = s0.c.y - s1.c.y - 2.4; // the air under the sheet lifts it a bit
  const tau = frame - RELEASE_FRAME;
  const kx = 24; // horizontal drag time constant (frames)
  const ky = 18;
  const vFall = 1.7; // terminal fall speed, px/frame
  const w = 0.115; // flutter angular frequency, rad/frame
  const ramp = 1 - Math.exp(-tau / 16);
  const x = s0.c.x + vx0 * kx * (1 - Math.exp(-tau / kx)) - 36 * Math.sin(w * tau) * ramp;
  const y =
    s0.c.y + vFall * tau + (vy0 - vFall) * ky * (1 - Math.exp(-tau / ky)) - 14 * Math.sin(w * tau) ** 2 * ramp;
  const pitch = s0.angle * Math.exp(-tau / 14) - 26 * Math.cos(w * tau) * ramp;
  const roll = 0.55 * (1 - Math.exp(-tau / 22)) + 0.45 * Math.sin(0.085 * tau) * ramp;
  return {c: {x, y}, pitch, roll};
};

const Sheet: React.FC<{x: number; y: number; rot?: number; light?: boolean}> = ({x, y, rot: r = 0, light}) => (
  <rect
    x={x}
    y={y}
    width={SHEET_LEN}
    height={SHEET_T}
    fill={light ? '#ffffff' : '#f6f7f9'}
    stroke="#b9c0ca"
    strokeWidth={0.8}
    transform={`rotate(${r} ${x + SHEET_LEN / 2} ${y + SHEET_T / 2})`}
  />
);

export const PaperStack: React.FC<{elbow: Vec; rotDeg: number; wobble: number; frame: number}> = ({
  elbow,
  rotDeg,
  wobble,
  frame,
}) => {
  const slipping = frame >= SLIP_START_FRAME;
  const count = slipping ? SHEETS - 1 : SHEETS;
  const {slide, tip} = slipLocal(frame);
  return (
    <g transform={`translate(${elbow.x} ${elbow.y}) rotate(${rotDeg})`}>
      <g transform={`rotate(${wobble} ${WOBBLE_PIVOT.x} ${WOBBLE_PIVOT.y})`}>
        {/* soft contact shadow on the sleeve */}
        <rect x={BACK_X + 4} y={ARM_TOP - 2} width={SHEET_LEN - 8} height={4} fill="#7f93ab" opacity={0.5} />
        {JITTER.slice(0, count).map((j, i) => (
          <Sheet key={i} x={BACK_X + j.dx} y={ARM_TOP - (i + 1) * SHEET_T} rot={j.rot} light={i % 2 === 0} />
        ))}
        {/* paper clip on the stack for a bit of character */}
        <path
          d={`M ${BACK_X + 150} ${ARM_TOP - 1} L ${BACK_X + 150} ${ARM_TOP - count * SHEET_T - 6} L ${BACK_X + 162} ${ARM_TOP - count * SHEET_T - 6} L ${BACK_X + 162} ${ARM_TOP - 10}`}
          stroke="#8a95a3"
          strokeWidth={2.2}
          fill="none"
        />
        {slipping && frame < RELEASE_FRAME ? (
          <g transform={`rotate(${tip} ${pivotLocal.x} ${pivotLocal.y})`}>
            <Sheet x={BACK_X + TOP.dx + slide} y={topY} rot={TOP.rot} light />
          </g>
        ) : null}
      </g>
    </g>
  );
};

/** Projected, tumbling sheet in world space (drawn after release). */
export const FallingSheet: React.FC<{frame: number}> = ({frame}) => {
  if (frame < RELEASE_FRAME) return null;
  const {c, pitch, roll} = flyingSheet(frame);
  const face = Math.sin(roll); // how much of the face we see (0 = edge-on)
  const L = SHEET_LEN / 2;
  const D = (SHEET_DEPTH / 2) * face;
  const pt = (a: number, b: number) => {
    const r = rot({x: a, y: b}, pitch);
    return `${c.x + r.x},${c.y + r.y}`;
  };
  // Slight curl: the long edges bow a little as the sheet catches air.
  const bow = 7 * Math.sin(frame * 0.09);
  const edge = (b: number) => {
    const m = rot({x: 0, y: b - bow}, pitch);
    return `${c.x + m.x},${c.y + m.y}`;
  };
  const thick = Math.max(Math.abs(D), SHEET_T / 2);
  const d = `M ${pt(-L, -thick)} Q ${edge(-thick)} ${pt(L, -thick)} L ${pt(L, thick)} Q ${edge(thick)} ${pt(-L, thick)} Z`;
  const shade = Math.round(236 + 18 * Math.abs(face));
  const height = FLOOR_Y - c.y;
  return (
    <g>
      <ellipse
        cx={c.x}
        cy={FLOOR_Y + 3}
        rx={90 - height * 0.04}
        ry={8}
        fill="#1b1f2a"
        opacity={Math.max(0, 0.16 - height * 0.00012)}
      />
      <path d={d} fill={`rgb(${shade},${shade + 1 > 255 ? 255 : shade + 1},${Math.min(255, shade + 4)})`} stroke="#aab3bf" strokeWidth={1.2} strokeLinejoin="round" />
      {/* printed lines appear as the face turns towards us */}
      {Math.abs(face) > 0.15
        ? [0, 1, 2, 3, 4, 5].map((i) => {
            const b = (-0.7 + i * 0.26) * thick;
            return (
              <path
                key={i}
                d={`M ${pt(-L + 22, b)} L ${pt(i === 5 ? 10 : L - 26, b)}`}
                stroke="#8794a4"
                strokeWidth={2}
                opacity={Math.min(0.75, Math.abs(face))}
              />
            );
          })
        : null}
    </g>
  );
};
