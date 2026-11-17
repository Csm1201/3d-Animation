/**
 * Ice wall flight test (2 s, 30 fps, 1080x1920).
 * A pilot in a little red open-cockpit plane has just cleared the edge of a towering Antarctic
 * ice cliff; the camera flies ahead of him, looking back at his face, with the drop to the sea behind.
 * Same toy-plastic style as the "You're the Ref" films.
 */
import {ThreeCanvas} from '@remotion/three';
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {
  BackSide,
  BoxGeometry,
  CapsuleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SphereGeometry,
  Vector3,
} from 'three';
import {HEIGHT, WIDTH} from '../../core/constants';
import {BodySpec} from '../../core/sportPoses';
import {seeded} from '../../core/random';
import {canvasTex, once} from '../../character3d/common';
import {Cam, CameraRig, Daylight, Environment} from '../../character3d/stage';
import {Style} from '../../character3d/Worker3D';
import {Actor} from '../youre-the-ref/Episode2';

export const ICE_FRAMES = 60;

const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));
const smooth = (t: number) => t * t * (3 - 2 * t);
const DEG = Math.PI / 180;

// ---------------------------------------------------------------- world layout
const WALL_X = 90; // the cliff face, facing -x (towards the sea)
const WALL_H = 46; // metres of ice above the waterline
const WALL_LEN = 1400;

// cheap smooth 1D value noise for the cliff face
const noise1 = (seed: number) => {
  const r = seeded(seed);
  const pts = Array.from({length: 512}, () => r());
  return (x: number) => {
    const i = Math.floor(x);
    const f = x - i;
    const a = pts[((i % 512) + 512) % 512];
    const b = pts[(((i + 1) % 512) + 512) % 512];
    return lerp(a, b, f * f * (3 - 2 * f));
  };
};

const N3 = noise1(47);
/** How far the cliff top is set back (world x) at a point along the cliff (world z). */
const lipAt = (u: number) => (N3(u * 0.012) - 0.5) * 22 + Math.pow(u / 140, 2) * 8;

const IceCliff: React.FC = () => {
  const geo = useMemo(() => {
    const segZ = 520;
    const segY = 48;
    const g = new PlaneGeometry(WALL_LEN, WALL_H + 3, segZ, segY);
    const n1 = noise1(11);
    const n2 = noise1(29);
    const pos = g.attributes.position;
    const cols: number[] = [];
    const deep = new Color('#2f6f9e');
    const mid = new Color('#7fc0e0');
    const pale = new Color('#d8eef8');
    const snow = new Color('#f7fbff');
    const c = new Color();
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i); // along the cliff (world z)
      const h = pos.getY(i) + (WALL_H + 3) / 2 - 3; // height above sea, top edge exactly at the plateau
      // vertical columns + big bays + a slight lean back near the top
      const cols1 = Math.pow(n1(u * 0.07), 3) * 7; // irregular big fracture buttresses (~14 m)
      const cols2 = (n2(u * 0.28) - 0.5) * 1.6; // secondary ribs
      const slump = (n2(u * 0.05 + h * 0.06) - 0.5) * 3; // blocks shift with height: no perfect prisms
      const lean = (h / WALL_H) * 2.5;
      const base = h < 2 ? (2 - h) * 1.5 : 0; // undercut at the waterline
      const notch = h > 0 && h < 3 ? (3 - h) * 1.2 : 0; // wave-cut notch
      const cornice = h > WALL_H - 1 ? -1.5 : 0; // snow overhangs the lip
      const depth = lipAt(u) + cols1 + cols2 + slump + lean + base + notch + cornice;
      // plane is built in x/y; we map: plane x -> world z, plane y -> height, displacement -> world x
      pos.setXYZ(i, depth, h, u);
      const k = clamp01(h / WALL_H);
      // recessed (pushed back) ice reads deeper blue; horizontal annual layers near the top
      const recess = clamp01((depth - lipAt(u) + 2) / 12);
      const strata = k > 0.4 ? 0.14 * Math.sin(h * 1.9 + n2(u * 0.05) * 3) : 0;
      const streak = 0.12 * (n2(u * 0.6) - 0.5) + strata - recess * 0.5;
      if (h < 0.8) c.set('#e6f3fa'); // foam / ice foot
      else if (h < 3) c.set('#1b4d75'); // dark wet notch
      else if (k > 0.93) c.copy(pale).lerp(snow, (k - 0.93) / 0.07);
      else if (k > 0.45) c.copy(mid).lerp(pale, (k - 0.45) / 0.48 + streak);
      else c.copy(deep).lerp(mid, k / 0.45 + streak);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({vertexColors: true, roughness: 0.32, metalness: 0.0, emissive: '#0b2a40', emissiveIntensity: 0.2, flatShading: true, envMapIntensity: 0.25}), []);
  return <mesh geometry={geo} material={mat} position={[WALL_X, 0, 0]} />;
};

