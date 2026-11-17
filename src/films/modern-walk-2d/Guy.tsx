/**
 * Modern-day guy, flat 2D, side view facing right. Drawn from the shared walk-cycle Pose
 * (same skeleton as the office worker), so the walk has no foot sliding.
 * Hoodie, jeans, white sneakers, backpack, earbuds, phone in hand.
 */
import React from 'react';
import {FLOOR_Y} from '../../core/constants';
import {ArmPose, LegPose, Pose, Vec} from '../../core/walkCycle';

const C = {
  skin: '#d9a27a',
  skinShade: '#c08a63',
  hair: '#2a1d17',
  hoodie: '#5f7d95',
  hoodieShade: '#4f6a80',
  hoodieDark: '#43596b',
  rib: '#56728a',
  jeans: '#30496b',
  jeansFar: '#263a56',
  seam: '#4a6588',
  shoe: '#f6f5f1',
  shoeFar: '#dedcd6',
  sole: '#e7dfcf',
  accent: '#e2574c',
  lace: '#c9c6bf',
  pack: '#e4b04a',
  packShade: '#c9952f',
  strap: '#3a3f47',
  phone: '#1f2228',
  screen: '#bfe8ff',
  bud: '#ffffff',
};

/** Tapered limb between two joints, with rounded ends. */
const Limb: React.FC<{a: Vec; b: Vec; wa: number; wb: number; fill: string}> = ({a, b, wa, wb, fill}) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1;
  const nx = -dy / L;
  const ny = dx / L;
  const d = `M ${a.x + (nx * wa) / 2} ${a.y + (ny * wa) / 2} L ${b.x + (nx * wb) / 2} ${b.y + (ny * wb) / 2} L ${b.x - (nx * wb) / 2} ${b.y - (ny * wb) / 2} L ${a.x - (nx * wa) / 2} ${a.y - (ny * wa) / 2} Z`;
  return (
    <g>
      <path d={d} fill={fill} />
      <circle cx={a.x} cy={a.y} r={wa / 2} fill={fill} />
      <circle cx={b.x} cy={b.y} r={wb / 2} fill={fill} />
    </g>
  );
};

/** Chunky white sneaker, local to the ankle: heel -30, toe +68, sole at y = 22. */
const Sneaker: React.FC<{leg: LegPose; far?: boolean}> = ({leg, far}) => (
  <g transform={`translate(${leg.foot.ankle.x} ${leg.foot.ankle.y}) rotate(${leg.foot.angle})`}>
    <path d="M -31 14 L 64 14 Q 72 14 70 6 Q 66 -4 48 -6 L 24 -12 Q 10 -20 -8 -20 L -24 -16 Q -34 -10 -33 4 Z" fill={far ? C.shoeFar : C.shoe} />
    <path d="M -32 12 L 66 12 Q 72 13 71 18 Q 70 23 62 23 L -28 23 Q -33 22 -32 12 Z" fill={C.sole} />
    <path d="M -24 -4 Q 6 -2 30 2" stroke={C.accent} strokeWidth={5} fill="none" strokeLinecap="round" opacity={far ? 0.7 : 1} />
    {[0, 1, 2].map((i) => (
      <path key={i} d={`M ${12 + i * 9} ${-14 + i * 2} l 6 3`} stroke={C.lace} strokeWidth={2.5} strokeLinecap="round" />
    ))}
  </g>
);

const Leg: React.FC<{leg: LegPose; far?: boolean}> = ({leg, far}) => {
  const cloth = far ? C.jeansFar : C.jeans;
  return (
    <g>
      <Limb a={leg.knee} b={leg.foot.ankle} wa={52} wb={44} fill={cloth} />
      <Limb a={leg.hip} b={leg.knee} wa={70} wb={56} fill={cloth} />
      {/* outer seam + a turned-up hem */}
      <path
        d={`M ${leg.hip.x + 12} ${leg.hip.y + 8} L ${leg.knee.x + 10} ${leg.knee.y} L ${leg.foot.ankle.x + 10} ${leg.foot.ankle.y - 10}`}
        stroke={far ? '#22344d' : C.seam}
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
      />
      {/* sneaker drawn over the hem so the whole shoe shows */}
      <Sneaker leg={leg} far={far} />
    </g>
  );
};

