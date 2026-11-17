/**
 * 3D explainer version: glossy toy plastic + clay, soft daylight, pastel office.
 *
 * Two layers, rendered with the SAME camera every frame:
 *   1. Background (office) -> blurred with a CSS filter for a shallow depth of field.
 *   2. Worker (+ papers) on a transparent canvas -> sharp, with a soft contact shadow.
 */
import {ThreeCanvas} from '@remotion/three';
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {Vector3} from 'three';
import {FLOOR_Y, HEIGHT, WIDTH} from '../../core/constants';
import {cameraAt, PX} from '../../character3d/common';
import {Office3D} from './Office3D';
import {FallingSheet3D, flight, RELEASE_FRAME} from '../../character3d/Paper3D';
import {Blob, CameraRig, ContactShadows, Daylight, Environment} from '../../character3d/stage';
import {Worker3D} from '../../character3d/Worker3D';
import {getPose} from '../../core/walkCycle';

const BG_BLUR_PX = 11;

export const OfficeWalk3D: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = getPose(frame);
  const cam = cameraAt(frame);
  const workerCenter = new Vector3(cam.target.x, 0, 0);
  const sheet = frame >= RELEASE_FRAME ? flight(frame) : null;
  const sheetH = sheet ? (FLOOR_Y - sheet.c.y) / PX : 0;
  return (
    <AbsoluteFill style={{backgroundColor: '#f7c3a6'}}>
      {/* Layer 1: background, blurred (depth of field) */}
      <AbsoluteFill style={{filter: `blur(${BG_BLUR_PX}px)`, transform: 'scale(1.04)'}}>
        <ThreeCanvas width={WIDTH} height={HEIGHT} frameloop="demand" dpr={1} shadows="variance" gl={{antialias: true}} camera={{fov: 38, position: [0, 1, 5]}}>
          <CameraRig cam={cam} />
          <color attach="background" args={['#f7c3a6']} />
          <Environment intensity={0.45} />
          <Daylight center={new Vector3(cam.target.x - 1.2, 0, -1.6)} extent={4.5} />
          <Office3D frame={frame} camX={cam.target.x} />
        </ThreeCanvas>
      </AbsoluteFill>

      {/* Layer 2: worker, sharp, transparent canvas over the background */}
      <AbsoluteFill>
        <ThreeCanvas
          width={WIDTH}
          height={HEIGHT}
          frameloop="demand"
          dpr={1}
          shadows="variance"
          gl={{antialias: true, alpha: true, premultipliedAlpha: false}}
          camera={{fov: 38, position: [0, 1, 5]}}
        >
          <CameraRig cam={cam} />
          <Environment intensity={0.55} />
          <Daylight center={workerCenter} extent={1.6} />
          <Worker3D pose={pose} frame={frame} />
          <FallingSheet3D frame={frame} />
          <ContactShadows pose={pose} />
          {sheet ? <Blob x={sheet.c.x / PX} z={sheet.z} h={Math.min(sheetH, 0.24) * 0.6} sx={0.4} sz={0.3} strength={0.18} /> : null}
        </ThreeCanvas>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
