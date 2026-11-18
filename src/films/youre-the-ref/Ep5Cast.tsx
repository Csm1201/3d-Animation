/**
 * "You're the Ref" episode 5 cast + a turnaround test: LeBron James (toy caricature) in a
 * gold-and-purple LA Lakers #23 vest, standing next to Orange #7 at the penalty spot.
 */
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Vector3} from 'three';
import {idleSpec} from '../../core/sportPoses';
import {Look, Style} from '../../character3d/Worker3D';
import {Actor, Scene, ST} from './Episode2';
import {yawFor} from './Players';

export const LEBRON_SCALE = 1.3;

// toy caricature: tall, dark brown skin, close-cropped hair, full short beard, Lakers gold #23 vest
export const LEBRON: Style = {
  outfit: 'kit',
  skin: '#7a4f36',
  hair: '#17110e',
  hairStyle: 'buzz',
  beard: true,
  kit: {shirt: '#fdb927', shorts: '#fdb927', socks: '#ffffff', number: 23, numColor: '#552583', trim: '#552583', sleeveless: true, chestText: 'LAKERS'},
};
export const COOL: Look = {tired: 0, droop: -3, eyesClosed: false, brows: -0.1, browLift: 0, mouth: 'flat', noBlink: true};

export const EP5_CAST_FRAMES = 120;
const v3 = (x: number, y: number, z: number) => new Vector3(x, y, z);

export const Ep5CastTest: React.FC = () => {
  const f = useCurrentFrame();
  const a = (f / EP5_CAST_FRAMES) * Math.PI * 2;
  const c = v3(41.5, 0, 0);
  const close = Number(process.env.REMOTION_CLOSE ?? 0);
  const cam = close
    ? {position: v3(c.x + Math.cos(a) * 1.3, 2.35, -0.45 + Math.sin(a) * 1.3), target: v3(c.x, 2.25, -0.45), fov: 40}
    : {position: v3(c.x + Math.cos(a) * 4.2, 1.6, c.z + Math.sin(a) * 4.2), target: v3(c.x, 1.25, c.z), fov: 40};
  return (
    <Scene cam={cam} frame={f} centre={c} extent={6} excite={0.6}>
      <Actor style={LEBRON} scale={LEBRON_SCALE} x={41.5} z={-0.45} yaw={yawFor(1, 0)} spec={idleSpec(f, 0.1)} frame={f} look={COOL} />
      <Actor style={ST.seven} x={41.5} z={0.55} yaw={yawFor(1, 0)} spec={idleSpec(f, 0.3)} frame={f} />
    </Scene>
  );
};
