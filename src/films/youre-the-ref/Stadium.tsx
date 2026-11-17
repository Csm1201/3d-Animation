/**
 * Night stadium for "You're the Ref": mown pitch with full markings, goals with nets,
 * tiered stands packed with a bouncing instanced crowd, LED ad boards and four
 * floodlight pylons. Pitch is 105 x 68 m centred on the origin, long axis along x.
 * Everything is driven by `frame` and seeded randomness (deterministic).
 */
import React, {useMemo} from 'react';
import {
  AdditiveBlending,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  InstancedMesh,
  Matrix4,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RepeatWrapping,
  SphereGeometry,
  SpriteMaterial,
  Vector3,
} from 'three';
import {seeded} from '../../core/random';
import {canvasTex, once} from '../../character3d/common';

export const HALF_L = 52.5;
export const HALF_W = 34;
const GOAL_W = 7.32;
const GOAL_H = 2.44;

// ---------------------------------------------------------------- pitch texture
const PPM = 30; // canvas px per metre
const TEX_L = 120; // textured area (m), pitch plus a run-off
const TEX_W = 84;

const pitchTexture = () =>
  once('pitch', () => {
    const W = TEX_L * PPM;
    const H = TEX_W * PPM;
    return canvasTex(W, H, (g) => {
      const X = (m: number) => (m + TEX_L / 2) * PPM;
      const Y = (m: number) => (m + TEX_W / 2) * PPM;
      g.fillStyle = '#2f7d39';
      g.fillRect(0, 0, W, H);
      // mown stripes, 12 across the length
      const stripe = (HALF_L * 2) / 14;
      for (let i = -8; i < 8; i++) {
        g.fillStyle = i % 2 === 0 ? '#348a3e' : '#2c7535';
        g.fillRect(X(i * stripe), 0, stripe * PPM + 1, H);
      }
      // fine grass noise
      const r = seeded(77);
      for (let i = 0; i < 90000; i++) {
        g.fillStyle = r() < 0.5 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
        g.fillRect(r() * W, r() * H, 2 + r() * 3, 1 + r() * 2);
      }
      g.strokeStyle = 'rgba(250,252,248,0.95)';
      g.lineWidth = 0.13 * PPM;
      const rect = (x0: number, y0: number, x1: number, y1: number) => g.strokeRect(X(x0), Y(y0), (x1 - x0) * PPM, (y1 - y0) * PPM);
      rect(-HALF_L, -HALF_W, HALF_L, HALF_W);
      g.beginPath();
      g.moveTo(X(0), Y(-HALF_W));
      g.lineTo(X(0), Y(HALF_W));
      g.stroke();
      g.beginPath();
      g.arc(X(0), Y(0), 9.15 * PPM, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = 'rgba(250,252,248,0.95)';
      const spot = (x: number) => {
        g.beginPath();
        g.arc(X(x), Y(0), 0.22 * PPM, 0, Math.PI * 2);
        g.fill();
      };
      spot(0);
      for (const s of [-1, 1]) {
        const gx = s * HALF_L;
        rect(Math.min(gx, gx - s * 16.5), -20.16, Math.max(gx, gx - s * 16.5), 20.16);
        rect(Math.min(gx, gx - s * 5.5), -9.16, Math.max(gx, gx - s * 5.5), 9.16);
        spot(gx - s * 11);
        // penalty arc (outside the box only)
        const a = Math.acos(5.5 / 9.15);
        g.beginPath();
        if (s > 0) g.arc(X(gx - 11), Y(0), 9.15 * PPM, Math.PI - a, Math.PI + a);
        else g.arc(X(gx + 11), Y(0), 9.15 * PPM, -a, a);
        g.stroke();
        // corner arcs
        for (const t of [-1, 1]) {
          g.beginPath();
          g.arc(X(gx), Y(t * HALF_W), 1 * PPM, 0, Math.PI * 2);
          g.stroke();
        }
      }
    });
  });

const Pitch: React.FC = () => {
  const mat = useMemo(() => new MeshStandardMaterial({map: pitchTexture(), roughness: 0.92}), []);
  const outer = useMemo(() => new MeshStandardMaterial({color: '#2a6c32', roughness: 0.95}), []);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={outer} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[220, 160]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat} receiveShadow>
        <planeGeometry args={[TEX_L, TEX_W]} />
      </mesh>
    </group>
  );
};