const Plateau: React.FC = () => {
  const geo = useMemo(() => {
    const g = new PlaneGeometry(1600, WALL_LEN, 120, 120);
    const n = noise1(83);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      // plane y becomes world -z after the rotation; near edge follows the cliff lip
      pos.setX(i, x + lipAt(-y) * (1 - clamp01((x + 800) / 400)));
      pos.setZ(i, (n(x * 0.03 + y * 0.011) - 0.5) * 2.4 + (n(y * 0.05) - 0.5) * 1.2 + (n(x * 0.006 + 3) - 0.5) * 7 * clamp01((x + 790) / 60));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => {
    const t = canvasTex(256, 256, (g) => {
      g.fillStyle = '#f3f7fb';
      g.fillRect(0, 0, 256, 256);
      const r = seeded(61);
      for (let i = 0; i < 500; i++) {
        const x = r() * 256;
        const y = r() * 256;
        g.strokeStyle = `rgba(140,175,210,${0.18 + r() * 0.17})`;
        g.lineWidth = 1 + r() * 2;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 10, y - 3, x + 22 + r() * 18, y + 1);
        g.stroke();
      }
    });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(50, 50);
    return new MeshStandardMaterial({map: t, color: '#ffffff', roughness: 0.9, envMapIntensity: 0.2});
  }, []);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[WALL_X + 800, WALL_H, 0]} receiveShadow />;
};

// distant rock peaks poking through the ice sheet, for scale on the reveal
const Nunataks: React.FC = () => {
  const items = useMemo(() => {
    const r = seeded(97);
    return Array.from({length: 7}, (_, i) => {
      const h = 90 + r() * 130;
      const geo = new ConeGeometry(1, 1, 7);
      const pos = geo.attributes.position;
      const cols: number[] = [];
      const rock = new Color('#3e4854');
      const snowC = new Color('#f2f6fa');
      for (let k = 0; k < pos.count; k++) {
        const y = pos.getY(k) + 0.5;
        const c = y > 0.55 + (r() - 0.5) * 0.2 ? snowC : rock;
        cols.push(c.r, c.g, c.b);
      }
      geo.setAttribute('color', new Float32BufferAttribute(cols, 3));
      geo.computeVertexNormals();
      return {geo, h, rr: h * (0.6 + r() * 0.3), x: WALL_X + 380 + r() * 320, z: -500 + (i + r()) * (1000 / 7)};
    });
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({vertexColors: true, roughness: 0.8, flatShading: true, envMapIntensity: 0.2}), []);
  return (
    <>
      {items.map((n, i) => (
        <mesh key={i} geometry={n.geo} material={mat} position={[n.x, WALL_H - 10 + n.h / 2, n.z]} scale={[n.rr, n.h, n.rr]} />
      ))}
    </>
  );
};

const waveTex = () =>
  once('ice-waves', () => {
    const t = canvasTex(256, 256, (g) => {
      g.fillStyle = '#0b3048';
      g.fillRect(0, 0, 256, 256);
      const r = seeded(5);
      for (let i = 0; i < 900; i++) {
        const x = r() * 256;
        const y = r() * 256;
        g.strokeStyle = `rgba(${170 + r() * 60},${215 + r() * 30},255,${0.1 + r() * 0.18})`;
        g.lineWidth = 1 + r() * 1.5;
        g.beginPath();
        g.moveTo(x, y);
        g.quadraticCurveTo(x + 6, y - 2, x + 12 + r() * 10, y);
        g.stroke();
      }
    });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    return t;
  });

const Ocean: React.FC<{t: number}> = ({t}) => {
  const mat = useMemo(() => {
    const tex = waveTex().clone();
    tex.needsUpdate = true;
    tex.repeat.set(60, 60);
    return new MeshStandardMaterial({map: tex, color: '#5f97b8', roughness: 0.6, metalness: 0, envMapIntensity: 0.15});
  }, []);
  mat.map!.offset.set(t * 0.05, t * 0.02);
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[WALL_X - 700, 0, 0]} receiveShadow>
      <planeGeometry args={[1400, WALL_LEN]} />
    </mesh>
  );
};