const FreeArm: React.FC<{arm: ArmPose}> = ({arm}) => {
  const dx = Math.sin((arm.foreDeg * Math.PI) / 180);
  const dy = Math.cos((arm.foreDeg * Math.PI) / 180);
  return (
    <g>
      <ellipse cx={arm.wrist.x + dx * 16} cy={arm.wrist.y + dy * 16} rx={16} ry={19} fill={C.skinShade} transform={`rotate(${-arm.foreDeg} ${arm.wrist.x + dx * 16} ${arm.wrist.y + dy * 16})`} />
      <Limb a={arm.elbow} b={arm.wrist} wa={44} wb={40} fill={C.hoodieDark} />
      <Limb a={arm.shoulder} b={arm.elbow} wa={56} wb={46} fill={C.hoodieDark} />
    </g>
  );
};

/** Near arm: forearm forward, phone in hand, screen tilted up toward his face. */
const PhoneArm: React.FC<{arm: ArmPose; frame: number}> = ({arm, frame}) => {
  const a = (arm.foreDeg * Math.PI) / 180;
  const dir = {x: Math.sin(a), y: Math.cos(a)};
  const hand = {x: arm.wrist.x + dir.x * 14, y: arm.wrist.y + dir.y * 14};
  const scroll = (frame * 2.2) % 40; // thumb-scrolling content
  return (
    <g>
      <Limb a={arm.shoulder} b={arm.elbow} wa={58} wb={48} fill={C.hoodie} />
      <Limb a={arm.elbow} b={arm.wrist} wa={48} wb={42} fill={C.hoodie} />
      <Limb a={{x: arm.wrist.x - dir.x * 10, y: arm.wrist.y - dir.y * 10}} b={arm.wrist} wa={44} wb={44} fill={C.rib} />
      {/* phone held up, tilted back toward the face */}
      <g transform={`translate(${hand.x + 6} ${hand.y - 18}) rotate(-24)`}>
        <rect x={-18} y={-40} width={36} height={72} rx={8} fill={C.phone} />
        <rect x={-14} y={-35} width={28} height={62} rx={5} fill={C.screen} />
        <clipPath id="phone-screen">
          <rect x={-14} y={-35} width={28} height={62} rx={5} />
        </clipPath>
        <g clipPath="url(#phone-screen)">
          {[0, 1, 2, 3].map((i) => (
            <rect key={i} x={-11} y={-36 + i * 20 - scroll + 20} width={22} height={13} rx={3} fill={i % 2 ? '#8cc8ea' : '#e2574c'} opacity={0.75} />
          ))}
        </g>
      </g>
      {/* hand wrapped round the phone, thumb on the screen */}
      <ellipse cx={hand.x} cy={hand.y} rx={18} ry={16} fill={C.skin} />
      <path d={`M ${hand.x + 4} ${hand.y - 10} q 10 -14 4 -26`} stroke={C.skin} strokeWidth={11} fill="none" strokeLinecap="round" />
    </g>
  );
};

const Torso: React.FC<{pose: Pose}> = ({pose}) => {
  const {pelvis, lean} = pose;
  const sway = 4 * Math.sin(2 * Math.PI * 2 * (pose.phase - 0.1));
  return (
    <g transform={`translate(${pelvis.x} ${pelvis.y}) rotate(${lean})`}>
      {/* backpack behind the body */}
      <rect x={-112} y={-262} width={74} height={190} rx={26} fill={C.pack} />
      <rect x={-112} y={-150} width={74} height={56} rx={14} fill={C.packShade} />
      <rect x={-104} y={-232} width={10} height={130} rx={5} fill={C.packShade} opacity={0.6} />
      {/* jeans seat */}
      <path d="M -52 -26 L 52 -26 C 60 0 58 34 42 52 L -40 52 C -58 32 -60 0 -52 -26 Z" fill={C.jeans} />
      {/* hoodie body: boxy, ribbed hem, kangaroo pocket */}
      <path d="M -52 -6 C -60 -100 -60 -186 -48 -254 C -40 -286 -12 -300 18 -298 C 46 -296 60 -270 62 -228 C 64 -160 62 -80 56 -6 Z" fill={C.hoodie} />
      <path d="M -52 -6 C -60 -100 -60 -186 -48 -254 C -44 -272 -36 -282 -26 -290 C -42 -230 -44 -110 -34 -6 Z" fill={C.hoodieShade} />
      <rect x={-54} y={-26} width={112} height={26} rx={10} fill={C.rib} />
      <path d="M 4 -36 L 56 -36 L 58 -112 Q 30 -118 18 -100 Z" fill={C.hoodieShade} />
      {/* hood bunched behind the neck */}
      <path d="M -54 -268 C -70 -300 -40 -330 -6 -318 C 14 -312 18 -296 6 -284 C -14 -290 -34 -282 -54 -268 Z" fill={C.hoodieDark} />
      {/* drawstrings swing a little with the walk */}
      {[22, 38].map((x, i) => (
        <g key={x} transform={`rotate(${sway * (i ? 1.2 : 1)} ${x} -282)`}>
          <path d={`M ${x} -282 L ${x + 3} -210`} stroke="#eef2f5" strokeWidth={4} strokeLinecap="round" />
          <circle cx={x + 3} cy={-207} r={4} fill="#d4dbe2" />
        </g>
      ))}
      {/* backpack strap over the shoulder */}
      <path d="M -30 -284 C 0 -270 10 -220 4 -150" stroke={C.strap} strokeWidth={14} fill="none" strokeLinecap="round" />
    </g>
  );
};