// ---------------------------------------------------------------- goals
// Real stadium net: fine diamond mesh of thin cord (~12 cm cells, one cell per texture tile),
// box-shaped with a roof running back from the crossbar and a back panel sloping down to the
// grass, every panel sagging a little, held up by thin metal stanchions.
const NET_CELL = 0.12;
const netTexture = () =>
  once('net2', () => {
    const N = 128;
    const t = canvasTex(N, N, (g) => {
      g.clearRect(0, 0, N, N);
      g.lineCap = 'round';
      // soft dark edge under the cord so it reads against a bright crowd
      for (const [w, c] of [[9, 'rgba(40,44,52,0.18)'], [5, 'rgba(250,250,246,0.95)']] as const) {
        g.strokeStyle = c;
        g.lineWidth = w;
        g.beginPath();
        g.moveTo(0, 0);
        g.lineTo(N, N);
        g.moveTo(N, 0);
        g.lineTo(0, N);
        g.stroke();
      }
      // knots where the cords cross
      g.fillStyle = 'rgba(255,255,255,1)';
      for (const [kx, ky] of [[N / 2, N / 2], [0, 0], [N, 0], [0, N], [N, N]]) {
        g.beginPath();
        g.arc(kx, ky, 5, 0, Math.PI * 2);
        g.fill();
      }
    });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    return t;
  });

type P3 = [number, number, number];
/**
 * A sagging net panel between four corners (bilinear), with UVs measured in mesh cells so the
 * cord spacing is the same on every panel. `sag` pushes the middle of the panel along `dir`.
 */
const netPanel = (a: P3, b: P3, c: P3, d: P3, uLen: number, vLen: number, sag: number, dir: P3) => {
  const nu = 24;
  const nv = 12;
  const geo = new PlaneGeometry(1, 1, nu, nv);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const u = uv.getX(i);
    const v = uv.getY(i);
    const bulge = sag * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    const P = [0, 1, 2].map((k) => (1 - u) * (1 - v) * a[k] + u * (1 - v) * b[k] + u * v * c[k] + (1 - u) * v * d[k] + bulge * dir[k]);
    pos.setXYZ(i, P[0], P[1], P[2]);
    uv.setXY(i, (u * uLen) / NET_CELL, (v * vLen) / NET_CELL);
  }
  geo.computeVertexNormals();
  return geo;
};

const postGeo = new CylinderGeometry(0.06, 0.06, 1, 12);
const postMat = new MeshStandardMaterial({color: '#ffffff', roughness: 0.35, emissive: '#30343a'});
const barGeo = new CylinderGeometry(0.022, 0.022, 1, 8);
const barMat = new MeshStandardMaterial({color: '#c9ced6', roughness: 0.4, metalness: 0.6});

const Bar: React.FC<{a: P3; b: P3}> = ({a, b}) => {
  const A = new Vector3(...a);
  const B = new Vector3(...b);
  const mid = A.clone().add(B).multiplyScalar(0.5);
  const len = A.distanceTo(B);
  const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return <mesh geometry={barGeo} material={barMat} position={mid} quaternion={q} scale={[1, len, 1]} castShadow />;
};

