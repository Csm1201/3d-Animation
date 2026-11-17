/**
 * Modern city street, flat 2D, side view. Same perspective rig as the office film:
 * every layer has a depth scale s and is placed with screenX(xw, s, camX), and the
 * pavement line he walks on is s = 1, so it scrolls exactly with his feet.
 *
 *   sky + skyline (very slow) -> building fronts (s 0.8) -> lamps/trees/bikes (s 0.9)
 *   -> pavement (s 0.8 .. 1.12) -> curb + road (s 1.12 .. 1.25) -> bollards in front (s 1.13)
 */
import React from 'react';
import {depthY, HEIGHT, S_WALL, screenX, WALL_BASE_Y, WIDTH} from '../../core/constants';
import {seededArray} from '../../core/random';

type P = {camX: number; frame: number};
const FONT = '"Inter", "Inter Display", system-ui, sans-serif';
const FACADE_TOP = 430;
const CURB_S = 1.12;

const AtDepth: React.FC<{xw: number; s: number; camX: number; children: React.ReactNode}> = ({xw, s, camX, children}) => (
  <g transform={`translate(${screenX(xw, s, camX)} ${depthY(s)}) scale(${s})`}>{children}</g>
);

// ---------------------------------------------------------------- sky and skyline
const TOWERS = seededArray(2024, 18, (r, i) => ({x: -900 + i * 190 + r() * 60, w: 90 + r() * 90, h: 260 + r() * 420, tone: r(), crown: r() > 0.6}));

const Sky: React.FC<P> = ({camX}) => (
  <g>
    <defs>
      <linearGradient id="sky2d" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#8fcdf2" />
        <stop offset="0.65" stopColor="#cfe9f7" />
        <stop offset="1" stopColor="#fbe6d2" />
      </linearGradient>
    </defs>
    <rect x={0} y={0} width={WIDTH} height={720} fill="url(#sky2d)" />
    {[0, 1, 2].map((i) => {
      const x = ((180 + i * 420 - camX * 0.06) % 1500 + 1500) % 1500 - 200;
      return (
        <g key={i} transform={`translate(${x} ${110 + i * 70})`} opacity={0.9}>
          <ellipse cx={0} cy={0} rx={90} ry={26} fill="#fff" />
          <ellipse cx={50} cy={-14} rx={56} ry={26} fill="#fff" />
          <ellipse cx={-46} cy={-8} rx={44} ry={20} fill="#fff" />
        </g>
      );
    })}
    {/* distant glass towers: barely move */}
    {TOWERS.map((t, i) => {
      const x = WIDTH / 2 + (t.x - camX * 0.25);
      if (x < -250 || x > WIDTH + 250) return null;
      return (
        <g key={i}>
          <rect x={x} y={640 - t.h} width={t.w} height={t.h} fill={t.tone > 0.5 ? '#a9c2d9' : '#bdd0e2'} />
          <rect x={x + t.w * 0.62} y={640 - t.h} width={t.w * 0.38} height={t.h} fill="#9db6ce" />
          {t.crown ? <rect x={x + t.w * 0.4} y={640 - t.h - 40} width={6} height={40} fill="#9db6ce" /> : null}
          {Array.from({length: Math.floor(t.h / 34)}, (_, j) => (
            <rect key={j} x={x + 8} y={640 - t.h + 14 + j * 34} width={t.w - 16} height={4} fill="#d8e5f0" opacity={0.7} />
          ))}
        </g>
      );
    })}
  </g>
);

// ---------------------------------------------------------------- building fronts (s = 0.8)
type Shop = {x: number; w: number; wall: string; trim: string; top: number; sign: string; signBg: string; signFg: string; awning: [string, string]; inside: string};
const SHOPS: Shop[] = [
  {x: -950, w: 760, wall: '#d9c9ae', trim: '#b9a789', top: 470, sign: 'BOOKS', signBg: '#2f4858', signFg: '#f6e7c8', awning: ['#2f4858', '#f6e7c8'], inside: '#3b4a52'},
  {x: -190, w: 820, wall: '#c9785a', trim: '#a75f45', top: 430, sign: 'BREW & CO.', signBg: '#1f2a2e', signFg: '#f2c86b', awning: ['#2c6e5a', '#e9e2d0'], inside: '#3a2f2a'},
  {x: 630, w: 700, wall: '#e9e1d2', trim: '#cfc3ad', top: 500, sign: 'PHONE FIX', signBg: '#e2574c', signFg: '#ffffff', awning: ['#e2574c', '#ffffff'], inside: '#2b3640'},
  {x: 1330, w: 780, wall: '#7aa6a1', trim: '#5f8c87', top: 450, sign: 'BAKERY', signBg: '#f6e7c8', signFg: '#8a4b2a', awning: ['#f2c86b', '#ffffff'], inside: '#4a3a30'},
  {x: 2110, w: 760, wall: '#b9b4ab', trim: '#9d978c', top: 480, sign: 'GYM 24/7', signBg: '#111417', signFg: '#7fe3c3', awning: ['#111417', '#3a3f47'], inside: '#23282d'},
];
const WIN_ON = seededArray(77, 200, (r) => r() > 0.62);

