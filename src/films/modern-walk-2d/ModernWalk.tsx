/**
 * Modern Walk (flat 2D, 3 s): a guy in a hoodie walks down a city street looking at his phone.
 * Same shared walk cycle and tracking camera as the original 2D office film.
 */
import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {FPS, HEIGHT, WIDTH} from '../../core/constants';
import {getCamera, getPose} from '../../core/walkCycle';
import {Guy} from './Guy';
import {Foreground, Street} from './Street';

export const MODERN_WALK_FRAMES = 3 * FPS; // 180

export const ModernWalk: React.FC = () => {
  const frame = useCurrentFrame();
  const pose = getPose(frame);
  const cam = getCamera(frame);
  return (
    <AbsoluteFill style={{backgroundColor: '#dcd6cb'}}>
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <g transform={`translate(0 ${-cam.y})`}>
          <Street camX={cam.x} frame={frame} />
          <g transform={`translate(${WIDTH / 2 - cam.x} 0)`}>
            <Guy pose={pose} frame={frame} />
          </g>
          <Foreground camX={cam.x} frame={frame} />
        </g>
        <defs>
          <radialGradient id="vig2d" cx="0.5" cy="0.5" r="0.78">
            <stop offset="0.62" stopColor="#000" stopOpacity={0} />
            <stop offset="1" stopColor="#000" stopOpacity={0.22} />
          </radialGradient>
        </defs>
        <rect width={WIDTH} height={HEIGHT} fill="url(#vig2d)" />
      </svg>
    </AbsoluteFill>
  );
};