// floating tabular bergs (flat-topped slabs that calved off the shelf) and rounded brash ice
const bergTop = new MeshStandardMaterial({color: '#f6fbff', roughness: 0.6, envMapIntensity: 0.25});
const bergSide = new MeshStandardMaterial({color: '#bfe2f2', roughness: 0.3, emissive: '#3f8fbf', emissiveIntensity: 0.18, envMapIntensity: 0.25});
const slabGeo = new BoxGeometry(1, 1, 1, 6, 2, 6);
const lumpGeo = new SphereGeometry(1, 14, 10);
const Bergs: React.FC = () => {
  const items = useMemo(() => {
    const r = seeded(19);
    const out: {big: boolean; p: [number, number, number]; s: [number, number, number]; ry: number}[] = [
      {big: true, p: [40, 1.2, -48], s: [16, 5, 11], ry: 0.3},
      {big: true, p: [58, 1.0, 16], s: [10, 3.5, 8], ry: -0.5},
      {big: true, p: [20, 0.8, 28], s: [7, 2.5, 6], ry: 1.1},
      {big: true, p: [-60, 2, -140], s: [24, 7, 16], ry: 0.8},
    ];
    for (let i = 0; i < 40; i++) {
      const sc = 1 + r() * 2;
      out.push({big: false, p: [WALL_X - 25 + r() * 21, 0, -50 + r() * 100], s: [sc, 0.2 + r() * 0.2, 1 + r() * 2], ry: r() * Math.PI});
    }
    return out;
  }, []);
  return (
    <>
      {items.map((b, i) =>
        b.big ? (
          <group key={i} position={b.p} rotation={[0, b.ry, 0]} scale={b.s}>
            <mesh geometry={slabGeo} material={bergSide} castShadow />
            <mesh geometry={slabGeo} material={bergTop} position={[0, 0.5, 0]} scale={[1.01, 0.04, 1.01]} />
          </group>
        ) : (
          <mesh key={i} geometry={lumpGeo} material={bergSide} position={b.p} scale={b.s} rotation={[0, b.ry, 0]} />
        ),
      )}
    </>
  );
};

const Sky: React.FC = () => {
  const mat = useMemo(() => {
    const t = canvasTex(4, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#1a4a96');
      gr.addColorStop(0.3, '#3c7cd0');
      gr.addColorStop(0.44, '#8dbbe8');
      gr.addColorStop(0.49, '#d4e4f2');
      gr.addColorStop(0.5, '#e9f1f7');
      gr.addColorStop(1, '#cfdde9');
      g.fillStyle = gr;
      g.fillRect(0, 0, 4, 512);
    });
    return new MeshBasicMaterial({map: t, side: BackSide, fog: false, depthWrite: false});
  }, []);
  return <mesh material={mat} geometry={useMemo(() => new SphereGeometry(900, 32, 24), [])} />;
};

