/**
 * Shared 3D helpers: units, the tracking camera, materials and procedural textures.
 *
 * The walk cycle (src/walkCycle.ts) works in a 2D side plane measured in "px"
 * (x forward, y down, floor at FLOOR_Y). Here that plane becomes the 3D plane
 * z = 0 with x forward, y up, metres. The same numbers drive both, so the feet
 * stay pinned exactly as verified by scripts/check-walk.ts.
 */
import {
  CanvasTexture,
  Color,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from 'three';
import {DURATION_IN_FRAMES, FLOOR_Y} from '../core/constants';
import {seeded} from '../core/random';
import {getPose, hipX, Vec, WALK} from '../core/walkCycle';

export const PX = 500; // walk-cycle px per metre (worker ~1.8 m tall)
export const DEG = Math.PI / 180;
export const m = (px: number) => px / PX;
export const to3 = (p: Vec, z = 0) => new Vector3(p.x / PX, (FLOOR_Y - p.y) / PX, z);

// ---------------------------------------------------------------- camera
const smooth = (t: number) => t * t * (3 - 2 * t);

/**
 * Close, slightly low, 3/4 front camera that tracks the worker.
 * It locks to the constant hip speed (no jitter), follows only a fraction of the
 * hip bob, and slowly orbits a few degrees over the shot for a gentle 3D reveal.
 */
export const cameraAt = (frame: number) => {
  const pose = getPose(frame);
  const t = smooth(frame / (DURATION_IN_FRAMES - 1));
  const target = new Vector3(hipX(frame) / PX + 0.1, 0.92 + ((WALK.HIP_Y - pose.pelvis.y) / PX) * 0.2, 0);
  const yaw = (50 - 10 * t) * DEG; // angle from straight-on side view toward the front
  const R = 3.05;
  const position = new Vector3(target.x + Math.sin(yaw) * R, 0.5, target.z + Math.cos(yaw) * R);
  return {position, target, fov: 38};
};

// ---------------------------------------------------------------- palette
export const PAL = {
  peach: '#f7c3a6',
  peachLight: '#fbdccb',
  peachDeep: '#ee9f7e',
  mint: '#a9e3c9',
  mintDeep: '#6fcaa3',
  mintLight: '#d6f3e6',
  cream: '#fff6ee',
  coral: '#ff7f6e',
  sky: '#9fd3f2',
  lilac: '#c9c3ef',
  butter: '#ffe08a',
  ink: '#3b3f52',
};

/** Glossy toy plastic: clearcoat over a soft base. */
export const plastic = (color: string, roughness = 0.32) =>
  new MeshPhysicalMaterial({color: new Color(color), roughness, clearcoat: 1, clearcoatRoughness: 0.12, metalness: 0});

/** Matte modelling clay: soft, slightly sheeny. */
export const clay = (color: string, roughness = 0.78) =>
  new MeshPhysicalMaterial({color: new Color(color), roughness, sheen: 0.35, sheenRoughness: 0.8, sheenColor: new Color('#ffffff')});

export const matte = (color: string, roughness = 0.9) => new MeshStandardMaterial({color: new Color(color), roughness});

// ---------------------------------------------------------------- textures
export const canvasTex = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d')!);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const cache = new Map<string, CanvasTexture>();
export const once = (key: string, make: () => CanvasTexture) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
};

