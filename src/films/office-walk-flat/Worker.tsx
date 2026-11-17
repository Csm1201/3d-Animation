import React from 'react';
import {FLOOR_Y} from '../../core/constants';
import {ArmPose, LegPose, Pose, Vec} from '../../core/walkCycle';
import {forearmFrame, PaperStack} from './Paper';

const C = {
  skin: '#e9b48e',
  skinShade: '#cf9672',
  hair: '#3b2a20',
  shirt: '#d7e6f5',
  shirtShade: '#b4c9e0',
  shirtLine: '#9fb4cc',
  cuff: '#f4f8fc',
  tie: '#b8312f',
  tieStripe: '#8e1f1f',
  trousers: '#3a404c',
  trousersFar: '#2a2f39',
  belt: '#2b1e16',
  buckle: '#c9b27a',
  shoe: '#2a1c15',
  shoeFar: '#1d130e',
  sole: '#120b08',
  shine: '#5b4334',
};

/** Tapered limb between two joints, with rounded ends. */
const Limb: React.FC<{a: Vec; b: Vec; wa: number; wb: number; fill: string; stroke?: string}> = ({
  a,
  b,
  wa,
  wb,
  fill,
  stroke,
}) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const d = [
    `M ${a.x + nx * wa / 2} ${a.y + ny * wa / 2}`,
    `L ${b.x + nx * wb / 2} ${b.y + ny * wb / 2}`,
    `L ${b.x - nx * wb / 2} ${b.y - ny * wb / 2}`,
    `L ${a.x - nx * wa / 2} ${a.y - ny * wa / 2}`,
    'Z',
  ].join(' ');
  return (
    <g>
      <path d={d} fill={fill} stroke={stroke} strokeWidth={stroke ? 1.5 : 0} strokeLinejoin="round" />
      <circle cx={a.x} cy={a.y} r={wa / 2} fill={fill} />
      <circle cx={b.x} cy={b.y} r={wb / 2} fill={fill} />
    </g>
  );
};

const Shoe: React.FC<{leg: LegPose; color: string}> = ({leg, color}) => {
  const {ankle, angle} = leg.foot;
  return (
    <g transform={`translate(${ankle.x} ${ankle.y}) rotate(${angle})`}>
      <path
        d="M -30 22 L 60 22 Q 70 21 68 12 Q 65 3 47 -1 L 22 -8 Q 8 -17 -10 -17 L -24 -13 Q -34 -7 -32 10 Z"
        fill={color}
      />
      <path d="M -30 22 L 60 22 Q 66 22 67 17 L -31 17 Z" fill={C.sole} />
      <path d="M 30 -3 Q 46 0 56 7" stroke={C.shine} strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} />
      <path d="M 8 -12 L 22 -6" stroke="#0d0907" strokeWidth={2} strokeLinecap="round" />
    </g>
  );
};

const Leg: React.FC<{leg: LegPose; far?: boolean}> = ({leg, far}) => {
  const cloth = far ? C.trousersFar : C.trousers;
  return (
    <g>
      <Shoe leg={leg} color={far ? C.shoeFar : C.shoe} />
      <Limb a={leg.knee} b={leg.foot.ankle} wa={54} wb={44} fill={cloth} />
      <Limb a={leg.hip} b={leg.knee} wa={70} wb={56} fill={cloth} />
      {/* trouser crease */}
      <path
        d={`M ${leg.hip.x + 14} ${leg.hip.y + 10} L ${leg.knee.x + 12} ${leg.knee.y} L ${leg.foot.ankle.x + 12} ${leg.foot.ankle.y - 6}`}
        stroke={far ? '#22262e' : '#4a5160'}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
    </g>
  );
};

const Hand: React.FC<{arm: ArmPose; color: string; open?: boolean}> = ({arm, color}) => {
  const dx = Math.sin((arm.foreDeg * Math.PI) / 180);
  const dy = Math.cos((arm.foreDeg * Math.PI) / 180);
  const c = {x: arm.wrist.x + dx * 18, y: arm.wrist.y + dy * 18};
  return (
    <g>
      <ellipse cx={c.x} cy={c.y} rx={17} ry={21} fill={color} transform={`rotate(${-arm.foreDeg} ${c.x} ${c.y})`} />
      <circle cx={c.x + dx * 10 + 6} cy={c.y + dy * 10} r={9} fill={color} />
    </g>
  );
};