const Facade: React.FC<{shop: Shop; camX: number; index: number}> = ({shop, camX, index}) => {
  const L = screenX(shop.x, S_WALL, camX);
  const R = screenX(shop.x + shop.w, S_WALL, camX);
  if (R < -50 || L > WIDTH + 50) return null;
  const W = R - L;
  const shopTop = 860;
  const cols = Math.max(2, Math.round(W / 150));
  const rows = Math.floor((shopTop - 40 - (shop.top + 40)) / 120);
  return (
    <g>
      <rect x={L} y={shop.top} width={W} height={WALL_BASE_Y - shop.top} fill={shop.wall} />
      <rect x={L} y={shop.top} width={W} height={18} fill={shop.trim} />
      <rect x={L} y={shopTop - 24} width={W} height={10} fill={shop.trim} />
      {/* apartment windows upstairs, some lit */}
      {Array.from({length: rows}, (_, r) =>
        Array.from({length: cols}, (_, c) => {
          const ww = (W / cols) * 0.5;
          const x = L + (W / cols) * (c + 0.25);
          const y = shop.top + 60 + r * 120;
          const lit = WIN_ON[(index * 31 + r * 7 + c) % 200];
          return (
            <g key={`${r}-${c}`}>
              <rect x={x - 4} y={y - 4} width={ww + 8} height={84} fill={shop.trim} />
              <rect x={x} y={y} width={ww} height={76} fill={lit ? '#ffe6a6' : '#9fb8c9'} />
              <rect x={x + ww / 2 - 2} y={y} width={4} height={76} fill={shop.trim} />
              {!lit ? <polygon points={`${x},${y + 76} ${x + ww * 0.6},${y} ${x + ww},${y} ${x + ww * 0.25},${y + 76}`} fill="#ffffff" opacity={0.25} /> : null}
            </g>
          );
        }),
      )}
      {/* shop sign */}
      <rect x={L + W * 0.18} y={shopTop - 4} width={W * 0.64} height={58} rx={8} fill={shop.signBg} />
      <text x={L + W / 2} y={shopTop + 38} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={36} letterSpacing={4} fill={shop.signFg}>
        {shop.sign}
      </text>
      {/* striped awning */}
      {Array.from({length: Math.ceil(W / 40)}, (_, i) => (
        <path
          key={i}
          d={`M ${L + i * 40} ${shopTop + 64} L ${L + i * 40 + 40} ${shopTop + 64} L ${L + i * 40 + 44} ${shopTop + 112} L ${L + i * 40 - 4} ${shopTop + 112} Z`}
          fill={shop.awning[i % 2]}
        />
      ))}
      <path d={`M ${L} ${shopTop + 112} ${Array.from({length: Math.ceil(W / 40)}, (_, i) => `q 20 18 40 0`).join(' ')}`} fill={shop.awning[0]} transform={`translate(0 0)`} />
      {/* big shop window with a hint of the inside, and a door */}
      <rect x={L + 24} y={shopTop + 128} width={W * 0.62} height={WALL_BASE_Y - shopTop - 150} fill={shop.inside} />
      <rect x={L + 40} y={shopTop + 200} width={W * 0.62 - 32} height={10} fill="#ffffff" opacity={0.12} />
      <polygon
        points={`${L + 40},${WALL_BASE_Y - 30} ${L + 120},${shopTop + 128} ${L + 160},${shopTop + 128} ${L + 80},${WALL_BASE_Y - 30}`}
        fill="#ffffff"
        opacity={0.14}
      />
      <rect x={L + W * 0.7} y={shopTop + 140} width={W * 0.2} height={WALL_BASE_Y - shopTop - 160} fill="#2a3036" />
      <rect x={L + W * 0.72} y={shopTop + 156} width={W * 0.16} height={(WALL_BASE_Y - shopTop - 160) * 0.55} fill="#5b6b78" opacity={0.6} />
      <rect x={L + W * 0.86} y={shopTop + 260} width={6} height={50} rx={3} fill="#c9c6bf" />
      {/* a pipe down the corner between buildings */}
      <rect x={R - 10} y={shop.top} width={10} height={WALL_BASE_Y - shop.top} fill="#00000022" />
    </g>
  );
};

