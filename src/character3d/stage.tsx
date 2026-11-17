/**
 * Shared 3D stage pieces: camera rig, studio environment, daylight with soft
 * shadows, and contact shadows. Used by every 3D composition.
 */
import {useThree} from '@react-three/fiber';
import React, {useMemo} from 'react';
import {
  DirectionalLight,
  MeshBasicMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  ShadowMaterial,
  Vector3,
} from 'three';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {FLOOR_Y} from '../core/constants';
import {LegPose, Pose} from '../core/walkCycle';
import {blobTexture, PX, to3} from './common';

export type Cam = {position: Vector3; target: Vector3; fov: number; far?: number};

/** Sets the camera synchronously during render (deterministic, same for every layer). */
export const CameraRig: React.FC<{cam: Cam}> = ({cam}) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  camera.fov = cam.fov;
  camera.near = 0.05;
  camera.far = cam.far ?? 80;
  camera.position.copy(cam.position);
  camera.lookAt(cam.target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return null;
};

/** Studio-style environment map so plastic gets soft glossy reflections. */
export const Environment: React.FC<{intensity: number}> = ({intensity}) => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  useMemo(() => {
    const pm = new PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
  }, [gl, scene]);
  scene.environmentIntensity = intensity;
  return null;
};

/** Soft key light with shadows, following a centre point, plus sky/ground fill. */
export const Daylight: React.FC<{
  center: Vector3;
  extent: number;
  mapSize?: number;
  offset?: [number, number, number];
  color?: string;
  intensity?: number;
  sky?: string;
  ground?: string;
  fill?: number;
}> = ({center, extent, mapSize = 2048, offset = [2.2, 5.5, 4], color = '#fff0e0', intensity = 2.3, sky = '#f1f8ff', ground = '#f6d2bf', fill = 1.1}) => {
  const light = useMemo(() => {
    const l = new DirectionalLight(color, intensity);
    l.castShadow = true;
    l.shadow.mapSize.set(mapSize, mapSize);
    l.shadow.radius = 7;
    l.shadow.blurSamples = 16;
    l.shadow.bias = -0.0005;
    l.shadow.normalBias = 0.02;
    const cam = l.shadow.camera;
    cam.left = -extent;
    cam.right = extent;
    cam.top = extent;
    cam.bottom = -extent;
    cam.near = 0.5;
    cam.far = 30;
    cam.updateProjectionMatrix();
    return l;
  }, [extent, mapSize, color]);
  light.intensity = intensity;
  light.position.set(center.x + offset[0], offset[1], center.z + offset[2]);
  light.target.position.copy(center);
  light.target.updateMatrixWorld();
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
      <hemisphereLight args={[sky, ground, fill]} />
      <ambientLight intensity={0.12} color="#ffe9dc" />
    </>
  );
};

const catcherGeo = new PlaneGeometry(10, 10);
const blobGeo = new PlaneGeometry(1, 1);

/** Ambient-occlusion blob on the floor; fades and grows as the object lifts. */
export const Blob: React.FC<{x: number; z: number; h: number; sx: number; sz: number; strength: number}> = ({x, z, h, sx, sz, strength}) => {
  const mat = useMemo(() => new MeshBasicMaterial({map: blobTexture(), transparent: true, depthWrite: false, toneMapped: false}), []);
  mat.opacity = Math.max(0, strength * (1 - h / 0.25));
  const grow = 1 + h * 2;
  return <mesh geometry={blobGeo} material={mat} position={[x, 0.002, z]} rotation={[-Math.PI / 2, 0, 0]} scale={[sx * grow, sz * grow, 1]} renderOrder={1} />;
};

const footBlob = (leg: LegPose, z: number) => {
  const a = to3(leg.foot.ankle, z);
  const h = Math.max(0, (FLOOR_Y - 22 - leg.foot.ankle.y) / PX);
  return <Blob x={a.x + 0.04} z={z} h={h} sx={0.3} sz={0.17} strength={0.55} />;
};

/** Invisible floor that only shows the worker's cast shadow, plus AO blobs under body and feet. */
export const ContactShadows: React.FC<{pose: Pose; opacity?: number}> = ({pose, opacity = 0.28}) => {
  const mat = useMemo(() => new ShadowMaterial({color: '#6b4a45', opacity}), [opacity]);
  const x = pose.pelvis.x / PX;
  return (
    <>
      <mesh geometry={catcherGeo} material={mat} rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.001, 0]} receiveShadow />
      <Blob x={x} z={0} h={0} sx={0.95} sz={0.55} strength={0.22} />
      {footBlob(pose.farLeg, -0.095)}
      {footBlob(pose.nearLeg, 0.095)}
    </>
  );
};
