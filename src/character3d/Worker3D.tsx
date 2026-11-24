/**
 * Toy-like 3D character. Every joint position comes from a Pose in the shared 2D side plane
 * (the walk cycle, or a standing pose from core/poses), mapped into 3D, so hips, knees, feet,
 * shoulders and elbows all move from one source and planted feet stay pinned to the floor.
 *
 * Outfits: 'office' (shirt, tie, trousers), 'scientist' (lab coat, wild white hair, goggles),
 * 'subject' (test-subject jumpsuit with a number patch).
 */
import React from 'react';
import {
  BoxGeometry,
  CapsuleGeometry,
  CylinderGeometry,
  DoubleSide,
  Material,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  Vector3,
} from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {seededArray} from '../core/random';
import {LegPose, Pose} from '../core/walkCycle';
import {canvasTex, clay, DEG, m, PAL, plastic, to3} from './common';
import {ARM_Z, forearmRot, PaperStack3D} from './Paper3D';

// ---------------------------------------------------------------- style + materials
export type Outfit = 'office' | 'scientist' | 'subject' | 'kit';
/** Football kit colours (outfit 'kit'). */
export type Kit = {shirt: string; shorts: string; socks: string; number?: number; numColor?: string; trim?: string; gloves?: string; longSleeves?: boolean; /** streaker: no shirt (shirt = skin colour), briefs instead of shorts, bare feet */ bare?: boolean; /** big round belly and thick legs */ fat?: boolean; /** full-length trousers and shoes instead of shorts, socks and boots */ trousers?: boolean; /** quarter-zip jumper: tall zip collar, short zip, small chest monogram (these letters) */ quarterZip?: string; /** basketball vest: no sleeves */ sleeveless?: boolean; /** wordmark across the chest (number centred under it) */ chestText?: string; /** long sleeves in a different colour from the shirt */ sleeve?: string; /** printed shirt pattern over the shirt colour */ pattern?: 'floral'};
export type HairStyle = 'short' | 'wild' | 'bun' | 'buzz' | 'swept' | 'crop';
export type Style = {
  outfit: Outfit;
  skin: string;
  hair: string;
  hairStyle: HairStyle;
  /** Subject number on the jumpsuit patch (subject outfit only). */
  patch?: number;
  kit?: Kit;
  /** Goggles (scientist by default; any outfit when set): worn over the eyes, or pushed up on the forehead. */
  goggles?: 'eyes' | 'forehead';
  /** Goggle frame/strap colour, and a glowing lens colour (lit up, e.g. red eyes). */
  goggleFrame?: string;
  goggleGlow?: string;
  /** Pull the near hand in toward the body's centre line (world z of the wrist), e.g. a hand on the backside. */
  nearHandZ?: number;
  /** Eyebrow colour when it differs from the hair (e.g. dark brows under grey hair). */
  brow?: string;
  /** Full short beard and moustache, in the hair colour. */
  beard?: boolean;
  /** A hat on top of the head. */
  hat?: {kind: 'fedora' | 'hardhat' | 'cap' | 'turban' | 'bandana'; color: string; band: string};
  /** Dark sunglasses. */
  shades?: boolean;
  /** A chunky chain necklace in this colour. */
  chain?: string;
  /** Realistic proportions: a smaller head (about adult size relative to the body), no cartoon blush, less waxy skin. */
  realistic?: boolean;
  /** Low-poly look: faceted, flat-shaded body (few segments per limb). */
  lowPoly?: boolean;
};
export const OFFICE_STYLE: Style = {outfit: 'office', skin: '#f2b996', hair: '#5a3a2c', hairStyle: 'short'};
export const SCIENTIST_STYLE: Style = {outfit: 'scientist', skin: '#f0b892', hair: '#f4f1ea', hairStyle: 'wild', goggles: 'eyes'};