// ---------------------------------------------------------------- pavement, curb, road
const Ground: React.FC<P> = ({camX}) => {
  const TILE = 180;
  const rows = [S_WALL, 0.86, 0.92, 0.98, 1.04, 1.08, CURB_S];
  const first = Math.floor((camX - 1000) / TILE);
  const tiles: React.ReactNode[] = [];
  for (let i = first; i < first + 14; i++) {
    for (let r = 0; r < rows.length - 1; r++) {
      const s0 = rows[r];
      const s1 = rows[r + 1];
      const x0 = i * TILE + (r % 2) * (TILE / 2);
      const pts = [
        [screenX(x0, s0, camX), depthY(s0)],
        [screenX(x0 + TILE, s0, camX), depthY(s0)],
        [screenX(x0 + TILE, s1, camX), depthY(s1)],
        [screenX(x0, s1, camX), depthY(s1)],
      ]
        .map((p) => p.join(','))
        .join(' ');
      tiles.push(<polygon key={`${i}-${r}`} points={pts} fill={(i + r) % 3 === 0 ? '#d3ccc1' : '#dcd6cb'} stroke="#bfb7aa" strokeWidth={2} />);
    }
  }
  const curbY = depthY(CURB_S);
  const curb2 = depthY(1.145);
  // dashed bike-lane line on the road, moving with its own depth
  const dashS = 1.2;
  const dashY = depthY(dashS);
  const d0 = Math.floor((camX - 900) / 220);
  return (
    <g>
      <rect x={0} y={WALL_BASE_Y} width={WIDTH} height={HEIGHT - WALL_BASE_Y} fill="#dcd6cb" />
      {tiles}
      <rect x={0} y={curbY} width={WIDTH} height={curb2 - curbY} fill="#ece8e1" />
      <rect x={0} y={curb2} width={WIDTH} height={10} fill="#a8a196" />
      <rect x={0} y={curb2 + 10} width={WIDTH} height={HEIGHT - curb2} fill="#4a4e57" />
      <rect x={0} y={curb2 + 10} width={WIDTH} height={80} fill="#3f8a63" opacity={0.85} />
      {Array.from({length: 10}, (_, k) => {
        const xw = (d0 + k) * 220;
        const x = screenX(xw, dashS, camX);
        return <rect key={k} x={x} y={dashY + 60} width={110 * dashS} height={12} fill="#f2efe8" />;
      })}
      {/* shadow line where the buildings meet the pavement */}
      <rect x={0} y={WALL_BASE_Y} width={WIDTH} height={16} fill="#000" opacity={0.08} />
    </g>
  );
};

// ---------------------------------------------------------------- street furniture (s = 0.9)
const Lamp: React.FC<{xw: number; camX: number}> = ({xw, camX}) => (
  <AtDepth xw={xw} s={0.9} camX={camX}>
    <rect x={-10} y={-880} width={20} height={880} fill="#3b3f47" />
    <rect x={-22} y={-24} width={44} height={24} rx={6} fill="#30343b" />
    <path d="M 0 -870 Q 0 -930 80 -930 L 110 -930" stroke="#3b3f47" strokeWidth={14} fill="none" />
    <rect x={96} y={-940} width={70} height={22} rx={8} fill="#30343b" />
    <rect x={102} y={-920} width={58} height={8} rx={4} fill="#fff4cc" />
    <rect x={14} y={-560} width={64} height={120} rx={8} fill="#2c6e5a" />
    <text x={46} y={-490} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={30} fill="#ffffff">
      P
    </text>
  </AtDepth>
);