/** Radial soft blob, used for contact shadows (black with alpha falloff). */
export const blobTexture = () =>
  once('blob', () =>
    canvasTex(256, 256, (g) => {
      const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      r.addColorStop(0, 'rgba(60,40,40,1)');
      r.addColorStop(0.45, 'rgba(60,40,40,0.55)');
      r.addColorStop(1, 'rgba(60,40,40,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 256, 256);
    }),
  );

export const floorTexture = () =>
  once('floor', () => {
    const t = canvasTex(512, 512, (g) => {
      g.fillStyle = PAL.peachLight;
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = '#f8d4c0';
      g.fillRect(0, 0, 256, 256);
      g.fillRect(256, 256, 256, 256);
      g.strokeStyle = '#efc2aa';
      g.lineWidth = 6;
      g.strokeRect(0, 0, 512, 512);
      g.beginPath();
      g.moveTo(256, 0);
      g.lineTo(256, 512);
      g.moveTo(0, 256);
      g.lineTo(512, 256);
      g.stroke();
    });
    t.wrapS = RepeatWrapping;
    t.wrapT = RepeatWrapping;
    t.repeat.set(15, 6);
    return t;
  });

export const paperTexture = () =>
  once('paper', () =>
    canvasTex(512, 360, (g) => {
      g.fillStyle = '#fffdf9';
      g.fillRect(0, 0, 512, 360);
      g.fillStyle = PAL.coral;
      g.fillRect(40, 36, 180, 22);
      g.fillStyle = '#b9c2cf';
      for (let i = 0; i < 9; i++) g.fillRect(40, 84 + i * 28, i === 8 ? 200 : 420 - (i % 3) * 40, 10);
      g.fillStyle = PAL.mintDeep;
      g.fillRect(330, 34, 140, 28);
    }),
  );

export const skyTexture = () =>
  once('sky', () =>
    canvasTex(512, 512, (g) => {
      const gr = g.createLinearGradient(0, 0, 0, 512);
      gr.addColorStop(0, '#8fd0f5');
      gr.addColorStop(1, '#e6f7ff');
      g.fillStyle = gr;
      g.fillRect(0, 0, 512, 512);
      g.fillStyle = 'rgba(255,255,255,0.95)';
      for (const [x, y, s] of [
        [120, 150, 1],
        [360, 250, 0.8],
        [250, 90, 0.6],
      ]) {
        for (const [dx, dy, r] of [
          [0, 0, 40],
          [40, 8, 34],
          [-38, 10, 30],
          [12, -22, 30],
        ]) {
          g.beginPath();
          g.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
          g.fill();
        }
      }
      // soft pastel city at the bottom
      const rnd = seeded(77);
      for (let i = 0; i < 12; i++) {
        const w = 30 + rnd() * 40;
        const h = 60 + rnd() * 140;
        g.fillStyle = ['#c6e8f7', '#d8d2f3', '#bfe8d8'][i % 3];
        g.fillRect(i * 45 - 10, 512 - h, w, h);
      }
    }),
  );

export const screenTexture = (kind: number) =>
  once(`screen${kind}`, () =>
    canvasTex(512, 320, (g) => {
      const rnd = seeded(91 + kind);
      if (kind % 2 === 0) {
        g.fillStyle = '#2d3350';
        g.fillRect(0, 0, 512, 320);
        const cols = [PAL.mint, PAL.butter, PAL.peach, PAL.lilac];
        for (let i = 0; i < 12; i++) {
          g.fillStyle = cols[Math.floor(rnd() * 4)];
          const ind = Math.floor(rnd() * 3) * 26;
          g.beginPath();
          g.roundRect(30 + ind, 26 + i * 23, 60 + rnd() * 260, 11, 6);
          g.fill();
        }
      } else {
        g.fillStyle = '#f7fbff';
        g.fillRect(0, 0, 512, 320);
        g.fillStyle = '#dfe9f5';
        g.fillRect(0, 0, 512, 40);
        const hs = [80, 130, 110, 170, 150, 210];
        hs.forEach((h, i) => {
          g.fillStyle = i % 2 ? PAL.mintDeep : PAL.peachDeep;
          g.beginPath();
          g.roundRect(50 + i * 72, 290 - h, 46, h, 8);
          g.fill();
        });
      }
    }),
  );

export const boardTexture = () =>
  once('board', () =>
    canvasTex(1024, 640, (g) => {
      g.fillStyle = '#fdfdfb';
      g.fillRect(0, 0, 1024, 640);
      g.fillStyle = '#5a6fb5';
      g.font = 'bold 76px sans-serif';
      g.fillText('Q3 GROWTH', 60, 110);
      g.strokeStyle = PAL.ink;
      g.lineWidth = 8;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(80, 170);
      g.lineTo(80, 580);
      g.lineTo(960, 580);
      g.stroke();
      g.fillStyle = PAL.butter;
      g.beginPath();
      g.roundRect(800, 40, 160, 140, 10);
      g.fill();
      g.fillStyle = '#c9a64a';
      for (let i = 0; i < 3; i++) g.fillRect(825, 80 + i * 30, 110, 8);
    }),
  );

export const clockTexture = () =>
  once('clock', () =>
    canvasTex(512, 512, (g) => {
      g.fillStyle = '#fffaf4';
      g.beginPath();
      g.arc(256, 256, 256, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = PAL.ink;
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        const r1 = i % 3 === 0 ? 180 : 200;
        g.save();
        g.translate(256 + Math.sin(a) * ((r1 + 226) / 2), 256 - Math.cos(a) * ((r1 + 226) / 2));
        g.rotate(a);
        g.beginPath();
        g.roundRect(-8, -(226 - r1) / 2, 16, 226 - r1, 8);
        g.fill();
        g.restore();
      }
    }),
  );