const shade = (hex: string, k: number) => {
  const n = parseInt(hex.slice(1), 16);
  const c = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  return `#${[c(n >> 16), c((n >> 8) & 255), c(n & 255)].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};

const monoTex = (text: string) =>
  canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = '#f4f2ec';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'italic 700 150px Georgia, "Times New Roman", serif';
    g.fillText(text, 128, 132);
  });

const numberTex = (n: number, color: string) =>
  canvasTex(256, 256, (g) => {
    g.clearRect(0, 0, 256, 256);
    g.fillStyle = color;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '900 200px "Inter Display", Inter, sans-serif';
    g.fillText(String(n), 128, 140);
  });

const chestTex = (text: string, color: string, outline: string) =>
  canvasTex(512, 256, (g) => {
    g.clearRect(0, 0, 512, 256);
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = 'italic 900 128px "Inter Display", Inter, sans-serif';
    g.lineWidth = 14;
    g.strokeStyle = outline;
    g.lineJoin = 'round';
    g.strokeText(text, 256, 136, 480);
    g.fillStyle = color;
    g.fillText(text, 256, 136, 480);
  });

/** Printed fabric: small flowers scattered over the base colour. */
const patternTex = (kind: 'floral', base: string) => {
  const t = canvasTex(256, 256, (g) => {
    g.fillStyle = base;
    g.fillRect(0, 0, 256, 256);
    const cols = ['#ffffff', '#ff8fb1', '#ffd23a', '#e5462b', '#9fd8ff'];
    for (let i = 0; i < 46; i++) {
      const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
      const y = (Math.sin(i * 78.233) * 12345.678) % 1;
      const cx = Math.abs(x) * 256;
      const cy = Math.abs(y) * 256;
      const r = 7 + (i % 3) * 3;
      g.fillStyle = cols[i % cols.length];
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2 + i;
        g.beginPath();
        g.arc(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.5, 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = '#ffd23a';
      g.beginPath();
      g.arc(cx, cy, r * 0.3, 0, Math.PI * 2);
      g.fill();
    }
  });
  t.wrapS = t.wrapT = RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
};
const buildMats = (st: Style) => {
  const kit = st.outfit === 'kit' ? st.kit : undefined;
  const top = kit ? kit.shirt : st.outfit === 'subject' ? '#a8c2ba' : '#f3f6fb';
  const bottom = kit ? kit.shorts : st.outfit === 'subject' ? '#9ab6ad' : st.outfit === 'scientist' ? '#4a4e58' : '#55648a';
  const num = kit?.number !== undefined ? numberTex(kit.number, kit.numColor ?? '#ffffff') : null;
  const coat = new MeshPhysicalMaterial({color: '#f5f4ef', roughness: 0.7, sheen: 0.35, sheenRoughness: 0.8, side: DoubleSide});
  return {
    skin: st.realistic ? new MeshStandardMaterial({color: st.skin, roughness: 0.7}) : clay(st.skin, 0.62),
    skinShade: clay(shade(st.skin, 0.9), 0.65),
    cheek: clay('#ff9c8f', 0.7),
    hair: clay(st.hair, 0.72),
    brow: clay(st.brow ?? st.hair, 0.72),
    shirt: kit?.pattern ? new MeshStandardMaterial({map: patternTex(kit.pattern, top), roughness: 0.75}) : clay(top, 0.72),
    shirtFar: kit?.pattern ? new MeshStandardMaterial({map: patternTex(kit.pattern, shade(top, 0.92)), roughness: 0.78}) : clay(shade(top, 0.92), 0.75),
    cuff: clay('#ffffff', 0.6),
    sleeve: clay(kit?.sleeve ?? top, 0.72),
    sleeveFar: clay(shade(kit?.sleeve ?? top, 0.92), 0.75),
    coat,
    coatFar: clay('#e2e1db', 0.75),
    trousers: clay(bottom, 0.74),
    trousersFar: clay(shade(bottom, 0.86), 0.78),
    tie: plastic(PAL.coral, 0.28),
    tieDark: plastic('#e8604f', 0.3),
    belt: plastic('#4a3830', 0.3),
    buckle: plastic('#ffd27a', 0.2),
    shoe: plastic(st.outfit === 'subject' ? '#d9dcd6' : st.outfit === 'scientist' ? '#26262b' : '#4b3229', 0.22),
    sole: plastic('#2f211c', 0.4),
    eye: plastic('#23202a', 0.08),
    white: plastic('#ffffff', 0.1),
    mouth: plastic('#b8524a', 0.3),
    bag: clay('#9c7b92', 0.8),
    goggleBand: plastic(st.goggleFrame ?? '#3b3532', 0.4),
    goggleRim: plastic(st.goggleFrame ?? '#c9a34a', 0.25),
    lens: st.goggleGlow
      ? new MeshStandardMaterial({color: st.goggleGlow, emissive: st.goggleGlow, emissiveIntensity: 2.2, roughness: 0.2})
      : new MeshPhysicalMaterial({color: '#ffcf7a', roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.32, clearcoat: 1}),
    sclera: plastic('#fbfaf6', 0.25),
    mouthIn: plastic('#5b1f22', 0.5),
    tongue: plastic('#e77b7b', 0.4),
    teeth: plastic('#fffdf5', 0.2),
    sweat: new MeshPhysicalMaterial({color: '#cfeeff', roughness: 0.02, clearcoat: 1, transparent: true, opacity: 0.8}),
    pen: [plastic('#3a7bd5', 0.2), plastic(PAL.coral, 0.2), plastic('#2b2b2b', 0.2)],
    patch: plastic('#ffffff', 0.4),
    patchInk: plastic('#2f3a37', 0.4),
    sock: clay(kit?.socks ?? '#ffffff', 0.7),
    sockFar: clay(shade(kit?.socks ?? '#ffffff', 0.86), 0.75),
    trim: clay(kit?.trim ?? '#ffffff', 0.6),
    glove: plastic(kit?.gloves ?? '#ffffff', 0.4),
    boot: plastic('#1d1f24', 0.25),
    bootSole: plastic(kit?.trim ?? '#e9e9e9', 0.35),
    number: num ? new MeshStandardMaterial({map: num, transparent: true, roughness: 0.6, depthWrite: false}) : null,
    mono: kit?.quarterZip ? new MeshStandardMaterial({map: monoTex(kit.quarterZip), transparent: true, roughness: 0.6, depthWrite: false}) : null,
    zip: plastic('#c9ced6', 0.2),
    chest: kit?.chestText ? new MeshStandardMaterial({map: chestTex(kit.chestText, kit.numColor ?? '#ffffff', '#ffffff'), transparent: true, roughness: 0.6, depthWrite: false}) : null,
  };
};
type Mats = ReturnType<typeof buildMats>;
const matCache = new Map<string, Mats>();
const matsFor = (st: Style) => {
  const k = JSON.stringify(st);
  if (!matCache.has(k)) {
    const m = buildMats(st);
    if (st.lowPoly)
      for (const v of Object.values(m))
        for (const x of Array.isArray(v) ? v : [v])
          if (x && (x as Material).isMaterial) {
            (x as MeshStandardMaterial).flatShading = true;
            (x as Material).needsUpdate = true;
          }
    matCache.set(k, m);
  }
  return matCache.get(k)!;
};

// ---------------------------------------------------------------- geometry helpers
const Y = new Vector3(0, 1, 0);
const sphereCache = new Map<number, SphereGeometry>();
/** Set while a low-poly character renders: limbs and spheres use few segments (faceted). */
export const LOW_POLY = {on: false};
const lowSphereCache = new Map<number, SphereGeometry>();
const sphere = (r: number) => {
  if (LOW_POLY.on) {
    if (!lowSphereCache.has(r)) lowSphereCache.set(r, new SphereGeometry(r, 8, 6));
    return lowSphereCache.get(r)!;
  }
  if (!sphereCache.has(r)) sphereCache.set(r, new SphereGeometry(r, 32, 20));
  return sphereCache.get(r)!;
};
const cylCache = new Map<string, CylinderGeometry>();
const cyl = (rTop: number, rBottom: number) => {
  const k = `${rTop}-${rBottom}`;
  const kk = LOW_POLY.on ? 'lp' + k : k;
  if (!cylCache.has(kk)) cylCache.set(kk, new CylinderGeometry(rTop, rBottom, 1, LOW_POLY.on ? 7 : 32, 1, true));
  return cylCache.get(kk)!;
  return cylCache.get(k)!;
};

/** Smooth tapered segment between two joints, capped with spheres (clay limb). */
const Seg: React.FC<{a: Vector3; b: Vector3; ra: number; rb: number; mat: Material}> = ({a, b, ra, rb, mat}) => {
  const d = b.clone().sub(a);
  const len = d.length();
  const q = new Quaternion().setFromUnitVectors(Y, d.normalize());
  const mid = a.clone().add(b).multiplyScalar(0.5);
  return (
    <group>
      <mesh geometry={cyl(rb, ra)} material={mat} position={mid} quaternion={q} scale={[1, len, 1]} castShadow />
      <mesh geometry={sphere(ra)} material={mat} position={a} castShadow />
      <mesh geometry={sphere(rb)} material={mat} position={b} castShadow />
    </group>
  );
};

// Shoe, local to the ankle: heel at -30 px, toe at +68 px, sole 22 px below the ankle.
const SHOE_LEN = m(100);
const SHOE_H = 0.078;
const shoeGeo = new RoundedBoxGeometry(SHOE_LEN, SHOE_H, 0.105, 4, 0.03);
const soleGeo = new RoundedBoxGeometry(SHOE_LEN + 0.004, 0.016, 0.109, 2, 0.007);
const toeGeo = new SphereGeometry(0.055, 24, 16);

const Leg: React.FC<{leg: LegPose; z: number; far?: boolean; M: Mats; kit?: boolean; bare?: boolean; fat?: boolean}> = ({leg, z, far, M, kit, bare, fat}) => {
  const k = fat ? 1.22 : 1;
  const hip = to3(leg.hip, z);
  const knee = to3(leg.knee, z);
  const ankle = to3(leg.foot.ankle, z);
  const cloth = far ? M.trousersFar : M.trousers;
  const cx = m(19);
  const soleY = -m(22);
  if (kit) {
    // football legs: shorts over the upper thigh, bare knee, knee-high socks, boots
    const shortEnd = hip.clone().lerp(knee, bare ? 0.2 : 0.55);
    const sockTop = knee.clone().lerp(ankle, 0.14);
    const ankleUp = ankle.clone().add(new Vector3(0, 0.03, 0));
    const skinL = far ? M.skinShade : M.skin;
    return (
      <group>
        <Seg a={hip} b={knee} ra={0.074 * k} rb={0.058 * (fat ? 1.12 : 1)} mat={skinL} />
        <Seg a={hip} b={shortEnd} ra={(bare ? 0.088 : 0.095) * k} rb={(bare ? 0.084 : 0.088) * k} mat={cloth} />
        <Seg a={knee} b={sockTop} ra={0.057} rb={0.056} mat={skinL} />
        <Seg a={sockTop} b={ankleUp} ra={bare ? 0.056 : 0.062} rb={0.053} mat={bare ? skinL : far ? M.sockFar : M.sock} />
        <group position={ankle} rotation={[0, 0, -leg.foot.angle * DEG]}>
          <mesh geometry={shoeGeo} material={bare ? skinL : M.boot} position={[cx, soleY + SHOE_H / 2 + 0.006, 0]} scale={bare ? [0.95, 0.7, 0.8] : [1, 0.85, 0.92]} castShadow />
          <mesh geometry={toeGeo} material={bare ? skinL : M.boot} position={[cx + 0.06, soleY + 0.035, 0]} scale={bare ? [0.95, 0.5, 0.8] : [1, 0.6, 0.88]} castShadow />
          {bare ? null : <mesh geometry={soleGeo} material={M.bootSole} position={[cx, soleY + 0.008, 0]} castShadow />}
        </group>
      </group>
    );
  }
  return (
    <group>
      <Seg a={hip} b={knee} ra={0.083} rb={0.066} mat={cloth} />
      <Seg a={knee} b={ankle.clone().add(new Vector3(0, 0.03, 0))} ra={0.064} rb={0.056} mat={cloth} />
      <group position={ankle} rotation={[0, 0, -leg.foot.angle * DEG]}>
        <mesh geometry={shoeGeo} material={M.shoe} position={[cx, soleY + SHOE_H / 2 + 0.006, 0]} castShadow />
        <mesh geometry={toeGeo} material={M.shoe} position={[cx + 0.06, soleY + 0.04, 0]} scale={[1, 0.7, 0.95]} castShadow />
        <mesh geometry={soleGeo} material={M.sole} position={[cx, soleY + 0.008, 0]} castShadow />
      </group>
    </group>
  );
};

const torsoGeo = new CapsuleGeometry(0.16, 0.3, 10, 32);
const bellyGeo = new SphereGeometry(0.15, 24, 16);
const navelGeo = new SphereGeometry(0.012, 8, 6);
const numPlane = new PlaneGeometry(0.26, 0.26);
const chestPlane = new PlaneGeometry(0.25, 0.125);
const box1 = new BoxGeometry(1, 1, 1);
const pelvisGeo = new SphereGeometry(0.165, 32, 20);
const beltGeo = new CylinderGeometry(0.163, 0.163, 0.045, 40);
const tieGeo = new RoundedBoxGeometry(0.016, 0.3, 0.07, 2, 0.006);
const tieTipGeo = new RoundedBoxGeometry(0.016, 0.06, 0.06, 2, 0.006);
const knotGeo = new RoundedBoxGeometry(0.03, 0.04, 0.05, 2, 0.01);
const collarGeo = new CylinderGeometry(0.075, 0.098, 0.06, 32);
const smileGeo = new TorusGeometry(0.03, 0.007, 10, 24, Math.PI);
const hairGeo = new SphereGeometry(0.157, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.52);
// lower-face shell (front half, from the cheekbones down) for beards
const beardGeo = new SphereGeometry(0.152, 40, 12, Math.PI * 0.5, Math.PI, Math.PI * 0.67, Math.PI * 0.2); // jaw + chin, under the mouth
const burnGeoA = new SphereGeometry(0.152, 16, 8, Math.PI * 0.52, Math.PI * 0.16, Math.PI * 0.5, Math.PI * 0.2); // sideburn / cheek, +z side
const burnGeoB = new SphereGeometry(0.152, 16, 8, Math.PI * 1.32, Math.PI * 0.16, Math.PI * 0.5, Math.PI * 0.2); // -z side
const buzzGeo = new SphereGeometry(0.153, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.45);
const cropGeo = new SphereGeometry(0.157, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.49);
const skirtGeo = new CylinderGeometry(0.175, 0.235, 0.5, 40, 1, true);
const shirtVGeo = new RoundedBoxGeometry(0.012, 0.26, 0.09, 2, 0.005);
const lapelGeo = new RoundedBoxGeometry(0.014, 0.26, 0.05, 2, 0.006);
const pocketGeo = new RoundedBoxGeometry(0.012, 0.1, 0.11, 2, 0.005);
const penGeo = new CylinderGeometry(0.007, 0.007, 0.09, 10);
const patchGeo = new RoundedBoxGeometry(0.012, 0.07, 0.09, 2, 0.006);
const patchBarGeo = new RoundedBoxGeometry(0.014, 0.012, 0.06, 1, 0.004);
const goggleBandGeo = new TorusGeometry(0.143, 0.012, 10, 48);
const goggleRimGeo = new TorusGeometry(0.03, 0.009, 10, 24);
const lensGeo = new CylinderGeometry(0.028, 0.028, 0.012, 24);

/** Point on the head surface in a direction (head-local). */
const surf = (x: number, y: number, z: number, r: number) => {
  const v = new Vector3(x, y, z).normalize().multiplyScalar(r);
  return [v.x, v.y, v.z] as const;
};

/**
 * How the character looks. tired: 0 fresh … 1 exhausted (heavy lids, eye bags, flat mouth).
 * droop: extra forward head drop (deg). yaw: head turn left/right (deg, + turns toward -z).
 * stare: wide unblinking eyes. noBlink: suppress the automatic blinks.
 */
export type Look = {
  tired: number;
  droop: number;
  eyesClosed: boolean;
  yaw?: number;
  stare?: boolean;
  noBlink?: boolean;
  /** Sideways head tilt (deg). */
  roll?: number;
  /** Eyebrows: + worried/sad (inner ends up), - angry (inner ends down). About -1..1. */
  brows?: number;
  /** Eyebrows raised (+) or lowered (-), roughly -1..1. */
  browLift?: number;
  mouth?: 'smile' | 'flat' | 'frown' | 'open' | 'grin';
  /** 0..1, how wide an 'open' mouth is (yelling, talking). */
  mouthOpen?: number;
  /** Show eye whites with pupils at this scale (smaller = more scared or creepy). */
  pupils?: number;
  /** 0..1 sweat drops on the forehead. */
  sweat?: number;
  /** 0..1 squeeze of one eye (a twitch). */
  twitch?: number;
};
export const FRESH: Look = {tired: 0, droop: 0, eyesClosed: false};

// wild scientist hair: puffs around the sides and back of a bald crown
const WILD = seededArray(1313, 22, (r, i) => {
  const a = Math.PI * (0.55 + (i / 21) * 0.9) + (r() - 0.5) * 0.15; // back half, ear to ear
  return {a, y: -0.02 + r() * 0.09, s: 0.042 + r() * 0.03, out: 0.13 + r() * 0.03, spike: r() > 0.6};
});

const Hair: React.FC<{st: Style; M: Mats}> = ({st, M}) => {
  if (st.hairStyle === 'wild')
    return (
      <group>
        {WILD.map((h, i) => (
          <mesh
            key={i}
            geometry={sphere(1)}
            material={M.hair}
            position={[Math.cos(h.a) * h.out, h.y, Math.sin(h.a) * h.out * 1.05]}
            scale={h.spike ? [h.s * 0.8, h.s * 1.9, h.s * 0.8] : [h.s, h.s * 1.1, h.s]}
            rotation={[Math.sin(h.a) * 0.6, 0, -Math.cos(h.a) * 0.6]}
            castShadow
          />
        ))}
        {/* two tufts sticking up off the crown */}
        <mesh geometry={sphere(1)} material={M.hair} position={[-0.05, 0.145, 0.04]} scale={[0.025, 0.055, 0.025]} rotation={[0.4, 0, 0.5]} />
        <mesh geometry={sphere(1)} material={M.hair} position={[-0.07, 0.13, -0.05]} scale={[0.022, 0.05, 0.022]} rotation={[-0.5, 0, 0.6]} />
      </group>
    );
  if (st.hairStyle === 'buzz') return <mesh geometry={buzzGeo} material={M.hair} rotation={[0, 0, 0.45]} castShadow />;
  if (st.hairStyle === 'crop') {
    // full, thick short crop: the buzz hairline, but a thicker shell with height on the crown
    return (
      <group rotation={[0, 0, 0.3]}>
        <mesh geometry={cropGeo} material={M.hair} castShadow />
        <mesh geometry={sphere(1)} material={M.hair} position={[-0.012, 0.062, 0]} scale={[0.162, 0.11, 0.16]} castShadow />
      </group>
    );
  }
  if (st.hairStyle === 'swept')
    // full head of hair brushed straight back: hairline set back off the forehead, height on the crown,
    // combed-back ridges and fuller sides over the ears
    return (
      <group>
        <mesh geometry={hairGeo} material={M.hair} rotation={[0, 0, 1.0]} position={[-0.012, 0.004, 0]} scale={[1.05, 1.04, 1.07]} castShadow />
        <mesh geometry={sphere(1)} material={M.hair} position={[-0.025, 0.128, 0]} scale={[0.125, 0.058, 0.12]} rotation={[0, 0, -0.25]} castShadow />
        <mesh geometry={sphere(1)} material={M.hair} position={[0.055, 0.128, 0]} scale={[0.07, 0.04, 0.11]} rotation={[0, 0, -0.75]} castShadow />
        {[-1, 1].map((sd) => (
          <mesh key={sd} geometry={sphere(1)} material={M.hair} position={[-0.055, 0.05, 0.128 * sd]} scale={[0.085, 0.07, 0.035]} rotation={[0, 0, -0.35]} castShadow />
        ))}
        <mesh geometry={sphere(1)} material={M.hair} position={[-0.12, 0.05, 0]} scale={[0.06, 0.1, 0.13]} castShadow />
      </group>
    );
  return (
    <group>
      <mesh geometry={hairGeo} material={M.hair} rotation={[0, 0, 0.55]} position={[-0.006, 0.006, 0]} castShadow />
      {st.hairStyle === 'bun' ? <mesh geometry={sphere(0.065)} material={M.hair} position={[-0.12, 0.11, 0]} castShadow /> : null}
    </group>
  );
};

const teethGeo = new BoxGeometry(0.01, 0.012, 0.06);

// fedora: a wide brim, a pinched crown and a band, sitting low on the head (tilted a touch forward)
const brimGeo = new CylinderGeometry(0.235, 0.235, 0.014, 32);
const crownGeo = new CylinderGeometry(0.125, 0.15, 0.13, 32);
const hatBandGeo = new CylinderGeometry(0.152, 0.152, 0.03, 32);
const pinchGeo = new BoxGeometry(0.2, 0.03, 0.05);
const hatMats = new Map<string, MeshStandardMaterial>();
const hatMat = (c: string) => {
  if (!hatMats.has(c)) hatMats.set(c, new MeshStandardMaterial({color: c, roughness: 0.7}));
  return hatMats.get(c)!;
};
// construction hard hat: a dome with a centre ridge and a short peak at the front
const domeGeo = new SphereGeometry(0.168, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const peakGeo = new CylinderGeometry(0.19, 0.19, 0.012, 32, 1, false, -Math.PI / 2.4, Math.PI / 1.2);
const ridgeGeo = new BoxGeometry(0.3, 0.025, 0.035);
const HardHat: React.FC<{color: string}> = ({color}) => (
  <group position={[0.005, 0.045, 0]} rotation={[0, 0, -0.06]}>
    <mesh geometry={domeGeo} material={hatMat(color)} scale={[1.05, 0.95, 1]} castShadow />
    <mesh geometry={peakGeo} material={hatMat(color)} position={[0.02, 0.004, 0]} rotation={[0, Math.PI / 2, 0]} />
    <mesh geometry={ridgeGeo} material={hatMat(color)} position={[0, 0.155, 0]} />
  </group>
);
// baseball cap worn backwards: a snug crown and the brim sticking out the back
const capGeo = new SphereGeometry(0.158, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const capBrimGeo = new CylinderGeometry(0.11, 0.11, 0.012, 24, 1, false, 0, Math.PI);
const Cap: React.FC<{color: string; brim: string}> = ({color, brim}) => (
  <group position={[0.0, 0.05, 0]} rotation={[0, 0, 0.12]}>
    <mesh geometry={capGeo} material={hatMat(color)} scale={[1.02, 0.78, 1.01]} castShadow />
    <mesh geometry={capBrimGeo} material={hatMat(brim)} position={[-0.13, 0.005, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 1, 1.2]} />
  </group>
);
// sunglasses: two dark rounded lenses and a bridge across the eyes
const lensDarkGeo = new SphereGeometry(0.036, 20, 12);
const shadeMat = new MeshStandardMaterial({color: '#0c0c10', roughness: 0.08, metalness: 0.6});
const bridgeGeo = new BoxGeometry(0.012, 0.01, 0.05);
const armShadeGeo = new BoxGeometry(0.16, 0.01, 0.01);
const Shades: React.FC = () => (
  <group position={[0, 0.02, 0]}>
    {[-1, 1].map((sd) => (
      <mesh key={sd} geometry={lensDarkGeo} material={shadeMat} position={[0.142, 0, 0.056 * sd]} scale={[0.35, 0.8, 1.05]} />
    ))}
    <mesh geometry={bridgeGeo} material={shadeMat} position={[0.152, 0.008, 0]} />
    {[-1, 1].map((sd) => (
      <mesh key={'a' + sd} geometry={armShadeGeo} material={shadeMat} position={[0.07, 0.01, 0.142 * sd]} />
    ))}
  </group>
);
const chainGeo = new TorusGeometry(0.105, 0.014, 8, 28);
// turban: a full wrapped dome with a few wrap folds around it
const turbanGeo = new SphereGeometry(0.175, 14, 9, 0, Math.PI * 2, 0, Math.PI / 1.75);
const wrapGeo = new TorusGeometry(0.15, 0.028, 6, 18);
const Turban: React.FC<{color: string}> = ({color}) => (
  <group position={[-0.005, 0.03, 0]} rotation={[0, 0, -0.08]}>
    <mesh geometry={turbanGeo} material={hatMat(color)} scale={[1.05, 1.0, 1.04]} castShadow />
    {[0, 1, 2].map((k) => (
      <mesh key={k} geometry={wrapGeo} material={hatMat(color)} position={[0, 0.02 + k * 0.045, 0]} rotation={[Math.PI / 2 + (k - 1) * 0.18, 0, 0.25 * (k - 1)]} scale={[1.02 - k * 0.1, 1.02 - k * 0.1, 1]} />
    ))}
  </group>
);
// rainbow bandana tied round the forehead, knot at the back
const RAINBOW = ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5', '#8e24aa'];
const bandGeo2 = new TorusGeometry(0.152, 0.011, 6, 24);
const Bandana: React.FC = () => (
  <group position={[0.0, 0.135, 0]} rotation={[0, 0, -0.22]}>
    {RAINBOW.map((c, k) => (
      <mesh key={c} geometry={bandGeo2} material={hatMat(c)} position={[0, 0.03 - k * 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.02, 1.0, 1]} />
    ))}
    <mesh geometry={new SphereGeometry(0.03, 6, 5)} material={hatMat('#8e24aa')} position={[-0.16, 0.0, 0]} />
  </group>
);
const Fedora: React.FC<{color: string; band: string}> = ({color, band}) => (
  <group position={[0.005, 0.1, 0]} rotation={[0, 0, -0.08]}>
    <mesh geometry={brimGeo} material={hatMat(color)} scale={[1.05, 1, 0.92]} castShadow />
    <mesh geometry={crownGeo} material={hatMat(color)} position={[0, 0.072, 0]} scale={[1.05, 1, 0.9]} castShadow />
    <mesh geometry={hatBandGeo} material={hatMat(band)} position={[0, 0.024, 0]} scale={[1.05, 1, 0.9]} />
    <mesh geometry={pinchGeo} material={hatMat(color)} position={[0, 0.135, 0]} />
  </group>
);

const Head: React.FC<{pose: Pose; frame: number; look: Look; st: Style; M: Mats}> = ({pose, frame, look, st, M}) => {
  const neck = to3(pose.neck, 0);
  const R = 0.15;
  const autoBlink = !look.noBlink && [114, 252].some((b) => frame >= b && frame < b + 7);
  const blink = look.eyesClosed || autoBlink;
  const lid = look.stare ? 1.25 : Math.max(0.35, 1 - 0.6 * look.tired);
  const goggled = (st.outfit === 'scientist' ? st.goggles ?? 'eyes' : st.goggles) === 'eyes';
  const eyeMag = goggled ? 1.3 : 1; // goggle lenses magnify the eyes
  const brows = look.brows ?? 0;
  const browY = (goggled ? 0.52 : 0.36) + (look.stare ? 0.06 : 0) + (look.browLift ?? 0) * 0.12;
  const mouth = look.mouth ?? (look.tired < 0.5 && !look.stare ? 'smile' : 'flat');
  const open = look.mouthOpen ?? 0.5;
  const eye = (side: number) => {
    const squeeze = side === 1 ? 1 - (look.twitch ?? 0) * 0.75 : 1;
    const ey = (blink ? 0.15 : lid) * squeeze;
    const pos = surf(0.92, 0.12, 0.38 * side, R - 0.004);
    return (
      <group key={side}>
        {look.pupils !== undefined && !blink ? (
          <>
            <mesh geometry={sphere(0.026)} material={M.sclera} position={surf(0.92, 0.12, 0.38 * side, R - 0.012)} scale={[0.5 * eyeMag, ey * eyeMag, 1 * eyeMag]} />
            <mesh
              geometry={sphere(0.019)}
              material={M.eye}
              position={surf(0.93, 0.12, 0.36 * side, R + 0.001)}
              scale={[0.5, look.pupils * eyeMag * Math.min(1, ey), look.pupils * eyeMag]}
            />
          </>
        ) : (
          <mesh geometry={sphere(0.019)} material={M.eye} position={pos} scale={[0.6, ey * eyeMag, (look.stare ? 1.15 : 1) * eyeMag]} />
        )}
        {!blink ? <mesh geometry={sphere(0.006)} material={M.white} position={surf(0.93, 0.17, 0.33 * side, R + 0.012)} /> : null}
        {/* eyebrow: rotated so its inner end rises (worried) or drops (angry) */}
        <mesh
          geometry={sphere(0.012)}
          material={M.brow}
          position={surf(0.86, browY, 0.4 * side, R + 0.004)}
          rotation={[brows * 0.55 * side, 0, 0]}
          scale={st.hairStyle === 'wild' ? [0.9, 0.9, 3] : st.hairStyle === 'swept' ? [0.85, 0.8, 2.9] : [0.6, 0.6, 2.4]}
        />
        {st.realistic ? null : <mesh geometry={sphere(0.03)} material={M.cheek} position={surf(0.8, -0.16, 0.55 * side, R - 0.012)} scale={[0.5, 0.8, 1]} />}
        <mesh geometry={sphere(0.038)} material={M.skin} position={surf(0, 0.02, side, R - 0.01)} scale={[0.75, 1.1, 0.5]} />
        {look.tired > 0.05 ? (
          <mesh geometry={sphere(0.024)} material={M.bag} position={surf(0.9, -0.03, 0.4 * side, R - 0.012)} scale={[0.4, 0.45 * look.tired + 0.15, 1.1]} />
        ) : null}
      </group>
    );
  };
  const mouthPos = surf(1, -0.4, 0, R - 0.004);
  return (
    <group position={neck} rotation={[0, (look.yaw ?? 0) * DEG, 0]} scale={st.realistic ? 0.74 : 1}>
      <group rotation={[(look.roll ?? 0) * DEG, 0, -(pose.lean + pose.headTilt + look.droop) * DEG]}>
        <mesh geometry={cyl(0.056, 0.062)} material={M.skin} position={[0, 0.05, 0]} scale={[1, 0.14, 1]} />
        <group position={[0.02, 0.2, 0]}>
          <mesh geometry={sphere(R)} material={M.skin} scale={[1, 1.04, 0.96]} castShadow />
          <Hair st={st} M={M} />
          {st.hat ? st.hat.kind === 'turban' ? <Turban color={st.hat.color} /> : st.hat.kind === 'bandana' ? <Bandana /> : st.hat.kind === 'hardhat' ? <HardHat color={st.hat.color} /> : st.hat.kind === 'cap' ? <Cap color={st.hat.color} brim={st.hat.band} /> : <Fedora color={st.hat.color} band={st.hat.band} /> : null}
          {st.shades ? <Shades /> : null}
          {st.beard ? (
            // short full beard: a shell hugging the lower face from ear to ear, chin a touch fuller, moustache
            <group>
              <mesh geometry={beardGeo} material={M.hair} rotation={[0, 0, -0.08]} scale={[1.04, 1.03, 1.04]} castShadow />
              <mesh geometry={burnGeoA} material={M.hair} scale={1.03} />
              <mesh geometry={burnGeoB} material={M.hair} scale={1.03} />
              <mesh geometry={sphere(1)} material={M.hair} position={surf(0.8, -0.75, 0, R * 0.95)} scale={[0.04, 0.03, 0.05]} castShadow />
              <mesh geometry={sphere(1)} material={M.hair} position={surf(1, -0.27, 0, R - 0.002)} scale={[0.012, 0.011, 0.05]} />
            </group>
          ) : null}
          <mesh geometry={sphere(0.028)} material={M.skin} position={surf(1, -0.04, 0, R + 0.008)} />
          {mouth === 'smile' ? (
            <mesh geometry={smileGeo} material={M.mouth} position={surf(1, -0.42, 0, R - 0.006)} rotation={[0, Math.PI / 2, Math.PI]} />
          ) : mouth === 'frown' ? (
            <mesh geometry={smileGeo} material={M.mouth} position={surf(1, -0.5, 0, R - 0.006)} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.8, 1]} />
          ) : mouth === 'grin' ? (
            <group position={surf(1, -0.4, 0, R - 0.01)} scale={[1, 1, 1.7]}>
              <mesh geometry={smileGeo} material={M.mouth} rotation={[0, Math.PI / 2, Math.PI]} />
              <mesh geometry={teethGeo} material={M.teeth} position={[0.006, -0.012, 0]} scale={[1, 1, 0.75]} />
            </group>
          ) : mouth === 'open' ? (
            <group position={mouthPos}>
              <mesh geometry={sphere(0.03)} material={M.mouthIn} scale={[0.35, 0.25 + 0.9 * open, 0.75 + 0.35 * open]} />
              <mesh geometry={sphere(0.016)} material={M.tongue} position={[0.002, -0.012 - 0.012 * open, 0]} scale={[0.4, 0.5, 1]} />
            </group>
          ) : (
            <mesh geometry={sphere(0.012)} material={M.mouth} position={mouthPos} scale={[0.5, 0.45, 2.4]} />
          )}
          {eye(1)}
          {eye(-1)}
          {(look.sweat ?? 0) > 0.02
            ? [0, 1].map((i) => {
                const k = ((frame * 0.012 + i * 0.5) % 1) * (look.sweat ?? 0);
                return (
                  <mesh
                    key={i}
                    geometry={sphere(0.011)}
                    material={M.sweat}
                    position={surf(0.55 - i * 0.2, 0.55 - k * 0.6, (i ? -0.75 : 0.8), R + 0.006)}
                    scale={[0.8, 1.35, 0.8]}
                  />
                );
              })
            : null}
          {st.outfit === 'scientist' || st.goggles ? (
            goggled ? (
              // goggles worn over the eyes: strap round the head at eye level, amber lenses in brass rims
              <group position={[0, 0.018, 0]}>
                <mesh geometry={goggleBandGeo} material={M.goggleBand} rotation={[Math.PI / 2, 0, 0]} scale={[1.04, 1.06, 1]} />
                {[-1, 1].map((sd) => (
                  <group key={sd} position={[0.152, 0.0, 0.056 * sd]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh geometry={goggleRimGeo} material={M.goggleRim} scale={1.2} />
                    <mesh geometry={lensGeo} material={M.lens} rotation={[Math.PI / 2, 0, 0]} scale={[1.2, 1, 1.2]} />
                  </group>
                ))}
                <mesh geometry={sphere(0.012)} material={M.goggleRim} position={[0.158, 0.0, 0]} scale={[0.6, 0.6, 1.2]} />
              </group>
            ) : (
              <group position={[0.0, 0.045, 0]} rotation={[0, 0, 0.32]}>
                <mesh geometry={goggleBandGeo} material={M.goggleBand} rotation={[Math.PI / 2, 0, 0]} scale={[1.02, 1, 1]} />
                {[-1, 1].map((sd) => (
                  <group key={sd} position={[0.143, 0.0, 0.05 * sd]} rotation={[0, Math.PI / 2, 0]}>
                    <mesh geometry={goggleRimGeo} material={M.goggleRim} />
                    <mesh geometry={lensGeo} material={M.lens} rotation={[Math.PI / 2, 0, 0]} />
                  </group>
                ))}
              </group>
            )
          ) : null}
        </group>
      </group>
    </group>
  );
};

const Torso: React.FC<{pose: Pose; st: Style; M: Mats}> = ({pose, st, M}) => {
  const p = to3(pose.pelvis, 0);
  const tieSwing = 3 + 2.5 * Math.sin(2 * Math.PI * 2 * (pose.phase - 0.1));
  const sci = st.outfit === 'scientist';
  const subj = st.outfit === 'subject';
  const tie = (
    <group position={[sci ? 0.142 : 0.124, 0.57, 0]} rotation={[0, 0, (sci ? 1 : tieSwing) * DEG]}>
      <mesh geometry={knotGeo} material={M.tieDark} position={[0.004, -0.01, 0]} />
      <mesh geometry={tieGeo} material={M.tie} position={[0.012, -0.18, 0]} rotation={[0, 0, -4 * DEG]} castShadow />
      <mesh geometry={tieTipGeo} material={M.tie} position={[0.02, -0.33, 0]} rotation={[45 * DEG, 0, -4 * DEG]} />
    </group>
  );
  return (
    <group position={p} rotation={[0, 0, -pose.lean * DEG]}>
      <mesh geometry={pelvisGeo} material={M.trousers} position={[0, 0.0, 0]} scale={st.kit?.fat ? [1.0, 0.78, 1.32] : [0.8, 0.7, 1.12]} castShadow />
      {st.outfit === 'kit' ? (
        <>
          {/* football shirt with a contrast collar and numbers on the back and chest */}
          <mesh geometry={torsoGeo} material={M.shirt} position={[0, 0.34, 0]} scale={st.kit?.fat ? [1.02, 1, 1.36] : [0.8, 1, 1.17]} castShadow />
          {st.kit?.bare ? (
            // streaker: a proud little belly instead of a collar
            <>
              <mesh geometry={bellyGeo} material={M.shirt} position={st.kit?.fat ? [0.13, 0.17, 0] : [0.07, 0.2, 0]} scale={st.kit?.fat ? [1.35, 1.3, 1.5] : [0.9, 1, 1.15]} castShadow />
              {st.kit?.fat ? (
                <>
                  {/* belly button and a bit of chest */}
                  <mesh geometry={navelGeo} material={M.skinShade} position={[0.33, 0.12, 0]} />
                  <mesh geometry={bellyGeo} material={M.shirt} position={[0.06, 0.42, 0.08]} scale={[0.75, 0.55, 0.6]} />
                  <mesh geometry={bellyGeo} material={M.shirt} position={[0.06, 0.42, -0.08]} scale={[0.75, 0.55, 0.6]} />
                </>
              ) : null}
            </>
          ) : st.kit?.quarterZip ? (
            // quarter-zip: tall stand-up collar in the jumper colour, zipped a few inches down the chest
            <>
              <mesh geometry={collarGeo} material={M.shirt} position={[0.01, 0.635, 0]} scale={[1.08, 1.25, 1.08]} />
              <mesh geometry={box1} material={M.zip} position={[0.134, 0.555, 0]} scale={[0.008, 0.15, 0.012]} rotation={[0, 0, 0.12]} />
              <mesh geometry={box1} material={M.zip} position={[0.138, 0.49, 0]} scale={[0.012, 0.022, 0.016]} />
            </>
          ) : (
            <mesh geometry={collarGeo} material={M.trim} position={[0.01, 0.6, 0]} scale={[1.02, 0.6, 1.02]} />
          )}
          {st.chain ? <mesh geometry={chainGeo} material={hatMat(st.chain)} position={[0.035, 0.575, 0]} rotation={[Math.PI / 2, -0.45, 0]} castShadow /> : null}
          {st.kit?.bare ? null : M.mono ? (
            <mesh geometry={numPlane} material={M.mono} position={[0.131, 0.44, -0.07]} rotation={[0, Math.PI / 2, 0]} scale={0.3} />
          ) : M.chest ? (
            <>
              {/* basketball vest: wordmark across the chest, number under it, big number on the back */}
              <mesh geometry={chestPlane} material={M.chest} position={[0.133, 0.5, 0]} rotation={[0, Math.PI / 2, 0]} />
              {M.number ? <mesh geometry={numPlane} material={M.number} position={[0.133, 0.36, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.6} /> : null}
              {M.number ? <mesh geometry={numPlane} material={M.number} position={[-0.132, 0.38, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1} /> : null}
            </>
          ) : M.number ? (
            <>
              <mesh geometry={numPlane} material={M.number} position={[-0.132, 0.38, 0]} rotation={[0, -Math.PI / 2, 0]} scale={1} />
              <mesh geometry={numPlane} material={M.number} position={[0.133, 0.43, -0.07]} rotation={[0, Math.PI / 2, 0]} scale={0.38} />
            </>
          ) : (
            // referee: a chest pocket and badge instead of a number
            <mesh geometry={pocketGeo} material={M.trim} position={[0.13, 0.45, -0.08]} />
          )}
        </>
      ) : sci ? (
        <>
          {/* lab coat: body, open front showing shirt + tie, lapels, skirt to the knees, pockets */}
          <mesh geometry={torsoGeo} material={M.coat} position={[0, 0.34, 0]} scale={[0.86, 1, 1.22]} castShadow />
          <mesh geometry={shirtVGeo} material={M.shirt} position={[0.137, 0.47, 0]} />
          {[-1, 1].map((sd) => (
            <mesh key={sd} geometry={lapelGeo} material={M.coat} position={[0.143, 0.47, 0.055 * sd]} rotation={[sd * 0.32, 0, 0]} />
          ))}
          <mesh geometry={skirtGeo} material={M.coat} position={[0, -0.18, 0]} scale={[0.86, 1, 1.18]} castShadow />
          <mesh geometry={pocketGeo} material={M.coat} position={[0.142, 0.42, -0.1]} />
          {[0, 1, 2].map((i) => (
            <mesh key={i} geometry={penGeo} material={M.pen[i]} position={[0.142, 0.48, -0.13 + i * 0.022]} />
          ))}
          {[-1, 1].map((sd) => (
            <mesh key={sd} geometry={pocketGeo} material={M.coat} position={[0.185, -0.22, 0.11 * sd]} rotation={[0, 0, 0.12]} />
          ))}
          <mesh geometry={collarGeo} material={M.cuff} position={[0.01, 0.6, 0]} />
          {tie}
        </>
      ) : (
        <>
          <mesh geometry={torsoGeo} material={M.shirt} position={[0, 0.34, 0]} scale={[0.8, 1, 1.15]} castShadow />
          {subj ? (
            <>
              <mesh geometry={collarGeo} material={M.shirtFar} position={[0.01, 0.6, 0]} />
              <group position={[0.13, 0.43, -0.08]}>
                <mesh geometry={patchGeo} material={M.patch} />
                {Array.from({length: st.patch ?? 1}, (_, i) => (
                  <mesh key={i} geometry={patchBarGeo} material={M.patchInk} position={[0.002, 0.02 - i * 0.02, 0]} />
                ))}
              </group>
            </>
          ) : (
            <>
              <mesh geometry={beltGeo} material={M.belt} position={[0, 0.07, 0]} scale={[0.82, 1, 1.16]} />
              <mesh geometry={knotGeo} material={M.buckle} position={[0.134, 0.07, 0]} />
              <mesh geometry={collarGeo} material={M.cuff} position={[0.01, 0.6, 0]} />
              {tie}
            </>
          )}
        </>
      )}
    </group>
  );
};

const mugMat = plastic(PAL.coral, 0.15);
const mugBand = plastic('#ffffff', 0.2);
const coffeeMat = plastic('#5a3524', 0.1);
const mugGeo = new CylinderGeometry(0.058, 0.052, 0.14, 32);
const coffeeGeo = new CylinderGeometry(0.051, 0.051, 0.004, 32);
const bandGeo = new CylinderGeometry(0.0565, 0.0565, 0.03, 32, 1, true);
const handleGeo = new TorusGeometry(0.03, 0.009, 10, 20, Math.PI * 1.2);

type Carry = 'papers' | 'mug' | 'none';

const Arm: React.FC<{pose: Pose; far?: boolean; carry: Carry; st: Style; M: Mats}> = ({pose, far, carry, st, M}) => {
  const arm = far ? pose.farArm : pose.nearArm;
  const z = far ? -ARM_Z : ARM_Z;
  const zs = far ? -0.21 : 0.22;
  const wz = !far && st.nearHandZ !== undefined ? st.nearHandZ : z;
  const s = to3(arm.shoulder, zs);
  const e = to3(arm.elbow, (z + wz) / 2 + (wz === z ? 0 : 0.03));
  const w = to3(arm.wrist, wz);
  const sci = st.outfit === 'scientist';
  const mat = sci ? (far ? M.coatFar : M.coat) : far ? M.shirtFar : M.shirt;
  const dir = w.clone().sub(e).normalize();
  const cuffA = w.clone().addScaledVector(dir, -0.03);
  const hand = w.clone().addScaledVector(dir, 0.045);
  const fist = far || carry === 'none';
  if (st.outfit === 'kit') {
    const long = st.kit?.longSleeves;
    const skin = far ? M.skinShade : M.skin;
    const sleeveEnd = s.clone().lerp(e, 0.6);
    const sl = st.kit?.sleeve ? (far ? M.sleeveFar : M.sleeve) : mat;
    return (
      <group>
        <Seg a={s} b={e} ra={0.054} rb={0.048} mat={long ? sl : skin} />
        {st.kit?.bare || st.kit?.sleeveless ? null : <Seg a={s} b={sleeveEnd} ra={0.066} rb={0.06} mat={sl} />}
        <Seg a={e} b={w} ra={0.047} rb={0.042} mat={long ? sl : skin} />
        <mesh
          geometry={sphere(st.kit?.gloves ? 0.062 : 0.05)}
          material={st.kit?.gloves ? M.glove : skin}
          position={hand}
          scale={[1, 1.15, 0.85]}
          castShadow
        />
      </group>
    );
  }
  return (
    <group>
      <Seg a={s} b={e} ra={sci ? 0.068 : 0.062} rb={sci ? 0.06 : 0.054} mat={mat} />
      <Seg a={e} b={cuffA} ra={sci ? 0.058 : 0.052} rb={sci ? 0.055 : 0.047} mat={mat} />
      <Seg a={cuffA} b={w} ra={sci ? 0.057 : 0.05} rb={sci ? 0.057 : 0.05} mat={sci ? mat : st.outfit === 'subject' ? M.shirtFar : M.cuff} />
      {fist ? (
        <mesh geometry={sphere(0.05)} material={far ? M.skinShade : M.skin} position={hand} scale={[1, 1.15, 0.85]} castShadow />
      ) : (
        // carrying hand: palm under the front of the stack, fingers hooked over its front edge
        <group position={w} rotation={[0, 0, -forearmRot(pose) * DEG]}>
          <mesh geometry={sphere(0.05)} material={M.skin} position={[-0.01, -0.004, 0]} scale={[1.25, 0.8, 1.05]} castShadow />
          {[-0.036, 0, 0.036].map((fz) => (
            <group key={fz}>
              <Seg a={new Vector3(0.022, 0.0, fz)} b={new Vector3(0.026, 0.118, fz)} ra={0.019} rb={0.017} mat={M.skin} />
              <Seg a={new Vector3(0.026, 0.118, fz)} b={new Vector3(-0.008, 0.136, fz)} ra={0.017} rb={0.015} mat={M.skin} />
            </group>
          ))}
          <Seg a={new Vector3(-0.01, 0.02, 0.06)} b={new Vector3(-0.045, 0.07, 0.1)} ra={0.02} rb={0.017} mat={M.skin} />
          {carry === 'mug' ? (
            <group position={[-0.045, 0.1, 0]}>
              <mesh geometry={mugGeo} material={mugMat} castShadow />
              <mesh geometry={bandGeo} material={mugBand} position={[0, 0.01, 0]} />
              <mesh geometry={coffeeGeo} material={coffeeMat} position={[0, 0.06, 0]} />
              <mesh geometry={handleGeo} material={mugMat} position={[-0.06, 0.0, 0]} rotation={[0, 0, Math.PI * 0.4]} />
            </group>
          ) : null}
        </group>
      )}
    </group>
  );
};

export const Worker3D: React.FC<{pose: Pose; frame: number; look?: Look; carry?: Carry; style?: Style}> = ({
  pose,
  frame,
  look = FRESH,
  carry = 'papers',
  style = OFFICE_STYLE,
}) => {
  LOW_POLY.on = !!style.lowPoly;
  const M = matsFor(style);
  return (
    <group>
      <Arm pose={pose} far carry={carry} st={style} M={M} />
      <Leg leg={pose.farLeg} z={-0.095} far M={M} kit={style.outfit === 'kit' && !style.kit?.trousers} bare={style.kit?.bare} fat={style.kit?.fat} />
      <Leg leg={pose.nearLeg} z={0.095} M={M} kit={style.outfit === 'kit' && !style.kit?.trousers} bare={style.kit?.bare} fat={style.kit?.fat} />
      <Torso pose={pose} st={style} M={M} />
      <Head pose={pose} frame={frame} look={look} st={style} M={M} />
      <Arm pose={pose} carry={carry} st={style} M={M} />
      {carry === 'papers' ? <PaperStack3D pose={pose} frame={frame} /> : null}
    </group>
  );
};