const FreeArm: React.FC<{arm: ArmPose}> = ({arm}) => (
  <g>
    <Hand arm={arm} color={C.skinShade} />
    <Limb a={arm.elbow} b={arm.wrist} wa={40} wb={34} fill={C.shirtShade} />
    <Limb
      a={arm.wrist}
      b={{
        x: arm.wrist.x - Math.sin((arm.foreDeg * Math.PI) / 180) * 12,
        y: arm.wrist.y - Math.cos((arm.foreDeg * Math.PI) / 180) * 12,
      }}
      wa={36}
      wb={36}
      fill="#c8d6e6"
    />
    <Limb a={arm.shoulder} b={arm.elbow} wa={50} wb={42} fill={C.shirtShade} />
  </g>
);

const Torso: React.FC<{pose: Pose}> = ({pose}) => {
  const {pelvis, lean} = pose;
  // Tie swings slightly off the chest with the walk (driven by the same cycle phase).
  const tieSwing = 3 * Math.sin(2 * Math.PI * 2 * (pose.phase - 0.1));
  return (
    <g transform={`translate(${pelvis.x} ${pelvis.y}) rotate(${lean})`}>
      {/* trouser seat */}
      <path d="M -52 -26 L 52 -26 C 60 0 58 34 42 52 L -40 52 C -58 32 -60 0 -52 -26 Z" fill={C.trousers} />
      {/* shirt */}
      <path
        d="M -48 -20 C -56 -100 -60 -180 -48 -252 C -40 -284 -12 -298 18 -297 C 44 -295 58 -270 60 -230 C 62 -170 58 -90 50 -20 Z"
        fill={C.shirt}
      />
      <path d="M -48 -20 C -56 -100 -60 -180 -48 -252 C -44 -270 -36 -280 -26 -287 C -40 -230 -42 -120 -30 -20 Z" fill={C.shirtShade} opacity={0.7} />
      {/* fabric folds */}
      <path d="M 10 -40 Q 22 -70 18 -110" stroke={C.shirtLine} strokeWidth={2} fill="none" opacity={0.6} />
      <path d="M -20 -36 Q -10 -60 -14 -90" stroke={C.shirtLine} strokeWidth={2} fill="none" opacity={0.5} />
      {/* buttons placket */}
      <path d="M 50 -250 C 56 -190 54 -100 48 -30" stroke={C.shirtLine} strokeWidth={1.5} fill="none" />
      {/* belt */}
      <path d="M -50 -36 L 52 -36 L 51 -18 L -49 -18 Z" fill={C.belt} />
      <rect x={38} y={-38} width={14} height={22} rx={2} fill="none" stroke={C.buckle} strokeWidth={3} />
      {/* collar */}
      <path d="M -6 -292 Q 16 -304 40 -290 L 46 -276 Q 30 -272 22 -280 Q 8 -286 -6 -280 Z" fill="#f4f8fc" stroke={C.shirtLine} strokeWidth={1.5} />
      {/* tie */}
      <g transform={`rotate(${tieSwing} 44 -282)`}>
        <path d="M 38 -286 L 50 -286 L 52 -272 L 40 -270 Z" fill={C.tieStripe} />
        <path d="M 40 -272 L 52 -272 Q 64 -200 66 -128 L 58 -112 L 48 -126 Q 46 -200 40 -272 Z" fill={C.tie} />
        {[0, 1, 2, 3].map((i) => (
          <path
            key={i}
            d={`M ${44 + i * 0.5} ${-250 + i * 34} L ${58 + i * 2} ${-262 + i * 34}`}
            stroke={C.tieStripe}
            strokeWidth={4}
            opacity={0.9}
          />
        ))}
      </g>
      {/* shoulder seam */}
      <path d="M -26 -284 Q 6 -258 34 -282" stroke={C.shirtLine} strokeWidth={1.5} fill="none" opacity={0.6} />
    </g>
  );
};