const Tree: React.FC<{xw: number; camX: number; frame: number}> = ({xw, camX, frame}) => {
  const sway = Math.sin(frame * 0.05) * 3;
  return (
    <AtDepth xw={xw} s={0.9} camX={camX}>
      <rect x={-90} y={-120} width={180} height={120} rx={14} fill="#8d8a84" />
      <rect x={-90} y={-120} width={180} height={18} rx={8} fill="#a6a39c" />
      <rect x={-12} y={-560} width={24} height={450} fill="#6b4f3a" />
      <g transform={`rotate(${sway} 0 -520)`}>
        <circle cx={0} cy={-660} r={170} fill="#5e9a5b" />
        <circle cx={-110} cy={-580} r={110} fill="#6aa866" />
        <circle cx={110} cy={-590} r={120} fill="#4f8a4e" />
        <circle cx={30} cy={-760} r={110} fill="#6aa866" />
      </g>
    </AtDepth>
  );
};

const BikeRack: React.FC<{xw: number; camX: number}> = ({xw, camX}) => (
  <AtDepth xw={xw} s={0.9} camX={camX}>
    {[0, 1].map((i) => (
      <path key={i} d={`M ${-120 + i * 140} 0 L ${-120 + i * 140} -110 Q ${-120 + i * 140} -150 ${-80 + i * 140} -150 Q ${-40 + i * 140} -150 ${-40 + i * 140} -110 L ${-40 + i * 140} 0`} stroke="#9aa1aa" strokeWidth={12} fill="none" />
    ))}
    {/* a parked city bike */}
    <g transform="translate(-40 0)">
      <circle cx={-110} cy={-90} r={86} fill="none" stroke="#2b2f36" strokeWidth={12} />
      <circle cx={130} cy={-90} r={86} fill="none" stroke="#2b2f36" strokeWidth={12} />
      <path d="M -110 -90 L 0 -90 L 70 -210 L -40 -210 Z M 0 -90 L -40 -210 M 130 -90 L 70 -210 L 80 -260" stroke="#e2574c" strokeWidth={12} fill="none" strokeLinejoin="round" />
      <rect x={-70} y={-232} width={70} height={18} rx={9} fill="#2b2f36" />
      <path d="M 60 -262 L 110 -262" stroke="#2b2f36" strokeWidth={12} strokeLinecap="round" />
      <rect x={96} y={-246} width={70} height={46} rx={6} fill="#c9a26a" />
    </g>
  </AtDepth>
);

const Board: React.FC<{xw: number; camX: number}> = ({xw, camX}) => (
  <AtDepth xw={xw} s={0.92} camX={camX}>
    <path d="M -90 0 L -60 -300 L 60 -300 L 90 0" fill="#3a2f2a" />
    <path d="M -74 -20 L -50 -280 L 50 -280 L 74 -20 Z" fill="#1f2a2e" />
    <text x={0} y={-220} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={34} fill="#f2c86b">
      OAT
    </text>
    <text x={0} y={-176} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={34} fill="#f2c86b">
      LATTE
    </text>
    <text x={0} y={-110} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={40} fill="#ffffff">
      $4
    </text>
  </AtDepth>
);

// ---------------------------------------------------------------- foreground (in front of him)
export const Foreground: React.FC<P> = ({camX}) => (
  <g>
    {[180, 900, 1620, 2340].map((xw) => (
      <AtDepth key={xw} xw={xw} s={1.135} camX={camX}>
        <rect x={-16} y={-120} width={32} height={120} rx={14} fill="#3b3f47" />
        <rect x={-16} y={-96} width={32} height={12} fill="#f2c86b" />
      </AtDepth>
    ))}
    <AtDepth xw={1260} s={1.135} camX={camX}>
      <rect x={-34} y={-30} width={68} height={30} rx={6} fill="#b8322c" />
      <rect x={-26} y={-120} width={52} height={96} rx={16} fill="#d8443b" />
      <rect x={-46} y={-96} width={92} height={20} rx={10} fill="#b8322c" />
      <circle cx={0} cy={-128} r={20} fill="#b8322c" />
    </AtDepth>
  </g>
);

export const Street: React.FC<P> = ({camX, frame}) => (
  <g>
    <Sky camX={camX} frame={frame} />
    {SHOPS.map((s, i) => (
      <Facade key={s.sign} shop={s} camX={camX} index={i} />
    ))}
    <Ground camX={camX} frame={frame} />
    <Tree xw={-160} camX={camX} frame={frame} />
    <Lamp xw={420} camX={camX} />
    <Board xw={760} camX={camX} />
    <BikeRack xw={1180} camX={camX} />
    <Tree xw={1720} camX={camX} frame={frame} />
    <Lamp xw={2280} camX={camX} />
  </g>
);

export const FACADE = FACADE_TOP;