const Goal: React.FC<{side: 1 | -1}> = ({side}) => {
  const x = side * HALF_L;
  const ROOF = 1.0; // roof runs back this far at crossbar height
  const D = 2.2; // depth at the grass
  const xr = x + side * ROOF;
  const xb = x + side * D;
  const H = GOAL_H;
  const W = GOAL_W / 2;
  const {net, panels} = useMemo(() => {
    const tex = netTexture();
    const mat = new MeshBasicMaterial({map: tex, color: '#f4f4f0', transparent: true, side: DoubleSide, depthWrite: false, alphaTest: 0.02});
    const slope = Math.hypot(D - ROOF, H);
    const out: P3 = [side, 0, 0];
    return {
      net: mat,
      panels: [
        // roof: crossbar back to the stanchion top, sagging down
        netPanel([x, H, -W], [x, H, W], [xr, H, W], [xr, H, -W], GOAL_W, ROOF, 0.09, [0, -1, 0]),
        // back: sloping from the roof down to the grass, bellying outward
        netPanel([xr, H, -W], [xr, H, W], [xb, 0, W], [xb, 0, -W], GOAL_W, slope, 0.16, out),
        // sides: trapezoids (posts -> roof -> back ground bar), billowing out a touch
        ...[-1, 1].map((s) =>
          netPanel([x, 0, s * W], [xb, 0, s * W], [xr, H, s * W], [x, H, s * W], D, H, 0.07, [0, 0, s]),
        ),
      ],
    };
  }, [side, x, xr, xb, H, W]);
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={postGeo} material={postMat} position={[x, GOAL_H / 2, (s * GOAL_W) / 2]} scale={[1, GOAL_H + 0.06, 1]} castShadow />
      ))}
      <mesh geometry={postGeo} material={postMat} position={[x, GOAL_H, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, GOAL_W + 0.12, 1]} castShadow />
      {/* stanchions: roof arms, sloping back legs, ground bar */}
      {[-1, 1].map((s) => (
        <group key={`b${s}`}>
          <Bar a={[x, H, s * (W + 0.02)]} b={[xr, H, s * (W + 0.02)]} />
          <Bar a={[xr, H, s * (W + 0.02)]} b={[xb, 0.02, s * (W + 0.02)]} />
          <Bar a={[x, 0.02, s * (W + 0.02)]} b={[xb, 0.02, s * (W + 0.02)]} />
        </group>
      ))}
      <Bar a={[xb, 0.02, -W]} b={[xb, 0.02, W]} />
      {panels.map((g, i) => (
        <mesh key={i} geometry={g} material={net} />
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- stands
type Stand = {cx: number; cz: number; len: number; rotY: number};
// Each stand is described in its own frame: rows run along local x, rise away along local +z.
const STANDS: Stand[] = [
  {cx: 0, cz: -(HALF_W + 7), len: 132, rotY: Math.PI}, // far side (behind the play)
  {cx: 0, cz: HALF_W + 7, len: 132, rotY: 0}, // near side
  {cx: HALF_L + 9, cz: 0, len: 92, rotY: Math.PI / 2},
  {cx: -(HALF_L + 9), cz: 0, len: 92, rotY: -Math.PI / 2},
];
const ROWS = 34;
const ROW_D = 0.85;
const ROW_H = 0.48;
const STAND_Y0 = 1.4;

const standMat = new MeshStandardMaterial({color: '#20263a', roughness: 0.9});
const standLip = new MeshStandardMaterial({color: '#2a3149', roughness: 0.8});
const roofMat = new MeshStandardMaterial({color: '#141826', roughness: 0.7, side: DoubleSide});

const StandShell: React.FC<{s: Stand}> = ({s}) => (
  <group position={[s.cx, 0, s.cz]} rotation={[0, s.rotY, 0]}>
    {/* front wall below the first row */}
    <mesh material={standLip} position={[0, STAND_Y0 / 2, -0.2]}>
      <boxGeometry args={[s.len, STAND_Y0, 0.4]} />
    </mesh>
    {Array.from({length: ROWS / 2}, (_, i) => {
      const k = i * 2;
      return (
        <mesh key={k} material={k % 4 === 0 ? standMat : standLip} position={[0, STAND_Y0 + (k + 1) * ROW_H - ROW_H, k * ROW_D + ROW_D]}>
          <boxGeometry args={[s.len, ROW_H * 2, ROW_D * 2]} />
        </mesh>
      );
    })}
    {/* back wall and a roof lip */}
    <mesh material={standMat} position={[0, (STAND_Y0 + ROWS * ROW_H + 6) / 2, ROWS * ROW_D + 0.5]}>
      <boxGeometry args={[s.len, STAND_Y0 + ROWS * ROW_H + 6, 1]} />
    </mesh>
    <mesh material={roofMat} position={[0, STAND_Y0 + ROWS * ROW_H + 5.5, ROWS * ROW_D - 6]} rotation={[-0.12, 0, 0]}>
      <boxGeometry args={[s.len + 2, 0.5, 15]} />
    </mesh>
  </group>
);

// ---------------------------------------------------------------- crowd (instanced)
type Fan = {pos: Vector3; rotY: number; color: Color; phase: number; amp: number; rate: number; scarf: boolean; h: number};
const SHIRTS = ['#2f6df0', '#2f6df0', '#ff7a1a', '#ff7a1a', '#f4f4f4', '#1d2b55', '#ffb066', '#7fa8ff', '#e9e3d6'];

const buildFans = (): Fan[] => {
  const r = seeded(4242);
  const fans: Fan[] = [];
  for (const s of STANDS) {
    const q = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), s.rotY);
    for (let row = 0; row < ROWS; row++) {
      const n = Math.floor(s.len / 0.62);
      for (let i = 0; i < n; i++) {
        if (r() < 0.07) continue; // empty seat
        // home end (behind the goal Orange attack) is orange-heavy, the rest mixed
        const orangeEnd = s.rotY === Math.PI / 2;
        let c = SHIRTS[Math.floor(r() * SHIRTS.length)];
        if (orangeEnd && r() < 0.5) c = '#ff7a1a';
        const local = new Vector3(-s.len / 2 + (i + 0.5) * 0.62 + (r() - 0.5) * 0.18, STAND_Y0 + row * ROW_H, row * ROW_D + ROW_D * 0.55);
        local.applyQuaternion(q);
        fans.push({
          pos: new Vector3(s.cx + local.x, local.y, s.cz + local.z),
          rotY: s.rotY + Math.PI,
          color: new Color(c).multiplyScalar(0.7 + r() * 0.3),
          phase: r() * Math.PI * 2,
          amp: r() < 0.3 ? 0.06 + r() * 0.1 : 0.012,
          rate: 0.28 + r() * 0.16,
          scarf: r() < 0.12,
          h: 0.92 + r() * 0.16,
        });
      }
    }
  }
  return fans;
};

const bodyGeo = new BoxGeometry(0.44, 0.62, 0.3);
bodyGeo.translate(0, 0.31, 0);
const headGeo = new SphereGeometry(0.13, 6, 4);
const armGeo = new BoxGeometry(0.1, 0.5, 0.1);
armGeo.translate(0, 0.25, 0);

const Crowd: React.FC<{frame: number; excite: number}> = ({frame, excite}) => {
  const fans = useMemo(buildFans, []);
  const meshes = useMemo(() => {
    const mk = (geo: BoxGeometry | SphereGeometry, n: number) => {
      const im = new InstancedMesh(geo, new MeshStandardMaterial({roughness: 0.85}), n);
      im.frustumCulled = false;
      return im;
    };
    const body = mk(bodyGeo, fans.length);
    const head = mk(headGeo, fans.length);
    const arms = mk(armGeo, fans.length * 2);
    const skins = ['#f1c3a0', '#c98f6b', '#8d5a3c', '#e8b48f', '#5c3b28'];
    const r = seeded(99);
    fans.forEach((f, i) => {
      body.setColorAt(i, f.color);
      head.setColorAt(i, new Color(skins[Math.floor(r() * skins.length)]));
      arms.setColorAt(i * 2, f.color);
      arms.setColorAt(i * 2 + 1, f.color);
    });
    return {body, head, arms};
  }, [fans]);

  // pose every fan for this frame
  const m = new Matrix4();
  const q = new Quaternion();
  const sc = new Vector3(1, 1, 1);
  const p = new Vector3();
  const up = new Vector3(0, 1, 0);
  const side = new Vector3();
  fans.forEach((f, i) => {
    const bounce = Math.max(0, Math.sin(frame * f.rate + f.phase)) * f.amp * (0.6 + excite);
    q.setFromAxisAngle(up, f.rotY + Math.sin(frame * 0.05 + f.phase) * 0.15);
    sc.set(1, f.h, 1);
    p.set(f.pos.x, f.pos.y + bounce, f.pos.z);
    m.compose(p, q, sc);
    meshes.body.setMatrixAt(i, m);
    sc.set(1, 1, 1);
    p.set(f.pos.x, f.pos.y + bounce + 0.62 * f.h + 0.13, f.pos.z);
    m.compose(p, q, sc);
    meshes.head.setMatrixAt(i, m);
    // arms: down at the sides, or up waving for the lively ones
    side.set(Math.cos(f.rotY), 0, -Math.sin(f.rotY)).multiplyScalar(0.27);
    const raised = f.amp > 0.11 || f.scarf;
    for (const s of [-1, 1]) {
      const wave = raised ? 0.35 + Math.sin(frame * f.rate * 1.3 + f.phase + s) * 0.3 : Math.PI - 0.12;
      const qa = new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), wave * s);
      const qq = q.clone().multiply(qa);
      p.set(f.pos.x + side.x * s, f.pos.y + bounce + (raised ? 0.56 : 0.6) * f.h, f.pos.z + side.z * s);
      m.compose(p, qq, sc);
      meshes.arms.setMatrixAt(i * 2 + (s > 0 ? 1 : 0), m);
    }
  });
  meshes.body.instanceMatrix.needsUpdate = true;
  meshes.head.instanceMatrix.needsUpdate = true;
  meshes.arms.instanceMatrix.needsUpdate = true;
  return (
    <>
      <primitive object={meshes.body} />
      <primitive object={meshes.head} />
      <primitive object={meshes.arms} />
    </>
  );
};