const Head: React.FC<{pose: Pose; frame: number}> = ({pose, frame}) => {
  const {neck, headTilt, lean} = pose;
  const blink = [70, 150].some((b) => frame >= b && frame < b + 6);
  return (
    // looking down a little at his phone
    <g transform={`translate(${neck.x} ${neck.y}) rotate(${lean + headTilt + 7})`}>
      <path d="M -12 10 L -10 -46 L 30 -46 L 30 6 Z" fill={C.skinShade} />
      <g transform="translate(14 -104)">
        <path
          d="M -46 -10 C -50 -52 -20 -74 10 -72 C 44 -70 62 -46 60 -14 C 60 -2 66 4 70 12 C 72 16 66 18 62 20 C 62 30 60 38 54 42 C 52 52 44 60 30 62 C 12 64 -6 58 -18 46 C -36 38 -44 18 -46 -10 Z"
          fill={C.skin}
        />
        {/* modern fade: tight sides, volume on top swept forward */}
        <path d="M -48 4 C -54 -40 -26 -72 6 -76 C 30 -80 52 -72 62 -52 C 66 -42 60 -34 50 -36 C 30 -40 8 -36 -6 -28 C -16 -18 -22 0 -26 14 C -36 18 -46 14 -48 4 Z" fill={C.hair} />
        <path d="M -40 -6 C -42 -30 -34 -46 -20 -54" stroke="#3d2c24" strokeWidth={3} fill="none" opacity={0.6} />
        {/* ear with a white earbud */}
        <ellipse cx={-14} cy={4} rx={10} ry={15} fill={C.skinShade} />
        <circle cx={-12} cy={2} r={6} fill={C.bud} />
        <rect x={-14} y={4} width={4} height={14} rx={2} fill={C.bud} />
        {/* eye looking down at the phone */}
        {blink ? <path d="M 36 -4 L 46 -4" stroke="#2a1f1a" strokeWidth={3} strokeLinecap="round" /> : <ellipse cx={42} cy={-3} rx={4} ry={4.5} fill="#2a1f1a" />}
        <path d="M 33 -18 Q 43 -21 52 -16" stroke={C.hair} strokeWidth={4} fill="none" strokeLinecap="round" />
        {/* small smile at whatever he's watching */}
        <path d="M 46 36 Q 52 41 59 35" stroke="#8f4d3a" strokeWidth={3} fill="none" strokeLinecap="round" />
        <path d="M 30 50 Q 40 56 50 50" stroke={C.skinShade} strokeWidth={3} fill="none" opacity={0.5} />
      </g>
    </g>
  );
};

export const Guy: React.FC<{pose: Pose; frame: number}> = ({pose, frame}) => {
  const footShadow = (leg: LegPose) => {
    const h = Math.max(0, FLOOR_Y - 22 - leg.foot.ankle.y);
    return <ellipse cx={leg.foot.ankle.x + 16} cy={FLOOR_Y + 2} rx={56 - h * 0.3} ry={7} fill="#2a2a33" opacity={Math.max(0, 0.32 - h * 0.006)} />;
  };
  return (
    <g>
      <ellipse cx={pose.pelvis.x + 10} cy={FLOOR_Y + 4} rx={170} ry={18} fill="#2a2a33" opacity={0.14} />
      {footShadow(pose.farLeg)}
      {footShadow(pose.nearLeg)}
      <FreeArm arm={pose.farArm} />
      <Leg leg={pose.farLeg} far />
      <Leg leg={pose.nearLeg} />
      <Torso pose={pose} />
      <Head pose={pose} frame={frame} />
      <PhoneArm arm={pose.nearArm} frame={frame} />
    </g>
  );
};
