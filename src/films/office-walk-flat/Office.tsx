/**
 * The office. Every prop lives at a depth scale `s` and is positioned with
 * screenX(xw, s, camX), so nearer things scroll faster than the back wall.
 * The worker's floor line is s = 1, which scrolls exactly with him.
 */
import React from 'react';
import {CEILING_Y, depthY, FPS, HEIGHT, S_NEAR, S_WALL, screenX, WALL_BASE_Y, WIDTH} from '../../core/constants';
import {seededArray} from '../../core/random';

type P = {camX: number; frame: number};

/** Place a prop on the floor at world x and depth s; children draw in local units, origin at base centre. */
const AtDepth: React.FC<{xw: number; s: number; camX: number; children: React.ReactNode}> = ({xw, s, camX, children}) => (
  <g transform={`translate(${screenX(xw, s, camX)} ${depthY(s)}) scale(${s})`}>{children}</g>
);

// ---------------------------------------------------------------- room shell
const CEIL_FAR = S_WALL;
const CEIL_NEAR = 1.7;
const ceilY = (s: number) => CEILING_Y - ((s - CEIL_FAR) / (CEIL_NEAR - CEIL_FAR)) * CEILING_Y;

const Room: React.FC<P> = ({camX}) => {
  // carpet tiles: columns every TILE world px, rows at fixed depths
  const TILE = 300;
  const rows = [S_WALL, 0.87, 0.95, 1.04, 1.14, S_NEAR];
  const first = Math.floor((camX - 900) / TILE);
  const tiles: React.ReactNode[] = [];
  for (let i = first; i < first + 9; i++) {
    for (let r = 0; r < rows.length - 1; r++) {
      const s0 = rows[r];
      const s1 = rows[r + 1];
      const x0 = i * TILE;
      const x1 = x0 + TILE;
      const pts = [
        [screenX(x0, s0, camX), depthY(s0)],
        [screenX(x1, s0, camX), depthY(s0)],
        [screenX(x1, s1, camX), depthY(s1)],
        [screenX(x0, s1, camX), depthY(s1)],
      ]
        .map((p) => p.join(','))
        .join(' ');
      tiles.push(<polygon key={`${i}-${r}`} points={pts} fill={(i + r) % 2 === 0 ? '#8d97a6' : '#86909f'} stroke="#7a8392" strokeWidth={1.5} />);
    }
  }
  // ceiling light panels
  const lights: React.ReactNode[] = [];
  const LSP = 900;
  const lf = Math.floor((camX - 1500) / LSP);
  for (let i = lf; i < lf + 5; i++) {
    const x0 = i * LSP + 200;
    const x1 = x0 + 420;
    for (const [s0, s1] of [
      [0.86, 1.0],
      [1.18, 1.42],
    ]) {
      const pts = [
        [screenX(x0, s0, camX), ceilY(s0)],
        [screenX(x1, s0, camX), ceilY(s0)],
        [screenX(x1, s1, camX), ceilY(s1)],
        [screenX(x0, s1, camX), ceilY(s1)],
      ]
        .map((p) => p.join(','))
        .join(' ');
      lights.push(<polygon key={`${i}-${s0}`} points={pts} fill="#fffdf4" stroke="#d6d2c6" strokeWidth={3} />);
    }
  }
  // wall panel seams so the wall itself visibly scrolls
  const seams: React.ReactNode[] = [];
  const SEAM = 760;
  const sf = Math.floor((camX - 1200) / SEAM);
  for (let i = sf; i < sf + 6; i++) {
    const x = screenX(i * SEAM + 380, S_WALL, camX);
    seams.push(<line key={i} x1={x} y1={CEILING_Y} x2={x} y2={WALL_BASE_Y - 30} stroke="#d9d3c6" strokeWidth={3} />);
  }
  return (
    <g>
      <defs>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#efe9dd" />
          <stop offset="1" stopColor="#e3dccd" />
        </linearGradient>
        <linearGradient id="ceil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e9e6df" />
          <stop offset="1" stopColor="#f6f4ef" />
        </linearGradient>
        <linearGradient id="floorFade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity={0.18} />
          <stop offset="0.25" stopColor="#000" stopOpacity={0} />
          <stop offset="1" stopColor="#000" stopOpacity={0.12} />
        </linearGradient>
      </defs>
      <rect x={0} y={0} width={WIDTH} height={CEILING_Y} fill="url(#ceil)" />
      {lights}
      <rect x={0} y={CEILING_Y} width={WIDTH} height={WALL_BASE_Y - CEILING_Y} fill="url(#wall)" />
      <rect x={0} y={CEILING_Y} width={WIDTH} height={14} fill="#d8d1c2" />
      {seams}
      {tiles}
      <rect x={0} y={WALL_BASE_Y} width={WIDTH} height={HEIGHT - WALL_BASE_Y} fill="url(#floorFade)" />
      <rect x={0} y={WALL_BASE_Y - 26} width={WIDTH} height={26} fill="#6f675c" />
      <rect x={0} y={WALL_BASE_Y - 26} width={WIDTH} height={4} fill="#857c70" />
    </g>
  );
};