// soft cloud puffs drifting near the cliff top
const Clouds: React.FC<{t: number}> = ({t}) => {
  const items = useMemo(() => {
    const r = seeded(7);
    return Array.from({length: 6}, () => ({x: WALL_X + 250 + r() * 450, y: WALL_H + 110 + r() * 80, z: -400 + r() * 800, s: 30 + r() * 35}));
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({color: '#ffffff', roughness: 0.9, envMapIntensity: 0.3}), []);
  const geo = useMemo(() => new SphereGeometry(1, 16, 12), []);
  return (
    <>
      {items.map((c, i) => (
        <group key={i} position={[c.x + t * 1.5, c.y, c.z]}>
          <mesh geometry={geo} material={mat} scale={[c.s, c.s * 0.22, c.s * 0.7]} />
          <mesh geometry={geo} material={mat} position={[c.s * 0.6, c.s * 0.1, 0]} scale={[c.s * 0.7, c.s * 0.2, c.s * 0.6]} />
        </group>
      ))}
    </>
  );
};

// ---------------------------------------------------------------- the planes
const matCache = new Map<string, MeshStandardMaterial>();
const paint = (color: string, roughness = 0.32, metalness = 0.05) => {
  const key = `${color}|${roughness}|${metalness}`;
  if (!matCache.has(key)) matCache.set(key, new MeshStandardMaterial({color, roughness, metalness}));
  return matCache.get(key)!;
};
const dark = paint('#25272d', 0.5, 0);
const chrome = paint('#d6dbe2', 0.18, 0.9);
const glass = new MeshStandardMaterial({color: '#bfe3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, side: DoubleSide});
const ghostBlade = new MeshBasicMaterial({color: '#2a2c32', transparent: true, opacity: 0.18, depthWrite: false});
const blurMat = new MeshBasicMaterial({color: '#e8eef4', transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false});

const fuselageGeo = new CapsuleGeometry(0.62, 4.2, 6, 20);
const box = new BoxGeometry(1, 1, 1);
const cowlGeo = new CylinderGeometry(0.66, 0.7, 0.7, 24);
const spinnerGeo = new ConeGeometry(0.24, 0.5, 20);
const noseConeGeo = new ConeGeometry(0.62, 1.4, 24);
const wheelGeo = new CylinderGeometry(0.28, 0.28, 0.16, 18);
const canopyGeo = new BoxGeometry(0.06, 0.42, 0.9);
const discGeo = new CylinderGeometry(1.45, 1.45, 0.02, 40);

type Wing = 'low' | 'bi' | 'high' | 'racer';
type PlaneKind = {body: string; trim: string; tips: string; wing: Wing; scarf: string; pilot: Style; pilotY?: number};

const LEAD: PlaneKind = {
  body: '#d8262f',
  trim: '#f6f4ee',
  tips: '#d8262f',
  wing: 'low',
  scarf: '#f2c230',
  pilot: {outfit: 'kit', skin: '#f1bf98', hair: '#6b4a2f', hairStyle: 'short', goggles: 'forehead', kit: {shirt: '#7b4a2b', shorts: '#4a3a2c', socks: '#3a2c22', trim: '#e9dcc4', longSleeves: true}},
};
const BIPLANE: PlaneKind = {
  body: '#f2c12e',
  trim: '#1f5fbf',
  tips: '#1f5fbf',
  wing: 'bi',
  scarf: '#e8e8e8',
  pilot: {outfit: 'kit', skin: '#c98f6b', hair: '#1f1714', hairStyle: 'bun', goggles: 'forehead', kit: {shirt: '#2d3e63', shorts: '#2d3e63', socks: '#222', trim: '#e9dcc4', longSleeves: true}},
};
const BUSH: PlaneKind = {
  body: '#2f8f5b',
  trim: '#f4efe2',
  tips: '#f08a24',
  wing: 'high',
  scarf: '#d8262f',
  pilot: {outfit: 'kit', skin: '#8d5a3c', hair: '#151110', hairStyle: 'buzz', goggles: 'forehead', kit: {shirt: '#5b6b3a', shorts: '#3d4628', socks: '#222', trim: '#e9dcc4', longSleeves: true}},
};
const RACER: PlaneKind = {
  body: '#f06a1c',
  trim: '#1c1d22',
  tips: '#1c1d22',
  wing: 'racer',
  scarf: '#3fb6e8',
  pilot: {outfit: 'kit', skin: '#f6c7a8', hair: '#f4f1ea', hairStyle: 'wild', goggles: 'forehead', kit: {shirt: '#3a3a40', shorts: '#2a2a2e', socks: '#222', trim: '#e9dcc4', longSleeves: true}},
};

// seated: thighs forward, shins level inside the fuselage, hands on the stick
const PLANE_SCALE = 0.62;
const PILOT_Y = -0.3; // straight-leg seat: pelvis sits lower in the pose, so lift him back up
const SEATED: BodySpec = {lean: -4, headTilt: -6, near: {thigh: 86, knee: 8, foot: 0}, far: {thigh: 84, knee: 6, foot: 0}, nearArm: [52, 46], farArm: [48, 50]};

const Wings: React.FC<{k: PlaneKind}> = ({k}) => {
  const trim = paint(k.trim, 0.35, 0.02);
  const tips = paint(k.tips);
  const one = (y: number, x: number, span: number, chord: number, key: string) => (
    <group key={key}>
      <mesh geometry={box} material={trim} position={[x, y, 0]} scale={[chord, 0.16, span]} castShadow />
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={box} material={tips} position={[x, y + 0.01, s * (span / 2 - 0.35)]} scale={[chord + 0.02, 0.18, 0.7]} />
      ))}
    </group>
  );
  if (k.wing === 'bi')
    return (
      <>
        {one(-0.42, 0.7, 9.4, 1.5, 'lo')}
        {one(1.55, 1.35, 9.8, 1.5, 'hi')}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh geometry={box} material={chrome} position={[1.0, 0.56, s * 3.4]} rotation={[0, 0, -0.3]} scale={[0.07, 2.0, 0.07]} />
            <mesh geometry={box} material={chrome} position={[0.4, 0.56, s * 3.4]} rotation={[0, 0, -0.3]} scale={[0.07, 2.0, 0.07]} />
          </group>
        ))}
      </>
    );
  if (k.wing === 'high')
    return (
      <>
        {one(1.55, 0.9, 11.2, 1.6, 'hi')}
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh geometry={box} material={chrome} position={[0.9, 0.55, s * 1.9]} rotation={[s * 0.75, 0, 0]} scale={[0.07, 2.5, 0.07]} />
            <mesh geometry={box} material={chrome} position={[1.5, 0.9, s * 0.45]} scale={[0.07, 1.3, 0.07]} />
          </group>
        ))}
      </>
    );
  if (k.wing === 'racer') return one(-0.42, 0.5, 7.2, 1.3, 'lo');
  return one(-0.42, 0.6, 10.4, 1.6, 'lo');
};

