/**
 * Ice wall flight test (2 s, 30 fps, 1080x1920).
 * A pilot in a little red bush plane skims the Southern Ocean, pulls up hard and crests
 * the edge of a towering Antarctic ice cliff, revealing the white plateau beyond.
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

const IceCliff: React.FC = () => {
  const geo = useMemo(() => {
    const segZ = 520;
    const segY = 36;
    const g = new PlaneGeometry(WALL_LEN, WALL_H + 3, segZ, segY);
    const n1 = noise1(11);
    const n2 = noise1(29);
    const n3 = noise1(47);
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
      const cols1 = Math.pow(n1(u * 0.35), 2.2) * 4.5; // sharp ribs
      const cols2 = (n2(u * 1.3) - 0.5) * 1.1;
      const bays = (n3(u * 0.012) - 0.5) * 22;
      const lean = (h / WALL_H) * 2.5;
      const base = h < 2 ? (2 - h) * 1.5 : 0; // undercut at the waterline
      const depth = bays + cols1 + cols2 + lean + base;
      // plane is built in x/y; we map: plane x -> world z, plane y -> height, displacement -> world x
      pos.setXYZ(i, depth, h, u);
      const k = clamp01(h / WALL_H);
      // recessed (pushed back) ice reads deeper blue; horizontal annual layers near the top
      const recess = clamp01((depth + 6) / 26);
      const strata = k > 0.55 ? 0.08 * Math.sin(h * 2.6 + n2(u * 0.2) * 3) : 0;
      const streak = 0.12 * (n2(u * 2.1) - 0.5) + strata - recess * 0.35;
      if (k > 0.93) c.copy(pale).lerp(snow, (k - 0.93) / 0.07);
      else if (k > 0.45) c.copy(mid).lerp(pale, (k - 0.45) / 0.48 + streak);
      else c.copy(deep).lerp(mid, k / 0.45 + streak);
      cols.push(c.r, c.g, c.b);
    }
    g.setAttribute('color', new Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({vertexColors: true, roughness: 0.32, metalness: 0.0, emissive: '#0b2a40', emissiveIntensity: 0.2, flatShading: true}), []);
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
      pos.setZ(i, (n(x * 0.03 + y * 0.011) - 0.5) * 2.4 + (n(y * 0.05) - 0.5) * 1.2);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({color: '#f4f8fc', roughness: 0.85}), []);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[WALL_X + 800 + 2, WALL_H, 0]} receiveShadow />;
};

const waveTex = () =>
  once('ice-waves', () => {
    const t = canvasTex(256, 256, (g) => {
      g.fillStyle = '#0f3554';
      g.fillRect(0, 0, 256, 256);
      const r = seeded(5);
      for (let i = 0; i < 900; i++) {
        const x = r() * 256;
        const y = r() * 256;
        g.strokeStyle = `rgba(${150 + r() * 80},${200 + r() * 40},255,${0.08 + r() * 0.16})`;
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
    return new MeshStandardMaterial({map: tex, color: '#7fb0cc', roughness: 0.35, metalness: 0.1});
  }, []);
  mat.map!.offset.set(t * 0.05, t * 0.02);
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[WALL_X - 700, 0, 0]} receiveShadow>
      <planeGeometry args={[1400, WALL_LEN]} />
    </mesh>
  );
};

// floating tabular bergs (flat-topped slabs that calved off the shelf) and rounded brash ice
const bergTop = new MeshStandardMaterial({color: '#f6fbff', roughness: 0.6});
const bergSide = new MeshStandardMaterial({color: '#bfe2f2', roughness: 0.3, emissive: '#3f8fbf', emissiveIntensity: 0.18});
const slabGeo = new BoxGeometry(1, 1, 1, 6, 2, 6);
const lumpGeo = new SphereGeometry(1, 14, 10);
const Bergs: React.FC = () => {
  const items = useMemo(() => {
    const r = seeded(19);
    const out: {big: boolean; p: [number, number, number]; s: [number, number, number]; ry: number}[] = [];
    for (let i = 0; i < 30; i++) {
      const big = i < 7;
      // keep them off the flight line (z ~ 0) near the camera start
      let z = -260 + r() * 520;
      if (Math.abs(z) < 30) z += z < 0 ? -30 : 30;
      const sz = big ? 10 + r() * 16 : 1 + r() * 2.5;
      out.push({
        big,
        p: [WALL_X - 8 - r() * (big ? 220 : 120), big ? sz * 0.12 : 0, z],
        s: big ? [sz * (1.2 + r()), sz * (0.28 + r() * 0.15), sz * (0.8 + r())] : [sz * 1.3, sz * 0.35, sz],
        ry: r() * Math.PI,
      });
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
      gr.addColorStop(0, '#2c5fa8');
      gr.addColorStop(0.42, '#7fb2e6');
      gr.addColorStop(0.5, '#e6eef6');
      gr.addColorStop(0.53, '#f6e2c8');
      gr.addColorStop(1, '#dfe9f2');
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
    return Array.from({length: 10}, () => ({x: WALL_X + 120 + r() * 500, y: WALL_H + 60 + r() * 70, z: -400 + r() * 800, s: 25 + r() * 35}));
  }, []);
  const mat = useMemo(() => new MeshStandardMaterial({color: '#ffffff', roughness: 1, transparent: true, opacity: 0.75, depthWrite: false}), []);
  const geo = useMemo(() => new SphereGeometry(1, 16, 12), []);
  return (
    <>
      {items.map((c, i) => (
        <group key={i} position={[c.x + t * 1.5, c.y, c.z]}>
          <mesh geometry={geo} material={mat} scale={[c.s, c.s * 0.35, c.s * 0.7]} />
          <mesh geometry={geo} material={mat} position={[c.s * 0.6, c.s * 0.1, 0]} scale={[c.s * 0.7, c.s * 0.3, c.s * 0.6]} />
        </group>
      ))}
    </>
  );
};

// ---------------------------------------------------------------- the plane
const red = new MeshStandardMaterial({color: '#d8262f', roughness: 0.32, metalness: 0.05});
const white = new MeshStandardMaterial({color: '#f6f4ee', roughness: 0.35});
const dark = new MeshStandardMaterial({color: '#25272d', roughness: 0.5});
const chrome = new MeshStandardMaterial({color: '#d6dbe2', roughness: 0.18, metalness: 0.9});
const glass = new MeshStandardMaterial({color: '#bfe3ff', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.35, side: DoubleSide});
const blurMat = new MeshBasicMaterial({color: '#e8eef4', transparent: true, opacity: 0.22, side: DoubleSide, depthWrite: false});
const scarfMat = new MeshStandardMaterial({color: '#f2c230', roughness: 0.6, side: DoubleSide});

const fuselageGeo = new CapsuleGeometry(0.62, 4.2, 6, 20);
const box = new BoxGeometry(1, 1, 1);
const cowlGeo = new CylinderGeometry(0.66, 0.7, 0.7, 24);
const spinnerGeo = new ConeGeometry(0.24, 0.5, 20);
const wheelGeo = new CylinderGeometry(0.28, 0.28, 0.16, 18);
const canopyGeo = new BoxGeometry(0.06, 0.42, 0.9);
const discGeo = new CylinderGeometry(1.45, 1.45, 0.02, 40);

const PILOT: Style = {
  outfit: 'kit',
  skin: '#f1bf98',
  hair: '#6b4a2f',
  hairStyle: 'short',
  goggles: 'forehead',
  kit: {shirt: '#7b4a2b', shorts: '#4a3a2c', socks: '#3a2c22', trim: '#e9dcc4', longSleeves: true},
};
// seated: thighs forward, shins down, hands on the stick
const PLANE_SCALE = 0.62;
const PILOT_Y = -0.62;
const SEATED: BodySpec = {lean: -4, headTilt: -6, near: {thigh: 88, knee: 92, foot: 0}, far: {thigh: 84, knee: 88, foot: 0}, nearArm: [52, 46], farArm: [48, 50]};

const Plane: React.FC<{frame: number; t: number; whoop: number}> = ({frame, t, whoop}) => {
  const prop = t * 70; // radians
  const scarf = Array.from({length: 7}, (_, i) => i);
  return (
    <group>
      <group scale={PLANE_SCALE}>
      {/* fuselage along +x (nose forward) */}
      <mesh geometry={fuselageGeo} material={red} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.92]} castShadow />
      {/* white cheat line */}
      <mesh geometry={box} material={white} position={[0.2, -0.05, 0]} scale={[4.6, 0.16, 1.17]} />
      <mesh geometry={cowlGeo} material={white} position={[2.65, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow />
      <mesh geometry={spinnerGeo} material={red} position={[3.25, 0, 0]} rotation={[0, 0, -Math.PI / 2]} />
      {/* propeller: two blades + a motion-blur disc */}
      <group position={[3.08, 0, 0]} rotation={[prop, 0, 0]}>
        <mesh geometry={box} material={dark} scale={[0.07, 2.7, 0.2]} />
      </group>
      <mesh geometry={discGeo} material={blurMat} position={[3.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
      {/* low wing with red tips, and fixed landing gear */}
      <mesh geometry={box} material={white} position={[0.6, -0.42, 0]} scale={[1.6, 0.16, 10.4]} castShadow />
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh geometry={box} material={red} position={[0.6, -0.41, s * 4.9]} scale={[1.62, 0.18, 0.7]} />
          <mesh geometry={box} material={chrome} position={[1.1, -0.85, s * 0.9]} rotation={[-s * 0.3, 0, 0]} scale={[0.08, 0.75, 0.08]} />
          <mesh geometry={wheelGeo} material={dark} position={[1.1, -1.2, s * 1.0]} rotation={[Math.PI / 2, 0, 0]} />
        </group>
      ))}
      {/* tail */}
      <mesh geometry={box} material={white} position={[-2.75, 0.15, 0]} scale={[0.9, 0.1, 3.6]} castShadow />
      <mesh geometry={box} material={red} position={[-2.8, 0.75, 0]} rotation={[0, 0, -0.35]} scale={[1.0, 1.25, 0.1]} castShadow />
      {/* windscreen / canopy */}
      <mesh geometry={canopyGeo} material={glass} position={[0.95, 0.72, 0]} rotation={[0, 0, -0.45]} />
      {/* cockpit rim */}
      <mesh geometry={box} material={dark} position={[0.15, 0.6, 0]} scale={[1.5, 0.06, 0.95]} />
      </group>
      {/* pilot: sitting in the open cockpit, waving at the camera as he pulls up */}
      <Actor
        style={PILOT}
        x={0.05}
        z={0}
        yaw={0}
        y={PILOT_Y}
        shadow={false}
        frame={frame}
        spec={{...SEATED, nearArm: [lerp(52, 165, whoop), lerp(46, 18, whoop)]}}
        look={{tired: 0, droop: -6, eyesClosed: false, brows: 0.5, browLift: 0.7, mouth: 'open', mouthOpen: 0.45 + 0.4 * whoop, noBlink: true, yaw: lerp(25, 70, whoop)}}
      />
      {/* scarf streaming back in the wind */}
      {scarf.map((i) => (
        <mesh
          key={i}
          geometry={box}
          material={scarfMat}
          position={[-0.12 - i * 0.17, 0.62 + 0.025 * i + Math.sin(t * 22 - i * 0.8) * 0.035 * i, 0.12 + Math.sin(t * 17 - i * 0.9) * 0.04 * i]}
          rotation={[Math.sin(t * 20 - i * 0.8) * 0.35, 0, 0.12]}
          scale={[0.24, 0.025, 0.15]}
        />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- flight path
// 0-0.9 s skimming the sea toward the cliff, then a hard pull-up that crests the lip at ~1.8 s.
const flight = (t: number) => {
  const x = lerp(-10, WALL_X + 12, t / 2);
  const climb = smooth(clamp01((t - 0.55) / 1.25));
  const y = lerp(14, WALL_H + 9, climb);
  const z = Math.sin(t * 1.4) * 2.5;
  const vy = (WALL_H + 9 - 14) * (clamp01((t - 0.55) / 1.25) > 0 && t < 1.8 ? 6 * ((t - 0.55) / 1.25) * (1 - (t - 0.55) / 1.25) / 1.25 : 0);
  const pitch = Math.atan2(vy, 50); // nose up while climbing
  return {pos: v3(x, y, z), pitch, roll: -Math.cos(t * 1.4) * 9 * DEG};
};

export const IceWallFlight: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const f = flight(t);
  const whoop = smooth(clamp01((t - 1.25) / 0.35));

  // chase camera: behind, right and a little above; drifts wider as he crests so the plateau opens up
  const k = smooth(clamp01((t - 0.9) / 1.1));
  const cam: Cam = {
    position: v3(f.pos.x - lerp(9.5, 8, k), f.pos.y + lerp(2.2, 3.4, k), f.pos.z + lerp(6.2, 7.5, k)),
    target: v3(f.pos.x + lerp(6, 4, k), f.pos.y + lerp(3.2, 0.6, k), f.pos.z - lerp(1, 0.5, k)),
    fov: lerp(62, 58, k),
    far: 1200,
  };

  return (
    <AbsoluteFill style={{backgroundColor: '#9cc6ea'}}>
      <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: 60, position: [0, 2, 5]}}>
        <CameraRig cam={cam} />
        <fog attach="fog" args={['#dde9f3', 160, 900]} />
        <Environment intensity={0.4} />
        <Daylight center={f.pos} extent={9} offset={[-12, 30, 18]} color="#fff3e2" intensity={2.6} sky="#cfe3f7" ground="#8fb7d4" fill={0.9} />
        <directionalLight position={[200, 60, -150]} intensity={0.6} color="#ffd9b0" />
        <Sky />
        <Ocean t={t} />
        <Bergs />
        <IceCliff />
        <Plateau />
        <Clouds t={t} />
        <group position={f.pos} rotation={[f.roll, 0, f.pitch]}>
          <Plane frame={frame} t={t} whoop={whoop} />
        </group>
      </ThreeCanvas>
      {/* sun glare and a soft vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 85% 18%, rgba(255,240,210,.35), transparent 45%)'}} />
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(10,30,55,.35) 100%)'}} />
    </AbsoluteFill>
  );
};