const Head: React.FC<{pose: Pose; frame: number}> = ({pose, frame}) => {
  const {neck, headTilt, lean} = pose;
  // Deterministic blink around 1.9 s and 4.2 s.
  const blink = [114, 252].some((b) => frame >= b && frame < b + 6);
  return (
    <g transform={`translate(${neck.x} ${neck.y}) rotate(${lean + headTilt})`}>
      {/* neck */}
      <path d="M -12 10 L -10 -46 L 30 -46 L 30 6 Z" fill={C.skinShade} />
      <g transform="translate(14 -104)">
        {/* skull + face */}
        <path
          d="M -46 -10 C -50 -52 -20 -74 10 -72 C 44 -70 62 -46 60 -14 C 60 -2 66 4 70 12 C 72 16 66 18 62 20 C 62 30 60 38 54 42 C 52 52 44 60 30 62 C 12 64 -6 58 -18 46 C -36 38 -44 18 -46 -10 Z"
          fill={C.skin}
        />
        {/* hair */}
        <path
          d="M -48 0 C -56 -44 -26 -80 12 -78 C 44 -76 64 -56 62 -26 C 52 -40 38 -44 22 -42 C 10 -40 0 -30 -8 -24 C -16 -14 -22 4 -26 18 C -36 22 -46 14 -48 0 Z"
          fill={C.hair}
        />
        {/* ear */}
        <ellipse cx={-14} cy={4} rx={10} ry={15} fill={C.skinShade} />
        <path d="M -16 -4 Q -10 4 -16 12" stroke="#b07a58" strokeWidth={2} fill="none" />
        {/* eye */}
        {blink ? (
          <path d="M 36 -8 L 46 -8" stroke="#2a1f1a" strokeWidth={3} strokeLinecap="round" />
        ) : (
          <ellipse cx={42} cy={-8} rx={4} ry={5} fill="#2a1f1a" />
        )}
        <path d="M 32 -22 Q 42 -27 52 -22" stroke={C.hair} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* mouth */}
        <path d="M 46 36 Q 52 40 58 36" stroke="#9a5a44" strokeWidth={3} fill="none" strokeLinecap="round" />
        {/* jaw shadow */}
        <path d="M -6 54 Q 20 66 46 54" stroke={C.skinShade} strokeWidth={3} fill="none" opacity={0.5} />
      </g>
    </g>
  );
};

const CarryArm: React.FC<{pose: Pose; frame: number}> = ({pose, frame}) => {
  const arm = pose.nearArm;
  const {dir, rotDeg} = forearmFrame(pose);
  const cuff = {x: arm.wrist.x - dir.x * 14, y: arm.wrist.y - dir.y * 14};
  return (
    <g>
      <Limb a={arm.shoulder} b={arm.elbow} wa={54} wb={46} fill={C.shirt} stroke={C.shirtLine} />
      <Limb a={arm.elbow} b={arm.wrist} wa={44} wb={38} fill={C.shirt} stroke={C.shirtLine} />
      <Limb a={cuff} b={arm.wrist} wa={40} wb={40} fill={C.cuff} />
      {/* fold at the elbow */}
      <path
        d={`M ${arm.elbow.x - 6} ${arm.elbow.y - 18} q 10 12 22 6`}
        stroke={C.shirtLine}
        strokeWidth={2}
        fill="none"
      />
      {/* papers rest on the top of the forearm, aligned with it */}
      <PaperStack elbow={arm.elbow} rotDeg={rotDeg} wobble={pose.paperWobble} frame={frame} />
      {/* hand curls up around the front edge of the stack */}
      <g transform={`translate(${arm.wrist.x} ${arm.wrist.y}) rotate(${rotDeg})`}>
        <ellipse cx={20} cy={2} rx={24} ry={17} fill={C.skin} />
        <path d="M 30 -10 Q 44 -14 44 -34 Q 44 -48 36 -50 Q 30 -48 32 -34 Q 32 -22 26 -16 Z" fill={C.skin} />
        <path d="M 8 -8 Q 16 -18 24 -14" stroke={C.skinShade} strokeWidth={4} fill="none" strokeLinecap="round" />
      </g>
    </g>
  );
};

export const Worker: React.FC<{pose: Pose; frame: number}> = ({pose, frame}) => {
  const groundX = pose.pelvis.x;
  const footShadow = (leg: LegPose) => {
    const h = Math.max(0, FLOOR_Y - 22 - leg.foot.ankle.y);
    return (
      <ellipse
        cx={leg.foot.ankle.x + 16}
        cy={FLOOR_Y + 2}
        rx={56 - h * 0.3}
        ry={7}
        fill="#1b1f2a"
        opacity={Math.max(0, 0.32 - h * 0.006)}
      />
    );
  };
  return (
    <g>
      {/* soft body shadow */}
      <ellipse cx={groundX + 10} cy={FLOOR_Y + 4} rx={170} ry={18} fill="#1b1f2a" opacity={0.13} />
      {footShadow(pose.farLeg)}
      {footShadow(pose.nearLeg)}
      {/* far side, drawn first */}
      <FreeArm arm={pose.farArm} />
      <Leg leg={pose.farLeg} far />
      <Leg leg={pose.nearLeg} />
      <Torso pose={pose} />
      <Head pose={pose} frame={frame} />
      <CarryArm pose={pose} frame={frame} />
    </g>
  );
};