const Plane: React.FC<{kind: PlaneKind; frame: number; t: number; wave: number; headYaw: number; phase: number}> = ({kind, frame, t, wave, headYaw, phase}) => {
  const prop = t * 70 + phase * 3;
  const body = paint(kind.body);
  const trim = paint(kind.trim, 0.35, 0.02);
  const scarfMat = paint(kind.scarf, 0.6, 0);
  const racer = kind.wing === 'racer';
  return (
    <group>
      <group scale={PLANE_SCALE}>
        {/* fuselage along +x (nose forward) */}
        <mesh geometry={fuselageGeo} material={body} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.92]} castShadow />
        <mesh geometry={box} material={trim} position={[0.2, -0.05, 0]} scale={[4.6, 0.16, 1.17]} />
        {racer ? (
          // racer: long pointed nose instead of a round cowl, checker band behind it
          <>
            <mesh geometry={noseConeGeo} material={body} position={[3.05, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow />
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} geometry={box} material={i % 2 ? body : trim} position={[2.1, 0, 0]} rotation={[(i * Math.PI) / 3, 0, 0]} scale={[0.35, 1.28, 0.36]} />
            ))}
          </>
        ) : (
          <>
            <mesh geometry={cowlGeo} material={trim} position={[2.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
            <mesh geometry={spinnerGeo} material={body} position={[3.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
          </>
        )}
        <group position={[racer ? 3.7 : 3.08, 0, 0]} rotation={[prop, 0, 0]}>
          <mesh geometry={box} material={ghostBlade} scale={[0.04, 2.7, 0.2]} />
        </group>
        <mesh geometry={discGeo} material={blurMat} position={[racer ? 3.72 : 3.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        <Wings k={kind} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <mesh geometry={box} material={chrome} position={[1.1, -0.85, s * 0.9]} rotation={[-s * 0.3, 0, 0]} scale={[0.08, 0.75, 0.08]} />
            <mesh geometry={wheelGeo} material={dark} position={[1.1, -1.2, s * 1.0]} rotation={[Math.PI / 2, 0, 0]} />
          </group>
        ))}
        {/* tail */}
        <mesh geometry={box} material={trim} position={[-2.75, 0.15, 0]} scale={[0.9, 0.1, 3.6]} castShadow />
        <mesh geometry={box} material={body} position={[-2.8, 0.75, 0]} rotation={[0, 0, -0.35]} scale={[1.0, 1.25, 0.1]} castShadow />
        {racer ? <mesh geometry={box} material={trim} position={[-2.9, 1.05, 0]} rotation={[0, 0, -0.35]} scale={[0.5, 0.4, 0.12]} /> : null}
        <mesh geometry={canopyGeo} material={glass} position={[0.95, 0.72, 0]} rotation={[0, 0, -0.45]} />
        <mesh geometry={box} material={dark} position={[0.15, 0.6, 0]} scale={[1.5, 0.06, 0.95]} />
      </group>
      <Actor
        style={kind.pilot}
        x={0.05}
        z={0}
        yaw={0}
        y={kind.pilotY ?? PILOT_Y}
        shadow={false}
        frame={frame}
        spec={{...SEATED, nearArm: [lerp(52, 165 + Math.sin(t * 12 + phase) * 10 * wave, wave), lerp(46, 18, wave)]}}
        look={{tired: 0, droop: -6, eyesClosed: false, brows: 0.5, browLift: 0.7, mouth: 'open', mouthOpen: 0.4 + 0.45 * wave, noBlink: true, yaw: headYaw}}
      />
      {/* scarf streaming back in the wind */}
      {[0, 1].map((i) => (
        <mesh
          key={i}
          geometry={box}
          material={scarfMat}
          position={[-0.45 - i * 0.5, 0.64 + i * 0.05 + Math.sin(t * 24 + i + phase) * 0.04, 0.14 + Math.sin(t * 19 + i * 1.7 + phase) * 0.05]}
          rotation={[Math.sin(t * 21 + i * 1.3 + phase) * 0.35, Math.sin(t * 15 + i) * 0.15, 0.1]}
          scale={[0.62, 0.025, 0.15 - i * 0.03]}
        />
      ))}
    </group>
  );
};