// ---------------------------------------------------------------- LED ad boards
const adTexture = () =>
  once('ads', () => {
    const t = canvasTex(2048, 64, (g) => {
      const words = ['YOU\'RE THE REF', 'ORANGE', 'BLU FC', 'COMMENT A OR B', 'VAR', '90+3'];
      for (let i = 0; i < 8; i++) {
        const blue = i % 2 === 0;
        g.fillStyle = blue ? '#1f55d6' : '#ff7417';
        g.fillRect(i * 256, 0, 256, 64);
        g.fillStyle = '#ffffff';
        g.font = '900 34px Inter, sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(words[i % words.length], i * 256 + 128, 34);
      }
    });
    t.wrapS = RepeatWrapping;
    return t;
  });

const AdBoards: React.FC<{frame: number}> = ({frame}) => {
  const mats = useMemo(
    () =>
      [6, 5].map((rep) => {
        const t = adTexture().clone();
        t.needsUpdate = true;
        t.repeat.set(rep, 1);
        return new MeshBasicMaterial({map: t, toneMapped: false});
      }),
    [],
  );
  mats.forEach((mt) => {
    mt.map!.offset.x = (frame * 0.004) % 1;
  });
  const H = 0.9;
  return (
    <group>
      {[-1, 1].map((s) => (
        <mesh key={`l${s}`} material={mats[0]} position={[0, H / 2, s * (HALF_W + 4)]} rotation={[0, s > 0 ? Math.PI : 0, 0]}>
          <planeGeometry args={[110, H]} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={`e${s}`} material={mats[1]} position={[s * (HALF_L + 4.5), H / 2, 0]} rotation={[0, s > 0 ? -Math.PI / 2 : Math.PI / 2, 0]}>
          <planeGeometry args={[70, H]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------------------------------------------------------------- floodlights
const glowTexture = () =>
  once('glow', () =>
    canvasTex(256, 256, (g) => {
      const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, 'rgba(255,255,255,1)');
      r.addColorStop(0.12, 'rgba(255,250,235,0.85)');
      r.addColorStop(0.4, 'rgba(220,230,255,0.22)');
      r.addColorStop(1, 'rgba(200,215,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
    }),
  );
const lampTexture = () =>
  once('lamps', () =>
    canvasTex(256, 128, (g) => {
      g.fillStyle = '#20232c';
      g.fillRect(0, 0, 256, 128);
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < 8; c++) {
          g.fillStyle = '#fffbe8';
          g.fillRect(8 + c * 31, 8 + r * 30, 24, 22);
        }
    }),
  );

export const PYLONS: [number, number][] = [
  [HALF_L + 14, HALF_W + 16],
  [HALF_L + 14, -(HALF_W + 16)],
  [-(HALF_L + 14), HALF_W + 16],
  [-(HALF_L + 14), -(HALF_W + 16)],
];
const PYLON_H = 42;
const mastGeo = new CylinderGeometry(0.5, 0.9, PYLON_H, 10);
const mastMat = new MeshStandardMaterial({color: '#3a3f4f', roughness: 0.6, metalness: 0.3});

const Floodlights: React.FC = () => {
  const lampMat = useMemo(() => new MeshBasicMaterial({map: lampTexture(), toneMapped: false}), []);
  const glow = useMemo(() => new SpriteMaterial({map: glowTexture(), blending: AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.95, toneMapped: false}), []);
  return (
    <group>
      {PYLONS.map(([x, z], i) => {
        const yaw = Math.atan2(-x, -z);
        return (
          <group key={i} position={[x, 0, z]}>
            <mesh geometry={mastGeo} material={mastMat} position={[0, PYLON_H / 2, 0]} />
            <group position={[0, PYLON_H + 3, 0]} rotation={[0, yaw, 0]}>
              <mesh material={lampMat} rotation={[0.35, 0, 0]}>
                <planeGeometry args={[11, 6]} />
              </mesh>
            </group>
            <sprite material={glow} position={[0, PYLON_H + 3, 0]} scale={[30, 30, 1]} />
          </group>
        );
      })}
    </group>
  );
};

// ---------------------------------------------------------------- sky
const skyMat = new MeshBasicMaterial({
  map: canvasTex(16, 256, (g) => {
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, '#060814');
    gr.addColorStop(0.55, '#121a36');
    gr.addColorStop(1, '#27365e');
    g.fillStyle = gr;
    g.fillRect(0, 0, 16, 256);
  }),
  side: 1,
  depthWrite: false,
  fog: false,
  toneMapped: false,
});

export const Stadium: React.FC<{frame: number; excite?: number}> = ({frame, excite = 0.4}) => (
  <group>
    <mesh material={skyMat} renderOrder={-1}>
      <sphereGeometry args={[150, 24, 16]} />
    </mesh>
    <Pitch />
    <Goal side={1} />
    <Goal side={-1} />
    {STANDS.map((s, i) => (
      <StandShell key={i} s={s} />
    ))}
    <Crowd frame={frame} excite={excite} />
    <AdBoards frame={frame} />
    <Floodlights />
  </group>
);