// ---------------------------------------------------------------- wall props (s = 0.8)
const CITY = seededArray(77, 14, (r, i) => ({x: -420 + i * 64 + r() * 20, w: 50 + r() * 50, h: 120 + r() * 260, tone: r()}));
const CITY_WIN = seededArray(78, 200, (r) => r() > 0.55);

const Window: React.FC<P & {xw: number; id: string}> = ({xw, camX, id}) => (
  <AtDepth xw={xw} s={S_WALL} camX={camX}>
    <defs>
      <clipPath id={`win-${id}`}>
        <rect x={-300} y={-1110} width={600} height={640} />
      </clipPath>
      <linearGradient id={`sky-${id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#7fb6e6" />
        <stop offset="1" stopColor="#d4ecfa" />
      </linearGradient>
    </defs>
    <rect x={-322} y={-1132} width={644} height={684} fill="#cfc8b9" />
    <g clipPath={`url(#win-${id})`}>
      <rect x={-300} y={-1110} width={600} height={640} fill={`url(#sky-${id})`} />
      {/* far city barely moves: counter-scroll most of the wall's motion */}
      {/* far city: cancel ~92% of the wall's scroll so it drifts slowly, like distant scenery */}
      <g transform={`translate(${-(xw - camX) * 0.92} 0)`}>
        <g>
          {[0, 1].map((k) => (
            <ellipse key={k} cx={-150 + k * 260} cy={-1020 + k * 40} rx={90} ry={22} fill="#fff" opacity={0.85} />
          ))}
          {CITY.map((b, i) => (
            <g key={i}>
              <rect x={b.x} y={-470 - b.h} width={b.w} height={b.h} fill={b.tone > 0.5 ? '#8ca3bb' : '#9fb3c8'} />
              {Array.from({length: Math.floor(b.h / 34)}).map((_, j) =>
                CITY_WIN[(i * 7 + j) % 200] ? (
                  <rect key={j} x={b.x + 10} y={-470 - b.h + 14 + j * 34} width={b.w - 20} height={10} fill="#c6d6e6" />
                ) : null,
              )}
            </g>
          ))}
        </g>
      </g>
      {/* glass reflection */}
      <polygon points="-300,-900 -140,-1110 -60,-1110 -300,-790" fill="#fff" opacity={0.25} />
      <polygon points="40,-470 260,-1110 300,-1110 300,-1000 120,-470" fill="#fff" opacity={0.16} />
    </g>
    <rect x={-300} y={-1110} width={600} height={640} fill="none" stroke="#f7f4ec" strokeWidth={22} />
    <rect x={-11} y={-1110} width={22} height={640} fill="#f7f4ec" />
    <rect x={-300} y={-800} width={600} height={18} fill="#f7f4ec" />
    <rect x={-340} y={-470} width={680} height={26} fill="#e9e4d8" />
    <rect x={-340} y={-446} width={680} height={8} fill="#c9c2b2" />
  </AtDepth>
);

const Whiteboard: React.FC<P & {xw: number}> = ({xw, camX}) => {
  const bars = [120, 170, 150, 230, 280, 340];
  return (
    <AtDepth xw={xw} s={S_WALL} camX={camX}>
      <rect x={-372} y={-1072} width={744} height={500} rx={10} fill="#a7adb5" />
      <rect x={-360} y={-1060} width={720} height={476} rx={4} fill="#fbfcfd" />
      <rect x={-360} y={-1060} width={720} height={476} fill="url(#wbSheen)" />
      <defs>
        <linearGradient id="wbSheen" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.5" stopColor="#e7edf3" stopOpacity={0.6} />
          <stop offset="1" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <text x={-310} y={-990} fontFamily="Comic Sans MS, Chalkboard, Marker Felt, sans-serif" fontSize={44} fontWeight={700} fill="#2c5aa0">
        Q3 GROWTH
      </text>
      {/* axes */}
      <path d="M -300 -950 L -300 -640 L 320 -640" stroke="#333" strokeWidth={6} fill="none" strokeLinecap="round" />
      {bars.map((h, i) => (
        <rect key={i} x={-270 + i * 96} y={-640 - h} width={60} height={h} fill={i % 2 ? '#3fa36b' : '#3a7bd5'} opacity={0.85} />
      ))}
      <path
        d={`M -240 -800 ${bars.map((h, i) => `L ${-240 + i * 96} ${-680 - h * 0.9}`).join(' ')}`}
        stroke="#d6453d"
        strokeWidth={7}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path d="M 220 -1010 l 30 -6 l -10 28" stroke="#d6453d" strokeWidth={7} fill="none" strokeLinecap="round" />
      {/* sticky notes */}
      <rect x={200} y={-1040} width={110} height={100} fill="#ffe46b" transform="rotate(4 255 -990)" />
      <path d="M 218 -1010 h 70 M 218 -985 h 56 M 218 -960 h 64" stroke="#8a7a30" strokeWidth={4} transform="rotate(4 255 -990)" />
      {/* tray + markers */}
      <rect x={-300} y={-584} width={600} height={18} rx={4} fill="#9aa1aa" />
      {['#2c5aa0', '#d6453d', '#2f8a57'].map((c, i) => (
        <g key={c}>
          <rect x={-240 + i * 90} y={-598} width={66} height={14} rx={6} fill="#eee" />
          <rect x={-240 + i * 90} y={-598} width={18} height={14} rx={4} fill={c} />
        </g>
      ))}
    </AtDepth>
  );
};

const Clock: React.FC<P & {xw: number}> = ({xw, camX, frame}) => {
  // 10:08:20 + elapsed time. The second hand ticks once a second with a small overshoot.
  const t = 10 * 3600 + 8 * 60 + 20 + frame / FPS;
  const whole = Math.floor(frame / FPS);
  const fr = (frame % FPS) / FPS;
  const tick = fr < 0.12 ? Math.sin((fr / 0.12) * Math.PI) * 0.18 + fr / 0.12 : 1;
  const sec = (20 + whole - 1 + tick) * 6;
  const min = ((t / 60) % 60) * 6;
  const hr = ((t / 3600) % 12) * 30;
  return (
    <AtDepth xw={xw} s={S_WALL} camX={camX}>
      <g transform="translate(0 -1010)">
        <circle r={96} fill="#2d3138" />
        <circle r={84} fill="#fbfaf6" />
        {Array.from({length: 12}).map((_, i) => (
          <rect key={i} x={-3} y={-78} width={6} height={i % 3 === 0 ? 18 : 10} fill="#2d3138" transform={`rotate(${i * 30})`} />
        ))}
        <rect x={-5} y={-46} width={10} height={52} rx={5} fill="#2d3138" transform={`rotate(${hr})`} />
        <rect x={-4} y={-68} width={8} height={74} rx={4} fill="#2d3138" transform={`rotate(${min})`} />
        <g transform={`rotate(${sec})`}>
          <rect x={-1.5} y={-74} width={3} height={92} fill="#d6453d" />
          <circle cy={-50} r={0} />
        </g>
        <circle r={7} fill="#d6453d" />
        <path d="M -60 -60 A 84 84 0 0 1 40 -76" stroke="#fff" strokeWidth={6} fill="none" opacity={0.5} />
      </g>
    </AtDepth>
  );
};

const Poster: React.FC<P & {xw: number}> = ({xw, camX}) => (
  <AtDepth xw={xw} s={S_WALL} camX={camX}>
    <rect x={-170} y={-1020} width={340} height={440} fill="#3b3f47" />
    <rect x={-152} y={-1002} width={304} height={404} fill="#f2c14e" />
    <circle cx={0} cy={-850} r={86} fill="#e5793b" />
    <path d="M -152 -700 L -40 -790 L 40 -730 L 152 -820 L 152 -598 L -152 -598 Z" fill="#2f6f73" />
    <text x={0} y={-630} textAnchor="middle" fontFamily="sans-serif" fontSize={34} fontWeight={800} fill="#fff">
      TEAMWORK
    </text>
  </AtDepth>
);

// ---------------------------------------------------------------- floor props
const CODE = seededArray(91, 3 * 16, (r) => ({w: 30 + r() * 170, indent: Math.floor(r() * 3) * 22, c: Math.floor(r() * 4)}));
const CODE_COL = ['#7fd4ff', '#ffcf6b', '#9be38f', '#e59cff'];

const Monitor: React.FC<{x: number; kind: number; frame: number}> = ({x, kind, frame}) => {
  const lines = CODE.slice(kind * 16, kind * 16 + 12);
  const cursorOn = Math.floor(frame / 30) % 2 === 0;
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x={-18} y={-40} width={36} height={40} fill="#2a2d33" />
      <rect x={-70} y={-8} width={140} height={10} rx={4} fill="#2a2d33" />
      <rect x={-170} y={-250} width={340} height={214} rx={10} fill="#1f2228" />
      <rect x={-158} y={-238} width={316} height={186} fill={kind === 1 ? '#f5f7fb' : '#18202e'} />
      {kind === 1 ? (
        <g>
          {[60, 100, 80, 130, 115, 150].map((h, i) => (
            <rect key={i} x={-130 + i * 46} y={-60 - h * 0.9} width={30} height={h * 0.9} fill="#3a7bd5" />
          ))}
          <rect x={-150} y={-230} width={300} height={22} fill="#e2e8f0" />
        </g>
      ) : (
        <g>
          {lines.map((l, i) => (
            <rect key={i} x={-146 + l.indent} y={-228 + i * 14} width={Math.min(l.w, 270 - l.indent)} height={7} rx={3} fill={CODE_COL[l.c]} opacity={0.85} />
          ))}
          {cursorOn ? <rect x={-146 + 40} y={-228 + 12 * 14} width={10} height={10} fill="#fff" /> : null}
        </g>
      )}
      <rect x={-158} y={-238} width={316} height={186} fill="url(#screenGlare)" />
    </g>
  );
};

const Desk: React.FC<P & {xw: number; s: number; variant: number}> = ({xw, s, camX, frame, variant}) => (
  <AtDepth xw={xw} s={s} camX={camX}>
    <defs>
      <linearGradient id="screenGlare" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff" stopOpacity={0.14} />
        <stop offset="0.4" stopColor="#fff" stopOpacity={0} />
      </linearGradient>
    </defs>
    {/* legs and modesty panel */}
    <rect x={-380} y={-330} width={22} height={330} fill="#5d646f" />
    <rect x={358} y={-330} width={22} height={330} fill="#5d646f" />
    <rect x={-360} y={-310} width={720} height={170} fill="#c7b59a" />
    {/* drawer pedestal */}
    <rect x={160} y={-300} width={190} height={300} fill="#d9cbb3" stroke="#b8a586" strokeWidth={3} />
    {[0, 1, 2].map((i) => (
      <g key={i}>
        <rect x={172} y={-288 + i * 96} width={166} height={84} fill="#e2d6c1" />
        <rect x={225} y={-262 + i * 96} width={60} height={10} rx={5} fill="#8a8f96" />
      </g>
    ))}
    {/* top */}
    <rect x={-400} y={-356} width={800} height={30} rx={4} fill="#e2d2b4" />
    <rect x={-400} y={-330} width={800} height={6} fill="#b8a586" />
    {/* things on the desk */}
    <g transform="translate(0 -356)">
      <Monitor x={variant === 1 ? -150 : -110} kind={variant === 1 ? 2 : 0} frame={frame} />
      <Monitor x={variant === 1 ? 210 : 230} kind={1} frame={frame} />
      <rect x={-120} y={-14} width={230} height={14} rx={4} fill="#3a3d43" />
      <rect x={140} y={-12} width={40} height={12} rx={6} fill="#3a3d43" />
      {/* mug */}
      <g transform={`translate(${variant === 1 ? 330 : -320} 0)`}>
        <rect x={-24} y={-58} width={48} height={58} rx={6} fill={variant === 1 ? '#d6453d' : '#3a7bd5'} />
        <path d="M 24 -46 q 22 4 0 30" stroke={variant === 1 ? '#d6453d' : '#3a7bd5'} strokeWidth={8} fill="none" />
      </g>
      {/* paper tray */}
      {variant !== 1 ? (
        <g transform="translate(-360 0)">
          <rect x={20} y={-40} width={110} height={40} fill="#4c5560" />
          <rect x={26} y={-50} width={98} height={10} fill="#fff" />
        </g>
      ) : null}
    </g>
    {/* office chair seen from behind, pushed in */}
    <g transform="translate(-40 0)">
      <rect x={-8} y={-210} width={16} height={130} fill="#3a3d43" />
      <path d="M -150 -6 L 150 -6 L 120 -20 L -120 -20 Z" fill="#2a2d33" />
      <circle cx={-140} cy={-4} r={9} fill="#1b1d22" />
      <circle cx={140} cy={-4} r={9} fill="#1b1d22" />
      <circle cx={0} cy={-4} r={9} fill="#1b1d22" />
      <rect x={-140} y={-250} width={280} height={44} rx={18} fill="#30343c" />
      <rect x={-120} y={-560} width={240} height={300} rx={40} fill="#3c424c" />
      <rect x={-104} y={-540} width={208} height={262} rx={32} fill="#46505c" />
      <rect x={-14} y={-270} width={28} height={30} fill="#30343c" />
    </g>
  </AtDepth>
);

const LEAVES = seededArray(5150, 16, (r, i) => ({
  ang: -78 + (i / 15) * 156 + (r() - 0.5) * 14,
  len: 230 + r() * 170,
  base: -170 - r() * 120,
  w: 34 + r() * 16,
  shade: r(),
  ph: r() * Math.PI * 2,
}));

const Plant: React.FC<P & {xw: number; s: number}> = ({xw, s, camX, frame}) => (
  <AtDepth xw={xw} s={s} camX={camX}>
    {LEAVES.map((l, i) => {
      // gentle deterministic sway (air from the walker passing)
      const sway = 2.2 * Math.sin(frame * 0.05 + l.ph);
      return (
        <g key={i} transform={`translate(0 ${l.base}) rotate(${l.ang + sway})`}>
          <path d={`M 0 0 Q 0 -${l.len * 0.5} 0 -${l.len}`} stroke="#3d6e3a" strokeWidth={6} fill="none" />
          <path
            d={`M 0 -${l.len * 0.35} Q ${l.w} -${l.len * 0.7} 0 -${l.len * 1.08} Q ${-l.w} -${l.len * 0.7} 0 -${l.len * 0.35} Z`}
            fill={l.shade > 0.5 ? '#4f9a4a' : '#3f8a44'}
          />
          <path d={`M 0 -${l.len * 0.38} L 0 -${l.len * 1.02}`} stroke="#6fb565" strokeWidth={3} />
        </g>
      );
    })}
    <path d="M -110 -200 L 110 -200 L 86 0 L -86 0 Z" fill="#c8673f" />
    <rect x={-122} y={-224} width={244} height={34} rx={6} fill="#d77a50" />
    <path d="M -96 -150 L 96 -150" stroke="#b55a35" strokeWidth={5} />
    <ellipse cx={0} cy={0} rx={96} ry={10} fill="#000" opacity={0.15} />
  </AtDepth>
);

const BUBBLES = seededArray(4242, 7, (r) => ({x: (r() - 0.5) * 90, r: 5 + r() * 7, speed: 1.4 + r() * 1.6, off: r() * 300}));

const WaterCooler: React.FC<P & {xw: number; s: number}> = ({xw, s, camX, frame}) => (
  <AtDepth xw={xw} s={s} camX={camX}>
    <defs>
      <linearGradient id="bottle" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#7cc0ea" stopOpacity={0.75} />
        <stop offset="0.35" stopColor="#bfe3f8" stopOpacity={0.85} />
        <stop offset="1" stopColor="#5aa8dd" stopOpacity={0.8} />
      </linearGradient>
    </defs>
    {/* cabinet */}
    <rect x={-115} y={-560} width={230} height={560} rx={14} fill="#eef0f2" stroke="#cfd4da" strokeWidth={4} />
    <rect x={-115} y={-560} width={40} height={560} rx={14} fill="#dfe3e8" />
    <rect x={-80} y={-420} width={160} height={110} rx={8} fill="#c9d0d8" />
    <rect x={-70} y={-334} width={140} height={16} rx={4} fill="#9aa4b0" />
    <rect x={-52} y={-460} width={26} height={44} rx={6} fill="#3a7bd5" />
    <rect x={26} y={-460} width={26} height={44} rx={6} fill="#d6453d" />
    <rect x={-60} y={-250} width={120} height={150} rx={6} fill="#e4e8ec" stroke="#cfd4da" strokeWidth={3} />
    {/* cup dispenser */}
    <rect x={115} y={-500} width={28} height={180} rx={6} fill="#cfd4da" />
    <path d="M 115 -320 l 34 0 l -4 20 l -26 0 Z" fill="#fff" stroke="#cfd4da" strokeWidth={2} />
    {/* bottle */}
    <g transform="translate(0 -560)">
      <rect x={-24} y={-30} width={48} height={30} fill="#5aa8dd" />
      <path d="M -100 -40 Q -110 -60 -100 -90 L -100 -300 Q -100 -330 -70 -334 L 70 -334 Q 100 -330 100 -300 L 100 -90 Q 110 -60 100 -40 Q 60 -26 0 -26 Q -60 -26 -100 -40 Z" fill="url(#bottle)" />
      <path d="M -100 -220 L 100 -220" stroke="#5aa8dd" strokeWidth={6} opacity={0.6} />
      <path d="M -100 -150 L 100 -150" stroke="#5aa8dd" strokeWidth={6} opacity={0.6} />
      <rect x={-78} y={-320} width={18} height={250} rx={9} fill="#fff" opacity={0.35} />
      {BUBBLES.map((b, i) => {
        const y = -40 - ((frame * b.speed + b.off) % 270);
        return <circle key={i} cx={b.x} cy={y} r={b.r} fill="none" stroke="#fff" strokeWidth={2} opacity={0.75} />;
      })}
    </g>
  </AtDepth>
);

const Switch: React.FC<P & {xw: number}> = ({xw, camX}) => (
  <AtDepth xw={xw} s={S_WALL} camX={camX}>
    <rect x={-34} y={-760} width={68} height={104} rx={6} fill="#f7f5ef" stroke="#cbc3b3" strokeWidth={3} />
    <rect x={-12} y={-728} width={24} height={40} rx={4} fill="#e6e1d6" stroke="#cbc3b3" strokeWidth={2} />
  </AtDepth>
);

export const Office: React.FC<P> = ({camX, frame}) => (
  <g>
    <Room camX={camX} frame={frame} />
    {/* back wall, s = 0.8 */}
    <Window xw={180} id="a" camX={camX} frame={frame} />
    <Switch xw={700} camX={camX} frame={frame} />
    <Whiteboard xw={1330} camX={camX} frame={frame} />
    <Clock xw={2020} camX={camX} frame={frame} />
    <Window xw={2780} id="b" camX={camX} frame={frame} />
    <Poster xw={3500} camX={camX} frame={frame} />
    {/* furniture on the floor, between the wall and the worker */}
    <Desk xw={-180} s={0.9} variant={0} camX={camX} frame={frame} />
    <Plant xw={720} s={0.92} camX={camX} frame={frame} />
    <Desk xw={1520} s={0.9} variant={1} camX={camX} frame={frame} />
    <WaterCooler xw={2260} s={0.92} camX={camX} frame={frame} />
    <Desk xw={2980} s={0.9} variant={0} camX={camX} frame={frame} />
  </g>
);