// loose formation around the lead: offsets (m) behind/beside, own bob and bank, wave timing
type Slot = {kind: PlaneKind; off: [number, number, number]; phase: number; waveAt: number};
const FORMATION: Slot[] = [
  {kind: LEAD, off: [0, 0, 0], phase: 0, waveAt: 0.45},
  // stacked mostly in height and depth so the formation fits a tall 9:16 frame
  {kind: BIPLANE, off: [-9, 4.6, -2.5], phase: 1.7, waveAt: 0.8},
  {kind: BUSH, off: [-7, -4.2, 1.5], phase: 3.1, waveAt: 1.1},
  {kind: RACER, off: [-18, 8.8, 0.5], phase: 4.4, waveAt: 1.35},
];

// ---------------------------------------------------------------- flight path
// Already up above the ice: he has just cleared the lip, so the cliff edge and the sea are right
// behind him, and he flies on inland over the plateau with a gentle bank.
const CRUISE_Y = WALL_H + 13;
const flight = (t: number) => {
  const x = lerp(WALL_X + 22, WALL_X + 90, t / 2);
  const y = CRUISE_Y + Math.sin(t * 2.2) * 0.6;
  const z = Math.sin(t * 1.1) * 1.5;
  return {pos: v3(x, y, z), pitch: 0.05 + Math.cos(t * 2.2) * 0.02, roll: Math.sin(t * 1.6) * 7 * DEG};
};

export const IceWallFlight: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const f = flight(t);

  // camera flies ahead of the formation, off the lead's near wing, looking back at the pilots;
  // wide enough to see the whole lead plane and the wingmen, with the cliff edge and sea behind
  const k = smooth(clamp01(t / 2));
  const cam: Cam = {
    position: v3(f.pos.x + lerp(14, 15, k), f.pos.y + lerp(3.6, 3.0, k), f.pos.z + lerp(7.0, 5.6, k)),
    target: v3(f.pos.x - 6.5, f.pos.y + 1.6, f.pos.z - 1.6),
    fov: 56,
    far: 1200,
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#9cc6ea'}}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: 60, position: [0, 2, 5]}}>
        <CameraRig cam={cam} />
        <fog attach="fog" args={['#d4e4f2', 220, 1100]} />
        <Environment intensity={0.4} />
        {/* Daylight's offset y is absolute: key ~12 m above and in front of the plane so his face is lit */}
        <Daylight center={v3(f.pos.x - 7, f.pos.y, f.pos.z)} extent={16} offset={[9, f.pos.y + 12, 7]} color="#fff1dc" intensity={2.2} sky="#a9cdf2" ground="#6f9cc0" fill={0.6} />
        {/* low sun raking along the cliff face: gold rib facets, blue recesses */}
        <directionalLight position={[-80, 70, 300]} intensity={1.4} color="#ffd6a8" />
        <Sky />
        <Ocean t={t} />
        <Bergs />
        <IceCliff />
        <Plateau />
        <Nunataks />
        <Clouds t={t} />
        {FORMATION.map((slot, i) => {
          const bob = Math.sin(t * 2.3 + slot.phase) * 0.35 * (i ? 1 : 0);
          const p = v3(f.pos.x + slot.off[0], f.pos.y + slot.off[1] + bob, f.pos.z + slot.off[2]);
          const roll = f.roll + (i ? Math.sin(t * 1.9 + slot.phase) * 5 * DEG : 0);
          const wave = smooth(clamp01((t - slot.waveAt) / 0.35));
          // head turned toward the camera (negative yaw turns toward +z)
          const toCam = Math.atan2(cam.position.z - p.z, cam.position.x - p.x) / DEG;
          return (
            <group key={i} position={p} rotation={[roll, 0, f.pitch]}>
              <Plane kind={slot.kind} frame={frame} t={t} wave={wave} headYaw={Math.max(-60, Math.min(20, -toCam * 0.8))} phase={slot.phase} />
            </group>
          );
        })}
      </ThreeCanvas>
      {/* sun glare and a soft vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 85% 18%, rgba(255,240,210,.35), transparent 45%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(10,30,55,.35) 100%)'}} />
    </AbsoluteFill>
  );
};
